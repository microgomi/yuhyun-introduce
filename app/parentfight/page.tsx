"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ═══════════════════════════════════════
   부부싸움 막기
   ═══════════════════════════════════════ */

interface Argument {
  id: number;
  emoji: string;
  text: string;
  x: number;
  y: number;
  speed: number;
  fromDad: boolean; // true=아빠→엄마, false=엄마→아빠
  blocked: boolean;
}

const DAD_WORDS = [
  "😤 왜 맨날 잔소리야!",
  "🤬 내가 뭘 잘못했는데!",
  "😡 아 좀 그만해!",
  "💢 나도 힘들어!",
  "😠 또 시작이야?",
  "🗯️ 말이 되는 소리를!",
  "😤 집안일 내가 다 해!",
  "🤯 어휴 답답해!",
];

const MOM_WORDS = [
  "😤 당신이 뭘 알아!",
  "🤬 설거지 좀 해!",
  "😡 맨날 게임만 해!",
  "💢 아이들 좀 봐!",
  "😠 나만 고생이야!",
  "🗯️ 대체 뭘 한 거야!",
  "😤 치워 좀!",
  "🤯 한심하다 정말!",
];

const SHIELD_WORDS = [
  "🥺 싸우지 마세요...",
  "😭 제발 화해해요!",
  "🤗 사랑해요~",
  "💕 우리 가족이잖아요",
  "🥹 둘 다 최고예요!",
  "😊 웃어요~",
  "💖 힘내세요!",
  "🙏 제발요...",
];

const RECONCILE_ITEMS = [
  { emoji: "💐", name: "꽃다발", power: 15 },
  { emoji: "🍰", name: "케이크", power: 20 },
  { emoji: "💌", name: "편지", power: 10 },
  { emoji: "🎁", name: "선물", power: 25 },
  { emoji: "☕", name: "커피", power: 10 },
  { emoji: "🧸", name: "인형", power: 15 },
];

type Screen = "menu" | "playing" | "result";

export default function ParentFightGame() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [score, setScore] = useState(0);
  const [angerLevel, setAngerLevel] = useState(50); // 0=화해, 100=대폭발
  const [loveLevel, setLoveLevel] = useState(0);    // 100이면 완전 화해
  const [arguments_, setArguments] = useState<Argument[]>([]);
  const [blockedCount, setBlockedCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [combo, setCombo] = useState(0);
  const [shieldActive, setShieldActive] = useState(false);
  const [shieldText, setShieldText] = useState("");
  const [playerY, setPlayerY] = useState(50); // 퍼센트
  const [reconcileItems, setReconcileItems] = useState<{ id: number; emoji: string; x: number; y: number; power: number }[]>([]);
  const [showHeart, setShowHeart] = useState(false);
  const [bestScore, setBestScore] = useState(0);
  const [dadMood, setDadMood] = useState<"angry" | "normal" | "happy">("angry");
  const [momMood, setMomMood] = useState<"angry" | "normal" | "happy">("angry");
  const [shakeScreen, setShakeScreen] = useState(false);
  const idRef = useRef(0);
  const boardRef = useRef<HTMLDivElement>(null);

  // 말풍선 생성
  useEffect(() => {
    if (screen !== "playing") return;
    const interval = setInterval(() => {
      const fromDad = Math.random() < 0.5;
      const words = fromDad ? DAD_WORDS : MOM_WORDS;
      const id = idRef.current++;
      setArguments(prev => [...prev, {
        id,
        emoji: "",
        text: words[Math.floor(Math.random() * words.length)],
        x: fromDad ? 0 : 100,
        y: 20 + Math.random() * 60,
        speed: 1.5 + Math.random() * 2 + (60 - timeLeft) * 0.03,
        fromDad,
        blocked: false,
      }]);
    }, 1200 - Math.min(800, (60 - timeLeft) * 12));
    return () => clearInterval(interval);
  }, [screen, timeLeft]);

  // 화해 아이템 생성
  useEffect(() => {
    if (screen !== "playing") return;
    const interval = setInterval(() => {
      const item = RECONCILE_ITEMS[Math.floor(Math.random() * RECONCILE_ITEMS.length)];
      const id = idRef.current++;
      setReconcileItems(prev => [...prev, {
        id,
        emoji: item.emoji,
        x: 20 + Math.random() * 60,
        y: -5,
        power: item.power,
      }]);
    }, 4000);
    return () => clearInterval(interval);
  }, [screen]);

  // 말풍선 이동
  useEffect(() => {
    if (screen !== "playing") return;
    const interval = setInterval(() => {
      setArguments(prev => {
        const updated = prev.map(a => {
          if (a.blocked) return a;
          return {
            ...a,
            x: a.fromDad ? a.x + a.speed : a.x - a.speed,
          };
        });
        // 막지 못한 말풍선 체크
        const escaped = updated.filter(a => !a.blocked && ((a.fromDad && a.x > 95) || (!a.fromDad && a.x < 5)));
        if (escaped.length > 0) {
          setAngerLevel(prev => Math.min(100, prev + escaped.length * 5));
          setCombo(0);
          setShakeScreen(true);
          setTimeout(() => setShakeScreen(false), 300);
        }
        return updated.filter(a => {
          if (a.blocked) return false;
          if (a.fromDad && a.x > 100) return false;
          if (!a.fromDad && a.x < 0) return false;
          return true;
        });
      });
    }, 50);
    return () => clearInterval(interval);
  }, [screen]);

  // 화해 아이템 이동
  useEffect(() => {
    if (screen !== "playing") return;
    const interval = setInterval(() => {
      setReconcileItems(prev =>
        prev.map(i => ({ ...i, y: i.y + 0.8 })).filter(i => i.y < 105)
      );
    }, 50);
    return () => clearInterval(interval);
  }, [screen]);

  // 타이머
  useEffect(() => {
    if (screen !== "playing") return;
    if (timeLeft <= 0 || angerLevel >= 100 || loveLevel >= 100) {
      const won = loveLevel >= 100 || (angerLevel < 100 && timeLeft <= 0);
      if (score > bestScore) setBestScore(score);
      setScreen("result");
      return;
    }
    const t = setTimeout(() => setTimeLeft(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, timeLeft, angerLevel, loveLevel]);

  // 분노/사랑 기반 표정
  useEffect(() => {
    if (angerLevel < 30) { setDadMood("happy"); setMomMood("happy"); }
    else if (angerLevel < 70) { setDadMood("normal"); setMomMood("normal"); }
    else { setDadMood("angry"); setMomMood("angry"); }
  }, [angerLevel]);

  // 말풍선 막기 (클릭/터치)
  const blockArgument = useCallback((id: number) => {
    setArguments(prev => prev.map(a => a.id === id ? { ...a, blocked: true } : a));
    const newCombo = combo + 1;
    setCombo(newCombo);
    setBlockedCount(b => b + 1);
    const points = 10 * Math.min(5, newCombo);
    setScore(s => s + points);
    setAngerLevel(prev => Math.max(0, prev - 3));
    setLoveLevel(prev => Math.min(100, prev + 1));

    // 방패말 표시
    const shield = SHIELD_WORDS[Math.floor(Math.random() * SHIELD_WORDS.length)];
    setShieldText(shield);
    setShieldActive(true);
    setTimeout(() => setShieldActive(false), 800);
  }, [combo]);

  // 화해 아이템 획득
  const collectItem = useCallback((id: number, power: number) => {
    setReconcileItems(prev => prev.filter(i => i.id !== id));
    setLoveLevel(prev => Math.min(100, prev + power));
    setAngerLevel(prev => Math.max(0, prev - power));
    setScore(s => s + power * 2);
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 500);
  }, []);

  // 플레이어 이동
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPlayerY(Math.max(10, Math.min(90, y)));
  }, []);

  const startGame = () => {
    setScreen("playing");
    setScore(0);
    setAngerLevel(50);
    setLoveLevel(0);
    setArguments([]);
    setBlockedCount(0);
    setTimeLeft(60);
    setCombo(0);
    setReconcileItems([]);
    setPlayerY(50);
  };

  const won = loveLevel >= 100 || angerLevel < 100;

  /* ═══ 메뉴 ═══ */
  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-950 via-red-950 to-gray-950 flex flex-col items-center justify-center p-6 text-white">
        <Link href="/" className="absolute top-4 left-4 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2 text-sm">← 홈으로</Link>
        <div className="text-center">
          <div className="flex justify-center gap-4 text-6xl mb-4">
            <span>👨</span><span className="animate-pulse">💥</span><span>👩</span>
          </div>
          <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-pink-400 to-red-400 bg-clip-text text-transparent">
            부부싸움 막기
          </h1>
          <p className="text-gray-400 mb-8 text-sm">엄마 아빠의 말풍선을 막아서 화해시키세요!</p>

          <button onClick={startGame}
            className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-400 hover:to-red-400 text-white font-bold text-xl px-10 py-4 rounded-2xl shadow-lg shadow-red-500/30 transition-all hover:scale-105 active:scale-95">
            시작하기! 🛡️
          </button>

          {bestScore > 0 && <p className="mt-4 text-yellow-400">🏆 최고 점수: {bestScore}점</p>}

          <div className="mt-8 bg-white/5 rounded-2xl p-5 max-w-sm text-left text-xs text-gray-400 space-y-1">
            <p className="font-bold text-gray-300 text-center mb-2">🎮 게임 방법</p>
            <p>• 아빠↔엄마 사이를 날아다니는 <strong>말풍선을 터치</strong>해서 막으세요</p>
            <p>• 떨어지는 <strong>화해 아이템</strong>(💐🍰🎁)을 터치해서 모으세요</p>
            <p>• <strong>분노 게이지</strong>가 100%가 되면 게임 오버!</p>
            <p>• <strong>사랑 게이지</strong>를 100%로 채우면 화해 성공!</p>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ 결과 ═══ */
  if (screen === "result") {
    const success = loveLevel >= 100 || angerLevel < 100;
    return (
      <div className={`min-h-screen ${success ? "bg-gradient-to-b from-pink-900 via-purple-900 to-gray-950" : "bg-gradient-to-b from-red-950 via-gray-950 to-black"} flex flex-col items-center justify-center p-6 text-white`}>
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-4">{loveLevel >= 100 ? "💕" : angerLevel >= 100 ? "💥" : "😊"}</div>
          <h2 className="text-3xl font-black mb-2">
            {loveLevel >= 100 ? "화해 성공!!" : angerLevel >= 100 ? "대폭발..." : "시간 종료!"}
          </h2>
          <p className="text-gray-400 mb-6">
            {loveLevel >= 100 ? "엄마 아빠가 다시 사이좋아졌어요!" : angerLevel >= 100 ? "집이 난리가 났어요..." : "그래도 잘 막았어요!"}
          </p>

          <div className="bg-white/10 rounded-2xl p-5 mb-6 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-400">점수</span><span className="text-yellow-400 font-bold">⭐ {score}점</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">막은 말풍선</span><span className="text-cyan-400 font-bold">🛡️ {blockedCount}개</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">사랑 게이지</span><span className="text-pink-400 font-bold">💕 {Math.floor(loveLevel)}%</span></div>
          </div>

          <div className="flex gap-3">
            <button onClick={startGame}
              className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-400 hover:to-red-400 rounded-xl py-3 font-bold transition-all hover:scale-105">
              다시 하기 🔄
            </button>
            <Link href="/"
              className="flex-1 bg-white/10 hover:bg-white/20 rounded-xl py-3 font-bold text-center transition-all hover:scale-105">
              홈으로 🏠
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ 플레이 ═══ */
  return (
    <div className={`min-h-screen bg-gradient-to-b from-amber-950 via-stone-900 to-gray-950 text-white flex flex-col ${shakeScreen ? "animate-shake" : ""}`}>
      {/* HUD */}
      <div className="px-3 py-2 bg-black/40 border-b border-white/10">
        <div className="flex justify-between items-center text-xs mb-1">
          <Link href="/" className="text-gray-400">← 홈</Link>
          <span className="bg-white/10 px-2 py-1 rounded-lg">⭐ {score} | 🔥 x{combo}</span>
          <span className={`px-2 py-1 rounded-lg ${timeLeft <= 10 ? "bg-red-500/50 animate-pulse" : "bg-white/10"}`}>⏱️ {timeLeft}초</span>
        </div>
        {/* 분노 게이지 */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-red-400 w-12">😡 분노</span>
          <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${angerLevel > 70 ? "bg-red-500 animate-pulse" : angerLevel > 40 ? "bg-orange-500" : "bg-yellow-500"}`}
              style={{ width: `${angerLevel}%` }} />
          </div>
          <span className="text-[10px] text-gray-400 w-8">{Math.floor(angerLevel)}%</span>
        </div>
        {/* 사랑 게이지 */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-pink-400 w-12">💕 사랑</span>
          <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-500 to-red-400 rounded-full transition-all duration-300"
              style={{ width: `${loveLevel}%` }} />
          </div>
          <span className="text-[10px] text-gray-400 w-8">{Math.floor(loveLevel)}%</span>
        </div>
      </div>

      {/* 게임 보드 */}
      <div ref={boardRef} className="flex-1 relative overflow-hidden select-none"
        onPointerMove={handlePointerMove}
        style={{ touchAction: "none" }}>

        {/* 거실 배경 */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-amber-900/30 to-transparent" />
        {/* 소파 */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-4xl opacity-20">🛋️</div>

        {/* 아빠 */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-center">
          <div className="text-5xl mb-1">{dadMood === "angry" ? "😡" : dadMood === "happy" ? "😊" : "😐"}</div>
          <span className="text-[10px] text-gray-400 bg-black/30 px-2 py-0.5 rounded">아빠</span>
        </div>

        {/* 엄마 */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-center">
          <div className="text-5xl mb-1">{momMood === "angry" ? "😤" : momMood === "happy" ? "🥰" : "😐"}</div>
          <span className="text-[10px] text-gray-400 bg-black/30 px-2 py-0.5 rounded">엄마</span>
        </div>

        {/* 플레이어 (아이) */}
        <div className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-100"
          style={{ top: `${playerY}%`, transform: "translate(-50%, -50%)" }}>
          <div className="text-4xl">🧒</div>
          {shieldActive && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-blue-500/80 text-white text-[10px] px-2 py-1 rounded-full animate-bounce">
              {shieldText}
            </div>
          )}
        </div>

        {/* 하트 이펙트 */}
        {showHeart && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl animate-ping z-30">
            💖
          </div>
        )}

        {/* 말풍선 */}
        {arguments_.map(a => (
          <button key={a.id}
            className={`absolute z-10 px-2 py-1 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
              a.blocked ? "opacity-0 scale-0" :
              a.fromDad ? "bg-blue-600/80 border border-blue-400/50" : "bg-pink-600/80 border border-pink-400/50"
            } hover:scale-110 active:scale-75 cursor-pointer`}
            style={{
              left: `${a.x}%`,
              top: `${a.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            onClick={() => blockArgument(a.id)}>
            {a.text}
          </button>
        ))}

        {/* 화해 아이템 */}
        {reconcileItems.map(item => (
          <button key={item.id}
            className="absolute z-10 text-3xl hover:scale-125 active:scale-75 transition-all cursor-pointer animate-bounce"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: "translate(-50%, -50%)",
              animationDuration: "1s",
            }}
            onClick={() => collectItem(item.id, item.power)}>
            {item.emoji}
          </button>
        ))}
      </div>

      <style jsx>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  );
}
