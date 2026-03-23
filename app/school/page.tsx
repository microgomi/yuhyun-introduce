"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "playing" | "arrived" | "late";

interface Obstacle {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  emoji: string;
  speed: number;
}

interface Item {
  id: number;
  x: number;
  y: number;
  type: "bread" | "book" | "friend" | "clock" | "star";
  emoji: string;
  collected: boolean;
}

interface Lane {
  y: number;
  label: string;
}

// --- Constants ---
const W = 360;
const H = 520;
const PLAYER_W = 28;
const PLAYER_H = 28;
const LANE_COUNT = 5;
const LANE_H = 70;
const LANE_TOP = 100;

const LANES: Lane[] = Array.from({ length: LANE_COUNT }, (_, i) => ({
  y: LANE_TOP + i * LANE_H + LANE_H / 2,
  label: ["인도", "도로", "횡단보도", "도로", "인도"][i],
}));

const OBSTACLE_DEFS = [
  { type: "car_r", emoji: "🚗", w: 40, h: 24, speed: 2.5, lanes: [1, 3] },
  { type: "car_l", emoji: "🚙", w: 40, h: 24, speed: -2.2, lanes: [1, 3] },
  { type: "truck", emoji: "🚛", w: 50, h: 26, speed: 1.8, lanes: [1, 3] },
  { type: "bus", emoji: "🚌", w: 55, h: 26, speed: 2.0, lanes: [1, 3] },
  { type: "bike", emoji: "🚲", w: 30, h: 22, speed: 3.0, lanes: [0, 2, 4] },
  { type: "dog", emoji: "🐕", w: 26, h: 22, speed: 1.5, lanes: [0, 4] },
  { type: "puddle", emoji: "💧", w: 30, h: 20, speed: 0, lanes: [0, 2, 4] },
  { type: "cone", emoji: "🔶", w: 20, h: 20, speed: 0, lanes: [0, 1, 2, 3, 4] },
];

const ITEM_DEFS: { type: Item["type"]; emoji: string; points: number; desc: string }[] = [
  { type: "bread", emoji: "🍞", points: 15, desc: "아침빵" },
  { type: "book", emoji: "📚", points: 20, desc: "교과서" },
  { type: "friend", emoji: "👋", points: 25, desc: "친구" },
  { type: "clock", emoji: "⏰", points: 0, desc: "+3초" },
  { type: "star", emoji: "⭐", points: 50, desc: "별" },
];

const DAY_NAMES = ["월요일", "화요일", "수요일", "목요일", "금요일"];

let nid = 0;

export default function SchoolPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [day, setDay] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState(3);
  const [items, setItems] = useState({ bread: 0, book: 0, friend: 0 });
  const [totalDays, setTotalDays] = useState(0);
  const [hitFlash, setHitFlash] = useState(false);
  const [distance, setDistance] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const tickRef = useRef(0);
  const loopRef = useRef<() => void>(() => {});

  const playerRef = useRef({ x: 30, lane: 2, y: LANES[2].y });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const scoreRef = useRef(0);
  const hpRef = useRef(3);
  const timeRef = useRef(30);
  const distRef = useRef(0);
  const dayRef = useRef(0);
  const gameOverRef = useRef(false);
  const invincibleRef = useRef(0);
  const scrollRef = useRef(0);
  const targetLaneRef = useRef(2);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const collectedRef = useRef({ bread: 0, book: 0, friend: 0 });

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const showMsg = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 1200);
  }, []);

  // Start a day
  const startDay = useCallback((d: number) => {
    dayRef.current = d;
    setDay(d);
    playerRef.current = { x: 30, lane: 2, y: LANES[2].y };
    targetLaneRef.current = 2;
    obstaclesRef.current = [];
    itemsRef.current = [];
    scoreRef.current = 0;
    hpRef.current = 3;
    timeRef.current = 30 - d * 2; // harder days = less time
    distRef.current = 0;
    invincibleRef.current = 0;
    scrollRef.current = 0;
    tickRef.current = 0;
    gameOverRef.current = false;
    collectedRef.current = { bread: 0, book: 0, friend: 0 };
    nid = 0;

    setScore(0);
    setHp(3);
    setTimeLeft(30 - d * 2);
    setDistance(0);
    setItems({ bread: 0, book: 0, friend: 0 });
    setMessage("");
    setHitFlash(false);

    setScreen("playing");
    setTimeout(() => {
      animRef.current = requestAnimationFrame(loopRef.current);
    }, 50);
  }, []);

  // Spawn obstacles
  const spawnObstacle = useCallback(() => {
    const d = dayRef.current;
    const count = 1 + Math.floor(Math.random() * (1 + d * 0.5));
    for (let i = 0; i < count; i++) {
      const def = OBSTACLE_DEFS[Math.floor(Math.random() * OBSTACLE_DEFS.length)];
      const lane = def.lanes[Math.floor(Math.random() * def.lanes.length)];
      const speedMul = 1 + d * 0.15;
      const fromRight = def.speed >= 0 ? true : false;
      obstaclesRef.current.push({
        id: ++nid,
        x: fromRight ? W + 20 + Math.random() * 60 : -20 - def.w - Math.random() * 60,
        y: LANES[lane].y - def.h / 2,
        w: def.w, h: def.h,
        type: def.type,
        emoji: def.emoji,
        speed: def.speed === 0 ? 0 : (def.speed > 0 ? def.speed : def.speed) * speedMul,
      });
    }
  }, []);

  // Spawn items
  const spawnItem = useCallback(() => {
    const def = ITEM_DEFS[Math.floor(Math.random() * ITEM_DEFS.length)];
    const lane = Math.floor(Math.random() * LANE_COUNT);
    itemsRef.current.push({
      id: ++nid,
      x: W + 20 + Math.random() * 100,
      y: LANES[lane].y,
      type: def.type,
      emoji: def.emoji,
      collected: false,
    });
  }, []);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, LANE_TOP);
    sky.addColorStop(0, "#87CEEB");
    sky.addColorStop(1, "#B0E0E6");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, LANE_TOP);

    // Sun
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(W - 40, 35, 20, 0, Math.PI * 2);
    ctx.fill();

    // Clouds
    const scroll = scrollRef.current;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (let i = 0; i < 3; i++) {
      const cx = ((i * 150 + 50 - scroll * 0.2) % (W + 80)) - 40;
      ctx.beginPath();
      ctx.arc(cx, 25 + i * 15, 15, 0, Math.PI * 2);
      ctx.arc(cx + 15, 20 + i * 15, 18, 0, Math.PI * 2);
      ctx.arc(cx + 30, 25 + i * 15, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Buildings in background
    ctx.fillStyle = "#aab";
    const bw = 40;
    for (let i = 0; i < 12; i++) {
      const bx = ((i * bw * 1.5 - scroll * 0.3) % (W + bw * 2)) - bw;
      const bh = 30 + (i * 17) % 40;
      ctx.fillRect(bx, LANE_TOP - bh, bw, bh);
      // Windows
      ctx.fillStyle = "#ffd";
      for (let wy = LANE_TOP - bh + 5; wy < LANE_TOP - 5; wy += 10) {
        for (let wx = bx + 5; wx < bx + bw - 5; wx += 12) {
          ctx.fillRect(wx, wy, 6, 6);
        }
      }
      ctx.fillStyle = "#aab";
    }

    // Lanes
    for (let i = 0; i < LANE_COUNT; i++) {
      const ly = LANE_TOP + i * LANE_H;
      if (i === 1 || i === 3) {
        // Road
        ctx.fillStyle = "#444";
        ctx.fillRect(0, ly, W, LANE_H);
        // Road lines
        ctx.strokeStyle = "#FFD700";
        ctx.setLineDash([20, 15]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, ly + LANE_H / 2);
        ctx.lineTo(W, ly + LANE_H / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (i === 2) {
        // Crosswalk
        ctx.fillStyle = "#555";
        ctx.fillRect(0, ly, W, LANE_H);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        for (let sx = -((scroll * 0.5) % 30); sx < W; sx += 30) {
          ctx.fillRect(sx, ly + 5, 15, LANE_H - 10);
        }
      } else {
        // Sidewalk
        ctx.fillStyle = "#d4c4a8";
        ctx.fillRect(0, ly, W, LANE_H);
        ctx.fillStyle = "rgba(0,0,0,0.05)";
        for (let sx = -((scroll * 0.5) % 40); sx < W; sx += 40) {
          ctx.strokeStyle = "rgba(0,0,0,0.1)";
          ctx.lineWidth = 1;
          ctx.strokeRect(sx, ly, 40, LANE_H);
        }
      }
    }

    // School at right edge (visible when close)
    const schoolDist = 1000 - distRef.current;
    if (schoolDist < W) {
      const sx = W - schoolDist;
      ctx.fillStyle = "#E8D5B7";
      ctx.fillRect(sx, LANE_TOP - 60, 80, 60 + LANE_COUNT * LANE_H);
      ctx.fillStyle = "#C04040";
      // Roof
      ctx.beginPath();
      ctx.moveTo(sx - 5, LANE_TOP - 60);
      ctx.lineTo(sx + 40, LANE_TOP - 90);
      ctx.lineTo(sx + 85, LANE_TOP - 60);
      ctx.fill();
      ctx.font = "30px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🏫", sx + 40, LANE_TOP + 80);
      ctx.fillStyle = "#333";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText("청덕초등학교", sx + 40, LANE_TOP + 130);
    }

    // Items
    for (const item of itemsRef.current) {
      if (item.collected) continue;
      const bob = Math.sin(tickRef.current * 0.08 + item.id) * 3;
      ctx.font = "22px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.emoji, item.x, item.y + bob);
    }

    // Obstacles
    for (const obs of obstaclesRef.current) {
      ctx.font = `${Math.min(obs.w, obs.h) * 0.9}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(obs.emoji, obs.x + obs.w / 2, obs.y + obs.h / 2);
    }

    // Player
    const p = playerRef.current;
    if (invincibleRef.current > 0 && tickRef.current % 6 < 3) {
      ctx.globalAlpha = 0.4;
    }
    ctx.font = "28px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🧒", p.x, p.y);
    ctx.globalAlpha = 1;

    // HUD - Time bar at top
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, 28);
    const timeRatio = Math.max(0, timeRef.current / (30 - dayRef.current * 2));
    ctx.fillStyle = timeRatio > 0.3 ? "#4ADE80" : timeRatio > 0.15 ? "#FBBF24" : "#EF4444";
    ctx.beginPath();
    ctx.roundRect(5, 6, (W - 10) * timeRatio, 16, 6);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`⏰ ${timeRef.current.toFixed(1)}초`, W / 2, 15);

    // Distance bar
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.roundRect(5, H - 22, W - 10, 16, 6);
    ctx.fill();
    const distRatio = Math.min(1, distRef.current / 1000);
    ctx.fillStyle = "#60A5FA";
    ctx.beginPath();
    ctx.roundRect(5, H - 22, (W - 10) * distRatio, 16, 6);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("🏠", 8, H - 13);
    ctx.textAlign = "right";
    ctx.fillText("🏫", W - 8, H - 13);
    ctx.textAlign = "center";
    ctx.fillText(`${Math.floor(distRatio * 100)}%`, W / 2, H - 13);

    // Hit flash
    if (invincibleRef.current > 0 && invincibleRef.current > 50) {
      ctx.fillStyle = "rgba(255,0,0,0.15)";
      ctx.fillRect(0, 0, W, H);
    }
  }, []);

  // Game loop
  useEffect(() => {
    loopRef.current = () => {
      if (gameOverRef.current) return;

      tickRef.current++;
      const tick = tickRef.current;

      // Time countdown
      if (tick % 60 === 0) {
        timeRef.current = Math.max(0, timeRef.current - 1);
        setTimeLeft(timeRef.current);

        if (timeRef.current <= 0) {
          gameOverRef.current = true;
          setScore(scoreRef.current);
          setBestScore((p) => Math.max(p, scoreRef.current));
          setScreen("late");
          draw();
          return;
        }
      }

      // Auto scroll / distance
      const scrollSpeed = 2 + dayRef.current * 0.3;
      scrollRef.current += scrollSpeed;
      distRef.current += scrollSpeed * 0.15;

      // Check arrived at school (1000 distance)
      if (distRef.current >= 1000) {
        gameOverRef.current = true;
        // Bonus for remaining time and items
        const timeBonus = Math.floor(timeRef.current * 10);
        const itemBonus = (collectedRef.current.bread + collectedRef.current.book + collectedRef.current.friend) * 15;
        scoreRef.current += timeBonus + itemBonus;
        setScore(scoreRef.current);
        setBestScore((p) => Math.max(p, scoreRef.current));
        setTotalDays((d) => d + 1);
        setItems({ ...collectedRef.current });
        setScreen("arrived");
        draw();
        return;
      }

      // Player movement toward mouse/touch target
      const mt = mouseRef.current;
      if (mt) {
        // Find closest lane
        let closestLane = 0;
        let closestDist = Infinity;
        for (let i = 0; i < LANE_COUNT; i++) {
          const d = Math.abs(mt.y - LANES[i].y);
          if (d < closestDist) { closestDist = d; closestLane = i; }
        }
        targetLaneRef.current = closestLane;

        // Horizontal movement
        const targetX = Math.max(20, Math.min(W - 20, mt.x));
        const dx = targetX - playerRef.current.x;
        if (Math.abs(dx) > 3) {
          playerRef.current.x += Math.sign(dx) * Math.min(4, Math.abs(dx));
        }
      }

      // Smooth lane transition
      const targetY = LANES[targetLaneRef.current].y;
      const dy = targetY - playerRef.current.y;
      if (Math.abs(dy) > 2) {
        playerRef.current.y += Math.sign(dy) * Math.min(5, Math.abs(dy));
      }
      playerRef.current.lane = targetLaneRef.current;

      // Spawn obstacles
      const spawnRate = Math.max(30, 70 - dayRef.current * 8);
      if (tick % spawnRate === 0) {
        spawnObstacle();
      }

      // Spawn items
      if (tick % 90 === 45) {
        spawnItem();
      }

      // Update obstacles
      obstaclesRef.current = obstaclesRef.current.filter((obs) => {
        if (obs.speed !== 0) {
          obs.x += obs.speed;
        } else {
          obs.x -= scrollSpeed;
        }
        return obs.x > -80 && obs.x < W + 80;
      });

      // Update items
      for (const item of itemsRef.current) {
        if (!item.collected) {
          item.x -= scrollSpeed;
        }
      }
      itemsRef.current = itemsRef.current.filter((it) => !it.collected && it.x > -30);

      // Invincibility
      if (invincibleRef.current > 0) invincibleRef.current--;

      // Collision with obstacles
      if (invincibleRef.current <= 0) {
        const px = playerRef.current.x;
        const py = playerRef.current.y;
        for (const obs of obstaclesRef.current) {
          if (obs.speed === 0 && obs.type === "puddle") {
            // Puddle just slows, no damage
            continue;
          }
          const cx = obs.x + obs.w / 2;
          const cy = obs.y + obs.h / 2;
          const dx2 = Math.abs(px - cx);
          const dy2 = Math.abs(py - cy);
          if (dx2 < (PLAYER_W + obs.w) / 2 - 4 && dy2 < (PLAYER_H + obs.h) / 2 - 4) {
            hpRef.current--;
            setHp(hpRef.current);
            invincibleRef.current = 60;
            setHitFlash(true);
            setTimeout(() => setHitFlash(false), 200);

            if (obs.type === "dog") {
              showMsg("🐕 강아지가 물었다!");
            } else if (obs.type === "cone") {
              showMsg("🔶 공사 콘에 부딪혔다!");
            } else {
              showMsg("💥 부딪혔다!");
            }

            if (hpRef.current <= 0) {
              gameOverRef.current = true;
              setScore(scoreRef.current);
              setBestScore((p) => Math.max(p, scoreRef.current));
              setScreen("late");
              draw();
              return;
            }
            break;
          }
        }
      }

      // Item collection
      const px = playerRef.current.x;
      const py = playerRef.current.y;
      for (const item of itemsRef.current) {
        if (item.collected) continue;
        const d = Math.sqrt((px - item.x) ** 2 + (py - item.y) ** 2);
        if (d < 22) {
          item.collected = true;
          const def = ITEM_DEFS.find((dd) => dd.type === item.type)!;
          scoreRef.current += def.points;

          switch (item.type) {
            case "bread":
              collectedRef.current.bread++;
              showMsg("🍞 아침빵 겟!");
              break;
            case "book":
              collectedRef.current.book++;
              showMsg("📚 교과서 겟!");
              break;
            case "friend":
              collectedRef.current.friend++;
              showMsg("👋 친구 만남!");
              break;
            case "clock":
              timeRef.current = Math.min(timeRef.current + 3, 30);
              setTimeLeft(timeRef.current);
              showMsg("⏰ +3초!");
              break;
            case "star":
              showMsg("⭐ +50점!");
              break;
          }
        }
      }

      // Sync state
      if (tick % 5 === 0) {
        setScore(scoreRef.current);
        setDistance(Math.floor(distRef.current));
      }

      draw();
      animRef.current = requestAnimationFrame(loopRef.current);
    };
  }, [draw, spawnObstacle, spawnItem, showMsg]);

  // Mouse/touch handlers
  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: W / 2, y: H / 2 };
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseRef.current = getCanvasPos(e.clientX, e.clientY);
  }, [getCanvasPos]);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = null;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    mouseRef.current = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
  }, [getCanvasPos]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    mouseRef.current = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
  }, [getCanvasPos]);

  const handleTouchEnd = useCallback(() => {
    mouseRef.current = null;
  }, []);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowUp" || k === "w") {
        e.preventDefault();
        targetLaneRef.current = Math.max(0, targetLaneRef.current - 1);
      }
      if (k === "ArrowDown" || k === "s") {
        e.preventDefault();
        targetLaneRef.current = Math.min(LANE_COUNT - 1, targetLaneRef.current + 1);
      }
      if (k === "ArrowLeft" || k === "a") {
        e.preventDefault();
        playerRef.current.x = Math.max(20, playerRef.current.x - 20);
      }
      if (k === "ArrowRight" || k === "d") {
        e.preventDefault();
        playerRef.current.x = Math.min(W - 20, playerRef.current.x + 20);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-sky-200 via-sky-100 to-amber-100 text-zinc-900">
      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-black/10 px-3 py-1 text-sm hover:bg-black/20">← 홈</Link>

          <div className="text-7xl">🧒🏫</div>
          <h1 className="text-4xl font-black">
            <span className="bg-gradient-to-r from-sky-500 to-blue-500 bg-clip-text text-transparent">학교 가기</span>
          </h1>
          <p className="text-lg text-zinc-500">늦지 않게 학교에 도착하자!</p>

          <div className="w-full max-w-sm space-y-2">
            <p className="text-sm font-bold text-sky-600">📅 요일 선택</p>
            {DAY_NAMES.map((name, i) => (
              <button key={i} onClick={() => startDay(i)}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-zinc-200 bg-white p-3 text-left transition-all hover:border-sky-400 hover:bg-sky-50 active:scale-[0.98]">
                <span className="text-2xl">{["😊", "😃", "😅", "😰", "🏃"][i]}</span>
                <div className="flex-1">
                  <p className="font-bold">{name}</p>
                  <p className="text-xs text-zinc-400">제한시간: {30 - i * 2}초 | 난이도: {"⭐".repeat(i + 1)}</p>
                </div>
              </button>
            ))}
          </div>

          {bestScore > 0 && (
            <div className="rounded-xl bg-white/80 px-8 py-3 space-y-1">
              <p className="text-sm text-zinc-500">🏆 최고점수: <span className="font-bold text-amber-500">{bestScore}</span></p>
              <p className="text-sm text-zinc-500">📅 등교 성공: <span className="font-bold text-sky-500">{totalDays}일</span></p>
            </div>
          )}

          <div className="w-full max-w-sm rounded-xl bg-white/80 p-4 text-left text-xs text-zinc-500 space-y-1">
            <p className="font-bold text-sky-600">🎮 조작법</p>
            <p>🖱️ 마우스를 따라 이동</p>
            <p>📱 터치한 곳으로 이동</p>
            <p>⌨️ WASD / 방향키로도 가능</p>
            <p className="font-bold text-sky-600 mt-1">💡 팁</p>
            <p>🚗 차를 피하고 🍞📚👋 아이템을 모으세요!</p>
            <p>⏰ 시계를 먹으면 시간이 늘어나요!</p>
          </div>
        </div>
      )}

      {/* Playing */}
      {screen === "playing" && (
        <div className="flex min-h-screen flex-col items-center pt-2 px-2">
          <div className="mb-1 flex w-full max-w-[360px] items-center justify-between text-xs">
            <span className="rounded-lg bg-sky-500/20 px-2 py-1 font-bold text-sky-700">📅 {DAY_NAMES[day]}</span>
            <span className="rounded-lg bg-amber-500/20 px-2 py-1 font-bold text-amber-700">⭐ {score}</span>
            <span className="flex gap-0.5 rounded-lg bg-red-500/10 px-2 py-1">
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} className="text-sm">{i < hp ? "❤️" : "🖤"}</span>
              ))}
            </span>
          </div>

          {message && (
            <div className="mb-1 rounded-lg bg-white/80 px-4 py-1 text-center text-sm font-bold">{message}</div>
          )}

          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="rounded-2xl border-2 border-sky-300/50 touch-none cursor-none"
            style={{ width: W, height: H }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>
      )}

      {/* Arrived */}
      {screen === "arrived" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <div className="text-7xl">🎉🏫</div>
          <h2 className="text-4xl font-black text-sky-600">등교 성공!</h2>
          <p className="text-lg text-zinc-500">시간 안에 도착했어요!</p>

          <div className="rounded-xl bg-white/80 px-8 py-5 space-y-2">
            <p className="text-2xl font-black text-amber-500">⭐ {score}점</p>
            {score >= bestScore && score > 0 && (
              <p className="text-sm font-bold text-amber-500 animate-bounce">🏆 최고 기록!</p>
            )}
            <div className="text-sm text-zinc-500 space-y-1">
              <p>🍞 아침빵: {items.bread}개</p>
              <p>📚 교과서: {items.book}권</p>
              <p>👋 친구: {items.friend}명</p>
            </div>
          </div>

          <div className="flex gap-3">
            {day < DAY_NAMES.length - 1 && (
              <button onClick={() => startDay(day + 1)}
                className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-8 py-3 font-bold text-white transition-transform hover:scale-105 active:scale-95">
                ➡️ {DAY_NAMES[day + 1]}
              </button>
            )}
            <button onClick={() => startDay(day)}
              className="rounded-xl bg-sky-500/20 px-6 py-3 font-bold text-sky-700 transition-transform hover:scale-105 active:scale-95">
              🔄 다시
            </button>
            <button onClick={() => setScreen("menu")}
              className="rounded-xl bg-zinc-200 px-6 py-3 font-bold text-zinc-600 transition-transform hover:scale-105 active:scale-95">
              메뉴
            </button>
          </div>
        </div>
      )}

      {/* Late */}
      {screen === "late" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <div className="text-7xl">😱⏰</div>
          <h2 className="text-4xl font-black text-red-500">
            {hpRef.current <= 0 ? "으앗!" : "지각!"}
          </h2>
          <p className="text-lg text-zinc-500">
            {hpRef.current <= 0 ? "너무 많이 부딪혔어요..." : "시간이 다 됐어요..."}
          </p>

          <div className="rounded-xl bg-white/80 px-8 py-4 space-y-2">
            <p className="text-2xl font-black text-amber-500">⭐ {score}점</p>
            <p className="text-sm text-zinc-500">📏 진행도: {Math.floor(Math.min(100, distance / 10))}%</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => startDay(day)}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-8 py-3 font-bold text-white transition-transform hover:scale-105 active:scale-95">
              🔄 다시하기
            </button>
            <button onClick={() => setScreen("menu")}
              className="rounded-xl bg-zinc-200 px-6 py-3 font-bold text-zinc-600 transition-transform hover:scale-105 active:scale-95">
              메뉴
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
