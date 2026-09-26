import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { BuiltShape } from "./shapeGeometry";
import { BG_THEMES, type BgTheme, type Look } from "./shapeLook";
import { fitStorm, Hurricane } from "./storm";
import { BlackHole, type BlackHoleSettings, type BlackHoleStats } from "./cosmicEater";
import { SolarSystem, type BodyInfo, type BodyKey, type BodyState, type FeedResult } from "./solarSystem";

// ----------------------------------------------------------------------------
// three.js 화면 담당: 내 도형(메인) + 목표 도형(오른쪽 위 작은 창)
// ----------------------------------------------------------------------------

export interface InsetRect {
  size: number;
  margin: number;
}

export interface ViewOptions {
  look: Look;
  showEdges: boolean;
  showHandles: boolean;
  selected: number | null;
  copies: number; // 회전목마 복제 개수 (1 = 하나만)
  slice: number; // 위에서부터 잘라 낼 비율(%)
  hurricane: boolean; // 복제 고리 가운데에 허리케인 그리기
  extras: BuiltShape[]; // 새로 추가한 다른 도형들 (같은 기본 도형은 같은 객체 → 한 번에 그림)
  blackHole: boolean; // 가장 큰 허리케인 가운데 블랙홀
  solar: boolean; // 장식용 태양계
}

export type CameraView = "front" | "top" | "side" | "iso";

interface ShapeView {
  group: THREE.Group;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  edges: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
}

// 기본 도형(반지름 1)을 카메라 거리 5.6 에서 본다. 도형이 이 틀보다 1.75배 넘게 커지거나
// 0.45배보다 작아질 때만 카메라를 다시 맞춘다.
const BASE_RADIUS = 1;
const DIST_PER_RADIUS = 5.6;
const REFIT_UP = 1.75;
const REFIT_DOWN = 0.45;

function makeView(scene: THREE.Scene): ShapeView {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, metalness: 0.15, roughness: 0.45, side: THREE.DoubleSide }),
  );
  const edges = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
  );
  group.add(mesh, edges);
  scene.add(group);
  return { group, mesh, edges };
}

function hashHue(n: number): number {
  const s = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
  return s - Math.floor(s);
}

// 점 하나의 색: 면 번호(fi)와 높이(y)에 따라 모드별로 정한다
function vertexColor(look: Look, fi: number, faceCount: number, yRatio: number, out: THREE.Color) {
  switch (look.colorMode) {
    case "rainbow":
      out.setHSL(fi / faceCount, 0.75, 0.6);
      return;
    case "height":
      out.setHSL(0.68 - 0.68 * yRatio, 0.8, 0.55);
      return;
    case "random":
      out.setHSL(hashHue(fi), 0.75, 0.6);
      return;
    case "stripe":
      out.set(Math.floor(yRatio * 8) % 2 === 0 ? look.color : "#f5f5f5");
      return;
    case "neon":
      out.set(look.color).multiplyScalar(0.25);
      return;
    default:
      // 같은 색이라도 면마다 살짝 밝기를 달리해 모서리가 잘 보이게
      out.set(look.color);
      out.offsetHSL(0, 0, ((fi * 37) % 7) / 60 - 0.05);
  }
}

// 도형 하나의 면 geometry (점마다 색 포함)
function coloredGeometry(built: BuiltShape, look: Look): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(built.positions, 3));
  const colors = new Float32Array(built.positions.length);
  const c = new THREE.Color();
  const span = Math.max(built.maxY - built.minY, 1e-6);
  for (let t = 0; t < built.faceIds.length; t++) {
    for (let k = 0; k < 3; k++) {
      const o = t * 9 + k * 3;
      vertexColor(look, built.faceIds[t], built.faceCount, (built.positions[o + 1] - built.minY) / span, c);
      colors[o] = c.r;
      colors[o + 1] = c.g;
      colors[o + 2] = c.b;
    }
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

// 모서리 선은 buildShape 가 미리 계산해 둔다 (쪼개기 5단계에서도 빠르게)
function lineGeometry(built: BuiltShape): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(built.edgeLines, 3));
  return geo;
}

function applyShape(view: ShapeView, built: BuiltShape, look: Look, showEdges: boolean, lightBg: boolean, env: THREE.Texture | null) {
  view.mesh.geometry.dispose();
  view.mesh.geometry = coloredGeometry(built, look);

  const m = view.mesh.material;
  const mode = look.colorMode;
  m.transparent = mode === "glass";
  m.opacity = mode === "glass" ? 0.45 : 1;
  m.depthWrite = mode !== "glass";
  m.wireframe = mode === "wire";
  m.metalness = mode === "metal" ? 0.95 : 0.15;
  // 환경맵은 금속일 때만 (다른 모드에 걸면 색이 하얗게 바랜다)
  m.envMap = mode === "metal" ? env : null;
  m.roughness = mode === "metal" ? 0.18 : 0.45;
  m.emissive.set(mode === "neon" ? look.color : "#000000");
  m.emissiveIntensity = mode === "neon" ? 0.45 : 0;
  m.needsUpdate = true;

  view.edges.geometry.dispose();
  view.edges.geometry = lineGeometry(built);
  const neon = mode === "neon";
  view.edges.visible = showEdges || mode === "glass" || neon;
  view.edges.material.color.set(neon ? look.color : lightBg ? "#222222" : "#ffffff");
  view.edges.material.opacity = neon ? 1 : 0.55;
}

function gradientTexture(top: string, bottom: string): THREE.CanvasTexture {
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
  return tex;
}

export class ShapeScene {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private targetCamera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private mainScene = new THREE.Scene();
  private targetScene = new THREE.Scene();
  private main: ShapeView;
  private target: ShapeView;
  private copyGroup = new THREE.Group();
  // 큰 원 가운데 허리케인 하나 + 도형마다 복제 고리 가운데 작은 허리케인들
  private bigStorm = new Hurricane(6000);
  private bigStormPoints = this.bigStorm.makePoints(1, 1, 0.45);
  private miniStorm = new Hurricane(2000);
  private miniGroup = new THREE.Group();
  private blackHole = new BlackHole();
  private solar = new SolarSystem();
  private solarHole: THREE.Vector3 | null = null; // 태양계 좌표로 본 블랙홀 중심
  private solarScale = 1;
  onSwallow: ((info: BodyInfo) => void) | null = null;
  onTear: ((info: BodyInfo) => void) | null = null;
  private ownedGeos: THREE.BufferGeometry[] = []; // 추가한 도형용으로 새로 만든 geometry (지울 때 dispose)
  private handleGroup = new THREE.Group();
  private handleGeo = new THREE.SphereGeometry(0.055, 16, 12);
  private handleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  private handleSelMat = new THREE.MeshBasicMaterial({ color: 0xffd400 });
  private keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  private stars: THREE.Points;
  private grid: THREE.GridHelper | null = null;
  private axes: THREE.AxesHelper | null = null;
  private showGrid = false;
  private showAxes = false;
  private bgTexture: THREE.CanvasTexture | null = null;
  private lightBg = false;
  private envMap: THREE.Texture | null = null;
  private clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  private raycaster = new THREE.Raycaster();
  private frame = 0;
  private lastTime = 0;
  private downAt: { x: number; y: number } | null = null;
  private showTarget = false;
  private inset: InsetRect = { size: 0, margin: 16 };
  private resizeObserver: ResizeObserver;
  // 카메라가 맞춰 둔 도형 반지름과, 부드럽게 따라갈 목표 거리
  private fitRadius = BASE_RADIUS;
  private fitDistance: number | null = null;

  autoRotate = true;
  rotateSpeed = 1;
  onVertexPick: ((index: number | null) => void) | null = null;
  onInset: ((rect: InsetRect | null) => void) | null = null;

  constructor(private container: HTMLElement) {
    // 크기가 1%~10000% 로 크게 바뀌므로 깊이 정밀도를 로그 방식으로
    this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.localClippingEnabled = true;
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.touchAction = "none";
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1e6);
    this.camera.position.set(0, 1.4, 5.6);
    this.targetCamera = new THREE.PerspectiveCamera(45, 1, 0.01, 1e6);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 12;
    // 사용자가 직접 확대/축소하면 자동 맞추기를 멈춘다
    this.controls.addEventListener("start", () => {
      this.fitDistance = null;
    });

    // 금속 모드가 비칠 수 있도록 방 조명 환경맵을 깐다
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.targetScene.background = new THREE.Color(0x1d1440);
    this.addLights(this.mainScene, this.keyLight);
    this.addLights(this.targetScene, new THREE.DirectionalLight(0xffffff, 2.2));
    this.stars = this.makeStars();
    this.mainScene.add(this.stars);
    this.setBackground("space");

    this.main = makeView(this.mainScene);
    this.target = makeView(this.targetScene);
    this.bigStormPoints.visible = false;
    this.main.group.add(this.handleGroup, this.copyGroup, this.bigStormPoints, this.miniGroup, this.blackHole.group, this.solar.group);
    this.solar.onSwallow = (info) => {
      this.blackHole.eat(info.name);
      this.onSwallow?.(info);
    };
    this.solar.onTear = (info) => this.onTear?.(info);

    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.handleDown);
    el.addEventListener("pointerup", this.handleUp);
    // 패널 크기가 바뀌어도 캔버스가 따라가도록 창이 아니라 컨테이너를 관찰
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(container);
    this.resize();
    this.frame = requestAnimationFrame(this.tick);
  }

  private addLights(scene: THREE.Scene, key: THREE.DirectionalLight) {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 1.1));
    key.position.set(3, 5, 4);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.9);
    rim.position.set(-4, -2, -3);
    scene.add(key, rim);
  }

  private makeStars(): THREE.Points {
    const count = 700;
    const pos = new Float32Array(count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      v.randomDirection().multiplyScalar(2e5 + Math.random() * 2e5);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xaab8ff, size: 2, sizeAttenuation: false }));
  }

  setShape(built: BuiltShape, opts: ViewOptions) {
    applyShape(this.main, built, opts.look, opts.showEdges, this.lightBg, this.envMap);

    // 단면 자르기: 위에서부터 slice% 만큼 잘라 낸다 (y 가 이 값보다 큰 부분을 숨김)
    const clipping = opts.slice > 0 ? [this.clipPlane] : null;
    this.clipPlane.constant = built.maxY - (built.maxY - built.minY) * (opts.slice / 100);
    this.main.mesh.material.clippingPlanes = clipping;
    this.main.edges.material.clippingPlanes = clipping;

    // 배치: 도형(내 도형 + 추가한 도형)마다 copies 개씩 각자 작은 고리로 복제하고,
    // 그 작은 고리들을 다시 큰 원으로 늘어놓는다. (최대 101 × 100 개)
    const shapes = [built, ...opts.extras];
    const c = Math.max(1, Math.round(opts.copies));
    const ringOf = (count: number, r: number) => (count <= 1 ? 0 : count === 2 ? r * 1.15 : (r * 1.15) / Math.sin(Math.PI / count));
    const clusterR = shapes.map((b) => ringOf(c, b.radius));
    const maxExtent = Math.max(...shapes.map((b, i) => clusterR[i] + b.radius));
    const n = shapes.length;
    const bigR = ringOf(n, maxExtent);
    const centers = shapes.map((_, i) => {
      const A = (i / n) * Math.PI * 2;
      return { A, x: Math.cos(A) * bigR, z: Math.sin(A) * bigR };
    });

    // 같은 모양(같은 BuiltShape)끼리 모아서 InstancedMesh 하나로 그린다 — 수천 개도 가볍게
    const slots = new Map<BuiltShape, { x: number; z: number; rot: number }[]>();
    const spread = n > 1 || c > 1;
    shapes.forEach((shape, i) => {
      for (let j = 0; j < c; j++) {
        const a = centers[i].A + (j / c) * Math.PI * 2;
        const slot = { x: centers[i].x + Math.cos(a) * clusterR[i], z: centers[i].z + Math.sin(a) * clusterR[i], rot: spread ? -a : 0 };
        if (i === 0 && j === 0) {
          this.main.mesh.position.set(slot.x, 0, slot.z);
          this.main.edges.position.set(slot.x, 0, slot.z);
          this.main.mesh.rotation.y = slot.rot;
          this.main.edges.rotation.y = slot.rot;
          continue;
        }
        const list = slots.get(shape) ?? [];
        list.push(slot);
        slots.set(shape, list);
      }
    });
    this.clearCopies();
    const m = new THREE.Matrix4();
    for (const [shape, list] of slots) {
      let geo = this.main.mesh.geometry;
      if (shape !== built) {
        geo = coloredGeometry(shape, opts.look);
        this.ownedGeos.push(geo);
      }
      const inst = new THREE.InstancedMesh(geo, this.main.mesh.material, list.length);
      list.forEach((sl, k) => inst.setMatrixAt(k, m.makeRotationY(sl.rot).setPosition(sl.x, 0, sl.z)));
      inst.instanceMatrix.needsUpdate = true;
      inst.frustumCulled = false;
      this.copyGroup.add(inst);

      // 모서리 선은 복제 위치만큼 옮겨 한 덩어리로 합친다
      if (this.main.edges.visible) {
        const src = shape.edgeLines;
        const merged = new Float32Array(src.length * list.length);
        list.forEach((sl, k) => {
          const cos = Math.cos(sl.rot);
          const sin = Math.sin(sl.rot);
          const base = k * src.length;
          for (let v = 0; v < src.length; v += 3) {
            const x = src[v];
            const z = src[v + 2];
            merged[base + v] = x * cos + z * sin + sl.x;
            merged[base + v + 1] = src[v + 1];
            merged[base + v + 2] = -x * sin + z * cos + sl.z;
          }
        });
        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute("position", new THREE.BufferAttribute(merged, 3));
        this.ownedGeos.push(lineGeo);
        const lines = new THREE.LineSegments(lineGeo, this.main.edges.material);
        lines.frustumCulled = false;
        this.copyGroup.add(lines);
      }
    }
    const maxR = Math.max(...shapes.map((b) => b.radius));
    const layoutR = bigR + maxExtent;

    // 허리케인: 도형이 여러 개면 큰 원 가운데에 하나, 복제를 했으면 도형마다 자기 고리 가운데에 하나씩
    const bigInner = bigR - maxExtent * 1.05;
    this.bigStormPoints.visible = opts.hurricane && n > 1 && bigInner > maxR * 0.15;
    if (this.bigStormPoints.visible) fitStorm(this.bigStormPoints, bigInner, Math.max(built.maxY - built.minY, 0.2) * 0.5);
    this.clearMiniStorms();
    let biggestMini: { x: number; z: number; r: number } | null = null;
    if (opts.hurricane && c > 2) {
      shapes.forEach((shape, i) => {
        const inner = clusterR[i] - shape.radius * 1.05;
        if (inner <= shape.radius * 0.15) return;
        const pts = this.miniStorm.makePoints(inner, Math.max(shape.maxY - shape.minY, 0.2) * 0.5, 0.55);
        pts.position.set(centers[i].x, 0, centers[i].z);
        this.miniGroup.add(pts);
        if (!biggestMini || inner > biggestMini.r) biggestMini = { x: centers[i].x, z: centers[i].z, r: inner };
      });
    }

    // 블랙홀: 가장 큰 허리케인의 눈 한가운데
    const hole = this.bigStormPoints.visible ? { x: 0, z: 0, r: bigInner } : biggestMini;
    this.blackHole.group.visible = opts.blackHole && hole !== null;
    // 먹보 천체가 있으면 바깥 허리케인은 흐리게 (천체의 모양이 잘 보이도록)
    this.bigStormPoints.material.opacity = this.blackHole.group.visible && hole?.x === 0 && hole?.z === 0 ? 0.12 : 0.45;
    const mini = this.miniGroup.children[0];
    if (mini instanceof THREE.Points && !this.bigStormPoints.visible) (mini.material as THREE.PointsMaterial).opacity = this.blackHole.group.visible ? 0.15 : 0.55;
    if (hole) this.blackHole.place(hole.x, hole.z, hole.r);

    // 태양계(아주 크게): 블랙홀이 있으면 그 위 하늘을 덮고, 없으면 도형 위에 떠 있다
    this.solar.group.visible = opts.solar;
    let solarTop = 0;
    if (opts.solar) {
      const withHole = hole !== null && this.blackHole.group.visible;
      const [sx, sy, sz, s] = withHole && hole ? [hole.x, hole.r * 2.5, hole.z, hole.r * 5] : [0, maxR * 6, 0, Math.max(maxR, 0.3) * 9];
      this.solar.place(sx, sy, sz, s);
      this.solarScale = s;
      this.solarHole = withHole && hole ? new THREE.Vector3((hole.x - sx) / s, -sy / s, (hole.z - sz) / s) : null;
      solarTop = Math.hypot(sy, s * 2.5) * 1.05; // 가장 바깥 천체(안드로메다 은하) 궤도 2.2
    }
    this.fitTo(Math.max(layoutR, solarTop));

    this.handleGroup.clear();
    this.handleGroup.visible = opts.showHandles && n === 1 && c === 1;
    if (!this.handleGroup.visible) return;
    built.handles.forEach((p, i) => {
      const m = new THREE.Mesh(this.handleGeo, i === opts.selected ? this.handleSelMat : this.handleMat);
      m.position.copy(p);
      m.scale.setScalar((i === opts.selected ? 1.6 : 1) * (this.fitRadius / BASE_RADIUS));
      m.userData.index = i;
      this.handleGroup.add(m);
    });
  }

  private clearMiniStorms() {
    for (const child of this.miniGroup.children) {
      if (child instanceof THREE.Points) (child.material as THREE.PointsMaterial).dispose();
    }
    this.miniGroup.clear();
  }

  private clearCopies() {
    this.ownedGeos.forEach((g) => g.dispose());
    this.ownedGeos = [];
    this.copyGroup.clear();
  }

  setTarget(built: BuiltShape | null, look: Look) {
    this.showTarget = built !== null;
    if (built) applyShape(this.target, built, look, true, false, this.envMap);
    this.resize();
  }

  setBackground(theme: BgTheme) {
    const t = BG_THEMES.find((b) => b.key === theme) ?? BG_THEMES[0];
    this.bgTexture?.dispose();
    this.bgTexture = gradientTexture(t.top, t.bottom);
    this.mainScene.background = this.bgTexture;
    this.stars.visible = t.stars;
    this.lightBg = t.light;
    this.refreshHelpers();
  }

  setGrid(on: boolean) {
    this.showGrid = on;
    this.refreshHelpers();
  }

  setAxes(on: boolean) {
    this.showAxes = on;
    this.refreshHelpers();
  }

  // 모눈 바닥과 좌표축은 도형 크기에 맞춰 다시 만든다
  private refreshHelpers() {
    if (this.grid) {
      this.mainScene.remove(this.grid);
      this.grid.dispose();
      this.grid = null;
    }
    if (this.axes) {
      this.mainScene.remove(this.axes);
      this.axes.dispose();
      this.axes = null;
    }
    const r = this.fitRadius;
    if (this.showGrid) {
      const lineColor = this.lightBg ? 0x888888 : 0x5566aa;
      this.grid = new THREE.GridHelper(r * 8, 16, lineColor, lineColor);
      this.grid.position.y = -r * 1.1;
      this.mainScene.add(this.grid);
    }
    if (this.showAxes) {
      this.axes = new THREE.AxesHelper(r * 1.5);
      this.mainScene.add(this.axes);
    }
  }

  setBlackHole(settings: BlackHoleSettings) {
    this.blackHole.setSettings(settings);
  }

  // 블랙홀이 화면에 있을 때만 통계를 돌려준다
  blackHoleStats(): BlackHoleStats | null {
    return this.blackHole.group.visible ? this.blackHole.stats() : null;
  }

  // 블랙홀에게 태양계 천체 먹이기 (블랙홀이 없으면 false)
  feedPlanet(key: BodyKey): FeedResult {
    this.syncSolarHole();
    return this.solar.feed(key);
  }

  // 먹이기 줄에 세운 천체 수 (블랙홀이 없으면 -1)
  feedAllPlanets(): number {
    this.syncSolarHole();
    return this.solarHole ? this.solar.feedAll() : -1;
  }

  // 태양계에게 블랙홀 위치·지평선·크기를 알려 준다 (행성을 먹으면 자라므로 매번)
  private syncSolarHole() {
    const on = this.solarHole !== null && this.solar.group.visible && this.blackHole.group.visible;
    this.solar.setHole(
      on && this.solarHole
        ? { center: this.solarHole, horizon: this.blackHole.horizonWorld / this.solarScale, size: this.blackHole.sizeMultiplier }
        : null,
    );
  }

  restoreSolar() {
    this.solar.restore();
    this.blackHole.resetMeal();
  }

  solarStatus(): { states: Record<BodyKey, BodyState>; canEat: boolean; holeSize: number } {
    return {
      states: this.solar.status(),
      canEat: this.solarHole !== null && this.solar.group.visible && this.blackHole.group.visible,
      holeSize: this.blackHole.sizeMultiplier,
    };
  }

  setLightAngle(deg: number) {
    const a = (deg * Math.PI) / 180;
    this.keyLight.position.set(Math.cos(a) * 5, 5, Math.sin(a) * 5);
  }

  setView(view: CameraView) {
    const dirs: Record<CameraView, THREE.Vector3> = {
      front: new THREE.Vector3(0, 0, 1),
      top: new THREE.Vector3(0, 1, 0.0001),
      side: new THREE.Vector3(1, 0, 0),
      iso: new THREE.Vector3(1, 0.8, 1),
    };
    const dist = this.fitRadius * DIST_PER_RADIUS;
    this.main.group.rotation.set(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.camera.position.copy(dirs[view].normalize().multiplyScalar(dist));
    this.fitDistance = null;
    this.controls.update();
  }

  resetView() {
    this.camera.position.set(0, 1.4, 5.6);
    this.controls.target.set(0, 0, 0);
    this.main.group.rotation.set(0, 0, 0);
    this.fitRadius = BASE_RADIUS;
    this.applyDistanceLimits(5.6);
    this.refreshHelpers();
  }

  // 도형이 화면보다 훨씬 커지거나 작아지면 카메라를 부드럽게 당기거나 민다.
  // 조금씩 변할 때(움직이는 도형 등)는 흔들리지 않도록 가만히 둔다.
  private fitTo(radius: number) {
    const r = Math.max(radius, 0.005);
    const ratio = r / this.fitRadius;
    if (ratio < REFIT_UP && ratio > REFIT_DOWN) return;
    this.fitRadius = r;
    this.fitDistance = this.fitRadius * DIST_PER_RADIUS;
    this.applyDistanceLimits(this.fitDistance);
    this.refreshHelpers();
  }

  private applyDistanceLimits(distance: number) {
    this.controls.minDistance = distance * 0.3;
    this.controls.maxDistance = distance * 6;
    // 아주 작은 도형(1%)에 다가가도 잘리지 않도록 near 도 같이 줄인다
    for (const cam of [this.camera, this.targetCamera]) {
      cam.near = distance * 0.002;
      cam.updateProjectionMatrix();
    }
  }

  // 메인 도형만 찍어서 정사각형 썸네일(JPEG data URL)로 반환
  snapshot(size = 160): string {
    const canvas = this.renderMainOnly();
    const out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    const ctx = out.getContext("2d");
    if (!ctx) return "";
    const s = Math.min(canvas.width, canvas.height);
    ctx.drawImage(canvas, (canvas.width - s) / 2, (canvas.height - s) / 2, s, s, 0, 0, size, size);
    return out.toDataURL("image/jpeg", 0.75);
  }

  // 지금 보이는 메인 화면 전체를 PNG 사진으로
  photo(): string {
    return this.renderMainOnly().toDataURL("image/png");
  }

  // 꼭짓점 점은 빼고 메인 화면만 한 번 그린다 (그린 직후에만 캔버스를 읽을 수 있음)
  private renderMainOnly(): HTMLCanvasElement {
    const r = this.renderer;
    const canvas = r.domElement;
    r.setScissorTest(false);
    r.setViewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    const handlesWereVisible = this.handleGroup.visible;
    this.handleGroup.visible = false;
    r.render(this.mainScene, this.camera);
    this.handleGroup.visible = handlesWereVisible;
    return canvas;
  }

  private handleDown = (e: PointerEvent) => {
    this.downAt = { x: e.clientX, y: e.clientY };
  };

  private handleUp = (e: PointerEvent) => {
    const start = this.downAt;
    this.downAt = null;
    // 드래그(화면 돌리기)와 클릭을 구분
    if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
    if (!this.handleGroup.visible || !this.onVertexPick) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects(this.handleGroup.children, false)[0];
    this.onVertexPick(hit ? (hit.object.userData.index as number) : null);
  };

  resize = () => {
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.inset = { size: Math.round(Math.min(w, h) * (w < 640 ? 0.4 : 0.34)), margin: 16 };
    this.onInset?.(this.showTarget ? this.inset : null);
  };

  private tick = (time: number) => {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    if (this.autoRotate) this.main.group.rotation.y += dt * 0.45 * this.rotateSpeed;
    this.target.group.rotation.copy(this.main.group.rotation);
    if (this.bigStormPoints.visible) this.bigStorm.update(dt);
    if (this.miniGroup.children.length > 0) this.miniStorm.update(dt);
    this.blackHole.update(dt);
    if (this.solar.group.visible) {
      this.syncSolarHole();
      this.solar.update(dt);
    }
    if (this.fitDistance !== null) {
      // 로그 공간에서 보간해야 1% ↔ 10000% 처럼 차이가 커도 자연스럽게 움직인다
      const offset = this.camera.position.clone().sub(this.controls.target);
      const len = offset.length();
      const next = Math.exp(Math.log(len) + (Math.log(this.fitDistance) - Math.log(len)) * Math.min(1, dt * 5));
      offset.setLength(next);
      this.camera.position.copy(this.controls.target).add(offset);
      if (Math.abs(next / this.fitDistance - 1) < 0.005) this.fitDistance = null;
    }
    this.controls.update();

    const r = this.renderer;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    r.setScissorTest(true);
    r.setViewport(0, 0, w, h);
    r.setScissor(0, 0, w, h);
    r.render(this.mainScene, this.camera);

    if (this.showTarget) {
      // 목표 도형은 내 카메라와 같은 방향에서 보이도록 카메라를 복사
      const { size, margin } = this.inset;
      const x = w - size - margin;
      const y = h - size - margin;
      this.targetCamera.position.copy(this.camera.position);
      this.targetCamera.quaternion.copy(this.camera.quaternion);
      r.setViewport(x, y, size, size);
      r.setScissor(x, y, size, size);
      r.render(this.targetScene, this.targetCamera);
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  dispose() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this.handleDown);
    el.removeEventListener("pointerup", this.handleUp);
    this.controls.dispose();
    for (const v of [this.main, this.target]) {
      v.mesh.geometry.dispose();
      v.mesh.material.dispose();
      v.edges.geometry.dispose();
      v.edges.material.dispose();
    }
    this.envMap?.dispose();
    this.bgTexture?.dispose();
    this.grid?.dispose();
    this.axes?.dispose();
    this.clearCopies();
    this.clearMiniStorms();
    this.bigStormPoints.material.dispose();
    this.bigStorm.dispose();
    this.miniStorm.dispose();
    this.blackHole.dispose();
    this.solar.dispose();
    this.handleGeo.dispose();
    this.handleMat.dispose();
    this.handleSelMat.dispose();
    this.renderer.dispose();
    el.remove();
  }
}
