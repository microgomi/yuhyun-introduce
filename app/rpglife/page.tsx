"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ============================================================
// TYPES
// ============================================================
type Screen = "title" | "create" | "world" | "battle" | "dungeon" | "town" | "inventory" | "skills" | "quests" | "rest" | "craft" | "fish" | "gameover";
type TimeOfDay = "dawn" | "morning" | "noon" | "afternoon" | "evening" | "night" | "midnight";
type Weather = "sunny" | "cloudy" | "rain" | "storm" | "snow" | "fog" | "heatwave";
type Season = "spring" | "summer" | "autumn" | "winter";
type JobClass = "warrior" | "mage" | "archer" | "thief" | "paladin" | "berserker";

interface Player {
  name: string;
  job: JobClass;
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stamina: number;
  maxStamina: number;
  hunger: number;
  thirst: number;
  temperature: number; // 체온 36~42
  weight: number; // 짐 무게
  maxWeight: number;
  gold: number;
  str: number;
  def: number;
  dex: number;
  int: number;
  vit: number;
  luk: number;
  reputation: number; // -100~100
  karma: number;
  deaths: number;
  daysSurvived: number;
  critChance: number;
  dodgeChance: number;
  poisoned: boolean;
  bleeding: boolean;
  cursed: boolean;
  blessed: boolean;
}

interface Skill {
  id: string;
  name: string;
  icon: string;
  desc: string;
  job: JobClass | "all";
  level: number;
  mpCost: number;
  staminaCost: number;
  damage: number;
  effect?: string;
  cooldown: number;
  currentCd: number;
  learned: boolean;
}

interface Item {
  id: string;
  name: string;
  icon: string;
  type: "weapon" | "armor" | "helmet" | "shield" | "accessory" | "food" | "potion" | "material" | "scroll" | "key" | "fish";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  weight: number;
  value: number;
  atk?: number;
  def?: number;
  healHp?: number;
  healMp?: number;
  healHunger?: number;
  healThirst?: number;
  effect?: string;
  qty: number;
  desc: string;
}

interface Enemy {
  id: string;
  name: string;
  icon: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  xp: number;
  gold: number;
  drops: { id: string; chance: number }[];
  skills: string[];
  weakness?: string;
  resistance?: string;
  isBoss: boolean;
}

interface Quest {
  id: string;
  name: string;
  icon: string;
  desc: string;
  type: "kill" | "collect" | "explore" | "talk";
  target: string;
  required: number;
  progress: number;
  rewardGold: number;
  rewardXp: number;
  rewardItem?: string;
  completed: boolean;
  active: boolean;
}

interface DungeonFloor {
  floor: number;
  name: string;
  enemies: string[];
  boss?: string;
  loot: string[];
  minLevel: number;
}

// ============================================================
// DATA
// ============================================================
const JOBS: Record<JobClass, { name: string; icon: string; desc: string; baseStats: { str: number; dex: number; int: number; vit: number; luk: number } }> = {
  warrior: { name: "전사", icon: "⚔️", desc: "높은 체력과 힘. 근접 전투의 달인.", baseStats: { str: 12, dex: 6, int: 4, vit: 10, luk: 5 } },
  mage: { name: "마법사", icon: "🔮", desc: "강력한 마법. MP가 높다.", baseStats: { str: 4, dex: 5, int: 14, vit: 6, luk: 6 } },
  archer: { name: "궁수", icon: "🏹", desc: "높은 민첩. 원거리 공격.", baseStats: { str: 6, dex: 14, int: 5, vit: 7, luk: 6 } },
  thief: { name: "도적", icon: "🗡️", desc: "높은 행운. 크리티컬과 회피.", baseStats: { str: 7, dex: 10, int: 5, vit: 6, luk: 12 } },
  paladin: { name: "성기사", icon: "🛡️", desc: "균형잡힌 능력. 힐 가능.", baseStats: { str: 9, dex: 5, int: 8, vit: 12, luk: 4 } },
  berserker: { name: "광전사", icon: "🪓", desc: "극단적 공격력. 낮은 방어.", baseStats: { str: 16, dex: 8, int: 3, vit: 8, luk: 3 } },
};

const TIME_CYCLE: TimeOfDay[] = ["dawn", "morning", "noon", "afternoon", "evening", "night", "midnight"];
const TIME_INFO: Record<TimeOfDay, { name: string; icon: string; visibility: number; monsterMod: number }> = {
  dawn: { name: "새벽", icon: "🌅", visibility: 0.7, monsterMod: 0.8 },
  morning: { name: "오전", icon: "🌤️", visibility: 1, monsterMod: 0.7 },
  noon: { name: "정오", icon: "☀️", visibility: 1, monsterMod: 0.5 },
  afternoon: { name: "오후", icon: "🌤️", visibility: 1, monsterMod: 0.6 },
  evening: { name: "저녁", icon: "🌇", visibility: 0.8, monsterMod: 0.9 },
  night: { name: "밤", icon: "🌙", visibility: 0.4, monsterMod: 1.3 },
  midnight: { name: "심야", icon: "🌑", visibility: 0.2, monsterMod: 1.6 },
};

const WEATHER_INFO: Record<Weather, { name: string; icon: string; effect: string; staminaDrain: number; tempMod: number }> = {
  sunny: { name: "맑음", icon: "☀️", effect: "", staminaDrain: 0, tempMod: 0 },
  cloudy: { name: "흐림", icon: "☁️", effect: "", staminaDrain: 0, tempMod: -0.5 },
  rain: { name: "비", icon: "🌧️", effect: "불 마법 -30%", staminaDrain: 2, tempMod: -2 },
  storm: { name: "폭풍", icon: "⛈️", effect: "번개 피해 위험", staminaDrain: 5, tempMod: -3 },
  snow: { name: "눈", icon: "❄️", effect: "이동속도 감소", staminaDrain: 3, tempMod: -5 },
  fog: { name: "안개", icon: "🌫️", effect: "회피율 +15%", staminaDrain: 1, tempMod: -1 },
  heatwave: { name: "폭염", icon: "🔥", effect: "갈증 2배", staminaDrain: 4, tempMod: 3 },
};

const SEASON_INFO: Record<Season, { name: string; icon: string; weathers: Weather[] }> = {
  spring: { name: "봄", icon: "🌸", weathers: ["sunny", "cloudy", "rain", "fog"] },
  summer: { name: "여름", icon: "🌻", weathers: ["sunny", "heatwave", "rain", "storm"] },
  autumn: { name: "가을", icon: "🍂", weathers: ["sunny", "cloudy", "rain", "fog"] },
  winter: { name: "겨울", icon: "❄️", weathers: ["cloudy", "snow", "storm", "fog"] },
};

const RARITY_COLORS: Record<string, string> = { common: "text-gray-300", uncommon: "text-green-400", rare: "text-blue-400", epic: "text-purple-400", legendary: "text-yellow-400" };
const RARITY_LABEL: Record<string, string> = { common: "일반", uncommon: "고급", rare: "희귀", epic: "영웅", legendary: "전설" };

const ALL_SKILLS: Skill[] = [
  // Warrior
  { id: "slash", name: "강타", icon: "⚔️", desc: "강력한 일격", job: "warrior", level: 1, mpCost: 0, staminaCost: 15, damage: 20, cooldown: 0, currentCd: 0, learned: false },
  { id: "shield_bash", name: "방패 강타", icon: "🛡️💥", desc: "방패로 적을 밀친다", job: "warrior", level: 3, mpCost: 5, staminaCost: 20, damage: 25, effect: "stun", cooldown: 2, currentCd: 0, learned: false },
  { id: "whirlwind", name: "회전 베기", icon: "🌀⚔️", desc: "주변 적을 모두 벤다", job: "warrior", level: 8, mpCost: 15, staminaCost: 30, damage: 40, cooldown: 3, currentCd: 0, learned: false },
  { id: "war_cry", name: "전투 함성", icon: "📢", desc: "공격력 50% 증가 3턴", job: "warrior", level: 12, mpCost: 20, staminaCost: 10, damage: 0, effect: "buff_atk", cooldown: 5, currentCd: 0, learned: false },
  // Mage
  { id: "fireball", name: "파이어볼", icon: "🔥", desc: "불덩이를 던진다", job: "mage", level: 1, mpCost: 12, staminaCost: 5, damage: 25, cooldown: 0, currentCd: 0, learned: false },
  { id: "ice_lance", name: "아이스 랜스", icon: "❄️🔱", desc: "얼음 창으로 공격", job: "mage", level: 3, mpCost: 15, staminaCost: 5, damage: 30, effect: "slow", cooldown: 1, currentCd: 0, learned: false },
  { id: "thunder", name: "썬더", icon: "⚡", desc: "번개를 내리친다", job: "mage", level: 8, mpCost: 25, staminaCost: 8, damage: 50, cooldown: 3, currentCd: 0, learned: false },
  { id: "meteor", name: "메테오", icon: "☄️", desc: "운석을 소환한다!", job: "mage", level: 15, mpCost: 50, staminaCost: 15, damage: 100, cooldown: 6, currentCd: 0, learned: false },
  // Archer
  { id: "double_shot", name: "더블 샷", icon: "🏹🏹", desc: "화살 2발 발사", job: "archer", level: 1, mpCost: 0, staminaCost: 12, damage: 18, cooldown: 0, currentCd: 0, learned: false },
  { id: "poison_arrow", name: "독화살", icon: "🏹☠️", desc: "독 데미지 지속", job: "archer", level: 4, mpCost: 8, staminaCost: 15, damage: 15, effect: "poison", cooldown: 2, currentCd: 0, learned: false },
  { id: "rain_arrows", name: "화살비", icon: "🏹🌧️", desc: "하늘에서 화살 비", job: "archer", level: 10, mpCost: 20, staminaCost: 25, damage: 55, cooldown: 4, currentCd: 0, learned: false },
  // Thief
  { id: "backstab", name: "백스탭", icon: "🗡️💀", desc: "뒤에서 급소 공격", job: "thief", level: 1, mpCost: 0, staminaCost: 15, damage: 22, effect: "crit_boost", cooldown: 0, currentCd: 0, learned: false },
  { id: "steal", name: "훔치기", icon: "🤏", desc: "적의 아이템을 훔친다", job: "thief", level: 3, mpCost: 5, staminaCost: 10, damage: 0, effect: "steal", cooldown: 3, currentCd: 0, learned: false },
  { id: "shadow_strike", name: "그림자 일격", icon: "🌑🗡️", desc: "그림자에서 기습", job: "thief", level: 8, mpCost: 15, staminaCost: 20, damage: 45, effect: "crit_boost", cooldown: 3, currentCd: 0, learned: false },
  // Paladin
  { id: "holy_strike", name: "성스러운 일격", icon: "✨⚔️", desc: "신성한 힘으로 공격", job: "paladin", level: 1, mpCost: 8, staminaCost: 12, damage: 18, cooldown: 0, currentCd: 0, learned: false },
  { id: "heal", name: "힐", icon: "💚", desc: "HP를 회복한다", job: "paladin", level: 2, mpCost: 15, staminaCost: 5, damage: -40, cooldown: 2, currentCd: 0, learned: false },
  { id: "divine_shield", name: "신성 방어막", icon: "🛡️✨", desc: "3턴간 데미지 50% 감소", job: "paladin", level: 6, mpCost: 25, staminaCost: 10, damage: 0, effect: "shield", cooldown: 5, currentCd: 0, learned: false },
  // Berserker
  { id: "fury", name: "광폭화", icon: "😡", desc: "공격력 2배, 방어 0", job: "berserker", level: 1, mpCost: 0, staminaCost: 20, damage: 0, effect: "berserk", cooldown: 4, currentCd: 0, learned: false },
  { id: "cleave", name: "대지 가르기", icon: "🪓💥", desc: "땅을 가르는 일격", job: "berserker", level: 3, mpCost: 5, staminaCost: 25, damage: 35, cooldown: 1, currentCd: 0, learned: false },
  { id: "rampage", name: "난동", icon: "💀🪓", desc: "3연속 무작위 공격", job: "berserker", level: 10, mpCost: 10, staminaCost: 40, damage: 30, effect: "multi_3", cooldown: 4, currentCd: 0, learned: false },
  // All
  { id: "rest_skill", name: "집중", icon: "🧘", desc: "MP, 스태미나 소량 회복", job: "all", level: 1, mpCost: 0, staminaCost: 0, damage: 0, effect: "rest", cooldown: 2, currentCd: 0, learned: false },
];

const ENEMIES_DATA: Record<string, Omit<Enemy, "hp" | "maxHp">> = {
  slime: { id: "slime", name: "슬라임", icon: "🟢", atk: 5, def: 2, spd: 3, xp: 8, gold: 3, drops: [{ id: "slime_gel", chance: 0.5 }], skills: [], isBoss: false },
  goblin: { id: "goblin", name: "고블린", icon: "👺", atk: 10, def: 4, spd: 6, xp: 15, gold: 8, drops: [{ id: "goblin_ear", chance: 0.4 }, { id: "herb", chance: 0.3 }], skills: [], isBoss: false },
  wolf: { id: "wolf", name: "늑대", icon: "🐺", atk: 14, def: 5, spd: 10, xp: 20, gold: 5, drops: [{ id: "wolf_pelt", chance: 0.4 }, { id: "raw_meat", chance: 0.6 }], skills: [], weakness: "fire", isBoss: false },
  skeleton: { id: "skeleton", name: "스켈레톤", icon: "💀", atk: 16, def: 8, spd: 5, xp: 25, gold: 12, drops: [{ id: "bone", chance: 0.5 }, { id: "iron_ore", chance: 0.2 }], skills: [], weakness: "holy", resistance: "poison", isBoss: false },
  orc: { id: "orc", name: "오크", icon: "👹", atk: 22, def: 12, spd: 4, xp: 40, gold: 20, drops: [{ id: "orc_tusk", chance: 0.3 }, { id: "iron_ore", chance: 0.3 }], skills: ["war_cry"], isBoss: false },
  dark_mage: { id: "dark_mage", name: "흑마법사", icon: "🧙‍♂️", atk: 28, def: 6, spd: 7, xp: 50, gold: 30, drops: [{ id: "magic_crystal", chance: 0.4 }, { id: "scroll_fire", chance: 0.15 }], skills: ["fireball"], weakness: "physical", isBoss: false },
  troll: { id: "troll", name: "트롤", icon: "🧌", atk: 30, def: 18, spd: 3, xp: 60, gold: 35, drops: [{ id: "troll_blood", chance: 0.3 }], skills: [], isBoss: false },
  vampire: { id: "vampire", name: "뱀파이어", icon: "🧛", atk: 35, def: 14, spd: 12, xp: 80, gold: 50, drops: [{ id: "vampire_fang", chance: 0.25 }, { id: "blood_ruby", chance: 0.1 }], skills: ["lifesteal"], weakness: "holy", isBoss: false },
  dragon_young: { id: "dragon_young", name: "어린 드래곤", icon: "🐲", atk: 45, def: 25, spd: 8, xp: 120, gold: 80, drops: [{ id: "dragon_scale", chance: 0.2 }, { id: "magic_crystal", chance: 0.4 }], skills: ["fireball"], isBoss: false },
  // Bosses
  goblin_king: { id: "goblin_king", name: "고블린 왕", icon: "👺👑", atk: 25, def: 15, spd: 7, xp: 100, gold: 80, drops: [{ id: "kings_dagger", chance: 0.3 }], skills: ["war_cry"], isBoss: true },
  lich: { id: "lich", name: "리치", icon: "💀🔮", atk: 40, def: 20, spd: 6, xp: 200, gold: 150, drops: [{ id: "lich_staff", chance: 0.2 }, { id: "necro_tome", chance: 0.15 }], skills: ["thunder", "ice_lance"], weakness: "holy", isBoss: true },
  ancient_dragon: { id: "ancient_dragon", name: "고대 드래곤", icon: "🐉", atk: 65, def: 40, spd: 10, xp: 500, gold: 400, drops: [{ id: "dragon_heart", chance: 0.15 }, { id: "legendary_sword", chance: 0.05 }], skills: ["meteor", "fireball"], isBoss: true },
  demon_lord: { id: "demon_lord", name: "마왕", icon: "😈👑", atk: 80, def: 50, spd: 12, xp: 1000, gold: 800, drops: [{ id: "demon_crown", chance: 0.1 }], skills: ["meteor", "thunder", "war_cry"], isBoss: true },
};

const ALL_ITEMS: Record<string, Omit<Item, "qty">> = {
  // Weapons
  wooden_sword: { id: "wooden_sword", name: "나무 검", icon: "🗡️", type: "weapon", rarity: "common", weight: 3, value: 10, atk: 5, desc: "초보자의 검" },
  iron_sword: { id: "iron_sword", name: "철 검", icon: "⚔️", type: "weapon", rarity: "uncommon", weight: 5, value: 80, atk: 15, desc: "단단한 철 검" },
  magic_staff: { id: "magic_staff", name: "마법 지팡이", icon: "🪄", type: "weapon", rarity: "uncommon", weight: 3, value: 100, atk: 8, effect: "mp_regen", desc: "MP 자동 회복" },
  kings_dagger: { id: "kings_dagger", name: "왕의 단검", icon: "🗡️👑", type: "weapon", rarity: "rare", weight: 2, value: 200, atk: 22, effect: "crit+15", desc: "고블린 왕의 단검" },
  lich_staff: { id: "lich_staff", name: "리치의 지팡이", icon: "💀🪄", type: "weapon", rarity: "epic", weight: 4, value: 500, atk: 35, effect: "mp_regen+", desc: "언데드의 힘" },
  legendary_sword: { id: "legendary_sword", name: "전설의 검", icon: "⚔️✨", type: "weapon", rarity: "legendary", weight: 6, value: 2000, atk: 60, effect: "all+10", desc: "전설의 용사의 검" },
  // Armor
  leather_armor: { id: "leather_armor", name: "가죽 갑옷", icon: "🧥", type: "armor", rarity: "common", weight: 5, value: 30, def: 5, desc: "기본 방어구" },
  iron_armor: { id: "iron_armor", name: "철 갑옷", icon: "🛡️", type: "armor", rarity: "uncommon", weight: 12, value: 150, def: 15, desc: "튼튼한 갑옷" },
  // Food
  bread: { id: "bread", name: "빵", icon: "🍞", type: "food", rarity: "common", weight: 0.5, value: 5, healHunger: 20, desc: "기본 식량" },
  raw_meat: { id: "raw_meat", name: "생고기", icon: "🥩", type: "food", rarity: "common", weight: 1, value: 8, healHunger: 10, desc: "익혀 먹어야 한다" },
  cooked_meat: { id: "cooked_meat", name: "구운 고기", icon: "🍖", type: "food", rarity: "common", weight: 1, value: 15, healHunger: 40, healHp: 10, desc: "맛있는 고기" },
  apple: { id: "apple", name: "사과", icon: "🍎", type: "food", rarity: "common", weight: 0.3, value: 3, healHunger: 10, healThirst: 5, desc: "상큼한 사과" },
  // Potions
  hp_potion: { id: "hp_potion", name: "HP 포션", icon: "❤️", type: "potion", rarity: "common", weight: 0.5, value: 20, healHp: 50, desc: "HP 50 회복" },
  mp_potion: { id: "mp_potion", name: "MP 포션", icon: "💙", type: "potion", rarity: "common", weight: 0.5, value: 25, healMp: 40, desc: "MP 40 회복" },
  antidote: { id: "antidote", name: "해독제", icon: "💚", type: "potion", rarity: "uncommon", weight: 0.3, value: 30, effect: "cure_poison", desc: "독 해제" },
  elixir: { id: "elixir", name: "엘릭서", icon: "🌟", type: "potion", rarity: "rare", weight: 0.5, value: 200, healHp: 999, healMp: 999, desc: "전체 회복" },
  water: { id: "water", name: "물", icon: "💧", type: "potion", rarity: "common", weight: 0.5, value: 2, healThirst: 30, desc: "깨끗한 물" },
  // Materials
  herb: { id: "herb", name: "약초", icon: "🌿", type: "material", rarity: "common", weight: 0.1, value: 5, desc: "포션 재료" },
  iron_ore: { id: "iron_ore", name: "철광석", icon: "⚙️", type: "material", rarity: "common", weight: 3, value: 15, desc: "제련 재료" },
  magic_crystal: { id: "magic_crystal", name: "마정석", icon: "💎", type: "material", rarity: "rare", weight: 0.5, value: 80, desc: "마법 결정체" },
  dragon_scale: { id: "dragon_scale", name: "용의 비늘", icon: "🐉", type: "material", rarity: "epic", weight: 2, value: 300, desc: "전설적 소재" },
  slime_gel: { id: "slime_gel", name: "슬라임 젤", icon: "🟢", type: "material", rarity: "common", weight: 0.3, value: 3, desc: "끈적한 젤" },
  goblin_ear: { id: "goblin_ear", name: "고블린 귀", icon: "👂", type: "material", rarity: "common", weight: 0.1, value: 5, desc: "퀘스트 아이템" },
  wolf_pelt: { id: "wolf_pelt", name: "늑대 가죽", icon: "🐺", type: "material", rarity: "common", weight: 2, value: 12, desc: "방어구 재료" },
  bone: { id: "bone", name: "뼈", icon: "🦴", type: "material", rarity: "common", weight: 1, value: 4, desc: "다용도 재료" },
  orc_tusk: { id: "orc_tusk", name: "오크 엄니", icon: "🦷", type: "material", rarity: "uncommon", weight: 0.5, value: 20, desc: "무기 강화 재료" },
  troll_blood: { id: "troll_blood", name: "트롤의 피", icon: "🩸", type: "material", rarity: "rare", weight: 0.5, value: 50, desc: "재생 포션 재료" },
  vampire_fang: { id: "vampire_fang", name: "뱀파이어 송곳니", icon: "🦷", type: "material", rarity: "rare", weight: 0.2, value: 60, desc: "저주 재료" },
  blood_ruby: { id: "blood_ruby", name: "핏빛 루비", icon: "🔴", type: "material", rarity: "epic", weight: 0.3, value: 200, desc: "뱀파이어의 보석" },
  dragon_heart: { id: "dragon_heart", name: "용의 심장", icon: "❤️‍🔥", type: "material", rarity: "legendary", weight: 3, value: 1000, desc: "전설의 소재" },
  demon_crown: { id: "demon_crown", name: "마왕의 왕관", icon: "👑😈", type: "material", rarity: "legendary", weight: 2, value: 5000, desc: "세계를 지배하던 왕관" },
  necro_tome: { id: "necro_tome", name: "강령술 서적", icon: "📕", type: "scroll", rarity: "epic", weight: 1, value: 400, desc: "금지된 지식" },
  scroll_fire: { id: "scroll_fire", name: "화염 주문서", icon: "📜🔥", type: "scroll", rarity: "rare", weight: 0.3, value: 100, desc: "사용 시 화염 마법" },
  // Fish
  fish_common: { id: "fish_common", name: "붕어", icon: "🐟", type: "fish", rarity: "common", weight: 1, value: 8, healHunger: 15, desc: "흔한 물고기" },
  fish_rare: { id: "fish_rare", name: "금붕어", icon: "🐠", type: "fish", rarity: "rare", weight: 0.5, value: 50, healHunger: 20, desc: "귀한 물고기" },
  fish_legendary: { id: "fish_legendary", name: "전설의 물고기", icon: "🐋", type: "fish", rarity: "legendary", weight: 5, value: 500, healHunger: 80, healHp: 50, desc: "전설 속의 물고기" },
};

const DUNGEON_FLOORS: DungeonFloor[] = [
  { floor: 1, name: "입구", enemies: ["slime", "goblin"], loot: ["herb", "bread"], minLevel: 1 },
  { floor: 2, name: "수렵지", enemies: ["goblin", "wolf"], boss: "goblin_king", loot: ["iron_ore", "hp_potion"], minLevel: 3 },
  { floor: 3, name: "해골 무덤", enemies: ["skeleton", "dark_mage"], loot: ["magic_crystal", "mp_potion"], minLevel: 6 },
  { floor: 4, name: "오크 요새", enemies: ["orc", "troll"], loot: ["iron_ore", "antidote"], minLevel: 9 },
  { floor: 5, name: "죽음의 방", enemies: ["skeleton", "dark_mage", "vampire"], boss: "lich", loot: ["blood_ruby", "elixir"], minLevel: 12 },
  { floor: 6, name: "용의 둥지", enemies: ["dragon_young", "troll"], loot: ["dragon_scale", "magic_crystal"], minLevel: 16 },
  { floor: 7, name: "드래곤의 심연", enemies: ["dragon_young", "vampire"], boss: "ancient_dragon", loot: ["dragon_heart", "elixir"], minLevel: 20 },
  { floor: 8, name: "마왕의 성", enemies: ["dark_mage", "vampire", "dragon_young"], boss: "demon_lord", loot: ["demon_crown", "legendary_sword"], minLevel: 25 },
];

const QUESTS: Quest[] = [
  { id: "q1", name: "첫 사냥", icon: "🗡️", desc: "슬라임 3마리를 처치하라", type: "kill", target: "slime", required: 3, progress: 0, rewardGold: 30, rewardXp: 20, completed: false, active: true },
  { id: "q2", name: "약초 수집", icon: "🌿", desc: "약초 5개를 모아라", type: "collect", target: "herb", required: 5, progress: 0, rewardGold: 40, rewardXp: 25, completed: false, active: true },
  { id: "q3", name: "고블린 토벌", icon: "👺", desc: "고블린 5마리를 처치하라", type: "kill", target: "goblin", required: 5, progress: 0, rewardGold: 60, rewardXp: 50, rewardItem: "iron_sword", completed: false, active: false },
  { id: "q4", name: "고블린 왕 처치", icon: "👺👑", desc: "던전 2층의 고블린 왕을 쓰러뜨려라", type: "kill", target: "goblin_king", required: 1, progress: 0, rewardGold: 150, rewardXp: 100, completed: false, active: false },
  { id: "q5", name: "늑대 가죽", icon: "🐺", desc: "늑대 가죽 3개를 모아라", type: "collect", target: "wolf_pelt", required: 3, progress: 0, rewardGold: 80, rewardXp: 60, rewardItem: "leather_armor", completed: false, active: false },
  { id: "q6", name: "리치 퇴치", icon: "💀🔮", desc: "던전 5층의 리치를 처치하라", type: "kill", target: "lich", required: 1, progress: 0, rewardGold: 300, rewardXp: 200, completed: false, active: false },
  { id: "q7", name: "드래곤 슬레이어", icon: "🐉", desc: "고대 드래곤을 처치하라", type: "kill", target: "ancient_dragon", required: 1, progress: 0, rewardGold: 800, rewardXp: 500, completed: false, active: false },
  { id: "q8", name: "마왕 토벌", icon: "😈", desc: "마왕을 쓰러뜨리고 세계를 구하라!", type: "kill", target: "demon_lord", required: 1, progress: 0, rewardGold: 2000, rewardXp: 1000, completed: false, active: false },
];

// ============================================================
// COMPONENT
// ============================================================
export default function RPGLife() {
  const [screen, setScreen] = useState<Screen>("title");
  const [player, setPlayer] = useState<Player | null>(null);
  const [skills, setSkills] = useState<Skill[]>(ALL_SKILLS.map((s) => ({ ...s })));
  const [inventory, setInventory] = useState<Item[]>([]);
  const [quests, setQuests] = useState<Quest[]>(QUESTS.map((q) => ({ ...q })));
  const [equippedWeapon, setEquippedWeapon] = useState<string>("");
  const [equippedArmor, setEquippedArmor] = useState<string>("");
  const [killCount, setKillCount] = useState(0);

  const [time, setTime] = useState<TimeOfDay>("morning");
  const [weather, setWeather] = useState<Weather>("sunny");
  const [season, setSeason] = useState<Season>("spring");
  const [dayCount, setDayCount] = useState(1);

  // Battle state
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isBattleOver, setIsBattleOver] = useState(false);
  const [battleResult, setBattleResult] = useState<"win" | "lose" | "flee" | null>(null);
  const [buffAtk, setBuffAtk] = useState(0);
  const [buffDef, setBuffDef] = useState(0);
  const [berserkMode, setBerserkMode] = useState(false);
  const [enemyPoisoned, setEnemyPoisoned] = useState(0);
  const [enemyStunned, setEnemyStunned] = useState(false);

  // Dungeon
  const [currentFloor, setCurrentFloor] = useState(0);
  const [dungeonEnemies, setDungeonEnemies] = useState(0);

  // Fishing
  const [fishingActive, setFishingActive] = useState(false);
  const [fishBite, setFishBite] = useState(false);
  const [fishTimer, setFishTimer] = useState<NodeJS.Timeout | null>(null);

  // Character creation
  const [nameInput, setNameInput] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobClass | null>(null);

  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [battleLog]);

  // Helpers
  const getWeaponAtk = () => {
    const w = inventory.find((i) => i.id === equippedWeapon);
    return w?.atk ?? 0;
  };
  const getArmorDef = () => {
    const a = inventory.find((i) => i.id === equippedArmor);
    return a?.def ?? 0;
  };
  const addItem = (id: string, qty: number) => {
    setInventory((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) return prev.map((i) => i.id === id ? { ...i, qty: i.qty + qty } : i);
      const t = ALL_ITEMS[id];
      if (!t) return prev;
      return [...prev, { ...t, qty }];
    });
  };
  const removeItem = (id: string, qty: number) => {
    setInventory((prev) => prev.map((i) => i.id === id ? { ...i, qty: Math.max(0, i.qty - qty) } : i).filter((i) => i.qty > 0));
  };
  const getItemCount = (id: string) => inventory.find((i) => i.id === id)?.qty ?? 0;

  const advanceTime = () => {
    const idx = TIME_CYCLE.indexOf(time);
    if (idx >= TIME_CYCLE.length - 1) {
      setTime("dawn");
      setDayCount((d) => d + 1);
      // Season change every 10 days
      if ((dayCount + 1) % 10 === 0) {
        const seasons: Season[] = ["spring", "summer", "autumn", "winter"];
        setSeason(seasons[(seasons.indexOf(season) + 1) % 4]);
      }
      // Weather
      const possibleWeathers = SEASON_INFO[season].weathers;
      setWeather(possibleWeathers[Math.floor(Math.random() * possibleWeathers.length)]);
    } else {
      setTime(TIME_CYCLE[idx + 1]);
    }
    // Stat decay
    if (player) {
      const wInfo = WEATHER_INFO[weather];
      setPlayer((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          hunger: Math.max(0, prev.hunger - 4),
          thirst: Math.max(0, prev.thirst - (weather === "heatwave" ? 10 : 5)),
          stamina: Math.min(prev.maxStamina, prev.stamina + 8),
          hp: prev.hunger <= 0 ? prev.hp - 5 : prev.thirst <= 0 ? prev.hp - 5 : prev.hp,
          temperature: Math.max(35, Math.min(42, 37 + wInfo.tempMod + (prev.hunger < 20 ? -1 : 0))),
          mp: Math.min(prev.maxMp, prev.mp + 5),
        };
      });
    }
  };

  // Create character
  const createCharacter = (name: string, job: JobClass) => {
    const j = JOBS[job];
    const p: Player = {
      name, job, level: 1, xp: 0, xpToNext: 30,
      hp: 80 + j.baseStats.vit * 5, maxHp: 80 + j.baseStats.vit * 5,
      mp: 20 + j.baseStats.int * 4, maxMp: 20 + j.baseStats.int * 4,
      stamina: 80 + j.baseStats.dex * 2, maxStamina: 80 + j.baseStats.dex * 2,
      hunger: 80, thirst: 80, temperature: 37, weight: 0, maxWeight: 30 + j.baseStats.str * 2,
      gold: 50, ...j.baseStats, def: j.baseStats.vit + 2,
      reputation: 0, karma: 0, deaths: 0, daysSurvived: 0,
      critChance: 5 + j.baseStats.luk, dodgeChance: 3 + Math.floor(j.baseStats.dex / 2),
      poisoned: false, bleeding: false, cursed: false, blessed: false,
    };
    setPlayer(p);
    // Starting items
    const startWeapon = job === "mage" ? "magic_staff" : "wooden_sword";
    addItem(startWeapon, 1);
    addItem("leather_armor", 1);
    addItem("bread", 3);
    addItem("water", 3);
    addItem("hp_potion", 2);
    setEquippedWeapon(startWeapon);
    setEquippedArmor("leather_armor");
    // Learn starting skills
    setSkills((prev) => prev.map((s) => (s.job === job || s.job === "all") && s.level <= 1 ? { ...s, learned: true } : s));
    setScreen("world");
  };

  // Level up
  const gainXp = (amount: number) => {
    if (!player) return;
    setPlayer((prev) => {
      if (!prev) return prev;
      let p = { ...prev, xp: prev.xp + amount };
      while (p.xp >= p.xpToNext) {
        p.xp -= p.xpToNext;
        p.level += 1;
        p.xpToNext = Math.floor(p.xpToNext * 1.25);
        p.maxHp += 12 + p.vit;
        p.hp = p.maxHp;
        p.maxMp += 5 + Math.floor(p.int * 0.8);
        p.mp = p.maxMp;
        p.maxStamina += 5;
        p.stamina = p.maxStamina;
        p.str += 1;
        p.dex += 1;
        p.int += 1;
        p.vit += 1;
        p.def += 1;
        p.critChance = Math.min(50, p.critChance + 1);
        // Unlock skills
        setSkills((prev) => prev.map((s) => (s.job === p.job || s.job === "all") && s.level <= p.level && !s.learned ? { ...s, learned: true } : s));
        // Unlock quests
        if (p.level >= 3) setQuests((prev) => prev.map((q) => q.id === "q3" ? { ...q, active: true } : q));
        if (p.level >= 5) setQuests((prev) => prev.map((q) => q.id === "q4" || q.id === "q5" ? { ...q, active: true } : q));
        if (p.level >= 10) setQuests((prev) => prev.map((q) => q.id === "q6" ? { ...q, active: true } : q));
        if (p.level >= 18) setQuests((prev) => prev.map((q) => q.id === "q7" ? { ...q, active: true } : q));
        if (p.level >= 23) setQuests((prev) => prev.map((q) => q.id === "q8" ? { ...q, active: true } : q));
      }
      return p;
    });
  };

  // Start battle
  const startBattle = (enemyId: string, hpMod = 1) => {
    const data = ENEMIES_DATA[enemyId];
    if (!data || !player) return;
    const hp = Math.floor((30 + data.atk * 3 + data.def * 2) * hpMod);
    const e: Enemy = { ...data, hp, maxHp: hp };
    setEnemy(e);
    setBattleLog([`${e.icon} ${e.name} 출현! ${e.isBoss ? "⚠️ 보스!" : ""}`]);
    setIsBattleOver(false);
    setBattleResult(null);
    setBuffAtk(0);
    setBuffDef(0);
    setBerserkMode(false);
    setEnemyPoisoned(0);
    setEnemyStunned(false);
    setSkills((prev) => prev.map((s) => ({ ...s, currentCd: 0 })));
    setScreen("battle");
  };

  // Battle attack
  const doAttack = () => {
    if (isBattleOver || !player || !enemy) return;
    const log: string[] = [];
    let eHp = enemy.hp;
    let newPlayer = { ...player };

    // Player attack
    let dmg = newPlayer.str * 2 + getWeaponAtk() + Math.floor(Math.random() * 5) + buffAtk;
    if (berserkMode) dmg *= 2;
    const isCrit = Math.random() * 100 < newPlayer.critChance;
    if (isCrit) { dmg = Math.floor(dmg * 2.5); log.push("💥 크리티컬!!"); }
    dmg = Math.max(1, dmg - Math.floor(enemy.def * 0.3));
    eHp = Math.max(0, eHp - dmg);
    log.push(`⚔️ ${dmg} 데미지!`);
    newPlayer.stamina = Math.max(0, newPlayer.stamina - 8);

    // Poison tick on enemy
    if (enemyPoisoned > 0) {
      const pDmg = 8;
      eHp = Math.max(0, eHp - pDmg);
      log.push(`☠️ 독 ${pDmg} 데미지!`);
      setEnemyPoisoned((p) => p - 1);
    }

    if (eHp <= 0) {
      finishBattle(true, log, newPlayer, eHp);
      return;
    }

    // Enemy attack (if not stunned)
    if (enemyStunned) {
      log.push(`😵 ${enemy.name}은(는) 기절 상태!`);
      setEnemyStunned(false);
    } else {
      let eDmg = enemy.atk + Math.floor(Math.random() * 8);
      eDmg = Math.max(1, eDmg - Math.floor((newPlayer.def + getArmorDef() + buffDef) * 0.3));
      if (berserkMode) eDmg = Math.floor(eDmg * 1.5); // berserker takes more
      // Dodge
      if (Math.random() * 100 < newPlayer.dodgeChance) {
        log.push(`💨 회피!`);
      } else {
        newPlayer.hp = Math.max(0, newPlayer.hp - eDmg);
        log.push(`${enemy.icon} ${eDmg} 데미지!`);
      }
    }

    setEnemy({ ...enemy, hp: eHp });
    setPlayer(newPlayer);
    setBattleLog((prev) => [...prev, ...log]);
    // Reduce cooldowns
    setSkills((prev) => prev.map((s) => ({ ...s, currentCd: Math.max(0, s.currentCd - 1) })));

    if (newPlayer.hp <= 0) {
      setBattleLog((prev) => [...prev, "💀 쓰러졌다..."]);
      setIsBattleOver(true);
      setBattleResult("lose");
      setPlayer((prev) => prev ? { ...prev, deaths: prev.deaths + 1 } : prev);
    }
  };

  // Use skill in battle
  const useSkillBattle = (skill: Skill) => {
    if (isBattleOver || !player || !enemy) return;
    if (skill.currentCd > 0 || player.mp < skill.mpCost || player.stamina < skill.staminaCost) return;

    const log: string[] = [];
    let eHp = enemy.hp;
    let newPlayer = { ...player, mp: player.mp - skill.mpCost, stamina: player.stamina - skill.staminaCost };

    // Skill effects
    if (skill.damage > 0) {
      let dmg = skill.damage + Math.floor(newPlayer.int * 0.5) + Math.floor(newPlayer.str * 0.3);
      if (berserkMode) dmg = Math.floor(dmg * 1.8);
      if (skill.effect === "crit_boost" && Math.random() < 0.5) { dmg *= 2; log.push("💥 급소 명중!"); }
      if (skill.effect === "multi_3") { dmg *= 3; log.push("🪓🪓🪓 3연속 공격!"); }
      // Weather modifier
      if (weather === "rain" && skill.icon.includes("🔥")) dmg = Math.floor(dmg * 0.7);
      dmg = Math.max(1, dmg - Math.floor(enemy.def * 0.2));
      eHp = Math.max(0, eHp - dmg);
      log.push(`${skill.icon} ${skill.name}! ${dmg} 데미지!`);
    } else if (skill.damage < 0) {
      // Heal
      const heal = Math.abs(skill.damage) + Math.floor(newPlayer.int * 0.5);
      newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + heal);
      log.push(`${skill.icon} HP ${heal} 회복!`);
    }

    // Special effects
    if (skill.effect === "stun") { setEnemyStunned(true); log.push("😵 적 기절!"); }
    if (skill.effect === "poison") { setEnemyPoisoned(3); log.push("☠️ 독 부여!"); }
    if (skill.effect === "buff_atk") { setBuffAtk(Math.floor(newPlayer.str * 0.5)); log.push("📢 공격력 증가!"); }
    if (skill.effect === "shield") { setBuffDef(30); log.push("🛡️✨ 방어막!"); }
    if (skill.effect === "berserk") { setBerserkMode(true); log.push("😡 광폭화! 공격 2배, 방어 0!"); }
    if (skill.effect === "rest") { newPlayer.mp = Math.min(newPlayer.maxMp, newPlayer.mp + 15); newPlayer.stamina = Math.min(newPlayer.maxStamina, newPlayer.stamina + 20); log.push("🧘 집중! MP/스태미나 회복"); }
    if (skill.effect === "steal") {
      if (enemy.drops.length > 0 && Math.random() < 0.5) {
        const drop = enemy.drops[Math.floor(Math.random() * enemy.drops.length)];
        addItem(drop.id, 1);
        log.push(`🤏 ${ALL_ITEMS[drop.id]?.name} 훔치기 성공!`);
      } else { log.push("🤏 훔치기 실패..."); }
    }

    setSkills((prev) => prev.map((s) => s.id === skill.id ? { ...s, currentCd: s.cooldown } : { ...s, currentCd: Math.max(0, s.currentCd - 1) }));

    if (eHp <= 0) { finishBattle(true, log, newPlayer, eHp); return; }

    // Enemy attacks
    if (!enemyStunned) {
      let eDmg = enemy.atk + Math.floor(Math.random() * 8);
      eDmg = Math.max(1, eDmg - Math.floor((newPlayer.def + getArmorDef() + buffDef) * 0.3));
      if (berserkMode) eDmg = Math.floor(eDmg * 1.5);
      if (Math.random() * 100 < newPlayer.dodgeChance) {
        log.push("💨 회피!");
      } else {
        newPlayer.hp = Math.max(0, newPlayer.hp - eDmg);
        log.push(`${enemy.icon} ${eDmg} 데미지!`);
      }
    }

    setEnemy({ ...enemy, hp: eHp });
    setPlayer(newPlayer);
    setBattleLog((prev) => [...prev, ...log]);
    if (newPlayer.hp <= 0) {
      setBattleLog((prev) => [...prev, "💀 쓰러졌다..."]);
      setIsBattleOver(true);
      setBattleResult("lose");
    }
  };

  const finishBattle = (won: boolean, log: string[], newPlayer: Player, eHp: number) => {
    if (!enemy) return;
    if (won) {
      log.push(`🎉 ${enemy.name} 처치! +${enemy.xp}XP +${enemy.gold}G`);
      gainXp(enemy.xp);
      setKillCount((k) => k + 1);
      setPlayer((prev) => prev ? { ...prev, gold: prev.gold + enemy.gold, hp: newPlayer.hp, mp: newPlayer.mp, stamina: newPlayer.stamina } : prev);
      // Drops
      for (const drop of enemy.drops) {
        if (Math.random() < drop.chance) {
          addItem(drop.id, 1);
          log.push(`📦 ${ALL_ITEMS[drop.id]?.name} 획득!`);
        }
      }
      // Quest progress
      setQuests((prev) => prev.map((q) => {
        if (q.completed || !q.active) return q;
        if (q.type === "kill" && q.target === enemy.id) {
          const newProgress = q.progress + 1;
          if (newProgress >= q.required) {
            setPlayer((p) => p ? { ...p, gold: p.gold + q.rewardGold } : p);
            gainXp(q.rewardXp);
            if (q.rewardItem) addItem(q.rewardItem, 1);
            log.push(`🏆 퀘스트 완료: ${q.name}!`);
            return { ...q, progress: newProgress, completed: true };
          }
          return { ...q, progress: newProgress };
        }
        return q;
      }));
    }
    setEnemy(enemy ? { ...enemy, hp: eHp } : null);
    setBattleLog((prev) => [...prev, ...log]);
    setIsBattleOver(true);
    setBattleResult(won ? "win" : "lose");
  };

  const doFlee = () => {
    if (isBattleOver || !player || !enemy) return;
    if (Math.random() < 0.5 + player.dex * 0.02) {
      setBattleLog((prev) => [...prev, "🏃 도망 성공!"]);
      setIsBattleOver(true);
      setBattleResult("flee");
    } else {
      const eDmg = Math.max(1, enemy.atk - Math.floor(player.def * 0.2));
      setPlayer((prev) => prev ? { ...prev, hp: Math.max(0, prev.hp - eDmg) } : prev);
      setBattleLog((prev) => [...prev, `🏃 도망 실패! ${eDmg} 데미지!`]);
    }
  };

  // Use item
  const useItem = (item: Item) => {
    if (!player) return;
    setPlayer((prev) => {
      if (!prev) return prev;
      const p = { ...prev };
      if (item.healHp) p.hp = Math.min(p.maxHp, p.hp + item.healHp);
      if (item.healMp) p.mp = Math.min(p.maxMp, p.mp + item.healMp);
      if (item.healHunger) p.hunger = Math.min(100, p.hunger + item.healHunger);
      if (item.healThirst) p.thirst = Math.min(100, p.thirst + item.healThirst);
      if (item.effect === "cure_poison") p.poisoned = false;
      return p;
    });
    removeItem(item.id, 1);
  };

  // Dungeon
  const enterDungeon = (floor: number) => {
    if (!player) return;
    const f = DUNGEON_FLOORS[floor];
    if (!f || player.level < f.minLevel) return;
    setCurrentFloor(floor);
    setDungeonEnemies(0);
    advanceTime();

    // Start with first enemy
    const enemyId = f.enemies[Math.floor(Math.random() * f.enemies.length)];
    startBattle(enemyId, 1 + floor * 0.15);
  };

  const continueDungeon = () => {
    const f = DUNGEON_FLOORS[currentFloor];
    if (!f) return;
    const newCount = dungeonEnemies + 1;
    setDungeonEnemies(newCount);

    if (newCount >= 2 && f.boss) {
      startBattle(f.boss, 1 + currentFloor * 0.2);
    } else if (newCount >= 3) {
      // Floor clear - give loot
      const loot = f.loot[Math.floor(Math.random() * f.loot.length)];
      addItem(loot, 1);
      setScreen("world");
    } else {
      const enemyId = f.enemies[Math.floor(Math.random() * f.enemies.length)];
      startBattle(enemyId, 1 + currentFloor * 0.15);
    }
  };

  // Fishing
  const startFishing = () => {
    if (!player || player.stamina < 10) return;
    setPlayer((prev) => prev ? { ...prev, stamina: prev.stamina - 10 } : prev);
    setFishingActive(true);
    setFishBite(false);
    const delay = 2000 + Math.random() * 4000;
    const timer = setTimeout(() => {
      setFishBite(true);
      setTimeout(() => { setFishBite(false); setFishingActive(false); }, 2000);
    }, delay);
    setFishTimer(timer);
    setScreen("fish");
  };

  const catchFish = () => {
    if (!fishBite) return;
    setFishingActive(false);
    setFishBite(false);
    if (fishTimer) clearTimeout(fishTimer);

    const r = Math.random();
    const fishId = r < 0.6 ? "fish_common" : r < 0.9 ? "fish_rare" : "fish_legendary";
    addItem(fishId, 1);
    advanceTime();
    setScreen("world");
  };

  // Shop (in town)
  const shopItems = [
    { id: "bread", cost: 8 }, { id: "water", cost: 5 }, { id: "hp_potion", cost: 30 },
    { id: "mp_potion", cost: 35 }, { id: "antidote", cost: 40 }, { id: "iron_sword", cost: 120 },
    { id: "iron_armor", cost: 200 },
  ];

  if (!player && screen !== "title" && screen !== "create") setScreen("title");

  // ============================================================
  // RENDER
  // ============================================================

  if (screen === "title") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 text-white flex flex-col items-center justify-center px-4">
        <Link href="/" className="absolute top-4 left-4 text-sm text-gray-400 hover:text-white">← 홈으로</Link>
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚔️🐉</div>
          <h1 className="text-3xl font-black mb-1">초현실 RPG</h1>
          <p className="text-sm text-gray-400 mb-6">체온, 허기, 갈증, 무게, 날씨, 계절, 시간...<br />모든 것이 생존에 영향을 미친다.</p>
          <div className="space-y-1 text-left bg-white/5 rounded-xl p-3 border border-white/10 mb-6 text-xs text-gray-400">
            <p>🌡️ 체온 관리 - 날씨와 계절에 따라 변화</p>
            <p>🍖 허기/갈증 - 0이면 체력 감소</p>
            <p>⚖️ 무게 제한 - 짐이 무거우면 속도 저하</p>
            <p>🌙 밤에는 몬스터가 강해진다</p>
            <p>🌧️ 비 오면 불 마법 약화</p>
            <p>☠️ 독, 출혈, 저주 상태이상</p>
            <p>🎣 낚시로 식량 확보</p>
            <p>🏰 8층 던전 - 마왕을 쓰러뜨려라</p>
          </div>
          <button onClick={() => setScreen("create")} className="w-full rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 py-4 text-lg font-black hover:brightness-110 border border-indigo-400/30">
            모험을 시작하다
          </button>
        </div>
      </div>
    );
  }

  if (screen === "create") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <h2 className="text-xl font-black mb-4 text-center">캐릭터 생성</h2>
          <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="이름을 입력하세요" maxLength={10}
            className="w-full rounded-lg bg-white/10 px-4 py-3 text-center font-bold border border-white/20 outline-none focus:border-indigo-400 mb-4" />
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(Object.entries(JOBS) as [JobClass, typeof JOBS[JobClass]][]).map(([id, j]) => (
              <button key={id} onClick={() => setSelectedJob(id)}
                className={`rounded-xl p-3 text-center border transition-all ${selectedJob === id ? "bg-indigo-900/50 border-indigo-400" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                <div className="text-2xl mb-1">{j.icon}</div>
                <div className="font-bold text-sm">{j.name}</div>
                <div className="text-[10px] text-gray-400">{j.desc}</div>
                <div className="text-[10px] text-gray-500 mt-1">STR:{j.baseStats.str} DEX:{j.baseStats.dex} INT:{j.baseStats.int} VIT:{j.baseStats.vit} LUK:{j.baseStats.luk}</div>
              </button>
            ))}
          </div>
          <button onClick={() => nameInput.trim() && selectedJob && createCharacter(nameInput.trim(), selectedJob)}
            disabled={!nameInput.trim() || !selectedJob}
            className="w-full rounded-xl bg-indigo-700 py-3 font-black hover:bg-indigo-600 disabled:opacity-40">
            모험 시작
          </button>
        </div>
      </div>
    );
  }

  if (screen === "world" && player) {
    const timeInfo = TIME_INFO[time];
    const weatherInfo = WEATHER_INFO[weather];
    const seasonInfo = SEASON_INFO[season];
    return (
      <div className={`min-h-screen bg-gradient-to-b ${time === "night" || time === "midnight" ? "from-gray-950 via-blue-950/20 to-gray-950" : "from-gray-900 via-stone-900 to-gray-950"} text-white`}>
        <div className="mx-auto max-w-lg px-4 py-3">
          {/* Top bar */}
          <div className="mb-2 flex items-center justify-between text-[10px] text-gray-400">
            <Link href="/" className="hover:text-white">← 홈</Link>
            <div className="flex gap-1.5">
              <span>{seasonInfo.icon}{seasonInfo.name}</span>
              <span>{timeInfo.icon}{timeInfo.name}</span>
              <span>{weatherInfo.icon}{weatherInfo.name}</span>
              <span>📅{dayCount}일</span>
            </div>
          </div>

          {/* Player card */}
          <div className="mb-2 rounded-xl bg-black/40 p-2.5 border border-white/10">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-2xl">{JOBS[player.job].icon}</span>
              <div className="flex-1">
                <div className="text-sm font-black">{player.name} <span className="font-normal text-gray-400 text-xs">Lv.{player.level} {JOBS[player.job].name}</span></div>
                <div className="text-[10px] text-gray-500">🪙{player.gold} | 💀{player.deaths}회 사망 | 처치: {killCount}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {[
                { l: "HP", v: player.hp, m: player.maxHp, c: "bg-red-500", i: "❤️" },
                { l: "MP", v: player.mp, m: player.maxMp, c: "bg-blue-500", i: "💙" },
                { l: "STA", v: player.stamina, m: player.maxStamina, c: "bg-yellow-500", i: "⚡" },
                { l: "XP", v: player.xp, m: player.xpToNext, c: "bg-purple-500", i: "✨" },
                { l: "허기", v: player.hunger, m: 100, c: "bg-orange-500", i: "🍖" },
                { l: "갈증", v: player.thirst, m: 100, c: "bg-cyan-500", i: "💧" },
              ].map((s) => (
                <div key={s.l} className="flex items-center gap-1 text-[10px]">
                  <span className="w-3">{s.i}</span>
                  <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div className={`h-full ${s.c} rounded-full`} style={{ width: `${(s.v / s.m) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right text-gray-500">{s.v}/{s.m}</span>
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-2 text-[10px] text-gray-500">
              <span>🌡️{player.temperature.toFixed(1)}°C</span>
              <span>STR:{player.str}</span><span>DEX:{player.dex}</span><span>INT:{player.int}</span>
              {player.poisoned && <span className="text-green-400">☠️독</span>}
              {player.bleeding && <span className="text-red-400">🩸출혈</span>}
            </div>
          </div>

          {/* Warnings */}
          {player.hunger <= 15 && <div className="mb-1 text-[10px] text-orange-400 bg-orange-900/20 rounded px-2 py-0.5">⚠️ 배고프다...</div>}
          {player.thirst <= 15 && <div className="mb-1 text-[10px] text-cyan-400 bg-cyan-900/20 rounded px-2 py-0.5">⚠️ 목마르다...</div>}
          {player.temperature < 35.5 && <div className="mb-1 text-[10px] text-blue-400 bg-blue-900/20 rounded px-2 py-0.5">🥶 저체온!</div>}
          {player.temperature > 39 && <div className="mb-1 text-[10px] text-red-400 bg-red-900/20 rounded px-2 py-0.5">🥵 고열!</div>}

          {/* Main actions */}
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <button onClick={() => setScreen("dungeon")} className="rounded-lg bg-red-900/40 p-2 text-center hover:bg-red-900/60 border border-red-500/20 active:scale-95">
              <div className="text-xl">🏰</div><div className="text-[10px] font-bold">던전</div>
            </button>
            <button onClick={() => setScreen("town")} className="rounded-lg bg-amber-900/40 p-2 text-center hover:bg-amber-900/60 border border-amber-500/20 active:scale-95">
              <div className="text-xl">🏘️</div><div className="text-[10px] font-bold">마을</div>
            </button>
            <button onClick={startFishing} className="rounded-lg bg-cyan-900/40 p-2 text-center hover:bg-cyan-900/60 border border-cyan-500/20 active:scale-95">
              <div className="text-xl">🎣</div><div className="text-[10px] font-bold">낚시</div>
            </button>
            <button onClick={() => setScreen("inventory")} className="rounded-lg bg-stone-800/60 p-2 text-center hover:bg-stone-800/80 border border-white/10 active:scale-95">
              <div className="text-xl">🎒</div><div className="text-[10px] font-bold">인벤토리</div>
            </button>
            <button onClick={() => setScreen("skills")} className="rounded-lg bg-purple-900/40 p-2 text-center hover:bg-purple-900/60 border border-purple-500/20 active:scale-95">
              <div className="text-xl">📜</div><div className="text-[10px] font-bold">스킬</div>
            </button>
            <button onClick={() => setScreen("quests")} className="rounded-lg bg-green-900/40 p-2 text-center hover:bg-green-900/60 border border-green-500/20 active:scale-95">
              <div className="text-xl">📋</div><div className="text-[10px] font-bold">퀘스트</div>
            </button>
          </div>

          <button onClick={() => { advanceTime(); setPlayer((p) => p ? { ...p, hp: Math.min(p.maxHp, p.hp + 20), stamina: p.maxStamina, mp: Math.min(p.maxMp, p.mp + 15) } : p); }}
            className="w-full rounded-lg bg-blue-900/20 py-1.5 text-xs text-blue-300 hover:bg-blue-900/40 border border-blue-500/20">
            😴 휴식 (시간 경과)
          </button>
        </div>
      </div>
    );
  }

  if (screen === "dungeon" && player) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-stone-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("world")} className="text-sm text-gray-400 hover:text-white">← 뒤로</button>
            <span className="text-xs text-gray-400">Lv.{player.level}</span>
          </div>
          <h2 className="text-xl font-black mb-3 text-center">🏰 던전</h2>
          <div className="space-y-2">
            {DUNGEON_FLOORS.map((f, i) => {
              const locked = player.level < f.minLevel;
              return (
                <button key={i} onClick={() => !locked && enterDungeon(i)} disabled={locked}
                  className={`w-full rounded-xl p-3 text-left border transition-all ${locked ? "bg-gray-800/30 border-gray-700 opacity-40" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{locked ? "🔒" : f.boss ? "💀" : "⚔️"}</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{f.floor}F - {f.name}</div>
                      <div className="text-[10px] text-gray-400">
                        몬스터: {f.enemies.map((e) => ENEMIES_DATA[e]?.icon).join("")}
                        {f.boss && ` | 보스: ${ENEMIES_DATA[f.boss]?.icon}${ENEMIES_DATA[f.boss]?.name}`}
                      </div>
                      {locked && <div className="text-[10px] text-red-400">Lv.{f.minLevel} 필요</div>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "town" && player) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950/30 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("world")} className="text-sm text-gray-400 hover:text-white">← 뒤로</button>
            <span className="text-yellow-400 text-sm font-bold">🪙 {player.gold}</span>
          </div>
          <h2 className="text-xl font-black mb-3 text-center">🏘️ 마을 상점</h2>
          <div className="space-y-1.5">
            {shopItems.map((si) => {
              const item = ALL_ITEMS[si.id];
              if (!item) return null;
              return (
                <button key={si.id} onClick={() => { if (player.gold >= si.cost) { setPlayer((p) => p ? { ...p, gold: p.gold - si.cost } : p); addItem(si.id, 1); } }}
                  disabled={player.gold < si.cost}
                  className="w-full rounded-lg bg-white/5 p-2.5 text-left hover:bg-white/10 border border-white/10 disabled:opacity-30">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="text-xs font-bold">{item.name} <span className={RARITY_COLORS[item.rarity]}>({RARITY_LABEL[item.rarity]})</span></div>
                      <div className="text-[10px] text-gray-400">{item.desc}</div>
                    </div>
                    <span className="text-yellow-400 text-xs">🪙{si.cost}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {/* Sell */}
          <div className="mt-4 text-xs text-gray-400 text-center">아이템 판매는 인벤토리에서</div>
        </div>
      </div>
    );
  }

  if (screen === "inventory" && player) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-stone-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("world")} className="text-sm text-gray-400 hover:text-white">← 뒤로</button>
            <span className="text-xs text-gray-400">🪙{player.gold}</span>
          </div>
          <h2 className="text-lg font-black mb-3 text-center">🎒 인벤토리</h2>
          <div className="space-y-1">
            {inventory.filter((i) => i.qty > 0).map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-lg bg-white/5 p-2 border border-white/10">
                <span className="text-lg">{item.icon}</span>
                <div className="flex-1">
                  <div className="text-xs font-bold">{item.name} {item.qty > 1 && `x${item.qty}`} <span className={RARITY_COLORS[item.rarity]}>({RARITY_LABEL[item.rarity]})</span></div>
                  <div className="text-[10px] text-gray-400">{item.desc} {item.atk ? `⚔️+${item.atk}` : ""} {item.def ? `🛡️+${item.def}` : ""}</div>
                </div>
                <div className="flex gap-1">
                  {(item.type === "food" || item.type === "potion" || item.type === "fish") && (
                    <button onClick={() => useItem(item)} className="text-[10px] bg-green-800/50 px-2 py-1 rounded hover:bg-green-800/80">사용</button>
                  )}
                  {item.type === "weapon" && (
                    <button onClick={() => setEquippedWeapon(item.id)} className={`text-[10px] px-2 py-1 rounded ${equippedWeapon === item.id ? "bg-red-700" : "bg-gray-700 hover:bg-gray-600"}`}>
                      {equippedWeapon === item.id ? "장착중" : "장착"}
                    </button>
                  )}
                  {item.type === "armor" && (
                    <button onClick={() => setEquippedArmor(item.id)} className={`text-[10px] px-2 py-1 rounded ${equippedArmor === item.id ? "bg-blue-700" : "bg-gray-700 hover:bg-gray-600"}`}>
                      {equippedArmor === item.id ? "장착중" : "장착"}
                    </button>
                  )}
                  <button onClick={() => { removeItem(item.id, 1); setPlayer((p) => p ? { ...p, gold: p.gold + Math.floor(item.value * 0.4) } : p); }}
                    className="text-[10px] bg-yellow-800/50 px-2 py-1 rounded hover:bg-yellow-800/80">판매</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "skills" && player) {
    const learned = skills.filter((s) => s.learned);
    const locked = skills.filter((s) => !s.learned && (s.job === player.job || s.job === "all"));
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950/30 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4"><button onClick={() => setScreen("world")} className="text-sm text-gray-400 hover:text-white">← 뒤로</button></div>
          <h2 className="text-lg font-black mb-3 text-center">📜 스킬</h2>
          <div className="text-xs text-gray-400 mb-2">습득한 스킬</div>
          {learned.map((s) => (
            <div key={s.id} className="rounded-lg bg-white/5 p-2 border border-white/10 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">{s.icon}</span>
                <div className="flex-1">
                  <div className="text-xs font-bold">{s.name}</div>
                  <div className="text-[10px] text-gray-400">{s.desc} | 💙{s.mpCost} ⚡{s.staminaCost} {s.damage > 0 ? `⚔️${s.damage}` : s.damage < 0 ? `💚${Math.abs(s.damage)}` : ""}</div>
                </div>
              </div>
            </div>
          ))}
          {locked.length > 0 && (
            <>
              <div className="text-xs text-gray-500 mt-3 mb-2">미습득 (레벨 도달 시 자동 습득)</div>
              {locked.map((s) => (
                <div key={s.id} className="rounded-lg bg-gray-800/30 p-2 border border-gray-700 mb-1 opacity-50">
                  <div className="text-xs">🔒 {s.name} (Lv.{s.level})</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  if (screen === "quests") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-950/30 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4"><button onClick={() => setScreen("world")} className="text-sm text-gray-400 hover:text-white">← 뒤로</button></div>
          <h2 className="text-lg font-black mb-3 text-center">📋 퀘스트</h2>
          {quests.filter((q) => q.active).map((q) => (
            <div key={q.id} className={`rounded-lg p-2.5 border mb-1.5 ${q.completed ? "bg-green-900/20 border-green-500/20" : "bg-white/5 border-white/10"}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{q.completed ? "✅" : q.icon}</span>
                <div className="flex-1">
                  <div className="text-xs font-bold">{q.name}</div>
                  <div className="text-[10px] text-gray-400">{q.desc}</div>
                  {!q.completed && <div className="text-[10px] text-cyan-400">진행: {q.progress}/{q.required}</div>}
                  <div className="text-[10px] text-yellow-400">보상: {q.rewardGold}G +{q.rewardXp}XP {q.rewardItem ? `+ ${ALL_ITEMS[q.rewardItem]?.name}` : ""}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (screen === "battle" && player && enemy) {
    const learnedSkills = skills.filter((s) => s.learned);
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950/30 via-gray-950 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-3">
          {/* Enemy */}
          <div className="mb-2 rounded-xl bg-black/50 p-2.5 border border-red-900/30">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{enemy.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-bold">{enemy.name} {enemy.isBoss && <span className="text-[10px] bg-red-600 px-1 py-0.5 rounded">BOSS</span>}</div>
                <div className="h-2.5 bg-black/50 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
                </div>
                <div className="text-[10px] text-gray-500">{enemy.hp}/{enemy.maxHp}</div>
              </div>
            </div>
            {enemyPoisoned > 0 && <div className="text-[10px] text-green-400">☠️ 독 ({enemyPoisoned}턴)</div>}
            {enemyStunned && <div className="text-[10px] text-yellow-400">😵 기절</div>}
          </div>

          {/* Player quick stats */}
          <div className="mb-2 flex gap-2 text-[10px]">
            <span>❤️{player.hp}/{player.maxHp}</span>
            <span>💙{player.mp}/{player.maxMp}</span>
            <span>⚡{player.stamina}</span>
            {berserkMode && <span className="text-red-400">😡광폭</span>}
            {buffAtk > 0 && <span className="text-orange-400">⚔️+{buffAtk}</span>}
            {buffDef > 0 && <span className="text-blue-400">🛡️+{buffDef}</span>}
          </div>

          {/* Log */}
          <div ref={logRef} className="mb-2 h-24 overflow-y-auto rounded-lg bg-black/60 p-1.5 text-[11px] border border-red-900/20 space-y-0.5">
            {battleLog.map((l, i) => <div key={i} className="text-gray-300">{l}</div>)}
          </div>

          {isBattleOver ? (
            <div className="text-center space-y-2">
              {battleResult === "win" && <div className="text-lg font-black text-yellow-400">🏆 승리!</div>}
              {battleResult === "lose" && <div className="text-lg font-black text-red-400">💀 패배...</div>}
              {battleResult === "flee" && <div className="text-lg font-black text-gray-400">🏃 도주</div>}
              <button onClick={() => { if (battleResult === "win" && DUNGEON_FLOORS[currentFloor]) { continueDungeon(); } else { setScreen("world"); } }}
                className="w-full rounded-xl bg-gray-700 py-2.5 text-sm font-bold">
                {battleResult === "win" && DUNGEON_FLOORS[currentFloor] ? "➡️ 다음으로" : "돌아가기"}
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                <button onClick={doAttack} className="rounded-lg bg-red-800/50 py-2 text-center hover:bg-red-800/70 border border-red-500/20 text-xs font-bold">⚔️ 공격</button>
                <button onClick={doFlee} className="rounded-lg bg-yellow-800/50 py-2 text-center hover:bg-yellow-800/70 border border-yellow-500/20 text-xs font-bold">🏃 도망</button>
                <button onClick={() => {
                  const usable = inventory.find((i) => (i.type === "potion" || i.type === "food") && i.qty > 0);
                  if (usable) useItem(usable);
                }} className="rounded-lg bg-green-800/50 py-2 text-center hover:bg-green-800/70 border border-green-500/20 text-xs font-bold">🧪 아이템</button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {learnedSkills.slice(0, 6).map((s) => {
                  const canUse = s.currentCd <= 0 && player.mp >= s.mpCost && player.stamina >= s.staminaCost;
                  return (
                    <button key={s.id} onClick={() => canUse && useSkillBattle(s)} disabled={!canUse}
                      className="rounded-lg bg-purple-900/40 p-1.5 text-center hover:bg-purple-900/60 border border-purple-500/20 disabled:opacity-30 text-[10px]">
                      <div className="text-sm">{s.icon}</div>
                      <div className="font-bold truncate">{s.name}</div>
                      {s.currentCd > 0 ? <div className="text-yellow-400">⏳{s.currentCd}</div> : <div className="text-gray-400">💙{s.mpCost}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === "fish") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-950 via-gray-900 to-gray-950 text-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎣</div>
          {fishingActive ? (
            fishBite ? (
              <>
                <div className="text-xl font-black text-yellow-400 animate-pulse mb-4">🐟 입질이다!! 지금 잡아!!</div>
                <button onClick={catchFish} className="w-full rounded-xl bg-yellow-600 py-4 text-lg font-black hover:bg-yellow-500 animate-bounce">
                  🎣 잡기!!
                </button>
              </>
            ) : (
              <div className="text-gray-400">기다리는 중... 🌊</div>
            )
          ) : (
            <div className="space-y-3">
              <button onClick={startFishing} className="w-full rounded-xl bg-cyan-700 py-3 font-bold hover:bg-cyan-600">🎣 다시 낚시</button>
              <button onClick={() => setScreen("world")} className="w-full rounded-xl bg-gray-700 py-3 font-bold hover:bg-gray-600">← 돌아가기</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
