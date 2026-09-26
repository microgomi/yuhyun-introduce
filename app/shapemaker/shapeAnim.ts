import { ANIM_MAX_SUBDIV, type ShapeParams } from "./shapeGeometry";

// ----------------------------------------------------------------------------
// 움직이는 도형: 저장된 값은 그대로 두고, 화면에 보여줄 값만 시간에 따라 바꾼다
// ----------------------------------------------------------------------------

export type Anim = "none" | "breathe" | "dance" | "squish" | "wiggle" | "slither" | "blast";

export const ANIMS: [Exclude<Anim, "none">, string][] = [
  ["breathe", "🫁 숨쉬기"],
  ["dance", "💃 회오리 춤"],
  ["squish", "🍮 꿀렁꿀렁"],
  ["wiggle", "🐛 꼬물꼬물"],
  ["slither", "🐍 스르륵"],
  ["blast", "💥 펑펑"],
];

export function animateParams(base: ShapeParams, anim: Anim, t: number): ShapeParams {
  const s = Math.sin(t * 2.2);
  const P = { ...base, subdiv: Math.min(base.subdiv, ANIM_MAX_SUBDIV) };
  switch (anim) {
    case "breathe":
      return { ...P, spike: P.spike + 0.35 + 0.35 * s };
    case "dance":
      return { ...P, twist: P.twist + 120 * s, subdiv: Math.max(P.subdiv, 2) };
    case "squish":
      return { ...P, height: P.height * (1 + 0.3 * s), width: P.width * (1 - 0.2 * s) };
    case "wiggle":
      return { ...P, bend: P.bend + 70 * s, subdiv: Math.max(P.subdiv, 2) };
    case "slither":
      // 구불구불이 위로 흘러가는 것처럼 보이도록 개수는 두고 세기를 흔든다
      return { ...P, snake: Math.max(P.snake, 0.25) * (0.6 + 0.4 * Math.sin(t * 3)), snakeCount: P.snakeCount + 0.5 * Math.sin(t * 1.5), subdiv: Math.max(P.subdiv, 2) };
    case "blast":
      return { ...P, explode: P.explode + 0.35 + 0.35 * s };
    case "none":
      return P;
  }
}
