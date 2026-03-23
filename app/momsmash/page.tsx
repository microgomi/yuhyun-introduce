"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "playing" | "gameover";

interface Position {
  x: number;
  y: number;
}

interface Attack {
  id: number;
  x: number;
  y: number;
  type: "hand" | "slipper" | "hanger" | "pillow" | "ladle" | "broom";
  emoji: string;
  angle: number;
  speed: number;
  size: number;
  rotation: number;
  rotSpeed: number;
}

interface Warning {
  x: number;
  y: number;
  timer: number;
  type: Attack["type"];
}

interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: "shield" | "shrink" | "slow" | "heal";
  emoji: string;
}

// --- Constants ---
const W = 360;
const H = 560;
const PLAYER_SIZE = 24;
const TICK = 16;

const ATTACK_DEFS: { type: Attack["type"]; emoji: string; size: number; speed: number }[] = [
  { type: "hand", emoji: "🤚", size: 30, speed: 3 },
  { type: "slipper", emoji: "🩴", size: 26, speed: 3.5 },
  { type: "hanger", emoji: "🪝", size: 28, speed: 2.8 },
  { type: "pillow", emoji: "🛏️", size: 34, speed: 2.2 },
  { type: "ladle", emoji: "🥄", size: 24, speed: 4 },
  { type: "broom", emoji: "🧹", size: 32, speed: 2.5 },
];

const POWERUP_DEFS: { type: PowerUp["type"]; emoji: string }[] = [
  { type: "shield", emoji: "🛡️" },
  { type: "shrink", emoji: "🔮" },
  { type: "slow", emoji: "🐢" },
  { type: "heal", emoji: "❤️‍🩹" },
];

const MOM_QUOTES = [
  "야!! 거기 서!!",
  "이리 와봐!!!",
  "오늘 혼난다!",
  "등짝을 보자!!",
  "어딜 도망가!",
  "가만 안 둬!!",
  "숙제는 했어?!",
  "게임 그만 해!!",
  "방 청소는?!",
  "몇 시인 줄 알아?!",
];

let nextId = 0;

export default function MomSmashPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [hp, setHp] = useState(5);
  const [maxHp, setMaxHp] = useState(5);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [shieldActive, setShieldActive] = useState(false);
  const [shrinkActive, setShrinkActive] = useState(false);
  const [slowActive, setSlowActive] = useState(false);
  const [momQuote, setMomQuote] = useState("");
  const [wave, setWave] = useState(1);
  const [hitFlash, setHitFlash] = useState(false);
  const [dodgeCount, setDodgeCount] = useState(0);
  const [totalGames, setTotalGames] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const playingRef = useRef(false);
  const tickRef = useRef(0);

  const playerRef = useRef<Position>({ x: W / 2, y: H - 80 });
  const mouseRef = useRef<Position | null>(null);
  const attacksRef = useRef<Attack[]>([]);
  const warningsRef = useRef<Warning[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);

  const hpRef = useRef(5);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const shieldRef = useRef(false);
  const shrinkRef = useRef(false);
  const slowRef = useRef(false);
  const waveRef = useRef(1);
  const dodgeRef = useRef(0);

  const clearAnim = useCallback(() => cancelAnimationFrame(animRef.current), []);
  useEffect(() => () => clearAnim(), [clearAnim]);

  // Start game
  const startGame = useCallback(() => {
    playerRef.current = { x: W / 2, y: H - 80 };
    attacksRef.current = [];
    warningsRef.current = [];
    powerUpsRef.current = [];
    hpRef.current = 5;
    scoreRef.current = 0;
    comboRef.current = 0;
    shieldRef.current = false;
    shrinkRef.current = false;
    slowRef.current = false;
    waveRef.current = 1;
    dodgeRef.current = 0;
    tickRef.current = 0;
    nextId = 0;

    setHp(5);
    setMaxHp(5);
    setScore(0);
    setCombo(0);
    setShieldActive(false);
    setShrinkActive(false);
    setSlowActive(false);
    setMomQuote("");
    setWave(1);
    setHitFlash(false);
    setDodgeCount(0);

    playingRef.current = true;
    setScreen("playing");
    requestAnimationFrame(gameLoop);
  }, []);

  // Spawn attack with warning
  const spawnAttack = useCallback(() => {
    const w = waveRef.current;
    const count = Math.min(1 + Math.floor(w / 3), 5);

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const def = ATTACK_DEFS[Math.floor(Math.random() * Math.min(ATTACK_DEFS.length, 2 + Math.floor(w / 2)))];
        const side = Math.floor(Math.random() * 4); // 0:top 1:right 2:bottom 3:left
        let ax: number, ay: number, angle: number;

        const px = playerRef.current.x;
        const py = playerRef.current.y;

        switch (side) {
          case 0: // top
            ax = Math.random() * W;
            ay = -20;
            angle = Math.atan2(py - ay, px - ax);
            break;
          case 1: // right
            ax = W + 20;
            ay = Math.random() * H;
            angle = Math.atan2(py - ay, px - ax);
            break;
          case 2: // bottom
            ax = Math.random() * W;
            ay = H + 20;
            angle = Math.atan2(py - ay, px - ax);
            break;
          default: // left
            ax = -20;
            ay = Math.random() * H;
            angle = Math.atan2(py - ay, px - ax);
            break;
        }

        // Warning
        const targetX = px + (Math.random() - 0.5) * 40;
        const targetY = py + (Math.random() - 0.5) * 40;

        warningsRef.current.push({
          x: targetX,
          y: targetY,
          timer: 40,
          type: def.type,
        });

        // Delayed attack spawn
        setTimeout(() => {
          const speedMul = 1 + w * 0.08;
          const a: Attack = {
            id: ++nextId,
            x: ax, y: ay,
            type: def.type,
            emoji: def.emoji,
            angle: angle + (Math.random() - 0.5) * 0.3,
            speed: def.speed * speedMul * (slowRef.current ? 0.5 : 1),
            size: def.size,
            rotation: 0,
            rotSpeed: (Math.random() - 0.5) * 0.15,
          };
          attacksRef.current.push(a);
        }, 650);
      }, i * 200);
    }
  }, []);

  // Spawn power-up
  const spawnPowerUp = useCallback(() => {
    const def = POWERUP_DEFS[Math.floor(Math.random() * POWERUP_DEFS.length)];
    powerUpsRef.current.push({
      id: ++nextId,
      x: 40 + Math.random() * (W - 80),
      y: 40 + Math.random() * (H - 160),
      type: def.type,
      emoji: def.emoji,
    });
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!playingRef.current) return;
    tickRef.current++;
    const tick = tickRef.current;

    // Player movement toward mouse
    const mt = mouseRef.current;
    const spd = shrinkRef.current ? 5 : 4;
    if (mt) {
      const dx = mt.x - playerRef.current.x;
      const dy = mt.y - playerRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 4) {
        playerRef.current.x += (dx / dist) * spd;
        playerRef.current.y += (dy / dist) * spd;
      }
    }

    // Bounds
    const r = shrinkRef.current ? PLAYER_SIZE * 0.6 : PLAYER_SIZE;
    playerRef.current.x = Math.max(r / 2, Math.min(W - r / 2, playerRef.current.x));
    playerRef.current.y = Math.max(r / 2, Math.min(H - r / 2, playerRef.current.y));

    // Spawn attacks
    const spawnRate = Math.max(40, 100 - waveRef.current * 5);
    if (tick % spawnRate === 0) {
      spawnAttack();
    }

    // Spawn power-up every ~8 seconds
    if (tick % 500 === 250) {
      spawnPowerUp();
    }

    // Wave increase every ~12 seconds
    if (tick % 750 === 0) {
      waveRef.current++;
      setWave(waveRef.current);
      setMomQuote(MOM_QUOTES[Math.floor(Math.random() * MOM_QUOTES.length)]);
      setTimeout(() => setMomQuote(""), 2000);
    }

    // Update warnings
    warningsRef.current = warningsRef.current.filter((w) => {
      w.timer--;
      return w.timer > 0;
    });

    // Update attacks
    const playerSize = shrinkRef.current ? PLAYER_SIZE * 0.6 : PLAYER_SIZE;
    const alive: Attack[] = [];
    for (const a of attacksRef.current) {
      a.x += Math.cos(a.angle) * a.speed;
      a.y += Math.sin(a.angle) * a.speed;
      a.rotation += a.rotSpeed;

      // Out of bounds
      if (a.x < -60 || a.x > W + 60 || a.y < -60 || a.y > H + 60) {
        // Dodged!
        dodgeRef.current++;
        comboRef.current++;
        scoreRef.current += 10 + comboRef.current * 2;
        if (tick % 3 === 0) {
          setDodgeCount(dodgeRef.current);
          setCombo(comboRef.current);
          setScore(scoreRef.current);
        }
        continue;
      }

      // Collision with player
      const dx = a.x - playerRef.current.x;
      const dy = a.y - playerRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < (a.size + playerSize) / 2 - 4) {
        if (shieldRef.current) {
          shieldRef.current = false;
          setShieldActive(false);
        } else {
          hpRef.current--;
          setHp(hpRef.current);
          setHitFlash(true);
          setTimeout(() => setHitFlash(false), 200);
          comboRef.current = 0;
          setCombo(0);

          if (hpRef.current <= 0) {
            playingRef.current = false;
            setScore(scoreRef.current);
            setDodgeCount(dodgeRef.current);
            setBestScore((prev) => Math.max(prev, scoreRef.current));
            setBestCombo((prev) => Math.max(prev, comboRef.current));
            setTotalGames((g) => g + 1);
            setScreen("gameover");
            return;
          }
        }
        continue;
      }

      alive.push(a);
    }
    attacksRef.current = alive;

    // Power-up collection
    const remainPU: PowerUp[] = [];
    for (const pu of powerUpsRef.current) {
      const dx = pu.x - playerRef.current.x;
      const dy = pu.y - playerRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 22) {
        switch (pu.type) {
          case "shield":
            shieldRef.current = true;
            setShieldActive(true);
            break;
          case "shrink":
            shrinkRef.current = true;
            setShrinkActive(true);
            setTimeout(() => { shrinkRef.current = false; setShrinkActive(false); }, 6000);
            break;
          case "slow":
            slowRef.current = true;
            setSlowActive(true);
            attacksRef.current.forEach((a) => (a.speed *= 0.5));
            setTimeout(() => { slowRef.current = false; setSlowActive(false); }, 5000);
            break;
          case "heal":
            hpRef.current = Math.min(hpRef.current + 1, 5);
            setHp(hpRef.current);
            break;
        }
        scoreRef.current += 50;
        setScore(scoreRef.current);
        continue;
      }
      remainPU.push(pu);
    }
    powerUpsRef.current = remainPU;

    // Periodic state sync
    if (tick % 10 === 0) {
      setScore(scoreRef.current);
      setCombo(comboRef.current);
      setDodgeCount(dodgeRef.current);
    }

    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [spawnAttack, spawnPowerUp]);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#1a0a2e");
    gradient.addColorStop(0.5, "#2d1b4e");
    gradient.addColorStop(1, "#1a0a2e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // Floor pattern
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    for (let x = 0; x < W; x += 30) {
      for (let y = 0; y < H; y += 30) {
        if ((Math.floor(x / 30) + Math.floor(y / 30)) % 2 === 0) {
          ctx.fillRect(x, y, 30, 30);
        }
      }
    }

    // Warnings (red circles flashing)
    for (const w of warningsRef.current) {
      const alpha = Math.sin(w.timer * 0.4) * 0.3 + 0.3;
      ctx.fillStyle = `rgba(255,50,50,${alpha})`;
      ctx.beginPath();
      ctx.arc(w.x, w.y, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,100,100,${alpha + 0.2})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚠️", w.x, w.y);
    }

    // Power-ups
    for (const pu of powerUpsRef.current) {
      const bob = Math.sin(tickRef.current * 0.05 + pu.id) * 4;
      ctx.fillStyle = "rgba(255,255,100,0.15)";
      ctx.beginPath();
      ctx.arc(pu.x, pu.y + bob, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "22px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pu.emoji, pu.x, pu.y + bob);
    }

    // Attacks
    for (const a of attacksRef.current) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rotation);
      ctx.font = `${a.size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(a.emoji, 0, 0);
      ctx.restore();
    }

    // Player
    const px = playerRef.current.x;
    const py = playerRef.current.y;
    const playerSize = shrinkRef.current ? PLAYER_SIZE * 0.6 : PLAYER_SIZE;

    // Shield glow
    if (shieldRef.current) {
      ctx.fillStyle = "rgba(100,200,255,0.15)";
      ctx.beginPath();
      ctx.arc(px, py, playerSize + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(100,200,255,0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Shrink glow
    if (shrinkRef.current) {
      ctx.fillStyle = "rgba(200,100,255,0.15)";
      ctx.beginPath();
      ctx.arc(px, py, playerSize + 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = `${playerSize}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("😨", px, py);

    // Mom at top
    const momBob = Math.sin(tickRef.current * 0.03) * 5;
    ctx.font = "50px serif";
    ctx.fillText("😠", W / 2, 40 + momBob);

    // Mom speech bubble
    if (momQuote) {
      ctx.fillStyle = "rgba(255,50,50,0.85)";
      const tw = ctx.measureText(momQuote).width + 20;
      ctx.beginPath();
      ctx.roundRect(W / 2 - tw / 2, 72, tw, 26, 10);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(momQuote, W / 2, 85);
    }

    // Hit flash overlay
    if (hitFlash) {
      ctx.fillStyle = "rgba(255,0,0,0.25)";
      ctx.fillRect(0, 0, W, H);
    }

    // HP bar at bottom
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.roundRect(10, H - 30, W - 20, 20, 8);
    ctx.fill();
    for (let i = 0; i < hpRef.current; i++) {
      ctx.font = "14px serif";
      ctx.fillText("❤️", 25 + i * 22, H - 20);
    }
    for (let i = hpRef.current; i < 5; i++) {
      ctx.font = "14px serif";
      ctx.fillText("🖤", 25 + i * 22, H - 20);
    }

    // Score & combo top-left
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.roundRect(5, H - 56, 110, 22, 6);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`⭐ ${scoreRef.current}  🔥 ${comboRef.current}x`, 12, H - 44);
    ctx.textAlign = "center";
  }, [momQuote, hitFlash]);

  // Mouse handlers
  const screenToCanvas = useCallback((clientX: number, clientY: number): Position => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: W / 2, y: H / 2 };
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseRef.current = screenToCanvas(e.clientX, e.clientY);
  }, [screenToCanvas]);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = null;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    mouseRef.current = screenToCanvas(t.clientX, t.clientY);
  }, [screenToCanvas]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    mouseRef.current = screenToCanvas(t.clientX, t.clientY);
  }, [screenToCanvas]);

  const handleTouchEnd = useCallback(() => {
    mouseRef.current = null;
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-purple-950 via-rose-950 to-purple-950 text-white">
      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">← 홈</Link>

          <div className="text-7xl">😠✋💥</div>
          <h1 className="text-3xl font-black">
            <span className="bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">엄마의 등짝 스매싱</span>
          </h1>
          <p className="text-lg text-slate-400">엄마의 공격을 피해라!</p>

          <button onClick={startGame}
            className="rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 px-12 py-4 text-xl font-black shadow-lg shadow-red-500/30 transition-transform hover:scale-105 active:scale-95">
            🏃 도망치기!
          </button>

          {bestScore > 0 && (
            <div className="rounded-xl bg-white/5 px-8 py-4 space-y-1">
              <p className="text-sm text-slate-400">🏆 최고점수: <span className="font-bold text-amber-400">{bestScore}</span></p>
              <p className="text-sm text-slate-400">🔥 최고콤보: <span className="font-bold text-orange-400">{bestCombo}x</span></p>
              <p className="text-sm text-slate-400">🎮 플레이: <span className="font-bold text-cyan-400">{totalGames}회</span></p>
            </div>
          )}

          <div className="w-full max-w-sm rounded-xl bg-white/5 p-4 text-left text-xs text-slate-400 space-y-2">
            <p className="font-bold text-red-400">🎮 조작법</p>
            <p>🖱️ 마우스를 따라 이동</p>
            <p>📱 터치한 곳으로 이동</p>
            <p className="font-bold text-red-400 mt-2">🤚 공격 종류</p>
            <div className="grid grid-cols-3 gap-1 text-center">
              <span>🤚 손바닥</span>
              <span>🩴 슬리퍼</span>
              <span>🪝 옷걸이</span>
              <span>🛏️ 베개</span>
              <span>🥄 국자</span>
              <span>🧹 빗자루</span>
            </div>
            <p className="font-bold text-red-400 mt-2">💎 아이템</p>
            <div className="grid grid-cols-2 gap-1 text-center">
              <span>🛡️ 보호막</span>
              <span>🔮 작아지기</span>
              <span>🐢 슬로우</span>
              <span>❤️‍🩹 회복</span>
            </div>
          </div>
        </div>
      )}

      {/* Playing */}
      {screen === "playing" && (
        <div className="flex min-h-screen flex-col items-center pt-2 px-2">
          <div className="mb-1 flex w-full max-w-[360px] items-center justify-between text-xs">
            <span className="rounded-lg bg-black/30 px-2 py-1">⭐ {score}</span>
            <span className="rounded-lg bg-black/30 px-2 py-1">🔥 {combo}x 콤보</span>
            <span className="rounded-lg bg-black/30 px-2 py-1">🌊 {wave}단계</span>
          </div>

          <div className="mb-1 flex gap-1 text-xs">
            {shieldActive && <span className="rounded bg-blue-500/30 px-2 py-0.5 text-blue-300">🛡️ 보호막</span>}
            {shrinkActive && <span className="rounded bg-purple-500/30 px-2 py-0.5 text-purple-300">🔮 작아짐</span>}
            {slowActive && <span className="rounded bg-green-500/30 px-2 py-0.5 text-green-300">🐢 슬로우</span>}
          </div>

          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="rounded-2xl border-2 border-red-500/20 touch-none cursor-none"
            style={{ width: W, height: H }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>
      )}

      {/* Game Over */}
      {screen === "gameover" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">😠💢</div>
          <h2 className="text-4xl font-black text-red-400">등짝 스매싱!</h2>
          <p className="text-lg text-slate-300">엄마한테 잡혔다... 💫</p>

          <div className="rounded-xl bg-white/5 px-8 py-5 space-y-3">
            <p className="text-2xl font-black text-amber-400">⭐ {score}점</p>
            {score >= bestScore && score > 0 && (
              <p className="text-sm font-bold text-amber-400 animate-bounce">🏆 최고 기록!</p>
            )}
            <div className="space-y-1 text-sm">
              <p>🔥 최대 콤보: <span className="font-bold text-orange-400">{combo}x</span></p>
              <p>✨ 피한 횟수: <span className="font-bold text-cyan-400">{dodgeCount}회</span></p>
              <p>🌊 도달 단계: <span className="font-bold text-purple-400">{wave}단계</span></p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={startGame}
              className="rounded-xl bg-gradient-to-r from-red-500 to-pink-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
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
