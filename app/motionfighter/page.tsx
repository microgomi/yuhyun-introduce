"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

// ───── 효과음 ─────
let ac: AudioContext | null = null;
function beep(freq: number, dur: number, type: OscillatorType = "square", vol = 0.09) {
  try {
    if (!ac) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return; ac = new AC();
    }
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch { /* ignore */ }
}
const sHit = () => { beep(180, 0.07, "sawtooth", 0.12); beep(90, 0.1, "square", 0.1); };
const sSwing = () => beep(520, 0.05, "triangle", 0.06);
const sBlock = () => beep(700, 0.06, "square", 0.08);
const sSpecial = () => { [300, 500, 800, 1100].forEach((f, i) => setTimeout(() => beep(f, 0.12, "sawtooth", 0.1), i * 60)); };
const sKo = () => { [400, 300, 200, 120].forEach((f, i) => setTimeout(() => beep(f, 0.18, "square", 0.11), i * 120)); };

// ───── 공격 정의 (모션마다 다름) ─────
type AttKind = "punch" | "kick" | "special";
const ATT: Record<AttKind, { range: number; dmg: number; cd: number; energy: number; motion: string; fx: string; mt: number; cost?: number }> = {
  punch: { range: 20, dmg: 7, cd: 5, energy: 13, motion: "punch", fx: "👊", mt: 4 },
  kick: { range: 26, dmg: 13, cd: 10, energy: 20, motion: "kick", fx: "🦵", mt: 6 },
  special: { range: 60, dmg: 28, cd: 16, energy: 0, motion: "special", fx: "🔥", mt: 9, cost: 100 },
};

type Fx = { id: number; x: number; emoji: string; life: number };
type G = {
  phase: "fight" | "ko";
  px: number; cx: number;
  phP: number; chP: number;
  pEnergy: number; cEnergy: number;
  pMotion: string; pMotionT: number; pCd: number;
  cMotion: string; cMotionT: number; cCd: number;
  cTick: number; fx: Fx[]; fxId: number;
  pWins: number; cWins: number; winner: "p" | "c" | null; msg: string;
};

const initG = (pWins = 0, cWins = 0): G => ({
  phase: "fight", px: 25, cx: 75, phP: 100, chP: 100, pEnergy: 0, cEnergy: 0,
  pMotion: "idle", pMotionT: 0, pCd: 0, cMotion: "idle", cMotionT: 0, cCd: 0,
  cTick: 0, fx: [], fxId: 0, pWins, cWins, winner: null, msg: "FIGHT!",
});

function motionStyle(motion: string, dir: number): { transform: string; filter: string } {
  const base = dir < 0 ? "scaleX(-1) " : "";
  switch (motion) {
    case "punch": return { transform: base + "translateX(10px) rotate(-6deg)", filter: "none" };
    case "kick": return { transform: base + "translateX(8px) rotate(-14deg)", filter: "none" };
    case "special": return { transform: base + "scale(1.2)", filter: "drop-shadow(0 0 10px #ff8c00) brightness(1.3)" };
    case "block": return { transform: base + "translateX(-5px) scale(0.95)", filter: "brightness(0.85)" };
    case "hit": return { transform: base + "translateX(-10px) rotate(12deg)", filter: "brightness(1.8) sepia(1) hue-rotate(-40deg) saturate(4)" };
    case "walk": return { transform: base + "translateY(-3px)", filter: "none" };
    default: return { transform: base, filter: "none" };
  }
}

export default function MotionFighter() {
  const [g, setG] = useState<G>(initG());
  const gRef = useRef(g);
  useEffect(() => { gRef.current = g; }, [g]);

  const ko = (n: G, winner: "p" | "c"): G => {
    sKo();
    return { ...n, phase: "ko", winner, pWins: n.pWins + (winner === "p" ? 1 : 0), cWins: n.cWins + (winner === "c" ? 1 : 0), msg: winner === "p" ? "K.O.! 승리! 🎉" : "K.O.! 패배... 💀" };
  };

  // ───── 플레이어 공격 ─────
  const attack = useCallback((kind: AttKind) => {
    setG((prev) => {
      if (prev.phase !== "fight" || prev.pCd > 0 || prev.pMotion === "hit") return prev;
      const a = ATT[kind];
      if (kind === "special" && prev.pEnergy < 100) return prev;
      const n: G = { ...prev, pMotion: a.motion, pMotionT: a.mt, pCd: a.cd, fx: [...prev.fx] };
      if (kind === "special") { n.pEnergy = 0; sSpecial(); } else sSwing();
      const dist = n.cx - n.px;
      if (dist <= a.range) {
        const blocking = n.cMotion === "block";
        const dmg = blocking ? Math.ceil(a.dmg * 0.25) : a.dmg;
        n.chP = Math.max(0, n.chP - dmg);
        n.pEnergy = Math.min(100, n.pEnergy + a.energy);
        if (blocking) { sBlock(); n.cMotionT = Math.max(n.cMotionT, 3); }
        else { sHit(); n.cMotion = "hit"; n.cMotionT = 6; n.cx = Math.min(92, n.cx + 6); }
        n.fx.push({ id: n.fxId++, x: n.cx, emoji: blocking ? "🛡️" : a.fx, life: 7 });
        n.msg = blocking ? "막혔다!" : `${dmg} 피해!`;
        if (n.chP <= 0) return ko(n, "p");
      } else {
        n.msg = "빗나감!";
      }
      return n;
    });
  }, []);

  const block = useCallback(() => {
    setG((prev) => (prev.phase !== "fight" || prev.pCd > 0 || prev.pMotion === "hit") ? prev : { ...prev, pMotion: "block", pMotionT: 6 });
  }, []);

  const move = useCallback((dir: number) => {
    setG((prev) => {
      if (prev.phase !== "fight" || prev.pMotion === "hit") return prev;
      const px = Math.max(8, Math.min(prev.cx - 10, prev.px + dir * 6));
      return { ...prev, px, pMotion: prev.pMotionT > 0 ? prev.pMotion : "walk", pMotionT: Math.max(prev.pMotionT, 2) };
    });
  }, []);

  // ───── 키보드 조작 ─────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat && !["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(e.key)) return;
      switch (e.key) {
        case "ArrowLeft": case "a": case "A": move(-1); break;
        case "ArrowRight": case "d": case "D": move(1); break;
        case "j": case "J": case "z": case "Z": attack("punch"); break;
        case "k": case "K": case "x": case "X": attack("kick"); break;
        case "l": case "L": case "c": case "C": attack("special"); break;
        case "ArrowDown": case "s": case "S": case "Shift": case " ": e.preventDefault(); block(); break;
        default: return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, attack, block]);

  // ───── 게임 루프 (CPU AI + 타이머) ─────
  useEffect(() => {
    const iv = setInterval(() => {
      setG((prev) => {
        if (prev.phase !== "fight") {
          // fx만 정리
          if (prev.fx.length === 0) return prev;
          return { ...prev, fx: prev.fx.map((f) => ({ ...f, life: f.life - 1 })).filter((f) => f.life > 0) };
        }
        const n: G = { ...prev, fx: prev.fx.map((f) => ({ ...f, life: f.life - 1 })).filter((f) => f.life > 0) };
        n.cTick++;
        if (n.pMotionT > 0) n.pMotionT--; else if (n.pMotion !== "idle") n.pMotion = "idle";
        if (n.cMotionT > 0) n.cMotionT--; else if (n.cMotion !== "idle") n.cMotion = "idle";
        if (n.pCd > 0) n.pCd--;
        if (n.cCd > 0) n.cCd--;
        n.pEnergy = Math.min(100, n.pEnergy + 0.5);
        n.cEnergy = Math.min(100, n.cEnergy + 0.6);

        // CPU AI
        if (n.cMotion !== "hit" && n.cCd <= 0 && n.cTick % 2 === 0) {
          const dist = n.cx - n.px;
          if (dist > 27) {
            n.cx = Math.max(n.px + 10, n.cx - 4.5);
            if (n.cMotionT <= 0) { n.cMotion = "walk"; n.cMotionT = 2; }
          } else {
            const r = Math.random();
            if (n.cEnergy >= 100 && r < 0.35) {
              // CPU 필살기
              const a = ATT.special; n.cMotion = a.motion; n.cMotionT = a.mt; n.cCd = a.cd; n.cEnergy = 0; sSpecial();
              const blocking = n.pMotion === "block";
              const dmg = blocking ? Math.ceil(a.dmg * 0.25) : a.dmg;
              n.phP = Math.max(0, n.phP - dmg);
              if (blocking) { sBlock(); } else { sHit(); n.pMotion = "hit"; n.pMotionT = 6; n.px = Math.max(8, n.px - 6); }
              n.fx.push({ id: n.fxId++, x: n.px, emoji: blocking ? "🛡️" : a.fx, life: 7 });
              if (n.phP <= 0) return ko(n, "c");
            } else if (r < 0.55) {
              const kind: AttKind = Math.random() < 0.6 ? "punch" : "kick"; const a = ATT[kind];
              n.cMotion = a.motion; n.cMotionT = a.mt; n.cCd = a.cd; sSwing();
              if (dist <= a.range) {
                const blocking = n.pMotion === "block";
                const dmg = blocking ? Math.ceil(a.dmg * 0.25) : a.dmg;
                n.phP = Math.max(0, n.phP - dmg);
                n.cEnergy = Math.min(100, n.cEnergy + a.energy);
                if (blocking) { sBlock(); } else { sHit(); n.pMotion = "hit"; n.pMotionT = 6; n.px = Math.max(8, n.px - 6); }
                n.fx.push({ id: n.fxId++, x: n.px, emoji: blocking ? "🛡️" : a.fx, life: 7 });
                n.msg = blocking ? "방어!" : `-${dmg}`;
                if (n.phP <= 0) return ko(n, "c");
              }
            } else if (r < 0.72) {
              n.cMotion = "block"; n.cMotionT = 5; n.cCd = 4;
            } else {
              n.cx = Math.min(92, n.cx + 3);
            }
          }
        }
        return n;
      });
    }, 70);
    return () => clearInterval(iv);
  }, []);

  const matchOver = g.pWins >= 2 || g.cWins >= 2;
  const nextRound = () => setG(matchOver ? initG() : initG(g.pWins, g.cWins));

  const pS = motionStyle(g.pMotion, 1);
  const cS = motionStyle(g.cMotion, -1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950 text-white flex flex-col items-center px-3 py-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-2">
          <Link href="/" className="text-purple-300 text-sm">← 홈</Link>
          <h1 className="text-xl font-black">🥋 모션파이터</h1>
          <span className="text-xs text-amber-300">{"⭐".repeat(g.pWins)} vs {"⭐".repeat(g.cWins)}</span>
        </div>

        {/* HP 바 */}
        <div className="flex items-center gap-2 mb-1 text-xs font-bold">
          <span className="text-sky-300">🥷 나</span>
          <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-100" style={{ width: `${g.phP}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2 mb-1 text-xs font-bold">
          <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden flex justify-end">
            <div className="h-full bg-gradient-to-l from-red-400 to-orange-400 transition-all duration-100" style={{ width: `${g.chP}%` }} />
          </div>
          <span className="text-red-300">👹 적</span>
        </div>
        {/* 필살기 게이지 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-orange-300 font-bold">⚡필살기</span>
          <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className={`h-full transition-all ${g.pEnergy >= 100 ? "bg-yellow-300 animate-pulse" : "bg-orange-500"}`} style={{ width: `${g.pEnergy}%` }} />
          </div>
        </div>

        {/* 스테이지 */}
        <div className="relative h-56 rounded-2xl overflow-hidden border-2 border-purple-700/60 bg-gradient-to-b from-slate-800 to-slate-950">
          <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-purple-900/60 to-transparent" />
          {/* 메시지 */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-sm font-black text-yellow-300 drop-shadow">{g.msg}</div>
          {/* 플레이어 */}
          <div className="absolute bottom-4 text-5xl transition-all duration-100" style={{ left: `${g.px}%`, transform: `translateX(-50%)` }}>
            <span style={{ display: "inline-block", transform: pS.transform, filter: pS.filter, transition: "transform 80ms, filter 80ms" }}>🥷</span>
          </div>
          {/* 적 */}
          <div className="absolute bottom-4 text-5xl transition-all duration-100" style={{ left: `${g.cx}%`, transform: `translateX(-50%)` }}>
            <span style={{ display: "inline-block", transform: cS.transform, filter: cS.filter, transition: "transform 80ms, filter 80ms" }}>👹</span>
          </div>
          {/* 이펙트 */}
          {g.fx.map((f) => (
            <span key={f.id} className="absolute bottom-16 text-2xl animate-ping" style={{ left: `${f.x}%`, transform: "translateX(-50%)", opacity: f.life / 7 }}>{f.emoji}</span>
          ))}

          {/* KO 오버레이 */}
          {g.phase === "ko" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-center px-4">
              <div className="text-5xl">{g.winner === "p" ? "🏆" : "💀"}</div>
              <h2 className={`text-2xl font-black ${g.winner === "p" ? "text-yellow-300" : "text-red-400"}`}>{g.msg}</h2>
              {matchOver ? (
                <p className="text-sm font-bold">{g.pWins >= 2 ? "🎉 매치 승리! 최종 챔피언!" : "😢 매치 패배..."} ({g.pWins}:{g.cWins})</p>
              ) : (
                <p className="text-xs text-gray-300">라운드 스코어 {g.pWins} : {g.cWins} (2선승제)</p>
              )}
              <button onClick={nextRound} className="mt-1 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-8 py-3 font-black shadow-lg active:scale-95">
                {matchOver ? "🔄 새 매치" : "다음 라운드 ⚔️"}
              </button>
            </div>
          )}
        </div>

        {/* 조작 버튼 */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button onMouseDown={() => move(-1)} onTouchStart={() => move(-1)} className="rounded-xl bg-slate-700 py-4 text-xl font-black active:scale-90 active:bg-slate-600">◀</button>
            <button onMouseDown={() => move(1)} onTouchStart={() => move(1)} className="rounded-xl bg-slate-700 py-4 text-xl font-black active:scale-90 active:bg-slate-600">▶</button>
          </div>
          <button onMouseDown={block} onTouchStart={block} className="rounded-xl bg-sky-700 py-4 text-lg font-black active:scale-90 active:bg-sky-600">🛡️ 방어</button>
          <button onMouseDown={() => attack("punch")} onTouchStart={() => attack("punch")} className="rounded-xl bg-amber-600 py-4 text-lg font-black active:scale-90 active:bg-amber-500">👊 펀치</button>
          <button onMouseDown={() => attack("kick")} onTouchStart={() => attack("kick")} className="rounded-xl bg-orange-600 py-4 text-lg font-black active:scale-90 active:bg-orange-500">🦵 킥</button>
          <button onMouseDown={() => attack("special")} onTouchStart={() => attack("special")} disabled={g.pEnergy < 100}
            className={`col-span-2 rounded-xl py-4 text-lg font-black active:scale-90 ${g.pEnergy >= 100 ? "bg-gradient-to-r from-red-500 to-yellow-500 animate-pulse" : "bg-slate-800 text-slate-500"}`}>
            🔥 필살기! {g.pEnergy < 100 ? `(${Math.floor(g.pEnergy)}%)` : "발동 가능!"}
          </button>
        </div>
        <p className="text-center text-[11px] text-gray-400 mt-2">◀▶ 이동 · 👊펀치(빠름) · 🦵킥(강함) · 🛡️방어 · 🔥필살기(게이지 꽉차면)</p>
        <p className="text-center text-[10px] text-purple-300/80 mt-1">⌨️ 키보드: ←→(이동) · J/Z(펀치) · K/X(킥) · L/C(필살기) · ↓/Space(방어)</p>
      </div>
    </div>
  );
}
