import * as THREE from "three";
import {
  ARENA,
  PICKUPS,
  PLAYER,
  WEAPONS,
  enemyOf,
  waveScale,
  waveSpawns,
  weaponOf,
  xpForLevel,
  type EnemyKey,
  type EnemyType,
  type PickupKey,
  type WeaponKey,
} from "./battleData";
import { playSfx } from "./battleSound";

// ----------------------------------------------------------------------------
// 3D 전투 게임 엔진 (three.js). React 는 HUD 만 그리고, 여기서 게임을 돌린다.
// ----------------------------------------------------------------------------

export interface HudState {
  hp: number;
  maxHp: number;
  hunger: number;
  breath: number;
  stamina: number;
  defense: number;
  attack: number;
  level: number;
  xp: number;
  xpNeed: number;
  wave: number;
  enemiesLeft: number;
  kills: number;
  arrows: number;
  weapon: WeaponKey;
  unlocked: WeaponKey[];
  underwater: boolean;
  blocking: boolean;
  restSeconds: number; // 다음 웨이브까지 남은 시간 (0 이면 전투 중)
  timeSec: number;
  bossHp: number | null;
  bossMaxHp: number | null;
  locked: boolean; // 마우스가 잡혀 있는지 (조작 가능 상태)
}

export interface EngineCallbacks {
  onState: (s: HudState) => void;
  onLog: (text: string, kind?: "good" | "bad" | "info") => void;
  onGameOver: (summary: { wave: number; kills: number; level: number; timeSec: number }) => void;
  onLockChange: (locked: boolean) => void;
}

interface Enemy {
  type: EnemyType;
  root: THREE.Group;
  hp: number;
  maxHp: number;
  damage: number;
  cool: number; // 다음 공격까지
  windup: number; // 0 보다 크면 공격 준비 중
  hurt: number; // 맞은 직후 빨개지는 시간
  dead: number; // 0 보다 크면 사라지는 중
  vel: THREE.Vector3;
  bob: number;
}

interface Arrow {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  damage: number;
}

interface Pickup {
  key: PickupKey;
  root: THREE.Group;
  spin: number;
}

interface Orb {
  mesh: THREE.Mesh;
  xp: number;
  vel: THREE.Vector3;
}

const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

function textSprite(text: string, color = "#ffffff", size = 96): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = `bold ${size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = 8;
    ctx.strokeText(text, 64, 70);
    ctx.fillText(text, 64, 70);
  }
  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
}

export class BattleEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private frame = 0;
  private disposables: { dispose: () => void }[] = [];

  // 플레이어
  private player = new THREE.Group();
  private hand = new THREE.Group(); // 무기를 드는 손
  private weaponMeshes = new Map<WeaponKey, THREE.Object3D>();
  private legs: THREE.Mesh[] = [];
  private yaw = 0;
  private pitch = -0.18;
  private vel = new THREE.Vector3();
  private grounded = true;
  private swing = 0; // 남은 휘두르기 시간
  private swingHit = false;
  private cool = 0;
  private invuln = 0;

  // 상태
  private hp = PLAYER.maxHp;
  private maxHp = PLAYER.maxHp;
  private hunger = PLAYER.maxHunger;
  private breath = PLAYER.maxBreath;
  private stamina = PLAYER.maxStamina;
  private defense = 0;
  private attackBonus = 0;
  private level = 1;
  private xp = 0;
  private kills = 0;
  private arrows = PLAYER.arrowsStart;
  private weapon: WeaponKey = "sword";
  private unlocked: WeaponKey[] = ["sword"];
  private wave = 0;
  private rest = 4; // 첫 웨이브까지 준비 시간
  private timeSec = 0;
  private alive = true;
  private paused = false;
  private locked = false;
  private blocking = false;
  private shake = 0;

  // 월드
  private enemies: Enemy[] = [];
  private arrowList: Arrow[] = [];
  private pickups: Pickup[] = [];
  private orbs: Orb[] = [];
  private floaters: { sprite: THREE.Sprite; life: number; vel: THREE.Vector3 }[] = [];
  private rocks: { pos: THREE.Vector3; r: number }[] = [];
  private particleGeo = new THREE.BufferGeometry();
  private particles: { pos: THREE.Vector3; vel: THREE.Vector3; life: number; max: number; color: THREE.Color }[] = [];
  private particlePoints!: THREE.Points;
  private water!: THREE.Mesh;
  private keys = new Set<string>();
  private hudTimer = 0;

  constructor(private container: HTMLElement, private cb: EngineCallbacks) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.domElement.style.display = "block";
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
    this.buildWorld();
    this.buildPlayer();
    this.buildParticles();
    this.resize();

    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("pointerlockchange", this.onLockChange);
    document.addEventListener("mousemove", this.onMouseMove);
    this.renderer.domElement.addEventListener("mousedown", this.onMouseDown);
    this.renderer.domElement.addEventListener("mouseup", this.onMouseUp);
    this.renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
    this.frame = requestAnimationFrame(this.tick);
  }

  // --- 월드 만들기 ------------------------------------------------------------
  private buildWorld() {
    this.scene.fog = new THREE.Fog(0x10141f, 40, 150);
    const sky = this.gradientTexture("#2b3f6b", "#0a0d16");
    this.scene.background = sky;

    const hemi = new THREE.HemisphereLight(0x9fc0ff, 0x2a2a20, 0.9);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0d0, 2.1);
    sun.position.set(30, 45, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.camera.far = 160;
    sun.shadow.bias = -0.0008;
    this.scene.add(sun);

    // 바닥
    const groundGeo = new THREE.CircleGeometry(ARENA.radius + 6, 96);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3f5a35, roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.disposables.push(groundGeo, groundMat);

    // 호수 (들어가면 숨을 참아야 해요)
    const lakeGeo = new THREE.CylinderGeometry(ARENA.lake.radius, ARENA.lake.radius * 0.8, ARENA.lake.depth, 48, 1, true);
    const lakeMat = new THREE.MeshStandardMaterial({ color: 0x1b3a4a, roughness: 0.9, side: THREE.BackSide });
    const lakeWall = new THREE.Mesh(lakeGeo, lakeMat);
    lakeWall.position.set(ARENA.lake.x, -ARENA.lake.depth / 2, ARENA.lake.z);
    this.scene.add(lakeWall);
    const floorGeo = new THREE.CircleGeometry(ARENA.lake.radius * 0.8, 48);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x14303d, roughness: 1 });
    const lakeFloor = new THREE.Mesh(floorGeo, floorMat);
    lakeFloor.rotation.x = -Math.PI / 2;
    lakeFloor.position.set(ARENA.lake.x, -ARENA.lake.depth, ARENA.lake.z);
    this.scene.add(lakeFloor);
    const waterGeo = new THREE.CircleGeometry(ARENA.lake.radius, 64);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x3fa9d8, transparent: true, opacity: 0.6, roughness: 0.15, metalness: 0.2 });
    this.water = new THREE.Mesh(waterGeo, waterMat);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(ARENA.lake.x, 0.08, ARENA.lake.z);
    this.scene.add(this.water);
    this.disposables.push(lakeGeo, lakeMat, floorGeo, floorMat, waterGeo, waterMat);

    // 바위와 나무 (숨거나 막는 데 쓸 수 있어요)
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6b6f76, roughness: 1, flatShading: true });
    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.38, 3.4, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3b26, roughness: 1 });
    const leafGeo = new THREE.ConeGeometry(2, 4, 9);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 1, flatShading: true });
    this.disposables.push(rockGeo, rockMat, trunkGeo, trunkMat, leafGeo, leafMat);
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 8 + Math.random() * (ARENA.radius - 10);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x - ARENA.lake.x, z - ARENA.lake.z) < ARENA.lake.radius + 3) continue;
      if (Math.hypot(x, z - 12) < 10) continue; // 시작 자리 둘레는 비워 둔다
      if (i % 3 === 0) {
        const s = 0.8 + Math.random() * 1.6;
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(x, s * 0.5, z);
        rock.scale.set(s, s * 0.8, s);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        rock.receiveShadow = true;
        this.scene.add(rock);
        this.rocks.push({ pos: new THREE.Vector3(x, 0, z), r: s });
      } else {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.7;
        trunk.castShadow = true;
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.y = 4.6;
        leaf.castShadow = true;
        tree.add(trunk, leaf);
        tree.position.set(x, 0, z);
        tree.scale.setScalar(0.8 + Math.random() * 0.7);
        this.scene.add(tree);
        this.rocks.push({ pos: new THREE.Vector3(x, 0, z), r: 0.5 });
      }
    }

    // 경기장 울타리 기둥
    const poleGeo = new THREE.CylinderGeometry(0.3, 0.4, 5, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 });
    const fireGeo = new THREE.SphereGeometry(0.45, 12, 10);
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    this.disposables.push(poleGeo, poleMat, fireGeo, fireMat);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(Math.cos(a) * ARENA.radius, 2.5, Math.sin(a) * ARENA.radius);
      pole.castShadow = true;
      this.scene.add(pole);
      const fire = new THREE.Mesh(fireGeo, fireMat);
      fire.position.copy(pole.position).setY(5.2);
      this.scene.add(fire);
      const light = new THREE.PointLight(0xffa04d, 12, 22, 2);
      light.position.copy(fire.position);
      this.scene.add(light);
    }
  }

  private gradientTexture(top: string, bottom: string): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, top);
      g.addColorStop(1, bottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 2, 256);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.disposables.push(tex);
    return tex;
  }

  private buildPlayer() {
    const skin = new THREE.MeshStandardMaterial({ color: 0xf2c49b, roughness: 0.8 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.7 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
    this.disposables.push(skin, cloth, pants);
    const bodyGeo = new THREE.BoxGeometry(0.9, 1.1, 0.5);
    const headGeo = new THREE.SphereGeometry(0.38, 20, 16);
    const armGeo = new THREE.BoxGeometry(0.25, 0.9, 0.25);
    const legGeo = new THREE.BoxGeometry(0.3, 0.9, 0.3);
    this.disposables.push(bodyGeo, headGeo, armGeo, legGeo);

    const body = new THREE.Mesh(bodyGeo, cloth);
    body.position.y = 1.35;
    const head = new THREE.Mesh(headGeo, skin);
    head.position.y = 2.15;
    const armL = new THREE.Mesh(armGeo, skin);
    armL.position.set(-0.6, 1.4, 0);
    this.hand.position.set(0.6, 1.4, 0);
    const armR = new THREE.Mesh(armGeo, skin);
    armR.position.y = 0;
    this.hand.add(armR);
    for (const x of [-0.22, 0.22]) {
      const leg = new THREE.Mesh(legGeo, pants);
      leg.position.set(x, 0.45, 0);
      this.legs.push(leg);
      this.player.add(leg);
    }
    for (const m of [body, head, armL]) m.castShadow = true;
    armR.castShadow = true;
    this.player.add(body, head, armL, this.hand);
    this.player.position.set(0, 0, 12);
    this.scene.add(this.player);

    // 무기 모형
    for (const w of WEAPONS) {
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: w.color, metalness: 0.6, roughness: 0.3 });
      this.disposables.push(mat);
      if (w.key === "sword") {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.05), mat);
        blade.position.y = 0.9;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.12), mat);
        guard.position.y = 0.18;
        group.add(blade, guard);
      } else if (w.key === "spear") {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 8), mat);
        shaft.position.y = 1.2;
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 8), mat);
        tip.position.y = 2.85;
        group.add(shaft, tip);
      } else if (w.key === "axe") {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8), mat);
        shaft.position.y = 0.75;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.12), mat);
        blade.position.set(0.3, 1.4, 0);
        group.add(shaft, blade);
      } else {
        const bow = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 8, 24, Math.PI * 1.2), mat);
        bow.rotation.z = Math.PI / 2;
        bow.position.y = 0.6;
        group.add(bow);
      }
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.castShadow = true;
      });
      group.visible = w.key === this.weapon;
      group.position.y = -0.35;
      this.hand.add(group);
      this.weaponMeshes.set(w.key, group);
    }
  }

  private buildParticles() {
    const max = 600;
    const pos = new Float32Array(max * 3);
    const col = new Float32Array(max * 3);
    this.particleGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.particleGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.particleGeo.setDrawRange(0, 0);
    const mat = new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, depthWrite: false });
    this.particlePoints = new THREE.Points(this.particleGeo, mat);
    this.particlePoints.frustumCulled = false;
    this.scene.add(this.particlePoints);
    this.disposables.push(this.particleGeo, mat);
  }

  private spawnParticles(at: THREE.Vector3, color: string, count = 14, power = 6) {
    const c = new THREE.Color(color);
    for (let i = 0; i < count && this.particles.length < 560; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(power * (0.4 + Math.random()));
      v.y = Math.abs(v.y) * 0.8 + 1.5;
      this.particles.push({ pos: at.clone(), vel: v, life: 0.7, max: 0.7, color: c });
    }
  }

  private floatText(at: THREE.Vector3, text: string, color: string) {
    if (this.floaters.length > 24) return;
    const sprite = textSprite(text, color, text.length > 3 ? 60 : 84);
    sprite.position.copy(at);
    sprite.scale.setScalar(1.6);
    this.scene.add(sprite);
    this.floaters.push({ sprite, life: 1, vel: new THREE.Vector3((Math.random() - 0.5) * 1.2, 3.4, (Math.random() - 0.5) * 1.2) });
  }

  // --- 입력 -------------------------------------------------------------------
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Escape") return;
    this.keys.add(e.code);
    if (e.code === "Digit1") this.setWeapon("sword");
    if (e.code === "Digit2") this.setWeapon("spear");
    if (e.code === "Digit3") this.setWeapon("bow");
    if (e.code === "Digit4") this.setWeapon("axe");
    if (e.code === "Space") e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);

  private onMouseDown = (e: MouseEvent) => {
    // 첫 클릭은 마우스 잠금을 걸면서 바로 공격도 한다
    if (!this.locked) this.requestLock();
    if (e.button === 0) this.tryAttack();
    if (e.button === 2) this.blocking = true;
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 2) this.blocking = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked) return;
    this.yaw -= e.movementX * 0.0022;
    this.pitch = Math.max(-0.7, Math.min(0.5, this.pitch - e.movementY * 0.0018));
  };

  private onLockChange = () => {
    this.locked = document.pointerLockElement === this.renderer.domElement;
    if (!this.locked) this.blocking = false;
    this.cb.onLockChange(this.locked);
  };

  requestLock() {
    if (this.alive && !this.paused) this.renderer.domElement.requestPointerLock();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused && this.locked) document.exitPointerLock();
  }

  setWeapon(key: WeaponKey) {
    if (!this.unlocked.includes(key)) {
      this.cb.onLog(`${weaponOf(key).name}은(는) 레벨 ${weaponOf(key).unlockLevel}부터 쓸 수 있어요`, "info");
      return;
    }
    this.weapon = key;
    for (const [k, mesh] of this.weaponMeshes) mesh.visible = k === key;
  }

  // --- 전투 -------------------------------------------------------------------
  private tryAttack() {
    const w = weaponOf(this.weapon);
    if (this.cool > 0 || this.swing > 0 || !this.alive) return;
    if (this.stamina < w.stamina) {
      this.cb.onLog("기력이 부족해요! 잠깐 쉬세요", "bad");
      return;
    }
    if (w.key === "bow" && this.arrows <= 0) {
      this.cb.onLog("화살이 없어요! 화살 줍기 🏹", "bad");
      return;
    }
    this.stamina -= w.stamina;
    playSfx("swing");
    this.cool = w.cooldown;
    this.swing = w.windup + 0.18;
    this.swingHit = false;
  }

  private doHit() {
    const w = weaponOf(this.weapon);
    const damage = (w.damage + this.attackBonus) * (0.9 + Math.random() * 0.3);
    if (w.key === "bow") {
      this.arrows--;
      const geo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6);
      const mat = new THREE.MeshStandardMaterial({ color: 0xdfe7c8 });
      const mesh = new THREE.Mesh(geo, mat);
      const dir = new THREE.Vector3(-Math.sin(this.yaw), Math.sin(this.pitch) * 0.6, -Math.cos(this.yaw)).normalize();
      mesh.position.copy(this.player.position).add(new THREE.Vector3(0, 1.6, 0)).addScaledVector(dir, 1.2);
      mesh.quaternion.setFromUnitVectors(UP, dir);
      this.scene.add(mesh);
      this.arrowList.push({ mesh, vel: dir.multiplyScalar(48), life: 2.2, damage });
      return;
    }
    // 근접 무기: 앞쪽 부채꼴 안에 있는 적을 때린다
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    let hit = 0;
    for (const e of this.enemies) {
      if (e.dead > 0) continue;
      tmp.subVectors(e.root.position, this.player.position);
      const dist = tmp.length() - e.type.radius;
      if (dist > w.range) continue;
      tmp.y = 0;
      tmp.normalize();
      const angle = THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.max(-1, tmp.dot(forward)))));
      if (angle > w.arc / 2) continue;
      this.damageEnemy(e, damage, tmp.clone().multiplyScalar(w.knockback));
      hit++;
      if (hit >= 4) break;
    }
    if (hit > 0) this.shake = Math.min(0.5, this.shake + 0.12);
  }

  private damageEnemy(e: Enemy, damage: number, knock: THREE.Vector3) {
    let dmg = damage;
    // 방패병은 앞에서 맞으면 절반만 아파요
    if (e.type.key === "shield") {
      tmp2.subVectors(this.player.position, e.root.position).setY(0).normalize();
      const facing = new THREE.Vector3(Math.sin(e.root.rotation.y), 0, Math.cos(e.root.rotation.y));
      if (tmp2.dot(facing) > 0.3) dmg *= 0.5;
    }
    e.hp -= dmg;
    e.hurt = 0.18;
    playSfx("hit");
    e.vel.add(knock);
    const at = e.root.position.clone().setY(e.root.position.y + e.type.radius + 0.6);
    this.floatText(at, String(Math.round(dmg)), dmg > 45 ? "#ffd54a" : "#ffffff");
    this.spawnParticles(at, e.type.color, 10, 5);
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy) {
    e.dead = 0.5;
    this.kills++;
    this.spawnParticles(e.root.position.clone().setY(1), e.type.color, 26, 8);
    // 경험치 구슬
    const geo = new THREE.IcosahedronGeometry(0.28, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0x9be7ff });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(e.root.position).setY(1);
    this.scene.add(mesh);
    this.orbs.push({ mesh, xp: e.type.xp, vel: new THREE.Vector3((Math.random() - 0.5) * 3, 5, (Math.random() - 0.5) * 3) });
    // 가끔 아이템을 떨어뜨려요
    if (Math.random() < (e.type.boss ? 1 : 0.22)) {
      const keys: PickupKey[] = ["meat", "potion", "armor", "arrows"];
      const key = keys[Math.floor(Math.random() * keys.length)];
      this.spawnPickup(key, e.root.position.clone());
      if (e.type.boss) {
        this.spawnPickup("potion", e.root.position.clone().add(new THREE.Vector3(2, 0, 0)));
        this.spawnPickup("armor", e.root.position.clone().add(new THREE.Vector3(-2, 0, 0)));
      }
    }
    if (e.type.boss) this.cb.onLog("🗿 보스를 쓰러뜨렸어요!", "good");
  }

  private spawnPickup(key: PickupKey, at: THREE.Vector3) {
    const info = PICKUPS[key];
    const root = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color: info.color, emissive: new THREE.Color(info.color).multiplyScalar(0.35), roughness: 0.4 });
    const box = new THREE.Mesh(geo, mat);
    box.castShadow = true;
    const label = textSprite(info.emoji, "#ffffff", 80);
    label.position.y = 0.9;
    label.scale.setScalar(1.1);
    root.add(box, label);
    root.position.copy(at).setY(0.6);
    this.scene.add(root);
    this.pickups.push({ key, root, spin: Math.random() });
  }

  private hurtPlayer(damage: number, from: THREE.Vector3) {
    if (this.invuln > 0 || !this.alive) return;
    let dmg = Math.max(1, damage - this.defense * 0.8);
    if (this.blocking && this.stamina > 5) {
      dmg *= 1 - PLAYER.blockReduce;
      this.stamina = Math.max(0, this.stamina - 12);
      this.spawnParticles(this.player.position.clone().setY(1.6), "#9fd8ff", 12, 5);
    }
    this.hp -= dmg;
    playSfx(this.blocking ? "block" : "hurt");
    this.invuln = PLAYER.invulnerable;
    this.shake = Math.min(0.8, this.shake + 0.25);
    this.floatText(this.player.position.clone().setY(2.6), `-${Math.round(dmg)}`, "#ff6b6b");
    tmp.subVectors(this.player.position, from).setY(0).normalize().multiplyScalar(6);
    this.vel.add(tmp);
    if (this.hp <= 0) this.die();
  }

  private die() {
    this.hp = 0;
    this.alive = false;
    playSfx("death");
    if (this.locked) document.exitPointerLock();
    this.cb.onGameOver({ wave: this.wave, kills: this.kills, level: this.level, timeSec: Math.round(this.timeSec) });
  }

  private gainXp(amount: number) {
    this.xp += amount;
    let need = xpForLevel(this.level);
    while (this.xp >= need) {
      this.xp -= need;
      this.level++;
      this.maxHp += 10;
      this.hp = Math.min(this.maxHp, this.hp + 35);
      this.attackBonus += 2;
      need = xpForLevel(this.level);
      const newWeapons = WEAPONS.filter((w) => w.unlockLevel === this.level).map((w) => w.key);
      for (const k of newWeapons) {
        this.unlocked.push(k);
        this.cb.onLog(`🎁 새 무기! ${weaponOf(k).emoji} ${weaponOf(k).name}`, "good");
      }
      this.cb.onLog(`⬆️ 레벨 ${this.level}! 체력과 공격력이 올랐어요`, "good");
      playSfx("level");
      this.spawnParticles(this.player.position.clone().setY(1.5), "#ffe066", 30, 7);
    }
  }

  // --- 웨이브 -----------------------------------------------------------------
  private startWave() {
    this.wave++;
    const scale = waveScale(this.wave);
    const list = waveSpawns(this.wave);
    for (const key of list) this.spawnEnemy(key, scale);
    const boss = list.includes("golem");
    playSfx(boss ? "boss" : "wave");
    this.cb.onLog(boss ? `👹 웨이브 ${this.wave} — 보스 등장!` : `⚔️ 웨이브 ${this.wave} 시작!`, boss ? "bad" : "info");
  }

  private spawnEnemy(key: EnemyKey, scale: { hp: number; damage: number }) {
    const type = enemyOf(key);
    const root = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: type.color, roughness: 0.8, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: type.color2, roughness: 0.9, flatShading: true });
    this.disposables.push(mat, dark);
    if (key === "slime") {
      const body = new THREE.Mesh(new THREE.SphereGeometry(type.radius, 16, 12), mat);
      body.scale.y = 0.75;
      body.position.y = type.radius * 0.75;
      const eyeGeo = new THREE.SphereGeometry(0.12, 8, 8);
      for (const x of [-0.25, 0.25]) {
        const eye = new THREE.Mesh(eyeGeo, dark);
        eye.position.set(x, type.radius * 0.9, type.radius * 0.75);
        root.add(eye);
      }
      body.castShadow = true;
      root.add(body);
    } else if (key === "wolf") {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.7), mat);
      body.position.y = 0.9;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.55), mat);
      head.position.set(0.9, 1.1, 0);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.18), dark);
      tail.position.set(-0.9, 1.05, 0);
      for (const [x, z] of [[0.5, 0.3], [0.5, -0.3], [-0.5, 0.3], [-0.5, -0.3]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), dark);
        leg.position.set(x, 0.35, z);
        root.add(leg);
      }
      for (const m of [body, head, tail]) m.castShadow = true;
      root.add(body, head, tail);
    } else if (key === "shield") {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.6), mat);
      body.position.y = 1.3;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), dark);
      head.position.y = 2.15;
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.3, 1.1), dark);
      shield.position.set(0, 1.4, 0.7);
      for (const m of [body, head, shield]) m.castShadow = true;
      root.add(body, head, shield);
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 1.8), mat);
      body.position.y = 2.6;
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.2), dark);
      head.position.y = 4.4;
      const eyeGeo = new THREE.SphereGeometry(0.16, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff6b3d });
      this.disposables.push(eyeGeo, eyeMat);
      for (const x of [-0.3, 0.3]) {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(x, 4.5, 0.62);
        root.add(eye);
      }
      for (const x of [-1.6, 1.6]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 0.8), mat);
        arm.position.set(x, 2.8, 0);
        arm.castShadow = true;
        root.add(arm);
      }
      for (const x of [-0.7, 0.7]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.9), dark);
        leg.position.set(x, 0.65, 0);
        root.add(leg);
      }
      for (const m of [body, head]) m.castShadow = true;
      root.add(body, head);
    }
    // 플레이어에게서 조금 떨어진 곳에서 등장 (너무 멀면 기다리기 지루해요)
    const a = Math.random() * Math.PI * 2;
    const r = 16 + Math.random() * 12;
    root.position.set(
      THREE.MathUtils.clamp(this.player.position.x + Math.cos(a) * r, -ARENA.radius + 2, ARENA.radius - 2),
      0,
      THREE.MathUtils.clamp(this.player.position.z + Math.sin(a) * r, -ARENA.radius + 2, ARENA.radius - 2),
    );
    this.scene.add(root);
    this.enemies.push({
      type,
      root,
      hp: type.hp * scale.hp,
      maxHp: type.hp * scale.hp,
      damage: type.damage * scale.damage,
      cool: 1 + Math.random(),
      windup: 0,
      hurt: 0,
      dead: 0,
      vel: new THREE.Vector3(),
      bob: Math.random() * 6,
    });
  }

  // --- 매 프레임 ---------------------------------------------------------------
  private tick = () => {
    this.frame = requestAnimationFrame(this.tick);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (!this.paused && this.alive) this.update(dt);
    this.updateVisualOnly(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number) {
    this.timeSec += dt;
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateArrows(dt);
    this.updatePickups(dt);
    this.updateWave(dt);
    this.updateStats(dt);

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.1;
      this.emitState();
    }
  }

  private updatePlayer(dt: number) {
    const sprinting = this.keys.has("ShiftLeft") && this.stamina > 1 && !this.blocking;
    const speed = (this.blocking ? 3.4 : sprinting ? PLAYER.sprintSpeed : PLAYER.speed) * (this.underwater() ? 0.6 : 1);
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const move = new THREE.Vector3();
    if (this.keys.has("KeyW")) move.add(forward);
    if (this.keys.has("KeyS")) move.sub(forward);
    if (this.keys.has("KeyD")) move.add(right);
    if (this.keys.has("KeyA")) move.sub(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed);
      if (sprinting) this.stamina = Math.max(0, this.stamina - PLAYER.sprintDrain * dt);
    }
    // 부드럽게 가속
    this.vel.x = THREE.MathUtils.lerp(this.vel.x, move.x, 1 - Math.pow(0.0006, dt));
    this.vel.z = THREE.MathUtils.lerp(this.vel.z, move.z, 1 - Math.pow(0.0006, dt));

    const water = this.underwater();
    if (this.keys.has("Space") && this.grounded) {
      this.vel.y = water ? PLAYER.jump * 0.6 : PLAYER.jump;
      this.grounded = false;
    }
    this.vel.y -= PLAYER.gravity * (water ? 0.35 : 1) * dt;
    this.player.position.addScaledVector(this.vel, dt);

    // 땅·물 높이 맞추기
    const floor = this.inLake() ? -ARENA.lake.depth + 0.2 : 0;
    if (this.player.position.y <= floor) {
      this.player.position.y = floor;
      this.vel.y = 0;
      this.grounded = true;
    }
    // 경기장 밖으로 못 나가요
    const dist = Math.hypot(this.player.position.x, this.player.position.z);
    if (dist > ARENA.radius - 1) {
      const k = (ARENA.radius - 1) / dist;
      this.player.position.x *= k;
      this.player.position.z *= k;
    }
    // 바위에 부딪히면 밀려나요
    for (const rock of this.rocks) {
      tmp.subVectors(this.player.position, rock.pos).setY(0);
      const d = tmp.length();
      const min = rock.r + 0.6;
      if (d < min && d > 0.001) {
        tmp.normalize().multiplyScalar(min - d);
        this.player.position.add(tmp);
      }
    }
    this.player.rotation.y = this.yaw;

    // 걷는 다리 움직임
    const moving = Math.hypot(this.vel.x, this.vel.z) > 0.6;
    const t = this.timeSec * (sprinting ? 14 : 9);
    this.legs.forEach((leg, i) => {
      leg.rotation.x = moving ? Math.sin(t + i * Math.PI) * 0.7 : THREE.MathUtils.lerp(leg.rotation.x, 0, 0.2);
      leg.position.y = 0.45;
    });

    // 공격 동작
    this.cool = Math.max(0, this.cool - dt);
    if (this.swing > 0) {
      const w = weaponOf(this.weapon);
      this.swing -= dt;
      const progress = 1 - this.swing / (w.windup + 0.18);
      this.hand.rotation.x = -Math.sin(progress * Math.PI) * (w.key === "spear" ? 0.6 : 2.2);
      if (!this.swingHit && progress >= w.windup / (w.windup + 0.18)) {
        this.swingHit = true;
        this.doHit();
      }
    } else {
      this.hand.rotation.x = THREE.MathUtils.lerp(this.hand.rotation.x, this.blocking ? -0.9 : 0, 0.2);
    }
    this.invuln = Math.max(0, this.invuln - dt);

    // 카메라 (3인칭, 살짝 흔들림)
    this.shake = Math.max(0, this.shake - dt * 1.6);
    const back = 7.5 - this.pitch * 3;
    const target = new THREE.Vector3(
      this.player.position.x + Math.sin(this.yaw) * back,
      this.player.position.y + 4.2 + this.pitch * 5,
      this.player.position.z + Math.cos(this.yaw) * back,
    );
    this.camera.position.lerp(target, 1 - Math.pow(0.0015, dt));
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
    }
    this.camera.lookAt(this.player.position.x, this.player.position.y + 1.8 + this.pitch * 2, this.player.position.z);
  }

  private inLake(pos: THREE.Vector3 = this.player.position) {
    return Math.hypot(pos.x - ARENA.lake.x, pos.z - ARENA.lake.z) < ARENA.lake.radius - 0.5;
  }

  private underwater() {
    return this.inLake() && this.player.position.y < -0.6;
  }

  private updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.dead > 0) {
        e.dead -= dt;
        e.root.scale.multiplyScalar(1 - dt * 3);
        e.root.position.y -= dt * 2;
        if (e.dead <= 0) {
          this.scene.remove(e.root);
          this.enemies.splice(i, 1);
        }
        continue;
      }
      e.hurt = Math.max(0, e.hurt - dt);
      e.root.traverse((o) => {
        if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) {
          o.material.emissive.setRGB(e.hurt * 2, 0, 0);
        }
      });

      tmp.subVectors(this.player.position, e.root.position).setY(0);
      const dist = tmp.length();
      tmp.normalize();
      e.root.rotation.y = Math.atan2(tmp.x, tmp.z);

      if (e.windup > 0) {
        // 공격 준비: 살짝 뒤로 몸을 뺐다가 친다
        e.windup -= dt;
        e.root.scale.setScalar(1 + Math.sin((1 - e.windup / e.type.windup) * Math.PI) * 0.12);
        if (e.windup <= 0) {
          e.root.scale.setScalar(1);
          const reach = e.type.attackRange + 0.8;
          if (e.type.boss) {
            // 보스는 땅을 내려쳐 주변을 공격해요
            this.spawnParticles(e.root.position.clone().setY(0.3), "#ffcf8a", 34, 9);
            this.shake = 0.6;
            if (this.player.position.distanceTo(e.root.position) < 7) this.hurtPlayer(e.damage, e.root.position);
          } else if (this.player.position.distanceTo(e.root.position) < reach) {
            this.hurtPlayer(e.damage, e.root.position);
          }
        }
      } else {
        e.cool = Math.max(0, e.cool - dt);
        const wantDist = e.type.attackRange * 0.8;
        if (dist > wantDist) {
          const speed = e.type.speed * (e.type.key === "slime" ? 1 + Math.sin(this.timeSec * 6 + e.bob) * 0.3 : 1);
          e.vel.addScaledVector(tmp, speed * dt * 6);
        }
        if (dist < e.type.attackRange && e.cool <= 0) {
          e.windup = e.type.windup;
          e.cool = e.type.attackCooldown;
        }
      }

      // 서로 겹치지 않게 살짝 밀어내기
      for (const other of this.enemies) {
        if (other === e || other.dead > 0) continue;
        tmp2.subVectors(e.root.position, other.root.position).setY(0);
        const d = tmp2.length();
        const min = e.type.radius + other.type.radius;
        if (d < min && d > 0.01) e.vel.addScaledVector(tmp2.normalize(), (min - d) * 6 * dt * 10);
      }

      e.vel.multiplyScalar(Math.pow(0.02, dt));
      e.root.position.addScaledVector(e.vel, dt);
      // 슬라임은 통통 튀어요
      if (e.type.key === "slime") e.root.position.y = Math.abs(Math.sin(this.timeSec * 5 + e.bob)) * 0.5;
      else e.root.position.y = 0;
      if (this.inLake(e.root.position)) e.root.position.y -= 0.8;
    }
  }

  private updateArrows(dt: number) {
    for (let i = this.arrowList.length - 1; i >= 0; i--) {
      const a = this.arrowList[i];
      a.life -= dt;
      a.vel.y -= 9 * dt;
      a.mesh.position.addScaledVector(a.vel, dt);
      a.mesh.quaternion.setFromUnitVectors(UP, a.vel.clone().normalize());
      let hit = false;
      for (const e of this.enemies) {
        if (e.dead > 0) continue;
        if (a.mesh.position.distanceTo(e.root.position.clone().setY(e.root.position.y + e.type.radius)) < e.type.radius + 0.5) {
          this.damageEnemy(e, a.damage, a.vel.clone().setY(0).normalize().multiplyScalar(3));
          hit = true;
          break;
        }
      }
      if (hit || a.life <= 0 || a.mesh.position.y < 0) {
        this.scene.remove(a.mesh);
        a.mesh.geometry.dispose();
        (a.mesh.material as THREE.Material).dispose();
        this.arrowList.splice(i, 1);
      }
    }
  }

  private updatePickups(dt: number) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.spin += dt;
      p.root.rotation.y = p.spin * 2;
      p.root.position.y = 0.6 + Math.sin(p.spin * 3) * 0.15;
      if (p.root.position.distanceTo(this.player.position) < 1.8) {
        this.applyPickup(p.key);
        this.scene.remove(p.root);
        this.pickups.splice(i, 1);
      }
    }
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.vel.y -= 14 * dt;
      o.mesh.position.addScaledVector(o.vel, dt);
      if (o.mesh.position.y < 0.3) {
        o.mesh.position.y = 0.3;
        o.vel.set(0, 0, 0);
      }
      // 가까이 가면 빨려 와요
      const d = o.mesh.position.distanceTo(this.player.position);
      if (d < 7) {
        tmp.subVectors(this.player.position, o.mesh.position).normalize().multiplyScalar(16 * dt);
        o.mesh.position.add(tmp);
      }
      o.mesh.rotation.y += dt * 4;
      if (d < 1.4) {
        this.gainXp(o.xp);
        this.scene.remove(o.mesh);
        o.mesh.geometry.dispose();
        (o.mesh.material as THREE.Material).dispose();
        this.orbs.splice(i, 1);
      }
    }
  }

  private applyPickup(key: PickupKey) {
    const info = PICKUPS[key];
    if (key === "meat") this.hunger = Math.min(PLAYER.maxHunger, this.hunger + 35);
    if (key === "potion") this.hp = Math.min(this.maxHp, this.hp + 45);
    if (key === "armor") this.defense = Math.min(PLAYER.maxDefense, this.defense + 2);
    if (key === "arrows") this.arrows += 15;
    this.cb.onLog(`${info.emoji} ${info.name} — ${info.desc}`, "good");
    playSfx("pickup");
    this.spawnParticles(this.player.position.clone().setY(1.2), info.color, 14, 5);
  }

  private updateWave(dt: number) {
    const alive = this.enemies.filter((e) => e.dead <= 0).length;
    if (this.rest > 0) {
      this.rest -= dt;
      if (this.rest <= 0) this.startWave();
      return;
    }
    if (alive === 0 && this.enemies.length === 0) {
      this.rest = 8;
      this.hp = Math.min(this.maxHp, this.hp + 15);
      this.cb.onLog(`✅ 웨이브 ${this.wave} 클리어! 8초 동안 쉬어요`, "good");
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 5 + Math.random() * 12;
        const keys: PickupKey[] = ["meat", "potion", "arrows"];
        this.spawnPickup(keys[i % keys.length], new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
    }
  }

  private updateStats(dt: number) {
    // 허기: 시간이 지나면 줄고, 0 이면 체력이 깎여요
    this.hunger = Math.max(0, this.hunger - PLAYER.hungerDrain * dt * (this.keys.has("ShiftLeft") ? 1.6 : 1));
    if (this.hunger <= 0) this.hp -= PLAYER.starveDamage * dt;
    // 호흡: 물속에서 줄고 밖에서 빨리 차요
    if (this.underwater()) {
      this.breath = Math.max(0, this.breath - PLAYER.breathDrain * dt);
      if (this.breath <= 0) this.hp -= PLAYER.drownDamage * dt;
    } else {
      this.breath = Math.min(PLAYER.maxBreath, this.breath + PLAYER.breathRegen * dt);
    }
    // 기력: 막고 있으면 줄고, 가만히 있으면 차요
    if (this.blocking) this.stamina = Math.max(0, this.stamina - PLAYER.blockDrain * dt);
    else this.stamina = Math.min(PLAYER.maxStamina, this.stamina + PLAYER.staminaRegen * dt);
    if (this.stamina <= 0) this.blocking = false;
    if (this.hp <= 0) this.die();
  }

  // 멈춰 있어도 계속 움직이는 것들 (파티클·숫자·물결)
  private updateVisualOnly(dt: number) {
    const pos = this.particleGeo.attributes.position.array as Float32Array;
    const col = this.particleGeo.attributes.color.array as Float32Array;
    let n = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vel.y -= 14 * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (n < 600) {
        pos.set([p.pos.x, p.pos.y, p.pos.z], n * 3);
        const f = p.life / p.max;
        col.set([p.color.r * f, p.color.g * f, p.color.b * f], n * 3);
        n++;
      }
    }
    this.particleGeo.setDrawRange(0, n);
    this.particleGeo.attributes.position.needsUpdate = true;
    this.particleGeo.attributes.color.needsUpdate = true;

    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      f.sprite.position.addScaledVector(f.vel, dt);
      f.vel.y -= 4 * dt;
      f.sprite.material.opacity = Math.max(0, f.life);
      if (f.life <= 0) {
        this.scene.remove(f.sprite);
        f.sprite.material.map?.dispose();
        f.sprite.material.dispose();
        this.floaters.splice(i, 1);
      }
    }
    // 물결
    this.water.position.y = 0.08 + Math.sin(this.clock.elapsedTime * 1.5) * 0.05;
  }

  private emitState() {
    const boss = this.enemies.find((e) => e.type.boss && e.dead <= 0);
    this.cb.onState({
      hp: Math.max(0, this.hp),
      maxHp: this.maxHp,
      hunger: this.hunger,
      breath: this.breath,
      stamina: this.stamina,
      defense: this.defense,
      attack: weaponOf(this.weapon).damage + this.attackBonus,
      level: this.level,
      xp: this.xp,
      xpNeed: xpForLevel(this.level),
      wave: this.wave,
      enemiesLeft: this.enemies.filter((e) => e.dead <= 0).length,
      kills: this.kills,
      arrows: this.arrows,
      weapon: this.weapon,
      unlocked: [...this.unlocked],
      underwater: this.underwater(),
      blocking: this.blocking,
      restSeconds: Math.max(0, Math.ceil(this.rest)),
      timeSec: Math.round(this.timeSec),
      bossHp: boss ? Math.max(0, boss.hp) : null,
      bossMaxHp: boss ? boss.maxHp : null,
      locked: this.locked,
    });
  }

  private resize = () => {
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  dispose() {
    cancelAnimationFrame(this.frame);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("pointerlockchange", this.onLockChange);
    document.removeEventListener("mousemove", this.onMouseMove);
    if (document.pointerLockElement) document.exitPointerLock();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        o.geometry.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    });
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
