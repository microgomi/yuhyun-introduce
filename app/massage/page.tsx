"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "playing" | "result";
type BodyPart = "shoulder_l" | "shoulder_r" | "back_upper" | "back_mid" | "back_lower" | "neck" | "arm_l" | "arm_r";

interface MassageSpot {
  id: string;
  part: BodyPart;
  x: number;
  y: number;
  radius: number;
  label: string;
  stiffness: number; // 0~100
  emoji: string;
}

interface Combo {
  count: number;
  timer: number;
}

interface DadMood {
  satisfaction: number; // 0~100
  emoji: string;
  quote: string;
}

// --- Constants ---
const W = 360;
const H = 560;

const DAD_QUOTES_BAD = [
  "거기 말고...",
  "좀 더 세게!",
  "엉뚱한 데 누르지 마",
  "아직 멀었어~",
];

const DAD_QUOTES_OK = [
  "오~ 좀 시원하네",
  "거기거기!",
  "조금 더!",
  "나쁘지 않은데?",
];

const DAD_QUOTES_GOOD = [
  "아~ 시원하다!!",
  "거기가 딱이야!",
  "효자네 효자~",
  "손이 약손이야!",
  "아빠 기분 좋다~",
];

const DAD_QUOTES_PERFECT = [
  "세상에서 제일 좋은 아들!",
  "용돈 올려줄까?!",
  "최고다 최고!!",
  "아빠가 감동했어...",
  "매일 해줘라~!",
];

const REQUEST_MESSAGES = [
  { part: "shoulder_l", msg: "왼쪽 어깨 좀!", emoji: "👈" },
  { part: "shoulder_r", msg: "오른쪽 어깨!", emoji: "👉" },
  { part: "back_upper", msg: "등 위쪽 좀!", emoji: "⬆️" },
  { part: "back_mid", msg: "등 가운데!", emoji: "🎯" },
  { part: "back_lower", msg: "허리 좀!", emoji: "⬇️" },
  { part: "neck", msg: "목이 뻣뻣해!", emoji: "😣" },
  { part: "arm_l", msg: "왼팔 좀!", emoji: "💪" },
  { part: "arm_r", msg: "오른팔!", emoji: "💪" },
];

export default function MassagePage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [combo, setCombo] = useState<Combo>({ count: 0, timer: 0 });
  const [dadMood, setDadMood] = useState<DadMood>({ satisfaction: 50, emoji: "😐", quote: "자, 시작해볼까?" });
  const [spots, setSpots] = useState<MassageSpot[]>([]);
  const [activeSpot, setActiveSpot] = useState<string | null>(null);
  const [request, setRequest] = useState<{ part: string; msg: string; emoji: string } | null>(null);
  const [requestTimer, setRequestTimer] = useState(0);
  const [tapEffects, setTapEffects] = useState<{ id: number; x: number; y: number; score: number }[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [technique, setTechnique] = useState<"tap" | "circle" | "press">("tap");
  const [message, setMessage] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const tickRef = useRef(0);
  const loopRef = useRef<() => void>(() => {});
  const scoreRef = useRef(0);
  const satisfactionRef = useRef(50);
  const timeRef = useRef(60);
  const comboRef = useRef({ count: 0, timer: 0 });
  const spotsRef = useRef<MassageSpot[]>([]);
  const requestRef = useRef<{ part: string; timer: number } | null>(null);
  const tapRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const circleRef = useRef<{ points: { x: number; y: number }[] }>({ points: [] });
  const pressRef = useRef<{ x: number; y: number; startTime: number; active: boolean }>({ x: 0, y: 0, startTime: 0, active: false });
  const gameOverRef = useRef(false);
  const effectIdRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const initSpots = useCallback((): MassageSpot[] => {
    return [
      { id: "neck", part: "neck", x: W / 2, y: 145, radius: 22, label: "목", stiffness: 60 + Math.random() * 30, emoji: "😣" },
      { id: "shoulder_l", part: "shoulder_l", x: W / 2 - 70, y: 185, radius: 28, label: "왼어깨", stiffness: 50 + Math.random() * 40, emoji: "💪" },
      { id: "shoulder_r", part: "shoulder_r", x: W / 2 + 70, y: 185, radius: 28, label: "오른어깨", stiffness: 50 + Math.random() * 40, emoji: "💪" },
      { id: "arm_l", part: "arm_l", x: W / 2 - 100, y: 280, radius: 22, label: "왼팔", stiffness: 30 + Math.random() * 30, emoji: "🦾" },
      { id: "arm_r", part: "arm_r", x: W / 2 + 100, y: 280, radius: 22, label: "오른팔", stiffness: 30 + Math.random() * 30, emoji: "🦾" },
      { id: "back_upper", part: "back_upper", x: W / 2, y: 230, radius: 30, label: "등 위", stiffness: 60 + Math.random() * 30, emoji: "🔴" },
      { id: "back_mid", part: "back_mid", x: W / 2, y: 300, radius: 32, label: "등 중간", stiffness: 70 + Math.random() * 25, emoji: "🔴" },
      { id: "back_lower", part: "back_lower", x: W / 2, y: 370, radius: 30, label: "허리", stiffness: 65 + Math.random() * 30, emoji: "🔴" },
    ];
  }, []);

  const startGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    const newSpots = initSpots();
    spotsRef.current = newSpots;
    setSpots(newSpots);
    scoreRef.current = 0;
    satisfactionRef.current = 50;
    timeRef.current = 60;
    comboRef.current = { count: 0, timer: 0 };
    requestRef.current = null;
    gameOverRef.current = false;
    tickRef.current = 0;
    effectIdRef.current = 0;

    setScore(0);
    setTimeLeft(60);
    setCombo({ count: 0, timer: 0 });
    setDadMood({ satisfaction: 50, emoji: "😐", quote: "자, 시작해볼까?" });
    setActiveSpot(null);
    setRequest(null);
    setRequestTimer(0);
    setTapEffects([]);
    setTechnique("tap");
    setMessage("");

    setScreen("playing");
    setTimeout(() => {
      animRef.current = requestAnimationFrame(loopRef.current);
    }, 50);
  }, [initSpots]);

  const updateDadMood = useCallback(() => {
    const s = satisfactionRef.current;
    let emoji: string, quote: string;
    const quotes = s >= 85 ? DAD_QUOTES_PERFECT : s >= 65 ? DAD_QUOTES_GOOD : s >= 40 ? DAD_QUOTES_OK : DAD_QUOTES_BAD;
    quote = quotes[Math.floor(Math.random() * quotes.length)];
    emoji = s >= 85 ? "🥰" : s >= 65 ? "😊" : s >= 40 ? "😐" : "😕";
    setDadMood({ satisfaction: s, emoji, quote });
  }, []);

  const addTapEffect = useCallback((x: number, y: number, pts: number) => {
    const id = ++effectIdRef.current;
    setTapEffects((prev) => [...prev, { id, x, y, score: pts }]);
    setTimeout(() => {
      setTapEffects((prev) => prev.filter((e) => e.id !== id));
    }, 800);
  }, []);

  // Process massage at position
  const massageAt = useCallback((x: number, y: number, power: number) => {
    let hit = false;
    for (const spot of spotsRef.current) {
      const dx = x - spot.x;
      const dy = y - spot.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < spot.radius + 10) {
        hit = true;
        const effectiveness = Math.max(0.3, 1 - dist / (spot.radius + 10));
        const reduction = power * effectiveness * (1 + comboRef.current.count * 0.1);

        spot.stiffness = Math.max(0, spot.stiffness - reduction);

        // Is this the requested part?
        const isRequested = requestRef.current && requestRef.current.part === spot.part;
        const bonus = isRequested ? 2 : 1;

        const pts = Math.floor(reduction * bonus * 2);
        scoreRef.current += pts;

        // Combo
        comboRef.current.count++;
        comboRef.current.timer = 60;

        // Satisfaction
        satisfactionRef.current = Math.min(100, satisfactionRef.current + reduction * 0.3 * bonus);

        if (isRequested) {
          requestRef.current = null;
          setRequest(null);
        }

        addTapEffect(x, y, pts);
        setActiveSpot(spot.id);
        setTimeout(() => setActiveSpot(null), 150);
        break;
      }
    }

    if (!hit) {
      // Missed - reduce satisfaction slightly
      satisfactionRef.current = Math.max(0, satisfactionRef.current - 2);
      comboRef.current.count = 0;
      addTapEffect(x, y, 0);
    }
  }, [addTapEffect]);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const tick = tickRef.current;

    // Background
    ctx.fillStyle = "#1a1520";
    ctx.fillRect(0, 0, W, H);

    // Room background
    ctx.fillStyle = "#2a2030";
    ctx.fillRect(20, 100, W - 40, H - 140);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 100, W - 40, H - 140);

    // Dad's back (body shape)
    // Head
    ctx.fillStyle = "#8B7355";
    ctx.beginPath();
    ctx.arc(W / 2, 120, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "16px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("👨", W / 2, 115);

    // Body
    const bodyGrad = ctx.createLinearGradient(W / 2 - 80, 150, W / 2 + 80, 400);
    bodyGrad.addColorStop(0, "#4a3f55");
    bodyGrad.addColorStop(1, "#3a2f45");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 80, 160);
    ctx.quadraticCurveTo(W / 2 - 90, 250, W / 2 - 75, 400);
    ctx.lineTo(W / 2 + 75, 400);
    ctx.quadraticCurveTo(W / 2 + 90, 250, W / 2 + 80, 160);
    ctx.closePath();
    ctx.fill();

    // Arms
    ctx.fillStyle = "#4a3f55";
    // Left arm
    ctx.beginPath();
    ctx.moveTo(W / 2 - 80, 180);
    ctx.quadraticCurveTo(W / 2 - 120, 250, W / 2 - 105, 320);
    ctx.lineTo(W / 2 - 85, 310);
    ctx.quadraticCurveTo(W / 2 - 95, 250, W / 2 - 70, 190);
    ctx.closePath();
    ctx.fill();
    // Right arm
    ctx.beginPath();
    ctx.moveTo(W / 2 + 80, 180);
    ctx.quadraticCurveTo(W / 2 + 120, 250, W / 2 + 105, 320);
    ctx.lineTo(W / 2 + 85, 310);
    ctx.quadraticCurveTo(W / 2 + 95, 250, W / 2 + 70, 190);
    ctx.closePath();
    ctx.fill();

    // Massage spots
    for (const spot of spotsRef.current) {
      const stiff = spot.stiffness;
      const isActive = spot.id === activeSpot;
      const isRequested = requestRef.current?.part === spot.part;

      // Color based on stiffness
      const r = Math.floor(255 * (stiff / 100));
      const g = Math.floor(200 * (1 - stiff / 100));

      // Glow for requested
      if (isRequested) {
        ctx.fillStyle = `rgba(255,215,0,${0.15 + Math.sin(tick * 0.1) * 0.1})`;
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, spot.radius + 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,215,0,${0.5 + Math.sin(tick * 0.1) * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Spot circle
      ctx.fillStyle = isActive
        ? `rgba(255,255,100,0.5)`
        : `rgba(${r},${g},80,${0.3 + stiff * 0.004})`;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = isActive ? "rgba(255,255,0,0.8)" : `rgba(${r},${g},80,0.5)`;
      ctx.lineWidth = isActive ? 3 : 1.5;
      ctx.stroke();

      // Stiffness indicator
      if (stiff > 5) {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${Math.floor(stiff)}%`, spot.x, spot.y - 2);
        ctx.font = "8px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText(spot.label, spot.x, spot.y + 10);
      } else {
        ctx.font = "16px serif";
        ctx.textAlign = "center";
        ctx.fillText("✅", spot.x, spot.y + 2);
      }
    }

    // Tap effects
    for (const eff of tapEffects) {
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = eff.score > 0 ? "rgba(255,255,100,0.9)" : "rgba(255,100,100,0.7)";
      ctx.fillText(eff.score > 0 ? `+${eff.score}` : "Miss!", eff.x, eff.y - 20);
    }

    // Technique indicator
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.roundRect(W / 2 - 50, H - 85, 100, 24, 8);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    const techLabel = technique === "tap" ? "👆 두드리기" : technique === "circle" ? "🔄 주무르기" : "👇 지압";
    ctx.fillText(techLabel, W / 2, H - 71);

    // HUD - satisfaction bar
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.roundRect(10, 10, W - 20, 40, 10);
    ctx.fill();

    const sat = satisfactionRef.current;
    const barColor = sat >= 70 ? "#4ADE80" : sat >= 40 ? "#FBBF24" : "#EF4444";
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.roundRect(15, 30, W - 30, 14, 5);
    ctx.fill();
    ctx.fillStyle = barColor;
    ctx.beginPath();
    ctx.roundRect(15, 30, (W - 30) * (sat / 100), 14, 5);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${dadMood.emoji} 만족도: ${Math.floor(sat)}%`, 15, 24);
    ctx.textAlign = "right";
    ctx.fillText(`⏰ ${timeRef.current}초`, W - 15, 24);
    ctx.textAlign = "center";
    ctx.fillText(`⭐ ${scoreRef.current}`, W / 2, 24);

    // Time bar
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.roundRect(10, 56, W - 20, 8, 4);
    ctx.fill();
    const timeRatio = timeRef.current / 60;
    ctx.fillStyle = timeRatio > 0.3 ? "#60A5FA" : timeRatio > 0.15 ? "#FBBF24" : "#EF4444";
    ctx.beginPath();
    ctx.roundRect(10, 56, (W - 20) * timeRatio, 8, 4);
    ctx.fill();

    // Dad quote
    if (dadMood.quote) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      const tw = ctx.measureText(dadMood.quote).width + 30;
      ctx.beginPath();
      ctx.roundRect(W / 2 - tw / 2, 70, tw, 22, 8);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(dadMood.quote, W / 2, 82);
    }

    // Combo
    if (comboRef.current.count > 2) {
      ctx.fillStyle = "rgba(255,200,0,0.9)";
      ctx.font = `bold ${14 + Math.min(6, comboRef.current.count)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`🔥 ${comboRef.current.count}x 콤보!`, W / 2, H - 95);
    }
  }, [activeSpot, tapEffects, dadMood, technique]);

  // Game loop
  useEffect(() => {
    loopRef.current = () => {
      if (gameOverRef.current) return;
      tickRef.current++;
      const tick = tickRef.current;

      // Time
      if (tick % 60 === 0) {
        timeRef.current--;
        setTimeLeft(timeRef.current);

        if (timeRef.current <= 0) {
          gameOverRef.current = true;
          setScore(scoreRef.current);
          setBestScore((p) => Math.max(p, scoreRef.current));
          setTotalGames((g) => g + 1);
          setScreen("result");
          draw();
          return;
        }
      }

      // Combo timer
      if (comboRef.current.timer > 0) {
        comboRef.current.timer--;
        if (comboRef.current.timer <= 0) {
          comboRef.current.count = 0;
        }
      }
      if (tick % 10 === 0) setCombo({ ...comboRef.current });

      // Satisfaction slowly decreases
      if (tick % 30 === 0) {
        satisfactionRef.current = Math.max(0, satisfactionRef.current - 0.5);
      }

      // Dad requests
      if (!requestRef.current && tick % 180 === 90) {
        const req = REQUEST_MESSAGES[Math.floor(Math.random() * REQUEST_MESSAGES.length)];
        requestRef.current = { part: req.part, timer: 300 };
        setRequest(req);
        setRequestTimer(300);
      }
      if (requestRef.current) {
        requestRef.current.timer--;
        if (tick % 10 === 0) setRequestTimer(requestRef.current.timer);
        if (requestRef.current.timer <= 0) {
          satisfactionRef.current = Math.max(0, satisfactionRef.current - 10);
          requestRef.current = null;
          setRequest(null);
        }
      }

      // Update dad mood periodically
      if (tick % 60 === 0) {
        updateDadMood();
      }

      // Stiffness slowly recovers (gets stiff again)
      if (tick % 120 === 0) {
        for (const spot of spotsRef.current) {
          spot.stiffness = Math.min(100, spot.stiffness + 2);
        }
      }

      // Press technique - continuous massage while pressed
      if (pressRef.current.active) {
        const elapsed = Date.now() - pressRef.current.startTime;
        if (elapsed > 300 && tick % 8 === 0) {
          massageAt(pressRef.current.x, pressRef.current.y, 3);
        }
      }

      // Sync
      if (tick % 5 === 0) {
        setScore(scoreRef.current);
        setSpots([...spotsRef.current]);
      }

      draw();
      animRef.current = requestAnimationFrame(loopRef.current);
    };
  }, [draw, updateDadMood, massageAt]);

  // Input handlers
  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback((x: number, y: number) => {
    if (technique === "tap") {
      massageAt(x, y, 5 + Math.random() * 3);
    } else if (technique === "press") {
      pressRef.current = { x, y, startTime: Date.now(), active: true };
      massageAt(x, y, 3);
    } else {
      circleRef.current.points = [{ x, y }];
    }
  }, [technique, massageAt]);

  const handlePointerMove = useCallback((x: number, y: number) => {
    if (technique === "circle") {
      circleRef.current.points.push({ x, y });
      if (circleRef.current.points.length > 5) {
        massageAt(x, y, 2);
        circleRef.current.points = circleRef.current.points.slice(-3);
      }
    } else if (technique === "press" && pressRef.current.active) {
      pressRef.current.x = x;
      pressRef.current.y = y;
    }
  }, [technique, massageAt]);

  const handlePointerUp = useCallback(() => {
    pressRef.current.active = false;
    circleRef.current.points = [];
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const p = getCanvasPos(e.clientX, e.clientY);
    handlePointerDown(p.x, p.y);
  }, [getCanvasPos, handlePointerDown]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.buttons > 0) {
      const p = getCanvasPos(e.clientX, e.clientY);
      handlePointerMove(p.x, p.y);
    }
  }, [getCanvasPos, handlePointerMove]);

  const handleMouseUp = useCallback(() => handlePointerUp(), [handlePointerUp]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    const p = getCanvasPos(t.clientX, t.clientY);
    handlePointerDown(p.x, p.y);
  }, [getCanvasPos, handlePointerDown]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    const p = getCanvasPos(t.clientX, t.clientY);
    handlePointerMove(p.x, p.y);
  }, [getCanvasPos, handlePointerMove]);

  const handleTouchEnd = useCallback(() => handlePointerUp(), [handlePointerUp]);

  // Satisfaction grade
  const getGrade = (s: number) => {
    if (s >= 90) return { grade: "S", emoji: "🥰", label: "최고의 효자!", color: "text-amber-400" };
    if (s >= 75) return { grade: "A", emoji: "😊", label: "아빠 기분 좋다~", color: "text-green-400" };
    if (s >= 55) return { grade: "B", emoji: "🙂", label: "괜찮았어!", color: "text-sky-400" };
    if (s >= 35) return { grade: "C", emoji: "😐", label: "좀 더 열심히...", color: "text-orange-400" };
    return { grade: "D", emoji: "😕", label: "다음에 더 잘하자", color: "text-red-400" };
  };

  const gradeInfo = getGrade(satisfactionRef.current);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-indigo-950 via-purple-950 to-indigo-950 text-white">
      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">← 홈</Link>

          <div className="text-7xl">👨💆</div>
          <h1 className="text-3xl font-black">
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">아빠 주물러주기</span>
          </h1>
          <p className="text-lg text-slate-400">아빠의 뻣뻣한 근육을 풀어줘!</p>

          <button onClick={startGame}
            className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-12 py-4 text-xl font-black shadow-lg shadow-amber-500/30 transition-transform hover:scale-105 active:scale-95">
            💆 시작!
          </button>

          {bestScore > 0 && (
            <div className="rounded-xl bg-white/5 px-8 py-4 space-y-1">
              <p className="text-sm text-slate-400">🏆 최고점수: <span className="font-bold text-amber-400">{bestScore}</span></p>
              <p className="text-sm text-slate-400">🎮 플레이: <span className="font-bold text-cyan-400">{totalGames}회</span></p>
            </div>
          )}

          <div className="w-full max-w-sm rounded-xl bg-white/5 p-4 text-left text-xs text-slate-400 space-y-2">
            <p className="font-bold text-amber-400">🎮 조작법</p>
            <p>👆 <b>두드리기</b>: 클릭/탭으로 마사지</p>
            <p>🔄 <b>주무르기</b>: 드래그로 문지르기</p>
            <p>👇 <b>지압</b>: 꾹 누르고 있기</p>
            <p className="font-bold text-amber-400 mt-2">💡 팁</p>
            <p>🔴 빨간 부위 = 뻣뻣함, 집중 공략!</p>
            <p>⭐ 아빠 요청 부위를 누르면 보너스!</p>
            <p>🔥 연속 마사지로 콤보!</p>
          </div>
        </div>
      )}

      {/* Playing */}
      {screen === "playing" && (
        <div className="flex min-h-screen flex-col items-center pt-1 px-2">
          {/* Request */}
          {request && (
            <div className="mb-1 rounded-lg bg-amber-500/20 px-4 py-1.5 text-center text-sm font-bold text-amber-300 animate-pulse">
              {request.emoji} 아빠: &quot;{request.msg}&quot;
              <span className="ml-2 text-xs text-amber-400/70">({Math.ceil(requestTimer / 60)}초)</span>
            </div>
          )}

          {message && (
            <div className="mb-1 rounded-lg bg-white/10 px-4 py-1 text-center text-sm font-bold">{message}</div>
          )}

          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="rounded-2xl border-2 border-amber-500/20 touch-none"
            style={{ width: W, height: H }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />

          {/* Technique selector */}
          <div className="mt-2 flex gap-2">
            {(["tap", "circle", "press"] as const).map((t) => (
              <button key={t} onClick={() => setTechnique(t)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
                  technique === t ? "bg-amber-500 shadow-lg shadow-amber-500/30" : "bg-white/10 hover:bg-white/15"
                }`}>
                {t === "tap" ? "👆 두드리기" : t === "circle" ? "🔄 주무르기" : "👇 지압"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {screen === "result" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <div className="text-7xl">{gradeInfo.emoji}</div>
          <h2 className={`text-5xl font-black ${gradeInfo.color}`}>{gradeInfo.grade}등급</h2>
          <p className="text-lg text-slate-400">{gradeInfo.label}</p>

          <div className="rounded-xl bg-white/5 px-8 py-5 space-y-2">
            <p className="text-2xl font-black text-amber-400">⭐ {score}점</p>
            {score >= bestScore && score > 0 && (
              <p className="text-sm font-bold text-amber-400 animate-bounce">🏆 최고 기록!</p>
            )}
            <p className="text-sm text-slate-400">😊 최종 만족도: {Math.floor(satisfactionRef.current)}%</p>
          </div>

          <div className="flex gap-3">
            <button onClick={startGame}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
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
