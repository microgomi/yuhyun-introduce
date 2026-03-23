"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "selectBlade" | "selectMaterial" | "mining" | "smelting" | "hammering" | "polishing" | "gemSetting" | "naming" | "result" | "collection";
type BladeType = "직검" | "곡검" | "대검" | "단검";
type Material = "철" | "강철" | "미스릴" | "드래곤본";

interface CraftedSword {
  id: number;
  name: string;
  bladeType: BladeType;
  material: Material;
  gem: { name: string; emoji: string; color: string };
  scores: {
    mining: number;
    smelting: number;
    hammering: number;
    polishing: number;
  };
  stats: { attack: number; durability: number; magic: number };
  grade: string;
  gradeColor: string;
}

// --- Constants ---
const BLADE_TYPES: { type: BladeType; emoji: string; desc: string; atkBonus: number; durBonus: number; magBonus: number }[] = [
  { type: "직검", emoji: "🗡️", desc: "곧고 강한 정통 검", atkBonus: 10, durBonus: 15, magBonus: 5 },
  { type: "곡검", emoji: "⚔️", desc: "휘어진 날의 빠른 검", atkBonus: 15, durBonus: 5, magBonus: 10 },
  { type: "대검", emoji: "🔱", desc: "거대하고 강력한 검", atkBonus: 20, durBonus: 10, magBonus: 0 },
  { type: "단검", emoji: "🔪", desc: "작지만 치명적인 검", atkBonus: 8, durBonus: 5, magBonus: 15 },
];

const MATERIALS: { name: Material; emoji: string; desc: string; mult: number; color: string }[] = [
  { name: "철", emoji: "⛏️", desc: "기본적인 금속", mult: 1.0, color: "text-gray-400" },
  { name: "강철", emoji: "🔩", desc: "단련된 강한 금속", mult: 1.3, color: "text-blue-400" },
  { name: "미스릴", emoji: "💎", desc: "신비한 요정의 금속", mult: 1.7, color: "text-purple-400" },
  { name: "드래곤본", emoji: "🐉", desc: "용의 뼈로 만든 전설의 소재", mult: 2.2, color: "text-red-400" },
];

const GEMS: { name: string; emoji: string; color: string; magBonus: number; effect: string }[] = [
  { name: "루비", emoji: "🔴", color: "text-red-400", magBonus: 10, effect: "🔥 화염 부여" },
  { name: "사파이어", emoji: "🔵", color: "text-blue-400", magBonus: 12, effect: "❄️ 빙결 부여" },
  { name: "에메랄드", emoji: "🟢", color: "text-green-400", magBonus: 8, effect: "🌿 자연의 힘" },
  { name: "다이아몬드", emoji: "💎", color: "text-cyan-300", magBonus: 15, effect: "✨ 순수한 빛" },
  { name: "자수정", emoji: "🟣", color: "text-purple-400", magBonus: 14, effect: "🌀 마력 증폭" },
  { name: "호박석", emoji: "🟠", color: "text-amber-400", magBonus: 9, effect: "⚡ 번개 부여" },
];

function getGrade(totalScore: number): { grade: string; color: string } {
  if (totalScore >= 360) return { grade: "전설", color: "text-amber-400" };
  if (totalScore >= 300) return { grade: "영웅", color: "text-purple-400" };
  if (totalScore >= 240) return { grade: "희귀", color: "text-blue-400" };
  if (totalScore >= 160) return { grade: "고급", color: "text-green-400" };
  return { grade: "일반", color: "text-gray-400" };
}

// --- Mini-game Components ---

function MiningGame({ onComplete }: { onComplete: (score: number) => void }) {
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(8);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [started, setStarted] = useState(false);
  const targetClicks = 40;
  const particleId = useRef(0);

  useEffect(() => {
    if (!started) return;
    if (timeLeft <= 0) {
      const score = Math.min(100, Math.round((clicks / targetClicks) * 100));
      onComplete(score);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, started, clicks, onComplete]);

  const handleClick = (e: React.MouseEvent) => {
    if (!started) setStarted(true);
    if (timeLeft <= 0) return;
    setClicks((c) => c + 1);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = particleId.current++;
    setParticles((p) => [...p.slice(-10), { id, x, y }]);
    setTimeout(() => setParticles((p) => p.filter((pp) => pp.id !== id)), 600);
  };

  const progress = Math.min(100, (clicks / targetClicks) * 100);

  return (
    <div className="text-center space-y-4">
      <h2 className="text-2xl font-bold text-orange-400">⛏️ 광석 캐기</h2>
      <p className="text-gray-300">바위를 빠르게 클릭해서 광석을 캐세요!</p>
      <div className="text-xl font-bold text-yellow-300">
        {started ? `⏱️ ${timeLeft}초` : "클릭하여 시작!"}
      </div>

      <div
        onClick={handleClick}
        className="relative w-64 h-64 mx-auto rounded-2xl bg-gradient-to-b from-gray-700 to-gray-900 border-2 border-gray-600 cursor-pointer select-none overflow-hidden active:scale-95 transition-transform"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-8xl animate-bounce" style={{ animationDuration: "0.5s" }}>🪨</span>
        </div>
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute text-2xl animate-ping"
            style={{ left: p.x - 12, top: p.y - 12 }}
          >
            ✨
          </div>
        ))}
        <div className="absolute bottom-2 left-2 right-2 text-sm text-gray-400">
          탭수: {clicks} / {targetClicks}
        </div>
      </div>

      <div className="w-64 mx-auto bg-gray-800 rounded-full h-4 border border-gray-600">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function SmeltingGame({ onComplete }: { onComplete: (score: number) => void }) {
  const [temperature, setTemperature] = useState(50);
  const [holding, setHolding] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [greenTime, setGreenTime] = useState(0);
  const [started, setStarted] = useState(false);
  const holdingRef = useRef(false);
  const greenZoneMin = 40;
  const greenZoneMax = 70;

  useEffect(() => {
    holdingRef.current = holding;
  }, [holding]);

  useEffect(() => {
    if (!started) return;
    if (timeLeft <= 0) {
      const maxGreenTime = 10;
      const score = Math.min(100, Math.round((greenTime / maxGreenTime) * 100));
      onComplete(score);
      return;
    }
    const interval = setInterval(() => {
      setTemperature((t) => {
        let newT = t;
        if (holdingRef.current) {
          newT = t + 2;
        } else {
          newT = t - 1.5;
        }
        return Math.max(0, Math.min(100, newT));
      });
    }, 100);
    return () => clearInterval(interval);
  }, [started, timeLeft, greenTime, onComplete]);

  useEffect(() => {
    if (!started || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) return 0;
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, timeLeft]);

  useEffect(() => {
    if (!started || timeLeft <= 0) return;
    const checker = setInterval(() => {
      setTemperature((t) => {
        if (t >= greenZoneMin && t <= greenZoneMax) {
          setGreenTime((g) => g + 0.1);
        }
        return t;
      });
    }, 100);
    return () => clearInterval(checker);
  }, [started, timeLeft]);

  const handleStart = () => {
    if (!started) setStarted(true);
    setHolding(true);
  };

  const inGreen = temperature >= greenZoneMin && temperature <= greenZoneMax;
  const tempColor = temperature > 80 ? "text-red-400" : inGreen ? "text-green-400" : "text-blue-400";

  return (
    <div className="text-center space-y-4">
      <h2 className="text-2xl font-bold text-orange-400">🔥 용광로</h2>
      <p className="text-gray-300">버튼을 눌러 온도를 초록 구간에 유지하세요!</p>
      <div className="text-xl font-bold text-yellow-300">
        {started ? `⏱️ ${timeLeft}초` : "버튼을 눌러 시작!"}
      </div>

      {/* Temperature gauge */}
      <div className="relative w-16 h-64 mx-auto bg-gray-800 rounded-full border-2 border-gray-600 overflow-hidden">
        {/* Green zone indicator */}
        <div
          className="absolute left-0 right-0 bg-green-500/30 border-y border-green-400"
          style={{ bottom: `${greenZoneMin}%`, height: `${greenZoneMax - greenZoneMin}%` }}
        />
        {/* Temperature fill */}
        <div
          className={`absolute bottom-0 left-0 right-0 transition-all duration-100 ${
            inGreen ? "bg-gradient-to-t from-green-600 to-green-400" :
            temperature > 80 ? "bg-gradient-to-t from-red-600 to-red-400" :
            "bg-gradient-to-t from-blue-600 to-blue-400"
          }`}
          style={{ height: `${temperature}%` }}
        />
        {/* Temperature label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">{temperature > 80 ? "🔥" : inGreen ? "✅" : "❄️"}</span>
        </div>
      </div>

      <div className={`text-lg font-bold ${tempColor}`}>
        {Math.round(temperature * 15 + 200)}°C
      </div>

      <div className="text-sm text-gray-400">
        초록 구간 유지 시간: {greenTime.toFixed(1)}초
      </div>

      <button
        onMouseDown={handleStart}
        onMouseUp={() => setHolding(false)}
        onMouseLeave={() => setHolding(false)}
        onTouchStart={(e) => { e.preventDefault(); handleStart(); }}
        onTouchEnd={() => setHolding(false)}
        className={`px-8 py-4 rounded-xl text-xl font-bold transition-all ${
          holding
            ? "bg-gradient-to-r from-red-600 to-orange-500 scale-95 shadow-lg shadow-orange-500/50"
            : "bg-gradient-to-r from-orange-600 to-yellow-500 hover:scale-105"
        }`}
      >
        🔥 {holding ? "가열 중..." : "꾹 누르기"}
      </button>
    </div>
  );
}

function HammeringGame({ onComplete }: { onComplete: (score: number) => void }) {
  const [targets, setTargets] = useState<{ id: number; time: number; hit: boolean }[]>([]);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const totalBeats = 12;
  const beatInterval = 800;

  useEffect(() => {
    if (!started || done) return;
    if (currentBeat >= totalBeats) {
      setDone(true);
      const score = Math.min(100, Math.round((hits / totalBeats) * 100));
      setTimeout(() => onComplete(score), 500);
      return;
    }
    const timer = setTimeout(() => {
      setTargets((t) => [...t, { id: currentBeat, time: Date.now(), hit: false }]);
      setCurrentBeat((b) => b + 1);
    }, beatInterval);
    return () => clearTimeout(timer);
  }, [started, currentBeat, done, hits, onComplete]);

  const handleTap = () => {
    if (!started) {
      setStarted(true);
      return;
    }
    if (done) return;

    const now = Date.now();
    const unhitTargets = targets.filter((t) => !t.hit);
    const closest = unhitTargets.reduce<{ id: number; time: number; hit: boolean } | null>((best, t) => {
      if (!best) return t;
      return Math.abs(now - t.time - 400) < Math.abs(now - best.time - 400) ? t : best;
    }, null);

    if (closest && Math.abs(now - closest.time - 400) < 350) {
      setTargets((ts) => ts.map((t) => (t.id === closest.id ? { ...t, hit: true } : t)));
      setHits((h) => h + 1);
    } else {
      setMisses((m) => m + 1);
    }
  };

  return (
    <div className="text-center space-y-4">
      <h2 className="text-2xl font-bold text-orange-400">🔨 모루에서 두드리기</h2>
      <p className="text-gray-300">불빛이 들어올 때 맞춰서 탭하세요!</p>

      {/* Beat indicators */}
      <div className="flex flex-wrap justify-center gap-2 px-4">
        {Array.from({ length: totalBeats }).map((_, i) => {
          const target = targets.find((t) => t.id === i);
          return (
            <div
              key={i}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                target?.hit
                  ? "bg-green-500 border-green-300 scale-110"
                  : target
                  ? "bg-orange-500 border-orange-300 animate-pulse"
                  : "bg-gray-700 border-gray-600"
              }`}
            >
              {target?.hit ? "✅" : target ? "🔶" : "⚫"}
            </div>
          );
        })}
      </div>

      <div className="text-lg text-yellow-300">
        명중: {hits} / {currentBeat} | 실패: {misses}
      </div>

      <button
        onClick={handleTap}
        className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-orange-600 to-red-700 border-4 border-orange-400 text-6xl
          active:scale-90 active:shadow-inner transition-all hover:shadow-lg hover:shadow-orange-500/50 flex items-center justify-center"
      >
        {started ? "🔨" : "▶️"}
      </button>
      {!started && <p className="text-gray-400 text-sm">탭하여 시작!</p>}
    </div>
  );
}

function PolishingGame({ onComplete }: { onComplete: (score: number) => void }) {
  const [polishCount, setPolishCount] = useState(0);
  const [lastX, setLastX] = useState<number | null>(null);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [dirChanges, setDirChanges] = useState(0);
  const [timeLeft, setTimeLeft] = useState(8);
  const [started, setStarted] = useState(false);
  const [shine, setShine] = useState(0);
  const target = 20;

  useEffect(() => {
    if (!started) return;
    if (timeLeft <= 0) {
      const score = Math.min(100, Math.round((dirChanges / target) * 100));
      onComplete(score);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, started, dirChanges, onComplete]);

  const handleMove = (clientX: number) => {
    if (!started) setStarted(true);
    if (timeLeft <= 0) return;

    if (lastX !== null) {
      const diff = clientX - lastX;
      if (Math.abs(diff) > 5) {
        const newDir = diff > 0 ? "right" : "left";
        if (direction && newDir !== direction) {
          setDirChanges((d) => d + 1);
          setPolishCount((p) => p + 1);
          setShine((s) => Math.min(100, s + 5));
        }
        setDirection(newDir);
      }
    }
    setLastX(clientX);
  };

  return (
    <div className="text-center space-y-4">
      <h2 className="text-2xl font-bold text-orange-400">✨ 연마하기</h2>
      <p className="text-gray-300">검 위를 좌우로 문질러 연마하세요!</p>
      <div className="text-xl font-bold text-yellow-300">
        {started ? `⏱️ ${timeLeft}초` : "문질러서 시작!"}
      </div>

      <div
        className="relative w-72 h-40 mx-auto rounded-xl overflow-hidden cursor-pointer select-none"
        style={{
          background: `linear-gradient(135deg, #374151, #4B5563)`,
        }}
        onMouseMove={(e) => handleMove(e.clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      >
        {/* Sword shape */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-56 h-8 rounded-sm transition-all duration-300"
            style={{
              background: `linear-gradient(90deg,
                rgba(156,163,175,${0.3 + shine * 0.007}),
                rgba(229,231,235,${0.4 + shine * 0.006}),
                rgba(156,163,175,${0.3 + shine * 0.007}))`,
              boxShadow: `0 0 ${shine / 3}px rgba(255,255,255,${shine / 100})`,
            }}
          />
        </div>
        {/* Shine overlay */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(ellipse at center, rgba(255,255,255,${shine / 200}) 0%, transparent 70%)`,
          }}
        />
        <div className="absolute bottom-2 left-0 right-0 text-sm text-gray-300">
          연마 횟수: {dirChanges} / {target}
        </div>
      </div>

      <div className="w-64 mx-auto bg-gray-800 rounded-full h-4 border border-gray-600">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gray-400 to-white transition-all duration-200"
          style={{ width: `${shine}%` }}
        />
      </div>
      <p className="text-gray-400 text-sm">광택: {shine}%</p>
    </div>
  );
}

// --- Main Component ---
export default function SwordCraftPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedBlade, setSelectedBlade] = useState<typeof BLADE_TYPES[0] | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<typeof MATERIALS[0] | null>(null);
  const [selectedGem, setSelectedGem] = useState<typeof GEMS[0] | null>(null);
  const [swordName, setSwordName] = useState("");
  const [scores, setScores] = useState({ mining: 0, smelting: 0, hammering: 0, polishing: 0 });
  const [collection, setCollection] = useState<CraftedSword[]>([]);
  const [currentSword, setCurrentSword] = useState<CraftedSword | null>(null);
  const [showSwordAnimation, setShowSwordAnimation] = useState(false);
  const nextId = useRef(1);

  const resetCraft = () => {
    setSelectedBlade(null);
    setSelectedMaterial(null);
    setSelectedGem(null);
    setSwordName("");
    setScores({ mining: 0, smelting: 0, hammering: 0, polishing: 0 });
    setCurrentSword(null);
    setShowSwordAnimation(false);
  };

  const handleMiningComplete = useCallback((score: number) => {
    setScores((s) => ({ ...s, mining: score }));
    setTimeout(() => setScreen("smelting"), 800);
  }, []);

  const handleSmeltingComplete = useCallback((score: number) => {
    setScores((s) => ({ ...s, smelting: score }));
    setTimeout(() => setScreen("hammering"), 800);
  }, []);

  const handleHammeringComplete = useCallback((score: number) => {
    setScores((s) => ({ ...s, hammering: score }));
    setTimeout(() => setScreen("polishing"), 800);
  }, []);

  const handlePolishingComplete = useCallback((score: number) => {
    setScores((s) => ({ ...s, polishing: score }));
    setTimeout(() => setScreen("gemSetting"), 800);
  }, []);

  const finalizeSword = () => {
    if (!selectedBlade || !selectedMaterial || !selectedGem || !swordName.trim()) return;

    const totalScore = scores.mining + scores.smelting + scores.hammering + scores.polishing;
    const { grade, color } = getGrade(totalScore);

    const attack = Math.round(
      (selectedBlade.atkBonus + scores.mining * 0.5 + scores.hammering * 0.3) * selectedMaterial.mult
    );
    const durability = Math.round(
      (selectedBlade.durBonus + scores.smelting * 0.5 + scores.polishing * 0.2) * selectedMaterial.mult
    );
    const magic = Math.round(
      (selectedBlade.magBonus + selectedGem.magBonus + scores.polishing * 0.3) * selectedMaterial.mult
    );

    const sword: CraftedSword = {
      id: nextId.current++,
      name: swordName.trim(),
      bladeType: selectedBlade.type,
      material: selectedMaterial.name,
      gem: { name: selectedGem.name, emoji: selectedGem.emoji, color: selectedGem.color },
      scores,
      stats: { attack, durability, magic },
      grade,
      gradeColor: color,
    };

    setCurrentSword(sword);
    setCollection((c) => [sword, ...c]);
    setScreen("result");
    setTimeout(() => setShowSwordAnimation(true), 200);
  };

  // Sword visual SVG
  const SwordVisual = ({ sword, size = "large" }: { sword: CraftedSword; size?: "large" | "small" }) => {
    const isLarge = size === "large";
    const w = isLarge ? 200 : 80;
    const h = isLarge ? 300 : 120;
    const materialColors: Record<Material, { blade: string; glow: string }> = {
      "철": { blade: "#9CA3AF", glow: "#6B7280" },
      "강철": { blade: "#60A5FA", glow: "#3B82F6" },
      "미스릴": { blade: "#C084FC", glow: "#A855F7" },
      "드래곤본": { blade: "#F87171", glow: "#EF4444" },
    };
    const gemColors: Record<string, string> = {
      "루비": "#EF4444", "사파이어": "#3B82F6", "에메랄드": "#10B981",
      "다이아몬드": "#67E8F9", "자수정": "#A855F7", "호박석": "#F59E0B",
    };
    const mc = materialColors[sword.material];
    const gc = gemColors[sword.gem.name] || "#fff";

    const bladeShapes: Record<BladeType, string> = {
      "직검": isLarge ? "M95,30 L105,30 L108,180 L100,195 L92,180 Z" : "M38,12 L42,12 L43,72 L40,78 L37,72 Z",
      "곡검": isLarge ? "M90,30 L105,30 L115,100 L110,180 L100,195 L95,180 L85,100 Z" : "M36,12 L42,12 L46,40 L44,72 L40,78 L38,72 L34,40 Z",
      "대검": isLarge ? "M85,30 L115,30 L120,60 L112,180 L100,200 L88,180 L80,60 Z" : "M34,12 L46,12 L48,24 L45,72 L40,80 L35,72 L32,24 Z",
      "단검": isLarge ? "M93,60 L107,60 L109,150 L100,165 L91,150 Z" : "M37,24 L43,24 L44,60 L40,66 L36,60 Z",
    };

    return (
      <svg width={w} height={h} viewBox={isLarge ? "0 0 200 300" : "0 0 80 120"} className={isLarge ? "drop-shadow-2xl" : "drop-shadow-lg"}>
        <defs>
          <linearGradient id={`blade-${sword.id}-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={mc.blade} stopOpacity="0.8" />
            <stop offset="50%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="100%" stopColor={mc.blade} stopOpacity="0.8" />
          </linearGradient>
          <filter id={`glow-${sword.id}-${size}`}>
            <feGaussianBlur stdDeviation={isLarge ? "4" : "2"} result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Blade */}
        <path d={bladeShapes[sword.bladeType]} fill={`url(#blade-${sword.id}-${size})`} stroke={mc.glow} strokeWidth={isLarge ? "2" : "1"} filter={`url(#glow-${sword.id}-${size})`} />
        {/* Guard */}
        {isLarge ? (
          <rect x="70" y="190" width="60" height="12" rx="3" fill="#92400E" stroke="#78350F" strokeWidth="1" />
        ) : (
          <rect x="28" y="76" width="24" height="5" rx="1" fill="#92400E" stroke="#78350F" strokeWidth="0.5" />
        )}
        {/* Handle */}
        {isLarge ? (
          <rect x="92" y="202" width="16" height="55" rx="4" fill="#78350F" stroke="#451A03" strokeWidth="1" />
        ) : (
          <rect x="37" y="81" width="6" height="22" rx="2" fill="#78350F" stroke="#451A03" strokeWidth="0.5" />
        )}
        {/* Handle wrap */}
        {isLarge && (
          <>
            <line x1="92" y1="215" x2="108" y2="210" stroke="#451A03" strokeWidth="2" />
            <line x1="92" y1="228" x2="108" y2="223" stroke="#451A03" strokeWidth="2" />
            <line x1="92" y1="241" x2="108" y2="236" stroke="#451A03" strokeWidth="2" />
          </>
        )}
        {/* Pommel */}
        {isLarge ? (
          <circle cx="100" cy="262" r="8" fill="#92400E" stroke="#78350F" strokeWidth="1" />
        ) : (
          <circle cx="40" cy="105" r="3" fill="#92400E" stroke="#78350F" strokeWidth="0.5" />
        )}
        {/* Gem */}
        {isLarge ? (
          <circle cx="100" cy="195" r="8" fill={gc} filter={`url(#glow-${sword.id}-${size})`}>
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
          </circle>
        ) : (
          <circle cx="40" cy="78" r="3" fill={gc}>
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-orange-950 to-gray-950 text-white">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-800/50">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors text-lg">← 홈으로</Link>
        <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent">
          ⚔️ 검 만들기
        </h1>
        <button
          onClick={() => { setScreen("collection"); }}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          📦 {collection.length}
        </button>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {/* ===== MENU ===== */}
        {screen === "menu" && (
          <div className="space-y-8 text-center pt-8">
            <div className="space-y-2">
              <div className="text-7xl mb-4">⚔️</div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent">
                검 만들기
              </h2>
              <p className="text-gray-400">나만의 전설의 검을 제작하세요!</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { resetCraft(); setScreen("selectBlade"); }}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-xl font-bold
                  hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-600/30"
              >
                🔨 검 제작 시작
              </button>
              <button
                onClick={() => setScreen("collection")}
                className="w-full py-3 rounded-xl bg-gray-800 border border-gray-700 text-lg
                  hover:bg-gray-700 transition-all"
              >
                📦 내 검 컬렉션 ({collection.length}자루)
              </button>
            </div>

            {/* Steps preview */}
            <div className="bg-gray-800/50 rounded-xl p-4 text-left space-y-2 border border-gray-700/50">
              <h3 className="text-orange-400 font-bold mb-2">🗺️ 제작 과정</h3>
              {["⛏️ 광석 캐기 - 클릭으로 광석 채굴", "🔥 용광로 - 온도 조절로 제련", "🔨 두드리기 - 리듬에 맞춰 단조", "✨ 연마하기 - 좌우로 문질러 광택", "💎 보석 장착 - 마법 보석 선택", "📝 이름 짓기 - 검에 이름 부여"].map((step, i) => (
                <div key={i} className="text-sm text-gray-300 flex items-center gap-2">
                  <span className="text-orange-500 font-bold">{i + 1}.</span> {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== SELECT BLADE TYPE ===== */}
        {screen === "selectBlade" && (
          <div className="space-y-4 pt-4">
            <h2 className="text-2xl font-bold text-center text-orange-400">🗡️ 검 종류 선택</h2>
            <p className="text-center text-gray-400">어떤 형태의 검을 만들까요?</p>
            <div className="grid grid-cols-2 gap-3">
              {BLADE_TYPES.map((blade) => (
                <button
                  key={blade.type}
                  onClick={() => { setSelectedBlade(blade); setScreen("selectMaterial"); }}
                  className="p-4 rounded-xl bg-gray-800 border border-gray-700 hover:border-orange-500
                    hover:bg-gray-700 transition-all active:scale-95 text-center space-y-2"
                >
                  <div className="text-4xl">{blade.emoji}</div>
                  <div className="text-lg font-bold">{blade.type}</div>
                  <div className="text-xs text-gray-400">{blade.desc}</div>
                  <div className="text-xs space-y-0.5">
                    <div className="text-red-400">공격 +{blade.atkBonus}</div>
                    <div className="text-blue-400">내구 +{blade.durBonus}</div>
                    <div className="text-purple-400">마법 +{blade.magBonus}</div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setScreen("menu")} className="w-full py-2 text-gray-500 hover:text-gray-300 transition-colors">
              ← 돌아가기
            </button>
          </div>
        )}

        {/* ===== SELECT MATERIAL ===== */}
        {screen === "selectMaterial" && (
          <div className="space-y-4 pt-4">
            <h2 className="text-2xl font-bold text-center text-orange-400">⛏️ 재료 선택</h2>
            <p className="text-center text-gray-400">어떤 금속으로 만들까요?</p>
            <div className="space-y-3">
              {MATERIALS.map((mat) => (
                <button
                  key={mat.name}
                  onClick={() => { setSelectedMaterial(mat); setScreen("mining"); }}
                  className="w-full p-4 rounded-xl bg-gray-800 border border-gray-700 hover:border-orange-500
                    hover:bg-gray-700 transition-all active:scale-95 flex items-center gap-4"
                >
                  <span className="text-3xl">{mat.emoji}</span>
                  <div className="text-left flex-1">
                    <div className={`text-lg font-bold ${mat.color}`}>{mat.name}</div>
                    <div className="text-xs text-gray-400">{mat.desc}</div>
                  </div>
                  <div className="text-xs text-yellow-400">x{mat.mult} 배율</div>
                </button>
              ))}
            </div>
            <button onClick={() => setScreen("selectBlade")} className="w-full py-2 text-gray-500 hover:text-gray-300 transition-colors">
              ← 돌아가기
            </button>
          </div>
        )}

        {/* ===== MINING MINI-GAME ===== */}
        {screen === "mining" && <MiningGame onComplete={handleMiningComplete} />}

        {/* ===== SMELTING MINI-GAME ===== */}
        {screen === "smelting" && <SmeltingGame onComplete={handleSmeltingComplete} />}

        {/* ===== HAMMERING MINI-GAME ===== */}
        {screen === "hammering" && <HammeringGame onComplete={handleHammeringComplete} />}

        {/* ===== POLISHING MINI-GAME ===== */}
        {screen === "polishing" && <PolishingGame onComplete={handlePolishingComplete} />}

        {/* ===== GEM SETTING ===== */}
        {screen === "gemSetting" && (
          <div className="space-y-4 pt-4">
            <h2 className="text-2xl font-bold text-center text-orange-400">💎 보석 장착</h2>
            <p className="text-center text-gray-400">검에 장착할 마법 보석을 선택하세요!</p>

            {/* Scores so far */}
            <div className="bg-gray-800/50 rounded-lg p-3 grid grid-cols-4 gap-2 text-center text-xs border border-gray-700/50">
              <div>
                <div className="text-orange-400">⛏️ 채굴</div>
                <div className="font-bold">{scores.mining}점</div>
              </div>
              <div>
                <div className="text-red-400">🔥 제련</div>
                <div className="font-bold">{scores.smelting}점</div>
              </div>
              <div>
                <div className="text-yellow-400">🔨 단조</div>
                <div className="font-bold">{scores.hammering}점</div>
              </div>
              <div>
                <div className="text-gray-300">✨ 연마</div>
                <div className="font-bold">{scores.polishing}점</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {GEMS.map((gem) => (
                <button
                  key={gem.name}
                  onClick={() => { setSelectedGem(gem); setScreen("naming"); }}
                  className={`p-4 rounded-xl bg-gray-800 border transition-all active:scale-95 text-center space-y-1
                    ${selectedGem?.name === gem.name ? "border-yellow-400 bg-gray-700" : "border-gray-700 hover:border-orange-500"}`}
                >
                  <div className="text-3xl">{gem.emoji}</div>
                  <div className={`font-bold ${gem.color}`}>{gem.name}</div>
                  <div className="text-xs text-gray-400">{gem.effect}</div>
                  <div className="text-xs text-purple-400">마법 +{gem.magBonus}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== NAMING ===== */}
        {screen === "naming" && (
          <div className="space-y-6 pt-8 text-center">
            <h2 className="text-2xl font-bold text-orange-400">📝 이름 짓기</h2>
            <p className="text-gray-400">당신의 검에 이름을 부여하세요!</p>

            <div className="space-y-2">
              <div className="text-6xl mb-4">{selectedBlade?.emoji}</div>
              <div className="text-sm text-gray-400">
                {selectedMaterial?.name} {selectedBlade?.type} + {selectedGem?.emoji} {selectedGem?.name}
              </div>
            </div>

            <input
              type="text"
              value={swordName}
              onChange={(e) => setSwordName(e.target.value)}
              placeholder="검 이름을 입력하세요..."
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-600 text-center text-xl
                focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 placeholder-gray-600"
            />

            {/* Name suggestions */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                `${selectedMaterial?.name}의 ${selectedBlade?.type}`,
                "불꽃의 검",
                "용의 이빨",
                "별빛 칼날",
                "천둥의 일격",
                "어둠의 파멸자",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setSwordName(suggestion)}
                  className="px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-400
                    hover:border-orange-500 hover:text-orange-400 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <button
              onClick={finalizeSword}
              disabled={!swordName.trim()}
              className={`w-full py-4 rounded-xl text-xl font-bold transition-all ${
                swordName.trim()
                  ? "bg-gradient-to-r from-orange-600 to-red-600 hover:scale-105 active:scale-95 shadow-lg shadow-orange-600/30"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              ⚔️ 검 완성!
            </button>
          </div>
        )}

        {/* ===== RESULT ===== */}
        {screen === "result" && currentSword && (
          <div className="space-y-6 pt-4 text-center">
            <div className={`text-3xl font-bold ${currentSword.gradeColor} ${showSwordAnimation ? "animate-bounce" : "opacity-0"}`}
              style={{ transition: "opacity 0.5s" }}
            >
              ⚔️ 검 제작 완료! ⚔️
            </div>

            {/* Sword display */}
            <div className={`transition-all duration-1000 ${showSwordAnimation ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}>
              <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-2xl relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`w-48 h-48 rounded-full blur-3xl opacity-30 animate-pulse`}
                    style={{
                      backgroundColor:
                        currentSword.grade === "전설" ? "#F59E0B" :
                        currentSword.grade === "영웅" ? "#A855F7" :
                        currentSword.grade === "희귀" ? "#3B82F6" :
                        currentSword.grade === "고급" ? "#10B981" : "#6B7280",
                    }}
                  />
                </div>

                <div className="relative z-10">
                  <div className="flex justify-center mb-4">
                    <SwordVisual sword={currentSword} size="large" />
                  </div>

                  <div className={`text-2xl font-bold ${currentSword.gradeColor}`}>
                    「{currentSword.name}」
                  </div>
                  <div className={`text-sm ${currentSword.gradeColor} mb-4`}>
                    [{currentSword.grade}] {currentSword.material} {currentSword.bladeType}
                  </div>

                  {/* Stats */}
                  <div className="bg-gray-900/60 rounded-xl p-4 space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-red-400 font-bold">⚔️ 공격력</span>
                        <span className="text-lg font-bold">{currentSword.stats.attack}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                          style={{ width: `${Math.min(100, currentSword.stats.attack)}%` }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-400 font-bold">🛡️ 내구도</span>
                        <span className="text-lg font-bold">{currentSword.stats.durability}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                          style={{ width: `${Math.min(100, currentSword.stats.durability)}%` }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-purple-400 font-bold">🔮 마법력</span>
                        <span className="text-lg font-bold">{currentSword.stats.magic}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400"
                          style={{ width: `${Math.min(100, currentSword.stats.magic)}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Gem effect */}
                  <div className="mt-3 text-sm">
                    <span className={currentSword.gem.color}>
                      {currentSword.gem.emoji} {currentSword.gem.name}
                    </span>
                    <span className="text-gray-400"> 장착됨</span>
                  </div>

                  {/* Mini-game scores */}
                  <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                    <div className="bg-gray-800 rounded-lg p-2">
                      <div className="text-orange-400">⛏️ 채굴</div>
                      <div className="font-bold">{currentSword.scores.mining}점</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-2">
                      <div className="text-red-400">🔥 제련</div>
                      <div className="font-bold">{currentSword.scores.smelting}점</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-2">
                      <div className="text-yellow-400">🔨 단조</div>
                      <div className="font-bold">{currentSword.scores.hammering}점</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-2">
                      <div className="text-gray-300">✨ 연마</div>
                      <div className="font-bold">{currentSword.scores.polishing}점</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => { resetCraft(); setScreen("selectBlade"); }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 font-bold
                  hover:scale-105 active:scale-95 transition-all"
              >
                🔨 새로운 검 만들기
              </button>
              <button
                onClick={() => setScreen("collection")}
                className="w-full py-3 rounded-xl bg-gray-800 border border-gray-700 font-bold
                  hover:bg-gray-700 transition-all"
              >
                📦 컬렉션 보기
              </button>
              <button
                onClick={() => { resetCraft(); setScreen("menu"); }}
                className="w-full py-2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                메뉴로 돌아가기
              </button>
            </div>
          </div>
        )}

        {/* ===== COLLECTION ===== */}
        {screen === "collection" && (
          <div className="space-y-4 pt-4">
            <h2 className="text-2xl font-bold text-center text-orange-400">📦 내 검 컬렉션</h2>
            <p className="text-center text-gray-400">{collection.length}자루의 검</p>

            {collection.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="text-6xl">🗡️</div>
                <p className="text-gray-500">아직 만든 검이 없습니다</p>
                <button
                  onClick={() => { resetCraft(); setScreen("selectBlade"); }}
                  className="px-6 py-2 rounded-xl bg-orange-600 font-bold hover:bg-orange-500 transition-colors"
                >
                  첫 검 만들기
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {collection.map((sword) => (
                  <div
                    key={sword.id}
                    className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center gap-4"
                  >
                    <div className="flex-shrink-0">
                      <SwordVisual sword={sword} size="small" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold ${sword.gradeColor} truncate`}>
                        「{sword.name}」
                      </div>
                      <div className="text-xs text-gray-400">
                        [{sword.grade}] {sword.material} {sword.bladeType}
                      </div>
                      <div className="flex gap-3 mt-1 text-xs">
                        <span className="text-red-400">⚔️{sword.stats.attack}</span>
                        <span className="text-blue-400">🛡️{sword.stats.durability}</span>
                        <span className="text-purple-400">🔮{sword.stats.magic}</span>
                      </div>
                      <div className="text-xs mt-0.5">
                        <span className={sword.gem.color}>{sword.gem.emoji} {sword.gem.name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setScreen("menu")}
              className="w-full py-2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← 메뉴로 돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
