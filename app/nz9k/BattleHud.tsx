import { WEAPONS, weaponOf, type SaveRecord, type WeaponKey } from "./battleData";
import type { HudState } from "./battleEngine";

// ----------------------------------------------------------------------------
// 화면 위에 겹쳐 보이는 상태창 (체력·허기·호흡·기력·무기 등)
// ----------------------------------------------------------------------------

function Bar({ icon, label, value, max, color, warn }: { icon: string; label: string; value: number; max: number; color: string; warn?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`w-52 ${warn ? "animate-pulse" : ""}`}>
      <div className="flex justify-between text-[11px] text-white/80">
        <span>
          {icon} {label}
        </span>
        <b className="tabular-nums">
          {Math.round(value)}/{Math.round(max)}
        </b>
      </div>
      <div className="h-3 overflow-hidden rounded-full border border-black/40 bg-black/50">
        <div className="h-full transition-[width] duration-150" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function BattleHud({ s, logs, record }: { s: HudState; logs: { id: number; text: string; kind: string }[]; record: SaveRecord }) {
  return (
    <>
      {/* 왼쪽 위: 상태 막대 */}
      <div className="pointer-events-none absolute left-4 top-4 space-y-1.5">
        <Bar icon="❤️" label="체력" value={s.hp} max={s.maxHp} color="linear-gradient(90deg,#ff5f6d,#ff9966)" warn={s.hp < s.maxHp * 0.25} />
        <Bar icon="🍗" label="허기" value={s.hunger} max={100} color="linear-gradient(90deg,#f59e0b,#fbbf24)" warn={s.hunger < 20} />
        <Bar icon="🫁" label="호흡" value={s.breath} max={100} color="linear-gradient(90deg,#38bdf8,#67e8f9)" warn={s.underwater && s.breath < 40} />
        <Bar icon="⚡" label="기력" value={s.stamina} max={100} color="linear-gradient(90deg,#a3e635,#4ade80)" />
        <div className="flex w-52 justify-between rounded-lg bg-black/45 px-2 py-1 text-[11px]">
          <span>🛡️ 방어 {s.defense}</span>
          <span>⚔️ 공격 {Math.round(s.attack)}</span>
          <span>🏹 {s.arrows}</span>
        </div>
        <div className="w-52 rounded-lg bg-black/45 px-2 py-1 text-[11px]">
          <div className="flex justify-between">
            <b className="text-yellow-300">Lv.{s.level}</b>
            <span className="text-white/70">
              {Math.round(s.xp)}/{s.xpNeed} XP
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full bg-yellow-400" style={{ width: `${(s.xp / s.xpNeed) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* 오른쪽 위: 웨이브·기록 */}
      <div className="pointer-events-none absolute right-4 top-4 w-44 space-y-1 text-right">
        <div className="rounded-xl bg-black/50 px-3 py-2">
          <div className="text-lg font-extrabold text-rose-300">웨이브 {s.wave}</div>
          {s.restSeconds > 0 ? (
            <div className="text-sm text-cyan-200">다음까지 {s.restSeconds}초</div>
          ) : (
            <div className="text-sm">남은 적 {s.enemiesLeft}</div>
          )}
          <div className="text-[11px] text-white/60">
            처치 {s.kills} · {Math.floor(s.timeSec / 60)}분 {s.timeSec % 60}초
          </div>
        </div>
        <div className="rounded-xl bg-black/35 px-3 py-1.5 text-[11px] text-white/70">
          최고 기록: 웨이브 {record.bestWave} · 처치 {record.bestKills}
        </div>
      </div>

      {/* 보스 체력 */}
      {s.bossHp !== null && s.bossMaxHp ? (
        <div className="pointer-events-none absolute left-1/2 top-4 w-96 -translate-x-1/2 text-center">
          <div className="text-sm font-bold text-rose-300">🗿 바위 골렘</div>
          <div className="h-4 overflow-hidden rounded-full border-2 border-rose-500/60 bg-black/60">
            <div className="h-full bg-gradient-to-r from-rose-600 to-orange-400" style={{ width: `${(s.bossHp / s.bossMaxHp) * 100}%` }} />
          </div>
        </div>
      ) : null}

      {/* 가운데 조준점 */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg opacity-70">✛</div>

      {/* 물속 경고 */}
      {s.underwater && (
        <div className="pointer-events-none absolute inset-0 border-[14px] border-cyan-400/20">
          <div className="absolute left-1/2 top-24 -translate-x-1/2 rounded-full bg-cyan-500/30 px-4 py-1 text-sm font-bold">
            🫧 물속! 숨을 참고 있어요 ({Math.round(s.breath)})
          </div>
        </div>
      )}
      {s.hp < s.maxHp * 0.25 && <div className="pointer-events-none absolute inset-0 border-[16px] border-rose-600/25" />}

      {/* 아래: 무기 칸 */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {WEAPONS.map((w, i) => {
          const owned = s.unlocked.includes(w.key as WeaponKey);
          const active = s.weapon === w.key;
          return (
            <div
              key={w.key}
              className={`w-24 rounded-xl border px-2 py-1 text-center text-[11px] ${
                active ? "border-yellow-400 bg-yellow-400/25" : owned ? "border-white/25 bg-black/45" : "border-white/10 bg-black/60 opacity-40"
              }`}
            >
              <div className="text-xl">{w.emoji}</div>
              <div className="font-bold">{w.name}</div>
              <div className="text-white/60">{owned ? `${i + 1}번` : `Lv.${w.unlockLevel}`}</div>
            </div>
          );
        })}
      </div>

      {/* 왼쪽 아래: 알림 */}
      <div className="pointer-events-none absolute bottom-4 left-4 w-72 space-y-1">
        {logs.map((l) => (
          <div
            key={l.id}
            className={`rounded-lg px-2 py-1 text-xs ${
              l.kind === "good" ? "bg-emerald-500/30" : l.kind === "bad" ? "bg-rose-500/30" : "bg-black/50"
            }`}
          >
            {l.text}
          </div>
        ))}
      </div>

      {/* 오른쪽 아래: 지금 무기 설명 */}
      <div className="pointer-events-none absolute bottom-4 right-4 w-56 rounded-xl bg-black/45 px-3 py-2 text-[11px]">
        <b>
          {weaponOf(s.weapon).emoji} {weaponOf(s.weapon).name}
        </b>
        <div className="text-white/70">{weaponOf(s.weapon).desc}</div>
        {s.blocking && <div className="mt-1 text-cyan-200">🛡️ 막는 중 (피해 75% 감소)</div>}
      </div>
    </>
  );
}
