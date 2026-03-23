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
  saidNumber: number | null; // which number they said this round
  reactionSpeed: number; // AI base reaction speed (ms)
  personality: "aggressive" | "cautious" | "normal" | "random";
}

type Screen = "menu" | "playing" | "roundResult" | "gameOver";

// --- Constants ---
const AI_PLAYERS: Omit<Player, "id" | "alive" | "saidNumber">[] = [
  { name: "민수", emoji: "👦", isHuman: false, reactionSpeed: 1200, personality: "aggressive" },
  { name: "서연", emoji: "👧", isHuman: false, reactionSpeed: 1800, personality: "cautious" },
  { name: "준호", emoji: "🧑", isHuman: false, reactionSpeed: 1500, personality: "normal" },
  { name: "하은", emoji: "👩", isHuman: false, reactionSpeed: 1000, personality: "aggressive" },
  { name: "지호", emoji: "🧒", isHuman: false, reactionSpeed: 2000, personality: "cautious" },
  { name: "수아", emoji: "👱‍♀️", isHuman: false, reactionSpeed: 1400, personality: "normal" },
  { name: "도윤", emoji: "👨", isHuman: false, reactionSpeed: 900, personality: "aggressive" },
  { name: "예은", emoji: "👩‍🦰", isHuman: false, reactionSpeed: 1600, personality: "random" },
];

const DIFFICULTY_SETTINGS = {
  easy: { playerCount: 4, label: "쉬움 (4명)", speedMul: 1.5 },
  normal: { playerCount: 6, label: "보통 (6명)", speedMul: 1.0 },
  hard: { playerCount: 8, label: "어려움 (8명)", speedMul: 0.7 },
};

type Difficulty = keyof typeof DIFFICULTY_SETTINGS;

export default function NunchiPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentNumber, setCurrentNumber] = useState(0);
  const [round, setRound] = useState(1);
  const [countingPhase, setCountingPhase] = useState(false);
  const [message, setMessage] = useState("");
  const [showCollision, setShowCollision] = useState(false);
  const [collisionPlayers, setCollisionPlayers] = useState<string[]>([]);
  const [lastSpeaker, setLastSpeaker] = useState<string>("");
  const [roundOrder, setRoundOrder] = useState<number[]>([]);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [wins, setWins] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [hintTimer, setHintTimer] = useState(0);
  const [shakingPlayer, setShakingPlayer] = useState<number | null>(null);

  const aiTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lockRef = useRef(false);
  const roundOrderRef = useRef<number[]>([]);
  const currentNumberRef = useRef(0);
  const playersRef = useRef<Player[]>([]);
  const countingRef = useRef(false);
  const hintIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync refs
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { currentNumberRef.current = currentNumber; }, [currentNumber]);
  useEffect(() => { countingRef.current = countingPhase; }, [countingPhase]);

  const clearAllTimers = useCallback(() => {
    for (const t of aiTimersRef.current) clearTimeout(t);
    aiTimersRef.current = [];
    if (hintIntervalRef.current) {
      clearInterval(hintIntervalRef.current);
      hintIntervalRef.current = null;
    }
  }, []);

  // Initialize game
  const startGame = useCallback(() => {
    const settings = DIFFICULTY_SETTINGS[difficulty];
    const shuffled = [...AI_PLAYERS].sort(() => Math.random() - 0.5);
    const aiCount = settings.playerCount - 1;
    const selectedAI = shuffled.slice(0, aiCount);

    const allPlayers: Player[] = [
      {
        id: 0,
        name: "나",
        emoji: "🙋",
        isHuman: true,
        alive: true,
        saidNumber: null,
        reactionSpeed: 0,
        personality: "normal",
      },
      ...selectedAI.map((ai, i) => ({
        ...ai,
        id: i + 1,
        alive: true,
        saidNumber: null as number | null,
      })),
    ];

    setPlayers(allPlayers);
    setCurrentNumber(0);
    currentNumberRef.current = 0;
    setRound(1);
    setMessage("");
    setShowCollision(false);
    setCollisionPlayers([]);
    setLastSpeaker("");
    setRoundOrder([]);
    roundOrderRef.current = [];
    setEliminated([]);
    setCountdown(3);
    setScreen("playing");
    lockRef.current = false;
  }, [difficulty]);

  // Countdown before round starts
  useEffect(() => {
    if (screen !== "playing" || countdown <= 0) return;
    const timer = setTimeout(() => {
      if (countdown === 1) {
        setCountdown(0);
        setCountingPhase(true);
        setMessage("눈치껏 숫자를 말하세요!");
      } else {
        setCountdown(countdown - 1);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [screen, countdown]);

  // Get alive players count
  const aliveCount = players.filter((p) => p.alive).length;
  const alivePlayers = players.filter((p) => p.alive);
  const targetNumber = alivePlayers.length; // each round, count up to number of alive players

  // AI logic
  const scheduleAI = useCallback(() => {
    clearAllTimers();
    const settings = DIFFICULTY_SETTINGS[difficulty];
    const alive = playersRef.current.filter((p) => p.alive && !p.isHuman);

    for (const ai of alive) {
      const baseDelay = ai.reactionSpeed * settings.speedMul;
      let delay: number;

      switch (ai.personality) {
        case "aggressive":
          delay = baseDelay * (0.5 + Math.random() * 0.5);
          break;
        case "cautious":
          delay = baseDelay * (1.0 + Math.random() * 1.0);
          break;
        case "random":
          delay = baseDelay * (0.3 + Math.random() * 1.5);
          break;
        default:
          delay = baseDelay * (0.7 + Math.random() * 0.8);
      }

      // AI waits longer if number is higher (more cautious later)
      const numFactor = 1 + currentNumberRef.current * 0.15;
      delay *= numFactor;

      const timer = setTimeout(() => {
        if (!countingRef.current || lockRef.current) return;
        aiSayNumber(ai.id);
      }, delay);

      aiTimersRef.current.push(timer);
    }
  }, [clearAllTimers, difficulty]);

  // Someone says a number
  const sayNumber = useCallback((playerId: number) => {
    if (lockRef.current || !countingRef.current) return;

    const nextNum = currentNumberRef.current + 1;
    const player = playersRef.current.find((p) => p.id === playerId);
    if (!player || !player.alive || player.saidNumber !== null) return;

    // Check if another player is currently saying this number (collision window)
    // Lock briefly to detect simultaneous attempts
    lockRef.current = true;
    clearAllTimers();

    // Collision detection: check if any AI timer would fire within 200ms
    const colliders: number[] = [playerId];

    // Check pending AI actions (simulate by checking if any AI was about to go)
    const alive = playersRef.current.filter((p) => p.alive && !p.isHuman && p.saidNumber === null && p.id !== playerId);
    for (const ai of alive) {
      const settings = DIFFICULTY_SETTINGS[difficulty];
      const chance = ai.personality === "aggressive" ? 0.15 : ai.personality === "cautious" ? 0.03 : 0.08;
      if (Math.random() < chance * (1 / settings.speedMul)) {
        colliders.push(ai.id);
      }
    }

    if (colliders.length > 1) {
      // Collision!
      const collidedNames = colliders.map((id) => {
        const p = playersRef.current.find((p) => p.id === id);
        return p ? `${p.emoji} ${p.name}` : "";
      });
      setCollisionPlayers(collidedNames);
      setShowCollision(true);
      setMessage(`💥 충돌! ${collidedNames.join(", ")}이(가) 동시에 말했어요!`);

      // Eliminate collided players
      setPlayers((prev) =>
        prev.map((p) =>
          colliders.includes(p.id) ? { ...p, alive: false } : p
        )
      );
      setEliminated((prev) => [
        ...prev,
        ...colliders.map((id) => {
          const p = playersRef.current.find((p) => p.id === id);
          return p ? `${p.emoji} ${p.name}` : "";
        }),
      ]);

      // Shake animation
      for (const id of colliders) {
        setShakingPlayer(id);
      }

      setCountingPhase(false);
      setTimeout(() => {
        setShowCollision(false);
        setShakingPlayer(null);
        lockRef.current = false;
        checkRoundEnd(colliders);
      }, 2000);
      return;
    }

    // No collision - successful number call
    setCurrentNumber(nextNum);
    currentNumberRef.current = nextNum;
    setLastSpeaker(`${player.emoji} ${player.name}`);
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, saidNumber: nextNum } : p))
    );
    setRoundOrder((prev) => {
      const next = [...prev, playerId];
      roundOrderRef.current = next;
      return next;
    });
    setMessage(`${player.emoji} ${player.name}: "${nextNum}!"`);
    setHintTimer(0);

    // Check if round is complete (all alive players said a number)
    const totalAlive = playersRef.current.filter((p) => p.alive).length;
    if (nextNum >= totalAlive) {
      // Last person to say the number is eliminated!
      setCountingPhase(false);
      setMessage(`😱 ${player.emoji} ${player.name}이(가) 마지막으로 말해서 탈락!`);
      setShakingPlayer(player.id);
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, alive: false } : p))
      );
      setEliminated((prev) => [...prev, `${player.emoji} ${player.name}`]);

      setTimeout(() => {
        setShakingPlayer(null);
        lockRef.current = false;
        checkRoundEnd([playerId]);
      }, 2000);
      return;
    }

    // Continue - schedule next AI attempts
    setTimeout(() => {
      lockRef.current = false;
      if (countingRef.current) {
        scheduleAI();
      }
    }, 300);
  }, [clearAllTimers, difficulty, scheduleAI]);

  const aiSayNumber = useCallback((aiId: number) => {
    sayNumber(aiId);
  }, [sayNumber]);

  // Check round end after collision
  const checkRoundEnd = useCallback((eliminatedIds: number[]) => {
    const remaining = playersRef.current.filter((p) => p.alive && !eliminatedIds.includes(p.id));

    if (remaining.length <= 1) {
      // Game over
      const human = remaining.find((p) => p.isHuman);
      setTotalGames((g) => g + 1);
      if (human) {
        setWins((w) => w + 1);
        setMessage("🎉 축하해요! 우승했어요!");
      } else if (remaining.length === 1) {
        setMessage(`${remaining[0].emoji} ${remaining[0].name}이(가) 우승했어요!`);
      } else {
        setMessage("모두 탈락! 무승부!");
      }
      setScreen("gameOver");
      return;
    }

    // Start new round
    setTimeout(() => startNewRound(), 1500);
  }, []);

  // Timeout: if nobody speaks for too long, last remaining person is eliminated
  useEffect(() => {
    if (!countingPhase || lockRef.current) return;

    const timer = setInterval(() => {
      setHintTimer((h) => h + 1);
    }, 1000);
    hintIntervalRef.current = timer;

    return () => {
      clearInterval(timer);
      hintIntervalRef.current = null;
    };
  }, [countingPhase]);

  // Force timeout after 8 seconds of no action
  useEffect(() => {
    if (hintTimer >= 8 && countingPhase && !lockRef.current) {
      // Human didn't go - they're eliminated for being too slow
      const human = playersRef.current.find((p) => p.isHuman && p.alive && p.saidNumber === null);
      if (human) {
        lockRef.current = true;
        setCountingPhase(false);
        setMessage("⏰ 시간 초과! 너무 늦었어요!");
        setPlayers((prev) =>
          prev.map((p) => (p.isHuman ? { ...p, alive: false } : p))
        );
        setEliminated((prev) => [...prev, `${human.emoji} ${human.name}`]);
        setShakingPlayer(human.id);
        setTimeout(() => {
          setShakingPlayer(null);
          lockRef.current = false;
          checkRoundEnd([human.id]);
        }, 2000);
      }
    }
  }, [hintTimer, countingPhase, checkRoundEnd]);

  // Start new round
  const startNewRound = useCallback(() => {
    clearAllTimers();
    setRound((r) => r + 1);
    setCurrentNumber(0);
    currentNumberRef.current = 0;
    setRoundOrder([]);
    roundOrderRef.current = [];
    setLastSpeaker("");
    setHintTimer(0);
    setPlayers((prev) => prev.map((p) => ({ ...p, saidNumber: null })));
    setCountdown(2);
    setCountingPhase(false);
    lockRef.current = false;
  }, [clearAllTimers]);

  // Schedule AI when counting starts
  useEffect(() => {
    if (countingPhase && !lockRef.current) {
      scheduleAI();
    }
    return () => clearAllTimers();
  }, [countingPhase, scheduleAI, clearAllTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Human click handler
  const handleHumanClick = () => {
    const human = players.find((p) => p.isHuman);
    if (!human || !human.alive || human.saidNumber !== null || !countingPhase) return;
    sayNumber(0);
  };

  // Player card
  const PlayerCard = ({ player, index }: { player: Player; index: number }) => {
    const isShaking = shakingPlayer === player.id;
    const hasSaid = player.saidNumber !== null;
    const isLastSpeaker = lastSpeaker.includes(player.name);

    return (
      <div
        className={`relative flex flex-col items-center rounded-xl border-2 p-3 transition-all duration-300 ${
          !player.alive
            ? "border-gray-700 bg-gray-900/50 opacity-40 grayscale"
            : hasSaid
            ? "border-green-500 bg-green-500/10 scale-95"
            : isLastSpeaker
            ? "border-yellow-400 bg-yellow-500/10 scale-110"
            : player.isHuman
            ? "border-cyan-400 bg-cyan-500/10"
            : "border-white/20 bg-white/5"
        } ${isShaking ? "animate-shake" : ""}`}
      >
        <span className={`text-3xl ${!player.alive ? "grayscale" : ""} ${isLastSpeaker && player.alive ? "animate-bounce" : ""}`}>
          {player.emoji}
        </span>
        <span className={`mt-1 text-xs font-bold ${player.isHuman ? "text-cyan-400" : "text-white"}`}>
          {player.name}
        </span>
        {hasSaid && player.alive && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs font-black text-white">
            {player.saidNumber}
          </span>
        )}
        {!player.alive && (
          <span className="absolute -right-1 -top-1 text-lg">💀</span>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950 text-white">
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out 3;
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop-in {
          animation: popIn 0.4s ease-out forwards;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 200, 0.3); }
          50% { box-shadow: 0 0 30px rgba(0, 255, 200, 0.6); }
        }
        .pulse-glow {
          animation: pulse-glow 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">
            ← 홈
          </Link>
          <div className="text-7xl animate-bounce">👀</div>
          <h1 className="text-5xl font-black">
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">눈치 게임</span>
          </h1>
          <p className="text-lg text-slate-400">눈치껏 숫자를 외치자!</p>

          <div className="mt-4 w-full max-w-xs space-y-3">
            <p className="text-sm font-bold text-slate-500">난이도 선택</p>
            <div className="flex gap-2">
              {(Object.entries(DIFFICULTY_SETTINGS) as [Difficulty, typeof DIFFICULTY_SETTINGS.easy][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setDifficulty(key)}
                  className={`flex-1 rounded-xl border-2 px-3 py-3 text-sm font-bold transition-all ${
                    difficulty === key
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
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
            className="mt-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-12 py-4 text-xl font-black shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            🎮 게임 시작
          </button>

          {totalGames > 0 && (
            <div className="mt-4 rounded-xl bg-white/5 px-6 py-3 backdrop-blur">
              <p className="text-sm text-slate-400">
                🏆 전적: <span className="font-bold text-emerald-400">{wins}승</span> / <span className="text-slate-300">{totalGames}전</span>
              </p>
            </div>
          )}

          {/* Rules */}
          <div className="mt-4 w-full max-w-sm rounded-xl bg-white/5 p-4 text-left text-sm text-slate-400 space-y-2">
            <p className="font-bold text-emerald-400">📖 규칙</p>
            <p>1. 살아남은 사람 수만큼 숫자를 셉니다</p>
            <p>2. 순서 없이 눈치껏 다음 숫자를 외치세요</p>
            <p>3. 두 명이 동시에 같은 숫자를 외치면 둘 다 탈락!</p>
            <p>4. <span className="text-red-400 font-bold">마지막 숫자를 말한 사람은 탈락!</span></p>
            <p>5. 너무 늦으면 시간 초과로 탈락!</p>
            <p>6. 마지막까지 살아남으면 승리!</p>
          </div>
        </div>
      )}

      {/* Playing */}
      {(screen === "playing" || screen === "roundResult") && (
        <div className="flex min-h-screen flex-col items-center px-4 pt-4">
          {/* Header */}
          <div className="mb-4 flex w-full max-w-sm items-center justify-between">
            <span className="rounded-lg bg-white/10 px-3 py-1 text-sm">🔄 라운드 {round}</span>
            <span className="rounded-lg bg-white/10 px-3 py-1 text-sm">👥 생존 {aliveCount}명</span>
          </div>

          {/* Current Number Display */}
          <div className="mb-6 flex flex-col items-center">
            {countdown > 0 ? (
              <div className="animate-pop-in text-center">
                <div className="text-7xl font-black text-amber-400">{countdown}</div>
                <p className="mt-2 text-sm text-slate-400">준비하세요...</p>
              </div>
            ) : (
              <>
                <div className="mb-2 text-sm text-slate-400">현재 숫자</div>
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-5xl font-black shadow-lg">
                  {currentNumber}
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  목표: {targetNumber}까지
                </div>
                {hintTimer >= 4 && countingPhase && (
                  <div className="mt-2 animate-pulse text-sm text-amber-400">
                    ⚡ 서두르세요! ({8 - hintTimer}초 남음)
                  </div>
                )}
              </>
            )}
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-4 rounded-xl px-6 py-3 text-center text-sm font-bold ${
              showCollision
                ? "bg-red-500/20 text-red-300 animate-shake"
                : message.includes("시간 초과")
                ? "bg-amber-500/20 text-amber-300"
                : "bg-white/10 text-white"
            }`}>
              {message}
            </div>
          )}

          {/* Players Grid */}
          <div className="mb-6 grid w-full max-w-sm grid-cols-3 gap-3">
            {players.map((player, i) => (
              <PlayerCard key={player.id} player={player} index={i} />
            ))}
          </div>

          {/* Action Button */}
          {countingPhase && players.find((p) => p.isHuman)?.alive && players.find((p) => p.isHuman)?.saidNumber === null && (
            <button
              onClick={handleHumanClick}
              className="pulse-glow rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-16 py-6 text-3xl font-black shadow-xl transition-transform hover:scale-105 active:scale-90"
            >
              {currentNumber + 1}! 외치기
            </button>
          )}

          {countingPhase && players.find((p) => p.isHuman)?.saidNumber !== null && (
            <div className="rounded-xl bg-green-500/20 px-8 py-4 text-center text-green-300">
              ✅ 이미 숫자를 말했어요! 기다리세요...
            </div>
          )}

          {!countingPhase && countdown === 0 && screen === "playing" && (
            <div className="rounded-xl bg-white/10 px-8 py-4 text-center text-slate-400">
              잠시 후 다음 라운드가 시작됩니다...
            </div>
          )}

          {/* Eliminated list */}
          {eliminated.length > 0 && (
            <div className="mt-4 w-full max-w-sm rounded-xl bg-red-500/10 p-3">
              <p className="mb-1 text-xs font-bold text-red-400">💀 탈락자</p>
              <div className="flex flex-wrap gap-2">
                {eliminated.map((name, i) => (
                  <span key={i} className="rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-300">
                    {name}
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
              <p className="text-lg text-emerald-300">마지막까지 살아남았어요!</p>
            </>
          ) : (
            <>
              <div className="text-7xl">😢</div>
              <h2 className="text-4xl font-black text-red-400">탈락!</h2>
              {(() => {
                const winner = players.find((p) => p.alive);
                return winner ? (
                  <p className="text-lg text-slate-300">{winner.emoji} {winner.name}이(가) 우승했어요</p>
                ) : (
                  <p className="text-lg text-slate-300">모두 탈락했어요!</p>
                );
              })()}
            </>
          )}

          <div className="rounded-xl bg-white/5 px-8 py-4 space-y-2">
            <p>🔄 진행 라운드: <span className="font-bold text-cyan-400">{round}</span></p>
            <p>👥 총 참가자: <span className="font-bold text-white">{players.length}명</span></p>
            <p>💀 탈락자: <span className="font-bold text-red-400">{eliminated.length}명</span></p>
          </div>

          {/* Final standings */}
          <div className="w-full max-w-xs space-y-2">
            <p className="text-sm font-bold text-slate-400">최종 순위</p>
            {[...players]
              .sort((a, b) => (a.alive ? -1 : 1) - (b.alive ? -1 : 1))
              .map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2 ${
                    p.alive ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-slate-500"
                  }`}
                >
                  <span className="text-lg font-bold">{p.alive ? "🏆" : `${i + 1}.`}</span>
                  <span className="text-xl">{p.emoji}</span>
                  <span className="font-bold">{p.name}</span>
                  {p.isHuman && <span className="ml-auto text-xs text-cyan-400">(나)</span>}
                </div>
              ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={startGame}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95"
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
