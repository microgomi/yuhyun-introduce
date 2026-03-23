"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "playing" | "result";
type Difficulty = "easy" | "normal" | "hard" | "insane";

interface Target {
  id: number;
  x: number;
  y: number;
  isFingerGap: boolean; // true = safe gap, false = finger (danger)
}

interface Round {
  targets: number[]; // sequence of target indices to hit
  speed: number; // ms per target
}

// --- Constants ---
const DIFFICULTY_SETTINGS: Record<Difficulty, { label: string; baseSpeed: number; rounds: number; fingerWidth: number }> = {
  easy: { label: "쉬움", baseSpeed: 800, rounds: 3, fingerWidth: 48 },
  normal: { label: "보통", baseSpeed: 600, rounds: 5, fingerWidth: 40 },
  hard: { label: "어려움", baseSpeed: 420, rounds: 7, fingerWidth: 34 },
  insane: { label: "미친속도", baseSpeed: 280, rounds: 10, fingerWidth: 28 },
};

// Hand layout: 5 fingers with gaps between them
// Positions from left to right: gap, finger, gap, finger, gap, finger, gap, finger, gap, finger, gap
const HAND_SLOTS = 11; // 6 gaps + 5 fingers alternating: gap(0), finger(1), gap(2), finger(3), ...

export default function KnifeGamePage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [currentRound, setCurrentRound] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [sequence, setSequence] = useState<number[]>([]);
  const [seqIndex, setSeqIndex] = useState(0);
  const [highlightSlot, setHighlightSlot] = useState<number | null>(null);
  const [knifePos, setKnifePos] = useState<number | null>(null);
  const [hitResult, setHitResult] = useState<"perfect" | "good" | "miss" | "ouch" | null>(null);
  const [totalHits, setTotalHits] = useState(0);
  const [totalMisses, setTotalMisses] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [speed, setSpeed] = useState(600);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showBlood, setShowBlood] = useState(false);
  const [shakeHand, setShakeHand] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [roundLabel, setRoundLabel] = useState("");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqIndexRef = useRef(0);
  const sequenceRef = useRef<number[]>([]);
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const speedRef = useRef(600);
  const playingRef = useRef(false);

  useEffect(() => { sequenceRef.current = sequence; }, [sequence]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { comboRef.current = combo; }, [combo]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  // Generate a round sequence
  const generateSequence = useCallback((round: number, diff: Difficulty): number[] => {
    const settings = DIFFICULTY_SETTINGS[diff];
    // Sequence goes back and forth across the hand gaps
    const gaps = [0, 2, 4, 6, 8, 10]; // gap positions
    const len = 8 + round * 4; // more stabs per round
    const seq: number[] = [];

    // Pattern: sweep left to right, then right to left, with some randomness
    let direction = 1;
    let pos = 0;
    for (let i = 0; i < len; i++) {
      seq.push(gaps[pos]);
      // Sometimes skip or reverse
      if (round > 3 && Math.random() < 0.15) {
        direction *= -1;
      }
      pos += direction;
      if (pos >= gaps.length) { pos = gaps.length - 2; direction = -1; }
      if (pos < 0) { pos = 1; direction = 1; }
    }
    return seq;
  }, []);

  // Start game
  const startGame = useCallback(() => {
    const settings = DIFFICULTY_SETTINGS[difficulty];
    setCurrentRound(1);
    setScore(0);
    scoreRef.current = 0;
    setCombo(0);
    comboRef.current = 0;
    setMaxCombo(0);
    setLives(3);
    livesRef.current = 3;
    setTotalHits(0);
    setTotalMisses(0);
    setHitResult(null);
    setShowBlood(false);
    setSpeed(settings.baseSpeed);
    speedRef.current = settings.baseSpeed;
    playingRef.current = true;

    // Generate first round
    const seq = generateSequence(1, difficulty);
    setSequence(seq);
    sequenceRef.current = seq;
    setSeqIndex(0);
    seqIndexRef.current = 0;

    setScreen("playing");
    setCountdown(3);
  }, [difficulty, generateSequence]);

  // Countdown
  useEffect(() => {
    if (screen !== "playing" || countdown <= 0) return;
    const timer = setTimeout(() => {
      if (countdown === 1) {
        setCountdown(0);
        setRoundLabel(`라운드 ${currentRound}`);
        setTimeout(() => setRoundLabel(""), 1000);
        startAutoPlay();
      } else {
        setCountdown(countdown - 1);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [screen, countdown, currentRound]);

  // Auto-play: highlight targets in sequence
  const startAutoPlay = useCallback(() => {
    setIsAutoPlaying(true);
    playSequenceStep(0);
  }, []);

  const playSequenceStep = useCallback((idx: number) => {
    if (!playingRef.current) return;
    const seq = sequenceRef.current;
    if (idx >= seq.length) {
      // Round complete
      setIsAutoPlaying(false);
      setHighlightSlot(null);
      nextRound();
      return;
    }

    seqIndexRef.current = idx;
    setSeqIndex(idx);
    setHighlightSlot(seq[idx]);
    setHitResult(null);

    timerRef.current = setTimeout(() => {
      if (!playingRef.current) return;
      // Player didn't click in time = miss
      handleMiss(idx);
    }, speedRef.current);
  }, []);

  // Handle player clicking a slot
  const handleSlotClick = useCallback((slotIndex: number) => {
    if (!isAutoPlaying || !playingRef.current) return;
    clearTimer();

    const expectedSlot = sequenceRef.current[seqIndexRef.current];
    const isGap = slotIndex % 2 === 0; // even = gap, odd = finger

    setKnifePos(slotIndex);

    if (slotIndex === expectedSlot && isGap) {
      // Perfect hit on the right gap!
      const newCombo = comboRef.current + 1;
      setCombo(newCombo);
      comboRef.current = newCombo;
      if (newCombo > maxCombo) setMaxCombo(newCombo);

      const points = 10 + Math.floor(newCombo * 2);
      setScore((s) => s + points);
      scoreRef.current += points;
      setTotalHits((h) => h + 1);
      setHitResult("perfect");

      setTimeout(() => {
        setKnifePos(null);
        playSequenceStep(seqIndexRef.current + 1);
      }, 150);
    } else if (isGap && slotIndex !== expectedSlot) {
      // Hit a gap but wrong one
      setCombo(0);
      comboRef.current = 0;
      setScore((s) => s + 3);
      scoreRef.current += 3;
      setTotalHits((h) => h + 1);
      setHitResult("good");

      setTimeout(() => {
        setKnifePos(null);
        playSequenceStep(seqIndexRef.current + 1);
      }, 150);
    } else {
      // Hit a finger! OUCH!
      hitFinger(slotIndex);
    }
  }, [isAutoPlaying, clearTimer, maxCombo]);

  const hitFinger = useCallback((slotIndex: number) => {
    setHitResult("ouch");
    setShowBlood(true);
    setShakeHand(true);
    setCombo(0);
    comboRef.current = 0;
    setTotalMisses((m) => m + 1);

    const newLives = livesRef.current - 1;
    setLives(newLives);
    livesRef.current = newLives;

    setTimeout(() => {
      setShowBlood(false);
      setShakeHand(false);
      setKnifePos(null);

      if (newLives <= 0) {
        // Game over
        playingRef.current = false;
        setIsAutoPlaying(false);
        if (scoreRef.current > bestScore) setBestScore(scoreRef.current);
        setScreen("result");
      } else {
        playSequenceStep(seqIndexRef.current + 1);
      }
    }, 600);
  }, [bestScore]);

  const handleMiss = useCallback((idx: number) => {
    if (!playingRef.current) return;
    setHitResult("miss");
    setCombo(0);
    comboRef.current = 0;
    setTotalMisses((m) => m + 1);

    setTimeout(() => {
      playSequenceStep(idx + 1);
    }, 200);
  }, []);

  const nextRound = useCallback(() => {
    const settings = DIFFICULTY_SETTINGS[difficulty];
    const nextR = currentRound + 1;

    if (nextR > settings.rounds) {
      // Victory!
      playingRef.current = false;
      if (scoreRef.current > bestScore) setBestScore(scoreRef.current);
      setScreen("result");
      return;
    }

    setCurrentRound(nextR);
    // Speed up
    const newSpeed = Math.max(150, speedRef.current - 40);
    setSpeed(newSpeed);
    speedRef.current = newSpeed;

    const seq = generateSequence(nextR, difficulty);
    setSequence(seq);
    sequenceRef.current = seq;
    setSeqIndex(0);
    seqIndexRef.current = 0;

    setRoundLabel(`라운드 ${nextR}`);
    setTimeout(() => {
      setRoundLabel("");
      startAutoPlay();
    }, 1200);
  }, [difficulty, currentRound, bestScore, generateSequence]);

  const totalRounds = DIFFICULTY_SETTINGS[difficulty].rounds;
  const won = screen === "result" && lives > 0;

  // Render hand slots
  const renderHand = () => {
    const settings = DIFFICULTY_SETTINGS[difficulty];
    const slots: React.ReactNode[] = [];

    for (let i = 0; i < HAND_SLOTS; i++) {
      const isGap = i % 2 === 0;
      const isHighlighted = highlightSlot === i;
      const isKnifeHere = knifePos === i;
      const fingerIndex = Math.floor(i / 2); // which finger (0-4)
      const fingerEmojis = ["🖐", "👆", "🖕", "💍", "🤙"]; // just for variety

      slots.push(
        <button
          key={i}
          onClick={() => handleSlotClick(i)}
          disabled={!isAutoPlaying}
          className={`relative flex flex-col items-center justify-end transition-all duration-100 ${
            isGap ? "w-8 sm:w-10" : "w-10 sm:w-12"
          }`}
          style={{ height: isGap ? 120 : 140 }}
        >
          {/* Finger or gap visual */}
          {isGap ? (
            <div
              className={`flex h-full w-full flex-col items-center justify-center rounded-lg border-2 transition-all ${
                isHighlighted
                  ? "border-yellow-400 bg-yellow-500/20 shadow-lg shadow-yellow-500/30"
                  : isKnifeHere && hitResult === "perfect"
                  ? "border-green-400 bg-green-500/30"
                  : isKnifeHere && hitResult === "good"
                  ? "border-blue-400 bg-blue-500/30"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {isHighlighted && !isKnifeHere && (
                <span className="animate-pulse text-lg">⬇️</span>
              )}
              {isKnifeHere && (
                <span className="text-2xl">🔪</span>
              )}
            </div>
          ) : (
            <div
              className={`flex h-full w-full flex-col items-center justify-end rounded-xl transition-all ${
                isKnifeHere
                  ? "bg-red-500/40 border-2 border-red-500"
                  : "bg-gradient-to-t from-amber-800 to-amber-600 border-2 border-amber-700"
              } ${shakeHand && isKnifeHere ? "animate-shake" : ""}`}
            >
              <div className="mb-2 text-2xl">
                {isKnifeHere && hitResult === "ouch" ? "🩸" : "🟫"}
              </div>
              {isKnifeHere && (
                <span className="absolute top-1 text-2xl">🔪</span>
              )}
            </div>
          )}
        </button>
      );
    }

    return slots;
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 text-white">
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out 2; }
        @keyframes bloodDrip {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(30px); }
        }
        .blood-drip { animation: bloodDrip 0.8s ease-in forwards; }
        @keyframes roundPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .round-pop { animation: roundPop 0.5s ease-out; }
        @keyframes knifeStab {
          0% { transform: translateY(-20px); }
          50% { transform: translateY(5px); }
          100% { transform: translateY(0); }
        }
        .knife-stab { animation: knifeStab 0.15s ease-in; }
      `}</style>

      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">
            ← 홈
          </Link>
          <div className="text-7xl">🔪</div>
          <h1 className="text-5xl font-black">
            <span className="bg-gradient-to-r from-slate-300 to-red-400 bg-clip-text text-transparent">칼 게임</span>
          </h1>
          <p className="text-lg text-slate-400">손가락 사이를 찔러라!</p>

          <div className="mt-4 w-full max-w-xs space-y-3">
            <p className="text-sm font-bold text-slate-500">난이도 선택</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(DIFFICULTY_SETTINGS) as [Difficulty, typeof DIFFICULTY_SETTINGS.easy][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setDifficulty(key as Difficulty)}
                  className={`rounded-xl border-2 px-3 py-3 text-sm font-bold transition-all ${
                    difficulty === key
                      ? "border-red-400 bg-red-500/20 text-red-300"
                      : "border-white/10 bg-white/5 text-slate-400 hover:border-white/30"
                  }`}
                >
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startGame}
            className="mt-4 rounded-xl bg-gradient-to-r from-slate-600 to-red-600 px-12 py-4 text-xl font-black shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            🔪 시작!
          </button>

          {bestScore > 0 && (
            <div className="mt-4 rounded-xl bg-white/5 px-6 py-3 backdrop-blur">
              <p className="text-sm text-slate-400">🏆 최고 점수: <span className="font-bold text-amber-400">{bestScore}</span></p>
            </div>
          )}

          <div className="mt-4 w-full max-w-sm rounded-xl bg-white/5 p-4 text-left text-sm text-slate-400 space-y-2">
            <p className="font-bold text-red-400">📖 규칙</p>
            <p>1. 손가락 사이의 <span className="text-yellow-400 font-bold">빈 칸</span>이 빛나면 클릭!</p>
            <p>2. 빛나는 칸을 정확히 누르면 <span className="text-green-400">Perfect!</span></p>
            <p>3. 다른 빈 칸을 누르면 <span className="text-blue-400">Good</span> (적은 점수)</p>
            <p>4. <span className="text-red-400 font-bold">손가락을 찌르면 생명 -1!</span></p>
            <p>5. 생명 3개가 다 없어지면 게임 오버!</p>
          </div>
        </div>
      )}

      {/* Playing */}
      {screen === "playing" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          {/* HUD */}
          <div className="flex w-full max-w-sm items-center justify-between text-sm">
            <span className="rounded-lg bg-white/10 px-3 py-1">🔪 라운드 {currentRound}/{totalRounds}</span>
            <span className="rounded-lg bg-white/10 px-3 py-1">⭐ {score}</span>
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`text-lg ${i < lives ? "" : "grayscale opacity-30"}`}>
                  ❤️
                </span>
              ))}
            </div>
          </div>

          {/* Combo */}
          {combo > 2 && (
            <div className="text-lg font-black text-orange-400 animate-pulse">
              🔥 {combo} COMBO!
            </div>
          )}

          {/* Round label */}
          {roundLabel && (
            <div className="round-pop text-3xl font-black text-amber-400">{roundLabel}</div>
          )}

          {/* Countdown */}
          {countdown > 0 && (
            <div className="round-pop text-7xl font-black text-red-400">{countdown}</div>
          )}

          {/* Hit result */}
          {hitResult && countdown === 0 && (
            <div className={`text-xl font-black ${
              hitResult === "perfect" ? "text-green-400" :
              hitResult === "good" ? "text-blue-400" :
              hitResult === "miss" ? "text-gray-400" :
              "text-red-500"
            }`}>
              {hitResult === "perfect" ? "✨ Perfect!" :
               hitResult === "good" ? "👍 Good!" :
               hitResult === "miss" ? "😴 Miss..." :
               "🩸 아야!"}
            </div>
          )}

          {/* Hand area */}
          {countdown === 0 && (
            <div className={`relative mt-4 ${shakeHand ? "animate-shake" : ""}`}>
              {/* Blood effect */}
              {showBlood && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <span className="blood-drip text-4xl">🩸</span>
                </div>
              )}

              {/* Hand base */}
              <div className="relative">
                {/* Palm */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-16 w-full rounded-b-3xl bg-gradient-to-t from-amber-900 to-amber-700 border-2 border-amber-600" />

                {/* Fingers and gaps */}
                <div className="relative flex items-end justify-center gap-0 pb-14">
                  {renderHand()}
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          {countdown === 0 && (
            <div className="mt-4 w-full max-w-sm">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-200"
                  style={{ width: `${(seqIndex / Math.max(1, sequence.length)) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-center text-xs text-slate-500">
                {seqIndex}/{sequence.length} 찌르기
              </p>
            </div>
          )}

          {/* Speed indicator */}
          {countdown === 0 && (
            <div className="text-xs text-slate-500">
              속도: {speed}ms | {sequence.length - seqIndex}개 남음
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {screen === "result" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          {won ? (
            <>
              <div className="text-7xl">🏆</div>
              <h2 className="text-4xl font-black text-amber-400">클리어!</h2>
              <p className="text-lg text-green-300">모든 라운드를 통과했어요!</p>
            </>
          ) : (
            <>
              <div className="text-7xl">🩸</div>
              <h2 className="text-4xl font-black text-red-400">게임 오버!</h2>
              <p className="text-lg text-slate-300">손가락을 너무 많이 찔렸어요...</p>
            </>
          )}

          <div className="rounded-xl bg-white/5 px-8 py-4 space-y-2">
            <p>⭐ 점수: <span className="font-bold text-amber-400">{score}</span></p>
            <p>🔥 최대 콤보: <span className="font-bold text-orange-400">{maxCombo}</span></p>
            <p>✅ 성공: <span className="font-bold text-green-400">{totalHits}</span></p>
            <p>❌ 실패: <span className="font-bold text-red-400">{totalMisses}</span></p>
            <p>🔪 도달 라운드: <span className="font-bold text-cyan-400">{currentRound}/{totalRounds}</span></p>
            {score >= bestScore && score > 0 && (
              <p className="text-amber-400 font-bold">🎉 최고 기록!</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={startGame}
              className="rounded-xl bg-gradient-to-r from-slate-600 to-red-600 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95"
            >
              🔄 다시하기
            </button>
            <button
              onClick={() => setScreen("menu")}
              className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95"
            >
              메뉴로
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
