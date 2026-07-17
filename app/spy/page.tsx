"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ============================================================
// TYPES
// ============================================================
type Agency = "블랙팬서" | "실버폭스" | "골드이글";
type Avatar = "🕵️" | "🕵️‍♀️" | "🥷" | "🦹" | "🤵";
type Screen =
  | "profile"
  | "hub"
  | "shop"
  | "mission-briefing"
  | "mission"
  | "mission-complete"
  | "mission-fail"
  | "game-complete";

interface SpyProfile {
  codename: string;
  avatar: Avatar;
  agency: Agency;
  stats: { stealth: number; hacking: number; combat: number; charm: number; stamina: number };
}

interface Gadget {
  id: string;
  name: string;
  icon: string;
  desc: string;
  cost: number;
}

const AVATARS: Avatar[] = ["🕵️", "🕵️‍♀️", "🥷", "🦹", "🤵"];
const AGENCIES: { name: Agency; color: string }[] = [
  { name: "블랙팬서", color: "from-purple-700 to-gray-900" },
  { name: "실버폭스", color: "from-gray-500 to-blue-900" },
  { name: "골드이글", color: "from-yellow-600 to-amber-900" },
];

const GADGETS: Gadget[] = [
  { id: "goggles", name: "투시 고글", icon: "🕶️", desc: "경비 패턴을 더 오래 볼 수 있어요", cost: 50 },
  { id: "silencer", name: "소음기", icon: "🔇", desc: "경비의 탐지 범위가 줄어들어요", cost: 80 },
  { id: "watch", name: "스마트워치", icon: "⌚", desc: "시간제한 미션에서 +10초", cost: 60 },
  { id: "magnet", name: "자석장갑", icon: "🧲", desc: "주변 아이템을 자동으로 획득해요", cost: 70 },
  { id: "smoke", name: "연막탄", icon: "💨", desc: "발각 시 1회 탈출 가능", cost: 100 },
  { id: "jetpack", name: "제트팩", icon: "🚀", desc: "추격전에서 장애물 1개 무시", cost: 120 },
];

const MISSIONS = [
  { id: 1, title: "비밀 서류 훔치기", subtitle: "Steal Secret Documents", location: "대사관 🏛️", icon: "🗄️" },
  { id: 2, title: "레이저 통과하기", subtitle: "Laser Grid", location: "보안 시설 🔴", icon: "🔴" },
  { id: 3, title: "변장하기", subtitle: "Disguise", location: "비밀 파티 🎭", icon: "🎭" },
  { id: 4, title: "암호 해독", subtitle: "Code Breaking", location: "통신실 📡", icon: "📡" },
  { id: 5, title: "추격전", subtitle: "Car Chase", location: "고속도로 🛣️", icon: "🚗" },
  { id: 6, title: "해킹", subtitle: "Hacking", location: "서버실 💻", icon: "💻" },
  { id: 7, title: "보스 대결", subtitle: "Boss Fight", location: "비밀 기지 🏰", icon: "🦹‍♂️" },
  { id: 8, title: "탈출!", subtitle: "Escape!", location: "폭발하는 기지 💥", icon: "💥" },
];

const RANKS = [
  { name: "신입 요원", icon: "🟢", min: 0 },
  { name: "정식 요원", icon: "🔵", min: 2 },
  { name: "특수 요원", icon: "🟣", min: 4 },
  { name: "수석 요원", icon: "🟡", min: 6 },
  { name: "더블오 에이전트", icon: "⭐", min: 8 },
];

function getRank(completed: number) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (completed >= r.min) rank = r;
  }
  return rank;
}

// ============================================================
// TYPEWRITER TEXT
// ============================================================
function TypewriterText({ text, speed = 40, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);
  useEffect(() => {
    idx.current = 0;
    setDisplayed("");
    const iv = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) {
        clearInterval(iv);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return <span>{displayed}<span className="animate-pulse">|</span></span>;
}

// ============================================================
// CODE RAIN BACKGROUND
// ============================================================
function CodeRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const cols = Math.floor(canvas.width / 14);
    const drops: number[] = Array(cols).fill(1);
    const chars = "01アイウエオカキクケコサシスセソ";
    const draw = () => {
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0f0";
      ctx.font = "14px monospace";
      for (let i = 0; i < drops.length; i++) {
        const t = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(t, i * 14, drops[i] * 14);
        if (drops[i] * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    const iv = setInterval(draw, 50);
    return () => clearInterval(iv);
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" />;
}

// ============================================================
// MISSION 1: STEALTH
// ============================================================
function Mission1({ onWin, onFail, hasGoggles, hasSilencer, hasSmoke }: {
  onWin: (coins: number) => void; onFail: () => void;
  hasGoggles: boolean; hasSilencer: boolean; hasSmoke: boolean;
}) {
  const ROWS = 8, COLS = 10;
  const [playerPos, setPlayerPos] = useState({ r: 7, c: 0 });
  const safePos = { r: 1, c: 8 };
  const exitPos = { r: 7, c: 9 };
  const [hasSafe, setHasSafe] = useState(false);
  const [cracking, setCracking] = useState(false);
  const [crackPhase, setCrackPhase] = useState(0);
  const [crackAngle, setCrackAngle] = useState(0);
  const [crackTargets] = useState(() => [
    Math.floor(Math.random() * 36) * 10,
    Math.floor(Math.random() * 36) * 10,
    Math.floor(Math.random() * 36) * 10,
  ]);
  const [detected, setDetected] = useState(false);
  const [smokeUsed, setSmokeUsed] = useState(false);
  const [guards, setGuards] = useState([
    { r: 3, c: 3, dir: 1, axis: "c" as const, min: 2, max: 6 },
    { r: 5, c: 7, dir: -1, axis: "r" as const, min: 3, max: 6 },
    { r: 1, c: 4, dir: 1, axis: "c" as const, min: 3, max: 7 },
  ]);
  const walls = useRef(new Set([
    "0,3", "0,4", "0,5", "2,1", "2,2", "3,6", "4,4", "4,5", "6,2", "6,3", "6,7",
  ]));

  const detectionRange = hasSilencer ? 1 : 2;

  useEffect(() => {
    if (cracking || detected) return;
    const iv = setInterval(() => {
      setGuards(prev => prev.map(g => {
        const ng = { ...g };
        if (g.axis === "c") {
          ng.c += g.dir;
          if (ng.c >= g.max || ng.c <= g.min) ng.dir *= -1;
        } else {
          ng.r += g.dir;
          if (ng.r >= g.max || ng.r <= g.min) ng.dir *= -1;
        }
        return ng;
      }));
    }, hasGoggles ? 800 : 600);
    return () => clearInterval(iv);
  }, [cracking, detected, hasGoggles]);

  useEffect(() => {
    if (cracking || detected) return;
    for (const g of guards) {
      const dist = Math.abs(g.r - playerPos.r) + Math.abs(g.c - playerPos.c);
      if (dist <= detectionRange) {
        if (hasSmoke && !smokeUsed) {
          setSmokeUsed(true);
          return;
        }
        setDetected(true);
        setTimeout(() => onFail(), 1500);
        return;
      }
    }
  }, [guards, playerPos, cracking, detected]);

  useEffect(() => {
    if (cracking) {
      const iv = setInterval(() => {
        setCrackAngle(a => (a + 5) % 360);
      }, 50);
      return () => clearInterval(iv);
    }
  }, [cracking]);

  const move = (dr: number, dc: number) => {
    if (cracking || detected) return;
    const nr = playerPos.r + dr;
    const nc = playerPos.c + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
    if (walls.current.has(`${nr},${nc}`)) return;
    setPlayerPos({ r: nr, c: nc });
    if (nr === safePos.r && nc === safePos.c && !hasSafe) {
      setCracking(true);
    }
    if (nr === exitPos.r && nc === exitPos.c && hasSafe) {
      onWin(100);
    }
  };

  const handleCrackClick = () => {
    const diff = Math.abs(crackAngle - crackTargets[crackPhase]);
    if (diff < 30 || diff > 330) {
      if (crackPhase >= 2) {
        setCracking(false);
        setHasSafe(true);
      } else {
        setCrackPhase(p => p + 1);
      }
    }
  };

  if (cracking) {
    return (
      <div className="flex flex-col items-center gap-4">
        <h3 className="text-green-400 text-lg font-bold">🔓 금고 해제 - 다이얼을 맞춰라!</h3>
        <p className="text-gray-400 text-sm">녹색 영역에서 클릭! ({crackPhase + 1}/3)</p>
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#333" strokeWidth="4" />
            {/* target zone */}
            <path
              d={describeArc(100, 100, 85, crackTargets[crackPhase] - 15, crackTargets[crackPhase] + 15)}
              fill="none" stroke="#0f0" strokeWidth="8" opacity="0.5"
            />
            {/* dial pointer */}
            <line
              x1="100" y1="100"
              x2={100 + 80 * Math.cos((crackAngle - 90) * Math.PI / 180)}
              y2={100 + 80 * Math.sin((crackAngle - 90) * Math.PI / 180)}
              stroke="#0ff" strokeWidth="3"
            />
            <circle cx="100" cy="100" r="5" fill="#0ff" />
          </svg>
        </div>
        <button onClick={handleCrackClick}
          className="px-6 py-3 bg-green-700 hover:bg-green-600 rounded-lg text-white font-bold text-lg">
          🔓 맞추기!
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span>{hasSafe ? "📄 서류 획득! 출구로!" : "🗄️ 금고로 이동하세요"}</span>
        {smokeUsed && <span className="text-yellow-400">💨 연막탄 사용됨</span>}
      </div>
      {detected && (
        <div className="text-red-500 text-xl font-bold animate-pulse">🚨 발각됨! 미션 실패!</div>
      )}
      <div className="grid gap-0.5 p-2 bg-gray-900 rounded-lg border border-green-900/50"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {Array.from({ length: ROWS }).map((_, r) =>
          Array.from({ length: COLS }).map((_, c) => {
            const isPlayer = playerPos.r === r && playerPos.c === c;
            const isGuard = guards.some(g => g.r === r && g.c === c);
            const isSafe = safePos.r === r && safePos.c === c && !hasSafe;
            const isExit = exitPos.r === r && exitPos.c === c;
            const isWall = walls.current.has(`${r},${c}`);
            const guardNear = guards.some(g =>
              Math.abs(g.r - r) + Math.abs(g.c - c) <= detectionRange
            );
            return (
              <div key={`${r}-${c}`}
                className={`w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center text-xs sm:text-sm rounded-sm
                  ${isWall ? "bg-gray-700" : guardNear && !isPlayer ? "bg-red-900/30" : "bg-gray-800/80"}
                  ${isPlayer ? "bg-green-900/60 ring-1 ring-green-400" : ""}
                `}>
                {isPlayer ? "🕵️" : isGuard ? "💂" : isSafe ? "🗄️" : isExit ? "🚪" : isWall ? "🧱" : ""}
              </div>
            );
          })
        )}
      </div>
      <div className="grid grid-cols-3 gap-1 w-32">
        <div />
        <button onClick={() => move(-1, 0)} className="bg-gray-700 hover:bg-gray-600 rounded p-2 text-center">⬆️</button>
        <div />
        <button onClick={() => move(0, -1)} className="bg-gray-700 hover:bg-gray-600 rounded p-2 text-center">⬅️</button>
        <button onClick={() => move(1, 0)} className="bg-gray-700 hover:bg-gray-600 rounded p-2 text-center">⬇️</button>
        <button onClick={() => move(0, 1)} className="bg-gray-700 hover:bg-gray-600 rounded p-2 text-center">➡️</button>
      </div>
    </div>
  );
}

function describeArc(x: number, y: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, r, endAngle);
  const end = polarToCartesian(x, y, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ============================================================
// MISSION 2: LASER GRID
// ============================================================
function Mission2({ onWin, onFail, hasWatch }: {
  onWin: (coins: number) => void; onFail: () => void; hasWatch: boolean;
}) {
  const timeLimit = hasWatch ? 40 : 30;
  const [time, setTime] = useState(timeLimit);
  const [playerX, setPlayerX] = useState(5);
  const [playerY, setPlayerY] = useState(90);
  const [tick, setTick] = useState(0);
  const [hit, setHit] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const lasers = useRef([
    { y: 20, speed: 0.8, offset: 0 },
    { y: 40, speed: -1.2, offset: 30 },
    { y: 55, speed: 1.0, offset: 60 },
    { y: 70, speed: -0.6, offset: 10 },
    { y: 30, speed: 0.5, offset: 50 },
  ]);

  useEffect(() => {
    if (hit) return;
    const iv = setInterval(() => {
      setTime(t => {
        if (t <= 0) { onFail(); return 0; }
        return +(t - 0.1).toFixed(1);
      });
      setTick(t => t + 1);
    }, 100);
    return () => clearInterval(iv);
  }, [hit]);

  const getLaserX = (laser: typeof lasers.current[0], t: number) => {
    const raw = (laser.offset + t * laser.speed) % 100;
    return raw < 0 ? raw + 100 : raw;
  };

  useEffect(() => {
    if (hit) return;
    for (const l of lasers.current) {
      const lx = getLaserX(l, tick);
      const ly = l.y;
      if (Math.abs(lx - playerX) < 8 && Math.abs(ly - playerY) < 8) {
        setHit(true);
        setTimeout(() => onFail(), 1000);
        return;
      }
    }
    if (playerY <= 5) {
      onWin(120);
    }
  }, [tick, playerX, playerY, hit]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hit) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPlayerX(x);
    setPlayerY(y);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        <span className="text-red-400 font-mono text-lg">⏱️ {time.toFixed(1)}초</span>
        <span className="text-gray-400 text-sm">위쪽 끝에 도달하세요!</span>
      </div>
      {hit && <div className="text-red-500 text-xl font-bold animate-pulse">⚡ 레이저에 감지됨!</div>}
      <div ref={containerRef} onClick={handleClick}
        className="relative w-full max-w-sm h-80 bg-gray-900 rounded-lg border border-red-900/50 cursor-crosshair overflow-hidden">
        {/* goal zone */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-green-900/40 border-b border-green-500/50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-xs text-green-400">도착!</div>
        {/* start zone */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-blue-900/30 border-t border-blue-500/30" />
        {/* lasers */}
        {lasers.current.map((l, i) => {
          const lx = getLaserX(l, tick);
          return (
            <div key={i} className="absolute" style={{
              left: `${lx - 10}%`, top: `${l.y - 1}%`,
              width: "20%", height: "2%",
              background: "linear-gradient(90deg, transparent, #ff0000, transparent)",
              boxShadow: "0 0 10px #ff0000",
              transition: "left 0.1s linear",
            }} />
          );
        })}
        {/* player */}
        <div className="absolute text-lg transition-all duration-200"
          style={{ left: `${playerX}%`, top: `${playerY}%`, transform: "translate(-50%,-50%)" }}>
          🕵️
        </div>
      </div>
      <p className="text-gray-500 text-xs">화면을 클릭하여 이동하세요</p>
    </div>
  );
}

// ============================================================
// MISSION 3: DISGUISE
// ============================================================
function Mission3({ onWin, onFail }: { onWin: (coins: number) => void; onFail: () => void }) {
  const allHats = ["🎩", "👒", "🧢", "👑", "🎓", "⛑️"];
  const allGlasses = ["🕶️", "👓", "🥽", "😎"];
  const allShirts = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠"];
  const allAccessories = ["💎", "⌚", "📿", "🧣", "🎀", "🪶"];

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"show" | "pick">("show");
  const [target, setTarget] = useState({ hat: "", glasses: "", shirt: "", accessory: "" });
  const [picked, setPicked] = useState({ hat: "", glasses: "", shirt: "", accessory: "" });
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [pickStep, setPickStep] = useState(0);
  const totalRounds = 5;

  const generateTarget = useCallback(() => {
    return {
      hat: allHats[Math.floor(Math.random() * allHats.length)],
      glasses: allGlasses[Math.floor(Math.random() * allGlasses.length)],
      shirt: allShirts[Math.floor(Math.random() * allShirts.length)],
      accessory: allAccessories[Math.floor(Math.random() * allAccessories.length)],
    };
  }, []);

  useEffect(() => {
    const t = generateTarget();
    setTarget(t);
    setPicked({ hat: "", glasses: "", shirt: "", accessory: "" });
    setPickStep(0);
    setPhase("show");
    const timer = setTimeout(() => setPhase("pick"), 3000 - round * 200);
    return () => clearTimeout(timer);
  }, [round]);

  const steps = [
    { key: "hat" as const, label: "모자", options: allHats },
    { key: "glasses" as const, label: "안경", options: allGlasses },
    { key: "shirt" as const, label: "옷 색상", options: allShirts },
    { key: "accessory" as const, label: "악세서리", options: allAccessories },
  ];

  const handlePick = (val: string) => {
    const step = steps[pickStep];
    const newPicked = { ...picked, [step.key]: val };
    setPicked(newPicked);

    if (val !== target[step.key]) {
      setMistakes(m => m + 1);
      if (mistakes + 1 >= 3) {
        onFail();
        return;
      }
    } else {
      setScore(s => s + 1);
    }

    if (pickStep < 3) {
      setPickStep(p => p + 1);
    } else {
      if (round + 1 >= totalRounds) {
        onWin(80 + score * 5);
      } else {
        setTimeout(() => setRound(r => r + 1), 800);
      }
    }
  };

  if (phase === "show") {
    return (
      <div className="flex flex-col items-center gap-4">
        <h3 className="text-green-400 font-bold">👀 기억하세요! (라운드 {round + 1}/{totalRounds})</h3>
        <div className="bg-gray-800 rounded-xl p-6 flex flex-col items-center gap-3 border border-green-500/30">
          <div className="text-5xl">{target.hat}</div>
          <div className="text-4xl">{target.glasses}</div>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ background: target.shirt === "🔴" ? "#ef4444" : target.shirt === "🔵" ? "#3b82f6" : target.shirt === "🟢" ? "#22c55e" : target.shirt === "🟡" ? "#eab308" : target.shirt === "🟣" ? "#a855f7" : "#f97316" }}>
            👤
          </div>
          <div className="text-4xl">{target.accessory}</div>
        </div>
        <p className="text-gray-400 text-sm animate-pulse">기억하세요...</p>
      </div>
    );
  }

  const currentStep = steps[pickStep];
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-green-400">라운드 {round + 1}/{totalRounds}</span>
        <span className="text-yellow-400">❌ {mistakes}/3</span>
      </div>
      <h3 className="text-cyan-400 font-bold">{currentStep.label}을(를) 고르세요!</h3>
      <div className="flex gap-3 flex-wrap justify-center">
        {currentStep.options.map(opt => (
          <button key={opt} onClick={() => handlePick(opt)}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-800 hover:bg-gray-700 rounded-xl text-2xl sm:text-3xl
              flex items-center justify-center border border-gray-600 hover:border-green-500 transition-colors">
            {opt}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        {steps.map((s, i) => (
          <div key={s.key} className={`px-2 py-1 rounded text-xs ${i < pickStep ? "bg-green-900 text-green-400" : i === pickStep ? "bg-cyan-900 text-cyan-400" : "bg-gray-800 text-gray-500"}`}>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MISSION 4: CODE BREAKING
// ============================================================
function Mission4({ onWin, onFail }: { onWin: (coins: number) => void; onFail: () => void }) {
  const puzzles = useRef([
    { encoded: "낯설은 밤의 요원", shift: 1, answer: "비밀 임무 개시", options: ["비밀 임무 개시", "작전 시작됨", "요원 투입 완료"] },
    { encoded: "3, 6, 12, 24, ?", shift: 0, answer: "48", options: ["36", "48", "30"] },
    { encoded: "★●▲★●▲★●?", shift: 0, answer: "▲", options: ["★", "●", "▲"] },
    { encoded: "ㅂㅅ ㅈㅇ ㅎㄱ", shift: 0, answer: "비상 작전 확인", options: ["비상 작전 확인", "본부 연락 필요", "적군 발견됨"] },
    { encoded: "1→2→4→7→11→?", shift: 0, answer: "16", options: ["14", "15", "16"] },
  ]);

  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState("");

  const p = puzzles.current[idx];

  const handleAnswer = (ans: string) => {
    if (ans === p.answer) {
      setScore(s => s + 1);
      setFeedback("✅ 정답!");
    } else {
      setMistakes(m => m + 1);
      setFeedback("❌ 틀렸어요!");
      if (mistakes + 1 >= 3) {
        setTimeout(() => onFail(), 800);
        return;
      }
    }
    setTimeout(() => {
      setFeedback("");
      if (idx + 1 >= puzzles.current.length) {
        onWin(90 + score * 10);
      } else {
        setIdx(i => i + 1);
      }
    }, 800);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-green-400">문제 {idx + 1}/5</span>
        <span className="text-yellow-400">❌ {mistakes}/3</span>
      </div>
      <div className="bg-gray-800 rounded-xl p-6 border border-green-500/30 w-full max-w-sm text-center">
        <p className="text-gray-400 text-sm mb-2">암호문:</p>
        <p className="text-green-400 font-mono text-xl mb-4">{p.encoded}</p>
      </div>
      {feedback ? (
        <p className={`text-xl font-bold ${feedback.includes("✅") ? "text-green-400" : "text-red-400"}`}>{feedback}</p>
      ) : (
        <div className="flex flex-col gap-2 w-full max-w-sm">
          {p.options.map(opt => (
            <button key={opt} onClick={() => handleAnswer(opt)}
              className="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 hover:border-cyan-500 text-white transition-colors">
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MISSION 5: CAR CHASE
// ============================================================
function Mission5({ onWin, onFail, hasJetpack, hasWatch }: {
  onWin: (coins: number) => void; onFail: () => void; hasJetpack: boolean; hasWatch: boolean;
}) {
  const timeLimit = hasWatch ? 55 : 45;
  const [lane, setLane] = useState(1);
  const [time, setTime] = useState(timeLimit);
  const [score, setScore] = useState(0);
  const [obstacles, setObstacles] = useState<{ lane: number; x: number; type: string }[]>([]);
  const [boosts, setBoosts] = useState<{ lane: number; x: number }[]>([]);
  const [hit, setHit] = useState(false);
  const [lives, setLives] = useState(hasJetpack ? 4 : 3);
  const [boosted, setBoosted] = useState(false);
  const tickRef = useRef(0);

  useEffect(() => {
    if (hit) return;
    const iv = setInterval(() => {
      tickRef.current++;
      setTime(t => {
        if (t <= 0) { onWin(110 + score * 2); return 0; }
        return +(t - 0.1).toFixed(1);
      });

      setObstacles(prev => {
        let next = prev.map(o => ({ ...o, x: o.x - 5 })).filter(o => o.x > -10);
        if (tickRef.current % 8 === 0) {
          const types = ["🚙", "🚧", "🛢️"];
          next.push({
            lane: Math.floor(Math.random() * 3),
            x: 105,
            type: types[Math.floor(Math.random() * types.length)],
          });
        }
        return next;
      });

      setBoosts(prev => {
        let next = prev.map(b => ({ ...b, x: b.x - 5 })).filter(b => b.x > -10);
        if (tickRef.current % 25 === 0) {
          next.push({ lane: Math.floor(Math.random() * 3), x: 105 });
        }
        return next;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [hit, score]);

  useEffect(() => {
    if (hit) return;
    for (const o of obstacles) {
      if (o.lane === lane && o.x >= 5 && o.x <= 20) {
        if (boosted) {
          setBoosted(false);
          continue;
        }
        setLives(l => {
          if (l <= 1) {
            setHit(true);
            setTimeout(() => onFail(), 1000);
            return 0;
          }
          return l - 1;
        });
        setObstacles(prev => prev.filter(ob => ob !== o));
        return;
      }
    }
    for (const b of boosts) {
      if (b.lane === lane && b.x >= 5 && b.x <= 20) {
        setBoosted(true);
        setScore(s => s + 10);
        setBoosts(prev => prev.filter(bo => bo !== b));
      }
    }
  }, [obstacles, boosts, lane, hit, boosted]);

  const lanes = [0, 1, 2];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-red-400 font-mono">⏱️ {time.toFixed(1)}초</span>
        <span className="text-green-400">💰 {score}</span>
        <span className="text-yellow-400">{"❤️".repeat(lives)}</span>
        {boosted && <span className="text-cyan-400 animate-pulse">⚡ 부스트!</span>}
      </div>
      {hit && <div className="text-red-500 text-xl font-bold animate-pulse">💥 충돌!</div>}
      <div className="relative w-full max-w-sm h-48 bg-gray-800 rounded-lg border border-gray-600 overflow-hidden">
        {/* road */}
        {lanes.map(l => (
          <div key={l} className={`absolute left-0 right-0 h-16 border-b border-dashed border-gray-600
            ${l === lane ? "bg-gray-700/50" : ""}`}
            style={{ top: `${l * 64}px` }}
            onClick={() => setLane(l)}
          />
        ))}
        {/* player car */}
        <div className="absolute text-2xl transition-all duration-150"
          style={{ left: "10%", top: `${lane * 64 + 16}px` }}>
          🚗
        </div>
        {/* obstacles */}
        {obstacles.map((o, i) => (
          <div key={i} className="absolute text-2xl transition-all duration-100"
            style={{ left: `${o.x}%`, top: `${o.lane * 64 + 16}px` }}>
            {o.type}
          </div>
        ))}
        {/* boosts */}
        {boosts.map((b, i) => (
          <div key={`b${i}`} className="absolute text-xl transition-all duration-100 animate-pulse"
            style={{ left: `${b.x}%`, top: `${b.lane * 64 + 18}px` }}>
            ⚡
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {lanes.map(l => (
          <button key={l} onClick={() => setLane(l)}
            className={`px-6 py-2 rounded-lg font-bold ${l === lane ? "bg-green-700 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
            {l === 0 ? "⬆️" : l === 1 ? "➡️" : "⬇️"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MISSION 6: HACKING
// ============================================================
function Mission6({ onWin, onFail }: { onWin: (coins: number) => void; onFail: () => void }) {
  const [phase, setPhase] = useState<"password" | "firewall" | "virus">("password");
  // PASSWORD
  const [secret] = useState(() => Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)));
  const [guess, setGuess] = useState<number[]>([]);
  const [attempts, setAttempts] = useState<{ guess: number[]; correct: number; position: number }[]>([]);
  const [pwTries, setPwTries] = useState(0);
  // FIREWALL
  const [sequence, setSequence] = useState<number[]>([]);
  const [seqLength, setSeqLength] = useState(3);
  const [showSeq, setShowSeq] = useState(true);
  const [userSeq, setUserSeq] = useState<number[]>([]);
  const [fwRound, setFwRound] = useState(0);
  // VIRUS
  const [viruses, setViruses] = useState<{ id: number; x: number; y: number; alive: boolean }[]>([]);
  const [virusScore, setVirusScore] = useState(0);
  const [virusTime, setVirusTime] = useState(15);
  const virusIdRef = useRef(0);

  // PASSWORD PHASE
  const addDigit = (d: number) => {
    if (guess.length >= 4) return;
    setGuess([...guess, d]);
  };

  const submitGuess = () => {
    if (guess.length !== 4) return;
    let correct = 0, position = 0;
    const sc = [...secret], gc = [...guess];
    for (let i = 0; i < 4; i++) {
      if (gc[i] === sc[i]) { position++; sc[i] = -1; gc[i] = -2; }
    }
    for (let i = 0; i < 4; i++) {
      if (gc[i] === -2) continue;
      const idx = sc.indexOf(gc[i]);
      if (idx >= 0) { correct++; sc[idx] = -1; }
    }
    setAttempts([...attempts, { guess: [...guess], correct, position }]);
    if (position === 4) {
      setTimeout(() => {
        setPhase("firewall");
        initFirewall(3);
      }, 800);
    } else {
      setPwTries(t => t + 1);
      if (pwTries + 1 >= 8) { onFail(); return; }
    }
    setGuess([]);
  };

  // FIREWALL PHASE
  const initFirewall = (len: number) => {
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 6));
    setSequence(seq);
    setSeqLength(len);
    setShowSeq(true);
    setUserSeq([]);
    setTimeout(() => setShowSeq(false), len * 600 + 500);
  };

  const handleFwClick = (n: number) => {
    if (showSeq) return;
    const newSeq = [...userSeq, n];
    setUserSeq(newSeq);
    if (newSeq[newSeq.length - 1] !== sequence[newSeq.length - 1]) {
      onFail();
      return;
    }
    if (newSeq.length === sequence.length) {
      setFwRound(r => r + 1);
      if (fwRound + 1 >= 3) {
        setTimeout(() => {
          setPhase("virus");
          startVirus();
        }, 500);
      } else {
        setTimeout(() => initFirewall(seqLength + 1), 500);
      }
    }
  };

  // VIRUS PHASE
  const startVirus = () => {
    setVirusScore(0);
    setVirusTime(15);
  };

  useEffect(() => {
    if (phase !== "virus") return;
    const iv = setInterval(() => {
      setVirusTime(t => {
        if (t <= 0) {
          clearInterval(iv);
          if (virusScore >= 10) onWin(130);
          else onFail();
          return 0;
        }
        return +(t - 0.1).toFixed(1);
      });
    }, 100);
    return () => clearInterval(iv);
  }, [phase, virusScore]);

  useEffect(() => {
    if (phase !== "virus") return;
    const iv = setInterval(() => {
      virusIdRef.current++;
      setViruses(prev => [
        ...prev.filter(v => v.alive).slice(-8),
        { id: virusIdRef.current, x: Math.random() * 80 + 5, y: Math.random() * 80 + 5, alive: true },
      ]);
    }, 800);
    return () => clearInterval(iv);
  }, [phase]);

  const killVirus = (id: number) => {
    setViruses(prev => prev.map(v => v.id === id ? { ...v, alive: false } : v));
    setVirusScore(s => s + 1);
  };

  if (phase === "password") {
    return (
      <div className="flex flex-col items-center gap-3 relative">
        <CodeRain />
        <h3 className="text-green-400 font-bold z-10">🔑 비밀번호 해독</h3>
        <p className="text-gray-400 text-sm z-10">4자리 숫자를 맞춰보세요! (시도 {pwTries}/8)</p>
        <div className="flex gap-2 z-10">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="w-12 h-14 bg-gray-800 border border-green-500/50 rounded flex items-center justify-center text-2xl text-green-400 font-mono">
              {guess[i] ?? "_"}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1 z-10">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
            <button key={d} onClick={() => addDigit(d)}
              className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded text-green-400 font-mono text-lg">
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-2 z-10">
          <button onClick={() => setGuess([])} className="px-4 py-2 bg-red-800 hover:bg-red-700 rounded text-white text-sm">지우기</button>
          <button onClick={submitGuess} className="px-4 py-2 bg-green-800 hover:bg-green-700 rounded text-white text-sm">확인</button>
        </div>
        <div className="space-y-1 z-10 w-full max-w-xs">
          {attempts.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-sm font-mono">
              <span className="text-gray-400">{a.guess.join("")}</span>
              <span className="text-green-400">위치맞음:{a.position}</span>
              <span className="text-yellow-400">숫자맞음:{a.correct}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "firewall") {
    const nodeColors = ["bg-red-600", "bg-blue-600", "bg-green-600", "bg-yellow-600", "bg-purple-600", "bg-cyan-600"];
    return (
      <div className="flex flex-col items-center gap-4 relative">
        <CodeRain />
        <h3 className="text-cyan-400 font-bold z-10">🛡️ 방화벽 해제 (라운드 {fwRound + 1}/3)</h3>
        <p className="text-gray-400 text-sm z-10">{showSeq ? "순서를 기억하세요!" : "같은 순서로 클릭!"}</p>
        <div className="grid grid-cols-3 gap-3 z-10">
          {[0, 1, 2, 3, 4, 5].map(n => {
            const isActive = showSeq && sequence.includes(n);
            const showIdx = showSeq ? sequence.indexOf(n) : -1;
            return (
              <button key={n} onClick={() => handleFwClick(n)}
                className={`w-16 h-16 rounded-xl ${nodeColors[n]} transition-all duration-200
                  ${isActive ? "ring-4 ring-white scale-110" : "opacity-60 hover:opacity-100"}
                  ${userSeq.includes(n) ? "ring-2 ring-green-400" : ""}`}>
                {showSeq && showIdx >= 0 && <span className="text-white font-bold text-lg">{showIdx + 1}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // VIRUS
  return (
    <div className="flex flex-col items-center gap-3 relative">
      <CodeRain />
      <h3 className="text-red-400 font-bold z-10">🦠 바이러스 제거!</h3>
      <div className="flex gap-4 text-sm z-10">
        <span className="text-red-400 font-mono">⏱️ {virusTime.toFixed(1)}초</span>
        <span className="text-green-400">제거: {virusScore}/10</span>
      </div>
      <div className="relative w-full max-w-sm h-64 bg-gray-900/80 rounded-lg border border-red-500/30 z-10 overflow-hidden">
        {viruses.filter(v => v.alive).map(v => (
          <button key={v.id} onClick={() => killVirus(v.id)}
            className="absolute w-10 h-10 text-2xl animate-pulse hover:scale-125 transition-transform"
            style={{ left: `${v.x}%`, top: `${v.y}%` }}>
            🦠
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MISSION 7: BOSS FIGHT
// ============================================================
function Mission7({ onWin, onFail }: { onWin: (coins: number) => void; onFail: () => void }) {
  const [playerHP, setPlayerHP] = useState(100);
  const [bossHP, setBossHP] = useState(150);
  const [bossPhase, setBossPhase] = useState(1);
  const [turn, setTurn] = useState<"player" | "boss" | "result">("player");
  const [dodge, setDodge] = useState(false);
  const [stun, setStun] = useState(false);
  const [dot, setDot] = useState(0);
  const [log, setLog] = useState<string[]>(["보스가 나타났다! 🦹‍♂️"]);
  const [bossAnim, setBossAnim] = useState("");

  useEffect(() => {
    if (bossHP <= 100 && bossPhase === 1) setBossPhase(2);
    if (bossHP <= 50 && bossPhase === 2) setBossPhase(3);
  }, [bossHP, bossPhase]);

  useEffect(() => {
    if (turn !== "boss") return;
    const timer = setTimeout(() => {
      if (stun) {
        setLog(l => [...l, "보스가 기절 상태! 턴 스킵!"]);
        setStun(false);
        setTurn("player");
        return;
      }

      // Apply DOT
      if (dot > 0) {
        setBossHP(h => Math.max(0, h - 8));
        setDot(d => d - 1);
        setLog(l => [...l, "🪤 함정 데미지! -8"]);
      }

      const attacks = bossPhase === 1
        ? [{ name: "주먹", dmg: 12 }]
        : bossPhase === 2
        ? [{ name: "주먹", dmg: 15 }, { name: "레이저", dmg: 20 }]
        : [{ name: "주먹", dmg: 18 }, { name: "레이저", dmg: 22 }, { name: "폭탄", dmg: 30 }];

      const atk = attacks[Math.floor(Math.random() * attacks.length)];
      setBossAnim("animate-bounce");
      setTimeout(() => setBossAnim(""), 500);

      if (dodge) {
        setLog(l => [...l, `보스의 ${atk.name}! 연막탄으로 회피!`]);
        setDodge(false);
      } else {
        setPlayerHP(h => {
          const nh = Math.max(0, h - atk.dmg);
          if (nh <= 0) {
            setTurn("result");
            setTimeout(() => onFail(), 1000);
          }
          return nh;
        });
        setLog(l => [...l, `보스의 ${atk.name}! -${atk.dmg} 데미지`]);
      }
      if (playerHP - (dodge ? 0 : 0) > 0) setTurn("player");
    }, 1200);
    return () => clearTimeout(timer);
  }, [turn]);

  const attack = (type: string) => {
    if (turn !== "player") return;
    let msg = "";
    switch (type) {
      case "gun":
        const dmg = 15 + Math.floor(Math.random() * 10);
        setBossHP(h => {
          const nh = Math.max(0, h - dmg);
          if (nh <= 0) { setTurn("result"); setTimeout(() => onWin(150), 1000); }
          return nh;
        });
        msg = `🔫 가젯 건! -${dmg} 데미지`;
        break;
      case "smoke":
        setDodge(true);
        msg = "💣 연막탄! 다음 공격 회피!";
        break;
      case "heal":
        setPlayerHP(h => Math.min(100, h + 25));
        msg = "💊 치료제! +25 HP";
        break;
      case "shock":
        setStun(true);
        const sdmg = 8;
        setBossHP(h => Math.max(0, h - sdmg));
        msg = `⚡ 전기충격! -${sdmg} + 기절`;
        break;
      case "trap":
        setDot(3);
        msg = "🪤 함정 설치! 3턴간 데미지";
        break;
    }
    setLog(l => [...l, msg]);
    setTurn("boss");
  };

  const bossEmoji = bossPhase === 1 ? "🦹‍♂️" : bossPhase === 2 ? "😈" : "👿";

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md">
      {/* Boss */}
      <div className="flex flex-col items-center gap-1">
        <span className={`text-5xl ${bossAnim}`}>{bossEmoji}</span>
        <span className="text-red-400 text-xs">페이즈 {bossPhase}</span>
        <div className="w-48 h-3 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(bossHP / 150) * 100}%` }} />
        </div>
        <span className="text-red-400 text-sm font-mono">{bossHP}/150 HP</span>
      </div>
      {/* Player */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-48 h-3 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${playerHP}%` }} />
        </div>
        <span className="text-green-400 text-sm font-mono">{playerHP}/100 HP</span>
        <div className="flex gap-1 text-xs">
          {dodge && <span className="text-purple-400">🛡️ 회피</span>}
          {dot > 0 && <span className="text-orange-400">🪤 함정 {dot}턴</span>}
        </div>
      </div>
      {/* Actions */}
      {turn === "player" && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { type: "gun", label: "🔫 공격" },
            { type: "smoke", label: "💣 회피" },
            { type: "heal", label: "💊 회복" },
            { type: "shock", label: "⚡ 기절" },
            { type: "trap", label: "🪤 함정" },
          ].map(a => (
            <button key={a.type} onClick={() => attack(a.type)}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 hover:border-green-500 text-sm text-white transition-colors">
              {a.label}
            </button>
          ))}
        </div>
      )}
      {turn === "boss" && <p className="text-yellow-400 animate-pulse">보스의 턴...</p>}
      {/* Log */}
      <div className="w-full max-h-24 overflow-y-auto bg-gray-900/50 rounded p-2 text-xs text-gray-400 font-mono space-y-0.5">
        {log.slice(-5).map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}

// ============================================================
// MISSION 8: ESCAPE
// ============================================================
function Mission8({ onWin, onFail, hasWatch }: {
  onWin: (coins: number) => void; onFail: () => void; hasWatch: boolean;
}) {
  const timeLimit = hasWatch ? 70 : 60;
  const [time, setTime] = useState(timeLimit);
  const [stage, setStage] = useState(0);
  const [barPos, setBarPos] = useState(0);
  const [failed, setFailed] = useState(false);
  const [doorChoice, setDoorChoice] = useState(-1);
  const [safeDoor] = useState(() => Math.random() < 0.5 ? 0 : 1);

  const stages = ["점프!", "슬라이드!", "문 선택!", "헬기 로프!"];

  useEffect(() => {
    const iv = setInterval(() => {
      setTime(t => {
        if (t <= 0) { onFail(); return 0; }
        return +(t - 0.1).toFixed(1);
      });
    }, 100);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (stage === 0 || stage === 1 || stage === 3) {
      const iv = setInterval(() => {
        setBarPos(p => (p + 3) % 100);
      }, 30);
      return () => clearInterval(iv);
    }
  }, [stage]);

  const handleTap = () => {
    if (failed) return;
    const inZone = barPos >= 35 && barPos <= 65;
    if (inZone) {
      if (stage >= 3) {
        onWin(200);
      } else {
        setStage(s => s + 1);
        setBarPos(0);
      }
    } else {
      setFailed(true);
      setTimeout(() => onFail(), 1000);
    }
  };

  const handleDoor = (d: number) => {
    setDoorChoice(d);
    if (d === safeDoor) {
      setTimeout(() => {
        setStage(3);
        setBarPos(0);
      }, 800);
    } else {
      setFailed(true);
      setTimeout(() => onFail(), 1000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <span className="text-red-400 font-mono text-lg animate-pulse">💥 {time.toFixed(1)}초</span>
        <span className="text-yellow-400 font-bold">{stages[stage]}</span>
      </div>
      {failed && <div className="text-red-500 text-xl font-bold animate-pulse">실패!</div>}

      {stage === 2 ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400">어느 문을 열까요?</p>
          <div className="flex gap-6">
            {[0, 1].map(d => (
              <button key={d} onClick={() => handleDoor(d)}
                className={`w-24 h-32 rounded-lg text-4xl flex items-center justify-center transition-colors
                  ${doorChoice === d
                    ? d === safeDoor ? "bg-green-800 border-2 border-green-400" : "bg-red-800 border-2 border-red-400"
                    : "bg-gray-700 hover:bg-gray-600 border-2 border-gray-500"}`}>
                {doorChoice === d ? (d === safeDoor ? "✅" : "💀") : "🚪"}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-72 h-8 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
            {/* target zone */}
            <div className="absolute h-full bg-green-900/50 border-x border-green-500"
              style={{ left: "35%", width: "30%" }} />
            {/* moving bar */}
            <div className="absolute h-full w-1.5 bg-cyan-400 shadow-lg shadow-cyan-400/50 transition-all duration-[30ms]"
              style={{ left: `${barPos}%` }} />
          </div>
          <div className="text-5xl">
            {stage === 0 ? "🏃" : stage === 1 ? "🤸" : "🚁"}
          </div>
          <button onClick={handleTap}
            className="px-12 py-4 bg-red-700 hover:bg-red-600 rounded-xl text-white text-xl font-bold
              shadow-lg shadow-red-500/30 active:scale-95 transition-transform">
            {stage === 0 ? "점프!" : stage === 1 ? "슬라이드!" : "잡기!"}
          </button>
          <p className="text-gray-500 text-xs">초록색 영역에서 탭하세요!</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN GAME COMPONENT
// ============================================================
export default function SpyGame() {
  const [screen, setScreen] = useState<Screen>("profile");
  const [profile, setProfile] = useState<SpyProfile>({
    codename: "",
    avatar: "🕵️",
    agency: "블랙팬서",
    stats: { stealth: 50, hacking: 50, combat: 50, charm: 50, stamina: 50 },
  });
  const [coins, setCoins] = useState(0);
  const [completedMissions, setCompletedMissions] = useState<Set<number>>(new Set());
  const [currentMission, setCurrentMission] = useState(1);
  const [ownedGadgets, setOwnedGadgets] = useState<Set<string>>(new Set());
  const [briefingDone, setBriefingDone] = useState(false);

  const rank = getRank(completedMissions.size);
  const hasGadget = (id: string) => ownedGadgets.has(id);

  const startMission = (id: number) => {
    setCurrentMission(id);
    setBriefingDone(false);
    setScreen("mission-briefing");
  };

  const onMissionWin = (bonusCoins: number) => {
    setCoins(c => c + bonusCoins);
    setCompletedMissions(prev => new Set([...prev, currentMission]));
    if (completedMissions.size + 1 >= 8) {
      setScreen("game-complete");
    } else {
      setScreen("mission-complete");
    }
  };

  const onMissionFail = () => {
    setScreen("mission-fail");
  };

  const buyGadget = (g: Gadget) => {
    if (coins >= g.cost && !ownedGadgets.has(g.id)) {
      setCoins(c => c - g.cost);
      setOwnedGadgets(prev => new Set([...prev, g.id]));
    }
  };

  // ============================================================
  // PROFILE SCREEN
  // ============================================================
  if (screen === "profile") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 text-white">
        <div className="max-w-lg mx-auto p-6">
          <Link href="/" className="inline-flex items-center gap-1 text-gray-400 hover:text-green-400 text-sm mb-6 transition-colors">
            ← 홈으로
          </Link>
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-green-400">🕵️ 스파이</span> <span className="text-cyan-400">되기</span>
            </h1>
            <p className="text-gray-400">Become a Spy!</p>
          </div>

          <div className="bg-gray-900/80 rounded-2xl p-6 border border-green-500/20 space-y-6">
            <h2 className="text-green-400 font-bold text-lg text-center">📋 스파이 프로필</h2>

            {/* Codename */}
            <div>
              <label className="text-gray-400 text-sm block mb-1">코드네임</label>
              <input
                value={profile.codename}
                onChange={e => setProfile({ ...profile, codename: e.target.value })}
                placeholder="코드네임을 입력하세요"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-green-400 font-mono
                  focus:outline-none focus:border-green-500 placeholder-gray-600"
                maxLength={12}
              />
            </div>

            {/* Avatar */}
            <div>
              <label className="text-gray-400 text-sm block mb-2">아바타</label>
              <div className="flex gap-3 justify-center">
                {AVATARS.map(a => (
                  <button key={a} onClick={() => setProfile({ ...profile, avatar: a })}
                    className={`text-3xl p-2 rounded-xl transition-all ${profile.avatar === a ? "bg-green-900 ring-2 ring-green-400 scale-110" : "bg-gray-800 hover:bg-gray-700"}`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Agency */}
            <div>
              <label className="text-gray-400 text-sm block mb-2">소속 기관</label>
              <div className="grid grid-cols-3 gap-2">
                {AGENCIES.map(ag => (
                  <button key={ag.name} onClick={() => setProfile({ ...profile, agency: ag.name })}
                    className={`py-2 px-3 rounded-lg text-sm font-bold bg-gradient-to-r ${ag.color} transition-all
                      ${profile.agency === ag.name ? "ring-2 ring-green-400 scale-105" : "opacity-60 hover:opacity-100"}`}>
                    {ag.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div>
              <label className="text-gray-400 text-sm block mb-2">스탯 배분 (탭하여 +10)</label>
              <div className="space-y-2">
                {(["stealth", "hacking", "combat", "charm", "stamina"] as const).map(s => {
                  const labels = { stealth: "🥷 은신", hacking: "💻 해킹", combat: "⚔️ 전투", charm: "✨ 매력", stamina: "💪 체력" };
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <span className="text-sm w-20">{labels[s]}</span>
                      <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden cursor-pointer"
                        onClick={() => {
                          const total = Object.values(profile.stats).reduce((a, b) => a + b, 0);
                          if (total < 300 && profile.stats[s] < 100) {
                            setProfile({
                              ...profile,
                              stats: { ...profile.stats, [s]: Math.min(100, profile.stats[s] + 10) },
                            });
                          }
                        }}>
                        <div className="h-full bg-gradient-to-r from-green-600 to-cyan-500 transition-all duration-200"
                          style={{ width: `${profile.stats[s]}%` }} />
                      </div>
                      <span className="text-green-400 text-xs font-mono w-8">{profile.stats[s]}</span>
                    </div>
                  );
                })}
                <p className="text-gray-500 text-xs text-right">
                  포인트: {Object.values(profile.stats).reduce((a, b) => a + b, 0)}/300
                </p>
              </div>
            </div>

            <button
              onClick={() => { if (profile.codename.trim()) setScreen("hub"); }}
              disabled={!profile.codename.trim()}
              className={`w-full py-3 rounded-xl font-bold text-lg transition-all
                ${profile.codename.trim()
                  ? "bg-gradient-to-r from-green-700 to-cyan-700 hover:from-green-600 hover:to-cyan-600 text-white"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed"}`}>
              🕵️ 임무 시작!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // HUB SCREEN
  // ============================================================
  if (screen === "hub") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 text-white">
        <div className="max-w-lg mx-auto p-6">
          <Link href="/" className="inline-flex items-center gap-1 text-gray-400 hover:text-green-400 text-sm mb-4 transition-colors">
            ← 홈으로
          </Link>

          {/* Agent Card */}
          <div className="bg-gray-900/80 rounded-2xl p-4 border border-green-500/20 mb-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{profile.avatar}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-mono font-bold">{profile.codename}</span>
                  <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">{profile.agency}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span>{rank.icon}</span>
                  <span className="text-sm text-gray-400">{rank.name}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-yellow-400 font-bold">💰 {coins}</div>
                <div className="text-gray-500 text-xs">{completedMissions.size}/8 완료</div>
              </div>
            </div>
          </div>

          {/* Mission List */}
          <h2 className="text-green-400 font-bold text-lg mb-3">📋 미션 목록</h2>
          <div className="space-y-2 mb-6">
            {MISSIONS.map(m => {
              const completed = completedMissions.has(m.id);
              const unlocked = m.id === 1 || completedMissions.has(m.id - 1) || completed;
              return (
                <button key={m.id} onClick={() => unlocked && startMission(m.id)}
                  disabled={!unlocked}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left
                    ${completed
                      ? "bg-green-900/30 border border-green-500/30"
                      : unlocked
                        ? "bg-gray-800/80 border border-gray-600 hover:border-green-500 hover:bg-gray-700/50"
                        : "bg-gray-900/50 border border-gray-800 opacity-40 cursor-not-allowed"}`}>
                  <span className="text-2xl">{completed ? "✅" : unlocked ? m.icon : "🔒"}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{m.title}</div>
                    <div className="text-xs text-gray-500">{m.subtitle} · {m.location}</div>
                  </div>
                  <span className="text-xs text-gray-500">#{m.id}</span>
                </button>
              );
            })}
          </div>

          {/* Shop Button */}
          <button onClick={() => setScreen("shop")}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 font-bold transition-all">
            🛒 장비 상점
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // SHOP SCREEN
  // ============================================================
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 text-white">
        <div className="max-w-lg mx-auto p-6">
          <button onClick={() => setScreen("hub")}
            className="inline-flex items-center gap-1 text-gray-400 hover:text-green-400 text-sm mb-6 transition-colors">
            ← 미션 목록
          </button>
          <h2 className="text-2xl font-bold text-center text-green-400 mb-2">🛒 스파이 장비 상점</h2>
          <p className="text-center text-yellow-400 mb-6">💰 보유 코인: {coins}</p>

          <div className="grid grid-cols-1 gap-3">
            {GADGETS.map(g => {
              const owned = ownedGadgets.has(g.id);
              const canBuy = coins >= g.cost && !owned;
              return (
                <div key={g.id} className={`p-4 rounded-xl border flex items-center gap-3
                  ${owned ? "bg-green-900/20 border-green-500/30" : "bg-gray-800/80 border-gray-600"}`}>
                  <span className="text-3xl">{g.icon}</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{g.name}</div>
                    <div className="text-xs text-gray-400">{g.desc}</div>
                  </div>
                  {owned ? (
                    <span className="text-green-400 text-sm font-bold">보유중</span>
                  ) : (
                    <button onClick={() => buyGadget(g)}
                      disabled={!canBuy}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors
                        ${canBuy ? "bg-yellow-700 hover:bg-yellow-600 text-white" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}>
                      💰 {g.cost}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MISSION BRIEFING
  // ============================================================
  if (screen === "mission-briefing") {
    const m = MISSIONS[currentMission - 1];
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 text-white flex items-center justify-center">
        <div className="max-w-md mx-auto p-6 text-center">
          <div className="bg-gray-900/90 rounded-2xl p-8 border border-green-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-cyan-500 to-green-500" />
            <div className="text-xs text-green-400 font-mono mb-2">TOP SECRET // 극비</div>
            <div className="text-6xl mb-4">{m.icon}</div>
            <h2 className="text-2xl font-bold text-green-400 mb-1">미션 #{m.id}</h2>
            <h3 className="text-xl font-bold mb-2">{m.title}</h3>
            <p className="text-gray-400 text-sm mb-4">{m.location}</p>
            <div className="text-sm text-gray-300 mb-6 min-h-[2.5rem]">
              <TypewriterText
                text={`요원 ${profile.codename}, ${m.title} 임무가 할당되었습니다. 행운을 빕니다.`}
                speed={35}
                onDone={() => setBriefingDone(true)}
              />
            </div>
            {briefingDone && (
              <button onClick={() => setScreen("mission")}
                className="px-8 py-3 bg-gradient-to-r from-green-700 to-cyan-700 hover:from-green-600 hover:to-cyan-600
                  rounded-xl text-white font-bold transition-all animate-pulse">
                🚀 임무 시작!
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MISSION SCREEN
  // ============================================================
  if (screen === "mission") {
    const m = MISSIONS[currentMission - 1];
    const nightVision = currentMission === 1;

    return (
      <div className={`min-h-screen text-white ${nightVision ? "bg-gradient-to-b from-green-950 via-green-900/20 to-gray-950" : "bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950"}`}>
        <div className="max-w-lg mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">미션 #{m.id}: {m.title}</span>
            <button onClick={() => setScreen("hub")} className="text-sm text-red-400 hover:text-red-300">포기 ✕</button>
          </div>

          {currentMission === 1 && (
            <Mission1
              onWin={onMissionWin} onFail={onMissionFail}
              hasGoggles={hasGadget("goggles")}
              hasSilencer={hasGadget("silencer")}
              hasSmoke={hasGadget("smoke")}
            />
          )}
          {currentMission === 2 && (
            <Mission2 onWin={onMissionWin} onFail={onMissionFail} hasWatch={hasGadget("watch")} />
          )}
          {currentMission === 3 && (
            <Mission3 onWin={onMissionWin} onFail={onMissionFail} />
          )}
          {currentMission === 4 && (
            <Mission4 onWin={onMissionWin} onFail={onMissionFail} />
          )}
          {currentMission === 5 && (
            <Mission5 onWin={onMissionWin} onFail={onMissionFail} hasJetpack={hasGadget("jetpack")} hasWatch={hasGadget("watch")} />
          )}
          {currentMission === 6 && (
            <Mission6 onWin={onMissionWin} onFail={onMissionFail} />
          )}
          {currentMission === 7 && (
            <Mission7 onWin={onMissionWin} onFail={onMissionFail} />
          )}
          {currentMission === 8 && (
            <Mission8 onWin={onMissionWin} onFail={onMissionFail} hasWatch={hasGadget("watch")} />
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // MISSION COMPLETE
  // ============================================================
  if (screen === "mission-complete") {
    const m = MISSIONS[currentMission - 1];
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 text-white flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <h2 className="text-3xl font-bold text-green-400 mb-2">미션 성공!</h2>
          <p className="text-gray-400 mb-4">{m.title} 완료!</p>
          <div className="bg-gray-900/80 rounded-xl p-4 border border-green-500/30 mb-6 inline-block">
            <div className="text-yellow-400 font-bold">💰 코인 획득!</div>
            <div className="text-sm text-gray-400 mt-1">{rank.icon} 현재 랭크: {rank.name}</div>
            <div className="text-sm text-gray-400">{completedMissions.size}/8 미션 완료</div>
          </div>
          <div>
            <button onClick={() => setScreen("hub")}
              className="px-8 py-3 bg-gradient-to-r from-green-700 to-cyan-700 rounded-xl text-white font-bold">
              계속하기 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MISSION FAIL
  // ============================================================
  if (screen === "mission-fail") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-red-950/20 to-gray-950 text-white flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-6xl mb-4">😵</div>
          <h2 className="text-3xl font-bold text-red-400 mb-2">미션 실패!</h2>
          <p className="text-gray-400 mb-6">다시 도전하세요!</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setBriefingDone(false); setScreen("mission-briefing"); }}
              className="px-6 py-3 bg-red-800 hover:bg-red-700 rounded-xl text-white font-bold">
              🔄 재도전
            </button>
            <button onClick={() => setScreen("hub")}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-bold">
              미션 목록
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // GAME COMPLETE
  // ============================================================
  if (screen === "game-complete") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-yellow-950/20 to-gray-950 text-white flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-7xl mb-4">⭐</div>
          <h2 className="text-4xl font-bold text-yellow-400 mb-2">축하합니다!</h2>
          <h3 className="text-2xl text-green-400 mb-4">더블오 에이전트 달성!</h3>
          <p className="text-gray-400 mb-2">요원 <span className="text-green-400 font-mono">{profile.codename}</span></p>
          <p className="text-gray-400 mb-6">모든 미션을 완료했습니다!</p>
          <div className="bg-gray-900/80 rounded-xl p-4 border border-yellow-500/30 mb-6 inline-block">
            <div className="text-yellow-400 font-bold text-lg">💰 총 코인: {coins}</div>
            <div className="text-sm text-gray-400 mt-1">⭐ 최종 랭크: 더블오 에이전트</div>
            <div className="text-sm text-gray-400">🎖️ 장비 보유: {ownedGadgets.size}개</div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setScreen("hub")}
              className="px-6 py-3 bg-gradient-to-r from-yellow-700 to-amber-700 rounded-xl text-white font-bold">
              미션 목록
            </button>
            <Link href="/"
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-bold">
              홈으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
