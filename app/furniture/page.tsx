"use client";
import { useState, useCallback, useRef } from "react";
import Link from "next/link";

/* ───── 재료 ───── */
interface Material {
  id: string;
  name: string;
  emoji: string;
  color: string;
  quality: number;    // 1~5
  price: number;
  desc: string;
}

const MATERIALS: Material[] = [
  { id: "cardboard", name: "골판지", emoji: "📦", color: "#c4a97d", quality: 1, price: 0, desc: "무료! 하지만 약하다" },
  { id: "pine", name: "소나무", emoji: "🌲", color: "#a3be8c", quality: 2, price: 10, desc: "기본 나무" },
  { id: "oak", name: "참나무", emoji: "🪵", color: "#92400e", quality: 3, price: 25, desc: "튼튼한 나무" },
  { id: "walnut", name: "월넛", emoji: "🟤", color: "#5c3317", quality: 4, price: 50, desc: "고급 원목" },
  { id: "marble", name: "대리석", emoji: "⬜", color: "#e2e8f0", quality: 4, price: 60, desc: "고급스러운 돌" },
  { id: "steel", name: "스틸", emoji: "🔩", color: "#94a3b8", quality: 3, price: 35, desc: "단단한 금속" },
  { id: "glass", name: "유리", emoji: "🪟", color: "#bfdbfe", quality: 3, price: 30, desc: "투명하고 깨끗" },
  { id: "gold", name: "금", emoji: "🥇", color: "#fbbf24", quality: 5, price: 100, desc: "최고급!" },
  { id: "crystal", name: "크리스탈", emoji: "💎", color: "#c4b5fd", quality: 5, price: 120, desc: "반짝반짝" },
  { id: "bamboo", name: "대나무", emoji: "🎋", color: "#84cc16", quality: 2, price: 15, desc: "자연 느낌" },
];

/* ───── 가구 설계도 ───── */
interface Blueprint {
  id: string;
  name: string;
  emoji: string;
  category: "chair" | "table" | "shelf" | "bed" | "decoration" | "special";
  parts: number;           // 필요 파츠 수
  difficulty: number;      // 1~5
  baseScore: number;
  unlockLevel: number;
  desc: string;
}

const BLUEPRINTS: Blueprint[] = [
  // 의자
  { id: "stool", name: "스툴", emoji: "🪑", category: "chair", parts: 3, difficulty: 1, baseScore: 20, unlockLevel: 1, desc: "간단한 의자" },
  { id: "chair", name: "등받이 의자", emoji: "💺", category: "chair", parts: 4, difficulty: 2, baseScore: 40, unlockLevel: 2, desc: "편한 의자" },
  { id: "armchair", name: "안락의자", emoji: "🛋️", category: "chair", parts: 5, difficulty: 3, baseScore: 70, unlockLevel: 4, desc: "푹신한 안락의자" },
  { id: "throne", name: "왕좌", emoji: "👑", category: "chair", parts: 6, difficulty: 5, baseScore: 150, unlockLevel: 7, desc: "왕의 의자!" },
  // 테이블
  { id: "sidetable", name: "사이드 테이블", emoji: "🔲", category: "table", parts: 3, difficulty: 1, baseScore: 25, unlockLevel: 1, desc: "작은 테이블" },
  { id: "desk", name: "책상", emoji: "🖥️", category: "table", parts: 4, difficulty: 2, baseScore: 45, unlockLevel: 2, desc: "공부할 책상" },
  { id: "diningtable", name: "식탁", emoji: "🍽️", category: "table", parts: 5, difficulty: 3, baseScore: 80, unlockLevel: 4, desc: "가족 식탁" },
  { id: "counter", name: "아일랜드 카운터", emoji: "🏝️", category: "table", parts: 6, difficulty: 4, baseScore: 120, unlockLevel: 6, desc: "주방 카운터" },
  // 선반
  { id: "shelf", name: "선반", emoji: "📚", category: "shelf", parts: 3, difficulty: 1, baseScore: 20, unlockLevel: 1, desc: "벽 선반" },
  { id: "bookcase", name: "책장", emoji: "📖", category: "shelf", parts: 5, difficulty: 3, baseScore: 65, unlockLevel: 3, desc: "큰 책장" },
  { id: "cabinet", name: "캐비닛", emoji: "🗄️", category: "shelf", parts: 5, difficulty: 3, baseScore: 70, unlockLevel: 5, desc: "수납장" },
  // 침대
  { id: "cot", name: "간이 침대", emoji: "🛏️", category: "bed", parts: 4, difficulty: 2, baseScore: 35, unlockLevel: 2, desc: "간단한 침대" },
  { id: "bed", name: "침대", emoji: "🛌", category: "bed", parts: 5, difficulty: 3, baseScore: 75, unlockLevel: 3, desc: "편안한 침대" },
  { id: "bunkbed", name: "2층 침대", emoji: "🏗️", category: "bed", parts: 6, difficulty: 4, baseScore: 110, unlockLevel: 5, desc: "2층 침대!" },
  { id: "kingbed", name: "킹사이즈 침대", emoji: "👑", category: "bed", parts: 7, difficulty: 5, baseScore: 160, unlockLevel: 8, desc: "최고급 침대" },
  // 장식
  { id: "frame", name: "액자", emoji: "🖼️", category: "decoration", parts: 2, difficulty: 1, baseScore: 15, unlockLevel: 1, desc: "벽걸이 액자" },
  { id: "lamp", name: "스탠드", emoji: "💡", category: "decoration", parts: 3, difficulty: 2, baseScore: 35, unlockLevel: 2, desc: "조명 스탠드" },
  { id: "mirror", name: "거울", emoji: "🪞", category: "decoration", parts: 3, difficulty: 2, baseScore: 40, unlockLevel: 3, desc: "전신 거울" },
  { id: "clock", name: "벽시계", emoji: "🕰️", category: "decoration", parts: 4, difficulty: 3, baseScore: 55, unlockLevel: 4, desc: "멋진 벽시계" },
  // 특수
  { id: "piano", name: "피아노", emoji: "🎹", category: "special", parts: 7, difficulty: 5, baseScore: 180, unlockLevel: 8, desc: "그랜드 피아노" },
  { id: "fountain", name: "분수", emoji: "⛲", category: "special", parts: 6, difficulty: 4, baseScore: 130, unlockLevel: 6, desc: "실내 분수" },
  { id: "aquarium", name: "수족관", emoji: "🐠", category: "special", parts: 5, difficulty: 4, baseScore: 100, unlockLevel: 5, desc: "물고기 수족관" },
];

/* ───── 도구 ───── */
interface Tool {
  id: string;
  name: string;
  emoji: string;
  bonus: number;      // 품질 보너스
  speedBonus: number;  // 제작 속도 보너스
  price: number;
}

const TOOLS: Tool[] = [
  { id: "hand", name: "맨손", emoji: "✋", bonus: 0, speedBonus: 0, price: 0 },
  { id: "hammer", name: "망치", emoji: "🔨", bonus: 1, speedBonus: 1, price: 30 },
  { id: "saw", name: "톱", emoji: "🪚", bonus: 1, speedBonus: 2, price: 40 },
  { id: "drill", name: "드릴", emoji: "🔧", bonus: 2, speedBonus: 2, price: 60 },
  { id: "sander", name: "샌더", emoji: "🪵", bonus: 3, speedBonus: 1, price: 80 },
  { id: "lathe", name: "선반기", emoji: "⚙️", bonus: 3, speedBonus: 3, price: 120 },
  { id: "cnc", name: "CNC 머신", emoji: "🤖", bonus: 5, speedBonus: 5, price: 250 },
  { id: "laser", name: "레이저 커터", emoji: "🔴", bonus: 5, speedBonus: 4, price: 300 },
];

/* ───── 코팅/마감 ───── */
interface Finish {
  id: string;
  name: string;
  emoji: string;
  beautyBonus: number;
  price: number;
}

const FINISHES: Finish[] = [
  { id: "none", name: "무코팅", emoji: "❌", beautyBonus: 0, price: 0 },
  { id: "wax", name: "왁스", emoji: "🕯️", beautyBonus: 5, price: 5 },
  { id: "paint", name: "페인트", emoji: "🎨", beautyBonus: 10, price: 10 },
  { id: "varnish", name: "바니시", emoji: "✨", beautyBonus: 15, price: 15 },
  { id: "lacquer", name: "래커", emoji: "💫", beautyBonus: 20, price: 25 },
  { id: "gold_leaf", name: "금박", emoji: "🥇", beautyBonus: 30, price: 50 },
];

/* ───── 제작된 가구 ───── */
interface FurnitureItem {
  id: number;
  blueprint: Blueprint;
  material: Material;
  finish: Finish;
  quality: number;     // 최종 품질 (S/A/B/C/D)
  score: number;
  beauty: number;
}

const QUALITY_GRADES = [
  { min: 90, grade: "S", color: "#fbbf24", label: "전설!" },
  { min: 75, grade: "A", color: "#a855f7", label: "최고급" },
  { min: 55, grade: "B", color: "#3b82f6", label: "좋음" },
  { min: 35, grade: "C", color: "#22c55e", label: "보통" },
  { min: 0, grade: "D", color: "#6b7280", label: "평범" },
];

/* ───── 주문 (미션) ───── */
interface Order {
  id: number;
  customerName: string;
  customerEmoji: string;
  blueprintId: string;
  minQuality: string;    // 최소 등급
  reward: number;
  xpReward: number;
  timeLimit: number;     // 남은 턴
  desc: string;
}

const CUSTOMER_NAMES = ["김사장", "이할머니", "박선생", "최부자", "정디자이너", "강공주", "홍작가", "유대표", "조셰프", "한건축가"];
const CUSTOMER_EMOJIS = ["👨‍💼", "👵", "👩‍🏫", "🤑", "👩‍🎨", "👸", "✍️", "🧑‍💼", "👨‍🍳", "👷"];

type Screen = "main" | "workshop" | "orders" | "shop" | "gallery" | "crafting";

export default function FurniturePage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(30);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(40);
  const [ownedTools, setOwnedTools] = useState<string[]>(["hand", "hammer"]);
  const [selectedTool, setSelectedTool] = useState("hammer");
  const [gallery, setGallery] = useState<FurnitureItem[]>([]);
  const [totalCrafted, setTotalCrafted] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reputation, setReputation] = useState(0);
  const furnitureId = useRef(0);
  const orderId = useRef(0);

  // 제작 중
  const [craftingBP, setCraftingBP] = useState<Blueprint | null>(null);
  const [craftingMat, setCraftingMat] = useState<Material | null>(null);
  const [craftingFinish, setCraftingFinish] = useState<Finish>(FINISHES[0]);
  const [craftStep, setCraftStep] = useState(0);  // 0=재료선택, 1=코팅선택, 2=제작중, 3=완성
  const [craftProgress, setCraftProgress] = useState(0);
  const [craftClicks, setCraftClicks] = useState(0);
  const [craftResult, setCraftResult] = useState<FurnitureItem | null>(null);
  const [perfectHits, setPerfectHits] = useState(0);
  const [gaugePos, setGaugePos] = useState(50);
  const [gaugeDir, setGaugeDir] = useState(1);
  const gaugeRef = useRef<NodeJS.Timeout | null>(null);

  // 레벨업
  const checkLevel = () => {
    if (xp >= xpNeeded) {
      setXp(x => x - xpNeeded);
      setPlayerLevel(l => l + 1);
      setXpNeeded(n => Math.floor(n * 1.3));
    }
  };

  // 주문 생성
  const generateOrder = useCallback(() => {
    const available = BLUEPRINTS.filter(b => playerLevel >= b.unlockLevel);
    const bp = available[Math.floor(Math.random() * available.length)];
    const custIdx = Math.floor(Math.random() * CUSTOMER_NAMES.length);
    const minQ = bp.difficulty <= 2 ? "D" : bp.difficulty <= 3 ? "C" : "B";
    const reward = bp.baseScore + bp.difficulty * 15 + Math.floor(Math.random() * 20);
    const id = orderId.current++;
    return {
      id, customerName: CUSTOMER_NAMES[custIdx], customerEmoji: CUSTOMER_EMOJIS[custIdx],
      blueprintId: bp.id, minQuality: minQ, reward, xpReward: bp.difficulty * 8,
      timeLimit: 5 + bp.difficulty, desc: `${bp.emoji} ${bp.name} ${minQ}등급 이상 만들어 주세요!`,
    };
  }, [playerLevel]);

  // 첫 주문
  if (orders.length === 0 && playerLevel >= 1) {
    const newOrders = Array.from({ length: 3 }, () => generateOrder());
    setOrders(newOrders);
  }

  const toolBonus = TOOLS.find(t => t.id === selectedTool)?.bonus || 0;
  const toolSpeed = TOOLS.find(t => t.id === selectedTool)?.speedBonus || 0;

  // 가구 제작 시작
  const startCrafting = (bp: Blueprint) => {
    setCraftingBP(bp);
    setCraftingMat(null);
    setCraftingFinish(FINISHES[0]);
    setCraftStep(0);
    setCraftProgress(0);
    setCraftClicks(0);
    setCraftResult(null);
    setPerfectHits(0);
    setScreen("crafting");
  };

  // 제작 게이지 시작
  const startGauge = () => {
    setCraftStep(2);
    setCraftProgress(0);
    setCraftClicks(0);
    setPerfectHits(0);
    setGaugePos(50);
    setGaugeDir(1);

    if (gaugeRef.current) clearInterval(gaugeRef.current);
    const speed = Math.max(15, 40 - toolSpeed * 3 - playerLevel);
    gaugeRef.current = setInterval(() => {
      setGaugePos(prev => {
        let next = prev + gaugeDir * (2 + Math.random());
        if (next >= 100 || next <= 0) {
          setGaugeDir(d => d * -1);
          next = Math.max(0, Math.min(100, next));
        }
        return next;
      });
    }, speed);
  };

  // 망치질 (게이지 히트)
  const hitGauge = () => {
    if (!craftingBP || !craftingMat || craftStep !== 2) return;
    const needed = craftingBP.parts * 3 - toolSpeed;
    setCraftClicks(c => c + 1);

    // 게이지 중앙(40~60)이면 퍼펙트
    const isPerfect = gaugePos >= 35 && gaugePos <= 65;
    const isGood = gaugePos >= 20 && gaugePos <= 80;

    if (isPerfect) {
      setPerfectHits(p => p + 1);
      setCraftProgress(p => Math.min(100, p + (100 / needed) * 1.5));
    } else if (isGood) {
      setCraftProgress(p => Math.min(100, p + (100 / needed)));
    } else {
      setCraftProgress(p => Math.min(100, p + (100 / needed) * 0.5));
    }

    // 완성 체크
    if (craftProgress + (100 / needed) >= 100) {
      finishCrafting();
    }
  };

  // 제작 완성
  const finishCrafting = () => {
    if (!craftingBP || !craftingMat) return;
    if (gaugeRef.current) clearInterval(gaugeRef.current);

    const matQuality = craftingMat.quality * 15;
    const toolQ = toolBonus * 5;
    const perfectQ = perfectHits * 3;
    const finishQ = craftingFinish.beautyBonus;
    const levelQ = playerLevel * 2;
    const randomQ = Math.floor(Math.random() * 10);
    const totalQ = Math.min(100, matQuality + toolQ + perfectQ + finishQ + levelQ + randomQ - craftingBP.difficulty * 5);

    const score = Math.floor(craftingBP.baseScore * (totalQ / 50) + finishQ);
    const beauty = Math.floor(matQuality * 0.5 + finishQ + perfectQ * 0.5);

    const item: FurnitureItem = {
      id: furnitureId.current++,
      blueprint: craftingBP,
      material: craftingMat,
      finish: craftingFinish,
      quality: totalQ,
      score,
      beauty,
    };

    setCraftResult(item);
    setCraftStep(3);
    setGallery(prev => [item, ...prev].slice(0, 50));
    setTotalCrafted(t => t + 1);
    setCoins(c => c + Math.floor(score / 3));
    setXp(x => x + Math.floor(score / 4));
    setReputation(r => r + Math.floor(score / 10));
    checkLevel();

    // 주문 체크
    const grade = getGrade(totalQ);
    setOrders(prev => prev.map(o => {
      if (o.blueprintId !== craftingBP.id) return o;
      const gradeOrder = ["S", "A", "B", "C", "D"];
      if (gradeOrder.indexOf(grade.grade) <= gradeOrder.indexOf(o.minQuality)) {
        setCoins(c => c + o.reward);
        setXp(x => x + o.xpReward);
        setReputation(r => r + 5);
        return { ...o, timeLimit: -1 }; // 완료 표시
      }
      return o;
    }));
  };

  const getGrade = (q: number) => {
    for (const g of QUALITY_GRADES) { if (q >= g.min) return g; }
    return QUALITY_GRADES[QUALITY_GRADES.length - 1];
  };

  const buyTool = (id: string) => {
    const tool = TOOLS.find(t => t.id === id);
    if (!tool || coins < tool.price || ownedTools.includes(id)) return;
    setCoins(c => c - tool.price);
    setOwnedTools(prev => [...prev, id]);
  };

  const CATEGORIES = [
    { id: "all", name: "전체", emoji: "📋" },
    { id: "chair", name: "의자", emoji: "🪑" },
    { id: "table", name: "테이블", emoji: "🔲" },
    { id: "shelf", name: "선반", emoji: "📚" },
    { id: "bed", name: "침대", emoji: "🛏️" },
    { id: "decoration", name: "장식", emoji: "🖼️" },
    { id: "special", name: "특수", emoji: "⭐" },
  ];
  const [filterCat, setFilterCat] = useState("all");

  /* ───── 메인 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-800 via-orange-900 to-stone-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-amber-300 text-sm mb-4 inline-block">← 홈으로</Link>
          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🪑</div>
            <h1 className="text-3xl font-black mb-1">가구 만들기</h1>
            <p className="text-amber-300 text-sm">나만의 가구를 직접 만들자!</p>
          </div>

          <div className="bg-amber-900/40 rounded-xl p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-yellow-400 font-bold">🪙 {coins}</span>
              <span className="text-amber-300 text-sm">Lv.{playerLevel}</span>
              <span className="text-amber-300 text-sm">⭐ 평판 {reputation}</span>
            </div>
            <div className="bg-amber-900 rounded-full h-2 overflow-hidden">
              <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <div className="text-[10px] text-amber-400 text-right mt-0.5">{xp}/{xpNeeded} XP</div>
            <div className="text-xs text-amber-300 text-center mt-1">🪑 총 제작: {totalCrafted}개</div>
          </div>

          <div className="space-y-2">
            <button onClick={() => setScreen("workshop")} className="w-full bg-amber-600 hover:bg-amber-500 rounded-xl p-4 text-center text-lg font-black">🔨 작업실 (가구 만들기)</button>
            <button onClick={() => setScreen("orders")} className="w-full bg-blue-700 hover:bg-blue-600 rounded-xl p-3 text-center font-bold">
              📋 주문서 <span className="text-xs text-blue-300 ml-1">{orders.filter(o => o.timeLimit > 0).length}건</span>
            </button>
            <button onClick={() => setScreen("shop")} className="w-full bg-gray-700 hover:bg-gray-600 rounded-xl p-3 text-center font-bold">🛒 도구 상점</button>
            <button onClick={() => setScreen("gallery")} className="w-full bg-purple-700 hover:bg-purple-600 rounded-xl p-3 text-center font-bold">🏛️ 갤러리 ({gallery.length})</button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 작업실 ───── */
  if (screen === "workshop") {
    const filtered = filterCat === "all" ? BLUEPRINTS : BLUEPRINTS.filter(b => b.category === filterCat);
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-800 to-stone-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-amber-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-2">🔨 작업실</h2>

          {/* 도구 선택 */}
          <div className="bg-black/30 rounded-xl p-2 mb-3">
            <div className="text-xs font-bold mb-1">🔧 사용 도구:</div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {TOOLS.filter(t => ownedTools.includes(t.id)).map(t => (
                <button key={t.id} onClick={() => setSelectedTool(t.id)}
                  className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs ${selectedTool === t.id ? "bg-amber-600 ring-1 ring-yellow-400" : "bg-gray-700"}`}>
                  {t.emoji} {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* 카테고리 */}
          <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setFilterCat(c.id)}
                className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-bold ${filterCat === c.id ? "bg-amber-600" : "bg-gray-800"}`}>
                {c.emoji} {c.name}
              </button>
            ))}
          </div>

          {/* 설계도 목록 */}
          <div className="space-y-1.5">
            {filtered.map(bp => {
              const locked = playerLevel < bp.unlockLevel;
              return (
                <button key={bp.id} onClick={() => !locked && startCrafting(bp)} disabled={locked}
                  className={`w-full flex items-center gap-2 p-2 rounded-xl text-left ${locked ? "bg-gray-800/50 opacity-50" : "bg-black/30 hover:bg-black/50"}`}>
                  <span className="text-3xl">{locked ? "🔒" : bp.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{bp.name}</div>
                    <div className="text-[10px] text-gray-400">{bp.desc}</div>
                    <div className="flex gap-2 text-[10px] text-gray-500">
                      <span>🔧 파츠:{bp.parts}</span>
                      <span>{"⭐".repeat(bp.difficulty)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-right text-gray-400">
                    <div>+{bp.baseScore}점</div>
                    {locked && <div className="text-red-400">Lv.{bp.unlockLevel}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 제작 중 ───── */
  if (screen === "crafting" && craftingBP) {
    // 재료 선택
    if (craftStep === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-stone-800 to-stone-950 text-white p-4">
          <div className="max-w-md mx-auto">
            <button onClick={() => setScreen("workshop")} className="text-amber-300 text-sm mb-3">← 뒤로</button>
            <div className="text-center mb-3">
              <span className="text-4xl">{craftingBP.emoji}</span>
              <h2 className="text-lg font-black">{craftingBP.name} 만들기</h2>
              <p className="text-xs text-gray-400">재료를 선택하세요!</p>
            </div>
            <div className="space-y-1.5">
              {MATERIALS.map(m => {
                const canAfford = coins >= m.price;
                return (
                  <button key={m.id} onClick={() => { if (canAfford) { setCraftingMat(m); if (m.price > 0) setCoins(c => c - m.price); setCraftStep(1); } }}
                    disabled={!canAfford}
                    className={`w-full flex items-center gap-2 p-2 rounded-xl ${canAfford ? "bg-black/30 hover:bg-black/50" : "bg-gray-800/50 opacity-50"}`}>
                    <span className="text-2xl">{m.emoji}</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{m.name}</div>
                      <div className="text-[10px] text-gray-400">{m.desc}</div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-yellow-400">{"⭐".repeat(m.quality)}</div>
                      {m.price > 0 ? <div>🪙{m.price}</div> : <div className="text-green-400">무료</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // 코팅 선택
    if (craftStep === 1) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-stone-800 to-stone-950 text-white p-4">
          <div className="max-w-md mx-auto">
            <button onClick={() => setCraftStep(0)} className="text-amber-300 text-sm mb-3">← 재료 다시 선택</button>
            <div className="text-center mb-3">
              <span className="text-4xl">{craftingBP.emoji}</span>
              <h2 className="text-lg font-black">{craftingBP.name}</h2>
              <p className="text-xs text-gray-400">재료: {craftingMat?.emoji} {craftingMat?.name} | 마감을 선택하세요!</p>
            </div>
            <div className="space-y-1.5">
              {FINISHES.map(f => {
                const canAfford = coins >= f.price;
                return (
                  <button key={f.id} onClick={() => { if (canAfford) { setCraftingFinish(f); if (f.price > 0) setCoins(c => c - f.price); startGauge(); } }}
                    disabled={!canAfford}
                    className={`w-full flex items-center gap-2 p-2 rounded-xl ${canAfford ? "bg-black/30 hover:bg-black/50" : "bg-gray-800/50 opacity-50"}`}>
                    <span className="text-2xl">{f.emoji}</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{f.name}</div>
                      <div className="text-[10px] text-gray-400">아름다움 +{f.beautyBonus}</div>
                    </div>
                    <div className="text-xs">{f.price > 0 ? <span>🪙{f.price}</span> : <span className="text-green-400">무료</span>}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // 제작 (타이밍 게이지)
    if (craftStep === 2) {
      const isPerfectZone = gaugePos >= 35 && gaugePos <= 65;
      const isGoodZone = gaugePos >= 20 && gaugePos <= 80;
      return (
        <div className="min-h-screen bg-gradient-to-b from-amber-900 to-stone-950 text-white p-4">
          <div className="max-w-md mx-auto text-center">
            <div className="text-4xl mb-2">{craftingBP.emoji}</div>
            <h2 className="text-lg font-black mb-1">{craftingBP.name} 제작 중!</h2>
            <p className="text-xs text-gray-400 mb-2">{craftingMat?.emoji} {craftingMat?.name} + {craftingFinish.emoji} {craftingFinish.name}</p>

            {/* 진행도 */}
            <div className="mb-3">
              <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
                <div className="h-4 bg-amber-500 rounded-full transition-all" style={{ width: `${craftProgress}%` }} />
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{Math.floor(craftProgress)}%</div>
            </div>

            {/* 타이밍 게이지 */}
            <div className="relative bg-gray-800 rounded-xl h-12 mb-4 overflow-hidden">
              {/* 퍼펙트 존 (중앙) */}
              <div className="absolute top-0 bottom-0 bg-green-600/30" style={{ left: "35%", width: "30%" }} />
              {/* 굿 존 */}
              <div className="absolute top-0 bottom-0 bg-yellow-600/20" style={{ left: "20%", width: "15%" }} />
              <div className="absolute top-0 bottom-0 bg-yellow-600/20" style={{ left: "65%", width: "15%" }} />
              {/* 가이드 텍스트 */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] text-green-400 font-bold">PERFECT</div>
              {/* 게이지 바 */}
              <div className="absolute top-0 bottom-0 w-1.5 bg-white rounded-full transition-all" style={{ left: `${gaugePos}%` }}>
                <div className="absolute -top-1 -left-1.5 w-4 h-14 bg-white/30 rounded-full" />
              </div>
            </div>

            <div className="text-sm mb-2">
              {isPerfectZone ? <span className="text-green-400 font-bold">🎯 PERFECT!</span> :
               isGoodZone ? <span className="text-yellow-400">👍 GOOD</span> :
               <span className="text-gray-500">🔴 MISS</span>}
            </div>

            <button onClick={hitGauge}
              className="w-full bg-red-600 hover:bg-red-500 active:bg-red-700 active:scale-95 rounded-2xl p-6 text-center font-black text-xl transition-all shadow-lg">
              🔨 망치질! ({craftClicks})
            </button>

            <div className="mt-2 text-xs text-gray-400">퍼펙트: {perfectHits}회</div>
          </div>
        </div>
      );
    }

    // 완성
    if (craftStep === 3 && craftResult) {
      const grade = getGrade(craftResult.quality);
      return (
        <div className="min-h-screen bg-gradient-to-b from-yellow-800 via-amber-900 to-stone-950 text-white p-4 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <div className="text-7xl mb-3">{craftResult.blueprint.emoji}</div>
            <h2 className="text-2xl font-black mb-1">완성!!</h2>

            {/* 등급 */}
            <div className="text-5xl font-black mb-2" style={{ color: grade.color }}>{grade.grade}</div>
            <div className="text-sm" style={{ color: grade.color }}>{grade.label}</div>

            <div className="bg-black/40 rounded-xl p-4 my-4">
              <div className="text-lg font-bold mb-2">{craftResult.blueprint.name}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>{craftResult.material.emoji} {craftResult.material.name}</div>
                <div>{craftResult.finish.emoji} {craftResult.finish.name}</div>
                <div>🎯 품질: {craftResult.quality}</div>
                <div>✨ 아름다움: {craftResult.beauty}</div>
                <div>🏆 점수: {craftResult.score}</div>
                <div>🔨 퍼펙트: {perfectHits}회</div>
              </div>
              <div className="text-xs text-yellow-400 mt-2">🪙 +{Math.floor(craftResult.score / 3)} 코인 획득!</div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setScreen("workshop")} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">🔨 작업실</button>
              <button onClick={() => startCrafting(craftResult.blueprint)} className="flex-1 bg-amber-600 hover:bg-amber-500 rounded-xl p-3 font-bold">🔄 다시 만들기</button>
            </div>
          </div>
        </div>
      );
    }
  }

  /* ───── 주문서 ───── */
  if (screen === "orders") {
    const activeOrders = orders.filter(o => o.timeLimit > 0);
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-blue-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-3">📋 주문서</h2>
          <button onClick={() => setOrders(prev => [...prev, generateOrder()])}
            className="w-full bg-blue-700 hover:bg-blue-600 rounded-xl p-2 mb-3 text-sm font-bold">+ 새 주문 받기</button>
          <div className="space-y-2">
            {activeOrders.length === 0 && <div className="text-center text-gray-500 py-4">주문이 없습니다</div>}
            {activeOrders.map(o => {
              const bp = BLUEPRINTS.find(b => b.id === o.blueprintId);
              return (
                <div key={o.id} className="bg-black/30 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-3xl">{o.customerEmoji}</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{o.customerName}</div>
                    <div className="text-xs text-gray-400">{o.desc}</div>
                    <div className="text-[10px] text-yellow-400">보수: 🪙{o.reward}</div>
                  </div>
                  <button onClick={() => bp && startCrafting(bp)} className="bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded-lg text-xs font-bold">만들기</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 도구 상점 ───── */
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-800 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-gray-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-2">🛒 도구 상점</h2>
          <div className="text-center text-yellow-400 font-bold mb-3">🪙 {coins}</div>
          <div className="space-y-2">
            {TOOLS.map(t => {
              const owned = ownedTools.includes(t.id);
              return (
                <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl ${owned ? "bg-green-900/30 border border-green-800" : "bg-black/30"}`}>
                  <div className="text-3xl">{t.emoji}</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{t.name}</div>
                    <div className="text-xs text-gray-400">품질 +{t.bonus} | 속도 +{t.speedBonus}</div>
                  </div>
                  {owned ? <span className="text-green-400 text-sm font-bold">✅</span> : (
                    <button onClick={() => buyTool(t.id)} disabled={coins < t.price}
                      className={`text-xs px-3 py-2 rounded-lg font-bold ${coins >= t.price ? "bg-yellow-600 hover:bg-yellow-500" : "bg-gray-700 text-gray-500"}`}>
                      🪙 {t.price}
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

  /* ───── 갤러리 ───── */
  if (screen === "gallery") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-purple-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-3">🏛️ 내 갤러리 ({gallery.length})</h2>
          {gallery.length === 0 && <div className="text-center text-gray-500 py-8">아직 만든 가구가 없어요!</div>}
          <div className="grid grid-cols-2 gap-2">
            {gallery.map(item => {
              const grade = getGrade(item.quality);
              return (
                <div key={item.id} className="bg-black/30 rounded-xl p-3 text-center">
                  <div className="text-3xl mb-1">{item.blueprint.emoji}</div>
                  <div className="text-sm font-bold">{item.blueprint.name}</div>
                  <div className="text-2xl font-black" style={{ color: grade.color }}>{grade.grade}</div>
                  <div className="text-[10px] text-gray-400">{item.material.emoji} {item.material.name}</div>
                  <div className="text-[10px] text-gray-400">{item.finish.emoji} {item.finish.name}</div>
                  <div className="text-[10px] text-yellow-400">🏆 {item.score}점</div>
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
