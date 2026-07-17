"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

type Cell = { top: boolean; right: boolean; bottom: boolean; left: boolean; visited: boolean };
type Pos = { r: number; c: number };

function generateMaze(rows: number, cols: number): Cell[][] {
  const grid: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ top: true, right: true, bottom: true, left: true, visited: false }))
  );
  const stack: Pos[] = [];
  const start: Pos = { r: 0, c: 0 };
  grid[0][0].visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const curr = stack[stack.length - 1];
    const neighbors: { pos: Pos; dir: string }[] = [];
    const dirs = [
      { dr: -1, dc: 0, dir: "top" },
      { dr: 1, dc: 0, dir: "bottom" },
      { dr: 0, dc: -1, dir: "left" },
      { dr: 0, dc: 1, dir: "right" },
    ];
    for (const { dr, dc, dir } of dirs) {
      const nr = curr.r + dr;
      const nc = curr.c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited) {
        neighbors.push({ pos: { r: nr, c: nc }, dir });
      }
    }
    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const { pos, dir } = neighbors[Math.floor(Math.random() * neighbors.length)];
      if (dir === "top") { grid[curr.r][curr.c].top = false; grid[pos.r][pos.c].bottom = false; }
      if (dir === "bottom") { grid[curr.r][curr.c].bottom = false; grid[pos.r][pos.c].top = false; }
      if (dir === "left") { grid[curr.r][curr.c].left = false; grid[pos.r][pos.c].right = false; }
      if (dir === "right") { grid[curr.r][curr.c].right = false; grid[pos.r][pos.c].left = false; }
      grid[pos.r][pos.c].visited = true;
      stack.push(pos);
    }
  }
  return grid;
}

type Difficulty = "easy" | "medium" | "hard";
const SIZES: Record<Difficulty, { rows: number; cols: number }> = {
  easy: { rows: 8, cols: 8 },
  medium: { rows: 12, cols: 12 },
  hard: { rows: 16, cols: 16 },
};

export default function MazeGame() {
  const [diff, setDiff] = useState<Difficulty | null>(null);
  const [maze, setMaze] = useState<Cell[][]>([]);
  const [player, setPlayer] = useState<Pos>({ r: 0, c: 0 });
  const [goal, setGoal] = useState<Pos>({ r: 0, c: 0 });
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [won, setWon] = useState(false);
  const [coins, setCoins] = useState<Pos[]>([]);
  const [collected, setCollected] = useState(0);
  const [trail, setTrail] = useState<string[]>([]);
  const [bestTimes, setBestTimes] = useState<Record<Difficulty, number>>({ easy: 0, medium: 0, hard: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const startGame = useCallback((d: Difficulty) => {
    const { rows, cols } = SIZES[d];
    const m = generateMaze(rows, cols);
    setMaze(m);
    setDiff(d);
    setPlayer({ r: 0, c: 0 });
    setGoal({ r: rows - 1, c: cols - 1 });
    setMoves(0);
    setElapsed(0);
    setStartTime(Date.now());
    setWon(false);
    setCollected(0);
    setTrail(["0-0"]);
    // 코인 배치
    const coinList: Pos[] = [];
    const count = d === "easy" ? 3 : d === "medium" ? 5 : 8;
    while (coinList.length < count) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if ((r === 0 && c === 0) || (r === rows - 1 && c === cols - 1)) continue;
      if (coinList.some((p) => p.r === r && p.c === c)) continue;
      coinList.push({ r, c });
    }
    setCoins(coinList);
  }, []);

  useEffect(() => {
    if (!diff || won) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 200);
    return () => clearInterval(iv);
  }, [diff, startTime, won]);

  const move = useCallback((dr: number, dc: number) => {
    if (won || !diff) return;
    setPlayer((prev) => {
      const cell = maze[prev.r][prev.c];
      if (dr === -1 && cell.top) return prev;
      if (dr === 1 && cell.bottom) return prev;
      if (dc === -1 && cell.left) return prev;
      if (dc === 1 && cell.right) return prev;
      const nr = prev.r + dr;
      const nc = prev.c + dc;
      if (nr < 0 || nr >= maze.length || nc < 0 || nc >= maze[0].length) return prev;
      setMoves((m) => m + 1);
      setTrail((t) => [...t, `${nr}-${nc}`]);
      // 코인 수집
      setCoins((cs) => {
        const idx = cs.findIndex((c) => c.r === nr && c.c === nc);
        if (idx !== -1) {
          setCollected((col) => col + 1);
          return cs.filter((_, i) => i !== idx);
        }
        return cs;
      });
      // 골인 체크
      if (nr === goal.r && nc === goal.c) {
        setWon(true);
        const t = Math.floor((Date.now() - startTime) / 1000);
        setElapsed(t);
        setBestTimes((bt) => {
          if (bt[diff] === 0 || t < bt[diff]) return { ...bt, [diff]: t };
          return bt;
        });
      }
      return { r: nr, c: nc };
    });
  }, [won, diff, maze, goal, startTime]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w") move(-1, 0);
      if (e.key === "ArrowDown" || e.key === "s") move(1, 0);
      if (e.key === "ArrowLeft" || e.key === "a") move(0, -1);
      if (e.key === "ArrowRight" || e.key === "d") move(0, 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [move]);

  // 터치 스와이프
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20) move(0, 1);
      else if (dx < -20) move(0, -1);
    } else {
      if (dy > 20) move(1, 0);
      else if (dy < -20) move(-1, 0);
    }
    touchStart.current = null;
  };

  if (!diff) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-950 flex flex-col items-center justify-center px-6 text-white">
        <Link href="/" className="fixed top-4 left-4 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm hover:bg-white/30 transition z-50">← 홈으로</Link>
        <div className="text-8xl mb-6">🏰</div>
        <h1 className="text-4xl font-black mb-2">미로 탈출</h1>
        <p className="text-white/60 mb-10">미로를 탈출하고 코인을 모아라!</p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <button key={d} onClick={() => startGame(d)}
              className="w-full py-4 rounded-2xl text-xl font-bold text-white transition hover:scale-105 active:scale-95"
              style={{ background: d === "easy" ? "linear-gradient(135deg,#22c55e,#16a34a)" : d === "medium" ? "linear-gradient(135deg,#f59e0b,#d97706)" : "linear-gradient(135deg,#ef4444,#dc2626)" }}>
              {d === "easy" ? "🟢 쉬움 (8×8)" : d === "medium" ? "🟡 보통 (12×12)" : "🔴 어려움 (16×16)"}
              {bestTimes[d] > 0 && <span className="block text-sm opacity-70">최고: {bestTimes[d]}초</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const { rows, cols } = SIZES[diff];
  const cellSize = Math.min(Math.floor((Math.min(380, typeof window !== "undefined" ? window.innerWidth - 40 : 380)) / cols), 40);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-950 flex flex-col items-center px-4 py-4 text-white"
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Link href="/" className="fixed top-3 left-3 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs hover:bg-white/30 transition z-50">← 홈</Link>

      <div className="flex gap-3 mt-8 mb-3 flex-wrap justify-center text-xs">
        <span className="bg-white/10 rounded-lg px-3 py-1">⏱ {elapsed}초</span>
        <span className="bg-white/10 rounded-lg px-3 py-1">👟 {moves}걸음</span>
        <span className="bg-yellow-500/20 text-yellow-400 rounded-lg px-3 py-1 font-bold">💰 {collected}</span>
      </div>

      <div ref={containerRef} className="bg-black/30 rounded-xl p-2 border border-white/10" style={{ touchAction: "none" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${cellSize}px)` }}>
          {maze.map((row, r) => row.map((cell, c) => {
            const isPlayer = player.r === r && player.c === c;
            const isGoal = goal.r === r && goal.c === c;
            const isCoin = coins.some((p) => p.r === r && p.c === c);
            const isTrail = trail.includes(`${r}-${c}`);
            return (
              <div key={`${r}-${c}`} style={{
                width: cellSize, height: cellSize,
                borderTop: cell.top ? "2px solid #34d399" : "2px solid transparent",
                borderRight: cell.right ? "2px solid #34d399" : "2px solid transparent",
                borderBottom: cell.bottom ? "2px solid #34d399" : "2px solid transparent",
                borderLeft: cell.left ? "2px solid #34d399" : "2px solid transparent",
                background: isPlayer ? "#22c55e" : isGoal ? "rgba(239,68,68,0.5)" : isTrail ? "rgba(34,197,94,0.1)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: cellSize * 0.55, transition: "background 0.15s",
              }}>
                {isPlayer ? "😎" : isGoal ? "🏁" : isCoin ? "💰" : ""}
              </div>
            );
          }))}
        </div>
      </div>

      {/* 모바일 방향 버튼 */}
      <div className="mt-4 grid grid-cols-3 gap-1 w-36">
        <div />
        <button onClick={() => move(-1, 0)} className="bg-white/10 rounded-lg py-3 text-xl active:bg-white/20">↑</button>
        <div />
        <button onClick={() => move(0, -1)} className="bg-white/10 rounded-lg py-3 text-xl active:bg-white/20">←</button>
        <button onClick={() => move(1, 0)} className="bg-white/10 rounded-lg py-3 text-xl active:bg-white/20">↓</button>
        <button onClick={() => move(0, 1)} className="bg-white/10 rounded-lg py-3 text-xl active:bg-white/20">→</button>
      </div>

      <p className="mt-2 text-[10px] text-white/30">키보드 방향키/WASD 또는 스와이프로 이동</p>

      {won && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50 p-6">
          <div className="bg-gradient-to-b from-emerald-800 to-emerald-900 rounded-3xl p-8 text-center max-w-sm w-full border border-white/20">
            <div className="text-7xl mb-4">🎉</div>
            <h2 className="text-3xl font-black mb-6">탈출 성공!</h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white/10 rounded-xl p-3"><p className="text-white/50 text-xs">시간</p><p className="text-2xl font-bold">{elapsed}초</p></div>
              <div className="bg-white/10 rounded-xl p-3"><p className="text-white/50 text-xs">걸음</p><p className="text-2xl font-bold">{moves}</p></div>
              <div className="bg-white/10 rounded-xl p-3"><p className="text-white/50 text-xs">코인</p><p className="text-2xl font-bold text-yellow-400">{collected}</p></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => startGame(diff)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 font-bold hover:scale-105 transition">다시하기</button>
              <button onClick={() => setDiff(null)} className="flex-1 py-3 rounded-xl bg-white/10 font-bold hover:bg-white/20 transition">난이도 선택</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
