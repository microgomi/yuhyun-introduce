"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

// --- Types ---
interface NinjaStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  energy: number;
  maxEnergy: number;
}

interface Ninja {
  id: string;
  name: string;
  emoji: string;
  element: string;
  elementEmoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  glowColor: string;
  stats: NinjaStats;
  specialMove: string;
  specialDesc: string;
  hidden?: boolean;
}

interface Enemy {
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  specialAbility?: string;
  specialChance?: number;
  isBoss: boolean;
}

interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  emoji: string;
  enemies: Omit<Enemy, "hp" | "maxHp">[];
  boss: Omit<Enemy, "hp" | "maxHp">;
  reward: string;
  bgGradient: string;
}

interface Weapon {
  name: string;
  atkBonus: number;
  price: number;
  emoji: string;
}

interface Armor {
  name: string;
  defBonus: number;
  hpBonus: number;
  price: number;
  emoji: string;
}

interface Potion {
  name: string;
  effect: string;
  value: number;
  price: number;
  emoji: string;
  type: "hp" | "energy" | "power";
}

type Screen =
  | "title"
  | "select"
  | "hub"
  | "training"
  | "story"
  | "battle"
  | "shop"
  | "victory"
  | "defeat"
  | "gameClear"
  | "spinTraining"
  | "weaponTraining"
  | "meditationTraining";

type BattleAction = "attack" | "spinjitzu" | "element" | "potion" | "defend";

// --- Data ---
const NINJAS: Ninja[] = [
  {
    id: "kai",
    name: "카이",
    emoji: "🔥",
    element: "불",
    elementEmoji: "🔥",
    color: "from-red-600 to-red-900",
    bgColor: "bg-red-900/30",
    borderColor: "border-red-500",
    textColor: "text-red-400",
    glowColor: "shadow-red-500/50",
    stats: { hp: 90, maxHp: 90, atk: 18, def: 10, spd: 12, energy: 100, maxEnergy: 100 },
    specialMove: "파이어 스톰",
    specialDesc: "불꽃 폭풍으로 적을 태운다!",
  },
  {
    id: "jay",
    name: "제이",
    emoji: "⚡",
    element: "번개",
    elementEmoji: "⚡",
    color: "from-blue-600 to-blue-900",
    bgColor: "bg-blue-900/30",
    borderColor: "border-blue-500",
    textColor: "text-blue-400",
    glowColor: "shadow-blue-500/50",
    stats: { hp: 80, maxHp: 80, atk: 14, def: 9, spd: 18, energy: 100, maxEnergy: 100 },
    specialMove: "썬더 볼트",
    specialDesc: "번개를 소환하여 적을 감전시킨다!",
  },
  {
    id: "cole",
    name: "콜",
    emoji: "🪨",
    element: "땅",
    elementEmoji: "🪨",
    color: "from-stone-600 to-stone-900",
    bgColor: "bg-stone-900/30",
    borderColor: "border-stone-500",
    textColor: "text-stone-400",
    glowColor: "shadow-stone-500/50",
    stats: { hp: 120, maxHp: 120, atk: 13, def: 16, spd: 8, energy: 100, maxEnergy: 100 },
    specialMove: "어스 퀘이크",
    specialDesc: "대지를 흔들어 적을 쓰러뜨린다!",
  },
  {
    id: "zane",
    name: "쟌",
    emoji: "❄️",
    element: "얼음",
    elementEmoji: "❄️",
    color: "from-cyan-600 to-cyan-900",
    bgColor: "bg-cyan-900/30",
    borderColor: "border-cyan-500",
    textColor: "text-cyan-400",
    glowColor: "shadow-cyan-500/50",
    stats: { hp: 95, maxHp: 95, atk: 14, def: 13, spd: 13, energy: 100, maxEnergy: 100 },
    specialMove: "아이스 드래곤",
    specialDesc: "얼음 용을 소환하여 적을 얼린다!",
  },
  {
    id: "nya",
    name: "냐",
    emoji: "💧",
    element: "물",
    elementEmoji: "💧",
    color: "from-sky-600 to-sky-900",
    bgColor: "bg-sky-900/30",
    borderColor: "border-sky-500",
    textColor: "text-sky-400",
    glowColor: "shadow-sky-500/50",
    stats: { hp: 85, maxHp: 85, atk: 13, def: 11, spd: 14, energy: 100, maxEnergy: 100 },
    specialMove: "타이달 웨이브",
    specialDesc: "거대한 파도로 적을 쓸어버린다!",
  },
  {
    id: "lloyd",
    name: "로이드",
    emoji: "💚",
    element: "에너지",
    elementEmoji: "💚",
    color: "from-green-600 to-green-900",
    bgColor: "bg-green-900/30",
    borderColor: "border-green-500",
    textColor: "text-green-400",
    glowColor: "shadow-green-500/50",
    stats: { hp: 100, maxHp: 100, atk: 16, def: 14, spd: 15, energy: 120, maxEnergy: 120 },
    specialMove: "골든 파워",
    specialDesc: "황금 에너지로 모든 것을 파괴한다!",
    hidden: true,
  },
];

const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: "해골 군단",
    subtitle: "Skeleton Army",
    emoji: "💀",
    enemies: [
      { name: "해골 전사", emoji: "💀", atk: 8, def: 4, specialAbility: undefined, specialChance: 0, isBoss: false },
      { name: "해골 궁수", emoji: "🏹", atk: 10, def: 3, specialAbility: undefined, specialChance: 0, isBoss: false },
    ],
    boss: { name: "사무카이", emoji: "☠️", atk: 14, def: 8, specialAbility: "4개의 팔로 2회 공격!", specialChance: 0.5, isBoss: true },
    reward: "스핀짓주 레벨 1",
    bgGradient: "from-gray-950 via-stone-900 to-gray-950",
  },
  {
    id: 2,
    title: "뱀 부족",
    subtitle: "Serpentine Tribes",
    emoji: "🐍",
    enemies: [
      { name: "뱀 전사", emoji: "🐍", atk: 11, def: 5, specialAbility: undefined, specialChance: 0, isBoss: false },
      { name: "독뱀 사냥꾼", emoji: "🐉", atk: 13, def: 4, specialAbility: "독 공격! (3턴간 피해)", specialChance: 0.3, isBoss: false },
    ],
    boss: { name: "피토르", emoji: "🐍", atk: 16, def: 7, specialAbility: "투명화! (50% 회피)", specialChance: 0.5, isBoss: true },
    reward: "스핀짓주 레벨 2",
    bgGradient: "from-gray-950 via-purple-950 to-gray-950",
  },
  {
    id: 3,
    title: "닌드로이드",
    subtitle: "Nindroids",
    emoji: "🤖",
    enemies: [
      { name: "닌드로이드 병사", emoji: "🤖", atk: 14, def: 8, specialAbility: undefined, specialChance: 0, isBoss: false },
      { name: "드론 공격기", emoji: "🛸", atk: 16, def: 5, specialAbility: undefined, specialChance: 0, isBoss: false },
    ],
    boss: { name: "오버로드", emoji: "👾", atk: 20, def: 12, specialAbility: "에너지 빔! (방어 무시)", specialChance: 0.4, isBoss: true },
    reward: "스핀짓주 레벨 3",
    bgGradient: "from-gray-950 via-violet-950 to-gray-950",
  },
  {
    id: 4,
    title: "유령 군단",
    subtitle: "Ghost Warriors",
    emoji: "👻",
    enemies: [
      { name: "유령 전사", emoji: "👻", atk: 15, def: 6, specialAbility: "유령체! (일반 공격 50% 피해)", specialChance: 1, isBoss: false },
      { name: "유령 궁수", emoji: "🏹", atk: 18, def: 4, specialAbility: "유령체! (일반 공격 50% 피해)", specialChance: 1, isBoss: false },
    ],
    boss: { name: "모로", emoji: "🌪️", atk: 22, def: 10, specialAbility: "바람 소환! (유령 소환)", specialChance: 0.4, isBoss: true },
    reward: "에어짓주",
    bgGradient: "from-gray-950 via-emerald-950 to-gray-950",
  },
  {
    id: 5,
    title: "오니",
    subtitle: "Oni",
    emoji: "👹",
    enemies: [
      { name: "오니 전사", emoji: "👹", atk: 20, def: 10, specialAbility: undefined, specialChance: 0, isBoss: false },
      { name: "어둠의 사무라이", emoji: "⚔️", atk: 22, def: 12, specialAbility: undefined, specialChance: 0, isBoss: false },
    ],
    boss: { name: "가마돈", emoji: "😈", atk: 28, def: 15, specialAbility: "어둠의 에너지! (다중 위상)", specialChance: 0.5, isBoss: true },
    reward: "황금 닌자 칭호!",
    bgGradient: "from-gray-950 via-red-950 to-gray-950",
  },
];

const WEAPONS: Weapon[] = [
  { name: "카타나", atkBonus: 0, price: 0, emoji: "🗡️" },
  { name: "황금 카타나", atkBonus: 5, price: 100, emoji: "⚔️" },
  { name: "용의 검", atkBonus: 12, price: 300, emoji: "🐉" },
  { name: "전설의 무기", atkBonus: 20, price: 600, emoji: "✨" },
];

const ARMORS: Armor[] = [
  { name: "훈련복", defBonus: 0, hpBonus: 0, price: 0, emoji: "👕" },
  { name: "닌자복", defBonus: 4, hpBonus: 10, price: 80, emoji: "🥋" },
  { name: "강화 닌자복", defBonus: 8, hpBonus: 25, price: 250, emoji: "🛡️" },
  { name: "황금 갑옷", defBonus: 15, hpBonus: 50, price: 550, emoji: "👑" },
];

const POTIONS: Potion[] = [
  { name: "회복 물약", effect: "HP 30 회복", value: 30, price: 20, emoji: "🧪", type: "hp" },
  { name: "고급 회복 물약", effect: "HP 60 회복", value: 60, price: 45, emoji: "💊", type: "hp" },
  { name: "에너지 물약", effect: "에너지 50 회복", value: 50, price: 30, emoji: "⚡", type: "energy" },
  { name: "파워업 물약", effect: "다음 공격 2배", value: 2, price: 50, emoji: "💪", type: "power" },
];

// Element advantage map: fire>ice>lightning>water>fire, earth neutral
function getElementAdvantage(attacker: string, defender: string): number {
  const advantages: Record<string, string> = {
    "불": "얼음",
    "얼음": "번개",
    "번개": "물",
    "물": "불",
  };
  if (advantages[attacker] === defender) return 1.5;
  const reverseCheck = Object.entries(advantages).find(([, v]) => v === attacker);
  if (reverseCheck && reverseCheck[0] === defender) return 0.7;
  return 1.0;
}

export default function NinjagoGame() {
  // --- State ---
  const [screen, setScreen] = useState<Screen>("title");
  const [selectedNinja, setSelectedNinja] = useState<Ninja | null>(null);
  const [playerStats, setPlayerStats] = useState<NinjaStats | null>(null);
  const [coins, setCoins] = useState(50);
  const [spinjitzuLevel, setSpinjitzuLevel] = useState(0);
  const [hasAirjitzu, setHasAirjitzu] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [maxChapter, setMaxChapter] = useState(1);
  const [chaptersCleared, setChaptersCleared] = useState<number[]>([]);
  const [weaponIndex, setWeaponIndex] = useState(0);
  const [armorIndex, setArmorIndex] = useState(0);
  const [potions, setPotions] = useState<{ type: "hp" | "energy" | "power"; value: number; name: string }[]>([
    { type: "hp", value: 30, name: "회복 물약" },
  ]);
  const [battlePotions, setBattlePotions] = useState<{ type: "hp" | "energy" | "power"; value: number; name: string }[]>([]);

  // Battle state
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [enemyQueue, setEnemyQueue] = useState<Enemy[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [battleEffect, setBattleEffect] = useState<string>("");
  const [shakePlayer, setShakePlayer] = useState(false);
  const [shakeEnemy, setShakeEnemy] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [lastAction, setLastAction] = useState<BattleAction | "">("");
  const [isDefending, setIsDefending] = useState(false);
  const [powerUp, setPowerUp] = useState(false);
  const [poisonTurns, setPoisonTurns] = useState(0);
  const [battleWaveIndex, setBattleWaveIndex] = useState(0);
  const [isBattleBusy, setIsBattleBusy] = useState(false);

  // Training state
  const [spinMeter, setSpinMeter] = useState(0);
  const [spinPhase, setSpinPhase] = useState<"charging" | "release" | "done">("charging");
  const [weaponPattern, setWeaponPattern] = useState<string[]>([]);
  const [playerPattern, setPlayerPattern] = useState<string[]>([]);
  const [weaponRound, setWeaponRound] = useState(0);
  const [showingPattern, setShowingPattern] = useState(false);
  const [weaponTrainingDone, setWeaponTrainingDone] = useState(false);
  const [meditationPos, setMeditationPos] = useState(50);
  const [meditationTimer, setMeditationTimer] = useState(10);
  const [meditationScore, setMeditationScore] = useState(0);
  const [meditationActive, setMeditationActive] = useState(false);

  // Unlock Lloyd
  const [clearCount, setClearCount] = useState(0);
  const [lloydUnlocked, setLloydUnlocked] = useState(false);

  // Animation
  const [titleFlicker, setTitleFlicker] = useState(false);
  const spinInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const meditationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Scroll battle log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [battleLog]);

  // Title flicker
  useEffect(() => {
    const interval = setInterval(() => setTitleFlicker((p) => !p), 800);
    return () => clearInterval(interval);
  }, []);

  // Meditation game loop
  useEffect(() => {
    if (meditationActive && meditationTimer > 0) {
      meditationInterval.current = setInterval(() => {
        setMeditationPos((p) => {
          const drift = (Math.random() - 0.5) * 8;
          return Math.max(0, Math.min(100, p + drift));
        });
        setMeditationTimer((t) => {
          if (t <= 0.1) {
            setMeditationActive(false);
            return 0;
          }
          return Math.round((t - 0.1) * 10) / 10;
        });
        setMeditationScore((s) => {
          const pos = meditationPos;
          const dist = Math.abs(pos - 50);
          if (dist < 10) return s + 1;
          return s;
        });
      }, 100);
      return () => { if (meditationInterval.current) clearInterval(meditationInterval.current); };
    }
  }, [meditationActive, meditationTimer, meditationPos]);

  // --- Helpers ---
  const getEffectiveStats = useCallback((): NinjaStats | null => {
    if (!playerStats || !selectedNinja) return null;
    return {
      ...playerStats,
      atk: playerStats.atk + WEAPONS[weaponIndex].atkBonus,
      def: playerStats.def + ARMORS[armorIndex].defBonus,
      maxHp: selectedNinja.stats.maxHp + ARMORS[armorIndex].hpBonus,
    };
  }, [playerStats, selectedNinja, weaponIndex, armorIndex]);

  const getSpinjitzuMultiplier = useCallback((): number => {
    if (hasAirjitzu) return 3.5;
    if (spinjitzuLevel >= 3) return 3;
    if (spinjitzuLevel >= 2) return 2;
    if (spinjitzuLevel >= 1) return 1.5;
    return 1;
  }, [spinjitzuLevel, hasAirjitzu]);

  const getSpinjitzuName = useCallback((): string => {
    if (hasAirjitzu) return "에어짓주";
    if (spinjitzuLevel >= 3) return "메가 스핀";
    if (spinjitzuLevel >= 2) return "원소 토네이도";
    if (spinjitzuLevel >= 1) return "기본 스핀";
    return "스핀짓주 (미습득)";
  }, [spinjitzuLevel, hasAirjitzu]);

  const addLog = useCallback((msg: string) => {
    setBattleLog((prev) => [...prev.slice(-20), msg]);
  }, []);

  const flashEffect = useCallback((color: string) => {
    setBattleEffect(color);
    setTimeout(() => setBattleEffect(""), 400);
  }, []);

  // --- Select Ninja ---
  const selectNinja = (ninja: Ninja) => {
    setSelectedNinja(ninja);
    setPlayerStats({ ...ninja.stats });
    setScreen("hub");
  };

  // --- Start Chapter ---
  const startChapter = (chapterId: number) => {
    const chapter = CHAPTERS[chapterId - 1];
    if (!chapter || !selectedNinja || !playerStats) return;

    // Build enemy queue: 2 waves of regular enemies + boss
    const enemies: Enemy[] = [];
    for (let w = 0; w < 2; w++) {
      const template = chapter.enemies[w % chapter.enemies.length];
      const hpBase = 30 + chapterId * 15 + w * 10;
      enemies.push({ ...template, hp: hpBase, maxHp: hpBase });
    }
    const bossHp = 60 + chapterId * 30;
    enemies.push({ ...chapter.boss, hp: bossHp, maxHp: bossHp });

    setCurrentChapter(chapterId);
    setEnemyQueue(enemies.slice(1));
    setEnemy(enemies[0]);
    setBattleWaveIndex(0);
    setIsPlayerTurn(true);
    setBattleLog([`📜 챕터 ${chapterId}: ${chapter.title} 시작!`, `${enemies[0].emoji} ${enemies[0].name} 등장!`]);
    setComboCount(0);
    setLastAction("");
    setIsDefending(false);
    setPowerUp(false);
    setPoisonTurns(0);
    setBattlePotions([...potions]);
    setIsBattleBusy(false);

    // Restore HP/energy for chapter start
    const eff = getEffectiveStats();
    if (eff) {
      setPlayerStats((p) => p ? { ...p, hp: eff.maxHp, energy: eff.maxEnergy } : p);
    }
    setScreen("battle");
  };

  // --- Battle Actions ---
  const doBattleAction = useCallback((action: BattleAction) => {
    if (!isPlayerTurn || !enemy || !playerStats || !selectedNinja || isBattleBusy) return;
    setIsBattleBusy(true);

    const eff = getEffectiveStats();
    if (!eff) { setIsBattleBusy(false); return; }

    let newCombo = comboCount;
    if (action === lastAction && (action === "attack" || action === "element" || action === "spinjitzu")) {
      newCombo += 1;
    } else {
      newCombo = 0;
    }
    setComboCount(newCombo);
    setLastAction(action);
    setIsDefending(false);

    const comboMult = 1 + newCombo * 0.15;
    const crit = Math.random() < 0.1;
    const critMult = crit ? 1.5 : 1;
    let damage = 0;
    let energyCost = 0;
    let healed = false;

    switch (action) {
      case "attack": {
        damage = Math.max(1, Math.floor((eff.atk * comboMult * critMult) - enemy.def * 0.3));
        // Ghost penalty
        if (enemy.specialAbility?.includes("유령체") && !selectedNinja.element) {
          damage = Math.floor(damage * 0.5);
        }
        if (powerUp) { damage *= 2; setPowerUp(false); }
        addLog(`⚔️ 일반 공격! ${damage} 데미지${crit ? " 💥크리티컬!" : ""}${newCombo > 0 ? ` (${newCombo + 1}콤보!)` : ""}`);
        flashEffect(selectedNinja.textColor.replace("text-", "bg-").replace("400", "500"));
        setShakeEnemy(true);
        setTimeout(() => setShakeEnemy(false), 300);
        break;
      }
      case "spinjitzu": {
        if (spinjitzuLevel === 0 && !hasAirjitzu) {
          addLog("❌ 스핀짓주를 아직 배우지 못했습니다!");
          setIsBattleBusy(false);
          return;
        }
        energyCost = 30;
        if (eff.energy < energyCost) {
          addLog("❌ 에너지가 부족합니다!");
          setIsBattleBusy(false);
          return;
        }
        const mult = getSpinjitzuMultiplier();
        damage = Math.max(1, Math.floor((eff.atk * mult * comboMult * critMult) - (hasAirjitzu ? 0 : enemy.def * 0.2)));
        if (powerUp) { damage *= 2; setPowerUp(false); }
        addLog(`🌀 ${getSpinjitzuName()}! ${damage} 데미지${crit ? " 💥크리티컬!" : ""}${newCombo > 0 ? ` (${newCombo + 1}콤보!)` : ""}`);
        flashEffect("bg-yellow-500");
        setShakeEnemy(true);
        setTimeout(() => setShakeEnemy(false), 500);
        break;
      }
      case "element": {
        energyCost = 20;
        if (eff.energy < energyCost) {
          addLog("❌ 에너지가 부족합니다!");
          setIsBattleBusy(false);
          return;
        }
        const elemMult = getElementAdvantage(selectedNinja.element, "일반");
        damage = Math.max(1, Math.floor((eff.atk * 1.3 * elemMult * comboMult * critMult) - enemy.def * 0.2));
        if (powerUp) { damage *= 2; setPowerUp(false); }
        addLog(`${selectedNinja.elementEmoji} ${selectedNinja.element} 원소 공격! ${damage} 데미지${crit ? " 💥크리티컬!" : ""}`);
        flashEffect(selectedNinja.textColor.replace("text-", "bg-").replace("400", "500"));
        setShakeEnemy(true);
        setTimeout(() => setShakeEnemy(false), 400);
        break;
      }
      case "potion": {
        if (battlePotions.length === 0) {
          addLog("❌ 물약이 없습니다!");
          setIsBattleBusy(false);
          return;
        }
        const pot = battlePotions[0];
        const remaining = battlePotions.slice(1);
        setBattlePotions(remaining);
        if (pot.type === "hp") {
          const newHp = Math.min(eff.maxHp, eff.hp + pot.value);
          setPlayerStats((p) => p ? { ...p, hp: newHp } : p);
          addLog(`🧪 ${pot.name} 사용! HP ${pot.value} 회복!`);
          healed = true;
        } else if (pot.type === "energy") {
          const newEn = Math.min(eff.maxEnergy, eff.energy + pot.value);
          setPlayerStats((p) => p ? { ...p, energy: newEn } : p);
          addLog(`⚡ ${pot.name} 사용! 에너지 ${pot.value} 회복!`);
          healed = true;
        } else {
          setPowerUp(true);
          addLog(`💪 ${pot.name} 사용! 다음 공격 2배!`);
          healed = true;
        }
        break;
      }
      case "defend": {
        setIsDefending(true);
        addLog("🛡️ 방어 자세! 받는 피해 50% 감소!");
        break;
      }
    }

    // Apply energy cost
    if (energyCost > 0) {
      setPlayerStats((p) => p ? { ...p, energy: Math.max(0, p.energy - energyCost) } : p);
    }

    // Apply damage to enemy
    if (damage > 0) {
      // Boss dodge (Pythor)
      if (enemy.specialAbility?.includes("투명화") && Math.random() < 0.5) {
        addLog(`${enemy.emoji} ${enemy.name}이(가) 투명화로 회피!`);
      } else {
        const newHp = Math.max(0, enemy.hp - damage);
        setEnemy((e) => e ? { ...e, hp: newHp } : e);

        if (newHp <= 0) {
          // Enemy defeated
          const reward = enemy.isBoss ? 50 + currentChapter * 30 : 15 + currentChapter * 5;
          setCoins((c) => c + reward);
          addLog(`🎉 ${enemy.name} 처치! +${reward} 🪙`);

          if (enemyQueue.length > 0) {
            // Next enemy
            setTimeout(() => {
              const next = enemyQueue[0];
              setEnemyQueue((q) => q.slice(1));
              setEnemy(next);
              setBattleWaveIndex((i) => i + 1);
              addLog(`${next.emoji} ${next.name} 등장!`);
              setIsPlayerTurn(true);
              setIsBattleBusy(false);
            }, 1000);
            return;
          } else {
            // Chapter cleared!
            setTimeout(() => {
              const chapter = CHAPTERS[currentChapter - 1];
              // Apply rewards
              if (currentChapter === 1 && spinjitzuLevel < 1) setSpinjitzuLevel(1);
              if (currentChapter === 2 && spinjitzuLevel < 2) setSpinjitzuLevel(2);
              if (currentChapter === 3 && spinjitzuLevel < 3) setSpinjitzuLevel(3);
              if (currentChapter === 4) setHasAirjitzu(true);

              if (!chaptersCleared.includes(currentChapter)) {
                setChaptersCleared((p) => [...p, currentChapter]);
                if (currentChapter >= 5) {
                  setClearCount((c) => {
                    const newCount = c + 1;
                    if (newCount >= 3) setLloydUnlocked(true);
                    return newCount;
                  });
                }
              }
              if (currentChapter < 5) setMaxChapter((m) => Math.max(m, currentChapter + 1));

              if (currentChapter === 5) {
                setScreen("gameClear");
              } else {
                setScreen("victory");
              }
              setIsBattleBusy(false);
            }, 1200);
            return;
          }
        }
      }
    }

    // Enemy turn after player action
    setIsPlayerTurn(false);
    setTimeout(() => {
      doEnemyTurn();
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayerTurn, enemy, playerStats, selectedNinja, isBattleBusy, comboCount, lastAction, spinjitzuLevel, hasAirjitzu, weaponIndex, armorIndex, enemyQueue, currentChapter, chaptersCleared, battlePotions, powerUp, isDefending, getEffectiveStats, getSpinjitzuMultiplier, getSpinjitzuName, addLog, flashEffect]);

  const doEnemyTurn = useCallback(() => {
    setEnemy((currentEnemy) => {
      if (!currentEnemy || currentEnemy.hp <= 0) {
        setIsBattleBusy(false);
        setIsPlayerTurn(true);
        return currentEnemy;
      }

      setPlayerStats((currentStats) => {
        if (!currentStats) {
          setIsBattleBusy(false);
          setIsPlayerTurn(true);
          return currentStats;
        }

        const eff = {
          ...currentStats,
          def: currentStats.def + ARMORS[armorIndex].defBonus,
          maxHp: currentStats.maxHp + ARMORS[armorIndex].hpBonus,
        };

        let totalDamage = 0;
        const defReduction = isDefending ? 0.5 : 1;

        // Special ability
        const useSpecial = currentEnemy.specialAbility && Math.random() < (currentEnemy.specialChance || 0);
        let attacks = 1;

        if (useSpecial && currentEnemy.specialAbility?.includes("2회 공격")) {
          attacks = 2;
          addLog(`${currentEnemy.emoji} ${currentEnemy.name}의 ${currentEnemy.specialAbility}`);
        } else if (useSpecial && currentEnemy.specialAbility?.includes("독")) {
          setPoisonTurns(3);
          addLog(`${currentEnemy.emoji} ${currentEnemy.name}의 ${currentEnemy.specialAbility}`);
        } else if (useSpecial && currentEnemy.specialAbility?.includes("방어 무시")) {
          totalDamage = Math.floor(currentEnemy.atk * 1.5 * defReduction);
          addLog(`${currentEnemy.emoji} ${currentEnemy.name}의 ${currentEnemy.specialAbility} ${totalDamage} 데미지!`);
          setShakePlayer(true);
          setTimeout(() => setShakePlayer(false), 300);
          flashEffect("bg-red-600");

          const newHp = Math.max(0, eff.hp - totalDamage);
          if (newHp <= 0) {
            addLog("💔 쓰러졌습니다...");
            setTimeout(() => {
              setScreen("defeat");
              setIsBattleBusy(false);
            }, 1000);
            return { ...currentStats, hp: 0 };
          }

          // Energy regen + poison
          let finalHp = newHp;
          const newEnergy = Math.min(eff.maxEnergy, eff.energy + 10);
          if (poisonTurns > 0) {
            finalHp = Math.max(0, finalHp - 5);
            setPoisonTurns((p) => p - 1);
            addLog("🤢 독 데미지! -5 HP");
          }

          setIsPlayerTurn(true);
          setIsBattleBusy(false);
          return { ...currentStats, hp: finalHp, energy: newEnergy };
        }

        for (let i = 0; i < attacks; i++) {
          const dmg = Math.max(1, Math.floor((currentEnemy.atk - eff.def * 0.4) * defReduction));
          totalDamage += dmg;
        }

        if (!useSpecial || currentEnemy.specialAbility?.includes("2회 공격")) {
          addLog(`${currentEnemy.emoji} ${currentEnemy.name}의 공격! ${totalDamage} 데미지!${isDefending ? " (방어 중)" : ""}`);
        }
        setShakePlayer(true);
        setTimeout(() => setShakePlayer(false), 300);
        flashEffect("bg-red-600");

        const newHp = Math.max(0, eff.hp - totalDamage);

        if (newHp <= 0) {
          addLog("💔 쓰러졌습니다...");
          setTimeout(() => {
            setScreen("defeat");
            setIsBattleBusy(false);
          }, 1000);
          return { ...currentStats, hp: 0 };
        }

        // Energy regen
        let finalHp = newHp;
        const newEnergy = Math.min(eff.maxEnergy, eff.energy + 10);

        // Poison damage
        if (poisonTurns > 0) {
          finalHp = Math.max(0, finalHp - 5);
          setPoisonTurns((p) => p - 1);
          addLog("🤢 독 데미지! -5 HP");
        }

        setIsPlayerTurn(true);
        setIsBattleBusy(false);
        return { ...currentStats, hp: finalHp, energy: newEnergy };
      });

      return currentEnemy;
    });
  }, [armorIndex, isDefending, poisonTurns, addLog, flashEffect]);

  // --- Training: Spin ---
  const startSpinTraining = () => {
    setSpinMeter(0);
    setSpinPhase("charging");
    setScreen("spinTraining");
  };

  const tapSpin = () => {
    if (spinPhase === "charging") {
      setSpinMeter((p) => Math.min(100, p + 4));
    }
  };

  const releaseSpin = () => {
    if (spinPhase !== "charging") return;
    setSpinPhase("release");
    const score = spinMeter >= 80 && spinMeter <= 95 ? "완벽" : spinMeter >= 60 ? "좋음" : "보통";
    setTimeout(() => {
      if (score === "완벽" && playerStats) {
        setPlayerStats((p) => p ? { ...p, atk: p.atk + 2 } : p);
      } else if (score === "좋음" && playerStats) {
        setPlayerStats((p) => p ? { ...p, atk: p.atk + 1 } : p);
      }
      setSpinPhase("done");
    }, 1000);
  };

  // --- Training: Weapon ---
  const startWeaponTraining = () => {
    setWeaponRound(0);
    setWeaponTrainingDone(false);
    setPlayerPattern([]);
    nextWeaponRound(0);
    setScreen("weaponTraining");
  };

  const nextWeaponRound = (round: number) => {
    const dirs = ["↑", "↓", "←", "→"];
    const len = 3 + round;
    const pattern = Array.from({ length: len }, () => dirs[Math.floor(Math.random() * 4)]);
    setWeaponPattern(pattern);
    setPlayerPattern([]);
    setShowingPattern(true);
    setWeaponRound(round);
    setTimeout(() => setShowingPattern(false), 1500 + round * 500);
  };

  const inputWeaponDir = (dir: string) => {
    if (showingPattern || weaponTrainingDone) return;
    const newPattern = [...playerPattern, dir];
    setPlayerPattern(newPattern);

    if (newPattern.length === weaponPattern.length) {
      const correct = newPattern.every((d, i) => d === weaponPattern[i]);
      if (correct) {
        if (weaponRound >= 4) {
          setWeaponTrainingDone(true);
          if (playerStats) {
            setPlayerStats((p) => p ? { ...p, def: p.def + 2, spd: p.spd + 1 } : p);
          }
        } else {
          setTimeout(() => nextWeaponRound(weaponRound + 1), 500);
        }
      } else {
        setWeaponTrainingDone(true);
        if (playerStats && weaponRound > 0) {
          setPlayerStats((p) => p ? { ...p, def: p.def + 1 } : p);
        }
      }
    }
  };

  // --- Training: Meditation ---
  const startMeditation = () => {
    setMeditationPos(50);
    setMeditationTimer(10);
    setMeditationScore(0);
    setMeditationActive(true);
    setScreen("meditationTraining");
  };

  const nudgeMeditation = (dir: "left" | "right") => {
    if (!meditationActive) return;
    setMeditationPos((p) => Math.max(0, Math.min(100, p + (dir === "left" ? -5 : 5))));
  };

  // --- Shop ---
  const buyWeapon = (idx: number) => {
    const w = WEAPONS[idx];
    if (idx <= weaponIndex || coins < w.price) return;
    setCoins((c) => c - w.price);
    setWeaponIndex(idx);
  };

  const buyArmor = (idx: number) => {
    const a = ARMORS[idx];
    if (idx <= armorIndex || coins < a.price) return;
    setCoins((c) => c - a.price);
    setArmorIndex(idx);
    if (playerStats) {
      setPlayerStats((p) => p ? { ...p, maxHp: p.maxHp + a.hpBonus } : p);
    }
  };

  const buyPotion = (potion: Potion) => {
    if (coins < potion.price) return;
    setCoins((c) => c - potion.price);
    setPotions((p) => [...p, { type: potion.type, value: potion.value, name: potion.name }]);
  };

  // --- Render ---
  const ninjaColor = selectedNinja?.textColor || "text-red-500";
  const ninjaBorder = selectedNinja?.borderColor || "border-red-500";

  // ==================== TITLE SCREEN ====================
  if (screen === "title") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-red-950 to-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-4xl animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            >
              {["🔥", "⚡", "🪨", "❄️", "💧", "💚"][i % 6]}
            </div>
          ))}
        </div>

        <Link href="/" className="absolute top-4 left-4 text-gray-400 hover:text-white text-sm z-10">
          ← 홈으로
        </Link>

        <div className="relative z-10 text-center">
          <div className={`text-8xl mb-4 transition-all duration-300 ${titleFlicker ? "scale-110 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]" : "scale-100"}`}>
            🥷
          </div>
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-red-500 mb-2 tracking-wider" style={{ textShadow: "0 0 40px rgba(239,68,68,0.5)" }}>
            닌자고
          </h1>
          <p className="text-xl text-red-300 mb-2 font-bold">NINJAGO</p>
          <p className="text-gray-400 mb-8 text-sm">스핀짓주를 배워 닌자고 시티를 구하라!</p>

          <button
            onClick={() => setScreen("select")}
            className="px-12 py-4 bg-gradient-to-r from-red-700 to-red-900 text-white rounded-lg text-2xl font-bold hover:from-red-600 hover:to-red-800 transition-all shadow-lg shadow-red-900/50 border border-red-600 hover:scale-105 active:scale-95"
          >
            ⚔️ 게임 시작
          </button>

          <div className="mt-8 flex gap-6 text-3xl">
            <span className="animate-bounce" style={{ animationDelay: "0s" }}>🔥</span>
            <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>⚡</span>
            <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>🪨</span>
            <span className="animate-bounce" style={{ animationDelay: "0.6s" }}>❄️</span>
            <span className="animate-bounce" style={{ animationDelay: "0.8s" }}>💧</span>
            <span className="animate-bounce" style={{ animationDelay: "1.0s" }}>💚</span>
          </div>
        </div>
      </div>
    );
  }

  // ==================== SELECT NINJA ====================
  if (screen === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4">
        <button onClick={() => setScreen("title")} className="text-gray-400 hover:text-white text-sm mb-4">
          ← 돌아가기
        </button>
        <h2 className="text-3xl font-black text-center text-yellow-400 mb-2">🥷 닌자 선택</h2>
        <p className="text-center text-gray-400 mb-6 text-sm">당신의 닌자를 선택하세요!</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {NINJAS.map((ninja) => {
            const locked = ninja.hidden && !lloydUnlocked;
            return (
              <button
                key={ninja.id}
                onClick={() => !locked && selectNinja(ninja)}
                disabled={locked}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  locked
                    ? "border-gray-700 bg-gray-900/50 opacity-50 cursor-not-allowed"
                    : `${ninja.borderColor} ${ninja.bgColor} hover:scale-105 active:scale-95 hover:shadow-lg ${ninja.glowColor}`
                }`}
              >
                {locked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl z-10">
                    <div className="text-center">
                      <div className="text-2xl">🔒</div>
                      <div className="text-xs text-gray-400 mt-1">3회 클리어 시 해금</div>
                      <div className="text-xs text-gray-500">({clearCount}/3)</div>
                    </div>
                  </div>
                )}
                <div className="text-4xl mb-2">{ninja.emoji}</div>
                <div className={`text-lg font-bold ${ninja.textColor}`}>{ninja.name}</div>
                <div className="text-xs text-gray-400">{ninja.element}</div>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">HP</span><span className="text-red-400">{ninja.stats.hp}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">ATK</span><span className="text-orange-400">{ninja.stats.atk}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">DEF</span><span className="text-blue-400">{ninja.stats.def}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">SPD</span><span className="text-green-400">{ninja.stats.spd}</span></div>
                </div>
                <div className="mt-2 text-xs text-yellow-400 font-bold">{ninja.specialMove}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ==================== HUB ====================
  if (screen === "hub" && selectedNinja && playerStats) {
    const eff = getEffectiveStats()!;
    return (
      <div className={`min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4`}>
        <button onClick={() => setScreen("title")} className="text-gray-400 hover:text-white text-sm mb-4">
          ← 타이틀로
        </button>

        {/* Ninja Status */}
        <div className={`max-w-lg mx-auto mb-4 p-4 rounded-xl border-2 ${ninjaBorder} ${selectedNinja.bgColor}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="text-4xl">{selectedNinja.emoji}</div>
            <div>
              <div className={`text-xl font-bold ${ninjaColor}`}>{selectedNinja.name}</div>
              <div className="text-xs text-gray-400">{selectedNinja.element}의 닌자 | 🪙 {coins}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>❤️ HP: {playerStats.hp}/{eff.maxHp}</div>
            <div>⚔️ ATK: {eff.atk}</div>
            <div>🛡️ DEF: {eff.def}</div>
            <div>💨 SPD: {eff.spd}</div>
            <div>⚡ 에너지: {playerStats.energy}/{eff.maxEnergy}</div>
            <div>🌀 {getSpinjitzuName()}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            무기: {WEAPONS[weaponIndex].emoji} {WEAPONS[weaponIndex].name} | 갑옷: {ARMORS[armorIndex].emoji} {ARMORS[armorIndex].name}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            물약: {potions.length}개
          </div>
        </div>

        {/* Menu */}
        <div className="max-w-lg mx-auto space-y-3">
          <button
            onClick={() => setScreen("story")}
            className="w-full p-4 bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-700 rounded-xl text-left hover:from-red-800/50 hover:to-red-700/50 transition-all"
          >
            <div className="text-lg font-bold text-red-400">📜 스토리 모드</div>
            <div className="text-xs text-gray-400">닌자고 시티를 위협하는 적을 물리치자!</div>
          </button>

          <button
            onClick={() => setScreen("training")}
            className="w-full p-4 bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 border border-yellow-700 rounded-xl text-left hover:from-yellow-800/50 hover:to-yellow-700/50 transition-all"
          >
            <div className="text-lg font-bold text-yellow-400">🥋 스핀짓주 훈련</div>
            <div className="text-xs text-gray-400">미니게임으로 능력치를 올리자!</div>
          </button>

          <button
            onClick={() => setScreen("shop")}
            className="w-full p-4 bg-gradient-to-r from-purple-900/50 to-purple-800/50 border border-purple-700 rounded-xl text-left hover:from-purple-800/50 hover:to-purple-700/50 transition-all"
          >
            <div className="text-lg font-bold text-purple-400">🏪 장비 & 상점</div>
            <div className="text-xs text-gray-400">무기, 갑옷, 물약을 구매하자!</div>
          </button>
        </div>
      </div>
    );
  }

  // ==================== TRAINING HUB ====================
  if (screen === "training" && selectedNinja) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-yellow-950/30 to-gray-950 p-4">
        <button onClick={() => setScreen("hub")} className="text-gray-400 hover:text-white text-sm mb-4">
          ← 돌아가기
        </button>
        <h2 className="text-3xl font-black text-center text-yellow-400 mb-6">🥋 스핀짓주 훈련</h2>

        <div className="max-w-lg mx-auto space-y-4">
          <button
            onClick={startSpinTraining}
            className="w-full p-4 bg-gradient-to-r from-orange-900/40 to-orange-800/40 border border-orange-600 rounded-xl text-left hover:scale-[1.02] transition-all"
          >
            <div className="text-lg font-bold text-orange-400">🌀 회전 연습</div>
            <div className="text-xs text-gray-400">빠르게 탭하여 스핀 미터를 채우고, 적절한 타이밍에 놓아라!</div>
            <div className="text-xs text-green-400 mt-1">보상: 공격력 +1~2</div>
          </button>

          <button
            onClick={startWeaponTraining}
            className="w-full p-4 bg-gradient-to-r from-blue-900/40 to-blue-800/40 border border-blue-600 rounded-xl text-left hover:scale-[1.02] transition-all"
          >
            <div className="text-lg font-bold text-blue-400">⚔️ 무기 수련</div>
            <div className="text-xs text-gray-400">패턴을 기억하고 따라하라! 5라운드 도전!</div>
            <div className="text-xs text-green-400 mt-1">보상: 방어력 +1~2, 속도 +1</div>
          </button>

          <button
            onClick={startMeditation}
            className="w-full p-4 bg-gradient-to-r from-teal-900/40 to-teal-800/40 border border-teal-600 rounded-xl text-left hover:scale-[1.02] transition-all"
          >
            <div className="text-lg font-bold text-teal-400">🧘 명상</div>
            <div className="text-xs text-gray-400">10초간 슬라이더를 중앙에 유지하라!</div>
            <div className="text-xs text-green-400 mt-1">보상: HP 회복 + 다음 공격 강화</div>
          </button>
        </div>
      </div>
    );
  }

  // ==================== SPIN TRAINING ====================
  if (screen === "spinTraining" && selectedNinja) {
    const spinDeg = spinMeter * 3.6;
    const perfect = spinMeter >= 80 && spinMeter <= 95;
    const good = spinMeter >= 60 && !perfect;
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-yellow-950/20 to-gray-950 p-4 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6">🌀 회전 연습</h2>

        <div className="relative w-48 h-48 mb-6">
          <div
            className={`absolute inset-0 rounded-full border-4 ${ninjaBorder} flex items-center justify-center transition-all`}
            style={{
              transform: `rotate(${spinDeg}deg)`,
              boxShadow: spinMeter > 60 ? `0 0 ${spinMeter / 2}px ${selectedNinja.textColor.includes("red") ? "#ef4444" : selectedNinja.textColor.includes("blue") ? "#3b82f6" : selectedNinja.textColor.includes("stone") ? "#a8a29e" : selectedNinja.textColor.includes("cyan") ? "#06b6d4" : selectedNinja.textColor.includes("sky") ? "#0ea5e9" : "#22c55e"}` : "none",
            }}
          >
            <span className="text-6xl" style={{ transform: `rotate(-${spinDeg}deg)` }}>{selectedNinja.emoji}</span>
          </div>
          {spinMeter > 40 && (
            <div className="absolute inset-0 rounded-full animate-spin opacity-30 border-2 border-dashed" style={{ borderColor: selectedNinja.textColor.includes("red") ? "#ef4444" : "#3b82f6", animationDuration: `${Math.max(0.2, 2 - spinMeter / 60)}s` }} />
          )}
        </div>

        {/* Meter bar */}
        <div className="w-64 h-6 bg-gray-800 rounded-full overflow-hidden mb-4 border border-gray-600">
          <div
            className={`h-full transition-all rounded-full ${perfect ? "bg-yellow-400" : good ? "bg-green-500" : "bg-red-500"}`}
            style={{ width: `${spinMeter}%` }}
          />
        </div>
        <div className="text-sm text-gray-400 mb-2">
          {spinMeter < 60 && "더 빠르게!"}
          {good && "좋아! 조금만 더!"}
          {perfect && "🌟 완벽한 타이밍! 지금 놓아라!"}
          {spinMeter > 95 && "⚠️ 너무 높아! 빨리 놓아!"}
        </div>
        <div className="text-xs text-gray-500 mb-4">80~95% 구간에서 놓으면 완벽!</div>

        {spinPhase === "charging" && (
          <div className="flex gap-4">
            <button
              onClick={tapSpin}
              className="px-8 py-4 bg-gradient-to-r from-yellow-700 to-yellow-900 text-white rounded-xl text-xl font-bold hover:from-yellow-600 hover:to-yellow-800 active:scale-90 transition-all border border-yellow-500"
            >
              🌀 탭!
            </button>
            <button
              onClick={releaseSpin}
              className="px-8 py-4 bg-gradient-to-r from-green-700 to-green-900 text-white rounded-xl text-xl font-bold hover:from-green-600 hover:to-green-800 active:scale-90 transition-all border border-green-500"
            >
              ✋ 놓기
            </button>
          </div>
        )}

        {spinPhase === "release" && (
          <div className="text-3xl text-yellow-400 animate-pulse font-bold">🌪️ 스핀짓주!!!</div>
        )}

        {spinPhase === "done" && (
          <div className="text-center">
            <div className={`text-2xl font-bold mb-2 ${perfect ? "text-yellow-400" : good ? "text-green-400" : "text-gray-400"}`}>
              {perfect ? "🌟 완벽! 공격력 +2!" : good ? "👍 좋음! 공격력 +1!" : "💪 다음엔 더 잘하자!"}
            </div>
            <button
              onClick={() => setScreen("training")}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              돌아가기
            </button>
          </div>
        )}
      </div>
    );
  }

  // ==================== WEAPON TRAINING ====================
  if (screen === "weaponTraining") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-blue-950/20 to-gray-950 p-4 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-blue-400 mb-2">⚔️ 무기 수련</h2>
        <p className="text-sm text-gray-400 mb-6">라운드 {weaponRound + 1}/5</p>

        {/* Pattern display */}
        <div className="flex gap-2 mb-6 min-h-[60px] items-center">
          {showingPattern ? (
            weaponPattern.map((dir, i) => (
              <div key={i} className="w-12 h-12 flex items-center justify-center bg-blue-800 rounded-lg text-2xl font-bold text-white border border-blue-500 animate-pulse">
                {dir}
              </div>
            ))
          ) : (
            weaponPattern.map((_, i) => (
              <div key={i} className={`w-12 h-12 flex items-center justify-center rounded-lg text-2xl font-bold border ${
                i < playerPattern.length
                  ? playerPattern[i] === weaponPattern[i]
                    ? "bg-green-800 border-green-500 text-green-300"
                    : "bg-red-800 border-red-500 text-red-300"
                  : "bg-gray-800 border-gray-600 text-gray-500"
              }`}>
                {i < playerPattern.length ? playerPattern[i] : "?"}
              </div>
            ))
          )}
        </div>

        {!showingPattern && !weaponTrainingDone && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div />
            <button onClick={() => inputWeaponDir("↑")} className="w-16 h-16 bg-gray-800 rounded-xl text-3xl hover:bg-gray-700 active:scale-90 transition-all border border-gray-600">↑</button>
            <div />
            <button onClick={() => inputWeaponDir("←")} className="w-16 h-16 bg-gray-800 rounded-xl text-3xl hover:bg-gray-700 active:scale-90 transition-all border border-gray-600">←</button>
            <button onClick={() => inputWeaponDir("↓")} className="w-16 h-16 bg-gray-800 rounded-xl text-3xl hover:bg-gray-700 active:scale-90 transition-all border border-gray-600">↓</button>
            <button onClick={() => inputWeaponDir("→")} className="w-16 h-16 bg-gray-800 rounded-xl text-3xl hover:bg-gray-700 active:scale-90 transition-all border border-gray-600">→</button>
          </div>
        )}

        {showingPattern && (
          <p className="text-yellow-400 animate-pulse text-lg font-bold">👀 패턴을 기억하세요!</p>
        )}

        {weaponTrainingDone && (
          <div className="text-center">
            <div className={`text-2xl font-bold mb-2 ${weaponRound >= 4 ? "text-yellow-400" : "text-blue-400"}`}>
              {weaponRound >= 4 ? "🌟 완벽 클리어! 방어력 +2, 속도 +1!" : `라운드 ${weaponRound + 1}까지 성공!${weaponRound > 0 ? " 방어력 +1!" : ""}`}
            </div>
            <button
              onClick={() => setScreen("training")}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              돌아가기
            </button>
          </div>
        )}
      </div>
    );
  }

  // ==================== MEDITATION TRAINING ====================
  if (screen === "meditationTraining" && selectedNinja && playerStats) {
    const inZone = Math.abs(meditationPos - 50) < 10;
    const done = meditationTimer <= 0;
    const success = meditationScore >= 60;
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-teal-950/20 to-gray-950 p-4 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-teal-400 mb-2">🧘 명상</h2>
        <p className="text-sm text-gray-400 mb-6">슬라이더를 중앙에 유지하세요!</p>

        <div className="text-3xl mb-4 font-mono text-yellow-400">{meditationTimer.toFixed(1)}초</div>

        {/* Slider */}
        <div className="w-72 h-8 bg-gray-800 rounded-full relative mb-6 border border-gray-600 overflow-hidden">
          {/* Center zone */}
          <div className="absolute h-full bg-green-900/40 left-[40%] w-[20%]" />
          {/* Marker */}
          <div
            className={`absolute top-0 h-full w-4 rounded-full transition-all duration-100 ${
              inZone ? "bg-green-400 shadow-lg shadow-green-400/50" : "bg-red-400 shadow-lg shadow-red-400/50"
            }`}
            style={{ left: `calc(${meditationPos}% - 8px)` }}
          />
        </div>

        <div className={`text-lg font-bold mb-4 ${inZone ? "text-green-400" : "text-red-400"}`}>
          {inZone ? "✨ 집중!" : "⚠️ 균형을 잡아!"}
        </div>

        {!done && (
          <div className="flex gap-4">
            <button
              onClick={() => nudgeMeditation("left")}
              className="px-8 py-4 bg-gray-800 rounded-xl text-2xl hover:bg-gray-700 active:scale-90 transition-all border border-gray-600"
            >
              ←
            </button>
            <button
              onClick={() => nudgeMeditation("right")}
              className="px-8 py-4 bg-gray-800 rounded-xl text-2xl hover:bg-gray-700 active:scale-90 transition-all border border-gray-600"
            >
              →
            </button>
          </div>
        )}

        {done && (
          <div className="text-center">
            <div className={`text-2xl font-bold mb-2 ${success ? "text-green-400" : "text-gray-400"}`}>
              {success ? "🧘 명상 성공! HP 회복 + 공격 강화!" : "😮‍💨 아쉽다! 다시 도전!"}
            </div>
            {success && (
              <div className="text-sm text-green-300 mb-2">HP +15, 다음 전투 시 파워업!</div>
            )}
            <button
              onClick={() => {
                if (success) {
                  setPlayerStats((p) => p ? { ...p, hp: Math.min(p.maxHp, p.hp + 15) } : p);
                  setPotions((p) => [...p, { type: "power", value: 2, name: "명상의 힘" }]);
                }
                setScreen("training");
              }}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              돌아가기
            </button>
          </div>
        )}
      </div>
    );
  }

  // ==================== STORY MODE ====================
  if (screen === "story" && selectedNinja) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4">
        <button onClick={() => setScreen("hub")} className="text-gray-400 hover:text-white text-sm mb-4">
          ← 돌아가기
        </button>
        <h2 className="text-3xl font-black text-center text-red-400 mb-2">📜 스토리 모드</h2>
        <p className="text-center text-gray-400 mb-6 text-sm">닌자고 시티를 구하라!</p>

        <div className="max-w-lg mx-auto space-y-3">
          {CHAPTERS.map((chapter) => {
            const unlocked = chapter.id <= maxChapter;
            const cleared = chaptersCleared.includes(chapter.id);
            return (
              <button
                key={chapter.id}
                onClick={() => unlocked && startChapter(chapter.id)}
                disabled={!unlocked}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  unlocked
                    ? cleared
                      ? "bg-green-900/20 border-green-700 hover:bg-green-900/30"
                      : "bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 hover:scale-[1.02]"
                    : "bg-gray-900/50 border-gray-800 opacity-40 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{unlocked ? chapter.emoji : "🔒"}</div>
                  <div>
                    <div className="text-lg font-bold text-white">
                      챕터 {chapter.id}: {chapter.title}
                      {cleared && " ✅"}
                    </div>
                    <div className="text-xs text-gray-400">{chapter.subtitle}</div>
                    <div className="text-xs text-yellow-400 mt-1">보상: {chapter.reward}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ==================== BATTLE ====================
  if (screen === "battle" && selectedNinja && playerStats && enemy) {
    const eff = getEffectiveStats()!;
    const hpPct = Math.max(0, (playerStats.hp / eff.maxHp) * 100);
    const enemyHpPct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
    const energyPct = (playerStats.energy / eff.maxEnergy) * 100;
    const chapter = CHAPTERS[currentChapter - 1];

    return (
      <div className={`min-h-screen bg-gradient-to-b ${chapter.bgGradient} p-4 relative overflow-hidden`}>
        {/* Battle effect flash */}
        {battleEffect && (
          <div className={`absolute inset-0 ${battleEffect} opacity-30 z-20 pointer-events-none animate-pulse`} />
        )}

        <div className="text-center text-xs text-gray-500 mb-2">
          챕터 {currentChapter}: {chapter.title} | Wave {battleWaveIndex + 1}/{2 + 1}
        </div>

        {/* Battle Arena */}
        <div className="max-w-lg mx-auto">
          {/* VS Layout */}
          <div className="flex items-center justify-between mb-4 gap-2">
            {/* Player */}
            <div className={`flex-1 p-3 rounded-xl ${selectedNinja.bgColor} border ${ninjaBorder} ${shakePlayer ? "animate-[shake_0.3s]" : ""}`}
              style={shakePlayer ? { animation: "shake 0.3s ease-in-out" } : {}}
            >
              <div className={`text-5xl text-center mb-2 ${shakePlayer ? "animate-pulse" : ""}`}>
                {selectedNinja.emoji}
              </div>
              <div className={`text-center text-sm font-bold ${ninjaColor}`}>{selectedNinja.name}</div>
              {/* HP Bar */}
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>HP</span>
                  <span>{playerStats.hp}/{eff.maxHp}</span>
                </div>
                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      hpPct > 50 ? "bg-green-500" : hpPct > 25 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>
              {/* Energy Bar */}
              <div className="mt-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>⚡</span>
                  <span>{playerStats.energy}/{eff.maxEnergy}</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${energyPct}%` }} />
                </div>
              </div>
              {poisonTurns > 0 && <div className="text-xs text-purple-400 mt-1">🤢 독 {poisonTurns}턴</div>}
              {powerUp && <div className="text-xs text-yellow-400 mt-1">💪 파워업!</div>}
              {isDefending && <div className="text-xs text-blue-400 mt-1">🛡️ 방어 중</div>}
            </div>

            {/* VS */}
            <div className="text-2xl font-black text-red-500 animate-pulse mx-2">VS</div>

            {/* Enemy */}
            <div className={`flex-1 p-3 rounded-xl bg-gray-800/50 border border-gray-600 ${shakeEnemy ? "animate-[shake_0.3s]" : ""}`}
              style={shakeEnemy ? { animation: "shake 0.3s ease-in-out" } : {}}
            >
              <div className={`text-5xl text-center mb-2 ${shakeEnemy ? "animate-pulse" : ""}`}>
                {enemy.emoji}
              </div>
              <div className="text-center text-sm font-bold text-gray-300">
                {enemy.name}
                {enemy.isBoss && " 👑"}
              </div>
              {/* HP Bar */}
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>HP</span>
                  <span>{enemy.hp}/{enemy.maxHp}</span>
                </div>
                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      enemyHpPct > 50 ? "bg-red-600" : enemyHpPct > 25 ? "bg-orange-500" : "bg-red-400 animate-pulse"
                    }`}
                    style={{ width: `${enemyHpPct}%` }}
                  />
                </div>
              </div>
              {enemy.isBoss && enemy.specialAbility && (
                <div className="text-xs text-yellow-400 mt-1 text-center">⚠️ {enemy.specialAbility}</div>
              )}
            </div>
          </div>

          {/* Battle Log */}
          <div ref={logRef} className="h-28 bg-black/40 rounded-xl p-3 mb-4 overflow-y-auto border border-gray-700 text-xs space-y-1">
            {battleLog.map((log, i) => (
              <div key={i} className="text-gray-300">{log}</div>
            ))}
          </div>

          {/* Action Buttons */}
          {isPlayerTurn && !isBattleBusy && (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => doBattleAction("attack")}
                className="p-3 bg-gray-800 rounded-xl border border-gray-600 hover:bg-gray-700 active:scale-95 transition-all"
              >
                <div className="text-2xl">⚔️</div>
                <div className="text-xs text-gray-300">일반 공격</div>
              </button>
              <button
                onClick={() => doBattleAction("spinjitzu")}
                className={`p-3 rounded-xl border active:scale-95 transition-all ${
                  spinjitzuLevel > 0 || hasAirjitzu
                    ? "bg-yellow-900/30 border-yellow-600 hover:bg-yellow-800/30"
                    : "bg-gray-900 border-gray-700 opacity-50"
                }`}
              >
                <div className="text-2xl">🌀</div>
                <div className="text-xs text-yellow-300">{getSpinjitzuName()}</div>
                <div className="text-[10px] text-gray-500">30 ⚡</div>
              </button>
              <button
                onClick={() => doBattleAction("element")}
                className={`p-3 rounded-xl border active:scale-95 transition-all ${selectedNinja.bgColor} ${ninjaBorder} hover:opacity-80`}
              >
                <div className="text-2xl">{selectedNinja.elementEmoji}</div>
                <div className={`text-xs ${ninjaColor}`}>{selectedNinja.element} 공격</div>
                <div className="text-[10px] text-gray-500">20 ⚡</div>
              </button>
              <button
                onClick={() => doBattleAction("potion")}
                className="p-3 bg-green-900/30 rounded-xl border border-green-700 hover:bg-green-800/30 active:scale-95 transition-all"
              >
                <div className="text-2xl">🧪</div>
                <div className="text-xs text-green-300">물약 ({battlePotions.length})</div>
              </button>
              <button
                onClick={() => doBattleAction("defend")}
                className="p-3 bg-blue-900/30 rounded-xl border border-blue-700 hover:bg-blue-800/30 active:scale-95 transition-all"
              >
                <div className="text-2xl">🛡️</div>
                <div className="text-xs text-blue-300">방어</div>
              </button>
              <div className="p-3 rounded-xl border border-gray-800 text-center">
                <div className="text-xs text-gray-500">콤보</div>
                <div className={`text-xl font-bold ${comboCount > 0 ? "text-yellow-400" : "text-gray-600"}`}>{comboCount > 0 ? `${comboCount + 1}x` : "-"}</div>
              </div>
            </div>
          )}

          {!isPlayerTurn && (
            <div className="text-center text-lg text-red-400 animate-pulse font-bold py-4">
              {enemy.emoji} 적의 차례...
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            50% { transform: translateX(8px); }
            75% { transform: translateX(-4px); }
          }
        `}</style>
      </div>
    );
  }

  // ==================== SHOP ====================
  if (screen === "shop" && selectedNinja) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-purple-950/20 to-gray-950 p-4">
        <button onClick={() => setScreen("hub")} className="text-gray-400 hover:text-white text-sm mb-4">
          ← 돌아가기
        </button>
        <h2 className="text-3xl font-black text-center text-purple-400 mb-2">🏪 장비 & 상점</h2>
        <p className="text-center text-yellow-400 mb-6">🪙 {coins} 코인</p>

        <div className="max-w-lg mx-auto space-y-6">
          {/* Weapons */}
          <div>
            <h3 className="text-lg font-bold text-orange-400 mb-2">⚔️ 무기</h3>
            <div className="space-y-2">
              {WEAPONS.map((w, i) => {
                const owned = i <= weaponIndex;
                const equipped = i === weaponIndex;
                const canBuy = !owned && coins >= w.price && i === weaponIndex + 1;
                return (
                  <button
                    key={i}
                    onClick={() => canBuy && buyWeapon(i)}
                    disabled={!canBuy && !equipped}
                    className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                      equipped
                        ? "bg-orange-900/30 border-orange-500"
                        : canBuy
                        ? "bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 hover:scale-[1.02]"
                        : "bg-gray-900/30 border-gray-800 opacity-50"
                    }`}
                  >
                    <span className="text-2xl">{w.emoji}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white">{w.name}</div>
                      <div className="text-xs text-gray-400">ATK +{w.atkBonus}</div>
                    </div>
                    <div className="text-sm">
                      {equipped ? <span className="text-orange-400">장착 중</span> : owned ? <span className="text-green-400">보유</span> : <span className="text-yellow-400">{w.price} 🪙</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Armor */}
          <div>
            <h3 className="text-lg font-bold text-blue-400 mb-2">🛡️ 갑옷</h3>
            <div className="space-y-2">
              {ARMORS.map((a, i) => {
                const owned = i <= armorIndex;
                const equipped = i === armorIndex;
                const canBuy = !owned && coins >= a.price && i === armorIndex + 1;
                return (
                  <button
                    key={i}
                    onClick={() => canBuy && buyArmor(i)}
                    disabled={!canBuy && !equipped}
                    className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                      equipped
                        ? "bg-blue-900/30 border-blue-500"
                        : canBuy
                        ? "bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 hover:scale-[1.02]"
                        : "bg-gray-900/30 border-gray-800 opacity-50"
                    }`}
                  >
                    <span className="text-2xl">{a.emoji}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white">{a.name}</div>
                      <div className="text-xs text-gray-400">DEF +{a.defBonus}, HP +{a.hpBonus}</div>
                    </div>
                    <div className="text-sm">
                      {equipped ? <span className="text-blue-400">장착 중</span> : owned ? <span className="text-green-400">보유</span> : <span className="text-yellow-400">{a.price} 🪙</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Potions */}
          <div>
            <h3 className="text-lg font-bold text-green-400 mb-2">🧪 물약 (보유: {potions.length}개)</h3>
            <div className="space-y-2">
              {POTIONS.map((p, i) => {
                const canBuy = coins >= p.price;
                return (
                  <button
                    key={i}
                    onClick={() => canBuy && buyPotion(p)}
                    disabled={!canBuy}
                    className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                      canBuy
                        ? "bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 hover:scale-[1.02]"
                        : "bg-gray-900/30 border-gray-800 opacity-50"
                    }`}
                  >
                    <span className="text-2xl">{p.emoji}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.effect}</div>
                    </div>
                    <span className="text-yellow-400 text-sm">{p.price} 🪙</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== VICTORY ====================
  if (screen === "victory" && selectedNinja) {
    const chapter = CHAPTERS[currentChapter - 1];
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-yellow-950/30 to-gray-950 flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-4xl font-black text-yellow-400 mb-2">승리!</h2>
        <p className="text-lg text-gray-300 mb-2">챕터 {currentChapter}: {chapter.title} 클리어!</p>
        <div className="text-xl text-green-400 font-bold mb-4">🏆 {chapter.reward} 획득!</div>

        <div className="text-4xl mb-6 flex gap-2">
          <span className="animate-pulse">{selectedNinja.emoji}</span>
          <span className="animate-bounce">🌀</span>
          <span className="animate-pulse">{selectedNinja.elementEmoji}</span>
        </div>

        <button
          onClick={() => setScreen("hub")}
          className="px-8 py-3 bg-gradient-to-r from-yellow-700 to-yellow-900 text-white rounded-lg text-lg font-bold hover:from-yellow-600 hover:to-yellow-800 transition-all border border-yellow-500"
        >
          계속하기
        </button>
      </div>
    );
  }

  // ==================== DEFEAT ====================
  if (screen === "defeat") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-red-950/30 to-gray-950 flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">💔</div>
        <h2 className="text-4xl font-black text-red-400 mb-2">패배...</h2>
        <p className="text-gray-400 mb-6">닌자는 절대 포기하지 않는다!</p>

        <div className="flex gap-4">
          <button
            onClick={() => {
              if (playerStats && selectedNinja) {
                setPlayerStats((p) => p ? { ...p, hp: selectedNinja.stats.maxHp, energy: selectedNinja.stats.maxEnergy } : p);
              }
              startChapter(currentChapter);
            }}
            className="px-6 py-3 bg-gradient-to-r from-red-700 to-red-900 text-white rounded-lg font-bold hover:from-red-600 hover:to-red-800 transition-all border border-red-500"
          >
            🔄 다시 도전
          </button>
          <button
            onClick={() => setScreen("hub")}
            className="px-6 py-3 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600 transition-all"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // ==================== GAME CLEAR ====================
  if (screen === "gameClear" && selectedNinja) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-yellow-900/30 to-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-3xl animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              ✨
            </div>
          ))}
        </div>

        <div className="relative z-10 text-center">
          <div className="text-8xl mb-4 animate-bounce">👑</div>
          <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-300 mb-4">
            황금 닌자!
          </h2>
          <p className="text-xl text-yellow-300 mb-2">{selectedNinja.name}(이)가 닌자고 시티를 구했습니다!</p>
          <p className="text-gray-400 mb-6">가마돈을 물리치고 평화를 되찾았다!</p>

          <div className="text-5xl mb-6 flex gap-3 justify-center">
            <span className="animate-pulse">🔥</span>
            <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>⚡</span>
            <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>🪨</span>
            <span className="animate-pulse" style={{ animationDelay: "0.6s" }}>❄️</span>
            <span className="animate-pulse" style={{ animationDelay: "0.8s" }}>💧</span>
            <span className="animate-pulse" style={{ animationDelay: "1.0s" }}>💚</span>
          </div>

          <div className="text-sm text-gray-400 mb-6">
            클리어 횟수: {clearCount}/3 {lloydUnlocked ? "| 🟢 로이드 해금됨!" : "| 다른 닌자로 3번 클리어 시 로이드 해금"}
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setScreen("hub")}
              className="px-6 py-3 bg-gradient-to-r from-yellow-700 to-yellow-900 text-white rounded-lg font-bold hover:from-yellow-600 hover:to-yellow-800 transition-all border border-yellow-500"
            >
              계속 플레이
            </button>
            <button
              onClick={() => {
                setScreen("title");
                setSelectedNinja(null);
                setPlayerStats(null);
              }}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600 transition-all"
            >
              타이틀로
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <button onClick={() => setScreen("title")} className="text-white text-lg">
        🥷 닌자고 시작하기
      </button>
    </div>
  );
}