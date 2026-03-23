"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "playing" | "gameover";

interface Car {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  emoji: string;
  lane: number;
}

interface Coin {
  id: number;
  x: number;
  y: number;
  type: "coin" | "gem" | "fuel" | "magnet" | "shield";
  emoji: string;
  collected: boolean;
}

// --- Constants ---
const W = 360;
const H = 600;
const LANE_COUNT = 4;
const LANE_W = W / LANE_COUNT;
const PLAYER_W = 36;
const PLAYER_H = 50;

const CARS: { emoji: string; w: number; h: number; color: string }[] = [
  { emoji: "🚗", w: 36, h: 50, color: "#e74c3c" },
  { emoji: "🚙", w: 36, h: 50, color: "#3498db" },
  { emoji: "🚕", w: 36, h: 50, color: "#f1c40f" },
  { emoji: "🚛", w: 40, h: 60, color: "#e67e22" },
  { emoji: "🚌", w: 42, h: 65, color: "#2ecc71" },
  { emoji: "🏎️", w: 38, h: 48, color: "#9b59b6" },
  { emoji: "🚒", w: 40, h: 58, color: "#c0392b" },
  { emoji: "🚐", w: 38, h: 55, color: "#1abc9c" },
];

const COIN_DEFS: { type: Coin["type"]; emoji: string; points: number; desc: string }[] = [
  { type: "coin", emoji: "🪙", points: 10, desc: "코인" },
  { type: "gem", emoji: "💎", points: 30, desc: "보석" },
  { type: "fuel", emoji: "⛽", points: 0, desc: "부스트" },
  { type: "shield", emoji: "🛡️", points: 0, desc: "보호막" },
];

let nid = 0;

export default function CarDodgePage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [message, setMessage] = useState("");
  const [shieldActive, setShieldActive] = useState(false);
  const [totalGames, setTotalGames] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const tickRef = useRef(0);
  const loopRef = useRef<() => void>(() => {});

  const playerRef = useRef({ x: W / 2, lane: 1 });
  const carsRef = useRef<Car[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const scoreRef = useRef(0);
  const coinCountRef = useRef(0);
  const distRef = useRef(0);
  const speedRef = useRef(4);
  const gameOverRef = useRef(false);
  const shieldRef = useRef(false);
  const boostRef = useRef(0);
  const comboRef = useRef(0);
  const mouseXRef = useRef(W / 2);
  const roadScrollRef = useRef(0);
  const nearMissRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const showMsg = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 1000);
  }, []);

  const startGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    playerRef.current = { x: W / 2, lane: 1 };
    carsRef.current = [];
    coinsRef.current = [];
    scoreRef.current = 0;
    coinCountRef.current = 0;
    distRef.current = 0;
    speedRef.current = 4;
    gameOverRef.current = false;
    shieldRef.current = false;
    boostRef.current = 0;
    comboRef.current = 0;
    nearMissRef.current = 0;
    mouseXRef.current = W / 2;
    roadScrollRef.current = 0;
    tickRef.current = 0;
    nid = 0;

    setScore(0);
    setCoins(0);
    setDistance(0);
    setSpeed(4);
    setMessage("");
    setShieldActive(false);
    setCombo(0);

    setScreen("playing");
    setTimeout(() => {
      animRef.current = requestAnimationFrame(loopRef.current);
    }, 50);
  }, []);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const tick = tickRef.current;

    // Road background
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(0, 0, W, H);

    // Road surface
    ctx.fillStyle = "#34495e";
    ctx.fillRect(10, 0, W - 20, H);

    // Grass sides
    ctx.fillStyle = "#27ae60";
    ctx.fillRect(0, 0, 12, H);
    ctx.fillRect(W - 12, 0, 12, H);

    // Road scroll
    const rs = roadScrollRef.current;

    // Lane dividers (dashed)
    ctx.strokeStyle = "#f1c40f";
    ctx.lineWidth = 3;
    ctx.setLineDash([30, 20]);
    for (let i = 1; i < LANE_COUNT; i++) {
      const lx = 10 + i * LANE_W;
      ctx.beginPath();
      ctx.moveTo(lx, -50 + (rs % 50));
      ctx.lineTo(lx, H + 50);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Road edge lines
    ctx.strokeStyle = "#ecf0f1";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(12, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W - 12, 0);
    ctx.lineTo(W - 12, H);
    ctx.stroke();

    // Trees on sides
    for (let i = 0; i < 8; i++) {
      const ty = ((i * 90 + rs * 0.3) % (H + 40)) - 20;
      ctx.font = "18px serif";
      ctx.textAlign = "center";
      ctx.fillText("🌳", 6, ty);
      ctx.fillText("🌳", W - 6, ty + 40);
    }

    // Coins
    for (const c of coinsRef.current) {
      if (c.collected) continue;
      const bob = Math.sin(tick * 0.1 + c.id) * 3;
      // Glow
      ctx.fillStyle = c.type === "gem" ? "rgba(100,100,255,0.2)" :
                       c.type === "fuel" ? "rgba(255,200,0,0.2)" :
                       c.type === "shield" ? "rgba(100,200,255,0.2)" :
                       "rgba(255,215,0,0.2)";
      ctx.beginPath();
      ctx.arc(c.x, c.y + bob, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "20px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(c.emoji, c.x, c.y + bob);
    }

    // Enemy cars
    for (const car of carsRef.current) {
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(car.x + car.w / 2, car.y + car.h - 2, car.w / 2 - 2, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `${car.h * 0.7}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(car.emoji, car.x + car.w / 2, car.y + car.h / 2);
    }

    // Player car
    const px = playerRef.current.x;
    const py = H - 100;

    // Boost effect
    if (boostRef.current > 0) {
      ctx.fillStyle = "rgba(255,150,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(px, py + 30, 20, 35, 0, 0, Math.PI * 2);
      ctx.fill();
      // Flames
      for (let i = 0; i < 3; i++) {
        const fx = px - 8 + i * 8 + (Math.random() - 0.5) * 4;
        const fy = py + 25 + Math.random() * 15;
        ctx.font = "12px serif";
        ctx.fillText("🔥", fx, fy);
      }
    }

    // Shield
    if (shieldRef.current) {
      ctx.strokeStyle = "rgba(100,200,255,0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(100,200,255,0.1)";
      ctx.fill();
    }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(px, py + 22, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "40px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🚘", px, py);

    // Near miss effect
    if (nearMissRef.current > 0) {
      ctx.fillStyle = `rgba(255,255,0,${nearMissRef.current * 0.02})`;
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(`아슬아슬! +${comboRef.current * 5}`, px, py - 40);
    }

    // Speed lines when fast
    if (speedRef.current > 6) {
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.3, (speedRef.current - 6) * 0.05)})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const sx = 20 + Math.random() * (W - 40);
        const sy = Math.random() * H;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy + 20 + speedRef.current * 3);
        ctx.stroke();
      }
    }

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.roundRect(0, 0, W, 32, [0, 0, 10, 10]);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`⭐ ${scoreRef.current}`, 10, 16);
    ctx.fillText(`🪙 ${coinCountRef.current}`, 90, 16);
    ctx.textAlign = "center";
    ctx.fillText(`${Math.floor(speedRef.current * 20)}km/h`, W / 2, 16);
    ctx.textAlign = "right";
    ctx.fillText(`📏 ${Math.floor(distRef.current)}m`, W - 10, 16);

    // Combo
    if (comboRef.current > 1) {
      ctx.fillStyle = "rgba(255,200,0,0.9)";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`🔥 ${comboRef.current}x 콤보!`, W / 2, 50);
    }
  }, []);

  // Game loop
  useEffect(() => {
    loopRef.current = () => {
      if (gameOverRef.current) return;

      tickRef.current++;
      const tick = tickRef.current;

      // Speed increases over time
      speedRef.current = Math.min(12, 4 + tick * 0.002);
      if (boostRef.current > 0) {
        boostRef.current--;
        speedRef.current = Math.min(15, speedRef.current * 1.5);
        if (boostRef.current <= 0) setMessage("");
      }
      const spd = speedRef.current;

      // Road scroll
      roadScrollRef.current += spd * 2;

      // Distance
      distRef.current += spd * 0.05;
      scoreRef.current = Math.floor(distRef.current) + coinCountRef.current * 10;

      // Player movement toward mouse
      const targetX = Math.max(10 + PLAYER_W / 2, Math.min(W - 10 - PLAYER_W / 2, mouseXRef.current));
      const dx = targetX - playerRef.current.x;
      if (Math.abs(dx) > 2) {
        playerRef.current.x += dx * 0.12;
      }

      // Spawn cars
      const spawnRate = Math.max(15, 45 - Math.floor(tick * 0.01));
      if (tick % spawnRate === 0) {
        const count = 1 + (Math.random() < 0.3 + tick * 0.0001 ? 1 : 0);
        const usedLanes = new Set<number>();
        for (let c = 0; c < count; c++) {
          let lane: number;
          let attempts = 0;
          do {
            lane = Math.floor(Math.random() * LANE_COUNT);
            attempts++;
          } while (usedLanes.has(lane) && attempts < 10);
          usedLanes.add(lane);

          const def = CARS[Math.floor(Math.random() * Math.min(CARS.length, 3 + Math.floor(tick / 500)))];
          const laneX = 10 + lane * LANE_W + LANE_W / 2 - def.w / 2;
          const carSpd = spd * (0.3 + Math.random() * 0.5);

          // Some cars come from behind (faster)
          const fromBehind = Math.random() < 0.2;
          carsRef.current.push({
            id: ++nid,
            x: laneX,
            y: fromBehind ? H + 20 + Math.random() * 100 : -def.h - 20 - Math.random() * 200,
            w: def.w, h: def.h,
            speed: fromBehind ? -carSpd * 0.6 : carSpd,
            emoji: def.emoji,
            lane,
          });
        }
      }

      // Spawn coins
      if (tick % 60 === 30) {
        const typeDefs = COIN_DEFS;
        const roll = Math.random();
        const def = roll < 0.6 ? typeDefs[0] : roll < 0.8 ? typeDefs[1] : roll < 0.93 ? typeDefs[2] : typeDefs[3];
        const lane = Math.floor(Math.random() * LANE_COUNT);
        coinsRef.current.push({
          id: ++nid,
          x: 10 + lane * LANE_W + LANE_W / 2,
          y: -20,
          type: def.type,
          emoji: def.emoji,
          collected: false,
        });
      }

      // Update cars
      carsRef.current = carsRef.current.filter((car) => {
        car.y += car.speed;
        return car.y > -100 && car.y < H + 100;
      });

      // Update coins
      for (const c of coinsRef.current) {
        if (!c.collected) c.y += spd;
      }
      coinsRef.current = coinsRef.current.filter((c) => !c.collected && c.y < H + 30);

      // Near miss tracking
      if (nearMissRef.current > 0) nearMissRef.current--;

      // Player collision with cars
      const px = playerRef.current.x;
      const py = H - 100;

      for (const car of carsRef.current) {
        const cx = car.x + car.w / 2;
        const cy = car.y + car.h / 2;
        const adx = Math.abs(px - cx);
        const ady = Math.abs(py - cy);

        // Near miss detection
        if (adx < (PLAYER_W + car.w) / 2 + 8 && ady < (PLAYER_H + car.h) / 2 + 8 &&
            adx > (PLAYER_W + car.w) / 2 - 6 && ady > (PLAYER_H + car.h) / 2 - 15) {
          if (nearMissRef.current <= 0) {
            comboRef.current++;
            scoreRef.current += comboRef.current * 5;
            nearMissRef.current = 30;
          }
        }

        // Actual collision
        if (adx < (PLAYER_W + car.w) / 2 - 8 && ady < (PLAYER_H + car.h) / 2 - 8) {
          if (shieldRef.current) {
            shieldRef.current = false;
            setShieldActive(false);
            showMsg("🛡️ 보호막 사용!");
            // Push car away
            car.y -= 50;
            continue;
          }

          gameOverRef.current = true;
          comboRef.current = 0;
          setScore(scoreRef.current);
          setCoins(coinCountRef.current);
          setDistance(Math.floor(distRef.current));
          setSpeed(Math.floor(speedRef.current * 20));
          setBestScore((p) => Math.max(p, scoreRef.current));
          setBestCombo((p) => Math.max(p, comboRef.current));
          setTotalGames((g) => g + 1);
          setCombo(comboRef.current);
          setScreen("gameover");
          draw();
          return;
        }
      }

      // Coin collection
      for (const c of coinsRef.current) {
        if (c.collected) continue;
        const cdx = Math.abs(px - c.x);
        const cdy = Math.abs(py - c.y);
        if (cdx < 22 && cdy < 22) {
          c.collected = true;
          const def = COIN_DEFS.find((d) => d.type === c.type)!;
          if (def.points > 0) {
            scoreRef.current += def.points;
            coinCountRef.current++;
          }
          switch (c.type) {
            case "coin":
              showMsg("🪙 +10");
              break;
            case "gem":
              showMsg("💎 +30");
              break;
            case "fuel":
              boostRef.current = 120;
              showMsg("⛽ 부스트!");
              break;
            case "shield":
              shieldRef.current = true;
              setShieldActive(true);
              showMsg("🛡️ 보호막!");
              break;
          }
        }
      }

      // Sync state
      if (tick % 5 === 0) {
        setScore(scoreRef.current);
        setCoins(coinCountRef.current);
        setDistance(Math.floor(distRef.current));
        setSpeed(Math.floor(speedRef.current * 20));
        setCombo(comboRef.current);
      }

      draw();
      animRef.current = requestAnimationFrame(loopRef.current);
    };
  }, [draw, showMsg]);

  // Mouse/touch
  const getCanvasX = useCallback((clientX: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return W / 2;
    const rect = canvas.getBoundingClientRect();
    return clientX - rect.left;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseXRef.current = getCanvasX(e.clientX);
  }, [getCanvasX]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    mouseXRef.current = getCanvasX(e.touches[0].clientX);
  }, [getCanvasX]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    mouseXRef.current = getCanvasX(e.touches[0].clientX);
  }, [getCanvasX]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">← 홈</Link>

          <div className="text-7xl">🚘💨</div>
          <h1 className="text-4xl font-black">
            <span className="bg-gradient-to-r from-yellow-400 to-red-400 bg-clip-text text-transparent">차 피하기</span>
          </h1>
          <p className="text-lg text-slate-400">달려오는 차를 피해 최대한 멀리!</p>

          <button onClick={startGame}
            className="rounded-2xl bg-gradient-to-r from-yellow-500 to-red-500 px-12 py-4 text-xl font-black shadow-lg shadow-red-500/30 transition-transform hover:scale-105 active:scale-95">
            🏁 출발!
          </button>

          {bestScore > 0 && (
            <div className="rounded-xl bg-white/5 px-8 py-4 space-y-1">
              <p className="text-sm text-slate-400">🏆 최고점수: <span className="font-bold text-amber-400">{bestScore}</span></p>
              <p className="text-sm text-slate-400">🔥 최고콤보: <span className="font-bold text-orange-400">{bestCombo}x</span></p>
              <p className="text-sm text-slate-400">🎮 플레이: <span className="font-bold text-cyan-400">{totalGames}회</span></p>
            </div>
          )}

          <div className="w-full max-w-sm rounded-xl bg-white/5 p-4 text-left text-xs text-slate-400 space-y-2">
            <p className="font-bold text-yellow-400">🎮 조작법</p>
            <p>🖱️ 마우스로 좌우 이동</p>
            <p>📱 터치로 좌우 이동</p>
            <p className="font-bold text-yellow-400 mt-2">💡 팁</p>
            <p>🪙 코인과 💎 보석을 모아 점수 UP!</p>
            <p>⛽ 부스트로 속도 UP! 🛡️ 보호막으로 1회 보호!</p>
            <p>🔥 차를 아슬아슬하게 피하면 콤보 보너스!</p>
          </div>
        </div>
      )}

      {/* Playing */}
      {screen === "playing" && (
        <div className="flex min-h-screen flex-col items-center pt-1 px-2">
          {message && (
            <div className="mb-1 rounded-lg bg-white/10 px-4 py-1 text-center text-sm font-bold animate-pulse">{message}</div>
          )}

          {shieldActive && (
            <div className="mb-1 rounded bg-cyan-500/20 px-3 py-0.5 text-xs text-cyan-300 font-bold">🛡️ 보호막 활성</div>
          )}

          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="rounded-2xl border-2 border-yellow-500/20 touch-none cursor-none"
            style={{ width: W, height: H }}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
          />
        </div>
      )}

      {/* Game Over */}
      {screen === "gameover" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <div className="text-7xl">💥🚗</div>
          <h2 className="text-4xl font-black text-red-400">충돌!</h2>
          <p className="text-lg text-slate-400">차에 부딪혔어요...</p>

          <div className="rounded-xl bg-white/5 px-8 py-5 space-y-2">
            <p className="text-3xl font-black text-amber-400">⭐ {score}점</p>
            {score >= bestScore && score > 0 && (
              <p className="text-sm font-bold text-amber-400 animate-bounce">🏆 최고 기록!</p>
            )}
            <div className="text-sm text-slate-400 space-y-1">
              <p>📏 거리: {distance}m</p>
              <p>🪙 코인: {coins}개</p>
              <p>🏎️ 최고속도: {speed}km/h</p>
              <p>🔥 콤보: {combo}x</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={startGame}
              className="rounded-xl bg-gradient-to-r from-yellow-500 to-red-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
              🔄 다시하기
            </button>
            <button onClick={() => setScreen("menu")}
              className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
              메뉴
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
