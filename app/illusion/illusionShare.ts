import {
  inputRange,
  KINDS,
  specOf,
  VIEW_H,
  VIEW_W,
  type Kind,
  type Params,
} from "./illusionSpec";

// ----------------------------------------------------------------------------
// 내보내기/가져오기: 공유 링크, 사진, 갤러리
// 도형 만들기의 shapeExport.ts 와 같은 자리에 해당한다.
// ----------------------------------------------------------------------------

export const GALLERY_KEY = "illusion_maker_v2";
export const GALLERY_MAX = 12;

export interface SavedIllusion {
  id: number;
  name: string;
  kind: Kind;
  params: Params;
}

interface SharePayload {
  k: Kind;
  p: Params;
}

/**
 * 링크·저장본은 누구나 고칠 수 있고, 값이 깨지면 SVG 좌표에 NaN 이 들어가 그림이
 * 통째로 사라진다. 그래서 받아들일 때마다 종류를 확인하고 값을 범위 안으로 자른다.
 */
export function sanitizeKind(raw: unknown): Kind {
  return KINDS.find((k) => k.key === raw)?.key ?? KINDS[0].key;
}

export function sanitizeParams(kind: Kind, raw: unknown): Params {
  const spec = specOf(kind);
  const source = (raw && typeof raw === "object" ? raw : {}) as Params;
  const params: Params = { ...spec.defaults };
  for (const slider of spec.sliders) {
    const [lo, hi] = inputRange(slider);
    const value = Number(source[slider.key]);
    if (Number.isFinite(value)) params[slider.key] = Math.min(hi, Math.max(lo, value));
  }
  return params;
}

export function encodeShare(kind: Kind, params: Params): string {
  const json = JSON.stringify({ k: kind, p: params } satisfies SharePayload);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(code: string): { kind: Kind; params: Params } | null {
  try {
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const raw = JSON.parse(
      new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
    ) as Partial<SharePayload>;
    const kind = sanitizeKind(raw.k);
    return { kind, params: sanitizeParams(kind, raw.p) };
  } catch (err) {
    console.warn("공유 링크를 읽지 못했어요", err);
    return null;
  }
}

export function readGallery(): SavedIllusion[] {
  try {
    const raw = localStorage.getItem(GALLERY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const clean: SavedIllusion[] = [];
    for (const entry of parsed) {
      if (typeof entry !== "object" || entry === null) continue;
      const item = entry as Partial<SavedIllusion>;
      // 모르는 종류는 버린다. 되살리면 그릴 방법이 없다.
      if (!KINDS.some((k) => k.key === item.kind)) continue;
      const kind = sanitizeKind(item.kind);
      clean.push({
        id: Number(item.id) || Date.now(),
        name: typeof item.name === "string" ? item.name.slice(0, 40) : specOf(kind).name,
        kind,
        params: sanitizeParams(kind, item.params),
      });
    }
    return clean.slice(0, GALLERY_MAX);
  } catch (err) {
    console.warn("갤러리를 읽지 못했어요", err);
    return [];
  }
}

export function writeGallery(list: SavedIllusion[]): void {
  try {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(list.slice(0, GALLERY_MAX)));
  } catch (err) {
    console.warn("갤러리를 저장하지 못했어요", err);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 화면에 떠 있는 SVG 를 그대로 PNG 로 굽는다.
 * 그림을 두 번 만들지 않으므로 사진과 화면이 어긋날 수 없다.
 */
export function svgToPng(svg: SVGSVGElement, scale = 3): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const source = new XMLSerializer().serializeToString(svg);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = VIEW_W * scale;
      canvas.height = VIEW_H * scale;
      const ctx = canvas.getContext("2d");
      if (ctx === null) {
        reject(new Error("그림판을 만들지 못했어요"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("사진을 만들지 못했어요"));
      }, "image/png");
    };
    image.onerror = () => reject(new Error("그림을 불러오지 못했어요"));
    image.src = url;
  });
}
