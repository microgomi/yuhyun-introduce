"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
interface Player {
  id: number;
  name: string;
  emoji: string;
  isHuman: boolean;
  alive: boolean;
  mistakes: number;
}

type Screen = "menu" | "playing" | "gameOver";

// --- Constants ---
const AI_NAMES: { name: string; emoji: string }[] = [
  { name: "민수", emoji: "👦" },
  { name: "서연", emoji: "👧" },
  { name: "준호", emoji: "🧑" },
  { name: "하은", emoji: "👩" },
  { name: "지호", emoji: "🧒" },
  { name: "수아", emoji: "👱‍♀️" },
  { name: "도윤", emoji: "👨" },
  { name: "예은", emoji: "👩‍🦰" },
];

const DIFFICULTY_SETTINGS = {
  easy: { playerCount: 4, label: "쉬움 (4명)", maxMistakes: 3, aiMistakeRate: 0.02, timeLimit: 5000 },
  normal: { playerCount: 6, label: "보통 (6명)", maxMistakes: 2, aiMistakeRate: 0.05, timeLimit: 3500 },
  hard: { playerCount: 8, label: "어려움 (8명)", maxMistakes: 1, aiMistakeRate: 0.08, timeLimit: 2500 },
};

type Difficulty = keyof typeof DIFFICULTY_SETTINGS;

// Count claps needed for a number
function countClaps(n: number): number {
  let claps = 0;
  const s = n.toString();
  for (const c of s) {
    if (c === "3" || c === "6" || c === "9") claps++;
  }
  return claps;
}

function hasClap(n: number): boolean {
  return countClaps(n) > 0;
}

export default function Game369Page() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentNumber, setCurrentNumber] = useState(1);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [message, setMessage] = useState("");
  const [showAction, setShowAction] = useState<{ text: string; isClap: boolean; isWrong: boolean } | null>(null);
  const [round, setRound] = useState(1);
  const [wins, setWins] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [timeLeft, setTimeLeft] = useState(100); // percentage
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [waitingForHuman, setWaitingForHuman] = useState(false);
  const [history, setHistory] = useState<{ player: string; number: number; action: string; correct: boolean }[]>([]);
  const [highlightClap, setHighlightClap] = useState(false);
  const [speed, setSpeed] = useState(1200); // ms between AI turns

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockRef = useRef(false);
  const currentNumberRef = useRef(1);
  const currentPlayerIdxRef = useRef(0);
  const playersRef = useRef<Player[]>([]);
  const speedRef = useRef(1200);

  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { currentNumberRef.current = currentNumber; }, [currentNumber]);
  useEffect(() => { currentPlayerIdxRef.current = currentPlayerIdx; }, [currentPlayerIdx]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (turnTimerRef.current) { clearTimeout(turnTimerRef.current); turnTimerRef.current = null; }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Start game
  const startGame = useCallback(() => {
    const settings = DIFFICULTY_SETTINGS[difficulty];
    const shuffled = [...AI_NAMES].sort(() => Math.random() - 0.5);
    const aiCount = settings.playerCount - 1;

    const humanPos = Math.floor(Math.random() * settings.playerCount);
    const allPlayers: Player[] = [];
    let aiIdx = 0;

    for (let i = 0; i < settings.playerCount; i++) {
      if (i === humanPos) {
        allPlayers.push({ id: i, name: "나", emoji: "🙋", isHuman: true, alive: true, mistakes: 0 });
      } else {
        const ai = shuffled[aiIdx++];
        allPlayers.push({ id: i, name: ai.name, emoji: ai.emoji, isHuman: false, alive: true, mistakes: 0 });
      }
    }

    setPlayers(allPlayers);
    setCurrentNumber(1);
    currentNumberRef.current = 1;
    setCurrentPlayerIdx(0);
    currentPlayerIdxRef.current = 0;
    setMessage("");
    setShowAction(null);
    setRound(1);
    setCombo(0);
    setMaxCombo(0);
    setWaitingForHuman(false);
    setHistory([]);
    setHighlightClap(false);
    setSpeed(1200);
    speedRef.current = 1200;
    lockRef.current = false;
    setScreen("playing");

    // Start first turn after short delay
    setTimeout(() => {
      if (allPlayers[0].isHuman) {
        startHumanTurn();
      } else {
        doAiTurn(allPlayers, 0, 1);
      }
    }, 1000);
  }, [difficulty]);

  // Start human turn timer
  const startHumanTurn = useCallback(() => {
    setWaitingForHuman(true);
    setTimeLeft(100);
    const settings = DIFFICULTY_SETTINGS[difficulty];
    const startTime = Date.now();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / settings.timeLimit) * 100);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        // Timeout = mistake
        handleMistake(
          playersRef.current.find((p) => p.isHuman)!,
          currentNumberRef.current,
          "⏰ 시간 초과!"
        );
      }
    }, 50);
  }, [difficulty]);

  // Handle a player making a mistake
  const handleMistake = useCallback((player: Player, num: number, reason: string) => {
    lockRef.current = true;
    clearTimers();
    setWaitingForHuman(false);

    const settings = DIFFICULTY_SETTINGS[difficulty];
    const newMistakes = player.mistakes + 1;
    const isOut = newMistakes >= settings.maxMistakes;

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === player.id
          ? { ...p, mistakes: newMistakes, alive: isOut ? false : p.alive }
          : p
      )
    );

    setShowAction({ text: reason, isClap: false, isWrong: true });
    setCombo(0);

    const mistakeMsg = isOut
      ? `💀 ${player.emoji} ${player.name} 탈락! (${reason})`
      : `❌ ${player.emoji} ${player.name} 실수! (${newMistakes}/${settings.maxMistakes}) ${reason}`;
    setMessage(mistakeMsg);

    setHistory((prev) => [...prev.slice(-19), { player: `${player.emoji}${player.name}`, number: num, action: reason, correct: false }]);

    setTimeout(() => {
      setShowAction(null);
      lockRef.current = false;

      // Check game over
      const updatedPlayers = playersRef.current.map((p) =>
        p.id === player.id ? { ...p, mistakes: newMistakes, alive: !isOut } : p
      );
      const alivePlayers = updatedPlayers.filter((p) => p.alive);

      if (alivePlayers.length <= 1) {
        setTotalGames((g) => g + 1);
        const human = alivePlayers.find((p) => p.isHuman);
        if (human) setWins((w) => w + 1);
        setPlayers(updatedPlayers);
        setScreen("gameOver");
        return;
      }

      // Move to next alive player, same number (don't advance on mistake)
      advanceToNext(updatedPlayers, currentNumberRef.current, false);
    }, 1500);
  }, [difficulty, clearTimers]);

  // Handle correct action
  const handleCorrect = useCallback((player: Player, num: number, action: string, isClap: boolean) => {
    lockRef.current = true;
    clearTimers();
    setWaitingForHuman(false);

    setShowAction({ text: action, isClap, isWrong: false });
    if (isClap) setHighlightClap(true);

    const newCombo = combo + 1;
    setCombo(newCombo);
    if (newCombo > maxCombo) setMaxCombo(newCombo);

    setHistory((prev) => [...prev.slice(-19), { player: `${player.emoji}${player.name}`, number: num, action, correct: true }]);
    setMessage(`${player.emoji} ${player.name}: ${action}`);

    setTimeout(() => {
      setShowAction(null);
      setHighlightClap(false);
      lockRef.current = false;

      // Advance number and player
      const nextNum = num + 1;
      setCurrentNumber(nextNum);
      currentNumberRef.current = nextNum;

      // Speed up gradually
      if (nextNum % 10 === 0) {
        const newSpeed = Math.max(400, speedRef.current - 80);
        setSpeed(newSpeed);
        speedRef.current = newSpeed;
        setRound((r) => r + 1);
      }

      advanceToNext(playersRef.current, nextNum, true);
    }, Math.min(speedRef.current, 800));
  }, [clearTimers, combo, maxCombo]);

  // Advance to next alive player
  const advanceToNext = useCallback((currentPlayers: Player[], nextNum: number, advance: boolean) => {
    const alive = currentPlayers.filter((p) => p.alive);
    if (alive.length <= 1) {
      setTotalGames((g) => g + 1);
      const human = alive.find((p) => p.isHuman);
      if (human) setWins((w) => w + 1);
      setPlayers(currentPlayers);
      setScreen("gameOver");
      return;
    }

    let nextIdx = currentPlayerIdxRef.current;
    do {
      nextIdx = (nextIdx + 1) % currentPlayers.length;
    } while (!currentPlayers[nextIdx].alive);

    setCurrentPlayerIdx(nextIdx);
    currentPlayerIdxRef.current = nextIdx;

    const nextPlayer = currentPlayers[nextIdx];
    if (nextPlayer.isHuman) {
      startHumanTurn();
    } else {
      const delay = 300 + Math.random() * (speedRef.current * 0.5);
      turnTimerRef.current = setTimeout(() => {
        doAiTurn(currentPlayers, nextIdx, nextNum);
      }, delay);
    }
  }, [startHumanTurn]);

  // AI turn
  const doAiTurn = useCallback((currentPlayers: Player[], playerIdx: number, num: number) => {
    if (lockRef.current) return;
    const player = currentPlayers[playerIdx];
    if (!player || !player.alive) return;

    const settings = DIFFICULTY_SETTINGS[difficulty];
    const claps = countClaps(num);
    const shouldClap = claps > 0;

    // AI mistake chance (increases with number)
    const mistakeChance = settings.aiMistakeRate + (num > 30 ? 0.03 : 0) + (num > 60 ? 0.05 : 0);
    const makesMistake = Math.random() < mistakeChance;

    if (makesMistake) {
      if (shouldClap) {
        // AI says the number instead of clapping
        handleMistake(player, num, `"${num}" (박수쳐야 해요!)`);
      } else {
        // AI claps when should say number
        handleMistake(player, num, `👏 (숫자를 말해야 해요!)`);
      }
    } else {
      if (shouldClap) {
        const clapStr = "👏".repeat(claps);
        handleCorrect(player, num, clapStr, true);
      } else {
        handleCorrect(player, num, `${num}`, false);
      }
    }
  }, [difficulty, handleMistake, handleCorrect]);

  // Human says number
  const humanSayNumber = () => {
    if (!waitingForHuman || lockRef.current) return;
    const num = currentNumberRef.current;
    const human = playersRef.current.find((p) => p.isHuman);
    if (!human || !human.alive) return;

    if (hasClap(num)) {
      // Should clap but said number - mistake!
      handleMistake(human, num, `"${num}" (박수쳐야 해요!)`);
    } else {
      handleCorrect(human, num, `${num}`, false);
    }
  };

  // Human claps
  const humanClap = () => {
    if (!waitingForHuman || lockRef.current) return;
    const num = currentNumberRef.current;
    const human = playersRef.current.find((p) => p.isHuman);
    if (!human || !human.alive) return;

    const claps = countClaps(num);
    if (claps === 0) {
      // Should say number but clapped - mistake!
      handleMistake(human, num, `👏 (숫자를 말해야 해요!)`);
    } else {
      const clapStr = "👏".repeat(claps);
      handleCorrect(human, num, clapStr, true);
    }
  };

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (screen !== "playing" || !waitingForHuman) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        humanClap();
      } else if (e.key >= "0" && e.key <= "9") {
        humanSayNumber();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, waitingForHuman]);

  const aliveCount = players.filter((p) => p.alive).length;

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-orange-950 via-red-950 to-slate-950 text-white">
      <style jsx global>{`
        @keyframes clapPop {
          0% { transform: scale(0.5) rotate(-10deg); opacity: 0; }
          50% { transform: scale(1.3) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .clap-pop { animation: clapPop 0.4s ease-out; }
        @keyframes wrongShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .wrong-shake { animation: wrongShake 0.4s ease-in-out; }
        @keyframes numberPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .number-pulse { animation: numberPulse 0.6s ease-in-out infinite; }
      `}</style>

      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">
            ← 홈
          </Link>
          <div className="text-7xl">👏</div>
          <h1 className="text-5xl font-black">
            <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">3 6 9 게임</span>
          </h1>
          <p className="text-lg text-slate-400">3, 6, 9가 들어가면 박수!</p>

          <div className="mt-4 w-full max-w-xs space-y-3">
            <p className="text-sm font-bold text-slate-500">난이도 선택</p>
            <div className="flex gap-2">
              {(Object.entries(DIFFICULTY_SETTINGS) as [Difficulty, typeof DIFFICULTY_SETTINGS.easy][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setDifficulty(key)}
                  className={`flex-1 rounded-xl border-2 px-3 py-3 text-sm font-bold transition-all ${
                    difficulty === key
                      ? "border-orange-400 bg-orange-500/20 text-orange-300"
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
            className="mt-4 rounded-xl bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 px-12 py-4 text-xl font-black shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            🎮 게임 시작
          </button>

          {totalGames > 0 && (
            <div className="mt-4 rounded-xl bg-white/5 px-6 py-3 backdrop-blur">
              <p className="text-sm text-slate-400">
                🏆 전적: <span className="font-bold text-orange-400">{wins}승</span> / <span className="text-slate-300">{totalGames}전</span>
              </p>
            </div>
          )}

          <div className="mt-4 w-full max-w-sm rounded-xl bg-white/5 p-4 text-left text-sm text-slate-400 space-y-2">
            <p className="font-bold text-orange-400">📖 규칙</p>
            <p>1. 순서대로 숫자를 세요 (1, 2, 3, 4, ...)</p>
            <p>2. 숫자에 <span className="text-red-400 font-bold">3, 6, 9</span>가 포함되면 숫자 대신 <span className="text-yellow-400 font-bold">👏 박수</span>!</p>
            <p>3. 예: 3→👏, 13→👏, 33→👏👏, 36→👏👏</p>
            <p>4. 틀리면 실수! 실수가 쌓이면 탈락!</p>
            <p>5. 마지막까지 살아남으면 승리!</p>
            <div className="mt-2 rounded-lg bg-white/5 p-2">
              <p className="text-xs text-slate-500">💡 스페이스바/엔터 = 박수, 숫자키 = 숫자 말하기</p>
            </div>
          </div>
        </div>
      )}

      {/* Playing */}
      {screen === "playing" && (
        <div className="flex min-h-screen flex-col items-center px-4 pt-4">
          {/* Header */}
          <div className="mb-3 flex w-full max-w-sm items-center justify-between text-sm">
            <span className="rounded-lg bg-white/10 px-3 py-1">🔄 라운드 {round}</span>
            <span className="rounded-lg bg-white/10 px-3 py-1">🔥 콤보 {combo}</span>
            <span className="rounded-lg bg-white/10 px-3 py-1">👥 {aliveCount}명</span>
          </div>

          {/* Current Number Display */}
          <div className="mb-4 flex flex-col items-center">
            <div className="mb-1 text-sm text-slate-400">현재 숫자</div>
            <div className={`flex h-28 w-28 items-center justify-center rounded-2xl text-5xl font-black shadow-lg ${
              highlightClap
                ? "bg-gradient-to-br from-yellow-500 to-orange-500 clap-pop"
                : hasClap(currentNumber)
                ? "bg-gradient-to-br from-red-500 to-pink-500 number-pulse"
                : "bg-gradient-to-br from-slate-700 to-slate-800"
            }`}>
              {hasClap(currentNumber) ? (
                <span className="text-4xl">{"👏".repeat(countClaps(currentNumber))}</span>
              ) : (
                currentNumber
              )}
            </div>
            {hasClap(currentNumber) && waitingForHuman && (
              <div className="mt-2 animate-pulse text-sm font-bold text-red-400">
                ⚠️ 박수쳐야 해요! ({countClaps(currentNumber)}번)
              </div>
            )}
          </div>

          {/* Action display */}
          {showAction && (
            <div className={`mb-4 rounded-xl px-8 py-3 text-center text-2xl font-black ${
              showAction.isWrong
                ? "bg-red-500/20 text-red-300 wrong-shake"
                : showAction.isClap
                ? "bg-yellow-500/20 text-yellow-300 clap-pop"
                : "bg-white/10 text-white"
            }`}>
              {showAction.text}
            </div>
          )}

          {/* Timer bar (for human turn) */}
          {waitingForHuman && (
            <div className="mb-4 h-3 w-full max-w-sm overflow-hidden rounded-full bg-gray-800">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  timeLeft > 50 ? "bg-gradient-to-r from-green-500 to-emerald-400" :
                  timeLeft > 25 ? "bg-gradient-to-r from-yellow-500 to-orange-400" :
                  "bg-gradient-to-r from-red-500 to-pink-400"
                }`}
                style={{ width: `${timeLeft}%` }}
              />
            </div>
          )}

          {/* Message */}
          {message && (
            <div className="mb-4 rounded-xl bg-white/10 px-6 py-2 text-center text-sm font-bold">
              {message}
            </div>
          )}

          {/* Players Circle */}
          <div className="mb-6 grid w-full max-w-sm grid-cols-4 gap-2">
            {players.map((player) => {
              const isCurrent = players[currentPlayerIdx]?.id === player.id;
              const settings = DIFFICULTY_SETTINGS[difficulty];
              return (
                <div
                  key={player.id}
                  className={`relative flex flex-col items-center rounded-xl border-2 p-2 transition-all duration-300 ${
                    !player.alive
                      ? "border-gray-700 bg-gray-900/50 opacity-40 grayscale"
                      : isCurrent
                      ? "border-amber-400 bg-amber-500/15 scale-105 shadow-lg shadow-amber-500/20"
                      : player.isHuman
                      ? "border-cyan-500/50 bg-cyan-500/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <span className={`text-2xl ${isCurrent && player.alive ? "animate-bounce" : ""}`}>
                    {player.emoji}
                  </span>
                  <span className={`text-xs font-bold ${player.isHuman ? "text-cyan-400" : "text-white"}`}>
                    {player.name}
                  </span>
                  {/* Mistake indicators */}
                  {player.alive && player.mistakes > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {Array.from({ length: settings.maxMistakes }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 w-1.5 rounded-full ${
                            i < player.mistakes ? "bg-red-500" : "bg-gray-600"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  {!player.alive && (
                    <span className="absolute -right-1 -top-1 text-sm">💀</span>
                  )}
                  {isCurrent && player.alive && (
                    <span className="absolute -left-1 -top-1 text-sm">👉</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          {waitingForHuman && (
            <div className="flex gap-4">
              <button
                onClick={humanSayNumber}
                className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-10 py-5 text-2xl font-black shadow-xl transition-transform hover:scale-105 active:scale-90"
              >
                {currentNumber}
                <div className="text-xs font-normal mt-1">숫자 말하기</div>
              </button>
              <button
                onClick={humanClap}
                className="rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 px-10 py-5 text-2xl font-black shadow-xl transition-transform hover:scale-105 active:scale-90"
              >
                👏
                <div className="text-xs font-normal mt-1">박수치기</div>
              </button>
            </div>
          )}

          {!waitingForHuman && !players.find((p) => p.isHuman)?.alive && (
            <div className="rounded-xl bg-red-500/20 px-8 py-4 text-center text-red-300">
              💀 탈락했어요... 관전 중
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="mt-4 w-full max-w-sm rounded-xl bg-white/5 p-3">
              <p className="mb-2 text-xs font-bold text-slate-500">📜 기록</p>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {history.slice(-15).map((h, i) => (
                  <span
                    key={i}
                    className={`rounded-md px-2 py-0.5 text-xs ${
                      h.correct
                        ? h.action.includes("👏")
                          ? "bg-yellow-500/20 text-yellow-300"
                          : "bg-white/10 text-slate-300"
                        : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {h.player}: {h.action}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game Over */}
      {screen === "gameOver" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          {players.find((p) => p.isHuman)?.alive ? (
            <>
              <div className="text-7xl">🏆</div>
              <h2 className="text-4xl font-black text-amber-400">우승!</h2>
              <p className="text-lg text-orange-300">마지막까지 살아남았어요!</p>
            </>
          ) : (
            <>
              <div className="text-7xl">😵</div>
              <h2 className="text-4xl font-black text-red-400">탈락!</h2>
              {(() => {
                const winner = players.find((p) => p.alive);
                return winner ? (
                  <p className="text-lg text-slate-300">{winner.emoji} {winner.name}이(가) 우승!</p>
                ) : (
                  <p className="text-lg text-slate-300">모두 탈락!</p>
                );
              })()}
            </>
          )}

          <div className="rounded-xl bg-white/5 px-8 py-4 space-y-2">
            <p>🔢 도달 숫자: <span className="font-bold text-cyan-400">{currentNumber}</span></p>
            <p>🔥 최대 콤보: <span className="font-bold text-orange-400">{maxCombo}</span></p>
            <p>🔄 라운드: <span className="font-bold text-purple-400">{round}</span></p>
          </div>

          {/* Final standings */}
          <div className="w-full max-w-xs space-y-2">
            <p className="text-sm font-bold text-slate-400">최종 순위</p>
            {[...players]
              .sort((a, b) => (a.alive === b.alive ? 0 : a.alive ? -1 : 1))
              .map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2 ${
                    p.alive ? "bg-orange-500/20 text-orange-300" : "bg-white/5 text-slate-500"
                  }`}
                >
                  <span className="text-lg font-bold">{p.alive ? "🏆" : "💀"}</span>
                  <span className="text-xl">{p.emoji}</span>
                  <span className="font-bold">{p.name}</span>
                  {p.isHuman && <span className="ml-auto text-xs text-cyan-400">(나)</span>}
                </div>
              ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={startGame}
              className="rounded-xl bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95"
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
