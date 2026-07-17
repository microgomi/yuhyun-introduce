"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

interface OpponentData {
  name: string;
  emoji: string;
  power: number; // 초당 클릭 환산
  desc: string;
}

const OPPONENTS: OpponentData[] = [
  { name: "꼬마 로봇", emoji: "🤖", power: 3, desc: "초보 상대" },
  { name: "근육맨", emoji: "💪", power: 5, desc: "힘이 좀 세요" },
  { name: "격투가", emoji: "🥊", power: 7, desc: "프로 선수!" },
  { name: "거인", emoji: "🦍", power: 9, desc: "엄청난 파워!" },
  { name: "슈퍼히어로", emoji: "🦸", power: 12, desc: "최강의 상대" },
];

export default function TugOfWarGame() {
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [position, setPosition] = useState(50); // 0=적 승리, 50=중앙, 100=내 승리
  const [opIdx, setOpIdx] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [powerUp, setPowerUp] = useState(false);
  const [powerTimer, setPowerTimer] = useState(0);
  const [shake, setShake] = useState(false);
  const frameRef = useRef(0);
  const clicksRef = useRef(0);
  const lastClickTime = useRef(0);

  const opponent = OPPONENTS[opIdx];

  const startGame = useCallback((idx?: number) => {
    const i = idx ?? opIdx;
    setOpIdx(i);
    setPlaying(true);
    setResult(null);
    setPosition(50);
    setClicks(0);
    setTotalClicks(0);
    setTimeLeft(15);
    setPowerUp(false);
    setPowerTimer(0);
    clicksRef.current = 0;
  }, [opIdx]);

  // 게임 루프 (60fps)
  useEffect(() => {
    if (!playing || result) return;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // 적의 힘 (초당)
      const enemyForce = OPPONENTS[opIdx].power * dt;

      // 내 클릭 힘 (클릭 수 소모)
      const myClicks = clicksRef.current;
      clicksRef.current = 0;
      const myForce = myClicks * (powerUp ? 3 : 1.5);

      setPosition((prev) => {
        const next = prev + (myForce - enemyForce);
        if (next >= 100) {
          setResult("win");
          setStreak((s) => {
            const ns = s + 1;
            setBestStreak((bs) => Math.max(bs, ns));
            return ns;
          });
          return 100;
        }
        if (next <= 0) {
          setResult("lose");
          setStreak(0);
          return 0;
        }
        return Math.max(0, Math.min(100, next));
      });

      // 파워업 타이머
      if (powerUp) {
        setPowerTimer((t) => {
          if (t <= dt) { setPowerUp(false); return 0; }
          return t - dt;
        });
      }

      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [playing, result, opIdx, powerUp]);

  // 타이머
  useEffect(() => {
    if (!playing || result) return;
    if (timeLeft <= 0) {
      setResult(position >= 50 ? "win" : "lose");
      if (position >= 50) setStreak((s) => { const ns = s + 1; setBestStreak((bs) => Math.max(bs, ns)); return ns; });
      else setStreak(0);
      return;
    }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [playing, result, timeLeft, position]);

  const handleClick = useCallback(() => {
    if (!playing || result) return;
    clicksRef.current++;
    setClicks((c) => c + 1);
    setTotalClicks((c) => c + 1);
    setShake(true);
    setTimeout(() => setShake(false), 50);

    // 연타 감지 - 200ms 안에 클릭하면 파워업 게이지 축적
    const now = performance.now();
    if (now - lastClickTime.current < 150) {
      // 빠른 연타 보너스
      clicksRef.current += 0.5;
    }
    lastClickTime.current = now;

    // 10클릭마다 파워업 찬스
    if ((totalClicks + 1) % 20 === 0) {
      setPowerUp(true);
      setPowerTimer(3);
    }
  }, [playing, result, totalClicks]);

  // 스페이스바 지원
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") { e.preventDefault(); handleClick(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleClick]);

  if (!playing && !result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 to-amber-950 flex flex-col items-center justify-center px-6 text-white">
        <Link href="/" className="fixed top-4 left-4 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm hover:bg-white/30 transition z-50">← 홈으로</Link>
        <div className="text-8xl mb-6">🪢</div>
        <h1 className="text-4xl font-black mb-2">줄다리기</h1>
        <p className="text-white/60 mb-8">미친듯이 클릭해서 상대를 끌어라!</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {OPPONENTS.map((op, i) => (
            <button key={i} onClick={() => startGame(i)}
              className={`w-full py-4 rounded-2xl text-lg font-bold text-white transition hover:scale-105 active:scale-95 ${
                i <= streak ? "" : "opacity-50"
              }`}
              style={{ background: `linear-gradient(135deg, hsl(${30 + i * 20}, 70%, ${50 - i * 5}%), hsl(${30 + i * 20}, 70%, ${35 - i * 5}%))` }}
              disabled={i > streak}>
              {op.emoji} {op.name} <span className="text-sm opacity-70">- {op.desc}</span>
              {i > streak && <span className="block text-xs opacity-50">🔒 {i}연승 필요</span>}
            </button>
          ))}
        </div>
        {bestStreak > 0 && <p className="mt-4 text-sm text-white/40">🏆 최고 연승: {bestStreak}</p>}
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-amber-900 to-amber-950 flex flex-col items-center justify-center px-6 text-white select-none ${shake ? "translate-x-0.5" : ""}`}
      onClick={handleClick} style={{ cursor: "pointer" }}>
      <Link href="/" className="fixed top-3 left-3 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs hover:bg-white/30 transition z-50">← 홈</Link>

      <div className="fixed top-4 right-4 flex gap-2 text-xs z-10">
        <span className={`bg-white/10 rounded-lg px-3 py-1 font-bold ${timeLeft <= 5 ? "text-red-400 animate-pulse" : ""}`}>⏱ {timeLeft}초</span>
        <span className="bg-white/10 rounded-lg px-3 py-1">👆 {totalClicks}</span>
      </div>

      {/* 파워업 표시 */}
      {powerUp && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-yellow-500/30 border border-yellow-400 rounded-xl px-4 py-2 text-yellow-300 font-black text-sm animate-pulse z-10">
          ⚡ 파워업! x3 ({Math.ceil(powerTimer)}초)
        </div>
      )}

      {/* 상대 정보 */}
      <div className="text-center mb-4">
        <span className="text-4xl">{opponent.emoji}</span>
        <p className="text-sm font-bold">{opponent.name}</p>
      </div>

      {/* 줄다리기 바 */}
      <div className="w-full max-w-md mb-6">
        <div className="relative h-12 bg-black/30 rounded-full overflow-hidden border-2 border-white/20">
          {/* 중앙 표시 */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 z-10" />

          {/* 위치 표시 */}
          <div className="absolute top-1 bottom-1 transition-all duration-75 rounded-full"
            style={{
              left: `${Math.max(2, position - 5)}%`,
              width: "10%",
              background: position > 55 ? "linear-gradient(90deg, #22c55e, #16a34a)" :
                position < 45 ? "linear-gradient(90deg, #ef4444, #dc2626)" :
                "linear-gradient(90deg, #f59e0b, #d97706)",
            }} />

          {/* 밧줄 이모지 */}
          <div className="absolute top-1/2 -translate-y-1/2 text-2xl transition-all duration-75"
            style={{ left: `${position - 3}%` }}>
            🪢
          </div>
        </div>
        <div className="flex justify-between text-xs mt-1 text-white/40">
          <span>← 상대 승리</span>
          <span>내 승리 →</span>
        </div>
      </div>

      {/* 클릭 영역 */}
      {!result ? (
        <div className="text-center">
          <div className={`text-8xl mb-4 transition-transform ${shake ? "scale-110" : "scale-100"}`}>
            👊
          </div>
          <p className="text-2xl font-black mb-2">미친듯이 클릭!</p>
          <p className="text-white/40 text-sm">화면 아무데나 클릭 or 스페이스바</p>
        </div>
      ) : (
        <div className="text-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-7xl mb-4">{result === "win" ? "🏆" : "😭"}</div>
          <h2 className="text-4xl font-black mb-2">{result === "win" ? "승리!" : "패배..."}</h2>
          <p className="text-white/60 mb-2">총 클릭: {totalClicks}회</p>
          {result === "win" && streak > 1 && <p className="text-yellow-400 font-bold mb-2">🔥 {streak}연승!</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 font-bold hover:scale-105 transition">
              다시하기
            </button>
            <button onClick={(e) => { e.stopPropagation(); setPlaying(false); setResult(null); }}
              className="px-8 py-3 rounded-xl bg-white/10 font-bold hover:bg-white/20 transition">
              상대 선택
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
