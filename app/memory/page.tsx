"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const EMOJI_POOL = [
  "🐶","🐱","🐰","🦊","🐻","🐼","🐨","🦁","🐸","🐵",
  "🦄","🐙","🦋","🐢","🦀","🐳","🦩","🐘","🦜","🐊",
  "🍎","🍕","🎸","🚀","⚽","🎨","🌈","💎","🔥","⭐",
];

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

type Difficulty = "easy" | "medium" | "hard";

const GRID: Record<Difficulty, { pairs: number; cols: string }> = {
  easy: { pairs: 6, cols: "grid-cols-3" },
  medium: { pairs: 10, cols: "grid-cols-4" },
  hard: { pairs: 15, cols: "grid-cols-5" },
};

export default function MemoryGame() {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [bestTimes, setBestTimes] = useState<Record<Difficulty, number>>({ easy: 0, medium: 0, hard: 0 });
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const totalPairs = difficulty ? GRID[difficulty].pairs : 0;
  const done = matches === totalPairs && totalPairs > 0;

  const initGame = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    const pairs = GRID[diff].pairs;
    const chosen = [...EMOJI_POOL].sort(() => Math.random() - 0.5).slice(0, pairs);
    const deck = [...chosen, ...chosen]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
    setCards(deck);
    setFlippedIds([]);
    setMoves(0);
    setMatches(0);
    setCombo(0);
    setMaxCombo(0);
    setScore(0);
    setStartTime(Date.now());
    setElapsed(0);
    // 처음 2초간 모든 카드 보여주기
    setShowAll(true);
    setTimeout(() => setShowAll(false), 2000);
  }, []);

  useEffect(() => {
    if (!difficulty || done) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 100);
    return () => clearInterval(iv);
  }, [difficulty, startTime, done]);

  const handleFlip = useCallback((id: number) => {
    if (showAll) return;
    if (flippedIds.length >= 2) return;
    const card = cards[id];
    if (card.flipped || card.matched) return;

    const newFlipped = [...flippedIds, id];
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)));
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = newFlipped;
      if (cards[a].emoji === cards[b].emoji) {
        setTimeout(() => {
          setCards((prev) => prev.map((c) => (c.id === a || c.id === b ? { ...c, matched: true } : c)));
          setFlippedIds([]);
          setMatches((m) => m + 1);
          setCombo((c) => {
            const nc = c + 1;
            setMaxCombo((mc) => Math.max(mc, nc));
            setScore((s) => s + 100 * nc);
            return nc;
          });
        }, 300);
      } else {
        setTimeout(() => {
          setCards((prev) => prev.map((c) => (c.id === a || c.id === b ? { ...c, flipped: false } : c)));
          setFlippedIds([]);
          setCombo(0);
        }, 800);
      }
    }
  }, [cards, flippedIds, showAll]);

  useEffect(() => {
    if (done && difficulty) {
      const t = elapsed;
      setBestTimes((bt) => {
        if (bt[difficulty] === 0 || t < bt[difficulty]) return { ...bt, [difficulty]: t };
        return bt;
      });
    }
  }, [done, elapsed, difficulty]);

  if (!difficulty) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-950 flex flex-col items-center justify-center px-6">
        <Link href="/" className="fixed top-4 left-4 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-white text-sm hover:bg-white/30 transition z-50">
          ← 홈으로
        </Link>
        <div className="text-8xl mb-6">🧠</div>
        <h1 className="text-4xl font-black text-white mb-2">기억력 카드게임</h1>
        <p className="text-white/60 mb-10">같은 카드 짝을 찾아보세요!</p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => initGame(d)}
              className="w-full py-4 rounded-2xl text-xl font-bold text-white transition-all hover:scale-105 active:scale-95"
              style={{
                background: d === "easy" ? "linear-gradient(135deg,#22c55e,#16a34a)" :
                  d === "medium" ? "linear-gradient(135deg,#f59e0b,#d97706)" :
                  "linear-gradient(135deg,#ef4444,#dc2626)",
              }}
            >
              {d === "easy" ? "🟢 쉬움 (6쌍)" : d === "medium" ? "🟡 보통 (10쌍)" : "🔴 어려움 (15쌍)"}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-950 flex flex-col items-center px-4 py-6">
      <Link href="/" className="fixed top-4 left-4 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-white text-sm hover:bg-white/30 transition z-50">
        ← 홈으로
      </Link>

      {/* 상태바 */}
      <div className="flex gap-4 mb-4 flex-wrap justify-center mt-8">
        <div className="bg-white/10 rounded-xl px-4 py-2 text-white text-sm">⏱ {elapsed}초</div>
        <div className="bg-white/10 rounded-xl px-4 py-2 text-white text-sm">🃏 {moves}회</div>
        <div className="bg-white/10 rounded-xl px-4 py-2 text-white text-sm">✅ {matches}/{totalPairs}</div>
        <div className="bg-white/10 rounded-xl px-4 py-2 text-yellow-400 text-sm font-bold">🔥 x{combo}</div>
        <div className="bg-white/10 rounded-xl px-4 py-2 text-cyan-400 text-sm font-bold">⭐ {score}</div>
      </div>

      {/* 카드 그리드 */}
      <div className={`grid ${GRID[difficulty].cols} gap-2 max-w-lg w-full`}>
        {cards.map((card) => {
          const visible = card.flipped || card.matched || showAll;
          return (
            <button
              key={card.id}
              onClick={() => handleFlip(card.id)}
              className={`aspect-square rounded-xl text-3xl sm:text-4xl font-bold transition-all duration-300 ${
                card.matched
                  ? "bg-green-500/30 border-2 border-green-400 scale-90"
                  : visible
                  ? "bg-white/90 scale-105 shadow-lg"
                  : "bg-white/10 border-2 border-white/20 hover:bg-white/20 hover:scale-105 active:scale-95"
              }`}
              disabled={card.matched}
            >
              {visible ? card.emoji : "?"}
            </button>
          );
        })}
      </div>

      {/* 완료 모달 */}
      {done && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50 p-6">
          <div className="bg-gradient-to-b from-purple-800 to-indigo-900 rounded-3xl p-8 text-center max-w-sm w-full border border-white/20">
            <div className="text-7xl mb-4">🎉</div>
            <h2 className="text-3xl font-black text-white mb-6">클리어!</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white/50 text-xs">시간</p>
                <p className="text-2xl font-bold text-white">{elapsed}초</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white/50 text-xs">시도</p>
                <p className="text-2xl font-bold text-white">{moves}회</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white/50 text-xs">최대 콤보</p>
                <p className="text-2xl font-bold text-yellow-400">x{maxCombo}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white/50 text-xs">점수</p>
                <p className="text-2xl font-bold text-cyan-400">{score}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => initGame(difficulty)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold hover:scale-105 transition">
                다시하기
              </button>
              <button onClick={() => setDifficulty(null)} className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition">
                난이도 선택
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
