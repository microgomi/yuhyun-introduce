"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ============================================================
// TYPES
// ============================================================
type Element = "없음" | "불" | "얼음" | "번개" | "독" | "암흑" | "물";
type Rarity = "일반" | "고급" | "희귀" | "전설" | "신화";
type Diet = "초식" | "육식";
type Biome = "초원" | "숲" | "사막" | "화산" | "바다" | "빙하";
type Screen =
  | "main"
  | "explore"
  | "encounter"
  | "collection"
  | "battle-fight"
  | "evolve"
  | "league-select"
  | "shop"
  | "quests";
type Status = "poison" | "burn" | "freeze" | "stun" | "atkUp" | "defUp" | "atkDown";

interface DinoTemplate {
  id: number;
  name: string;
  emoji: string;
  baseHP: number;
  baseATK: number;
  baseDEF: number;
  baseSPD: number;
  element: Element;
  skill: string;
  skillDesc: string;
  rarity: Rarity;
  diet: Diet;
  biomes: Biome[];
}

interface OwnedDino {
  uid: string;
  templateId: number;
  level: number;
  xp: number;
  evolution: number; // 0,1,2,3
  shiny: boolean;
}

interface Fighter {
  uid: string;
  templateId: number;
  level: number;
  evolution: number;
  shiny: boolean;
  hp: number;
  maxHP: number;
  atk: number;
  def: number;
  spd: number;
  status: Partial<Record<Status, number>>;
}

interface BattleState {
  player: Fighter[];
  enemy: Fighter[];
  ap: number; // active player index
  ae: number; // active enemy index
  energy: number;
  enemyEnergy: number;
  cdP: number;
  cdE: number;
  turn: number;
  log: string[];
  phase: "player" | "busy" | "won" | "lost";
  shakeP: boolean;
  shakeE: boolean;
  flash: string;
  popP: { amount: number; crit: boolean; id: number } | null;
  popE: { amount: number; crit: boolean; id: number } | null;
  enemyPotionUsed: boolean;
  mode: "1v1" | "3v3";
  league: number;
}

interface GameStats {
  catches: number;
  wins: number;
  evolves: number;
  explores: number;
  hatches: number;
}

interface GameState {
  coins: number;
  food: number;
  xpItems: number;
  potions: number;
  boosts: number;
  playerLevel: number;
  playerXP: number;
  trophies: number;
  dinos: OwnedDino[];
  team: string[];
  discovered: number[];
  stats: GameStats;
  claimed: number[];
}

// ============================================================
// DINO DATABASE
// ============================================================
const DINOS: DinoTemplate[] = [
  // 일반 (Common)
  { id: 1, name: "브라키오사우루스", emoji: "🦕", baseHP: 120, baseATK: 25, baseDEF: 30, baseSPD: 15, element: "없음", skill: "긴 목 휩쓸기", skillDesc: "긴 목으로 적을 쓸어버린다", rarity: "일반", diet: "초식", biomes: ["초원", "숲"] },
  { id: 2, name: "콤프소그나투스", emoji: "🦖", baseHP: 50, baseATK: 30, baseDEF: 15, baseSPD: 55, element: "없음", skill: "무리 공격", skillDesc: "작은 동료들이 함께 2연타", rarity: "일반", diet: "육식", biomes: ["초원", "숲", "사막"] },
  { id: 3, name: "안킬로사우루스", emoji: "🐊", baseHP: 100, baseATK: 20, baseDEF: 55, baseSPD: 10, element: "없음", skill: "꼬리 해머", skillDesc: "강화된 꼬리로 타격", rarity: "일반", diet: "초식", biomes: ["초원", "사막"] },
  { id: 4, name: "파라사우롤로푸스", emoji: "🦴", baseHP: 80, baseATK: 30, baseDEF: 30, baseSPD: 30, element: "없음", skill: "큰 울음", skillDesc: "적의 공격력을 낮춘다", rarity: "일반", diet: "초식", biomes: ["초원", "숲"] },
  { id: 5, name: "미크로랍토르", emoji: "🥚", baseHP: 45, baseATK: 28, baseDEF: 12, baseSPD: 60, element: "없음", skill: "급습", skillDesc: "빠른 속도로 2연타", rarity: "일반", diet: "육식", biomes: ["숲", "초원"] },
  { id: 6, name: "파키케팔로사우루스", emoji: "🦕", baseHP: 75, baseATK: 35, baseDEF: 40, baseSPD: 20, element: "없음", skill: "박치기", skillDesc: "단단한 머리로 돌진(반동 피해)", rarity: "일반", diet: "초식", biomes: ["초원", "사막"] },
  // 고급 (Uncommon)
  { id: 7, name: "벨로시랩터", emoji: "🦖", baseHP: 65, baseATK: 45, baseDEF: 20, baseSPD: 50, element: "없음", skill: "갈고리 발톱", skillDesc: "날카로운 발톱으로 연속 공격", rarity: "고급", diet: "육식", biomes: ["숲", "초원", "사막"] },
  { id: 8, name: "스테고사우루스", emoji: "🦕", baseHP: 110, baseATK: 25, baseDEF: 50, baseSPD: 15, element: "없음", skill: "등판 방어", skillDesc: "등판을 세워 방어력 증가", rarity: "고급", diet: "초식", biomes: ["초원", "숲"] },
  { id: 9, name: "딜로포사우루스", emoji: "🦖", baseHP: 70, baseATK: 40, baseDEF: 22, baseSPD: 40, element: "독", skill: "독 침 발사", skillDesc: "독침을 뱉어 지속 피해", rarity: "고급", diet: "육식", biomes: ["숲", "사막"] },
  { id: 10, name: "이구아노돈", emoji: "🦕", baseHP: 90, baseATK: 30, baseDEF: 35, baseSPD: 25, element: "없음", skill: "치유의 풀", skillDesc: "HP를 회복한다", rarity: "고급", diet: "초식", biomes: ["초원", "숲"] },
  { id: 11, name: "카르노타우루스", emoji: "🐊", baseHP: 80, baseATK: 48, baseDEF: 25, baseSPD: 35, element: "없음", skill: "돌진 공격", skillDesc: "전력 질주 돌진(반동 피해)", rarity: "고급", diet: "육식", biomes: ["초원", "사막"] },
  { id: 12, name: "갈리미무스", emoji: "🦖", baseHP: 55, baseATK: 30, baseDEF: 18, baseSPD: 55, element: "없음", skill: "질풍 달리기", skillDesc: "극한의 속도로 2연타", rarity: "고급", diet: "육식", biomes: ["초원", "사막"] },
  // 희귀 (Rare)
  { id: 13, name: "알로사우루스", emoji: "🦖", baseHP: 90, baseATK: 55, baseDEF: 30, baseSPD: 35, element: "없음", skill: "맹렬한 이빨", skillDesc: "강력한 물기 공격", rarity: "희귀", diet: "육식", biomes: ["숲", "사막", "화산"] },
  { id: 14, name: "트리케라톱스", emoji: "🦕", baseHP: 110, baseATK: 40, baseDEF: 50, baseSPD: 20, element: "없음", skill: "뿔 돌진", skillDesc: "세 개의 뿔로 돌진(반동 피해)", rarity: "희귀", diet: "초식", biomes: ["초원", "숲"] },
  { id: 15, name: "프테라노돈", emoji: "🦴", baseHP: 60, baseATK: 42, baseDEF: 20, baseSPD: 55, element: "없음", skill: "급강하 공격", skillDesc: "하늘에서 급강하 타격", rarity: "희귀", diet: "육식", biomes: ["초원", "바다", "화산"] },
  { id: 16, name: "스피노사우루스", emoji: "🐊", baseHP: 100, baseATK: 50, baseDEF: 35, baseSPD: 30, element: "물", skill: "수중 사냥", skillDesc: "물의 힘으로 공격 후 방어 상승", rarity: "희귀", diet: "육식", biomes: ["바다", "숲"] },
  { id: 17, name: "디플로도쿠스", emoji: "🦕", baseHP: 150, baseATK: 25, baseDEF: 35, baseSPD: 12, element: "없음", skill: "대지 진동", skillDesc: "거대한 몸으로 지면을 흔든다", rarity: "희귀", diet: "초식", biomes: ["초원"] },
  { id: 18, name: "바리오닉스", emoji: "🦖", baseHP: 85, baseATK: 45, baseDEF: 30, baseSPD: 38, element: "물", skill: "물갈퀴 할퀴기", skillDesc: "수중 적응 발톱 공격", rarity: "희귀", diet: "육식", biomes: ["바다", "숲"] },
  { id: 31, name: "케라토사우루스", emoji: "🦖", baseHP: 85, baseATK: 52, baseDEF: 28, baseSPD: 33, element: "불", skill: "불꽃 뿔 돌진", skillDesc: "불타는 뿔로 돌진해 화상", rarity: "희귀", diet: "육식", biomes: ["화산", "사막"] },
  { id: 32, name: "유타랍토르", emoji: "🦖", baseHP: 80, baseATK: 50, baseDEF: 25, baseSPD: 48, element: "없음", skill: "무리의 사냥", skillDesc: "동료와 함께 2연타", rarity: "희귀", diet: "육식", biomes: ["숲", "빙하"] },
  // 전설 (Legendary)
  { id: 19, name: "티라노사우루스 렉스", emoji: "🦖", baseHP: 120, baseATK: 65, baseDEF: 35, baseSPD: 30, element: "없음", skill: "폭군의 포효", skillDesc: "공포의 포효로 적 공격력 감소", rarity: "전설", diet: "육식", biomes: ["화산", "숲", "사막"] },
  { id: 20, name: "모사사우루스", emoji: "🐊", baseHP: 130, baseATK: 55, baseDEF: 40, baseSPD: 35, element: "물", skill: "심해의 이빨", skillDesc: "바다의 최상위 포식자 물기", rarity: "전설", diet: "육식", biomes: ["바다"] },
  { id: 21, name: "케찰코아틀루스", emoji: "🦴", baseHP: 80, baseATK: 50, baseDEF: 25, baseSPD: 60, element: "없음", skill: "하늘의 제왕", skillDesc: "초고속 급강하 공격", rarity: "전설", diet: "육식", biomes: ["화산", "초원"] },
  { id: 22, name: "기가노토사우루스", emoji: "🦕", baseHP: 110, baseATK: 70, baseDEF: 30, baseSPD: 25, element: "없음", skill: "절멸의 이빨", skillDesc: "역대 최강의 물기 공격", rarity: "전설", diet: "육식", biomes: ["화산", "사막"] },
  { id: 23, name: "플레시오사우루스", emoji: "🐊", baseHP: 100, baseATK: 45, baseDEF: 40, baseSPD: 40, element: "물", skill: "심연의 덫", skillDesc: "긴 목으로 적을 옥죈다", rarity: "전설", diet: "육식", biomes: ["바다", "빙하"] },
  { id: 33, name: "아르젠티노사우루스", emoji: "🦕", baseHP: 170, baseATK: 45, baseDEF: 50, baseSPD: 10, element: "없음", skill: "대지 붕괴", skillDesc: "대륙이 흔들리는 초중량 공격", rarity: "전설", diet: "초식", biomes: ["초원", "숲"] },
  { id: 34, name: "크로노사우루스", emoji: "🐊", baseHP: 125, baseATK: 58, baseDEF: 38, baseSPD: 32, element: "물", skill: "심연의 압박", skillDesc: "수압으로 짓눌러 방어 상승", rarity: "전설", diet: "육식", biomes: ["바다", "빙하"] },
  // 신화 (Mythic)
  { id: 24, name: "불의 렉스", emoji: "🔥", baseHP: 130, baseATK: 72, baseDEF: 40, baseSPD: 40, element: "불", skill: "화염 브레스", skillDesc: "모든 것을 태우는 화염(화상)", rarity: "신화", diet: "육식", biomes: ["화산"] },
  { id: 25, name: "얼음 공룡", emoji: "❄️", baseHP: 140, baseATK: 55, baseDEF: 55, baseSPD: 35, element: "얼음", skill: "빙결 폭풍", skillDesc: "적을 얼려버리는 눈보라(빙결)", rarity: "신화", diet: "육식", biomes: ["빙하"] },
  { id: 26, name: "번개 공룡", emoji: "⚡", baseHP: 100, baseATK: 65, baseDEF: 35, baseSPD: 65, element: "번개", skill: "전기 충격", skillDesc: "번개를 내리쳐 마비", rarity: "신화", diet: "육식", biomes: ["화산", "사막"] },
  { id: 27, name: "다크 렉스", emoji: "🌑", baseHP: 150, baseATK: 75, baseDEF: 45, baseSPD: 45, element: "암흑", skill: "암흑 포효", skillDesc: "피해의 일부를 흡수한다", rarity: "신화", diet: "육식", biomes: ["화산"] },
  { id: 28, name: "독의 와이번", emoji: "☠️", baseHP: 90, baseATK: 60, baseDEF: 30, baseSPD: 55, element: "독", skill: "맹독의 안개", skillDesc: "치명적인 독 안개(맹독)", rarity: "신화", diet: "육식", biomes: ["숲", "사막"] },
  { id: 29, name: "수정 공룡", emoji: "💎", baseHP: 120, baseATK: 50, baseDEF: 65, baseSPD: 30, element: "얼음", skill: "수정 방벽", skillDesc: "수정 갑옷으로 방어력 폭증", rarity: "신화", diet: "초식", biomes: ["빙하"] },
  { id: 30, name: "태양 공룡", emoji: "☀️", baseHP: 135, baseATK: 68, baseDEF: 42, baseSPD: 38, element: "불", skill: "태양 플레어", skillDesc: "태양의 힘으로 초열 공격(화상)", rarity: "신화", diet: "육식", biomes: ["화산", "사막"] },
  { id: 35, name: "대지의 수호룡", emoji: "🗿", baseHP: 165, baseATK: 55, baseDEF: 70, baseSPD: 25, element: "없음", skill: "가이아의 방벽", skillDesc: "대지의 갑옷으로 방어력 폭증", rarity: "신화", diet: "초식", biomes: ["초원", "숲"] },
  { id: 36, name: "폭풍의 익룡", emoji: "🌩️", baseHP: 105, baseATK: 70, baseDEF: 32, baseSPD: 70, element: "번개", skill: "천둥 폭풍", skillDesc: "폭풍우와 번개로 마비시킨다", rarity: "신화", diet: "육식", biomes: ["화산", "빙하"] },
];

const BIOME_INFO: Record<Biome, { emoji: string; color: string }> = {
  "초원": { emoji: "🌿", color: "from-green-800 to-green-950" },
  "숲": { emoji: "🌲", color: "from-emerald-800 to-emerald-950" },
  "사막": { emoji: "🏜️", color: "from-yellow-800 to-orange-950" },
  "화산": { emoji: "🌋", color: "from-red-800 to-red-950" },
  "바다": { emoji: "🌊", color: "from-blue-800 to-blue-950" },
  "빙하": { emoji: "🧊", color: "from-cyan-700 to-cyan-950" },
};

const RARITY_COLORS: Record<Rarity, string> = {
  "일반": "border-gray-500 bg-gray-900/50",
  "고급": "border-green-500 bg-green-900/50",
  "희귀": "border-blue-500 bg-blue-900/50",
  "전설": "border-purple-500 bg-purple-900/50",
  "신화": "border-yellow-500 bg-yellow-900/50",
};

const RARITY_GLOW: Record<Rarity, string> = {
  "일반": "",
  "고급": "shadow-green-500/30 shadow-lg",
  "희귀": "shadow-blue-500/40 shadow-lg",
  "전설": "shadow-purple-500/50 shadow-xl",
  "신화": "shadow-yellow-400/60 shadow-xl animate-pulse",
};

const RARITY_TEXT: Record<Rarity, string> = {
  "일반": "text-gray-400",
  "고급": "text-green-400",
  "희귀": "text-blue-400",
  "전설": "text-purple-400",
  "신화": "text-yellow-400",
};

const ELEMENT_COLORS: Record<Element, string> = {
  "없음": "text-gray-300",
  "불": "text-red-400",
  "얼음": "text-cyan-400",
  "번개": "text-yellow-300",
  "독": "text-purple-300",
  "암흑": "text-violet-400",
  "물": "text-blue-400",
};

const ELEMENT_FLASH: Record<Element, string> = {
  "없음": "bg-white",
  "불": "bg-red-500",
  "얼음": "bg-cyan-400",
  "번개": "bg-yellow-300",
  "독": "bg-purple-500",
  "암흑": "bg-violet-600",
  "물": "bg-blue-500",
};

const STATUS_INFO: Record<Status, { emoji: string; name: string; color: string }> = {
  poison: { emoji: "☠️", name: "중독", color: "text-purple-300" },
  burn: { emoji: "🔥", name: "화상", color: "text-red-400" },
  freeze: { emoji: "🧊", name: "빙결", color: "text-cyan-300" },
  stun: { emoji: "⚡", name: "마비", color: "text-yellow-300" },
  atkUp: { emoji: "💪", name: "공격↑", color: "text-orange-300" },
  defUp: { emoji: "🛡️", name: "방어↑", color: "text-blue-300" },
  atkDown: { emoji: "📉", name: "공격↓", color: "text-gray-400" },
};

const RARITY_CATCH_WEIGHT: Record<Rarity, number> = {
  "일반": 50,
  "고급": 30,
  "희귀": 14,
  "전설": 5,
  "신화": 1,
};

const RELEASE_VALUE: Record<Rarity, number> = {
  "일반": 40,
  "고급": 90,
  "희귀": 200,
  "전설": 500,
  "신화": 1200,
};

// 상점 ------------------------------------------------------
interface ShopItem {
  key: "food" | "xpItems" | "potions" | "boosts";
  name: string;
  emoji: string;
  cost: number;
  amount: number;
  desc: string;
}
const SHOP_ITEMS: ShopItem[] = [
  { key: "food", name: "먹이 세트", emoji: "🥩", cost: 90, amount: 5, desc: "포획에 사용 (초식에 효과적)" },
  { key: "xpItems", name: "XP 포션", emoji: "💊", cost: 80, amount: 1, desc: "공룡 경험치 +30~50" },
  { key: "potions", name: "전투 포션", emoji: "🧪", cost: 130, amount: 1, desc: "배틀 중 HP 40% 회복" },
  { key: "boosts", name: "파워 부스트", emoji: "💪", cost: 200, amount: 1, desc: "배틀 중 초강력 일격" },
];

interface EggDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  odds: Record<Rarity, number>;
  desc: string;
}
const EGGS: EggDef[] = [
  { id: "fossil", name: "화석 알", emoji: "🥚", cost: 300, odds: { "일반": 52, "고급": 32, "희귀": 14, "전설": 2, "신화": 0 }, desc: "흔한 공룡 위주" },
  { id: "gold", name: "황금 알", emoji: "🟡", cost: 900, odds: { "일반": 10, "고급": 33, "희귀": 40, "전설": 15, "신화": 2 }, desc: "희귀 이상 확률 UP" },
  { id: "mystic", name: "신비의 알", emoji: "🔮", cost: 2200, odds: { "일반": 0, "고급": 8, "희귀": 35, "전설": 42, "신화": 15 }, desc: "전설/신화 집중!" },
];

// 도전과제 ---------------------------------------------------
interface Achievement {
  id: number;
  name: string;
  emoji: string;
  desc: string;
  goal: number;
  progress: (g: GameState) => number;
  reward: number;
}
const ACHIEVEMENTS: Achievement[] = [
  { id: 1, name: "첫 사냥", emoji: "🎯", desc: "공룡 5마리 포획", goal: 5, progress: (g) => g.stats.catches, reward: 150 },
  { id: 2, name: "베테랑 헌터", emoji: "🏹", desc: "공룡 20마리 포획", goal: 20, progress: (g) => g.stats.catches, reward: 400 },
  { id: 3, name: "전설의 헌터", emoji: "👑", desc: "공룡 50마리 포획", goal: 50, progress: (g) => g.stats.catches, reward: 1200 },
  { id: 4, name: "첫 승리", emoji: "⚔️", desc: "배틀 1회 승리", goal: 1, progress: (g) => g.stats.wins, reward: 120 },
  { id: 5, name: "배틀 마스터", emoji: "🥇", desc: "배틀 15회 승리", goal: 15, progress: (g) => g.stats.wins, reward: 700 },
  { id: 6, name: "챔피언", emoji: "🏆", desc: "트로피 5개 획득", goal: 5, progress: (g) => g.trophies, reward: 1500 },
  { id: 7, name: "진화의 시작", emoji: "🧬", desc: "공룡 3회 진화", goal: 3, progress: (g) => g.stats.evolves, reward: 350 },
  { id: 8, name: "도감 수집가", emoji: "📖", desc: "15종 발견", goal: 15, progress: (g) => g.discovered.length, reward: 500 },
  { id: 9, name: "도감 완성", emoji: "🌟", desc: `${DINOS.length}종 전부 발견`, goal: DINOS.length, progress: (g) => g.discovered.length, reward: 3000 },
  { id: 10, name: "신화의 주인", emoji: "✨", desc: "신화 공룡 보유", goal: 1, progress: (g) => g.dinos.filter((d) => getTemplate(d.templateId).rarity === "신화").length, reward: 2000 },
  { id: 11, name: "탐험가", emoji: "🧭", desc: "탐험 30회", goal: 30, progress: (g) => g.stats.explores, reward: 400 },
  { id: 12, name: "부화 마스터", emoji: "🥚", desc: "알 10개 부화", goal: 10, progress: (g) => g.stats.hatches, reward: 600 },
];

// ============================================================
// HELPERS
// ============================================================
function getTemplate(id: number): DinoTemplate {
  return DINOS.find((d) => d.id === id) ?? DINOS[0];
}

function calcStat(base: number, level: number, evolution: number, shiny: boolean): number {
  const evoMult = [1, 1.2, 1.4, 1.6][evolution] ?? 1;
  const lvlMult = 1 + (level - 1) * 0.04;
  const shinyMult = shiny ? 1.1 : 1;
  return Math.floor(base * evoMult * lvlMult * shinyMult);
}

function statsOf(templateId: number, level: number, evolution: number, shiny: boolean) {
  const t = getTemplate(templateId);
  return {
    hp: calcStat(t.baseHP, level, evolution, shiny),
    atk: calcStat(t.baseATK, level, evolution, shiny),
    def: calcStat(t.baseDEF, level, evolution, shiny),
    spd: calcStat(t.baseSPD, level, evolution, shiny),
  };
}

function getDinoStats(dino: OwnedDino) {
  return statsOf(dino.templateId, dino.level, dino.evolution, dino.shiny);
}

function xpToLevel(level: number): number {
  return Math.floor(20 * Math.pow(level, 1.5));
}

function getEvoName(template: DinoTemplate, evo: number): string {
  const suffixes = ["", " Ⅱ", " Ⅲ", " Ω"];
  return template.name + (suffixes[evo] ?? "");
}

function elementAdvantage(atk: Element, def: Element): number {
  const chart: Record<string, string> = { "불": "얼음", "얼음": "번개", "번개": "물", "물": "불" };
  if (chart[atk] === def) return 1.5;
  if (chart[def] === atk) return 0.7;
  if (atk === "암흑" && def !== "암흑") return 1.2;
  if (atk === "독" && def !== "독") return 1.15;
  return 1;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 스킬 정의 (이름/속성으로부터 효과를 결정)
interface SkillDef {
  power: number;
  effect?: Status;
  chance?: number;
  self?: boolean;
  heal?: number;
  hits?: number;
  recoil?: number;
  drain?: number;
}
function skillOf(t: DinoTemplate): SkillDef {
  const s = t.skill;
  if (s.includes("치유") || s.includes("회복")) return { power: 1.5, heal: 0.35 };
  if (s.includes("방벽") || s.includes("등판") || s.includes("방어")) return { power: 1.6, effect: "defUp", chance: 100, self: true };
  if (s.includes("포효") || s.includes("울음")) {
    if (t.element === "암흑") return { power: 3.1, drain: 0.35 };
    return { power: 2.4, effect: "atkDown", chance: 85 };
  }
  switch (t.element) {
    case "불": return { power: 3.0, effect: "burn", chance: 70 };
    case "얼음": return { power: 2.8, effect: "freeze", chance: 45 };
    case "번개": return { power: 2.9, effect: "stun", chance: 50 };
    case "독": return { power: 2.6, effect: "poison", chance: 85 };
    case "암흑": return { power: 3.1, drain: 0.35 };
    case "물": return { power: 2.8, effect: "defUp", chance: 70, self: true };
    default: break;
  }
  if (s.includes("급습") || s.includes("질풍") || s.includes("무리") || s.includes("연속") || s.includes("발톱")) return { power: 1.75, hits: 2 };
  if (s.includes("돌진") || s.includes("박치기")) return { power: 3.4, recoil: 0.12 };
  return { power: 3.0 };
}

function ultimateOf(t: DinoTemplate): SkillDef {
  const elemEffect: Partial<Record<Element, Status>> = { "불": "burn", "얼음": "freeze", "번개": "stun", "독": "poison" };
  return { power: 4.6, effect: elemEffect[t.element] ?? "atkDown", chance: 100 };
}

function fighterName(f: Fighter): string {
  return getEvoName(getTemplate(f.templateId), f.evolution);
}

function makeFighter(d: OwnedDino): Fighter {
  const s = getDinoStats(d);
  return {
    uid: d.uid, templateId: d.templateId, level: d.level, evolution: d.evolution, shiny: d.shiny,
    hp: s.hp, maxHP: s.hp, atk: s.atk, def: s.def, spd: s.spd, status: {},
  };
}

function makeEnemy(t: DinoTemplate, level: number, evolution: number): Fighter {
  const s = statsOf(t.id, level, evolution, false);
  return {
    uid: "E" + t.id + "-" + level + "-" + Math.floor(Math.random() * 100000),
    templateId: t.id, level, evolution, shiny: false,
    hp: s.hp, maxHP: s.hp, atk: s.atk, def: s.def, spd: s.spd, status: {},
  };
}

// ============================================================
// SAVE
// ============================================================
const SAVE_KEY = "dinostar-save-v2";

function freshGame(): GameState {
  const starters: OwnedDino[] = [
    { uid: uid(), templateId: 1, level: 5, xp: 0, evolution: 0, shiny: false },
    { uid: uid(), templateId: 7, level: 5, xp: 0, evolution: 0, shiny: false },
    { uid: uid(), templateId: 4, level: 3, xp: 0, evolution: 0, shiny: false },
  ];
  return {
    coins: 500, food: 10, xpItems: 5, potions: 3, boosts: 2,
    playerLevel: 1, playerXP: 0, trophies: 0,
    dinos: starters,
    team: starters.map((s) => s.uid),
    discovered: starters.map((s) => s.templateId),
    stats: { catches: 0, wins: 0, evolves: 0, explores: 0, hatches: 0 },
    claimed: [],
  };
}

function cloneGame(g: GameState): GameState {
  return {
    ...g,
    dinos: g.dinos.map((d) => ({ ...d })),
    team: [...g.team],
    discovered: [...g.discovered],
    stats: { ...g.stats },
    claimed: [...g.claimed],
  };
}

function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const base = freshGame();
    const g: GameState = {
      ...base,
      ...parsed,
      stats: { ...base.stats, ...(parsed.stats ?? {}) },
      dinos: Array.isArray(parsed.dinos) && parsed.dinos.length > 0 ? parsed.dinos : base.dinos,
      team: Array.isArray(parsed.team) ? parsed.team : base.team,
      discovered: Array.isArray(parsed.discovered) ? parsed.discovered : base.discovered,
      claimed: Array.isArray(parsed.claimed) ? parsed.claimed : [],
    };
    // 사라진 공룡을 가리키는 팀 슬롯 정리
    g.team = g.team.filter((u) => g.dinos.some((d) => d.uid === u));
    if (g.team.length === 0) g.team = g.dinos.slice(0, 3).map((d) => d.uid);
    return g;
  } catch {
    return null;
  }
}

// 공룡 경험치 지급 (draft 직접 수정)
function grantDinoXP(g: GameState, uids: string[], amount: number) {
  g.dinos = g.dinos.map((d) => {
    if (!uids.includes(d.uid)) return d;
    let xp = d.xp + amount;
    let level = d.level;
    while (level < 50 && xp >= xpToLevel(level)) {
      xp -= xpToLevel(level);
      level++;
    }
    if (level >= 50) { level = 50; xp = 0; }
    return { ...d, xp, level };
  });
}

// 플레이어 경험치 (draft 직접 수정)
function grantPlayerXP(g: GameState, amount: number) {
  g.playerXP += amount;
  while (g.playerXP >= g.playerLevel * 50) {
    g.playerXP -= g.playerLevel * 50;
    g.playerLevel++;
    g.food += 3;
    g.xpItems += 2;
    g.coins += 100;
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function DinostarPage() {
  const [loaded, setLoaded] = useState(false);
  const [g, setG] = useState<GameState>(() => ({
    coins: 0, food: 0, xpItems: 0, potions: 0, boosts: 0,
    playerLevel: 1, playerXP: 0, trophies: 0,
    dinos: [], team: [], discovered: [],
    stats: { catches: 0, wins: 0, evolves: 0, explores: 0, hatches: 0 },
    claimed: [],
  }));

  const update = useCallback((fn: (draft: GameState) => void) => {
    setG((prev) => {
      const draft = cloneGame(prev);
      fn(draft);
      return draft;
    });
  }, []);

  const [screen, setScreen] = useState<Screen>("main");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  // explore
  const [selectedBiome, setSelectedBiome] = useState<Biome | null>(null);
  const [encounterDino, setEncounterDino] = useState<DinoTemplate | null>(null);
  const [encounterShiny, setEncounterShiny] = useState(false);
  const [catchChance, setCatchChance] = useState(0);
  const [catchResult, setCatchResult] = useState<"none" | "success" | "fail">("none");
  const [dartGame, setDartGame] = useState(false);
  const [dartPos, setDartPos] = useState(0);
  const dartDir = useRef(1);
  const dartAnim = useRef<ReturnType<typeof setInterval> | null>(null);

  // battle
  const [bs, setBs] = useState<BattleState | null>(null);
  const [selectedLeague, setSelectedLeague] = useState(0);
  const [battleMode, setBattleMode] = useState<"1v1" | "3v3">("1v1");
  const rewardedRef = useRef(false);
  const [rewardText, setRewardText] = useState<string[]>([]);

  // evolve
  const [selectedEvolve, setSelectedEvolve] = useState<string | null>(null);
  const [evolving, setEvolving] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState<string | null>(null);

  // collection
  const [collectionDetail, setCollectionDetail] = useState<number | null>(null);

  // shop / egg
  const [hatching, setHatching] = useState<EggDef | null>(null);
  const [hatchResult, setHatchResult] = useState<{ t: DinoTemplate; shiny: boolean; isNew: boolean } | null>(null);

  // fx
  const [screenFlash, setScreenFlash] = useState("");

  // --- Load / Save ---
  useEffect(() => {
    const saved = loadGame();
    setG(saved ?? freshGame());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(g));
    } catch {
      /* 저장 실패는 무시 */
    }
  }, [g, loaded]);

  useEffect(() => {
    return () => {
      if (dartAnim.current) clearInterval(dartAnim.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const ownedDinos = g.dinos;
  const team = g.team;
  const discovered = g.discovered;

  // ============================================================
  // EXPLORE
  // ============================================================
  const startExplore = useCallback((biome: Biome) => {
    const biomeDinos = DINOS.filter((d) => d.biomes.includes(biome));
    const total = biomeDinos.reduce((a, d) => a + RARITY_CATCH_WEIGHT[d.rarity], 0);
    let r = Math.random() * total;
    let picked = biomeDinos[0];
    for (const d of biomeDinos) {
      r -= RARITY_CATCH_WEIGHT[d.rarity];
      if (r <= 0) { picked = d; break; }
    }
    setSelectedBiome(biome);
    setCatchResult("none");
    setEncounterDino(picked);
    setEncounterShiny(Math.random() < 0.02);
    setCatchChance(0);
    setDartGame(false);
    setScreen("encounter");
    update((d) => { d.stats.explores++; });
  }, [update]);

  const catchBase: Record<Rarity, number> = { "일반": 70, "고급": 50, "희귀": 30, "전설": 15, "신화": 6 };

  const finishCatch = useCallback((chance: number) => {
    if (!encounterDino) return;
    const t = encounterDino;
    const shiny = encounterShiny;
    const capped = Math.min(95, Math.round(chance));
    setCatchChance(capped);
    if (Math.random() * 100 < capped) {
      const newDino: OwnedDino = {
        uid: uid(),
        templateId: t.id,
        level: 1 + Math.floor(Math.random() * 3),
        xp: 0,
        evolution: 0,
        shiny,
      };
      update((d) => {
        d.dinos.push(newDino);
        if (!d.discovered.includes(t.id)) d.discovered.push(t.id);
        if (d.team.length < 3) d.team.push(newDino.uid);
        d.coins += 10;
        d.stats.catches++;
        grantPlayerXP(d, 15);
      });
      setCatchResult("success");
    } else {
      setCatchResult("fail");
    }
  }, [encounterDino, encounterShiny, update]);

  const attemptCatch = useCallback((method: "feed" | "trap") => {
    if (!encounterDino) return;
    let chance = catchBase[encounterDino.rarity];
    if (method === "feed") {
      if (g.food <= 0) { showToast("먹이가 없어요! 상점에서 구매하세요"); return; }
      update((d) => { d.food -= 1; });
      chance += encounterDino.diet === "초식" ? 25 : 10;
    } else {
      if (g.coins < 50) { showToast("코인이 부족합니다"); return; }
      update((d) => { d.coins -= 50; });
      chance += encounterDino.baseHP < 80 ? 30 : 15;
    }
    finishCatch(chance);
  }, [encounterDino, g.food, g.coins, update, finishCatch, showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDartGame = useCallback(() => {
    setDartGame(true);
    setDartPos(0);
    dartDir.current = 1;
    if (dartAnim.current) clearInterval(dartAnim.current);
    dartAnim.current = setInterval(() => {
      setDartPos((p) => {
        let next = p + dartDir.current * 3.5;
        if (next >= 100) { next = 100; dartDir.current = -1; }
        if (next <= 0) { next = 0; dartDir.current = 1; }
        return next;
      });
    }, 28);
  }, []);

  const dartHit = useCallback(() => {
    if (dartAnim.current) clearInterval(dartAnim.current);
    dartAnim.current = null;
    setDartGame(false);
    if (!encounterDino) return;
    const accuracy = Math.abs(dartPos - 50);
    let chance = catchBase[encounterDino.rarity];
    if (accuracy < 5) chance += 45;
    else if (accuracy < 15) chance += 28;
    else if (accuracy < 25) chance += 12;
    finishCatch(chance);
  }, [encounterDino, dartPos, finishCatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // EVOLVE / RELEASE
  // ============================================================
  const canEvolve = (dino: OwnedDino): boolean => {
    const evoLevels = [10, 25, 40];
    if (dino.evolution >= 3) return false;
    return dino.level >= evoLevels[dino.evolution];
  };

  const evolveDino = useCallback((dinoUid: string) => {
    setEvolving(true);
    setScreenFlash("bg-yellow-400");
    setTimeout(() => setScreenFlash("bg-white"), 200);
    setTimeout(() => setScreenFlash("bg-yellow-400"), 400);
    setTimeout(() => setScreenFlash(""), 800);
    setTimeout(() => {
      update((d) => {
        d.dinos = d.dinos.map((x) => (x.uid === dinoUid ? { ...x, evolution: x.evolution + 1 } : x));
        d.stats.evolves++;
        grantPlayerXP(d, 25);
      });
      setEvolving(false);
    }, 900);
  }, [update]);

  const feedXP = useCallback((dinoUid: string) => {
    if (g.xpItems <= 0) { showToast("XP 포션이 없어요!"); return; }
    const gain = 30 + Math.floor(Math.random() * 21);
    update((d) => {
      d.xpItems -= 1;
      grantDinoXP(d, [dinoUid], gain);
    });
    showToast(`💊 경험치 +${gain}`);
  }, [g.xpItems, update, showToast]);

  const releaseDino = useCallback((dinoUid: string) => {
    const dino = g.dinos.find((d) => d.uid === dinoUid);
    if (!dino) return;
    if (g.dinos.length <= 1) { showToast("마지막 공룡은 방출할 수 없어요!"); return; }
    const t = getTemplate(dino.templateId);
    const value = RELEASE_VALUE[t.rarity] + dino.level * 6 + dino.evolution * 50 + (dino.shiny ? 300 : 0);
    update((d) => {
      d.dinos = d.dinos.filter((x) => x.uid !== dinoUid);
      d.team = d.team.filter((u) => u !== dinoUid);
      if (d.team.length === 0) d.team = d.dinos.slice(0, 1).map((x) => x.uid);
      d.coins += value;
      d.xpItems += 1;
    });
    setSelectedEvolve(null);
    setConfirmRelease(null);
    showToast(`🕊️ ${t.name} 방출 · 🪙+${value} 💊+1`);
  }, [g.dinos, update, showToast]);

  const toggleTeam = (dinoUid: string) => {
    update((d) => {
      if (d.team.includes(dinoUid)) {
        if (d.team.length <= 1) return;
        d.team = d.team.filter((u) => u !== dinoUid);
      } else if (d.team.length < 3) {
        d.team.push(dinoUid);
      }
    });
  };

  // ============================================================
  // SHOP
  // ============================================================
  const buyItem = useCallback((item: ShopItem) => {
    if (g.coins < item.cost) { showToast("코인이 부족합니다"); return; }
    update((d) => {
      d.coins -= item.cost;
      d[item.key] += item.amount;
    });
    showToast(`${item.emoji} ${item.name} 구매!`);
  }, [g.coins, update, showToast]);

  const buyEgg = useCallback((egg: EggDef) => {
    if (g.coins < egg.cost) { showToast("코인이 부족합니다"); return; }
    // 등급 추첨
    const entries = Object.entries(egg.odds) as [Rarity, number][];
    const total = entries.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * total;
    let rarity: Rarity = "일반";
    for (const [rar, w] of entries) {
      r -= w;
      if (r <= 0) { rarity = rar; break; }
    }
    const pool = DINOS.filter((d) => d.rarity === rarity);
    const t = pick(pool.length > 0 ? pool : DINOS);
    const shiny = Math.random() < 0.04;
    const isNew = !g.discovered.includes(t.id);

    setHatching(egg);
    setHatchResult(null);
    update((d) => { d.coins -= egg.cost; });

    setTimeout(() => {
      const newDino: OwnedDino = {
        uid: uid(),
        templateId: t.id,
        level: 1 + Math.floor(Math.random() * 5),
        xp: 0,
        evolution: 0,
        shiny,
      };
      update((d) => {
        d.dinos.push(newDino);
        if (!d.discovered.includes(t.id)) d.discovered.push(t.id);
        if (d.team.length < 3) d.team.push(newDino.uid);
        d.stats.hatches++;
        grantPlayerXP(d, 20);
      });
      setHatching(null);
      setHatchResult({ t, shiny, isNew });
    }, 1600);
  }, [g.coins, g.discovered, update, showToast]);

  const claimAchievement = useCallback((a: Achievement) => {
    if (g.claimed.includes(a.id)) return;
    if (a.progress(g) < a.goal) return;
    update((d) => {
      d.claimed.push(a.id);
      d.coins += a.reward;
    });
    showToast(`${a.emoji} ${a.name} 달성! 🪙+${a.reward}`);
  }, [g, update, showToast]);

  // ============================================================
  // BATTLE
  // ============================================================
  const leagueInfo = [
    { name: "초보 리그", emoji: "🟢", rarities: ["일반", "고급"] as Rarity[], levels: [3, 8], reward: 60 },
    { name: "중급 리그", emoji: "🔵", rarities: ["고급", "희귀"] as Rarity[], levels: [8, 18], reward: 150 },
    { name: "고급 리그", emoji: "🟣", rarities: ["희귀", "전설"] as Rarity[], levels: [15, 30], reward: 320 },
    { name: "챔피언 리그", emoji: "🏆", rarities: ["전설", "신화"] as Rarity[], levels: [25, 45], reward: 700 },
  ];

  const cloneBS = (b: BattleState): BattleState => ({
    ...b,
    player: b.player.map((f) => ({ ...f, status: { ...f.status } })),
    enemy: b.enemy.map((f) => ({ ...f, status: { ...f.status } })),
    log: [...b.log],
  });

  const pushLog = (b: BattleState, msg: string) => {
    b.log = [msg, ...b.log].slice(0, 6);
  };

  // 피해 계산 (회피/크리티컬/속성/버프 반영)
  const computeDamage = (att: Fighter, def: Fighter, power: number) => {
    const aT = getTemplate(att.templateId);
    const dT = getTemplate(def.templateId);
    const dodgeChance = Math.min(22, def.spd / 5);
    if (Math.random() * 100 < dodgeChance) return { dmg: 0, crit: false, dodged: true, elem: 1 };
    const atkVal = att.atk * (att.status.atkUp ? 1.35 : 1) * (att.status.atkDown ? 0.72 : 1) * (att.status.burn ? 0.85 : 1);
    const defVal = def.def * (def.status.defUp ? 1.6 : 1);
    const elem = elementAdvantage(aT.element, dT.element);
    const critChance = Math.min(35, 5 + att.spd / 4);
    const crit = Math.random() * 100 < critChance;
    const raw = (atkVal * 2 - defVal * 0.8) * power * elem * (crit ? 1.7 : 1) * (0.92 + Math.random() * 0.16);
    return { dmg: Math.max(5, Math.floor(raw)), crit, dodged: false, elem };
  };

  const applyStatus = (f: Fighter, st: Status) => {
    const dur: Record<Status, number> = { poison: 3, burn: 3, freeze: 1, stun: 1, atkUp: 3, defUp: 3, atkDown: 3 };
    f.status[st] = dur[st];
  };

  // 스킬/공격 실행 → 가한 피해 반환
  const performAttack = (
    b: BattleState,
    attacker: Fighter,
    defender: Fighter,
    def: SkillDef,
    label: string,
    isPlayerAttacking: boolean
  ): number => {
    const aT = getTemplate(attacker.templateId);
    let totalDmg = 0;
    const hits = def.hits ?? 1;

    for (let i = 0; i < hits; i++) {
      if (defender.hp <= 0) break;
      const res = computeDamage(attacker, defender, def.power);
      if (res.dodged) {
        pushLog(b, `💨 ${fighterName(defender)}이(가) 공격을 피했다!`);
        continue;
      }
      defender.hp = Math.max(0, defender.hp - res.dmg);
      totalDmg += res.dmg;
      const critTxt = res.crit ? "💥치명타! " : "";
      const elemTxt = res.elem > 1.2 ? " (효과가 굉장했다!)" : res.elem < 1 ? " (효과가 별로다...)" : "";
      pushLog(b, `${critTxt}${label} → ${res.dmg} 데미지!${elemTxt}`);
      if (res.crit) {
        if (isPlayerAttacking) b.popE = { amount: res.dmg, crit: true, id: Math.floor(Math.random() * 1e9) };
        else b.popP = { amount: res.dmg, crit: true, id: Math.floor(Math.random() * 1e9) };
      }
    }

    if (totalDmg > 0) {
      if (def.drain) {
        const heal = Math.floor(totalDmg * def.drain);
        attacker.hp = Math.min(attacker.maxHP, attacker.hp + heal);
        pushLog(b, `🩸 ${fighterName(attacker)}이(가) ${heal} HP 흡수!`);
      }
      if (def.recoil) {
        const rec = Math.floor(totalDmg * def.recoil);
        attacker.hp = Math.max(1, attacker.hp - rec);
        pushLog(b, `😵 반동으로 ${rec} 피해...`);
      }
    }

    if (def.heal) {
      const heal = Math.floor(attacker.maxHP * def.heal);
      attacker.hp = Math.min(attacker.maxHP, attacker.hp + heal);
      pushLog(b, `💚 ${fighterName(attacker)} ${heal} HP 회복!`);
    }

    if (def.effect && Math.random() * 100 < (def.chance ?? 0)) {
      const target = def.self ? attacker : defender;
      if (!def.self && defender.hp <= 0) {
        // 쓰러진 적에게는 상태이상 적용 안 함
      } else {
        applyStatus(target, def.effect);
        const info = STATUS_INFO[def.effect];
        pushLog(b, `${info.emoji} ${fighterName(target)} ${info.name} 상태!`);
      }
    }

    if (totalDmg > 0) {
      const flash = ELEMENT_FLASH[aT.element];
      b.flash = flash;
      if (isPlayerAttacking) {
        b.shakeE = true;
        if (!b.popE?.crit) b.popE = { amount: totalDmg, crit: false, id: Math.floor(Math.random() * 1e9) };
      } else {
        b.shakeP = true;
        if (!b.popP?.crit) b.popP = { amount: totalDmg, crit: false, id: Math.floor(Math.random() * 1e9) };
      }
    }
    return totalDmg;
  };

  // 턴 종료 시 지속 피해/버프 감소
  const tickStatuses = (b: BattleState, f: Fighter) => {
    if (f.hp <= 0) return;
    if (f.status.poison) {
      const dmg = Math.max(3, Math.floor(f.maxHP * 0.06));
      f.hp = Math.max(0, f.hp - dmg);
      pushLog(b, `☠️ ${fighterName(f)} 중독 피해 ${dmg}!`);
    }
    if (f.status.burn) {
      const dmg = Math.max(3, Math.floor(f.maxHP * 0.05));
      f.hp = Math.max(0, f.hp - dmg);
      pushLog(b, `🔥 ${fighterName(f)} 화상 피해 ${dmg}!`);
    }
    (Object.keys(f.status) as Status[]).forEach((k) => {
      const v = f.status[k];
      if (v === undefined) return;
      if (v <= 1) delete f.status[k];
      else f.status[k] = v - 1;
    });
  };

  const nextAlive = (arr: Fighter[], current: number) => arr.findIndex((f, i) => i !== current && f.hp > 0);

  const startBattle = useCallback(() => {
    const league = leagueInfo[selectedLeague];
    const roster = g.team.map((u) => g.dinos.find((d) => d.uid === u)).filter(Boolean) as OwnedDino[];
    if (roster.length === 0) { showToast("팀에 공룡을 넣어주세요!"); return; }
    // 상대 수는 내 출전 인원과 동일하게 (팀이 3마리 미만이어도 불리하지 않게)
    const count = battleMode === "1v1" ? 1 : Math.min(3, roster.length);
    const playerTeam = roster.slice(0, count).map(makeFighter);

    const candidates = DINOS.filter((d) => league.rarities.includes(d.rarity));
    const enemyTeam: Fighter[] = [];
    for (let i = 0; i < count; i++) {
      const t = pick(candidates);
      const lvl = league.levels[0] + Math.floor(Math.random() * (league.levels[1] - league.levels[0] + 1));
      enemyTeam.push(makeEnemy(t, lvl, lvl >= 25 ? 2 : lvl >= 10 ? 1 : 0));
    }

    rewardedRef.current = false;
    setRewardText([]);
    setBs({
      player: playerTeam,
      enemy: enemyTeam,
      ap: 0, ae: 0,
      energy: 3, enemyEnergy: 3,
      cdP: 0, cdE: 0,
      turn: 1,
      log: ["⚔️ 배틀 시작!"],
      phase: "player",
      shakeP: false, shakeE: false, flash: "",
      popP: null, popE: null,
      enemyPotionUsed: false,
      mode: battleMode,
      league: selectedLeague,
    });
    setScreen("battle-fight");
  }, [selectedLeague, battleMode, g.team, g.dinos, showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearFx = useCallback(() => {
    setBs((prev) => (prev ? { ...prev, shakeP: false, shakeE: false, flash: "", popP: null, popE: null } : prev));
  }, []);

  // 적 턴 + 라운드 종료 처리
  const enemyPhase = useCallback(() => {
    setBs((prev) => {
      if (!prev || prev.phase !== "busy") return prev;
      const b = cloneBS(prev);
      const p = b.player[b.ap];
      let e = b.enemy[b.ae];
      if (!p || !e) return prev;

      // 적이 쓰러졌으면 교대만 하고 공격은 생략
      if (e.hp <= 0) {
        const nxt = nextAlive(b.enemy, b.ae);
        if (nxt === -1) { b.phase = "won"; pushLog(b, "🎉 승리!!!"); return b; }
        b.ae = nxt;
        e = b.enemy[nxt];
        pushLog(b, `🔺 ${fighterName(e)} 등장!`);
        b.phase = "player";
        b.turn++;
        return b;
      }

      const eT = getTemplate(e.templateId);

      if (e.status.freeze) {
        pushLog(b, `🧊 ${fighterName(e)}은(는) 얼어붙어 움직이지 못했다!`);
      } else if (e.status.stun) {
        pushLog(b, `⚡ ${fighterName(e)}은(는) 마비되어 움직이지 못했다!`);
      } else {
        const hpRatio = e.hp / e.maxHP;
        const benchAlive = nextAlive(b.enemy, b.ae) !== -1;
        if (!b.enemyPotionUsed && hpRatio < 0.3) {
          b.enemyPotionUsed = true;
          const heal = Math.floor(e.maxHP * 0.35);
          e.hp = Math.min(e.maxHP, e.hp + heal);
          pushLog(b, `🧪 상대가 포션을 사용! ${heal} HP 회복`);
        } else if (b.mode === "3v3" && hpRatio < 0.25 && benchAlive && Math.random() < 0.4) {
          const nxt = nextAlive(b.enemy, b.ae);
          b.ae = nxt;
          pushLog(b, `🔄 상대가 ${fighterName(b.enemy[nxt])}(으)로 교체!`);
        } else if (b.enemyEnergy >= 2 && b.cdE <= 0 && Math.random() < 0.55) {
          b.enemyEnergy -= 2;
          b.cdE = 3;
          performAttack(b, e, p, skillOf(eT), `💥 상대 ${eT.skill}`, false);
        } else {
          performAttack(b, e, p, { power: 1 }, `⚔️ ${fighterName(e)}의 공격`, false);
        }
      }

      // 라운드 종료: 상태이상 처리
      const activeP = b.player[b.ap];
      const activeE = b.enemy[b.ae];
      tickStatuses(b, activeE);
      tickStatuses(b, activeP);

      // KO 판정
      if (activeE.hp <= 0) {
        pushLog(b, `☠️ ${fighterName(activeE)} 쓰러짐!`);
        const nxt = nextAlive(b.enemy, b.ae);
        if (nxt === -1) { b.phase = "won"; pushLog(b, "🎉 승리!!!"); return b; }
        b.ae = nxt;
        pushLog(b, `🔺 ${fighterName(b.enemy[nxt])} 등장!`);
      }
      if (activeP.hp <= 0) {
        pushLog(b, `😵 ${fighterName(activeP)} 쓰러짐...`);
        const nxt = nextAlive(b.player, b.ap);
        if (nxt === -1) { b.phase = "lost"; pushLog(b, "😢 패배..."); return b; }
        b.ap = nxt;
        pushLog(b, `🔷 ${fighterName(b.player[nxt])} 출전!`);
      }

      b.turn++;
      if (b.cdP > 0) b.cdP--;
      if (b.cdE > 0) b.cdE--;
      b.energy = Math.min(5, b.energy + 1);
      b.enemyEnergy = Math.min(5, b.enemyEnergy + 1);
      b.phase = "player";
      return b;
    });
    setTimeout(clearFx, 450);
  }, [clearFx]); // eslint-disable-line react-hooks/exhaustive-deps

  const doAction = useCallback((action: "attack" | "skill" | "ultimate" | "switch" | "potion" | "boost") => {
    if (!bs || bs.phase !== "player") return;
    const b = cloneBS(bs);
    const p = b.player[b.ap];
    const e = b.enemy[b.ae];
    if (!p || !e) return;
    const pT = getTemplate(p.templateId);

    // 사용 가능 여부 체크 (상태 변화 없이 리턴)
    if (action === "skill" && (b.cdP > 0 || b.energy < 2)) { showToast("스킬을 사용할 수 없어요!"); return; }
    if (action === "ultimate" && b.energy < 5) { showToast("에너지가 부족해요! (5 필요)"); return; }
    if (action === "potion" && g.potions <= 0) { showToast("전투 포션이 없어요!"); return; }
    if (action === "boost" && g.boosts <= 0) { showToast("부스트가 없어요!"); return; }
    if (action === "switch" && nextAlive(b.player, b.ap) === -1) { showToast("교체할 공룡이 없어요!"); return; }

    // 행동 불가 상태
    if (p.status.freeze) {
      pushLog(b, `🧊 ${fighterName(p)}은(는) 얼어붙어 움직이지 못했다!`);
    } else if (p.status.stun) {
      pushLog(b, `⚡ ${fighterName(p)}은(는) 마비되어 움직이지 못했다!`);
    } else if (action === "attack") {
      performAttack(b, p, e, { power: 1 }, `⚔️ ${fighterName(p)}의 공격`, true);
    } else if (action === "skill") {
      b.energy -= 2;
      b.cdP = 3;
      performAttack(b, p, e, skillOf(pT), `💥 ${pT.skill}`, true);
    } else if (action === "ultimate") {
      b.energy = 0;
      performAttack(b, p, e, ultimateOf(pT), `🌟 궁극기 ${pT.skill}!!`, true);
    } else if (action === "switch") {
      const nxt = nextAlive(b.player, b.ap);
      b.ap = nxt;
      pushLog(b, `🔄 ${fighterName(b.player[nxt])} 출전!`);
    } else if (action === "potion") {
      update((d) => { d.potions -= 1; });
      const heal = Math.floor(p.maxHP * 0.4);
      p.hp = Math.min(p.maxHP, p.hp + heal);
      pushLog(b, `🧪 포션 사용! ${heal} HP 회복`);
    } else if (action === "boost") {
      update((d) => { d.boosts -= 1; });
      applyStatus(p, "atkUp");
      performAttack(b, p, e, { power: 3.6 }, `💪 부스트 일격`, true);
    }

    // 적 KO 즉시 판정
    const curE = b.enemy[b.ae];
    if (curE.hp <= 0) {
      pushLog(b, `☠️ ${fighterName(curE)} 쓰러짐!`);
      const nxt = nextAlive(b.enemy, b.ae);
      if (nxt === -1) {
        b.phase = "won";
        pushLog(b, "🎉 승리!!!");
        setBs(b);
        setTimeout(clearFx, 450);
        return;
      }
    }

    b.phase = "busy";
    setBs(b);
    setTimeout(clearFx, 450);
    setTimeout(enemyPhase, 850);
  }, [bs, g.potions, g.boosts, update, showToast, clearFx, enemyPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // 승리 보상 (phase 전환 시 1회만)
  useEffect(() => {
    if (!bs || bs.phase !== "won" || rewardedRef.current) return;
    rewardedRef.current = true;
    const league = leagueInfo[bs.league];
    const coinReward = league.reward + Math.floor(Math.random() * league.reward * 0.4);
    const potionReward = 1 + bs.league;
    const dinoXP = 25 + bs.league * 15;
    const teamUids = bs.player.map((f) => f.uid);
    const isChampion = bs.league === 3;
    update((d) => {
      d.coins += coinReward;
      d.xpItems += potionReward;
      d.stats.wins++;
      if (isChampion) d.trophies++;
      grantPlayerXP(d, 30 + bs.league * 15);
      grantDinoXP(d, teamUids, dinoXP);
    });
    setRewardText([
      `🪙 코인 +${coinReward}`,
      `💊 XP포션 +${potionReward}`,
      `⭐ 팀 경험치 +${dinoXP}`,
      ...(isChampion ? ["🏆 트로피 +1"] : []),
    ]);
  }, [bs?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const renderDinoCard = (dino: OwnedDino, onClick?: () => void, showTeam?: boolean) => {
    const t = getTemplate(dino.templateId);
    const stats = getDinoStats(dino);
    const inTeam = team.includes(dino.uid);
    return (
      <div
        key={dino.uid}
        onClick={onClick}
        className={`border-2 rounded-xl p-3 transition-all hover:scale-105 ${RARITY_COLORS[t.rarity]} ${RARITY_GLOW[t.rarity]} ${onClick ? "cursor-pointer hover:brightness-125" : ""}`}
      >
        <div className="flex justify-between items-start">
          <span className="text-3xl">{dino.shiny ? "✨" : ""}{t.emoji}</span>
          <div className="text-right">
            <div className={`text-xs font-bold ${RARITY_TEXT[t.rarity]}`}>{t.rarity}</div>
            <div className="text-xs text-gray-400">Lv.{dino.level}</div>
          </div>
        </div>
        <div className="text-sm font-bold mt-1 text-white truncate">{getEvoName(t, dino.evolution)}</div>
        {dino.evolution > 0 && <div className="text-xs text-yellow-400">{dino.evolution}차 진화</div>}
        <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
          <span className="text-red-400">❤️{stats.hp}</span>
          <span className="text-orange-400">⚔️{stats.atk}</span>
          <span className="text-blue-400">🛡️{stats.def}</span>
          <span className="text-green-400">💨{stats.spd}</span>
        </div>
        {t.element !== "없음" && <div className={`text-xs mt-1 ${ELEMENT_COLORS[t.element]}`}>{t.element} 속성</div>}
        {showTeam && (
          <button
            onClick={(ev) => { ev.stopPropagation(); toggleTeam(dino.uid); }}
            className={`mt-2 w-full text-xs py-1 rounded ${inTeam ? "bg-yellow-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            {inTeam ? "⭐ 팀 선택됨" : "팀에 추가"}
          </button>
        )}
      </div>
    );
  };

  const HPBar = ({ current, max, size = "normal" }: { current: number; max: number; size?: string }) => {
    const pct = Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100));
    const color = pct > 50 ? "bg-green-500" : pct > 25 ? "bg-yellow-500" : "bg-red-500";
    return (
      <div className={`w-full bg-gray-700 rounded-full overflow-hidden ${size === "small" ? "h-2" : "h-4"}`}>
        <div className={`${color} h-full transition-all duration-300 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  const StatusRow = ({ f }: { f: Fighter }) => {
    const keys = (Object.keys(f.status) as Status[]).filter((k) => (f.status[k] ?? 0) > 0);
    if (keys.length === 0) return null;
    return (
      <div className="flex gap-1 flex-wrap mt-1">
        {keys.map((k) => (
          <span key={k} className={`text-[10px] px-1.5 py-0.5 rounded bg-black/50 border border-gray-700 ${STATUS_INFO[k].color}`}>
            {STATUS_INFO[k].emoji}{STATUS_INFO[k].name} {f.status[k]}
          </span>
        ))}
      </div>
    );
  };

  const Toast = () =>
    toast ? (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-black/90 border border-emerald-600 text-white px-5 py-2 rounded-full text-sm shadow-xl">
        {toast}
      </div>
    ) : null;

  const readyAchievements = ACHIEVEMENTS.filter((a) => !g.claimed.includes(a.id) && a.progress(g) >= a.goal).length;

  // ============================================================
  // SCREENS
  // ============================================================
  if (!loaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-950 to-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce">🦕</div>
          <div className="text-emerald-300 mt-3">공룡 섬으로 이동 중...</div>
        </div>
      </div>
    );
  }

  // --- MAIN MENU ---
  if (screen === "main") {
    const teamDinos = team.map((u) => ownedDinos.find((d) => d.uid === u)).filter(Boolean) as OwnedDino[];
    const evolvable = ownedDinos.filter(canEvolve).length;
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-950 via-emerald-950 to-gray-950 text-white">
        <Toast />
        <div className="max-w-lg mx-auto p-4">
          <Link href="/" className="text-green-400 text-sm hover:underline">← 홈으로</Link>

          <div className="text-center mt-4 mb-6">
            <div className="text-6xl mb-2">🦕</div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-green-400 via-emerald-300 to-yellow-400 bg-clip-text text-transparent">
              다이노스터
            </h1>
            <p className="text-emerald-400 text-sm mt-1">공룡을 모으고, 진화시키고, 배틀하라!</p>
            <div className="text-5xl mt-2 opacity-20">🦖🦕🐊🌩️🗿</div>
          </div>

          {/* Player Info */}
          <div className="bg-gray-900/70 rounded-xl p-4 mb-4 border border-emerald-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-emerald-300 font-bold">🏅 레벨 {g.playerLevel}</span>
              <span className="text-yellow-400 font-bold">🪙 {g.coins}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>경험치</span>
              <span>{g.playerXP}/{g.playerLevel * 50}</span>
            </div>
            <HPBar current={g.playerXP} max={g.playerLevel * 50} size="small" />
            <div className="grid grid-cols-3 gap-1 mt-3 text-xs text-center">
              <span className="bg-black/30 rounded py-1">🥩 {g.food}</span>
              <span className="bg-black/30 rounded py-1">💊 {g.xpItems}</span>
              <span className="bg-black/30 rounded py-1">🧪 {g.potions}</span>
              <span className="bg-black/30 rounded py-1">💪 {g.boosts}</span>
              <span className="bg-black/30 rounded py-1">🏆 {g.trophies}</span>
              <span className="bg-black/30 rounded py-1">🦖 {ownedDinos.length}</span>
            </div>
          </div>

          {/* Team */}
          <div className="mb-4">
            <h2 className="text-emerald-300 font-bold text-sm mb-2">나의 팀</h2>
            <div className="grid grid-cols-3 gap-2">
              {teamDinos.map((d) => {
                const t = getTemplate(d.templateId);
                return (
                  <div key={d.uid} className={`border rounded-lg p-2 text-center ${RARITY_COLORS[t.rarity]} ${RARITY_GLOW[t.rarity]}`}>
                    <div className="text-2xl">{d.shiny ? "✨" : ""}{t.emoji}</div>
                    <div className="text-xs font-bold truncate">{getEvoName(t, d.evolution)}</div>
                    <div className="text-xs text-gray-400">Lv.{d.level}</div>
                  </div>
                );
              })}
              {Array.from({ length: Math.max(0, 3 - teamDinos.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="border border-dashed border-gray-700 rounded-lg p-2 text-center text-gray-600">
                  <div className="text-2xl">❓</div>
                  <div className="text-xs">빈 슬롯</div>
                </div>
              ))}
            </div>
          </div>

          {/* Menu */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setScreen("explore")} className="bg-gradient-to-br from-green-700 to-green-900 border-2 border-green-500 rounded-xl p-4 text-center hover:scale-105 transition-transform shadow-lg shadow-green-900/50">
              <div className="text-3xl mb-1">🌿</div>
              <div className="font-bold">탐험</div>
              <div className="text-xs text-green-300">공룡 포획</div>
            </button>
            <button onClick={() => setScreen("collection")} className="bg-gradient-to-br from-blue-700 to-blue-900 border-2 border-blue-500 rounded-xl p-4 text-center hover:scale-105 transition-transform shadow-lg shadow-blue-900/50">
              <div className="text-3xl mb-1">📖</div>
              <div className="font-bold">도감</div>
              <div className="text-xs text-blue-300">{discovered.length}/{DINOS.length} 발견</div>
            </button>
            <button onClick={() => setScreen("league-select")} className="bg-gradient-to-br from-red-700 to-red-900 border-2 border-red-500 rounded-xl p-4 text-center hover:scale-105 transition-transform shadow-lg shadow-red-900/50">
              <div className="text-3xl mb-1">⚔️</div>
              <div className="font-bold">배틀</div>
              <div className="text-xs text-red-300">리그 도전</div>
            </button>
            <button onClick={() => setScreen("evolve")} className="relative bg-gradient-to-br from-purple-700 to-purple-900 border-2 border-purple-500 rounded-xl p-4 text-center hover:scale-105 transition-transform shadow-lg shadow-purple-900/50">
              <div className="text-3xl mb-1">🧬</div>
              <div className="font-bold">공룡 관리</div>
              <div className="text-xs text-purple-300">레벨업 · 진화 · 방출</div>
              {evolvable > 0 && (
                <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-black px-2 py-0.5 rounded-full animate-bounce">{evolvable}</span>
              )}
            </button>
            <button onClick={() => { setScreen("shop"); setHatchResult(null); }} className="bg-gradient-to-br from-amber-700 to-amber-900 border-2 border-amber-500 rounded-xl p-4 text-center hover:scale-105 transition-transform shadow-lg shadow-amber-900/50">
              <div className="text-3xl mb-1">🏪</div>
              <div className="font-bold">상점</div>
              <div className="text-xs text-amber-300">아이템 · 알 부화</div>
            </button>
            <button onClick={() => setScreen("quests")} className="relative bg-gradient-to-br from-cyan-700 to-cyan-900 border-2 border-cyan-500 rounded-xl p-4 text-center hover:scale-105 transition-transform shadow-lg shadow-cyan-900/50">
              <div className="text-3xl mb-1">🎖️</div>
              <div className="font-bold">도전과제</div>
              <div className="text-xs text-cyan-300">보상 받기</div>
              {readyAchievements > 0 && (
                <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-black px-2 py-0.5 rounded-full animate-bounce">{readyAchievements}</span>
              )}
            </button>
          </div>

          <div className="text-center text-gray-600 text-xs mt-5">진행 상황은 자동 저장됩니다 💾</div>
        </div>
      </div>
    );
  }

  // --- EXPLORE ---
  if (screen === "explore") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-950 via-emerald-950 to-gray-950 text-white">
        <Toast />
        <div className="max-w-lg mx-auto p-4">
          <button onClick={() => setScreen("main")} className="text-green-400 text-sm hover:underline">← 메인으로</button>
          <h1 className="text-2xl font-black text-center mt-4 mb-2">🌍 탐험</h1>
          <p className="text-center text-emerald-300 text-sm mb-6">바이옴을 선택하여 공룡을 찾으세요!</p>
          <div className="text-center text-sm text-gray-400 mb-4">🥩 먹이 {g.food} · 🪙 코인 {g.coins}</div>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(BIOME_INFO) as Biome[]).map((biome) => {
              const info = BIOME_INFO[biome];
              const pool = DINOS.filter((d) => d.biomes.includes(biome));
              const found = pool.filter((d) => discovered.includes(d.id)).length;
              return (
                <button
                  key={biome}
                  onClick={() => startExplore(biome)}
                  className={`bg-gradient-to-br ${info.color} border border-gray-600 rounded-xl p-5 text-center hover:scale-105 transition-transform`}
                >
                  <div className="text-4xl mb-2">{info.emoji}</div>
                  <div className="font-bold text-lg">{biome}</div>
                  <div className="text-xs text-gray-300">{found}/{pool.length}종 발견</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- ENCOUNTER ---
  if (screen === "encounter" && encounterDino) {
    const t = encounterDino;
    return (
      <div className={`min-h-screen bg-gradient-to-b ${selectedBiome ? BIOME_INFO[selectedBiome].color : "from-green-950 to-gray-950"} text-white`}>
        <Toast />
        {screenFlash && <div className={`fixed inset-0 ${screenFlash} opacity-30 z-50 pointer-events-none transition-opacity`} />}
        <div className="max-w-lg mx-auto p-4">
          <button onClick={() => setScreen("explore")} className="text-green-400 text-sm hover:underline">← 바이옴 선택</button>

          {catchResult === "none" && !dartGame && (
            <>
              <div className="text-center mt-8 mb-4">
                <div className="text-sm text-yellow-300 mb-2 animate-bounce">야생의 공룡이 나타났다!</div>
                <div className={`text-8xl mb-4 ${encounterShiny ? "animate-pulse" : ""}`}>
                  {encounterShiny && <span className="text-4xl">✨</span>}
                  {t.emoji}
                </div>
                <div className={`text-2xl font-black ${RARITY_TEXT[t.rarity]}`}>
                  {encounterShiny ? "✨ " : ""}{t.name}
                </div>
                <div className={`text-sm ${RARITY_TEXT[t.rarity]}`}>[ {t.rarity} ] · 기본 포획률 {catchBase[t.rarity]}%</div>
                {t.element !== "없음" && <div className={`text-sm ${ELEMENT_COLORS[t.element]}`}>{t.element} 속성</div>}
                <div className="text-sm text-gray-300 mt-1">{t.diet} | HP:{t.baseHP} ATK:{t.baseATK} DEF:{t.baseDEF} SPD:{t.baseSPD}</div>
                {!discovered.includes(t.id) && <div className="text-xs text-yellow-300 mt-1 animate-pulse">🆕 도감에 없는 공룡!</div>}
              </div>

              <div className="space-y-2 mt-6">
                <button onClick={() => attemptCatch("feed")} disabled={g.food <= 0}
                  className="w-full bg-gradient-to-r from-orange-700 to-orange-900 border border-orange-500 rounded-lg p-3 hover:brightness-125 transition disabled:opacity-40 text-left">
                  <span className="text-xl mr-2">🥩</span>
                  <span className="font-bold">먹이 던지기</span>
                  <span className="text-sm text-orange-300 ml-2">(먹이 {g.food}개 · 초식에 효과적)</span>
                </button>
                <button onClick={() => attemptCatch("trap")} disabled={g.coins < 50}
                  className="w-full bg-gradient-to-r from-gray-700 to-gray-900 border border-gray-500 rounded-lg p-3 hover:brightness-125 transition disabled:opacity-40 text-left">
                  <span className="text-xl mr-2">🪤</span>
                  <span className="font-bold">함정 설치</span>
                  <span className="text-sm text-gray-300 ml-2">(50코인 · 작은 공룡에 효과적)</span>
                </button>
                <button onClick={startDartGame}
                  className="w-full bg-gradient-to-r from-blue-700 to-blue-900 border border-blue-500 rounded-lg p-3 hover:brightness-125 transition text-left">
                  <span className="text-xl mr-2">🎯</span>
                  <span className="font-bold">마취총 발사</span>
                  <span className="text-sm text-blue-300 ml-2">(무료 · 타이밍 미니게임)</span>
                </button>
                <button onClick={() => startExplore(selectedBiome!)}
                  className="w-full bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-600 rounded-lg p-3 hover:brightness-125 transition text-left">
                  <span className="text-xl mr-2">🏃</span>
                  <span className="font-bold">다른 공룡 찾기</span>
                </button>
              </div>
            </>
          )}

          {dartGame && (
            <div className="text-center mt-12">
              <div className="text-xl font-bold mb-4 text-yellow-300">🎯 타이밍에 맞춰 발사!</div>
              <div className="text-6xl mb-4">{t.emoji}</div>
              <div className="relative w-full h-8 bg-gray-800 rounded-full overflow-hidden mb-4 border-2 border-yellow-500">
                <div className="absolute h-full bg-green-600/50 left-[35%] w-[30%]" />
                <div className="absolute h-full bg-green-400/80 left-[45%] w-[10%]" />
                <div className="absolute h-full w-2 bg-red-500 rounded-full" style={{ left: `${dartPos}%` }} />
              </div>
              <div className="text-xs text-gray-400 mb-3">가운데 초록 영역일수록 포획률 급상승!</div>
              <button onClick={dartHit}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xl py-4 px-12 rounded-xl border-2 border-red-400 animate-pulse">
                발사! 🎯
              </button>
            </div>
          )}

          {catchResult !== "none" && (
            <div className="text-center mt-12">
              {catchResult === "success" ? (
                <>
                  <div className="text-7xl mb-4 animate-bounce">{t.emoji}</div>
                  <div className="text-3xl font-black text-yellow-400 mb-2">포획 성공! 🎉</div>
                  <div className={`text-xl ${RARITY_TEXT[t.rarity]}`}>{encounterShiny ? "✨ " : ""}{t.name}</div>
                  {encounterShiny && <div className="text-yellow-300 text-sm mt-1 animate-pulse">✨ 반짝이 공룡! 능력치 +10%</div>}
                  <div className="text-sm text-green-400 mt-2">🪙+10 · 플레이어 경험치 +15 (포획률 {catchChance}%)</div>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">💨</div>
                  <div className="text-2xl font-bold text-red-400 mb-2">도망쳐버렸다...</div>
                  <div className="text-sm text-gray-400">포획 확률: {catchChance}%</div>
                </>
              )}
              <div className="flex gap-3 mt-6 justify-center">
                <button onClick={() => startExplore(selectedBiome!)} className="bg-green-700 hover:bg-green-600 px-6 py-3 rounded-lg font-bold">다시 탐험 🌿</button>
                <button onClick={() => setScreen("main")} className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg">메인으로</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- COLLECTION ---
  if (screen === "collection") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-950 via-emerald-950 to-gray-950 text-white">
        <Toast />
        <div className="max-w-lg mx-auto p-4">
          <button onClick={() => { setScreen("main"); setCollectionDetail(null); }} className="text-green-400 text-sm hover:underline">← 메인으로</button>
          <h1 className="text-2xl font-black text-center mt-4 mb-2">📖 공룡 도감</h1>
          <p className="text-center text-emerald-300 text-sm mb-4">발견: {discovered.length}/{DINOS.length}</p>

          {collectionDetail !== null ? (
            (() => {
              const t = getTemplate(collectionDetail);
              const isDiscovered = discovered.includes(t.id);
              const owned = ownedDinos.filter((d) => d.templateId === t.id);
              const sk = skillOf(t);
              return (
                <div className="space-y-4">
                  <button onClick={() => setCollectionDetail(null)} className="text-blue-400 text-sm hover:underline">← 목록으로</button>
                  <div className={`border-2 rounded-xl p-6 text-center ${RARITY_COLORS[t.rarity]} ${RARITY_GLOW[t.rarity]}`}>
                    <div className="text-7xl mb-3">{isDiscovered ? t.emoji : "❓"}</div>
                    <div className={`text-2xl font-black ${RARITY_TEXT[t.rarity]}`}>{isDiscovered ? t.name : "???"}</div>
                    <div className={`text-sm ${RARITY_TEXT[t.rarity]}`}>[ {t.rarity} ]</div>
                    {isDiscovered ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                          <div className="text-red-400">❤️ HP: {t.baseHP}</div>
                          <div className="text-orange-400">⚔️ ATK: {t.baseATK}</div>
                          <div className="text-blue-400">🛡️ DEF: {t.baseDEF}</div>
                          <div className="text-green-400">💨 SPD: {t.baseSPD}</div>
                        </div>
                        <div className={`mt-3 ${ELEMENT_COLORS[t.element]}`}>속성: {t.element}</div>
                        <div className="text-sm text-gray-300 mt-1">{t.diet} 공룡</div>
                        <div className="mt-3 bg-gray-900/50 rounded-lg p-3 text-left">
                          <div className="text-yellow-400 font-bold">🌟 {t.skill}</div>
                          <div className="text-sm text-gray-300">{t.skillDesc}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            위력 {sk.power.toFixed(1)}배
                            {sk.hits ? ` · ${sk.hits}연타` : ""}
                            {sk.effect ? ` · ${STATUS_INFO[sk.effect].emoji}${STATUS_INFO[sk.effect].name} ${sk.chance}%` : ""}
                            {sk.heal ? ` · HP ${Math.round(sk.heal * 100)}% 회복` : ""}
                            {sk.drain ? ` · 흡혈 ${Math.round(sk.drain * 100)}%` : ""}
                            {sk.recoil ? ` · 반동 ${Math.round(sk.recoil * 100)}%` : ""}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">서식지: {t.biomes.map((b) => `${BIOME_INFO[b].emoji}${b}`).join(", ")}</div>
                        {owned.length > 0 && (
                          <div className="mt-4">
                            <div className="text-sm text-emerald-400 mb-2">보유 중: {owned.length}마리</div>
                            <div className="space-y-1">
                              {owned.map((d) => (
                                <div key={d.uid} className="text-xs text-gray-400">Lv.{d.level} {d.shiny ? "✨" : ""} {getEvoName(t, d.evolution)}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-gray-500 mt-4">아직 발견하지 못했습니다</div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {DINOS.map((t) => {
                const isDiscovered = discovered.includes(t.id);
                return (
                  <button key={t.id} onClick={() => setCollectionDetail(t.id)}
                    className={`border rounded-lg p-2 text-center hover:scale-105 transition-transform ${isDiscovered ? RARITY_COLORS[t.rarity] : "border-gray-800 bg-gray-900/30"}`}>
                    <div className="text-2xl">{isDiscovered ? t.emoji : "❓"}</div>
                    <div className="text-xs truncate mt-1">{isDiscovered ? t.name : "???"}</div>
                    <div className={`text-xs ${isDiscovered ? RARITY_TEXT[t.rarity] : "text-gray-700"}`}>#{String(t.id).padStart(3, "0")}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- SHOP ---
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 via-gray-950 to-gray-950 text-white">
        <Toast />
        <div className="max-w-lg mx-auto p-4">
          <button onClick={() => { setScreen("main"); setHatchResult(null); }} className="text-green-400 text-sm hover:underline">← 메인으로</button>
          <h1 className="text-2xl font-black text-center mt-4 mb-1">🏪 상점</h1>
          <p className="text-center text-yellow-400 font-bold mb-5">🪙 {g.coins} 코인</p>

          {/* 부화 연출 */}
          {hatching && (
            <div className="fixed inset-0 bg-black/85 z-50 flex flex-col items-center justify-center">
              <div className="text-8xl animate-bounce">{hatching.emoji}</div>
              <div className="text-yellow-300 font-bold mt-4 animate-pulse">알이 흔들린다...</div>
            </div>
          )}

          {/* 부화 결과 */}
          {hatchResult && (
            <div className="fixed inset-0 bg-black/85 z-50 flex flex-col items-center justify-center p-6" onClick={() => setHatchResult(null)}>
              <div className={`border-4 rounded-2xl p-8 text-center ${RARITY_COLORS[hatchResult.t.rarity]} ${RARITY_GLOW[hatchResult.t.rarity]}`}>
                <div className="text-7xl mb-3">{hatchResult.shiny ? "✨" : ""}{hatchResult.t.emoji}</div>
                <div className={`text-2xl font-black ${RARITY_TEXT[hatchResult.t.rarity]}`}>{hatchResult.t.name}</div>
                <div className={`text-sm ${RARITY_TEXT[hatchResult.t.rarity]}`}>[ {hatchResult.t.rarity} ]</div>
                {hatchResult.shiny && <div className="text-yellow-300 text-sm mt-1 animate-pulse">✨ 반짝이!</div>}
                {hatchResult.isNew && <div className="text-emerald-300 text-sm mt-1">🆕 도감 신규 등록!</div>}
                <div className="text-xs text-gray-400 mt-4">화면을 탭하면 닫힙니다</div>
              </div>
            </div>
          )}

          <h2 className="text-amber-300 font-bold text-sm mb-2">🥚 알 부화</h2>
          <div className="space-y-3 mb-6">
            {EGGS.map((egg) => (
              <button key={egg.id} onClick={() => buyEgg(egg)} disabled={g.coins < egg.cost}
                className="w-full border-2 border-amber-600 bg-amber-900/30 rounded-xl p-4 text-left hover:scale-[1.02] transition disabled:opacity-40">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{egg.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold">{egg.name} <span className="text-yellow-400">🪙{egg.cost}</span></div>
                    <div className="text-xs text-gray-300">{egg.desc}</div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {(Object.entries(egg.odds) as [Rarity, number][])
                        .filter(([, v]) => v > 0)
                        .map(([r, v]) => `${r} ${v}%`)
                        .join(" · ")}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <h2 className="text-amber-300 font-bold text-sm mb-2">🎒 아이템</h2>
          <div className="space-y-3">
            {SHOP_ITEMS.map((item) => (
              <button key={item.key} onClick={() => buyItem(item)} disabled={g.coins < item.cost}
                className="w-full border border-gray-600 bg-gray-900/50 rounded-xl p-3 text-left hover:brightness-125 transition disabled:opacity-40">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{item.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold">{item.name} x{item.amount} <span className="text-yellow-400">🪙{item.cost}</span></div>
                    <div className="text-xs text-gray-400">{item.desc}</div>
                  </div>
                  <span className="text-xs text-gray-400">보유 {g[item.key]}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- QUESTS ---
  if (screen === "quests") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-950 via-gray-950 to-gray-950 text-white">
        <Toast />
        <div className="max-w-lg mx-auto p-4">
          <button onClick={() => setScreen("main")} className="text-green-400 text-sm hover:underline">← 메인으로</button>
          <h1 className="text-2xl font-black text-center mt-4 mb-1">🎖️ 도전과제</h1>
          <p className="text-center text-cyan-300 text-sm mb-5">
            달성 {g.claimed.length}/{ACHIEVEMENTS.length} · 🪙 {g.coins}
          </p>
          <div className="space-y-2">
            {ACHIEVEMENTS.map((a) => {
              const prog = Math.min(a.progress(g), a.goal);
              const done = prog >= a.goal;
              const claimed = g.claimed.includes(a.id);
              return (
                <div key={a.id} className={`border rounded-xl p-3 ${claimed ? "border-gray-700 bg-gray-900/40 opacity-60" : done ? "border-yellow-500 bg-yellow-900/20" : "border-gray-700 bg-gray-900/50"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{a.emoji}</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{a.name}</div>
                      <div className="text-xs text-gray-400">{a.desc}</div>
                      <div className="mt-1"><HPBar current={prog} max={a.goal} size="small" /></div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{prog}/{a.goal}</div>
                    </div>
                    {claimed ? (
                      <span className="text-xs text-gray-500">완료 ✅</span>
                    ) : (
                      <button onClick={() => claimAchievement(a)} disabled={!done}
                        className={`text-xs px-3 py-2 rounded-lg font-bold ${done ? "bg-yellow-500 text-black animate-pulse" : "bg-gray-800 text-gray-500"}`}>
                        🪙{a.reward}
                      </button>
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

  // --- LEAGUE SELECT ---
  if (screen === "league-select") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950 via-gray-950 to-gray-950 text-white">
        <Toast />
        <div className="max-w-lg mx-auto p-4">
          <button onClick={() => setScreen("main")} className="text-green-400 text-sm hover:underline">← 메인으로</button>
          <h1 className="text-2xl font-black text-center mt-4 mb-4">⚔️ 배틀 리그</h1>

          <div className="flex justify-center gap-3 mb-5">
            {(["1v1", "3v3"] as const).map((m) => (
              <button key={m} onClick={() => setBattleMode(m)}
                className={`px-6 py-2 rounded-lg font-bold border-2 ${battleMode === m ? "border-red-500 bg-red-900/50" : "border-gray-700 bg-gray-800/50"}`}>
                {m === "1v1" ? "1 vs 1" : "3 vs 3"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {leagueInfo.map((league, i) => (
              <button key={i} onClick={() => { setSelectedLeague(i); startBattle(); }}
                className={`w-full border-2 rounded-xl p-4 text-left hover:scale-[1.02] transition-transform ${
                  i === 0 ? "border-green-600 bg-green-900/30" :
                  i === 1 ? "border-blue-600 bg-blue-900/30" :
                  i === 2 ? "border-purple-600 bg-purple-900/30" :
                  "border-yellow-600 bg-yellow-900/30"
                }`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{league.emoji}</span>
                  <div>
                    <div className="font-bold text-lg">{league.name}</div>
                    <div className="text-sm text-gray-400">상대: {league.rarities.join("+")} Lv.{league.levels[0]}-{league.levels[1]}</div>
                    <div className="text-sm text-yellow-400">보상: 🪙{league.reward}+ · 💊XP포션 {1 + i}개{i === 3 ? " · 🏆트로피" : ""}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-bold text-emerald-300 mb-2">출전 팀 ({battleMode === "1v1" ? "선두 1마리" : "최대 3마리"})</h2>
            <div className="grid grid-cols-3 gap-2">
              {team.slice(0, battleMode === "1v1" ? 1 : 3).map((u) => {
                const d = ownedDinos.find((x) => x.uid === u);
                if (!d) return null;
                const t = getTemplate(d.templateId);
                return (
                  <div key={u} className={`border rounded-lg p-2 text-center ${RARITY_COLORS[t.rarity]}`}>
                    <div className="text-xl">{t.emoji}</div>
                    <div className="text-xs truncate">{getEvoName(t, d.evolution)}</div>
                    <div className="text-xs text-gray-400">Lv.{d.level}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-bold text-emerald-300 mb-2">공룡 선택 (최대 3마리)</h2>
            <div className="grid grid-cols-3 gap-2">
              {ownedDinos.map((d) => renderDinoCard(d, undefined, true))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- BATTLE FIGHT ---
  if (screen === "battle-fight" && bs) {
    const p = bs.player[bs.ap];
    const e = bs.enemy[bs.ae];
    const pT = p ? getTemplate(p.templateId) : null;
    const eT = e ? getTemplate(e.templateId) : null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-950 to-gray-950 text-white relative overflow-hidden">
        <Toast />
        {bs.flash && <div className={`absolute inset-0 ${bs.flash} opacity-20 z-30 pointer-events-none`} />}

        <div className="max-w-lg mx-auto p-4 relative z-10">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-400">턴 {bs.turn} · {leagueInfo[bs.league].name}</span>
            <span className="text-yellow-400 text-sm font-bold">⚡ {bs.energy}/5</span>
          </div>

          {/* Enemy */}
          {eT && e && (
            <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 mb-3"
              style={bs.shakeE ? { animation: "shake 0.3s ease-in-out" } : {}}>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className={`font-bold ${RARITY_TEXT[eT.rarity]}`}>{fighterName(e)}</span>
                  <span className="text-xs text-gray-400 ml-2">Lv.{e.level}</span>
                  {eT.element !== "없음" && <span className={`text-xs ml-2 ${ELEMENT_COLORS[eT.element]}`}>{eT.element}</span>}
                </div>
                <span className="text-sm text-red-400">{e.hp}/{e.maxHP}</span>
              </div>
              <HPBar current={e.hp} max={e.maxHP} />
              <StatusRow f={e} />
              <div className="text-center text-5xl mt-2 relative">
                {eT.emoji}
                {bs.popE && (
                  <span key={bs.popE.id} className={`absolute -top-2 right-1/4 font-black animate-bounce ${bs.popE.crit ? "text-3xl text-yellow-300" : "text-2xl text-red-400"}`}>
                    -{bs.popE.amount}{bs.popE.crit ? "!" : ""}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="text-center text-xl font-black text-red-500 my-1">⚔️ VS ⚔️</div>

          {/* Player */}
          {pT && p && (
            <div className="bg-blue-950/50 border border-blue-800 rounded-xl p-4 mb-3"
              style={bs.shakeP ? { animation: "shake 0.3s ease-in-out" } : {}}>
              <div className="text-center text-5xl mb-2 relative">
                {p.shiny ? "✨" : ""}{pT.emoji}
                {bs.popP && (
                  <span key={bs.popP.id} className={`absolute -top-2 right-1/4 font-black animate-bounce ${bs.popP.crit ? "text-3xl text-yellow-300" : "text-2xl text-red-400"}`}>
                    -{bs.popP.amount}{bs.popP.crit ? "!" : ""}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className={`font-bold ${RARITY_TEXT[pT.rarity]}`}>{fighterName(p)}</span>
                  <span className="text-xs text-gray-400 ml-2">Lv.{p.level}</span>
                  {pT.element !== "없음" && <span className={`text-xs ml-2 ${ELEMENT_COLORS[pT.element]}`}>{pT.element}</span>}
                </div>
                <span className="text-sm text-green-400">{p.hp}/{p.maxHP}</span>
              </div>
              <HPBar current={p.hp} max={p.maxHP} />
              <StatusRow f={p} />
              <div className="flex gap-3 mt-2 text-xs text-gray-400">
                <span>⚔️{p.atk}</span><span>🛡️{p.def}</span><span>💨{p.spd}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          {bs.phase === "player" && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => doAction("attack")} className="bg-red-700 hover:bg-red-600 rounded-lg p-3 font-bold border border-red-500 transition">
                ⚔️ 일반 공격
              </button>
              <button onClick={() => doAction("skill")} disabled={bs.cdP > 0 || bs.energy < 2}
                className="bg-purple-700 hover:bg-purple-600 rounded-lg p-3 font-bold border border-purple-500 transition disabled:opacity-40 text-sm">
                💥 {pT?.skill ?? "스킬"}
                <span className="text-xs block text-purple-200">{bs.cdP > 0 ? `${bs.cdP}턴 남음` : "⚡2"}</span>
              </button>
              <button onClick={() => doAction("ultimate")} disabled={bs.energy < 5}
                className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:brightness-110 rounded-lg p-3 font-bold border border-yellow-400 transition disabled:opacity-40 text-sm">
                🌟 궁극기
                <span className="text-xs block">⚡5 소모</span>
              </button>
              {bs.mode === "3v3" ? (
                <button onClick={() => doAction("switch")} className="bg-blue-700 hover:bg-blue-600 rounded-lg p-3 font-bold border border-blue-500 transition">
                  🔄 교체
                </button>
              ) : (
                <button onClick={() => doAction("boost")} disabled={g.boosts <= 0}
                  className="bg-yellow-700 hover:bg-yellow-600 rounded-lg p-3 font-bold border border-yellow-500 transition disabled:opacity-40">
                  💪 부스트 ({g.boosts})
                </button>
              )}
              <button onClick={() => doAction("potion")} disabled={g.potions <= 0}
                className="bg-green-700 hover:bg-green-600 rounded-lg p-3 font-bold border border-green-500 transition disabled:opacity-40">
                🧪 포션 ({g.potions})
              </button>
              {bs.mode === "3v3" && (
                <button onClick={() => doAction("boost")} disabled={g.boosts <= 0}
                  className="bg-yellow-700 hover:bg-yellow-600 rounded-lg p-3 font-bold border border-yellow-500 transition disabled:opacity-40">
                  💪 부스트 ({g.boosts})
                </button>
              )}
            </div>
          )}

          {bs.phase === "busy" && (
            <div className="text-center text-gray-400 text-sm py-3 animate-pulse mb-3">상대의 턴...</div>
          )}

          {/* Result */}
          {(bs.phase === "won" || bs.phase === "lost") && (
            <div className="text-center py-4">
              <div className="text-5xl mb-2">{bs.phase === "won" ? "🎉" : "😢"}</div>
              <div className={`text-3xl font-black ${bs.phase === "won" ? "text-yellow-400" : "text-red-400"}`}>
                {bs.phase === "won" ? "승리!" : "패배..."}
              </div>
              {bs.phase === "won" && (
                <div className="text-sm text-green-400 mt-2 space-y-0.5">
                  {rewardText.map((r, i) => <div key={i}>{r}</div>)}
                </div>
              )}
              <div className="flex gap-2 justify-center mt-4">
                <button onClick={() => { setBs(null); startBattle(); }} className="bg-red-700 hover:bg-red-600 px-6 py-3 rounded-lg font-bold">한 번 더 ⚔️</button>
                <button onClick={() => { setBs(null); setScreen("main"); }} className="bg-emerald-700 hover:bg-emerald-600 px-6 py-3 rounded-lg font-bold">메인으로</button>
              </div>
            </div>
          )}

          {/* Log */}
          <div className="bg-gray-900/80 rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-500 mb-1">배틀 로그</div>
            {bs.log.map((l, i) => (
              <div key={`${i}-${l}`} className={`text-sm ${i === 0 ? "text-white" : "text-gray-500"}`}>{l}</div>
            ))}
          </div>

          {/* 3v3 team status */}
          {bs.mode === "3v3" && (
            <div className="flex justify-between mt-3">
              <div className="flex gap-1">
                {bs.player.map((f, i) => (
                  <div key={i} className={`text-lg ${f.hp > 0 ? "" : "opacity-30 grayscale"} ${i === bs.ap ? "ring-2 ring-blue-400 rounded" : ""}`}>
                    {getTemplate(f.templateId).emoji}
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                {bs.enemy.map((f, i) => (
                  <div key={i} className={`text-lg ${f.hp > 0 ? "" : "opacity-30 grayscale"} ${i === bs.ae ? "ring-2 ring-red-400 rounded" : ""}`}>
                    {getTemplate(f.templateId).emoji}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-6px); }
            80% { transform: translateX(6px); }
          }
        `}</style>
      </div>
    );
  }

  // --- EVOLVE / MANAGE ---
  if (screen === "evolve") {
    const selected = selectedEvolve ? ownedDinos.find((d) => d.uid === selectedEvolve) : null;
    const sT = selected ? getTemplate(selected.templateId) : null;
    const sStats = selected ? getDinoStats(selected) : null;
    const releaseValue = selected && sT ? RELEASE_VALUE[sT.rarity] + selected.level * 6 + selected.evolution * 50 + (selected.shiny ? 300 : 0) : 0;

    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-gray-950 to-gray-950 text-white">
        <Toast />
        {screenFlash && <div className={`fixed inset-0 ${screenFlash} opacity-40 z-50 pointer-events-none transition-opacity`} />}
        <div className="max-w-lg mx-auto p-4">
          <button onClick={() => { setScreen("main"); setSelectedEvolve(null); setConfirmRelease(null); }} className="text-green-400 text-sm hover:underline">← 메인으로</button>
          <h1 className="text-2xl font-black text-center mt-4 mb-2">🧬 공룡 관리</h1>
          <p className="text-center text-purple-300 text-sm mb-4">💊 XP 포션 {g.xpItems}개 · 🦖 {ownedDinos.length}마리</p>

          {selected && sT && sStats ? (
            <div className="space-y-4">
              <button onClick={() => { setSelectedEvolve(null); setConfirmRelease(null); }} className="text-blue-400 text-sm hover:underline">← 목록으로</button>

              <div className={`border-2 rounded-xl p-6 text-center ${RARITY_COLORS[sT.rarity]} ${RARITY_GLOW[sT.rarity]} ${evolving ? "animate-pulse scale-110" : ""} transition-transform`}>
                <div className={`text-7xl mb-3 ${evolving ? "animate-spin" : ""}`}>{selected.shiny ? "✨" : ""}{sT.emoji}</div>
                <div className={`text-2xl font-black ${RARITY_TEXT[sT.rarity]}`}>{getEvoName(sT, selected.evolution)}</div>
                <div className="text-sm text-gray-400">Lv.{selected.level} {selected.level >= 50 && "(MAX)"}</div>
                {selected.evolution > 0 && <div className="text-yellow-400 text-sm">{selected.evolution}차 진화</div>}

                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>경험치</span>
                    <span>{selected.xp}/{xpToLevel(selected.level)}</span>
                  </div>
                  <HPBar current={selected.xp} max={xpToLevel(selected.level)} size="small" />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                  <div className="text-red-400">❤️ HP: {sStats.hp}</div>
                  <div className="text-orange-400">⚔️ ATK: {sStats.atk}</div>
                  <div className="text-blue-400">🛡️ DEF: {sStats.def}</div>
                  <div className="text-green-400">💨 SPD: {sStats.spd}</div>
                </div>

                <div className="mt-3 bg-gray-900/50 rounded-lg p-3 text-left">
                  <div className="text-yellow-400 font-bold text-sm">🌟 {sT.skill}</div>
                  <div className="text-xs text-gray-300">{sT.skillDesc}</div>
                </div>

                <div className="mt-4 bg-gray-900/50 rounded-lg p-3">
                  <div className="text-sm font-bold text-purple-300 mb-2">진화 단계</div>
                  <div className="flex justify-between text-xs">
                    {[
                      { lv: 10, name: "1차 진화", boost: "+20%" },
                      { lv: 25, name: "2차 진화", boost: "+40%" },
                      { lv: 40, name: "최종 진화", boost: "+60%" },
                    ].map((evo, i) => (
                      <div key={i} className={`text-center ${selected.evolution > i ? "text-yellow-400" : selected.level >= evo.lv && selected.evolution === i ? "text-green-400 animate-pulse" : "text-gray-600"}`}>
                        <div>{evo.name}</div>
                        <div>Lv.{evo.lv}</div>
                        <div>{evo.boost}</div>
                        {selected.evolution > i && <div>✅</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => feedXP(selected.uid)} disabled={g.xpItems <= 0 || selected.level >= 50}
                  className="flex-1 bg-gradient-to-r from-blue-700 to-blue-900 border border-blue-500 rounded-lg p-3 font-bold hover:brightness-125 transition disabled:opacity-40">
                  💊 XP 포션 사용
                  <div className="text-xs text-blue-300">+30~50 경험치</div>
                </button>
                <button onClick={() => evolveDino(selected.uid)} disabled={!canEvolve(selected) || evolving}
                  className="flex-1 bg-gradient-to-r from-yellow-700 to-yellow-900 border border-yellow-500 rounded-lg p-3 font-bold hover:brightness-125 transition disabled:opacity-40">
                  🧬 진화!
                  {canEvolve(selected) ? (
                    <div className="text-xs text-yellow-300 animate-pulse">진화 가능!</div>
                  ) : (
                    <div className="text-xs text-gray-400">
                      {selected.evolution >= 3 ? "최종 진화 완료" : `Lv.${[10, 25, 40][selected.evolution]} 필요`}
                    </div>
                  )}
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => toggleTeam(selected.uid)}
                  className={`flex-1 rounded-lg p-3 font-bold border ${team.includes(selected.uid) ? "bg-yellow-700/60 border-yellow-500" : "bg-gray-800 border-gray-600"}`}>
                  {team.includes(selected.uid) ? "⭐ 팀에서 빼기" : "팀에 추가"}
                </button>
                {confirmRelease === selected.uid ? (
                  <button onClick={() => releaseDino(selected.uid)}
                    className="flex-1 bg-red-700 hover:bg-red-600 border border-red-400 rounded-lg p-3 font-bold animate-pulse">
                    정말 방출? (🪙{releaseValue})
                  </button>
                ) : (
                  <button onClick={() => setConfirmRelease(selected.uid)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg p-3 font-bold">
                    🕊️ 방출하기
                    <div className="text-xs text-gray-400">🪙{releaseValue} · 💊1</div>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {ownedDinos.map((d) => {
                const ce = canEvolve(d);
                return (
                  <div key={d.uid} className="relative">
                    {renderDinoCard(d, () => { setSelectedEvolve(d.uid); setConfirmRelease(null); })}
                    {ce && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full animate-pulse pointer-events-none">
                        진화 가능!
                      </div>
                    )}
                    {team.includes(d.uid) && (
                      <div className="absolute -top-2 -left-2 text-lg pointer-events-none">⭐</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <button onClick={() => setScreen("main")} className="bg-green-700 px-6 py-3 rounded-lg">메인으로 돌아가기</button>
    </div>
  );
}
