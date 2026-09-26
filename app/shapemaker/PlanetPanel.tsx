import { useState } from "react";
import { BODIES, type BodyKey, type BodyState } from "./solarSystem";
import { gainMultiplier, levelOf, stageOf } from "./cosmic";

// ----------------------------------------------------------------------------
// 🪐 블랙홀에게 먹일 태양계 천체 고르기 창 (먹는 방법 설명 + 먹는 조건)
// ----------------------------------------------------------------------------

const STATE_LABEL: Record<BodyState, string> = {
  orbit: "도는 중",
  falling: "끌려가는 중…",
  tearing: "스파게티화 중! 🍝",
  eaten: "먹힘 🕳️",
};

const STEPS = [
  ["🧲", "끌려오기", "궤도에서 떨어져 나와 블랙홀 둘레를 빙글빙글 돌며 다가가요. 가까워질수록 길쭉해져요."],
  ["🔴", "로슈 한계", "블랙홀 둘레의 빨간 고리예요. 이걸 넘으면 가까운 쪽과 먼 쪽을 당기는 힘의 차이(조석력)가 너무 커져요."],
  ["🍝", "스파게티화", "천체가 수천 조각으로 찢어져요. 안쪽 조각이 더 빨리 돌아서 국수 가닥처럼 길게 늘어나요."],
  ["🕳️", "꿀꺽", "조각들이 사건의 지평선에 닿으면 사라져요. 마지막 조각까지 들어가면 블랙홀이 번쩍! 빛나요."],
] as const;

export interface SolarView {
  states: Record<BodyKey, BodyState>;
  canEat: boolean;
  holeSize: number; // 지금 블랙홀 크기 배율
}

export function PlanetPanel(props: {
  solar: SolarView | null;
  onFeed: (key: BodyKey) => void;
  onFeedAll: () => void;
  onRestore: () => void;
  onClose: () => void;
}) {
  const [showHow, setShowHow] = useState(false);
  const solar = props.solar;
  const size = solar?.holeSize ?? 0;
  const level = levelOf(Math.max(size, 1));
  const stage = stageOf(level);
  const bonus = gainMultiplier(level);
  const left = solar ? BODIES.filter((b) => solar.states[b.key] === "orbit").length : BODIES.length;
  return (
    <div className="absolute left-4 top-44 z-20 max-h-[calc(100%-13rem)] w-80 overflow-y-auto rounded-2xl border border-indigo-300/30 bg-[#10163a]/90 p-3 text-sm shadow-xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <b className="text-base">
          🪐 {stage.emoji} {stage.name}에게 먹이기
        </b>
        <button onClick={props.onClose} className="rounded-full bg-white/10 px-2 hover:bg-white/20" aria-label="닫기">
          ✕
        </button>
      </div>

      <button onClick={() => setShowHow(!showHow)} className="mb-2 w-full rounded-lg bg-indigo-500/30 py-1.5 text-xs font-bold hover:bg-indigo-500/50">
        {showHow ? "▲ 설명 접기" : "❓ 블랙홀은 어떻게 먹을까? (먹는 방법·조건)"}
      </button>
      {showHow && (
        <div className="mb-2 space-y-1.5 rounded-xl bg-black/30 p-2 text-xs leading-relaxed">
          {STEPS.map(([emoji, title, desc], i) => (
            <div key={title}>
              <b>
                {i + 1}. {emoji} {title}
              </b>
              <div className="text-white/70">{desc}</div>
            </div>
          ))}
          <div className="border-t border-white/10 pt-1.5">
            <b>📏 먹는 조건</b>
            <div className="text-white/70">
              블랙홀이 그 천체를 찢을 만큼 커야 해요. 행성은 16~30배, 태양은 36배, 초거대질량 블랙홀은 250배, 중성자별은 무려 1000배가 필요해요! 크기 슬라이더는 손으로 50배까지! 천체를 먹을 때마다 커지고, 레벨이 높을수록 더 많이 자라요. 먼지구름 → 별 → 초신성 → 마그네타 → 블랙홀(50,000배까지) → 은하수로 변신하고, 은하수가 되어 질량 1,000,000배가 되면 안드로메다 은하도 먹을 수 있어요! 태양계를 되살려서 또 먹으면 계속 자라요.
            </div>
          </div>
        </div>
      )}

      {!solar?.canEat && (
        <p className="mb-2 rounded-lg bg-amber-500/20 p-2 text-xs text-amber-200">
          블랙홀이 있어야 먹일 수 있어요! 「➕ 새 도형 추가」로 도형을 여러 개 세우고 허리케인·블랙홀을 켜 보세요.
        </p>
      )}
      {solar?.canEat && (
        <div className="mb-2 rounded-lg bg-orange-500/15 p-2 text-xs">
          {stage.emoji} 지금 크기(질량): <b className="text-orange-300">{size.toLocaleString(undefined, { maximumFractionDigits: 1 })}배</b> · Lv.{level} {stage.name}
          <div className="text-[11px] text-orange-200">레벨 보너스: 먹으면 ×{bonus.toLocaleString(undefined, { maximumFractionDigits: 1 })}배 더 자라요!</div>
          {size < 16 && <div className="mt-0.5 text-rose-200">아직 너무 작아요! 블랙홀 크기 슬라이더를 16배 이상으로 올려 보세요.</div>}
        </div>
      )}

      <ul className="space-y-1.5">
        {BODIES.map((b) => {
          const state = solar?.states[b.key] ?? "orbit";
          const bigEnough = size >= b.need;
          const ready = !!solar?.canEat && state === "orbit" && bigEnough;
          return (
            <li key={b.key} className={`flex items-center gap-2 rounded-xl p-2 ${state === "eaten" ? "bg-black/30 opacity-50" : "bg-white/5"}`}>
              <span className="text-2xl">{b.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold">
                  {b.name} <span className="text-[11px] font-normal text-white/50">{STATE_LABEL[state]}</span>
                </div>
                <div className="text-[11px] leading-snug text-white/60">{b.fact}</div>
                <div className={`text-[11px] ${bigEnough ? "text-green-300" : "text-rose-300"}`}>
                  📏 필요: {b.need.toLocaleString()}배 이상 {state === "orbit" && (bigEnough ? "✅" : `(지금 ${size.toFixed(1)}배 — 더 커야 해요)`)}
                  <span className="text-orange-200"> · 먹으면 +{Math.round(b.grow * bonus).toLocaleString()}배</span>
                </div>
              </div>
              <button
                onClick={() => props.onFeed(b.key)}
                disabled={!ready}
                className="shrink-0 rounded-lg bg-orange-500 px-2 py-1 text-xs font-bold enabled:hover:bg-orange-400 disabled:opacity-30"
              >
                먹이기
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <button
          onClick={props.onFeedAll}
          disabled={!solar?.canEat || left === 0}
          className="rounded-lg bg-rose-500 py-2 text-xs font-bold enabled:hover:bg-rose-400 disabled:opacity-30"
        >
          🍽️ 먹을 수 있는 것 다 먹이기
        </button>
        <button onClick={props.onRestore} className="rounded-lg bg-white/10 py-2 text-xs hover:bg-white/20">
          ♻️ 태양계 되살리기
        </button>
      </div>
      <p className="mt-2 text-[11px] text-white/50">💡 다 먹었으면 ♻️ 되살리기로 태양계를 다시 만들어 또 먹어 보세요. 크기는 그대로라 점점 더 커져요!</p>
    </div>
  );
}
