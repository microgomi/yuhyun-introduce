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
const sCrit = () => { beep(300, 0.06, "square", 0.13); setTimeout(() => beep(600, 0.1, "sawtooth", 0.12), 40); };
const sSwing = () => beep(480, 0.05, "triangle", 0.05);
const sKo = () => { [400, 300, 200, 120].forEach((f, i) => setTimeout(() => beep(f, 0.18, "square", 0.11), i * 120)); };
const sTurn = () => beep(660, 0.08, "triangle", 0.07);

const W = 360, H = 340, GROUND = 300;
const SHOULDER_Y = 190, HEAD_Y = 165, HEAD_R = 15, HIP_Y = 245, FOOT_Y = GROUND;
const SAVE = "bodyfighter_best";
const PX = 138, CX = 214; // 고정 위치 (턴제)

type Attack = { active: boolean; t: number; hitDone: boolean; kind: "punch" | "kick"; aim: number };
type Fighter = { x: number; hp: number; aim: number; atk: Attack; hurtT: number };
const mkFighter = (x: number): Fighter => ({ x, hp: 100, aim: -0.2, atk: { active: false, t: 0, hitDone: false, kind: "punch", aim: -0.2 }, hurtT: 0 });

function limbTip(f: Fighter, dir: number, kind: "punch" | "kick", ext: number) {
  const originY = kind === "punch" ? SHOULDER_Y : HIP_Y;
  const base = kind === "punch" ? 14 : 16;
  const reach = kind === "punch" ? 60 : 74;
  const aim = kind === "punch" ? f.atk.aim : f.atk.aim + 0.35;
  const len = base + reach * ext;
  return { x: f.x + dir * len * Math.cos(aim), y: originY + len * Math.sin(aim) };
}

export default function MotionFighter() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phP, setPhP] = useState(100);
  const [chP, setChP] = useState(100);
  const [phase, setPhase] = useState<"fight" | "ko">("fight");
  const [turn, setTurn] = useState<"p" | "c">("p");
  const [pWins, setPWins] = useState(0);
  const [cWins, setCWins] = useState(0);
  const [msg, setMsg] = useState("내 차례! 조준하고 공격!");

  const g = useRef({ p: mkFighter(PX), c: mkFighter(CX), turn: "p" as "p" | "c", cpuTimer: 0, over: false });
  const held = useRef({ aimUp: false, aimDown: false });
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const resetRound = useCallback((keepWins: boolean) => {
    g.current.p = mkFighter(PX); g.current.c = mkFighter(CX);
    g.current.turn = "p"; g.current.over = false; g.current.cpuTimer = 0;
    setPhP(100); setChP(100); setMsg("내 차례! 조준하고 공격!"); setPhase("fight"); setTurn("p");
    if (!keepWins) { setPWins(0); setCWins(0); }
  }, []);

  const doAttack = useCallback((kind: "punch" | "kick") => {
    const S = g.current;
    if (phaseRef.current !== "fight" || S.over || S.turn !== "p" || S.p.atk.active) return;
    const a = S.p.atk;
    a.active = true; a.t = 0; a.hitDone = false; a.kind = kind; a.aim = S.p.aim;
    sSwing();
  }, []);

  const checkHit = (tip: { x: number; y: number }, target: Fighter): "head" | "body" | null => {
    const dh = Math.hypot(tip.x - target.x, tip.y - HEAD_Y);
    if (dh < HEAD_R + 8) return "head";
    if (tip.x > target.x - 16 && tip.x < target.x + 16 && tip.y > HEAD_Y + 8 && tip.y < HIP_Y + 6) return "body";
    return null;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0, last = performance.now();

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const S = g.current;
      const p = S.p, c = S.c;

      if (phaseRef.current === "fight" && !S.over) {
        // 내 차례: 팔 조준
        if (S.turn === "p") {
          if (held.current.aimUp) p.aim = Math.max(-1.05, p.aim - 2.0 * dt);
          if (held.current.aimDown) p.aim = Math.min(0.5, p.aim + 2.0 * dt);
        }

        // 공격 진행 + 히트 → 끝나면 턴 넘김
        const advance = (f: Fighter, dir: number, target: Fighter, isPlayer: boolean): boolean => {
          const a = f.atk;
          if (!a.active) return false;
          a.t += dt / 0.32;
          const ext = Math.sin(Math.min(1, a.t) * Math.PI);
          if (!a.hitDone && a.t > 0.35 && a.t < 0.7) {
            const tip = limbTip(f, dir, a.kind, ext);
            const res = checkHit(tip, target);
            if (res) {
              a.hitDone = true;
              const baseDmg = a.kind === "kick" ? 15 : 9;
              const dmg = res === "head" ? Math.round(baseDmg * 1.8) : baseDmg;
              target.hp = Math.max(0, target.hp - dmg);
              target.hurtT = 0.3;
              if (res === "head") sCrit(); else sHit();
              setMsg(`${isPlayer ? "적" : "나"}에게 ${dmg} 피해!${res === "head" ? " 크리티컬! 💥" : ""}`);
            }
          }
          if (a.t >= 1) { a.active = false; a.t = 0; if (!a.hitDone) setMsg(`${isPlayer ? "나" : "적"}: 빗나감!`); return true; }
          return false;
        };
        const pDone = advance(p, 1, c, true);
        const cDone = advance(c, -1, p, false);

        if (p.hurtT > 0) p.hurtT -= dt;
        if (c.hurtT > 0) c.hurtT -= dt;

        // 턴 전환
        if (pDone && S.turn === "p" && !S.over && c.hp > 0) { S.turn = "c"; S.cpuTimer = 0.8; sTurn(); }
        if (cDone && S.turn === "c" && !S.over && p.hp > 0) { S.turn = "p"; sTurn(); setMsg("내 차례! 조준하고 공격!"); }

        // CPU 차례: 잠깐 생각 후 조준+공격
        if (S.turn === "c" && !c.atk.active && !S.over && c.hp > 0) {
          S.cpuTimer -= dt;
          if (S.cpuTimer <= 0) {
            const kind = Math.random() < 0.55 ? "punch" : "kick";
            c.aim = (Math.random() < 0.55 ? -0.35 : 0.05) + (Math.random() - 0.5) * 0.25; // 머리/몸통 조준
            c.atk.active = true; c.atk.t = 0; c.atk.hitDone = false; c.atk.kind = kind; c.atk.aim = c.aim;
            sSwing();
          }
        }

        // KO
        if (p.hp <= 0 || c.hp <= 0) {
          S.over = true;
          const pWin = c.hp <= 0;
          sKo(); setPhase("ko");
          setMsg(pWin ? "K.O.! 승리! 🎉" : "K.O.! 패배... 💀");
          if (pWin) setPWins((v) => v + 1); else setCWins((v) => v + 1);
        }
        setPhP(p.hp); setChP(c.hp);
        if (S.turn !== turnRef.current) { turnRef.current = S.turn; setTurn(S.turn); }
      }

      // 렌더
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#1e1b4b"); grad.addColorStop(1, "#0f172a");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#312e81"; ctx.fillRect(0, GROUND + 8, W, H - GROUND);
      // 차례 표시등
      ctx.fillStyle = S.turn === "p" ? "rgba(56,189,248,0.15)" : "rgba(251,113,133,0.15)";
      ctx.fillRect(S.turn === "p" ? 0 : W / 2, 0, W / 2, H);
      drawFighter(ctx, p, 1, "#38bdf8", true);
      drawFighter(ctx, c, -1, "#fb7185", false);
    };
    const turnRef = { current: "p" as "p" | "c" };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function drawFighter(ctx: CanvasRenderingContext2D, f: Fighter, dir: number, color: string, isPlayer: boolean) {
    const x = f.x;
    const hurt = f.hurtT > 0;
    ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.strokeStyle = hurt ? "#ef4444" : color; ctx.fillStyle = hurt ? "#ef4444" : color;

    // 조준선 (플레이어 차례에만)
    if (isPlayer && !f.atk.active && phaseRef.current === "fight" && g.current.turn === "p" && !g.current.over) {
      ctx.save(); ctx.strokeStyle = "rgba(250,204,21,0.6)"; ctx.setLineDash([5, 4]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, SHOULDER_Y);
      ctx.lineTo(x + dir * 78 * Math.cos(f.aim), SHOULDER_Y + 78 * Math.sin(f.aim)); ctx.stroke(); ctx.restore();
    }

    const kicking = f.atk.active && f.atk.kind === "kick";
    const kickExt = kicking ? Math.sin(Math.min(1, f.atk.t) * Math.PI) : 0;
    ctx.strokeStyle = hurt ? "#ef4444" : color;
    ctx.beginPath(); ctx.moveTo(x, HIP_Y); ctx.lineTo(x - dir * 12, FOOT_Y); ctx.stroke();
    if (kicking) {
      const foot = limbTip(f, dir, "kick", kickExt);
      ctx.beginPath(); ctx.moveTo(x, HIP_Y); ctx.lineTo(foot.x, foot.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(foot.x, foot.y, 5, 0, 7); ctx.fill();
    } else { ctx.beginPath(); ctx.moveTo(x, HIP_Y); ctx.lineTo(x + dir * 10, FOOT_Y); ctx.stroke(); }

    ctx.beginPath(); ctx.moveTo(x, HEAD_Y + HEAD_R); ctx.lineTo(x, HIP_Y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, SHOULDER_Y); ctx.lineTo(x - dir * 14, SHOULDER_Y + 18); ctx.stroke();

    const punching = f.atk.active && f.atk.kind === "punch";
    const punchExt = punching ? Math.sin(Math.min(1, f.atk.t) * Math.PI) : 0.12;
    const fist = limbTip(f, dir, "punch", punchExt);
    ctx.beginPath(); ctx.moveTo(x, SHOULDER_Y); ctx.lineTo(fist.x, fist.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(fist.x, fist.y, 6, 0, 7); ctx.fill();

    ctx.beginPath(); ctx.arc(x, HEAD_Y, HEAD_R, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + dir * 5, HEAD_Y - 2, 2.5, 0, 7); ctx.fill();
  }

  const setHold = (k: keyof typeof held.current, v: boolean) => { held.current[k] = v; };
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp": case "w": case "W": setHold("aimUp", true); break;
        case "ArrowDown": case "s": case "S": setHold("aimDown", true); break;
        case "j": case "J": case " ": e.preventDefault(); doAttack("punch"); break;
        case "k": case "K": doAttack("kick"); break;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (["ArrowUp", "w", "W"].includes(e.key)) setHold("aimUp", false);
      if (["ArrowDown", "s", "S"].includes(e.key)) setHold("aimDown", false);
    };
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, [doAttack]);

  const matchOver = pWins >= 3 || cWins >= 3;
  const myTurn = turn === "p" && phase === "fight";
  const holdBtn = (k: keyof typeof held.current, label: string) => (
    <button
      onMouseDown={() => setHold(k, true)} onMouseUp={() => setHold(k, false)} onMouseLeave={() => setHold(k, false)}
      onTouchStart={(e) => { e.preventDefault(); setHold(k, true); }} onTouchEnd={() => setHold(k, false)}
      disabled={!myTurn}
      className={`rounded-xl py-4 text-lg font-black active:scale-90 select-none ${myTurn ? "bg-indigo-700 active:bg-indigo-600" : "bg-slate-800 text-slate-500"}`}
    >{label}</button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950 text-white flex flex-col items-center px-3 py-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-2">
          <Link href="/" className="text-purple-300 text-sm">← 홈</Link>
          <h1 className="text-lg font-black">🥋 모션파이터 (턴제)</h1>
          <span className="text-xs text-amber-300">{"⭐".repeat(pWins)}:{"⭐".repeat(cWins)}</span>
        </div>

        {/* 차례 배너 */}
        <div className={`mb-2 rounded-lg py-1 text-center text-sm font-black ${myTurn ? "bg-sky-500/30 text-sky-200" : phase === "fight" ? "bg-red-500/30 text-red-200" : "bg-slate-700 text-slate-300"}`}>
          {phase === "ko" ? "라운드 종료" : myTurn ? "🔵 내 차례!" : "🔴 적 차례..."}
        </div>

        {/* HP */}
        <div className="flex items-center gap-2 mb-1 text-xs font-bold">
          <span className="text-sky-300 w-8">나</span>
          <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-sky-400 to-emerald-400" style={{ width: `${phP}%` }} /></div>
        </div>
        <div className="flex items-center gap-2 mb-2 text-xs font-bold">
          <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden flex justify-end"><div className="h-full bg-gradient-to-l from-red-400 to-orange-400" style={{ width: `${chP}%` }} /></div>
          <span className="text-red-300 w-8 text-right">적</span>
        </div>

        <div className="relative rounded-2xl overflow-hidden border-2 border-purple-700/60">
          <canvas ref={canvasRef} width={W} height={H} className="w-full bg-slate-900" />
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-sm font-black text-yellow-300 drop-shadow px-2 text-center">{msg}</div>
          {phase === "ko" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-center px-4">
              <div className="text-5xl">{chP <= 0 ? "🏆" : "💀"}</div>
              <h2 className={`text-2xl font-black ${chP <= 0 ? "text-yellow-300" : "text-red-400"}`}>{msg}</h2>
              {matchOver ? <p className="text-sm font-bold">{pWins >= 3 ? "🎉 매치 승리! 챔피언!" : "😢 매치 패배..."} ({pWins}:{cWins})</p>
                : <p className="text-xs text-gray-300">3선승제 · {pWins}:{cWins}</p>}
              <button onClick={() => resetRound(!matchOver)} className="mt-1 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-8 py-3 font-black active:scale-95">
                {matchOver ? "🔄 새 매치" : "다음 라운드 ⚔️"}
              </button>
            </div>
          )}
        </div>

        {/* 조작 */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {holdBtn("aimUp", "🔼 팔 위로")}
          {holdBtn("aimDown", "🔽 팔 아래로")}
          <button onClick={() => doAttack("punch")} disabled={!myTurn} className={`rounded-xl py-4 text-lg font-black active:scale-90 ${myTurn ? "bg-amber-600 active:bg-amber-500" : "bg-slate-800 text-slate-500"}`}>👊 펀치</button>
          <button onClick={() => doAttack("kick")} disabled={!myTurn} className={`rounded-xl py-4 text-lg font-black active:scale-90 ${myTurn ? "bg-orange-600 active:bg-orange-500" : "bg-slate-800 text-slate-500"}`}>🦵 킥</button>
        </div>
        <p className="text-center text-[11px] text-gray-300 mt-2">🔼🔽로 <b>팔 각도(노란 조준선)</b>를 맞춘 뒤 👊펀치/🦵킥! <b>머리 조준 = 크리티컬!</b> 공격하면 적 차례로 넘어가요.</p>
        <p className="text-center text-[10px] text-purple-300/80 mt-1">⌨️ ↑↓ 조준 · J 펀치 · K 킥</p>
      </div>
    </div>
  );
}
