import type { BlackHoleStats } from "./cosmicEater";
import { levelMass, MAX_LEVEL, STAGES } from "./cosmic";

// ----------------------------------------------------------------------------
// 블랙홀 통계 카드 (게임 속 재미 단위: 월드 1 = 1,000 km)
// ----------------------------------------------------------------------------

const n0 = (v: number) => Math.round(v).toLocaleString();
const n1 = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 1 });

function distance(km: number) {
  if (km < 1) return `${n0(km * 1000)} m`;
  return `${n1(km)} km`;
}

function temperature(k: number) {
  if (k >= 1e8) return `${n1(k / 1e8)}억 K`;
  if (k >= 1e4) return `${n0(k / 1e4)}만 K`;
  return `${n0(k)} K`;
}

function age(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

export function BlackHoleCard({ stats }: { stats: BlackHoleStats }) {
  const stage = STAGES.find((s) => s.key === stats.stage) ?? STAGES[0];
  const nextMass = stats.level < MAX_LEVEL ? levelMass(stats.level + 1) : null;
  const rows: [string, string, string][] = [
    ["🏅", "레벨", `Lv.${stats.level} ${stage.name}`],
    ["⏫", "다음 레벨", nextMass ? `질량 ${n0(nextMass)}배부터` : "최고 레벨!"],
    ["🕳️", "크기 (핵 반지름)", distance(stats.horizonKm)],
    ["⚖️", "질량", `태양의 ${n1(stats.solarMasses)}배`],
    ["💡", "밝기", `${n0(stats.brightness)}%`],
    ["🌡️", "원반 온도", temperature(stats.temperatureK)],
    ["🌀", "원반 회전", `1분에 ${n0(stats.diskRpm)}바퀴`],
    ["🚀", "가장 빠른 먼지", `빛의 속도의 ${n1(stats.fastestPctC)}%`],
    ["🍽️", "삼킨 먼지", `${n0(stats.swallowed)}개`],
    ["⚡", "먹는 속도", `1초에 ${n0(stats.perSecond)}개`],
    ["🔥", "지평선 근처 먼지", `${n0(stats.nearDust)}개`],
    ["⏱️", "나이", age(stats.ageSec)],
    ["🪐", "먹은 천체", stats.eatenPlanets.length ? `${stats.eatenPlanets.length}개` : "아직 없음"],
  ];
  return (
    <div className="pointer-events-none w-64 rounded-2xl border border-orange-400/40 bg-black/55 p-3 text-xs backdrop-blur">
      <div className="mb-2 text-sm font-extrabold text-orange-300">
        {stage.emoji} {stage.name} 통계
      </div>
      <p className="mb-2 text-[11px] text-white/60">{stage.desc}</p>
      <ul className="space-y-1">
        {rows.map(([emoji, label, value]) => (
          <li key={label} className="flex justify-between gap-2">
            <span className="text-white/70">
              {emoji} {label}
            </span>
            <b className="tabular-nums text-white">{value}</b>
          </li>
        ))}
      </ul>
      {stats.eatenPlanets.length > 0 && <p className="mt-1 text-[11px] text-orange-200">냠냠: {stats.eatenPlanets.join(", ")}</p>}
      <p className="mt-2 text-[10px] text-white/40">* 게임 속 재미 단위예요 (진짜 우주와는 달라요)</p>
    </div>
  );
}
