"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 똥 종류 ───── */
interface PoopType {
  id: string;
  name: string;
  emoji: string;
  rarity: number;     // 1~5
  power: number;
  smell: number;       // 냄새 (높을수록 강력)
  speed: number;       // 생산 속도
  score: number;
  unlockLevel: number;
  desc: string;
  color: string;
}

const POOP_TYPES: PoopType[] = [
  { id: "normal", name: "일반 똥", emoji: "💩", rarity: 1, power: 1, smell: 1, speed: 1, score: 5, unlockLevel: 1, desc: "기본 똥", color: "#92400e" },
  { id: "soft", name: "물렁 똥", emoji: "💩", rarity: 1, power: 1, smell: 2, speed: 1.5, score: 8, unlockLevel: 1, desc: "흐물흐물~", color: "#b45309" },
  { id: "hard", name: "딱딱 똥", emoji: "🪨", rarity: 2, power: 3, smell: 1, speed: 0.5, score: 12, unlockLevel: 2, desc: "돌처럼 딱딱!", color: "#78716c" },
  { id: "golden", name: "황금 똥", emoji: "✨", rarity: 3, power: 2, smell: 1, speed: 0.8, score: 25, unlockLevel: 3, desc: "반짝반짝 행운의 똥!", color: "#fbbf24" },
  { id: "rainbow", name: "무지개 똥", emoji: "🌈", rarity: 4, power: 2, smell: 3, speed: 1, score: 35, unlockLevel: 4, desc: "일곱 빛깔 똥!", color: "#ec4899" },
  { id: "ice", name: "얼음 똥", emoji: "🧊", rarity: 2, power: 2, smell: 0, speed: 1.2, score: 15, unlockLevel: 2, desc: "차가운 똥! 냄새 없음!", color: "#67e8f9" },
  { id: "fire", name: "불똥", emoji: "🔥", rarity: 3, power: 4, smell: 5, speed: 0.7, score: 30, unlockLevel: 3, desc: "매운 거 먹으면 나오는!", color: "#ef4444" },
  { id: "ghost", name: "유령 똥", emoji: "👻", rarity: 3, power: 1, smell: 0, speed: 2, score: 20, unlockLevel: 4, desc: "보이지 않는 똥!", color: "#e2e8f0" },
  { id: "giant", name: "거대 똥", emoji: "🏔️", rarity: 4, power: 5, smell: 8, speed: 0.3, score: 40, unlockLevel: 5, desc: "어마어마한 크기!", color: "#713f12" },
  { id: "diamond", name: "다이아 똥", emoji: "💎", rarity: 5, power: 3, smell: 0, speed: 0.5, score: 60, unlockLevel: 6, desc: "세상에서 가장 귀한 똥!", color: "#818cf8" },
  { id: "nuke", name: "핵똥", emoji: "☢️", rarity: 5, power: 10, smell: 10, speed: 0.2, score: 80, unlockLevel: 7, desc: "최종 병기... 핵똥!", color: "#84cc16" },
  { id: "cosmic", name: "우주 똥", emoji: "🪐", rarity: 5, power: 7, smell: 5, speed: 0.4, score: 100, unlockLevel: 8, desc: "은하계에서 온 전설의 똥!", color: "#7c3aed" },
];

/* ───── 화장실 (스테이지) ───── */
interface Toilet {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  multiplier: number;
  unlockLevel: number;
  cost: number;
  bgColor: string;
}

const TOILETS: Toilet[] = [
  { id: "school", name: "학교 화장실", emoji: "🏫", desc: "기본 화장실", multiplier: 1, unlockLevel: 1, cost: 0, bgColor: "from-amber-100 to-yellow-100" },
  { id: "home", name: "우리 집", emoji: "🏠", desc: "편안한 집 화장실", multiplier: 1.5, unlockLevel: 2, cost: 50, bgColor: "from-blue-100 to-cyan-100" },
  { id: "mall", name: "백화점", emoji: "🏬", desc: "깨끗한 백화점!", multiplier: 2, unlockLevel: 3, cost: 100, bgColor: "from-pink-100 to-purple-100" },
  { id: "hotel", name: "호텔", emoji: "🏨", desc: "5성급 화장실!", multiplier: 2.5, unlockLevel: 4, cost: 200, bgColor: "from-yellow-100 to-amber-100" },
  { id: "space", name: "우주 정거장", emoji: "🚀", desc: "무중력 화장실!", multiplier: 3, unlockLevel: 5, cost: 400, bgColor: "from-indigo-100 to-blue-100" },
  { id: "golden", name: "황금 화장실", emoji: "👑", desc: "황금으로 된 변기!", multiplier: 4, unlockLevel: 6, cost: 800, bgColor: "from-yellow-200 to-amber-200" },
  { id: "dimension", name: "이세계 화장실", emoji: "🌀", desc: "차원이 다른 화장실!", multiplier: 5, unlockLevel: 7, cost: 1500, bgColor: "from-purple-200 to-pink-200" },
];

/* ───── 음식 (똥 생산 부스트) ───── */
interface Food {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  boost: number;       // 생산 속도 배율
  duration: number;     // 효과 지속 (초)
  price: number;
  sideEffect?: string;
}

const FOODS: Food[] = [
  { id: "banana", name: "바나나", emoji: "🍌", desc: "순한 부스트!", boost: 1.5, duration: 15, price: 10 },
  { id: "yogurt", name: "요구르트", emoji: "🥛", desc: "장 건강에 좋아!", boost: 1.8, duration: 12, price: 15 },
  { id: "fiber", name: "식이섬유", emoji: "🥦", desc: "쑥쑥 나와!", boost: 2, duration: 10, price: 20 },
  { id: "spicy", name: "매운 떡볶이", emoji: "🌶️", desc: "매워서 급해!!", boost: 3, duration: 8, price: 30, sideEffect: "불똥 확률 UP!" },
  { id: "curry", name: "카레", emoji: "🍛", desc: "카레 파워!", boost: 2.5, duration: 12, price: 25 },
  { id: "milk", name: "우유 폭탄", emoji: "🥛", desc: "배가 꾸르륵~!", boost: 4, duration: 6, price: 40, sideEffect: "물렁똥 확률 UP!" },
  { id: "beans", name: "콩 요리", emoji: "🫘", desc: "방귀와 함께!", boost: 3.5, duration: 10, price: 35 },
  { id: "mystery", name: "수상한 음식", emoji: "❓", desc: "뭐가 나올지 모름!", boost: 5, duration: 5, price: 50, sideEffect: "랜덤 효과!" },
];

/* ───── 상점 ───── */
interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  price: number;
  effectType: "production" | "quality" | "smell" | "auto" | "luck";
  value: number;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: "toilet_paper", name: "고급 휴지", emoji: "🧻", desc: "생산 속도 +20%", price: 40, effectType: "production", value: 20 },
  { id: "bidet", name: "비데", emoji: "🚿", desc: "똥 품질 +1", price: 60, effectType: "quality", value: 1 },
  { id: "air", name: "방향제", emoji: "🌸", desc: "냄새 파워 +30%", price: 50, effectType: "smell", value: 30 },
  { id: "auto1", name: "자동 생산기", emoji: "🤖", desc: "1초마다 자동 생산!", price: 100, effectType: "auto", value: 1 },
  { id: "premium_paper", name: "프리미엄 휴지", emoji: "🧻", desc: "생산 속도 +40%", price: 120, effectType: "production", value: 40 },
  { id: "super_bidet", name: "슈퍼 비데", emoji: "🚿", desc: "똥 품질 +3", price: 180, effectType: "quality", value: 3 },
  { id: "perfume", name: "향수", emoji: "💐", desc: "냄새 파워 +60%", price: 150, effectType: "smell", value: 60 },
  { id: "auto2", name: "터보 생산기", emoji: "⚡", desc: "0.5초마다 자동 생산!", price: 300, effectType: "auto", value: 2 },
  { id: "lucky", name: "행운의 변기", emoji: "🍀", desc: "레어 똥 확률 UP!", price: 200, effectType: "luck", value: 20 },
  { id: "mega_lucky", name: "전설의 변기", emoji: "⭐", desc: "레어 똥 확률 대폭 UP!", price: 500, effectType: "luck", value: 40 },
];

type Screen = "main" | "play" | "collection" | "shop" | "food";

export default function PoopPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(20);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(30);
  const [highScore, setHighScore] = useState(0);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [ownedToilets, setOwnedToilets] = useState<string[]>(["school"]);
  const [currentToilet, setCurrentToilet] = useState<Toilet>(TOILETS[0]);
  const [collection, setCollection] = useState<Record<string, number>>({});
  const [totalPoops, setTotalPoops] = useState(0);

  // 플레이
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [poopQueue, setPoopQueue] = useState<PoopType[]>([]);
  const [currentPoop, setCurrentPoop] = useState<PoopType | null>(null);
  const [pushProgress, setPushProgress] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [sessionPoops, setSessionPoops] = useState(0);
  const [foodBoost, setFoodBoost] = useState(1);
  const [foodTimer, setFoodTimer] = useState(0);
  const [floatTexts, setFloatTexts] = useState<{ id: number; text: string; x: number; y: number; color: string }[]>([]);
  const floatId = useRef(0);
  const [faceEmoji, setFaceEmoji] = useState("😐");
  const [smellCloud, setSmellCloud] = useState(0);
  const [shaking, setShaking] = useState(false);
  const autoRef = useRef<NodeJS.Timeout | null>(null);

  // 보너스
  const prodBonus = ownedItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "production" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const qualityBonus = ownedItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "quality" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const smellBonus = ownedItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "smell" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const hasAuto = ownedItems.some(id => SHOP_ITEMS.find(i => i.id === id)?.effectType === "auto");
  const autoSpeed = ownedItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "auto" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const luckBonus = ownedItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "luck" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);

  // 레벨업
  useEffect(() => {
    if (xp >= xpNeeded) {
      setXp(x => x - xpNeeded);
      setPlayerLevel(l => l + 1);
      setXpNeeded(n => Math.floor(n * 1.3));
    }
  }, [xp, xpNeeded]);

  // 타이머
  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    } else if (gameActive && timeLeft <= 0) {
      endGame();
    }
  }, [gameActive, timeLeft]);

  // 음식 타이머
  useEffect(() => {
    if (gameActive && foodTimer > 0) {
      const t = setTimeout(() => setFoodTimer(f => f - 1), 1000);
      return () => clearTimeout(t);
    } else if (foodTimer <= 0) {
      setFoodBoost(1);
    }
  }, [gameActive, foodTimer]);

  // 자동 생산
  useEffect(() => {
    if (gameActive && hasAuto) {
      const interval = autoSpeed >= 2 ? 500 : 1000;
      autoRef.current = setInterval(() => {
        setPushProgress(p => {
          const next = p + 10;
          if (next >= 100) return 100;
          return next;
        });
      }, interval);
      return () => { if (autoRef.current) clearInterval(autoRef.current); };
    }
  }, [gameActive, hasAuto, autoSpeed]);

  // 랜덤 똥 생성
  const generatePoop = useCallback((): PoopType => {
    const available = POOP_TYPES.filter(p => playerLevel >= p.unlockLevel);
    const roll = Math.random() * 100;
    const luckAdj = luckBonus;

    // 레어도에 따른 확률
    let pool: PoopType[];
    if (roll < 2 + luckAdj / 5) {
      pool = available.filter(p => p.rarity === 5);
    } else if (roll < 8 + luckAdj / 3) {
      pool = available.filter(p => p.rarity === 4);
    } else if (roll < 20 + luckAdj / 2) {
      pool = available.filter(p => p.rarity === 3);
    } else if (roll < 45 + luckAdj) {
      pool = available.filter(p => p.rarity === 2);
    } else {
      pool = available.filter(p => p.rarity === 1);
    }

    if (pool.length === 0) pool = available.filter(p => p.rarity === 1);
    return pool[Math.floor(Math.random() * pool.length)];
  }, [playerLevel, luckBonus]);

  const startGame = useCallback(() => {
    setScore(0);
    setTimeLeft(60);
    setCombo(0);
    setMaxCombo(0);
    setSessionPoops(0);
    setPushProgress(0);
    setSmellCloud(0);
    setFaceEmoji("😐");
    setFloatTexts([]);
    setShaking(false);
    setCurrentPoop(generatePoop());
    setGameActive(true);
    setScreen("play");
  }, [generatePoop]);

  const endGame = useCallback(() => {
    setGameActive(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (autoRef.current) clearInterval(autoRef.current);

    const earned = Math.floor(score / 3) + sessionPoops * 2;
    setCoins(c => c + earned);
    setXp(x => x + Math.floor(score / 4));
    setTotalPoops(t => t + sessionPoops);
    if (score > highScore) setHighScore(score);
  }, [score, sessionPoops, highScore]);

  // 힘주기 (클릭/터치)
  const push = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (!gameActive || !currentPoop) return;

    const speedMult = currentPoop.speed * (1 + prodBonus / 100) * foodBoost;
    const pushAmount = 15 * speedMult;

    setPushProgress(prev => {
      const next = prev + pushAmount;
      if (next >= 100) {
        // 똥 생산 성공!
        producePoop(e);
        return 0;
      }

      // 표정 변화
      if (next > 80) setFaceEmoji("😣");
      else if (next > 50) setFaceEmoji("😤");
      else if (next > 20) setFaceEmoji("😬");
      else setFaceEmoji("😐");

      return next;
    });
  }, [gameActive, currentPoop, prodBonus, foodBoost]);

  const producePoop = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (!currentPoop) return;

    setFaceEmoji("😌");
    setTimeout(() => setFaceEmoji("😐"), 500);

    // 점수 계산
    const toiletMult = currentToilet.multiplier;
    const qualMult = 1 + qualityBonus * 0.1;
    const comboMult = 1 + combo * 0.15;
    const baseScore = currentPoop.score;
    const totalScore = Math.floor(baseScore * toiletMult * qualMult * comboMult);

    setScore(s => s + totalScore);
    setSessionPoops(p => p + 1);
    setCombo(c => { const n = c + 1; setMaxCombo(m => Math.max(m, n)); return n; });

    // 냄새 구름
    const smellAmount = currentPoop.smell * (1 + smellBonus / 100);
    setSmellCloud(s => Math.min(100, s + smellAmount * 5));

    // 컬렉션 기록
    setCollection(prev => ({ ...prev, [currentPoop.id]: (prev[currentPoop.id] || 0) + 1 }));

    // 흔들림
    if (currentPoop.rarity >= 3) {
      setShaking(true);
      setTimeout(() => setShaking(false), 300);
    }

    // 플로팅
    const fid = floatId.current++;
    let x = 200, y = 300;
    if (e && "clientX" in e) { x = (e as React.MouseEvent).clientX; y = (e as React.MouseEvent).clientY; }
    const rarityColors = ["#4ade80", "#4ade80", "#60a5fa", "#fbbf24", "#c084fc", "#ef4444"];
    setFloatTexts(prev => [...prev, {
      id: fid,
      text: `+${totalScore} ${currentPoop.emoji}`,
      x, y,
      color: rarityColors[currentPoop.rarity] || "#4ade80",
    }]);
    setTimeout(() => setFloatTexts(prev => prev.filter(f => f.id !== fid)), 1000);

    // 다음 똥
    setCurrentPoop(generatePoop());
  }, [currentPoop, currentToilet, qualityBonus, smellBonus, combo, generatePoop]);

  // 냄새 감소
  useEffect(() => {
    if (!gameActive) return;
    const interval = setInterval(() => {
      setSmellCloud(s => Math.max(0, s - 2));
    }, 500);
    return () => clearInterval(interval);
  }, [gameActive]);

  // 음식 먹기
  const eatFood = useCallback((food: Food) => {
    if (coins < food.price || !gameActive) return;
    setCoins(c => c - food.price);
    setFoodBoost(food.boost);
    setFoodTimer(food.duration);
  }, [coins, gameActive]);

  const buyItem = useCallback((id: string) => {
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item || coins < item.price || ownedItems.includes(id)) return;
    setCoins(c => c - item.price);
    setOwnedItems(prev => [...prev, id]);
  }, [coins, ownedItems]);

  const buyToilet = useCallback((id: string) => {
    const toilet = TOILETS.find(t => t.id === id);
    if (!toilet || coins < toilet.cost || ownedToilets.includes(id)) return;
    setCoins(c => c - toilet.cost);
    setOwnedToilets(prev => [...prev, id]);
  }, [coins, ownedToilets]);

  const rarityStars = (r: number) => "⭐".repeat(r);

  /* ───── 메인 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-800 via-yellow-900 to-stone-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-amber-300 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2">💩</div>
            <h1 className="text-3xl font-black mb-1">똥 대작전</h1>
            <p className="text-amber-300 text-sm">최고의 똥을 만들어라!</p>
          </div>

          <div className="bg-amber-900/40 rounded-xl p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-yellow-400 font-bold">🪙 {coins}코인</span>
              <span className="text-amber-300 text-sm">Lv.{playerLevel}</span>
            </div>
            <div className="bg-amber-900 rounded-full h-2 overflow-hidden">
              <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <div className="text-[10px] text-amber-400 text-right mt-0.5">{xp}/{xpNeeded} XP</div>
            {highScore > 0 && <div className="text-xs text-yellow-300 text-center mt-1">🏆 최고 점수: {highScore}</div>}
            <div className="text-xs text-amber-300 text-center">💩 총 생산: {totalPoops}개</div>
          </div>

          {/* 화장실 선택 */}
          <div className="bg-black/30 rounded-xl p-3 mb-4">
            <h3 className="text-sm font-bold text-center mb-2">🚽 화장실 선택</h3>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {TOILETS.map(t => {
                const owned = ownedToilets.includes(t.id);
                const selected = currentToilet.id === t.id;
                const locked = playerLevel < t.unlockLevel;
                return (
                  <button key={t.id}
                    onClick={() => {
                      if (owned) setCurrentToilet(t);
                      else if (!locked) buyToilet(t.id);
                    }}
                    className={`flex-shrink-0 p-2 rounded-lg text-center w-16 ${
                      selected ? "bg-amber-600 ring-2 ring-yellow-400" :
                      owned ? "bg-amber-800/50 hover:bg-amber-700/50" :
                      locked ? "bg-gray-800/50 opacity-40" : "bg-gray-800/50 hover:bg-gray-700/50"
                    }`}>
                    <div className="text-xl">{locked ? "🔒" : t.emoji}</div>
                    <div className="text-[8px]">{t.name}</div>
                    {!owned && !locked && <div className="text-[7px] text-yellow-400">🪙{t.cost}</div>}
                    {owned && <div className="text-[7px] text-green-400">x{t.multiplier}</div>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={startGame}
              className="w-full bg-amber-600 hover:bg-amber-500 rounded-xl p-4 text-center text-lg font-black">
              🚽 똥 싸기 시작!
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setScreen("collection")}
                className="bg-purple-700/60 hover:bg-purple-600/60 rounded-xl p-3 text-center font-bold text-sm">
                📖 똥 도감
              </button>
              <button onClick={() => setScreen("shop")}
                className="bg-yellow-700/60 hover:bg-yellow-600/60 rounded-xl p-3 text-center font-bold text-sm">
                🛒 상점
              </button>
            </div>
          </div>

          <div className="mt-4 bg-black/30 rounded-xl p-3">
            <h3 className="text-sm font-bold mb-2 text-center">💩 발견한 똥 ({Object.keys(collection).length}/{POOP_TYPES.length})</h3>
            <div className="flex flex-wrap gap-1 justify-center">
              {POOP_TYPES.map(p => (
                <div key={p.id} className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                  collection[p.id] ? "bg-amber-800/50" : "bg-gray-800/50 opacity-40"
                }`}>
                  {collection[p.id] ? p.emoji : "❓"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 플레이 ───── */
  if (screen === "play") {
    return (
      <div className={`min-h-screen bg-gradient-to-b ${currentToilet.bgColor} text-gray-900 p-3 relative overflow-hidden select-none ${shaking ? "animate-pulse" : ""}`}>
        <div className="max-w-md mx-auto">
          {/* 상단 */}
          <div className="flex justify-between items-center mb-1 text-sm">
            <span className="font-bold">⏱️ {timeLeft}초</span>
            <span className="font-bold">🎯 {score}</span>
            <span>💩 {sessionPoops}개</span>
          </div>

          {combo >= 3 && (
            <div className="text-center mb-1">
              <span className="text-sm font-black px-2 py-0.5 rounded-full bg-amber-500 text-white">🔥 {combo} COMBO!</span>
            </div>
          )}

          {foodTimer > 0 && (
            <div className="text-center text-xs text-orange-600 font-bold mb-1">
              🍔 부스트! x{foodBoost} ({foodTimer}초)
            </div>
          )}

          {/* 냄새 게이지 */}
          <div className="mb-2">
            <div className="flex justify-between text-[10px]">
              <span>💨 냄새</span>
              <span>{Math.floor(smellCloud)}%</span>
            </div>
            <div className="bg-gray-300 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full transition-all" style={{
                width: `${smellCloud}%`,
                background: smellCloud >= 70 ? "#84cc16" : smellCloud >= 40 ? "#fbbf24" : "#d1d5db",
              }} />
            </div>
          </div>

          {/* 화장실 + 캐릭터 */}
          <div className="text-center mb-3 relative">
            <div className="text-sm text-gray-500 mb-1">{currentToilet.emoji} {currentToilet.name} (x{currentToilet.multiplier})</div>

            {/* 냄새 구름 */}
            {smellCloud > 20 && (
              <div className="absolute top-0 right-4 text-2xl animate-bounce" style={{ opacity: smellCloud / 100 }}>
                💨
              </div>
            )}
            {smellCloud > 50 && (
              <div className="absolute top-4 left-4 text-xl animate-bounce" style={{ opacity: smellCloud / 100, animationDelay: "0.3s" }}>
                💨
              </div>
            )}

            <div className="text-7xl mb-1">{faceEmoji}</div>
            <div className="text-4xl">🚽</div>
          </div>

          {/* 현재 똥 미리보기 */}
          {currentPoop && (
            <div className="text-center mb-2">
              <div className="inline-block bg-white rounded-xl px-4 py-2 shadow-md">
                <span className="text-2xl mr-2">{currentPoop.emoji}</span>
                <span className="font-bold text-sm">{currentPoop.name}</span>
                <span className="text-xs text-gray-500 ml-2">{rarityStars(currentPoop.rarity)}</span>
              </div>
            </div>
          )}

          {/* 힘주기 게이지 */}
          <div className="mb-3">
            <div className="bg-gray-300 rounded-full h-6 overflow-hidden border-2 border-gray-400">
              <div className="h-6 rounded-full transition-all flex items-center justify-center" style={{
                width: `${pushProgress}%`,
                background: pushProgress >= 80 ? "#ef4444" : pushProgress >= 50 ? "#f59e0b" : "#22c55e",
              }}>
                {pushProgress > 20 && <span className="text-xs font-bold text-white">{Math.floor(pushProgress)}%</span>}
              </div>
            </div>
          </div>

          {/* 힘주기 버튼 */}
          <button
            onClick={push}
            className="w-full bg-red-500 hover:bg-red-400 active:bg-red-600 active:scale-95 rounded-2xl p-6 text-center font-black text-2xl text-white transition-all shadow-lg mb-3">
            💪 힘주기!!
          </button>

          {/* 음식 */}
          <div className="bg-white/80 rounded-xl p-2">
            <div className="text-xs font-bold text-center mb-1">🍔 음식 부스트</div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {FOODS.map(f => (
                <button key={f.id} onClick={() => eatFood(f)}
                  disabled={coins < f.price}
                  className={`flex-shrink-0 p-1.5 rounded-lg text-center w-14 ${
                    coins >= f.price ? "bg-orange-100 hover:bg-orange-200" : "bg-gray-200 opacity-50"
                  }`}>
                  <div className="text-lg">{f.emoji}</div>
                  <div className="text-[7px] font-bold">{f.name}</div>
                  <div className="text-[7px] text-orange-600">🪙{f.price}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 플로팅 */}
        {floatTexts.map(f => (
          <div key={f.id} className="fixed pointer-events-none font-black text-lg z-50"
            style={{ left: f.x, top: f.y, color: f.color, textShadow: "0 0 4px rgba(0,0,0,0.3)", animation: "floatUp 1s ease-out forwards" }}>
            {f.text}
          </div>
        ))}

        <style jsx>{`
          @keyframes floatUp {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-80px) scale(1.3); }
          }
        `}</style>
      </div>
    );
  }

  /* ───── 도감 ───── */
  if (screen === "collection") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-purple-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-4">📖 똥 도감</h2>
          <p className="text-center text-xs text-gray-400 mb-4">발견: {Object.keys(collection).length}/{POOP_TYPES.length}</p>

          <div className="space-y-2">
            {POOP_TYPES.map(p => {
              const found = collection[p.id];
              return (
                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl ${found ? "bg-black/30" : "bg-black/10 opacity-50"}`}>
                  <div className="text-3xl">{found ? p.emoji : "❓"}</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{found ? p.name : "???"}</div>
                    <div className="text-xs text-gray-400">{found ? p.desc : "아직 발견하지 못함"}</div>
                    <div className="text-[10px] text-yellow-400">{rarityStars(p.rarity)}</div>
                  </div>
                  {found && (
                    <div className="text-right text-xs">
                      <div className="text-amber-400">x{found}</div>
                      <div className="text-gray-500">+{p.score}점</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 상점 ───── */
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-amber-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">🛒 상점</h2>
          <div className="text-center text-yellow-400 font-bold mb-4">🪙 {coins}코인</div>

          <div className="space-y-2">
            {SHOP_ITEMS.map(item => {
              const owned = ownedItems.includes(item.id);
              return (
                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl ${owned ? "bg-green-900/30 border border-green-800" : "bg-black/30"}`}>
                  <div className="text-3xl">{item.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.desc}</div>
                  </div>
                  {owned ? (
                    <span className="text-green-400 text-sm font-bold">✅</span>
                  ) : (
                    <button onClick={() => buyItem(item.id)} disabled={coins < item.price}
                      className={`text-xs px-3 py-2 rounded-lg font-bold ${coins >= item.price ? "bg-yellow-600 hover:bg-yellow-500" : "bg-gray-700 text-gray-500"}`}>
                      🪙 {item.price}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
