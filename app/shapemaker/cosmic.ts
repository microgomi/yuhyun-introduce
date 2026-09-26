// ----------------------------------------------------------------------------
// 먹보 천체의 레벨과 모습
//  크기(질량) 1배 = Lv.1, 50,000배 = Lv.18(은하수 시작)이 되도록 레벨마다 같은 비율로 커진다.
//  Lv.1~4 먼지구름 · Lv.5~9 별 · Lv.10~11 초신성 · Lv.12~14 마그네타 · Lv.15~17 블랙홀 · Lv.18~20 은하수
// ----------------------------------------------------------------------------

export type StageKey = "dust" | "star" | "supernova" | "magnetar" | "blackhole" | "galaxy";

export interface Stage {
  key: StageKey;
  name: string;
  emoji: string;
  from: number; // 이 레벨부터
  to: number; // 이 레벨까지
  desc: string;
}

export const STAGES: Stage[] = [
  { key: "dust", name: "먼지구름", emoji: "🌫️", from: 1, to: 4, desc: "우주를 떠도는 가스와 먼지가 뭉치기 시작했어요." },
  { key: "star", name: "별", emoji: "⭐", from: 5, to: 9, desc: "먼지가 뭉쳐 불이 붙었어요! 스스로 빛나는 별이 됐어요." },
  { key: "supernova", name: "초신성", emoji: "💥", from: 10, to: 11, desc: "너무 무거워진 별이 쾅! 우주에서 가장 밝은 폭발이에요." },
  { key: "magnetar", name: "마그네타", emoji: "🧲", from: 12, to: 14, desc: "폭발하고 남은 심장. 지구 자석보다 1000조 배 센 자석 별이에요." },
  { key: "blackhole", name: "블랙홀", emoji: "🕳️", from: 15, to: 17, desc: "빛조차 빠져나올 수 없는 우주의 구멍! (질량 50,000배까지)" },
  { key: "galaxy", name: "은하수", emoji: "🌌", from: 18, to: 20, desc: "별 수천억 개가 모인 은하가 됐어요! 이제 안드로메다도 노려 볼까요?" },
];

export const MAX_LEVEL = 20;
const LEVEL18_MASS = 50_000;
export const LEVEL_RATIO = Math.pow(LEVEL18_MASS, 1 / 17); // 레벨이 하나 오를 때 필요한 크기 배율 (약 1.89배)

export function levelOf(mass: number): number {
  if (mass <= 1) return 1;
  return Math.min(MAX_LEVEL, 1 + Math.floor(Math.log(mass) / Math.log(LEVEL_RATIO) + 1e-9));
}

// 그 레벨이 시작되는 크기
export function levelMass(level: number): number {
  return Math.pow(LEVEL_RATIO, level - 1);
}

export function stageOf(level: number): Stage {
  return STAGES.find((s) => level >= s.from && level <= s.to) ?? STAGES[STAGES.length - 1];
}

// 레벨이 높을수록 먹었을 때 더 크게 자란다 (Lv.1 = 1배, 레벨마다 1.3배).
// 50배에서 시작하면 첫 바퀴에 블랙홀, 둘째 바퀴에 은하수, 여섯째 바퀴쯤 안드로메다를 먹도록 맞춘 값
export function gainMultiplier(level: number): number {
  return Math.pow(1.3, level - 1);
}
