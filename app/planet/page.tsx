"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "playing";

interface Planet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  level: number;
  radius: number;
  merging: boolean;
  spawnTick: number; // tick when spawned, for grace period
}

// --- Constants ---
const W = 360;
const H = 560;
const GRAVITY = 0.15;
const BOUNCE = 0.4;
const FRICTION = 0.99;
const DROP_Y = 60;

const PLANET_DEFS: { name: string; emoji: string; color: string; glow: string; radius: number; points: number }[] = [
  { name: "먼지", emoji: "🌑", color: "#555", glow: "#777", radius: 14, points: 2 },
  { name: "소행성", emoji: "☄️", color: "#8B7355", glow: "#A0926B", radius: 18, points: 5 },
  { name: "달", emoji: "🌙", color: "#C0C0C0", glow: "#E0E0E0", radius: 22, points: 10 },
  { name: "화성", emoji: "🔴", color: "#CD5C5C", glow: "#FF6B6B", radius: 27, points: 20 },
  { name: "지구", emoji: "🌍", color: "#4169E1", glow: "#6495ED", radius: 32, points: 40 },
  { name: "해왕성", emoji: "🔵", color: "#1E90FF", glow: "#63B8FF", radius: 37, points: 80 },
  { name: "토성", emoji: "🪐", color: "#DAA520", glow: "#FFD700", radius: 43, points: 160 },
  { name: "목성", emoji: "🟤", color: "#D2691E", glow: "#F4A460", radius: 50, points: 320 },
  { name: "항성", emoji: "⭐", color: "#FFD700", glow: "#FFEC8B", radius: 57, points: 640 },
  { name: "블랙홀", emoji: "🕳️", color: "#2F0A3C", glow: "#8B00FF", radius: 64, points: 1280 },
  { name: "은하", emoji: "🌌", color: "#9370DB", glow: "#E6E6FA", radius: 72, points: 2560 },
];

const MAX_LEVEL = PLANET_DEFS.length - 1;

let nextId = 0;

export default function PlanetPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [nextLevel, setNextLevel] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highestLevel, setHighestLevel] = useState(0);
  const [mergeCount, setMergeCount] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [, setDropX] = useState(W / 2);
  const [message, setMessage] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const tickRef = useRef(0);
  const planetsRef = useRef<Planet[]>([]);
  const scoreRef = useRef(0);
  const nextLevelRef = useRef(0);
  const gameOverRef = useRef(false);
  const dropXRef = useRef(W / 2);
  const canDropRef = useRef(true);
  const highestRef = useRef(0);
  const mergeRef = useRef(0);
  const mouseXRef = useRef(W / 2);
  const loopRef = useRef<() => void>(() => {});

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const pickNext = useCallback((): number => {
    const weights = [40, 30, 20, 10];
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return 0;
  }, []);

  // Drop planet
  const dropPlanet = useCallback(() => {
    if (!canDropRef.current || gameOverRef.current) return;
    canDropRef.current = false;

    const level = nextLevelRef.current;
    const def = PLANET_DEFS[level];
    const x = Math.max(def.radius + 5, Math.min(W - def.radius - 5, dropXRef.current));

    planetsRef.current.push({
      id: ++nextId,
      x,
      y: DROP_Y,
      vx: 0,
      vy: 0,
      level,
      radius: def.radius,
      merging: false,
      spawnTick: tickRef.current,
    });

    const nl = pickNext();
    nextLevelRef.current = nl;
    setNextLevel(nl);

    setTimeout(() => { canDropRef.current = true; }, 400);
  }, [pickNext]);

  // Draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background - space
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0a0015");
    bg.addColorStop(0.5, "#0d0025");
    bg.addColorStop(1, "#05000a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    for (let i = 0; i < 30; i++) {
      const sx = (i * 137.5) % W;
      const sy = (i * 89.3) % H;
      const sz = 0.5 + (i % 3) * 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, sz, 0, Math.PI * 2);
      ctx.fill();
    }

    // Danger line
    ctx.strokeStyle = "rgba(255,50,50,0.3)";
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, DROP_Y + 20);
    ctx.lineTo(W, DROP_Y + 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // Drop guide
    if (canDropRef.current && !gameOverRef.current) {
      const nextDef = PLANET_DEFS[nextLevelRef.current];
      const dx = Math.max(nextDef.radius + 5, Math.min(W - nextDef.radius - 5, dropXRef.current));

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(dx, DROP_Y + nextDef.radius);
      ctx.lineTo(dx, H);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = 0.5;
      ctx.font = `${nextDef.radius * 1.4}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(nextDef.emoji, dx, DROP_Y);
      ctx.globalAlpha = 1;
    }

    // Planets
    for (const p of planetsRef.current) {
      const def = PLANET_DEFS[p.level];

      // Glow
      const grd = ctx.createRadialGradient(p.x, p.y, p.radius * 0.5, p.x, p.y, p.radius * 1.5);
      grd.addColorStop(0, def.glow + "40");
      grd.addColorStop(1, def.glow + "00");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Body
      const bodyGrd = ctx.createRadialGradient(p.x - p.radius * 0.3, p.y - p.radius * 0.3, 0, p.x, p.y, p.radius);
      bodyGrd.addColorStop(0, def.glow);
      bodyGrd.addColorStop(1, def.color);
      ctx.fillStyle = bodyGrd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = def.glow + "80";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Emoji
      ctx.font = `${p.radius * 1.2}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(def.emoji, p.x, p.y);

      // Level label
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = `bold ${Math.max(8, p.radius * 0.4)}px sans-serif`;
      ctx.fillText(`Lv.${p.level + 1}`, p.x, p.y + p.radius + 10);
    }

    // Floor
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, H - 10, W, 10);

    // Walls
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, 0, 3, H);
    ctx.fillRect(W - 3, 0, 3, H);
  }, []);

  // Game loop - stored in ref to avoid stale closures
  useEffect(() => {
    loopRef.current = () => {
      if (gameOverRef.current) return;

      tickRef.current++;
      const tick = tickRef.current;
      const planets = planetsRef.current;

      // Update drop position
      dropXRef.current = mouseXRef.current;

      // Physics
      for (const p of planets) {
        p.vy += GRAVITY;
        p.vx *= FRICTION;
        p.vy *= FRICTION;
        p.x += p.vx;
        p.y += p.vy;

        // Wall collisions
        if (p.x - p.radius < 0) {
          p.x = p.radius;
          p.vx = Math.abs(p.vx) * BOUNCE;
        }
        if (p.x + p.radius > W) {
          p.x = W - p.radius;
          p.vx = -Math.abs(p.vx) * BOUNCE;
        }
        if (p.y + p.radius > H - 10) {
          p.y = H - 10 - p.radius;
          p.vy = -Math.abs(p.vy) * BOUNCE;
          if (Math.abs(p.vy) < 0.5) p.vy = 0;
        }
      }

      // Planet-planet collisions - collect merges, apply after
      const merges: { aId: number; bId: number; level: number; mx: number; my: number; vx: number; vy: number }[] = [];

      for (let i = 0; i < planets.length; i++) {
        for (let j = i + 1; j < planets.length; j++) {
          const a = planets[i];
          const b = planets[j];
          if (!a || !b) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = a.radius + b.radius;

          // Nudge apart if nearly overlapping
          if (dist <= 1 && dist < minDist) {
            a.x -= 2 + Math.random() * 2;
            b.x += 2 + Math.random() * 2;
            continue;
          }

          if (dist < minDist && dist > 1) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = minDist - dist;

            // Separate
            const totalMass = a.radius + b.radius;
            const ratioA = b.radius / totalMass;
            const ratioB = a.radius / totalMass;
            a.x -= nx * overlap * ratioA;
            a.y -= ny * overlap * ratioA;
            b.x += nx * overlap * ratioB;
            b.y += ny * overlap * ratioB;

            // Bounce
            const dvx = a.vx - b.vx;
            const dvy = a.vy - b.vy;
            const dvDotN = dvx * nx + dvy * ny;

            if (dvDotN > 0) {
              const impulse = dvDotN / totalMass;
              a.vx -= impulse * b.radius * nx * (1 + BOUNCE);
              a.vy -= impulse * b.radius * ny * (1 + BOUNCE);
              b.vx += impulse * a.radius * nx * (1 + BOUNCE);
              b.vy += impulse * a.radius * ny * (1 + BOUNCE);
            }

            // Merge check - collect, don't modify array yet
            if (a.level === b.level && a.level < MAX_LEVEL && !a.merging && !b.merging) {
              a.merging = true;
              b.merging = true;
              merges.push({
                aId: a.id, bId: b.id,
                level: a.level + 1,
                mx: (a.x + b.x) / 2,
                my: (a.y + b.y) / 2,
                vx: (a.vx + b.vx) * 0.3,
                vy: (a.vy + b.vy) * 0.3,
              });
            }
          }
        }
      }

      // Apply merges after iteration
      for (const m of merges) {
        const removeIds = new Set([m.aId, m.bId]);
        planetsRef.current = planetsRef.current.filter((p) => !removeIds.has(p.id));

        const newDef = PLANET_DEFS[m.level];
        planetsRef.current.push({
          id: ++nextId,
          x: m.mx, y: m.my,
          vx: m.vx, vy: m.vy,
          level: m.level,
          radius: newDef.radius,

          merging: false,
          spawnTick: tickRef.current,
        });
        scoreRef.current += newDef.points;
        mergeRef.current++;
        if (m.level > highestRef.current) highestRef.current = m.level;

        if (m.level % 3 === 0) {
          setMessage(`✨ ${newDef.emoji} ${newDef.name} 탄생!`);
          setTimeout(() => setMessage(""), 1500);
        }
      }

      // Game over check - ignore planets spawned in last 90 ticks (~1.5 sec)
      if (planetsRef.current.length > 3) {
        let stableAbove = 0;
        for (const p of planetsRef.current) {
          const age = tick - p.spawnTick;
          if (age > 90 && p.y - p.radius < DROP_Y + 15 && Math.abs(p.vy) < 1) stableAbove++;
        }
        if (stableAbove >= 2) {
          gameOverRef.current = true;
          setGameOver(true);
          setScore(scoreRef.current);          setBestScore((prev) => Math.max(prev, scoreRef.current));
          setHighestLevel(highestRef.current);
          setMergeCount(mergeRef.current);
          setTotalGames((g) => g + 1);
          draw();
          return;
        }
      }

      // Sync state periodically
      if (tick % 5 === 0) {
        setScore(scoreRef.current);
        setDropX(dropXRef.current);
        setHighestLevel(highestRef.current);
        setMergeCount(mergeRef.current);
      }

      draw();
      animRef.current = requestAnimationFrame(loopRef.current);
    };
  }, [draw]);

  // Start game
  const startGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    planetsRef.current = [];
    scoreRef.current = 0;
    const nl = pickNext();
    nextLevelRef.current = nl;
    gameOverRef.current = false;
    canDropRef.current = true;
    highestRef.current = 0;
    mergeRef.current = 0;
    dropXRef.current = W / 2;
    mouseXRef.current = W / 2;
    tickRef.current = 0;
    nextId = 0;

    setScore(0);
    setNextLevel(nl);
    setGameOver(false);
    setHighestLevel(0);
    setMergeCount(0);
    setDropX(W / 2);
    setMessage("");

    setScreen("playing");
    // Use setTimeout to ensure canvas is mounted before first frame
    setTimeout(() => {
      animRef.current = requestAnimationFrame(loopRef.current);
    }, 50);
  }, [pickNext]);

  // Mouse/touch handlers
  const getCanvasX = useCallback((clientX: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return W / 2;
    const rect = canvas.getBoundingClientRect();
    return clientX - rect.left;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseXRef.current = getCanvasX(e.clientX);
  }, [getCanvasX]);

  const handleClick = useCallback(() => {
    dropPlanet();
  }, [dropPlanet]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    mouseXRef.current = getCanvasX(t.clientX);
  }, [getCanvasX]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    mouseXRef.current = getCanvasX(t.clientX);
  }, [getCanvasX]);

  const handleTouchEnd = useCallback(() => {
    dropPlanet();
  }, [dropPlanet]);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        dropPlanet();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [dropPlanet]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950 text-white">
      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">← 홈</Link>

          <div className="text-7xl">🌍🪐⭐</div>
          <h1 className="text-4xl font-black">
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">행성 키우기</span>
          </h1>
          <p className="text-lg text-slate-400">같은 행성을 합쳐서 더 큰 행성으로!</p>

          <button onClick={startGame}
            className="rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 px-12 py-4 text-xl font-black shadow-lg shadow-purple-500/30 transition-transform hover:scale-105 active:scale-95">
            🚀 게임 시작!
          </button>

          {bestScore > 0 && (
            <div className="rounded-xl bg-white/5 px-8 py-4 space-y-1">
              <p className="text-sm text-slate-400">🏆 최고점수: <span className="font-bold text-amber-400">{bestScore}</span></p>
              <p className="text-sm text-slate-400">🎮 플레이: <span className="font-bold text-cyan-400">{totalGames}회</span></p>
            </div>
          )}

          <div className="w-full max-w-sm rounded-xl bg-white/5 p-4 text-left text-xs text-slate-400 space-y-2">
            <p className="font-bold text-purple-400">🎮 조작법</p>
            <p>🖱️ 마우스로 위치 조정, 클릭으로 떨어뜨리기</p>
            <p>📱 터치로 위치 조정, 손 떼면 떨어뜨리기</p>
            <p>⌨️ 스페이스/엔터로도 떨어뜨리기</p>
            <p className="font-bold text-purple-400 mt-2">🪐 행성 진화</p>
            <div className="grid grid-cols-2 gap-1 text-center">
              {PLANET_DEFS.map((p, i) => (
                <span key={i}>Lv.{i + 1} {p.emoji} {p.name}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Playing */}
      {screen === "playing" && (
        <div className="flex min-h-screen flex-col items-center pt-2 px-2">
          {/* Stats */}
          <div className="mb-1 flex w-full max-w-[360px] items-center justify-between text-xs">
            <span className="rounded-lg bg-amber-500/20 px-2 py-1 text-amber-400 font-bold">⭐ {score}</span>
            <span className="rounded-lg bg-purple-500/20 px-2 py-1 text-purple-300 font-bold">
              다음: {PLANET_DEFS[nextLevel].emoji} {PLANET_DEFS[nextLevel].name}
            </span>
            <span className="rounded-lg bg-cyan-500/20 px-2 py-1 text-cyan-400 font-bold">🔗 {mergeCount}</span>
          </div>

          {message && (
            <div className="mb-1 rounded-lg bg-white/10 px-4 py-1 text-center text-sm font-bold animate-pulse">{message}</div>
          )}

          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="rounded-2xl border-2 border-purple-500/20 touch-none cursor-crosshair"
            style={{ width: W, height: H }}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />

          {/* Game Over Overlay */}
          {gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4 rounded-3xl bg-slate-900/90 p-8 text-center border border-purple-500/30">
                <div className="text-6xl">💥🪐</div>
                <h2 className="text-3xl font-black text-red-400">게임 오버!</h2>
                <p className="text-slate-400">행성이 넘쳤어요...</p>

                <div className="space-y-2 rounded-xl bg-white/5 px-8 py-4">
                  <p className="text-2xl font-black text-amber-400">⭐ {score}점</p>
                  {score >= bestScore && score > 0 && (
                    <p className="text-sm font-bold text-amber-400 animate-bounce">🏆 최고 기록!</p>
                  )}
                  <p className="text-sm text-slate-400">🔗 합체: {mergeCount}회</p>
                  <p className="text-sm text-slate-400">👑 최고 Lv: {highestLevel + 1} {PLANET_DEFS[highestLevel]?.emoji}</p>
                </div>

                <div className="flex gap-3">
                  <button onClick={startGame}
                    className="rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
                    🔄 다시하기
                  </button>
                  <button onClick={() => setScreen("menu")}
                    className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
                    메뉴
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom stats */}
          <div className="mt-2 flex gap-4 text-[10px] text-slate-600">
            <span>🔗 합체: {mergeCount}회</span>
            <span>👑 최고 Lv: {highestLevel + 1} {PLANET_DEFS[highestLevel]?.emoji}</span>
            <span>🏆 최고: {bestScore}</span>
          </div>
        </div>
      )}
    </div>
  );
}
