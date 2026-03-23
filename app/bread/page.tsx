"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "playing" | "gameover";

interface Bread {
  id: number;
  x: number;
  y: number;
  type: number;
  speed: number;
  rotation: number;
  rotSpeed: number;
}

interface BadItem {
  id: number;
  x: number;
  y: number;
  type: number;
  speed: number;
}

interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: "magnet" | "double" | "slow" | "big";
  emoji: string;
  speed: number;
}

// --- Constants ---
const W = 360;
const H = 580;
const PLAYER_SIZE = 40;

const BREAD_DEFS = [
  { emoji: "🍞", name: "식빵", points: 10 },
  { emoji: "🥐", name: "크루아상", points: 15 },
  { emoji: "🥖", name: "바게트", points: 12 },
  { emoji: "🥯", name: "베이글", points: 13 },
  { emoji: "🧁", name: "컵케이크", points: 20 },
  { emoji: "🍩", name: "도넛", points: 18 },
  { emoji: "🍰", name: "케이크", points: 25 },
  { emoji: "🥧", name: "파이", points: 22 },
  { emoji: "🍪", name: "쿠키", points: 8 },
  { emoji: "🎂", name: "생일케이크", points: 50 },
];

const BAD_DEFS = [
  { emoji: "🧅", name: "양파", penalty: -15 },
  { emoji: "🌶️", name: "고추", penalty: -20 },
  { emoji: "💣", name: "폭탄", penalty: -30 },
  { emoji: "🗑️", name: "쓰레기", penalty: -25 },
];

const POWERUP_DEFS: { type: PowerUp["type"]; emoji: string; desc: string }[] = [
  { type: "magnet", emoji: "🧲", desc: "자석" },
  { type: "double", emoji: "✖️2️⃣", desc: "2배" },
  { type: "slow", emoji: "🐢", desc: "슬로우" },
  { type: "big", emoji: "🔍", desc: "입 크게" },
];

let nid = 0;

export default function BreadPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [breadCount, setBreadCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [hp, setHp] = useState(5);
  const [message, setMessage] = useState("");
  const [totalGames, setTotalGames] = useState(0);
  const [activePower, setActivePower] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const tickRef = useRef(0);
  const loopRef = useRef<() => void>(() => {});

  const playerRef = useRef({ x: W / 2 });
  const breadsRef = useRef<Bread[]>([]);
  const badsRef = useRef<BadItem[]>([]);
  const powersRef = useRef<PowerUp[]>([]);
  const scoreRef = useRef(0);
  const hpRef = useRef(5);
  const breadCountRef = useRef(0);
  const comboRef = useRef(0);
  const gameOverRef = useRef(false);
  const mouseXRef = useRef(W / 2);

  // Power-up states
  const magnetRef = useRef(0);
  const doubleRef = useRef(0);
  const slowRef = useRef(0);
  const bigRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const showMsg = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 800);
  }, []);

  const startGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    playerRef.current = { x: W / 2 };
    breadsRef.current = [];
    badsRef.current = [];
    powersRef.current = [];
    scoreRef.current = 0;
    hpRef.current = 5;
    breadCountRef.current = 0;
    comboRef.current = 0;
    gameOverRef.current = false;
    mouseXRef.current = W / 2;
    magnetRef.current = 0;
    doubleRef.current = 0;
    slowRef.current = 0;
    bigRef.current = 0;
    tickRef.current = 0;
    nid = 0;

    setScore(0);
    setHp(5);
    setBreadCount(0);
    setCombo(0);
    setMessage("");
    setActivePower("");

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

    // Background - bakery
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#FFF8DC");
    bg.addColorStop(0.5, "#FAEBD7");
    bg.addColorStop(1, "#DEB887");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Shelf lines
    ctx.strokeStyle = "rgba(139,90,43,0.15)";
    ctx.lineWidth = 1;
    for (let y = 80; y < H; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Bakery wall pattern
    ctx.fillStyle = "rgba(139,90,43,0.04)";
    for (let x = 0; x < W; x += 30) {
      for (let y = 0; y < H; y += 30) {
        if ((Math.floor(x / 30) + Math.floor(y / 30)) % 2 === 0) {
          ctx.fillRect(x, y, 30, 30);
        }
      }
    }

    // Falling breads
    for (const b of breadsRef.current) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rotation);
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.beginPath();
      ctx.ellipse(3, 3, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "28px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(BREAD_DEFS[b.type].emoji, 0, 0);
      ctx.restore();
    }

    // Bad items
    for (const b of badsRef.current) {
      ctx.font = "26px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(BAD_DEFS[b.type].emoji, b.x, b.y);
    }

    // Power-ups
    for (const p of powersRef.current) {
      const bob = Math.sin(tick * 0.1 + p.id) * 3;
      ctx.fillStyle = "rgba(255,215,0,0.2)";
      ctx.beginPath();
      ctx.arc(p.x, p.y + bob, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "22px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.emoji, p.x, p.y + bob);
    }

    // Player (mouth)
    const px = playerRef.current.x;
    const py = H - 50;
    const mouthSize = bigRef.current > 0 ? PLAYER_SIZE * 1.6 : PLAYER_SIZE;

    // Magnet aura
    if (magnetRef.current > 0) {
      ctx.strokeStyle = `rgba(100,150,255,${0.3 + Math.sin(tick * 0.1) * 0.15})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, mouthSize + 20, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Mouth open animation
    const openAmt = Math.sin(tick * 0.15) * 0.15 + 0.85;
    ctx.font = `${mouthSize * openAmt}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("😮", px, py);

    // Big mouth indicator
    if (bigRef.current > 0) {
      ctx.fillStyle = "rgba(255,200,0,0.15)";
      ctx.beginPath();
      ctx.arc(px, py, mouthSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // HUD
    ctx.fillStyle = "rgba(139,90,43,0.85)";
    ctx.beginPath();
    ctx.roundRect(0, 0, W, 36, [0, 0, 10, 10]);
    ctx.fill();

    ctx.fillStyle = "#FFF8DC";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`⭐ ${scoreRef.current}`, 10, 18);
    ctx.fillText(`🍞 ${breadCountRef.current}`, 90, 18);
    ctx.textAlign = "center";
    if (comboRef.current > 1) {
      ctx.fillStyle = "#FFD700";
      ctx.fillText(`🔥 ${comboRef.current}x`, W / 2, 18);
    }
    ctx.textAlign = "right";
    ctx.fillStyle = "#FFF8DC";
    // HP hearts
    let hpStr = "";
    for (let i = 0; i < 5; i++) hpStr += i < hpRef.current ? "❤️" : "🖤";
    ctx.font = "11px serif";
    ctx.fillText(hpStr, W - 8, 18);

    // Double score indicator
    if (doubleRef.current > 0) {
      ctx.fillStyle = "rgba(255,215,0,0.9)";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✖️2 점수 2배!", W / 2, 52);
    }
    if (slowRef.current > 0) {
      ctx.fillStyle = "rgba(100,200,255,0.9)";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🐢 슬로우!", W / 2 - 60, 52);
    }
  }, []);

  // Game loop
  useEffect(() => {
    loopRef.current = () => {
      if (gameOverRef.current) return;
      tickRef.current++;
      const tick = tickRef.current;

      // Difficulty
      const diff = Math.min(10, 1 + tick * 0.001);
      const baseSpeed = 2 + diff * 0.4;
      const slowMul = slowRef.current > 0 ? 0.5 : 1;

      // Player movement
      const targetX = Math.max(PLAYER_SIZE / 2, Math.min(W - PLAYER_SIZE / 2, mouseXRef.current));
      const dx = targetX - playerRef.current.x;
      playerRef.current.x += dx * 0.15;

      // Spawn breads
      const breadRate = Math.max(12, 35 - Math.floor(diff * 2));
      if (tick % breadRate === 0) {
        const count = 1 + (Math.random() < diff * 0.05 ? 1 : 0);
        for (let i = 0; i < count; i++) {
          const type = Math.floor(Math.random() * Math.min(BREAD_DEFS.length, 4 + Math.floor(diff)));
          breadsRef.current.push({
            id: ++nid,
            x: 20 + Math.random() * (W - 40),
            y: -20 - i * 40,
            type,
            speed: (baseSpeed + Math.random() * 1.5) * slowMul,
            rotation: 0,
            rotSpeed: (Math.random() - 0.5) * 0.08,
          });
        }
      }

      // Spawn bad items
      const badRate = Math.max(40, 90 - Math.floor(diff * 5));
      if (tick % badRate === Math.floor(badRate / 2)) {
        const type = Math.floor(Math.random() * BAD_DEFS.length);
        badsRef.current.push({
          id: ++nid,
          x: 20 + Math.random() * (W - 40),
          y: -20,
          type,
          speed: (baseSpeed + Math.random()) * slowMul,
        });
      }

      // Spawn power-ups
      if (tick % 400 === 200) {
        const def = POWERUP_DEFS[Math.floor(Math.random() * POWERUP_DEFS.length)];
        powersRef.current.push({
          id: ++nid,
          x: 30 + Math.random() * (W - 60),
          y: -20,
          type: def.type,
          emoji: def.emoji,
          speed: 1.5 * slowMul,
        });
      }

      // Update power-up timers
      if (magnetRef.current > 0) magnetRef.current--;
      if (doubleRef.current > 0) doubleRef.current--;
      if (slowRef.current > 0) {
        slowRef.current--;
        if (slowRef.current <= 0) setActivePower("");
      }
      if (bigRef.current > 0) bigRef.current--;

      const px = playerRef.current.x;
      const py = H - 50;
      const catchRadius = bigRef.current > 0 ? PLAYER_SIZE * 1.6 : PLAYER_SIZE;

      // Magnet effect - attract breads
      if (magnetRef.current > 0) {
        for (const b of breadsRef.current) {
          const mdx = px - b.x;
          const mdy = py - b.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 120 && mdist > 5) {
            b.x += (mdx / mdist) * 3;
            b.y += (mdy / mdist) * 2;
          }
        }
      }

      // Update breads
      const aliveBread: Bread[] = [];
      for (const b of breadsRef.current) {
        b.y += b.speed;
        b.rotation += b.rotSpeed;

        // Catch check
        const bdx = Math.abs(b.x - px);
        const bdy = Math.abs(b.y - py);
        if (bdx < catchRadius && bdy < catchRadius * 0.8) {
          const def = BREAD_DEFS[b.type];
          const mul = doubleRef.current > 0 ? 2 : 1;
          const comboBonus = Math.floor(comboRef.current * 0.5);
          const pts = (def.points + comboBonus) * mul;

          scoreRef.current += pts;
          breadCountRef.current++;
          comboRef.current++;
          continue;
        }

        // Fell off screen
        if (b.y > H + 20) {
          comboRef.current = 0;
          continue;
        }

        aliveBread.push(b);
      }
      breadsRef.current = aliveBread;

      // Update bad items
      const aliveBad: BadItem[] = [];
      for (const b of badsRef.current) {
        b.y += b.speed;

        const bdx = Math.abs(b.x - px);
        const bdy = Math.abs(b.y - py);
        if (bdx < catchRadius * 0.7 && bdy < catchRadius * 0.6) {
          const def = BAD_DEFS[b.type];
          hpRef.current--;
          setHp(hpRef.current);
          comboRef.current = 0;
          showMsg(`${def.emoji} ${def.name}! ${def.penalty}점`);
          scoreRef.current = Math.max(0, scoreRef.current + def.penalty);

          if (hpRef.current <= 0) {
            gameOverRef.current = true;
            setScore(scoreRef.current);
            setBreadCount(breadCountRef.current);
            setCombo(comboRef.current);
            setBestScore((p) => Math.max(p, scoreRef.current));
            setBestCombo((p) => Math.max(p, comboRef.current));
            setTotalGames((g) => g + 1);
            setScreen("gameover");
            draw();
            return;
          }
          continue;
        }

        if (b.y > H + 20) continue;
        aliveBad.push(b);
      }
      badsRef.current = aliveBad;

      // Update power-ups
      const alivePow: PowerUp[] = [];
      for (const p of powersRef.current) {
        p.y += p.speed;

        const pdx = Math.abs(p.x - px);
        const pdy = Math.abs(p.y - py);
        if (pdx < 25 && pdy < 25) {
          switch (p.type) {
            case "magnet":
              magnetRef.current = 300;
              showMsg("🧲 자석! 빵이 끌려와!");
              break;
            case "double":
              doubleRef.current = 360;
              showMsg("✖️2 점수 2배!");
              break;
            case "slow":
              slowRef.current = 300;
              showMsg("🐢 슬로우!");
              break;
            case "big":
              bigRef.current = 300;
              showMsg("🔍 입 크게!");
              break;
          }
          scoreRef.current += 5;
          continue;
        }

        if (p.y > H + 20) continue;
        alivePow.push(p);
      }
      powersRef.current = alivePow;

      // Sync
      if (tick % 4 === 0) {
        setScore(scoreRef.current);
        setBreadCount(breadCountRef.current);
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
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-amber-100 via-orange-50 to-amber-200 text-zinc-900">
      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-black/10 px-3 py-1 text-sm hover:bg-black/20">← 홈</Link>

          <div className="text-7xl">🍞😮🥐</div>
          <h1 className="text-4xl font-black">
            <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">빵 먹기</span>
          </h1>
          <p className="text-lg text-zinc-500">떨어지는 빵을 먹어라!</p>

          <button onClick={startGame}
            className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-12 py-4 text-xl font-black text-white shadow-lg shadow-amber-500/30 transition-transform hover:scale-105 active:scale-95">
            🍞 냠냠!
          </button>

          {bestScore > 0 && (
            <div className="rounded-xl bg-white/80 px-8 py-4 space-y-1">
              <p className="text-sm text-zinc-500">🏆 최고점수: <span className="font-bold text-amber-600">{bestScore}</span></p>
              <p className="text-sm text-zinc-500">🔥 최고콤보: <span className="font-bold text-orange-500">{bestCombo}x</span></p>
              <p className="text-sm text-zinc-500">🎮 플레이: <span className="font-bold text-amber-600">{totalGames}회</span></p>
            </div>
          )}

          <div className="w-full max-w-sm rounded-xl bg-white/80 p-4 text-left text-xs text-zinc-500 space-y-2">
            <p className="font-bold text-amber-600">🎮 조작법</p>
            <p>🖱️ 마우스로 좌우 이동</p>
            <p>📱 터치로 좌우 이동</p>
            <p className="font-bold text-amber-600 mt-2">🍞 빵 종류</p>
            <div className="grid grid-cols-2 gap-1 text-center">
              {BREAD_DEFS.slice(0, 8).map((b, i) => (
                <span key={i}>{b.emoji} {b.name} +{b.points}</span>
              ))}
            </div>
            <p className="font-bold text-red-500 mt-2">⚠️ 조심!</p>
            <div className="grid grid-cols-2 gap-1 text-center">
              {BAD_DEFS.map((b, i) => (
                <span key={i}>{b.emoji} {b.name} {b.penalty}</span>
              ))}
            </div>
            <p className="font-bold text-amber-600 mt-2">💎 아이템</p>
            <div className="grid grid-cols-2 gap-1 text-center">
              <span>🧲 자석</span>
              <span>✖️2 점수2배</span>
              <span>🐢 슬로우</span>
              <span>🔍 입크게</span>
            </div>
          </div>
        </div>
      )}

      {/* Playing */}
      {screen === "playing" && (
        <div className="flex min-h-screen flex-col items-center pt-1 px-2">
          {message && (
            <div className="mb-1 rounded-lg bg-white/80 px-4 py-1 text-center text-sm font-bold">{message}</div>
          )}

          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="rounded-2xl border-2 border-amber-400/30 touch-none cursor-none"
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
          <div className="text-7xl">😵🍞</div>
          <h2 className="text-4xl font-black text-red-500">배 터짐!</h2>
          <p className="text-lg text-zinc-500">나쁜 음식을 너무 많이 먹었어요...</p>

          <div className="rounded-xl bg-white/80 px-8 py-5 space-y-2">
            <p className="text-3xl font-black text-amber-600">⭐ {score}점</p>
            {score >= bestScore && score > 0 && (
              <p className="text-sm font-bold text-amber-500 animate-bounce">🏆 최고 기록!</p>
            )}
            <div className="text-sm text-zinc-500 space-y-1">
              <p>🍞 먹은 빵: {breadCount}개</p>
              <p>🔥 최대 콤보: {combo}x</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={startGame}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3 font-bold text-white transition-transform hover:scale-105 active:scale-95">
              🔄 다시하기
            </button>
            <button onClick={() => setScreen("menu")}
              className="rounded-xl bg-zinc-200 px-8 py-3 font-bold text-zinc-600 transition-transform hover:scale-105 active:scale-95">
              메뉴
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
