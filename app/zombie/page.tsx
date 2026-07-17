"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ============================================================
// TYPES
// ============================================================
type Screen = "title" | "hub" | "scavenge" | "craft" | "battle" | "result" | "map" | "survivors" | "base";
type TimeOfDay = "dawn" | "day" | "dusk" | "night";
type Weather = "clear" | "rain" | "fog" | "storm";

interface PlayerStats {
  hp: number;
  maxHp: number;
  hunger: number; // 0~100, 0 = starving
  thirst: number; // 0~100
  stamina: number;
  maxStamina: number;
  infection: number; // 0~100, 100 = dead
  morale: number; // 0~100
}

interface Item {
  id: string;
  name: string;
  icon: string;
  type: "weapon" | "food" | "water" | "medicine" | "material" | "ammo" | "tool";
  damage?: number;
  durability?: number;
  maxDurability?: number;
  healHp?: number;
  healHunger?: number;
  healThirst?: number;
  healInfection?: number;
  ammoType?: string;
  quantity: number;
  desc: string;
}

interface Zombie {
  id: string;
  name: string;
  icon: string;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  infectionChance: number;
  xp: number;
  desc: string;
}

interface Location {
  id: string;
  name: string;
  icon: string;
  danger: number; // 1~5
  lootTable: string[];
  zombieTypes: string[];
  desc: string;
  explored: boolean;
}

interface Survivor {
  id: string;
  name: string;
  icon: string;
  skill: string;
  skillDesc: string;
  morale: number;
  hp: number;
}

interface CraftRecipe {
  id: string;
  name: string;
  icon: string;
  materials: { id: string; qty: number }[];
  result: string;
  resultQty: number;
  desc: string;
}

// ============================================================
// DATA
// ============================================================
const ZOMBIES: Record<string, Omit<Zombie, "hp" | "maxHp">> = {
  walker: { id: "walker", name: "워커", icon: "🧟", attack: 8, speed: 3, infectionChance: 0.1, xp: 10, desc: "느리지만 무리 지어 다닌다" },
  runner: { id: "runner", name: "러너", icon: "🧟‍♂️", attack: 12, speed: 8, infectionChance: 0.15, xp: 20, desc: "빠르게 달려온다!" },
  bloater: { id: "bloater", name: "블로터", icon: "🧟‍♀️", attack: 18, speed: 2, infectionChance: 0.25, xp: 30, desc: "부풀어오른 좀비. 폭발 주의" },
  crawler: { id: "crawler", name: "크롤러", icon: "🦎", attack: 6, speed: 5, infectionChance: 0.2, xp: 12, desc: "바닥을 기어다닌다" },
  screamer: { id: "screamer", name: "스크리머", icon: "😱", attack: 5, speed: 4, infectionChance: 0.05, xp: 25, desc: "비명으로 다른 좀비를 부른다" },
  tank: { id: "tank", name: "탱크", icon: "💀", attack: 25, speed: 2, infectionChance: 0.3, xp: 50, desc: "거대하고 강력한 변이체" },
  horde: { id: "horde", name: "좀비 무리", icon: "🧟🧟🧟", attack: 30, speed: 4, infectionChance: 0.35, xp: 60, desc: "수십 마리의 좀비 무리!" },
};

const LOCATIONS: Location[] = [
  { id: "house", name: "주택가", icon: "🏠", danger: 1, lootTable: ["canned_food", "water_bottle", "bandage", "knife", "cloth", "nails"], zombieTypes: ["walker", "crawler"], desc: "버려진 집들. 기본 물자를 찾을 수 있다", explored: false },
  { id: "store", name: "편의점", icon: "🏪", danger: 2, lootTable: ["canned_food", "water_bottle", "energy_bar", "soda", "bandage", "lighter"], zombieTypes: ["walker", "runner"], desc: "음식과 물이 남아있을 수 있다", explored: false },
  { id: "hospital", name: "병원", icon: "🏥", danger: 3, lootTable: ["medkit", "antibiotics", "bandage", "painkillers", "surgical_kit"], zombieTypes: ["walker", "bloater", "runner"], desc: "의약품이 있지만 좀비도 많다", explored: false },
  { id: "police", name: "경찰서", icon: "🚔", danger: 3, lootTable: ["pistol", "pistol_ammo", "shotgun_ammo", "kevlar", "radio"], zombieTypes: ["walker", "runner", "bloater"], desc: "무기와 탄약을 찾을 수 있다", explored: false },
  { id: "school", name: "학교", icon: "🏫", danger: 2, lootTable: ["water_bottle", "cloth", "rope", "backpack", "book"], zombieTypes: ["walker", "screamer"], desc: "교실에 물자가 흩어져 있다", explored: false },
  { id: "warehouse", name: "창고", icon: "🏭", danger: 3, lootTable: ["nails", "wood", "metal", "rope", "gasoline", "toolbox"], zombieTypes: ["walker", "bloater", "crawler"], desc: "건축 자재가 많다", explored: false },
  { id: "gas_station", name: "주유소", icon: "⛽", danger: 2, lootTable: ["gasoline", "lighter", "energy_bar", "water_bottle", "wrench"], zombieTypes: ["walker", "runner"], desc: "연료와 간식이 있다", explored: false },
  { id: "military", name: "군부대", icon: "🏛️", danger: 5, lootTable: ["rifle", "rifle_ammo", "shotgun", "medkit", "mre", "kevlar", "grenade"], zombieTypes: ["runner", "bloater", "tank", "horde"], desc: "최고급 물자! 하지만 극도로 위험", explored: false },
  { id: "farm", name: "농장", icon: "🌾", danger: 1, lootTable: ["raw_meat", "water_bottle", "axe", "rope", "cloth"], zombieTypes: ["walker", "crawler"], desc: "음식을 구할 수 있다", explored: false },
  { id: "mall", name: "쇼핑몰", icon: "🏬", danger: 4, lootTable: ["canned_food", "water_bottle", "backpack", "knife", "bat", "medkit", "cloth"], zombieTypes: ["walker", "runner", "screamer", "bloater"], desc: "물자가 많지만 좀비도 많다", explored: false },
];

const ALL_ITEMS: Record<string, Omit<Item, "quantity">> = {
  // Weapons
  knife: { id: "knife", name: "칼", icon: "🔪", type: "weapon", damage: 12, durability: 30, maxDurability: 30, desc: "기본 근접 무기" },
  bat: { id: "bat", name: "야구 방망이", icon: "🏏", type: "weapon", damage: 15, durability: 40, maxDurability: 40, desc: "튼튼한 근접 무기" },
  axe: { id: "axe", name: "도끼", icon: "🪓", type: "weapon", damage: 20, durability: 35, maxDurability: 35, desc: "강력한 근접 무기" },
  pistol: { id: "pistol", name: "권총", icon: "🔫", type: "weapon", damage: 25, durability: 50, maxDurability: 50, ammoType: "pistol_ammo", desc: "기본 총기" },
  shotgun: { id: "shotgun", name: "샷건", icon: "🔫", type: "weapon", damage: 40, durability: 40, maxDurability: 40, ammoType: "shotgun_ammo", desc: "근거리 강력" },
  rifle: { id: "rifle", name: "소총", icon: "🔫", type: "weapon", damage: 35, durability: 60, maxDurability: 60, ammoType: "rifle_ammo", desc: "원거리 정확" },
  molotov: { id: "molotov", name: "화염병", icon: "🍾🔥", type: "weapon", damage: 50, durability: 1, maxDurability: 1, desc: "범위 공격" },
  grenade: { id: "grenade", name: "수류탄", icon: "💣", type: "weapon", damage: 70, durability: 1, maxDurability: 1, desc: "강력한 폭발" },
  // Ammo
  pistol_ammo: { id: "pistol_ammo", name: "권총 탄약", icon: "🔹", type: "ammo", desc: "권총용 탄약" },
  shotgun_ammo: { id: "shotgun_ammo", name: "샷건 탄약", icon: "🔸", type: "ammo", desc: "샷건용 탄약" },
  rifle_ammo: { id: "rifle_ammo", name: "소총 탄약", icon: "🔻", type: "ammo", desc: "소총용 탄약" },
  // Food
  canned_food: { id: "canned_food", name: "통조림", icon: "🥫", type: "food", healHunger: 30, desc: "오래 보관 가능" },
  raw_meat: { id: "raw_meat", name: "생고기", icon: "🥩", type: "food", healHunger: 15, desc: "익혀 먹으면 더 좋다" },
  energy_bar: { id: "energy_bar", name: "에너지바", icon: "🍫", type: "food", healHunger: 15, desc: "간편한 간식" },
  mre: { id: "mre", name: "전투식량", icon: "📦", type: "food", healHunger: 50, desc: "군용 전투식량" },
  cooked_meat: { id: "cooked_meat", name: "구운 고기", icon: "🍖", type: "food", healHunger: 40, desc: "잘 익은 고기" },
  // Water
  water_bottle: { id: "water_bottle", name: "생수", icon: "💧", type: "water", healThirst: 30, desc: "깨끗한 물" },
  soda: { id: "soda", name: "탄산음료", icon: "🥤", type: "water", healThirst: 20, desc: "당분도 보충" },
  purified_water: { id: "purified_water", name: "정수된 물", icon: "💧✨", type: "water", healThirst: 50, desc: "안전한 물" },
  // Medicine
  bandage: { id: "bandage", name: "붕대", icon: "🩹", type: "medicine", healHp: 15, desc: "기본 치료" },
  medkit: { id: "medkit", name: "응급키트", icon: "🧰", type: "medicine", healHp: 40, desc: "전문 치료" },
  painkillers: { id: "painkillers", name: "진통제", icon: "💊", type: "medicine", healHp: 20, desc: "통증 완화" },
  antibiotics: { id: "antibiotics", name: "항생제", icon: "💉", type: "medicine", healInfection: 30, desc: "감염 치료" },
  surgical_kit: { id: "surgical_kit", name: "수술 키트", icon: "🏥", type: "medicine", healHp: 60, healInfection: 20, desc: "전문 치료 도구" },
  // Materials
  wood: { id: "wood", name: "나무", icon: "🪵", type: "material", desc: "건축 재료" },
  metal: { id: "metal", name: "고철", icon: "⚙️", type: "material", desc: "금속 재료" },
  nails: { id: "nails", name: "못", icon: "📌", type: "material", desc: "건축/제작용" },
  cloth: { id: "cloth", name: "천 조각", icon: "🧵", type: "material", desc: "다용도 재료" },
  rope: { id: "rope", name: "밧줄", icon: "🪢", type: "material", desc: "묶는 용도" },
  gasoline: { id: "gasoline", name: "휘발유", icon: "⛽", type: "material", desc: "연료/화염병 재료" },
  lighter: { id: "lighter", name: "라이터", icon: "🔥", type: "tool", desc: "불을 붙인다" },
  // Tools
  toolbox: { id: "toolbox", name: "공구함", icon: "🧰", type: "tool", desc: "수리/제작 효율 증가" },
  wrench: { id: "wrench", name: "렌치", icon: "🔧", type: "tool", desc: "수리 도구" },
  backpack: { id: "backpack", name: "배낭", icon: "🎒", type: "tool", desc: "인벤토리 확장" },
  radio: { id: "radio", name: "무전기", icon: "📻", type: "tool", desc: "생존자 신호 수신" },
  kevlar: { id: "kevlar", name: "방탄조끼", icon: "🦺", type: "tool", desc: "방어력 증가" },
  book: { id: "book", name: "서적", icon: "📚", type: "tool", desc: "사기 회복" },
};

const CRAFT_RECIPES: CraftRecipe[] = [
  { id: "c_molotov", name: "화염병", icon: "🍾🔥", materials: [{ id: "cloth", qty: 1 }, { id: "gasoline", qty: 1 }, { id: "lighter", qty: 1 }], result: "molotov", resultQty: 1, desc: "범위 공격 무기" },
  { id: "c_bandage", name: "붕대", icon: "🩹", materials: [{ id: "cloth", qty: 2 }], result: "bandage", resultQty: 1, desc: "기본 치료" },
  { id: "c_cooked", name: "구운 고기", icon: "🍖", materials: [{ id: "raw_meat", qty: 1 }, { id: "lighter", qty: 1 }], result: "cooked_meat", resultQty: 1, desc: "허기 크게 회복" },
  { id: "c_purified", name: "정수된 물", icon: "💧✨", materials: [{ id: "water_bottle", qty: 2 }, { id: "lighter", qty: 1 }], result: "purified_water", resultQty: 1, desc: "안전한 물" },
  { id: "c_spikedbat", name: "못 박힌 방망이", icon: "🏏📌", materials: [{ id: "bat", qty: 1 }, { id: "nails", qty: 2 }], result: "axe", resultQty: 1, desc: "강화된 근접 무기" },
  { id: "c_barricade", name: "바리케이드 수리", icon: "🪵🔨", materials: [{ id: "wood", qty: 3 }, { id: "nails", qty: 2 }], result: "canned_food", resultQty: 2, desc: "기지 방어력 강화 (식량 보상)" },
];

const TIME_INFO: Record<TimeOfDay, { name: string; icon: string; dangerMod: number }> = {
  dawn: { name: "새벽", icon: "🌅", dangerMod: 0.8 },
  day: { name: "낮", icon: "☀️", dangerMod: 0.6 },
  dusk: { name: "황혼", icon: "🌇", dangerMod: 1.0 },
  night: { name: "밤", icon: "🌙", dangerMod: 1.5 },
};

const WEATHER_INFO: Record<Weather, { name: string; icon: string; effect: string }> = {
  clear: { name: "맑음", icon: "☀️", effect: "" },
  rain: { name: "비", icon: "🌧️", effect: "시야 감소" },
  fog: { name: "안개", icon: "🌫️", effect: "좀비 발견 어려움" },
  storm: { name: "폭풍", icon: "⛈️", effect: "체력 소모 증가" },
};

// ============================================================
// COMPONENT
// ============================================================
export default function ZombieGame() {
  const [screen, setScreen] = useState<Screen>("title");
  const [day, setDay] = useState(1);
  const [time, setTime] = useState<TimeOfDay>("day");
  const [weather, setWeather] = useState<Weather>("clear");
  const [stats, setStats] = useState<PlayerStats>({ hp: 100, maxHp: 100, hunger: 80, thirst: 80, stamina: 100, maxStamina: 100, infection: 0, morale: 70 });
  const [inventory, setInventory] = useState<Item[]>([
    { ...ALL_ITEMS.knife, quantity: 1 },
    { ...ALL_ITEMS.canned_food, quantity: 2 },
    { ...ALL_ITEMS.water_bottle, quantity: 2 },
    { ...ALL_ITEMS.bandage, quantity: 2 },
  ]);
  const [locations, setLocations] = useState<Location[]>(LOCATIONS.map((l) => ({ ...l })));
  const [survivors, setSurvivors] = useState<Survivor[]>([]);
  const [killCount, setKillCount] = useState(0);
  const [equippedWeapon, setEquippedWeapon] = useState<string>("knife");

  // Battle
  const [currentZombie, setCurrentZombie] = useState<Zombie | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isBattleOver, setIsBattleOver] = useState(false);
  const [battleResult, setBattleResult] = useState<"win" | "lose" | "flee" | null>(null);
  const [scavengeLocation, setScavengeLocation] = useState<Location | null>(null);

  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [battleLog]);

  const getWeapon = () => inventory.find((i) => i.id === equippedWeapon);
  const hasItem = (id: string) => inventory.some((i) => i.id === id && i.quantity > 0);
  const getItemCount = (id: string) => inventory.find((i) => i.id === id)?.quantity ?? 0;

  const addItem = (id: string, qty: number) => {
    setInventory((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) return prev.map((i) => i.id === id ? { ...i, quantity: i.quantity + qty } : i);
      const template = ALL_ITEMS[id];
      if (!template) return prev;
      return [...prev, { ...template, quantity: qty }];
    });
  };

  const removeItem = (id: string, qty: number) => {
    setInventory((prev) => prev.map((i) => i.id === id ? { ...i, quantity: Math.max(0, i.quantity - qty) } : i).filter((i) => i.quantity > 0));
  };

  const useItem = (item: Item) => {
    setStats((prev) => {
      const s = { ...prev };
      if (item.healHp) s.hp = Math.min(s.maxHp, s.hp + item.healHp);
      if (item.healHunger) s.hunger = Math.min(100, s.hunger + item.healHunger);
      if (item.healThirst) s.thirst = Math.min(100, s.thirst + item.healThirst);
      if (item.healInfection) s.infection = Math.max(0, s.infection - item.healInfection);
      return s;
    });
    removeItem(item.id, 1);
  };

  const advanceTime = () => {
    const order: TimeOfDay[] = ["dawn", "day", "dusk", "night"];
    const idx = order.indexOf(time);
    if (idx === 3) {
      setDay((d) => d + 1);
      setTime("dawn");
      setWeather(["clear", "clear", "rain", "fog", "storm"][Math.floor(Math.random() * 5)] as Weather);
    } else {
      setTime(order[idx + 1]);
    }
    // Decay
    setStats((prev) => ({
      ...prev,
      hunger: Math.max(0, prev.hunger - 8),
      thirst: Math.max(0, prev.thirst - 10),
      stamina: Math.min(prev.maxStamina, prev.stamina + 20),
      hp: prev.hunger <= 0 ? prev.hp - 10 : prev.thirst <= 0 ? prev.hp - 8 : prev.hp,
      infection: prev.infection > 0 ? Math.min(100, prev.infection + 2) : 0,
    }));
  };

  // Scavenge
  const startScavenge = (loc: Location) => {
    advanceTime();
    setScavengeLocation(loc);
    setStats((prev) => ({ ...prev, stamina: Math.max(0, prev.stamina - 20) }));

    // Random encounter
    const dangerMod = TIME_INFO[time].dangerMod;
    const encounterChance = loc.danger * 0.2 * dangerMod * 0.25;
    if (Math.random() < encounterChance) {
      // Zombie encounter
      const zombieId = loc.zombieTypes[Math.floor(Math.random() * loc.zombieTypes.length)];
      const z = ZOMBIES[zombieId];
      const zombie: Zombie = { ...z, hp: 30 + loc.danger * 15, maxHp: 30 + loc.danger * 15 };
      setCurrentZombie(zombie);
      setBattleLog([`💀 ${loc.name}에서 ${zombie.name} ${zombie.icon} 출현!`]);
      setIsBattleOver(false);
      setBattleResult(null);
      setScreen("battle");
    } else {
      // Loot
      const lootCount = 1 + Math.floor(Math.random() * 3);
      const looted: string[] = [];
      for (let i = 0; i < lootCount; i++) {
        const itemId = loc.lootTable[Math.floor(Math.random() * loc.lootTable.length)];
        addItem(itemId, 1);
        looted.push(ALL_ITEMS[itemId]?.name ?? itemId);
      }
      setLocations((prev) => prev.map((l) => l.id === loc.id ? { ...l, explored: true } : l));
      setBattleLog([`🔍 ${loc.name} 탐색 성공!`, `📦 획득: ${looted.join(", ")}`]);
      setIsBattleOver(true);
      setBattleResult("win");
      setScreen("result");
    }
  };

  // Battle
  const doBattleAttack = () => {
    if (isBattleOver || !currentZombie) return;
    const weapon = getWeapon();
    const log: string[] = [];
    let zHp = currentZombie.hp;
    let newStats = { ...stats };

    // Check ammo for guns
    if (weapon?.ammoType) {
      if (getItemCount(weapon.ammoType) <= 0) {
        log.push(`⚠️ 탄약이 없다! 주먹으로 공격...`);
        const dmg = Math.max(1, 5 - Math.floor(currentZombie.speed * 0.2));
        zHp -= dmg;
        log.push(`👊 ${dmg} 데미지!`);
      } else {
        removeItem(weapon.ammoType, 1);
        const dmg = weapon.damage! + Math.floor(Math.random() * 5);
        zHp -= dmg;
        log.push(`${weapon.icon} ${weapon.name}으로 공격! ${dmg} 데미지!`);
      }
    } else if (weapon) {
      const dmg = weapon.damage! + Math.floor(Math.random() * 5);
      zHp -= dmg;
      log.push(`${weapon.icon} ${weapon.name}으로 공격! ${dmg} 데미지!`);
      // Durability
      if (weapon.durability && weapon.durability > 0) {
        setInventory((prev) => prev.map((i) => i.id === weapon.id ? { ...i, durability: (i.durability ?? 1) - 1 } : i));
        if ((weapon.durability ?? 1) <= 1) {
          log.push(`💔 ${weapon.name}이(가) 부서졌다!`);
          removeItem(weapon.id, 1);
          setEquippedWeapon("knife");
        }
      }
    } else {
      const dmg = 5;
      zHp -= dmg;
      log.push(`👊 주먹 공격! ${dmg} 데미지!`);
    }

    if (zHp <= 0) {
      log.push(`🎉 ${currentZombie.name}을(를) 처치!`);
      setKillCount((k) => k + 1);
      // Loot from location
      if (scavengeLocation) {
        const loot = scavengeLocation.lootTable[Math.floor(Math.random() * scavengeLocation.lootTable.length)];
        addItem(loot, 1);
        log.push(`📦 획득: ${ALL_ITEMS[loot]?.name}`);
      }
      setCurrentZombie({ ...currentZombie, hp: 0 });
      setBattleLog((prev) => [...prev, ...log]);
      setIsBattleOver(true);
      setBattleResult("win");
      setStats(newStats);
      return;
    }

    // Zombie attacks back
    let zDmg = currentZombie.attack + Math.floor(Math.random() * 5);
    if (hasItem("kevlar")) zDmg = Math.floor(zDmg * 0.6);
    newStats.hp = Math.max(0, newStats.hp - zDmg);
    newStats.stamina = Math.max(0, newStats.stamina - 5);
    log.push(`${currentZombie.icon} ${currentZombie.name}의 공격! ${zDmg} 데미지!`);

    // Infection check
    if (Math.random() < currentZombie.infectionChance) {
      const infAmount = 5 + Math.floor(Math.random() * 10);
      newStats.infection = Math.min(100, newStats.infection + infAmount);
      log.push(`☠️ 감염됐다! 감염도 +${infAmount}!`);
    }

    setCurrentZombie({ ...currentZombie, hp: zHp });
    setStats(newStats);
    setBattleLog((prev) => [...prev, ...log]);

    if (newStats.hp <= 0 || newStats.infection >= 100) {
      setBattleLog((prev) => [...prev, newStats.infection >= 100 ? "☠️ 감염이 퍼져 좀비가 되었다..." : "💀 사망했다..."]);
      setIsBattleOver(true);
      setBattleResult("lose");
    }
  };

  const doFlee = () => {
    if (isBattleOver || !currentZombie) return;
    const fleeChance = stats.stamina > 30 ? 0.7 : 0.4;
    if (Math.random() < fleeChance) {
      setBattleLog((prev) => [...prev, "🏃 도망 성공!"]);
      setStats((prev) => ({ ...prev, stamina: Math.max(0, prev.stamina - 25) }));
      setIsBattleOver(true);
      setBattleResult("flee");
    } else {
      const zDmg = currentZombie.attack;
      setStats((prev) => ({ ...prev, hp: Math.max(0, prev.hp - zDmg), stamina: Math.max(0, prev.stamina - 15) }));
      setBattleLog((prev) => [...prev, `🏃 도망 실패! ${currentZombie!.icon} ${zDmg} 데미지!`]);
      if (stats.hp - zDmg <= 0) {
        setIsBattleOver(true);
        setBattleResult("lose");
      }
    }
  };

  const canCraft = (recipe: CraftRecipe) => recipe.materials.every((m) => getItemCount(m.id) >= m.qty);

  const doCraft = (recipe: CraftRecipe) => {
    if (!canCraft(recipe)) return;
    for (const m of recipe.materials) removeItem(m.id, m.qty);
    addItem(recipe.result, recipe.resultQty);
  };

  const isDead = stats.hp <= 0 || stats.infection >= 100;

  // ============================================================
  // SCREENS
  // ============================================================

  if (screen === "title") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-red-950/30 to-gray-950 text-white flex flex-col items-center justify-center px-4">
        <Link href="/" className="absolute top-4 left-4 text-sm text-gray-400 hover:text-white">← 홈으로</Link>
        <div className="text-center max-w-md">
          <div className="text-7xl mb-4">🧟</div>
          <h1 className="text-4xl font-black mb-1 text-red-500">좀비 서바이벌</h1>
          <p className="text-gray-400 mb-8">살아남아라. 그것이 전부다.</p>
          <div className="space-y-1.5 text-left bg-white/5 rounded-xl p-4 border border-red-900/30 mb-6 text-sm text-gray-400">
            <p>🔍 버려진 장소를 탐색해 물자를 모아라</p>
            <p>🍖 배고픔과 갈증을 관리하라</p>
            <p>☠️ 감염을 조심하라 - 100%가 되면 끝이다</p>
            <p>🔪 좀비와 싸우거나 도망쳐라</p>
            <p>🌙 밤에는 더 위험하다</p>
          </div>
          <button onClick={() => setScreen("hub")} className="w-full rounded-xl bg-gradient-to-r from-red-800 to-red-900 py-4 text-xl font-black hover:brightness-110 transition-all border border-red-500/30">
            생존 시작
          </button>
        </div>
      </div>
    );
  }

  if (screen === "hub") {
    const timeInfo = TIME_INFO[time];
    const weatherInfo = WEATHER_INFO[weather];
    const weapon = getWeapon();
    return (
      <div className={`min-h-screen bg-gradient-to-b ${time === "night" ? "from-gray-950 via-blue-950/30 to-gray-950" : time === "dusk" ? "from-orange-950/30 via-gray-900 to-gray-950" : "from-gray-900 via-gray-800 to-gray-950"} text-white`}>
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="mb-3 flex items-center justify-between text-xs text-gray-400">
            <Link href="/" className="hover:text-white">← 홈</Link>
            <div className="flex gap-2">
              <span>{timeInfo.icon} {timeInfo.name}</span>
              <span>{weatherInfo.icon} {weatherInfo.name}</span>
              <span>📅 {day}일차</span>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-3 rounded-xl bg-black/40 p-3 border border-red-900/30">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {[
                { label: "체력", value: stats.hp, max: stats.maxHp, color: "bg-red-500", icon: "❤️" },
                { label: "스태미나", value: stats.stamina, max: stats.maxStamina, color: "bg-yellow-500", icon: "⚡" },
                { label: "허기", value: stats.hunger, max: 100, color: "bg-orange-500", icon: "🍖" },
                { label: "갈증", value: stats.thirst, max: 100, color: "bg-blue-500", icon: "💧" },
                { label: "감염", value: stats.infection, max: 100, color: "bg-green-500", icon: "☠️" },
                { label: "사기", value: stats.morale, max: 100, color: "bg-purple-500", icon: "😊" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 text-xs">
                  <span className="w-4">{s.icon}</span>
                  <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full`} style={{ width: `${(s.value / s.max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-gray-500">{s.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-3 text-xs text-gray-500">
              <span>🔪 {weapon?.name ?? "없음"}</span>
              <span>💀 처치: {killCount}</span>
            </div>
          </div>

          {isDead && (
            <div className="mb-3 rounded-xl bg-red-900/30 p-4 text-center border border-red-500/30">
              <div className="text-3xl mb-2">💀</div>
              <div className="font-black text-red-400">{stats.infection >= 100 ? "좀비가 되었다..." : "사망했다..."}</div>
              <div className="text-sm text-gray-400">{day}일간 생존 | {killCount}마리 처치</div>
              <button onClick={() => window.location.reload()} className="mt-3 rounded-lg bg-red-800 px-6 py-2 text-sm font-bold">🔄 다시 시작</button>
            </div>
          )}

          {!isDead && (
            <>
              {/* Warning */}
              {stats.hunger <= 15 && <div className="mb-2 rounded-lg bg-orange-900/30 px-3 py-1.5 text-xs text-orange-300 border border-orange-500/20">⚠️ 배가 고프다... 음식이 필요하다</div>}
              {stats.thirst <= 15 && <div className="mb-2 rounded-lg bg-blue-900/30 px-3 py-1.5 text-xs text-blue-300 border border-blue-500/20">⚠️ 목이 마르다... 물이 필요하다</div>}
              {stats.infection > 30 && <div className="mb-2 rounded-lg bg-green-900/30 px-3 py-1.5 text-xs text-green-300 border border-green-500/20">☠️ 감염이 퍼지고 있다! 항생제가 필요하다</div>}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button onClick={() => setScreen("map")} className="rounded-xl bg-gradient-to-br from-stone-800 to-gray-900 p-3 text-center hover:brightness-110 border border-white/10">
                  <div className="text-2xl mb-1">🗺️</div><div className="text-xs font-bold">탐색하기</div>
                </button>
                <button onClick={() => setScreen("craft")} className="rounded-xl bg-gradient-to-br from-amber-900 to-stone-900 p-3 text-center hover:brightness-110 border border-white/10">
                  <div className="text-2xl mb-1">🔨</div><div className="text-xs font-bold">제작</div>
                </button>
              </div>

              {/* Inventory */}
              <div className="rounded-xl bg-black/30 p-3 border border-white/10">
                <div className="text-xs font-bold text-gray-400 mb-2">🎒 인벤토리</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {inventory.filter((i) => i.quantity > 0).map((item) => (
                    <button key={item.id}
                      onClick={() => {
                        if (item.type === "food" || item.type === "water" || item.type === "medicine") useItem(item);
                        else if (item.type === "weapon") setEquippedWeapon(item.id);
                      }}
                      className={`rounded-lg p-1.5 text-center border transition-all ${
                        equippedWeapon === item.id ? "bg-red-900/40 border-red-500/30" : "bg-white/5 border-white/10 hover:bg-white/10"
                      } active:scale-95`}>
                      <div className="text-lg">{item.icon}</div>
                      <div className="text-[9px] truncate">{item.name}</div>
                      {item.quantity > 1 && <div className="text-[9px] text-gray-400">x{item.quantity}</div>}
                      {item.durability !== undefined && <div className="text-[9px] text-yellow-600">{item.durability}/{item.maxDurability}</div>}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => { advanceTime(); setStats((prev) => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + 15), stamina: prev.maxStamina })); }}
                className="w-full mt-3 rounded-lg bg-blue-900/20 py-2 text-xs text-blue-300 hover:bg-blue-900/40 border border-blue-500/20">
                😴 휴식 (시간 경과, HP/스태미나 회복)
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (screen === "map") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-stone-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("hub")} className="text-sm text-gray-400 hover:text-white">← 뒤로</button>
            <span className="text-xs text-gray-400">{TIME_INFO[time].icon} {TIME_INFO[time].name} | {WEATHER_INFO[weather].icon}</span>
          </div>
          <h2 className="text-xl font-black mb-3 text-center">🗺️ 탐색 장소</h2>
          {time === "night" && <div className="mb-3 rounded-lg bg-red-900/20 px-3 py-1.5 text-xs text-red-300 text-center border border-red-500/20">⚠️ 밤에는 좀비가 더 활발하다!</div>}
          <div className="space-y-2">
            {locations.map((loc) => (
              <button key={loc.id} onClick={() => startScavenge(loc)}
                className={`w-full rounded-xl p-3 text-left transition-all border hover:brightness-110 ${loc.explored ? "bg-white/5 border-green-500/20" : "bg-white/5 border-white/10"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{loc.icon}</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{loc.name} {loc.explored && <span className="text-[10px] text-green-400">탐색됨</span>}</div>
                    <div className="text-xs text-gray-400">{loc.desc}</div>
                    <div className="flex gap-1 mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`text-xs ${i < loc.danger ? "text-red-400" : "text-gray-700"}`}>💀</span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "craft") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("hub")} className="text-sm text-gray-400 hover:text-white">← 뒤로</button>
            <span className="text-sm text-gray-400">🔨 제작</span>
          </div>
          <h2 className="text-xl font-black mb-3 text-center">🔨 아이템 제작</h2>
          <div className="space-y-2">
            {CRAFT_RECIPES.map((r) => {
              const can = canCraft(r);
              return (
                <button key={r.id} onClick={() => can && doCraft(r)} disabled={!can}
                  className="w-full rounded-xl bg-white/5 p-3 text-left transition-all border border-white/10 hover:bg-white/10 disabled:opacity-30">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{r.icon}</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{r.name}</div>
                      <div className="text-xs text-gray-400">{r.desc}</div>
                      <div className="flex gap-1 mt-1 text-xs">
                        {r.materials.map((m) => (
                          <span key={m.id} className={getItemCount(m.id) >= m.qty ? "text-green-400" : "text-red-400"}>
                            {ALL_ITEMS[m.id]?.icon} {getItemCount(m.id)}/{m.qty}
                          </span>
                        ))}
                      </div>
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

  if (screen === "battle" && currentZombie) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950 via-gray-950 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-4">
          {/* Zombie */}
          <div className="mb-3 rounded-xl bg-black/50 p-3 border border-red-900/30">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{currentZombie.icon}</span>
              <div className="flex-1">
                <div className="font-bold">{currentZombie.name}</div>
                <div className="text-xs text-gray-400">{currentZombie.desc}</div>
                <div className="h-3 bg-black/50 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${(currentZombie.hp / currentZombie.maxHp) * 100}%` }} />
                </div>
                <div className="text-xs text-gray-500">{currentZombie.hp}/{currentZombie.maxHp}</div>
              </div>
            </div>
          </div>

          {/* Player */}
          <div className="mb-3 rounded-xl bg-black/30 p-3 border border-white/10">
            <div className="flex gap-3 text-xs">
              <span>❤️ {stats.hp}/{stats.maxHp}</span>
              <span>⚡ {stats.stamina}</span>
              <span>☠️ 감염: {stats.infection}%</span>
              <span>🔪 {getWeapon()?.name ?? "주먹"}</span>
            </div>
          </div>

          {/* Log */}
          <div ref={logRef} className="mb-3 h-32 overflow-y-auto rounded-lg bg-black/60 p-2 text-xs border border-red-900/20 space-y-0.5">
            {battleLog.map((l, i) => <div key={i} className="text-gray-300">{l}</div>)}
          </div>

          {isBattleOver ? (
            <div className="text-center space-y-3">
              {battleResult === "win" && <div className="text-xl font-black text-green-400">좀비를 처치했다!</div>}
              {battleResult === "lose" && <div className="text-xl font-black text-red-400">사망...</div>}
              {battleResult === "flee" && <div className="text-xl font-black text-yellow-400">도망쳤다!</div>}
              <button onClick={() => setScreen("hub")} className="w-full rounded-xl bg-gray-700 py-3 font-bold">돌아가기</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={doBattleAttack} className="rounded-xl bg-red-800/60 py-3 font-bold hover:bg-red-700/60 border border-red-500/20">
                🔪 공격
              </button>
              <button onClick={doFlee} className="rounded-xl bg-yellow-800/60 py-3 font-bold hover:bg-yellow-700/60 border border-yellow-500/20">
                🏃 도망
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === "result") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-3">📦</div>
          <div className="rounded-xl bg-white/5 p-4 border border-white/10 mb-4">
            {battleLog.map((l, i) => <div key={i} className="text-sm text-gray-300 mb-1">{l}</div>)}
          </div>
          <button onClick={() => setScreen("hub")} className="w-full rounded-xl bg-gray-700 py-3 font-bold hover:bg-gray-600">🏠 돌아가기</button>
        </div>
      </div>
    );
  }

  return null;
}
