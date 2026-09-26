import { BASES, baseInfo, DEFAULT_PARAMS, MAX_SUBDIV, SLIDERS, type BaseKey, type ShapeParams } from "./shapeGeometry";
import { sanitizeLook, sanitizeParams } from "./shapeExport";
import type { Look } from "./shapeLook";

export type { ColorMode, Look } from "./shapeLook";

// ----------------------------------------------------------------------------
// 도형 이름 짓기
// ----------------------------------------------------------------------------

export function autoName(P: ShapeParams): string {
  const words: string[] = [];
  if (Math.abs(P.twist) >= 180) words.push("회오리");
  else if (Math.abs(P.twist) >= 30) words.push("꽈배기");
  if (P.spike >= 0.6) words.push("별빛");
  else if (P.spike >= 0.15) words.push("뾰족");
  else if (P.spike <= -0.15) words.push("오목");
  if (P.explode >= 0.3) words.push("폭발");
  if (P.noise >= 0.15) words.push("돌멩이");
  if (P.snake >= 0.25) words.push("뱀");
  if (P.steps > 0) words.push("계단");
  if (P.bulge >= 0.4) words.push("배불뚝");
  else if (P.bulge <= -0.4) words.push("잘록");
  if (P.spherify >= 0.7) words.push("동글");
  if (P.height >= 1.6) words.push("꺽다리");
  else if (P.height <= 0.6) words.push("납작");
  if (P.width >= 1.6) words.push("뚱뚱");
  else if (P.width <= 0.6) words.push("홀쭉");
  if (Math.abs(P.shear) >= 15) words.push("기우뚱");
  if (Math.abs(P.bend) >= 45) words.push("휘어진");
  if (P.taper <= -0.5) words.push("아이스크림");
  else if (P.taper >= 0.5) words.push("팽이");
  if (P.wave >= 0.2) words.push("물결");
  if (P.sizePct >= 1000) words.push("초거대");
  else if (P.sizePct >= 140) words.push("거대");
  else if (P.sizePct <= 10) words.push("개미");
  else if (P.sizePct <= 70) words.push("꼬마");
  if (Object.values(P.pulls).some((v) => v !== 0)) words.push("울퉁불퉁");
  const baseName = baseInfo(P.base).name.replace(/^정/, "");
  if (words.length === 0) return baseInfo(P.base).name;
  return `${words.slice(0, 3).join(" ")} ${baseName}`;
}

// ----------------------------------------------------------------------------
// 진행 상황 · 레벨
// ----------------------------------------------------------------------------

export interface GameProgress {
  touchedBases: BaseKey[];
  savedCount: number;
  matchStars: number;
  quizBest: number; // 퀴즈 한 판(10문제) 최고 점수
  usedAnimation: boolean;
  xp: number;
  bestStreak: number; // 퀴즈 연속 정답 최고 기록
  timeAttackBest: number; // 60초 타임어택 최고 기록
  dailyDone: string; // 오늘의 도형을 마지막으로 성공한 날짜 (YYYY-MM-DD)
  dailyCount: number;
  usedDual: boolean;
  ateSolar: boolean; // 블랙홀에게 태양계를 전부 먹였다
  maxCosmicLevel: number; // 먹보 천체가 올라간 가장 높은 레벨 (1~20)
  ateAndromeda: boolean;
}

const LEVEL_TITLES = ["도형 새싹", "꼭짓점 탐험가", "모서리 모험가", "각도 마법사", "다면체 기사", "기하학 박사", "도형 대마법사", "도형의 왕"];

// 레벨 L 이 되려면 경험치 25 × (L-1)² 가 필요
export function levelOf(xp: number) {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 25)) + 1;
  const cur = 25 * (level - 1) ** 2;
  const next = 25 * level ** 2;
  const title = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)] + (level > LEVEL_TITLES.length ? ` ${level - LEVEL_TITLES.length + 1}` : "");
  return { level, title, progress: (xp - cur) / (next - cur), toNext: next - xp };
}

// XP 보상표
export const XP = { achievement: 50, save: 10, matchStar: 10, quizCorrect: 5, daily: 30, timeAttackSolve: 5, breed: 5 } as const;

// ----------------------------------------------------------------------------
// 도전과제
// ----------------------------------------------------------------------------

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  check: (P: ShapeParams, g: GameProgress) => boolean;
}

const pulledCount = (P: ShapeParams) => Object.values(P.pulls).filter((v) => v !== 0).length;
const touchedAll = (g: GameProgress, keys: BaseKey[]) => keys.every((k) => g.touchedBases.includes(k));

export const ACHIEVEMENTS: Achievement[] = [
  { id: "twist45", emoji: "🌀", title: "첫 비틀기", desc: "비틀기 각도 45° 이상", check: (P) => Math.abs(P.twist) >= 45 },
  { id: "twist360", emoji: "🌪️", title: "한 바퀴 회오리", desc: "비틀기 각도 360°", check: (P) => Math.abs(P.twist) >= 360 },
  { id: "star", emoji: "⭐", title: "별 만들기", desc: "뾰족함 1.0 이상", check: (P) => P.spike >= 1 },
  { id: "cave", emoji: "🕳️", title: "오목 동굴", desc: "뾰족함을 -0.4 이하로", check: (P) => P.spike <= -0.4 },
  { id: "dome", emoji: "🏟️", title: "지오데식 돔", desc: "정이십면체 + 쪼개기 2단계 이상 + 둥글게 100%", check: (P) => P.base === "icosa" && P.subdiv >= 2 && P.spherify >= 1 },
  { id: "tower", emoji: "🗼", title: "초고층 탑", desc: "키 2배 이상", check: (P) => P.height >= 2 },
  { id: "pancake", emoji: "🥞", title: "납작 팬케이크", desc: "키 0.4배 이하", check: (P) => P.height <= 0.4 },
  { id: "lean", emoji: "🏛️", title: "피사의 사탑", desc: "기울이기 30° 이상 + 키 1.5배 이상", check: (P) => Math.abs(P.shear) >= 30 && P.height >= 1.5 },
  { id: "pull3", emoji: "🧲", title: "꼭짓점 조각가", desc: "꼭짓점 3개 이상 당기기", check: (P) => pulledCount(P) >= 3 },
  { id: "urchin", emoji: "🦔", title: "성게", desc: "정이십면체 + 뾰족함 1.2 이상 + 쪼개기 1단계 이상", check: (P) => P.base === "icosa" && P.spike >= 1.2 && P.subdiv >= 1 },
  { id: "allbases", emoji: "🏅", title: "정다면체 박사", desc: "5가지 정다면체 모두 골라보기", check: (_, g) => touchedAll(g, BASES.filter((b) => b.platonic).map((b) => b.key)) },
  { id: "allshapes", emoji: "🧩", title: "도형 수집가", desc: `${BASES.length}가지 기본 도형 모두 골라보기`, check: (_, g) => touchedAll(g, BASES.map((b) => b.key)) },
  { id: "prisms", emoji: "🏗️", title: "기둥 수집가", desc: "삼각·오각·육각기둥과 원기둥 모두 골라보기", check: (_, g) => touchedAll(g, ["prism3", "prism5", "prism6", "cylinder"]) },
  { id: "archimedes", emoji: "🏺", title: "준정다면체 탐험가", desc: "육팔면체·깎은 정팔면체·축구공·마름모십이면체 모두 골라보기", check: (_, g) => touchedAll(g, ["cubocta", "truncOcta", "soccer", "rhombDodeca"]) },
  { id: "goal", emoji: "⚽", title: "골인!", desc: "축구공을 공처럼 둥글게 100%로 만들기", check: (P) => P.base === "soccer" && P.spherify >= 1 },
  { id: "pencil", emoji: "✏️", title: "꽈배기 연필", desc: "육각기둥 + 키 2배 이상 + 비틀기 90° 이상", check: (P) => P.base === "prism6" && P.height >= 2 && Math.abs(P.twist) >= 90 },
  { id: "animator", emoji: "🎬", title: "애니메이터", desc: "움직이는 도형 틀어보기", check: (_, g) => g.usedAnimation },
  { id: "quiz7", emoji: "🧠", title: "도형 똑똑이", desc: "퀴즈 10문제 중 7문제 이상 맞히기", check: (_, g) => g.quizBest >= 7 },
  { id: "quiz10", emoji: "🎓", title: "퀴즈 만점", desc: "퀴즈 10문제 모두 맞히기", check: (_, g) => g.quizBest >= 10 },
  { id: "combo5", emoji: "🔥", title: "불꽃 콤보", desc: "퀴즈 5문제 연속 정답", check: (_, g) => g.bestStreak >= 5 },
  { id: "banana", emoji: "🍌", title: "바나나", desc: "휘기 각도 90° 이상", check: (P) => Math.abs(P.bend) >= 90 },
  { id: "cone", emoji: "🍦", title: "아이스크림 콘", desc: "위로 좁게를 -0.8 이하로", check: (P) => P.taper <= -0.8 },
  { id: "jelly", emoji: "🌊", title: "말랑 젤리", desc: "물결 0.3 이상 + 쪼개기 3단계 이상", check: (P) => P.wave >= 0.3 && P.subdiv >= 3 },
  { id: "micro", emoji: "🔬", title: "초정밀 조각가", desc: `삼각형 쪼개기 ${MAX_SUBDIV}단계`, check: (P) => P.subdiv >= MAX_SUBDIV },
  { id: "giant", emoji: "🦖", title: "거인 도형", desc: "전체 크기 10000%", check: (P) => P.sizePct >= 10000 },
  { id: "ant", emoji: "🐜", title: "개미 도형", desc: "전체 크기 5% 이하", check: (P) => P.sizePct <= 5 },
  { id: "spin10", emoji: "🌪️", title: "10바퀴 회오리", desc: "비틀기 각도 3600° 입력하기", check: (P) => Math.abs(P.twist) >= 3600 },
  { id: "tumble", emoji: "🤸", title: "데굴데굴", desc: "뒤집기와 눕히기 각도 모두 바꾸기", check: (P) => P.rotX !== 0 && P.rotZ !== 0 },
  { id: "snake", emoji: "🐍", title: "뱀 도형", desc: "구불구불 0.4 이상 + 쪼개기 2단계 이상", check: (P) => P.snake >= 0.4 && P.subdiv >= 2 },
  { id: "stairs", emoji: "🪜", title: "계단 탑", desc: "계단 5층 이상 + 키 2배 이상", check: (P) => P.steps >= 5 && P.height >= 2 },
  { id: "rock", emoji: "🪨", title: "돌멩이 만들기", desc: "울퉁불퉁 0.3 이상 + 쪼개기 2단계 이상", check: (P) => P.noise >= 0.3 && P.subdiv >= 2 },
  { id: "boom", emoji: "💥", title: "펑!", desc: "펼치기 0.5 이상", check: (P) => P.explode >= 0.5 },
  { id: "sliced", emoji: "🔪", title: "단면 탐정", desc: "단면 자르기 50% 이상", check: (P) => P.slice >= 50 },
  { id: "carousel", emoji: "🎠", title: "회전목마", desc: "복제 6개 이상", check: (P) => P.copies >= 6 },
  { id: "friends", emoji: "👫", title: "도형 친구들", desc: "새 도형 5개 이상 추가하기", check: (P) => P.extras.length >= 5 },
  { id: "family", emoji: "👨‍👩‍👧‍👦", title: "도형 대가족", desc: "새 도형 20개 이상 추가하기", check: (P) => P.extras.length >= 20 },
  { id: "city", emoji: "🏙️", title: "도형 도시", desc: "새 도형 100개 모두 추가하기", check: (P) => P.extras.length >= 100 },
  { id: "copy100", emoji: "🌌", title: "은하수 복제", desc: "회전목마 복제 100개", check: (P) => P.copies >= 100 },
  { id: "blackhole", emoji: "🕳️", title: "블랙홀 탐험가", desc: "도형 10개 이상을 둥글게 세워 블랙홀 키우기", check: (P) => P.extras.length >= 9 },
  { id: "feast", emoji: "🍽️", title: "우주 먹방", desc: "태양·행성·중성자별·초거대 블랙홀·안드로메다까지 모두 먹이기", check: (_, g) => g.ateSolar },
  { id: "cosmicStar", emoji: "⭐", title: "반짝 별", desc: "먹보 천체 Lv.5 — 먼지구름이 별이 되기", check: (_, g) => g.maxCosmicLevel >= 5 },
  { id: "cosmicNova", emoji: "💥", title: "쾅! 초신성", desc: "먹보 천체 Lv.10 — 초신성 폭발", check: (_, g) => g.maxCosmicLevel >= 10 },
  { id: "cosmicMagnetar", emoji: "🧲", title: "슈퍼 자석", desc: "먹보 천체 Lv.12 — 마그네타 되기", check: (_, g) => g.maxCosmicLevel >= 12 },
  { id: "cosmicHole", emoji: "🕳️", title: "진짜 블랙홀", desc: "먹보 천체 Lv.15 — 블랙홀 되기", check: (_, g) => g.maxCosmicLevel >= 15 },
  { id: "cosmicGalaxy", emoji: "🌌", title: "은하수 탄생", desc: "먹보 천체 Lv.18 — 은하수 되기", check: (_, g) => g.maxCosmicLevel >= 18 },
  { id: "andromeda", emoji: "🌠", title: "안드로메다 정복", desc: "질량 1,000,000배로 안드로메다 은하 먹기", check: (_, g) => g.ateAndromeda },
  { id: "hurricane", emoji: "🌀", title: "태풍의 눈", desc: "도형 20개 이상을 둥글게 세워 가운데 허리케인 키우기", check: (P) => P.copies >= 20 || P.extras.length >= 19 },
  { id: "dual", emoji: "💞", title: "짝꿍 찾기", desc: "짝꿍(쌍대) 도형으로 바꿔 보기", check: (_, g) => g.usedDual },
  { id: "save3", emoji: "🖼️", title: "나만의 갤러리", desc: "도형 3개 저장하기", check: (_, g) => g.savedCount >= 3 },
  { id: "match5", emoji: "🎯", title: "모양 맞추기 장인", desc: "모양 맞추기에서 별 5개 모으기", check: (_, g) => g.matchStars >= 5 },
  { id: "match15", emoji: "👑", title: "도형의 달인", desc: "모양 맞추기에서 별 15개 모으기", check: (_, g) => g.matchStars >= 15 },
  { id: "daily", emoji: "📅", title: "오늘의 도형", desc: "오늘의 도형 맞추기 성공", check: (_, g) => g.dailyCount >= 1 },
  { id: "rush5", emoji: "⏱️", title: "번개 손", desc: "60초 타임어택에서 5개 이상 맞추기", check: (_, g) => g.timeAttackBest >= 5 },
  { id: "level5", emoji: "🏆", title: "다면체 기사", desc: "레벨 5 달성", check: (_, g) => levelOf(g.xp).level >= 5 },
];

// ----------------------------------------------------------------------------
// 난수 (오늘의 도형은 날짜가 같으면 누구에게나 같은 문제)
// ----------------------------------------------------------------------------

export type Rng = () => number;

export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function todayKey(date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

const hashString = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

// ----------------------------------------------------------------------------
// 모양 맞추기 미션
// ----------------------------------------------------------------------------

export type MatchKey = "twist" | "spike" | "height" | "width" | "shear" | "bend" | "taper";

interface MatchDef {
  key: MatchKey;
  label: string;
  tolerance: number; // 이만큼 틀리면 그 항목 0점
  choices: number[]; // 목표로 나올 수 있는 값
}

export const MATCH_DEFS: MatchDef[] = [
  { key: "twist", label: "비틀기 각도", tolerance: 90, choices: [-180, -135, -90, -60, 60, 90, 135, 180] },
  { key: "spike", label: "뾰족함", tolerance: 0.5, choices: [-0.4, -0.3, 0.3, 0.5, 0.7, 1.0] },
  { key: "height", label: "키", tolerance: 0.6, choices: [0.5, 0.6, 1.5, 1.8, 2.0] },
  { key: "width", label: "옆 너비", tolerance: 0.6, choices: [0.5, 0.6, 1.4, 1.7] },
  { key: "shear", label: "기울이기 각도", tolerance: 25, choices: [-30, -20, 20, 30] },
  { key: "bend", label: "휘기 각도", tolerance: 60, choices: [-90, -60, -45, 45, 60, 90] },
  { key: "taper", label: "위로 좁게/넓게", tolerance: 0.5, choices: [-0.6, -0.4, 0.4, 0.6] },
];

const pick = <T,>(arr: T[], rng: Rng): T => arr[Math.floor(rng() * arr.length)];

export function makeTarget(round: number, rng: Rng = Math.random): ShapeParams {
  const count = Math.min(1 + Math.floor((round - 1) / 2), 4);
  // 섞기: 난수 키를 붙여 정렬 (seeded rng 로도 같은 결과가 나오도록)
  const keys = MATCH_DEFS.map((d) => ({ d, r: rng() }))
    .sort((a, b) => a.r - b.r)
    .slice(0, count)
    .map((x) => x.d);
  const target: ShapeParams = { ...DEFAULT_PARAMS, pulls: {}, subdiv: 2, base: pick(BASES, rng).key };
  for (const def of keys) target[def.key] = pick(def.choices, rng);
  return target;
}

export function dailyTarget(day = todayKey()): ShapeParams {
  return makeTarget(6, seededRng(hashString(day)));
}

export interface MatchResult {
  score: number; // 0~100
  baseOk: boolean;
  worst: { label: string; direction: "up" | "down" } | null;
}

export function scoreMatch(player: ShapeParams, target: ShapeParams): MatchResult {
  let total = 0;
  let worstErr = 0;
  let worst: MatchResult["worst"] = null;
  for (const def of MATCH_DEFS) {
    const diff = target[def.key] - player[def.key];
    const err = Math.min(Math.abs(diff) / def.tolerance, 1);
    total += 1 - err;
    if (err > worstErr + 1e-9) {
      worstErr = err;
      worst = { label: def.label, direction: diff > 0 ? "up" : "down" };
    }
  }
  const baseOk = player.base === target.base;
  let score = (total / MATCH_DEFS.length) * 100;
  if (!baseOk) score = Math.min(score, 40);
  return { score: Math.round(score), baseOk, worst };
}

export function starsFor(score: number): number {
  if (score >= 98) return 3;
  if (score >= 95) return 2;
  if (score >= 90) return 1;
  return 0;
}

// ----------------------------------------------------------------------------
// 도형 교배: 두 도형의 값을 섞고 가끔 돌연변이
// ----------------------------------------------------------------------------

export function breed(a: ShapeParams, b: ShapeParams, rng: Rng = Math.random): ShapeParams {
  const child: ShapeParams = { ...DEFAULT_PARAMS, base: rng() < 0.5 ? a.base : b.base, pulls: {} };
  for (const s of SLIDERS) {
    const t = 0.3 + rng() * 0.4;
    let v = a[s.key] * t + b[s.key] * (1 - t);
    if (rng() < 0.12) v += (s.max - s.min) * (rng() - 0.5) * 0.3; // 돌연변이!
    v = Math.min(s.max, Math.max(s.min, v));
    child[s.key] = s.unit === "count" || s.unit === "percent" || s.unit === "deg" ? Math.round(v) : Math.round(v * 100) / 100;
  }
  child.subdiv = Math.max(a.subdiv, b.subdiv);
  child.extras = rng() < 0.5 ? a.extras : b.extras;
  return child;
}

// ----------------------------------------------------------------------------
// 저장 (localStorage)
// ----------------------------------------------------------------------------

export interface SavedShape {
  id: string;
  name: string;
  params: ShapeParams;
  look: Look;
  thumb: string;
  createdAt: number;
  favorite?: boolean;
}

export interface Settings {
  sound: boolean;
}

export interface SaveData {
  version: 1;
  gallery: SavedShape[];
  unlocked: string[];
  progress: GameProgress;
  matchRound: number;
  settings: Settings;
}

const STORAGE_KEY = "shapemaker-save-v1";
export const GALLERY_LIMIT = 24;

export function emptySave(): SaveData {
  return {
    version: 1,
    gallery: [],
    unlocked: [],
    progress: {
      touchedBases: [DEFAULT_PARAMS.base],
      savedCount: 0,
      matchStars: 0,
      quizBest: 0,
      usedAnimation: false,
      xp: 0,
      bestStreak: 0,
      timeAttackBest: 0,
      dailyDone: "",
      dailyCount: 0,
      usedDual: false,
      ateSolar: false,
      maxCosmicLevel: 1,
      ateAndromeda: false,
    },
    matchRound: 1,
    settings: { sound: true },
  };
}

// 저장 파일·가져온 파일의 도형 하나를 검사해서 안전한 모양으로 바꾼다
export function sanitizeSaved(raw: unknown, newId: () => string): SavedShape | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Partial<SavedShape>;
  return {
    id: typeof g.id === "string" ? g.id : newId(),
    name: typeof g.name === "string" && g.name.trim() ? g.name.slice(0, 20) : "이름 없는 도형",
    params: sanitizeParams(g.params),
    look: sanitizeLook(g.look),
    thumb: typeof g.thumb === "string" && g.thumb.startsWith("data:image/") ? g.thumb : "",
    createdAt: typeof g.createdAt === "number" ? g.createdAt : 0,
    favorite: g.favorite === true,
  };
}

export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySave();
    const data = JSON.parse(raw) as Partial<SaveData>;
    if (data.version !== 1) return emptySave();
    const fallback = emptySave();
    const gallery = Array.isArray(data.gallery) ? data.gallery : [];
    return {
      version: 1,
      // 예전 버전에서 저장한 도형은 새 값이 없으므로 기본값으로 채운다
      gallery: gallery.map((g, i) => sanitizeSaved(g, () => `old-${i}`)).filter((g): g is SavedShape => g !== null),
      unlocked: Array.isArray(data.unlocked) ? data.unlocked : [],
      progress: { ...fallback.progress, ...data.progress },
      matchRound: typeof data.matchRound === "number" ? data.matchRound : 1,
      settings: { ...fallback.settings, ...data.settings },
    };
  } catch (err) {
    console.warn("도형 저장 데이터를 읽지 못했어요", err);
    return emptySave();
  }
}

export function writeSave(data: SaveData): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn("도형 저장에 실패했어요", err);
    return false;
  }
}

// 갤러리 파일: { app: "shapemaker", gallery: [...] }
export function galleryFileText(gallery: SavedShape[]): string {
  return JSON.stringify({ app: "shapemaker", version: 1, gallery }, null, 1);
}

export function parseGalleryFile(text: string, newId: () => string): SavedShape[] | null {
  try {
    const data = JSON.parse(text) as { gallery?: unknown } | unknown[];
    const list = Array.isArray(data) ? data : Array.isArray(data.gallery) ? data.gallery : null;
    if (!list) return null;
    return list.map((g) => sanitizeSaved(g, newId)).filter((g): g is SavedShape => g !== null);
  } catch (err) {
    console.warn("갤러리 파일을 읽지 못했어요", err);
    return null;
  }
}
