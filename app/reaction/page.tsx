"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";

type Phase = "wait" | "ready" | "go" | "result" | "tooEarly";

export default function ReactionGame() {
  const [phase, setPhase] = useState<Phase>("wait");
  const [reactionTime, setReactionTime] = useState(0);
  const [bestTime, setBestTime] = useState(9999);
  const [history, setHistory] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(0);

  const startRound = useCallback(() => {
    setPhase("ready");
    const delay = 1500 + Math.random() * 4000;
    timerRef.current = setTimeout(() => {
      startRef.current = performance.now();
      setPhase("go");
    }, delay);
  }, []);

  const handleClick = useCallback(() => {
    if (phase === "wait") {
      setRound((r) => r + 1);
      startRound();
    } else if (phase === "ready") {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase("tooEarly");
    } else if (phase === "go") {
      const elapsed = Math.round(performance.now() - startRef.current);
      setReactionTime(elapsed);
      setHistory((h) => [...h, elapsed]);
      if (elapsed < bestTime) setBestTime(elapsed);
      setPhase("result");
    } else if (phase === "result" || phase === "tooEarly") {
      setRound((r) => r + 1);
      startRound();
    }
  }, [phase, bestTime, startRound]);

  const getGrade = (ms: number) => {
    if (ms < 200) return { text: "초인급!!", color: "#f43f5e", emoji: "⚡" };
    if (ms < 250) return { text: "번개 반사신경!", color: "#f97316", emoji: "🔥" };
    if (ms < 300) return { text: "꽤 빠르다!", color: "#eab308", emoji: "👍" };
    if (ms < 400) return { text: "평균이야!", color: "#22c55e", emoji: "😊" };
    if (ms < 500) return { text: "조금 느려~", color: "#3b82f6", emoji: "🐢" };
    return { text: "졸고 있었니?", color: "#8b5cf6", emoji: "😴" };
  };

  const avg = history.length > 0 ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : 0;

  const bgColor =
    phase === "wait" ? "from-blue-900 to-blue-950" :
    phase === "ready" ? "from-red-700 to-red-900" :
    phase === "go" ? "from-green-500 to-green-700" :
    phase === "tooEarly" ? "from-orange-600 to-orange-800" :
    "from-indigo-900 to-indigo-950";

  return (
    <div className={`min-h-screen bg-gradient-to-b ${bgColor} flex flex-col items-center justify-center transition-all duration-300`}>
      <Link href="/" className="fixed top-4 left-4 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-white text-sm hover:bg-white/30 transition z-50">
        ← 홈으로
      </Link>

      <div className="text-center select-none cursor-pointer w-full max-w-lg px-6" onClick={handleClick}>
        {phase === "wait" && (
          <div className="animate-pulse">
            <div className="text-8xl mb-6">🎯</div>
            <h1 className="text-4xl font-black text-white mb-4">반응속도 테스트</h1>
            <p className="text-xl text-white/70 mb-8">화면을 클릭하면 시작!</p>
            <div className="bg-white/10 rounded-2xl p-6 backdrop-blur">
              <p className="text-white/60 text-sm">초록색이 되면 최대한 빨리 클릭하세요</p>
            </div>
          </div>
        )}

        {phase === "ready" && (
          <div>
            <div className="text-8xl mb-6 animate-pulse">🔴</div>
            <h2 className="text-5xl font-black text-white mb-4">기다려...</h2>
            <p className="text-2xl text-white/70">초록색이 될 때까지 기다려!</p>
          </div>
        )}

        {phase === "go" && (
          <div>
            <div className="text-8xl mb-6 animate-bounce">🟢</div>
            <h2 className="text-6xl font-black text-white mb-4">지금 클릭!!</h2>
            <p className="text-2xl text-white/90">빨리빨리!!</p>
          </div>
        )}

        {phase === "tooEarly" && (
          <div>
            <div className="text-8xl mb-6">😫</div>
            <h2 className="text-4xl font-black text-white mb-4">너무 빨랐어!</h2>
            <p className="text-xl text-white/70 mb-6">초록색이 될 때까지 기다려야 해!</p>
            <p className="text-lg text-white/50">클릭하면 다시 시도</p>
          </div>
        )}

        {phase === "result" && (
          <div>
            <div className="text-8xl mb-4">{getGrade(reactionTime).emoji}</div>
            <h2 className="text-3xl font-bold text-white/80 mb-2">라운드 {round}</h2>
            <div className="text-8xl font-black text-white mb-2">{reactionTime}ms</div>
            <p className="text-3xl font-bold mb-8" style={{ color: getGrade(reactionTime).color }}>
              {getGrade(reactionTime).text}
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
                <p className="text-white/50 text-xs mb-1">최고 기록</p>
                <p className="text-2xl font-bold text-yellow-400">{bestTime === 9999 ? "--" : bestTime + "ms"}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
                <p className="text-white/50 text-xs mb-1">평균</p>
                <p className="text-2xl font-bold text-cyan-400">{avg}ms</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
                <p className="text-white/50 text-xs mb-1">시도</p>
                <p className="text-2xl font-bold text-white">{history.length}회</p>
              </div>
            </div>

            {history.length > 1 && (
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur mb-6">
                <div className="flex items-end justify-center gap-1 h-20">
                  {history.slice(-10).map((t, i) => (
                    <div
                      key={i}
                      className="bg-gradient-to-t from-cyan-400 to-cyan-300 rounded-t w-6 transition-all"
                      style={{ height: `${Math.min(100, (t / 600) * 100)}%` }}
                      title={`${t}ms`}
                    />
                  ))}
                </div>
                <p className="text-white/40 text-xs mt-2">최근 기록</p>
              </div>
            )}

            <p className="text-lg text-white/50">클릭하면 다음 라운드</p>
          </div>
        )}
      </div>
    </div>
  );
}