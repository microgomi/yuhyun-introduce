"use client";

import { useState } from "react";
import Link from "next/link";

// ============================================================
// TYPES
// ============================================================
type Screen = "menu" | "kitchen" | "book" | "shop" | "challenge" | "result";

interface Ingredient {
  id: string;
  name: string;
  icon: string;
  category: Category;
  owned: boolean;
  cost: number;
}

type Category = "meat" | "seafood" | "veg" | "fruit" | "grain" | "dairy" | "sauce" | "spice" | "other";

interface Recipe {
  id: string;
  name: string;
  icon: string;
  ingredients: string[]; // ingredient ids
  cuisine: string;
  difficulty: number; // 1~5
  score: number;
  description: string;
  discovered: boolean;
}

interface Challenge {
  id: string;
  name: string;
  icon: string;
  desc: string;
  requiredRecipe: string;
  reward: number;
  completed: boolean;
}

// ============================================================
// DATA
// ============================================================
const CATEGORY_INFO: Record<Category, { name: string; icon: string; color: string }> = {
  meat: { name: "고기", icon: "🥩", color: "text-red-400" },
  seafood: { name: "해산물", icon: "🦐", color: "text-blue-400" },
  veg: { name: "채소", icon: "🥬", color: "text-green-400" },
  fruit: { name: "과일", icon: "🍎", color: "text-pink-400" },
  grain: { name: "곡물", icon: "🌾", color: "text-yellow-400" },
  dairy: { name: "유제품", icon: "🧈", color: "text-amber-300" },
  sauce: { name: "소스", icon: "🫙", color: "text-orange-400" },
  spice: { name: "양념", icon: "🧂", color: "text-stone-300" },
  other: { name: "기타", icon: "🥚", color: "text-gray-300" },
};

const ALL_INGREDIENTS: Ingredient[] = [
  // Meat
  { id: "beef", name: "소고기", icon: "🥩", category: "meat", owned: true, cost: 0 },
  { id: "pork", name: "돼지고기", icon: "🐷", category: "meat", owned: true, cost: 0 },
  { id: "chicken", name: "닭고기", icon: "🍗", category: "meat", owned: true, cost: 0 },
  { id: "bacon", name: "베이컨", icon: "🥓", category: "meat", owned: false, cost: 30 },
  { id: "ham", name: "햄", icon: "🍖", category: "meat", owned: false, cost: 25 },
  // Seafood
  { id: "shrimp", name: "새우", icon: "🦐", category: "seafood", owned: true, cost: 0 },
  { id: "fish", name: "생선", icon: "🐟", category: "seafood", owned: true, cost: 0 },
  { id: "squid", name: "오징어", icon: "🦑", category: "seafood", owned: false, cost: 30 },
  { id: "crab", name: "게", icon: "🦀", category: "seafood", owned: false, cost: 40 },
  { id: "salmon", name: "연어", icon: "🍣", category: "seafood", owned: false, cost: 50 },
  // Veg
  { id: "rice_v", name: "밥", icon: "🍚", category: "grain", owned: true, cost: 0 },
  { id: "onion", name: "양파", icon: "🧅", category: "veg", owned: true, cost: 0 },
  { id: "garlic", name: "마늘", icon: "🧄", category: "veg", owned: true, cost: 0 },
  { id: "carrot", name: "당근", icon: "🥕", category: "veg", owned: true, cost: 0 },
  { id: "potato", name: "감자", icon: "🥔", category: "veg", owned: true, cost: 0 },
  { id: "tomato", name: "토마토", icon: "🍅", category: "veg", owned: false, cost: 15 },
  { id: "mushroom", name: "버섯", icon: "🍄", category: "veg", owned: false, cost: 15 },
  { id: "pepper", name: "고추", icon: "🌶️", category: "veg", owned: false, cost: 10 },
  { id: "lettuce", name: "상추", icon: "🥬", category: "veg", owned: false, cost: 10 },
  { id: "corn", name: "옥수수", icon: "🌽", category: "veg", owned: false, cost: 15 },
  { id: "cucumber", name: "오이", icon: "🥒", category: "veg", owned: false, cost: 10 },
  // Fruit
  { id: "apple", name: "사과", icon: "🍎", category: "fruit", owned: false, cost: 15 },
  { id: "lemon", name: "레몬", icon: "🍋", category: "fruit", owned: false, cost: 15 },
  { id: "banana", name: "바나나", icon: "🍌", category: "fruit", owned: false, cost: 10 },
  { id: "strawberry", name: "딸기", icon: "🍓", category: "fruit", owned: false, cost: 20 },
  // Grain
  { id: "noodle", name: "면", icon: "🍜", category: "grain", owned: true, cost: 0 },
  { id: "bread", name: "빵", icon: "🍞", category: "grain", owned: false, cost: 15 },
  { id: "flour", name: "밀가루", icon: "🌾", category: "grain", owned: false, cost: 10 },
  { id: "tortilla", name: "또띠아", icon: "🫓", category: "grain", owned: false, cost: 20 },
  // Dairy
  { id: "cheese", name: "치즈", icon: "🧀", category: "dairy", owned: false, cost: 25 },
  { id: "butter", name: "버터", icon: "🧈", category: "dairy", owned: false, cost: 15 },
  { id: "egg", name: "계란", icon: "🥚", category: "other", owned: true, cost: 0 },
  { id: "milk", name: "우유", icon: "🥛", category: "dairy", owned: false, cost: 10 },
  { id: "cream", name: "크림", icon: "🍦", category: "dairy", owned: false, cost: 20 },
  // Sauce
  { id: "soy", name: "간장", icon: "🫙", category: "sauce", owned: true, cost: 0 },
  { id: "gochujang", name: "고추장", icon: "🌶️🫙", category: "sauce", owned: true, cost: 0 },
  { id: "ketchup", name: "케첩", icon: "🍅🫙", category: "sauce", owned: false, cost: 10 },
  { id: "mayo", name: "마요네즈", icon: "🥚🫙", category: "sauce", owned: false, cost: 10 },
  { id: "curry_paste", name: "카레가루", icon: "🟡", category: "sauce", owned: false, cost: 20 },
  { id: "pasta_sauce", name: "파스타소스", icon: "🍝", category: "sauce", owned: false, cost: 25 },
  // Spice
  { id: "salt", name: "소금", icon: "🧂", category: "spice", owned: true, cost: 0 },
  { id: "sugar", name: "설탕", icon: "🍬", category: "spice", owned: true, cost: 0 },
  { id: "sesame_oil", name: "참기름", icon: "💧", category: "spice", owned: true, cost: 0 },
  { id: "chili_flake", name: "고춧가루", icon: "🌶️", category: "spice", owned: false, cost: 10 },
  // Other
  { id: "seaweed", name: "김", icon: "🟢", category: "other", owned: true, cost: 0 },
  { id: "tofu", name: "두부", icon: "🧈", category: "other", owned: false, cost: 15 },
  { id: "chocolate", name: "초콜릿", icon: "🍫", category: "other", owned: false, cost: 25 },
];

const ALL_RECIPES: Recipe[] = [
  // Korean
  { id: "bibimbap", name: "비빔밥", icon: "🍚🌶️", ingredients: ["rice_v", "beef", "carrot", "egg", "gochujang", "sesame_oil"], cuisine: "한식", difficulty: 2, score: 85, description: "야채와 고기를 비벼 먹는 한국 대표 음식!", discovered: false },
  { id: "kimchi_stew", name: "김치찌개", icon: "🍲🌶️", ingredients: ["pork", "onion", "tofu", "gochujang", "chili_flake"], cuisine: "한식", difficulty: 2, score: 80, description: "칼칼한 김치찌개! 밥도둑!", discovered: false },
  { id: "bulgogi", name: "불고기", icon: "🥩🔥", ingredients: ["beef", "onion", "garlic", "soy", "sugar", "sesame_oil"], cuisine: "한식", difficulty: 2, score: 90, description: "달콤한 양념의 불고기!", discovered: false },
  { id: "kimbap", name: "김밥", icon: "🍙🟢", ingredients: ["rice_v", "seaweed", "carrot", "egg", "ham", "sesame_oil"], cuisine: "한식", difficulty: 2, score: 82, description: "소풍엔 김밥이지!", discovered: false },
  { id: "tteokbokki", name: "떡볶이", icon: "🍢🌶️", ingredients: ["rice_v", "gochujang", "sugar", "onion", "egg"], cuisine: "한식", difficulty: 1, score: 88, description: "매콤달콤 떡볶이!", discovered: false },
  { id: "japchae", name: "잡채", icon: "🍜✨", ingredients: ["noodle", "beef", "carrot", "onion", "mushroom", "soy", "sesame_oil"], cuisine: "한식", difficulty: 3, score: 87, description: "명절엔 잡채!", discovered: false },
  { id: "fried_egg_rice", name: "계란볶음밥", icon: "🍳🍚", ingredients: ["rice_v", "egg", "onion", "soy", "sesame_oil"], cuisine: "한식", difficulty: 1, score: 72, description: "간단하지만 맛있는 볶음밥!", discovered: false },
  { id: "doenjang", name: "된장찌개", icon: "🍲🟤", ingredients: ["tofu", "potato", "onion", "garlic", "pepper"], cuisine: "한식", difficulty: 2, score: 78, description: "구수한 된장찌개!", discovered: false },
  // Japanese
  { id: "sushi", name: "초밥", icon: "🍣", ingredients: ["rice_v", "salmon", "shrimp"], cuisine: "일식", difficulty: 3, score: 92, description: "신선한 초밥!", discovered: false },
  { id: "ramen", name: "라멘", icon: "🍜🇯🇵", ingredients: ["noodle", "pork", "egg", "onion", "soy", "garlic"], cuisine: "일식", difficulty: 3, score: 88, description: "진한 돈코츠 라멘!", discovered: false },
  { id: "curry", name: "카레라이스", icon: "🍛", ingredients: ["rice_v", "chicken", "potato", "carrot", "onion", "curry_paste"], cuisine: "일식", difficulty: 2, score: 84, description: "일본식 카레!", discovered: false },
  { id: "tempura", name: "튀김", icon: "🍤", ingredients: ["shrimp", "flour", "egg", "salt"], cuisine: "일식", difficulty: 2, score: 80, description: "바삭한 새우튀김!", discovered: false },
  // Western
  { id: "pasta", name: "파스타", icon: "🍝", ingredients: ["noodle", "pasta_sauce", "garlic", "cheese", "onion"], cuisine: "양식", difficulty: 2, score: 85, description: "토마토 파스타!", discovered: false },
  { id: "burger", name: "햄버거", icon: "🍔", ingredients: ["beef", "bread", "lettuce", "tomato", "cheese", "ketchup"], cuisine: "양식", difficulty: 2, score: 86, description: "육즙 가득 버거!", discovered: false },
  { id: "steak", name: "스테이크", icon: "🥩🔥", ingredients: ["beef", "butter", "garlic", "salt", "pepper"], cuisine: "양식", difficulty: 4, score: 95, description: "완벽한 미디엄 레어!", discovered: false },
  { id: "pizza_home", name: "피자", icon: "🍕", ingredients: ["flour", "tomato", "cheese", "ham", "mushroom"], cuisine: "양식", difficulty: 3, score: 90, description: "집에서 만든 피자!", discovered: false },
  { id: "sandwich", name: "샌드위치", icon: "🥪", ingredients: ["bread", "lettuce", "tomato", "ham", "cheese", "mayo"], cuisine: "양식", difficulty: 1, score: 74, description: "간단한 샌드위치!", discovered: false },
  { id: "omelette", name: "오믈렛", icon: "🍳", ingredients: ["egg", "butter", "cheese", "ham", "mushroom", "salt"], cuisine: "양식", difficulty: 2, score: 79, description: "부드러운 오믈렛!", discovered: false },
  { id: "gratin", name: "그라탕", icon: "🧀🔥", ingredients: ["chicken", "cheese", "cream", "mushroom", "onion", "butter"], cuisine: "양식", difficulty: 3, score: 88, description: "치즈가 녹은 그라탕!", discovered: false },
  // Mexican
  { id: "taco", name: "타코", icon: "🌮", ingredients: ["tortilla", "beef", "lettuce", "tomato", "cheese"], cuisine: "멕시코", difficulty: 2, score: 83, description: "바삭한 타코!", discovered: false },
  { id: "burrito", name: "부리토", icon: "🌯", ingredients: ["tortilla", "chicken", "rice_v", "cheese", "lettuce", "corn"], cuisine: "멕시코", difficulty: 2, score: 82, description: "든든한 부리토!", discovered: false },
  // Chinese
  { id: "fried_rice", name: "볶음밥", icon: "🍳🍚", ingredients: ["rice_v", "egg", "shrimp", "onion", "carrot", "soy"], cuisine: "중식", difficulty: 2, score: 80, description: "중식 볶음밥!", discovered: false },
  { id: "tangsuyuk", name: "탕수육", icon: "🍖🍯", ingredients: ["pork", "flour", "sugar", "onion", "carrot", "potato"], cuisine: "중식", difficulty: 3, score: 91, description: "바삭한 탕수육!", discovered: false },
  // Dessert
  { id: "pancake", name: "팬케이크", icon: "🥞", ingredients: ["flour", "egg", "milk", "butter", "sugar"], cuisine: "디저트", difficulty: 1, score: 76, description: "달콤한 팬케이크!", discovered: false },
  { id: "choco_cake", name: "초코케이크", icon: "🍫🎂", ingredients: ["flour", "egg", "chocolate", "butter", "sugar", "cream"], cuisine: "디저트", difficulty: 4, score: 93, description: "진한 초코케이크!", discovered: false },
  { id: "fruit_salad", name: "과일샐러드", icon: "🥗🍓", ingredients: ["apple", "banana", "strawberry", "cream", "sugar"], cuisine: "디저트", difficulty: 1, score: 70, description: "상큼한 과일샐러드!", discovered: false },
  { id: "smoothie", name: "스무디", icon: "🥤🍓", ingredients: ["banana", "strawberry", "milk", "sugar"], cuisine: "디저트", difficulty: 1, score: 73, description: "시원한 스무디!", discovered: false },
];

const ALL_CHALLENGES: Challenge[] = [
  { id: "c1", name: "첫 요리!", icon: "👨‍🍳", desc: "아무 레시피나 만들어보자", requiredRecipe: "", reward: 50, completed: false },
  { id: "c2", name: "한식 마스터", icon: "🇰🇷", desc: "비빔밥을 만들어라", requiredRecipe: "bibimbap", reward: 80, completed: false },
  { id: "c3", name: "일식 도전", icon: "🇯🇵", desc: "초밥을 만들어라", requiredRecipe: "sushi", reward: 100, completed: false },
  { id: "c4", name: "양식 셰프", icon: "🍝", desc: "파스타를 만들어라", requiredRecipe: "pasta", reward: 80, completed: false },
  { id: "c5", name: "스테이크 장인", icon: "🥩", desc: "완벽한 스테이크!", requiredRecipe: "steak", reward: 150, completed: false },
  { id: "c6", name: "디저트 왕", icon: "🎂", desc: "초코케이크를 만들어라", requiredRecipe: "choco_cake", reward: 120, completed: false },
  { id: "c7", name: "중식 달인", icon: "🥢", desc: "탕수육을 만들어라", requiredRecipe: "tangsuyuk", reward: 100, completed: false },
  { id: "c8", name: "멕시코 파티", icon: "🌮", desc: "타코를 만들어라", requiredRecipe: "taco", reward: 80, completed: false },
  { id: "c9", name: "피자 장인", icon: "🍕", desc: "피자를 만들어라", requiredRecipe: "pizza_home", reward: 100, completed: false },
  { id: "c10", name: "만능 요리사", icon: "🌟", desc: "15개 이상 레시피 발견", requiredRecipe: "__count_15", reward: 300, completed: false },
];

// ============================================================
// COMPONENT
// ============================================================
export default function RecipeMaker() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [coins, setCoins] = useState(100);
  const [ingredients, setIngredients] = useState<Ingredient[]>(ALL_INGREDIENTS.map((i) => ({ ...i })));
  const [recipes, setRecipes] = useState<Recipe[]>(ALL_RECIPES.map((r) => ({ ...r })));
  const [challenges, setChallenges] = useState<Challenge[]>(ALL_CHALLENGES.map((c) => ({ ...c })));

  // Kitchen
  const [pot, setPot] = useState<string[]>([]); // ingredient ids in pot
  const [lastResult, setLastResult] = useState<{ recipe: Recipe | null; isNew: boolean } | null>(null);
  const [cookAnimation, setCookAnimation] = useState(false);

  const ownedIngredients = ingredients.filter((i) => i.owned);

  const addToPot = (id: string) => {
    if (pot.length >= 6) return;
    if (pot.includes(id)) return;
    setPot([...pot, id]);
  };

  const removeFromPot = (id: string) => {
    setPot(pot.filter((p) => p !== id));
  };

  const cook = () => {
    if (pot.length < 2) return;
    setCookAnimation(true);

    setTimeout(() => {
      // Check if pot matches any recipe
      let foundRecipe: Recipe | null = null;
      let isNew = false;

      for (const recipe of recipes) {
        const needed = [...recipe.ingredients];
        const potCopy = [...pot];
        let allFound = true;
        for (const ing of needed) {
          const idx = potCopy.indexOf(ing);
          if (idx === -1) { allFound = false; break; }
          potCopy.splice(idx, 1);
        }
        if (allFound && pot.length === recipe.ingredients.length) {
          foundRecipe = recipe;
          isNew = !recipe.discovered;
          break;
        }
      }

      if (foundRecipe) {
        const earnedCoins = isNew ? Math.floor(foundRecipe.score * 0.5) : Math.floor(foundRecipe.score * 0.1);
        setCoins((c) => c + earnedCoins);

        if (isNew) {
          setRecipes((prev) => prev.map((r) => r.id === foundRecipe!.id ? { ...r, discovered: true } : r));
          // Check challenges
          setChallenges((prev) => prev.map((ch) => {
            if (ch.completed) return ch;
            if (ch.requiredRecipe === "" && !ch.completed) {
              setCoins((c) => c + ch.reward);
              return { ...ch, completed: true };
            }
            if (ch.requiredRecipe === foundRecipe!.id) {
              setCoins((c) => c + ch.reward);
              return { ...ch, completed: true };
            }
            return ch;
          }));
        }
        setLastResult({ recipe: { ...foundRecipe, discovered: true }, isNew });
      } else {
        setLastResult({ recipe: null, isNew: false });
      }

      // Check count challenge
      const discoveredCount = recipes.filter((r) => r.discovered).length + (isNew ? 1 : 0);
      if (discoveredCount >= 15) {
        setChallenges((prev) => prev.map((ch) => {
          if (ch.requiredRecipe === "__count_15" && !ch.completed) {
            setCoins((c) => c + ch.reward);
            return { ...ch, completed: true };
          }
          return ch;
        }));
      }

      setPot([]);
      setCookAnimation(false);
      setScreen("result");
    }, 1500);
  };

  const buyIngredient = (id: string) => {
    const ing = ingredients.find((i) => i.id === id);
    if (!ing || ing.owned || coins < ing.cost) return;
    setCoins((c) => c - ing.cost);
    setIngredients((prev) => prev.map((i) => i.id === id ? { ...i, owned: true } : i));
  };

  // ============================================================
  // SCREENS
  // ============================================================

  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-950 via-amber-950 to-gray-950 text-white flex flex-col items-center justify-center px-4">
        <Link href="/" className="absolute top-4 left-4 text-sm text-gray-400 hover:text-white">← 홈으로</Link>
        <div className="text-center max-w-md">
          <div className="text-7xl mb-4">👨‍🍳</div>
          <h1 className="text-4xl font-black mb-2">레시피 만들기</h1>
          <p className="text-gray-400 mb-8">재료를 조합해서 요리를 발견하자!</p>

          <div className="space-y-2 text-left bg-white/5 rounded-xl p-4 border border-white/10 mb-6 text-sm text-gray-300">
            <p>🥬 재료를 냄비에 넣어라</p>
            <p>🔥 요리해서 레시피를 발견하라</p>
            <p>📖 {ALL_RECIPES.length}개의 레시피를 모두 모아라</p>
            <p>🏆 도전 과제를 클리어하라</p>
          </div>

          <button onClick={() => setScreen("kitchen")} className="w-full rounded-xl bg-gradient-to-r from-orange-600 to-red-600 py-4 text-xl font-black hover:brightness-110 transition-all border border-orange-400/30">
            🍳 요리 시작!
          </button>
        </div>
      </div>
    );
  }

  if (screen === "kitchen") {
    const discoveredCount = recipes.filter((r) => r.discovered).length;
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-stone-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <Link href="/" className="text-sm text-gray-400 hover:text-white">← 홈으로</Link>
            <span className="text-yellow-400 font-bold">🪙 {coins.toLocaleString()}</span>
          </div>

          {/* Nav */}
          <div className="mb-3 flex gap-2">
            <button onClick={() => setScreen("book")} className="flex-1 rounded-lg bg-amber-800/50 py-2 text-sm font-bold hover:bg-amber-800/80 border border-amber-500/20">
              📖 레시피북 ({discoveredCount}/{recipes.length})
            </button>
            <button onClick={() => setScreen("shop")} className="flex-1 rounded-lg bg-green-800/50 py-2 text-sm font-bold hover:bg-green-800/80 border border-green-500/20">
              🏪 재료 상점
            </button>
            <button onClick={() => setScreen("challenge")} className="flex-1 rounded-lg bg-purple-800/50 py-2 text-sm font-bold hover:bg-purple-800/80 border border-purple-500/20">
              🏆 도전
            </button>
          </div>

          {/* Pot */}
          <div className="mb-3 rounded-xl bg-gradient-to-b from-gray-800 to-stone-800 p-4 border border-white/10">
            <div className="text-center text-sm font-bold mb-2">🍳 냄비 ({pot.length}/6)</div>
            <div className="flex gap-2 justify-center min-h-[56px] flex-wrap">
              {pot.length === 0 ? (
                <div className="text-gray-500 text-sm py-3">재료를 넣어주세요!</div>
              ) : (
                pot.map((id) => {
                  const ing = ingredients.find((i) => i.id === id);
                  return ing ? (
                    <button key={id} onClick={() => removeFromPot(id)}
                      className="flex flex-col items-center rounded-lg bg-white/10 px-2 py-1 hover:bg-red-900/30 transition-all border border-white/10">
                      <span className="text-2xl">{ing.icon}</span>
                      <span className="text-[10px]">{ing.name}</span>
                    </button>
                  ) : null;
                })
              )}
            </div>
            {pot.length >= 2 && (
              <button onClick={cook} disabled={cookAnimation}
                className={`w-full mt-3 rounded-xl py-3 font-black text-lg transition-all border ${
                  cookAnimation
                    ? "bg-orange-600 border-orange-400 animate-pulse"
                    : "bg-gradient-to-r from-red-600 to-orange-600 border-orange-400/30 hover:brightness-110"
                }`}>
                {cookAnimation ? "🔥 요리 중..." : "🔥 요리하기!"}
              </button>
            )}
          </div>

          {/* Ingredients by category */}
          {(Object.keys(CATEGORY_INFO) as Category[]).map((cat) => {
            const catIngredients = ownedIngredients.filter((i) => i.category === cat);
            if (catIngredients.length === 0) return null;
            const info = CATEGORY_INFO[cat];
            return (
              <div key={cat} className="mb-3">
                <div className={`text-xs font-bold mb-1 ${info.color}`}>{info.icon} {info.name}</div>
                <div className="flex gap-1.5 flex-wrap">
                  {catIngredients.map((ing) => (
                    <button key={ing.id} onClick={() => addToPot(ing.id)}
                      disabled={pot.includes(ing.id) || pot.length >= 6}
                      className={`flex flex-col items-center rounded-lg px-2 py-1.5 transition-all border text-center ${
                        pot.includes(ing.id)
                          ? "bg-orange-900/50 border-orange-500/30 opacity-50"
                          : "bg-white/5 border-white/10 hover:bg-white/10 active:scale-95"
                      } disabled:opacity-30`}>
                      <span className="text-xl">{ing.icon}</span>
                      <span className="text-[10px]">{ing.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (screen === "result") {
    const r = lastResult;
    return (
      <div className={`min-h-screen ${r?.recipe ? "bg-gradient-to-b from-yellow-950 via-orange-950 to-gray-950" : "bg-gradient-to-b from-gray-900 via-gray-800 to-gray-950"} text-white`}>
        <div className="mx-auto max-w-lg px-4 py-8 text-center">
          {r?.recipe ? (
            <>
              {r.isNew && (
                <div className="mb-4">
                  <div className="text-xs text-yellow-300 mb-1 animate-pulse">✨ 새로운 레시피 발견! ✨</div>
                </div>
              )}
              <div className="text-6xl mb-4">{r.recipe.icon}</div>
              <h2 className="text-3xl font-black mb-1">{r.recipe.name}</h2>
              <p className="text-sm text-gray-400 mb-1">{r.recipe.cuisine} | 난이도 {"⭐".repeat(r.recipe.difficulty)}</p>
              <p className="text-sm text-gray-300 mb-4">{r.recipe.description}</p>

              <div className="rounded-xl bg-white/5 p-4 border border-white/10 mb-4">
                <div className="text-sm font-bold mb-2">재료</div>
                <div className="flex gap-2 justify-center flex-wrap">
                  {r.recipe.ingredients.map((id) => {
                    const ing = ingredients.find((i) => i.id === id);
                    return ing ? (
                      <div key={id} className="flex flex-col items-center">
                        <span className="text-xl">{ing.icon}</span>
                        <span className="text-[10px] text-gray-400">{ing.name}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              <div className={`text-2xl font-black mb-4 ${r.recipe.score >= 90 ? "text-yellow-400" : r.recipe.score >= 80 ? "text-green-400" : "text-gray-300"}`}>
                ⭐ {r.recipe.score}점
              </div>
              <div className="text-yellow-400 mb-6">
                +{r.isNew ? Math.floor(r.recipe.score * 0.5) : Math.floor(r.recipe.score * 0.1)} 🪙
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">😵</div>
              <h2 className="text-2xl font-black mb-2">요리 실패...</h2>
              <p className="text-gray-400 mb-6">이 조합으로는 요리를 만들 수 없어요.<br />다른 재료를 시도해보세요!</p>
            </>
          )}

          <div className="space-y-2">
            <button onClick={() => setScreen("kitchen")} className="w-full rounded-xl bg-orange-700 py-3 font-bold hover:bg-orange-600">
              🍳 다시 요리하기
            </button>
            <button onClick={() => setScreen("book")} className="w-full rounded-xl bg-amber-800/50 py-3 font-bold hover:bg-amber-800/80">
              📖 레시피북 보기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "book") {
    const discovered = recipes.filter((r) => r.discovered);
    const undiscovered = recipes.filter((r) => !r.discovered);
    const cuisines = [...new Set(recipes.map((r) => r.cuisine))];

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("kitchen")} className="text-sm text-gray-400 hover:text-white">← 주방으로</button>
            <span className="text-sm text-gray-400">{discovered.length}/{recipes.length}</span>
          </div>
          <h2 className="text-2xl font-black mb-4 text-center">📖 레시피북</h2>

          {cuisines.map((cuisine) => {
            const cuisineRecipes = recipes.filter((r) => r.cuisine === cuisine);
            const count = cuisineRecipes.filter((r) => r.discovered).length;
            return (
              <div key={cuisine} className="mb-4">
                <div className="text-sm font-bold text-gray-400 mb-2">{cuisine} ({count}/{cuisineRecipes.length})</div>
                <div className="space-y-1.5">
                  {cuisineRecipes.map((r) => (
                    <div key={r.id} className={`rounded-lg p-3 border ${r.discovered ? "bg-white/5 border-white/10" : "bg-gray-800/30 border-gray-700 opacity-40"}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{r.discovered ? r.icon : "❓"}</span>
                        <div className="flex-1">
                          <div className="font-bold text-sm">{r.discovered ? r.name : "???"}</div>
                          {r.discovered && <div className="text-xs text-gray-400">{r.description}</div>}
                          {r.discovered && (
                            <div className="flex gap-1 mt-1">
                              {r.ingredients.map((id) => {
                                const ing = ingredients.find((i) => i.id === id);
                                return <span key={id} className="text-sm">{ing?.icon}</span>;
                              })}
                            </div>
                          )}
                        </div>
                        {r.discovered && (
                          <div className="text-right">
                            <div className={`text-sm font-bold ${r.score >= 90 ? "text-yellow-400" : "text-gray-300"}`}>⭐{r.score}</div>
                            <div className="text-[10px] text-gray-400">{"⭐".repeat(r.difficulty)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (screen === "shop") {
    const locked = ingredients.filter((i) => !i.owned);
    const categories = [...new Set(locked.map((i) => i.category))];

    return (
      <div className="min-h-screen bg-gradient-to-b from-green-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("kitchen")} className="text-sm text-gray-400 hover:text-white">← 주방으로</button>
            <span className="text-yellow-400 font-bold">🪙 {coins.toLocaleString()}</span>
          </div>
          <h2 className="text-2xl font-black mb-4 text-center">🏪 재료 상점</h2>

          {locked.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">🎉</div>
              <p>모든 재료를 구매했습니다!</p>
            </div>
          ) : (
            categories.map((cat) => {
              const info = CATEGORY_INFO[cat];
              const items = locked.filter((i) => i.category === cat);
              return (
                <div key={cat} className="mb-4">
                  <div className={`text-xs font-bold mb-1.5 ${info.color}`}>{info.icon} {info.name}</div>
                  <div className="space-y-1.5">
                    {items.map((ing) => (
                      <button key={ing.id} onClick={() => buyIngredient(ing.id)} disabled={coins < ing.cost}
                        className="w-full rounded-lg bg-white/5 p-2.5 text-left hover:bg-white/10 transition-all border border-white/10 disabled:opacity-40">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{ing.icon}</span>
                          <div className="flex-1 font-bold text-sm">{ing.name}</div>
                          <span className="text-yellow-400 text-sm">🪙 {ing.cost}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          <button onClick={() => setCoins((c) => c + 50)} className="w-full mt-4 rounded-lg bg-yellow-800/50 py-2 text-sm text-yellow-300 hover:bg-yellow-800/80 border border-yellow-500/20">
            🎁 무료 코인 +50
          </button>
        </div>
      </div>
    );
  }

  if (screen === "challenge") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("kitchen")} className="text-sm text-gray-400 hover:text-white">← 주방으로</button>
            <span className="text-sm text-gray-400">{challenges.filter((c) => c.completed).length}/{challenges.length}</span>
          </div>
          <h2 className="text-2xl font-black mb-4 text-center">🏆 도전 과제</h2>

          <div className="space-y-2">
            {challenges.map((ch) => (
              <div key={ch.id} className={`rounded-xl p-3 border ${ch.completed ? "bg-yellow-900/20 border-yellow-500/20" : "bg-white/5 border-white/10"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ch.completed ? "✅" : ch.icon}</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{ch.name}</div>
                    <div className="text-xs text-gray-400">{ch.desc}</div>
                  </div>
                  <span className="text-yellow-400 text-sm">🪙 {ch.reward}</span>
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
