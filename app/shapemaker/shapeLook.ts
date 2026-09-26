// ----------------------------------------------------------------------------
// 색칠·배경 설정 (화면과 저장 데이터가 함께 쓰는 값)
// ----------------------------------------------------------------------------

export type ColorMode = "rainbow" | "solid" | "glass" | "height" | "stripe" | "random" | "metal" | "neon" | "wire";

export const COLOR_MODES: { key: ColorMode; label: string; usesColor: boolean }[] = [
  { key: "rainbow", label: "🌈 무지개", usesColor: false },
  { key: "solid", label: "🎨 한 가지 색", usesColor: true },
  { key: "glass", label: "🔮 유리", usesColor: true },
  { key: "height", label: "🌓 높이 색", usesColor: false },
  { key: "stripe", label: "🦓 줄무늬", usesColor: true },
  { key: "random", label: "🎲 알록달록", usesColor: false },
  { key: "metal", label: "✨ 금속", usesColor: true },
  { key: "neon", label: "💡 네온", usesColor: true },
  { key: "wire", label: "🕸️ 선만", usesColor: true },
];

export interface Look {
  colorMode: ColorMode;
  color: string;
}

export type BgTheme = "space" | "sky" | "sunset" | "paper" | "forest";

export const BG_THEMES: { key: BgTheme; label: string; top: string; bottom: string; light: boolean; stars: boolean }[] = [
  { key: "space", label: "🌌 우주", top: "#060a1c", bottom: "#1c1446", light: false, stars: true },
  { key: "sky", label: "☁️ 하늘", top: "#4ea8ff", bottom: "#e3f4ff", light: true, stars: false },
  { key: "sunset", label: "🌅 노을", top: "#ff6a5b", bottom: "#ffd28a", light: true, stars: false },
  { key: "paper", label: "📄 종이", top: "#fbf8f0", bottom: "#e6dfcd", light: true, stars: false },
  { key: "forest", label: "🌲 숲", top: "#0c2e22", bottom: "#2f7d4f", light: false, stars: true },
];

export const isColorMode = (v: unknown): v is ColorMode => COLOR_MODES.some((m) => m.key === v);
