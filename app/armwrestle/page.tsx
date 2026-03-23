"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
interface Opponent {
  id: string;
  name: string;
  emoji: string;
  strength: number; // clicks per second needed to beat
  desc: string;
  reward: number;
}

type Screen = "menu" | "select" | "ready" | "playing" | "result";

// --- Constants ---
const OPPONENTS: Opponent[] = [
  { id: "kid", name: "꼬마", emoji: "👶", strength: 3, desc: "이제 막 힘을 기르기 시작했어요", reward: 10 },
  { id: "student", name: "초등학생", emoji: "🧒", strength: 5, desc: "학교에서 팔씨름 좀 해요", reward: 20 },
  { id: "girl", name: "언니", emoji: "👧", strength: 7, desc: "운동을 좋아하는 언니", reward: 30 },
  { id: "boy", name: "형", emoji: "👦", strength: 9, desc: "축구부 에이스!", reward: 40 },
  { id: "teacher", name: "선생님", emoji: "👨‍🏫", strength: 11, desc: "체육 선생님이에요", reward: 60 },
  { id: "athlete", name: "운동선수", emoji: "🏋️", strength: 13, desc: "전국 대회 출전 선수!", reward: 80 },
  { id: "wrestler", name: "씨름선수", emoji: "🤼", strength: 15, desc: "씨름 챔피언!", reward: 100 },
  { id: "hulk", name: "괴력맨", emoji: "💪", strength: 18, desc: "전설의 팔씨름 왕!", reward: 150 },
];

const UPGRADES = [
  { id: "protein", name: "단백질 보충제", emoji: "🥛", cost: 30, bonus: 0.5, desc: "클릭 파워 +0.5" },
  { id: "dumbbell", name: "아령 훈련", emoji: "🏋️", cost: 60, bonus: 1.0, desc: "클릭 파워 +1.0" },
  { id: "glove", name: "그립 장갑", emoji: "🧤", cost: 100, bonus: 1.5, desc: "클릭 파워 +1.5" },
  { id: "band", name: "파워 밴드", emoji: "💎", cost: 180, bonus: 2.0, desc: "클릭 파워 +2.0" },
  { id: "super", name: "초인 훈련", emoji: "⚡", cost: 300, bonus: 3.0, desc: "클릭 파워 +3.0" },
];

const GAME_DURATION = 8000; // 8 seconds
const TICK_MS = 50;
const ARM_RANGE = 100; // -100 (lose) to +100 (win), 0 = center

export default function ArmWrestlePage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gold, setGold] = useState(0);
  const [selectedOpponent, setSelectedOpponent] = useState<Opponent>(OPPONENTS[0]);
  const [armPosition, setArmPosition] = useState(0); // -100 to 100
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [clickCount, setClickCount] = useState(0);
  const [cps, setCps] = useState(0); // clicks per second
  const [result, setResult] = useState<"win" | "lose" | "draw" | null>(null);
  const [ownedUpgrades, setOwnedUpgrades] = useState<string[]>([]);
  const [totalWins, setTotalWins] = useState(0);
  const [totalLosses, setTotalLosses] = useState(0);
  const [bestOpponent, setBestOpponent] = useState(0); // index of best beaten opponent
  const [shaking, setShaking] = useState(false);
  const [combo, setCombo] = useState(0); // rapid click combo
  const [showPower, setShowPower] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [streak, setStreak] = useState(0);

  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clickTimesRef = useRef<number[]>([]);
  const armPosRef = useRef(0);
  const timeLeftRef = useRef(GAME_DURATION);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate total power bonus from upgrades
  const powerBonus = ownedUpgrades.reduce((sum, uid) => {
    const u = UPGRADES.find((u) => u.id === uid);
    return sum + (u?.bonus ?? 0);
  }, 0);

  const clearGameLoop = useCallback(() => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  }, []);

  useEffect(() => () => clearGameLoop(), [clearGameLoop]);

  // Start match
  const startMatch = useCallback(() => {
    setScreen("ready");
    setArmPosition(0);
    armPosRef.current = 0;
    setTimeLeft(GAME_DURATION);
    timeLeftRef.current = GAME_DURATION;
    setClickCount(0);
    setCps(0);
    setResult(null);
    setCombo(0);
    setShowPower(false);
    clickTimesRef.current = [];
    setCountdown(3);
  }, []);

  // Countdown
  useEffect(() => {
    if (screen !== "ready" || countdown <= 0) return;
    const timer = setTimeout(() => {
      if (countdown === 1) {
        setCountdown(0);
        setScreen("playing");
        // Start game loop
        const startTime = Date.now();
        gameLoopRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, GAME_DURATION - elapsed);
          timeLeftRef.current = remaining;
          setTimeLeft(remaining);

          // Calculate current CPS
          const now = Date.now();
          const recentClicks = clickTimesRef.current.filter((t) => now - t < 1000);
          const currentCps = recentClicks.length;
          setCps(currentCps);

          // Effective player power (CPS + bonus)
          const playerPower = currentCps + powerBonus * 0.3;
          // Opponent pushes back
          const opponentPower = selectedOpponent.strength;

          // Move arm based on difference
          const diff = (playerPower - opponentPower) * 0.8;
          armPosRef.current = Math.max(-ARM_RANGE, Math.min(ARM_RANGE, armPosRef.current + diff * (TICK_MS / 1000) * 3));
          setArmPosition(armPosRef.current);

          // Shaking effect when close to center
          setShaking(Math.abs(armPosRef.current) < 20 && currentCps > 0);

          if (remaining <= 0) {
            clearGameLoop();
            // Determine result
            const finalPos = armPosRef.current;
            let res: "win" | "lose" | "draw";
            if (finalPos > 15) res = "win";
            else if (finalPos < -15) res = "lose";
            else res = "draw";

            setResult(res);
            if (res === "win") {
              setGold((g) => g + selectedOpponent.reward);
              setTotalWins((w) => w + 1);
              setStreak((s) => s + 1);
              const oppIdx = OPPONENTS.findIndex((o) => o.id === selectedOpponent.id);
              if (oppIdx > bestOpponent) setBestOpponent(oppIdx);
            } else if (res === "lose") {
              setTotalLosses((l) => l + 1);
              setStreak(0);
            } else {
              setStreak(0);
            }
            setScreen("result");
          }
        }, TICK_MS);
      } else {
        setCountdown(countdown - 1);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [screen, countdown, selectedOpponent, powerBonus, clearGameLoop]);

  // Handle click/tap
  const handleClick = useCallback(() => {
    if (screen !== "playing") return;
    const now = Date.now();
    clickTimesRef.current.push(now);
    // Keep only last 2 seconds of clicks
    clickTimesRef.current = clickTimesRef.current.filter((t) => now - t < 2000);
    setClickCount((c) => c + 1);

    // Combo system
    setCombo((c) => c + 1);
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => setCombo(0), 400);

    // Power flash on fast clicking
    if (clickTimesRef.current.filter((t) => now - t < 500).length >= 4) {
      setShowPower(true);
      setTimeout(() => setShowPower(false), 200);
    }
  }, [screen]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleClick();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleClick]);

  // Buy upgrade
  const buyUpgrade = (upgradeId: string) => {
    const upgrade = UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade || ownedUpgrades.includes(upgradeId) || gold < upgrade.cost) return;
    setGold((g) => g - upgrade.cost);
    setOwnedUpgrades((prev) => [...prev, upgradeId]);
  };

  // Arm visual angle: -45deg (losing) to +45deg (winning)
  const armAngle = (armPosition / ARM_RANGE) * 45;
  // Color based on position
  const getArmColor = () => {
    if (armPosition > 30) return "text-green-400";
    if (armPosition < -30) return "text-red-400";
    return "text-yellow-400";
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-amber-950 via-orange-950 to-slate-950 text-white">
      <style jsx global>{`
        @keyframes armShake {
          0%, 100% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(-2px) translateY(1px); }
          50% { transform: translateX(2px) translateY(-1px); }
          75% { transform: translateX(-1px) translateY(2px); }
        }
        .arm-shake { animation: armShake 0.1s linear infinite; }
        @keyframes powerFlash {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(2); }
        }
        .power-flash { animation: powerFlash 0.3s ease-out; }
        @keyframes popNumber {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); opacity: 1; }
        }
        .pop-number { animation: popNumber 0.3s ease-out; }
        @keyframes winCelebrate {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        .win-celebrate { animation: winCelebrate 0.5s ease-in-out 3; }
        @keyframes pulseBtn {
          0%, 100% { box-shadow: 0 0 15px rgba(255,150,0,0.4); }
          50% { box-shadow: 0 0 40px rgba(255,150,0,0.8); }
        }
        .pulse-btn { animation: pulseBtn 0.8s ease-in-out infinite; }
      `}</style>

      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">
            ← 홈
          </Link>
          <div className="text-7xl">💪</div>
          <h1 className="text-5xl font-black">
            <span className="bg-gradient-to-r from-amber-400 to-red-400 bg-clip-text text-transparent">팔씨름</span>
          </h1>
          <p className="text-lg text-slate-400">빠르게 클릭해서 이겨라!</p>

          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={() => setScreen("select")}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-red-500 px-12 py-4 text-xl font-black shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              🤜 대전하기
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-white/5 px-6 py-4 backdrop-blur space-y-1">
            <p className="text-sm text-slate-400">💰 골드: <span className="font-bold text-yellow-400">{gold}</span></p>
            <p className="text-sm text-slate-400">🏆 전적: <span className="font-bold text-green-400">{totalWins}승</span> <span className="font-bold text-red-400">{totalLosses}패</span></p>
            {streak > 1 && <p className="text-sm text-slate-400">🔥 연승: <span className="font-bold text-orange-400">{streak}</span></p>}
            <p className="text-sm text-slate-400">💪 파워 보너스: <span className="font-bold text-amber-400">+{powerBonus.toFixed(1)}</span></p>
          </div>

          {/* Upgrades */}
          <div className="mt-4 w-full max-w-sm">
            <p className="mb-3 text-sm font-bold text-amber-400">🛒 강화</p>
            <div className="space-y-2">
              {UPGRADES.map((u) => {
                const owned = ownedUpgrades.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => buyUpgrade(u.id)}
                    disabled={owned || gold < u.cost}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                      owned
                        ? "border-green-500/30 bg-green-500/10 opacity-60"
                        : gold >= u.cost
                        ? "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 hover:scale-[1.02] active:scale-95"
                        : "border-gray-700 bg-gray-900/50 opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <span className="text-2xl">{u.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.desc}</p>
                    </div>
                    {owned ? (
                      <span className="text-xs text-green-400 font-bold">보유중</span>
                    ) : (
                      <span className="text-xs text-yellow-400 font-bold">{u.cost}💰</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Opponent Select */}
      {screen === "select" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <h2 className="text-2xl font-black">🤜 상대 선택</h2>
          <p className="text-sm text-slate-400">💪 내 파워 보너스: +{powerBonus.toFixed(1)}</p>
          <div className="grid w-full max-w-sm grid-cols-2 gap-3">
            {OPPONENTS.map((opp, i) => {
              const beaten = i <= bestOpponent && totalWins > 0;
              return (
                <button
                  key={opp.id}
                  onClick={() => {
                    setSelectedOpponent(opp);
                    startMatch();
                  }}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all hover:scale-105 active:scale-95 ${
                    beaten
                      ? "border-green-500/50 bg-green-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/30"
                  }`}
                >
                  <span className="text-3xl">{opp.emoji}</span>
                  <span className="text-sm font-bold">{opp.name}</span>
                  <span className="text-[10px] text-slate-400">{opp.desc}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-red-400">💪{opp.strength}</span>
                    <span className="text-yellow-400">🏆{opp.reward}💰</span>
                  </div>
                  {beaten && <span className="text-[10px] text-green-400">✅ 클리어</span>}
                </button>
              );
            })}
          </div>
          <button onClick={() => setScreen("menu")} className="mt-2 text-sm text-slate-500 hover:text-white">
            ← 뒤로
          </button>
        </div>
      )}

      {/* Ready / Countdown */}
      {screen === "ready" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center">
              <span className="text-5xl">🙋</span>
              <span className="mt-2 font-bold text-cyan-400">나</span>
              <span className="text-xs text-slate-400">💪+{powerBonus.toFixed(1)}</span>
            </div>
            <span className="text-4xl font-black text-amber-400">VS</span>
            <div className="flex flex-col items-center">
              <span className="text-5xl">{selectedOpponent.emoji}</span>
              <span className="mt-2 font-bold text-red-400">{selectedOpponent.name}</span>
              <span className="text-xs text-slate-400">💪{selectedOpponent.strength}</span>
            </div>
          </div>
          {countdown > 0 && (
            <div className="pop-number text-8xl font-black text-amber-400">{countdown}</div>
          )}
        </div>
      )}

      {/* Playing */}
      {screen === "playing" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          {/* Timer */}
          <div className="w-full max-w-sm">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>⏱️ {(timeLeft / 1000).toFixed(1)}초</span>
              <span>클릭: {clickCount} | CPS: {cps}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-800">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  timeLeft > GAME_DURATION * 0.5 ? "bg-green-500" :
                  timeLeft > GAME_DURATION * 0.25 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
              />
            </div>
          </div>

          {/* VS display */}
          <div className="flex items-center gap-6 text-sm">
            <span className="text-cyan-400 font-bold">🙋 나</span>
            <span className="text-slate-500">vs</span>
            <span className="text-red-400 font-bold">{selectedOpponent.emoji} {selectedOpponent.name}</span>
          </div>

          {/* Arm Wrestling Visual */}
          <div className={`relative flex items-center justify-center ${shaking ? "arm-shake" : ""}`}>
            {/* Power flash effect */}
            {showPower && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="power-flash text-6xl text-yellow-300">💥</div>
              </div>
            )}

            {/* Arms visual */}
            <div className="relative h-48 w-72 flex items-center justify-center">
              {/* Background bar */}
              <div className="absolute h-8 w-64 rounded-full bg-gray-800 overflow-hidden">
                {/* Player side (right = winning) */}
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-500 to-green-400 transition-all duration-100"
                  style={{ width: `${50 + (armPosition / ARM_RANGE) * 50}%` }}
                />
                {/* Center line */}
                <div className="absolute left-1/2 top-0 h-full w-0.5 bg-white/50 -translate-x-px" />
              </div>

              {/* Moving indicator (hands) */}
              <div
                className="absolute transition-all duration-100 flex items-center"
                style={{ left: `${14 + ((armPosition + ARM_RANGE) / (ARM_RANGE * 2)) * 72}%` }}
              >
                <span className="text-4xl" style={{ transform: "scaleX(-1)" }}>🤜</span>
                <span className="text-4xl">🤛</span>
              </div>

              {/* Player emoji (left side) */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <span className="text-3xl">🙋</span>
              </div>
              {/* Opponent emoji (right side) */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                <span className="text-3xl">{selectedOpponent.emoji}</span>
              </div>
            </div>
          </div>

          {/* Position indicator */}
          <div className={`text-lg font-black ${getArmColor()}`}>
            {armPosition > 30 ? "이기고 있어요! 💪" :
             armPosition < -30 ? "지고 있어요! 😰" :
             "팽팽해요! 😤"}
          </div>

          {/* Combo display */}
          {combo > 3 && (
            <div className="pop-number text-lg font-black text-orange-400">
              🔥 {combo} COMBO!
            </div>
          )}

          {/* Click Button */}
          <button
            onClick={handleClick}
            onPointerDown={(e) => { e.preventDefault(); handleClick(); }}
            className={`pulse-btn mt-2 select-none rounded-3xl bg-gradient-to-r from-amber-500 to-red-500 px-20 py-8 text-3xl font-black shadow-2xl transition-transform active:scale-90 ${
              cps > 8 ? "from-red-500 to-pink-500" : ""
            }`}
          >
            👊 눌러!
          </button>
          <p className="text-xs text-slate-500">스페이스바 또는 엔터키도 가능!</p>
        </div>
      )}

      {/* Result */}
      {screen === "result" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          {result === "win" ? (
            <>
              <div className="win-celebrate text-7xl">🏆</div>
              <h2 className="text-4xl font-black text-amber-400">승리!</h2>
              <p className="text-lg text-green-300">{selectedOpponent.emoji} {selectedOpponent.name}을(를) 이겼어요!</p>
              <p className="text-yellow-400 font-bold text-xl">+{selectedOpponent.reward} 💰</p>
            </>
          ) : result === "lose" ? (
            <>
              <div className="text-7xl">😭</div>
              <h2 className="text-4xl font-black text-red-400">패배...</h2>
              <p className="text-lg text-slate-300">{selectedOpponent.emoji} {selectedOpponent.name}에게 졌어요</p>
            </>
          ) : (
            <>
              <div className="text-7xl">🤝</div>
              <h2 className="text-4xl font-black text-yellow-400">무승부!</h2>
              <p className="text-lg text-slate-300">팽팽한 승부였어요!</p>
            </>
          )}

          <div className="rounded-xl bg-white/5 px-8 py-4 space-y-2">
            <p>👊 총 클릭: <span className="font-bold text-cyan-400">{clickCount}</span></p>
            <p>⚡ 최대 CPS: <span className="font-bold text-orange-400">{cps}</span></p>
            <p>💪 상대 강도: <span className="font-bold text-red-400">{selectedOpponent.strength}</span></p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={startMatch}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-red-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95"
            >
              🔄 재도전
            </button>
            <button
              onClick={() => setScreen("select")}
              className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95"
            >
              상대 선택
            </button>
            <button
              onClick={() => setScreen("menu")}
              className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95"
            >
              메뉴
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
