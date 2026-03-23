"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

// --- Types ---
interface HeroType {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  atkSpeed: number; // ms between attacks
  range: number;
  bulletEmoji: string;
  desc: string;
}

interface EnemyType {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  speed: number;
  reward: number;
  size: number;
}

interface BossType extends EnemyType {
  isBoss: true;
  skills: string[];
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  atk: number;
  emoji: string;
  piercing: boolean;
  hitEnemies: Set<number>;
}

interface EnemyBullet {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  emoji: string;
}

interface Enemy {
  uid: number;
  typeId: string;
  emoji: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  speed: number;
  reward: number;
  size: number;
  isBoss: boolean;
  lastShot: number;
}

interface Skill {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  apply: (state: SkillState) => SkillState;
}

interface SkillState {
  atkMul: number;
  spdMul: number;
  rangeMul: number;
  bulletCount: number;
  piercing: boolean;
  hpRegen: number;
  luck: number;
}

// --- Data ---
const HEROES: HeroType[] = [
  { id: "soldier", name: "병사", emoji: "🔫", hp: 50000, atk: 10, atkSpeed: 500, range: 200, bulletEmoji: "•", desc: "기본 병사" },
  { id: "archer", name: "궁수", emoji: "🏹", hp: 50000, atk: 15, atkSpeed: 700, range: 300, bulletEmoji: "→", desc: "원거리 궁수" },
  { id: "mage", name: "마법사", emoji: "🧙", hp: 50000, atk: 25, atkSpeed: 1000, range: 250, bulletEmoji: "✦", desc: "강력한 마법 공격" },
  { id: "ninja", name: "닌자", emoji: "🥷", hp: 50000, atk: 12, atkSpeed: 300, range: 180, bulletEmoji: "✧", desc: "초고속 공격" },
];

const ENEMY_TYPES: EnemyType[] = [
  { id: "slime", name: "슬라임", emoji: "🟢", hp: 50, atk: 5, speed: 1.0, reward: 5, size: 16 },
  { id: "bat", name: "박쥐", emoji: "🦇", hp: 50, atk: 8, speed: 2.0, reward: 8, size: 14 },
  { id: "skeleton", name: "해골", emoji: "💀", hp: 50, atk: 10, speed: 0.8, reward: 10, size: 18 },
  { id: "goblin", name: "고블린", emoji: "👺", hp: 50, atk: 15, speed: 1.2, reward: 12, size: 18 },
  { id: "orc", name: "오크", emoji: "👹", hp: 50, atk: 20, speed: 0.6, reward: 20, size: 22 },
  { id: "ghost", name: "유령", emoji: "👻", hp: 50, atk: 12, speed: 1.5, reward: 15, size: 16 },
  { id: "demon", name: "악마", emoji: "😈", hp: 50, atk: 25, speed: 0.7, reward: 30, size: 22 },
  { id: "dragon", name: "드래곤", emoji: "🐉", hp: 50, atk: 35, speed: 0.5, reward: 50, size: 26 },
];

const BOSS_TYPES: (EnemyType & { isBoss: true; skills: string[] })[] = [
  { id: "boss_golem", name: "골렘왕", emoji: "🗿", hp: 500, atk: 30, speed: 0.3, reward: 200, size: 36, isBoss: true, skills: ["slam"] },
  { id: "boss_lich", name: "리치", emoji: "☠️", hp: 400, atk: 40, speed: 0.4, reward: 250, size: 32, isBoss: true, skills: ["summon"] },
  { id: "boss_dragon", name: "용왕", emoji: "🐲", hp: 800, atk: 50, speed: 0.3, reward: 400, size: 40, isBoss: true, skills: ["breath"] },
  { id: "boss_demon_king", name: "마왕", emoji: "👿", hp: 1200, atk: 70, speed: 0.25, reward: 600, size: 44, isBoss: true, skills: ["dark"] },
];

const SKILLS: Skill[] = [
  { id: "atk_up", name: "공격력 UP", emoji: "⚔️", desc: "공격력 20% 증가", rarity: "common", apply: (s) => ({ ...s, atkMul: s.atkMul * 1.2 }) },
  { id: "spd_up", name: "공속 UP", emoji: "⚡", desc: "공격 속도 20% 증가", rarity: "common", apply: (s) => ({ ...s, spdMul: s.spdMul * 1.2 }) },
  { id: "range_up", name: "사거리 UP", emoji: "🎯", desc: "사거리 25% 증가", rarity: "common", apply: (s) => ({ ...s, rangeMul: s.rangeMul * 1.25 }) },
  { id: "hp_regen", name: "체력 재생", emoji: "💚", desc: "초당 HP 2 회복", rarity: "common", apply: (s) => ({ ...s, hpRegen: s.hpRegen + 2 }) },
  { id: "multi_shot", name: "멀티샷", emoji: "🔱", desc: "탄환 +1", rarity: "rare", apply: (s) => ({ ...s, bulletCount: s.bulletCount + 1 }) },
  { id: "atk_big", name: "공격력 대폭 UP", emoji: "🗡️", desc: "공격력 50% 증가", rarity: "rare", apply: (s) => ({ ...s, atkMul: s.atkMul * 1.5 }) },
  { id: "spd_big", name: "공속 대폭 UP", emoji: "💨", desc: "공격 속도 50% 증가", rarity: "rare", apply: (s) => ({ ...s, spdMul: s.spdMul * 1.5 }) },
  { id: "luck_up", name: "행운 UP", emoji: "🍀", desc: "보상 50% 증가", rarity: "rare", apply: (s) => ({ ...s, luck: s.luck + 0.5 }) },
  { id: "piercing", name: "관통탄", emoji: "💎", desc: "탄환이 적을 관통", rarity: "epic", apply: (s) => ({ ...s, piercing: true }) },
  { id: "triple_shot", name: "트리플샷", emoji: "🌟", desc: "탄환 +2", rarity: "epic", apply: (s) => ({ ...s, bulletCount: s.bulletCount + 2 }) },
  { id: "atk_mega", name: "공격력 초월", emoji: "🔥", desc: "공격력 100% 증가", rarity: "legendary", apply: (s) => ({ ...s, atkMul: s.atkMul * 2.0 }) },
  { id: "god_speed", name: "신속", emoji: "⭐", desc: "공격 속도 100% 증가", rarity: "legendary", apply: (s) => ({ ...s, spdMul: s.spdMul * 2.0 }) },
];

// --- Gacha Weapons ---
type WeaponRarity = "common" | "rare" | "epic" | "legendary";

interface GachaWeapon {
  id: string;
  name: string;
  emoji: string;
  rarity: WeaponRarity;
  atkBonus: number;
  spdBonus: number;
  rangeBonus: number;
  hpBonus: number;
  special: string;
  desc: string;
}

interface GachaCompanion {
  id: string;
  name: string;
  emoji: string;
  rarity: WeaponRarity;
  atk: number;
  atkSpeed: number;
  range: number;
  bulletEmoji: string;
  desc: string;
}

const GACHA_WEAPONS: GachaWeapon[] = [
  { id: "w_sword", name: "강철 검", emoji: "🗡️", rarity: "common", atkBonus: 3, spdBonus: 0, rangeBonus: 0, hpBonus: 0, special: "", desc: "기본적인 강철 검" },
  { id: "w_shield", name: "나무 방패", emoji: "🛡️", rarity: "common", atkBonus: 0, spdBonus: 0, rangeBonus: 0, hpBonus: 20, special: "", desc: "체력을 올려주는 방패" },
  { id: "w_dagger", name: "단검", emoji: "🔪", rarity: "common", atkBonus: 2, spdBonus: 0.1, rangeBonus: 0, hpBonus: 0, special: "", desc: "빠른 단검" },
  { id: "w_bow", name: "장궁", emoji: "🏹", rarity: "common", atkBonus: 1, spdBonus: 0, rangeBonus: 30, hpBonus: 0, special: "", desc: "사거리가 긴 활" },
  { id: "w_axe", name: "전투 도끼", emoji: "🪓", rarity: "rare", atkBonus: 8, spdBonus: 0, rangeBonus: 0, hpBonus: 10, special: "", desc: "강력한 전투 도끼" },
  { id: "w_staff", name: "마법 지팡이", emoji: "🪄", rarity: "rare", atkBonus: 5, spdBonus: 0.15, rangeBonus: 20, hpBonus: 0, special: "", desc: "마력이 깃든 지팡이" },
  { id: "w_crossbow", name: "석궁", emoji: "⚙️", rarity: "rare", atkBonus: 6, spdBonus: 0.1, rangeBonus: 40, hpBonus: 0, special: "", desc: "정밀한 석궁" },
  { id: "w_hammer", name: "전쟁 망치", emoji: "🔨", rarity: "rare", atkBonus: 10, spdBonus: -0.1, rangeBonus: 0, hpBonus: 30, special: "", desc: "묵직한 망치" },
  { id: "w_katana", name: "명검 무라마사", emoji: "⚔️", rarity: "epic", atkBonus: 15, spdBonus: 0.2, rangeBonus: 10, hpBonus: 0, special: "critical", desc: "크리티컬 확률 증가" },
  { id: "w_trident", name: "삼지창", emoji: "🔱", rarity: "epic", atkBonus: 12, spdBonus: 0.1, rangeBonus: 30, hpBonus: 20, special: "multishot", desc: "탄환 +1 추가" },
  { id: "w_wand", name: "대마법사의 완드", emoji: "✨", rarity: "epic", atkBonus: 10, spdBonus: 0.3, rangeBonus: 50, hpBonus: 0, special: "piercing", desc: "관통 능력 부여" },
  { id: "w_excalibur", name: "엑스칼리버", emoji: "👑", rarity: "legendary", atkBonus: 25, spdBonus: 0.3, rangeBonus: 30, hpBonus: 50, special: "allpower", desc: "전설의 성검! 모든 능력 UP" },
  { id: "w_gungnir", name: "궁니르", emoji: "⚡", rarity: "legendary", atkBonus: 30, spdBonus: 0.2, rangeBonus: 60, hpBonus: 0, special: "piercing", desc: "오딘의 창! 절대 관통" },
  { id: "w_aegis", name: "이지스", emoji: "🌟", rarity: "legendary", atkBonus: 15, spdBonus: 0.1, rangeBonus: 0, hpBonus: 100, special: "regen", desc: "신의 방패! HP 자동 회복" },
];

const GACHA_COMPANIONS: GachaCompanion[] = [
  { id: "c_fairy", name: "요정", emoji: "🧚", rarity: "common", atk: 3, atkSpeed: 800, range: 150, bulletEmoji: "✧", desc: "작은 요정 동료" },
  { id: "c_bat", name: "아기 박쥐", emoji: "🦇", rarity: "common", atk: 4, atkSpeed: 600, range: 120, bulletEmoji: "•", desc: "충실한 박쥐" },
  { id: "c_cat", name: "전투 고양이", emoji: "🐱", rarity: "common", atk: 5, atkSpeed: 700, range: 130, bulletEmoji: "•", desc: "귀여운 전투 고양이" },
  { id: "c_eagle", name: "독수리", emoji: "🦅", rarity: "rare", atk: 8, atkSpeed: 600, range: 200, bulletEmoji: "→", desc: "하늘의 사냥꾼" },
  { id: "c_wolf", name: "늑대", emoji: "🐺", rarity: "rare", atk: 10, atkSpeed: 500, range: 130, bulletEmoji: "•", desc: "빠른 늑대 동료" },
  { id: "c_golem", name: "미니 골렘", emoji: "🗿", rarity: "rare", atk: 6, atkSpeed: 1000, range: 100, bulletEmoji: "◆", desc: "튼튼한 골렘" },
  { id: "c_phoenix", name: "불사조", emoji: "🔥", rarity: "epic", atk: 15, atkSpeed: 500, range: 200, bulletEmoji: "🔥", desc: "불꽃의 새" },
  { id: "c_unicorn", name: "유니콘", emoji: "🦄", rarity: "epic", atk: 12, atkSpeed: 400, range: 180, bulletEmoji: "✦", desc: "신비한 유니콘" },
  { id: "c_angel", name: "천사", emoji: "😇", rarity: "epic", atk: 10, atkSpeed: 600, range: 250, bulletEmoji: "☆", desc: "치유의 천사" },
  { id: "c_dragon", name: "베이비 드래곤", emoji: "🐲", rarity: "legendary", atk: 25, atkSpeed: 400, range: 220, bulletEmoji: "🔥", desc: "전설의 드래곤!" },
  { id: "c_reaper", name: "사신", emoji: "💀", rarity: "legendary", atk: 30, atkSpeed: 500, range: 200, bulletEmoji: "☠️", desc: "죽음을 부르는 사신" },
  { id: "c_god", name: "천둥신", emoji: "⚡", rarity: "legendary", atk: 20, atkSpeed: 300, range: 280, bulletEmoji: "⚡", desc: "번개를 내리치는 신" },
];

const GACHA_SINGLE_COST = 100;
const GACHA_MULTI_COST = 900; // 10연차 = 9개 가격

type GachaItem = { type: "weapon"; item: GachaWeapon } | { type: "companion"; item: GachaCompanion };

function doGachaPull(): GachaItem {
  const rand = Math.random();
  // 50% weapon, 50% companion
  const isWeapon = rand < 0.5;
  const rarityRoll = Math.random();
  let rarity: WeaponRarity;
  if (rarityRoll < 0.50) rarity = "common";
  else if (rarityRoll < 0.80) rarity = "rare";
  else if (rarityRoll < 0.95) rarity = "epic";
  else rarity = "legendary";

  if (isWeapon) {
    const pool = GACHA_WEAPONS.filter((w) => w.rarity === rarity);
    const item = pool[Math.floor(Math.random() * pool.length)];
    return { type: "weapon", item };
  } else {
    const pool = GACHA_COMPANIONS.filter((c) => c.rarity === rarity);
    const item = pool[Math.floor(Math.random() * pool.length)];
    return { type: "companion", item };
  }
}

function gachaRarityColor(r: WeaponRarity) {
  switch (r) {
    case "common": return "text-gray-400";
    case "rare": return "text-blue-400";
    case "epic": return "text-purple-400";
    case "legendary": return "text-amber-400";
  }
}

function gachaRarityBorder(r: WeaponRarity) {
  switch (r) {
    case "common": return "border-gray-500/30";
    case "rare": return "border-blue-500/50";
    case "epic": return "border-purple-500/50";
    case "legendary": return "border-amber-500/50 shadow-amber-500/20 shadow-lg";
  }
}

function gachaRarityLabel(r: WeaponRarity) {
  switch (r) {
    case "common": return "일반";
    case "rare": return "레어";
    case "epic": return "에픽";
    case "legendary": return "전설";
  }
}

const ARENA_W = 360;
const ARENA_H = 600;
const TICK_MS = 33; // ~30fps

type Screen = "menu" | "heroSelect" | "battle" | "skillSelect" | "victory" | "defeat" | "gacha" | "gachaResult";

function getRandomSkills(count: number): Skill[] {
  const shuffled = [...SKILLS].sort(() => Math.random() - 0.5);
  // Weight by rarity
  const weighted = shuffled.sort((a, b) => {
    const order = { common: 0, rare: 1, epic: 2, legendary: 3 };
    return order[a.rarity] - order[b.rarity];
  });
  return weighted.slice(0, count);
}

function rarityColor(r: string) {
  switch (r) {
    case "common": return "text-gray-600 dark:text-gray-400";
    case "rare": return "text-blue-500";
    case "epic": return "text-purple-500";
    case "legendary": return "text-amber-500";
    default: return "";
  }
}

function rarityBg(r: string) {
  switch (r) {
    case "common": return "from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700";
    case "rare": return "from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800";
    case "epic": return "from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800";
    case "legendary": return "from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800";
    default: return "";
  }
}

export default function TangTangPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedHero, setSelectedHero] = useState<HeroType>(HEROES[0]);
  const [gold, setGold] = useState(0);
  const [highestWave, setHighestWave] = useState(0);

  // Gacha state
  const [ownedWeapons, setOwnedWeapons] = useState<string[]>([]);
  const [ownedCompanions, setOwnedCompanions] = useState<string[]>([]);
  const [equippedWeapon, setEquippedWeapon] = useState<string | null>(null);
  const [equippedCompanion, setEquippedCompanion] = useState<string | null>(null);
  const [gachaResults, setGachaResults] = useState<GachaItem[]>([]);
  const [enemyBullets, setEnemyBullets] = useState<EnemyBullet[]>([]);
  const enemyBulletUidRef = useRef(0);

  // Battle state
  const [heroHp, setHeroHp] = useState(100);
  const [heroMaxHp, setHeroMaxHp] = useState(100);
  const [heroX, setHeroX] = useState(ARENA_W / 2);
  const [heroY, setHeroY] = useState(ARENA_H - 80);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [wave, setWave] = useState(1);
  const [killCount, setKillCount] = useState(0);
  const [waveKills, setWaveKills] = useState(0);
  const [waveTarget, setWaveTarget] = useState(10);
  const [earnedGold, setEarnedGold] = useState(0);
  const [skills, setSkills] = useState<SkillState>({
    atkMul: 1, spdMul: 1, rangeMul: 1, bulletCount: 1, piercing: false, hpRegen: 0, luck: 0,
  });
  const [chosenSkills, setChosenSkills] = useState<string[]>([]);
  const [skillOptions, setSkillOptions] = useState<Skill[]>([]);
  const [paused, setPaused] = useState(false);
  const [exp, setExp] = useState(0);
  const [level, setLevel] = useState(1);
  const [expToNext, setExpToNext] = useState(20);

  const uidRef = useRef(0);
  const bulletUidRef = useRef(0);
  const tickRef = useRef(0);
  const lastShotRef = useRef(0);
  const arenaRef = useRef<HTMLDivElement>(null);

  const nextUid = () => ++uidRef.current;
  const nextBulletUid = () => ++bulletUidRef.current;

  // Get equipped bonuses
  const getWeaponBonus = useCallback(() => {
    if (!equippedWeapon) return { atkBonus: 0, spdBonus: 0, rangeBonus: 0, hpBonus: 0, special: "" };
    const w = GACHA_WEAPONS.find((w) => w.id === equippedWeapon);
    return w ?? { atkBonus: 0, spdBonus: 0, rangeBonus: 0, hpBonus: 0, special: "" };
  }, [equippedWeapon]);

  // Start battle
  const startBattle = useCallback((heroOverride?: HeroType) => {
    const hero = heroOverride ?? selectedHero;
    const wb = getWeaponBonus();
    const baseHp = hero.hp + wb.hpBonus;
    if (heroOverride) setSelectedHero(hero);
    setScreen("battle");
    setHeroHp(baseHp);
    setHeroMaxHp(baseHp);
    setHeroX(ARENA_W / 2);
    setHeroY(ARENA_H - 80);
    setBullets([]);
    setEnemies([]);
    setEnemyBullets([]);
    enemyBulletUidRef.current = 0;
    setWave(1);
    setKillCount(0);
    setWaveKills(0);
    setWaveTarget(10);
    setEarnedGold(0);
    const initSkills: SkillState = {
      atkMul: 1, spdMul: 1 + wb.spdBonus, rangeMul: 1, bulletCount: 1, piercing: wb.special === "piercing", hpRegen: wb.special === "regen" ? 3 : 0, luck: 0,
    };
    if (wb.special === "multishot") initSkills.bulletCount += 1;
    setSkills(initSkills);
    setChosenSkills([]);
    setPaused(false);
    setExp(0);
    setLevel(1);
    setExpToNext(20);
    tickRef.current = 0;
    lastShotRef.current = 0;
    uidRef.current = 0;
    bulletUidRef.current = 0;
  }, [selectedHero, getWeaponBonus]);

  // Find nearest enemy
  const findNearest = useCallback((hx: number, hy: number, ens: Enemy[]): Enemy | null => {
    let closest: Enemy | null = null;
    let minDist = Infinity;
    for (const e of ens) {
      const d = Math.sqrt((e.x - hx) ** 2 + (e.y - hy) ** 2);
      if (d < minDist) {
        minDist = d;
        closest = e;
      }
    }
    return closest;
  }, []);

  // Shoot
  const shoot = useCallback((hx: number, hy: number, ens: Enemy[], sk: SkillState, hero: HeroType) => {
    const target = findNearest(hx, hy, ens);
    if (!target) return [];

    const dx = target.x - hx;
    const dy = target.y - hy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > hero.range * sk.rangeMul) return [];

    const speed = 8;
    const ndx = (dx / dist) * speed;
    const ndy = (dy / dist) * speed;

    const newBullets: Bullet[] = [];
    for (let i = 0; i < sk.bulletCount; i++) {
      const angle = (i - (sk.bulletCount - 1) / 2) * 0.15;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      newBullets.push({
        id: nextBulletUid(),
        x: hx,
        y: hy - 10,
        dx: ndx * cos - ndy * sin,
        dy: ndx * sin + ndy * cos,
        atk: (hero.atk + (GACHA_WEAPONS.find((w) => w.id === equippedWeapon)?.atkBonus ?? 0)) * sk.atkMul,
        emoji: hero.bulletEmoji,
        piercing: sk.piercing,
        hitEnemies: new Set(),
      });
    }
    return newBullets;
  }, [findNearest, equippedWeapon]);

  // Spawn enemies
  const spawnEnemy = useCallback((w: number): Enemy => {
    const waveIdx = Math.min(w - 1, ENEMY_TYPES.length - 1);
    const possibleTypes = ENEMY_TYPES.slice(0, waveIdx + 2);
    const type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
    const hpMul = 1 + (w - 1) * 0.3;
    const atkMul = 1 + (w - 1) * 0.2;

    const x = 20 + Math.random() * (ARENA_W - 40);
    const y = -20 - Math.random() * 40;

    return {
      uid: nextUid(),
      typeId: type.id,
      emoji: type.emoji,
      x,
      y,
      hp: Math.floor(type.hp * hpMul),
      maxHp: Math.floor(type.hp * hpMul),
      atk: Math.floor(type.atk * atkMul),
      speed: type.speed + Math.random() * 0.3,
      reward: Math.floor(type.reward * (1 + (w - 1) * 0.1)),
      size: type.size,
      isBoss: false,
      lastShot: 0,
    };
  }, []);

  const spawnBoss = useCallback((w: number): Enemy => {
    const bossIdx = Math.min(Math.floor((w - 1) / 5), BOSS_TYPES.length - 1);
    const type = BOSS_TYPES[bossIdx];
    const hpMul = 1 + (w - 1) * 0.5;
    return {
      uid: nextUid(),
      typeId: type.id,
      emoji: type.emoji,
      x: ARENA_W / 2,
      y: -30,
      hp: Math.floor(type.hp * hpMul),
      maxHp: Math.floor(type.hp * hpMul),
      atk: Math.floor(type.atk * (1 + (w - 1) * 0.3)),
      speed: type.speed,
      reward: Math.floor(type.reward * (1 + (w - 1) * 0.2)),
      size: type.size,
      isBoss: true,
      lastShot: 0,
    };
  }, []);

  // Level up
  const handleLevelUp = useCallback(() => {
    const options = getRandomSkills(3);
    setSkillOptions(options);
    setScreen("skillSelect");
    setPaused(true);
  }, []);

  const selectSkill = useCallback((skill: Skill) => {
    setSkills((prev) => skill.apply(prev));
    setChosenSkills((prev) => [...prev, skill.id]);
    setScreen("battle");
    setPaused(false);
  }, []);

  // Game loop
  useEffect(() => {
    if (screen !== "battle" || paused) return;

    const interval = setInterval(() => {
      tickRef.current++;
      const tick = tickRef.current;

      // HP regen
      setHeroHp((prev) => Math.min(prev + skills.hpRegen * (TICK_MS / 1000), heroMaxHp));

      // Spawn enemies
      const spawnRate = Math.max(30, 60 - wave * 3);
      if (tick % spawnRate === 0) {
        setEnemies((prev) => [...prev, spawnEnemy(wave)]);
      }
      // Boss every 5 waves at wave start
      if (tick === 1 && wave % 5 === 0) {
        setEnemies((prev) => [...prev, spawnBoss(wave)]);
      }

      // Shooting
      const atkInterval = Math.max(5, Math.floor(selectedHero.atkSpeed / TICK_MS / skills.spdMul));
      if (tick - lastShotRef.current >= atkInterval) {
        lastShotRef.current = tick;
        setEnemies((ens) => {
          setHeroX((hx) => {
            setHeroY((hy) => {
              const newBullets = shoot(hx, hy, ens, skills, selectedHero);
              if (newBullets.length > 0) {
                setBullets((prev) => [...prev, ...newBullets]);
              }
              return hy;
            });
            return hx;
          });
          return ens;
        });
      }

      // Companion shooting
      if (equippedCompanion) {
        const comp = GACHA_COMPANIONS.find((c) => c.id === equippedCompanion);
        if (comp) {
          const compAtkInterval = Math.max(5, Math.floor(comp.atkSpeed / TICK_MS));
          if (tick % compAtkInterval === 0) {
            setEnemies((ens) => {
              setHeroX((hx) => {
                setHeroY((hy) => {
                  const target = findNearest(hx, hy, ens);
                  if (target) {
                    const dx = target.x - hx;
                    const dy = target.y - hy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= comp.range) {
                      const speed = 7;
                      setBullets((prev) => [...prev, {
                        id: nextBulletUid(),
                        x: hx + 15,
                        y: hy - 5,
                        dx: (dx / dist) * speed,
                        dy: (dy / dist) * speed,
                        atk: comp.atk,
                        emoji: comp.bulletEmoji,
                        piercing: false,
                        hitEnemies: new Set(),
                      }]);
                    }
                  }
                  return hy;
                });
                return hx;
              });
              return ens;
            });
          }
        }
      }

      // Move bullets
      setBullets((prev) =>
        prev
          .map((b) => ({ ...b, x: b.x + b.dx, y: b.y + b.dy }))
          .filter((b) => b.x > -20 && b.x < ARENA_W + 20 && b.y > -20 && b.y < ARENA_H + 20)
      );

      // Move enemies toward hero
      setHeroX((hx) => {
        setHeroY((hy) => {
          setEnemies((prev) =>
            prev.map((e) => {
              const dx = hx - e.x;
              const dy = hy - e.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < e.size) return e; // close enough, attack
              return {
                ...e,
                x: e.x + (dx / dist) * e.speed,
                y: e.y + (dy / dist) * e.speed,
              };
            })
          );
          return hy;
        });
        return hx;
      });

      // Bullet-enemy collision
      setBullets((prevBullets) => {
        const remainingBullets: Bullet[] = [];
        const damage: Map<number, number> = new Map();

        for (const b of prevBullets) {
          let hit = false;
          setEnemies((ens) => {
            for (const e of ens) {
              if (b.hitEnemies.has(e.uid)) continue;
              const dist = Math.sqrt((b.x - e.x) ** 2 + (b.y - e.y) ** 2);
              if (dist < e.size + 6) {
                damage.set(e.uid, (damage.get(e.uid) ?? 0) + b.atk);
                b.hitEnemies.add(e.uid);
                hit = true;
                if (!b.piercing) break;
              }
            }
            return ens;
          });
          if (!hit || b.piercing) remainingBullets.push(b);
        }

        // Apply damage
        if (damage.size > 0) {
          setEnemies((ens) => {
            const alive: Enemy[] = [];
            let kills = 0;
            let goldEarned = 0;
            let expEarned = 0;
            for (const e of ens) {
              const dmg = damage.get(e.uid) ?? 0;
              const newHp = e.hp - dmg;
              if (newHp <= 0) {
                kills++;
                goldEarned += Math.floor(e.reward * (1 + skills.luck));
                expEarned += e.isBoss ? 20 : 5;
              } else {
                alive.push({ ...e, hp: newHp });
              }
            }
            if (kills > 0) {
              setKillCount((k) => k + kills);
              setWaveKills((wk) => wk + kills);
              setEarnedGold((g) => g + goldEarned);
              setExp((prev) => {
                const newExp = prev + expEarned;
                setExpToNext((etn) => {
                  if (newExp >= etn) {
                    setLevel((l) => l + 1);
                    setTimeout(() => handleLevelUp(), 100);
                    return Math.floor(etn * 1.5);
                  }
                  return etn;
                });
                return newExp;
              });
            }
            return alive;
          });
        }

        return remainingBullets;
      });

      // Enemy shooting at hero
      setHeroX((hx) => {
        setHeroY((hy) => {
          setEnemies((ens) => {
            const newEnemyBullets: EnemyBullet[] = [];
            const updated = ens.map((e) => {
              const shootInterval = e.isBoss ? 40 : 80;
              if (tick - e.lastShot >= shootInterval && e.y > 0) {
                const dx = hx - e.x;
                const dy = hy - e.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 300) {
                  const speed = 4;
                  newEnemyBullets.push({
                    id: ++enemyBulletUidRef.current,
                    x: e.x,
                    y: e.y,
                    dx: (dx / dist) * speed,
                    dy: (dy / dist) * speed,
                    emoji: e.isBoss ? "🔴" : "⬤",
                  });
                  return { ...e, lastShot: tick };
                }
              }
              return e;
            });
            if (newEnemyBullets.length > 0) {
              setEnemyBullets((prev) => [...prev, ...newEnemyBullets]);
            }
            return updated;
          });
          return hy;
        });
        return hx;
      });

      // Move enemy bullets
      setEnemyBullets((prev) =>
        prev
          .map((b) => ({ ...b, x: b.x + b.dx, y: b.y + b.dy }))
          .filter((b) => b.x > -20 && b.x < ARENA_W + 20 && b.y > -20 && b.y < ARENA_H + 20)
      );

      // Enemy bullet - hero collision (20 damage per hit)
      setHeroX((hx) => {
        setHeroY((hy) => {
          setEnemyBullets((prev) => {
            const remaining: EnemyBullet[] = [];
            let totalDmg = 0;
            for (const b of prev) {
              const dist = Math.sqrt((b.x - hx) ** 2 + (b.y - hy) ** 2);
              if (dist < 18) {
                totalDmg += 10;
              } else {
                remaining.push(b);
              }
            }
            if (totalDmg > 0) {
              setHeroHp((prev) => {
                const next = prev - totalDmg;
                if (next <= 0) {
                  setGold((g) => g + earnedGold);
                  if (wave > highestWave) setHighestWave(wave);
                  setScreen("defeat");
                }
                return Math.max(0, next);
              });
            }
            return remaining;
          });
          return hy;
        });
        return hx;
      });

      // Enemy-hero contact collision (damage)
      setHeroX((hx) => {
        setHeroY((hy) => {
          setEnemies((ens) => {
            let totalDmg = 0;
            for (const e of ens) {
              const dist = Math.sqrt((e.x - hx) ** 2 + (e.y - hy) ** 2);
              if (dist < e.size + 12) {
                totalDmg += e.atk * (TICK_MS / 1000);
              }
            }
            if (totalDmg > 0) {
              setHeroHp((prev) => {
                const next = prev - totalDmg;
                if (next <= 0) {
                  setGold((g) => g + earnedGold);
                  if (wave > highestWave) setHighestWave(wave);
                  setScreen("defeat");
                }
                return Math.max(0, next);
              });
            }
            return ens;
          });
          return hy;
        });
        return hx;
      });

      // Check wave clear
      setWaveKills((wk) => {
        setWaveTarget((wt) => {
          if (wk >= wt) {
            setWave((w) => w + 1);
            setWaveKills(0);
            setWaveTarget(Math.floor(wt * 1.2) + 2);
          }
          return wt;
        });
        return wk;
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [screen, paused, wave, selectedHero, skills, heroMaxHp, earnedGold, highestWave, shoot, spawnEnemy, spawnBoss, handleLevelUp, equippedCompanion, findNearest]);

  // Touch/mouse move - 마우스를 자동으로 따라감
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(16, Math.min(ARENA_W - 16, e.clientX - rect.left));
    const y = Math.max(16, Math.min(ARENA_H - 16, e.clientY - rect.top));
    setHeroX(x);
    setHeroY(y);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">
            ← 홈
          </Link>
          <div className="text-6xl">🔫</div>
          <h1 className="text-4xl font-black">
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">탕탕특공대</span>
          </h1>
          <p className="text-lg text-slate-400">적을 물리치고 최강의 영웅이 되자!</p>

          <div className="mt-4 flex flex-col gap-3">
            <button
              onClick={() => setScreen("heroSelect")}
              className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-12 py-4 text-xl font-black shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              🎮 게임 시작
            </button>
            <button
              onClick={() => setScreen("gacha")}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-12 py-4 text-xl font-black shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              🎰 뽑기!
            </button>
          </div>

          <div className="mt-6 rounded-xl bg-white/5 px-6 py-4 backdrop-blur space-y-1">
            <p className="text-sm text-slate-400">🏆 최고 웨이브: <span className="font-bold text-amber-400">{highestWave}</span></p>
            <p className="text-sm text-slate-400">💰 골드: <span className="font-bold text-yellow-400">{gold}</span></p>
            {equippedWeapon && (
              <p className="text-sm text-slate-400">⚔️ 무기: <span className="font-bold">{GACHA_WEAPONS.find((w) => w.id === equippedWeapon)?.emoji} {GACHA_WEAPONS.find((w) => w.id === equippedWeapon)?.name}</span></p>
            )}
            {equippedCompanion && (
              <p className="text-sm text-slate-400">🐾 동료: <span className="font-bold">{GACHA_COMPANIONS.find((c) => c.id === equippedCompanion)?.emoji} {GACHA_COMPANIONS.find((c) => c.id === equippedCompanion)?.name}</span></p>
            )}
          </div>
        </div>
      )}

      {/* Hero Select */}
      {screen === "heroSelect" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
          <h2 className="text-2xl font-black">🦸 영웅 선택</h2>
          <div className="grid grid-cols-2 gap-4">
            {HEROES.map((hero) => (
              <button
                key={hero.id}
                onClick={() => {
                  startBattle(hero);
                }}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all hover:scale-105 active:scale-95 ${
                  selectedHero.id === hero.id
                    ? "border-amber-400 bg-amber-500/20"
                    : "border-white/10 bg-white/5 hover:border-white/30"
                }`}
              >
                <span className="text-4xl">{hero.emoji}</span>
                <span className="font-bold">{hero.name}</span>
                <span className="text-xs text-slate-400">{hero.desc}</span>
                <div className="text-xs text-slate-500">
                  <span>❤️{hero.hp}</span>{" "}
                  <span>⚔️{hero.atk}</span>{" "}
                  <span>⚡{hero.atkSpeed}ms</span>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setScreen("menu")} className="text-sm text-slate-500 hover:text-white">
            ← 뒤로
          </button>
        </div>
      )}

      {/* Battle */}
      {screen === "battle" && (
        <div className="flex flex-col items-center pt-2">
          {/* HUD */}
          <div className="mb-2 flex w-[360px] items-center justify-between px-2 text-sm">
            <div className="flex items-center gap-2">
              <span>🌊 Wave {wave}</span>
              <span className="text-slate-400">({waveKills}/{waveTarget})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">💰 {earnedGold}</span>
              <span className="text-slate-400">Lv.{level}</span>
            </div>
          </div>

          {/* HP Bar */}
          <div className="mb-2 h-4 w-[360px] overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
              style={{ width: `${(heroHp / heroMaxHp) * 100}%` }}
            />
          </div>

          {/* EXP Bar */}
          <div className="mb-2 h-2 w-[360px] overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
              style={{ width: `${(exp / expToNext) * 100}%` }}
            />
          </div>

          {/* Arena */}
          <div
            ref={arenaRef}
            className="relative overflow-hidden rounded-xl border-2 border-indigo-500/30 bg-gradient-to-b from-indigo-900/50 to-slate-900/50"
            style={{ width: ARENA_W, height: ARENA_H, touchAction: "none" }}
            onPointerMove={handlePointerMove}
          >
            {/* Grid lines */}
            <div className="pointer-events-none absolute inset-0 opacity-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={`h${i}`} className="absolute h-px w-full bg-white" style={{ top: i * 50 }} />
              ))}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={`v${i}`} className="absolute h-full w-px bg-white" style={{ left: i * 50 }} />
              ))}
            </div>

            {/* Hero */}
            <div
              className="absolute flex flex-col items-center transition-none"
              style={{ left: heroX - 16, top: heroY - 16 }}
            >
              <span className="text-3xl drop-shadow-lg">{selectedHero.emoji}</span>
            </div>

            {/* Companion */}
            {equippedCompanion && (() => {
              const comp = GACHA_COMPANIONS.find((c) => c.id === equippedCompanion);
              return comp ? (
                <div
                  className="absolute transition-none"
                  style={{ left: heroX + 10, top: heroY - 24 }}
                >
                  <span className="text-xl drop-shadow-lg">{comp.emoji}</span>
                </div>
              ) : null;
            })()}

            {/* Bullets */}
            {bullets.map((b) => (
              <div
                key={b.id}
                className="absolute text-yellow-300 font-bold text-sm"
                style={{ left: b.x - 4, top: b.y - 4 }}
              >
                {b.emoji}
              </div>
            ))}

            {/* Enemy Bullets */}
            {enemyBullets.map((b) => (
              <div
                key={b.id}
                className="absolute text-red-500 text-xs"
                style={{ left: b.x - 4, top: b.y - 4 }}
              >
                {b.emoji}
              </div>
            ))}

            {/* Enemies */}
            {enemies.map((e) => (
              <div key={e.uid} className="absolute flex flex-col items-center" style={{ left: e.x - e.size / 2, top: e.y - e.size / 2 }}>
                <span style={{ fontSize: e.size }}>{e.emoji}</span>
                {/* HP bar */}
                <div className="mt-0.5 h-1 rounded-full bg-gray-700" style={{ width: e.size + 8 }}>
                  <div
                    className={`h-full rounded-full ${e.isBoss ? "bg-red-500" : "bg-red-400"}`}
                    style={{ width: `${(e.hp / e.maxHp) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Skills display */}
          {chosenSkills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {chosenSkills.map((sid, i) => {
                const sk = SKILLS.find((s) => s.id === sid);
                return sk ? (
                  <span key={i} className="rounded bg-white/10 px-1.5 py-0.5 text-xs" title={sk.desc}>
                    {sk.emoji}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}

      {/* Skill Select */}
      {screen === "skillSelect" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
          <h2 className="text-2xl font-black">⬆️ 레벨 업!</h2>
          <p className="text-slate-400">스킬을 선택하세요</p>
          <div className="flex flex-col gap-4 w-full max-w-sm">
            {skillOptions.map((skill) => (
              <button
                key={skill.id}
                onClick={() => selectSkill(skill)}
                className={`rounded-xl bg-gradient-to-r ${rarityBg(skill.rarity)} p-4 text-left transition-transform hover:scale-105 active:scale-95 border border-white/10`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{skill.emoji}</span>
                  <div>
                    <p className={`font-bold ${rarityColor(skill.rarity)}`}>{skill.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{skill.desc}</p>
                    <p className={`text-xs mt-1 ${rarityColor(skill.rarity)}`}>
                      {skill.rarity === "common" ? "일반" : skill.rarity === "rare" ? "레어" : skill.rarity === "epic" ? "에픽" : "전설"}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Victory */}
      {screen === "victory" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-6xl">🎉</div>
          <h2 className="text-3xl font-black text-amber-400">승리!</h2>
          <p>획득 골드: <span className="text-yellow-400 font-bold">{earnedGold}</span></p>
          <button onClick={() => setScreen("menu")} className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3 font-bold">
            메뉴로
          </button>
        </div>
      )}

      {/* Defeat */}
      {screen === "defeat" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-6xl">💀</div>
          <h2 className="text-3xl font-black text-red-400">패배...</h2>
          <div className="rounded-xl bg-white/5 px-6 py-4 space-y-2">
            <p>🌊 도달 웨이브: <span className="font-bold text-cyan-400">{wave}</span></p>
            <p>💀 처치 수: <span className="font-bold text-red-400">{killCount}</span></p>
            <p>💰 획득 골드: <span className="font-bold text-yellow-400">{earnedGold}</span></p>
            <p>⭐ 레벨: <span className="font-bold text-purple-400">{level}</span></p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { startBattle(); }} className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
              🔄 재도전
            </button>
            <button onClick={() => setScreen("menu")} className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
              메뉴로
            </button>
          </div>
        </div>
      )}
      {/* Gacha */}
      {screen === "gacha" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <h2 className="text-2xl font-black">🎰 뽑기</h2>
          <p className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">무기 & 동료 뽑기!</p>
          <p className="text-yellow-400 font-bold text-lg">💰 {gold} 골드</p>

          <div className="flex gap-4 mt-4">
            <button
              onClick={() => {
                if (gold < GACHA_SINGLE_COST) return;
                setGold((g) => g - GACHA_SINGLE_COST);
                const result = doGachaPull();
                setGachaResults([result]);
                if (result.type === "weapon" && !ownedWeapons.includes(result.item.id)) {
                  setOwnedWeapons((prev) => [...prev, result.item.id]);
                }
                if (result.type === "companion" && !ownedCompanions.includes(result.item.id)) {
                  setOwnedCompanions((prev) => [...prev, result.item.id]);
                }
                setScreen("gachaResult");
              }}
              disabled={gold < GACHA_SINGLE_COST}
              className={`rounded-xl px-8 py-4 font-black shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                gold >= GACHA_SINGLE_COST
                  ? "bg-gradient-to-r from-purple-500 to-pink-500"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              1회 뽑기<br /><span className="text-xs">{GACHA_SINGLE_COST} 💰</span>
            </button>

            <button
              onClick={() => {
                if (gold < GACHA_MULTI_COST) return;
                setGold((g) => g - GACHA_MULTI_COST);
                const results: GachaItem[] = [];
                for (let i = 0; i < 10; i++) {
                  const result = doGachaPull();
                  results.push(result);
                  if (result.type === "weapon" && !ownedWeapons.includes(result.item.id)) {
                    setOwnedWeapons((prev) => [...prev, result.item.id]);
                  }
                  if (result.type === "companion" && !ownedCompanions.includes(result.item.id)) {
                    setOwnedCompanions((prev) => [...prev, result.item.id]);
                  }
                }
                setGachaResults(results);
                setScreen("gachaResult");
              }}
              disabled={gold < GACHA_MULTI_COST}
              className={`rounded-xl px-8 py-4 font-black shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                gold >= GACHA_MULTI_COST
                  ? "bg-gradient-to-r from-amber-500 to-red-500"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              10연차!<br /><span className="text-xs">{GACHA_MULTI_COST} 💰</span>
            </button>
          </div>

          {/* Owned items */}
          <div className="mt-6 w-full max-w-md space-y-4">
            {ownedWeapons.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-bold text-purple-400">⚔️ 보유 무기 ({ownedWeapons.length})</p>
                <div className="grid grid-cols-4 gap-2">
                  {ownedWeapons.map((wid) => {
                    const w = GACHA_WEAPONS.find((w) => w.id === wid);
                    if (!w) return null;
                    const isEquipped = equippedWeapon === wid;
                    return (
                      <button
                        key={wid}
                        onClick={() => setEquippedWeapon(isEquipped ? null : wid)}
                        className={`flex flex-col items-center rounded-lg border-2 p-2 text-xs transition-all ${
                          isEquipped ? "border-amber-400 bg-amber-500/20" : `${gachaRarityBorder(w.rarity)} bg-white/5 hover:bg-white/10`
                        }`}
                      >
                        <span className="text-xl">{w.emoji}</span>
                        <span className={`font-bold ${gachaRarityColor(w.rarity)}`}>{w.name}</span>
                        {isEquipped && <span className="text-[10px] text-amber-400">장착중</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {ownedCompanions.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-bold text-pink-400">🐾 보유 동료 ({ownedCompanions.length})</p>
                <div className="grid grid-cols-4 gap-2">
                  {ownedCompanions.map((cid) => {
                    const c = GACHA_COMPANIONS.find((c) => c.id === cid);
                    if (!c) return null;
                    const isEquipped = equippedCompanion === cid;
                    return (
                      <button
                        key={cid}
                        onClick={() => setEquippedCompanion(isEquipped ? null : cid)}
                        className={`flex flex-col items-center rounded-lg border-2 p-2 text-xs transition-all ${
                          isEquipped ? "border-amber-400 bg-amber-500/20" : `${gachaRarityBorder(c.rarity)} bg-white/5 hover:bg-white/10`
                        }`}
                      >
                        <span className="text-xl">{c.emoji}</span>
                        <span className={`font-bold ${gachaRarityColor(c.rarity)}`}>{c.name}</span>
                        {isEquipped && <span className="text-[10px] text-amber-400">장착중</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* All gacha items catalog */}
          <div className="mt-4 w-full max-w-md space-y-3">
            <p className="text-sm font-bold text-slate-400">📖 뽑기 도감</p>
            <div className="grid grid-cols-5 gap-1.5">
              {[...GACHA_WEAPONS, ...GACHA_COMPANIONS].map((item) => {
                const owned = ("atkBonus" in item) ? ownedWeapons.includes(item.id) : ownedCompanions.includes(item.id);
                return (
                  <div key={item.id} className={`flex flex-col items-center rounded-lg border p-1.5 text-[10px] ${
                    owned ? `${gachaRarityBorder(item.rarity)} bg-white/5` : "border-gray-800 bg-black/30 opacity-40"
                  }`}>
                    <span className="text-lg">{owned ? item.emoji : "❓"}</span>
                    <span className={`${gachaRarityColor(item.rarity)}`}>{owned ? item.name : "???"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={() => setScreen("menu")} className="mt-4 text-sm text-slate-500 hover:text-white">
            ← 뒤로
          </button>
        </div>
      )}

      {/* Gacha Result */}
      {screen === "gachaResult" && gachaResults.length > 0 && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-2xl font-black">
            {gachaResults.length === 1 ? "🎊 뽑기 결과!" : "🎊 10연차 결과!"}
          </h2>
          <div className={`grid ${gachaResults.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-5"} gap-3 w-full max-w-lg`}>
            {gachaResults.map((result, i) => {
              const item = result.item;
              const isNew = result.type === "weapon"
                ? !ownedWeapons.includes(item.id) || gachaResults.slice(0, i).some((r) => r.item.id === item.id)
                : !ownedCompanions.includes(item.id) || gachaResults.slice(0, i).some((r) => r.item.id === item.id);
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 bg-gradient-to-b from-white/10 to-white/5 p-3 ${gachaRarityBorder(item.rarity)}`}
                >
                  {item.rarity === "legendary" && <span className="text-[10px] text-amber-400 animate-pulse">★ 전설 ★</span>}
                  {item.rarity === "epic" && <span className="text-[10px] text-purple-400">★ 에픽 ★</span>}
                  <span className={`${gachaResults.length === 1 ? "text-6xl" : "text-3xl"}`}>{item.emoji}</span>
                  <span className={`font-bold text-sm ${gachaRarityColor(item.rarity)}`}>{item.name}</span>
                  <span className="text-[10px] text-slate-400">{result.type === "weapon" ? "⚔️ 무기" : "🐾 동료"}</span>
                  {gachaResults.length === 1 && (
                    <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                  )}
                  <span className={`text-[10px] ${gachaRarityColor(item.rarity)}`}>{gachaRarityLabel(item.rarity)}</span>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setScreen("gacha")}
            className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            다시 뽑기! 🎰
          </button>
          <button onClick={() => setScreen("menu")} className="text-sm text-slate-500 hover:text-white">
            메뉴로
          </button>
        </div>
      )}
    </div>
  );
}
