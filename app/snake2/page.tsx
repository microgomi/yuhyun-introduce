"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

// ============================================================
// CONSTANTS
// ============================================================
const W = 600;
const H = 600;
const GRID = 20;
const CELL = 30; // W / GRID
const BASE_SPEED = 8; // cells per second
const MAX_SPEED = 18;

type GameState = "menu" | "playing" | "dead";
type Dir = "up" | "down" | "left" | "right";
type FoodType = "apple" | "golden" | "speed" | "slow";

interface Vec2 { x: number; y: number; }
interface Segment { x: number; y: number; }

interface Food {
  x: number; y: number;
  type: FoodType;
  spawnTime: number;
  eaten: boolean;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  r: number; color: string;
  type: "sparkle" | "explosion" | "trail";
}

const DIR_VEC: Record<Dir, Vec2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  up: "down", down: "up", left: "right", right: "left",
};

const FOOD_INFO: Record<FoodType, { emoji: string; points: number; growth: number; color: string }> = {
  apple:  { emoji: "🍎", points: 10,  growth: 1, color: "#ff4444" },
  golden: { emoji: "🌟", points: 50,  growth: 3, color: "#ffd700" },
  speed:  { emoji: "⚡", points: 20,  growth: 0, color: "#00ccff" },
  slow:   { emoji: "🐌", points: 15,  growth: 0, color: "#88cc44" },
};

// ============================================================
// COMPONENT
// ============================================================
export default function SnakeUltra() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    segments: Segment[];
    dir: Dir;
    nextDir: Dir;
    moveProgress: number;
    speed: number;
    speedTimer: number;
    foods: Food[];
    particles: Particle[];
    score: number;
    length: number;
    targetLength: number;
    alive: boolean;
    deathTime: number;
    shakeAmount: number;
    shakeDecay: number;
    deathSegments: { x: number; y: number; vx: number; vy: number; r: number; color: string }[];
    time: number;
  } | null>(null);

  const [gameState, setGameState] = useState<GameState>("menu");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [snakeLength, setSnakeLength] = useState(3);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem("snake2_hi");
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Touch support
  const touchStart = useRef<Vec2 | null>(null);

  const initGame = useCallback(() => {
    const startX = Math.floor(GRID / 2);
    const startY = Math.floor(GRID / 2);
    const segs: Segment[] = [];
    for (let i = 0; i < 3; i++) {
      segs.push({ x: startX - i, y: startY });
    }
    gameRef.current = {
      segments: segs,
      dir: "right",
      nextDir: "right",
      moveProgress: 0,
      speed: BASE_SPEED,
      speedTimer: 0,
      foods: [],
      particles: [],
      score: 0,
      length: 3,
      targetLength: 3,
      alive: true,
      deathTime: 0,
      shakeAmount: 0,
      shakeDecay: 0,
      deathSegments: [],
      time: 0,
    };
    setScore(0);
    setSnakeLength(3);
    setGameState("playing");
  }, []);

  // Main game loop
  useEffect(() => {
    if (gameState !== "playing" && gameState !== "dead") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    let animId = 0;
    let lastTime = performance.now();

    // Input
    const onKeyDown = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g || !g.alive) return;
      let nd: Dir | null = null;
      switch (e.key.toLowerCase()) {
        case "w": case "arrowup":    nd = "up"; break;
        case "s": case "arrowdown":  nd = "down"; break;
        case "a": case "arrowleft":  nd = "left"; break;
        case "d": case "arrowright": nd = "right"; break;
      }
      if (nd && nd !== OPPOSITE[g.dir]) {
        g.nextDir = nd;
        e.preventDefault();
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      const g = gameRef.current;
      if (!g || !g.alive || !touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (adx < 20 && ady < 20) return;
      let nd: Dir;
      if (adx > ady) {
        nd = dx > 0 ? "right" : "left";
      } else {
        nd = dy > 0 ? "down" : "up";
      }
      if (nd !== OPPOSITE[g.dir]) g.nextDir = nd;
      touchStart.current = null;
    };

    window.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });

    // Helpers
    function spawnFood(g: NonNullable<typeof gameRef.current>) {
      const occupied = new Set(g.segments.map(s => `${s.x},${s.y}`));
      g.foods.forEach(f => { if (!f.eaten) occupied.add(`${f.x},${f.y}`); });
      let fx: number, fy: number;
      let tries = 0;
      do {
        fx = 1 + Math.floor(Math.random() * (GRID - 2));
        fy = 1 + Math.floor(Math.random() * (GRID - 2));
        tries++;
      } while (occupied.has(`${fx},${fy}`) && tries < 200);

      const r = Math.random();
      let type: FoodType = "apple";
      if (r < 0.05) type = "golden";
      else if (r < 0.15) type = "speed";
      else if (r < 0.25) type = "slow";

      g.foods.push({ x: fx, y: fy, type, spawnTime: g.time, eaten: false });
    }

    function spawnParticles(g: NonNullable<typeof gameRef.current>, x: number, y: number, color: string, count: number, ptype: "sparkle" | "explosion" | "trail") {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = ptype === "explosion" ? 80 + Math.random() * 160 : 30 + Math.random() * 80;
        g.particles.push({
          x: x * CELL + CELL / 2,
          y: y * CELL + CELL / 2,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: ptype === "explosion" ? 1.0 + Math.random() * 0.5 : 0.4 + Math.random() * 0.4,
          maxLife: 1.5,
          r: ptype === "explosion" ? 3 + Math.random() * 4 : 2 + Math.random() * 3,
          color,
          type: ptype,
        });
      }
    }

    function die(g: NonNullable<typeof gameRef.current>) {
      g.alive = false;
      g.deathTime = g.time;
      g.shakeAmount = 15;
      g.shakeDecay = 3;

      // Create scattering segments
      g.deathSegments = g.segments.map((s, i) => {
        const angle = Math.random() * Math.PI * 2;
        const spd = 60 + Math.random() * 120;
        const t = i / Math.max(1, g.segments.length - 1);
        const r2 = Math.floor(40 + 180 * (1 - t));
        const g2 = Math.floor(200 * (1 - t));
        return {
          x: s.x * CELL + CELL / 2,
          y: s.y * CELL + CELL / 2,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          r: CELL * 0.4,
          color: `rgb(${r2},${g2},50)`,
        };
      });

      // Explosion particles from head
      const head = g.segments[0];
      spawnParticles(g, head.x, head.y, "#ff4444", 40, "explosion");
      spawnParticles(g, head.x, head.y, "#ffaa00", 20, "explosion");

      // Save high score
      if (g.score > highScore) {
        setHighScore(g.score);
        localStorage.setItem("snake2_hi", g.score.toString());
      }
      setScore(g.score);
      setTimeout(() => setGameState("dead"), 1500);
    }

    // Game loop
    function loop(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const g = gameRef.current;
      if (!g) return;
      g.time += dt;

      // --- UPDATE ---
      if (g.alive) {
        // Speed from length
        const lengthSpeed = BASE_SPEED + (g.length - 3) * 0.3;
        let effectiveSpeed = Math.min(lengthSpeed, MAX_SPEED);

        // Speed power-up
        if (g.speedTimer > 0) {
          g.speedTimer -= dt;
          effectiveSpeed *= g.speed > BASE_SPEED ? 1.5 : 0.6;
        } else {
          g.speed = effectiveSpeed;
        }

        g.moveProgress += effectiveSpeed * dt;

        while (g.moveProgress >= 1 && g.alive) {
          g.moveProgress -= 1;

          // Apply direction change
          g.dir = g.nextDir;
          const dv = DIR_VEC[g.dir];
          const head = g.segments[0];
          const nx = head.x + dv.x;
          const ny = head.y + dv.y;

          // Wall collision
          if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
            die(g);
            break;
          }

          // Self collision (skip first 2 to allow overlap at start)
          for (let i = 2; i < g.segments.length; i++) {
            if (g.segments[i].x === nx && g.segments[i].y === ny) {
              die(g);
              break;
            }
          }
          if (!g.alive) break;

          // Move
          g.segments.unshift({ x: nx, y: ny });
          while (g.segments.length > g.targetLength) {
            g.segments.pop();
          }
          g.length = g.segments.length;
          setSnakeLength(g.length);

          // Food collision
          for (let i = g.foods.length - 1; i >= 0; i--) {
            const f = g.foods[i];
            if (!f.eaten && f.x === nx && f.y === ny) {
              f.eaten = true;
              const info = FOOD_INFO[f.type];
              g.score += info.points;
              g.targetLength += info.growth;
              setScore(g.score);

              spawnParticles(g, nx, ny, info.color, 15, "sparkle");

              if (f.type === "speed") {
                g.speed = MAX_SPEED;
                g.speedTimer = 5;
              } else if (f.type === "slow") {
                g.speed = BASE_SPEED * 0.5;
                g.speedTimer = 5;
              }
            }
          }
          g.foods = g.foods.filter(f => !f.eaten);

          // Spawn food
          const activeFood = g.foods.filter(f => !f.eaten).length;
          if (activeFood < 2) spawnFood(g);
          if (activeFood < 1) spawnFood(g);
        }
      }

      // Update particles
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= dt;
        if (p.life <= 0) g.particles.splice(i, 1);
      }

      // Update death segments
      if (!g.alive) {
        for (const ds of g.deathSegments) {
          ds.x += ds.vx * dt;
          ds.y += ds.vy * dt;
          ds.vx *= 0.95;
          ds.vy *= 0.95;
          ds.vy += 80 * dt; // gravity
        }
      }

      // Screen shake decay
      if (g.shakeAmount > 0) {
        g.shakeAmount -= g.shakeDecay * dt * 20;
        if (g.shakeAmount < 0) g.shakeAmount = 0;
      }

      // --- DRAW ---
      ctx.save();

      // Screen shake
      const shakeX = (Math.random() - 0.5) * g.shakeAmount;
      const shakeY = (Math.random() - 0.5) * g.shakeAmount;
      ctx.translate(shakeX, shakeY);

      // Zoom effect based on length
      const zoomFactor = 1 - Math.min(g.length - 3, 40) * 0.002;
      if (zoomFactor < 1) {
        ctx.translate(W / 2, H / 2);
        ctx.scale(zoomFactor, zoomFactor);
        ctx.translate(-W / 2, -H / 2);
      }

      // Background
      ctx.fillStyle = "#111118";
      ctx.fillRect(-20, -20, W + 40, H + 40);

      // Subtle grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= GRID; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL, 0);
        ctx.lineTo(i * CELL, H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL);
        ctx.lineTo(W, i * CELL);
        ctx.stroke();
      }

      // Walls
      ctx.fillStyle = "#334";
      // top
      ctx.fillRect(0, 0, W, 2);
      // bottom
      ctx.fillRect(0, H - 2, W, 2);
      // left
      ctx.fillRect(0, 0, 2, H);
      // right
      ctx.fillRect(W - 2, 0, 2, H);

      // Wall decoration
      ctx.strokeStyle = "#556";
      ctx.lineWidth = 3;
      ctx.strokeRect(1, 1, W - 2, H - 2);

      // Draw foods
      for (const f of g.foods) {
        if (f.eaten) continue;
        const info = FOOD_INFO[f.type];
        const age = g.time - f.spawnTime;
        // Bounce animation on spawn
        let bounceScale = 1;
        if (age < 0.4) {
          const t = age / 0.4;
          bounceScale = 1 + 0.3 * Math.sin(t * Math.PI) * (1 - t);
        }
        // Gentle pulse
        const pulse = 1 + 0.05 * Math.sin(g.time * 4 + f.x + f.y);
        const scale = bounceScale * pulse;

        const cx = f.x * CELL + CELL / 2;
        const cy = f.y * CELL + CELL / 2;

        // Glow
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL * 0.7);
        glow.addColorStop(0, info.color + "44");
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, CELL * 0.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.font = `${CELL * 0.7}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(info.emoji, 0, 1);
        ctx.restore();
      }

      // Draw snake
      if (g.alive) {
        const segs = g.segments;
        const len = segs.length;

        // Interpolation offset
        const interp = g.moveProgress;
        const dv = DIR_VEC[g.dir];

        for (let i = len - 1; i >= 0; i--) {
          const s = segs[i];
          let drawX = s.x * CELL + CELL / 2;
          let drawY = s.y * CELL + CELL / 2;

          // Only interpolate head
          if (i === 0) {
            drawX += dv.x * CELL * interp;
            drawY += dv.y * CELL * interp;
          }

          const t = i / Math.max(1, len - 1);
          const radius = CELL * (i === 0 ? 0.45 : 0.38 - t * 0.08);

          // Gradient color: head bright green, tail dark
          const r = Math.floor(40 + 60 * t);
          const gv = Math.floor(220 - 140 * t);
          const b = Math.floor(60 + 40 * t);
          const baseColor = `rgb(${r},${gv},${b})`;

          // Draw segment
          ctx.beginPath();
          ctx.arc(drawX, drawY, Math.max(radius, 3), 0, Math.PI * 2);
          const segGrad = ctx.createRadialGradient(drawX - radius * 0.3, drawY - radius * 0.3, 0, drawX, drawY, radius);
          segGrad.addColorStop(0, i === 0 ? "#66ff88" : `rgb(${r + 40},${gv + 30},${b + 20})`);
          segGrad.addColorStop(1, baseColor);
          ctx.fillStyle = segGrad;
          ctx.fill();

          // Connect segments with rounded rects
          if (i < len - 1) {
            const next = segs[i + 1];
            const nx2 = next.x * CELL + CELL / 2;
            const ny2 = next.y * CELL + CELL / 2;
            const connR = CELL * (0.3 - t * 0.06);
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            const mx = (drawX + nx2) / 2;
            const my = (drawY + ny2) / 2;
            ctx.arc(mx, my, Math.max(connR, 2), 0, Math.PI * 2);
            ctx.fill();
          }

          // Eyes on head
          if (i === 0) {
            const eyeOffset = radius * 0.45;
            let ex1: number, ey1: number, ex2: number, ey2: number;
            const perpX = -dv.y;
            const perpY = dv.x;
            ex1 = drawX + dv.x * eyeOffset * 0.5 + perpX * eyeOffset;
            ey1 = drawY + dv.y * eyeOffset * 0.5 + perpY * eyeOffset;
            ex2 = drawX + dv.x * eyeOffset * 0.5 - perpX * eyeOffset;
            ey2 = drawY + dv.y * eyeOffset * 0.5 - perpY * eyeOffset;

            // White of eye
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(ex1, ey1, radius * 0.28, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ex2, ey2, radius * 0.28, 0, Math.PI * 2);
            ctx.fill();

            // Pupil
            ctx.fillStyle = "#111";
            ctx.beginPath();
            ctx.arc(ex1 + dv.x * 1.5, ey1 + dv.y * 1.5, radius * 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ex2 + dv.x * 1.5, ey2 + dv.y * 1.5, radius * 0.15, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw death segments
      if (!g.alive) {
        for (const ds of g.deathSegments) {
          ctx.globalAlpha = Math.max(0, 1 - (g.time - g.deathTime) * 0.7);
          ctx.beginPath();
          ctx.arc(ds.x, ds.y, ds.r, 0, Math.PI * 2);
          ctx.fillStyle = ds.color;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Draw particles
      for (const p of g.particles) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        if (p.type === "sparkle") {
          // Star shape
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(g.time * 5 + p.x);
          const sr = p.r * (0.5 + alpha * 0.5);
          ctx.beginPath();
          for (let j = 0; j < 4; j++) {
            const a = (j / 4) * Math.PI * 2;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * sr * 2, Math.sin(a) * sr * 2);
          }
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, sr * 0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, W, 32);
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText(`점수: ${g.score}`, 10, 16);
      ctx.fillText(`길이: ${g.length}`, 130, 16);
      ctx.fillStyle = "#ffd700";
      ctx.textAlign = "right";
      ctx.fillText(`최고: ${Math.max(g.score, highScore)}`, W - 10, 16);

      // Speed indicator
      if (g.speedTimer > 0) {
        ctx.textAlign = "center";
        ctx.fillStyle = g.speed > BASE_SPEED ? "#00ccff" : "#88cc44";
        const label = g.speed > BASE_SPEED ? "⚡ 가속!" : "🐌 감속";
        ctx.fillText(label, W / 2, 16);
      }

      ctx.restore();

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [gameState, highScore]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      {gameState === "menu" && (
        <div className="text-center px-4 max-w-md">
          <Link href="/" className="absolute top-4 left-4 text-sm text-gray-500 hover:text-white">← 홈으로</Link>
          <div className="text-6xl mb-4">🐍</div>
          <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SNAKE ULTRA</h1>
          <p className="text-gray-400 mb-6 text-sm">WASD / 방향키 이동 | 모바일: 스와이프</p>
          <div className="text-left bg-white/5 rounded-xl p-4 border border-white/10 mb-6 text-sm text-gray-300 space-y-1">
            <p>🍎 사과: 길이 +1</p>
            <p>🌟 황금 사과: 길이 +3 (희귀)</p>
            <p>⚡ 속도 부스트</p>
            <p>🐌 속도 감소</p>
            <p>🧱 벽과 자기 몸에 부딪히면 사망!</p>
          </div>
          <button onClick={initGame} className="w-full rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 py-4 text-xl font-black hover:brightness-125 transition-all border border-green-400/30">
            게임 시작
          </button>
          {highScore > 0 && <p className="mt-3 text-sm text-gray-500">최고 점수: {highScore}</p>}
        </div>
      )}

      {(gameState === "playing" || gameState === "dead") && (
        <div className="relative">
          <Link href="/" className="absolute -top-8 left-0 text-sm text-gray-500 hover:text-white z-10">← 홈으로</Link>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block rounded-lg border border-gray-800"
            style={{ maxWidth: "100vw", maxHeight: "85vh", imageRendering: "auto", touchAction: "none" }}
          />

          {gameState === "dead" && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
              <div className="text-center p-6">
                <div className="text-5xl mb-4">💀</div>
                <div className="text-3xl font-black text-red-500 mb-2">게임 오버</div>
                <div className="text-gray-400 mb-1">길이: {snakeLength}</div>
                <div className="text-yellow-400 text-xl font-bold mb-1">점수: {score}</div>
                {score >= highScore && score > 0 && <div className="text-green-400 text-sm mb-3">🏆 새 최고 기록!</div>}
                <div className="flex gap-3 justify-center mt-4">
                  <button onClick={initGame} className="rounded-xl bg-green-700 px-6 py-3 font-bold hover:bg-green-600">다시 하기</button>
                  <button onClick={() => setGameState("menu")} className="rounded-xl bg-gray-700 px-6 py-3 font-bold hover:bg-gray-600">메뉴로</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
