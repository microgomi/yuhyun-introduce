"use client";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";

type CropType = "carrot" | "tomato" | "corn" | "strawberry" | "watermelon" | "potato";
type GrowthStage = 0 | 1 | 2 | 3; // 0=empty, 1=seedling, 2=growing, 3=harvest
type Weather = "sunny" | "rain" | "drought" | "storm";
type Season = "봄" | "여름" | "가을" | "겨울";
type AnimalType = "chicken" | "cow" | "pig";
type Screen = "menu" | "farm" | "shop" | "market" | "animals";
type ToolLevel = 1 | 2 | 3;

interface Plot {
  crop: CropType | null;
  stage: GrowthStage;
  watered: boolean;
  daysPlanted: number;
}

interface Animal {
  type: AnimalType;
  name: string;
  fed: boolean;
  product: number; // accumulated products
}

const CROPS: Record<CropType, { name: string; emoji: string; seedCost: number; sellPrice: number; growDays: number }> = {
  carrot: { name: "당근", emoji: "🥕", seedCost: 10, sellPrice: 30, growDays: 3 },
  tomato: { name: "토마토", emoji: "🍅", seedCost: 15, sellPrice: 45, growDays: 4 },
  corn: { name: "옥수수", emoji: "🌽", seedCost: 12, sellPrice: 35, growDays: 3 },
  strawberry: { name: "딸기", emoji: "🍓", seedCost: 20, sellPrice: 60, growDays: 5 },
  watermelon: { name: "수박", emoji: "🍉", seedCost: 30, sellPrice: 100, growDays: 6 },
  potato: { name: "감자", emoji: "🥔", seedCost: 8, sellPrice: 25, growDays: 3 },
};

const ANIMALS: Record<AnimalType, { name: string; emoji: string; cost: number; product: string; productEmoji: string; productPrice: number }> = {
  chicken: { name: "닭", emoji: "🐔", cost: 100, product: "달걀", productEmoji: "🥚", productPrice: 15 },
  cow: { name: "소", emoji: "🐄", cost: 300, product: "우유", productEmoji: "🥛", productPrice: 40 },
  pig: { name: "돼지", emoji: "🐷", cost: 200, product: "햄", productEmoji: "🥓", productPrice: 30 },
};

const WEATHER_INFO: Record<Weather, { name: string; emoji: string }> = {
  sunny: { name: "맑음", emoji: "☀️" },
  rain: { name: "비", emoji: "🌧️" },
  drought: { name: "가뭄", emoji: "🔥" },
  storm: { name: "폭풍", emoji: "⛈️" },
};

const SEASONS: Season[] = ["봄", "여름", "가을", "겨울"];
const SEASON_EMOJI: Record<Season, string> = { "봄": "🌸", "여름": "🌻", "가을": "🍂", "겨울": "❄️" };

function getRandomWeather(season: Season): Weather {
  const r = Math.random();
  if (season === "여름") return r < 0.3 ? "rain" : r < 0.45 ? "drought" : r < 0.55 ? "storm" : "sunny";
  if (season === "겨울") return r < 0.2 ? "storm" : r < 0.4 ? "rain" : "sunny";
  if (season === "봄") return r < 0.35 ? "rain" : r < 0.05 ? "storm" : "sunny";
  return r < 0.25 ? "rain" : r < 0.35 ? "drought" : "sunny";
}

const GRID_SIZE = 4;

function makeGrid(): Plot[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ crop: null, stage: 0 as GrowthStage, watered: false, daysPlanted: 0 }))
  );
}

export default function FarmGame() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [money, setMoney] = useState(200);
  const [day, setDay] = useState(1);
  const [weather, setWeather] = useState<Weather>("sunny");
  const [grid, setGrid] = useState<Plot[][]>(makeGrid);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [inventory, setInventory] = useState<Record<CropType, number>>({ carrot: 5, tomato: 0, corn: 0, strawberry: 0, watermelon: 0, potato: 3 });
  const [harvestBag, setHarvestBag] = useState<Record<CropType, number>>({ carrot: 0, tomato: 0, corn: 0, strawberry: 0, watermelon: 0, potato: 0 });
  const [selectedSeed, setSelectedSeed] = useState<CropType | null>(null);
  const [toolWater, setToolWater] = useState<ToolLevel>(1);
  const [toolHarvest, setToolHarvest] = useState<ToolLevel>(1);
  const [message, setMessage] = useState("");
  const [gridExpanded, setGridExpanded] = useState(false);
  const [animalProducts, setAnimalProducts] = useState(0);

  const season: Season = SEASONS[Math.floor(((day - 1) % 28) / 7)];
  const seasonDay = ((day - 1) % 7) + 1;

  const showMsg = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2000);
  }, []);

  const waterPlot = useCallback((r: number, c: number) => {
    setGrid(prev => {
      const g = prev.map(row => row.map(p => ({ ...p })));
      if (g[r][c].crop && g[r][c].stage > 0 && !g[r][c].watered) {
        g[r][c].watered = true;
        const bonus = toolWater >= 2 ? 1 : 0;
        if (toolWater >= 3) {
          // water neighbors too
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < g.length && nc >= 0 && nc < g[0].length && g[nr][nc].crop) {
                g[nr][nc].watered = true;
              }
            }
          }
        }
        if (bonus && g[r][c].stage < 3) {
          g[r][c].daysPlanted += bonus;
        }
      }
      return g;
    });
  }, [toolWater]);

  const plantSeed = useCallback((r: number, c: number) => {
    if (!selectedSeed) { showMsg("씨앗을 먼저 선택하세요!"); return; }
    if (inventory[selectedSeed] <= 0) { showMsg("씨앗이 없어요!"); return; }
    setGrid(prev => {
      const g = prev.map(row => row.map(p => ({ ...p })));
      if (g[r][c].crop !== null) return prev;
      g[r][c] = { crop: selectedSeed, stage: 1, watered: false, daysPlanted: 0 };
      return g;
    });
    setInventory(prev => ({ ...prev, [selectedSeed]: prev[selectedSeed] - 1 }));
  }, [selectedSeed, inventory, showMsg]);

  const harvestPlot = useCallback((r: number, c: number) => {
    setGrid(prev => {
      const g = prev.map(row => row.map(p => ({ ...p })));
      const plot = g[r][c];
      if (plot.stage !== 3 || !plot.crop) return prev;
      const crop = plot.crop;
      const bonus = toolHarvest >= 2 ? (toolHarvest >= 3 ? 3 : 2) : 1;
      setHarvestBag(hb => ({ ...hb, [crop]: hb[crop] + bonus }));
      g[r][c] = { crop: null, stage: 0, watered: false, daysPlanted: 0 };
      return g;
    });
  }, [toolHarvest]);

  const handlePlotClick = useCallback((r: number, c: number) => {
    const plot = grid[r][c];
    if (plot.crop === null) {
      plantSeed(r, c);
    } else if (plot.stage === 3) {
      harvestPlot(r, c);
      showMsg("수확했어요! 🎉");
    } else if (!plot.watered) {
      waterPlot(r, c);
      showMsg("물을 줬어요! 💧");
    } else {
      showMsg("이미 물을 줬어요. 다음 날을 기다리세요!");
    }
  }, [grid, plantSeed, harvestPlot, waterPlot, showMsg]);

  const nextDay = useCallback(() => {
    const newDay = day + 1;
    const newWeather = getRandomWeather(SEASONS[Math.floor(((newDay - 1) % 28) / 7)]);
    setDay(newDay);
    setWeather(newWeather);

    setGrid(prev => {
      const g = prev.map(row => row.map(p => ({ ...p })));
      for (let r = 0; r < g.length; r++) {
        for (let c = 0; c < g[r].length; c++) {
          const plot = g[r][c];
          if (!plot.crop) continue;

          if (newWeather === "rain") plot.watered = true;
          if (newWeather === "drought") plot.watered = false;
          if (newWeather === "storm" && Math.random() < 0.25) {
            g[r][c] = { crop: null, stage: 0, watered: false, daysPlanted: 0 };
            continue;
          }

          if (plot.watered && plot.stage > 0 && plot.stage < 3) {
            plot.daysPlanted += 1;
            const info = CROPS[plot.crop];
            if (plot.daysPlanted >= info.growDays) {
              plot.stage = 3;
            } else if (plot.daysPlanted >= Math.floor(info.growDays / 2)) {
              plot.stage = 2;
            }
          }
          plot.watered = false;
        }
      }
      return g;
    });

    // Animal production
    setAnimals(prev => {
      let totalProducts = 0;
      const updated = prev.map(a => {
        if (a.fed) {
          totalProducts += 1;
          return { ...a, fed: false, product: a.product + 1 };
        }
        return { ...a, fed: false };
      });
      if (totalProducts > 0) setAnimalProducts(p => p + totalProducts);
      return updated;
    });

    if (newWeather === "storm") showMsg("⛈️ 폭풍이 왔어요! 일부 작물이 피해를 입었을 수 있어요!");
    else if (newWeather === "rain") showMsg("🌧️ 비가 와서 모든 작물에 물이 줬어요!");
    else if (newWeather === "drought") showMsg("🔥 가뭄이에요! 작물이 말라가요!");
  }, [day, showMsg]);

  const buySeed = useCallback((crop: CropType) => {
    const cost = CROPS[crop].seedCost;
    if (money < cost) { showMsg("돈이 부족해요!"); return; }
    setMoney(m => m - cost);
    setInventory(prev => ({ ...prev, [crop]: prev[crop] + 1 }));
    showMsg(`${CROPS[crop].emoji} ${CROPS[crop].name} 씨앗 구매!`);
  }, [money, showMsg]);

  const buySeedBulk = useCallback((crop: CropType) => {
    const cost = CROPS[crop].seedCost * 5;
    if (money < cost) { showMsg("돈이 부족해요!"); return; }
    setMoney(m => m - cost);
    setInventory(prev => ({ ...prev, [crop]: prev[crop] + 5 }));
    showMsg(`${CROPS[crop].emoji} ${CROPS[crop].name} 씨앗 5개 구매!`);
  }, [money, showMsg]);

  const sellCrops = useCallback(() => {
    let total = 0;
    const newBag = { ...harvestBag };
    for (const crop of Object.keys(newBag) as CropType[]) {
      total += newBag[crop] * CROPS[crop].sellPrice;
      newBag[crop] = 0;
    }
    if (total === 0) { showMsg("팔 작물이 없어요!"); return; }
    setMoney(m => m + total);
    setHarvestBag(newBag);
    showMsg(`💰 ${total}원에 팔았어요!`);
  }, [harvestBag, showMsg]);

  const sellAnimalProducts = useCallback(() => {
    let total = 0;
    setAnimals(prev => {
      const updated = prev.map(a => {
        const info = ANIMALS[a.type];
        total += a.product * info.productPrice;
        return { ...a, product: 0 };
      });
      return updated;
    });
    if (total === 0) { showMsg("팔 동물 생산품이 없어요!"); return; }
    setMoney(m => m + total);
    setAnimalProducts(0);
    showMsg(`💰 동물 생산품 ${total}원에 판매!`);
  }, [showMsg]);

  const buyAnimal = useCallback((type: AnimalType) => {
    const info = ANIMALS[type];
    if (money < info.cost) { showMsg("돈이 부족해요!"); return; }
    if (animals.length >= 6) { showMsg("동물은 최대 6마리까지!"); return; }
    setMoney(m => m - info.cost);
    const names = ["복실이", "뭉치", "초코", "구름이", "달이", "별이", "콩이", "보리", "밤이", "솜이"];
    setAnimals(prev => [...prev, { type, name: names[Math.floor(Math.random() * names.length)], fed: false, product: 0 }]);
    showMsg(`${info.emoji} ${info.name} 구매 완료!`);
  }, [money, animals.length, showMsg]);

  const feedAnimal = useCallback((idx: number) => {
    if (money < 5) { showMsg("사료비 5원이 필요해요!"); return; }
    setMoney(m => m - 5);
    setAnimals(prev => prev.map((a, i) => i === idx ? { ...a, fed: true } : a));
    showMsg("🌾 밥을 줬어요!");
  }, [money, showMsg]);

  const upgradeTool = useCallback((tool: "water" | "harvest") => {
    const level = tool === "water" ? toolWater : toolHarvest;
    if (level >= 3) { showMsg("이미 최고 레벨이에요!"); return; }
    const cost = level === 1 ? 150 : 400;
    if (money < cost) { showMsg("돈이 부족해요!"); return; }
    setMoney(m => m - cost);
    if (tool === "water") setToolWater(l => Math.min(3, l + 1) as ToolLevel);
    else setToolHarvest(l => Math.min(3, l + 1) as ToolLevel);
    showMsg(`🔧 도구 업그레이드 완료!`);
  }, [toolWater, toolHarvest, money, showMsg]);

  const expandFarm = useCallback(() => {
    if (gridExpanded) { showMsg("이미 확장했어요!"); return; }
    if (money < 500) { showMsg("500원이 필요해요!"); return; }
    setMoney(m => m - 500);
    setGrid(prev => {
      const newRows = prev.map(row => [...row, { crop: null, stage: 0 as GrowthStage, watered: false, daysPlanted: 0 }, { crop: null, stage: 0 as GrowthStage, watered: false, daysPlanted: 0 }]);
      const extraRow1 = Array.from({ length: newRows[0].length }, () => ({ crop: null, stage: 0 as GrowthStage, watered: false, daysPlanted: 0 }));
      const extraRow2 = Array.from({ length: newRows[0].length }, () => ({ crop: null, stage: 0 as GrowthStage, watered: false, daysPlanted: 0 }));
      return [...newRows, extraRow1, extraRow2];
    });
    setGridExpanded(true);
    showMsg("🏗️ 농장 확장 완료!");
  }, [gridExpanded, money, showMsg]);

  const getPlotDisplay = (plot: Plot) => {
    if (!plot.crop) return { emoji: "🟫", label: "빈 땅" };
    const info = CROPS[plot.crop];
    if (plot.stage === 1) return { emoji: "🌱", label: `${info.name} 새싹` };
    if (plot.stage === 2) return { emoji: "🌿", label: `${info.name} 성장 중` };
    return { emoji: info.emoji, label: `${info.name} 수확 가능!` };
  };

  const totalHarvest = Object.values(harvestBag).reduce((a, b) => a + b, 0);
  const totalAnimalProducts = animals.reduce((a, b) => a + b.product, 0);

  // MENU SCREEN
  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-300 via-green-400 to-yellow-300 flex flex-col items-center justify-center p-4">
        <Link href="/" className="absolute top-4 left-4 bg-white/80 px-3 py-1 rounded-lg text-green-800 font-bold hover:bg-white">
          🏠 홈으로
        </Link>
        <div className="text-center">
          <div className="text-7xl mb-4">🌾🚜🌻</div>
          <h1 className="text-5xl font-black text-green-900 mb-2 drop-shadow-lg">농장 키우기</h1>
          <p className="text-xl text-green-800 mb-8">나만의 농장을 키워보세요!</p>
          <div className="grid grid-cols-5 gap-2 mb-8 text-4xl">
            <span>🥕</span><span>🍅</span><span>🌽</span><span>🍓</span><span>🍉</span>
            <span>🐔</span><span>🐄</span><span>🐷</span><span>🌈</span><span>💰</span>
          </div>
          <button
            onClick={() => setScreen("farm")}
            className="bg-green-700 hover:bg-green-800 text-white text-2xl font-bold px-12 py-4 rounded-2xl shadow-lg transform hover:scale-105 transition-all"
          >
            🌱 게임 시작!
          </button>
          <div className="mt-6 text-green-900 bg-white/50 rounded-xl p-4 max-w-md mx-auto">
            <p className="font-bold mb-2">🎮 게임 방법</p>
            <p className="text-sm text-left">
              1. 씨앗을 선택하고 빈 땅을 클릭해서 심어요<br/>
              2. 물을 줘서 작물을 키워요<br/>
              3. 다 자란 작물을 수확하고 시장에서 팔아요<br/>
              4. 동물도 키워서 생산품을 모아요<br/>
              5. 돈을 벌어서 농장을 확장해요!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // SHOP SCREEN
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-200 to-green-200 p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setScreen("farm")} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold">⬅️ 농장으로</button>
            <span className="text-xl font-bold text-yellow-800">💰 {money}원</span>
          </div>
          <h2 className="text-3xl font-black text-center text-green-900 mb-6">🏪 씨앗 가게</h2>
          {message && <div className="bg-yellow-400 text-center py-2 rounded-lg mb-4 font-bold">{message}</div>}
          <div className="space-y-3">
            {(Object.entries(CROPS) as [CropType, typeof CROPS[CropType]][]).map(([key, crop]) => (
              <div key={key} className="bg-white rounded-xl p-4 shadow flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{crop.emoji}</span>
                  <div>
                    <p className="font-bold text-lg">{crop.name} 씨앗</p>
                    <p className="text-sm text-gray-500">성장 {crop.growDays}일 | 판매가 {crop.sellPrice}원</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <button onClick={() => buySeed(key)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg font-bold text-sm">
                    {crop.seedCost}원 구매
                  </button>
                  <button onClick={() => buySeedBulk(key)} className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded-lg font-bold text-sm">
                    {crop.seedCost * 5}원 x5
                  </button>
                </div>
              </div>
            ))}
          </div>
          <h3 className="text-2xl font-bold text-center mt-8 mb-4 text-green-900">📦 내 씨앗</h3>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(inventory) as [CropType, number][]).map(([key, count]) => (
              <div key={key} className="bg-white/80 rounded-lg p-2 text-center">
                <span className="text-2xl">{CROPS[key].emoji}</span>
                <p className="font-bold">{count}개</p>
              </div>
            ))}
          </div>
          <h3 className="text-2xl font-bold text-center mt-8 mb-4 text-green-900">🔧 도구 업그레이드</h3>
          <div className="space-y-3">
            <div className="bg-white rounded-xl p-4 shadow flex items-center justify-between">
              <div>
                <p className="font-bold">💧 물뿌리개 Lv.{toolWater}</p>
                <p className="text-sm text-gray-500">{toolWater === 1 ? "기본" : toolWater === 2 ? "성장 보너스" : "주변도 물 줌"}</p>
              </div>
              {toolWater < 3 && (
                <button onClick={() => upgradeTool("water")} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg font-bold text-sm">
                  {toolWater === 1 ? "150" : "400"}원 업그레이드
                </button>
              )}
              {toolWater >= 3 && <span className="text-yellow-500 font-bold">⭐ MAX</span>}
            </div>
            <div className="bg-white rounded-xl p-4 shadow flex items-center justify-between">
              <div>
                <p className="font-bold">🔪 수확 도구 Lv.{toolHarvest}</p>
                <p className="text-sm text-gray-500">{toolHarvest === 1 ? "기본 (1개)" : toolHarvest === 2 ? "2개 수확" : "3개 수확"}</p>
              </div>
              {toolHarvest < 3 && (
                <button onClick={() => upgradeTool("harvest")} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg font-bold text-sm">
                  {toolHarvest === 1 ? "150" : "400"}원 업그레이드
                </button>
              )}
              {toolHarvest >= 3 && <span className="text-yellow-500 font-bold">⭐ MAX</span>}
            </div>
          </div>
          {!gridExpanded && (
            <div className="mt-6 bg-white rounded-xl p-4 shadow text-center">
              <p className="font-bold text-lg mb-2">🏗️ 농장 확장</p>
              <p className="text-sm text-gray-500 mb-2">4x4 → 6x6 밭으로 확장!</p>
              <button onClick={expandFarm} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-bold">
                500원 확장하기
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // MARKET SCREEN
  if (screen === "market") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-200 to-yellow-200 p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setScreen("farm")} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold">⬅️ 농장으로</button>
            <span className="text-xl font-bold text-yellow-800">💰 {money}원</span>
          </div>
          <h2 className="text-3xl font-black text-center text-orange-900 mb-6">🏪 시장 - 작물 판매</h2>
          {message && <div className="bg-yellow-400 text-center py-2 rounded-lg mb-4 font-bold">{message}</div>}
          <div className="bg-white rounded-xl p-4 shadow mb-6">
            <h3 className="font-bold text-lg mb-3">🧺 수확한 작물</h3>
            {totalHarvest === 0 ? (
              <p className="text-gray-400 text-center py-4">수확한 작물이 없어요. 농장에서 수확하세요!</p>
            ) : (
              <div className="space-y-2">
                {(Object.entries(harvestBag) as [CropType, number][]).filter(([, c]) => c > 0).map(([key, count]) => (
                  <div key={key} className="flex items-center justify-between bg-green-50 p-2 rounded-lg">
                    <span className="text-2xl">{CROPS[key].emoji} {CROPS[key].name}</span>
                    <span className="font-bold">{count}개 × {CROPS[key].sellPrice}원 = {count * CROPS[key].sellPrice}원</span>
                  </div>
                ))}
              </div>
            )}
            {totalHarvest > 0 && (
              <button onClick={sellCrops} className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-lg">
                💰 전부 판매하기 ({(Object.entries(harvestBag) as [CropType, number][]).reduce((t, [k, c]) => t + c * CROPS[k].sellPrice, 0)}원)
              </button>
            )}
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <h3 className="font-bold text-lg mb-3">🐾 동물 생산품</h3>
            {totalAnimalProducts === 0 ? (
              <p className="text-gray-400 text-center py-4">동물 생산품이 없어요.</p>
            ) : (
              <div className="space-y-2">
                {animals.filter(a => a.product > 0).map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-yellow-50 p-2 rounded-lg">
                    <span>{ANIMALS[a.type].productEmoji} {a.name}의 {ANIMALS[a.type].product}</span>
                    <span className="font-bold">{a.product}개 × {ANIMALS[a.type].productPrice}원</span>
                  </div>
                ))}
              </div>
            )}
            {totalAnimalProducts > 0 && (
              <button onClick={sellAnimalProducts} className="w-full mt-4 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl font-bold text-lg">
                💰 생산품 전부 판매
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ANIMALS SCREEN
  if (screen === "animals") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-green-200 p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setScreen("farm")} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold">⬅️ 농장으로</button>
            <span className="text-xl font-bold text-yellow-800">💰 {money}원</span>
          </div>
          <h2 className="text-3xl font-black text-center text-green-900 mb-6">🐾 동물 농장</h2>
          {message && <div className="bg-yellow-400 text-center py-2 rounded-lg mb-4 font-bold">{message}</div>}
          <div className="space-y-3 mb-6">
            <h3 className="font-bold text-xl">🛒 동물 구매</h3>
            {(Object.entries(ANIMALS) as [AnimalType, typeof ANIMALS[AnimalType]][]).map(([key, info]) => (
              <div key={key} className="bg-white rounded-xl p-4 shadow flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{info.emoji}</span>
                  <div>
                    <p className="font-bold">{info.name}</p>
                    <p className="text-sm text-gray-500">{info.productEmoji} {info.product} 생산 | 판매가 {info.productPrice}원</p>
                  </div>
                </div>
                <button onClick={() => buyAnimal(key)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg font-bold">
                  {info.cost}원
                </button>
              </div>
            ))}
          </div>
          <h3 className="font-bold text-xl mb-3">🏠 내 동물들 ({animals.length}/6)</h3>
          {animals.length === 0 ? (
            <div className="bg-white/60 rounded-xl p-8 text-center text-gray-400">
              <p className="text-4xl mb-2">🏡</p>
              <p>아직 동물이 없어요. 위에서 구매해보세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {animals.map((a, i) => (
                <div key={i} className={`rounded-xl p-3 shadow text-center ${a.fed ? "bg-green-100 border-2 border-green-400" : "bg-white"}`}>
                  <span className="text-4xl">{ANIMALS[a.type].emoji}</span>
                  <p className="font-bold">{a.name}</p>
                  <p className="text-xs text-gray-500">{ANIMALS[a.type].name}</p>
                  <p className="text-sm">{ANIMALS[a.type].productEmoji} {a.product}개</p>
                  {!a.fed ? (
                    <button onClick={() => feedAnimal(i)} className="mt-1 bg-yellow-400 hover:bg-yellow-500 text-sm px-3 py-1 rounded-lg font-bold">
                      🌾 밥 주기 (5원)
                    </button>
                  ) : (
                    <p className="mt-1 text-green-600 font-bold text-sm">✅ 배부름!</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // FARM SCREEN (main)
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 via-green-200 to-green-400 p-3">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <Link href="/" className="bg-white/80 px-3 py-1 rounded-lg text-green-800 font-bold hover:bg-white text-sm">
            🏠 홈으로
          </Link>
          <div className="flex gap-2 text-sm">
            <span className="bg-white/80 px-2 py-1 rounded-lg font-bold">📅 {day}일차</span>
            <span className="bg-white/80 px-2 py-1 rounded-lg font-bold">{SEASON_EMOJI[season]} {season} {seasonDay}일</span>
            <span className="bg-white/80 px-2 py-1 rounded-lg font-bold">{WEATHER_INFO[weather].emoji} {WEATHER_INFO[weather].name}</span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-3">
          <span className="text-xl font-black text-yellow-800 bg-yellow-200/80 px-3 py-1 rounded-xl">💰 {money}원</span>
          <div className="flex gap-1 text-xs">
            <span className="bg-blue-200 px-2 py-1 rounded">💧Lv.{toolWater}</span>
            <span className="bg-orange-200 px-2 py-1 rounded">🔪Lv.{toolHarvest}</span>
          </div>
        </div>

        {message && (
          <div className="bg-yellow-300 text-center py-2 rounded-xl mb-3 font-bold text-sm animate-pulse">{message}</div>
        )}

        {/* Seed selector */}
        <div className="bg-white/70 rounded-xl p-2 mb-3">
          <p className="text-xs font-bold text-green-800 mb-1">🌱 심을 씨앗 선택:</p>
          <div className="flex gap-1 flex-wrap">
            {(Object.entries(inventory) as [CropType, number][]).map(([key, count]) => (
              <button
                key={key}
                onClick={() => setSelectedSeed(key)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedSeed === key
                    ? "bg-green-500 text-white scale-110 shadow-lg"
                    : count > 0
                    ? "bg-green-100 hover:bg-green-200"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {CROPS[key].emoji} {count}
              </button>
            ))}
          </div>
        </div>

        {/* Farm grid */}
        <div className="bg-amber-800/30 rounded-xl p-2 mb-3">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${grid[0].length}, 1fr)` }}>
            {grid.map((row, r) =>
              row.map((plot, c) => {
                const display = getPlotDisplay(plot);
                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => handlePlotClick(r, c)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all hover:scale-105 ${
                      plot.stage === 3
                        ? "bg-yellow-200 border-2 border-yellow-500 animate-pulse"
                        : plot.watered
                        ? "bg-blue-200 border border-blue-300"
                        : plot.crop
                        ? "bg-green-200 border border-green-300"
                        : "bg-amber-300 border border-amber-400 hover:bg-amber-200"
                    }`}
                    title={display.label}
                  >
                    <span className="text-xl leading-none">{display.emoji}</span>
                    {plot.crop && plot.stage < 3 && (
                      <span className="text-[10px] mt-0.5">{plot.watered ? "💧" : ""}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Harvest bag preview */}
        {totalHarvest > 0 && (
          <div className="bg-white/60 rounded-xl p-2 mb-3 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold">🧺</span>
            {(Object.entries(harvestBag) as [CropType, number][]).filter(([, c]) => c > 0).map(([key, count]) => (
              <span key={key} className="text-sm">{CROPS[key].emoji}×{count}</span>
            ))}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <button onClick={() => setScreen("shop")} className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-sm">
            🏪 가게
          </button>
          <button onClick={() => setScreen("market")} className="bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-sm">
            💰 시장
          </button>
          <button onClick={() => setScreen("animals")} className="bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl font-bold text-sm">
            🐾 동물
          </button>
          <button onClick={nextDay} className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm">
            🌙 다음 날
          </button>
        </div>

        {/* Legend */}
        <div className="bg-white/50 rounded-xl p-2 text-xs text-gray-700 grid grid-cols-2 gap-1">
          <span>🟫 빈 땅 = 클릭해서 심기</span>
          <span>🌱 새싹 = 물 주기 클릭</span>
          <span>🌿 성장 중 = 물 주고 기다리기</span>
          <span className="text-yellow-700 font-bold">✨ 반짝이면 수확 가능!</span>
        </div>
      </div>
    </div>
  );
}
