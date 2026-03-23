"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "playing" | "result";

interface Obstacle {
  id: number;
  x: number;
  y: number;
  type: "rock" | "shark" | "whirlpool" | "jellyfish" | "log";
  emoji: string;
  width: number;
  height: number;
}

interface Coin {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

interface Wave {
  x: number;
  amplitude: number;
  frequency: number;
  speed: number;
}

// --- Constants ---
const CANVAS_W = 360;
const CANVAS_H = 600;
const SURFER_W = 32;
const SURFER_H = 32;
const TICK_MS = 16;
const LANE_COUNT = 5;
const LANE_WIDTH = CANVAS_W / LANE_COUNT;

const OBSTACLE_TYPES: { type: Obstacle["type"]; emoji: string; w: number; h: number }[] = [
  { type: "rock", emoji: "🪨", w: 30, h: 30 },
  { type: "shark", emoji: "🦈", w: 36, h: 28 },
  { type: "whirlpool", emoji: "🌀", w: 32, h: 32 },
  { type: "jellyfish", emoji: "🪼", w: 26, h: 26 },
  { type: "log", emoji: "🪵", w: 40, h: 20 },
];

export default function SurfingPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [distance, setDistance] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [speed, setSpeed] = useState(3);
  const [alive, setAlive] = useState(true);
  const [surferX, setSurferX] = useState(CANVAS_W / 2);
  const [surferLane, setSurferLane] = useState(2);
  const [trickText, setTrickText] = useState("");
  const [shield, setShield] = useState(0);
  const [magnet, setMagnet] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [bestDistance, setBestDistance] = useState(0);

  // Upgrade states
  const [shieldLevel, setShieldLevel] = useState(0);
  const [magnetLevel, setMagnetLevel] = useState(0);
  const [coinMultLevel, setCoinMultLevel] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const tickRef = useRef(0);
  const scoreRef = useRef(0);
  const speedRef = useRef(3);
  const surferXRef = useRef(CANVAS_W / 2);
  const surferLaneRef = useRef(2);
  const aliveRef = useRef(true);
  const distRef = useRef(0);
  const comboRef = useRef(0);
  const shieldRef = useRef(0);
  const magnetRef = useRef(0);
  const wavesRef = useRef<Wave[]>([]);
  const uidRef = useRef(0);
  const touchStartRef = useRef<number | null>(null);
  const coinMultRef = useRef(1);

  const nextUid = () => ++uidRef.current;

  // Start game
  const startGame = useCallback(() => {
    obstaclesRef.current = [];
    coinsRef.current = [];
    tickRef.current = 0;
    scoreRef.current = 0;
    speedRef.current = 3;
    surferXRef.current = CANVAS_W / 2;
    surferLaneRef.current = 2;
    aliveRef.current = true;
    distRef.current = 0;
    comboRef.current = 0;
    shieldRef.current = shieldLevel > 0 ? 1 : 0;
    magnetRef.current = 0;
    uidRef.current = 0;
    coinMultRef.current = 1 + coinMultLevel * 0.3;
    wavesRef.current = Array.from({ length: 5 }, (_, i) => ({
      x: 0, amplitude: 15 + Math.random() * 20, frequency: 0.01 + Math.random() * 0.015, speed: 0.5 + Math.random() * 1.5,
    }));

    setScore(0);
    setCoins(0);
    setDistance(0);
    setCombo(0);
    setMaxCombo(0);
    setSpeed(3);
    setAlive(true);
    setSurferX(CANVAS_W / 2);
    setSurferLane(2);
    setTrickText("");
    setShield(shieldLevel > 0 ? 1 : 0);
    setMagnet(0);
    setScreen("playing");
  }, [shieldLevel, coinMultLevel]);

  // Move surfer
  const moveSurfer = useCallback((direction: "left" | "right") => {
    if (!aliveRef.current) return;
    let newLane = surferLaneRef.current;
    if (direction === "left") newLane = Math.max(0, newLane - 1);
    else newLane = Math.min(LANE_COUNT - 1, newLane + 1);
    surferLaneRef.current = newLane;
    setSurferLane(newLane);
    const targetX = newLane * LANE_WIDTH + LANE_WIDTH / 2;
    surferXRef.current = targetX;
    setSurferX(targetX);
  }, []);

  // Keyboard controls
  useEffect(() => {
    if (screen !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") moveSurfer("left");
      else if (e.key === "ArrowRight" || e.key === "d") moveSurfer("right");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, moveSurfer]);

  // Touch controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const diff = endX - touchStartRef.current;
    if (Math.abs(diff) > 20) {
      moveSurfer(diff > 0 ? "right" : "left");
    }
    touchStartRef.current = null;
  }, [moveSurfer]);

  // Click left/right half
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    moveSurfer(x < rect.width / 2 ? "left" : "right");
  }, [moveSurfer]);

  // Game loop
  useEffect(() => {
    if (screen !== "playing") return;

    const loop = () => {
      if (!aliveRef.current) return;
      tickRef.current++;
      const tick = tickRef.current;
      const spd = speedRef.current;

      // Increase speed over time
      if (tick % 300 === 0) {
        speedRef.current = Math.min(12, spd + 0.3);
        setSpeed(speedRef.current);
      }

      // Distance
      distRef.current += spd * 0.1;
      if (tick % 10 === 0) setDistance(Math.floor(distRef.current));

      // Score
      scoreRef.current += Math.floor(spd * 0.5);
      if (tick % 15 === 0) setScore(scoreRef.current);

      // Shield/magnet timers
      if (shieldRef.current > 0 && tick % 60 === 0) {
        // shield is count-based, not time-based
      }
      if (magnetRef.current > 0) {
        magnetRef.current--;
        if (tick % 60 === 0) setMagnet(magnetRef.current);
      }

      // Spawn obstacles
      const spawnRate = Math.max(25, 60 - Math.floor(spd * 2));
      if (tick % spawnRate === 0) {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const typeInfo = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
        obstaclesRef.current.push({
          id: nextUid(), x: lane * LANE_WIDTH + LANE_WIDTH / 2, y: -40,
          type: typeInfo.type, emoji: typeInfo.emoji, width: typeInfo.w, height: typeInfo.h,
        });
      }

      // Spawn coins
      if (tick % 20 === 0) {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        coinsRef.current.push({
          id: nextUid(), x: lane * LANE_WIDTH + LANE_WIDTH / 2, y: -30, collected: false,
        });
      }

      // Spawn power-ups as special coins occasionally
      // (magnet pickup)
      if (tick % 400 === 200 && magnetRef.current <= 0) {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        coinsRef.current.push({
          id: nextUid(), x: lane * LANE_WIDTH + LANE_WIDTH / 2, y: -30, collected: false,
        });
      }

      // Move obstacles
      obstaclesRef.current = obstaclesRef.current
        .map((o) => ({ ...o, y: o.y + spd * 1.5 }))
        .filter((o) => o.y < CANVAS_H + 60);

      // Move coins
      coinsRef.current = coinsRef.current
        .map((c) => {
          let { x, y } = c;
          y += spd * 1.5;
          // Magnet effect
          if (magnetRef.current > 0 && !c.collected) {
            const dx = surferXRef.current - x;
            const dy = (CANVAS_H - 80) - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
              x += dx * 0.1;
              y += dy * 0.1;
            }
          }
          return { ...c, x, y };
        })
        .filter((c) => c.y < CANVAS_H + 40 || c.collected);

      // Collision detection
      const sx = surferXRef.current;
      const sy = CANVAS_H - 80;

      // Obstacle collision
      for (const obs of obstaclesRef.current) {
        const dx = Math.abs(sx - obs.x);
        const dy = Math.abs(sy - obs.y);
        if (dx < (SURFER_W + obs.width) / 2 - 4 && dy < (SURFER_H + obs.height) / 2 - 4) {
          if (shieldRef.current > 0) {
            shieldRef.current--;
            setShield(shieldRef.current);
            obstaclesRef.current = obstaclesRef.current.filter((o) => o.id !== obs.id);
            setTrickText("🛡️ 보호!");
            setTimeout(() => setTrickText(""), 800);
          } else {
            aliveRef.current = false;
            setAlive(false);
            setTotalGames((g) => g + 1);
            if (scoreRef.current > bestScore) setBestScore(scoreRef.current);
            if (distRef.current > bestDistance) setBestDistance(Math.floor(distRef.current));
            setTotalCoins((t) => t + coins);
            setScreen("result");
            return;
          }
        }
      }

      // Coin collection
      for (const coin of coinsRef.current) {
        if (coin.collected) continue;
        const dx = Math.abs(sx - coin.x);
        const dy = Math.abs(sy - coin.y);
        if (dx < 24 && dy < 24) {
          coin.collected = true;
          const mult = coinMultRef.current;
          const coinVal = Math.floor(1 * mult);
          setCoins((c) => c + coinVal);
          comboRef.current++;
          setCombo(comboRef.current);
          if (comboRef.current > maxCombo) setMaxCombo(comboRef.current);
          scoreRef.current += 50 * coinVal;
        }
      }
      coinsRef.current = coinsRef.current.filter((c) => !c.collected || c.y < CANVAS_H + 40);

      // Draw
      drawGame();
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [screen, bestScore, bestDistance, coins, maxCombo]);

  // Draw
  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const tick = tickRef.current;
    const spd = speedRef.current;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Ocean background
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    gradient.addColorStop(0, "#0077B6");
    gradient.addColorStop(0.5, "#0096C7");
    gradient.addColorStop(1, "#00B4D8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Animated waves
    for (const wave of wavesRef.current) {
      wave.x += wave.speed;
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x < CANVAS_W; x += 3) {
        const y = Math.sin((x + wave.x) * wave.frequency) * wave.amplitude;
        const screenY = (tick * spd * 0.3 + x * 0.5 + y) % CANVAS_H;
        if (x === 0) ctx.moveTo(x, screenY);
        else ctx.lineTo(x, screenY);
      }
      ctx.stroke();
    }

    // Foam lines scrolling
    for (let i = 0; i < 8; i++) {
      const y = ((tick * spd * 1.2 + i * 85) % (CANVAS_H + 40)) - 20;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(0, y, CANVAS_W, 2);
    }

    // Lane dividers (subtle)
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 1; i < LANE_COUNT; i++) {
      ctx.beginPath();
      ctx.moveTo(i * LANE_WIDTH, 0);
      ctx.lineTo(i * LANE_WIDTH, CANVAS_H);
      ctx.stroke();
    }

    // Coins
    ctx.font = "20px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const coin of coinsRef.current) {
      if (!coin.collected) {
        ctx.fillText("⭐", coin.x, coin.y);
      }
    }

    // Obstacles
    for (const obs of obstaclesRef.current) {
      ctx.font = `${Math.max(obs.width, obs.height)}px serif`;
      ctx.fillText(obs.emoji, obs.x, obs.y);
    }

    // Surfer
    const sx = surferXRef.current;
    const sy = CANVAS_H - 80;

    // Wake/trail
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.moveTo(sx - 12, sy + 16);
    ctx.lineTo(sx + 12, sy + 16);
    ctx.lineTo(sx + 20, sy + 60);
    ctx.lineTo(sx - 20, sy + 60);
    ctx.fill();

    // Shield glow
    if (shieldRef.current > 0) {
      ctx.strokeStyle = "rgba(0, 255, 255, 0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Surfer emoji
    ctx.font = "32px serif";
    ctx.fillText("🏄", sx, sy);

    // Surfboard
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 14, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#FFA000";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, []);

  // Upgrades
  const buyShield = () => {
    const cost = (shieldLevel + 1) * 50;
    if (totalCoins < cost || shieldLevel >= 3) return;
    setTotalCoins((t) => t - cost);
    setShieldLevel((l) => l + 1);
  };
  const buyMagnet = () => {
    const cost = (magnetLevel + 1) * 40;
    if (totalCoins < cost || magnetLevel >= 3) return;
    setTotalCoins((t) => t - cost);
    setMagnetLevel((l) => l + 1);
  };
  const buyCoinMult = () => {
    const cost = (coinMultLevel + 1) * 60;
    if (totalCoins < cost || coinMultLevel >= 3) return;
    setTotalCoins((t) => t - cost);
    setCoinMultLevel((l) => l + 1);
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-sky-950 via-blue-950 to-cyan-950 text-white">
      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">← 홈</Link>
          <div className="text-7xl">🏄</div>
          <h1 className="text-5xl font-black">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">서핑</span>
          </h1>
          <p className="text-lg text-slate-400">파도를 타고 장애물을 피해라!</p>

          <button onClick={startGame} className="mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-12 py-4 text-xl font-black shadow-lg transition-transform hover:scale-105 active:scale-95">
            🌊 서핑 시작!
          </button>

          <div className="rounded-xl bg-white/5 px-6 py-3 space-y-1 backdrop-blur">
            <p className="text-sm text-slate-400">🏆 최고 점수: <span className="font-bold text-amber-400">{bestScore}</span></p>
            <p className="text-sm text-slate-400">📏 최고 거리: <span className="font-bold text-cyan-400">{bestDistance}m</span></p>
            <p className="text-sm text-slate-400">⭐ 코인: <span className="font-bold text-yellow-400">{totalCoins}</span></p>
          </div>

          {/* Upgrades */}
          <div className="w-full max-w-sm space-y-2">
            <p className="text-sm font-bold text-cyan-400">🛒 업그레이드</p>
            {[
              { name: "보호막", emoji: "🛡️", desc: `시작 시 보호막 ${shieldLevel + 1}개`, level: shieldLevel, max: 3, cost: (shieldLevel + 1) * 50, buy: buyShield },
              { name: "자석", emoji: "🧲", desc: `코인 흡수 범위 증가 Lv.${magnetLevel + 1}`, level: magnetLevel, max: 3, cost: (magnetLevel + 1) * 40, buy: buyMagnet },
              { name: "코인 배율", emoji: "💰", desc: `코인 x${(1 + (coinMultLevel + 1) * 0.3).toFixed(1)}`, level: coinMultLevel, max: 3, cost: (coinMultLevel + 1) * 60, buy: buyCoinMult },
            ].map((up) => (
              <button
                key={up.name}
                onClick={up.buy}
                disabled={up.level >= up.max || totalCoins < up.cost}
                className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                  up.level >= up.max ? "border-green-500/30 bg-green-500/10 opacity-60" :
                  totalCoins >= up.cost ? "border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-95" :
                  "border-gray-700 bg-gray-900/50 opacity-40 cursor-not-allowed"
                }`}
              >
                <span className="text-2xl">{up.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold">{up.name} <span className="text-xs text-slate-400">Lv.{up.level}/{up.max}</span></p>
                  <p className="text-xs text-slate-400">{up.desc}</p>
                </div>
                {up.level >= up.max ? <span className="text-xs text-green-400 font-bold">MAX</span>
                  : <span className="text-xs text-yellow-400 font-bold">{up.cost}⭐</span>}
              </button>
            ))}
          </div>

          <div className="w-full max-w-sm rounded-xl bg-white/5 p-4 text-left text-sm text-slate-400 space-y-1">
            <p className="font-bold text-cyan-400">🎮 조작법</p>
            <p>📱 터치: 좌우 스와이프 또는 화면 좌/우 터치</p>
            <p>⌨️ 키보드: ← → 방향키 또는 A, D</p>
          </div>
        </div>
      )}

      {/* Playing */}
      {screen === "playing" && (
        <div className="flex min-h-screen flex-col items-center pt-2 px-2">
          {/* HUD */}
          <div className="mb-1 flex w-full max-w-[360px] items-center justify-between text-xs">
            <span className="rounded-lg bg-black/30 px-2 py-1">⭐ {coins}</span>
            <span className="rounded-lg bg-black/30 px-2 py-1">📏 {distance}m</span>
            <span className="rounded-lg bg-black/30 px-2 py-1 font-bold">{score}</span>
            {shield > 0 && <span className="rounded-lg bg-cyan-500/30 px-2 py-1">🛡️x{shield}</span>}
          </div>

          {/* Trick text */}
          {trickText && (
            <div className="absolute top-16 z-10 rounded-xl bg-black/50 px-4 py-2 text-lg font-black text-cyan-300">
              {trickText}
            </div>
          )}

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="rounded-2xl border-2 border-cyan-500/20 touch-none"
            style={{ width: CANVAS_W, height: CANVAS_H }}
            onClick={handleCanvasClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />

          {/* Left/Right buttons for mobile */}
          <div className="mt-2 flex w-full max-w-[360px] gap-2">
            <button
              onPointerDown={() => moveSurfer("left")}
              className="flex-1 rounded-xl bg-white/10 py-4 text-2xl font-black active:bg-white/20"
            >
              ◀️
            </button>
            <button
              onPointerDown={() => moveSurfer("right")}
              className="flex-1 rounded-xl bg-white/10 py-4 text-2xl font-black active:bg-white/20"
            >
              ▶️
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {screen === "result" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">🌊</div>
          <h2 className="text-4xl font-black text-cyan-400">파도에 휩쓸렸어요!</h2>

          <div className="rounded-xl bg-white/5 px-8 py-4 space-y-2">
            <p>🏆 점수: <span className="font-bold text-amber-400">{score}</span></p>
            <p>📏 거리: <span className="font-bold text-cyan-400">{distance}m</span></p>
            <p>⭐ 코인: <span className="font-bold text-yellow-400">{coins}</span></p>
            <p>🔥 최대 콤보: <span className="font-bold text-orange-400">{maxCombo}</span></p>
            {score >= bestScore && score > 0 && (
              <p className="text-amber-400 font-bold">🎉 최고 기록!</p>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
              🔄 다시하기
            </button>
            <button onClick={() => setScreen("menu")} className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
              메뉴로
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
