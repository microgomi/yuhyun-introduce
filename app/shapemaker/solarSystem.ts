import * as THREE from "three";

// ----------------------------------------------------------------------------
// 장식용 태양계 + 블랙홀이 천체를 먹는 과정
//  ① 끌려오기: 궤도에서 떨어져 나와 블랙홀 둘레를 나선으로 돌며 다가간다 (점점 길쭉해짐)
//  ② 로슈 한계를 넘는 순간 조석력(가까운 쪽과 먼 쪽을 당기는 힘의 차이)에 찢어진다
//  ③ 스파게티화: 조각마다 케플러 회전(안쪽이 더 빠름)을 해서 국수 가닥처럼 길게 늘어난다
//  ④ 조각이 사건의 지평선에 닿으면 사라지고, 마지막 조각까지 사라지면 "먹었다"
// 반지름 1(가장 바깥 궤도) 기준으로 만들고, 장면에서 위치·크기를 정해 준다.
// ----------------------------------------------------------------------------

export type BodyKey = "sun" | "mercury" | "venus" | "earth" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune" | "neutron" | "smbh" | "andromeda";
export type BodyState = "orbit" | "falling" | "tearing" | "eaten";

export interface BodyInfo {
  key: BodyKey;
  name: string;
  emoji: string;
  color: string;
  size: number; // 반지름 (태양계 크기 1 기준, 보기 좋게 과장)
  orbit: number; // 궤도 반지름 (태양은 0)
  need: number; // 먹는 조건: 블랙홀 크기가 이 배율 이상이어야 한다 (행성·태양은 처음 조건의 20배)
  grow: number; // 먹으면 블랙홀 크기 슬라이더가 이만큼 늘어난다 (배)
  fact: string;
  glow?: string; // 스스로 빛나는 천체의 빛 색
  debris?: string; // 찢어질 때 조각 색 (없으면 천체 색)
}

export const BODIES: BodyInfo[] = [
  { key: "mercury", name: "수성", emoji: "⚪", color: "#b0b0b0", size: 0.022, orbit: 0.2, need: 16, grow: 2, fact: "태양과 가장 가깝고 가장 작은 행성이에요." },
  { key: "mars", name: "화성", emoji: "🔴", color: "#d1603d", size: 0.026, orbit: 0.46, need: 16, grow: 2, fact: "붉은 행성. 태양계에서 가장 높은 올림푸스 화산이 있어요." },
  { key: "venus", name: "금성", emoji: "🟡", color: "#e6c07b", size: 0.032, orbit: 0.28, need: 18, grow: 3, fact: "가장 뜨거운 행성! 표면이 약 465°C예요." },
  { key: "earth", name: "지구", emoji: "🌍", color: "#3a7bd5", size: 0.034, orbit: 0.37, need: 18, grow: 3, fact: "우리가 사는 곳! 먹이면… 안녕 😢" },
  { key: "uranus", name: "천왕성", emoji: "🩵", color: "#9fe3e8", size: 0.046, orbit: 0.87, need: 22, grow: 5, fact: "옆으로 누운 채로 굴러가듯 도는 행성이에요." },
  { key: "neptune", name: "해왕성", emoji: "🔵", color: "#4f6fe0", size: 0.045, orbit: 1, need: 22, grow: 5, fact: "태양계에서 바람이 가장 센 행성이에요." },
  { key: "saturn", name: "토성", emoji: "🪐", color: "#e3cf8f", size: 0.064, orbit: 0.74, need: 26, grow: 10, fact: "얼음과 돌로 된 멋진 고리를 가지고 있어요." },
  { key: "jupiter", name: "목성", emoji: "🟠", color: "#d8b48a", size: 0.075, orbit: 0.6, need: 30, grow: 20, fact: "가장 큰 행성! 지구가 1,300개나 들어가요." },
  { key: "sun", name: "태양", emoji: "☀️", color: "#ffcc33", size: 0.12, orbit: 0, need: 36, grow: 150, fact: "태양계 무게의 99.8%! 행성을 다 먹고 자라야 먹을 수 있어요.", glow: "rgba(255,170,40,0.55)" },
  { key: "neutron", name: "중성자별", emoji: "💫", color: "#d8ecff", size: 0.03, orbit: 1.25, need: 1000, grow: 500, fact: "숟가락 하나만큼이 10억 톤! 빛줄기를 뿜으며 1초에 수백 번 도는 펄서예요.", glow: "rgba(140,200,255,0.7)", debris: "#9fd0ff" },
  { key: "andromeda", name: "안드로메다 은하", emoji: "🌌", color: "#e9e0ff", size: 0.05, orbit: 2.2, need: 1_000_000, grow: 1_000_000, fact: "우리 은하의 이웃 은하! 별이 1조 개나 있어요. 은하수가 되어야 먹을 수 있어요.", glow: "rgba(210,190,255,0.55)", debris: "#cdb8ff" },
  { key: "smbh", name: "초거대질량 블랙홀", emoji: "🌑", color: "#050505", size: 0.09, orbit: 1.5, need: 250, grow: 1000, fact: "은하 한가운데 사는 태양 수백만 배 블랙홀! 먹으면 블랙홀끼리 합체해요.", glow: "rgba(255,120,30,0.6)", debris: "#ff9a3c" },
];

export const bodyInfo = (key: BodyKey) => BODIES.find((b) => b.key === key) as BodyInfo;

const FALL_TIME = 4; // 로슈 한계까지 끌려오는 시간(초)
const FEED_GAP = 1.4; // "모두 먹이기" 때 다음 천체까지 간격(초)
const ROCHE = 0.3; // 로슈 한계 반지름 (태양계 좌표)
const DEBRIS = 1600; // 찢어진 조각 수
const BODY_SCALE = 1.5; // 천체를 보기 좋게 키우는 배율 (궤도는 그대로)
const bodyR = (info: BodyInfo) => info.size * BODY_SCALE;

// 블랙홀 정보 (태양계 좌표)
export interface HoleInfo {
  center: THREE.Vector3;
  horizon: number; // 사건의 지평선 반지름
  size: number; // 블랙홀 크기 배율 (먹는 조건 비교용)
}

interface Debris {
  data: Float32Array; // 조각마다 r, theta, y (블랙홀 중심 기준)
  alive: Uint8Array;
  left: number;
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  tails: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
}

interface Body {
  info: BodyInfo;
  pivot: THREE.Group; // 궤도 회전용
  mesh: THREE.Object3D; // 천체(+고리) 묶음
  angle: number;
  state: BodyState;
  fall: { t: number; start: THREE.Vector3 } | null;
  debris: Debris | null;
}

let dotTex: THREE.CanvasTexture | null = null;
function dotTexture(): THREE.CanvasTexture {
  if (dotTex) return dotTex;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  dotTex = new THREE.CanvasTexture(canvas);
  return dotTex;
}

function glowSprite(mid: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,230,140,1)");
    g.addColorStop(0.35, mid);
    g.addColorStop(1, "rgba(255,120,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
}

// 조각 속도 (블랙홀 중심에서 거리 r, 태양계 좌표)
// 천천히 찢겨 들어가야 국수 가닥이 잘 보인다
const debrisInward = (r: number) => (0.06 + 0.003 / (r * r + 0.0005)) * 0.45;
const debrisSpin = (r: number) => 0.22 / Math.pow(Math.max(r, 0.005), 1.5);

export type FeedResult = "ok" | "busy" | "too-small" | "no-hole";

export class SolarSystem {
  readonly group = new THREE.Group();
  private bodies = new Map<BodyKey, Body>();
  private orbits: THREE.LineLoop[] = [];
  private roche: THREE.LineLoop;
  private queue: { key: BodyKey; wait: number }[] = [];
  private disposables: { dispose: () => void }[] = [];
  private sunLight = new THREE.PointLight(0xffe0a0, 1.2, 0, 0);
  private hole: HoleInfo | null = null;
  onSwallow: ((info: BodyInfo) => void) | null = null;
  onTear: ((info: BodyInfo) => void) | null = null;

  constructor() {
    for (const info of BODIES) {
      const pivot = new THREE.Group();
      const holder = new THREE.Group();
      const geo = new THREE.SphereGeometry(bodyR(info), 32, 20);
      const mat = info.glow
        ? new THREE.MeshBasicMaterial({ color: info.color })
        : new THREE.MeshStandardMaterial({ color: info.color, roughness: 0.7, metalness: 0.05 });
      holder.add(new THREE.Mesh(geo, mat));
      this.disposables.push(geo, mat);
      if (info.glow) {
        const glow = glowSprite(info.glow);
        glow.scale.setScalar(bodyR(info) * (info.key === "sun" ? 5 : 6));
        holder.add(glow);
        this.disposables.push(glow.material, glow.material.map as THREE.Texture);
      }
      if (info.key === "neutron") {
        // 펄서 빛줄기: 양쪽 극에서 뿜어 나오는 원뿔 두 개 (holder 와 함께 빙글빙글)
        const beamGeo = new THREE.ConeGeometry(bodyR(info) * 0.9, bodyR(info) * 9, 16, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({ color: "#9fd0ff", transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
        for (const dir of [1, -1]) {
          const beam = new THREE.Mesh(beamGeo, beamMat);
          beam.position.y = dir * bodyR(info) * 4.5;
          beam.rotation.x = dir > 0 ? Math.PI : 0;
          const tilt = new THREE.Group();
          tilt.rotation.z = 0.5;
          tilt.add(beam);
          holder.add(tilt);
        }
        this.disposables.push(beamGeo, beamMat);
      }
      if (info.key === "andromeda") {
        // 나선팔 두 개를 가진 은하 (입자 3,000개)
        const n = 3000;
        const pos = new Float32Array(n * 3);
        const col = new Float32Array(n * 3);
        const c = new THREE.Color();
        for (let i = 0; i < n; i++) {
          const r = Math.pow(Math.random(), 0.7) * bodyR(info) * 5;
          const a = (i % 2) * Math.PI + (r / (bodyR(info) * 5)) * Math.PI * 3 + (Math.random() - 0.5) * 0.6;
          pos.set([r * Math.cos(a), (Math.random() - 0.5) * bodyR(info) * 0.3, r * Math.sin(a)], i * 3);
          c.setHSL(0.62 + Math.random() * 0.15, 0.6, 0.55 + 0.35 * (1 - r / (bodyR(info) * 5)));
          col.set([c.r, c.g, c.b], i * 3);
        }
        const gGeo = new THREE.BufferGeometry();
        gGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        gGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
        const gMat = new THREE.PointsMaterial({ size: bodyR(info) * 0.25, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
        const galaxy = new THREE.Points(gGeo, gMat);
        galaxy.rotation.x = 0.5;
        holder.add(galaxy);
        this.disposables.push(gGeo, gMat);
      }
      if (info.key === "smbh") {
        // 초거대 블랙홀의 강착 원반
        const diskGeo = new THREE.RingGeometry(bodyR(info) * 1.3, bodyR(info) * 3, 64);
        const diskMat = new THREE.MeshBasicMaterial({ color: "#ff8a2a", side: THREE.DoubleSide, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
        const disk = new THREE.Mesh(diskGeo, diskMat);
        disk.rotation.x = Math.PI / 2.2;
        holder.add(disk);
        this.disposables.push(diskGeo, diskMat);
      }
      if (info.key === "saturn") {
        const ringGeo = new THREE.RingGeometry(bodyR(info) * 1.35, bodyR(info) * 2.2, 48);
        const ringMat = new THREE.MeshBasicMaterial({ color: "#d9c79a", side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.4;
        holder.add(ring);
        this.disposables.push(ringGeo, ringMat);
      }
      holder.position.x = info.orbit;
      pivot.add(holder);
      this.group.add(pivot);
      this.bodies.set(info.key, { info, pivot, mesh: holder, angle: Math.random() * Math.PI * 2, state: "orbit", fall: null, debris: null });
      if (info.orbit > 0) this.orbits.push(this.circle(info.orbit, 0x8899cc, 0.25));
    }
    this.roche = this.circle(ROCHE, 0xff5544, 0.6);
    this.roche.visible = false;
    this.group.add(this.sunLight);
  }

  private circle(radius: number, color: number, opacity: number): THREE.LineLoop {
    const pts = Array.from({ length: 96 }, (_, i) => {
      const a = (i / 96) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    });
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    const loop = new THREE.LineLoop(geo, mat);
    this.group.add(loop);
    this.disposables.push(geo, mat);
    return loop;
  }

  place(x: number, y: number, z: number, scale: number) {
    this.group.position.set(x, y, z);
    this.group.scale.setScalar(scale);
  }

  setHole(hole: HoleInfo | null) {
    this.hole = hole;
  }

  status(): Record<BodyKey, BodyState> {
    const out = {} as Record<BodyKey, BodyState>;
    for (const [k, b] of this.bodies) out[k] = b.state;
    return out;
  }

  // 먹는 조건을 확인하고 끌어오기 시작
  feed(key: BodyKey): FeedResult {
    const b = this.bodies.get(key);
    if (!this.hole) return "no-hole";
    if (!b || b.state !== "orbit") return "busy";
    if (this.hole.size < b.info.need) return "too-small";
    // 궤도에서 떼어 내 태양계 좌표 그대로 떨어뜨린다
    const start = new THREE.Vector3();
    b.mesh.getWorldPosition(start);
    this.group.worldToLocal(start);
    b.pivot.remove(b.mesh);
    b.mesh.position.copy(start);
    this.group.add(b.mesh);
    b.state = "falling";
    b.fall = { t: 0, start };
    return "ok";
  }

  // 먹는 조건이 낮은 천체부터 차례로 (먹을수록 커지니, 아직 작으면 앞 천체를 먹을 때까지 기다린다)
  feedAll(): number {
    const order = BODIES.filter((b) => this.bodies.get(b.key)?.state === "orbit").sort((a, b) => a.need - b.need);
    this.queue = order.map((b, i) => ({ key: b.key, wait: i * FEED_GAP }));
    return order.length;
  }

  restore() {
    this.queue = [];
    for (const b of this.bodies.values()) {
      this.clearDebris(b);
      if (b.state === "orbit") continue;
      this.group.remove(b.mesh);
      b.mesh.position.set(b.info.orbit, 0, 0);
      b.mesh.rotation.set(0, 0, 0);
      b.mesh.scale.setScalar(1);
      b.mesh.visible = true;
      b.pivot.add(b.mesh);
      b.state = "orbit";
      b.fall = null;
    }
  }

  private clearDebris(b: Body) {
    if (!b.debris) return;
    for (const o of [b.debris.points, b.debris.tails]) {
      this.group.remove(o);
      o.geometry.dispose();
      o.material.dispose();
    }
    b.debris = null;
  }

  // ② 로슈 한계를 넘었다: 천체를 조각으로 부순다
  private tear(b: Body, hole: THREE.Vector3) {
    const rel = b.mesh.position.clone().sub(hole);
    const r0 = Math.hypot(rel.x, rel.z);
    const a0 = Math.atan2(rel.z, rel.x);
    const s = bodyR(b.info);
    const data = new Float32Array(DEBRIS * 3);
    for (let i = 0; i < DEBRIS; i++) {
      // 행성 크기만큼 흩어진 조각들 (블랙홀 쪽/바깥쪽으로 길게)
      const u = Math.random() - 0.5;
      data.set([Math.max(0.02, r0 + u * s * 3), a0 + (Math.random() - 0.5) * (s * 2.5) / Math.max(r0, 0.05), rel.y + (Math.random() - 0.5) * s * 1.5], i * 3);
    }
    const color = new THREE.Color(b.info.debris ?? b.info.color);
    const pos = new Float32Array(DEBRIS * 3);
    const col = new Float32Array(DEBRIS * 3);
    const tailPos = new Float32Array(DEBRIS * 6);
    const tailCol = new Float32Array(DEBRIS * 6);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pg.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const tg = new THREE.BufferGeometry();
    tg.setAttribute("position", new THREE.BufferAttribute(tailPos, 3));
    tg.setAttribute("color", new THREE.BufferAttribute(tailCol, 3));
    const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;
    const points = new THREE.Points(pg, new THREE.PointsMaterial({ size: Math.max(s * 0.7, 0.02), map: dotTexture(), vertexColors: true, ...add }));
    const tails = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ vertexColors: true, ...add }));
    points.frustumCulled = false;
    tails.frustumCulled = false;
    this.group.add(points, tails);
    for (let i = 0; i < DEBRIS; i++) col.set([color.r, color.g, color.b], i * 3);
    b.debris = { data, alive: new Uint8Array(DEBRIS).fill(1), left: DEBRIS, points, tails };
    b.mesh.visible = false;
    b.state = "tearing";
    this.onTear?.(b.info);
  }

  update(dt: number) {
    for (const b of this.bodies.values()) {
      if (b.state === "orbit" && b.info.orbit > 0) {
        b.angle += (0.35 / Math.pow(b.info.orbit, 1.5)) * dt;
        b.pivot.rotation.y = b.angle;
      }
      if (b.state !== "orbit") continue;
      if (b.info.key === "sun") b.mesh.rotation.y += dt * 0.3;
      if (b.info.key === "neutron") b.mesh.rotation.y += dt * 6; // 펄서는 아주 빨리 돈다
      if (b.info.key === "smbh") b.mesh.rotation.y += dt * 1.5;
      if (b.info.key === "andromeda") b.mesh.rotation.y += dt * 0.4;
    }
    // 태양이 사라지면 궤도선도 흐려지고 햇빛도 꺼진다
    const sunGone = this.bodies.get("sun")?.state !== "orbit";
    for (const o of this.orbits) (o.material as THREE.LineBasicMaterial).opacity = sunGone ? 0.08 : 0.25;
    this.sunLight.visible = !sunGone;

    const hole = this.hole;
    const busy = [...this.bodies.values()].some((b) => b.state === "falling" || b.state === "tearing");
    this.roche.visible = hole !== null && busy;
    if (!hole) return;
    this.roche.position.copy(hole.center);

    // 먹이기 줄: 아직 작으면, 앞 천체를 먹고 자랄 때까지 기다렸다가 다시 해 본다
    const digesting = [...this.bodies.values()].some((b) => b.state === "falling" || b.state === "tearing");
    this.queue = this.queue.filter((q) => {
      q.wait -= dt;
      if (q.wait > 0) return true;
      const result = this.feed(q.key);
      // 소화 중인 천체가 있거나, 줄에 지금 먹을 수 있는 다른 천체가 있으면 곧 자랄 테니 기다린다
      const others = this.queue.some((e) => e !== q && bodyInfo(e.key).need <= hole.size);
      if (result === "too-small" && (digesting || others)) {
        q.wait = 0.5;
        return true;
      }
      return false;
    });

    for (const b of this.bodies.values()) {
      if (b.state === "falling" && b.fall) this.stepFall(b, dt, hole.center);
      else if (b.state === "tearing" && b.debris) this.stepDebris(b, dt, hole);
    }
  }

  // ① 끌려오기: 블랙홀 둘레를 돌며(점점 빨라짐) 다가가고, 길쭉해진다
  private stepFall(b: Body, dt: number, hole: THREE.Vector3) {
    const f = b.fall as { t: number; start: THREE.Vector3 };
    f.t = Math.min(1, f.t + dt / FALL_TIME);
    const t = f.t;
    const d0 = f.start.clone().sub(hole);
    const r0 = Math.hypot(d0.x, d0.z);
    const a0 = Math.atan2(d0.z, d0.x);
    const r = r0 * Math.pow(1 - t, 1.3) + ROCHE * 0.6 * t;
    const a = a0 + t * t * Math.PI * 3;
    const next = new THREE.Vector3(hole.x + r * Math.cos(a), hole.y + d0.y * Math.pow(1 - t, 2), hole.z + r * Math.sin(a));
    b.mesh.lookAt(this.group.localToWorld(next.clone().add(next.clone().sub(b.mesh.position))));
    b.mesh.position.copy(next);
    // 블랙홀 쪽으로 당겨져 늘어난다 (아직 찢어지기 전)
    b.mesh.scale.set(1 - 0.3 * t, 1 - 0.3 * t, 1 + 1.5 * t * t);
    if (next.distanceTo(hole) <= ROCHE) this.tear(b, hole);
  }

  // ③④ 스파게티화: 조각마다 케플러 회전 + 안쪽으로 빨려 들어감, 지평선에서 사라짐
  private stepDebris(b: Body, dt: number, hole: HoleInfo) {
    const d = b.debris as Debris;
    const pos = d.points.geometry.attributes.position.array as Float32Array;
    const tail = d.tails.geometry.attributes.position.array as Float32Array;
    const tailCol = d.tails.geometry.attributes.color.array as Float32Array;
    const color = new THREE.Color(b.info.debris ?? b.info.color);
    const c = hole.center;
    for (let i = 0; i < DEBRIS; i++) {
      if (!d.alive[i]) continue;
      const o = i * 3;
      let r = d.data[o];
      const inward = debrisInward(r);
      r -= inward * dt;
      if (r <= hole.horizon) {
        d.alive[i] = 0;
        d.left--;
        pos.set([c.x, c.y, c.z], o);
        tail.set([c.x, c.y, c.z, c.x, c.y, c.z], i * 6);
        continue;
      }
      const spin = debrisSpin(r);
      const theta = (d.data[o + 1] += spin * dt);
      const y = (d.data[o + 2] *= 1 - Math.min(0.9, 1.8 * dt));
      d.data[o] = r;
      const x = c.x + r * Math.cos(theta);
      const z = c.z + r * Math.sin(theta);
      pos.set([x, c.y + y, z], o);
      // 꼬리: 조금 전 자리 → 국수 가닥처럼 보인다. 가까울수록 뜨겁게(흰색 쪽으로)
      const tt = theta - spin * 0.2;
      const tr = r + inward * 0.2;
      tail.set([x, c.y + y, z, c.x + tr * Math.cos(tt), c.y + y, c.z + tr * Math.sin(tt)], i * 6);
      const heat = Math.min(1, (ROCHE - r) / ROCHE + 0.2);
      tailCol.set([color.r + (1 - color.r) * heat, color.g + (1 - color.g) * heat * 0.8, color.b + (1 - color.b) * heat * 0.5, 0, 0, 0], i * 6);
    }
    d.points.geometry.attributes.position.needsUpdate = true;
    d.tails.geometry.attributes.position.needsUpdate = true;
    d.tails.geometry.attributes.color.needsUpdate = true;
    if (d.left <= 0) {
      this.clearDebris(b);
      b.state = "eaten";
      b.fall = null;
      this.onSwallow?.(b.info);
    }
  }

  dispose() {
    for (const b of this.bodies.values()) this.clearDebris(b);
    this.disposables.forEach((d) => d.dispose());
  }
}
