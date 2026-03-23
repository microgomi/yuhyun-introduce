"use client";

import Link from "next/link";
import { useState, useCallback, useRef, useEffect } from "react";

// --- Types ---
type Rarity = "common" | "advanced" | "rare" | "legendary" | "mythic";

interface Item {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  description: string;
}

interface Recipe {
  a: string;
  b: string;
  result: string;
}

// --- Constants ---
const RARITY_LABEL: Record<Rarity, string> = {
  common: "일반",
  advanced: "고급",
  rare: "희귀",
  legendary: "전설",
  mythic: "신화",
};
const RARITY_COLOR: Record<Rarity, string> = {
  common: "text-gray-300",
  advanced: "text-green-400",
  rare: "text-blue-400",
  legendary: "text-purple-400",
  mythic: "text-yellow-400",
};
const RARITY_BG: Record<Rarity, string> = {
  common: "border-gray-500/50 bg-gray-800/40",
  advanced: "border-green-500/50 bg-green-900/30",
  rare: "border-blue-500/50 bg-blue-900/30",
  legendary: "border-purple-500/50 bg-purple-900/30",
  mythic: "border-yellow-500/50 bg-yellow-900/20",
};
const RARITY_GLOW: Record<Rarity, string> = {
  common: "",
  advanced: "shadow-[0_0_8px_rgba(34,197,94,0.3)]",
  rare: "shadow-[0_0_12px_rgba(59,130,246,0.4)]",
  legendary: "shadow-[0_0_16px_rgba(168,85,247,0.5)]",
  mythic: "shadow-[0_0_24px_rgba(234,179,8,0.6)]",
};

// All items in the game
const ALL_ITEMS: Record<string, Item> = {
  // Base materials (6)
  stone:     { id: "stone",     name: "돌",       emoji: "🪨", rarity: "common", description: "단단한 돌멩이" },
  wood:      { id: "wood",      name: "나무",     emoji: "🪵", rarity: "common", description: "튼튼한 나무 조각" },
  water:     { id: "water",     name: "물",       emoji: "💧", rarity: "common", description: "맑은 물" },
  fire:      { id: "fire",      name: "불",       emoji: "🔥", rarity: "common", description: "뜨거운 불꽃" },
  earth:     { id: "earth",     name: "흙",       emoji: "🟤", rarity: "common", description: "부드러운 흙" },
  wind:      { id: "wind",      name: "바람",     emoji: "💨", rarity: "common", description: "시원한 바람" },

  // Common crafted (7)
  metal:     { id: "metal",     name: "금속",     emoji: "⚙️", rarity: "common", description: "단단한 금속 덩어리" },
  sand:      { id: "sand",      name: "모래",     emoji: "🏖️", rarity: "common", description: "고운 모래알" },
  charcoal:  { id: "charcoal",  name: "숯",       emoji: "⬛", rarity: "common", description: "까만 숯" },
  mud:       { id: "mud",       name: "진흙",     emoji: "🫗", rarity: "common", description: "끈적한 진흙" },
  steam:     { id: "steam",     name: "증기",     emoji: "♨️", rarity: "common", description: "뜨거운 수증기" },
  dust:      { id: "dust",      name: "먼지",     emoji: "🌫️", rarity: "common", description: "바람에 날리는 먼지" },
  lava:      { id: "lava",      name: "용암",     emoji: "🌋", rarity: "common", description: "뜨거운 용암" },

  // Advanced (8)
  glass:     { id: "glass",     name: "유리",     emoji: "🪟", rarity: "advanced", description: "투명한 유리" },
  brick:     { id: "brick",     name: "벽돌",     emoji: "🧱", rarity: "advanced", description: "튼튼한 벽돌" },
  rain:      { id: "rain",      name: "비",       emoji: "🌧️", rarity: "advanced", description: "하늘에서 내리는 비" },
  gold:      { id: "gold",      name: "금",       emoji: "🥇", rarity: "advanced", description: "반짝이는 금덩어리" },
  sword:     { id: "sword",     name: "칼",       emoji: "🗡️", rarity: "advanced", description: "날카로운 칼" },
  paper:     { id: "paper",     name: "종이",     emoji: "📄", rarity: "advanced", description: "하얀 종이" },
  cloth:     { id: "cloth",     name: "천",       emoji: "🧵", rarity: "advanced", description: "부드러운 천" },
  gunpowder: { id: "gunpowder", name: "화약",     emoji: "💣", rarity: "advanced", description: "폭발하는 화약" },

  // Rare (9)
  gem:       { id: "gem",       name: "보석",     emoji: "💎", rarity: "rare", description: "영롱한 보석" },
  mirror:    { id: "mirror",    name: "거울",     emoji: "🪞", rarity: "rare", description: "나를 비추는 거울" },
  rainbow:   { id: "rainbow",   name: "무지개",   emoji: "🌈", rarity: "rare", description: "비 온 뒤 무지개" },
  engine:    { id: "engine",    name: "엔진",     emoji: "🔧", rarity: "rare", description: "강력한 엔진" },
  book:      { id: "book",      name: "마법서",   emoji: "📕", rarity: "rare", description: "신비한 마법의 책" },
  diamond:   { id: "diamond",   name: "다이아몬드", emoji: "💠", rarity: "rare", description: "세상에서 가장 단단한 것" },
  lightning: { id: "lightning",  name: "번개",     emoji: "⚡", rarity: "rare", description: "하늘을 가르는 번개" },
  castle:    { id: "castle",    name: "성",       emoji: "🏰", rarity: "rare", description: "거대한 성" },
  potion:    { id: "potion",    name: "물약",     emoji: "🧪", rarity: "rare", description: "신비한 물약" },

  // Legendary (7)
  crown:     { id: "crown",     name: "왕관",     emoji: "👑", rarity: "legendary", description: "왕의 왕관" },
  ring:      { id: "ring",      name: "반지",     emoji: "💍", rarity: "legendary", description: "빛나는 보석 반지" },
  robot:     { id: "robot",     name: "로봇",     emoji: "🤖", rarity: "legendary", description: "똑똑한 로봇" },
  dragon:    { id: "dragon",    name: "드래곤",   emoji: "🐉", rarity: "legendary", description: "전설의 용" },
  telescope: { id: "telescope", name: "망원경",   emoji: "🔭", rarity: "legendary", description: "별을 보는 망원경" },
  rocket:    { id: "rocket",    name: "로켓",     emoji: "🚀", rarity: "legendary", description: "우주로 가는 로켓" },
  magicwand: { id: "magicwand", name: "마법지팡이", emoji: "🪄", rarity: "legendary", description: "강력한 마법 지팡이" },

  // Mythic (5)
  philosophers: { id: "philosophers", name: "현자의 돌", emoji: "🔮", rarity: "mythic", description: "모든 것을 변환하는 전설의 돌" },
  excalibur:    { id: "excalibur",    name: "엑스칼리버", emoji: "⚔️", rarity: "mythic", description: "전설의 성검" },
  universe:     { id: "universe",     name: "우주",       emoji: "🌌", rarity: "mythic", description: "끝없이 넓은 우주" },
  phoenix:      { id: "phoenix",      name: "불사조",     emoji: "🦅", rarity: "mythic", description: "불멸의 새" },
  timestone:    { id: "timestone",    name: "시간의 보석", emoji: "⏳", rarity: "mythic", description: "시간을 다스리는 보석" },
};

// All recipes
const RECIPES: Recipe[] = [
  // Base -> Common
  { a: "stone", b: "fire",   result: "metal" },
  { a: "stone", b: "water",  result: "sand" },
  { a: "wood",  b: "fire",   result: "charcoal" },
  { a: "water", b: "earth",  result: "mud" },
  { a: "water", b: "fire",   result: "steam" },
  { a: "earth", b: "wind",   result: "dust" },
  { a: "stone", b: "earth",  result: "lava" },

  // Common -> Advanced
  { a: "sand",     b: "fire",     result: "glass" },
  { a: "mud",      b: "fire",     result: "brick" },
  { a: "water",    b: "wind",     result: "rain" },
  { a: "metal",    b: "fire",     result: "gold" },
  { a: "metal",    b: "stone",    result: "sword" },
  { a: "wood",     b: "water",    result: "paper" },
  { a: "wind",     b: "wood",     result: "cloth" },
  { a: "charcoal", b: "fire",     result: "gunpowder" },

  // Advanced -> Rare
  { a: "gold",     b: "stone",    result: "gem" },
  { a: "glass",    b: "metal",    result: "mirror" },
  { a: "rain",     b: "fire",     result: "rainbow" },
  { a: "steam",    b: "metal",    result: "engine" },
  { a: "paper",    b: "fire",     result: "book" },
  { a: "gold",     b: "glass",    result: "diamond" },
  { a: "rain",     b: "metal",    result: "lightning" },
  { a: "brick",    b: "gold",     result: "castle" },
  { a: "water",    b: "gem",      result: "potion" },

  // Rare -> Legendary
  { a: "glass",    b: "gold",     result: "crown" },
  { a: "gold",     b: "gem",      result: "ring" },
  { a: "engine",   b: "metal",    result: "robot" },
  { a: "fire",     b: "lightning", result: "dragon" },
  { a: "glass",    b: "diamond",  result: "telescope" },
  { a: "engine",   b: "gunpowder", result: "rocket" },
  { a: "book",     b: "gem",      result: "magicwand" },

  // Legendary -> Mythic
  { a: "gold",      b: "potion",    result: "philosophers" },
  { a: "sword",     b: "diamond",   result: "excalibur" },
  { a: "telescope", b: "rocket",    result: "universe" },
  { a: "dragon",    b: "fire",      result: "phoenix" },
  { a: "diamond",   b: "crown",     result: "timestone" },
];

const BASE_ITEMS = ["stone", "wood", "water", "fire", "earth", "wind"];

// --- Component ---
export default function PreciousPage() {
  const [discovered, setDiscovered] = useState<Set<string>>(new Set(BASE_ITEMS));
  const [workspace, setWorkspace] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [combineResult, setCombineResult] = useState<{ item: Item; isNew: boolean } | null>(null);
  const [showCollection, setShowCollection] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);
  const sparkleId = useRef(0);

  const totalItems = Object.keys(ALL_ITEMS).length;
  const discoveredCount = discovered.size;

  // Find recipe result
  const findRecipe = useCallback((a: string, b: string): string | null => {
    const recipe = RECIPES.find(
      (r) => (r.a === a && r.b === b) || (r.a === b && r.b === a)
    );
    return recipe ? recipe.result : null;
  }, []);

  // Add item to workspace
  const addToWorkspace = useCallback((itemId: string) => {
    setWorkspace((prev) => [...prev, itemId]);
    setSelectedIdx(null);
  }, []);

  // Remove from workspace
  const removeFromWorkspace = useCallback((idx: number) => {
    setWorkspace((prev) => prev.filter((_, i) => i !== idx));
    if (selectedIdx === idx) setSelectedIdx(null);
    else if (selectedIdx !== null && selectedIdx > idx) setSelectedIdx(selectedIdx - 1);
  }, [selectedIdx]);

  // Try to combine two items
  const tryCombine = useCallback(
    (idx1: number, idx2: number) => {
      if (idx1 === idx2) return;
      const a = workspace[idx1];
      const b = workspace[idx2];
      const resultId = findRecipe(a, b);

      if (resultId) {
        const item = ALL_ITEMS[resultId];
        const isNew = !discovered.has(resultId);

        // Remove the two items from workspace, add result
        setWorkspace((prev) => {
          const next = prev.filter((_, i) => i !== idx1 && i !== idx2);
          next.push(resultId);
          return next;
        });

        if (isNew) {
          setDiscovered((prev) => new Set([...prev, resultId]));
        }

        setCombineResult({ item, isNew });
        setTimeout(() => setCombineResult(null), 2200);
      } else {
        // Shake both items
        setShakeIdx(idx1);
        setTimeout(() => setShakeIdx(null), 500);
      }
      setSelectedIdx(null);
    },
    [workspace, findRecipe, discovered]
  );

  // Handle workspace item click
  const handleWorkspaceClick = useCallback(
    (idx: number) => {
      if (selectedIdx === null) {
        setSelectedIdx(idx);
      } else if (selectedIdx === idx) {
        setSelectedIdx(null);
      } else {
        tryCombine(selectedIdx, idx);
      }
    },
    [selectedIdx, tryCombine]
  );

  // Create sparkle effect
  const createSparkle = useCallback((e: React.MouseEvent) => {
    const id = sparkleId.current++;
    setSparkles((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => {
      setSparkles((prev) => prev.filter((s) => s.id !== id));
    }, 800);
  }, []);

  // Get a hint
  const getHint = useCallback((): string => {
    const discoveredArr = Array.from(discovered);
    // Find a recipe where both ingredients are discovered but result is not
    const available = RECIPES.filter(
      (r) => discoveredArr.includes(r.a) && discoveredArr.includes(r.b) && !discovered.has(r.result)
    );
    if (available.length === 0) return "더 이상 힌트가 없어요! 모든 아이템을 찾았나 확인해보세요.";
    const hint = available[Math.floor(Math.random() * available.length)];
    const a = ALL_ITEMS[hint.a];
    const b = ALL_ITEMS[hint.b];
    return `${a.emoji} ${a.name} + ${b.emoji} ${b.name} = ???`;
  }, [discovered]);

  // Get rarity stats
  const rarityStats = useCallback(() => {
    const stats: Record<Rarity, { total: number; found: number }> = {
      common: { total: 0, found: 0 },
      advanced: { total: 0, found: 0 },
      rare: { total: 0, found: 0 },
      legendary: { total: 0, found: 0 },
      mythic: { total: 0, found: 0 },
    };
    Object.values(ALL_ITEMS).forEach((item) => {
      stats[item.rarity].total++;
      if (discovered.has(item.id)) stats[item.rarity].found++;
    });
    return stats;
  }, [discovered]);

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-purple-950 via-indigo-950 to-gray-950 text-white relative overflow-hidden"
      onClick={createSparkle}
    >
      {/* Floating sparkles */}
      {sparkles.map((s) => (
        <div
          key={s.id}
          className="pointer-events-none fixed z-50 animate-ping"
          style={{ left: s.x - 8, top: s.y - 8 }}
        >
          <span className="text-xl">✨</span>
        </div>
      ))}

      {/* Ambient floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-20 animate-pulse"
            style={{
              width: `${4 + (i % 4) * 2}px`,
              height: `${4 + (i % 4) * 2}px`,
              left: `${(i * 8.3) % 100}%`,
              top: `${(i * 7.7 + 10) % 100}%`,
              background: i % 3 === 0 ? "#a78bfa" : i % 3 === 1 ? "#fbbf24" : "#818cf8",
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${2 + (i % 3)}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-purple-300 hover:text-purple-100 transition-colors"
            >
              <span className="text-xl">←</span>
              <span className="text-sm font-medium">홈으로</span>
            </Link>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHint(true);
                  setTimeout(() => setShowHint(false), 3500);
                }}
                className="px-3 py-1.5 bg-amber-600/40 border border-amber-500/50 rounded-lg text-amber-200 text-sm hover:bg-amber-600/60 transition-all"
              >
                💡 힌트
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCollection(!showCollection);
                }}
                className="px-3 py-1.5 bg-purple-600/40 border border-purple-500/50 rounded-lg text-purple-200 text-sm hover:bg-purple-600/60 transition-all"
              >
                📖 도감
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-4">
            <h1 className="text-3xl sm:text-4xl font-black mb-1">
              <span className="bg-gradient-to-r from-yellow-300 via-purple-300 to-yellow-300 bg-clip-text text-transparent">
                ✨ 귀한 물건 만들기 ✨
              </span>
            </h1>
            <p className="text-purple-400 text-sm">재료를 합쳐서 귀한 물건을 만들어보세요!</p>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-purple-300 mb-1">
              <span>발견한 아이템</span>
              <span>{discoveredCount} / {totalItems}</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden border border-purple-500/30">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-amber-500 rounded-full transition-all duration-700 relative"
                style={{ width: `${(discoveredCount / totalItems) * 100}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
            </div>
          </div>

          {/* Hint popup */}
          {showHint && (
            <div className="mb-4 p-3 bg-amber-900/50 border border-amber-500/50 rounded-xl text-center animate-bounce">
              <p className="text-amber-200 text-sm font-medium">💡 {getHint()}</p>
            </div>
          )}

          {/* Combine result popup */}
          {combineResult && (
            <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
              <div
                className={`p-6 rounded-2xl border-2 text-center animate-bounce ${
                  combineResult.isNew
                    ? "bg-purple-900/90 border-yellow-400 shadow-[0_0_40px_rgba(234,179,8,0.5)]"
                    : "bg-gray-900/90 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                }`}
              >
                <div className="text-5xl mb-2">{combineResult.item.emoji}</div>
                <div className={`text-lg font-bold ${RARITY_COLOR[combineResult.item.rarity]}`}>
                  {combineResult.item.name}
                </div>
                <div className="text-xs text-gray-400 mt-1">{combineResult.item.description}</div>
                <div className={`text-xs mt-1 ${RARITY_COLOR[combineResult.item.rarity]}`}>
                  [{RARITY_LABEL[combineResult.item.rarity]}]
                </div>
                {combineResult.isNew && (
                  <div className="text-yellow-400 text-sm mt-2 font-bold animate-pulse">
                    🎉 새로운 발견!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collection Book Modal */}
          {showCollection && (
            <div
              className="fixed inset-0 z-30 bg-black/70 flex items-center justify-center p-4"
              onClick={(e) => {
                e.stopPropagation();
                setShowCollection(false);
              }}
            >
              <div
                className="bg-gradient-to-b from-gray-900 to-purple-950 border border-purple-500/40 rounded-2xl p-5 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-[0_0_30px_rgba(168,85,247,0.3)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-purple-200">📖 아이템 도감</h2>
                  <button
                    onClick={() => setShowCollection(false)}
                    className="text-gray-400 hover:text-white text-xl"
                  >
                    ✕
                  </button>
                </div>

                {/* Rarity stats */}
                <div className="grid grid-cols-5 gap-1 mb-4">
                  {(["common", "advanced", "rare", "legendary", "mythic"] as Rarity[]).map((r) => {
                    const s = rarityStats();
                    return (
                      <div key={r} className="text-center p-1.5 bg-gray-800/50 rounded-lg">
                        <div className={`text-xs font-bold ${RARITY_COLOR[r]}`}>
                          {RARITY_LABEL[r]}
                        </div>
                        <div className="text-xs text-gray-400">
                          {s[r].found}/{s[r].total}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Item grid */}
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                  {Object.values(ALL_ITEMS).map((item) => {
                    const found = discovered.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-1 transition-all ${
                          found
                            ? `${RARITY_BG[item.rarity]} ${RARITY_GLOW[item.rarity]}`
                            : "border-gray-700/30 bg-gray-900/50"
                        }`}
                        title={found ? `${item.name} - ${item.description}` : "???"}
                      >
                        <span className={`text-xl ${found ? "" : "opacity-10 blur-sm"}`}>
                          {found ? item.emoji : "❓"}
                        </span>
                        <span
                          className={`text-[10px] mt-0.5 text-center leading-tight ${
                            found ? RARITY_COLOR[item.rarity] : "text-gray-700"
                          }`}
                        >
                          {found ? item.name : "???"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Main game area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Discovered items palette */}
            <div className="lg:col-span-1">
              <div className="bg-gray-900/50 border border-purple-500/20 rounded-2xl p-3">
                <h3 className="text-sm font-bold text-purple-300 mb-2 text-center">
                  🧪 재료함 ({discoveredCount}개)
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-3 gap-1.5 max-h-[40vh] lg:max-h-[55vh] overflow-y-auto pr-1">
                  {Object.values(ALL_ITEMS)
                    .filter((item) => discovered.has(item.id))
                    .sort((a, b) => {
                      const order: Rarity[] = ["common", "advanced", "rare", "legendary", "mythic"];
                      return order.indexOf(a.rarity) - order.indexOf(b.rarity);
                    })
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToWorkspace(item.id);
                        }}
                        className={`p-2 rounded-xl border-2 text-center transition-all hover:scale-105 active:scale-95 ${RARITY_BG[item.rarity]} ${RARITY_GLOW[item.rarity]}`}
                        title={item.description}
                      >
                        <div className="text-xl">{item.emoji}</div>
                        <div className={`text-[10px] ${RARITY_COLOR[item.rarity]} font-medium truncate`}>
                          {item.name}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Workspace / crafting area */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900/50 border border-purple-500/20 rounded-2xl p-4 min-h-[300px] relative">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-purple-300">
                    ⚗️ 작업대
                  </h3>
                  <div className="flex gap-2">
                    {selectedIdx !== null && (
                      <span className="text-xs text-amber-300 animate-pulse">
                        합칠 아이템을 선택하세요!
                      </span>
                    )}
                    {workspace.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWorkspace([]);
                          setSelectedIdx(null);
                        }}
                        className="text-xs px-2 py-1 bg-red-900/40 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-900/60 transition-all"
                      >
                        🗑️ 비우기
                      </button>
                    )}
                  </div>
                </div>

                {workspace.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                    <div className="text-4xl mb-3 opacity-30">⚗️</div>
                    <p className="text-sm">왼쪽 재료함에서 아이템을 클릭하여</p>
                    <p className="text-sm">작업대에 올려놓으세요!</p>
                    <p className="text-xs mt-2 text-gray-700">두 아이템을 클릭하면 합성!</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {workspace.map((itemId, idx) => {
                      const item = ALL_ITEMS[itemId];
                      const isSelected = selectedIdx === idx;
                      const isShaking = shakeIdx === idx;
                      return (
                        <div key={idx} className="relative group">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWorkspaceClick(idx);
                            }}
                            className={`p-3 rounded-2xl border-2 text-center transition-all min-w-[72px] ${
                              RARITY_BG[item.rarity]
                            } ${RARITY_GLOW[item.rarity]} ${
                              isSelected
                                ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-900 scale-110"
                                : "hover:scale-105"
                            } ${isShaking ? "animate-[shake_0.3s_ease-in-out_2]" : ""}`}
                          >
                            <div className="text-3xl">{item.emoji}</div>
                            <div className={`text-xs ${RARITY_COLOR[item.rarity]} font-medium mt-1`}>
                              {item.name}
                            </div>
                          </button>
                          {/* Remove button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromWorkspace(idx);
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Instructions */}
                <div className="mt-4 pt-3 border-t border-purple-500/10">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 justify-center">
                    <span>📌 재료함에서 클릭 → 작업대에 추가</span>
                    <span>🔗 작업대에서 두 개 클릭 → 합성!</span>
                    <span>❌ 호버 후 ✕ → 제거</span>
                  </div>
                </div>
              </div>

              {/* Recipe guide for latest discoveries */}
              <div className="mt-4 bg-gray-900/40 border border-purple-500/15 rounded-2xl p-3">
                <h3 className="text-sm font-bold text-purple-300 mb-2">📜 최근 발견 레시피</h3>
                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                  {RECIPES.filter((r) => discovered.has(r.result))
                    .slice(-5)
                    .reverse()
                    .map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                        <span className={RARITY_COLOR[ALL_ITEMS[r.a].rarity]}>
                          {ALL_ITEMS[r.a].emoji} {ALL_ITEMS[r.a].name}
                        </span>
                        <span className="text-purple-500">+</span>
                        <span className={RARITY_COLOR[ALL_ITEMS[r.b].rarity]}>
                          {ALL_ITEMS[r.b].emoji} {ALL_ITEMS[r.b].name}
                        </span>
                        <span className="text-purple-500">=</span>
                        <span className={`font-bold ${RARITY_COLOR[ALL_ITEMS[r.result].rarity]}`}>
                          {ALL_ITEMS[r.result].emoji} {ALL_ITEMS[r.result].name}
                        </span>
                      </div>
                    ))}
                  {RECIPES.filter((r) => discovered.has(r.result)).length === 0 && (
                    <p className="text-gray-600 text-xs">아직 합성한 아이템이 없어요!</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Completion message */}
          {discoveredCount === totalItems && (
            <div className="mt-6 text-center p-6 bg-gradient-to-r from-yellow-900/40 via-purple-900/40 to-yellow-900/40 border border-yellow-500/50 rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.3)]">
              <div className="text-4xl mb-2">🏆</div>
              <h2 className="text-2xl font-black text-yellow-300 mb-1">축하합니다!</h2>
              <p className="text-yellow-200/80 text-sm">모든 귀한 물건을 발견했어요!</p>
              <p className="text-yellow-200/60 text-xs mt-1">당신은 진정한 연금술사입니다! ✨</p>
            </div>
          )}
        </div>
      </div>

      {/* Custom shake animation */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px) rotate(-2deg); }
          75% { transform: translateX(6px) rotate(2deg); }
        }
      `}</style>
    </div>
  );
}
