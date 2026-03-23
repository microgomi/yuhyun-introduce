"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

// --- Types ---
interface CatType {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  desc: string;
  special: string;
}

interface TowerType {
  id: string;
  name: string;
  emoji: string;
  atk: number;
  range: number;
  atkSpeed: number;
  cost: number;
  desc: string;
  bulletEmoji: string;
  special?: string;
}

interface PlacedTower {
  uid: number;
  typeId: string;
  emoji: string;
  x: number;
  y: number;
  atk: number;
  range: number;
  atkSpeed: number;
  atkTimer: number;
  bulletEmoji: string;
  special?: string;
  level: number;
}

interface EnemyType {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  speed: number;
  atk: number;
  reward: number;
  special?: string;
}

interface Enemy {
  uid: number;
  typeId: string;
  emoji: string;
  hp: number;
  maxHp: number;
  speed: number;
  atk: number;
  reward: number;
  pathIdx: number;
  special?: string;
  slowed: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  targetUid: number;
  atk: number;
  emoji: string;
  special?: string;
}

interface GachaTower {
  id: string;
  name: string;
  emoji: string;
  rarity: "rare" | "epic" | "legendary";
  atk: number;
  range: number;
  atkSpeed: number;
  cost: number;
  desc: string;
  bulletEmoji: string;
  special?: string;
}

// --- Path (적이 따라가는 경로) ---
const PATH: [number, number][] = [
  [0, 150], [60, 150], [60, 50], [160, 50], [160, 200],
  [80, 200], [80, 300], [200, 300], [200, 100], [280, 100],
  [280, 250], [160, 250], [160, 380], [300, 380], [300, 450],
  [180, 450], // 고양이 위치 (끝)
];

// --- Data ---
const CATS: CatType[] = [
  { id: "cat_orange", name: "치즈냥", emoji: "🐱", hp: 500, desc: "주황 고양이", special: "none" },
  { id: "cat_black", name: "까망냥", emoji: "🐈‍⬛", hp: 600, desc: "검은 고양이", special: "dodge" },
  { id: "cat_white", name: "하양냥", emoji: "🐈", hp: 450, desc: "흰 고양이", special: "heal" },
  { id: "cat_baby", name: "아기냥", emoji: "😺", hp: 400, desc: "아기 고양이", special: "cute" },
];

const TOWER_TYPES: TowerType[] = [
  { id: "t_sling", name: "새총탑", emoji: "🏗️", atk: 10, range: 80, atkSpeed: 25, cost: 30, desc: "기본 공격탑", bulletEmoji: "•" },
  { id: "t_water", name: "물총탑", emoji: "💧", atk: 8, range: 90, atkSpeed: 20, cost: 50, desc: "적을 느리게!", bulletEmoji: "💧", special: "slow" },
  { id: "t_fire", name: "불꽃탑", emoji: "🔥", atk: 20, range: 70, atkSpeed: 35, cost: 80, desc: "높은 공격력!", bulletEmoji: "🔥" },
  { id: "t_ice", name: "얼음탑", emoji: "🧊", atk: 12, range: 100, atkSpeed: 30, cost: 70, desc: "빙결 효과!", bulletEmoji: "❄️", special: "freeze" },
  { id: "t_arrow", name: "화살탑", emoji: "🏹", atk: 15, range: 120, atkSpeed: 22, cost: 60, desc: "먼 거리 공격", bulletEmoji: "→" },
  { id: "t_bomb", name: "폭탄탑", emoji: "💣", atk: 35, range: 60, atkSpeed: 50, cost: 120, desc: "범위 폭발!", bulletEmoji: "💥", special: "splash" },
  { id: "t_laser", name: "레이저탑", emoji: "⚡", atk: 25, range: 110, atkSpeed: 15, cost: 150, desc: "초고속 레이저", bulletEmoji: "⚡" },
  { id: "t_heal", name: "회복탑", emoji: "💚", atk: 0, range: 80, atkSpeed: 40, cost: 100, desc: "고양이 HP 회복!", bulletEmoji: "💚", special: "heal" },
];

const ENEMY_TYPES: EnemyType[] = [
  { id: "e_rat", name: "쥐", emoji: "🐭", hp: 40, speed: 1.5, atk: 5, reward: 8 },
  { id: "e_crow", name: "까마귀", emoji: "🐦‍⬛", hp: 30, speed: 2.5, atk: 3, reward: 10, special: "fast" },
  { id: "e_dog", name: "개", emoji: "🐶", hp: 80, speed: 1.0, atk: 10, reward: 15 },
  { id: "e_snake", name: "뱀", emoji: "🐍", hp: 60, speed: 1.8, atk: 8, reward: 12, special: "poison" },
  { id: "e_fox", name: "여우", emoji: "🦊", hp: 100, speed: 1.3, atk: 12, reward: 18 },
  { id: "e_wolf", name: "늑대", emoji: "🐺", hp: 150, speed: 1.2, atk: 15, reward: 25 },
  { id: "e_bear", name: "곰", emoji: "🐻", hp: 300, speed: 0.6, atk: 25, reward: 40 },
  { id: "e_eagle", name: "독수리", emoji: "🦅", hp: 80, speed: 3.0, atk: 10, reward: 30, special: "fast" },
  { id: "e_tiger", name: "호랑이", emoji: "🐯", hp: 400, speed: 1.0, atk: 30, reward: 50 },
  { id: "e_dragon", name: "드래곤", emoji: "🐲", hp: 800, speed: 0.8, atk: 50, reward: 100, special: "boss" },
  { id: "e_demon", name: "악마", emoji: "😈", hp: 500, speed: 1.5, atk: 40, reward: 80 },
  { id: "e_king", name: "마왕", emoji: "👿", hp: 1500, speed: 0.5, atk: 80, reward: 200, special: "boss" },
];

interface WaveData {
  enemies: { id: string; count: number; interval: number }[];
  delay: number;
}

const WAVES: WaveData[] = [
  { enemies: [{ id: "e_rat", count: 8, interval: 30 }], delay: 0 },
  { enemies: [{ id: "e_rat", count: 5, interval: 25 }, { id: "e_crow", count: 5, interval: 20 }], delay: 0 },
  { enemies: [{ id: "e_dog", count: 6, interval: 30 }, { id: "e_rat", count: 8, interval: 20 }], delay: 0 },
  { enemies: [{ id: "e_snake", count: 8, interval: 25 }, { id: "e_crow", count: 5, interval: 20 }], delay: 0 },
  { enemies: [{ id: "e_fox", count: 6, interval: 25 }, { id: "e_dog", count: 5, interval: 30 }, { id: "e_dragon", count: 1, interval: 1 }], delay: 0 },
  { enemies: [{ id: "e_wolf", count: 8, interval: 22 }, { id: "e_snake", count: 6, interval: 25 }], delay: 0 },
  { enemies: [{ id: "e_bear", count: 4, interval: 40 }, { id: "e_wolf", count: 6, interval: 25 }], delay: 0 },
  { enemies: [{ id: "e_eagle", count: 10, interval: 15 }, { id: "e_fox", count: 6, interval: 25 }], delay: 0 },
  { enemies: [{ id: "e_tiger", count: 4, interval: 35 }, { id: "e_demon", count: 4, interval: 30 }], delay: 0 },
  { enemies: [{ id: "e_tiger", count: 3, interval: 30 }, { id: "e_demon", count: 5, interval: 25 }, { id: "e_king", count: 1, interval: 1 }], delay: 0 },
  { enemies: [{ id: "e_wolf", count: 15, interval: 10 }, { id: "e_bear", count: 5, interval: 25 }], delay: 0 },
  { enemies: [{ id: "e_demon", count: 8, interval: 20 }, { id: "e_dragon", count: 2, interval: 50 }, { id: "e_king", count: 1, interval: 1 }], delay: 0 },
];

const GACHA_TOWERS: GachaTower[] = [
  { id: "g_cannon", name: "대포탑", emoji: "🔫", rarity: "rare", atk: 30, range: 90, atkSpeed: 35, cost: 90, desc: "강력한 대포!", bulletEmoji: "💥" },
  { id: "g_magic", name: "마법탑", emoji: "🪄", rarity: "rare", atk: 18, range: 110, atkSpeed: 20, cost: 100, desc: "마법 공격!", bulletEmoji: "✨" },
  { id: "g_poison", name: "독안개탑", emoji: "☠️", rarity: "rare", atk: 10, range: 80, atkSpeed: 25, cost: 85, desc: "지속 데미지!", bulletEmoji: "💀", special: "poison" },
  { id: "g_tesla", name: "테슬라탑", emoji: "⚡", rarity: "epic", atk: 22, range: 100, atkSpeed: 12, cost: 130, desc: "연쇄 번개!", bulletEmoji: "⚡", special: "chain" },
  { id: "g_sun", name: "태양탑", emoji: "☀️", rarity: "epic", atk: 40, range: 120, atkSpeed: 40, cost: 160, desc: "태양 광선!", bulletEmoji: "☀️" },
  { id: "g_shield", name: "보호막탑", emoji: "🛡️", rarity: "epic", atk: 0, range: 90, atkSpeed: 50, cost: 140, desc: "고양이 방어력 UP!", bulletEmoji: "🛡️", special: "shield" },
  { id: "g_rainbow", name: "무지개탑", emoji: "🌈", rarity: "legendary", atk: 50, range: 130, atkSpeed: 18, cost: 200, desc: "모든 적에게 강력!", bulletEmoji: "🌈" },
  { id: "g_black_hole", name: "블랙홀탑", emoji: "🕳️", rarity: "legendary", atk: 60, range: 80, atkSpeed: 45, cost: 250, desc: "적을 빨아들인다!", bulletEmoji: "🌀", special: "pull" },
  { id: "g_angel", name: "천사탑", emoji: "😇", rarity: "legendary", atk: 35, range: 150, atkSpeed: 20, cost: 220, desc: "최고의 탑!", bulletEmoji: "✦", special: "heal" },
];

const GACHA_COST = 80;
const GACHA_MULTI = 720;

function doGachaPull(): GachaTower {
  const r = Math.random();
  let rarity: GachaTower["rarity"];
  if (r < 0.55) rarity = "rare";
  else if (r < 0.90) rarity = "epic";
  else rarity = "legendary";
  const pool = GACHA_TOWERS.filter((t) => t.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

function rarityColor(r: string) { return r === "rare" ? "text-blue-400" : r === "epic" ? "text-purple-400" : "text-amber-400"; }
function rarityBorder(r: string) { return r === "rare" ? "border-blue-500/50" : r === "epic" ? "border-purple-500/50" : "border-amber-500/50 shadow-amber-500/20 shadow-lg"; }
function rarityLabel(r: string) { return r === "rare" ? "레어" : r === "epic" ? "에픽" : "전설"; }

const ARENA_W = 340;
const ARENA_H = 500;
const TICK = 33;

type Screen = "menu" | "catSelect" | "battle" | "placeTower" | "victory" | "defeat" | "gacha" | "gachaResult";

function getPathPos(idx: number): [number, number] {
  const i = Math.floor(idx);
  const frac = idx - i;
  if (i >= PATH.length - 1) return PATH[PATH.length - 1];
  const [x1, y1] = PATH[i];
  const [x2, y2] = PATH[i + 1];
  return [x1 + (x2 - x1) * frac, y1 + (y2 - y1) * frac];
}

function pathSegLen(i: number): number {
  if (i >= PATH.length - 1) return 0;
  const [x1, y1] = PATH[i];
  const [x2, y2] = PATH[i + 1];
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export default function CatGuardPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gold, setGold] = useState(200);
  const [totalGold, setTotalGold] = useState(0);
  const [selectedCat, setSelectedCat] = useState<CatType>(CATS[0]);
  const [highestWave, setHighestWave] = useState(0);

  // Gacha
  const [ownedGacha, setOwnedGacha] = useState<string[]>([]);
  const [gachaResults, setGachaResults] = useState<GachaTower[]>([]);

  // Battle
  const [catHp, setCatHp] = useState(500);
  const [catMaxHp, setCatMaxHp] = useState(500);
  const [wave, setWave] = useState(0);
  const [towers, setTowers] = useState<PlacedTower[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [battleGold, setBattleGold] = useState(150);
  const [waveActive, setWaveActive] = useState(false);
  const [selectedTower, setSelectedTower] = useState<string | null>(null);
  const [killCount, setKillCount] = useState(0);

  const uidRef = useRef(0);
  const bulletUidRef = useRef(0);
  const tickRef = useRef(0);
  const spawnRef = useRef<{ groupIdx: number; spawned: number; nextSpawn: number }[]>([]);

  const allTowers = useCallback((): TowerType[] => {
    const gacha: TowerType[] = GACHA_TOWERS.filter((g) => ownedGacha.includes(g.id)).map((g) => ({
      id: g.id, name: g.name, emoji: g.emoji, atk: g.atk, range: g.range,
      atkSpeed: g.atkSpeed, cost: g.cost, desc: g.desc, bulletEmoji: g.bulletEmoji, special: g.special,
    }));
    return [...TOWER_TYPES, ...gacha];
  }, [ownedGacha]);

  const startBattle = useCallback(() => {
    setCatHp(selectedCat.hp);
    setCatMaxHp(selectedCat.hp);
    setWave(0);
    setTowers([]);
    setEnemies([]);
    setBullets([]);
    setBattleGold(150);
    setWaveActive(false);
    setSelectedTower(null);
    setKillCount(0);
    tickRef.current = 0;
    uidRef.current = 0;
    bulletUidRef.current = 0;
    spawnRef.current = [];
    setScreen("battle");
  }, [selectedCat]);

  const startWave = useCallback(() => {
    if (wave >= WAVES.length) return;
    const w = WAVES[wave];
    spawnRef.current = w.enemies.map(() => ({ groupIdx: 0, spawned: 0, nextSpawn: w.delay }));
    setWaveActive(true);
    tickRef.current = 0;
  }, [wave]);

  // Place tower
  const placeTower = useCallback((x: number, y: number) => {
    if (!selectedTower) return;
    const tType = allTowers().find((t) => t.id === selectedTower);
    if (!tType || battleGold < tType.cost) return;
    // Check not on path (simple distance check)
    for (let i = 0; i < PATH.length; i++) {
      const [px, py] = PATH[i];
      if (Math.sqrt((x - px) ** 2 + (y - py) ** 2) < 25) return;
    }
    // Check not overlapping tower
    for (const t of towers) {
      if (Math.sqrt((x - t.x) ** 2 + (y - t.y) ** 2) < 30) return;
    }
    setBattleGold((g) => g - tType.cost);
    setTowers((prev) => [...prev, {
      uid: ++uidRef.current, typeId: tType.id, emoji: tType.emoji,
      x, y, atk: tType.atk, range: tType.range, atkSpeed: tType.atkSpeed,
      atkTimer: 0, bulletEmoji: tType.bulletEmoji, special: tType.special, level: 1,
    }]);
    setSelectedTower(null);
  }, [selectedTower, battleGold, towers, allTowers]);

  // Game loop
  useEffect(() => {
    if (screen !== "battle" || !waveActive) return;
    const currentWave = WAVES[wave];
    if (!currentWave) return;

    const interval = setInterval(() => {
      tickRef.current++;
      const tick = tickRef.current;

      // Spawn
      const timers = spawnRef.current;
      for (let gi = 0; gi < currentWave.enemies.length; gi++) {
        const group = currentWave.enemies[gi];
        const timer = timers[gi];
        if (timer.spawned >= group.count) continue;
        if (tick >= timer.nextSpawn) {
          const eType = ENEMY_TYPES.find((e) => e.id === group.id);
          if (eType) {
            const waveMul = 1 + wave * 0.15;
            setEnemies((prev) => [...prev, {
              uid: ++uidRef.current, typeId: eType.id, emoji: eType.emoji,
              hp: Math.floor(eType.hp * waveMul), maxHp: Math.floor(eType.hp * waveMul),
              speed: eType.speed, atk: Math.floor(eType.atk * waveMul),
              reward: eType.reward, pathIdx: 0, special: eType.special, slowed: 0,
            }]);
          }
          timer.spawned++;
          timer.nextSpawn = tick + group.interval;
        }
      }

      // Move enemies along path
      setEnemies((prev) => {
        const updated: Enemy[] = [];
        for (const e of prev) {
          const spd = e.slowed > 0 ? e.speed * 0.4 : e.speed;
          const segLen = pathSegLen(Math.floor(e.pathIdx));
          const advance = segLen > 0 ? spd / segLen * 0.5 : 0.01;
          const newIdx = e.pathIdx + advance;

          if (newIdx >= PATH.length - 1) {
            // Reached cat
            setCatHp((hp) => {
              const next = hp - e.atk;
              if (next <= 0) {
                if (wave > highestWave) setHighestWave(wave + 1);
                setScreen("defeat");
              }
              return Math.max(0, next);
            });
            continue;
          }
          updated.push({ ...e, pathIdx: newIdx, slowed: Math.max(0, e.slowed - 1) });
        }
        return updated;
      });

      // Tower shooting
      setTowers((prevTowers) => {
        const newBullets: Bullet[] = [];
        const updated = prevTowers.map((t) => {
          if (t.special === "heal") {
            // Heal tower: heal cat
            if (t.atkTimer + 1 >= t.atkSpeed) {
              setCatHp((hp) => Math.min(catMaxHp, hp + 5));
              return { ...t, atkTimer: 0 };
            }
            return { ...t, atkTimer: t.atkTimer + 1 };
          }

          const timer = t.atkTimer + 1;
          if (timer >= t.atkSpeed) {
            // Find target
            let target: Enemy | null = null;
            let minDist = Infinity;
            setEnemies((ens) => {
              for (const e of ens) {
                const [ex, ey] = getPathPos(e.pathIdx);
                const dist = Math.sqrt((ex - t.x) ** 2 + (ey - t.y) ** 2);
                if (dist < t.range && dist < minDist) {
                  minDist = dist;
                  target = e;
                }
              }
              return ens;
            });
            if (target) {
              newBullets.push({
                id: ++bulletUidRef.current,
                x: t.x, y: t.y, targetUid: (target as Enemy).uid,
                atk: t.atk, emoji: t.bulletEmoji, special: t.special,
              });
              return { ...t, atkTimer: 0 };
            }
          }
          return { ...t, atkTimer: timer };
        });
        if (newBullets.length > 0) setBullets((b) => [...b, ...newBullets]);
        return updated;
      });

      // Move bullets to target & hit
      setBullets((prev) => {
        const remaining: Bullet[] = [];
        for (const b of prev) {
          let hit = false;
          setEnemies((ens) => {
            const target = ens.find((e) => e.uid === b.targetUid);
            if (!target) { hit = true; return ens; }
            const [tx, ty] = getPathPos(target.pathIdx);
            const dx = tx - b.x, dy = ty - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 12) {
              hit = true;
              return ens.map((e) => {
                if (e.uid === b.targetUid) {
                  const newHp = e.hp - b.atk;
                  if (newHp <= 0) {
                    setBattleGold((g) => g + e.reward);
                    setKillCount((k) => k + 1);
                    return null as unknown as Enemy;
                  }
                  let slowed = e.slowed;
                  if (b.special === "slow") slowed = 30;
                  if (b.special === "freeze") slowed = 50;
                  return { ...e, hp: newHp, slowed };
                }
                // Splash damage
                if (b.special === "splash") {
                  const [ex, ey] = getPathPos(e.pathIdx);
                  const sd = Math.sqrt((tx - ex) ** 2 + (ty - ey) ** 2);
                  if (sd < 40 && e.uid !== b.targetUid) {
                    const sHp = e.hp - Math.floor(b.atk * 0.5);
                    if (sHp <= 0) {
                      setBattleGold((g) => g + e.reward);
                      setKillCount((k) => k + 1);
                      return null as unknown as Enemy;
                    }
                    return { ...e, hp: sHp };
                  }
                }
                return e;
              }).filter(Boolean) as Enemy[];
            }
            // Move bullet toward target
            const speed = 8;
            b.x += (dx / dist) * speed;
            b.y += (dy / dist) * speed;
            return ens;
          });
          if (!hit) remaining.push(b);
        }
        return remaining;
      });

      // Check wave end
      const allSpawned = timers.every((t, i) => t.spawned >= currentWave.enemies[i].count);
      if (allSpawned) {
        setEnemies((ens) => {
          if (ens.length === 0) {
            setWaveActive(false);
            setWave((w) => {
              const next = w + 1;
              if (next >= WAVES.length) {
                setTotalGold((g) => g + battleGold);
                if (next > highestWave) setHighestWave(next);
                setTimeout(() => setScreen("victory"), 300);
              }
              return next;
            });
            setBattleGold((g) => g + 20 + wave * 5);
          }
          return ens;
        });
      }
    }, TICK);

    return () => clearInterval(interval);
  }, [screen, waveActive, wave, catMaxHp, highestWave, battleGold]);

  const handleArenaClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedTower) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    placeTower(x, y);
  }, [selectedTower, placeTower]);

  const towerList = allTowers();

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-green-950 via-emerald-950 to-green-950 text-white">

      {/* MENU */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/20">← 홈</Link>
          <div className="text-7xl">🐱</div>
          <h1 className="text-4xl font-black">
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">고양이 지키기</span>
          </h1>
          <p className="text-emerald-300/70">타워를 세워 고양이를 지켜라!</p>

          <div className="flex flex-col gap-3 mt-4">
            <button onClick={() => setScreen("catSelect")} className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-12 py-4 text-xl font-black shadow-lg hover:scale-105 active:scale-95 transition-transform">
              🎮 게임 시작
            </button>
            <button onClick={() => setScreen("gacha")} className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-12 py-4 text-xl font-black shadow-lg hover:scale-105 active:scale-95 transition-transform">
              🎰 타워 뽑기!
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-white/5 px-6 py-3 space-y-1">
            <p className="text-sm text-emerald-300/60">🏆 최고 웨이브: <span className="font-bold text-amber-400">{highestWave}/{WAVES.length}</span></p>
            <p className="text-sm text-emerald-300/60">💰 총 골드: <span className="font-bold text-yellow-400">{totalGold}</span></p>
            <p className="text-sm text-emerald-300/60">🏗️ 보유 타워: <span className="font-bold text-purple-400">{ownedGacha.length}</span></p>
          </div>
        </div>
      )}

      {/* CAT SELECT */}
      {screen === "catSelect" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
          <h2 className="text-2xl font-black">🐱 고양이 선택</h2>
          <div className="grid grid-cols-2 gap-4">
            {CATS.map((cat) => (
              <button key={cat.id} onClick={() => { setSelectedCat(cat); startBattle(); }}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-white/10 bg-white/5 p-4 hover:border-amber-400 hover:scale-105 active:scale-95 transition-all">
                <span className="text-4xl">{cat.emoji}</span>
                <span className="font-bold">{cat.name}</span>
                <span className="text-xs text-slate-400">{cat.desc}</span>
                <span className="text-xs text-red-400">❤️ {cat.hp}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setScreen("menu")} className="text-sm text-slate-500 hover:text-white">← 뒤로</button>
        </div>
      )}

      {/* BATTLE */}
      {screen === "battle" && (
        <div className="flex flex-col items-center pt-2">
          <div className="mb-1 flex w-[340px] items-center justify-between px-1 text-sm">
            <span className="font-bold text-amber-400">🌊 Wave {wave + 1}/{WAVES.length}</span>
            <span className="text-yellow-400">💰 {battleGold}</span>
            <span className="text-slate-400">💀 {killCount}</span>
          </div>

          {/* Cat HP */}
          <div className="mb-1 h-3 w-[340px] overflow-hidden rounded-full bg-gray-800">
            <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all" style={{ width: `${(catHp / catMaxHp) * 100}%` }} />
          </div>
          <p className="mb-1 text-[10px] text-slate-400">{selectedCat.emoji} {selectedCat.name} HP: {catHp}/{catMaxHp}</p>

          {/* Arena */}
          <div
            className="relative overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-gradient-to-b from-green-900/40 to-emerald-900/40"
            style={{ width: ARENA_W, height: ARENA_H, cursor: selectedTower ? "crosshair" : "default" }}
            onClick={handleArenaClick}
          >
            {/* Path */}
            <svg className="absolute inset-0 pointer-events-none" width={ARENA_W} height={ARENA_H}>
              <polyline points={PATH.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="20" strokeLinejoin="round" strokeLinecap="round" />
              <polyline points={PATH.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="rgba(139,69,19,0.3)" strokeWidth="16" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4,8" />
            </svg>

            {/* Cat at end */}
            <div className="absolute" style={{ left: PATH[PATH.length - 1][0] - 16, top: PATH[PATH.length - 1][1] - 16 }}>
              <span className="text-3xl">{selectedCat.emoji}</span>
            </div>

            {/* Towers */}
            {towers.map((t) => (
              <div key={t.uid} className="absolute flex flex-col items-center" style={{ left: t.x - 14, top: t.y - 14 }}>
                <span className="text-2xl">{t.emoji}</span>
                {/* Range circle when selected */}
              </div>
            ))}

            {/* Enemies */}
            {enemies.map((e) => {
              const [ex, ey] = getPathPos(e.pathIdx);
              return (
                <div key={e.uid} className="absolute flex flex-col items-center transition-none" style={{ left: ex - 10, top: ey - 12 }}>
                  <span className="text-lg">{e.emoji}</span>
                  <div className="h-1 w-5 rounded-full bg-gray-700">
                    <div className={`h-full rounded-full ${e.special === "boss" ? "bg-red-500" : "bg-red-400"}`} style={{ width: `${(e.hp / e.maxHp) * 100}%` }} />
                  </div>
                </div>
              );
            })}

            {/* Bullets */}
            {bullets.map((b) => (
              <div key={b.id} className="absolute text-xs" style={{ left: b.x - 4, top: b.y - 4 }}>{b.emoji}</div>
            ))}
          </div>

          {/* Tower bar */}
          <div className="mt-2 flex gap-1.5 overflow-x-auto w-[340px] pb-1">
            {towerList.map((t) => (
              <button key={t.id} onClick={() => setSelectedTower(selectedTower === t.id ? null : t.id)}
                className={`flex flex-col items-center rounded-lg border px-2 py-1.5 min-w-[50px] text-[10px] transition-all ${
                  selectedTower === t.id ? "border-amber-400 bg-amber-500/20" : battleGold >= t.cost ? "border-white/20 bg-white/10 hover:bg-white/20" : "border-gray-700 bg-black/30 opacity-50"
                }`}>
                <span className="text-lg">{t.emoji}</span>
                <span className="font-bold truncate w-full text-center">{t.name}</span>
                <span className="text-amber-400">💰{t.cost}</span>
              </button>
            ))}
          </div>

          {/* Wave button */}
          {!waveActive && wave < WAVES.length && (
            <button onClick={startWave} className="mt-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-8 py-2 font-bold animate-pulse hover:scale-105 active:scale-95 transition-transform">
              🌊 웨이브 {wave + 1} 시작!
            </button>
          )}
          {selectedTower && <p className="mt-1 text-xs text-amber-400">맵을 클릭해서 타워를 배치하세요!</p>}
        </div>
      )}

      {/* VICTORY */}
      {screen === "victory" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">🎉</div>
          <h2 className="text-3xl font-black text-amber-400">승리! 고양이를 지켰다!</h2>
          <div className="text-5xl">{selectedCat.emoji}</div>
          <div className="rounded-xl bg-white/5 px-6 py-4 space-y-2">
            <p>💀 처치: <span className="font-bold text-red-400">{killCount}</span></p>
            <p>💰 획득 골드: <span className="font-bold text-yellow-400">{battleGold}</span></p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setScreen("menu")} className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3 font-bold hover:scale-105 active:scale-95 transition-transform">메뉴로</button>
          </div>
        </div>
      )}

      {/* DEFEAT */}
      {screen === "defeat" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">😿</div>
          <h2 className="text-3xl font-black text-red-400">고양이가 당했다...</h2>
          <p className="text-slate-400">Wave {wave + 1}에서 실패</p>
          <div className="flex gap-3">
            <button onClick={() => { startBattle(); }} className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-8 py-3 font-bold hover:scale-105 active:scale-95 transition-transform">🔄 재도전</button>
            <button onClick={() => setScreen("menu")} className="rounded-xl bg-white/10 px-8 py-3 font-bold">메뉴</button>
          </div>
        </div>
      )}

      {/* GACHA */}
      {screen === "gacha" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <h2 className="text-2xl font-black">🎰 타워 뽑기</h2>
          <p className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">특수 타워를 획득하라!</p>
          <p className="text-yellow-400 font-bold text-lg">💰 {totalGold} 골드</p>

          <div className="flex gap-4 mt-4">
            <button onClick={() => {
              if (totalGold < GACHA_COST) return;
              setTotalGold((g) => g - GACHA_COST);
              const r = doGachaPull();
              setGachaResults([r]);
              if (!ownedGacha.includes(r.id)) setOwnedGacha((p) => [...p, r.id]);
              setScreen("gachaResult");
            }} disabled={totalGold < GACHA_COST}
              className={`rounded-xl px-8 py-4 font-black shadow-lg hover:scale-105 active:scale-95 transition-transform ${totalGold >= GACHA_COST ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}>
              1회 뽑기<br /><span className="text-xs">{GACHA_COST} 💰</span>
            </button>
            <button onClick={() => {
              if (totalGold < GACHA_MULTI) return;
              setTotalGold((g) => g - GACHA_MULTI);
              const results: GachaTower[] = [];
              for (let i = 0; i < 10; i++) { const r = doGachaPull(); results.push(r); if (!ownedGacha.includes(r.id)) setOwnedGacha((p) => [...p, r.id]); }
              setGachaResults(results);
              setScreen("gachaResult");
            }} disabled={totalGold < GACHA_MULTI}
              className={`rounded-xl px-8 py-4 font-black shadow-lg hover:scale-105 active:scale-95 transition-transform ${totalGold >= GACHA_MULTI ? "bg-gradient-to-r from-amber-500 to-red-500" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}>
              10연차!<br /><span className="text-xs">{GACHA_MULTI} 💰</span>
            </button>
          </div>

          {ownedGacha.length > 0 && (
            <div className="mt-6 w-full max-w-md">
              <p className="mb-2 text-sm font-bold text-purple-400">🏗️ 보유 특수 타워 ({ownedGacha.length})</p>
              <div className="grid grid-cols-4 gap-2">
                {ownedGacha.map((gid) => {
                  const g = GACHA_TOWERS.find((t) => t.id === gid); if (!g) return null;
                  return (<div key={gid} className={`flex flex-col items-center rounded-lg border-2 p-2 text-xs bg-white/5 ${rarityBorder(g.rarity)}`}>
                    <span className="text-xl">{g.emoji}</span><span className={`font-bold ${rarityColor(g.rarity)}`}>{g.name}</span>
                  </div>);
                })}
              </div>
            </div>
          )}

          <div className="mt-4 w-full max-w-md">
            <p className="mb-2 text-sm font-bold text-slate-400">📖 타워 도감</p>
            <div className="grid grid-cols-5 gap-1.5">
              {GACHA_TOWERS.map((t) => {
                const owned = ownedGacha.includes(t.id);
                return (<div key={t.id} className={`flex flex-col items-center rounded-lg border p-1.5 text-[10px] ${owned ? `${rarityBorder(t.rarity)} bg-white/5` : "border-gray-800 bg-black/30 opacity-40"}`}>
                  <span className="text-lg">{owned ? t.emoji : "❓"}</span><span className={rarityColor(t.rarity)}>{owned ? t.name : "???"}</span>
                </div>);
              })}
            </div>
          </div>

          <button onClick={() => setScreen("menu")} className="mt-4 text-sm text-slate-500 hover:text-white">← 뒤로</button>
        </div>
      )}

      {/* GACHA RESULT */}
      {screen === "gachaResult" && gachaResults.length > 0 && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-2xl font-black">{gachaResults.length === 1 ? "🎊 뽑기 결과!" : "🎊 10연차 결과!"}</h2>
          <div className={`grid ${gachaResults.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-5"} gap-3 w-full max-w-lg`}>
            {gachaResults.map((t, i) => (
              <div key={i} className={`flex flex-col items-center gap-1 rounded-xl border-2 bg-gradient-to-b from-white/10 to-white/5 p-3 ${rarityBorder(t.rarity)}`}>
                {t.rarity === "legendary" && <span className="text-[10px] text-amber-400 animate-pulse">★ 전설 ★</span>}
                <span className={gachaResults.length === 1 ? "text-6xl" : "text-3xl"}>{t.emoji}</span>
                <span className={`font-bold text-sm ${rarityColor(t.rarity)}`}>{t.name}</span>
                {gachaResults.length === 1 && <p className="text-xs text-slate-400">{t.desc}</p>}
                <span className={`text-[10px] ${rarityColor(t.rarity)}`}>{rarityLabel(t.rarity)}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setScreen("gacha")} className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform">다시 뽑기! 🎰</button>
          <button onClick={() => setScreen("menu")} className="text-sm text-slate-500 hover:text-white">메뉴로</button>
        </div>
      )}
    </div>
  );
}
