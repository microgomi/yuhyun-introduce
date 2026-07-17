"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

/* ───── 타입 & 데이터 ───── */
interface Fish {
  name: string;
  emoji: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  minPrice: number;
  maxPrice: number;
  minLocation: number;
  weight: number; // catch weight 1-10
}

interface Rod {
  id: string;
  name: string;
  emoji: string;
  price: number;
  power: number;     // casting range multiplier
  tension: number;   // tension zone width bonus
}

interface Bait {
  id: string;
  name: string;
  emoji: string;
  price: number;
  rareBonus: number; // bonus % for rarer fish
}

interface Location {
  id: string;
  name: string;
  emoji: string;
  unlockCost: number;
  bgClass: string;
  fishPool: string[];
}

type Weather = "sunny" | "cloudy" | "rainy" | "stormy";
type Phase = "menu" | "idle" | "casting" | "waiting" | "biting" | "reeling" | "caught" | "lost" | "shop" | "collection";

const RARITY_COLOR: Record<string, string> = {
  common: "text-gray-300",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};
const RARITY_LABEL: Record<string, string> = {
  common: "일반",
  uncommon: "고급",
  rare: "희귀",
  epic: "영웅",
  legendary: "전설",
};

const ALL_FISH: Fish[] = [
  { name: "붕어", emoji: "🐟", rarity: "common", minPrice: 10, maxPrice: 30, minLocation: 0, weight: 2 },
  { name: "잉어", emoji: "🐟", rarity: "common", minPrice: 15, maxPrice: 40, minLocation: 0, weight: 3 },
  { name: "메기", emoji: "🐡", rarity: "uncommon", minPrice: 30, maxPrice: 70, minLocation: 0, weight: 5 },
  { name: "송어", emoji: "🐠", rarity: "uncommon", minPrice: 40, maxPrice: 90, minLocation: 1, weight: 4 },
  { name: "연어", emoji: "🐟", rarity: "rare", minPrice: 80, maxPrice: 150, minLocation: 1, weight: 6 },
  { name: "배스", emoji: "🐠", rarity: "uncommon", minPrice: 35, maxPrice: 80, minLocation: 1, weight: 5 },
  { name: "참돔", emoji: "🐡", rarity: "rare", minPrice: 100, maxPrice: 200, minLocation: 2, weight: 7 },
  { name: "광어", emoji: "🐟", rarity: "rare", minPrice: 120, maxPrice: 250, minLocation: 2, weight: 6 },
  { name: "참치", emoji: "🐠", rarity: "epic", minPrice: 200, maxPrice: 400, minLocation: 2, weight: 8 },
  { name: "황새치", emoji: "🗡️", rarity: "epic", minPrice: 300, maxPrice: 600, minLocation: 3, weight: 9 },
  { name: "대왕오징어", emoji: "🦑", rarity: "epic", minPrice: 350, maxPrice: 700, minLocation: 3, weight: 9 },
  { name: "상어", emoji: "🦈", rarity: "legendary", minPrice: 500, maxPrice: 1000, minLocation: 3, weight: 10 },
  { name: "고래상어", emoji: "🐋", rarity: "legendary", minPrice: 800, maxPrice: 1500, minLocation: 3, weight: 10 },
  { name: "용왕의물고기", emoji: "🐉", rarity: "legendary", minPrice: 1500, maxPrice: 3000, minLocation: 3, weight: 10 },
];

const RODS: Rod[] = [
  { id: "basic", name: "나무 낚싯대", emoji: "🎣", price: 0, power: 1, tension: 0 },
  { id: "carbon", name: "카본 낚싯대", emoji: "🎣", price: 200, power: 1.3, tension: 5 },
  { id: "pro", name: "프로 낚싯대", emoji: "🎣", price: 600, power: 1.6, tension: 10 },
  { id: "master", name: "마스터 낚싯대", emoji: "🎣", price: 1500, power: 2, tension: 18 },
  { id: "legend", name: "전설의 낚싯대", emoji: "✨", price: 4000, power: 2.5, tension: 25 },
];

const BAITS: Bait[] = [
  { id: "worm", name: "지렁이", emoji: "🪱", price: 0, rareBonus: 0 },
  { id: "shrimp", name: "새우", emoji: "🦐", price: 50, rareBonus: 10 },
  { id: "minnow", name: "미꾸라지", emoji: "🐟", price: 150, rareBonus: 25 },
  { id: "gold", name: "황금 미끼", emoji: "✨", price: 500, rareBonus: 50 },
];

const LOCATIONS: Location[] = [
  { id: "pond", name: "연못", emoji: "🏞️", unlockCost: 0, bgClass: "from-green-800 to-cyan-700", fishPool: ["붕어", "잉어", "메기"] },
  { id: "river", name: "강", emoji: "🏔️", unlockCost: 300, bgClass: "from-emerald-700 to-blue-600", fishPool: ["송어", "연어", "배스", "잉어", "메기"] },
  { id: "ocean", name: "바다", emoji: "🌊", unlockCost: 1000, bgClass: "from-blue-700 to-blue-900", fishPool: ["참돔", "광어", "참치", "배스", "송어"] },
  { id: "deep", name: "심해", emoji: "🌑", unlockCost: 3000, bgClass: "from-indigo-900 to-gray-900", fishPool: ["황새치", "대왕오징어", "상어", "고래상어", "용왕의물고기", "참치"] },
];

const WEATHERS: { type: Weather; emoji: string; label: string; rareMod: number }[] = [
  { type: "sunny", emoji: "☀️", label: "맑음", rareMod: 0 },
  { type: "cloudy", emoji: "☁️", label: "흐림", rareMod: 5 },
  { type: "rainy", emoji: "🌧️", label: "비", rareMod: 15 },
  { type: "stormy", emoji: "⛈️", label: "폭풍", rareMod: 30 },
];

/* ───── 컴포넌트 ───── */
export default function FishingGame() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [money, setMoney] = useState(100);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [locIdx, setLocIdx] = useState(0);
  const [unlockedLocs, setUnlockedLocs] = useState([true, false, false, false]);
  const [rodIdx, setRodIdx] = useState(0);
  const [baitIdx, setBaitIdx] = useState(0);
  const [ownedRods, setOwnedRods] = useState([true, false, false, false, false]);
  const [ownedBaits, setOwnedBaits] = useState([true, false, false, false]);
  const [weather, setWeather] = useState<Weather>("sunny");
  const [collection, setCollection] = useState<Record<string, number>>({});
  const [totalCaught, setTotalCaught] = useState(0);

  // casting
  const [castPower, setCastPower] = useState(0);
  const [castDir, setCastDir] = useState(1);
  // waiting
  const [bobberY, setBobberY] = useState(0);
  // reeling
  const [tension, setTension] = useState(50);
  const [reelProgress, setReelProgress] = useState(0);
  const [tensionZone, setTensionZone] = useState({ min: 30, max: 70 });
  // result
  const [currentFish, setCurrentFish] = useState<Fish | null>(null);
  const [fishPrice, setFishPrice] = useState(0);
  const [message, setMessage] = useState("");

  const frameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loc = LOCATIONS[locIdx];
  const rod = RODS[rodIdx];
  const bait = BAITS[baitIdx];
  const xpNeeded = level * 50;
  const weatherData = WEATHERS.find((w) => w.type === weather)!;

  /* ───── 날씨 변경 (낚시 시작 시) ───── */
  const rollWeather = useCallback(() => {
    const r = Math.random();
    if (r < 0.4) setWeather("sunny");
    else if (r < 0.7) setWeather("cloudy");
    else if (r < 0.9) setWeather("rainy");
    else setWeather("stormy");
  }, []);

  /* ───── 물고기 선택 ───── */
  const pickFish = useCallback(() => {
    const pool = ALL_FISH.filter((f) => loc.fishPool.includes(f.name));
    const bonus = bait.rareBonus + weatherData.rareMod;
    const weighted = pool.map((f) => {
      let w = f.rarity === "common" ? 40 : f.rarity === "uncommon" ? 25 : f.rarity === "rare" ? 15 : f.rarity === "epic" ? 5 : 2;
      if (f.rarity !== "common") w += bonus * 0.3;
      return { fish: f, w };
    });
    const total = weighted.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (const { fish, w } of weighted) {
      r -= w;
      if (r <= 0) return fish;
    }
    return pool[0];
  }, [loc, bait, weatherData]);

  /* ───── 캐스팅 ───── */
  const startCast = useCallback(() => {
    setPhase("casting");
    setCastPower(0);
    setCastDir(1);
  }, []);

  useEffect(() => {
    if (phase !== "casting") return;
    const id = setInterval(() => {
      setCastPower((p) => {
        const next = p + castDir * 2;
        if (next >= 100) { setCastDir(-1); return 100; }
        if (next <= 0) { setCastDir(1); return 0; }
        return next;
      });
    }, 30);
    return () => clearInterval(id);
  }, [phase, castDir]);

  const confirmCast = useCallback(() => {
    if (phase !== "casting") return;
    rollWeather();
    setPhase("waiting");
    setBobberY(0);
    const waitTime = 2000 + Math.random() * 4000;
    timerRef.current = setTimeout(() => {
      setPhase("biting");
      timerRef.current = setTimeout(() => {
        setPhase((p) => (p === "biting" ? "idle" : p));
      }, 1500);
    }, waitTime);
  }, [phase, rollWeather]);

  /* ───── 대기 / 찌 애니메이션 ───── */
  useEffect(() => {
    if (phase !== "waiting" && phase !== "biting") return;
    const id = setInterval(() => {
      setBobberY((y) => {
        if (phase === "biting") return Math.sin(Date.now() / 50) * 8;
        return Math.sin(Date.now() / 400) * 3;
      });
    }, 50);
    return () => clearInterval(id);
  }, [phase]);

  /* ───── 입질 클릭 -> 릴링 ───── */
  const hookFish = useCallback(() => {
    if (phase !== "biting") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const fish = pickFish();
    setCurrentFish(fish);
    setTension(50);
    setReelProgress(0);
    const zoneW = 40 + rod.tension - fish.weight * 2;
    const zoneMin = 50 - zoneW / 2;
    setTensionZone({ min: Math.max(5, zoneMin), max: Math.min(95, zoneMin + zoneW) });
    setPhase("reeling");
  }, [phase, pickFish, rod]);

  /* ───── 릴링 ───── */
  useEffect(() => {
    if (phase !== "reeling" || !currentFish) return;
    const id = setInterval(() => {
      setTension((t) => {
        const drift = (Math.random() - 0.5) * 8 + (currentFish.weight * 0.5) * (Math.random() > 0.5 ? 1 : -1);
        const next = Math.max(0, Math.min(100, t + drift));
        if (next <= 0 || next >= 100) {
          setPhase("lost");
          setMessage("이런! 물고기를 놓쳤다... 😢");
        }
        return next;
      });
      setReelProgress((p) => {
        const inZone = tension >= tensionZone.min && tension <= tensionZone.max;
        const gain = inZone ? 1.5 + rod.power * 0.5 : -0.5;
        const next = Math.max(0, Math.min(100, p + gain));
        if (next >= 100) {
          const price = currentFish!.minPrice + Math.floor(Math.random() * (currentFish!.maxPrice - currentFish!.minPrice));
          setFishPrice(price);
          setMoney((m) => m + price);
          setTotalCaught((c) => c + 1);
          setCollection((col) => ({ ...col, [currentFish!.name]: (col[currentFish!.name] || 0) + 1 }));
          const gainXp = currentFish!.rarity === "legendary" ? 40 : currentFish!.rarity === "epic" ? 25 : currentFish!.rarity === "rare" ? 15 : 8;
          setXp((x) => {
            const nx = x + gainXp;
            if (nx >= level * 50) {
              setLevel((l) => l + 1);
              return nx - level * 50;
            }
            return nx;
          });
          setPhase("caught");
          setMessage(`${currentFish!.emoji} ${currentFish!.name} 잡았다! (+${price}원)`);
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [phase, currentFish, tension, tensionZone, rod, level]);

  const reelClick = useCallback(() => {
    if (phase !== "reeling") return;
    setTension((t) => Math.max(0, Math.min(100, t + 8)));
  }, [phase]);

  /* ───── 상점 구매 ───── */
  const buyRod = (i: number) => {
    if (ownedRods[i] || money < RODS[i].price) return;
    setMoney((m) => m - RODS[i].price);
    setOwnedRods((o) => { const n = [...o]; n[i] = true; return n; });
    setRodIdx(i);
  };
  const buyBait = (i: number) => {
    if (ownedBaits[i] || money < BAITS[i].price) return;
    setMoney((m) => m - BAITS[i].price);
    setOwnedBaits((o) => { const n = [...o]; n[i] = true; return n; });
    setBaitIdx(i);
  };
  const unlockLoc = (i: number) => {
    if (unlockedLocs[i] || money < LOCATIONS[i].unlockCost) return;
    setMoney((m) => m - LOCATIONS[i].unlockCost);
    setUnlockedLocs((o) => { const n = [...o]; n[i] = true; return n; });
  };

  /* ───── cleanup ───── */
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  /* ───── 파도 CSS ───── */
  const waveStyle = (delay: number, dur: number) => ({
    position: "absolute" as const,
    bottom: 0, left: "-10%", width: "120%",
    height: "60%",
    borderRadius: "40%",
    animation: `wave ${dur}s ease-in-out ${delay}s infinite alternate`,
    opacity: 0.3,
  });

  /* ───── UI ───── */
  const collected = Object.keys(collection).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 via-blue-500 to-blue-900 text-white">
      <style>{`
        @keyframes wave { 0% { transform: translateX(-5%) rotate(2deg); } 100% { transform: translateX(5%) rotate(-2deg); } }
        @keyframes bobber { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes splash { 0% { transform: scale(0); opacity:1; } 100% { transform: scale(2); opacity:0; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
      `}</style>

      {/* 상단 바 */}
      <div className="flex items-center justify-between p-3 bg-blue-900/60 backdrop-blur">
        <Link href="/" className="px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 text-sm">🏠 홈으로</Link>
        <h1 className="text-lg font-bold">🎣 낚시왕</h1>
        <div className="flex gap-3 text-sm">
          <span>💰 {money}원</span>
          <span>⭐ Lv.{level}</span>
        </div>
      </div>

      {/* XP 바 */}
      <div className="h-1.5 bg-blue-950">
        <div className="h-full bg-yellow-400 transition-all" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
      </div>

      {/* ─── 메뉴 ─── */}
      {phase === "menu" && (
        <div className="flex flex-col items-center justify-center p-8 gap-6 min-h-[80vh]">
          <div className="text-7xl mb-2">🎣</div>
          <h2 className="text-4xl font-black tracking-tight">낚시왕</h2>
          <p className="text-blue-200 text-center">물고기를 잡아 전설의 낚시왕이 되자!<br />총 {ALL_FISH.length}종의 물고기가 기다리고 있어!</p>
          <div className="bg-blue-800/50 rounded-xl p-4 text-sm w-72 text-center space-y-1">
            <p>🐟 잡은 물고기: {totalCaught}마리 | 도감: {collected}/{ALL_FISH.length}</p>
            <p>💰 소지금: {money}원 | ⭐ 레벨: {level}</p>
          </div>

          {/* 장소 선택 */}
          <div className="grid grid-cols-2 gap-3 w-80">
            {LOCATIONS.map((l, i) => (
              <button key={l.id} onClick={() => { if (unlockedLocs[i]) { setLocIdx(i); setPhase("idle"); } }}
                className={`p-3 rounded-xl text-center transition ${unlockedLocs[i] ? "bg-blue-700/70 hover:bg-blue-600/80 cursor-pointer" : "bg-gray-700/50 opacity-60 cursor-not-allowed"}`}>
                <div className="text-2xl">{l.emoji}</div>
                <div className="font-bold text-sm">{l.name}</div>
                {!unlockedLocs[i] && <div className="text-[10px] text-yellow-300">🔒 {l.unlockCost}원</div>}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setPhase("shop")} className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 rounded-xl font-bold">🛒 상점</button>
            <button onClick={() => setPhase("collection")} className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-xl font-bold">📖 도감</button>
          </div>
        </div>
      )}

      {/* ─── 낚시 화면 (idle/casting/waiting/biting/reeling/caught/lost) ─── */}
      {["idle", "casting", "waiting", "biting", "reeling", "caught", "lost"].includes(phase) && (
        <div className="relative flex flex-col items-center min-h-[85vh]">
          {/* 정보 바 */}
          <div className="flex items-center gap-4 p-2 text-xs bg-blue-900/40 w-full justify-center">
            <span>{loc.emoji} {loc.name}</span>
            <span>{weatherData.emoji} {weatherData.label}</span>
            <span>{rod.emoji} {rod.name}</span>
            <span>{bait.emoji} {bait.name}</span>
          </div>

          {/* 하늘 + 물 장면 */}
          <div className={`relative w-full flex-1 overflow-hidden bg-gradient-to-b ${loc.bgClass}`}>
            {/* 날씨 효과 */}
            {weather === "rainy" && <div className="absolute inset-0 opacity-30" style={{ background: "repeating-linear-gradient(transparent, transparent 4px, rgba(200,220,255,0.3) 4px, rgba(200,220,255,0.3) 5px)" }} />}
            {weather === "stormy" && <div className="absolute inset-0 opacity-20 bg-gray-900 animate-pulse" />}

            {/* 파도 */}
            <div className="absolute bottom-0 w-full h-1/2">
              <div style={waveStyle(0, 4)} className="bg-blue-500/40" />
              <div style={waveStyle(0.5, 5)} className="bg-cyan-400/30" />
              <div style={waveStyle(1, 3.5)} className="bg-blue-300/20" />
            </div>

            {/* 낚싯줄 + 찌 */}
            {(phase === "waiting" || phase === "biting") && (
              <div className="absolute left-1/2 top-[30%] flex flex-col items-center" style={{ transform: `translateX(-50%)` }}>
                <div className="w-px h-24 bg-gray-300/60" />
                <div className="relative" style={{ transform: `translateY(${bobberY}px)` }}>
                  <div className={`w-4 h-6 rounded-full ${phase === "biting" ? "bg-red-500 animate-bounce" : "bg-red-400"}`} />
                  {phase === "biting" && <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-300 font-black text-lg animate-bounce whitespace-nowrap">❗ 클릭!</div>}
                </div>
              </div>
            )}

            {/* 잡은 물고기 표시 */}
            {phase === "caught" && currentFish && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-8xl animate-bounce">{currentFish.emoji}</div>
                <div className={`mt-2 text-xl font-black ${RARITY_COLOR[currentFish.rarity]}`}>{currentFish.name}</div>
                <div className="text-sm text-blue-200">[{RARITY_LABEL[currentFish.rarity]}] +{fishPrice}원 💰</div>
              </div>
            )}

            {/* 놓침 */}
            {phase === "lost" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-6xl">💨</div>
                <div className="text-xl font-bold mt-2">{message}</div>
              </div>
            )}

            {/* 릴링 UI */}
            {phase === "reeling" && currentFish && (
              <div className="absolute inset-x-4 bottom-24 flex flex-col items-center gap-3">
                <div className="text-center font-bold">🎣 릴링 중! 클릭해서 텐션 유지!</div>
                <div className="text-3xl animate-pulse">{currentFish.emoji}</div>

                {/* 텐션 바 */}
                <div className="relative w-64 h-8 bg-gray-800 rounded-full overflow-hidden border-2 border-white/30">
                  <div className="absolute h-full bg-green-500/40" style={{ left: `${tensionZone.min}%`, width: `${tensionZone.max - tensionZone.min}%` }} />
                  <div className="absolute top-0 h-full w-1.5 bg-yellow-300 rounded transition-all" style={{ left: `${tension}%` }} />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">텐션</div>
                </div>

                {/* 진행 바 */}
                <div className="w-64 h-4 bg-gray-800 rounded-full overflow-hidden border border-white/20">
                  <div className="h-full bg-blue-400 transition-all rounded-full" style={{ width: `${reelProgress}%` }} />
                </div>
                <div className="text-xs">진행: {Math.floor(reelProgress)}%</div>
              </div>
            )}

            {/* 캐스팅 파워 미터 */}
            {phase === "casting" && (
              <div className="absolute inset-x-0 bottom-24 flex flex-col items-center gap-3">
                <div className="font-bold">🎯 타이밍 맞춰 클릭!</div>
                <div className="w-64 h-6 bg-gray-800 rounded-full overflow-hidden border border-white/30 relative">
                  <div className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-all rounded-full" style={{ width: `${castPower}%` }} />
                  <div className="absolute right-2 top-0 h-full flex items-center text-xs font-bold">{castPower}%</div>
                </div>
              </div>
            )}

            {/* idle 안내 */}
            {phase === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="text-5xl">🎣</div>
                <p className="font-bold text-lg">낚시를 시작하려면 아래 버튼을 클릭!</p>
              </div>
            )}
          </div>

          {/* 하단 버튼들 */}
          <div className="w-full p-3 bg-blue-950/80 flex justify-center gap-3 flex-wrap">
            {phase === "idle" && (
              <>
                <button onClick={startCast} className="px-8 py-3 bg-green-500 hover:bg-green-400 rounded-xl font-black text-lg">🎣 던지기!</button>
                <button onClick={() => setPhase("menu")} className="px-4 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl font-bold">🔙 메뉴</button>
              </>
            )}
            {phase === "casting" && (
              <button onClick={confirmCast} className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 rounded-xl font-black text-lg animate-pulse">💥 던져!</button>
            )}
            {(phase === "waiting") && (
              <div className="text-blue-300 font-bold py-3">⏳ 물고기가 올 때까지 기다려...</div>
            )}
            {phase === "biting" && (
              <button onClick={hookFish} className="px-8 py-3 bg-red-500 hover:bg-red-400 rounded-xl font-black text-lg animate-bounce">❗ 챔!</button>
            )}
            {phase === "reeling" && (
              <button onClick={reelClick} className="px-10 py-4 bg-blue-500 hover:bg-blue-400 rounded-xl font-black text-xl active:scale-95 transition">🔄 릴 감기!</button>
            )}
            {(phase === "caught" || phase === "lost") && (
              <>
                <button onClick={() => setPhase("idle")} className="px-6 py-3 bg-green-500 hover:bg-green-400 rounded-xl font-bold">🔄 다시 낚시</button>
                <button onClick={() => setPhase("menu")} className="px-4 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl font-bold">🔙 메뉴</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── 상점 ─── */}
      {phase === "shop" && (
        <div className="p-4 max-w-lg mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black">🛒 상점</h2>
            <button onClick={() => setPhase("menu")} className="px-4 py-1 bg-gray-600 hover:bg-gray-500 rounded-lg">🔙 돌아가기</button>
          </div>
          <div className="text-lg font-bold text-yellow-300">💰 {money}원</div>

          {/* 낚싯대 */}
          <div className="bg-blue-800/50 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-lg">🎣 낚싯대</h3>
            {RODS.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between bg-blue-900/50 rounded-lg p-2">
                <div>
                  <span className="font-bold">{r.emoji} {r.name}</span>
                  <span className="text-xs text-blue-300 ml-2">파워×{r.power} 텐션+{r.tension}</span>
                </div>
                {ownedRods[i] ? (
                  <button onClick={() => setRodIdx(i)} className={`px-3 py-1 rounded text-sm ${rodIdx === i ? "bg-green-500" : "bg-blue-600 hover:bg-blue-500"}`}>
                    {rodIdx === i ? "장착중" : "장착"}
                  </button>
                ) : (
                  <button onClick={() => buyRod(i)} className={`px-3 py-1 rounded text-sm ${money >= r.price ? "bg-yellow-500 hover:bg-yellow-400" : "bg-gray-600 opacity-50"}`}>
                    {r.price}원
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 미끼 */}
          <div className="bg-blue-800/50 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-lg">🪱 미끼</h3>
            {BAITS.map((b, i) => (
              <div key={b.id} className="flex items-center justify-between bg-blue-900/50 rounded-lg p-2">
                <div>
                  <span className="font-bold">{b.emoji} {b.name}</span>
                  <span className="text-xs text-blue-300 ml-2">희귀+{b.rareBonus}%</span>
                </div>
                {ownedBaits[i] ? (
                  <button onClick={() => setBaitIdx(i)} className={`px-3 py-1 rounded text-sm ${baitIdx === i ? "bg-green-500" : "bg-blue-600 hover:bg-blue-500"}`}>
                    {baitIdx === i ? "장착중" : "장착"}
                  </button>
                ) : (
                  <button onClick={() => buyBait(i)} className={`px-3 py-1 rounded text-sm ${money >= b.price ? "bg-yellow-500 hover:bg-yellow-400" : "bg-gray-600 opacity-50"}`}>
                    {b.price}원
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 장소 해금 */}
          <div className="bg-blue-800/50 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-lg">🗺️ 낚시터 해금</h3>
            {LOCATIONS.map((l, i) => (
              <div key={l.id} className="flex items-center justify-between bg-blue-900/50 rounded-lg p-2">
                <span className="font-bold">{l.emoji} {l.name}</span>
                {unlockedLocs[i] ? (
                  <span className="text-green-400 text-sm">✅ 해금됨</span>
                ) : (
                  <button onClick={() => unlockLoc(i)} className={`px-3 py-1 rounded text-sm ${money >= l.unlockCost ? "bg-yellow-500 hover:bg-yellow-400" : "bg-gray-600 opacity-50"}`}>
                    🔓 {l.unlockCost}원
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 도감 ─── */}
      {phase === "collection" && (
        <div className="p-4 max-w-lg mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black">📖 물고기 도감</h2>
            <button onClick={() => setPhase("menu")} className="px-4 py-1 bg-gray-600 hover:bg-gray-500 rounded-lg">🔙 돌아가기</button>
          </div>
          <p className="text-sm text-blue-200">발견: {collected}/{ALL_FISH.length}</p>

          <div className="grid grid-cols-2 gap-2">
            {ALL_FISH.map((f) => {
              const caught = collection[f.name] || 0;
              const found = caught > 0;
              return (
                <div key={f.name} className={`p-3 rounded-xl text-center ${found ? "bg-blue-800/60" : "bg-gray-800/60 opacity-50"}`}>
                  <div className="text-3xl">{found ? f.emoji : "❓"}</div>
                  <div className={`font-bold text-sm ${found ? RARITY_COLOR[f.rarity] : "text-gray-500"}`}>
                    {found ? f.name : "???"}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {found ? `[${RARITY_LABEL[f.rarity]}] ×${caught}` : RARITY_LABEL[f.rarity]}
                  </div>
                  {found && <div className="text-[10px] text-yellow-300">{f.minPrice}~{f.maxPrice}원</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 하단 여백 */}
      <div className="h-8" />
    </div>
  );
}
