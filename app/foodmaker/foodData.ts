// ----------------------------------------------------------------------------
// 음식 만들기: 재료 · 조리 과정 · 주문표
//
// 핵심 규칙 두 가지.
//  1) 재료마다 거쳐야 할 과정이 정해져 있고, 순서까지 맞아야 한다.
//     (채소는 씻고 나서 썰어야 하고, 쌀은 씻어서 끓여야 밥이 된다)
//  2) 층을 다 쌓으면 마지막으로 주문에 적힌 양념을 넣어야 완성된다.
// ----------------------------------------------------------------------------

export type Prep = "wash" | "cut" | "grill" | "boil";

export const PREP_INFO: Record<Prep, { name: string; emoji: string; place: string; verb: string }> = {
  wash: { name: "씻기", emoji: "💧", place: "싱크대", verb: "씻은" },
  cut: { name: "썰기", emoji: "🔪", place: "도마", verb: "썬" },
  grill: { name: "굽기", emoji: "🍳", place: "프라이팬", verb: "구운" },
  boil: { name: "끓이기", emoji: "🍲", place: "냄비", verb: "삶은" },
};

export interface Ingredient {
  id: string;
  name: string;
  emoji: string;
  /** 접시에 쌓였을 때의 배경색 */
  color: string;
  /** 이 재료에 할 수 있는 과정. 여기 없는 곳에 넣으면 실패한다. */
  allowed: Prep[];
  /** 마지막 과정별 전용 그림. 없으면 원래 그림에 과정 배지를 붙인다. */
  looks?: Partial<Record<Prep, string>>;
}

export const INGREDIENTS: Ingredient[] = [
  { id: "bun", name: "빵", emoji: "🍞", color: "#f0b429", allowed: [] },
  { id: "dough", name: "도우", emoji: "🫓", color: "#e8c39e", allowed: [] },
  { id: "cheese", name: "치즈", emoji: "🧀", color: "#fbbf24", allowed: ["cut"] },
  { id: "rice", name: "쌀", emoji: "🌾", color: "#f8fafc", allowed: ["wash", "boil"], looks: { boil: "🍚" } },
  { id: "noodle", name: "생면", emoji: "🍝", color: "#fde68a", allowed: ["boil"], looks: { boil: "🍜" } },
  { id: "lettuce", name: "상추", emoji: "🥬", color: "#65d46e", allowed: ["wash", "cut"], looks: { cut: "🥗" } },
  { id: "tomato", name: "토마토", emoji: "🍅", color: "#ef4444", allowed: ["wash", "cut"] },
  { id: "potato", name: "감자", emoji: "🥔", color: "#d6a35c", allowed: ["wash", "cut", "boil"] },
  { id: "meat", name: "고기", emoji: "🥩", color: "#b45309", allowed: ["grill", "boil"], looks: { grill: "🍖" } },
  { id: "egg", name: "계란", emoji: "🥚", color: "#fde68a", allowed: ["grill", "boil"], looks: { grill: "🍳" } },
  { id: "shrimp", name: "새우", emoji: "🦐", color: "#fb923c", allowed: ["wash", "grill", "boil"], looks: { grill: "🍤" } },
];

export function ingredientOf(id: string): Ingredient {
  return INGREDIENTS.find((i) => i.id === id) ?? INGREDIENTS[0];
}

/** 마지막에 넣는 양념. 층으로 쌓지 않고 완성 직전에 넣는다. */
export interface Extra {
  id: string;
  name: string;
  emoji: string;
}

export const EXTRAS: Extra[] = [
  { id: "salt", name: "소금", emoji: "🧂" },
  { id: "pepper", name: "고춧가루", emoji: "🌶️" },
  { id: "butter", name: "버터", emoji: "🧈" },
  { id: "herb", name: "허브", emoji: "🌿" },
  { id: "honey", name: "꿀", emoji: "🍯" },
];

export function extraOf(id: string): Extra {
  return EXTRAS.find((e) => e.id === id) ?? EXTRAS[0];
}

/** 손질 중이거나 다 손질한 재료 한 덩이 */
export interface Item {
  ingredient: string;
  /** 지금까지 거친 과정, 순서대로 */
  steps: Prep[];
}

export function sameItem(a: Item, b: Item): boolean {
  return (
    a.ingredient === b.ingredient &&
    a.steps.length === b.steps.length &&
    a.steps.every((step, i) => step === b.steps[i])
  );
}

export function itemName(item: Item): string {
  const ing = ingredientOf(item.ingredient);
  const last = item.steps[item.steps.length - 1];
  return last === undefined ? ing.name : `${PREP_INFO[last].verb} ${ing.name}`;
}

export function itemEmoji(item: Item): string {
  const ing = ingredientOf(item.ingredient);
  const last = item.steps[item.steps.length - 1];
  return (last !== undefined ? ing.looks?.[last] : undefined) ?? ing.emoji;
}

/** 전용 그림이 없어 과정 배지를 붙여야 하는지 */
export function badgesFor(item: Item): string[] {
  const ing = ingredientOf(item.ingredient);
  const last = item.steps[item.steps.length - 1];
  if (last !== undefined && ing.looks?.[last] !== undefined) return [];
  return item.steps.map((step) => PREP_INFO[step].emoji);
}

export interface Dish {
  id: string;
  name: string;
  emoji: string;
  /** 아래에서 위로 쌓는 순서 */
  layers: Item[];
  /** 층을 다 쌓은 뒤 넣어야 하는 양념 */
  extras: string[];
}

const L = (ingredient: string, ...steps: Prep[]): Item => ({ ingredient, steps });

export const DISHES: Dish[] = [
  {
    id: "salad",
    name: "샐러드",
    emoji: "🥗",
    layers: [L("lettuce", "wash", "cut"), L("tomato", "wash", "cut")],
    extras: ["salt"],
  },
  {
    id: "sushi",
    name: "새우초밥",
    emoji: "🍣",
    layers: [L("rice", "wash", "boil"), L("shrimp", "wash", "grill")],
    extras: [],
  },
  {
    id: "eggRice",
    name: "계란덮밥",
    emoji: "🍳",
    layers: [L("rice", "wash", "boil"), L("egg", "grill")],
    extras: ["salt", "pepper"],
  },
  {
    id: "hotdog",
    name: "핫도그",
    emoji: "🌭",
    layers: [L("bun"), L("meat", "grill")],
    extras: ["pepper"],
  },
  {
    id: "ramen",
    name: "라면",
    emoji: "🍜",
    layers: [L("noodle", "boil"), L("egg", "boil"), L("meat", "boil")],
    extras: ["pepper"],
  },
  {
    id: "pizza",
    name: "피자",
    emoji: "🍕",
    layers: [L("dough"), L("cheese", "cut"), L("tomato", "wash", "cut")],
    extras: ["herb"],
  },
  {
    id: "taco",
    name: "타코",
    emoji: "🌮",
    layers: [L("dough"), L("meat", "grill"), L("lettuce", "wash", "cut"), L("cheese", "cut")],
    extras: ["pepper"],
  },
  {
    id: "curry",
    name: "카레",
    emoji: "🍛",
    layers: [L("rice", "wash", "boil"), L("potato", "wash", "boil"), L("meat", "grill")],
    extras: ["salt", "butter"],
  },
  {
    id: "sandwich",
    name: "샌드위치",
    emoji: "🥪",
    layers: [L("bun"), L("cheese", "cut"), L("tomato", "wash", "cut"), L("lettuce", "wash", "cut"), L("bun")],
    extras: ["salt"],
  },
  {
    id: "burger",
    name: "햄버거",
    emoji: "🍔",
    layers: [L("bun"), L("lettuce", "wash", "cut"), L("meat", "grill"), L("cheese", "cut"), L("bun")],
    extras: ["salt", "pepper"],
  },
];

// ── 과정별 시간·횟수 ──
/** 싱크대에서 이만큼 문질러야 다 씻긴다 */
export const WASH_TAPS = 3;
/** 도마에서 이만큼 칼질해야 다 썰린다 */
export const CHOP_TAPS = 4;
/** 프라이팬: 다 익기까지 / 이보다 오래 두면 탄다 */
export const GRILL_SECONDS = 3;
export const BURN_SECONDS = 10;
/** 냄비: 다 끓기까지 / 이보다 오래 두면 넘친다 */
export const BOIL_SECONDS = 4;
export const OVERBOIL_SECONDS = 13;

export const PAN_SLOTS = 2;
export const POT_SLOTS = 2;
/** 손질한 재료를 올려두는 준비대 칸 수 */
export const TRAY_SLOTS = 5;

/** 주문 시간: 기본 + 층마다 + 손질 한 번마다 + 양념마다 */
export const BASE_SECONDS = 12;
export const SECONDS_PER_LAYER = 4;
export const SECONDS_PER_STEP = 5;
export const SECONDS_PER_EXTRA = 3;

export function timeFor(dish: Dish): number {
  const steps = dish.layers.reduce((sum, layer) => sum + layer.steps.length, 0);
  return (
    BASE_SECONDS +
    dish.layers.length * SECONDS_PER_LAYER +
    steps * SECONDS_PER_STEP +
    dish.extras.length * SECONDS_PER_EXTRA
  );
}

/** 라운드가 올라갈수록 손이 많이 가는 요리가 나온다. */
export function pickDish(round: number, previous?: string): Dish {
  const limit = Math.min(DISHES.length, 3 + Math.floor(round / 2));
  const pool = DISHES.slice(0, limit).filter((d) => d.id !== previous);
  const list = pool.length > 0 ? pool : DISHES.slice(0, limit);
  return list[Math.floor(Math.random() * list.length)];
}

export function dishScore(dish: Dish, secondsLeft: number, combo: number): number {
  const steps = dish.layers.reduce((sum, layer) => sum + layer.steps.length, 0);
  const base = dish.layers.length * 10 + steps * 8 + dish.extras.length * 6;
  const timeBonus = Math.max(0, Math.round(secondsLeft * 2));
  return Math.round((base + timeBonus) * (1 + Math.min(1, combo * 0.1)));
}
