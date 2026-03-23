"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "orderPhase" | "cooking" | "serve" | "dayEnd";

interface Ingredient {
  id: string;
  name: string;
  emoji: string;
}

interface Recipe {
  id: string;
  name: string;
  emoji: string;
  ingredients: string[]; // ingredient ids in order
  time: number; // seconds to cook
  price: number;
  difficulty: number; // 1-5
}

interface Order {
  id: number;
  recipe: Recipe;
  patience: number; // seconds left
  maxPatience: number;
}

interface CookingItem {
  recipeId: string;
  progress: number; // 0-100
  burning: boolean;
}

// --- Constants ---
const INGREDIENTS: Ingredient[] = [
  { id: "rice", name: "밥", emoji: "🍚" },
  { id: "noodle", name: "면", emoji: "🍜" },
  { id: "bread", name: "빵", emoji: "🍞" },
  { id: "meat", name: "고기", emoji: "🥩" },
  { id: "fish", name: "생선", emoji: "🐟" },
  { id: "egg", name: "계란", emoji: "🥚" },
  { id: "veggie", name: "채소", emoji: "🥬" },
  { id: "cheese", name: "치즈", emoji: "🧀" },
  { id: "sauce", name: "소스", emoji: "🫙" },
  { id: "fruit", name: "과일", emoji: "🍓" },
];

const RECIPES: Recipe[] = [
  { id: "friedrice", name: "볶음밥", emoji: "🍛", ingredients: ["rice", "egg", "veggie"], time: 5, price: 30, difficulty: 1 },
  { id: "ramen", name: "라면", emoji: "🍜", ingredients: ["noodle", "egg", "veggie"], time: 4, price: 25, difficulty: 1 },
  { id: "burger", name: "햄버거", emoji: "🍔", ingredients: ["bread", "meat", "veggie", "cheese"], time: 6, price: 50, difficulty: 2 },
  { id: "sushi", name: "초밥", emoji: "🍣", ingredients: ["rice", "fish"], time: 4, price: 40, difficulty: 2 },
  { id: "steak", name: "스테이크", emoji: "🥩", ingredients: ["meat", "sauce"], time: 7, price: 60, difficulty: 2 },
  { id: "pasta", name: "파스타", emoji: "🍝", ingredients: ["noodle", "meat", "sauce", "cheese"], time: 7, price: 55, difficulty: 3 },
  { id: "pizza", name: "피자", emoji: "🍕", ingredients: ["bread", "cheese", "meat", "sauce", "veggie"], time: 9, price: 80, difficulty: 3 },
  { id: "omurice", name: "오므라이스", emoji: "🍳", ingredients: ["rice", "egg", "sauce", "veggie"], time: 6, price: 45, difficulty: 2 },
  { id: "sandwich", name: "샌드위치", emoji: "🥪", ingredients: ["bread", "veggie", "meat", "cheese"], time: 5, price: 40, difficulty: 2 },
  { id: "cake", name: "케이크", emoji: "🎂", ingredients: ["bread", "egg", "fruit", "cheese"], time: 10, price: 100, difficulty: 4 },
  { id: "bibimbap", name: "비빔밥", emoji: "🍲", ingredients: ["rice", "meat", "veggie", "egg", "sauce"], time: 8, price: 70, difficulty: 3 },
  { id: "fishcake", name: "어묵탕", emoji: "🍢", ingredients: ["fish", "veggie", "sauce"], time: 5, price: 35, difficulty: 1 },
];

let orderId = 0;

export default function CookingPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gold, setGold] = useState(0);
  const [day, setDay] = useState(1);
  const [dayTime, setDayTime] = useState(60); // seconds in current day
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [cookingSlots, setCookingSlots] = useState<(CookingItem | null)[]>([null, null]);
  const [servedCount, setServedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [dayEarnings, setDayEarnings] = useState(0);
  const [tips, setTips] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [bestDay, setBestDay] = useState(0);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState<"good" | "bad" | "info">("info");
  const [unlockedRecipes, setUnlockedRecipes] = useState<string[]>(["friedrice", "ramen", "sushi", "fishcake"]);
  const [slotsCount, setSlotsCount] = useState(2);
  const [reputation, setReputation] = useState(50); // 0-100

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ordersRef = useRef<Order[]>([]);
  const cookingSlotsRef = useRef<(CookingItem | null)[]>([null, null]);

  useEffect(() => { ordersRef.current = orders; }, [orders]);
  useEffect(() => { cookingSlotsRef.current = cookingSlots; }, [cookingSlots]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);
  useEffect(() => () => clearTimer(), [clearTimer]);

  const showMsg = useCallback((text: string, type: "good" | "bad" | "info") => {
    setMessage(text);
    setMsgType(type);
    setTimeout(() => setMessage(""), 2000);
  }, []);

  // Available recipes for current day
  const availableRecipes = RECIPES.filter((r) => unlockedRecipes.includes(r.id));

  // Start day
  const startDay = useCallback(() => {
    const timeForDay = 60 + day * 5;
    setDayTime(timeForDay);
    setOrders([]);
    ordersRef.current = [];
    setSelectedIngredients([]);
    const slots = Array(slotsCount).fill(null);
    setCookingSlots(slots);
    cookingSlotsRef.current = slots;
    setServedCount(0);
    setFailedCount(0);
    setDayEarnings(0);
    setTips(0);
    setCombo(0);
    setMaxCombo(0);
    setMessage("");
    orderId = 0;
    setScreen("cooking");

    // Game loop
    clearTimer();
    timerRef.current = setInterval(() => {
      // Decrease day time
      setDayTime((t) => {
        if (t <= 1) {
          clearTimer();
          setTimeout(() => setScreen("dayEnd"), 500);
          return 0;
        }
        return t - 1;
      });

      // Spawn orders
      setOrders((prev) => {
        if (prev.length < 3 + Math.floor(day / 3)) {
          const spawnChance = 0.3 + day * 0.03;
          if (Math.random() < spawnChance) {
            const recipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
            const patience = 15 + Math.floor(Math.random() * 10) - day * 0.5;
            const newOrder: Order = {
              id: ++orderId,
              recipe,
              patience: Math.max(8, patience),
              maxPatience: Math.max(8, patience),
            };
            return [...prev, newOrder];
          }
        }
        return prev;
      });

      // Decrease patience
      setOrders((prev) => {
        const updated = prev.map((o) => ({ ...o, patience: o.patience - 1 }));
        const expired = updated.filter((o) => o.patience <= 0);
        if (expired.length > 0) {
          setFailedCount((f) => f + expired.length);
          setCombo(0);
          setReputation((r) => Math.max(0, r - expired.length * 5));
        }
        return updated.filter((o) => o.patience > 0);
      });

      // Progress cooking
      setCookingSlots((prev) =>
        prev.map((slot) => {
          if (!slot) return null;
          const recipe = RECIPES.find((r) => r.id === slot.recipeId);
          if (!recipe) return null;
          const increment = 100 / recipe.time;
          const newProgress = slot.progress + increment;
          if (newProgress >= 130) {
            return { ...slot, progress: newProgress, burning: true };
          }
          return { ...slot, progress: Math.min(newProgress, 130) };
        })
      );
    }, 1000);
  }, [day, slotsCount, availableRecipes, clearTimer]);

  // Add ingredient
  const addIngredient = (ingredientId: string) => {
    setSelectedIngredients((prev) => [...prev, ingredientId]);
  };

  // Remove last ingredient
  const removeLastIngredient = () => {
    setSelectedIngredients((prev) => prev.slice(0, -1));
  };

  // Clear ingredients
  const clearIngredients = () => {
    setSelectedIngredients([]);
  };

  // Check if selected ingredients match a recipe
  const matchedRecipe = availableRecipes.find((r) =>
    r.ingredients.length === selectedIngredients.length &&
    r.ingredients.every((ing, i) => ing === selectedIngredients[i])
  );

  // Start cooking
  const startCooking = () => {
    if (!matchedRecipe) {
      showMsg("❌ 레시피에 맞지 않아요!", "bad");
      return;
    }
    const emptySlot = cookingSlots.findIndex((s) => s === null);
    if (emptySlot === -1) {
      showMsg("🍳 빈 조리대가 없어요!", "bad");
      return;
    }
    const newSlots = [...cookingSlots];
    newSlots[emptySlot] = { recipeId: matchedRecipe.id, progress: 0, burning: false };
    setCookingSlots(newSlots);
    setSelectedIngredients([]);
    showMsg(`🍳 ${matchedRecipe.emoji} ${matchedRecipe.name} 조리 시작!`, "info");
  };

  // Serve dish
  const serveDish = (slotIndex: number) => {
    const slot = cookingSlots[slotIndex];
    if (!slot) return;

    const recipe = RECIPES.find((r) => r.id === slot.recipeId);
    if (!recipe) return;

    if (slot.progress < 100) {
      showMsg("⏰ 아직 덜 익었어요!", "bad");
      return;
    }

    if (slot.burning) {
      // Can serve but lower quality
      showMsg(`🔥 ${recipe.emoji} 타버렸어요! 반값...`, "bad");
      const earn = Math.floor(recipe.price * 0.3);
      setDayEarnings((e) => e + earn);
      setGold((g) => g + earn);
      setServedCount((s) => s + 1);
      setCombo(0);
      setReputation((r) => Math.max(0, r - 3));
    } else {
      // Find matching order
      const orderIdx = orders.findIndex((o) => o.recipe.id === recipe.id);
      if (orderIdx >= 0) {
        const order = orders[orderIdx];
        const timeBonus = order.patience > order.maxPatience * 0.5 ? 1.5 : 1;
        const qualityBonus = slot.progress <= 105 ? 1.3 : 1;
        const comboBonus = 1 + combo * 0.1;
        const earn = Math.floor(recipe.price * timeBonus * qualityBonus * comboBonus);
        const tip = combo >= 3 ? Math.floor(earn * 0.2) : 0;

        setOrders((prev) => prev.filter((_, i) => i !== orderIdx));
        setDayEarnings((e) => e + earn + tip);
        setGold((g) => g + earn + tip);
        setTips((t) => t + tip);
        setServedCount((s) => s + 1);
        setCombo((c) => {
          const nc = c + 1;
          if (nc > maxCombo) setMaxCombo(nc);
          return nc;
        });
        setReputation((r) => Math.min(100, r + 2));

        const qualityText = slot.progress <= 105 ? "완벽! ✨" : "좋아요! 👍";
        showMsg(`${recipe.emoji} ${recipe.name} 서빙! +${earn}💰 ${tip > 0 ? `+${tip} 팁!` : ""} ${qualityText}`, "good");
      } else {
        // No matching order, half price
        const earn = Math.floor(recipe.price * 0.5);
        setDayEarnings((e) => e + earn);
        setGold((g) => g + earn);
        setServedCount((s) => s + 1);
        setCombo(0);
        showMsg(`${recipe.emoji} 주문 없는 요리... +${earn}💰`, "info");
      }
    }

    const newSlots = [...cookingSlots];
    newSlots[slotIndex] = null;
    setCookingSlots(newSlots);
  };

  // Trash dish
  const trashDish = (slotIndex: number) => {
    const newSlots = [...cookingSlots];
    newSlots[slotIndex] = null;
    setCookingSlots(newSlots);
    showMsg("🗑️ 버렸어요!", "bad");
  };

  // Day end - upgrades
  const nextDay = () => {
    setDay((d) => d + 1);
    setScreen("menu");
  };

  const unlockRecipe = (recipeId: string) => {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe || unlockedRecipes.includes(recipeId)) return;
    const cost = recipe.difficulty * 80;
    if (gold < cost) return;
    setGold((g) => g - cost);
    setUnlockedRecipes((prev) => [...prev, recipeId]);
  };

  const buySlot = () => {
    const cost = slotsCount * 200;
    if (gold < cost || slotsCount >= 4) return;
    setGold((g) => g - cost);
    setSlotsCount((s) => s + 1);
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-orange-950 via-amber-950 to-stone-950 text-white">
      <style jsx global>{`
        @keyframes sizzle { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        .sizzle { animation: sizzle 0.3s ease-in-out infinite; }
        @keyframes popIn { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
        .pop-in { animation: popIn 0.3s ease-out; }
      `}</style>

      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">← 홈</Link>
          <div className="text-7xl">👨‍🍳</div>
          <h1 className="text-5xl font-black">
            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">요리왕</span>
          </h1>
          <p className="text-lg text-slate-400">최고의 요리사가 되어보세요!</p>

          <button onClick={startDay} className="mt-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-12 py-4 text-xl font-black shadow-lg transition-transform hover:scale-105 active:scale-95">
            🍳 Day {day} 시작!
          </button>

          <div className="rounded-xl bg-white/5 px-6 py-3 space-y-1">
            <p className="text-sm text-slate-400">💰 골드: <span className="font-bold text-yellow-400">{gold}</span></p>
            <p className="text-sm text-slate-400">📅 Day: <span className="font-bold text-orange-400">{day}</span></p>
            <p className="text-sm text-slate-400">⭐ 평판: <span className="font-bold text-amber-400">{reputation}/100</span></p>
            <p className="text-sm text-slate-400">🍳 조리대: <span className="font-bold text-cyan-400">{slotsCount}개</span></p>
          </div>

          {/* Unlock recipes */}
          <div className="w-full max-w-sm">
            <p className="mb-2 text-sm font-bold text-orange-400">📖 레시피 해금</p>
            <div className="grid grid-cols-3 gap-2">
              {RECIPES.map((r) => {
                const owned = unlockedRecipes.includes(r.id);
                const cost = r.difficulty * 80;
                return (
                  <button
                    key={r.id}
                    onClick={() => unlockRecipe(r.id)}
                    disabled={owned || gold < cost}
                    className={`flex flex-col items-center rounded-lg border-2 p-2 text-xs transition-all ${
                      owned ? "border-green-500/30 bg-green-500/10" :
                      gold >= cost ? "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95" :
                      "border-gray-700 bg-gray-900/50 opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <span className="text-xl">{owned ? r.emoji : "❓"}</span>
                    <span className="font-bold">{owned ? r.name : "???"}</span>
                    {!owned && <span className="text-yellow-400">{cost}💰</span>}
                    {owned && <span className="text-green-400">해금됨</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Buy slot */}
          {slotsCount < 4 && (
            <button
              onClick={buySlot}
              disabled={gold < slotsCount * 200}
              className={`w-full max-w-sm rounded-xl border-2 p-3 text-sm font-bold transition-all ${
                gold >= slotsCount * 200
                  ? "border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-95"
                  : "border-gray-700 bg-gray-900/50 opacity-40 cursor-not-allowed"
              }`}
            >
              🍳 조리대 추가 ({slotsCount * 200}💰)
            </button>
          )}
        </div>
      )}

      {/* Cooking */}
      {screen === "cooking" && (
        <div className="flex min-h-screen flex-col items-center px-3 pt-3">
          {/* HUD */}
          <div className="mb-2 flex w-full max-w-md items-center justify-between text-xs">
            <span className="rounded-lg bg-white/10 px-2 py-1">📅 Day {day}</span>
            <span className={`rounded-lg px-2 py-1 font-bold ${dayTime > 15 ? "bg-white/10" : "bg-red-500/30 text-red-300 animate-pulse"}`}>
              ⏰ {dayTime}초
            </span>
            <span className="rounded-lg bg-white/10 px-2 py-1">💰 {dayEarnings}</span>
            {combo > 1 && <span className="rounded-lg bg-orange-500/20 px-2 py-1 text-orange-400 font-bold">🔥x{combo}</span>}
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-2 w-full max-w-md rounded-lg px-4 py-2 text-center text-xs font-bold pop-in ${
              msgType === "good" ? "bg-green-500/20 text-green-300" :
              msgType === "bad" ? "bg-red-500/20 text-red-300" :
              "bg-white/10 text-white"
            }`}>
              {message}
            </div>
          )}

          {/* Orders */}
          <div className="mb-3 w-full max-w-md">
            <p className="mb-1 text-xs font-bold text-amber-400">📋 주문 ({orders.length})</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {orders.length === 0 ? (
                <div className="rounded-lg bg-white/5 px-4 py-2 text-xs text-slate-500">주문 대기중...</div>
              ) : orders.map((order) => (
                <div key={order.id} className={`flex-shrink-0 rounded-lg border-2 p-2 text-center ${
                  order.patience < 5 ? "border-red-500 bg-red-500/10 animate-pulse" :
                  order.patience < 10 ? "border-yellow-500 bg-yellow-500/10" :
                  "border-white/10 bg-white/5"
                }`} style={{ minWidth: 80 }}>
                  <span className="text-2xl">{order.recipe.emoji}</span>
                  <p className="text-[10px] font-bold">{order.recipe.name}</p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                    <div className={`h-full rounded-full transition-all ${
                      order.patience / order.maxPatience > 0.5 ? "bg-green-500" :
                      order.patience / order.maxPatience > 0.25 ? "bg-yellow-500" : "bg-red-500"
                    }`} style={{ width: `${(order.patience / order.maxPatience) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400">{order.patience}초</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cooking Slots */}
          <div className="mb-3 w-full max-w-md">
            <p className="mb-1 text-xs font-bold text-cyan-400">🍳 조리대</p>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${slotsCount}, 1fr)` }}>
              {cookingSlots.map((slot, i) => {
                const recipe = slot ? RECIPES.find((r) => r.id === slot.recipeId) : null;
                const done = slot && slot.progress >= 100;
                const burning = slot?.burning;
                return (
                  <div key={i} className={`rounded-xl border-2 p-3 text-center ${
                    burning ? "border-red-500 bg-red-500/10" :
                    done ? "border-green-500 bg-green-500/10" :
                    slot ? "border-amber-500/50 bg-amber-500/10" :
                    "border-white/10 bg-white/5"
                  }`}>
                    {slot && recipe ? (
                      <>
                        <span className={`text-2xl ${!done && !burning ? "sizzle" : ""} ${burning ? "animate-pulse" : ""}`}>
                          {burning ? "🔥" : recipe.emoji}
                        </span>
                        <p className="text-[10px] font-bold">{recipe.name}</p>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-800">
                          <div className={`h-full rounded-full transition-all ${
                            burning ? "bg-red-500" : done ? "bg-green-500" : "bg-amber-500"
                          }`} style={{ width: `${Math.min(slot.progress, 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {burning ? "타는 중!" : done ? "완성!" : `${Math.floor(slot.progress)}%`}
                        </p>
                        <div className="mt-1 flex gap-1 justify-center">
                          {done && (
                            <button onClick={() => serveDish(i)} className="rounded bg-green-600 px-2 py-0.5 text-[10px] font-bold active:scale-90">
                              서빙
                            </button>
                          )}
                          <button onClick={() => trashDish(i)} className="rounded bg-red-600/50 px-2 py-0.5 text-[10px] font-bold active:scale-90">
                            🗑️
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="py-2 text-slate-600 text-sm">빈 자리</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ingredient Selection */}
          <div className="mb-2 w-full max-w-md">
            <p className="mb-1 text-xs font-bold text-green-400">🥘 재료 선택 (순서대로!)</p>
            <div className="mb-2 flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 min-h-[40px]">
              {selectedIngredients.length === 0 ? (
                <span className="text-xs text-slate-500">재료를 순서대로 넣으세요</span>
              ) : (
                selectedIngredients.map((ingId, i) => {
                  const ing = INGREDIENTS.find((x) => x.id === ingId);
                  return <span key={i} className="text-xl pop-in">{ing?.emoji}</span>;
                })
              )}
              {matchedRecipe && (
                <span className="ml-auto text-xs font-bold text-green-400">→ {matchedRecipe.emoji} {matchedRecipe.name}!</span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {INGREDIENTS.map((ing) => (
                <button
                  key={ing.id}
                  onClick={() => addIngredient(ing.id)}
                  className="flex flex-col items-center rounded-lg bg-white/10 p-1.5 text-center transition-all hover:bg-white/20 active:scale-90"
                >
                  <span className="text-xl">{ing.emoji}</span>
                  <span className="text-[10px]">{ing.name}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={startCooking} disabled={!matchedRecipe} className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all active:scale-95 ${
                matchedRecipe ? "bg-green-600 hover:bg-green-500" : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}>
                🍳 조리하기
              </button>
              <button onClick={removeLastIngredient} className="rounded-lg bg-yellow-600/30 px-3 py-2 text-sm font-bold text-yellow-400 active:scale-90">
                ↩️
              </button>
              <button onClick={clearIngredients} className="rounded-lg bg-red-600/30 px-3 py-2 text-sm font-bold text-red-400 active:scale-90">
                🗑️
              </button>
            </div>
          </div>

          {/* Recipe hint */}
          <div className="w-full max-w-md">
            <p className="mb-1 text-xs font-bold text-slate-500">📖 레시피</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {availableRecipes.map((r) => (
                <div key={r.id} className="flex-shrink-0 rounded-lg bg-white/5 px-2 py-1 text-center" style={{ minWidth: 70 }}>
                  <span className="text-lg">{r.emoji}</span>
                  <p className="text-[9px] font-bold">{r.name}</p>
                  <p className="text-[8px] text-slate-500">
                    {r.ingredients.map((id) => INGREDIENTS.find((x) => x.id === id)?.emoji).join("")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Day End */}
      {screen === "dayEnd" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">🌙</div>
          <h2 className="text-3xl font-black text-amber-400">Day {day} 종료!</h2>

          <div className="rounded-xl bg-white/5 px-8 py-4 space-y-2">
            <p>🍳 서빙: <span className="font-bold text-green-400">{servedCount}개</span></p>
            <p>❌ 실패: <span className="font-bold text-red-400">{failedCount}개</span></p>
            <p>💰 수입: <span className="font-bold text-yellow-400">{dayEarnings}골드</span></p>
            {tips > 0 && <p>💝 팁: <span className="font-bold text-pink-400">{tips}골드</span></p>}
            <p>🔥 최대 콤보: <span className="font-bold text-orange-400">{maxCombo}</span></p>
            <p>⭐ 평판: <span className="font-bold text-amber-400">{reputation}/100</span></p>
          </div>

          {dayEarnings > bestDay && dayEarnings > 0 && (
            <p className="text-amber-400 font-bold">🎉 최고 기록!</p>
          )}

          <button onClick={() => { if (dayEarnings > bestDay) setBestDay(dayEarnings); setTotalEarned((t) => t + dayEarnings); nextDay(); }}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-10 py-4 text-xl font-black transition-transform hover:scale-105 active:scale-95">
            ☀️ 다음 날
          </button>
        </div>
      )}
    </div>
  );
}
