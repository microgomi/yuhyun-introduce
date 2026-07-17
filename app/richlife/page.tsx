"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ============================================================
// TYPES
// ============================================================
type Screen = "menu" | "hub" | "work" | "invest" | "realestate" | "business" | "shop" | "education" | "casino" | "stats";

interface PlayerState {
  money: number;
  bank: number;
  income: number; // per tick
  age: number;
  energy: number;
  maxEnergy: number;
  happiness: number;
  intelligence: number;
  charisma: number;
  luck: number;
  job: Job;
  education: Education;
  houses: OwnedProperty[];
  businesses: OwnedBusiness[];
  stocks: OwnedStock[];
  crypto: OwnedCrypto[];
  cars: string[];
  items: string[];
  totalEarned: number;
  totalSpent: number;
  dayCount: number;
  achievements: string[];
}

interface Job {
  id: string;
  name: string;
  icon: string;
  salary: number;
  energyCost: number;
  requiredEdu: string;
  requiredInt: number;
}

interface Education {
  id: string;
  name: string;
  icon: string;
  level: number;
}

interface Property {
  id: string;
  name: string;
  icon: string;
  price: number;
  rent: number;
  appreciation: number; // % per cycle
}

interface OwnedProperty {
  property: Property;
  purchasePrice: number;
  level: number;
}

interface Business {
  id: string;
  name: string;
  icon: string;
  cost: number;
  income: number;
  requiredCha: number;
}

interface OwnedBusiness {
  business: Business;
  level: number;
}

interface Stock {
  id: string;
  name: string;
  icon: string;
  price: number;
  volatility: number;
  trend: number; // -1 to 1
}

interface OwnedStock {
  stock: Stock;
  shares: number;
  avgPrice: number;
}

interface Crypto {
  id: string;
  name: string;
  icon: string;
  price: number;
  volatility: number;
}

interface OwnedCrypto {
  crypto: Crypto;
  amount: number;
  avgPrice: number;
}

// ============================================================
// DATA
// ============================================================
const JOBS: Job[] = [
  { id: "none", name: "무직", icon: "😴", salary: 0, energyCost: 0, requiredEdu: "none", requiredInt: 0 },
  { id: "parttime", name: "알바", icon: "🧹", salary: 50, energyCost: 20, requiredEdu: "none", requiredInt: 0 },
  { id: "delivery", name: "배달", icon: "🛵", salary: 80, energyCost: 25, requiredEdu: "none", requiredInt: 0 },
  { id: "office", name: "회사원", icon: "💼", salary: 150, energyCost: 30, requiredEdu: "highschool", requiredInt: 10 },
  { id: "programmer", name: "프로그래머", icon: "💻", salary: 300, energyCost: 35, requiredEdu: "college", requiredInt: 20 },
  { id: "doctor", name: "의사", icon: "🩺", salary: 500, energyCost: 40, requiredEdu: "masters", requiredInt: 35 },
  { id: "lawyer", name: "변호사", icon: "⚖️", salary: 450, energyCost: 35, requiredEdu: "masters", requiredInt: 30 },
  { id: "ceo", name: "CEO", icon: "👔", salary: 800, energyCost: 45, requiredEdu: "phd", requiredInt: 40 },
  { id: "celebrity", name: "연예인", icon: "⭐", salary: 1000, energyCost: 30, requiredEdu: "college", requiredInt: 15 },
  { id: "investor", name: "전업 투자자", icon: "📈", salary: 0, energyCost: 10, requiredEdu: "college", requiredInt: 25 },
];

const EDUCATIONS: Education[] = [
  { id: "none", name: "무학력", icon: "📝", level: 0 },
  { id: "highschool", name: "고등학교", icon: "🏫", level: 1 },
  { id: "college", name: "대학교", icon: "🎓", level: 2 },
  { id: "masters", name: "석사", icon: "📚", level: 3 },
  { id: "phd", name: "박사", icon: "🎓👑", level: 4 },
];

const PROPERTIES: Property[] = [
  { id: "studio", name: "원룸", icon: "🏠", price: 5000, rent: 30, appreciation: 2 },
  { id: "apt", name: "아파트", icon: "🏢", price: 20000, rent: 100, appreciation: 3 },
  { id: "house", name: "단독주택", icon: "🏡", price: 50000, rent: 200, appreciation: 3 },
  { id: "villa", name: "빌라", icon: "🏘️", price: 100000, rent: 400, appreciation: 4 },
  { id: "penthouse", name: "펜트하우스", icon: "🏙️", price: 300000, rent: 1000, appreciation: 5 },
  { id: "mansion", name: "대저택", icon: "🏰", price: 1000000, rent: 3000, appreciation: 4 },
  { id: "island", name: "개인 섬", icon: "🏝️", price: 5000000, rent: 10000, appreciation: 6 },
];

const BUSINESSES: Business[] = [
  { id: "food_truck", name: "푸드트럭", icon: "🚚", cost: 3000, income: 40, requiredCha: 0 },
  { id: "cafe", name: "카페", icon: "☕", cost: 10000, income: 80, requiredCha: 5 },
  { id: "restaurant", name: "레스토랑", icon: "🍽️", cost: 30000, income: 200, requiredCha: 10 },
  { id: "gym", name: "헬스장", icon: "💪", cost: 50000, income: 300, requiredCha: 12 },
  { id: "hotel", name: "호텔", icon: "🏨", cost: 150000, income: 700, requiredCha: 18 },
  { id: "mall", name: "쇼핑몰", icon: "🏬", cost: 500000, income: 2000, requiredCha: 25 },
  { id: "tech_company", name: "IT 회사", icon: "🖥️", cost: 1000000, income: 5000, requiredCha: 30 },
  { id: "airline", name: "항공사", icon: "✈️", cost: 5000000, income: 15000, requiredCha: 40 },
  { id: "bank", name: "은행", icon: "🏦", cost: 20000000, income: 50000, requiredCha: 50 },
];

const STOCKS: Stock[] = [
  { id: "sam", name: "삼송전자", icon: "📱", price: 100, volatility: 0.05, trend: 0.02 },
  { id: "apple_s", name: "사과컴퓨터", icon: "🍎", price: 250, volatility: 0.04, trend: 0.03 },
  { id: "naver_s", name: "초록검색", icon: "🟢", price: 80, volatility: 0.06, trend: 0.01 },
  { id: "tesla_s", name: "전기차왕", icon: "🚗", price: 400, volatility: 0.1, trend: 0.02 },
  { id: "game_s", name: "넥슬게임", icon: "🎮", price: 60, volatility: 0.08, trend: -0.01 },
  { id: "bio_s", name: "바이오텍", icon: "🧬", price: 150, volatility: 0.12, trend: 0.01 },
  { id: "ai_s", name: "AI솔루션", icon: "🤖", price: 500, volatility: 0.15, trend: 0.05 },
];

const CRYPTOS: Crypto[] = [
  { id: "btc", name: "비트코인", icon: "₿", price: 5000, volatility: 0.08 },
  { id: "eth", name: "이더리움", icon: "Ξ", price: 300, volatility: 0.1 },
  { id: "doge", name: "도지코인", icon: "🐕", price: 1, volatility: 0.2 },
  { id: "sol", name: "솔라나", icon: "☀️", price: 50, volatility: 0.12 },
];

const CARS = [
  { id: "bicycle", name: "자전거", icon: "🚲", price: 100, happiness: 2 },
  { id: "scooter", name: "스쿠터", icon: "🛵", price: 500, happiness: 5 },
  { id: "sedan", name: "승용차", icon: "🚗", price: 3000, happiness: 10 },
  { id: "suv", name: "SUV", icon: "🚙", price: 8000, happiness: 15 },
  { id: "sports", name: "스포츠카", icon: "🏎️", price: 30000, happiness: 25 },
  { id: "supercar", name: "슈퍼카", icon: "🏎️💨", price: 150000, happiness: 40 },
  { id: "yacht", name: "요트", icon: "🛥️", price: 500000, happiness: 50 },
  { id: "jet", name: "전용기", icon: "✈️", price: 5000000, happiness: 80 },
  { id: "rocket", name: "우주선", icon: "🚀", price: 50000000, happiness: 100 },
];

const LUXURY = [
  { id: "watch", name: "명품 시계", icon: "⌚", price: 5000, happiness: 8 },
  { id: "bag", name: "명품 가방", icon: "👜", price: 3000, happiness: 5 },
  { id: "suit", name: "맞춤 정장", icon: "🤵", price: 2000, happiness: 6 },
  { id: "painting", name: "미술 작품", icon: "🖼️", price: 50000, happiness: 15 },
  { id: "diamond", name: "다이아몬드", icon: "💎", price: 200000, happiness: 30 },
  { id: "gold_bar", name: "금괴", icon: "🥇", price: 100000, happiness: 20 },
];

const EDU_COSTS: Record<string, { cost: number; intGain: number; time: number }> = {
  highschool: { cost: 500, intGain: 8, time: 3 },
  college: { cost: 3000, intGain: 12, time: 5 },
  masters: { cost: 10000, intGain: 15, time: 4 },
  phd: { cost: 30000, intGain: 20, time: 6 },
};

const ACHIEVEMENTS = [
  { id: "first_job", name: "첫 월급", icon: "💰", desc: "첫 직장을 구하라", check: (p: PlayerState) => p.job.id !== "none" },
  { id: "millionaire", name: "백만장자", icon: "💵", desc: "총 자산 100만 달성", check: (p: PlayerState) => getTotalAssets(p) >= 1000000 },
  { id: "billionaire", name: "억만장자", icon: "💎", desc: "총 자산 1억 달성", check: (p: PlayerState) => getTotalAssets(p) >= 100000000 },
  { id: "house_owner", name: "내 집 마련", icon: "🏠", desc: "첫 부동산 구매", check: (p: PlayerState) => p.houses.length > 0 },
  { id: "business_owner", name: "사장님", icon: "💼", desc: "첫 사업 시작", check: (p: PlayerState) => p.businesses.length > 0 },
  { id: "stock_trader", name: "주식 투자자", icon: "📈", desc: "첫 주식 구매", check: (p: PlayerState) => p.stocks.length > 0 },
  { id: "educated", name: "학자", icon: "🎓", desc: "박사 학위 취득", check: (p: PlayerState) => p.education.id === "phd" },
  { id: "car_collector", name: "차량 수집가", icon: "🏎️", desc: "차량 3대 보유", check: (p: PlayerState) => p.cars.length >= 3 },
  { id: "space_tourist", name: "우주 관광", icon: "🚀", desc: "우주선 구매", check: (p: PlayerState) => p.cars.includes("rocket") },
  { id: "island_owner", name: "섬 주인", icon: "🏝️", desc: "개인 섬 구매", check: (p: PlayerState) => p.houses.some((h) => h.property.id === "island") },
];

function getTotalAssets(p: PlayerState): number {
  return p.money + p.bank +
    p.houses.reduce((s, h) => s + h.property.price * (1 + h.property.appreciation * h.level * 0.01), 0) +
    p.businesses.reduce((s, b) => s + b.business.cost * (1 + b.level * 0.2), 0) +
    p.stocks.reduce((s, st) => s + st.stock.price * st.shares, 0) +
    p.crypto.reduce((s, c) => s + c.crypto.price * c.amount, 0);
}

function formatMoney(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function getRank(assets: number): { name: string; icon: string } {
  if (assets >= 1e9) return { name: "전설의 부자", icon: "👑💎" };
  if (assets >= 1e8) return { name: "억만장자", icon: "💎" };
  if (assets >= 1e7) return { name: "천만장자", icon: "💰" };
  if (assets >= 1e6) return { name: "백만장자", icon: "🤑" };
  if (assets >= 1e5) return { name: "중산층", icon: "🏠" };
  if (assets >= 1e4) return { name: "월급쟁이", icon: "💼" };
  if (assets >= 1e3) return { name: "알바생", icon: "🧹" };
  return { name: "거지", icon: "😢" };
}

// ============================================================
// COMPONENT
// ============================================================
export default function RichLife() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [player, setPlayer] = useState<PlayerState>({
    money: 500, bank: 0, income: 0, age: 18,
    energy: 100, maxEnergy: 100, happiness: 50,
    intelligence: 5, charisma: 3, luck: 5,
    job: JOBS[0], education: EDUCATIONS[0],
    houses: [], businesses: [], stocks: [], crypto: [],
    cars: [], items: [],
    totalEarned: 0, totalSpent: 0, dayCount: 0, achievements: [],
  });

  // Market prices fluctuation
  const [stocks, setStocks] = useState<Stock[]>(STOCKS.map((s) => ({ ...s })));
  const [cryptos, setCryptos] = useState<Crypto[]>(CRYPTOS.map((c) => ({ ...c })));

  // Tick - passive income & market
  useEffect(() => {
    if (screen === "menu") return;
    const interval = setInterval(() => {
      // Passive income
      setPlayer((prev) => {
        const p = { ...prev };
        // Job salary (auto)
        const salary = p.job.salary;
        // Business income
        const bizIncome = p.businesses.reduce((s, b) => s + b.business.income * (1 + b.level * 0.3), 0);
        // Rent income
        const rentIncome = p.houses.reduce((s, h) => s + h.property.rent * (1 + h.level * 0.2), 0);
        // Bank interest (0.1% per tick)
        const bankInterest = Math.floor(p.bank * 0.001);

        const totalIncome = salary + bizIncome + rentIncome + bankInterest;
        p.money += totalIncome;
        p.income = totalIncome;
        p.totalEarned += totalIncome;
        p.dayCount += 1;
        if (p.dayCount % 365 === 0) p.age += 1;

        // Energy regen
        p.energy = Math.min(p.maxEnergy, p.energy + 3);

        // Happiness decay
        p.happiness = Math.max(0, p.happiness - 0.5);

        // Check achievements
        for (const ach of ACHIEVEMENTS) {
          if (!p.achievements.includes(ach.id) && ach.check(p)) {
            p.achievements = [...p.achievements, ach.id];
          }
        }

        return p;
      });

      // Market fluctuation
      setStocks((prev) => prev.map((s) => {
        const change = (Math.random() - 0.5) * 2 * s.volatility + s.trend * 0.01;
        return { ...s, price: Math.max(1, s.price * (1 + change)) };
      }));
      setCryptos((prev) => prev.map((c) => {
        const change = (Math.random() - 0.5) * 2 * c.volatility;
        return { ...c, price: Math.max(0.01, c.price * (1 + change)) };
      }));

      // Update owned stock/crypto prices
      setPlayer((prev) => ({
        ...prev,
        stocks: prev.stocks.map((os) => {
          const current = stocks.find((s) => s.id === os.stock.id);
          return current ? { ...os, stock: current } : os;
        }),
        crypto: prev.crypto.map((oc) => {
          const current = cryptos.find((c) => c.id === oc.crypto.id);
          return current ? { ...oc, crypto: current } : oc;
        }),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [screen, stocks, cryptos]);

  const spend = (amount: number) => {
    if (player.money < amount) return false;
    setPlayer((p) => ({ ...p, money: p.money - amount, totalSpent: p.totalSpent + amount }));
    return true;
  };

  const totalAssets = getTotalAssets(player);
  const rank = getRank(totalAssets);

  // ============================================================
  // SCREENS
  // ============================================================
  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-950 via-gray-950 to-gray-950 text-white flex flex-col items-center justify-center px-4">
        <Link href="/" className="absolute top-4 left-4 text-sm text-gray-500 hover:text-white">← 홈으로</Link>
        <div className="text-center max-w-md">
          <div className="text-6xl mb-3">💰</div>
          <h1 className="text-4xl font-black mb-1 bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">부자 되기</h1>
          <p className="text-sm text-gray-400 mb-6">알바생에서 억만장자까지!</p>
          <div className="text-left bg-white/5 rounded-xl p-4 border border-yellow-900/30 mb-6 text-sm text-gray-300 space-y-1">
            <p>💼 취직하고 월급을 모아라</p>
            <p>🎓 공부해서 더 좋은 직업을 구하라</p>
            <p>📈 주식/코인에 투자하라</p>
            <p>🏠 부동산을 사서 임대 수입을 올려라</p>
            <p>🏢 사업을 시작해서 자동 수입을 만들어라</p>
            <p>🏎️ 럭셔리 아이템으로 행복도를 높여라</p>
            <p>🚀 우주선을 사면 진정한 부자!</p>
          </div>
          <button onClick={() => setScreen("hub")} className="w-full rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 py-4 text-xl font-black hover:brightness-125 border border-yellow-400/30">
            💰 시작하기
          </button>
        </div>
      </div>
    );
  }

  if (screen === "hub") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="mb-2 flex items-center justify-between">
            <Link href="/" className="text-sm text-gray-500 hover:text-white">← 홈</Link>
            <span className="text-xs text-gray-500">📅 {player.dayCount}일차 | 나이: {player.age}세</span>
          </div>

          {/* Profile */}
          <div className="mb-3 rounded-xl bg-gradient-to-r from-yellow-900/30 to-amber-900/20 p-3 border border-yellow-500/20">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{rank.icon}</span>
              <div className="flex-1">
                <div className="font-black text-lg text-yellow-400">{rank.name}</div>
                <div className="text-xs text-gray-400">{player.job.icon} {player.job.name} | {player.education.icon} {player.education.name}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-yellow-300">💰 {formatMoney(player.money)}</div>
                <div className="text-xs text-gray-400">총 자산: {formatMoney(totalAssets)}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div><span className="text-green-400">📈 수입</span><div className="font-bold">{formatMoney(player.income)}/틱</div></div>
              <div><span className="text-blue-400">🏦 은행</span><div className="font-bold">{formatMoney(player.bank)}</div></div>
              <div><span className="text-pink-400">😊 행복</span><div className="font-bold">{Math.floor(player.happiness)}</div></div>
            </div>
            <div className="mt-2 flex gap-2 text-[10px] text-gray-500">
              <span>🧠 지능:{player.intelligence}</span>
              <span>💬 매력:{player.charisma}</span>
              <span>🍀 행운:{player.luck}</span>
              <span>⚡ 에너지:{player.energy}/{player.maxEnergy}</span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button onClick={() => setScreen("work")} className="rounded-xl bg-blue-900/40 p-3 text-center hover:bg-blue-900/60 border border-blue-500/20">
              <div className="text-xl">💼</div><div className="text-[10px] font-bold">일하기</div>
            </button>
            <button onClick={() => setScreen("invest")} className="rounded-xl bg-green-900/40 p-3 text-center hover:bg-green-900/60 border border-green-500/20">
              <div className="text-xl">📈</div><div className="text-[10px] font-bold">투자</div>
            </button>
            <button onClick={() => setScreen("realestate")} className="rounded-xl bg-amber-900/40 p-3 text-center hover:bg-amber-900/60 border border-amber-500/20">
              <div className="text-xl">🏠</div><div className="text-[10px] font-bold">부동산</div>
            </button>
            <button onClick={() => setScreen("business")} className="rounded-xl bg-purple-900/40 p-3 text-center hover:bg-purple-900/60 border border-purple-500/20">
              <div className="text-xl">🏢</div><div className="text-[10px] font-bold">사업</div>
            </button>
            <button onClick={() => setScreen("education")} className="rounded-xl bg-cyan-900/40 p-3 text-center hover:bg-cyan-900/60 border border-cyan-500/20">
              <div className="text-xl">🎓</div><div className="text-[10px] font-bold">교육</div>
            </button>
            <button onClick={() => setScreen("shop")} className="rounded-xl bg-pink-900/40 p-3 text-center hover:bg-pink-900/60 border border-pink-500/20">
              <div className="text-xl">🛍️</div><div className="text-[10px] font-bold">쇼핑</div>
            </button>
          </div>

          {/* Bank */}
          <div className="mb-3 flex gap-2">
            <button onClick={() => { const amt = Math.floor(player.money * 0.5); if (amt > 0) setPlayer((p) => ({ ...p, money: p.money - amt, bank: p.bank + amt })); }}
              className="flex-1 rounded-lg bg-blue-900/30 py-2 text-xs font-bold hover:bg-blue-900/50 border border-blue-500/20">
              🏦 예금 (50%)
            </button>
            <button onClick={() => { const amt = Math.floor(player.bank * 0.5); if (amt > 0) setPlayer((p) => ({ ...p, money: p.money + amt, bank: p.bank - amt })); }}
              className="flex-1 rounded-lg bg-blue-900/30 py-2 text-xs font-bold hover:bg-blue-900/50 border border-blue-500/20">
              🏦 출금 (50%)
            </button>
            <button onClick={() => setScreen("stats")}
              className="flex-1 rounded-lg bg-gray-800/50 py-2 text-xs font-bold hover:bg-gray-800/80 border border-white/10">
              📊 통계
            </button>
          </div>

          {/* Rest */}
          <button onClick={() => setPlayer((p) => ({ ...p, energy: p.maxEnergy, happiness: Math.min(100, p.happiness + 10) }))}
            className="w-full rounded-lg bg-indigo-900/30 py-2 text-xs text-indigo-300 hover:bg-indigo-900/50 border border-indigo-500/20">
            😴 휴식 (에너지 회복 + 행복 +10)
          </button>

          {/* Achievements */}
          {player.achievements.length > 0 && (
            <div className="mt-3 flex gap-1 flex-wrap">
              {player.achievements.map((id) => {
                const ach = ACHIEVEMENTS.find((a) => a.id === id);
                return ach ? <span key={id} className="text-lg" title={ach.name}>{ach.icon}</span> : null;
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === "work") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("hub")} className="text-sm text-gray-400 hover:text-white">← 뒤로</button>
            <span className="text-yellow-400 font-bold">💰 {formatMoney(player.money)}</span>
          </div>
          <h2 className="text-xl font-black mb-3 text-center">💼 직업 선택</h2>
          <div className="space-y-2">
            {JOBS.filter((j) => j.id !== "none").map((job) => {
              const eduMet = EDUCATIONS.findIndex((e) => e.id === job.requiredEdu) <= EDUCATIONS.findIndex((e) => e.id === player.education.id);
              const intMet = player.intelligence >= job.requiredInt;
              const canApply = eduMet && intMet;
              const isCurrentJob = player.job.id === job.id;
              return (
                <button key={job.id} onClick={() => canApply && setPlayer((p) => ({ ...p, job }))}
                  disabled={!canApply}
                  className={`w-full rounded-xl p-3 text-left border transition-all ${isCurrentJob ? "bg-blue-900/40 border-blue-400/40" : canApply ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-gray-800/30 border-gray-700 opacity-40"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{job.icon}</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{job.name} {isCurrentJob && <span className="text-xs text-blue-400">(현재)</span>}</div>
                      <div className="text-xs text-gray-400">월급: {job.salary}/틱 | 에너지: -{job.energyCost}</div>
                      {!canApply && <div className="text-xs text-red-400">필요: {!eduMet ? EDUCATIONS.find((e) => e.id === job.requiredEdu)?.name : ""} {!intMet ? `지능 ${job.requiredInt}` : ""}</div>}
                    </div>
                    <span className="text-yellow-400 text-sm font-bold">${job.salary}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {/* Work button */}
          {player.job.id !== "none" && (
            <button onClick={() => {
              if (player.energy >= player.job.energyCost) {
                const bonus = Math.floor(player.job.salary * (1 + player.intelligence * 0.02 + player.luck * 0.01));
                setPlayer((p) => ({ ...p, money: p.money + bonus, energy: p.energy - player.job.energyCost, totalEarned: p.totalEarned + bonus, charisma: Math.min(100, p.charisma + 0.2) }));
              }
            }} disabled={player.energy < player.job.energyCost}
              className="w-full mt-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-3 font-black hover:brightness-110 disabled:opacity-40">
              🔨 일하기 (+${Math.floor(player.job.salary * (1 + player.intelligence * 0.02))} | ⚡-{player.job.energyCost})
            </button>
          )}
        </div>
      </div>
    );
  }

  if (screen === "invest") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("hub")} className="text-sm text-gray-400 hover:text-white">← 뒤로</button>
            <span className="text-yellow-400 font-bold">💰 {formatMoney(player.money)}</span>
          </div>
          <h2 className="text-xl font-black mb-3 text-center">📈 투자</h2>

          {/* Stocks */}
          <div className="text-sm font-bold text-green-400 mb-2">📊 주식</div>
          <div className="space-y-1.5 mb-4">
            {stocks.map((s) => {
              const owned = player.stocks.find((os) => os.stock.id === s.id);
              const profit = owned ? (s.price - owned.avgPrice) * owned.shares : 0;
              return (
                <div key={s.id} className="rounded-lg bg-white/5 p-2.5 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{s.icon}</span>
                    <div className="flex-1">
                      <div className="text-xs font-bold">{s.name}</div>
                      <div className="text-[10px] text-gray-400">${s.price.toFixed(1)} {owned && <span className={profit >= 0 ? "text-green-400" : "text-red-400"}>({profit >= 0 ? "+" : ""}{formatMoney(profit)})</span>}</div>
                      {owned && <div className="text-[10px] text-gray-500">{owned.shares}주 보유</div>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => {
                        const shares = Math.floor(player.money / s.price);
                        if (shares <= 0) return;
                        const cost = shares * s.price;
                        setPlayer((p) => {
                          const existing = p.stocks.find((os) => os.stock.id === s.id);
                          if (existing) {
                            const newShares = existing.shares + shares;
                            const newAvg = (existing.avgPrice * existing.shares + cost) / newShares;
                            return { ...p, money: p.money - cost, stocks: p.stocks.map((os) => os.stock.id === s.id ? { ...os, shares: newShares, avgPrice: newAvg, stock: s } : os) };
                          }
                          return { ...p, money: p.money - cost, stocks: [...p.stocks, { stock: s, shares, avgPrice: s.price }] };
                        });
                      }} className="text-[10px] bg-green-800/50 px-2 py-1 rounded hover:bg-green-800/80">매수</button>
                      {owned && (
                        <button onClick={() => {
                          const revenue = owned.shares * s.price;
                          setPlayer((p) => ({ ...p, money: p.money + revenue, stocks: p.stocks.filter((os) => os.stock.id !== s.id) }));
                        }} className="text-[10px] bg-red-800/50 px-2 py-1 rounded hover:bg-red-800/80">매도</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Crypto */}
          <div className="text-sm font-bold text-orange-400 mb-2">₿ 가상화폐</div>
          <div className="space-y-1.5">
            {cryptos.map((c) => {
              const owned = player.crypto.find((oc) => oc.crypto.id === c.id);
              const profit = owned ? (c.price - owned.avgPrice) * owned.amount : 0;
              return (
                <div key={c.id} className="rounded-lg bg-white/5 p-2.5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{c.icon}</span>
                    <div className="flex-1">
                      <div className="text-xs font-bold">{c.name}</div>
                      <div className="text-[10px] text-gray-400">${c.price.toFixed(2)} {owned && <span className={profit >= 0 ? "text-green-400" : "text-red-400"}>({profit >= 0 ? "+" : ""}{formatMoney(profit)})</span>}</div>
                      {owned && <div className="text-[10px] text-gray-500">{owned.amount.toFixed(2)}개</div>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => {
                        const amount = player.money / c.price;
                        if (amount <= 0) return;
                        const cost = player.money;
                        setPlayer((p) => {
                          const existing = p.crypto.find((oc) => oc.crypto.id === c.id);
                          if (existing) {
                            const newAmt = existing.amount + amount;
                            const newAvg = (existing.avgPrice * existing.amount + cost) / newAmt;
                            return { ...p, money: 0, crypto: p.crypto.map((oc) => oc.crypto.id === c.id ? { ...oc, amount: newAmt, avgPrice: newAvg, crypto: c } : oc) };
                          }
                          return { ...p, money: 0, crypto: [...p.crypto, { crypto: c, amount, avgPrice: c.price }] };
                        });
                      }} className="text-[10px] bg-green-800/50 px-2 py-1 rounded hover:bg-green-800/80">매수</button>
                      {owned && (
                        <button onClick={() => {
                          const revenue = owned.amount * c.price;
                          setPlayer((p) => ({ ...p, money: p.money + revenue, crypto: p.crypto.filter((oc) => oc.crypto.id !== c.id) }));
                        }} className="text-[10px] bg-red-800/50 px-2 py-1 rounded hover:bg-red-800/80">매도</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "realestate") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("hub")} className="text-sm text-gray-400 hover:text-white">← 뒤로</button>
            <span className="text-yellow-400 font-bold">💰 {formatMoney(player.money)}</span>
          </div>
          <h2 className="text-xl font-black mb-3 text-center">🏠 부동산</h2>
          {player.houses.length > 0 && (
            <div className="mb-3 text-xs text-gray-400">
              보유 부동산: {player.houses.map((h) => `${h.property.icon}${h.property.name}(Lv${h.level})`).join(", ")}
              <div className="text-green-400">임대 수입: +{formatMoney(player.houses.reduce((s, h) => s + h.property.rent * (1 + h.level * 0.2), 0))}/틱</div>
            </div>
          )}
          <div className="space-y-2">
            {PROPERTIES.map((prop) => {
              const owned = player.houses.find((h) => h.property.id === prop.id);
              return (
                <div key={prop.id} className="rounded-xl bg-white/5 p-3 border border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{prop.icon}</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{prop.name} {owned && <span className="text-xs text-green-400">(보유 Lv{owned.level})</span>}</div>
                      <div className="text-xs text-gray-400">임대: +{prop.rent}/틱 | 감정: +{prop.appreciation}%/년</div>
                    </div>
                    <div className="flex gap-1">
                      {!owned ? (
                        <button onClick={() => {
                          if (player.money >= prop.price) {
                            setPlayer((p) => ({ ...p, money: p.money - prop.price, houses: [...p.houses, { property: prop, purchasePrice: prop.price, level: 1 }], totalSpent: p.totalSpent + prop.price }));
                          }
                        }} disabled={player.money < prop.price}
                          className="text-[10px] bg-green-800/50 px-2 py-1 rounded hover:bg-green-800/80 disabled:opacity-30">
                          💰{formatMoney(prop.price)}
                        </button>
                      ) : (
                        <button onClick={() => {
                          const upgCost = Math.floor(prop.price * 0.3 * owned.level);
                          if (player.money >= upgCost) {
                            setPlayer((p) => ({ ...p, money: p.money - upgCost, houses: p.houses.map((h) => h.property.id === prop.id ? { ...h, level: h.level + 1 } : h) }));
                          }
                        }} disabled={player.money < Math.floor(prop.price * 0.3 * owned.level)}
                          className="text-[10px] bg-blue-800/50 px-2 py-1 rounded hover:bg-blue-800/80 disabled:opacity-30">
                          ⬆️{formatMoney(Math.floor(prop.price * 0.3 * owned.level))}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "business") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("hub")} className="text-sm text-gray-400 hover:text-white">← 뒤로</button>
            <span className="text-yellow-400 font-bold">💰 {formatMoney(player.money)} | 💬 매력:{player.charisma}</span>
          </div>
          <h2 className="text-xl font-black mb-3 text-center">🏢 사업</h2>
          <div className="space-y-2">
            {BUSINESSES.map((biz) => {
              const owned = player.businesses.find((b) => b.business.id === biz.id);
              const canBuy = player.money >= biz.cost && player.charisma >= biz.requiredCha;
              return (
                <div key={biz.id} className="rounded-xl bg-white/5 p-3 border border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{biz.icon}</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{biz.name} {owned && <span className="text-xs text-green-400">(Lv{owned.level})</span>}</div>
                      <div className="text-xs text-gray-400">수입: +{biz.income}/틱 {biz.requiredCha > 0 && `| 매력 ${biz.requiredCha} 필요`}</div>
                    </div>
                    {!owned ? (
                      <button onClick={() => {
                        if (canBuy) setPlayer((p) => ({ ...p, money: p.money - biz.cost, businesses: [...p.businesses, { business: biz, level: 1 }] }));
                      }} disabled={!canBuy} className="text-[10px] bg-green-800/50 px-2 py-1 rounded disabled:opacity-30">💰{formatMoney(biz.cost)}</button>
                    ) : (
                      <button onClick={() => {
                        const cost = Math.floor(biz.cost * 0.5 * owned.level);
                        if (player.money >= cost) setPlayer((p) => ({ ...p, money: p.money - cost, businesses: p.businesses.map((b) => b.business.id === biz.id ? { ...b, level: b.level + 1 } : b) }));
                      }} disabled={player.money < Math.floor(biz.cost * 0.5 * owned.level)}
                        className="text-[10px] bg-blue-800/50 px-2 py-1 rounded disabled:opacity-30">⬆️{formatMoney(Math.floor(biz.cost * 0.5 * owned.level))}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "education") {
    const currentLevel = EDUCATIONS.findIndex((e) => e.id === player.education.id);
    const nextEdu = EDUCATIONS[currentLevel + 1];
    const nextInfo = nextEdu ? EDU_COSTS[nextEdu.id] : null;
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("hub")} className="text-sm text-gray-400 hover:text-white">← 뒤로</button>
            <span className="text-yellow-400 font-bold">💰 {formatMoney(player.money)}</span>
          </div>
          <h2 className="text-xl font-black mb-3 text-center">🎓 교육</h2>
          <div className="mb-4 rounded-xl bg-white/5 p-4 border border-white/10 text-center">
            <div className="text-3xl mb-2">{player.education.icon}</div>
            <div className="font-bold">{player.education.name}</div>
            <div className="text-xs text-gray-400">🧠 지능: {player.intelligence}</div>
          </div>
          {nextEdu && nextInfo ? (
            <button onClick={() => {
              if (player.money >= nextInfo.cost) {
                setPlayer((p) => ({
                  ...p, money: p.money - nextInfo.cost,
                  education: nextEdu,
                  intelligence: p.intelligence + nextInfo.intGain,
                }));
              }
            }} disabled={player.money < nextInfo.cost}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-700 to-blue-700 p-4 text-left hover:brightness-110 disabled:opacity-40 border border-cyan-400/30">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{nextEdu.icon}</span>
                <div className="flex-1">
                  <div className="font-bold">{nextEdu.name} 진학</div>
                  <div className="text-xs text-gray-300">🧠 지능 +{nextInfo.intGain}</div>
                </div>
                <span className="text-yellow-400 font-bold">${formatMoney(nextInfo.cost)}</span>
              </div>
            </button>
          ) : (
            <div className="text-center text-gray-400 py-8">🎓 최고 학력 달성!</div>
          )}
          {/* Self study */}
          <button onClick={() => {
            if (player.energy >= 15) setPlayer((p) => ({ ...p, intelligence: p.intelligence + 1, energy: p.energy - 15 }));
          }} disabled={player.energy < 15}
            className="w-full mt-3 rounded-xl bg-white/5 p-3 hover:bg-white/10 border border-white/10 disabled:opacity-40">
            <div className="text-sm font-bold">📚 독학 (🧠+1 | ⚡-15)</div>
          </button>
          <button onClick={() => {
            if (player.energy >= 10) setPlayer((p) => ({ ...p, charisma: p.charisma + 1, energy: p.energy - 10, happiness: Math.min(100, p.happiness + 5) }));
          }} disabled={player.energy < 10}
            className="w-full mt-2 rounded-xl bg-white/5 p-3 hover:bg-white/10 border border-white/10 disabled:opacity-40">
            <div className="text-sm font-bold">🗣️ 사교활동 (💬+1 😊+5 | ⚡-10)</div>
          </button>
        </div>
      </div>
    );
  }

  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("hub")} className="text-sm text-gray-400 hover:text-white">← 뒤로</button>
            <span className="text-yellow-400 font-bold">💰 {formatMoney(player.money)} | 😊 {Math.floor(player.happiness)}</span>
          </div>
          <h2 className="text-xl font-black mb-3 text-center">🛍️ 쇼핑</h2>

          <div className="text-sm font-bold text-pink-400 mb-2">🚗 차량</div>
          <div className="space-y-1.5 mb-4">
            {CARS.map((car) => {
              const owned = player.cars.includes(car.id);
              return (
                <button key={car.id} onClick={() => {
                  if (!owned && player.money >= car.price) {
                    setPlayer((p) => ({ ...p, money: p.money - car.price, cars: [...p.cars, car.id], happiness: Math.min(100, p.happiness + car.happiness), totalSpent: p.totalSpent + car.price }));
                  }
                }} disabled={owned || player.money < car.price}
                  className={`w-full rounded-lg p-2.5 text-left border ${owned ? "bg-green-900/20 border-green-500/20" : "bg-white/5 border-white/10 hover:bg-white/10"} disabled:opacity-40`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{car.icon}</span>
                    <div className="flex-1">
                      <div className="text-xs font-bold">{car.name} {owned && <span className="text-green-400">✅</span>}</div>
                      <div className="text-[10px] text-gray-400">😊+{car.happiness}</div>
                    </div>
                    <span className="text-yellow-400 text-xs">${formatMoney(car.price)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-sm font-bold text-purple-400 mb-2">💎 럭셔리</div>
          <div className="space-y-1.5">
            {LUXURY.map((item) => (
              <button key={item.id} onClick={() => {
                if (player.money >= item.price) {
                  setPlayer((p) => ({ ...p, money: p.money - item.price, items: [...p.items, item.id], happiness: Math.min(100, p.happiness + item.happiness), totalSpent: p.totalSpent + item.price }));
                }
              }} disabled={player.money < item.price}
                className="w-full rounded-lg bg-white/5 p-2.5 text-left border border-white/10 hover:bg-white/10 disabled:opacity-40">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.icon}</span>
                  <div className="flex-1">
                    <div className="text-xs font-bold">{item.name}</div>
                    <div className="text-[10px] text-gray-400">😊+{item.happiness}</div>
                  </div>
                  <span className="text-yellow-400 text-xs">${formatMoney(item.price)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "stats") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <button onClick={() => setScreen("hub")} className="mb-4 text-sm text-gray-400 hover:text-white">← 뒤로</button>
          <h2 className="text-xl font-black mb-3 text-center">📊 통계</h2>
          <div className="space-y-2">
            {[
              { label: "총 자산", value: formatMoney(totalAssets), icon: "💰" },
              { label: "현금", value: formatMoney(player.money), icon: "💵" },
              { label: "은행 잔고", value: formatMoney(player.bank), icon: "🏦" },
              { label: "부동산 가치", value: formatMoney(player.houses.reduce((s, h) => s + h.property.price * (1 + h.level * 0.1), 0)), icon: "🏠" },
              { label: "사업 가치", value: formatMoney(player.businesses.reduce((s, b) => s + b.business.cost * (1 + b.level * 0.2), 0)), icon: "🏢" },
              { label: "주식 가치", value: formatMoney(player.stocks.reduce((s, st) => s + st.stock.price * st.shares, 0)), icon: "📈" },
              { label: "코인 가치", value: formatMoney(player.crypto.reduce((s, c) => s + c.crypto.price * c.amount, 0)), icon: "₿" },
              { label: "총 수입", value: formatMoney(player.totalEarned), icon: "📥" },
              { label: "총 지출", value: formatMoney(player.totalSpent), icon: "📤" },
              { label: "등급", value: rank.name, icon: rank.icon },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 border border-white/10">
                <span className="text-xs text-gray-400">{stat.icon} {stat.label}</span>
                <span className="text-sm font-bold">{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Achievements */}
          <div className="mt-4 text-sm font-bold text-yellow-400 mb-2">🏆 업적 ({player.achievements.length}/{ACHIEVEMENTS.length})</div>
          <div className="space-y-1">
            {ACHIEVEMENTS.map((ach) => (
              <div key={ach.id} className={`rounded-lg px-3 py-2 border ${player.achievements.includes(ach.id) ? "bg-yellow-900/20 border-yellow-500/20" : "bg-gray-800/30 border-gray-700 opacity-40"}`}>
                <div className="flex items-center gap-2">
                  <span>{player.achievements.includes(ach.id) ? ach.icon : "🔒"}</span>
                  <div className="text-xs"><span className="font-bold">{ach.name}</span> - {ach.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
