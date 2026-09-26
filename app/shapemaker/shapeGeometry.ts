import * as THREE from "three";
import { getBase, type BaseKey } from "./shapeBases";

export { BASES, CATEGORY_LABEL, baseInfo, getBase, type BaseCategory, type BaseInfo, type BaseKey } from "./shapeBases";

// ----------------------------------------------------------------------------
// 도형 변형 계산 (렌더링과 분리된 순수 기하 로직)
// ----------------------------------------------------------------------------

export interface ShapeParams {
  base: BaseKey;
  twist: number; // 비틀기 각도(도) — 위아래 끝의 회전 차이
  spike: number; // 면 가운데를 밖(+)/안(-)으로 밀기
  height: number; // 세로 배율
  width: number; // 가로(좌우) 배율
  depth: number; // 앞뒤 배율
  shear: number; // 기울이기 각도(도)
  bend: number; // 휘기 각도(도) — 맨 아래와 맨 위가 이루는 굽은 각
  taper: number; // 위로 갈수록 좁게(-) / 넓게(+)
  wave: number; // 물결 세기
  waveCount: number; // 물결 개수 (위아래로 몇 번 울렁이는지)
  rotX: number; // 뒤집기 각도(도) — 앞뒤로 굴리기
  rotZ: number; // 눕히기 각도(도) — 옆으로 눕히기
  sizePct: number; // 전체 크기(%) 1~10000
  spherify: number; // 0 = 그대로, 1 = 완전히 공
  snake: number; // 뱀처럼 좌우로 구불구불한 정도
  snakeCount: number; // 구불구불 횟수
  steps: number; // 계단 층 수 (0 = 끄기)
  bulge: number; // 배불뚝(+) / 허리 잘록(-)
  noise: number; // 울퉁불퉁 돌멩이 정도
  explode: number; // 면을 바깥으로 떼어 내는 거리 (펼치기)
  slice: number; // 위에서부터 잘라 내는 비율(%) — 화면에서만 적용
  copies: number; // 회전목마처럼 둥글게 복제하는 개수 — 화면에서만 적용
  subdiv: number; // 삼각형 쪼개기 단계 0~MAX_SUBDIV
  pulls: Record<number, number>; // 꼭짓점 번호 → 당긴 양
  extras: BaseKey[]; // 새로 추가한 다른 도형들 (같은 효과를 받아 고리로 늘어선다)
}

export const DEFAULT_PARAMS: ShapeParams = {
  base: "icosa",
  twist: 0,
  spike: 0,
  height: 1,
  width: 1,
  depth: 1,
  shear: 0,
  bend: 0,
  taper: 0,
  wave: 0,
  waveCount: 3,
  rotX: 0,
  rotZ: 0,
  sizePct: 100,
  spherify: 0,
  snake: 0,
  snakeCount: 2,
  steps: 0,
  bulge: 0,
  noise: 0,
  explode: 0,
  slice: 0,
  copies: 1,
  subdiv: 0,
  pulls: {},
  extras: [],
};

export const MAX_EXTRAS = 100;

export const MAX_SUBDIV = 5;
// 움직이는 도형은 매 프레임 다시 계산하므로 이 단계까지만 쪼갠다
export const ANIM_MAX_SUBDIV = 3;

// 예전에 저장된 도형에 새로 생긴 값이 없어도 안전하게 채워 넣는다
export function normalizeParams(p: Partial<ShapeParams> & { size?: number }): ShapeParams {
  const { size, ...rest } = p;
  const out: ShapeParams = { ...DEFAULT_PARAMS, ...rest, pulls: { ...(p.pulls ?? {}) }, extras: Array.isArray(p.extras) ? p.extras.slice(0, MAX_EXTRAS) : [] };
  // 이전 버전은 크기를 배율(size, 1 = 보통)로 저장했으므로 %로 바꾼다
  if (rest.sizePct === undefined && typeof size === "number") out.sizePct = Math.round(size * 100);
  return out;
}

export type SliderKey = Exclude<keyof ShapeParams, "base" | "pulls" | "subdiv" | "extras">;

export interface SliderDef {
  key: SliderKey;
  group?: "angle" | "shape" | "fun";
  label: string;
  emoji: string;
  min: number; // 슬라이더 범위
  max: number;
  inputMin?: number; // 숫자 칸에 직접 입력할 때 범위 (없으면 슬라이더 범위)
  inputMax?: number;
  step: number;
  unit: "deg" | "x" | "pct" | "num" | "count" | "percent";
  log?: boolean; // 슬라이더 눈금을 로그로 (1~10000 처럼 범위가 넓을 때)
}

export function inputRange(def: SliderDef): [number, number] {
  return [def.inputMin ?? def.min, def.inputMax ?? def.max];
}

export const SLIDERS: SliderDef[] = [
  { key: "twist", group: "angle", label: "비틀기 각도", emoji: "🌀", min: -360, max: 360, inputMin: -3600, inputMax: 3600, step: 5, unit: "deg" },
  { key: "bend", group: "angle", label: "휘기 각도", emoji: "🍌", min: -180, max: 180, inputMin: -360, inputMax: 360, step: 5, unit: "deg" },
  { key: "shear", group: "angle", label: "기울이기 각도", emoji: "📐", min: -45, max: 45, inputMin: -80, inputMax: 80, step: 1, unit: "deg" },
  { key: "rotX", group: "angle", label: "뒤집기 각도 (앞뒤로 굴리기)", emoji: "🔄", min: -180, max: 180, step: 5, unit: "deg" },
  { key: "rotZ", group: "angle", label: "눕히기 각도 (옆으로 눕히기)", emoji: "🤸", min: -180, max: 180, step: 5, unit: "deg" },
  { key: "sizePct", group: "shape", label: "전체 크기", emoji: "🔍", min: 1, max: 10000, step: 1, unit: "percent", log: true },
  { key: "spike", group: "shape", label: "뾰족하게 / 오목하게", emoji: "⭐", min: -0.6, max: 1.5, inputMin: -0.9, inputMax: 10, step: 0.05, unit: "num" },
  { key: "height", group: "shape", label: "키 늘이기", emoji: "↕️", min: 0.3, max: 2.5, inputMin: 0.05, inputMax: 20, step: 0.05, unit: "x" },
  { key: "width", group: "shape", label: "옆으로 늘이기", emoji: "↔️", min: 0.3, max: 2.5, inputMin: 0.05, inputMax: 20, step: 0.05, unit: "x" },
  { key: "depth", group: "shape", label: "앞뒤로 늘이기", emoji: "🔛", min: 0.3, max: 2.5, inputMin: 0.05, inputMax: 20, step: 0.05, unit: "x" },
  { key: "taper", group: "shape", label: "위로 좁게 / 넓게", emoji: "🍦", min: -1, max: 1, inputMin: -1, inputMax: 5, step: 0.05, unit: "num" },
  { key: "wave", group: "shape", label: "물결 울렁울렁", emoji: "🌊", min: 0, max: 0.5, inputMin: 0, inputMax: 2, step: 0.02, unit: "num" },
  { key: "waveCount", group: "shape", label: "물결 개수", emoji: "〰️", min: 1, max: 10, inputMin: 1, inputMax: 50, step: 1, unit: "count" },
  { key: "spherify", group: "shape", label: "공처럼 둥글게", emoji: "🔮", min: 0, max: 1, step: 0.05, unit: "pct" },
  { key: "snake", group: "fun", label: "뱀처럼 구불구불", emoji: "🐍", min: 0, max: 1, inputMin: 0, inputMax: 3, step: 0.05, unit: "num" },
  { key: "snakeCount", group: "fun", label: "구불구불 개수", emoji: "➰", min: 1, max: 6, inputMin: 1, inputMax: 30, step: 1, unit: "count" },
  { key: "steps", group: "fun", label: "계단 만들기 (층 수, 0 = 끄기)", emoji: "🪜", min: 0, max: 20, inputMin: 0, inputMax: 100, step: 1, unit: "count" },
  { key: "bulge", group: "fun", label: "배불뚝 / 허리 잘록", emoji: "🫃", min: -0.8, max: 1.5, inputMin: -0.95, inputMax: 5, step: 0.05, unit: "num" },
  { key: "noise", group: "fun", label: "울퉁불퉁 돌멩이", emoji: "🪨", min: 0, max: 0.5, inputMin: 0, inputMax: 2, step: 0.02, unit: "num" },
  { key: "explode", group: "fun", label: "펼치기 (면 떼어 내기)", emoji: "💥", min: 0, max: 1.5, inputMin: 0, inputMax: 10, step: 0.05, unit: "num" },
  { key: "slice", group: "fun", label: "단면 자르기 (위에서부터)", emoji: "🔪", min: 0, max: 95, step: 1, unit: "percent" },
  { key: "copies", group: "fun", label: "회전목마 복제 (도형마다 각자)", emoji: "🎠", min: 1, max: 100, step: 1, unit: "count" },
];

export const PULL_MIN = -0.6;
export const PULL_MAX = 1.2;

// ----------------------------------------------------------------------------
// 변형 파이프라인
//   당기기 → 뾰족하게 → 쪼개기 → 돌멩이 → 둥글게 → 좁히기/물결/배불뚝 → 늘이기
//   → 구불구불 → 기울이기 → 계단 → 비틀기 → 휘기 → 뒤집기/눕히기 → 크기 → 펼치기
// 쪼개기 5단계면 삼각형이 18만 개까지 늘어나므로, 꼭짓점을 숫자 배열로 공유해서
// 한 점을 한 번만 변형한다.
// ----------------------------------------------------------------------------

export interface ShapeStats {
  vertices: number;
  edges: number;
  faces: number;
}

export interface BuiltShape {
  positions: Float32Array; // 삼각형 목록 (index 없음)
  faceIds: Int32Array; // 삼각형마다 원래 면 번호 (색칠용)
  faceCount: number;
  edgeLines: Float32Array; // 모서리 선 (선분 두 점씩)
  handles: THREE.Vector3[]; // 변형된 원래 꼭짓점 위치 (클릭 선택용)
  radius: number; // 원점에서 가장 먼 점까지 거리 (카메라 맞추기·실제 크기 계산용)
  minY: number;
  maxY: number;
  area: number; // 겉넓이 (반지름 1 단위)
  volume: number; // 부피 (반지름 1 단위, 펼치기 전 기준)
  stats: ShapeStats;
}

const DEG = Math.PI / 180;
// 이 각도보다 더 꺾인 곳, 또는 원래 면이 바뀌는 곳에 모서리 선을 그린다
const EDGE_COS = Math.cos(15 * DEG);

// 같은 위치는 항상 같은 값을 주는 0~1 난수 (돌멩이 모양이 매번 바뀌지 않도록)
function hash3(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function deformInto(x: number, y: number, z: number, P: ShapeParams, out: Float32Array | number[], o: number) {
  if (P.noise > 0) {
    const n = 1 + P.noise * (hash3(x, y, z) - 0.5) * 2;
    x *= n;
    y *= n;
    z *= n;
  }
  if (P.spherify > 0) {
    const len = Math.hypot(x, y, z);
    if (len > 1e-9) {
      const k = 1 + (1 / len - 1) * P.spherify;
      x *= k;
      y *= k;
      z *= k;
    }
  }
  // y0(-1~1 근처)는 늘이기 전 높이: 좁히기·물결·배불뚝·구불구불의 기준
  const y0 = y;
  const radial =
    Math.max(0.05, 1 + P.taper * y0) *
    (1 + P.wave * Math.sin(y0 * P.waveCount * Math.PI)) *
    Math.max(0.05, 1 + P.bulge * (1 - Math.min(1, y0 * y0)));
  x *= radial * P.width;
  z *= radial * P.depth;
  y *= P.height;
  x += P.snake * Math.sin(y0 * P.snakeCount * Math.PI);
  x += y * Math.tan(P.shear * DEG);

  const h = Math.max(P.height, 1e-6);
  if (P.steps > 0) y = (Math.round((y / h) * P.steps) / P.steps) * h;

  // 맨 아래(-height)와 맨 위(+height)의 회전 차이가 twist 가 되도록
  const ta = P.twist * DEG * (y / (2 * h));
  const c = Math.cos(ta);
  const s = Math.sin(ta);
  const tx = x * c - z * s;
  z = x * s + z * c;
  x = tx;

  // 휘기: 높이 2h 인 기둥을 반지름 R 원호로 굽힌다 (중심은 x = R)
  const theta = P.bend * DEG;
  if (Math.abs(theta) > 1e-4) {
    const R = (2 * h) / theta;
    const phi = y / R;
    const r = R - x;
    x = R - r * Math.cos(phi);
    y = r * Math.sin(phi);
  }

  // 뒤집기(X축) → 눕히기(Z축) 로 도형 전체를 돌린다
  const ax = P.rotX * DEG;
  if (ax !== 0) {
    const ty = y * Math.cos(ax) - z * Math.sin(ax);
    z = y * Math.sin(ax) + z * Math.cos(ax);
    y = ty;
  }
  const az = P.rotZ * DEG;
  if (az !== 0) {
    const tx2 = x * Math.cos(az) - y * Math.sin(az);
    y = x * Math.sin(az) + y * Math.cos(az);
    x = tx2;
  }

  const k = P.sizePct / 100;
  out[o] = x * k;
  out[o + 1] = y * k;
  out[o + 2] = z * k;
}

function pulledVerts(P: ShapeParams): THREE.Vector3[] {
  const base = getBase(P.base);
  return base.verts.map((v, i) => v.clone().multiplyScalar(1 + (P.pulls[i] ?? 0)));
}

const edgeKey = (a: number, b: number) => (a < b ? a * 4194304 + b : b * 4194304 + a);

export function buildShape(P: ShapeParams): BuiltShape {
  const base = getBase(P.base);
  const verts = pulledVerts(P);

  // 1) 꼭짓점(공유) + 삼각형 인덱스로 망 만들기
  const pos: number[] = [];
  verts.forEach((v) => pos.push(v.x, v.y, v.z));
  let tris: number[] = [];
  let triFace: number[] = [];
  base.faces.forEach((face, fi) => {
    if (face.length === 3 && P.spike === 0) {
      tris.push(face[0], face[1], face[2]);
      triFace.push(fi);
      return;
    }
    const pts = face.map((i) => verts[i]);
    const center = new THREE.Vector3();
    pts.forEach((p) => center.add(p));
    center.divideScalar(pts.length);
    const normal = new THREE.Vector3()
      .crossVectors(pts[1].clone().sub(pts[0]), pts[2].clone().sub(pts[0]))
      .normalize();
    const apex = center.addScaledVector(normal, P.spike);
    const ai = pos.length / 3;
    pos.push(apex.x, apex.y, apex.z);
    for (let k = 0; k < face.length; k++) {
      tris.push(ai, face[k], face[(k + 1) % face.length]);
      triFace.push(fi);
    }
  });
  const triBeforeSubdiv = triFace.length;

  // 2) 쪼개기: 모서리 가운데 점은 이웃 삼각형과 공유
  const levels = Math.min(Math.max(Math.round(P.subdiv), 0), MAX_SUBDIV);
  for (let level = 0; level < levels; level++) {
    const mids = new Map<number, number>();
    const mid = (a: number, b: number) => {
      const key = edgeKey(a, b);
      let m = mids.get(key);
      if (m === undefined) {
        m = pos.length / 3;
        pos.push((pos[a * 3] + pos[b * 3]) / 2, (pos[a * 3 + 1] + pos[b * 3 + 1]) / 2, (pos[a * 3 + 2] + pos[b * 3 + 2]) / 2);
        mids.set(key, m);
      }
      return m;
    };
    const next: number[] = [];
    const nextFace: number[] = [];
    for (let t = 0; t < triFace.length; t++) {
      const a = tris[t * 3];
      const b = tris[t * 3 + 1];
      const c = tris[t * 3 + 2];
      const ab = mid(a, b);
      const bc = mid(b, c);
      const ca = mid(c, a);
      next.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
      const f = triFace[t];
      nextFace.push(f, f, f, f);
    }
    tris = next;
    triFace = nextFace;
  }

  // 3) 점마다 한 번씩 변형
  const nv = pos.length / 3;
  const def = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) deformInto(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], P, def, i * 3);

  // 4) 화면용 삼각형 목록 + 삼각형 법선 + 겉넓이/부피
  const triCount = triFace.length;
  const positions = new Float32Array(triCount * 9);
  const normals = new Float32Array(triCount * 3);
  let area = 0;
  let volume = 0;
  // 펼치기: 원래 면마다 바깥 방향(넓이 가중 법선)으로 통째로 옮긴다
  const faceNormalSum = new Float64Array(base.faces.length * 3);
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const vi = tris[t * 3 + k] * 3;
      positions[t * 9 + k * 3] = def[vi];
      positions[t * 9 + k * 3 + 1] = def[vi + 1];
      positions[t * 9 + k * 3 + 2] = def[vi + 2];
    }
    const o = t * 9;
    const ux = positions[o + 3] - positions[o], uy = positions[o + 4] - positions[o + 1], uz = positions[o + 5] - positions[o + 2];
    const wx = positions[o + 6] - positions[o], wy = positions[o + 7] - positions[o + 1], wz = positions[o + 8] - positions[o + 2];
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz);
    area += len / 2;
    // 원점과 삼각형이 만드는 사면체 부피를 모두 더한다 (발산 정리)
    volume += (positions[o] * nx + positions[o + 1] * ny + positions[o + 2] * nz) / 6;
    const f = triFace[t] * 3;
    faceNormalSum[f] += nx;
    faceNormalSum[f + 1] += ny;
    faceNormalSum[f + 2] += nz;
    const safe = len || 1;
    normals[t * 3] = nx / safe;
    normals[t * 3 + 1] = ny / safe;
    normals[t * 3 + 2] = nz / safe;
  }

  const k = P.sizePct / 100;
  const faceOffset = new Float32Array(base.faces.length * 3);
  if (P.explode > 0) {
    for (let f = 0; f < base.faces.length; f++) {
      const x = faceNormalSum[f * 3], y = faceNormalSum[f * 3 + 1], z = faceNormalSum[f * 3 + 2];
      const d = (P.explode * k) / (Math.hypot(x, y, z) || 1);
      faceOffset[f * 3] = x * d;
      faceOffset[f * 3 + 1] = y * d;
      faceOffset[f * 3 + 2] = z * d;
    }
    for (let t = 0; t < triCount; t++) {
      const f = triFace[t] * 3;
      for (let v = 0; v < 3; v++) {
        positions[t * 9 + v * 3] += faceOffset[f];
        positions[t * 9 + v * 3 + 1] += faceOffset[f + 1];
        positions[t * 9 + v * 3 + 2] += faceOffset[f + 2];
      }
    }
  }

  let radiusSq = 0;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    radiusSq = Math.max(radiusSq, positions[i] ** 2 + positions[i + 1] ** 2 + positions[i + 2] ** 2);
    minY = Math.min(minY, positions[i + 1]);
    maxY = Math.max(maxY, positions[i + 1]);
  }

  // 5) 모서리 선: 원래 면이 달라지거나 많이 꺾이는 곳만 (펼치면 선도 면을 따라간다)
  const firstTri = new Map<number, number>();
  const lines: number[] = [];
  for (let t = 0; t < triCount; t++) {
    for (let e = 0; e < 3; e++) {
      const a = tris[t * 3 + e];
      const b = tris[t * 3 + ((e + 1) % 3)];
      const key = edgeKey(a, b);
      const other = firstTri.get(key);
      if (other === undefined) {
        firstTri.set(key, t);
        continue;
      }
      const dot = normals[t * 3] * normals[other * 3] + normals[t * 3 + 1] * normals[other * 3 + 1] + normals[t * 3 + 2] * normals[other * 3 + 2];
      if (triFace[t] !== triFace[other] || dot < EDGE_COS) {
        const f = triFace[t] * 3;
        const ox = faceOffset[f], oy = faceOffset[f + 1], oz = faceOffset[f + 2];
        lines.push(def[a * 3] + ox, def[a * 3 + 1] + oy, def[a * 3 + 2] + oz, def[b * 3] + ox, def[b * 3 + 1] + oy, def[b * 3 + 2] + oz);
      }
    }
  }

  return {
    positions,
    faceIds: Int32Array.from(triFace),
    faceCount: base.faces.length,
    edgeLines: Float32Array.from(lines),
    // 원래 꼭짓점은 pos 앞쪽에 그대로 있으므로 변형 결과를 바로 읽는다
    handles: verts.map((_, i) => new THREE.Vector3(def[i * 3], def[i * 3 + 1], def[i * 3 + 2])),
    radius: Math.sqrt(radiusSq),
    minY,
    maxY,
    area,
    volume: Math.abs(volume),
    stats: computeStats(P, triBeforeSubdiv, levels),
  };
}

function computeStats(P: ShapeParams, triangles: number, levels: number): ShapeStats {
  const base = getBase(P.base);
  const V0 = base.verts.length;
  const F0 = base.faces.length;
  const E0 = base.edges;
  if (levels > 0) {
    // 닫힌 삼각형 그물: E = 3F/2, 오일러 공식으로 V
    const F = triangles * 4 ** levels;
    const E = (3 * F) / 2;
    return { vertices: E - F + 2, edges: E, faces: F };
  }
  if (P.spike === 0) return { vertices: V0, edges: E0, faces: F0 };
  const sumDeg = base.faces.reduce((s, f) => s + f.length, 0);
  return { vertices: V0 + F0, edges: E0 + sumDeg, faces: sumDeg };
}

// 한 꼭짓점에 모인 면의 각을 모두 더한 값(도). 360°보다 작을수록 뾰족하다.
export function vertexAngleSum(P: ShapeParams, index: number): number {
  const base = getBase(P.base);
  const pts = pulledVerts(P).map((v) => {
    const o = [0, 0, 0];
    deformInto(v.x, v.y, v.z, P, o, 0);
    return new THREE.Vector3(o[0], o[1], o[2]);
  });
  let sum = 0;
  for (const face of base.faces) {
    const k = face.indexOf(index);
    if (k < 0) continue;
    const prev = pts[face[(k - 1 + face.length) % face.length]];
    const next = pts[face[(k + 1) % face.length]];
    sum += prev.clone().sub(pts[index]).angleTo(next.clone().sub(pts[index]));
  }
  return THREE.MathUtils.radToDeg(sum);
}
