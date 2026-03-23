"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const GAMES = [
  { emoji: "🏗️", title: "건축하기", href: "/building" },
  { emoji: "🤝", title: "친구와 함께", href: "/friends" },
  { emoji: "🦁", title: "우노 게임", href: "/onecard" },
  { emoji: "💥", title: "블록 블라스트", href: "/blockblast" },
  { emoji: "🎮", title: "포켓몬 GO", href: "/pokemon" },
  { emoji: "🥷", title: "주츠 인피니티", href: "/jutsu" },
  { emoji: "👁️", title: "주술회전", href: "/jujutsu" },
  { emoji: "⛏️", title: "마인크래프트", href: "/minecraft" },
  { emoji: "🔪", title: "마피아", href: "/mafia" },
  { emoji: "🐱", title: "냥코대전쟁", href: "/battlecats" },
  { emoji: "🔫", title: "탕탕특공대", href: "/tangtang" },
  { emoji: "🎮", title: "로블록스", href: "/roblox" },
  { emoji: "🔩", title: "나사 빼기", href: "/screw" },
  { emoji: "🔴", title: "세포특공대", href: "/cell" },
  { emoji: "🚪", title: "도어즈", href: "/doors" },
  { emoji: "🧩", title: "퍼즐 게임", href: "/puzzle" },
  { emoji: "🐱", title: "고양이 지키기", href: "/catguard" },
  { emoji: "🥋", title: "태권도", href: "/taekwondo" },
  { emoji: "👀", title: "눈치 게임", href: "/nunchi" },
  { emoji: "👏", title: "369 게임", href: "/369" },
  { emoji: "💪", title: "팔씨름", href: "/armwrestle" },
  { emoji: "🔪", title: "칼 게임", href: "/knife" },
  { emoji: "⚔️", title: "검투사", href: "/gladiator" },
  { emoji: "🍎", title: "사과 깎기", href: "/apple" },
  { emoji: "🔨", title: "검 강화", href: "/forge" },
  { emoji: "👨‍🍳", title: "요리왕", href: "/cooking" },
  { emoji: "🏄", title: "서핑", href: "/surfing" },
  { emoji: "🎵", title: "리듬게임", href: "/rhythm" },
  { emoji: "🍦", title: "아이스크림 가게", href: "/icecream" },
  { emoji: "🏃", title: "형한테서 도망치기", href: "/runaway" },
  { emoji: "🤚", title: "엄마의 등짝 스매싱", href: "/momsmash" },
  { emoji: "🤖", title: "로봇 합체", href: "/robotmerge" },
  { emoji: "🪐", title: "행성 키우기", href: "/planet" },
  { emoji: "🏫", title: "학교 가기", href: "/school" },
  { emoji: "🚘", title: "차 피하기", href: "/cardodge" },
  { emoji: "🕵️", title: "아빠 몰래 게임해라", href: "/secretgame" },
  { emoji: "💆", title: "아빠 주물러주기", href: "/massage" },
  { emoji: "🍞", title: "빵 먹기", href: "/bread" },
  { emoji: "🦸", title: "히어로 되기", href: "/hero" },
  { emoji: "🎰", title: "히어로 뽑기", href: "/herogacha" },
  { emoji: "🖥️", title: "컴퓨터 만들기", href: "/computer" },
  { emoji: "🍉", title: "수박 만들기", href: "/watermelon" },
  { emoji: "🧵", title: "실뜨기", href: "/catscradle" },
  { emoji: "🍚", title: "밥 먹이기", href: "/feeding" },
  { emoji: "📱", title: "앱 만들기", href: "/appmaker" },
  { emoji: "😈", title: "형 괴롭히기", href: "/annoybro" },
  { emoji: "👻", title: "동생 놀래키기", href: "/scaresis" },
  { emoji: "⚔️", title: "RPG 모험", href: "/rpg" },
  { emoji: "🌍", title: "세상 창조하기", href: "/worldcreator" },
  { emoji: "⭐", title: "별 진화시키기", href: "/starevolution" },
  { emoji: "📺", title: "아빠한테 리모콘 빼앗기", href: "/remotedad" },
  { emoji: "🦷", title: "치과의사", href: "/dentist" },
  { emoji: "🧸", title: "파피 플레이타임", href: "/poppy" },
  { emoji: "🏗️", title: "건축 퍼즐", href: "/architect" },
  { emoji: "🪵", title: "젠가", href: "/jenga" },
  { emoji: "🎮", title: "프로게이머", href: "/progamer" },
  { emoji: "🔴", title: "피구왕", href: "/dodgeball" },
  { emoji: "💩", title: "똥 대작전", href: "/poop" },
  { emoji: "🛁", title: "씻기 싫어! 떼쓰기", href: "/nobath" },
  { emoji: "🤐", title: "아빠 입막기", href: "/shutdad" },
  { emoji: "🧒", title: "나의 하루", href: "/reallife" },
  { emoji: "🦸", title: "히어로 만들기", href: "/herocreator" },
  { emoji: "🪑", title: "가구 만들기", href: "/furniture" },
  { emoji: "📱", title: "게임 개발자", href: "/gamedev" },
  { emoji: "🌍", title: "언어 만들기", href: "/language" },
  { emoji: "🔪", title: "어몽어스", href: "/amongus" },
  { emoji: "🐍", title: "스네이크", href: "/snake" },
  { emoji: "🔌", title: "전선 연결하기", href: "/wire" },
  { emoji: "🏃", title: "탈출하기", href: "/escape" },
  { emoji: "💥", title: "부부싸움 막기", href: "/parentfight" },
  { emoji: "👑", title: "왕 되기", href: "/king" },
  { emoji: "🧱", title: "레고 조립하기", href: "/lego" },
  { emoji: "⚔️", title: "검 만들기", href: "/swordcraft" },
  { emoji: "🧹", title: "엄마 청소 못하게", href: "/stopmomclean" },
  { emoji: "💎", title: "귀한 물건 만들기", href: "/precious" },
  { emoji: "💾", title: "USB 만들기", href: "/usb" },
  { emoji: "🤖", title: "AI 만들기", href: "/aimaker" },
  { emoji: "📸", title: "사진 찍기", href: "/photo" },
  { emoji: "🚗", title: "자동차 만들기", href: "/carmaker" },
];

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

function Confetti() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const colors = [
      "#ff0000", "#ff8800", "#ffff00", "#00ff00",
      "#00aaff", "#8800ff", "#ff00ff", "#ff4488",
      "#00ffcc", "#ffaa00",
    ];
    const newPieces: ConfettiPiece[] = [];
    for (let i = 0; i < 60; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        duration: 1.5 + Math.random() * 2,
        size: 6 + Math.random() * 10,
      });
    }
    setPieces(newPieces);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: "-20px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function Sparkles() {
  const [sparkles, setSparkles] = useState<
    { id: number; x: number; y: number; size: number; delay: number }[]
  >([]);

  useEffect(() => {
    const s = [];
    for (let i = 0; i < 20; i++) {
      s.push({
        id: i,
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
        size: 10 + Math.random() * 20,
        delay: Math.random() * 2,
      });
    }
    setSparkles(s);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {sparkles.map((s) => (
        <div
          key={s.id}
          className="absolute animate-sparkle-pop text-yellow-300"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            fontSize: `${s.size}px`,
            animationDelay: `${s.delay}s`,
          }}
        >
          ✦
        </div>
      ))}
    </div>
  );
}

export default function RandomGamePage() {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);
  const [selectedGame, setSelectedGame] = useState<(typeof GAMES)[number] | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [history, setHistory] = useState<(typeof GAMES)[number][]>([]);
  const [slotItems, setSlotItems] = useState<(typeof GAMES)[number][]>([
    GAMES[0],
    GAMES[1],
    GAMES[2],
  ]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getRandomGame = useCallback(() => {
    return GAMES[Math.floor(Math.random() * GAMES.length)];
  }, []);

  const spin = useCallback(() => {
    if (spinning) return;

    setSpinning(true);
    setShowResult(false);
    setShowConfetti(false);
    setSelectedGame(null);

    const finalGame = getRandomGame();
    let speed = 50;
    let elapsed = 0;
    const totalDuration = 3000;

    const tick = () => {
      elapsed += speed;

      setSlotItems([getRandomGame(), getRandomGame(), getRandomGame()]);

      if (elapsed >= totalDuration) {
        // Final landing
        const above = getRandomGame();
        const below = getRandomGame();
        setSlotItems([above, finalGame, below]);
        setSelectedGame(finalGame);
        setShowResult(true);
        setShowConfetti(true);
        setSpinning(false);
        setHistory((prev) => [finalGame, ...prev].slice(0, 5));

        setTimeout(() => setShowConfetti(false), 4000);
        return;
      }

      // Slow down in the last second
      if (elapsed > totalDuration - 1200) {
        speed = Math.min(speed + 15, 300);
      } else if (elapsed > totalDuration - 2000) {
        speed = Math.min(speed + 5, 150);
      }

      timeoutRef.current = setTimeout(tick, speed);
    };

    timeoutRef.current = setTimeout(tick, speed);
  }, [spinning, getRandomGame]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-pink-900 to-indigo-900 text-white">
      {showConfetti && <Confetti />}

      {/* Custom keyframes */}
      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.3);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall 3s ease-out forwards;
        }
        @keyframes sparkle-pop {
          0%, 100% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
        }
        .animate-sparkle-pop {
          animation: sparkle-pop 1.5s ease-in-out infinite;
        }
        @keyframes slot-blur {
          0% { transform: translateY(-100%); opacity: 0.3; }
          50% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0.3; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out forwards;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 255, 0, 0.3); }
          50% { box-shadow: 0 0 40px rgba(255, 255, 0, 0.8), 0 0 80px rgba(255, 200, 0, 0.4); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 1.5s ease-in-out infinite;
        }
        @keyframes rainbow-text {
          0% { color: #ff0000; }
          16% { color: #ff8800; }
          33% { color: #ffff00; }
          50% { color: #00ff00; }
          66% { color: #0088ff; }
          83% { color: #8800ff; }
          100% { color: #ff0000; }
        }
        .animate-rainbow {
          animation: rainbow-text 3s linear infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 2s ease-in-out infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.6s ease-in-out;
        }
        @keyframes slot-scroll {
          0% { transform: translateY(-33.33%); }
          100% { transform: translateY(33.33%); }
        }
        .animate-slot-scroll {
          animation: slot-scroll 0.1s linear infinite;
        }
      `}</style>

      {/* Back Button */}
      <div className="fixed left-4 top-4 z-40">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-105"
        >
          ← 홈으로
        </Link>
      </div>

      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-16">
        {/* Title */}
        <h1 className="mb-2 text-center text-5xl font-black sm:text-6xl animate-float">
          <span className="animate-rainbow">🎲 랜덤 게임</span>
        </h1>
        <p className="mb-10 text-center text-lg text-pink-200">
          어떤 게임을 할지 고민될 때! 룰렛을 돌려보세요!
        </p>

        {/* Slot Machine */}
        <div className="relative mb-8 w-full max-w-sm">
          {/* Machine frame */}
          <div className="relative overflow-hidden rounded-2xl border-4 border-yellow-400 bg-gradient-to-b from-gray-900 to-gray-800 shadow-2xl animate-pulse-glow">
            {/* Top decoration */}
            <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 py-2 text-sm font-black tracking-wider">
              ⭐ RANDOM GAME PICKER ⭐
            </div>

            {/* Slot window */}
            <div className="relative mx-4 my-4 overflow-hidden rounded-xl bg-black/50">
              {/* Selection indicator arrows */}
              <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-20 -translate-y-1/2">
                <div className="mx-auto flex items-center justify-between px-1">
                  <div className="text-2xl text-yellow-400">▶</div>
                  <div className="text-2xl text-yellow-400">◀</div>
                </div>
              </div>

              {/* Middle highlight bar */}
              <div className="pointer-events-none absolute left-2 right-2 top-1/2 z-10 -translate-y-1/2 h-[72px] rounded-lg border-2 border-yellow-400/80 bg-yellow-400/10" />

              {/* Slot items */}
              <div className="flex flex-col divide-y divide-white/5">
                {slotItems.map((game, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 px-6 py-5 transition-all duration-100 ${
                      idx === 1
                        ? "bg-white/10 text-white"
                        : "text-white/30"
                    } ${spinning ? "blur-[1px]" : ""} ${
                      idx === 1 && !spinning ? "blur-0" : ""
                    }`}
                  >
                    <span className={`text-3xl ${spinning && idx === 1 ? "" : ""}`}>
                      {game.emoji}
                    </span>
                    <span className={`text-lg font-bold truncate ${idx === 1 ? "text-xl" : ""}`}>
                      {game.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom decoration */}
            <div className="flex items-center justify-center gap-1 py-2">
              {["🔴", "🟡", "🟢", "🔵", "🟣"].map((dot, i) => (
                <span key={i} className="text-sm">
                  {dot}
                </span>
              ))}
            </div>
          </div>

          {showResult && <Sparkles />}
        </div>

        {/* Spin Button */}
        {!showResult ? (
          <button
            onClick={spin}
            disabled={spinning}
            className={`mb-6 transform rounded-full px-12 py-4 text-2xl font-black shadow-xl transition-all ${
              spinning
                ? "scale-95 bg-gray-600 text-gray-400 cursor-not-allowed animate-shake"
                : "bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 text-white hover:scale-110 hover:shadow-2xl active:scale-95"
            }`}
          >
            {spinning ? "돌아가는 중... 🌀" : "🎰 돌리기!"}
          </button>
        ) : null}

        {/* Result Section */}
        {showResult && selectedGame && (
          <div className="mb-6 w-full max-w-sm animate-bounce-in">
            <div className="rounded-2xl border-2 border-yellow-400 bg-gradient-to-r from-yellow-500/20 via-pink-500/20 to-purple-500/20 p-6 text-center backdrop-blur-sm">
              <p className="mb-2 text-sm font-bold text-yellow-300 uppercase tracking-widest">
                🎉 당첨! 🎉
              </p>
              <div className="mb-3 text-6xl">{selectedGame.emoji}</div>
              <h2 className="mb-4 text-3xl font-black text-white">
                {selectedGame.title}
              </h2>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href={selectedGame.href}
                  className="inline-block transform rounded-full bg-gradient-to-r from-green-400 to-emerald-500 px-8 py-3 text-xl font-black text-white shadow-lg transition-all hover:scale-110 hover:shadow-2xl"
                >
                  🚀 GO!
                </Link>
                <button
                  onClick={() => {
                    setShowResult(false);
                    setShowConfetti(false);
                    setTimeout(() => spin(), 100);
                  }}
                  className="inline-block transform rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 text-xl font-black text-white shadow-lg transition-all hover:scale-110 hover:shadow-2xl"
                >
                  🔄 다시 돌리기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <div className="w-full max-w-sm">
            <h3 className="mb-3 text-center text-lg font-bold text-pink-300">
              📜 최근 기록
            </h3>
            <div className="space-y-2">
              {history.map((game, idx) => (
                <Link
                  key={idx}
                  href={game.href}
                  className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 transition-all hover:bg-white/15 hover:scale-[1.02]"
                >
                  <span className="text-sm font-bold text-white/40">
                    {idx + 1}
                  </span>
                  <span className="text-2xl">{game.emoji}</span>
                  <span className="font-bold text-white/80">{game.title}</span>
                  <span className="ml-auto text-xs text-white/30">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Game count */}
        <p className="mt-8 text-center text-sm text-white/30">
          총 {GAMES.length}개의 게임 중에서 골라드려요!
        </p>
      </div>
    </div>
  );
}
