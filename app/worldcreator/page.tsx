"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ═══════ 원소 ═══════ */
interface Element {
  id: string;
  name: string;
  emoji: string;
  tier: number;
  desc: string;
  discovered: boolean;
}

/* ═══════ 조합 레시피 ═══════ */
interface Recipe {
  a: string;
  b: string;
  result: string;
}

const ALL_ELEMENTS: Element[] = [
  // 기본 (tier 0)
  { id: "fire", name: "불", emoji: "🔥", tier: 0, desc: "뜨거운 불꽃", discovered: true },
  { id: "water", name: "물", emoji: "💧", tier: 0, desc: "맑은 물", discovered: true },
  { id: "earth", name: "흙", emoji: "🟤", tier: 0, desc: "단단한 흙", discovered: true },
  { id: "air", name: "바람", emoji: "💨", tier: 0, desc: "보이지 않는 바람", discovered: true },
  // tier 1
  { id: "steam", name: "증기", emoji: "♨️", tier: 1, desc: "뜨거운 수증기", discovered: false },
  { id: "mud", name: "진흙", emoji: "🫗", tier: 1, desc: "물과 흙이 섞인", discovered: false },
  { id: "lava", name: "용암", emoji: "🌋", tier: 1, desc: "녹은 바위", discovered: false },
  { id: "dust", name: "먼지", emoji: "🌫️", tier: 1, desc: "날리는 먼지", discovered: false },
  { id: "energy", name: "에너지", emoji: "⚡", tier: 1, desc: "강력한 힘", discovered: false },
  { id: "cloud", name: "구름", emoji: "☁️", tier: 1, desc: "하늘에 떠있는", discovered: false },
  // tier 2
  { id: "stone", name: "돌", emoji: "🪨", tier: 2, desc: "단단한 돌멩이", discovered: false },
  { id: "rain", name: "비", emoji: "🌧️", tier: 2, desc: "하늘에서 내리는 비", discovered: false },
  { id: "sand", name: "모래", emoji: "🏖️", tier: 2, desc: "고운 모래알", discovered: false },
  { id: "metal", name: "금속", emoji: "🔩", tier: 2, desc: "빛나는 금속", discovered: false },
  { id: "glass", name: "유리", emoji: "🪟", tier: 2, desc: "투명한 유리", discovered: false },
  { id: "ice", name: "얼음", emoji: "🧊", tier: 2, desc: "차가운 얼음", discovered: false },
  { id: "lightning", name: "번개", emoji: "⚡", tier: 2, desc: "하늘을 가르는 번개", discovered: false },
  { id: "clay", name: "점토", emoji: "🏺", tier: 2, desc: "빚을 수 있는 점토", discovered: false },
  // tier 3
  { id: "plant", name: "식물", emoji: "🌱", tier: 3, desc: "첫 번째 생명!", discovered: false },
  { id: "ocean", name: "바다", emoji: "🌊", tier: 3, desc: "넓고 깊은 바다", discovered: false },
  { id: "mountain", name: "산", emoji: "⛰️", tier: 3, desc: "우뚝 솟은 산", discovered: false },
  { id: "snow", name: "눈", emoji: "❄️", tier: 3, desc: "하얀 눈송이", discovered: false },
  { id: "volcano", name: "화산", emoji: "🌋", tier: 3, desc: "폭발하는 화산", discovered: false },
  { id: "rainbow", name: "무지개", emoji: "🌈", tier: 3, desc: "비 온 뒤 무지개", discovered: false },
  { id: "lake", name: "호수", emoji: "🏞️", tier: 3, desc: "잔잔한 호수", discovered: false },
  { id: "swamp", name: "늪", emoji: "🐊", tier: 3, desc: "끈적한 늪", discovered: false },
  { id: "sword", name: "칼", emoji: "🗡️", tier: 3, desc: "금속으로 만든 칼", discovered: false },
  // tier 4
  { id: "tree", name: "나무", emoji: "🌳", tier: 4, desc: "크게 자란 나무", discovered: false },
  { id: "flower", name: "꽃", emoji: "🌸", tier: 4, desc: "아름다운 꽃", discovered: false },
  { id: "forest", name: "숲", emoji: "🌲", tier: 4, desc: "나무가 가득한 숲", discovered: false },
  { id: "fish", name: "물고기", emoji: "🐟", tier: 4, desc: "바다의 첫 동물!", discovered: false },
  { id: "island", name: "섬", emoji: "🏝️", tier: 4, desc: "바다 위의 작은 땅", discovered: false },
  { id: "desert", name: "사막", emoji: "🏜️", tier: 4, desc: "모래로 뒤덮인 땅", discovered: false },
  { id: "gem", name: "보석", emoji: "💎", tier: 4, desc: "빛나는 보석", discovered: false },
  { id: "sun", name: "태양", emoji: "☀️", tier: 4, desc: "세상을 비추는 태양", discovered: false },
  { id: "moon", name: "달", emoji: "🌙", tier: 4, desc: "밤하늘의 달", discovered: false },
  { id: "star", name: "별", emoji: "⭐", tier: 4, desc: "반짝이는 별", discovered: false },
  // tier 5
  { id: "bird", name: "새", emoji: "🐦", tier: 5, desc: "하늘을 나는 새", discovered: false },
  { id: "insect", name: "곤충", emoji: "🐛", tier: 5, desc: "작은 곤충", discovered: false },
  { id: "mushroom", name: "버섯", emoji: "🍄", tier: 5, desc: "숲 속의 버섯", discovered: false },
  { id: "frog", name: "개구리", emoji: "🐸", tier: 5, desc: "개굴개굴", discovered: false },
  { id: "fruit", name: "열매", emoji: "🍎", tier: 5, desc: "맛있는 열매", discovered: false },
  { id: "turtle", name: "거북이", emoji: "🐢", tier: 5, desc: "느리지만 오래 사는", discovered: false },
  { id: "whale", name: "고래", emoji: "🐋", tier: 5, desc: "바다의 거인", discovered: false },
  { id: "coral", name: "산호", emoji: "🪸", tier: 5, desc: "바다 속 산호초", discovered: false },
  { id: "night", name: "밤", emoji: "🌙", tier: 5, desc: "어두운 밤", discovered: false },
  { id: "day", name: "낮", emoji: "🌞", tier: 5, desc: "밝은 낮", discovered: false },
  // tier 6
  { id: "dino", name: "공룡", emoji: "🦕", tier: 6, desc: "고대의 거대한 생물", discovered: false },
  { id: "butterfly", name: "나비", emoji: "🦋", tier: 6, desc: "아름다운 나비", discovered: false },
  { id: "wolf", name: "늑대", emoji: "🐺", tier: 6, desc: "숲의 포식자", discovered: false },
  { id: "horse", name: "말", emoji: "🐴", tier: 6, desc: "빠르게 달리는 말", discovered: false },
  { id: "monkey", name: "원숭이", emoji: "🐵", tier: 6, desc: "영리한 원숭이", discovered: false },
  { id: "dragon", name: "드래곤", emoji: "🐉", tier: 6, desc: "전설의 드래곤!", discovered: false },
  { id: "unicorn", name: "유니콘", emoji: "🦄", tier: 6, desc: "신비한 유니콘", discovered: false },
  { id: "phoenix", name: "불사조", emoji: "🔥", tier: 6, desc: "불에서 되살아나는 새", discovered: false },
  { id: "sky", name: "하늘", emoji: "🌤️", tier: 6, desc: "끝없이 넓은 하늘", discovered: false },
  // tier 7
  { id: "human", name: "인간", emoji: "🧑", tier: 7, desc: "지혜로운 인간!", discovered: false },
  { id: "house", name: "집", emoji: "🏠", tier: 7, desc: "인간이 사는 집", discovered: false },
  { id: "farm", name: "농장", emoji: "🌾", tier: 7, desc: "식물을 기르는 농장", discovered: false },
  { id: "village", name: "마을", emoji: "🏘️", tier: 7, desc: "사람들의 마을", discovered: false },
  { id: "ship", name: "배", emoji: "⛵", tier: 7, desc: "바다를 건너는 배", discovered: false },
  { id: "wheel", name: "바퀴", emoji: "☸️", tier: 7, desc: "위대한 발명, 바퀴", discovered: false },
  { id: "fire2", name: "불꽃놀이", emoji: "🎆", tier: 7, desc: "축하의 불꽃", discovered: false },
  { id: "music", name: "음악", emoji: "🎵", tier: 7, desc: "아름다운 소리", discovered: false },
  // tier 8
  { id: "city", name: "도시", emoji: "🏙️", tier: 8, desc: "큰 도시", discovered: false },
  { id: "castle", name: "성", emoji: "🏰", tier: 8, desc: "웅장한 성", discovered: false },
  { id: "kingdom", name: "왕국", emoji: "👑", tier: 8, desc: "위대한 왕국", discovered: false },
  { id: "science", name: "과학", emoji: "🔬", tier: 8, desc: "세상의 비밀을 알아내다", discovered: false },
  { id: "art", name: "예술", emoji: "🎨", tier: 8, desc: "아름다움을 표현하다", discovered: false },
  { id: "airplane", name: "비행기", emoji: "✈️", tier: 8, desc: "하늘을 나는 기계", discovered: false },
  { id: "computer", name: "컴퓨터", emoji: "💻", tier: 8, desc: "계산하는 기계", discovered: false },
  { id: "love", name: "사랑", emoji: "❤️", tier: 8, desc: "세상에서 가장 강한 힘", discovered: false },
  // tier 9 (최종)
  { id: "internet", name: "인터넷", emoji: "🌐", tier: 9, desc: "세계를 연결하다", discovered: false },
  { id: "space", name: "우주", emoji: "🚀", tier: 9, desc: "무한한 우주", discovered: false },
  { id: "time", name: "시간", emoji: "⏳", tier: 9, desc: "멈추지 않는 시간", discovered: false },
  { id: "life", name: "생명", emoji: "🧬", tier: 9, desc: "모든 것의 시작", discovered: false },
  { id: "world", name: "세상", emoji: "🌍", tier: 9, desc: "완성된 세상!", discovered: false },
  { id: "god", name: "창조주", emoji: "✨", tier: 9, desc: "세상을 만든 당신!", discovered: false },
];

const RECIPES: Recipe[] = [
  // tier 1
  { a: "fire", b: "water", result: "steam" },
  { a: "water", b: "earth", result: "mud" },
  { a: "fire", b: "earth", result: "lava" },
  { a: "air", b: "earth", result: "dust" },
  { a: "fire", b: "air", result: "energy" },
  { a: "water", b: "air", result: "cloud" },
  // tier 2
  { a: "lava", b: "water", result: "stone" },
  { a: "cloud", b: "water", result: "rain" },
  { a: "stone", b: "air", result: "sand" },
  { a: "stone", b: "fire", result: "metal" },
  { a: "sand", b: "fire", result: "glass" },
  { a: "water", b: "water", result: "ice" },
  { a: "energy", b: "cloud", result: "lightning" },
  { a: "mud", b: "fire", result: "clay" },
  // tier 3
  { a: "rain", b: "earth", result: "plant" },
  { a: "mud", b: "rain", result: "plant" },
  { a: "water", b: "rain", result: "ocean" },
  { a: "stone", b: "stone", result: "mountain" },
  { a: "rain", b: "ice", result: "snow" },
  { a: "mountain", b: "lava", result: "volcano" },
  { a: "rain", b: "sun", result: "rainbow" },
  { a: "water", b: "mountain", result: "lake" },
  { a: "mud", b: "plant", result: "swamp" },
  { a: "metal", b: "fire", result: "sword" },
  // tier 4
  { a: "plant", b: "earth", result: "tree" },
  { a: "plant", b: "rain", result: "flower" },
  { a: "tree", b: "tree", result: "forest" },
  { a: "ocean", b: "plant", result: "fish" },
  { a: "ocean", b: "mountain", result: "island" },
  { a: "sand", b: "sand", result: "desert" },
  { a: "stone", b: "mountain", result: "gem" },
  { a: "fire", b: "energy", result: "sun" },
  { a: "stone", b: "cloud", result: "moon" },
  { a: "energy", b: "air", result: "star" },
  { a: "fire", b: "fire", result: "sun" },
  // tier 5
  { a: "air", b: "fish", result: "bird" },
  { a: "plant", b: "air", result: "insect" },
  { a: "rain", b: "tree", result: "mushroom" },
  { a: "swamp", b: "fish", result: "frog" },
  { a: "tree", b: "flower", result: "fruit" },
  { a: "fish", b: "stone", result: "turtle" },
  { a: "ocean", b: "fish", result: "whale" },
  { a: "ocean", b: "stone", result: "coral" },
  { a: "moon", b: "star", result: "night" },
  { a: "sun", b: "cloud", result: "day" },
  // tier 6
  { a: "turtle", b: "energy", result: "dino" },
  { a: "insect", b: "flower", result: "butterfly" },
  { a: "forest", b: "frog", result: "wolf" },
  { a: "bird", b: "earth", result: "horse" },
  { a: "tree", b: "wolf", result: "monkey" },
  { a: "fire", b: "dino", result: "dragon" },
  { a: "horse", b: "star", result: "unicorn" },
  { a: "bird", b: "fire", result: "phoenix" },
  { a: "cloud", b: "sun", result: "sky" },
  // tier 7
  { a: "monkey", b: "energy", result: "human" },
  { a: "human", b: "stone", result: "house" },
  { a: "human", b: "plant", result: "farm" },
  { a: "house", b: "house", result: "village" },
  { a: "human", b: "ocean", result: "ship" },
  { a: "stone", b: "energy", result: "wheel" },
  { a: "fire", b: "star", result: "fire2" },
  { a: "human", b: "air", result: "music" },
  // tier 8
  { a: "village", b: "village", result: "city" },
  { a: "village", b: "stone", result: "castle" },
  { a: "city", b: "castle", result: "kingdom" },
  { a: "human", b: "glass", result: "science" },
  { a: "human", b: "flower", result: "art" },
  { a: "bird", b: "metal", result: "airplane" },
  { a: "science", b: "lightning", result: "computer" },
  { a: "human", b: "human", result: "love" },
  // tier 9
  { a: "computer", b: "computer", result: "internet" },
  { a: "star", b: "night", result: "space" },
  { a: "day", b: "night", result: "time" },
  { a: "love", b: "energy", result: "life" },
  { a: "kingdom", b: "life", result: "world" },
  { a: "world", b: "love", result: "god" },
  { a: "world", b: "time", result: "god" },
];

const TIER_COLORS = ["#9ca3af", "#60a5fa", "#34d399", "#fbbf24", "#f97316", "#ef4444", "#a855f7", "#ec4899", "#f43f5e", "#ffd700"];
const TIER_NAMES = ["기본", "반응", "물질", "자연", "성장", "동물", "전설", "문명", "발전", "★창조★"];

type Screen = "main" | "combine" | "collection" | "world";

export default function WorldCreatorPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [elements, setElements] = useState<Element[]>(() => ALL_ELEMENTS.map(e => ({ ...e })));
  const [selected, setSelected] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<{ el: Element; isNew: boolean } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [hint, setHint] = useState("");
  const [totalDiscovered, setTotalDiscovered] = useState(4);
  const [filterTier, setFilterTier] = useState(-1);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const sparkId = useRef(0);

  const discovered = elements.filter(e => e.discovered);
  const maxTier = Math.max(...discovered.map(e => e.tier));

  const selectElement = useCallback((id: string) => {
    setSelected(prev => {
      if (prev.length >= 2) return [id];
      if (prev.includes(id)) return prev.filter(x => x !== id);
      return [...prev, id];
    });
  }, []);

  const combine = useCallback(() => {
    if (selected.length !== 2) return;
    const [a, b] = selected;

    const recipe = RECIPES.find(r =>
      (r.a === a && r.b === b) || (r.a === b && r.b === a)
    );

    if (recipe) {
      const el = elements.find(e => e.id === recipe.result);
      if (el) {
        const isNew = !el.discovered;
        if (isNew) {
          setElements(prev => prev.map(e => e.id === recipe.result ? { ...e, discovered: true } : e));
          setTotalDiscovered(d => d + 1);
        }
        setLastResult({ el: { ...el, discovered: true }, isNew });
        setShowResult(true);

        // 스파클 효과
        if (isNew) {
          for (let i = 0; i < 8; i++) {
            const id = sparkId.current++;
            setSparkles(prev => [...prev, { id, x: 40 + Math.random() * 60, y: 20 + Math.random() * 30 }]);
            setTimeout(() => setSparkles(prev => prev.filter(s => s.id !== id)), 1500);
          }
        }
      }
    } else {
      setLastResult(null);
      setShowResult(true);
    }
    setSelected([]);
  }, [selected, elements]);

  // 자동 조합 (2개 선택되면)
  useEffect(() => {
    if (selected.length === 2) {
      const timer = setTimeout(combine, 300);
      return () => clearTimeout(timer);
    }
  }, [selected, combine]);

  // 힌트
  const getHint = useCallback(() => {
    const undiscovered = RECIPES.filter(r => {
      const resEl = elements.find(e => e.id === r.result);
      const aFound = elements.find(e => e.id === r.a)?.discovered;
      const bFound = elements.find(e => e.id === r.b)?.discovered;
      return resEl && !resEl.discovered && aFound && bFound;
    });
    if (undiscovered.length === 0) {
      setHint("힌트 없음! 더 높은 원소를 먼저 발견하세요.");
      return;
    }
    const r = undiscovered[Math.floor(Math.random() * undiscovered.length)];
    const aEl = elements.find(e => e.id === r.a);
    const bEl = elements.find(e => e.id === r.b);
    setHint(`💡 ${aEl?.emoji} ${aEl?.name} + ${bEl?.emoji} ${bEl?.name} = ???`);
  }, [elements]);

  const worldProgress = Math.floor((totalDiscovered / ALL_ELEMENTS.length) * 100);
  const godFound = elements.find(e => e.id === "god")?.discovered;

  /* ═══════ 메인 ═══════ */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-blue-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-blue-300 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🌍</div>
            <h1 className="text-3xl font-black mb-1">세상 창조하기</h1>
            <p className="text-blue-300 text-sm">원소를 조합해서 세상을 만들자!</p>
          </div>

          {/* 진행도 */}
          <div className="bg-black/30 rounded-xl p-3 mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>세상 완성도</span>
              <span className="text-yellow-400">{totalDiscovered}/{ALL_ELEMENTS.length}</span>
            </div>
            <div className="bg-gray-800 rounded-full h-4 overflow-hidden">
              <div className="h-4 rounded-full transition-all bg-gradient-to-r from-blue-500 via-green-500 to-yellow-500" style={{ width: `${worldProgress}%` }} />
            </div>
            <div className="text-xs text-gray-400 text-center mt-1">{worldProgress}% 완성</div>
            {godFound && <div className="text-center text-yellow-400 font-bold mt-1">✨ 당신은 창조주입니다! ✨</div>}
          </div>

          {/* 티어별 발견 현황 */}
          <div className="bg-black/20 rounded-xl p-3 mb-4">
            <h3 className="text-sm font-bold mb-2 text-center">🏆 발견 현황</h3>
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 10 }, (_, tier) => {
                const total = ALL_ELEMENTS.filter(e => e.tier === tier).length;
                const found = elements.filter(e => e.tier === tier && e.discovered).length;
                return (
                  <div key={tier} className="text-center p-1 rounded-lg" style={{ background: found === total && total > 0 ? TIER_COLORS[tier] + "33" : "#00000033" }}>
                    <div className="text-[10px] font-bold" style={{ color: TIER_COLORS[tier] }}>{TIER_NAMES[tier]}</div>
                    <div className="text-xs">{found}/{total}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <button onClick={() => setScreen("combine")}
              className="w-full bg-blue-700 hover:bg-blue-600 rounded-xl p-4 text-lg font-black">
              🧪 원소 조합하기
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setScreen("collection")}
                className="bg-purple-800/50 hover:bg-purple-700/50 rounded-xl p-3 text-center">
                <div className="text-xl">📖</div>
                <div className="text-sm font-bold">도감</div>
              </button>
              <button onClick={() => setScreen("world")}
                className="bg-green-800/50 hover:bg-green-700/50 rounded-xl p-3 text-center">
                <div className="text-xl">🌍</div>
                <div className="text-sm font-bold">내 세상</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════ 조합 ═══════ */
  if (screen === "combine") {
    const filteredElements = discovered.filter(e => filterTier === -1 || e.tier === filterTier).sort((a, b) => a.tier - b.tier);

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-indigo-950 to-black text-white p-4 relative">
        <div className="max-w-md mx-auto">
          <button onClick={() => { setScreen("main"); setShowResult(false); setHint(""); }} className="text-blue-300 text-sm mb-3">← 뒤로</button>

          {/* 조합 영역 */}
          <div className="bg-black/40 rounded-xl p-4 mb-3 text-center relative overflow-hidden">
            <h3 className="text-sm font-bold mb-2">🧪 조합</h3>
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className={`w-20 h-20 rounded-xl flex items-center justify-center text-4xl border-2 ${selected[0] ? "border-blue-400 bg-blue-900/30" : "border-dashed border-gray-600 bg-black/20"}`}>
                {selected[0] ? elements.find(e => e.id === selected[0])?.emoji : "?"}
              </div>
              <div className="text-2xl font-bold text-yellow-400">+</div>
              <div className={`w-20 h-20 rounded-xl flex items-center justify-center text-4xl border-2 ${selected[1] ? "border-blue-400 bg-blue-900/30" : "border-dashed border-gray-600 bg-black/20"}`}>
                {selected[1] ? elements.find(e => e.id === selected[1])?.emoji : "?"}
              </div>
            </div>

            {/* 결과 */}
            {showResult && (
              <div className="mb-2">
                {lastResult ? (
                  <div className={`p-3 rounded-xl ${lastResult.isNew ? "bg-yellow-900/40 border border-yellow-600" : "bg-black/30"}`}>
                    <div className="text-3xl mb-1">{lastResult.el.emoji}</div>
                    <div className="font-bold" style={{ color: TIER_COLORS[lastResult.el.tier] }}>{lastResult.el.name}</div>
                    <div className="text-xs text-gray-400">{lastResult.el.desc}</div>
                    {lastResult.isNew && (
                      <div className="text-yellow-400 text-sm font-bold mt-1">🎉 새로운 발견!</div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-red-900/30 border border-red-800">
                    <div className="text-2xl">❌</div>
                    <div className="text-sm text-red-300">조합 실패! 다른 조합을 시도하세요</div>
                  </div>
                )}
              </div>
            )}

            {/* 스파클 */}
            {sparkles.map(s => (
              <div key={s.id} className="absolute pointer-events-none text-yellow-400" style={{
                left: `${s.x}%`, top: `${s.y}%`,
                animation: "sparkle 1.5s ease-out forwards",
              }}>✨</div>
            ))}
          </div>

          {/* 힌트 */}
          <div className="flex gap-2 mb-3">
            <button onClick={getHint} className="flex-1 bg-yellow-800/50 hover:bg-yellow-700/50 rounded-lg py-2 text-sm">
              💡 힌트
            </button>
            <button onClick={() => { setSelected([]); setShowResult(false); }} className="bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-2 text-sm">
              🔄 초기화
            </button>
          </div>
          {hint && <div className="text-center text-sm text-yellow-300 mb-2">{hint}</div>}

          {/* 티어 필터 */}
          <div className="flex gap-1 overflow-x-auto mb-2 pb-1">
            <button onClick={() => setFilterTier(-1)}
              className={`px-2 py-1 rounded-lg text-xs whitespace-nowrap ${filterTier === -1 ? "bg-blue-600" : "bg-gray-800"}`}>
              전체
            </button>
            {Array.from({ length: maxTier + 1 }, (_, t) => {
              const count = discovered.filter(e => e.tier === t).length;
              if (count === 0) return null;
              return (
                <button key={t} onClick={() => setFilterTier(t)}
                  className={`px-2 py-1 rounded-lg text-xs whitespace-nowrap ${filterTier === t ? "bg-blue-600" : "bg-gray-800"}`}
                  style={{ borderColor: TIER_COLORS[t] }}>
                  {TIER_NAMES[t]} ({count})
                </button>
              );
            })}
          </div>

          {/* 원소 목록 */}
          <div className="grid grid-cols-4 gap-1.5">
            {filteredElements.map(el => {
              const isSelected = selected.includes(el.id);
              return (
                <button key={el.id}
                  onClick={() => { selectElement(el.id); setShowResult(false); }}
                  className={`p-2 rounded-xl text-center transition-all active:scale-95 ${
                    isSelected ? "bg-blue-600/60 border-2 border-blue-400 scale-105" : "bg-black/30 hover:bg-black/50"
                  }`}>
                  <div className="text-2xl">{el.emoji}</div>
                  <div className="text-[10px] font-bold truncate" style={{ color: TIER_COLORS[el.tier] }}>{el.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        <style jsx>{`
          @keyframes sparkle {
            0% { opacity: 1; transform: scale(1) translateY(0); }
            100% { opacity: 0; transform: scale(2) translateY(-30px); }
          }
        `}</style>
      </div>
    );
  }

  /* ═══════ 도감 ═══════ */
  if (screen === "collection") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-indigo-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-purple-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">📖 원소 도감</h2>
          <p className="text-center text-sm text-purple-300 mb-4">{totalDiscovered}/{ALL_ELEMENTS.length} 발견</p>

          {Array.from({ length: 10 }, (_, tier) => {
            const tierEls = ALL_ELEMENTS.filter(e => e.tier === tier);
            if (tierEls.length === 0) return null;
            const found = tierEls.filter(e => elements.find(el => el.id === e.id)?.discovered);
            return (
              <div key={tier} className="mb-4">
                <h3 className="text-sm font-bold mb-1" style={{ color: TIER_COLORS[tier] }}>
                  {TIER_NAMES[tier]} ({found.length}/{tierEls.length})
                </h3>
                <div className="grid grid-cols-5 gap-1">
                  {tierEls.map(e => {
                    const disc = elements.find(el => el.id === e.id)?.discovered;
                    return (
                      <div key={e.id} className={`text-center p-1.5 rounded-lg ${disc ? "bg-black/30" : "bg-gray-900/50 opacity-40"}`}>
                        <div className="text-xl">{disc ? e.emoji : "❓"}</div>
                        <div className="text-[9px]" style={{ color: disc ? TIER_COLORS[tier] : "#666" }}>
                          {disc ? e.name : "???"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ═══════ 내 세상 ═══════ */
  if (screen === "world") {
    const hasOcean = elements.find(e => e.id === "ocean")?.discovered;
    const hasMountain = elements.find(e => e.id === "mountain")?.discovered;
    const hasForest = elements.find(e => e.id === "forest")?.discovered;
    const hasSun = elements.find(e => e.id === "sun")?.discovered;
    const hasMoon = elements.find(e => e.id === "moon")?.discovered;
    const hasStar = elements.find(e => e.id === "star")?.discovered;
    const hasHuman = elements.find(e => e.id === "human")?.discovered;
    const hasCity = elements.find(e => e.id === "city")?.discovered;
    const hasAnimal = elements.find(e => e.id === "wolf")?.discovered || elements.find(e => e.id === "bird")?.discovered;
    const hasDragon = elements.find(e => e.id === "dragon")?.discovered;
    const hasDesert = elements.find(e => e.id === "desert")?.discovered;
    const hasSnow = elements.find(e => e.id === "snow")?.discovered;
    const hasIsland = elements.find(e => e.id === "island")?.discovered;
    const hasRainbow = elements.find(e => e.id === "rainbow")?.discovered;
    const hasVolcano = elements.find(e => e.id === "volcano")?.discovered;
    const hasCastle = elements.find(e => e.id === "castle")?.discovered;
    const hasSpace = elements.find(e => e.id === "space")?.discovered;
    const hasFlower = elements.find(e => e.id === "flower")?.discovered;
    const hasShip = elements.find(e => e.id === "ship")?.discovered;
    const hasAirplane = elements.find(e => e.id === "airplane")?.discovered;
    const hasFish = elements.find(e => e.id === "fish")?.discovered;
    const hasWhale = elements.find(e => e.id === "whale")?.discovered;
    const hasBird = elements.find(e => e.id === "bird")?.discovered;
    const hasCloud = elements.find(e => e.id === "cloud")?.discovered;

    return (
      <div className="min-h-screen text-white p-4 relative overflow-hidden"
        style={{ background: hasSpace ? "linear-gradient(to bottom, #0a0020, #1a0a3a, #0a1628)" : "linear-gradient(to bottom, #1e3a5f, #60a5fa, #87ceeb)" }}>
        <div className="max-w-md mx-auto relative" style={{ minHeight: "80vh" }}>
          <button onClick={() => setScreen("main")} className="text-blue-200 text-sm mb-2 relative z-10">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-2 relative z-10">🌍 내가 만든 세상</h2>

          {/* 하늘 */}
          <div className="relative h-[70vh] rounded-xl overflow-hidden" style={{
            background: hasSpace
              ? "linear-gradient(to bottom, #0a0020 0%, #1a0a3a 30%, #2d5a87 60%, #87ceeb 100%)"
              : "linear-gradient(to bottom, #60a5fa 0%, #87ceeb 40%, #d4f1ff 70%, #90ee90 85%, #8B4513 100%)",
          }}>
            {/* 별 */}
            {hasStar && Array.from({ length: 15 }, (_, i) => (
              <div key={`star${i}`} className="absolute text-yellow-200" style={{
                left: `${5 + (i * 37) % 90}%`, top: `${2 + (i * 23) % 25}%`,
                fontSize: `${8 + (i % 3) * 4}px`,
                animation: `twinkle ${1.5 + i * 0.3}s infinite`,
              }}>⭐</div>
            ))}

            {/* 태양/달 */}
            {hasSun && <div className="absolute text-5xl" style={{ right: "10%", top: "5%", animation: "float 4s ease-in-out infinite" }}>☀️</div>}
            {hasMoon && <div className="absolute text-3xl" style={{ left: "10%", top: "8%" }}>🌙</div>}

            {/* 구름 */}
            {hasCloud && <>
              <div className="absolute text-3xl" style={{ left: "15%", top: "15%", animation: "drift 15s linear infinite" }}>☁️</div>
              <div className="absolute text-4xl" style={{ left: "55%", top: "10%", animation: "drift 20s linear infinite reverse" }}>☁️</div>
              <div className="absolute text-2xl" style={{ left: "75%", top: "20%", animation: "drift 12s linear infinite" }}>☁️</div>
            </>}

            {/* 무지개 */}
            {hasRainbow && <div className="absolute text-5xl" style={{ left: "30%", top: "18%" }}>🌈</div>}

            {/* 새/비행기 */}
            {hasBird && <div className="absolute text-xl" style={{ left: "40%", top: "22%", animation: "drift 8s linear infinite" }}>🐦</div>}
            {hasAirplane && <div className="absolute text-xl" style={{ left: "60%", top: "15%", animation: "drift 10s linear infinite reverse" }}>✈️</div>}

            {/* 드래곤 */}
            {hasDragon && <div className="absolute text-3xl" style={{ left: "20%", top: "28%", animation: "float 3s ease-in-out infinite" }}>🐉</div>}

            {/* 산 */}
            {hasMountain && <>
              <div className="absolute text-5xl" style={{ left: "5%", top: "45%" }}>⛰️</div>
              <div className="absolute text-4xl" style={{ left: "25%", top: "48%" }}>⛰️</div>
            </>}

            {/* 화산 */}
            {hasVolcano && <div className="absolute text-4xl" style={{ right: "8%", top: "42%" }}>🌋</div>}

            {/* 숲/나무 */}
            {hasForest && <>
              <div className="absolute text-3xl" style={{ left: "35%", top: "55%" }}>🌲</div>
              <div className="absolute text-3xl" style={{ left: "42%", top: "53%" }}>🌳</div>
              <div className="absolute text-3xl" style={{ left: "49%", top: "56%" }}>🌲</div>
            </>}

            {/* 꽃 */}
            {hasFlower && <>
              <div className="absolute text-xl" style={{ left: "38%", top: "62%" }}>🌸</div>
              <div className="absolute text-xl" style={{ left: "55%", top: "63%" }}>🌺</div>
            </>}

            {/* 사막 */}
            {hasDesert && <div className="absolute text-3xl" style={{ right: "20%", top: "55%" }}>🏜️</div>}

            {/* 눈 */}
            {hasSnow && <div className="absolute text-3xl" style={{ left: "10%", top: "40%" }}>❄️</div>}

            {/* 성 / 도시 */}
            {hasCastle && <div className="absolute text-3xl" style={{ left: "15%", top: "58%" }}>🏰</div>}
            {hasCity && <div className="absolute text-3xl" style={{ left: "60%", top: "58%" }}>🏙️</div>}

            {/* 동물 */}
            {hasAnimal && <div className="absolute text-xl" style={{ left: "48%", top: "64%" }}>🐺</div>}
            {hasHuman && <div className="absolute text-xl" style={{ left: "65%", top: "65%" }}>🧑</div>}

            {/* 바다 */}
            {hasOcean && (
              <div className="absolute bottom-0 left-0 right-0 h-[25%]"
                style={{ background: "linear-gradient(to bottom, #1e90ff88, #00008bcc)" }}>
                {hasFish && <div className="absolute text-xl" style={{ left: "20%", top: "30%", animation: "swim 5s linear infinite" }}>🐟</div>}
                {hasWhale && <div className="absolute text-2xl" style={{ left: "60%", top: "20%", animation: "swim 8s linear infinite reverse" }}>🐋</div>}
                {hasShip && <div className="absolute text-2xl" style={{ left: "40%", top: "-5%", animation: "float 3s ease-in-out infinite" }}>⛵</div>}
                {hasIsland && <div className="absolute text-2xl" style={{ right: "10%", top: "-5%" }}>🏝️</div>}
              </div>
            )}

            {/* 로켓 (우주) */}
            {hasSpace && <div className="absolute text-2xl" style={{ right: "15%", top: "5%", animation: "float 2s ease-in-out infinite" }}>🚀</div>}

            {godFound && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center bg-black/50 rounded-xl p-4">
                  <div className="text-5xl mb-2">✨</div>
                  <div className="text-xl font-black text-yellow-400">창조 완료!</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          @keyframes twinkle { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
          @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
          @keyframes drift { 0% { transform: translateX(-20px); } 100% { transform: translateX(20px); } }
          @keyframes swim { 0% { transform: translateX(-10px); } 50% { transform: translateX(10px); } 100% { transform: translateX(-10px); } }
        `}</style>
      </div>
    );
  }

  return null;
}
