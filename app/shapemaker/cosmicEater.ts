import * as THREE from "three";
import { levelOf, stageOf, type StageKey } from "./cosmic";
import { dotTexture } from "./storm";

// ----------------------------------------------------------------------------
// 먹보 천체: 가장 큰 허리케인의 눈에 놓는다. 반지름 1(허리케인 눈) 기준으로 만들고 통째로 키운다.
// 레벨에 따라 모습과 크기가 바뀐다.
//   🌫️ 먼지구름: 넓게 퍼진 알록달록 성운          ⭐ 별: 작고 둥근 별 + 코로나
//   💥 초신성: 사방으로 퍼지는 폭발 껍질 + 충격파   🧲 마그네타: 아주 작은 핵 + 자기장 고리 + 빛줄기
//   🕳️ 블랙홀: 검은 구멍 + 광자 고리 + 강착 원반   🌌 은하: 안드로메다처럼 기울어진 나선 은하
// 모든 단계 공통으로 바깥 먼지가 나선을 그리며 가운데로 빨려 들어간다(꼬리 포함).
// ----------------------------------------------------------------------------

const DUST = 4000;
const DISK = 1800;
const TAIL_TIME = 0.12; // 꼬리 길이 = 이만큼(초) 전에 있던 자리까지
// 통계 숫자를 크게 보여 주는 배율 (게임 속 재미 단위). 빛의 속도 %·레벨·나이는 그대로 둔다
const STAT_SCALE = 10;
const STATS_HORIZON = 0.07; // 통계용 기준 반지름 (모습과 상관없이 질량에 비례)

// 반지름 r 에서의 빨려 드는 속도와 도는 속도 (r 은 핵 반지름 0.07 을 기준으로 맞춘 값)
const inwardSpeed = (r: number) => (0.06 + 0.035 / (r * r + 0.004)) * 0.35;
const spinSpeed = (r: number) => 0.35 / Math.pow(r, 1.5);

type RGB = [number, number, number];

interface Look {
  coreR: number; // 가운데 핵(먼지가 사라지는 곳) 반지름
  core: string | null; // 핵 색 (null 이면 핵을 그리지 않음)
  glow: [number, string][]; // 빛 그라데이션
  glowSize: number; // 빛 지름
  cold: RGB; // 바깥 먼지 색
  hot: RGB; // 가운데 가까운 먼지 색
  pull: number; // 빨려 드는 세기 (은하·먼지구름은 느긋하게 돈다)
  tail: number; // 꼬리 밝기
  dustBright: number; // 빨려 드는 먼지 밝기 (은하·성운은 자기 모양이 주인공이라 어둡게)
}

const LOOKS: Record<StageKey, Look> = {
  dust: {
    coreR: 0.05, core: null, glowSize: 1.2, pull: 0.35, tail: 0.25, dustBright: 0.45,
    glow: [[0, "rgba(210,170,140,0.35)"], [0.5, "rgba(140,100,170,0.15)"], [1, "rgba(0,0,0,0)"]],
    cold: [0.35, 0.3, 0.28], hot: [0.55, 0.45, 0.4], // 먼지구름은 뜨겁지 않다
  },
  star: {
    coreR: 0.08, core: "#ffd25a", glowSize: 0.55, pull: 1, tail: 0.8, dustBright: 0.7,
    glow: [[0, "rgba(255,250,215,1)"], [0.22, "rgba(255,210,90,0.8)"], [0.5, "rgba(255,140,30,0.25)"], [1, "rgba(0,0,0,0)"]],
    cold: [0.35, 0.4, 0.55], hot: [1, 0.9, 0.6],
  },
  supernova: {
    coreR: 0.09, core: "#f4fbff", glowSize: 0.9, pull: 1, tail: 0.6, dustBright: 0.5,
    glow: [[0, "rgba(255,255,255,1)"], [0.18, "rgba(200,225,255,0.9)"], [0.5, "rgba(255,130,210,0.3)"], [1, "rgba(0,0,0,0)"]],
    cold: [0.45, 0.45, 0.7], hot: [1, 1, 1],
  },
  magnetar: {
    coreR: 0.035, core: "#d8fbff", glowSize: 0.3, pull: 1.3, tail: 0.8, dustBright: 0.6,
    glow: [[0, "rgba(230,252,255,1)"], [0.25, "rgba(90,210,255,0.7)"], [0.6, "rgba(150,80,255,0.3)"], [1, "rgba(0,0,0,0)"]],
    cold: [0.3, 0.35, 0.6], hot: [0.6, 1, 1],
  },
  blackhole: {
    coreR: 0.1, core: "#000000", glowSize: 0.9, pull: 1, tail: 1, dustBright: 1,
    glow: [[0, "rgba(0,0,0,0)"], [0.2, "rgba(0,0,0,0)"], [0.24, "rgba(255,240,200,1)"], [0.34, "rgba(255,150,60,0.7)"], [0.6, "rgba(160,60,255,0.2)"], [1, "rgba(0,0,0,0)"]],
    cold: [0.3, 0.35, 0.55], hot: [1, 0.85, 0.55],
  },
  galaxy: {
    coreR: 0.08, core: null, glowSize: 0.55, pull: 0.25, tail: 0.15, dustBright: 0.25,
    glow: [[0, "rgba(255,245,215,1)"], [0.2, "rgba(255,215,150,0.75)"], [0.55, "rgba(255,190,120,0.15)"], [1, "rgba(0,0,0,0)"]],
    cold: [0.55, 0.65, 1], hot: [1, 0.95, 0.85],
  },
};

function gradientSprite(stops: [number, string][], size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [at, color] of stops) g.addColorStop(at, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

export interface BlackHoleSettings {
  size: number; // 크기(질량) 배율 (1 = 기본)
  brightness: number; // 밝기 배율
  pull: number; // 빨아들이는 힘 배율
}

// 화면 통계용 값 (게임 속 재미 단위: 월드 1 = 1,000 km)
export interface BlackHoleStats {
  level: number;
  stage: StageKey;
  horizonKm: number; // 핵 반지름
  solarMasses: number; // 질량 (슈바르츠실트 반지름 2.95km = 태양 1개)
  brightness: number; // 밝기 %
  temperatureK: number; // 원반 안쪽 온도
  diskRpm: number; // 원반 안쪽이 1분에 도는 바퀴
  fastestPctC: number; // 가장 빠른 먼지 속도 (빛의 속도 %)
  swallowed: number; // 지금까지 삼킨 먼지
  perSecond: number; // 1초에 삼키는 먼지
  ageSec: number; // 생긴 지 몇 초
  nearDust: number; // 핵 2배 안쪽에 있는 먼지
  eatenPlanets: string[]; // 먹은 천체 이름
}

export class BlackHole {
  readonly group = new THREE.Group();
  private disposables: { dispose: () => void }[] = [];

  // 공통: 빨려 드는 먼지 + 꼬리, 가운데 핵, 빛
  private dustData = new Float32Array(DUST * 3); // r, theta, y
  private dustPos = new Float32Array(DUST * 3);
  private dustCol = new Float32Array(DUST * 3);
  private tailPos = new Float32Array(DUST * 6);
  private tailCol = new Float32Array(DUST * 6);
  private dust: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private tails: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private core: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private glow: THREE.Sprite;
  private glowTextures = new Map<StageKey, THREE.CanvasTexture>();

  // 단계별 모습 (크기 1 기준으로 만들고 stageScale 로 키운다)
  private parts: Record<StageKey, THREE.Group> = {
    dust: new THREE.Group(),
    star: new THREE.Group(),
    supernova: new THREE.Group(),
    magnetar: new THREE.Group(),
    blackhole: new THREE.Group(),
    galaxy: new THREE.Group(),
  };
  private nebula: THREE.Sprite[] = [];
  private corona!: THREE.Sprite;
  private shell!: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private shellDir = new Float32Array(0);
  private shellPos = new Float32Array(0);
  private shellT = 0;
  private shock!: THREE.Sprite;
  private magnet = new THREE.Group(); // 자기장 고리 + 빛줄기 (함께 돈다)
  private diskData = new Float32Array(DISK * 3); // 핵 대비 반지름, theta, y
  private diskPos = new Float32Array(DISK * 3);
  private disk!: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private spiral = new THREE.Group(); // 은하 원반 (기울어진 채로 돈다)

  private stage: StageKey = "dust";
  private stageScale = 1;
  private settings: BlackHoleSettings = { size: 1, brightness: 1, pull: 1 };
  private worldRadius = 1;
  private swallowed = 0;
  private rate = 0;
  private age = 0;
  private heatSum = 0;
  private fastest = 0;
  private near = 0;
  private flash = 0; // 먹은 직후 번쩍임 (1 → 0)
  private eaten: string[] = [];

  constructor() {
    const coreGeo = new THREE.SphereGeometry(1, 32, 16);
    this.core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0x000000 }));
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ ...additive }));
    this.disposables.push(coreGeo, this.core.material, this.glow.material);

    for (let i = 0; i < DUST; i++) this.spawnDust(i, Math.random());
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(this.dustPos, 3));
    dustGeo.setAttribute("color", new THREE.BufferAttribute(this.dustCol, 3));
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.016, map: dotTexture(), vertexColors: true, ...additive }));
    const tailGeo = new THREE.BufferGeometry();
    tailGeo.setAttribute("position", new THREE.BufferAttribute(this.tailPos, 3));
    tailGeo.setAttribute("color", new THREE.BufferAttribute(this.tailCol, 3));
    this.tails = new THREE.LineSegments(tailGeo, new THREE.LineBasicMaterial({ vertexColors: true, ...additive }));
    this.disposables.push(dustGeo, this.dust.material, tailGeo, this.tails.material);

    this.buildNebula();
    this.buildStar();
    this.buildSupernova();
    this.buildMagnetar();
    this.buildBlackHole();
    this.buildGalaxy();

    this.group.add(this.glow, ...Object.values(this.parts), this.tails, this.dust, this.core);
    this.group.visible = false;
    this.applyStage(true);
    this.step(0);
  }

  // 🌫️ 먼지구름: 알록달록한 구름 덩어리 70개가 넓게 퍼진 성운
  private buildNebula() {
    const palette = ["rgba(200,140,110,", "rgba(150,110,190,", "rgba(110,140,200,", "rgba(210,120,160,"];
    const textures = palette.map((c) => gradientSprite([[0, c + "0.55)"], [0.5, c + "0.2)"], [1, c + "0)"]], 128));
    this.disposables.push(...textures);
    for (let i = 0; i < 70; i++) {
      const mat = new THREE.SpriteMaterial({ map: textures[i % textures.length], ...additive, opacity: 0.5 });
      const puff = new THREE.Sprite(mat);
      const r = Math.sqrt(Math.random()) * 0.8;
      const a = Math.random() * Math.PI * 2;
      puff.position.set(r * Math.cos(a), gauss() * 0.15, r * Math.sin(a));
      puff.scale.setScalar(0.2 + Math.random() * 0.4);
      puff.userData.spin = (Math.random() - 0.5) * 0.3;
      this.nebula.push(puff);
      this.parts.dust.add(puff);
      this.disposables.push(mat);
    }
  }

  // ⭐ 별: 둥근 별 둘레에 넓은 코로나
  private buildStar() {
    const tex = gradientSprite([[0, "rgba(255,240,190,0.9)"], [0.3, "rgba(255,190,80,0.35)"], [1, "rgba(255,120,0,0)"]]);
    this.corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, ...additive }));
    this.corona.scale.setScalar(0.45);
    this.parts.star.add(this.corona);
    this.disposables.push(tex, this.corona.material);
  }

  // 💥 초신성: 사방으로 퍼져 나가는 폭발 껍질 + 충격파 고리
  private buildSupernova() {
    const n = 2500;
    this.shellDir = new Float32Array(n * 4);
    this.shellPos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.randomDirection();
      this.shellDir.set([v.x, v.y, v.z, 0.75 + Math.random() * 0.4], i * 4);
      col.set([1, 1, 1], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.shellPos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.shell = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.02, map: dotTexture(), vertexColors: true, ...additive }));
    const ringTex = gradientSprite([[0, "rgba(0,0,0,0)"], [0.75, "rgba(0,0,0,0)"], [0.88, "rgba(200,230,255,0.9)"], [1, "rgba(0,0,0,0)"]]);
    this.shock = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, ...additive }));
    this.parts.supernova.add(this.shell, this.shock);
    this.disposables.push(geo, this.shell.material, ringTex, this.shock.material);
  }

  // 🧲 마그네타: 아주 작은 핵에서 나오는 자기장 고리(자석 모양) + 양쪽 극 빛줄기
  private buildMagnetar() {
    const pts: number[] = [];
    for (const L of [0.14, 0.24, 0.36]) {
      for (let k = 0; k < 8; k++) {
        const phi = (k / 8) * Math.PI * 2;
        let prev: THREE.Vector3 | null = null;
        for (let j = 0; j <= 40; j++) {
          // 쌍극자 자기장 선: r = L·sin²θ
          const th = 0.12 * Math.PI + (j / 40) * 0.76 * Math.PI;
          const r = L * Math.sin(th) ** 2;
          const p = new THREE.Vector3(r * Math.sin(th) * Math.cos(phi), r * Math.cos(th), r * Math.sin(th) * Math.sin(phi));
          if (prev) pts.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
          prev = p;
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
    const lineMat = new THREE.LineBasicMaterial({ color: "#8ae6ff", opacity: 0.55, ...additive });
    const beamGeo = new THREE.ConeGeometry(0.035, 0.6, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({ color: "#a8ecff", opacity: 0.45, side: THREE.DoubleSide, ...additive });
    this.magnet.add(new THREE.LineSegments(lineGeo, lineMat));
    for (const dir of [1, -1]) {
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = dir * 0.3;
      beam.rotation.x = dir > 0 ? Math.PI : 0;
      this.magnet.add(beam);
    }
    this.magnet.rotation.z = 0.45; // 자석 축이 살짝 기울어져 있다
    this.parts.magnetar.add(this.magnet);
    this.disposables.push(lineGeo, lineMat, beamGeo, beamMat);
  }

  // 🕳️ 블랙홀: 강착 원반 + 가장자리에 얇게 빛나는 광자 고리
  private buildBlackHole() {
    const col = new Float32Array(DISK * 3);
    const hot = new THREE.Color("#fff3d0");
    const warm = new THREE.Color("#ff7a1a");
    const c = new THREE.Color();
    for (let i = 0; i < DISK; i++) {
      const rel = 1.3 + Math.random() * 2.3; // 핵 반지름의 몇 배
      this.diskData.set([rel, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.01], i * 3);
      c.copy(hot).lerp(warm, (rel - 1.3) / 2.3);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.diskPos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.disk = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.014, map: dotTexture(), vertexColors: true, ...additive }));
    const ringGeo = new THREE.TorusGeometry(LOOKS.blackhole.coreR * 1.25, 0.004, 8, 96);
    const ringMat = new THREE.MeshBasicMaterial({ color: "#ffe2b0", ...additive });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    this.parts.blackhole.add(this.disk, ring);
    this.disposables.push(geo, this.disk.material, ringGeo, ringMat);
  }

  // 🌌 은하: 안드로메다처럼 기울어진 나선 은하 (밝은 중심 · 나선팔 · 어두운 먼지 띠 · 위성 은하 2개)
  private buildGalaxy() {
    const n = 7000;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const r = Math.pow(Math.random(), 0.7) * 1.1; // 은하는 허리케인 눈보다 넓게 퍼진다
      const arm = i % 2;
      const a = arm * Math.PI + (r / 1.1) * Math.PI * 3.5 + gauss() * (0.25 + 0.3 * r);
      pos.set([r * Math.cos(a), gauss() * 0.03 * (1.2 - r), r * Math.sin(a)], i * 3);
      if (i % 25 === 0) c.set("#ff8fc7"); // 별이 태어나는 분홍 성운
      else if (r < 0.2) c.setHSL(0.11, 0.75, 0.8); // 늙은 별이 많은 노란 중심
      else c.setHSL(0.6 + Math.random() * 0.05, 0.7, 0.7 + Math.random() * 0.25); // 젊은 파란 별
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.022, map: dotTexture(), vertexColors: true, ...additive }));

    // 먼지 띠: 나선팔 안쪽을 따라 어둡게 (더하기가 아니라 보통 섞기로 가린다)
    const dn = 1800;
    const dpos = new Float32Array(dn * 3);
    for (let i = 0; i < dn; i++) {
      const r = 0.15 + Math.random() * 0.85;
      const a = (i % 2) * Math.PI + (r / 1.1) * Math.PI * 3.5 - 0.3 + gauss() * 0.12;
      dpos.set([r * Math.cos(a), gauss() * 0.01, r * Math.sin(a)], i * 3);
    }
    const dgeo = new THREE.BufferGeometry();
    dgeo.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
    const lanes = new THREE.Points(dgeo, new THREE.PointsMaterial({ size: 0.02, map: dotTexture(), color: "#1a0f08", transparent: true, opacity: 0.55, depthWrite: false }));

    const satTex = gradientSprite([[0, "rgba(255,240,220,0.9)"], [0.4, "rgba(230,210,190,0.3)"], [1, "rgba(0,0,0,0)"]], 64);
    const satMat = new THREE.SpriteMaterial({ map: satTex, ...additive });
    const m32 = new THREE.Sprite(satMat);
    m32.position.set(0.35, 0.08, 0.22);
    m32.scale.setScalar(0.07);
    const m110 = new THREE.Sprite(satMat);
    m110.position.set(-0.75, 0.15, -0.45);
    m110.scale.set(0.16, 0.1, 1);

    this.spiral.add(stars, lanes);
    this.spiral.rotation.x = 0.35; // 안드로메다는 비스듬히 누워 보인다
    this.parts.galaxy.add(this.spiral, m32, m110);
    this.disposables.push(geo, stars.material, dgeo, lanes.material, satTex, satMat);
  }

  // 진짜 크기 배율 (통계·먹는 조건·레벨에 쓴다). 크기 슬라이더 값 그대로
  get sizeMultiplier() {
    return this.settings.size;
  }

  private get look() {
    return LOOKS[this.stage];
  }

  // 먼지가 사라지는 핵 반지름 (허리케인 눈 기준)
  private get coreR() {
    return this.look.coreR * this.stageScale;
  }

  // 핵 반지름 (장면 좌표) — 태양계 조각이 사라지는 곳
  get horizonWorld() {
    return this.coreR * this.worldRadius;
  }

  setSettings(s: BlackHoleSettings) {
    this.settings = s;
    this.applyStage(false);
    this.applySize();
  }

  // 레벨이 바뀌면 단계별 모습을 바꾸고, 같은 단계 안에서도 레벨이 오를수록 조금씩 커진다
  private applyStage(force: boolean) {
    const level = levelOf(this.settings.size);
    const st = stageOf(level);
    this.stageScale = 0.85 + 0.3 * ((level - st.from) / Math.max(1, st.to - st.from));
    if (!force && st.key === this.stage) return;
    this.stage = st.key;
    for (const [key, part] of Object.entries(this.parts)) part.visible = key === st.key;
    let tex = this.glowTextures.get(st.key);
    if (!tex) {
      tex = gradientSprite(this.look.glow);
      this.glowTextures.set(st.key, tex);
      this.disposables.push(tex);
    }
    this.glow.material.map = tex;
    this.glow.material.needsUpdate = true;
    this.core.visible = this.look.core !== null;
    if (this.look.core) this.core.material.color.set(this.look.core);
    // 먼지를 새 핵 크기에 맞춰 다시 흩뿌린다
    for (let i = 0; i < DUST; i++) this.spawnDust(i, Math.random());
  }

  private applySize() {
    const s = this.stageScale;
    this.core.scale.setScalar(this.coreR);
    for (const part of Object.values(this.parts)) part.scale.setScalar(s);
    this.glow.scale.setScalar(this.look.glowSize * s * (1 + this.flash));
    this.glow.material.opacity = Math.min(1, this.settings.brightness * (1 + this.flash));
  }

  // 천체를 삼켰다: 번쩍 빛난다 (크기는 화면 쪽에서 슬라이더 값을 올려 준다)
  eat(name: string) {
    this.eaten.push(name);
    this.flash = 1;
    this.applySize();
  }

  resetMeal() {
    this.eaten = [];
    this.flash = 0;
    this.applySize();
  }

  // 먼지 하나를 바깥 가장자리 근처에서 새로 태어나게 한다 (start: 0~1, 처음엔 골고루 흩뿌림)
  private spawnDust(i: number, start = 1) {
    const h = this.coreR;
    const r = h + (1 - h) * (start < 1 ? start : 0.75 + Math.random() * 0.25);
    this.dustData.set([r, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.25 * r], i * 3);
  }

  place(x: number, z: number, radius: number) {
    this.group.position.set(x, 0, z);
    this.group.scale.setScalar(radius);
    this.worldRadius = radius;
    // 점 크기는 월드 단위라 크기에 맞춰 키운다
    this.dust.material.size = 0.016 * radius;
    this.disk.material.size = 0.014 * radius;
    this.shell.material.size = 0.02 * radius;
    for (const child of this.spiral.children) {
      if (child instanceof THREE.Points) child.material.size = (child.material.blending === THREE.AdditiveBlending ? 0.022 : 0.03) * radius;
    }
  }

  update(dt: number) {
    if (!this.group.visible) return;
    this.age += dt;
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 0.8);
      this.applySize();
    }
    const b = Math.min(1, this.settings.brightness);
    switch (this.stage) {
      case "dust":
        for (const puff of this.nebula) {
          puff.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), (puff.userData.spin as number) * dt);
          puff.material.opacity = 0.5 * b;
        }
        break;
      case "star": {
        const beat = 1 + 0.04 * Math.sin(this.age * 3);
        this.core.scale.setScalar(this.coreR * beat);
        this.corona.scale.setScalar(0.45 * (1 + 0.08 * Math.sin(this.age * 1.7)));
        break;
      }
      case "supernova":
        this.stepShell(dt);
        break;
      case "magnetar":
        this.magnet.rotation.y += dt * 7;
        this.core.scale.setScalar(this.coreR * (1 + 0.2 * Math.random()));
        break;
      case "blackhole":
        this.stepDisk(dt);
        break;
      case "galaxy":
        this.spiral.rotation.y += dt * 0.12;
        break;
    }
    this.step(dt);
  }

  // 초신성 껍질: 가운데에서 태어나 바깥으로 퍼지며 흰색 → 분홍 → 빨강으로 식고 사라진다
  private stepShell(dt: number) {
    this.shellT = (this.shellT + dt / 2.6) % 1;
    const t = this.shellT;
    const n = this.shellPos.length / 3;
    const col = this.shell.geometry.attributes.color.array as Float32Array;
    const radius = 0.1 + 0.85 * Math.pow(t, 0.6);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      const r = radius * this.shellDir[o + 3];
      this.shellPos.set([this.shellDir[o] * r, this.shellDir[o + 1] * r * 0.8, this.shellDir[o + 2] * r], i * 3);
      const fade = (1 - t) * this.settings.brightness;
      col.set([fade, (1 - t * 0.7) * fade, (1 - t) * (1 - t) * fade + 0.2 * fade], i * 3);
    }
    this.shell.geometry.attributes.position.needsUpdate = true;
    this.shell.geometry.attributes.color.needsUpdate = true;
    this.shock.scale.setScalar(0.2 + 1.8 * t);
    this.shock.material.opacity = (1 - t) * Math.min(1, this.settings.brightness);
    this.core.scale.setScalar(this.coreR * (1 + 0.25 * Math.sin(this.age * 9)));
  }

  private stepDisk(dt: number) {
    const h = LOOKS.blackhole.coreR;
    for (let i = 0; i < DISK; i++) {
      const o = i * 3;
      const r = this.diskData[o] * h;
      const theta = (this.diskData[o + 1] += (0.5 / Math.pow(r, 1.5)) * dt);
      this.diskPos.set([r * Math.cos(theta), this.diskData[o + 2], r * Math.sin(theta)], o);
    }
    this.disk.geometry.attributes.position.needsUpdate = true;
  }

  stats(): BlackHoleStats {
    const { brightness } = this.settings;
    const size = this.settings.size;
    const horizonKm = STATS_HORIZON * size * this.worldRadius * 1000 * STAT_SCALE;
    const solarMasses = horizonKm / 2.95;
    // 작을수록 원반이 더 뜨겁다 (온도 ∝ 질량^-1/4)
    const temperatureK = 1e7 * Math.pow(Math.max(brightness, 0.01), 0.25) * Math.pow(Math.max(solarMasses / STAT_SCALE, 1), -0.25) * 6 * STAT_SCALE;
    const innerOmega = 0.5 / Math.pow(1.3 * this.coreR, 1.5);
    return {
      level: levelOf(size),
      stage: this.stage,
      horizonKm,
      solarMasses,
      brightness: Math.round((this.heatSum / DUST) * brightness * 400 * STAT_SCALE),
      temperatureK,
      diskRpm: (innerOmega / (2 * Math.PI)) * 60 * STAT_SCALE,
      fastestPctC: Math.min(99.9, this.fastest * 100),
      swallowed: this.swallowed * STAT_SCALE,
      perSecond: this.rate * STAT_SCALE,
      ageSec: this.age,
      nearDust: this.near * STAT_SCALE,
      eatenPlanets: [...this.eaten],
    };
  }

  // 공통 먼지: 가까워질수록 강하게 끌려가고 빨리 돌며, 단계마다 색이 다르다
  private step(dt: number) {
    const h = this.coreR;
    const look = this.look;
    const pull = this.settings.pull * look.pull;
    const brightness = this.settings.brightness * (1 + this.flash * 2) * look.dustBright;
    const { cold, hot } = look;
    let eaten = 0;
    let heatSum = 0;
    let fastest = 0;
    let near = 0;
    for (let i = 0; i < DUST; i++) {
      const o = i * 3;
      let r = this.dustData[o];
      const inward = inwardSpeed((r / h) * 0.07) * pull;
      r -= inward * dt;
      if (r <= h) {
        eaten++;
        this.spawnDust(i);
        r = this.dustData[o];
      }
      this.dustData[o] = r;
      const spin = spinSpeed(r);
      const theta = (this.dustData[o + 1] += spin * dt);
      const y = (this.dustData[o + 2] *= 1 - Math.min(0.9, 2.5 * dt)); // 원반 쪽으로 납작해진다
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      this.dustPos.set([x, y, z], o);
      const heat = Math.min(1, Math.pow((1 - r) / Math.max(1 - h, 0.05), 3));
      heatSum += heat;
      if (r < h * 2) near++;
      fastest = Math.max(fastest, Math.sqrt(h / r));
      const white = this.stage === "dust" || this.stage === "galaxy" ? 0 : Math.max(0, heat - 0.8) * 2;
      const cr = (cold[0] + (hot[0] - cold[0]) * heat + white) * brightness;
      const cg = (cold[1] + (hot[1] - cold[1]) * heat + white) * brightness;
      const cb = (cold[2] + (hot[2] - cold[2]) * heat + white) * brightness;
      this.dustCol.set([cr, cg, cb], o);
      // 꼬리: 조금 전에 있던 자리. 빨라질수록 길어진다
      const tr = Math.min(1.05, r + inward * TAIL_TIME);
      const tt = theta - spin * TAIL_TIME;
      const glow = (0.4 + 0.6 * heat) * look.tail;
      this.tailPos.set([x, y, z, tr * Math.cos(tt), y, tr * Math.sin(tt)], i * 6);
      this.tailCol.set([cr * glow, cg * glow, cb * glow, 0, 0, 0], i * 6);
    }
    this.swallowed += eaten;
    if (dt > 0) this.rate = this.rate * 0.95 + (eaten / dt) * 0.05;
    this.heatSum = heatSum;
    this.fastest = fastest;
    this.near = near;
    for (const g of [this.dust.geometry, this.tails.geometry]) {
      g.attributes.position.needsUpdate = true;
      g.attributes.color.needsUpdate = true;
    }
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}
