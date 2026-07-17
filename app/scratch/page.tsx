"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

// ============================================================
// TYPES & DATA
// ============================================================
type Screen = "menu" | "shop" | "play" | "result" | "collection";

interface ScratchCard {
  id: string;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  gridSize: number; // 3, 4, or 5
  prizes: Prize[];
  bgGradient: string;
  scratchColor: string;
}

interface Prize {
  symbol: string;
  name: string;
  value: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface CollectionItem {
  symbol: string;
  name: string;
  rarity: string;
  count: number;
}

const RARITY_COLORS: Record<string, string> = {
  common: "text-gray-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

const RARITY_BG: Record<string, string> = {
  common: "bg-gray-800",
  rare: "bg-blue-900/50",
  epic: "bg-purple-900/50",
  legendary: "bg-yellow-900/30",
};

const RARITY_BORDER: Record<string, string> = {
  common: "border-gray-600",
  rare: "border-blue-500",
  epic: "border-purple-500",
  legendary: "border-yellow-400",
};

const CARDS: ScratchCard[] = [
  {
    id: "fruit",
    name: "과일 스크래치",
    icon: "🍎",
    desc: "달콤한 과일이 가득! 3개 일치시 당첨!",
    cost: 10,
    gridSize: 3,
    bgGradient: "from-green-900 to-emerald-800",
    scratchColor: "#4ade80",
    prizes: [
      { symbol: "🍎", name: "사과", value: 5, rarity: "common" },
      { symbol: "🍊", name: "오렌지", value: 10, rarity: "common" },
      { symbol: "🍇", name: "포도", value: 20, rarity: "rare" },
      { symbol: "🍓", name: "딸기", value: 50, rarity: "rare" },
      { symbol: "🍑", name: "복숭아", value: 100, rarity: "epic" },
      { symbol: "🌟", name: "황금과일", value: 500, rarity: "legendary" },
    ],
  },
  {
    id: "animal",
    name: "동물 스크래치",
    icon: "🐾",
    desc: "귀여운 동물 친구들! 3개 일치시 당첨!",
    cost: 25,
    gridSize: 3,
    bgGradient: "from-amber-900 to-orange-800",
    scratchColor: "#f59e0b",
    prizes: [
      { symbol: "🐱", name: "고양이", value: 10, rarity: "common" },
      { symbol: "🐶", name: "강아지", value: 15, rarity: "common" },
      { symbol: "🐰", name: "토끼", value: 30, rarity: "rare" },
      { symbol: "🦊", name: "여우", value: 60, rarity: "rare" },
      { symbol: "🐼", name: "판다", value: 150, rarity: "epic" },
      { symbol: "🦄", name: "유니콘", value: 800, rarity: "legendary" },
    ],
  },
  {
    id: "space",
    name: "우주 스크래치",
    icon: "🚀",
    desc: "우주를 탐험하라! 4x4 그리드, 4개 일치시 당첨!",
    cost: 50,
    gridSize: 4,
    bgGradient: "from-indigo-900 to-violet-900",
    scratchColor: "#818cf8",
    prizes: [
      { symbol: "⭐", name: "별", value: 15, rarity: "common" },
      { symbol: "🌙", name: "달", value: 25, rarity: "common" },
      { symbol: "☄️", name: "혜성", value: 50, rarity: "rare" },
      { symbol: "🪐", name: "토성", value: 100, rarity: "rare" },
      { symbol: "🌌", name: "은하", value: 300, rarity: "epic" },
      { symbol: "🕳️", name: "블랙홀", value: 1500, rarity: "legendary" },
    ],
  },
  {
    id: "treasure",
    name: "보물 스크래치",
    icon: "💎",
    desc: "전설의 보물을 찾아라! 5x5 그리드, 5개 일치시 대박!",
    cost: 100,
    gridSize: 5,
    bgGradient: "from-rose-900 to-red-900",
    scratchColor: "#fb7185",
    prizes: [
      { symbol: "🪙", name: "동전", value: 20, rarity: "common" },
      { symbol: "💰", name: "금화", value: 40, rarity: "common" },
      { symbol: "💎", name: "다이아몬드", value: 100, rarity: "rare" },
      { symbol: "👑", name: "왕관", value: 250, rarity: "rare" },
      { symbol: "🏆", name: "트로피", value: 600, rarity: "epic" },
      { symbol: "🔱", name: "포세이돈의 삼지창", value: 3000, rarity: "legendary" },
    ],
  },
  {
    id: "dragon",
    name: "드래곤 스크래치",
    icon: "🐉",
    desc: "전설의 드래곤! 5x5, 최고 보상!",
    cost: 200,
    gridSize: 5,
    bgGradient: "from-red-950 to-orange-900",
    scratchColor: "#ef4444",
    prizes: [
      { symbol: "🔥", name: "불꽃", value: 50, rarity: "common" },
      { symbol: "🐲", name: "아기 드래곤", value: 80, rarity: "common" },
      { symbol: "⚔️", name: "드래곤 검", value: 200, rarity: "rare" },
      { symbol: "🛡️", name: "드래곤 방패", value: 400, rarity: "rare" },
      { symbol: "🐉", name: "성룡", value: 1000, rarity: "epic" },
      { symbol: "👁️‍🗨️", name: "드래곤 아이", value: 5000, rarity: "legendary" },
    ],
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function generateGrid(card: ScratchCard): { symbol: string; prize: Prize }[] {
  const { gridSize, prizes } = card;
  const totalCells = gridSize * gridSize;
  const matchCount = gridSize; // need gridSize matches to win

  // Decide if this card is a winner (30% chance)
  const isWinner = Math.random() < 0.3;

  const grid: { symbol: string; prize: Prize }[] = [];

  if (isWinner) {
    // Pick a winning prize (weighted by rarity)
    const winPrize = pickWeightedPrize(prizes);
    // Place exactly matchCount of the winning symbol
    const winPositions = new Set<number>();
    while (winPositions.size < matchCount) {
      winPositions.add(Math.floor(Math.random() * totalCells));
    }
    for (let i = 0; i < totalCells; i++) {
      if (winPositions.has(i)) {
        grid.push({ symbol: winPrize.symbol, prize: winPrize });
      } else {
        // Fill with other symbols (not the winning one)
        const others = prizes.filter((p) => p.symbol !== winPrize.symbol);
        const pick = others[Math.floor(Math.random() * others.length)];
        grid.push({ symbol: pick.symbol, prize: pick });
      }
    }
  } else {
    // No matches of gridSize count - distribute randomly but ensure no symbol appears gridSize times
    const attempts = 100;
    for (let attempt = 0; attempt < attempts; attempt++) {
      grid.length = 0;
      for (let i = 0; i < totalCells; i++) {
        const pick = prizes[Math.floor(Math.random() * prizes.length)];
        grid.push({ symbol: pick.symbol, prize: pick });
      }
      // Check no symbol appears gridSize or more times
      const counts: Record<string, number> = {};
      for (const cell of grid) {
        counts[cell.symbol] = (counts[cell.symbol] || 0) + 1;
      }
      const maxCount = Math.max(...Object.values(counts));
      if (maxCount < matchCount) break;
    }
    // If we still have matches after attempts, just use it (rare edge case)
    if (grid.length === 0) {
      for (let i = 0; i < totalCells; i++) {
        const pick = prizes[i % prizes.length];
        grid.push({ symbol: pick.symbol, prize: pick });
      }
    }
  }

  return grid;
}

function pickWeightedPrize(prizes: Prize[]): Prize {
  const weights: Record<string, number> = {
    common: 50,
    rare: 30,
    epic: 15,
    legendary: 5,
  };
  const totalWeight = prizes.reduce((sum, p) => sum + weights[p.rarity], 0);
  let r = Math.random() * totalWeight;
  for (const p of prizes) {
    r -= weights[p.rarity];
    if (r <= 0) return p;
  }
  return prizes[0];
}

function checkWinnings(
  grid: { symbol: string; prize: Prize }[],
  matchCount: number
): { symbol: string; prize: Prize; count: number }[] {
  const counts: Record<string, { prize: Prize; count: number }> = {};
  for (const cell of grid) {
    if (!counts[cell.symbol]) {
      counts[cell.symbol] = { prize: cell.prize, count: 0 };
    }
    counts[cell.symbol].count++;
  }
  return Object.entries(counts)
    .filter(([, v]) => v.count >= matchCount)
    .map(([symbol, v]) => ({ symbol, ...v }));
}

// ============================================================
// SCRATCH CANVAS COMPONENT
// ============================================================
function ScratchCell({
  size,
  color,
  revealed,
  onReveal,
  children,
}: {
  size: number;
  color: string;
  revealed: boolean;
  onReveal: () => void;
  children: React.ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const scratched = useRef(0);
  const [isRevealed, setIsRevealed] = useState(revealed);

  const cellSize = size;

  useEffect(() => {
    if (isRevealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = cellSize;
    canvas.height = cellSize;

    // Draw scratch surface
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, cellSize, cellSize);

    // Add shimmer pattern
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    for (let i = 0; i < cellSize; i += 8) {
      ctx.fillRect(i, 0, 4, cellSize);
    }

    // Question mark
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `bold ${cellSize * 0.5}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", cellSize / 2, cellSize / 2);
  }, [cellSize, color, isRevealed]);

  const scratch = useCallback(
    (x: number, y: number) => {
      if (isRevealed) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, cellSize * 0.2, 0, Math.PI * 2);
      ctx.fill();

      scratched.current += 1;
      if (scratched.current > 8) {
        setIsRevealed(true);
        onReveal();
      }
    },
    [cellSize, isRevealed, onReveal]
  );

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    const { x, y } = getPos(e);
    scratch(x, y);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const { x, y } = getPos(e);
    scratch(x, y);
  };

  const handleEnd = () => {
    isDrawing.current = false;
  };

  return (
    <div
      className="relative overflow-hidden rounded-lg border-2 border-white/20"
      style={{ width: cellSize, height: cellSize }}
    >
      {/* Prize underneath */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
        <span style={{ fontSize: cellSize * 0.5 }}>{children}</span>
      </div>
      {/* Scratch overlay */}
      {!isRevealed && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-pointer touch-none"
          style={{ width: cellSize, height: cellSize }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      )}
      {isRevealed && (
        <div className="absolute inset-0 flex items-center justify-center animate-bounce-once">
          <span style={{ fontSize: cellSize * 0.5 }}>{children}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function ScratchGame() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [coins, setCoins] = useState(500);
  const [totalWon, setTotalWon] = useState(0);
  const [totalScratched, setTotalScratched] = useState(0);
  const [selectedCard, setSelectedCard] = useState<ScratchCard | null>(null);
  const [grid, setGrid] = useState<{ symbol: string; prize: Prize }[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [winnings, setWinnings] = useState<
    { symbol: string; prize: Prize; count: number }[] | null
  >(null);
  const [collection, setCollection] = useState<Record<string, CollectionItem>>(
    {}
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [jackpotAnimation, setJackpotAnimation] = useState(false);

  const startCard = (card: ScratchCard) => {
    if (coins < card.cost) return;
    setCoins((c) => c - card.cost);
    setSelectedCard(card);
    const newGrid = generateGrid(card);
    setGrid(newGrid);
    setRevealedCount(0);
    setWinnings(null);
    setShowConfetti(false);
    setJackpotAnimation(false);
    setScreen("play");
  };

  const handleCellReveal = useCallback(() => {
    setRevealedCount((prev) => prev + 1);
  }, []);

  // Check results when all cells revealed
  useEffect(() => {
    if (!selectedCard || screen !== "play") return;
    const totalCells = selectedCard.gridSize * selectedCard.gridSize;
    if (revealedCount < totalCells) return;

    const wins = checkWinnings(grid, selectedCard.gridSize);
    setWinnings(wins);
    setTotalScratched((s) => s + 1);

    // Add to collection
    const newCollection = { ...collection };
    for (const cell of grid) {
      const key = cell.symbol;
      if (!newCollection[key]) {
        newCollection[key] = {
          symbol: cell.symbol,
          name: cell.prize.name,
          rarity: cell.prize.rarity,
          count: 0,
        };
      }
      newCollection[key].count++;
    }
    setCollection(newCollection);

    if (wins.length > 0) {
      const totalWin = wins.reduce(
        (sum, w) => sum + w.prize.value * w.count,
        0
      );
      setCoins((c) => c + totalWin);
      setTotalWon((t) => t + totalWin);
      setShowConfetti(true);
      if (wins.some((w) => w.prize.rarity === "legendary")) {
        setJackpotAnimation(true);
      }
    }

    setTimeout(() => setScreen("result"), 500);
  }, [revealedCount, selectedCard, grid, screen, collection]);

  const revealAll = () => {
    setRevealedCount(selectedCard!.gridSize * selectedCard!.gridSize);
  };

  // ============================================================
  // RENDER
  // ============================================================

  // Menu Screen
  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="mb-4 inline-block text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← 홈으로
            </Link>
            <h1 className="text-4xl font-black mb-2">
              🎰 스크래치 카드 🎰
            </h1>
            <p className="text-gray-400">긁어서 행운을 확인하세요!</p>
          </div>

          {/* Stats Bar */}
          <div className="mb-6 flex justify-between items-center rounded-xl bg-gray-800/80 px-4 py-3 border border-gray-700">
            <div className="text-center">
              <div className="text-xs text-gray-400">보유 코인</div>
              <div className="text-xl font-bold text-yellow-400">
                🪙 {coins.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">총 당첨금</div>
              <div className="text-xl font-bold text-green-400">
                💰 {totalWon.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">긁은 횟수</div>
              <div className="text-xl font-bold text-blue-400">
                🎫 {totalScratched}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setScreen("collection")}
              className="flex-1 rounded-lg bg-purple-700 py-2 text-sm font-bold hover:bg-purple-600 transition-colors"
            >
              📦 컬렉션 ({Object.keys(collection).length})
            </button>
            <button
              onClick={() => setCoins((c) => c + 100)}
              className="flex-1 rounded-lg bg-green-700 py-2 text-sm font-bold hover:bg-green-600 transition-colors"
            >
              🎁 무료 코인 +100
            </button>
          </div>

          {/* Card Selection */}
          <div className="space-y-4">
            {CARDS.map((card) => (
              <button
                key={card.id}
                onClick={() => startCard(card)}
                disabled={coins < card.cost}
                className={`w-full rounded-xl bg-gradient-to-r ${card.bgGradient} p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 border border-white/10`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{card.icon}</div>
                  <div className="flex-1">
                    <div className="text-lg font-bold">{card.name}</div>
                    <div className="text-sm text-white/70">{card.desc}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm text-yellow-300">
                        🪙 {card.cost}
                      </span>
                      <span className="text-xs text-white/50">
                        {card.gridSize}x{card.gridSize} 그리드
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl">→</div>
                </div>
                {/* Prize preview */}
                <div className="mt-2 flex gap-1 justify-center">
                  {card.prizes.map((p) => (
                    <span
                      key={p.symbol}
                      className={`text-lg ${RARITY_COLORS[p.rarity]}`}
                      title={`${p.name} (${p.value} 코인)`}
                    >
                      {p.symbol}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Play Screen
  if (screen === "play" && selectedCard) {
    const totalCells = selectedCard.gridSize * selectedCard.gridSize;
    const progress = Math.round((revealedCount / totalCells) * 100);
    const maxGridWidth = 360;
    const gap = 6;
    const cellSize = Math.floor(
      (maxGridWidth - gap * (selectedCard.gridSize - 1)) / selectedCard.gridSize
    );

    return (
      <div
        className={`min-h-screen bg-gradient-to-b ${selectedCard.bgGradient} text-white`}
      >
        <div className="mx-auto max-w-lg px-4 py-6">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setScreen("menu")}
              className="text-sm text-white/70 hover:text-white"
            >
              ← 돌아가기
            </button>
            <div className="text-lg font-bold text-yellow-300">
              🪙 {coins.toLocaleString()}
            </div>
          </div>

          {/* Card Title */}
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-black">
              {selectedCard.icon} {selectedCard.name}
            </h2>
            <p className="text-sm text-white/60">
              {selectedCard.gridSize}개 같은 그림이 나오면 당첨!
            </p>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>
                {revealedCount}/{totalCells} 긁음
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-black/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/80 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Scratch Grid */}
          <div className="flex justify-center mb-4">
            <div
              className="grid rounded-xl bg-black/30 p-3 border border-white/20"
              style={{
                gridTemplateColumns: `repeat(${selectedCard.gridSize}, ${cellSize}px)`,
                gap: `${gap}px`,
              }}
            >
              {grid.map((cell, i) => (
                <ScratchCell
                  key={i}
                  size={cellSize}
                  color={selectedCard.scratchColor}
                  revealed={revealedCount >= totalCells}
                  onReveal={handleCellReveal}
                >
                  {cell.symbol}
                </ScratchCell>
              ))}
            </div>
          </div>

          {/* Reveal All Button */}
          {revealedCount < totalCells && (
            <button
              onClick={revealAll}
              className="w-full rounded-lg bg-white/20 py-3 font-bold hover:bg-white/30 transition-colors border border-white/20"
            >
              ⚡ 전부 긁기
            </button>
          )}
        </div>
      </div>
    );
  }

  // Result Screen
  if (screen === "result" && selectedCard) {
    const isWin = winnings && winnings.length > 0;
    const totalWinAmount = winnings
      ? winnings.reduce((sum, w) => sum + w.prize.value * w.count, 0)
      : 0;

    return (
      <div
        className={`min-h-screen ${
          isWin
            ? "bg-gradient-to-b from-yellow-900 via-amber-900 to-yellow-950"
            : "bg-gradient-to-b from-gray-900 via-gray-800 to-gray-950"
        } text-white`}
      >
        {/* Confetti */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-5%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 3}s`,
                  fontSize: `${12 + Math.random() * 16}px`,
                }}
              >
                {["🎉", "✨", "🌟", "💫", "🎊", "⭐"][
                  Math.floor(Math.random() * 6)
                ]}
              </div>
            ))}
          </div>
        )}

        <div className="mx-auto max-w-lg px-4 py-8">
          {/* Result */}
          <div className="mb-8 text-center">
            {isWin ? (
              <>
                <div
                  className={`text-6xl mb-4 ${
                    jackpotAnimation ? "animate-pulse" : ""
                  }`}
                >
                  🎉
                </div>
                <h2 className="text-3xl font-black text-yellow-300 mb-2">
                  당첨!!!
                </h2>
                <div className="text-5xl font-black text-yellow-400 mb-4 animate-bounce">
                  +{totalWinAmount.toLocaleString()} 🪙
                </div>
                {winnings!.map((w, i) => (
                  <div
                    key={i}
                    className={`inline-flex items-center gap-2 mx-1 rounded-full px-3 py-1 ${
                      RARITY_BG[w.prize.rarity]
                    } border ${RARITY_BORDER[w.prize.rarity]}`}
                  >
                    <span className="text-xl">{w.symbol}</span>
                    <span className={RARITY_COLORS[w.prize.rarity]}>
                      {w.prize.name} x{w.count}
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">😢</div>
                <h2 className="text-3xl font-black text-gray-400 mb-2">
                  아쉽네요...
                </h2>
                <p className="text-gray-500">다음엔 꼭 당첨될 거예요!</p>
              </>
            )}
          </div>

          {/* Grid Review */}
          <div className="mb-6 rounded-xl bg-black/30 p-4 border border-white/10">
            <div className="text-center text-sm text-white/60 mb-2">
              스크래치 결과
            </div>
            <div
              className="grid gap-2 justify-center"
              style={{
                gridTemplateColumns: `repeat(${selectedCard.gridSize}, 1fr)`,
              }}
            >
              {grid.map((cell, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center rounded-lg bg-gray-800 p-2 text-2xl"
                >
                  {cell.symbol}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => startCard(selectedCard)}
              disabled={coins < selectedCard.cost}
              className={`w-full rounded-xl bg-gradient-to-r ${selectedCard.bgGradient} py-4 text-lg font-bold hover:brightness-110 transition-all disabled:opacity-40 border border-white/20`}
            >
              🔄 다시 긁기 (🪙 {selectedCard.cost})
            </button>
            <button
              onClick={() => setScreen("menu")}
              className="w-full rounded-xl bg-gray-700 py-3 font-bold hover:bg-gray-600 transition-colors"
            >
              🏠 카드 선택으로
            </button>
          </div>

          {/* Current Balance */}
          <div className="mt-4 text-center text-sm text-white/50">
            보유 코인: 🪙 {coins.toLocaleString()}
          </div>
        </div>
      </div>
    );
  }

  // Collection Screen
  if (screen === "collection") {
    const items = Object.values(collection).sort((a, b) => {
      const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
      return (
        (rarityOrder[a.rarity as keyof typeof rarityOrder] ?? 4) -
        (rarityOrder[b.rarity as keyof typeof rarityOrder] ?? 4)
      );
    });

    // Count total possible symbols
    const allSymbols = new Set(CARDS.flatMap((c) => c.prizes.map((p) => p.symbol)));

    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setScreen("menu")}
              className="text-sm text-gray-400 hover:text-white"
            >
              ← 돌아가기
            </button>
            <h2 className="text-xl font-bold">📦 컬렉션</h2>
            <span className="text-sm text-gray-400">
              {items.length}/{allSymbols.size}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <div className="text-4xl mb-4">📭</div>
              <p>아직 수집한 아이템이 없어요!</p>
              <p className="text-sm">스크래치 카드를 긁어보세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {items.map((item) => (
                <div
                  key={item.symbol}
                  className={`rounded-xl ${RARITY_BG[item.rarity]} border ${
                    RARITY_BORDER[item.rarity]
                  } p-3 text-center`}
                >
                  <div className="text-3xl mb-1">{item.symbol}</div>
                  <div className="text-xs font-bold truncate">{item.name}</div>
                  <div
                    className={`text-xs ${RARITY_COLORS[item.rarity]} capitalize`}
                  >
                    {item.rarity}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    x{item.count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
