"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

// --- Types ---
interface CellType {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  atkSpeed: number;
  range: number;
  speed: number;
  cost: number;
  cooldown: number;
  desc: string;
  bulletEmoji: string;
  special?: string;
}

interface VirusType {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  speed: number;
  reward: number;
  size: number;
  special?: string;
}

interface Unit {
  uid: number;
  typeId: string;
  emoji: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  range: number;
  speed: number;
  atkSpeed: number;
  atkTimer: number;
  side: "cell" | "virus";
  bulletEmoji: string;
  special?: string;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  atk: number;
  emoji: string;
  side: "cell" | "virus";
  pierce: boolean;
  hit: Set<number>;
}

interface Stage {
  id: number;
  name: string;
  emoji: string;
  desc: string;
  waves: { virusId: string; count: number; delay: number; interval: number }[];
  reward: number;
}

// --- Gacha ---
type GachaRarity = "common" | "rare" | "epic" | "legendary";

interface GachaCell {
  id: string;
  name: string;
  emoji: string;
  rarity: GachaRarity;
  hp: number;
  atk: number;
  atkSpeed: number;
  range: number;
  speed: number;
  cost: number;
  cooldown: number;
  desc: string;
  bulletEmoji: string;
  special?: string;
}

// --- Data ---
const CELL_TYPES: CellType[] = [
  { id: "rbc", name: "적혈구", emoji: "🔴", hp: 80, atk: 8, atkSpeed: 30, range: 120, speed: 1.5, cost: 30, cooldown: 20, desc: "기본 세포", bulletEmoji: "•" },
  { id: "wbc", name: "백혈구", emoji: "⚪", hp: 150, atk: 15, atkSpeed: 25, range: 100, speed: 1.0, cost: 60, cooldown: 30, desc: "면역의 선봉장", bulletEmoji: "◦" },
  { id: "platelet", name: "혈소판", emoji: "🩹", hp: 200, atk: 5, atkSpeed: 40, range: 80, speed: 0.8, cost: 50, cooldown: 35, desc: "높은 체력의 방어 세포", bulletEmoji: "•", special: "tank" },
  { id: "tcell", name: "T세포", emoji: "🛡️", hp: 120, atk: 25, atkSpeed: 20, range: 150, speed: 1.2, cost: 100, cooldown: 40, desc: "강력한 면역 세포", bulletEmoji: "✦" },
  { id: "bcell", name: "B세포", emoji: "💉", hp: 90, atk: 20, atkSpeed: 35, range: 200, speed: 0.6, cost: 80, cooldown: 45, desc: "항체를 발사하는 원거리", bulletEmoji: "💧" },
  { id: "nk", name: "NK세포", emoji: "⚡", hp: 100, atk: 35, atkSpeed: 15, range: 110, speed: 1.8, cost: 120, cooldown: 50, desc: "초고속 킬러 세포", bulletEmoji: "⚡" },
  { id: "macro", name: "대식세포", emoji: "🟣", hp: 300, atk: 18, atkSpeed: 30, range: 90, speed: 0.5, cost: 150, cooldown: 60, desc: "적을 삼키는 거대 세포", bulletEmoji: "◆", special: "splash" },
  { id: "dendrite", name: "수지상세포", emoji: "🌟", hp: 80, atk: 10, atkSpeed: 40, range: 250, speed: 0.4, cost: 200, cooldown: 70, desc: "아군 공격력 버프", bulletEmoji: "✧", special: "buff" },
];

const VIRUS_TYPES: VirusType[] = [
  { id: "v_cold", name: "감기 바이러스", emoji: "🦠", hp: 50, atk: 5, speed: 1.0, reward: 10, size: 16 },
  { id: "v_flu", name: "독감", emoji: "🤧", hp: 80, atk: 8, speed: 1.2, reward: 15, size: 16 },
  { id: "v_bacteria", name: "세균", emoji: "🧫", hp: 60, atk: 10, speed: 0.8, reward: 12, size: 18 },
  { id: "v_parasite", name: "기생충", emoji: "🐛", hp: 100, atk: 6, speed: 1.5, reward: 18, size: 14 },
  { id: "v_fungus", name: "곰팡이", emoji: "🍄", hp: 120, atk: 12, speed: 0.6, reward: 20, size: 20, special: "slow" },
  { id: "v_toxin", name: "독소", emoji: "☠️", hp: 70, atk: 20, speed: 1.3, reward: 25, size: 16, special: "poison" },
  { id: "v_cancer", name: "암세포", emoji: "👾", hp: 200, atk: 15, speed: 0.4, reward: 35, size: 22, special: "split" },
  { id: "v_super", name: "슈퍼 바이러스", emoji: "💀", hp: 300, atk: 25, speed: 0.5, reward: 50, size: 24 },
  { id: "v_boss_covid", name: "코로나", emoji: "🦠", hp: 800, atk: 30, speed: 0.3, reward: 200, size: 32 },
  { id: "v_boss_plague", name: "흑사병", emoji: "🖤", hp: 1500, atk: 50, speed: 0.25, reward: 400, size: 36 },
  { id: "v_boss_zombie", name: "좀비 바이러스", emoji: "🧟", hp: 2500, atk: 70, speed: 0.2, reward: 600, size: 40 },
];

const STAGES: Stage[] = [
  { id: 1, name: "감기 침공", emoji: "🤧", desc: "감기 바이러스가 몰려온다!", waves: [
    { virusId: "v_cold", count: 8, delay: 0, interval: 40 },
  ], reward: 50 },
  { id: 2, name: "독감 시즌", emoji: "🌡️", desc: "독감이 유행이다!", waves: [
    { virusId: "v_cold", count: 5, delay: 0, interval: 35 },
    { virusId: "v_flu", count: 5, delay: 60, interval: 30 },
  ], reward: 80 },
  { id: 3, name: "세균 감염", emoji: "🧫", desc: "세균이 침투했다!", waves: [
    { virusId: "v_bacteria", count: 8, delay: 0, interval: 30 },
    { virusId: "v_cold", count: 5, delay: 30, interval: 40 },
  ], reward: 100 },
  { id: 4, name: "기생충의 습격", emoji: "🐛", desc: "빠른 기생충을 조심!", waves: [
    { virusId: "v_parasite", count: 10, delay: 0, interval: 20 },
    { virusId: "v_bacteria", count: 5, delay: 40, interval: 30 },
  ], reward: 120 },
  { id: 5, name: "코로나 보스", emoji: "😷", desc: "코로나 바이러스 등장!", waves: [
    { virusId: "v_cold", count: 6, delay: 0, interval: 30 },
    { virusId: "v_flu", count: 6, delay: 50, interval: 25 },
    { virusId: "v_boss_covid", count: 1, delay: 100, interval: 1 },
  ], reward: 250 },
  { id: 6, name: "곰팡이 오염", emoji: "🍄", desc: "곰팡이가 퍼지고 있다!", waves: [
    { virusId: "v_fungus", count: 8, delay: 0, interval: 25 },
    { virusId: "v_bacteria", count: 8, delay: 40, interval: 30 },
  ], reward: 150 },
  { id: 7, name: "독소 침투", emoji: "☠️", desc: "치명적인 독소를 막아라!", waves: [
    { virusId: "v_toxin", count: 8, delay: 0, interval: 20 },
    { virusId: "v_fungus", count: 5, delay: 50, interval: 30 },
  ], reward: 180 },
  { id: 8, name: "암세포 발견", emoji: "👾", desc: "암세포가 분열한다!", waves: [
    { virusId: "v_cancer", count: 5, delay: 0, interval: 40 },
    { virusId: "v_toxin", count: 6, delay: 30, interval: 25 },
  ], reward: 200 },
  { id: 9, name: "슈퍼 바이러스", emoji: "💀", desc: "변이 바이러스가 왔다!", waves: [
    { virusId: "v_super", count: 6, delay: 0, interval: 30 },
    { virusId: "v_cancer", count: 4, delay: 50, interval: 35 },
    { virusId: "v_toxin", count: 8, delay: 80, interval: 20 },
  ], reward: 300 },
  { id: 10, name: "흑사병 보스", emoji: "🖤", desc: "역사상 최악의 전염병!", waves: [
    { virusId: "v_super", count: 5, delay: 0, interval: 25 },
    { virusId: "v_cancer", count: 5, delay: 40, interval: 30 },
    { virusId: "v_boss_plague", count: 1, delay: 100, interval: 1 },
  ], reward: 500 },
  { id: 11, name: "총력전", emoji: "💥", desc: "모든 바이러스가 동시에!", waves: [
    { virusId: "v_flu", count: 10, delay: 0, interval: 15 },
    { virusId: "v_parasite", count: 10, delay: 20, interval: 12 },
    { virusId: "v_fungus", count: 8, delay: 50, interval: 20 },
    { virusId: "v_super", count: 5, delay: 80, interval: 25 },
  ], reward: 400 },
  { id: 12, name: "좀비 바이러스", emoji: "🧟", desc: "최종 보스! 인류의 운명은?", waves: [
    { virusId: "v_super", count: 8, delay: 0, interval: 20 },
    { virusId: "v_cancer", count: 6, delay: 30, interval: 25 },
    { virusId: "v_toxin", count: 10, delay: 60, interval: 15 },
    { virusId: "v_boss_zombie", count: 1, delay: 120, interval: 1 },
  ], reward: 800 },
];

const GACHA_CELLS: GachaCell[] = [
  { id: "g_antibody", name: "항체포탑", emoji: "🏗️", rarity: "common", hp: 100, atk: 12, atkSpeed: 25, range: 180, speed: 0, cost: 70, cooldown: 35, desc: "고정형 항체 발사기", bulletEmoji: "💧" },
  { id: "g_neutro", name: "호중구", emoji: "🔵", rarity: "common", hp: 130, atk: 14, atkSpeed: 22, range: 110, speed: 1.3, cost: 65, cooldown: 30, desc: "균형잡힌 면역세포", bulletEmoji: "•" },
  { id: "g_eosino", name: "호산구", emoji: "🟠", rarity: "rare", hp: 110, atk: 22, atkSpeed: 20, range: 130, speed: 1.0, cost: 90, cooldown: 40, desc: "기생충 특효!", bulletEmoji: "✦", special: "antiparasite" },
  { id: "g_baso", name: "호염기구", emoji: "🟤", rarity: "rare", hp: 90, atk: 18, atkSpeed: 30, range: 160, speed: 0.8, cost: 85, cooldown: 38, desc: "독소를 중화하는 세포", bulletEmoji: "◆", special: "antitoxin" },
  { id: "g_mast", name: "비만세포", emoji: "💣", rarity: "rare", hp: 160, atk: 30, atkSpeed: 45, range: 100, speed: 0.6, cost: 110, cooldown: 50, desc: "범위 폭발 공격!", bulletEmoji: "💥", special: "splash" },
  { id: "g_stem", name: "줄기세포", emoji: "🌱", rarity: "epic", hp: 200, atk: 10, atkSpeed: 40, range: 80, speed: 0.5, cost: 180, cooldown: 60, desc: "아군을 회복하는 세포", bulletEmoji: "💚", special: "heal" },
  { id: "g_car_t", name: "CAR-T세포", emoji: "🚗", rarity: "epic", hp: 150, atk: 45, atkSpeed: 18, range: 120, speed: 1.5, cost: 200, cooldown: 55, desc: "암세포 특화 킬러!", bulletEmoji: "🔥", special: "anticancer" },
  { id: "g_nano", name: "나노봇", emoji: "🤖", rarity: "epic", hp: 80, atk: 30, atkSpeed: 10, range: 140, speed: 2.0, cost: 160, cooldown: 45, desc: "초고속 정밀 타격", bulletEmoji: "⚡" },
  { id: "g_vaccine", name: "백신세포", emoji: "💉", rarity: "legendary", hp: 250, atk: 50, atkSpeed: 20, range: 200, speed: 1.0, cost: 300, cooldown: 80, desc: "바이러스의 천적!", bulletEmoji: "✨", special: "antivirus" },
  { id: "g_immune", name: "면역왕", emoji: "👑", rarity: "legendary", hp: 400, atk: 40, atkSpeed: 15, range: 180, speed: 0.8, cost: 350, cooldown: 90, desc: "모든 아군 강화!", bulletEmoji: "⭐", special: "buff" },
  { id: "g_god", name: "신의 세포", emoji: "🌟", rarity: "legendary", hp: 500, atk: 60, atkSpeed: 12, range: 250, speed: 1.2, cost: 400, cooldown: 100, desc: "궁극의 면역세포", bulletEmoji: "🌟" },
];

const GACHA_SINGLE = 100;
const GACHA_MULTI = 900;

function doGachaPull(): GachaCell {
  const r = Math.random();
  let rarity: GachaRarity;
  if (r < 0.45) rarity = "common";
  else if (r < 0.78) rarity = "rare";
  else if (r < 0.95) rarity = "epic";
  else rarity = "legendary";
  const pool = GACHA_CELLS.filter((c) => c.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

function rarityColor(r: GachaRarity) {
  return r === "common" ? "text-gray-400" : r === "rare" ? "text-blue-400" : r === "epic" ? "text-purple-400" : "text-amber-400";
}
function rarityBorder(r: GachaRarity) {
  return r === "common" ? "border-gray-500/30" : r === "rare" ? "border-blue-500/50" : r === "epic" ? "border-purple-500/50" : "border-amber-500/50 shadow-amber-500/20 shadow-lg";
}
function rarityLabel(r: GachaRarity) {
  return r === "common" ? "일반" : r === "rare" ? "레어" : r === "epic" ? "에픽" : "전설";
}

// --- Constants ---
const ARENA_W = 360;
const ARENA_H = 500;
const TICK = 33;
const BASE_X = ARENA_W - 30;

type Screen = "menu" | "stageSelect" | "battle" | "victory" | "defeat" | "gacha" | "gachaResult";

export default function CellPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [dna, setDna] = useState(300);
  const [clearedStages, setClearedStages] = useState<number[]>([]);

  // Gacha
  const [ownedGacha, setOwnedGacha] = useState<string[]>([]);
  const [gachaResults, setGachaResults] = useState<GachaCell[]>([]);

  // Battle
  const [currentStage, setCurrentStage] = useState<Stage>(STAGES[0]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [energy, setEnergy] = useState(100);
  const [baseHp, setBaseHp] = useState(500);
  const [baseMaxHp, setBaseMaxHp] = useState(500);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [killCount, setKillCount] = useState(0);
  const [earnedDna, setEarnedDna] = useState(0);
  const [battleWon, setBattleWon] = useState(false);

  const uidRef = useRef(0);
  const bulletUidRef = useRef(0);
  const tickRef = useRef(0);
  const spawnTimerRef = useRef<{ waveIdx: number; spawnCount: number; nextSpawn: number }[]>([]);

  const allCells = useCallback((): CellType[] => {
    const gachaCells: CellType[] = GACHA_CELLS.filter((g) => ownedGacha.includes(g.id)).map((g) => ({
      id: g.id, name: g.name, emoji: g.emoji, hp: g.hp, atk: g.atk, atkSpeed: g.atkSpeed,
      range: g.range, speed: g.speed, cost: g.cost, cooldown: g.cooldown, desc: g.desc,
      bulletEmoji: g.bulletEmoji, special: g.special,
    }));
    return [...CELL_TYPES, ...gachaCells];
  }, [ownedGacha]);

  // Start battle
  const startBattle = useCallback((stage: Stage) => {
    setCurrentStage(stage);
    setUnits([]);
    setBullets([]);
    setEnergy(100);
    setBaseHp(500);
    setBaseMaxHp(500);
    setCooldowns({});
    setKillCount(0);
    setEarnedDna(0);
    setBattleWon(false);
    tickRef.current = 0;
    uidRef.current = 0;
    bulletUidRef.current = 0;
    spawnTimerRef.current = stage.waves.map((w) => ({ waveIdx: 0, spawnCount: 0, nextSpawn: w.delay }));
    setScreen("battle");
  }, []);

  // Deploy cell
  const deployCell = useCallback((cell: CellType) => {
    if (energy < cell.cost || (cooldowns[cell.id] ?? 0) > 0) return;
    setEnergy((e) => e - cell.cost);
    setCooldowns((cd) => ({ ...cd, [cell.id]: cell.cooldown }));
    const yPos = 80 + Math.random() * (ARENA_H - 160);
    setUnits((prev) => [...prev, {
      uid: ++uidRef.current,
      typeId: cell.id,
      emoji: cell.emoji,
      x: 30,
      y: yPos,
      hp: cell.hp,
      maxHp: cell.hp,
      atk: cell.atk,
      range: cell.range,
      speed: cell.speed,
      atkSpeed: cell.atkSpeed,
      atkTimer: 0,
      side: "cell",
      bulletEmoji: cell.bulletEmoji,
      special: cell.special,
    }]);
  }, [energy, cooldowns]);

  // Game loop
  useEffect(() => {
    if (screen !== "battle") return;

    const interval = setInterval(() => {
      tickRef.current++;
      const tick = tickRef.current;

      // Energy regen
      if (tick % 8 === 0) setEnergy((e) => Math.min(e + 3, 999));

      // Cooldowns
      setCooldowns((cd) => {
        const next: Record<string, number> = {};
        for (const [k, v] of Object.entries(cd)) {
          if (v > 1) next[k] = v - 1;
        }
        return next;
      });

      // Spawn viruses
      const stage = currentStage;
      const timers = spawnTimerRef.current;
      for (let wi = 0; wi < stage.waves.length; wi++) {
        const wave = stage.waves[wi];
        const timer = timers[wi];
        if (timer.spawnCount >= wave.count) continue;
        if (tick >= timer.nextSpawn) {
          const vType = VIRUS_TYPES.find((v) => v.id === wave.virusId);
          if (vType) {
            const yPos = 60 + Math.random() * (ARENA_H - 120);
            setUnits((prev) => [...prev, {
              uid: ++uidRef.current,
              typeId: vType.id,
              emoji: vType.emoji,
              x: ARENA_W + 10,
              y: yPos,
              hp: vType.hp,
              maxHp: vType.hp,
              atk: vType.atk,
              range: 30,
              speed: vType.speed,
              atkSpeed: 30,
              atkTimer: 0,
              side: "virus",
              bulletEmoji: "•",
              special: vType.special,
            }]);
          }
          timer.spawnCount++;
          timer.nextSpawn = tick + wave.interval;
        }
      }

      // Move & attack
      setUnits((prev) => {
        const cells = prev.filter((u) => u.side === "cell");
        const viruses = prev.filter((u) => u.side === "virus");

        // Move viruses left
        const movedViruses = viruses.map((v) => {
          const blocked = cells.some((c) => Math.abs(c.y - v.y) < 20 && c.x < v.x && v.x - c.x < 30);
          if (blocked) return v;
          return { ...v, x: v.x - v.speed };
        });

        // Move cells right
        const movedCells = cells.map((c) => {
          if (c.speed === 0) return c; // turret
          const enemyAhead = movedViruses.some((v) => Math.abs(c.y - v.y) < 25 && v.x > c.x && v.x - c.x < c.range);
          if (enemyAhead) return c;
          return { ...c, x: Math.min(c.x + c.speed, ARENA_W - 40) };
        });

        // Shooting
        const newBullets: Bullet[] = [];
        const updatedCells = movedCells.map((c) => {
          const timer = c.atkTimer + 1;
          if (timer >= c.atkSpeed) {
            const target = movedViruses
              .filter((v) => Math.sqrt((v.x - c.x) ** 2 + (v.y - c.y) ** 2) < c.range)
              .sort((a, b) => a.x - b.x)[0];
            if (target) {
              const dx = target.x - c.x;
              const dy = target.y - c.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              newBullets.push({
                id: ++bulletUidRef.current,
                x: c.x + 10, y: c.y,
                dx: (dx / dist) * 6, dy: (dy / dist) * 6,
                atk: c.atk, emoji: c.bulletEmoji,
                side: "cell", pierce: c.special === "splash", hit: new Set(),
              });
              return { ...c, atkTimer: 0 };
            }
          }
          return { ...c, atkTimer: timer };
        });

        // Virus attacks (melee on base)
        const updatedViruses = movedViruses.map((v) => {
          if (v.x <= 35) {
            const timer = v.atkTimer + 1;
            if (timer >= v.atkSpeed) {
              setBaseHp((hp) => {
                const next = hp - v.atk;
                if (next <= 0) setScreen("defeat");
                return Math.max(0, next);
              });
              return { ...v, atkTimer: 0 };
            }
            return { ...v, atkTimer: timer };
          }
          return v;
        });

        if (newBullets.length > 0) {
          setBullets((b) => [...b, ...newBullets]);
        }

        return [...updatedCells, ...updatedViruses];
      });

      // Move bullets & collision
      setBullets((prev) => {
        const remaining: Bullet[] = [];
        const damage = new Map<number, number>();

        const moved = prev.map((b) => ({ ...b, x: b.x + b.dx, y: b.y + b.dy }));

        for (const b of moved) {
          if (b.x < -20 || b.x > ARENA_W + 20 || b.y < -20 || b.y > ARENA_H + 20) continue;

          let hitSomething = false;
          setUnits((units) => {
            for (const u of units) {
              if (u.side === b.side) continue;
              if (b.hit.has(u.uid)) continue;
              const dist = Math.sqrt((b.x - u.x) ** 2 + (b.y - u.y) ** 2);
              if (dist < 18) {
                damage.set(u.uid, (damage.get(u.uid) ?? 0) + b.atk);
                b.hit.add(u.uid);
                hitSomething = true;
                if (!b.pierce) break;
              }
            }
            return units;
          });
          if (!hitSomething || b.pierce) remaining.push(b);
        }

        if (damage.size > 0) {
          setUnits((units) => {
            const alive: Unit[] = [];
            let kills = 0;
            let dnaEarned = 0;
            for (const u of units) {
              const dmg = damage.get(u.uid) ?? 0;
              const newHp = u.hp - dmg;
              if (newHp <= 0) {
                if (u.side === "virus") {
                  kills++;
                  const vType = VIRUS_TYPES.find((v) => v.id === u.typeId);
                  dnaEarned += vType?.reward ?? 10;
                }
              } else {
                alive.push({ ...u, hp: newHp });
              }
            }
            if (kills > 0) {
              setKillCount((k) => k + kills);
              setEarnedDna((d) => d + dnaEarned);
            }
            return alive;
          });
        }

        return remaining;
      });

      // Check victory
      const allSpawned = spawnTimerRef.current.every((t, i) => t.spawnCount >= stage.waves[i].count);
      if (allSpawned && tick > 60) {
        setUnits((prev) => {
          const virusesLeft = prev.filter((u) => u.side === "virus");
          if (virusesLeft.length === 0 && !battleWon) {
            setBattleWon(true);
            setDna((d) => d + earnedDna + stage.reward);
            setClearedStages((cs) => cs.includes(stage.id) ? cs : [...cs, stage.id]);
            setTimeout(() => setScreen("victory"), 500);
          }
          return prev;
        });
      }
    }, TICK);

    return () => clearInterval(interval);
  }, [screen, currentStage, battleWon, earnedDna]);

  const cells = allCells();

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-rose-950 via-red-950 to-rose-950 text-white">

      {/* === MENU === */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/20">← 홈</Link>
          <div className="text-7xl">🔴</div>
          <h1 className="text-4xl font-black">
            <span className="bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">세포특공대</span>
          </h1>
          <p className="text-lg text-rose-300/70">바이러스를 물리치고 몸을 지켜라!</p>

          <div className="flex flex-col gap-3 mt-4">
            <button onClick={() => setScreen("stageSelect")} className="rounded-xl bg-gradient-to-r from-red-500 to-rose-500 px-12 py-4 text-xl font-black shadow-lg hover:scale-105 active:scale-95 transition-transform">
              🦠 스테이지 선택
            </button>
            <button onClick={() => setScreen("gacha")} className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-12 py-4 text-xl font-black shadow-lg hover:scale-105 active:scale-95 transition-transform">
              🧬 세포 뽑기!
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-white/5 px-6 py-3 space-y-1">
            <p className="text-sm text-rose-300/60">🧬 DNA: <span className="font-bold text-green-400">{dna}</span></p>
            <p className="text-sm text-rose-300/60">📊 클리어: <span className="font-bold text-cyan-400">{clearedStages.length}/{STAGES.length}</span></p>
            <p className="text-sm text-rose-300/60">🔬 보유 세포: <span className="font-bold text-purple-400">{ownedGacha.length}</span></p>
          </div>
        </div>
      )}

      {/* === STAGE SELECT === */}
      {screen === "stageSelect" && (
        <div className="w-full max-w-md px-4 py-6">
          <h2 className="mb-4 text-2xl font-black">🦠 스테이지</h2>
          <div className="space-y-2">
            {STAGES.map((stage) => {
              const unlocked = stage.id === 1 || clearedStages.includes(stage.id - 1);
              const cleared = clearedStages.includes(stage.id);
              return (
                <button
                  key={stage.id}
                  onClick={() => unlocked && startBattle(stage)}
                  disabled={!unlocked}
                  className={`w-full rounded-xl border p-3 text-left transition-all ${
                    unlocked ? "border-white/10 bg-white/5 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]" : "border-gray-800 bg-black/20 opacity-40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{unlocked ? stage.emoji : "🔒"}</span>
                    <div className="flex-1">
                      <p className="font-bold">{stage.id}. {stage.name}</p>
                      <p className="text-xs text-slate-400">{stage.desc}</p>
                    </div>
                    {cleared && <span className="text-green-400">✅</span>}
                    {unlocked && !cleared && <span className="text-xs text-amber-400">🧬+{stage.reward}</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={() => setScreen("menu")} className="mt-4 text-sm text-slate-500 hover:text-white">← 뒤로</button>
        </div>
      )}

      {/* === BATTLE === */}
      {screen === "battle" && (
        <div className="flex flex-col items-center pt-2">
          <div className="mb-1 flex w-[360px] items-center justify-between px-2 text-sm">
            <span className="font-bold">{currentStage.emoji} {currentStage.name}</span>
            <span className="text-yellow-400">⚡{energy}</span>
            <span className="text-slate-400">💀 {killCount}</span>
          </div>

          {/* Base HP */}
          <div className="mb-1 h-3 w-[360px] overflow-hidden rounded-full bg-gray-800">
            <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all" style={{ width: `${(baseHp / baseMaxHp) * 100}%` }} />
          </div>
          <p className="mb-1 text-[10px] text-slate-400">🏥 기지 HP: {baseHp}/{baseMaxHp}</p>

          {/* Arena */}
          <div className="relative overflow-hidden rounded-xl border-2 border-rose-500/30 bg-gradient-to-r from-rose-900/30 to-red-900/30" style={{ width: ARENA_W, height: ARENA_H }}>
            {/* Base */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-blue-500/30 to-transparent flex items-center justify-center">
              <span className="text-lg">🏥</span>
            </div>

            {/* Units */}
            {units.map((u) => (
              <div key={u.uid} className="absolute flex flex-col items-center transition-none" style={{ left: u.x - 10, top: u.y - 12 }}>
                <span style={{ fontSize: u.side === "virus" ? 18 : 20 }}>{u.emoji}</span>
                <div className="h-1 w-6 rounded-full bg-gray-700 mt-0.5">
                  <div className={`h-full rounded-full ${u.side === "cell" ? "bg-green-400" : "bg-red-400"}`} style={{ width: `${(u.hp / u.maxHp) * 100}%` }} />
                </div>
              </div>
            ))}

            {/* Bullets */}
            {bullets.map((b) => (
              <div key={b.id} className={`absolute text-xs ${b.side === "cell" ? "text-cyan-300" : "text-red-400"}`} style={{ left: b.x - 4, top: b.y - 4 }}>
                {b.emoji}
              </div>
            ))}
          </div>

          {/* Cell deploy bar */}
          <div className="mt-2 flex gap-1.5 overflow-x-auto w-[360px] pb-1">
            {cells.map((cell) => {
              const cd = cooldowns[cell.id] ?? 0;
              const canDeploy = energy >= cell.cost && cd === 0;
              return (
                <button
                  key={cell.id}
                  onClick={() => deployCell(cell)}
                  disabled={!canDeploy}
                  className={`flex flex-col items-center rounded-lg border px-2 py-1.5 min-w-[52px] text-[10px] transition-all ${
                    canDeploy ? "border-white/20 bg-white/10 hover:bg-white/20 active:scale-90" : "border-gray-700 bg-black/30 opacity-50"
                  }`}
                >
                  <span className="text-lg">{cell.emoji}</span>
                  <span className="font-bold truncate w-full text-center">{cell.name}</span>
                  <span className="text-amber-400">⚡{cell.cost}</span>
                  {cd > 0 && <span className="text-red-400">{cd}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* === VICTORY === */}
      {screen === "victory" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">🎉</div>
          <h2 className="text-3xl font-black text-green-400">승리!</h2>
          <div className="rounded-xl bg-white/5 px-6 py-4 space-y-2">
            <p>💀 처치: <span className="font-bold text-red-400">{killCount}</span></p>
            <p>🧬 획득 DNA: <span className="font-bold text-green-400">{earnedDna + currentStage.reward}</span></p>
          </div>
          <div className="flex gap-3">
            {currentStage.id < STAGES.length && (
              <button onClick={() => startBattle(STAGES[currentStage.id])} className="rounded-xl bg-gradient-to-r from-red-500 to-rose-500 px-8 py-3 font-bold hover:scale-105 active:scale-95 transition-transform">
                다음 스테이지 ▶
              </button>
            )}
            <button onClick={() => setScreen("menu")} className="rounded-xl bg-white/10 px-8 py-3 font-bold">메뉴</button>
          </div>
        </div>
      )}

      {/* === DEFEAT === */}
      {screen === "defeat" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">💀</div>
          <h2 className="text-3xl font-black text-red-400">패배...</h2>
          <p className="text-slate-400">기지가 파괴되었습니다!</p>
          <div className="flex gap-3">
            <button onClick={() => startBattle(currentStage)} className="rounded-xl bg-gradient-to-r from-red-500 to-rose-500 px-8 py-3 font-bold hover:scale-105 active:scale-95 transition-transform">🔄 재도전</button>
            <button onClick={() => setScreen("menu")} className="rounded-xl bg-white/10 px-8 py-3 font-bold">메뉴</button>
          </div>
        </div>
      )}

      {/* === GACHA === */}
      {screen === "gacha" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <h2 className="text-2xl font-black">🧬 세포 뽑기</h2>
          <p className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">특수 세포를 획득하라!</p>
          <p className="text-green-400 font-bold text-lg">🧬 {dna} DNA</p>

          <div className="flex gap-4 mt-4">
            <button
              onClick={() => {
                if (dna < GACHA_SINGLE) return;
                setDna((d) => d - GACHA_SINGLE);
                const result = doGachaPull();
                setGachaResults([result]);
                if (!ownedGacha.includes(result.id)) setOwnedGacha((prev) => [...prev, result.id]);
                setScreen("gachaResult");
              }}
              disabled={dna < GACHA_SINGLE}
              className={`rounded-xl px-8 py-4 font-black shadow-lg hover:scale-105 active:scale-95 transition-transform ${
                dna >= GACHA_SINGLE ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              1회 뽑기<br /><span className="text-xs">{GACHA_SINGLE} 🧬</span>
            </button>
            <button
              onClick={() => {
                if (dna < GACHA_MULTI) return;
                setDna((d) => d - GACHA_MULTI);
                const results: GachaCell[] = [];
                for (let i = 0; i < 10; i++) {
                  const r = doGachaPull();
                  results.push(r);
                  if (!ownedGacha.includes(r.id)) setOwnedGacha((prev) => [...prev, r.id]);
                }
                setGachaResults(results);
                setScreen("gachaResult");
              }}
              disabled={dna < GACHA_MULTI}
              className={`rounded-xl px-8 py-4 font-black shadow-lg hover:scale-105 active:scale-95 transition-transform ${
                dna >= GACHA_MULTI ? "bg-gradient-to-r from-amber-500 to-red-500" : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              10연차!<br /><span className="text-xs">{GACHA_MULTI} 🧬</span>
            </button>
          </div>

          {/* Owned gacha cells */}
          {ownedGacha.length > 0 && (
            <div className="mt-6 w-full max-w-md">
              <p className="mb-2 text-sm font-bold text-purple-400">🔬 보유 특수 세포 ({ownedGacha.length})</p>
              <div className="grid grid-cols-4 gap-2">
                {ownedGacha.map((gid) => {
                  const g = GACHA_CELLS.find((c) => c.id === gid);
                  if (!g) return null;
                  return (
                    <div key={gid} className={`flex flex-col items-center rounded-lg border-2 p-2 text-xs bg-white/5 ${rarityBorder(g.rarity)}`}>
                      <span className="text-xl">{g.emoji}</span>
                      <span className={`font-bold ${rarityColor(g.rarity)}`}>{g.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Catalog */}
          <div className="mt-4 w-full max-w-md">
            <p className="mb-2 text-sm font-bold text-slate-400">📖 세포 도감</p>
            <div className="grid grid-cols-5 gap-1.5">
              {GACHA_CELLS.map((cell) => {
                const owned = ownedGacha.includes(cell.id);
                return (
                  <div key={cell.id} className={`flex flex-col items-center rounded-lg border p-1.5 text-[10px] ${
                    owned ? `${rarityBorder(cell.rarity)} bg-white/5` : "border-gray-800 bg-black/30 opacity-40"
                  }`}>
                    <span className="text-lg">{owned ? cell.emoji : "❓"}</span>
                    <span className={rarityColor(cell.rarity)}>{owned ? cell.name : "???"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={() => setScreen("menu")} className="mt-4 text-sm text-slate-500 hover:text-white">← 뒤로</button>
        </div>
      )}

      {/* === GACHA RESULT === */}
      {screen === "gachaResult" && gachaResults.length > 0 && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-2xl font-black">{gachaResults.length === 1 ? "🎊 뽑기 결과!" : "🎊 10연차 결과!"}</h2>
          <div className={`grid ${gachaResults.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-5"} gap-3 w-full max-w-lg`}>
            {gachaResults.map((cell, i) => (
              <div key={i} className={`flex flex-col items-center gap-1 rounded-xl border-2 bg-gradient-to-b from-white/10 to-white/5 p-3 ${rarityBorder(cell.rarity)}`}>
                {cell.rarity === "legendary" && <span className="text-[10px] text-amber-400 animate-pulse">★ 전설 ★</span>}
                {cell.rarity === "epic" && <span className="text-[10px] text-purple-400">★ 에픽 ★</span>}
                <span className={gachaResults.length === 1 ? "text-6xl" : "text-3xl"}>{cell.emoji}</span>
                <span className={`font-bold text-sm ${rarityColor(cell.rarity)}`}>{cell.name}</span>
                {gachaResults.length === 1 && <p className="text-xs text-slate-400">{cell.desc}</p>}
                <span className={`text-[10px] ${rarityColor(cell.rarity)}`}>{rarityLabel(cell.rarity)}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setScreen("gacha")} className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform">
            다시 뽑기! 🧬
          </button>
          <button onClick={() => setScreen("menu")} className="text-sm text-slate-500 hover:text-white">메뉴로</button>
        </div>
      )}
    </div>
  );
}
