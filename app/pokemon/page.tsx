"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

// --- Types ---
type Rarity = "common" | "uncommon" | "rare" | "legendary" | "mythic";
type PokemonType = "grass" | "fire" | "water" | "electric" | "normal" | "fighting" | "psychic" | "dragon" | "fairy" | "ghost" | "ice" | "rock";
type Area = "grassland" | "forest" | "lake" | "mountain" | "cave" | "volcano";

interface Pokemon {
  id: number;
  name: string;
  nameKr: string;
  emoji: string;
  type: PokemonType;
  rarity: Rarity;
  cp: [number, number]; // min-max CP range
  catchRate: number; // 0-1
  areas: Area[];
}

interface CaughtPokemon {
  pokemon: Pokemon;
  cp: number;
  timestamp: number;
}

// --- Data ---
const TYPE_COLORS: Record<PokemonType, string> = {
  grass: "bg-green-500",
  fire: "bg-red-500",
  water: "bg-blue-500",
  electric: "bg-yellow-400",
  normal: "bg-gray-400",
  fighting: "bg-orange-600",
  psychic: "bg-pink-500",
  dragon: "bg-indigo-600",
  fairy: "bg-pink-300",
  ghost: "bg-purple-600",
  ice: "bg-cyan-300",
  rock: "bg-amber-700",
};

const TYPE_NAMES: Record<PokemonType, string> = {
  grass: "풀", fire: "불꽃", water: "물", electric: "전기",
  normal: "노말", fighting: "격투", psychic: "에스퍼", dragon: "드래곤",
  fairy: "페어리", ghost: "고스트", ice: "얼음", rock: "바위",
};

const RARITY_INFO: Record<Rarity, { label: string; color: string; stars: string }> = {
  common: { label: "일반", color: "text-gray-400", stars: "★" },
  uncommon: { label: "고급", color: "text-green-400", stars: "★★" },
  rare: { label: "희귀", color: "text-blue-400", stars: "★★★" },
  legendary: { label: "전설", color: "text-yellow-400", stars: "★★★★" },
  mythic: { label: "신화", color: "text-purple-400", stars: "★★★★★" },
};

const AREA_INFO: Record<Area, { name: string; emoji: string; bg: string }> = {
  grassland: { name: "초원", emoji: "🌿", bg: "from-green-400 to-emerald-500" },
  forest: { name: "숲", emoji: "🌲", bg: "from-green-600 to-green-800" },
  lake: { name: "호수", emoji: "🏞️", bg: "from-blue-400 to-cyan-500" },
  mountain: { name: "산", emoji: "⛰️", bg: "from-gray-500 to-stone-600" },
  cave: { name: "동굴", emoji: "🕳️", bg: "from-gray-700 to-gray-900" },
  volcano: { name: "화산", emoji: "🌋", bg: "from-red-600 to-orange-700" },
};

const ALL_POKEMON: Pokemon[] = [
  // Common
  { id: 1, name: "Bulbasaur", nameKr: "이상해씨", emoji: "🌱", type: "grass", rarity: "common", cp: [50, 300], catchRate: 0.7, areas: ["grassland", "forest"] },
  { id: 4, name: "Charmander", nameKr: "파이리", emoji: "🔥", type: "fire", rarity: "common", cp: [50, 300], catchRate: 0.7, areas: ["volcano", "mountain"] },
  { id: 7, name: "Squirtle", nameKr: "꼬부기", emoji: "🐢", type: "water", rarity: "common", cp: [50, 300], catchRate: 0.7, areas: ["lake"] },
  { id: 10, name: "Caterpie", nameKr: "캐터피", emoji: "🐛", type: "normal", rarity: "common", cp: [10, 150], catchRate: 0.9, areas: ["grassland", "forest"] },
  { id: 16, name: "Pidgey", nameKr: "구구", emoji: "🐦", type: "normal", rarity: "common", cp: [20, 200], catchRate: 0.85, areas: ["grassland", "forest", "mountain"] },
  { id: 19, name: "Rattata", nameKr: "꼬렛", emoji: "🐭", type: "normal", rarity: "common", cp: [15, 180], catchRate: 0.9, areas: ["grassland", "cave"] },
  { id: 25, name: "Pikachu", nameKr: "피카츄", emoji: "⚡", type: "electric", rarity: "common", cp: [80, 400], catchRate: 0.6, areas: ["grassland", "forest"] },
  { id: 39, name: "Jigglypuff", nameKr: "푸린", emoji: "🎤", type: "fairy", rarity: "common", cp: [40, 250], catchRate: 0.75, areas: ["grassland", "forest"] },
  { id: 74, name: "Geodude", nameKr: "꼬마돌", emoji: "🪨", type: "rock", rarity: "common", cp: [40, 280], catchRate: 0.7, areas: ["mountain", "cave"] },
  { id: 129, name: "Magikarp", nameKr: "잉어킹", emoji: "🐟", type: "water", rarity: "common", cp: [10, 100], catchRate: 0.95, areas: ["lake"] },
  // Uncommon
  { id: 2, name: "Ivysaur", nameKr: "이상해풀", emoji: "🌿", type: "grass", rarity: "uncommon", cp: [200, 600], catchRate: 0.5, areas: ["grassland", "forest"] },
  { id: 5, name: "Charmeleon", nameKr: "리자드", emoji: "🦎", type: "fire", rarity: "uncommon", cp: [200, 600], catchRate: 0.5, areas: ["volcano", "mountain"] },
  { id: 8, name: "Wartortle", nameKr: "어니부기", emoji: "🐢", type: "water", rarity: "uncommon", cp: [200, 600], catchRate: 0.5, areas: ["lake"] },
  { id: 26, name: "Raichu", nameKr: "라이츄", emoji: "🐹", type: "electric", rarity: "uncommon", cp: [300, 800], catchRate: 0.45, areas: ["grassland"] },
  { id: 58, name: "Growlithe", nameKr: "가디", emoji: "🐕", type: "fire", rarity: "uncommon", cp: [200, 550], catchRate: 0.55, areas: ["volcano", "grassland"] },
  { id: 66, name: "Machop", nameKr: "알통몬", emoji: "💪", type: "fighting", rarity: "uncommon", cp: [200, 500], catchRate: 0.55, areas: ["mountain", "cave"] },
  { id: 92, name: "Gastly", nameKr: "고오스", emoji: "👻", type: "ghost", rarity: "uncommon", cp: [150, 500], catchRate: 0.5, areas: ["cave"] },
  { id: 133, name: "Eevee", nameKr: "이브이", emoji: "🦊", type: "normal", rarity: "uncommon", cp: [200, 600], catchRate: 0.5, areas: ["grassland", "forest"] },
  // Rare
  { id: 3, name: "Venusaur", nameKr: "이상해꽃", emoji: "🌺", type: "grass", rarity: "rare", cp: [600, 1500], catchRate: 0.3, areas: ["forest"] },
  { id: 6, name: "Charizard", nameKr: "리자몽", emoji: "🐲", type: "fire", rarity: "rare", cp: [700, 1800], catchRate: 0.25, areas: ["volcano"] },
  { id: 9, name: "Blastoise", nameKr: "거북왕", emoji: "🐢", type: "water", rarity: "rare", cp: [600, 1500], catchRate: 0.3, areas: ["lake"] },
  { id: 59, name: "Arcanine", nameKr: "윈디", emoji: "🐕‍🦺", type: "fire", rarity: "rare", cp: [600, 1600], catchRate: 0.3, areas: ["volcano", "mountain"] },
  { id: 94, name: "Gengar", nameKr: "팬텀", emoji: "😈", type: "ghost", rarity: "rare", cp: [500, 1400], catchRate: 0.3, areas: ["cave"] },
  { id: 131, name: "Lapras", nameKr: "라프라스", emoji: "🦕", type: "ice", rarity: "rare", cp: [700, 1800], catchRate: 0.2, areas: ["lake"] },
  { id: 143, name: "Snorlax", nameKr: "잠만보", emoji: "😴", type: "normal", rarity: "rare", cp: [800, 2000], catchRate: 0.2, areas: ["grassland", "mountain"] },
  { id: 149, name: "Dragonite", nameKr: "망나뇽", emoji: "🐉", type: "dragon", rarity: "rare", cp: [900, 2200], catchRate: 0.15, areas: ["mountain"] },
  // Legendary
  { id: 144, name: "Articuno", nameKr: "프리져", emoji: "🧊", type: "ice", rarity: "legendary", cp: [1500, 3000], catchRate: 0.08, areas: ["mountain"] },
  { id: 145, name: "Zapdos", nameKr: "썬더", emoji: "⚡", type: "electric", rarity: "legendary", cp: [1500, 3000], catchRate: 0.08, areas: ["mountain"] },
  { id: 146, name: "Moltres", nameKr: "파이어", emoji: "🔥", type: "fire", rarity: "legendary", cp: [1500, 3000], catchRate: 0.08, areas: ["volcano"] },
  // Mythic
  { id: 150, name: "Mewtwo", nameKr: "뮤츠", emoji: "🧬", type: "psychic", rarity: "mythic", cp: [2500, 4000], catchRate: 0.03, areas: ["cave"] },
  { id: 151, name: "Mew", nameKr: "뮤", emoji: "🩷", type: "psychic", rarity: "mythic", cp: [2000, 3500], catchRate: 0.05, areas: ["forest", "grassland", "lake", "mountain", "cave", "volcano"] },
];

const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 50, uncommon: 30, rare: 14, legendary: 5, mythic: 1,
};

function pickRandomPokemon(area: Area): Pokemon {
  const available = ALL_POKEMON.filter((p) => p.areas.includes(area));
  // Weighted random by rarity
  const weighted = available.flatMap((p) =>
    Array(RARITY_WEIGHTS[p.rarity]).fill(p)
  );
  return weighted[Math.floor(Math.random() * weighted.length)];
}

function randomCP(pokemon: Pokemon): number {
  return Math.floor(pokemon.cp[0] + Math.random() * (pokemon.cp[1] - pokemon.cp[0]));
}

type GameScreen = "explore" | "encounter" | "caught" | "escaped" | "pokedex";

const POKE_SAVE_KEY = "pokemon_save";
const POKE_MAX_OFFLINE_MIN = 480;

interface PokeSave {
  steps: number; pokeballs: number; totalCaught: number;
  collection: CaughtPokemon[];
  timestamp: number;
}

interface PokeOfflineReward { minutes: number; ballsGained: number; }

export default function PokemonPage() {
  const [screen, setScreen] = useState<GameScreen>("explore");
  const [currentArea, setCurrentArea] = useState<Area>("grassland");
  const [steps, setSteps] = useState(0);
  const [encounter, setEncounter] = useState<{ pokemon: Pokemon; cp: number } | null>(null);
  const [pokeballs, setPokeballs] = useState(20);
  const [collection, setCollection] = useState<CaughtPokemon[]>([]);
  const [throwAnim, setThrowAnim] = useState(false);
  const [catchResult, setCatchResult] = useState<"waiting" | "shaking" | "success" | "fail">("waiting");
  const [totalCaught, setTotalCaught] = useState(0);
  const [walkCooldown, setWalkCooldown] = useState(false);
  const [offlineReward, setOfflineReward] = useState<PokeOfflineReward | null>(null);
  const [loaded, setLoaded] = useState(false);
  const walkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Load save on mount ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POKE_SAVE_KEY);
      if (!raw) { setLoaded(true); return; }
      const s: PokeSave = JSON.parse(raw);
      setSteps(s.steps); setPokeballs(s.pokeballs);
      setTotalCaught(s.totalCaught); setCollection(s.collection);
      const diffMin = Math.min(Math.floor((Date.now() - s.timestamp) / 60000), POKE_MAX_OFFLINE_MIN);
      if (diffMin >= 1) {
        const ballsPer = Math.max(1, Math.floor(diffMin / 5));
        setPokeballs((p) => p + ballsPer);
        setOfflineReward({ minutes: diffMin, ballsGained: ballsPer });
      }
    } catch { /* ignore */ }
    setLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Save periodically + on unload ---
  useEffect(() => {
    if (!loaded) return;
    const save = () => {
      const data: PokeSave = { steps, pokeballs, totalCaught, collection, timestamp: Date.now() };
      localStorage.setItem(POKE_SAVE_KEY, JSON.stringify(data));
    };
    save();
    const interval = setInterval(save, 5000);
    window.addEventListener("beforeunload", save);
    return () => { clearInterval(interval); window.removeEventListener("beforeunload", save); };
  }, [loaded, steps, pokeballs, totalCaught, collection]);

  // Steps until encounter (random 3-8)
  const [stepsToEncounter, setStepsToEncounter] = useState(() => 3 + Math.floor(Math.random() * 6));

  // Unique Pokemon caught count
  const uniqueCaught = new Set(collection.map((c) => c.pokemon.id)).size;

  // Earn pokeballs every 10 steps
  useEffect(() => {
    if (steps > 0 && steps % 10 === 0) {
      setPokeballs((prev) => prev + 3);
    }
  }, [steps]);

  const handleWalk = useCallback(() => {
    if (walkCooldown) return;
    setWalkCooldown(true);
    walkTimerRef.current = setTimeout(() => setWalkCooldown(false), 300);

    const newSteps = steps + 1;
    setSteps(newSteps);

    if (newSteps >= stepsToEncounter) {
      // Encounter!
      const pokemon = pickRandomPokemon(currentArea);
      const cp = randomCP(pokemon);
      setEncounter({ pokemon, cp });
      setScreen("encounter");
      setCatchResult("waiting");
      setStepsToEncounter(newSteps + 3 + Math.floor(Math.random() * 6));
    }
  }, [steps, stepsToEncounter, currentArea, walkCooldown]);

  useEffect(() => {
    return () => { if (walkTimerRef.current) clearTimeout(walkTimerRef.current); };
  }, []);

  const throwBall = useCallback(() => {
    if (!encounter || pokeballs <= 0 || catchResult === "shaking") return;

    setPokeballs((prev) => prev - 1);
    setThrowAnim(true);
    setCatchResult("shaking");

    // Shake animation then result
    setTimeout(() => {
      setThrowAnim(false);
      const caught = Math.random() < encounter.pokemon.catchRate;

      if (caught) {
        setCatchResult("success");
        setCollection((prev) => [
          ...prev,
          { pokemon: encounter.pokemon, cp: encounter.cp, timestamp: Date.now() },
        ]);
        setTotalCaught((prev) => prev + 1);
      } else {
        setCatchResult("fail");
      }
    }, 1500);
  }, [encounter, pokeballs, catchResult]);

  const runAway = () => {
    setScreen("explore");
    setEncounter(null);
  };

  const continueAfterCatch = () => {
    setScreen("explore");
    setEncounter(null);
  };

  const retryThrow = () => {
    setCatchResult("waiting");
  };

  const areaInfo = AREA_INFO[currentArea];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-green-900 via-emerald-950 to-green-900 text-white">
      {/* Header */}
      <header className="fixed top-0 z-40 w-full border-b border-green-800 bg-green-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-green-300 transition-colors hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            🏠 소개페이지
          </Link>
          <span className="text-lg font-bold">
            <span className="bg-gradient-to-r from-red-400 to-yellow-400 bg-clip-text text-transparent">Pokemon</span>
            <span className="text-green-300"> GO</span>
            <span className="ml-1">🎮</span>
          </span>
          <button onClick={() => setScreen(screen === "pokedex" ? "explore" : "pokedex")} className="text-sm text-green-300 hover:text-white">
            📖 도감
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pt-24 pb-8">
        {/* Stats */}
        <div className="mb-4 grid w-full max-w-md grid-cols-4 gap-2 text-center">
          <div className="rounded-xl bg-green-900/60 px-2 py-2">
            <p className="text-[10px] text-green-400">걸음 수</p>
            <p className="text-lg font-black">{steps}</p>
          </div>
          <div className="rounded-xl bg-green-900/60 px-2 py-2">
            <p className="text-[10px] text-green-400">몬스터볼</p>
            <p className="text-lg font-black">🔴 {pokeballs}</p>
          </div>
          <div className="rounded-xl bg-green-900/60 px-2 py-2">
            <p className="text-[10px] text-green-400">포획</p>
            <p className="text-lg font-black">{totalCaught}</p>
          </div>
          <div className="rounded-xl bg-green-900/60 px-2 py-2">
            <p className="text-[10px] text-green-400">도감</p>
            <p className="text-lg font-black">{uniqueCaught}/{ALL_POKEMON.length}</p>
          </div>
        </div>

        {/* --- EXPLORE SCREEN --- */}
        {screen === "explore" && (
          <div className="flex w-full max-w-md flex-1 flex-col items-center gap-4">
            {/* Area Selector */}
            <div className="w-full">
              <p className="mb-2 text-center text-xs font-bold text-green-400">탐험 지역 선택</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {(Object.entries(AREA_INFO) as [Area, typeof AREA_INFO[Area]][]).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => setCurrentArea(key)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 transition-all ${
                      currentArea === key
                        ? "border-white bg-white/10 shadow-lg"
                        : "border-green-800 bg-green-900/40 hover:border-green-600"
                    }`}
                  >
                    <span className="text-2xl">{info.emoji}</span>
                    <span className="text-[10px] font-bold">{info.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Walk Area */}
            <button
              onClick={handleWalk}
              disabled={walkCooldown}
              className={`relative flex w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-b ${areaInfo.bg} transition-all active:scale-[0.98]`}
              style={{ minHeight: 280 }}
            >
              {/* Decorations */}
              {currentArea === "grassland" && (
                <>
                  <span className="absolute left-[10%] bottom-[15%] text-3xl opacity-40">🌿</span>
                  <span className="absolute right-[15%] bottom-[20%] text-2xl opacity-30">🌻</span>
                  <span className="absolute left-[40%] bottom-[10%] text-xl opacity-40">🌱</span>
                  <span className="absolute right-[30%] top-[20%] text-xl opacity-20">☁️</span>
                </>
              )}
              {currentArea === "forest" && (
                <>
                  <span className="absolute left-[5%] bottom-[10%] text-4xl opacity-40">🌲</span>
                  <span className="absolute right-[10%] bottom-[15%] text-3xl opacity-30">🌳</span>
                  <span className="absolute left-[30%] bottom-[5%] text-3xl opacity-35">🌲</span>
                  <span className="absolute right-[35%] bottom-[20%] text-2xl opacity-25">🍃</span>
                </>
              )}
              {currentArea === "lake" && (
                <>
                  <span className="absolute left-[15%] bottom-[15%] text-3xl opacity-30">🌊</span>
                  <span className="absolute right-[20%] bottom-[10%] text-2xl opacity-30">💧</span>
                  <span className="absolute left-[50%] bottom-[20%] text-xl opacity-25">🐟</span>
                </>
              )}
              {currentArea === "mountain" && (
                <>
                  <span className="absolute left-[10%] bottom-[10%] text-4xl opacity-30">⛰️</span>
                  <span className="absolute right-[15%] bottom-[15%] text-3xl opacity-25">🏔️</span>
                </>
              )}
              {currentArea === "cave" && (
                <>
                  <span className="absolute left-[10%] top-[20%] text-3xl opacity-20">🦇</span>
                  <span className="absolute right-[20%] top-[30%] text-2xl opacity-15">💎</span>
                </>
              )}
              {currentArea === "volcano" && (
                <>
                  <span className="absolute left-[20%] bottom-[10%] text-4xl opacity-30">🌋</span>
                  <span className="absolute right-[15%] bottom-[20%] text-2xl opacity-25">🔥</span>
                </>
              )}

              {/* Character */}
              <span className="text-6xl drop-shadow-lg" style={{ animation: walkCooldown ? "bounce 0.3s" : "none" }}>🚶</span>
              <p className="mt-4 text-lg font-black text-white/90 drop-shadow">클릭해서 걸어보세요!</p>
              <p className="text-sm text-white/60">{areaInfo.emoji} {areaInfo.name}을(를) 탐험 중...</p>
            </button>

            <Link href="/" className="block w-full rounded-xl border border-green-700 bg-green-900/40 py-3 text-center text-sm font-bold text-green-300 transition-all hover:bg-green-800/40 active:scale-95">
              🏠 소개페이지로
            </Link>
          </div>
        )}

        {/* --- ENCOUNTER SCREEN --- */}
        {screen === "encounter" && encounter && (
          <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4">
            {/* Wild Pokemon appeared! */}
            <div className="w-full rounded-2xl bg-green-900/60 p-2 text-center">
              <p className="text-sm font-bold text-yellow-300">
                야생의 {encounter.pokemon.nameKr}이(가) 나타났다!
              </p>
            </div>

            {/* Pokemon display */}
            <div className="relative flex flex-col items-center">
              <div className={`mb-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-white ${TYPE_COLORS[encounter.pokemon.type]}`}>
                {TYPE_NAMES[encounter.pokemon.type]}
              </div>
              <div className={`rounded-3xl p-8 ${catchResult === "shaking" ? "animate-pulse" : catchResult === "success" ? "opacity-50" : ""}`}>
                <span className="text-[120px] leading-none drop-shadow-2xl" style={{ animation: catchResult === "shaking" ? "shake 0.5s infinite" : "float 2s ease-in-out infinite" }}>
                  {encounter.pokemon.emoji}
                </span>
              </div>
              <p className="mt-2 text-2xl font-black">{encounter.pokemon.nameKr}</p>
              <p className="text-sm text-green-300">CP {encounter.cp}</p>
              <p className={`text-xs font-bold ${RARITY_INFO[encounter.pokemon.rarity].color}`}>
                {RARITY_INFO[encounter.pokemon.rarity].stars} {RARITY_INFO[encounter.pokemon.rarity].label}
              </p>
            </div>

            {/* Catch result */}
            {catchResult === "success" && (
              <div className="text-center">
                <p className="mb-2 text-2xl font-black text-yellow-300">잡았다! 🎉</p>
                <p className="text-sm text-green-300">{encounter.pokemon.nameKr} CP{encounter.cp}을(를) 잡았어요!</p>
                <button
                  onClick={continueAfterCatch}
                  className="mt-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  계속 탐험하기! 🚶
                </button>
              </div>
            )}

            {catchResult === "fail" && (
              <div className="text-center">
                <p className="mb-2 text-xl font-black text-red-400">아깝다! 빠져나갔다! 😫</p>
                <div className="flex gap-3">
                  <button
                    onClick={retryThrow}
                    disabled={pokeballs <= 0}
                    className="rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-6 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
                  >
                    다시 던지기! 🔴 ({pokeballs})
                  </button>
                  <button
                    onClick={runAway}
                    className="rounded-full bg-gray-700 px-6 py-3 font-bold transition-transform hover:scale-105 active:scale-95"
                  >
                    도망가기 🏃
                  </button>
                </div>
              </div>
            )}

            {catchResult === "waiting" && (
              <div className="flex gap-3">
                <button
                  onClick={throwBall}
                  disabled={pokeballs <= 0}
                  className={`rounded-full bg-gradient-to-r from-red-500 to-red-600 px-8 py-4 text-lg font-black shadow-xl transition-transform hover:scale-110 active:scale-95 disabled:opacity-40 ${throwAnim ? "animate-bounce" : ""}`}
                >
                  🔴 몬스터볼 던지기! ({pokeballs})
                </button>
                <button
                  onClick={runAway}
                  className="rounded-full bg-gray-700 px-6 py-4 font-bold transition-transform hover:scale-105 active:scale-95"
                >
                  🏃
                </button>
              </div>
            )}

            {catchResult === "shaking" && (
              <p className="animate-pulse text-lg font-bold text-yellow-300">
                흔들흔들... 🔴
              </p>
            )}
          </div>
        )}

        {/* --- POKEDEX SCREEN --- */}
        {screen === "pokedex" && (
          <div className="w-full max-w-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black">📖 포켓몬 도감</h2>
              <button onClick={() => setScreen("explore")} className="text-sm text-green-300 hover:text-white">
                닫기 ✕
              </button>
            </div>

            <div className="mb-4 flex gap-2 text-xs">
              <span className="rounded-full bg-green-800 px-3 py-1">전체: {ALL_POKEMON.length}</span>
              <span className="rounded-full bg-green-700 px-3 py-1">발견: {uniqueCaught}</span>
              <span className="rounded-full bg-green-600 px-3 py-1">총 포획: {totalCaught}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {ALL_POKEMON.map((pokemon) => {
                const caught = collection.filter((c) => c.pokemon.id === pokemon.id);
                const bestCP = caught.length > 0 ? Math.max(...caught.map((c) => c.cp)) : 0;
                const discovered = caught.length > 0;

                return (
                  <div
                    key={pokemon.id}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      discovered
                        ? "border-green-600 bg-green-900/60"
                        : "border-green-800/50 bg-green-950/40 opacity-40"
                    }`}
                  >
                    <span className="text-3xl">{discovered ? pokemon.emoji : "❓"}</span>
                    <p className="mt-1 text-xs font-bold">{discovered ? pokemon.nameKr : "???"}</p>
                    {discovered && (
                      <>
                        <p className={`text-[10px] font-bold ${RARITY_INFO[pokemon.rarity].color}`}>
                          {RARITY_INFO[pokemon.rarity].stars}
                        </p>
                        <p className="text-[10px] text-green-400">CP {bestCP} x{caught.length}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* --- OFFLINE REWARD MODAL --- */}
        {offlineReward && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-green-600 bg-gradient-to-b from-green-900 to-emerald-950 shadow-2xl">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-5 text-center">
                <span className="text-5xl">🌙</span>
                <h2 className="mt-2 text-2xl font-black">오프라인 보상!</h2>
                <p className="text-sm text-green-100">
                  {offlineReward.minutes >= 60
                    ? `${Math.floor(offlineReward.minutes / 60)}시간 ${offlineReward.minutes % 60}분`
                    : `${offlineReward.minutes}분`} 동안 탐험했어요!
                </p>
              </div>
              <div className="space-y-3 p-6">
                <div className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3">
                  <span className="text-sm text-red-300">몬스터볼</span>
                  <span className="text-lg font-black text-red-400">🔴 +{offlineReward.ballsGained}개</span>
                </div>
                <button onClick={() => setOfflineReward(null)} className="mt-2 w-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 py-3 text-lg font-black shadow-lg transition-transform hover:scale-105 active:scale-95">
                  받기! 🎁
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
        }
      `}</style>
    </div>
  );
}
