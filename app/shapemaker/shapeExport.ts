import { BASES, DEFAULT_PARAMS, inputRange, MAX_EXTRAS, MAX_SUBDIV, PULL_MAX, PULL_MIN, SLIDERS, type BuiltShape, type ShapeParams } from "./shapeGeometry";
import { isColorMode, type Look } from "./shapeLook";

// ----------------------------------------------------------------------------
// 내보내기/가져오기: 공유 링크, 사진, STL·OBJ, 갤러리 파일
// ----------------------------------------------------------------------------

interface SharePayload {
  p: ShapeParams;
  l: Look;
}

const clamp = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

// 링크·파일은 누구나 고칠 수 있으므로 값마다 범위를 검사해서 받아들인다
export function sanitizeParams(raw: unknown): ShapeParams {
  const rp = (raw && typeof raw === "object" ? raw : {}) as Partial<ShapeParams> & { size?: number };
  const base = BASES.find((b) => b.key === rp.base)?.key ?? DEFAULT_PARAMS.base;
  const p: ShapeParams = { ...DEFAULT_PARAMS, base, pulls: {} };
  // 예전 데이터는 크기를 배율(size)로 담았다
  const sizePct = rp.sizePct ?? (typeof rp.size === "number" ? rp.size * 100 : undefined);
  for (const s of SLIDERS) {
    const [lo, hi] = inputRange(s);
    p[s.key] = clamp(s.key === "sizePct" ? sizePct : rp[s.key], lo, hi, DEFAULT_PARAMS[s.key]);
  }
  p.subdiv = Math.round(clamp(rp.subdiv, 0, MAX_SUBDIV, 0));
  p.extras = (Array.isArray(rp.extras) ? rp.extras : []).filter((k) => BASES.some((b) => b.key === k)).slice(0, MAX_EXTRAS);
  for (const [k, v] of Object.entries(rp.pulls ?? {})) {
    const i = Number(k);
    if (Number.isInteger(i) && i >= 0 && i < 200) p.pulls[i] = clamp(v, PULL_MIN, PULL_MAX, 0);
  }
  return p;
}

export function sanitizeLook(raw: unknown): Look {
  const rl = (raw && typeof raw === "object" ? raw : {}) as Partial<Look>;
  return {
    colorMode: isColorMode(rl.colorMode) ? rl.colorMode : "rainbow",
    color: typeof rl.color === "string" && /^#[0-9a-f]{6}$/i.test(rl.color) ? rl.color : "#ff5d8f",
  };
}

export function encodeShare(p: ShapeParams, l: Look): string {
  const json = JSON.stringify({ p, l } satisfies SharePayload);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(code: string): SharePayload | null {
  try {
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const raw = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))) as Partial<SharePayload>;
    return { p: sanitizeParams(raw.p), l: sanitizeLook(raw.l) };
  } catch (err) {
    console.warn("공유 링크를 읽지 못했어요", err);
    return null;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);/)?.[1] ?? "image/png";
  const bin = atob(body);
  return new Blob([Uint8Array.from(bin, (c) => c.charCodeAt(0))], { type: mime });
}

// 3D 프린터 파일은 반지름 1 = 30mm. STL/OBJ 는 보통 Z 가 위쪽이라 (x, y, z) → (x, -z, y)
const MM_PER_UNIT = 30;
const toPrint = (pos: Float32Array, i: number) => [pos[i] * MM_PER_UNIT, -pos[i + 2] * MM_PER_UNIT, pos[i + 1] * MM_PER_UNIT];

export function toStl(built: BuiltShape): Blob {
  const pos = built.positions;
  const triCount = pos.length / 9;
  const buf = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(buf);
  const header = "shapemaker STL";
  for (let i = 0; i < header.length; i++) view.setUint8(i, header.charCodeAt(i));
  view.setUint32(80, triCount, true);
  let o = 84;
  for (let t = 0; t < triCount; t++) {
    const v = [0, 1, 2].map((k) => toPrint(pos, t * 9 + k * 3));
    const ux = v[1][0] - v[0][0], uy = v[1][1] - v[0][1], uz = v[1][2] - v[0][2];
    const wx = v[2][0] - v[0][0], wy = v[2][1] - v[0][1], wz = v[2][2] - v[0][2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    for (const n of [nx, ny, nz]) {
      view.setFloat32(o, n, true);
      o += 4;
    }
    for (const p of v) {
      for (const c of p) {
        view.setFloat32(o, c, true);
        o += 4;
      }
    }
    view.setUint16(o, 0, true);
    o += 2;
  }
  return new Blob([buf], { type: "model/stl" });
}

// OBJ: 대부분의 3D 프로그램(블렌더, 마인크래프트 도구 등)에서 열 수 있는 글자 파일
export function toObj(built: BuiltShape, name: string): Blob {
  const pos = built.positions;
  const lines = [`# ${name} - 나만의 도형 만들기`, `o shape`];
  for (let i = 0; i < pos.length; i += 3) {
    const [x, y, z] = toPrint(pos, i);
    lines.push(`v ${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
  }
  for (let t = 0; t < pos.length / 9; t++) lines.push(`f ${t * 3 + 1} ${t * 3 + 2} ${t * 3 + 3}`);
  return new Blob([lines.join("\n")], { type: "text/plain" });
}
