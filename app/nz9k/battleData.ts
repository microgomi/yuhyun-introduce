// ----------------------------------------------------------------------------
// 전투 게임 수치 데이터 (렌더링·입력과 분리)
// ----------------------------------------------------------------------------

export type WeaponKey = "sword" | "spear" | "axe" | "bow";

export interface Weapon {
  key: WeaponKey;
  name: string;
  emoji: string;
  damage: number;
  range: number; // 닿는 거리(m)
  arc: number; // 휘두르는 각도(도) — 활은 안 씀
  cooldown: number; // 다음 공격까지(초)
  windup: number; // 휘두르기 시작부터 맞는 순간까지(초)
  stamina: number; // 한 번 쓸 때 기력
  knockback: number;
  unlockLevel: number;
  color: string;
  desc: string;
}

export const WEAPONS: Weapon[] = [
  { key: "sword", name: "검", emoji: "🗡️", damage: 22, range: 3.2, arc: 110, cooldown: 0.42, windup: 0.14, stamina: 7, knockback: 4, unlockLevel: 1, color: "#d9e6ff", desc: "빠르게 휘둘러요. 기본이면서 안정적!" },
  { key: "spear", name: "창", emoji: "🔱", damage: 30, range: 5.2, arc: 45, cooldown: 0.62, windup: 0.2, stamina: 10, knockback: 7, unlockLevel: 2, color: "#ffe9a8", desc: "멀리서 찔러요. 좁지만 길어요." },
  { key: "axe", name: "도끼", emoji: "🪓", damage: 52, range: 3.4, arc: 150, cooldown: 1, windup: 0.32, stamina: 18, knockback: 10, unlockLevel: 4, color: "#ffb38a", desc: "느리지만 아주 세게! 넓게 맞아요." },
  { key: "bow", name: "활", emoji: "🏹", damage: 26, range: 60, arc: 0, cooldown: 0.75, windup: 0.18, stamina: 6, knockback: 3, unlockLevel: 3, color: "#b6f0c4", desc: "화살을 쏴요. 화살이 있어야 해요." },
];

export const weaponOf = (key: WeaponKey) => WEAPONS.find((w) => w.key === key) as Weapon;

export type EnemyKey = "slime" | "wolf" | "shield" | "golem";

export interface EnemyType {
  key: EnemyKey;
  name: string;
  emoji: string;
  hp: number;
  damage: number;
  speed: number;
  attackRange: number;
  attackCooldown: number;
  windup: number; // 공격 예고 시간 (이때 피하면 안 맞아요)
  xp: number;
  radius: number;
  color: string;
  color2: string;
  boss?: boolean;
  desc: string;
}

export const ENEMIES: EnemyType[] = [
  { key: "slime", name: "슬라임", emoji: "🟢", hp: 48, damage: 6, speed: 2.4, attackRange: 2, attackCooldown: 1.6, windup: 0.5, xp: 8, radius: 0.7, color: "#4ade80", color2: "#166534", desc: "통통 튀며 다가와요. 약하지만 많이 와요." },
  { key: "wolf", name: "늑대", emoji: "🐺", hp: 62, damage: 11, speed: 4.8, attackRange: 2.2, attackCooldown: 1.2, windup: 0.35, xp: 14, radius: 0.6, color: "#94a3b8", color2: "#334155", desc: "아주 빨라요! 거리를 두고 싸우세요." },
  { key: "shield", name: "방패병", emoji: "🛡️", hp: 140, damage: 15, speed: 2.2, attackRange: 2.6, attackCooldown: 1.8, windup: 0.6, xp: 26, radius: 0.8, color: "#a8b4c8", color2: "#1e293b", desc: "앞에서 맞으면 절반만 아파요. 뒤로 돌아가세요!" },
  { key: "golem", name: "바위 골렘", emoji: "🗿", hp: 900, damage: 26, speed: 2, attackRange: 4.2, attackCooldown: 2.6, windup: 0.9, xp: 200, radius: 1.8, color: "#a1887f", color2: "#4e342e", boss: true, desc: "보스! 땅을 내려쳐 주변을 공격해요." },
];

export const enemyOf = (key: EnemyKey) => ENEMIES.find((e) => e.key === key) as EnemyType;

// 웨이브마다 나오는 적 (5의 배수는 보스 웨이브)
export function waveSpawns(wave: number): EnemyKey[] {
  const out: EnemyKey[] = [];
  const boss = wave % 5 === 0;
  if (boss) {
    out.push("golem");
    for (let i = 0; i < Math.floor(wave / 5) + 1; i++) out.push("shield");
  }
  const slimes = boss ? 3 : Math.min(14, 3 + Math.floor(wave * 1.1));
  const wolves = wave >= 2 ? Math.min(9, Math.floor(wave * 0.8)) : 0;
  const shields = wave >= 4 && !boss ? Math.min(5, Math.floor((wave - 2) / 2)) : 0;
  for (let i = 0; i < slimes; i++) out.push("slime");
  for (let i = 0; i < wolves; i++) out.push("wolf");
  for (let i = 0; i < shields; i++) out.push("shield");
  return out;
}

// 웨이브가 오를수록 적이 조금씩 강해진다
export const waveScale = (wave: number) => ({ hp: 1 + (wave - 1) * 0.16, damage: 1 + (wave - 1) * 0.09 });

export type PickupKey = "meat" | "potion" | "armor" | "arrows";

export interface PickupType {
  key: PickupKey;
  name: string;
  emoji: string;
  color: string;
  desc: string;
}

export const PICKUPS: Record<PickupKey, PickupType> = {
  meat: { key: "meat", name: "고기", emoji: "🍗", color: "#f59e0b", desc: "허기 +35" },
  potion: { key: "potion", name: "물약", emoji: "🧪", color: "#ef4444", desc: "체력 +45" },
  armor: { key: "armor", name: "방어구", emoji: "🛡️", color: "#60a5fa", desc: "방어력 +2" },
  arrows: { key: "arrows", name: "화살", emoji: "🏹", color: "#a3e635", desc: "화살 +15" },
};

export const PLAYER = {
  maxHp: 120,
  speed: 7.5,
  sprintSpeed: 12,
  jump: 9,
  gravity: 26,
  maxStamina: 100,
  staminaRegen: 16,
  sprintDrain: 18,
  blockDrain: 14,
  maxHunger: 100,
  hungerDrain: 0.6, // 초당 (100에서 0까지 약 3분)
  starveDamage: 2, // 허기 0일 때 초당 체력
  maxBreath: 100,
  breathDrain: 9, // 물속 초당
  breathRegen: 28,
  drownDamage: 7, // 호흡 0일 때 초당 체력
  blockReduce: 0.75, // 막으면 피해 75% 감소
  maxDefense: 20,
  arrowsStart: 30,
  invulnerable: 0.55, // 맞은 뒤 무적 시간
};

export const ARENA = {
  radius: 46, // 싸우는 곳 반지름
  lake: { x: 17, z: -14, radius: 11, depth: 2.6 }, // 호수 (들어가면 호흡이 줄어요)
} as const;

// 레벨업에 필요한 경험치
export const xpForLevel = (level: number) => Math.round(45 * Math.pow(level, 1.45));

export interface SaveRecord {
  bestWave: number;
  bestKills: number;
  bestLevel: number;
  runs: number;
}

const KEY = "nz9k-arena-save-v1";

export function loadRecord(): SaveRecord {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { bestWave: 0, bestKills: 0, bestLevel: 1, runs: 0 };
    const data = JSON.parse(raw) as Partial<SaveRecord>;
    return {
      bestWave: Number(data.bestWave) || 0,
      bestKills: Number(data.bestKills) || 0,
      bestLevel: Number(data.bestLevel) || 1,
      runs: Number(data.runs) || 0,
    };
  } catch (err) {
    console.warn("기록을 읽지 못했어요", err);
    return { bestWave: 0, bestKills: 0, bestLevel: 1, runs: 0 };
  }
}

export function saveRecord(r: SaveRecord) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(r));
  } catch (err) {
    console.warn("기록을 저장하지 못했어요", err);
  }
}
