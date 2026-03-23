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
type Screen = "main" | "explore" | "explore-biome" | "encounter" | "collection" | "battle" | "battle-fight" | "evolve" | "league-select";

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
  currentHP: number;
}

interface BattleState {
  playerTeam: OwnedDino[];
  enemyTeam: { template: DinoTemplate; hp: number; maxHP: number; level: number; evolution: number }[];
  activePlayer: number;
  activeEnemy: number;
  playerEnergy: number;
  enemyEnergy: number;
  playerSkillCooldown: number;
  enemySkillCooldown: number;
  turn: number;
  log: string[];
  phase: "player" | "enemy" | "won" | "lost";
  shakePlayer: boolean;
  shakeEnemy: boolean;
  flashColor: string;
  damagePopPlayer: { amount: number; id: number } | null;
  damagePopEnemy: { amount: number; id: number } | null;
}

// ============================================================
// DINO DATABASE
// ============================================================
const DINOS: DinoTemplate[] = [
  // 일반 (Common)
  { id: 1, name: "브라키오사우루스", emoji: "🦕", baseHP: 120, baseATK: 25, baseDEF: 30, baseSPD: 15, element: "없음", skill: "긴 목 휩쓸기", skillDesc: "긴 목으로 적을 쓸어버린다", rarity: "일반", diet: "초식", biomes: ["초원", "숲"] },
  { id: 2, name: "콤프소그나투스", emoji: "🦖", baseHP: 50, baseATK: 30, baseDEF: 15, baseSPD: 55, element: "없음", skill: "무리 공격", skillDesc: "작은 동료들이 함께 공격", rarity: "일반", diet: "육식", biomes: ["초원", "숲", "사막"] },
  { id: 3, name: "안킬로사우루스", emoji: "🐊", baseHP: 100, baseATK: 20, baseDEF: 55, baseSPD: 10, element: "없음", skill: "꼬리 해머", skillDesc: "강화된 꼬리로 타격", rarity: "일반", diet: "초식", biomes: ["초원", "사막"] },
  { id: 4, name: "파라사우롤로푸스", emoji: "🦴", baseHP: 80, baseATK: 30, baseDEF: 30, baseSPD: 30, element: "없음", skill: "큰 울음", skillDesc: "적의 공격력을 낮춘다", rarity: "일반", diet: "초식", biomes: ["초원", "숲"] },
  { id: 5, name: "미크로랍토르", emoji: "🥚", baseHP: 45, baseATK: 28, baseDEF: 12, baseSPD: 60, element: "없음", skill: "급습", skillDesc: "빠른 속도로 선공", rarity: "일반", diet: "육식", biomes: ["숲", "초원"] },
  { id: 6, name: "파키케팔로사우루스", emoji: "🦕", baseHP: 75, baseATK: 35, baseDEF: 40, baseSPD: 20, element: "없음", skill: "박치기", skillDesc: "단단한 머리로 돌진", rarity: "일반", diet: "초식", biomes: ["초원", "사막"] },
  // 고급 (Uncommon)
  { id: 7, name: "벨로시랩터", emoji: "🦖", baseHP: 65, baseATK: 45, baseDEF: 20, baseSPD: 50, element: "없음", skill: "갈고리 발톱", skillDesc: "날카로운 발톱으로 연속 공격", rarity: "고급", diet: "육식", biomes: ["숲", "초원", "사막"] },
  { id: 8, name: "스테고사우루스", emoji: "🦕", baseHP: 110, baseATK: 25, baseDEF: 50, baseSPD: 15, element: "없음", skill: "등판 방어", skillDesc: "등판을 세워 방어력 증가", rarity: "고급", diet: "초식", biomes: ["초원", "숲"] },
  { id: 9, name: "딜로포사우루스", emoji: "🦖", baseHP: 70, baseATK: 40, baseDEF: 22, baseSPD: 40, element: "독", skill: "독 침 발사", skillDesc: "독침을 뱉어 지속 피해", rarity: "고급", diet: "육식", biomes: ["숲", "사막"] },
  { id: 10, name: "이구아노돈", emoji: "🦕", baseHP: 90, baseATK: 30, baseDEF: 35, baseSPD: 25, element: "없음", skill: "치유의 풀", skillDesc: "HP를 회복한다", rarity: "고급", diet: "초식", biomes: ["초원", "숲"] },
  { id: 11, name: "카르노타우루스", emoji: "🐊", baseHP: 80, baseATK: 48, baseDEF: 25, baseSPD: 35, element: "없음", skill: "돌진 공격", skillDesc: "전력 질주 돌진", rarity: "고급", diet: "육식", biomes: ["초원", "사막"] },
  { id: 12, name: "갈리미무스", emoji: "🦖", baseHP: 55, baseATK: 30, baseDEF: 18, baseSPD: 55, element: "없음", skill: "질풍 달리기", skillDesc: "극한의 속도로 회피 증가", rarity: "고급", diet: "육식", biomes: ["초원", "사막"] },
  // 희귀 (Rare)
  { id: 13, name: "알로사우루스", emoji: "🦖", baseHP: 90, baseATK: 55, baseDEF: 30, baseSPD: 35, element: "없음", skill: "맹렬한 이빨", skillDesc: "강력한 물기 공격", rarity: "희귀", diet: "육식", biomes: ["숲", "사막", "화산"] },
  { id: 14, name: "트리케라톱스", emoji: "🦕", baseHP: 110, baseATK: 40, baseDEF: 50, baseSPD: 20, element: "없음", skill: "뿔 돌진", skillDesc: "세 개의 뿔로 돌진 공격", rarity: "희귀", diet: "초식", biomes: ["초원", "숲"] },
  { id: 15, name: "프테라노돈", emoji: "🦴", baseHP: 60, baseATK: 42, baseDEF: 20, baseSPD: 55, element: "없음", skill: "급강하 공격", skillDesc: "하늘에서 급강하 타격", rarity: "희귀", diet: "육식", biomes: ["초원", "바다", "화산"] },
  { id: 16, name: "스피노사우루스", emoji: "🐊", baseHP: 100, baseATK: 50, baseDEF: 35, baseSPD: 30, element: "물", skill: "수중 사냥", skillDesc: "물속에서 강력한 공격", rarity: "희귀", diet: "육식", biomes: ["바다", "숲"] },
  { id: 17, name: "디플로도쿠스", emoji: "🦕", baseHP: 150, baseATK: 25, baseDEF: 35, baseSPD: 12, element: "없음", skill: "대지 진동", skillDesc: "거대한 몸으로 지면을 흔든다", rarity: "희귀", diet: "초식", biomes: ["초원"] },
  { id: 18, name: "바리오닉스", emoji: "🦖", baseHP: 85, baseATK: 45, baseDEF: 30, baseSPD: 38, element: "물", skill: "물갈퀴 할퀴기", skillDesc: "수중 적응 발톱 공격", rarity: "희귀", diet: "육식", biomes: ["바다", "숲"] },
  // 전설 (Legendary)
  { id: 19, name: "티라노사우루스 렉스", emoji: "🦖", baseHP: 120, baseATK: 65, baseDEF: 35, baseSPD: 30, element: "없음", skill: "폭군의 포효", skillDesc: "공포의 포효로 적을 마비", rarity: "전설", diet: "육식", biomes: ["화산", "숲", "사막"] },
  { id: 20, name: "모사사우루스", emoji: "🐊", baseHP: 130, baseATK: 55, baseDEF: 40, baseSPD: 35, element: "물", skill: "심해의 이빨", skillDesc: "바다의 최상위 포식자 물기", rarity: "전설", diet: "육식", biomes: ["바다"] },
  { id: 21, name: "케찰코아틀루스", emoji: "🦴", baseHP: 80, baseATK: 50, baseDEF: 25, baseSPD: 60, element: "없음", skill: "하늘의 제왕", skillDesc: "초고속 급강하 공격", rarity: "전설", diet: "육식", biomes: ["화산", "초원"] },
  { id: 22, name: "기가노토사우루스", emoji: "🦕", baseHP: 110, baseATK: 70, baseDEF: 30, baseSPD: 25, element: "없음", skill: "절멸의 이빨", skillDesc: "역대 최강의 물기 공격", rarity: "전설", diet: "육식", biomes: ["화산", "사막"] },
  { id: 23, name: "플레시오사우루스", emoji: "🐊", baseHP: 100, baseATK: 45, baseDEF: 40, baseSPD: 40, element: "물", skill: "심연의 덫", skillDesc: "긴 목으로 적을 옥죈다", rarity: "전설", diet: "육식", biomes: ["바다", "빙하"] },
  // 신화 (Mythic)
  { id: 24, name: "불의 렉스", emoji: "🔥", baseHP: 130, baseATK: 72, baseDEF: 40, baseSPD: 40, element: "불", skill: "화염 브레스", skillDesc: "모든 것을 태우는 화염", rarity: "신화", diet: "육식", biomes: ["화산"] },
  { id: 25, name: "얼음 공룡", emoji: "❄️", baseHP: 140, baseATK: 55, baseDEF: 55, baseSPD: 35, element: "얼음", skill: "빙결 폭풍", skillDesc: "적을 얼려버리는 눈보라", rarity: "신화", diet: "육식", biomes: ["빙하"] },
  { id: 26, name: "번개 공룡", emoji: "⚡", baseHP: 100, baseATK: 65, baseDEF: 35, baseSPD: 65, element: "번개", skill: "전기 충격", skillDesc: "번개를 내리쳐 마비", rarity: "신화", diet: "육식", biomes: ["화산", "사막"] },
  { id: 27, name: "다크 렉스", emoji: "🌑", baseHP: 150, baseATK: 75, baseDEF: 45, baseSPD: 45, element: "암흑", skill: "암흑 포효", skillDesc: "암흑의 힘으로 모두 파괴", rarity: "신화", diet: "육식", biomes: ["화산"] },
  { id: 28, name: "독의 와이번", emoji: "☠️", baseHP: 90, baseATK: 60, baseDEF: 30, baseSPD: 55, element: "독", skill: "맹독의 안개", skillDesc: "치명적인 독 안개 방출", rarity: "신화", diet: "육식", biomes: ["숲", "사막"] },
  { id: 29, name: "수정 공룡", emoji: "💎", baseHP: 120, baseATK: 50, baseDEF: 65, baseSPD: 30, element: "얼음", skill: "수정 방벽", skillDesc: "수정 갑옷으로 무적 방어", rarity: "신화", diet: "초식", biomes: ["빙하"] },
  { id: 30, name: "태양 공룡", emoji: "☀️", baseHP: 135, baseATK: 68, baseDEF: 42, baseSPD: 38, element: "불", skill: "태양 플레어", skillDesc: "태양의 힘으로 초열 공격", rarity: "신화", diet: "육식", biomes: ["화산", "사막"] },
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

const RARITY_CATCH_WEIGHT: Record<Rarity, number> = {
  "일반": 50,
  "고급": 30,
  "희귀": 14,
  "전설": 5,
  "신화": 1,
};

// ============================================================
// HELPERS
// ============================================================
function getTemplate(id: number): DinoTemplate {
  return DINOS.find((d) => d.id === id)!;
}

function calcStat(base: number, level: number, evolution: number, shiny: boolean): number {
  const evoMult = [1, 1.2, 1.4, 1.6][evolution];
  const lvlMult = 1 + (level - 1) * 0.04;
  const shinyMult = shiny ? 1.1 : 1;
  return Math.floor(base * evoMult * lvlMult * shinyMult);
}

function getDinoStats(dino: OwnedDino) {
  const t = getTemplate(dino.templateId);
  return {
    hp: calcStat(t.baseHP, dino.level, dino.evolution, dino.shiny),
    atk: calcStat(t.baseATK, dino.level, dino.evolution, dino.shiny),
    def: calcStat(t.baseDEF, dino.level, dino.evolution, dino.shiny),
    spd: calcStat(t.baseSPD, dino.level, dino.evolution, dino.shiny),
  };
}

function xpToLevel(level: number): number {
  return Math.floor(20 * Math.pow(level, 1.5));
}

function getEvoName(template: DinoTemplate, evo: number): string {
  if (evo === 0) return template.name;
  const suffixes = ["", " Ⅱ", " Ⅲ", " Ω"];
  return template.name + suffixes[evo];
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

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function DinostarPage() {
  // --- State ---
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(500);
  const [food, setFood] = useState(10);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerXP, setPlayerXP] = useState(0);
  const [ownedDinos, setOwnedDinos] = useState<OwnedDino[]>([]);
  const [team, setTeam] = useState<string[]>([]); // uid[]
  const [discovered, setDiscovered] = useState<Set<number>>(new Set());
  const [xpItems, setXpItems] = useState(5); // xp potions

  // explore
  const [selectedBiome, setSelectedBiome] = useState<Biome | null>(null);
  const [encounterDino, setEncounterDino] = useState<DinoTemplate | null>(null);
  const [encounterShiny, setEncounterShiny] = useState(false);
  const [catchChance, setCatchChance] = useState(0);
  const [catchResult, setCatchResult] = useState<"none" | "success" | "fail">("none");
  const [dartGame, setDartGame] = useState(false);
  const [dartPos, setDartPos] = useState(0);
  const dartAnim = useRef<ReturnType<typeof setInterval> | null>(null);

  // battle
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [selectedLeague, setSelectedLeague] = useState(0);
  const [battleMode, setBattleMode] = useState<"1v1" | "3v3">("1v1");
  const [trophies, setTrophies] = useState(0);
  const [battleItems, setBattleItems] = useState({ potion: 3, boost: 2 });

  // evolve
  const [selectedEvolve, setSelectedEvolve] = useState<string | null>(null);
  const [evolving, setEvolving] = useState(false);

  // collection detail
  const [collectionDetail, setCollectionDetail] = useState<number | null>(null);

  // effects
  const [screenFlash, setScreenFlash] = useState("");

  // --- Init ---
  useEffect(() => {
    // give starter dinos
    if (ownedDinos.length === 0) {
      const starters: OwnedDino[] = [
        { uid: uid(), templateId: 1, level: 5, xp: 0, evolution: 0, shiny: false, currentHP: 999 },
        { uid: uid(), templateId: 7, level: 5, xp: 0, evolution: 0, shiny: false, currentHP: 999 },
        { uid: uid(), templateId: 4, level: 3, xp: 0, evolution: 0, shiny: false, currentHP: 999 },
      ];
      starters.forEach((s) => {
        const stats = getDinoStats(s);
        s.currentHP = stats.hp;
      });
      setOwnedDinos(starters);
      setTeam(starters.map((s) => s.uid));
      setDiscovered(new Set(starters.map((s) => s.templateId)));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Explore ---
  const startExplore = useCallback((biome: Biome) => {
    setSelectedBiome(biome);
    setCatchResult("none");
    // pick a dino
    const biomeDinos = DINOS.filter((d) => d.biomes.includes(biome));
    // weighted by rarity
    const weighted: { dino: DinoTemplate; weight: number }[] = biomeDinos.map((d) => ({
      dino: d,
      weight: RARITY_CATCH_WEIGHT[d.rarity],
    }));
    const totalWeight = weighted.reduce((a, b) => a + b.weight, 0);
    let r = Math.random() * totalWeight;
    let picked = weighted[0].dino;
    for (const w of weighted) {
      r -= w.weight;
      if (r <= 0) { picked = w.dino; break; }
    }
    const shiny = Math.random() < 0.02;
    setEncounterDino(picked);
    setEncounterShiny(shiny);
    setCatchChance(0);
    setScreen("encounter");
  }, []);

  const attemptCatch = useCallback((method: "feed" | "trap" | "dart") => {
    if (!encounterDino) return;
    let chance = 0;
    const rarityBase: Record<Rarity, number> = { "일반": 70, "고급": 50, "희귀": 30, "전설": 15, "신화": 5 };
    chance = rarityBase[encounterDino.rarity];

    if (method === "feed") {
      if (food <= 0) return;
      setFood((f) => f - 1);
      chance += encounterDino.diet === "초식" ? 25 : 10;
    } else if (method === "trap") {
      if (coins < 50) return;
      setCoins((c) => c - 50);
      const small = encounterDino.baseHP < 80;
      chance += small ? 30 : 15;
    } else if (method === "dart") {
      // dart mini-game result already set via dartHit
      return; // handled separately
    }

    setCatchChance(Math.min(chance, 95));
    const roll = Math.random() * 100;
    if (roll < chance) {
      // caught!
      const newDino: OwnedDino = {
        uid: uid(),
        templateId: encounterDino.id,
        level: 1 + Math.floor(Math.random() * 3),
        xp: 0,
        evolution: 0,
        shiny: encounterShiny,
        currentHP: 999,
      };
      const stats = getDinoStats(newDino);
      newDino.currentHP = stats.hp;
      setOwnedDinos((prev) => [...prev, newDino]);
      setDiscovered((prev) => new Set(prev).add(encounterDino.id));
      if (team.length < 3) setTeam((prev) => [...prev, newDino.uid]);
      setCatchResult("success");
      setCoins((c) => c + 10);
      gainPlayerXP(15);
    } else {
      setCatchResult("fail");
    }
  }, [encounterDino, encounterShiny, food, coins, team]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDartGame = useCallback(() => {
    setDartGame(true);
    setDartPos(0);
    if (dartAnim.current) clearInterval(dartAnim.current);
    dartAnim.current = setInterval(() => {
      setDartPos((p) => (p + 3) % 100);
    }, 30);
  }, []);

  const dartHit = useCallback(() => {
    if (dartAnim.current) clearInterval(dartAnim.current);
    dartAnim.current = null;
    setDartGame(false);
    if (!encounterDino) return;
    // center is 50, within 15 is good
    const accuracy = Math.abs(dartPos - 50);
    const rarityBase: Record<Rarity, number> = { "일반": 70, "고급": 50, "희귀": 30, "전설": 15, "신화": 5 };
    let chance = rarityBase[encounterDino.rarity];
    if (accuracy < 5) chance += 40;
    else if (accuracy < 15) chance += 25;
    else if (accuracy < 25) chance += 10;

    setCatchChance(Math.min(chance, 95));
    const roll = Math.random() * 100;
    if (roll < chance) {
      const newDino: OwnedDino = {
        uid: uid(),
        templateId: encounterDino.id,
        level: 1 + Math.floor(Math.random() * 3),
        xp: 0,
        evolution: 0,
        shiny: encounterShiny,
        currentHP: 999,
      };
      const stats = getDinoStats(newDino);
      newDino.currentHP = stats.hp;
      setOwnedDinos((prev) => [...prev, newDino]);
      setDiscovered((prev) => new Set(prev).add(encounterDino.id));
      if (team.length < 3) setTeam((prev) => [...prev, newDino.uid]);
      setCatchResult("success");
      setCoins((c) => c + 10);
      gainPlayerXP(15);
    } else {
      setCatchResult("fail");
    }
  }, [encounterDino, encounterShiny, dartPos, team]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Player XP ---
  const gainPlayerXP = (amount: number) => {
    setPlayerXP((prev) => {
      const needed = playerLevel * 50;
      let newXP = prev + amount;
      if (newXP >= needed) {
        newXP -= needed;
        setPlayerLevel((l) => l + 1);
        setFood((f) => f + 3);
        setXpItems((x) => x + 2);
      }
      return newXP;
    });
  };

  // --- Evolution ---
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
      setOwnedDinos((prev) =>
        prev.map((d) => {
          if (d.uid !== dinoUid) return d;
          const newEvo = d.evolution + 1;
          const updated = { ...d, evolution: newEvo };
          const stats = getDinoStats(updated);
          updated.currentHP = stats.hp;
          return updated;
        })
      );
      setEvolving(false);
    }, 1000);
  }, []);

  const feedXP = useCallback((dinoUid: string) => {
    if (xpItems <= 0) return;
    setXpItems((x) => x - 1);
    setOwnedDinos((prev) =>
      prev.map((d) => {
        if (d.uid !== dinoUid) return d;
        const xpGain = 30 + Math.floor(Math.random() * 20);
        let newXP = d.xp + xpGain;
        let newLevel = d.level;
        while (newLevel < 50 && newXP >= xpToLevel(newLevel)) {
          newXP -= xpToLevel(newLevel);
          newLevel++;
        }
        if (newLevel >= 50) { newLevel = 50; newXP = 0; }
        const updated = { ...d, xp: newXP, level: newLevel };
        const stats = getDinoStats(updated);
        updated.currentHP = stats.hp;
        return updated;
      })
    );
  }, [xpItems]);

  // --- Battle ---
  const leagueInfo = [
    { name: "초보 리그", emoji: "🟢", rarities: ["일반", "고급"] as Rarity[], levels: [3, 8], reward: 50 },
    { name: "중급 리그", emoji: "🔵", rarities: ["고급", "희귀"] as Rarity[], levels: [8, 18], reward: 120 },
    { name: "고급 리그", emoji: "🟣", rarities: ["희귀", "전설"] as Rarity[], levels: [15, 30], reward: 250 },
    { name: "챔피언 리그", emoji: "🏆", rarities: ["전설", "신화"] as Rarity[], levels: [25, 45], reward: 500 },
  ];

  const startBattle = useCallback(() => {
    const league = leagueInfo[selectedLeague];
    const count = battleMode === "1v1" ? 1 : 3;
    // pick player team
    const pTeam = team.slice(0, count).map((uid) => ownedDinos.find((d) => d.uid === uid)!).filter(Boolean);
    if (pTeam.length === 0) return;
    // reset HP
    pTeam.forEach((d) => {
      const stats = getDinoStats(d);
      d.currentHP = stats.hp;
    });
    // generate enemy team
    const enemyCandidates = DINOS.filter((d) => league.rarities.includes(d.rarity));
    const eTeam = [];
    for (let i = 0; i < count; i++) {
      const t = enemyCandidates[Math.floor(Math.random() * enemyCandidates.length)];
      const lvl = league.levels[0] + Math.floor(Math.random() * (league.levels[1] - league.levels[0]));
      const stats = getDinoStats({ uid: "", templateId: t.id, level: lvl, xp: 0, evolution: lvl >= 25 ? 2 : lvl >= 10 ? 1 : 0, shiny: false, currentHP: 0 });
      eTeam.push({
        template: t,
        hp: stats.hp,
        maxHP: stats.hp,
        level: lvl,
        evolution: lvl >= 25 ? 2 : lvl >= 10 ? 1 : 0,
      });
    }
    setBattleState({
      playerTeam: pTeam.map((d) => ({ ...d })),
      enemyTeam: eTeam,
      activePlayer: 0,
      activeEnemy: 0,
      playerEnergy: 3,
      enemyEnergy: 3,
      playerSkillCooldown: 0,
      enemySkillCooldown: 0,
      turn: 1,
      log: ["⚔️ 배틀 시작!"],
      phase: "player",
      shakePlayer: false,
      shakeEnemy: false,
      flashColor: "",
      damagePopPlayer: null,
      damagePopEnemy: null,
    });
    setScreen("battle-fight");
  }, [selectedLeague, battleMode, team, ownedDinos]); // eslint-disable-line react-hooks/exhaustive-deps

  const doBattleAction = useCallback((action: "attack" | "skill" | "switch" | "potion" | "boost") => {
    if (!battleState || battleState.phase !== "player") return;
    const bs = { ...battleState };
    const pDino = bs.playerTeam[bs.activePlayer];
    const eDino = bs.enemyTeam[bs.activeEnemy];
    if (!pDino || !eDino) return;
    const pTemplate = getTemplate(pDino.templateId);
    const eTemplate = eDino.template;
    const pStats = getDinoStats(pDino);
    const eStats = getDinoStats({ uid: "", templateId: eTemplate.id, level: eDino.level, xp: 0, evolution: eDino.evolution, shiny: false, currentHP: 0 });

    let playerDmg = 0;

    if (action === "attack") {
      const raw = pStats.atk * 2 - eStats.def;
      const mult = elementAdvantage(pTemplate.element, eTemplate.element);
      playerDmg = Math.max(Math.floor((raw * mult * (0.9 + Math.random() * 0.2))), 5);
      eDino.hp -= playerDmg;
      bs.log = [`⚔️ ${getEvoName(pTemplate, pDino.evolution)}의 공격! ${playerDmg} 데미지!`, ...bs.log.slice(0, 4)];
    } else if (action === "skill") {
      if (bs.playerSkillCooldown > 0 || bs.playerEnergy < 2) {
        bs.log = ["❌ 스킬을 사용할 수 없습니다!", ...bs.log.slice(0, 4)];
        setBattleState(bs);
        return;
      }
      bs.playerEnergy -= 2;
      bs.playerSkillCooldown = 3;
      const raw = pStats.atk * 3 - eStats.def;
      const mult = elementAdvantage(pTemplate.element, eTemplate.element);
      playerDmg = Math.max(Math.floor((raw * mult * (0.9 + Math.random() * 0.2))), 10);
      // healing skill
      if (pTemplate.skill.includes("치유") || pTemplate.skill.includes("회복")) {
        const heal = Math.floor(pStats.hp * 0.3);
        pDino.currentHP = Math.min(pDino.currentHP + heal, pStats.hp);
        bs.log = [`💚 ${getEvoName(pTemplate, pDino.evolution)}이(가) ${heal} HP 회복!`, ...bs.log.slice(0, 4)];
        playerDmg = Math.floor(playerDmg * 0.5);
      }
      eDino.hp -= playerDmg;
      bs.log = [`💥 ${pTemplate.skill}! ${playerDmg} 데미지!`, ...bs.log.slice(0, 4)];
    } else if (action === "switch") {
      const next = bs.playerTeam.findIndex((d, i) => i !== bs.activePlayer && d.currentHP > 0);
      if (next === -1) {
        bs.log = ["❌ 교체할 공룡이 없습니다!", ...bs.log.slice(0, 4)];
        setBattleState(bs);
        return;
      }
      bs.activePlayer = next;
      bs.log = [`🔄 ${getEvoName(getTemplate(bs.playerTeam[next].templateId), bs.playerTeam[next].evolution)} 등장!`, ...bs.log.slice(0, 4)];
      // enemy still attacks
    } else if (action === "potion") {
      if (battleItems.potion <= 0) return;
      setBattleItems((prev) => ({ ...prev, potion: prev.potion - 1 }));
      const heal = Math.floor(pStats.hp * 0.4);
      pDino.currentHP = Math.min(pDino.currentHP + heal, pStats.hp);
      bs.log = [`🧪 포션 사용! ${heal} HP 회복!`, ...bs.log.slice(0, 4)];
    } else if (action === "boost") {
      if (battleItems.boost <= 0) return;
      setBattleItems((prev) => ({ ...prev, boost: prev.boost - 1 }));
      // temporary atk boost — just do extra damage this turn
      const raw = pStats.atk * 3.5 - eStats.def;
      playerDmg = Math.max(Math.floor(raw * (0.9 + Math.random() * 0.2)), 10);
      eDino.hp -= playerDmg;
      bs.log = [`💪 부스트 공격! ${playerDmg} 데미지!`, ...bs.log.slice(0, 4)];
    }

    // animate
    if (playerDmg > 0) {
      bs.shakeEnemy = true;
      bs.flashColor = ELEMENT_COLORS[pTemplate.element].replace("text-", "bg-").replace("-300", "-500").replace("-400", "-500") || "bg-white";
      bs.damagePopEnemy = { amount: playerDmg, id: Date.now() };
    }

    // check enemy KO
    if (eDino.hp <= 0) {
      eDino.hp = 0;
      const nextEnemy = bs.enemyTeam.findIndex((d, i) => i !== bs.activeEnemy && d.hp > 0);
      if (nextEnemy === -1) {
        bs.phase = "won";
        bs.log = ["🎉 승리!!!", ...bs.log.slice(0, 4)];
        setBattleState(bs);
        setTimeout(() => {
          setBattleState((prev) => prev ? { ...prev, shakeEnemy: false, flashColor: "", damagePopEnemy: null } : null);
        }, 400);
        // rewards
        const reward = leagueInfo[selectedLeague].reward;
        setCoins((c) => c + reward);
        gainPlayerXP(30 + selectedLeague * 15);
        setXpItems((x) => x + 1 + selectedLeague);
        if (selectedLeague === 3) setTrophies((t) => t + 1);
        // give xp to team dinos
        setOwnedDinos((prev) =>
          prev.map((d) => {
            if (!team.includes(d.uid)) return d;
            const xpGain = 20 + selectedLeague * 10;
            let newXP = d.xp + xpGain;
            let newLevel = d.level;
            while (newLevel < 50 && newXP >= xpToLevel(newLevel)) {
              newXP -= xpToLevel(newLevel);
              newLevel++;
            }
            if (newLevel >= 50) { newLevel = 50; newXP = 0; }
            return { ...d, xp: newXP, level: newLevel };
          })
        );
        return;
      }
      bs.activeEnemy = nextEnemy;
      bs.log = [`${eTemplate.name} 쓰러짐! 다음 상대 등장!`, ...bs.log.slice(0, 4)];
    }

    setBattleState(bs);

    // clear effects
    setTimeout(() => {
      setBattleState((prev) => prev ? { ...prev, shakeEnemy: false, flashColor: "", damagePopEnemy: null } : null);
    }, 400);

    // enemy turn
    setTimeout(() => {
      setBattleState((prev) => {
        if (!prev || prev.phase !== "player") return prev;
        const bs2 = { ...prev };
        const pD = bs2.playerTeam[bs2.activePlayer];
        const eD = bs2.enemyTeam[bs2.activeEnemy];
        if (!pD || !eD || eD.hp <= 0) return prev;
        const eT = eD.template;
        const eSt = getDinoStats({ uid: "", templateId: eT.id, level: eD.level, xp: 0, evolution: eD.evolution, shiny: false, currentHP: 0 });
        const pSt = getDinoStats(pD);

        let eDmg: number;
        const useSkill = bs2.enemySkillCooldown <= 0 && bs2.enemyEnergy >= 2 && Math.random() < 0.3;
        if (useSkill) {
          bs2.enemyEnergy -= 2;
          bs2.enemySkillCooldown = 3;
          const raw = eSt.atk * 3 - pSt.def;
          const mult = elementAdvantage(eT.element, getTemplate(pD.templateId).element);
          eDmg = Math.max(Math.floor(raw * mult * (0.9 + Math.random() * 0.2)), 10);
          bs2.log = [`💥 ${eT.skill}! ${eDmg} 데미지!`, ...bs2.log.slice(0, 4)];
        } else {
          const raw = eSt.atk * 2 - pSt.def;
          const mult = elementAdvantage(eT.element, getTemplate(pD.templateId).element);
          eDmg = Math.max(Math.floor(raw * mult * (0.9 + Math.random() * 0.2)), 5);
          bs2.log = [`⚔️ ${getEvoName(eT, eD.evolution)}의 공격! ${eDmg} 데미지!`, ...bs2.log.slice(0, 4)];
        }

        pD.currentHP -= eDmg;
        bs2.shakePlayer = true;
        bs2.damagePopPlayer = { amount: eDmg, id: Date.now() };
        bs2.flashColor = ELEMENT_COLORS[eT.element].replace("text-", "bg-").replace("-300", "-500").replace("-400", "-500") || "bg-white";

        if (pD.currentHP <= 0) {
          pD.currentHP = 0;
          const nextP = bs2.playerTeam.findIndex((d, i) => i !== bs2.activePlayer && d.currentHP > 0);
          if (nextP === -1) {
            bs2.phase = "lost";
            bs2.log = ["😢 패배...", ...bs2.log.slice(0, 4)];
          } else {
            bs2.activePlayer = nextP;
            bs2.log = [`${getTemplate(pD.templateId).name} 쓰러짐! ${getTemplate(bs2.playerTeam[nextP].templateId).name} 등장!`, ...bs2.log.slice(0, 4)];
          }
        }

        bs2.turn++;
        if (bs2.playerSkillCooldown > 0) bs2.playerSkillCooldown--;
        if (bs2.enemySkillCooldown > 0) bs2.enemySkillCooldown--;
        bs2.playerEnergy = Math.min(bs2.playerEnergy + 1, 5);
        bs2.enemyEnergy = Math.min(bs2.enemyEnergy + 1, 5);

        return bs2;
      });

      setTimeout(() => {
        setBattleState((prev) => prev ? { ...prev, shakePlayer: false, flashColor: "", damagePopPlayer: null } : null);
      }, 400);
    }, 700);
  }, [battleState, battleItems, selectedLeague, team]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Team Management ---
  const toggleTeam = (dinoUid: string) => {
    setTeam((prev) => {
      if (prev.includes(dinoUid)) return prev.filter((u) => u !== dinoUid);
      if (prev.length >= 3) return prev;
      return [...prev, dinoUid];
    });
  };

  // --- Render Helpers ---
  const renderDinoCard = (dino: OwnedDino, onClick?: () => void, showTeam?: boolean) => {
    const t = getTemplate(dino.templateId);
    const stats = getDinoStats(dino);
    const inTeam = team.includes(dino.uid);
    return (
      <div
        key={dino.uid}
        onClick={onClick}
        className={`border-2 rounded-xl p-3 cursor-pointer transition-all hover:scale-105 ${RARITY_COLORS[t.rarity]} ${RARITY_GLOW[t.rarity]} ${onClick ? "hover:brightness-125" : ""}`}
      >
        <div className="flex justify-between items-start">
          <span className="text-3xl">{dino.shiny ? "✨" : ""}{t.emoji}</span>
          <div className="text-right">
            <div className={`text-xs font-bold ${RARITY_TEXT[t.rarity]}`}>{t.rarity}</div>
            <div className="text-xs text-gray-400">Lv.{dino.level}</div>
          </div>
        </div>
        <div className="text-sm font-bold mt-1 text-white">{getEvoName(t, dino.evolution)}</div>
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
            onClick={(e) => { e.stopPropagation(); toggleTeam(dino.uid); }}
            className={`mt-2 w-full text-xs py-1 rounded ${inTeam ? "bg-yellow-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            {inTeam ? "⭐ 팀 선택됨" : "팀에 추가"}
          </button>
        )}
      </div>
    );
  };

  const HPBar = ({ current, max, size = "normal" }: { current: number; max: number; size?: string }) => {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    const color = pct > 50 ? "bg-green-500" : pct > 25 ? "bg-yellow-500" : "bg-red-500";
    return (
      <div className={`w-full bg-gray-700 rounded-full overflow-hidden ${size === "small" ? "h-2" : "h-4"}`}>
        <div className={`${color} h-full transition-all duration-300 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  // ============================================================
  // SCREENS
  // ============================================================

  // --- MAIN MENU ---
  if (screen === "main") {
    const teamDinos = team.map((uid) => ownedDinos.find((d) => d.uid === uid)).filter(Boolean) as OwnedDino[];
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-950 via-emerald-950 to-gray-950 text-white">
        <div className="max-w-lg mx-auto p-4">
          <Link href="/" className="text-green-400 text-sm hover:underline">← 홈으로</Link>

          {/* Title */}
          <div className="text-center mt-4 mb-6">
            <div className="text-6xl mb-2">🦕</div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-green-400 via-emerald-300 to-yellow-400 bg-clip-text text-transparent">
              다이노스터
            </h1>
            <p className="text-emerald-400 text-sm mt-1">공룡을 모으고, 진화시키고, 배틀하라!</p>
            <div className="text-7xl mt-2 opacity-20">🦖🦕🐊</div>
          </div>

          {/* Player Info */}
          <div className="bg-gray-900/70 rounded-xl p-4 mb-4 border border-emerald-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-emerald-300 font-bold">🏅 레벨 {playerLevel}</span>
              <span className="text-yellow-400">🪙 {coins} 코인</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>경험치</span>
              <span>{playerXP}/{playerLevel * 50}</span>
            </div>
            <HPBar current={playerXP} max={playerLevel * 50} size="small" />
            <div className="flex gap-4 mt-2 text-sm">
              <span>🥩 먹이 {food}</span>
              <span>💊 XP포션 {xpItems}</span>
              <span>🏆 트로피 {trophies}</span>
            </div>
          </div>

          {/* Team Display */}
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
              {Array.from({ length: 3 - teamDinos.length }).map((_, i) => (
                <div key={`empty-${i}`} className="border border-dashed border-gray-700 rounded-lg p-2 text-center text-gray-600">
                  <div className="text-2xl">❓</div>
                  <div className="text-xs">빈 슬롯</div>
                </div>
              ))}
            </div>
          </div>

          {/* Menu Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setScreen("explore")}
              className="bg-gradient-to-br from-green-700 to-green-900 border-2 border-green-500 rounded-xl p-4 text-center hover:scale-105 transition-transform shadow-lg shadow-green-900/50"
            >
              <div className="text-3xl mb-1">🌿</div>
              <div className="font-bold">탐험</div>
              <div className="text-xs text-green-300">공룡 포획</div>
            </button>
            <button
              onClick={() => setScreen("collection")}
              className="bg-gradient-to-br from-blue-700 to-blue-900 border-2 border-blue-500 rounded-xl p-4 text-center hover:scale-105 transition-transform shadow-lg shadow-blue-900/50"
            >
              <div className="text-3xl mb-1">📖</div>
              <div className="font-bold">도감</div>
              <div className="text-xs text-blue-300">{discovered.size}/{DINOS.length} 발견</div>
            </button>
            <button
              onClick={() => setScreen("league-select")}
              className="bg-gradient-to-br from-red-700 to-red-900 border-2 border-red-500 rounded-xl p-4 text-center hover:scale-105 transition-transform shadow-lg shadow-red-900/50"
            >
              <div className="text-3xl mb-1">⚔️</div>
              <div className="font-bold">배틀</div>
              <div className="text-xs text-red-300">리그 도전</div>
            </button>
            <button
              onClick={() => setScreen("evolve")}
              className="bg-gradient-to-br from-purple-700 to-purple-900 border-2 border-purple-500 rounded-xl p-4 text-center hover:scale-105 transition-transform shadow-lg shadow-purple-900/50"
            >
              <div className="text-3xl mb-1">🧬</div>
              <div className="font-bold">진화</div>
              <div className="text-xs text-purple-300">레벨업 & 진화</div>
            </button>
          </div>

          {/* Owned count */}
          <div className="text-center text-gray-500 text-sm mt-4">
            보유 공룡: {ownedDinos.length}마리
          </div>
        </div>
      </div>
    );
  }

  // --- EXPLORE: Biome Select ---
  if (screen === "explore") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-950 via-emerald-950 to-gray-950 text-white">
        <div className="max-w-lg mx-auto p-4">
          <button onClick={() => setScreen("main")} className="text-green-400 text-sm hover:underline">← 메인으로</button>
          <h1 className="text-2xl font-black text-center mt-4 mb-2">🌍 탐험</h1>
          <p className="text-center text-emerald-300 text-sm mb-6">바이옴을 선택하여 공룡을 찾으세요!</p>
          <div className="text-center text-sm text-gray-400 mb-4">🥩 먹이: {food} | 🪙 코인: {coins}</div>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(BIOME_INFO) as Biome[]).map((biome) => {
              const info = BIOME_INFO[biome];
              const dinoCount = DINOS.filter((d) => d.biomes.includes(biome)).length;
              return (
                <button
                  key={biome}
                  onClick={() => startExplore(biome)}
                  className={`bg-gradient-to-br ${info.color} border border-gray-600 rounded-xl p-5 text-center hover:scale-105 transition-transform`}
                >
                  <div className="text-4xl mb-2">{info.emoji}</div>
                  <div className="font-bold text-lg">{biome}</div>
                  <div className="text-xs text-gray-300">{dinoCount}종의 공룡</div>
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
                <div className={`text-sm ${RARITY_TEXT[t.rarity]}`}>[ {t.rarity} ]</div>
                {t.element !== "없음" && <div className={`text-sm ${ELEMENT_COLORS[t.element]}`}>{t.element} 속성</div>}
                <div className="text-sm text-gray-400 mt-1">{t.diet} | HP:{t.baseHP} ATK:{t.baseATK} DEF:{t.baseDEF} SPD:{t.baseSPD}</div>
              </div>

              <div className="space-y-2 mt-6">
                <button
                  onClick={() => attemptCatch("feed")}
                  disabled={food <= 0}
                  className="w-full bg-gradient-to-r from-orange-700 to-orange-900 border border-orange-500 rounded-lg p-3 hover:brightness-125 transition disabled:opacity-40 text-left"
                >
                  <span className="text-xl mr-2">🥩</span>
                  <span className="font-bold">먹이 던지기</span>
                  <span className="text-sm text-orange-300 ml-2">(먹이 1개, 초식에 효과적)</span>
                </button>
                <button
                  onClick={() => attemptCatch("trap")}
                  disabled={coins < 50}
                  className="w-full bg-gradient-to-r from-gray-700 to-gray-900 border border-gray-500 rounded-lg p-3 hover:brightness-125 transition disabled:opacity-40 text-left"
                >
                  <span className="text-xl mr-2">🪤</span>
                  <span className="font-bold">함정 설치</span>
                  <span className="text-sm text-gray-300 ml-2">(50코인, 작은 공룡에 효과적)</span>
                </button>
                <button
                  onClick={startDartGame}
                  className="w-full bg-gradient-to-r from-blue-700 to-blue-900 border border-blue-500 rounded-lg p-3 hover:brightness-125 transition text-left"
                >
                  <span className="text-xl mr-2">🎯</span>
                  <span className="font-bold">다트 발사</span>
                  <span className="text-sm text-blue-300 ml-2">(타이밍 미니게임)</span>
                </button>
                <button
                  onClick={() => startExplore(selectedBiome!)}
                  className="w-full bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-600 rounded-lg p-3 hover:brightness-125 transition text-left"
                >
                  <span className="text-xl mr-2">🏃</span>
                  <span className="font-bold">도망</span>
                  <span className="text-sm text-gray-400 ml-2">(다른 공룡 찾기)</span>
                </button>
              </div>
            </>
          )}

          {/* Dart Mini-game */}
          {dartGame && (
            <div className="text-center mt-12">
              <div className="text-xl font-bold mb-4 text-yellow-300">🎯 타이밍에 맞춰 터치!</div>
              <div className="text-6xl mb-4">{t.emoji}</div>
              <div className="relative w-full h-8 bg-gray-800 rounded-full overflow-hidden mb-4 border-2 border-yellow-500">
                {/* target zone */}
                <div className="absolute h-full bg-green-600/50 left-[35%] w-[30%]" />
                <div className="absolute h-full bg-green-400/80 left-[45%] w-[10%]" />
                {/* dart indicator */}
                <div
                  className="absolute h-full w-2 bg-red-500 rounded-full transition-none"
                  style={{ left: `${dartPos}%` }}
                />
              </div>
              <button
                onClick={dartHit}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xl py-4 px-12 rounded-xl border-2 border-red-400 animate-pulse"
              >
                발사! 🎯
              </button>
            </div>
          )}

          {/* Catch Result */}
          {catchResult !== "none" && (
            <div className="text-center mt-12">
              {catchResult === "success" ? (
                <>
                  <div className="text-6xl mb-4 animate-bounce">{t.emoji}</div>
                  <div className="text-3xl font-black text-yellow-400 mb-2">포획 성공! 🎉</div>
                  <div className={`text-xl ${RARITY_TEXT[t.rarity]}`}>{encounterShiny ? "✨ " : ""}{t.name}</div>
                  {encounterShiny && <div className="text-yellow-300 text-sm mt-1 animate-pulse">✨ 반짝이 공룡! 능력치 보너스!</div>}
                  <div className="text-sm text-green-400 mt-2">+10 코인, +15 경험치</div>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">💨</div>
                  <div className="text-2xl font-bold text-red-400 mb-2">도망쳐버렸다...</div>
                  <div className="text-sm text-gray-400">포획 확률: {catchChance}%</div>
                </>
              )}
              <div className="flex gap-3 mt-6 justify-center">
                <button
                  onClick={() => startExplore(selectedBiome!)}
                  className="bg-green-700 hover:bg-green-600 px-6 py-3 rounded-lg font-bold"
                >
                  다시 탐험 🌿
                </button>
                <button
                  onClick={() => setScreen("main")}
                  className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg"
                >
                  메인으로
                </button>
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
        <div className="max-w-lg mx-auto p-4">
          <button onClick={() => { setScreen("main"); setCollectionDetail(null); }} className="text-green-400 text-sm hover:underline">← 메인으로</button>
          <h1 className="text-2xl font-black text-center mt-4 mb-2">📖 공룡 도감</h1>
          <p className="text-center text-emerald-300 text-sm mb-4">발견: {discovered.size}/{DINOS.length}</p>

          {collectionDetail !== null ? (
            // Detail view
            (() => {
              const t = getTemplate(collectionDetail);
              const isDiscovered = discovered.has(t.id);
              const owned = ownedDinos.filter((d) => d.templateId === t.id);
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
                        <div className="mt-3 bg-gray-900/50 rounded-lg p-3">
                          <div className="text-yellow-400 font-bold">🌟 {t.skill}</div>
                          <div className="text-sm text-gray-300">{t.skillDesc}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">서식지: {t.biomes.map((b) => `${BIOME_INFO[b].emoji}${b}`).join(", ")}</div>
                        {owned.length > 0 && (
                          <div className="mt-4">
                            <div className="text-sm text-emerald-400 mb-2">보유 중: {owned.length}마리</div>
                            <div className="space-y-1">
                              {owned.map((d) => (
                                <div key={d.uid} className="text-xs text-gray-400">
                                  Lv.{d.level} {d.shiny ? "✨" : ""} {getEvoName(t, d.evolution)}
                                </div>
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
            // Grid view
            <div className="grid grid-cols-4 gap-2">
              {DINOS.map((t) => {
                const isDiscovered = discovered.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => setCollectionDetail(t.id)}
                    className={`border rounded-lg p-2 text-center hover:scale-105 transition-transform ${isDiscovered ? RARITY_COLORS[t.rarity] : "border-gray-800 bg-gray-900/30"}`}
                  >
                    <div className="text-2xl">{isDiscovered ? t.emoji : "❓"}</div>
                    <div className="text-xs truncate mt-1">{isDiscovered ? t.name : "???"}</div>
                    <div className={`text-xs ${isDiscovered ? RARITY_TEXT[t.rarity] : "text-gray-700"}`}>
                      #{String(t.id).padStart(3, "0")}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- LEAGUE SELECT ---
  if (screen === "league-select") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950 via-gray-950 to-gray-950 text-white">
        <div className="max-w-lg mx-auto p-4">
          <button onClick={() => setScreen("main")} className="text-green-400 text-sm hover:underline">← 메인으로</button>
          <h1 className="text-2xl font-black text-center mt-4 mb-6">⚔️ 배틀 리그</h1>

          {/* Mode select */}
          <div className="flex justify-center gap-3 mb-6">
            <button
              onClick={() => setBattleMode("1v1")}
              className={`px-6 py-2 rounded-lg font-bold border-2 ${battleMode === "1v1" ? "border-red-500 bg-red-900/50" : "border-gray-700 bg-gray-800/50"}`}
            >
              1 vs 1
            </button>
            <button
              onClick={() => setBattleMode("3v3")}
              className={`px-6 py-2 rounded-lg font-bold border-2 ${battleMode === "3v3" ? "border-red-500 bg-red-900/50" : "border-gray-700 bg-gray-800/50"}`}
            >
              3 vs 3
            </button>
          </div>

          <div className="space-y-3">
            {leagueInfo.map((league, i) => (
              <button
                key={i}
                onClick={() => { setSelectedLeague(i); startBattle(); }}
                className={`w-full border-2 rounded-xl p-4 text-left hover:scale-[1.02] transition-transform ${
                  i === 0 ? "border-green-600 bg-green-900/30" :
                  i === 1 ? "border-blue-600 bg-blue-900/30" :
                  i === 2 ? "border-purple-600 bg-purple-900/30" :
                  "border-yellow-600 bg-yellow-900/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{league.emoji}</span>
                  <div>
                    <div className="font-bold text-lg">{league.name}</div>
                    <div className="text-sm text-gray-400">
                      상대: {league.rarities.join("+")} Lv.{league.levels[0]}-{league.levels[1]}
                    </div>
                    <div className="text-sm text-yellow-400">보상: 🪙{league.reward} + XP포션</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Team preview */}
          <div className="mt-6">
            <h2 className="text-sm font-bold text-emerald-300 mb-2">출전 팀</h2>
            <div className="grid grid-cols-3 gap-2">
              {team.slice(0, battleMode === "1v1" ? 1 : 3).map((uid) => {
                const d = ownedDinos.find((d) => d.uid === uid);
                if (!d) return null;
                const t = getTemplate(d.templateId);
                return (
                  <div key={uid} className={`border rounded-lg p-2 text-center ${RARITY_COLORS[t.rarity]}`}>
                    <div className="text-xl">{t.emoji}</div>
                    <div className="text-xs truncate">{getEvoName(t, d.evolution)}</div>
                    <div className="text-xs text-gray-400">Lv.{d.level}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team management */}
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
  if (screen === "battle-fight" && battleState) {
    const bs = battleState;
    const pDino = bs.playerTeam[bs.activePlayer];
    const eDino = bs.enemyTeam[bs.activeEnemy];
    const pTemplate = pDino ? getTemplate(pDino.templateId) : null;
    const eTemplate = eDino ? eDino.template : null;
    const pStats = pDino ? getDinoStats(pDino) : null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-950 to-gray-950 text-white relative overflow-hidden">
        {/* Flash effect */}
        {bs.flashColor && <div className={`absolute inset-0 ${bs.flashColor} opacity-20 z-30 pointer-events-none`} />}

        <div className="max-w-lg mx-auto p-4 relative z-10">
          {/* Turn info */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-400">턴 {bs.turn}</span>
            <span className="text-yellow-400 text-sm font-bold">⚡ 에너지: {bs.playerEnergy}/5</span>
          </div>

          {/* Enemy dino */}
          {eTemplate && eDino && (
            <div className={`bg-red-950/50 border border-red-800 rounded-xl p-4 mb-4 ${bs.shakeEnemy ? "animate-[shake_0.3s_ease-in-out]" : ""}`}
              style={bs.shakeEnemy ? { animation: "shake 0.3s ease-in-out" } : {}}
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className={`font-bold ${RARITY_TEXT[eTemplate.rarity]}`}>{getEvoName(eTemplate, eDino.evolution)}</span>
                  <span className="text-xs text-gray-400 ml-2">Lv.{eDino.level}</span>
                </div>
                <span className="text-sm text-red-400">{eDino.hp}/{eDino.maxHP}</span>
              </div>
              <HPBar current={eDino.hp} max={eDino.maxHP} />
              <div className="text-center text-5xl mt-2 relative">
                {eTemplate.emoji}
                {bs.damagePopEnemy && (
                  <span key={bs.damagePopEnemy.id} className="absolute -top-2 right-1/4 text-2xl font-black text-red-400 animate-bounce">
                    -{bs.damagePopEnemy.amount}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* VS */}
          <div className="text-center text-2xl font-black text-red-500 my-2">⚔️ VS ⚔️</div>

          {/* Player dino */}
          {pTemplate && pDino && pStats && (
            <div className={`bg-blue-950/50 border border-blue-800 rounded-xl p-4 mb-4`}
              style={bs.shakePlayer ? { animation: "shake 0.3s ease-in-out" } : {}}
            >
              <div className="text-center text-5xl mb-2 relative">
                {pDino.shiny ? "✨" : ""}{pTemplate.emoji}
                {bs.damagePopPlayer && (
                  <span key={bs.damagePopPlayer.id} className="absolute -top-2 right-1/4 text-2xl font-black text-red-400 animate-bounce">
                    -{bs.damagePopPlayer.amount}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className={`font-bold ${RARITY_TEXT[pTemplate.rarity]}`}>{getEvoName(pTemplate, pDino.evolution)}</span>
                  <span className="text-xs text-gray-400 ml-2">Lv.{pDino.level}</span>
                </div>
                <span className="text-sm text-green-400">{pDino.currentHP}/{pStats.hp}</span>
              </div>
              <HPBar current={pDino.currentHP} max={pStats.hp} />
              <div className="flex gap-3 mt-2 text-xs text-gray-400">
                <span>ATK:{pStats.atk}</span>
                <span>DEF:{pStats.def}</span>
                <span>SPD:{pStats.spd}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          {bs.phase === "player" && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={() => doBattleAction("attack")} className="bg-red-700 hover:bg-red-600 rounded-lg p-3 font-bold border border-red-500 transition">
                ⚔️ 일반 공격
              </button>
              <button
                onClick={() => doBattleAction("skill")}
                disabled={bs.playerSkillCooldown > 0 || bs.playerEnergy < 2}
                className="bg-purple-700 hover:bg-purple-600 rounded-lg p-3 font-bold border border-purple-500 transition disabled:opacity-40"
              >
                💥 {pTemplate?.skill || "스킬"}
                {bs.playerSkillCooldown > 0 && <span className="text-xs block">({bs.playerSkillCooldown}턴 남음)</span>}
              </button>
              {battleMode === "3v3" && (
                <button onClick={() => doBattleAction("switch")} className="bg-blue-700 hover:bg-blue-600 rounded-lg p-3 font-bold border border-blue-500 transition">
                  🔄 교체
                </button>
              )}
              <button
                onClick={() => doBattleAction("potion")}
                disabled={battleItems.potion <= 0}
                className="bg-green-700 hover:bg-green-600 rounded-lg p-3 font-bold border border-green-500 transition disabled:opacity-40"
              >
                🧪 포션 ({battleItems.potion})
              </button>
              <button
                onClick={() => doBattleAction("boost")}
                disabled={battleItems.boost <= 0}
                className="bg-yellow-700 hover:bg-yellow-600 rounded-lg p-3 font-bold border border-yellow-500 transition disabled:opacity-40"
              >
                💪 부스트 ({battleItems.boost})
              </button>
            </div>
          )}

          {/* Battle Result */}
          {(bs.phase === "won" || bs.phase === "lost") && (
            <div className="text-center py-6">
              <div className="text-4xl mb-2">{bs.phase === "won" ? "🎉" : "😢"}</div>
              <div className={`text-3xl font-black ${bs.phase === "won" ? "text-yellow-400" : "text-red-400"}`}>
                {bs.phase === "won" ? "승리!" : "패배..."}
              </div>
              {bs.phase === "won" && (
                <div className="text-sm text-green-400 mt-2">
                  +{leagueInfo[selectedLeague].reward} 코인, +XP포션 {1 + selectedLeague}개
                  {selectedLeague === 3 && " +🏆 트로피"}
                </div>
              )}
              <button
                onClick={() => {
                  setBattleState(null);
                  setBattleItems({ potion: 3, boost: 2 });
                  setScreen("main");
                }}
                className="mt-4 bg-emerald-700 hover:bg-emerald-600 px-8 py-3 rounded-lg font-bold"
              >
                메인으로
              </button>
            </div>
          )}

          {/* Battle Log */}
          <div className="bg-gray-900/80 rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-500 mb-1">배틀 로그</div>
            {bs.log.map((l, i) => (
              <div key={i} className={`text-sm ${i === 0 ? "text-white" : "text-gray-500"}`}>{l}</div>
            ))}
          </div>

          {/* Team status for 3v3 */}
          {battleMode === "3v3" && (
            <div className="flex justify-between mt-3">
              <div className="flex gap-1">
                {bs.playerTeam.map((d, i) => (
                  <div key={i} className={`text-lg ${d.currentHP > 0 ? "" : "opacity-30 grayscale"} ${i === bs.activePlayer ? "ring-2 ring-blue-400 rounded" : ""}`}>
                    {getTemplate(d.templateId).emoji}
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                {bs.enemyTeam.map((d, i) => (
                  <div key={i} className={`text-lg ${d.hp > 0 ? "" : "opacity-30 grayscale"} ${i === bs.activeEnemy ? "ring-2 ring-red-400 rounded" : ""}`}>
                    {d.template.emoji}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Shake animation */}
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

  // --- EVOLVE ---
  if (screen === "evolve") {
    const selected = selectedEvolve ? ownedDinos.find((d) => d.uid === selectedEvolve) : null;
    const selectedTemplate = selected ? getTemplate(selected.templateId) : null;
    const selectedStats = selected ? getDinoStats(selected) : null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-gray-950 to-gray-950 text-white">
        {screenFlash && <div className={`fixed inset-0 ${screenFlash} opacity-40 z-50 pointer-events-none transition-opacity`} />}
        <div className="max-w-lg mx-auto p-4">
          <button onClick={() => { setScreen("main"); setSelectedEvolve(null); }} className="text-green-400 text-sm hover:underline">← 메인으로</button>
          <h1 className="text-2xl font-black text-center mt-4 mb-2">🧬 진화 & 레벨업</h1>
          <p className="text-center text-purple-300 text-sm mb-4">💊 XP 포션: {xpItems}개</p>

          {selected && selectedTemplate && selectedStats ? (
            <div className="space-y-4">
              <button onClick={() => setSelectedEvolve(null)} className="text-blue-400 text-sm hover:underline">← 목록으로</button>

              <div className={`border-2 rounded-xl p-6 text-center ${RARITY_COLORS[selectedTemplate.rarity]} ${RARITY_GLOW[selectedTemplate.rarity]} ${evolving ? "animate-pulse scale-110" : ""} transition-transform`}>
                <div className={`text-7xl mb-3 ${evolving ? "animate-spin" : ""}`}>
                  {selected.shiny ? "✨" : ""}{selectedTemplate.emoji}
                </div>
                <div className={`text-2xl font-black ${RARITY_TEXT[selectedTemplate.rarity]}`}>
                  {getEvoName(selectedTemplate, selected.evolution)}
                </div>
                <div className="text-sm text-gray-400">Lv.{selected.level}</div>
                {selected.evolution > 0 && <div className="text-yellow-400 text-sm">{selected.evolution}차 진화</div>}

                {/* XP bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>경험치</span>
                    <span>{selected.xp}/{xpToLevel(selected.level)}</span>
                  </div>
                  <HPBar current={selected.xp} max={xpToLevel(selected.level)} size="small" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                  <div className="text-red-400">❤️ HP: {selectedStats.hp}</div>
                  <div className="text-orange-400">⚔️ ATK: {selectedStats.atk}</div>
                  <div className="text-blue-400">🛡️ DEF: {selectedStats.def}</div>
                  <div className="text-green-400">💨 SPD: {selectedStats.spd}</div>
                </div>

                {/* Evolution progress */}
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

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => feedXP(selected.uid)}
                  disabled={xpItems <= 0 || selected.level >= 50}
                  className="flex-1 bg-gradient-to-r from-blue-700 to-blue-900 border border-blue-500 rounded-lg p-3 font-bold hover:brightness-125 transition disabled:opacity-40"
                >
                  💊 XP 포션 사용
                  <div className="text-xs text-blue-300">+30~50 경험치</div>
                </button>
                <button
                  onClick={() => evolveDino(selected.uid)}
                  disabled={!canEvolve(selected) || evolving}
                  className="flex-1 bg-gradient-to-r from-yellow-700 to-yellow-900 border border-yellow-500 rounded-lg p-3 font-bold hover:brightness-125 transition disabled:opacity-40"
                >
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
            </div>
          ) : (
            // Dino list
            <div className="grid grid-cols-2 gap-3">
              {ownedDinos.map((d) => {
                const t = getTemplate(d.templateId);
                const ce = canEvolve(d);
                return (
                  <div key={d.uid} className="relative" onClick={() => setSelectedEvolve(d.uid)}>
                    {renderDinoCard(d, () => setSelectedEvolve(d.uid))}
                    {ce && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                        진화 가능!
                      </div>
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
