"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

const WORDS = [
  "사과","바나나","포도","딸기","수박","귤","복숭아","체리","망고","키위",
  "강아지","고양이","토끼","사자","호랑이","코끼리","기린","펭귄","독수리","돌고래",
  "학교","선생님","친구","교실","운동장","급식","숙제","시험","방학","소풍",
  "컴퓨터","게임","로봇","우주","로켓","과학","발명","실험","전기","자석",
  "축구","야구","농구","수영","달리기","태권도","스키","자전거","줄넘기","배드민턴",
  "피자","햄버거","치킨","떡볶이","라면","김밥","비빔밥","불고기","만두","초밥",
];

interface FallingWord {
  id: number;
  text: string;
  x: number;
  y: number;
  speed: number;
  color: string;
}

const COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899"];

export default function TypingGame() {
  const [phase, setPhase] = useState<"menu"|"play"|"over">("menu");
  const [words, setWords] = useState<FallingWord[]>([]);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(5);
  const [level, setLevel] = useState(1);
  const [destroyed, setDestroyed] = useState(0);
  const [effects, setEffects] = useState<{id:number;x:number;y:number;text:string}[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<number>(0);
  const spawnRef = useRef(0);
  const idRef = useRef(0);
  const wordsRef = useRef<FallingWord[]>([]);
  const livesRef = useRef(5);

  wordsRef.current = words;
  livesRef.current = lives;

  const spawnWord = useCallback(() => {
    const text = WORDS[Math.floor(Math.random() * WORDS.length)];
    const w: FallingWord = {
      id: idRef.current++,
      text,
      x: 10 + Math.random() * 70,
      y: -5,
      speed: 0.3 + level * 0.08 + Math.random() * 0.2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    setWords((prev) => [...prev, w]);
  }, [level]);

  const gameLoop = useCallback(() => {
    setWords((prev) => {
      const alive: FallingWord[] = [];
      let lost = 0;
      for (const w of prev) {
        const ny = w.y + w.speed;
        if (ny > 105) {
          lost++;
        } else {
          alive.push({ ...w, y: ny });
        }
      }
      if (lost > 0) {
        setLives((l) => {
          const nl = l - lost;
          if (nl <= 0) setPhase("over");
          return Math.max(0, nl);
        });
        setCombo(0);
      }
      return alive;
    });

    spawnRef.current++;
    const spawnRate = Math.max(40, 80 - level * 5);
    if (spawnRef.current >= spawnRate) {
      spawnRef.current = 0;
      spawnWord();
    }

    if (livesRef.current > 0) {
      frameRef.current = requestAnimationFrame(gameLoop);
    }
  }, [level, spawnWord]);

  const startGame = useCallback(() => {
    setPhase("play");
    setWords([]);
    setInput("");
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLives(5);
    setLevel(1);
    setDestroyed(0);
    setEffects([]);
    idRef.current = 0;
    spawnRef.current = 0;
    livesRef.current = 5;
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (phase === "play") {
      frameRef.current = requestAnimationFrame(gameLoop);
      return () => cancelAnimationFrame(frameRef.current);
    }
  }, [phase, gameLoop]);

  useEffect(() => {
    setLevel(Math.min(20, 1 + Math.floor(destroyed / 5)));
  }, [destroyed]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    const idx = words.findIndex((w) => w.text === trimmed);
    if (idx !== -1) {
      const w = words[idx];
      setEffects((prev) => [...prev, { id: Date.now(), x: w.x, y: w.y, text: `+${10 * (combo + 1)}` }]);
      setTimeout(() => setEffects((prev) => prev.filter((e) => e.id !== Date.now())), 800);
      setWords((prev) => prev.filter((_, i) => i !== idx));
      setCombo((c) => {
        const nc = c + 1;
        setMaxCombo((mc) => Math.max(mc, nc));
        setScore((s) => s + 10 * nc);
        return nc;
      });
      setDestroyed((d) => d + 1);
    }
    setInput("");
  }, [input, words, combo]);

  if (phase === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center px-6">
        <Link href="/" className="fixed top-4 left-4 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-white text-sm hover:bg-white/30 transition z-50">
          ← 홈으로
        </Link>
        <div className="text-8xl mb-6">⌨️</div>
        <h1 className="text-4xl font-black text-white mb-2">타자 디펜스</h1>
        <p className="text-white/60 mb-4">떨어지는 단어를 타이핑해서 파괴하세요!</p>
        <p className="text-white/40 text-sm mb-8">단어가 바닥에 닿으면 하트가 줄어요</p>
        <button
          onClick={startGame}
          className="px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xl font-bold hover:scale-105 active:scale-95 transition"
        >
          게임 시작!
        </button>
      </div>
    );
  }

  if (phase === "over") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center px-6">
        <Link href="/" className="fixed top-4 left-4 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-white text-sm hover:bg-white/30 transition z-50">
          ← 홈으로
        </Link>
        <div className="text-8xl mb-4">💥</div>
        <h2 className="text-4xl font-black text-white mb-6">게임 오버!</h2>
        <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-md">
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-white/50 text-xs">점수</p>
            <p className="text-3xl font-bold text-cyan-400">{score}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-white/50 text-xs">파괴</p>
            <p className="text-3xl font-bold text-green-400">{destroyed}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-white/50 text-xs">최대콤보</p>
            <p className="text-3xl font-bold text-yellow-400">x{maxCombo}</p>
          </div>
        </div>
        <button
          onClick={startGame}
          className="px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xl font-bold hover:scale-105 active:scale-95 transition"
        >
          다시하기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col relative overflow-hidden">
      <Link href="/" className="fixed top-4 left-4 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-white text-sm hover:bg-white/30 transition z-50">
        ← 홈으로
      </Link>

      {/* HUD */}
      <div className="flex justify-center gap-3 pt-4 px-4 flex-wrap z-10">
        <div className="bg-white/10 rounded-lg px-3 py-1 text-white text-sm">⭐ {score}</div>
        <div className="bg-white/10 rounded-lg px-3 py-1 text-red-400 text-sm">{"❤️".repeat(lives)}{"🖤".repeat(5 - lives)}</div>
        <div className="bg-white/10 rounded-lg px-3 py-1 text-yellow-400 text-sm">🔥 x{combo}</div>
        <div className="bg-white/10 rounded-lg px-3 py-1 text-cyan-400 text-sm">Lv.{level}</div>
      </div>

      {/* 게임 영역 */}
      <div className="flex-1 relative">
        {words.map((w) => (
          <div
            key={w.id}
            className="absolute font-bold text-lg sm:text-xl transition-none whitespace-nowrap"
            style={{
              left: `${w.x}%`,
              top: `${w.y}%`,
              color: w.color,
              textShadow: `0 0 10px ${w.color}40`,
            }}
          >
            {w.text}
          </div>
        ))}
        {effects.map((e) => (
          <div
            key={e.id}
            className="absolute text-yellow-400 font-black text-xl animate-bounce pointer-events-none"
            style={{ left: `${e.x}%`, top: `${e.y}%` }}
          >
            {e.text}
          </div>
        ))}
        {/* 바닥 라인 */}
        <div className="absolute bottom-16 left-0 right-0 h-0.5 bg-red-500/30" />
      </div>

      {/* 입력 */}
      <form onSubmit={handleSubmit} className="p-4 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-lg outline-none focus:border-cyan-400 transition"
          placeholder="단어를 입력하세요..."
          autoComplete="off"
          autoFocus
        />
        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:scale-105 transition"
        >
          입력
        </button>
      </form>
    </div>
  );
}