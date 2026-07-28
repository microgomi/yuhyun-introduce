"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

const CW = 800;
const CH = 400;
const GROUND_Y = 320;
const SIZE = 32;
const PLAYER_X = 110;
const TILE = 40;
const GRAVITY = 0.9;
const JUMP = -16.32; // -13.6 의 1.2배

const GID_OFFSET = 100000; // 등급별 스테이지 id 오프셋 (고유·안정)
// 등급별 스테이지 수 (오류는 5배 축소)
const STAGE_COUNTS: Record<string, number> = { easy: 8, mid: 8, hard: 8, extreme: 8, insane: 8, error: 2 };

interface Tier {
  key: string;
  name: string;
  emoji: string;
  color: string;
  speed: number;
  baseCount: number;
  countVar: number;
  minGap: number;
  maxGap: number;
  blockChance: number;
  maxCluster: number;
}

const TIERS: Tier[] = [
  { key: "easy", name: "쉬움", emoji: "🟢", color: "from-green-400 to-emerald-500", speed: 6.3, baseCount: 12, countVar: 6, minGap: 5, maxGap: 8, blockChance: 0.08, maxCluster: 1 },
  { key: "mid", name: "중간", emoji: "🔵", color: "from-blue-400 to-cyan-500", speed: 7.2, baseCount: 18, countVar: 8, minGap: 4, maxGap: 6.5, blockChance: 0.15, maxCluster: 1 },
  { key: "hard", name: "어려움", emoji: "🟠", color: "from-orange-400 to-amber-500", speed: 8.1, baseCount: 26, countVar: 10, minGap: 3.4, maxGap: 5.2, blockChance: 0.2, maxCluster: 2 },
  { key: "extreme", name: "익스트림", emoji: "🔴", color: "from-red-500 to-rose-600", speed: 9, baseCount: 34, countVar: 12, minGap: 3, maxGap: 4.4, blockChance: 0.25, maxCluster: 2 },
  { key: "insane", name: "무양심", emoji: "🟣", color: "from-purple-500 to-fuchsia-600", speed: 9.9, baseCount: 42, countVar: 14, minGap: 2.7, maxGap: 3.8, blockChance: 0.28, maxCluster: 3 },
  { key: "error", name: "오류(ERROR)", emoji: "🆘", color: "from-zinc-700 to-red-900", speed: 11.1, baseCount: 52, countVar: 16, minGap: 2.4, maxGap: 3.4, blockChance: 0.3, maxCluster: 3 },
];

const stagesOf = (t: number) => STAGE_COUNTS[TIERS[t].key];
const TOTAL_STAGES = TIERS.reduce((a, t) => a + STAGE_COUNTS[t.key], 0);

interface Obstacle { type: "spike" | "block"; x: number; w: number; }

// 시드 기반 난수 (mulberry32) — 스테이지마다 고유·재현 가능
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genLevel(tierIdx: number, stage: number): { obstacles: Obstacle[]; length: number; speed: number } {
  const tier = TIERS[tierIdx];
  const globalId = tierIdx * GID_OFFSET + stage;
  const r = rng(Math.imul(globalId, 2654435761) ^ 0x9e3779b9);
  const count = tier.baseCount + Math.floor(r() * tier.countVar);
  const obstacles: Obstacle[] = [];
  let x = 700;
  for (let i = 0; i < count; i++) {
    const gap = tier.minGap + r() * (tier.maxGap - tier.minGap);
    x += Math.round(gap * TILE);
    if (r() < tier.blockChance) {
      obstacles.push({ type: "block", x, w: TILE });
      x += TILE;
    } else {
      const cluster = 1 + Math.floor(r() * tier.maxCluster);
      const w = cluster * TILE;
      obstacles.push({ type: "spike", x, w });
      x += w;
    }
  }
  return { obstacles, length: x + 400, speed: tier.speed };
}

type Phase = "ready" | "playing" | "dead" | "win";
type View = "menu" | "stages" | "play";

const PER_PAGE = 60;

export default function GeometryPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<View>("menu");
  const [tierIdx, setTierIdx] = useState(0);
  const [page, setPage] = useState(0);
  const [stage, setStage] = useState(1);
  const [phase, setPhase] = useState<Phase>("ready");
  const [attempts, setAttempts] = useState(1);
  const [bestMap, setBestMap] = useState<Record<number, number>>({});
  const [jumpInput, setJumpInput] = useState("");

  const g = useRef({
    cameraX: 0, py: GROUND_Y - SIZE, vy: 0, grounded: true, angle: 0,
    phase: "ready" as Phase, dead: false, deadTimer: 0, hold: false,
    progress: 0, attempts: 1, speed: 5, tierIdx: 0, stage: 1,
    level: { obstacles: [] as Obstacle[], length: 1000, speed: 5 },
  });
  const bestRef = useRef<Record<number, number>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("geo_best_v2");
      if (raw) { const m = JSON.parse(raw); setBestMap(m); bestRef.current = m; }
    } catch { /* ignore */ }
  }, []);

  const gid = (t: number, s: number) => t * GID_OFFSET + s;

  const recordBest = useCallback((id: number, pct: number) => {
    const cur = bestRef.current[id] ?? 0;
    if (pct > cur) {
      const m = { ...bestRef.current, [id]: pct };
      bestRef.current = m;
      setBestMap(m);
      try { localStorage.setItem("geo_best_v2", JSON.stringify(m)); } catch { /* ignore */ }
    }
  }, []);

  const startStage = useCallback((t: number, s: number) => {
    const level = genLevel(t, s);
    const st = g.current;
    st.level = level;
    st.speed = level.speed;
    st.tierIdx = t;
    st.stage = s;
    st.cameraX = 0; st.py = GROUND_Y - SIZE; st.vy = 0; st.grounded = true;
    st.angle = 0; st.dead = false; st.deadTimer = 0; st.progress = 0; st.attempts = 1;
    st.phase = "ready";
    setTierIdx(t); setStage(s); setAttempts(1); setPhase("ready"); setView("play");
  }, []);

  const restart = useCallback(() => {
    const st = g.current;
    st.cameraX = 0; st.py = GROUND_Y - SIZE; st.vy = 0; st.grounded = true;
    st.angle = 0; st.dead = false; st.deadTimer = 0; st.progress = 0;
    st.attempts += 1;
    st.phase = "playing";
    setAttempts(st.attempts); setPhase("playing");
  }, []);

  const jump = useCallback(() => {
    const s = g.current;
    if (s.phase === "ready") { s.phase = "playing"; setPhase("playing"); return; }
    if (s.phase === "playing" && s.grounded) { s.vy = JUMP; s.grounded = false; }
  }, []);

  // 입력
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.key === "w") {
        if (g.current.phase === "ready" || g.current.phase === "playing") e.preventDefault();
        g.current.hold = true;
        if (view === "play") jump();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.key === "w") g.current.hold = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [jump, view]);

  // 게임 루프
  useEffect(() => {
    let raf = 0;

    const die = () => {
      const s = g.current;
      if (s.dead) return;
      s.dead = true; s.deadTimer = 26; s.phase = "dead"; setPhase("dead");
      recordBest(gid(s.tierIdx, s.stage), Math.round(s.progress * 100));
    };

    const update = () => {
      const s = g.current;
      if (s.phase !== "playing") {
        if (s.phase === "dead") { s.deadTimer -= 1; if (s.deadTimer <= 0) restart(); }
        return;
      }
      const SPEED = s.speed;
      s.cameraX += SPEED;
      const pL = s.cameraX + PLAYER_X;
      const pR = pL + SIZE;
      const prevBottom = s.py + SIZE;
      s.vy += GRAVITY;
      s.py += s.vy;
      if (!s.grounded) s.angle += 0.11;
      s.grounded = false;
      let landed = false;

      for (const o of s.level.obstacles) {
        if (o.x + o.w < s.cameraX || o.x > s.cameraX + CW) continue;
        if (o.type === "block") {
          const bTop = GROUND_Y - TILE;
          if (pR > o.x && pL < o.x + o.w) {
            if (s.vy >= 0 && prevBottom <= bTop + 8) { s.py = bTop - SIZE; s.vy = 0; s.grounded = true; landed = true; }
            else if (s.py + SIZE > bTop + 8 && s.py < GROUND_Y) { die(); return; }
          }
        }
      }
      if (!landed && s.py + SIZE >= GROUND_Y) { s.py = GROUND_Y - SIZE; s.vy = 0; s.grounded = true; }
      if (s.grounded) s.angle = Math.round(s.angle / (Math.PI / 2)) * (Math.PI / 2);
      if (s.hold && s.grounded) { s.vy = JUMP; s.grounded = false; }

      for (const o of s.level.obstacles) {
        if (o.type !== "spike") continue;
        if (o.x + o.w < s.cameraX || o.x > s.cameraX + CW) continue;
        if (pR > o.x + 7 && pL < o.x + o.w - 7 && s.py + SIZE > GROUND_Y - 24) { die(); return; }
      }

      s.progress = Math.min(1, (s.cameraX + PLAYER_X) / s.level.length);
      if (s.cameraX + PLAYER_X >= s.level.length) {
        s.phase = "win"; setPhase("win");
        recordBest(gid(s.tierIdx, s.stage), 100);
      }
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const s = g.current;
      const bg = ctx.createLinearGradient(0, 0, 0, CH);
      bg.addColorStop(0, "#1e1b4b"); bg.addColorStop(1, "#0f172a");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, CW, CH);

      ctx.strokeStyle = "rgba(129,140,248,0.12)"; ctx.lineWidth = 1;
      const off = s.cameraX % 40;
      for (let x = -off; x < CW; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GROUND_Y); ctx.stroke(); }

      ctx.fillStyle = "#111827"; ctx.fillRect(0, GROUND_Y, CW, CH - GROUND_Y);
      ctx.strokeStyle = "#a78bfa"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(CW, GROUND_Y); ctx.stroke();

      for (const o of s.level.obstacles) {
        const sx = o.x - s.cameraX;
        if (sx + o.w < 0 || sx > CW) continue;
        if (o.type === "spike") {
          ctx.fillStyle = "#f43f5e";
          const n = o.w / TILE;
          for (let i = 0; i < n; i++) {
            const bx = sx + i * TILE;
            ctx.beginPath(); ctx.moveTo(bx + 2, GROUND_Y); ctx.lineTo(bx + TILE / 2, GROUND_Y - 30); ctx.lineTo(bx + TILE - 2, GROUND_Y); ctx.closePath(); ctx.fill();
          }
        } else {
          ctx.fillStyle = "#38bdf8"; ctx.fillRect(sx + 1, GROUND_Y - TILE, TILE - 2, TILE);
          ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(sx + 1, GROUND_Y - TILE, TILE - 2, 6);
        }
      }

      const goalSx = s.level.length - s.cameraX;
      if (goalSx < CW + 40) { ctx.font = "34px system-ui"; ctx.textAlign = "center"; ctx.fillText("🏁", goalSx, GROUND_Y - 6); }

      if (s.phase !== "dead") {
        ctx.save();
        ctx.translate(PLAYER_X + SIZE / 2, s.py + SIZE / 2); ctx.rotate(s.angle);
        ctx.fillStyle = "#facc15"; ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 3;
        ctx.fillRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE); ctx.strokeRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE);
        ctx.fillStyle = "#1e293b"; ctx.fillRect(-SIZE / 4, -SIZE / 4, SIZE / 2, SIZE / 2);
        ctx.restore();
      } else {
        ctx.fillStyle = "#fbbf24";
        const cx = PLAYER_X + SIZE / 2, cy = s.py + SIZE / 2, t = 26 - s.deadTimer;
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * t * 3, cy + Math.sin(a) * t * 3, 4, 0, Math.PI * 2); ctx.fill(); }
      }

      ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fillRect(80, 18, CW - 160, 10);
      ctx.fillStyle = "#4ade80"; ctx.fillRect(80, 18, (CW - 160) * s.progress, 10);
      ctx.fillStyle = "#fff"; ctx.font = "bold 13px system-ui"; ctx.textAlign = "center";
      ctx.fillText(`${Math.round(s.progress * 100)}%`, CW / 2, 12);
      ctx.textAlign = "left"; ctx.fillText(`${TIERS[s.tierIdx].name} #${s.stage} · 시도 ${s.attempts}`, 12, 26);
    };

    const loop = () => {
      update();
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) draw(ctx);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [restart, recordBest]);

  // ── 메뉴 (등급 선택) ──
  if (view === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-900 to-black p-4 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <Link href="/" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold hover:bg-white/20">← 홈</Link>
            <h1 className="text-2xl font-extrabold">🔷 지오메트릭스</h1>
            <span className="text-xs text-white/50">총 {TOTAL_STAGES}단계</span>
          </div>
          <p className="mb-4 text-center text-sm text-white/70">난이도 등급을 골라보세요! 🎯</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TIERS.map((t, i) => {
              let cleared = 0;
              for (let s = 1; s <= stagesOf(i); s++) if (bestMap[i * GID_OFFSET + s] === 100) cleared++;
              return (
                <button key={t.key} onClick={() => { setTierIdx(i); setPage(0); setView("stages"); }}
                  className={`flex items-center justify-between rounded-2xl bg-gradient-to-r ${t.color} p-4 text-left shadow-lg transition hover:scale-[1.02]`}>
                  <div>
                    <div className="text-lg font-extrabold">{t.emoji} {t.name}</div>
                    <div className="text-xs text-white/80">1 ~ {stagesOf(i)}단계 · 속도 {t.speed}</div>
                  </div>
                  <div className="text-right text-xs font-bold text-white/90">✔ {cleared}<br />클리어</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── 스테이지 선택 ──
  if (view === "stages") {
    const stageCount = stagesOf(tierIdx);
    const totalPages = Math.max(1, Math.ceil(stageCount / PER_PAGE));
    const start = page * PER_PAGE;
    const stages = Array.from({ length: Math.min(PER_PAGE, stageCount - start) }, (_, i) => start + i + 1);
    const t = TIERS[tierIdx];
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-900 to-black p-4 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => setView("menu")} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold hover:bg-white/20">← 등급</button>
            <h1 className={`bg-gradient-to-r ${t.color} bg-clip-text text-lg font-extrabold text-transparent`}>{t.emoji} {t.name}</h1>
            <span className="text-xs text-white/50">{page + 1}/{totalPages}p</span>
          </div>

          {/* 스테이지 바로가기 */}
          <div className="mb-3 flex gap-2">
            <input value={jumpInput} onChange={(e) => setJumpInput(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder={`1~${stageCount} 스테이지 번호`}
              className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
            <button onClick={() => { const n = Math.max(1, Math.min(stageCount, Number(jumpInput) || 1)); startStage(tierIdx, n); }}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold hover:bg-indigo-400">이동</button>
          </div>

          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
            {stages.map((s) => {
              const pct = bestMap[gid(tierIdx, s)] ?? 0;
              const done = pct === 100;
              return (
                <button key={s} onClick={() => startStage(tierIdx, s)}
                  className={`relative aspect-square rounded-lg text-[11px] font-bold transition hover:scale-105 ${done ? "bg-green-600" : pct > 0 ? "bg-amber-700" : "bg-slate-700"}`}>
                  {s}
                  {done && <span className="absolute -right-1 -top-1 text-[9px]">✔</span>}
                  {!done && pct > 0 && <span className="absolute bottom-0 left-0 right-0 text-[7px] text-amber-200">{pct}%</span>}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-30">◀ 이전</button>
            <span className="text-sm text-white/70">{page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-30">다음 ▶</button>
          </div>
        </div>
      </div>
    );
  }

  // ── 플레이 ──
  const t = TIERS[tierIdx];
  const nextStage = stage < stagesOf(tierIdx) ? stage + 1 : null;
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-900 to-black p-3 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setView("stages")} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold hover:bg-white/20">← 목록</button>
          <h1 className="text-lg font-extrabold">{t.emoji} {t.name} <span className="text-white/60">#{stage}</span></h1>
          <span className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold text-green-300">🏆 {bestMap[gid(tierIdx, stage)] ?? 0}%</span>
        </div>

        <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-500/40 shadow-2xl"
          onPointerDown={(e) => { e.preventDefault(); g.current.hold = true; jump(); }}
          onPointerUp={() => { g.current.hold = false; }}
          onPointerLeave={() => { g.current.hold = false; }}>
          <canvas ref={canvasRef} width={CW} height={CH} className="block w-full" style={{ aspectRatio: `${CW} / ${CH}`, touchAction: "none" }} />

          {phase === "ready" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-center">
              <h2 className="mb-2 text-3xl font-extrabold text-yellow-300">{t.emoji} {t.name} #{stage}</h2>
              <p className="mb-6 text-white/80">스페이스 · 클릭 · 탭으로 점프!</p>
              <button onClick={() => { g.current.phase = "playing"; setPhase("playing"); }} className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-10 py-3 text-xl font-bold text-slate-900 shadow-lg transition hover:scale-105">시작!</button>
            </div>
          )}

          {phase === "win" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-center">
              <h2 className="mb-1 text-4xl font-extrabold text-green-400">🏁 클리어!</h2>
              <p className="mb-5 text-white/80">{t.name} #{stage} · {g.current.attempts}번 만에! 🎉</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={() => startStage(tierIdx, stage)} className="rounded-xl bg-white/15 px-5 py-2.5 text-base font-bold hover:bg-white/25">🔄 다시</button>
                {nextStage && <button onClick={() => startStage(tierIdx, nextStage)} className="rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 px-5 py-2.5 text-base font-bold text-slate-900 hover:scale-105">다음 #{nextStage} ▶</button>}
                <button onClick={() => setView("stages")} className="rounded-xl bg-white/15 px-5 py-2.5 text-base font-bold hover:bg-white/25">📋 목록</button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-center text-xs text-white/60">🎮 스페이스/↑/W · 클릭 · 탭으로 점프 (꾹 누르면 연속 점프) · 죽으면 자동 재시작</p>
      </div>
    </div>
  );
}
