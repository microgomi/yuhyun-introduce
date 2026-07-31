"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

let ac: AudioContext | null = null;
function beep(freq: number, dur: number, type: OscillatorType = "square", vol = 0.06) {
  try {
    if (!ac) { const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AC) return; ac = new AC(); }
    if (ac.state === "suspended") ac.resume();
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch { /* ignore */ }
}
const sCoin = () => beep(1200, 0.06, "triangle", 0.06);
const sDie = () => { [300, 200, 120, 70].forEach((f, i) => setTimeout(() => beep(f, 0.2, "sawtooth", 0.09), i * 90)); };

const W = 360, H = 440;
const PR = 6; // 플레이어 반지름 (작음 = 어려움)
const SAVE = "impossible_best";
const SAVE_TOTAL = "impossible_total";
const GOAL = 5000; // 클리어까지 모아야 하는 총 코인 (즉사 게임이라 ~5시간 도전!)

type Ball = { x: number; y: number; vx: number; vy: number; r: number };
type Coin = { x: number; y: number };

export default function ImpossibleDodge() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<"ready" | "play" | "dead">("ready");
  const [score, setScore] = useState(0);
  const [timeS, setTimeS] = useState(0);
  const [best, setBest] = useState(0);
  const [total, setTotal] = useState(0); // 누적 코인 (클리어 목표)
  const totalRef = useRef(0);
  const st = useRef({ px: W / 2, py: H - 40, balls: [] as Ball[], coins: [] as Coin[], spawnAcc: 0, coinCount: 0, t: 0, speed: 1, dead: false });
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => { try { setBest(Number(localStorage.getItem(SAVE) || 0)); const tt = Number(localStorage.getItem(SAVE_TOTAL) || 0); totalRef.current = tt; setTotal(tt); } catch { /* ignore */ } }, []);

  const mkBall = (): Ball => {
    const ang = Math.random() * Math.PI * 2, sp = 130 + Math.random() * 120;
    return { x: 40 + Math.random() * (W - 80), y: 40 + Math.random() * (H - 160), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 9 + Math.random() * 4 };
  };
  const mkCoin = (): Coin => ({ x: 24 + Math.random() * (W - 48), y: 24 + Math.random() * (H - 48) });

  const start = useCallback(() => {
    const s = st.current;
    s.px = W / 2; s.py = H - 40; s.balls = Array.from({ length: 6 }, mkBall); s.coins = [mkCoin(), mkCoin()];
    s.spawnAcc = 0; s.coinCount = 0; s.t = 0; s.speed = 1; s.dead = false;
    setScore(0); setTimeS(0); setPhase("play");
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    let raf = 0, last = performance.now();
    const move = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      st.current.px = Math.max(PR, Math.min(W - PR, ((clientX - rect.left) / rect.width) * W));
      st.current.py = Math.max(PR, Math.min(H - PR, ((clientY - rect.top) / rect.height) * H));
    };
    const mm = (e: MouseEvent) => move(e.clientX, e.clientY);
    const tm = (e: TouchEvent) => { if (e.touches[0]) { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); } };
    canvas.addEventListener("mousemove", mm);
    canvas.addEventListener("touchmove", tm, { passive: false });

    const loop = (tms: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.04, (tms - last) / 1000); last = tms;
      const s = st.current;
      const ctx = canvas.getContext("2d"); if (!ctx) return;

      if (phaseRef.current === "play" && !s.dead) {
        s.t += dt; setTimeS(s.t);
        s.speed = 1 + s.t * 0.05; // 점점 빨라짐
        // 공 추가 (2초마다, 최대 32개)
        s.spawnAcc += dt;
        if (s.spawnAcc > 2 && s.balls.length < 32) { s.spawnAcc = 0; s.balls.push(mkBall()); }
        // 공 이동 + 벽 반사
        for (const b of s.balls) {
          b.x += b.vx * s.speed * dt; b.y += b.vy * s.speed * dt;
          if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); } else if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
          if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); } else if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy); }
          if (Math.hypot(b.x - s.px, b.y - s.py) < b.r + PR) { // 즉사!
            s.dead = true; sDie();
            const sc = s.coinCount * 10 + Math.floor(s.t);
            setScore(sc);
            try { const bb = Number(localStorage.getItem(SAVE) || 0); if (sc > bb) { localStorage.setItem(SAVE, String(sc)); setBest(sc); } } catch { /* ignore */ }
            setPhase("dead");
          }
        }
        // 코인 획득
        for (const c of s.coins) {
          if (Math.hypot(c.x - s.px, c.y - s.py) < 12 + PR) { s.coinCount++; totalRef.current++; setTotal(totalRef.current); try { localStorage.setItem(SAVE_TOTAL, String(totalRef.current)); } catch { /* ignore */ } setScore(s.coinCount * 10 + Math.floor(s.t)); sCoin(); c.x = mkCoin().x; c.y = mkCoin().y; }
        }
      }

      // 렌더
      ctx.fillStyle = "#0a0a14"; ctx.fillRect(0, 0, W, H);
      // 코인
      for (const c of s.coins) { ctx.fillStyle = "#fde047"; ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, 7); ctx.fill(); ctx.strokeStyle = "#facc15"; ctx.lineWidth = 2; ctx.stroke(); }
      // 공
      for (const b of s.balls) {
        ctx.fillStyle = "#f43f5e"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.4, 0, 7); ctx.fill();
      }
      // 플레이어
      if (phaseRef.current !== "ready") {
        ctx.fillStyle = s.dead ? "#666" : "#22d3ee"; ctx.beginPath(); ctx.arc(s.px, s.py, PR, 0, 7); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); canvas.removeEventListener("mousemove", mm); canvas.removeEventListener("touchmove", tm); };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-black text-white flex flex-col items-center px-3 py-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-2">
          <Link href="/" className="text-cyan-300 text-sm">← 홈</Link>
          <h1 className="text-lg font-black text-rose-400">💀 극한 회피</h1>
          <span className="text-xs text-amber-300">🏆 {best}</span>
        </div>
        <div className="flex justify-between text-sm font-bold mb-1 px-1">
          <span className="text-cyan-300">점수 {score}</span>
          <span className="text-rose-300">공 {st.current.balls.length}</span>
          <span className="text-emerald-300">⏱️ {timeS.toFixed(1)}초</span>
        </div>
        {/* 클리어 목표 (누적 코인) */}
        <div className="mb-2 rounded-lg bg-yellow-950/40 border border-yellow-800/50 p-1.5">
          <div className="flex justify-between text-[10px] font-bold text-yellow-300">
            <span>🎯 클리어 목표: 총 코인 {GOAL.toLocaleString()}개</span>
            <span>{total.toLocaleString()} / {GOAL.toLocaleString()} {total >= GOAL ? "✅" : ""}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-black/50 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all" style={{ width: `${Math.min(100, total / GOAL * 100)}%` }} />
          </div>
        </div>
        <div className="relative rounded-2xl overflow-hidden border-2 border-rose-800/60">
          <canvas ref={canvasRef} width={W} height={H} className="w-full touch-none cursor-none bg-slate-950" />
          {phase === "ready" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-center px-5">
              {total >= GOAL ? (
                <>
                  <div className="text-6xl animate-bounce">🏆</div>
                  <h2 className="text-2xl font-black text-yellow-300">GAME CLEAR!</h2>
                  <p className="text-sm text-gray-300">총 코인 {GOAL.toLocaleString()}개 달성!<br /><b className="text-yellow-300">진정한 극한의 달인이다!</b></p>
                  <button onClick={start} className="mt-1 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-8 py-3 font-black shadow-lg active:scale-95">▶ 계속 하기</button>
                </>
              ) : (
                <>
                  <div className="text-6xl">💀</div>
                  <h2 className="text-2xl font-black text-rose-400">극한 회피</h2>
                  <p className="text-sm text-gray-300">🔵 파란 점을 <b>마우스/손가락</b>으로 움직여<br />🔴 빨간 공을 피해라!<br /><b className="text-rose-400">한 번만 스쳐도 즉사!!</b></p>
                  <p className="text-xs text-amber-300">🟡 코인 {GOAL.toLocaleString()}개 모으면 클리어 (약 5시간 도전!)</p>
                  <button onClick={start} className="mt-1 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-8 py-3 font-black shadow-lg active:scale-95">▶ 시작 (극악 난이도!)</button>
                </>
              )}
            </div>
          )}
          {phase === "dead" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 text-center px-5">
              <div className="text-6xl">☠️</div>
              <h2 className="text-3xl font-black text-rose-500 tracking-widest">YOU DIED</h2>
              <p className="text-sm text-gray-300">점수 <b className="text-cyan-300">{score}</b> · {timeS.toFixed(1)}초 버팀</p>
              {score >= best && score > 0 && <p className="text-amber-300 font-bold">🏆 신기록!</p>}
              <button onClick={start} className="mt-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-8 py-3 font-black shadow-lg active:scale-95">🔄 다시 (포기 금지!)</button>
            </div>
          )}
        </div>
        <p className="text-center text-[11px] text-gray-400 mt-2">🔵 점을 움직여 🔴 공 피하기! 한 번 스치면 죽어요. 공은 점점 늘고 빨라져요 😈</p>
      </div>
    </div>
  );
}
