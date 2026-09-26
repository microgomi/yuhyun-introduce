// ----------------------------------------------------------------------------
// 착시 사양: 어떤 착시가 있고, 무엇을 조절할 수 있고, 얼마나 강한지
// 도형 만들기의 shapeGeometry.ts 와 같은 자리에 해당한다.
// ----------------------------------------------------------------------------

export const VIEW_W = 340;
export const VIEW_H = 220;

export type Kind = "muller" | "ponzo" | "ebbing" | "vertical" | "cafe" | "contrast" | "hermann";
export type Params = Record<string, number>;

export type Unit = "deg" | "px" | "count" | "pct" | "light";

export interface SliderDef {
  key: string;
  emoji: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: Unit;
  /** 슬라이더 범위를 넘겨 직접 입력할 수 있는 한계. 없으면 슬라이더 범위와 같다. */
  hardMin?: number;
  hardMax?: number;
}

export function inputRange(def: SliderDef): [number, number] {
  return [def.hardMin ?? def.min, def.hardMax ?? def.max];
}

export type Category = "length" | "size" | "shape" | "color";

export const CATEGORY_LABEL: Record<Category, string> = {
  length: "길이가 달라 보여요",
  size: "크기가 달라 보여요",
  shape: "모양이 비뚤어 보여요",
  color: "색이 달라 보여요",
};

export interface KindSpec {
  key: Kind;
  category: Category;
  emoji: string;
  name: string;
  /** 친구에게 낼 문제. */
  question: string;
  /** 정답 확인을 눌렀을 때. */
  answer: string;
  why: string;
  /** 착시를 더 강하게 만드는 방법 — 퀴즈에도 쓴다. */
  tip: string;
  sliders: SliderDef[];
  defaults: Params;
}

export const KINDS: KindSpec[] = [
  {
    key: "muller",
    category: "length",
    emoji: "📏",
    name: "화살표",
    question: "위와 아래, 어느 선이 더 길까?",
    answer: "두 선은 길이가 똑같아요!",
    why: "화살표가 바깥으로 벌어지면 길게, 안으로 모이면 짧게 느껴져요.",
    tip: "화살표 각도를 크게 벌린다",
    sliders: [
      { key: "len", emoji: "📐", label: "선 길이", min: 120, max: 240, step: 5, unit: "px" },
      { key: "fin", emoji: "➤", label: "화살표 길이", min: 6, max: 45, step: 1, unit: "px" },
      { key: "angle", emoji: "🔺", label: "화살표 각도", min: 5, max: 75, step: 1, unit: "deg" },
      { key: "weight", emoji: "✏️", label: "선 두께", min: 2, max: 12, step: 1, unit: "px", hardMax: 20 },
    ],
    defaults: { len: 220, fin: 28, angle: 40, weight: 4 },
  },
  {
    key: "ponzo",
    category: "length",
    emoji: "🛤️",
    name: "기찻길",
    question: "노란 막대 두 개, 어느 게 더 길까?",
    answer: "두 막대는 길이가 똑같아요!",
    why: "모이는 선이 있으면 위쪽이 더 멀리 있다고 느껴서 더 크게 보여요.",
    tip: "기찻길을 더 많이 기울인다",
    sliders: [
      { key: "slant", emoji: "📉", label: "기찻길 기울기", min: 0, max: 70, step: 2, unit: "px" },
      { key: "bar", emoji: "🟨", label: "막대 길이", min: 50, max: 140, step: 5, unit: "px" },
      { key: "topY", emoji: "⬆️", label: "위 막대 높이", min: 25, max: 90, step: 5, unit: "px" },
      { key: "ties", emoji: "🪜", label: "침목 개수", min: 0, max: 6, step: 1, unit: "count", hardMax: 12 },
    ],
    defaults: { slant: 55, bar: 100, topY: 45, ties: 4 },
  },
  {
    key: "ebbing",
    category: "size",
    emoji: "⭕",
    name: "둘러싸기",
    question: "가운데 주황 원, 어느 쪽이 더 클까?",
    answer: "가운데 원 두 개는 크기가 똑같아요!",
    why: "큰 친구들 사이에선 작아 보이고, 작은 친구들 사이에선 커 보여요.",
    tip: "양쪽 둘레 원의 크기 차이를 크게 한다",
    sliders: [
      { key: "center", emoji: "🟠", label: "가운데 원 크기", min: 10, max: 26, step: 1, unit: "px" },
      { key: "big", emoji: "🔵", label: "왼쪽 둘레 원 크기", min: 8, max: 30, step: 1, unit: "px" },
      { key: "small", emoji: "🔹", label: "오른쪽 둘레 원 크기", min: 3, max: 18, step: 1, unit: "px" },
      { key: "dist", emoji: "↔️", label: "둘레 원 거리", min: 25, max: 50, step: 1, unit: "px" },
      { key: "count", emoji: "🔢", label: "둘레 원 개수", min: 3, max: 10, step: 1, unit: "count", hardMax: 16 },
    ],
    defaults: { center: 18, big: 28, small: 9, dist: 46, count: 6 },
  },
  {
    key: "vertical",
    category: "length",
    emoji: "📐",
    name: "세로가 길어",
    question: "세로 선과 가로 선, 어느 쪽이 더 길까?",
    answer: "두 선은 길이가 똑같아요!",
    why: "사람 눈은 위아래로 긴 것을 더 길게 느껴요.",
    tip: "선을 더 길고 굵게 한다",
    sliders: [
      { key: "len", emoji: "📏", label: "선 길이", min: 80, max: 190, step: 5, unit: "px" },
      { key: "weight", emoji: "✏️", label: "선 두께", min: 2, max: 14, step: 1, unit: "px", hardMax: 24 },
      { key: "shift", emoji: "↔️", label: "세로 선 위치", min: 0, max: 100, step: 5, unit: "pct" },
    ],
    defaults: { len: 150, weight: 5, shift: 50 },
  },
  {
    key: "cafe",
    category: "shape",
    emoji: "🧱",
    name: "비뚤어진 벽",
    question: "가로줄이 비뚤어져 보이나?",
    answer: "모든 줄은 완벽하게 평행해요!",
    why: "칸이 조금씩 어긋나 있으면 사이의 회색 줄눈이 기울어 보여요.",
    tip: "칸을 반 칸(50%)만큼 어긋나게 한다",
    sliders: [
      { key: "tile", emoji: "🔲", label: "칸 크기", min: 16, max: 40, step: 2, unit: "px" },
      { key: "shift", emoji: "↔️", label: "칸 어긋남", min: 0, max: 50, step: 5, unit: "pct" },
      { key: "mortar", emoji: "➖", label: "줄눈 두께", min: 0, max: 8, step: 1, unit: "px" },
      { key: "gray", emoji: "🌗", label: "줄눈 밝기", min: 0, max: 255, step: 5, unit: "light" },
    ],
    defaults: { tile: 28, shift: 50, mortar: 3, gray: 150 },
  },
  {
    key: "contrast",
    category: "color",
    emoji: "🎨",
    name: "색 대비",
    question: "두 네모, 색이 다르게 보이나?",
    answer: "두 네모는 완전히 똑같은 색이에요!",
    why: "어두운 배경에선 밝아 보이고, 밝은 배경에선 어두워 보여요.",
    tip: "양쪽 배경의 밝기 차이를 크게 한다",
    sliders: [
      { key: "bgL", emoji: "⬛", label: "왼쪽 배경 밝기", min: 0, max: 255, step: 5, unit: "light" },
      { key: "bgR", emoji: "⬜", label: "오른쪽 배경 밝기", min: 0, max: 255, step: 5, unit: "light" },
      { key: "square", emoji: "🔳", label: "네모 밝기", min: 0, max: 255, step: 5, unit: "light" },
      { key: "size", emoji: "📦", label: "네모 크기", min: 40, max: 110, step: 5, unit: "px" },
    ],
    defaults: { bgL: 35, bgR: 225, square: 138, size: 80 },
  },
  {
    key: "hermann",
    category: "color",
    emoji: "⬛",
    name: "깜빡이는 점",
    question: "선이 만나는 곳에 회색 점이 깜빡이나?",
    answer: "회색 점은 하나도 없어요. 전부 새하얀 선이에요!",
    why: "밝은 선이 겹치는 자리에 눈이 있지도 않은 그림자를 만들어 내요.",
    tip: "칸을 아주 어둡게 하고 선 두께를 알맞게 맞춘다",
    sliders: [
      { key: "cells", emoji: "🔢", label: "칸 개수", min: 3, max: 8, step: 1, unit: "count", hardMax: 12 },
      { key: "line", emoji: "➖", label: "선 두께", min: 4, max: 22, step: 1, unit: "px" },
      { key: "dark", emoji: "🌑", label: "칸 어둡기", min: 0, max: 120, step: 5, unit: "light" },
    ],
    defaults: { cells: 5, line: 10, dark: 20 },
  },
];

export function specOf(kind: Kind): KindSpec {
  return KINDS.find((k) => k.key === kind) ?? KINDS[0];
}

export const DEFAULT_KIND: Kind = "muller";

/**
 * 만든 착시가 얼마나 강할지 0~100 으로 어림한다.
 * 정확한 심리학 수치가 아니라, 값을 움직일 때 방향이 맞게 반응하는 안내용 지표다.
 */
export function strengthOf(kind: Kind, p: Params): number {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  switch (kind) {
    case "muller": {
      const spread = Math.sin((p.angle * Math.PI) / 180) * p.fin;
      return clamp((spread / 30) * 100);
    }
    case "ponzo": {
      const slant = Math.min(1, p.slant / 60);
      // 위 막대가 레일에 가까이 닿을수록 강하고, 레일 밖으로 삐져나가면 착시가 깨진다.
      const railHalf = 55 + (p.slant * (p.topY - 20)) / 180;
      const fill = p.bar / 2 / railHalf;
      const fit = fill > 1 ? Math.max(0, 1 - (fill - 1) * 2) : fill;
      return clamp(slant * fit * 100);
    }
    case "ebbing": {
      const gap = p.big - p.small;
      // 둘레 원이 가운데 원을 파고들면 비교 대상이 가려져 효과가 약해진다.
      const room = p.dist >= p.center + p.big ? 1 : 0.5;
      return clamp((gap / 24) * 100 * room);
    }
    case "vertical": {
      const length = Math.min(1, p.len / 170);
      const centered = 1 - Math.abs(p.shift - 50) / 100;
      return clamp(length * centered * 85);
    }
    case "cafe": {
      const shift = 1 - Math.abs(p.shift - 50) / 50;
      const mortar = p.mortar === 0 ? 0 : Math.min(1, p.mortar / 4);
      const mid = 1 - Math.abs(p.gray - 140) / 140;
      return clamp(shift * mortar * mid * 100);
    }
    case "contrast": {
      const diff = Math.abs(p.bgL - p.bgR) / 255;
      const mid = 1 - Math.abs(p.square - 128) / 128;
      return clamp(diff * mid * 100);
    }
    case "hermann": {
      const thick = 1 - Math.abs(p.line - 11) / 11;
      const dark = 1 - p.dark / 160;
      const cells = p.cells >= 4 ? 1 : 0.6;
      return clamp(thick * dark * cells * 100);
    }
  }
}

export function strengthLabel(value: number): { text: string; color: string } {
  if (value >= 80) return { text: "엄청나게 강해요!", color: "text-fuchsia-300" };
  if (value >= 60) return { text: "아주 잘 속아요!", color: "text-yellow-300" };
  if (value >= 40) return { text: "그럭저럭 보여요", color: "text-cyan-200" };
  if (value >= 20) return { text: "조금 약해요", color: "text-amber-300" };
  return { text: "거의 안 속아요", color: "text-white/50" };
}
