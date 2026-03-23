"use client";
import { useState, useCallback, useMemo } from "react";
import Link from "next/link";

/* ═══════ 타입 정의 ═══════ */
interface Stats { hp: number; maxHp: number; mp: number; maxMp: number; atk: number; def: number; spd: number; luck: number; }
interface SkillDef { id: string; name: string; emoji: string; mpCost: number; power: number; type: "attack" | "heal" | "buff" | "debuff"; desc: string; unlockLv: number; }
interface ClassDef { id: string; name: string; emoji: string; desc: string; baseStats: Stats; skills: SkillDef[]; }
interface MonsterDef { id: string; name: string; emoji: string; stats: Stats; xpReward: number; goldReward: number; skills: { name: string; emoji: string; power: number; type: "attack" | "debuff" }[]; }
interface AreaDef { id: string; name: string; emoji: string; desc: string; monsters: MonsterDef[]; boss: MonsterDef | null; unlockLv: number; }
interface EquipDef { id: string; name: string; emoji: string; slot: "weapon" | "armor" | "accessory"; atk: number; def: number; hp: number; spd: number; price: number; desc: string; }
interface ItemDef { id: string; name: string; emoji: string; effect: "healHp" | "healMp" | "healAll" | "atkBuff" | "revive"; value: number; price: number; desc: string; }

/* ═══════ 직업 ═══════ */
const CLASSES: ClassDef[] = [
  { id: "warrior", name: "전사", emoji: "⚔️", desc: "높은 체력과 공격력!", baseStats: { hp: 120, maxHp: 120, mp: 30, maxMp: 30, atk: 15, def: 12, spd: 8, luck: 5 },
    skills: [
      { id: "slash", name: "강타", emoji: "⚔️", mpCost: 3, power: 1.5, type: "attack", desc: "강력한 일격!", unlockLv: 1 },
      { id: "shield", name: "방어 태세", emoji: "🛡️", mpCost: 4, power: 1.5, type: "buff", desc: "방어력 UP", unlockLv: 3 },
      { id: "whirl", name: "회전 베기", emoji: "🌀", mpCost: 8, power: 2.0, type: "attack", desc: "적을 크게 베기!", unlockLv: 5 },
      { id: "rage", name: "분노", emoji: "🔥", mpCost: 5, power: 2.0, type: "buff", desc: "공격력 대폭 UP", unlockLv: 8 },
      { id: "execute", name: "처형", emoji: "💀", mpCost: 15, power: 3.5, type: "attack", desc: "필살 일격!", unlockLv: 12 },
    ]},
  { id: "mage", name: "마법사", emoji: "🧙", desc: "강력한 마법 공격!", baseStats: { hp: 80, maxHp: 80, mp: 80, maxMp: 80, atk: 18, def: 6, spd: 10, luck: 8 },
    skills: [
      { id: "fireball", name: "파이어볼", emoji: "🔥", mpCost: 5, power: 1.8, type: "attack", desc: "불덩이 발사!", unlockLv: 1 },
      { id: "heal", name: "힐", emoji: "💚", mpCost: 6, power: 1.5, type: "heal", desc: "HP 회복", unlockLv: 2 },
      { id: "ice", name: "아이스 스톰", emoji: "❄️", mpCost: 10, power: 2.2, type: "attack", desc: "얼음 폭풍!", unlockLv: 5 },
      { id: "thunder", name: "썬더", emoji: "⚡", mpCost: 12, power: 2.5, type: "attack", desc: "벼락을 내리치다!", unlockLv: 8 },
      { id: "meteor", name: "메테오", emoji: "☄️", mpCost: 25, power: 4.0, type: "attack", desc: "하늘에서 운석이!", unlockLv: 12 },
    ]},
  { id: "archer", name: "궁수", emoji: "🏹", desc: "빠른 속도와 행운!", baseStats: { hp: 90, maxHp: 90, mp: 50, maxMp: 50, atk: 14, def: 8, spd: 15, luck: 12 },
    skills: [
      { id: "arrow", name: "정밀 사격", emoji: "🎯", mpCost: 3, power: 1.6, type: "attack", desc: "정확한 화살!", unlockLv: 1 },
      { id: "poison", name: "독화살", emoji: "☠️", mpCost: 5, power: 1.2, type: "debuff", desc: "적 방어력 DOWN", unlockLv: 3 },
      { id: "rain", name: "화살 비", emoji: "🌧️", mpCost: 10, power: 2.0, type: "attack", desc: "화살이 비처럼!", unlockLv: 6 },
      { id: "snipe", name: "저격", emoji: "🔫", mpCost: 8, power: 2.8, type: "attack", desc: "크리티컬 확률 UP!", unlockLv: 9 },
      { id: "storm", name: "폭풍 사격", emoji: "🌪️", mpCost: 18, power: 3.2, type: "attack", desc: "무수한 화살!", unlockLv: 12 },
    ]},
  { id: "healer", name: "성직자", emoji: "⛪", desc: "회복과 보조 특화!", baseStats: { hp: 100, maxHp: 100, mp: 70, maxMp: 70, atk: 10, def: 10, spd: 9, luck: 10 },
    skills: [
      { id: "sheal", name: "치유의 빛", emoji: "✨", mpCost: 5, power: 2.0, type: "heal", desc: "따뜻한 치유", unlockLv: 1 },
      { id: "bless", name: "축복", emoji: "🙏", mpCost: 6, power: 1.5, type: "buff", desc: "모든 스탯 UP", unlockLv: 2 },
      { id: "smite", name: "신성한 일격", emoji: "💫", mpCost: 8, power: 1.8, type: "attack", desc: "빛의 공격!", unlockLv: 4 },
      { id: "barrier", name: "보호막", emoji: "🔮", mpCost: 12, power: 2.0, type: "buff", desc: "방어력 대폭 UP", unlockLv: 7 },
      { id: "miracle", name: "기적", emoji: "🌟", mpCost: 20, power: 4.0, type: "heal", desc: "HP 완전 회복!", unlockLv: 11 },
    ]},
];

/* ═══════ 몬스터 ═══════ */
const mkMon = (id: string, name: string, emoji: string, hp: number, atk: number, def: number, spd: number, xp: number, gold: number, skills: MonsterDef["skills"]): MonsterDef => ({
  id, name, emoji, stats: { hp, maxHp: hp, mp: 99, maxMp: 99, atk, def, spd, luck: 5 }, xpReward: xp, goldReward: gold, skills,
});

/* ═══════ 지역 ═══════ */
const AREAS: AreaDef[] = [
  { id: "forest", name: "초보자 숲", emoji: "🌲", desc: "평화로운 숲", unlockLv: 1, monsters: [
    mkMon("slime", "슬라임", "🟢", 30, 5, 2, 3, 10, 5, [{ name: "몸통 박치기", emoji: "💥", power: 1.0, type: "attack" }]),
    mkMon("goblin", "고블린", "👺", 40, 8, 3, 5, 15, 8, [{ name: "곤봉 휘두르기", emoji: "🏏", power: 1.2, type: "attack" }]),
    mkMon("wolf", "늑대", "🐺", 50, 10, 4, 8, 20, 10, [{ name: "물기", emoji: "🦷", power: 1.3, type: "attack" }]),
  ], boss: mkMon("treant", "트렌트 (보스)", "🌳", 150, 15, 10, 4, 80, 50, [
    { name: "뿌리 공격", emoji: "🌿", power: 1.5, type: "attack" }, { name: "독 포자", emoji: "☠️", power: 1.0, type: "debuff" },
  ])},
  { id: "cave", name: "어두운 동굴", emoji: "🕳️", desc: "몬스터가 숨어있다!", unlockLv: 4, monsters: [
    mkMon("bat", "거대 박쥐", "🦇", 60, 12, 5, 12, 25, 12, [{ name: "초음파", emoji: "🔊", power: 1.2, type: "attack" }]),
    mkMon("skeleton", "스켈레톤", "💀", 80, 15, 8, 6, 30, 15, [{ name: "뼈다귀 공격", emoji: "🦴", power: 1.4, type: "attack" }]),
    mkMon("spider", "독거미", "🕷️", 70, 13, 6, 10, 28, 14, [{ name: "독 물기", emoji: "☠️", power: 1.1, type: "debuff" }, { name: "거미줄", emoji: "🕸️", power: 0.8, type: "debuff" }]),
  ], boss: mkMon("golem", "골렘 (보스)", "🗿", 300, 22, 18, 3, 150, 80, [
    { name: "지진", emoji: "💥", power: 1.8, type: "attack" }, { name: "돌 던지기", emoji: "🪨", power: 2.0, type: "attack" },
  ])},
  { id: "desert", name: "불타는 사막", emoji: "🏜️", desc: "뜨거운 모래바람!", unlockLv: 7, monsters: [
    mkMon("scorpion", "전갈", "🦂", 100, 18, 10, 9, 40, 20, [{ name: "독침", emoji: "☠️", power: 1.5, type: "attack" }]),
    mkMon("mummy", "미이라", "🧟", 120, 16, 14, 5, 45, 22, [{ name: "붕대 감기", emoji: "🩹", power: 1.3, type: "debuff" }]),
    mkMon("sandworm", "샌드웜", "🐛", 140, 20, 8, 7, 50, 25, [{ name: "모래 폭풍", emoji: "🌪️", power: 1.6, type: "attack" }]),
  ], boss: mkMon("sphinx", "스핑크스 (보스)", "🦁", 500, 28, 15, 10, 250, 120, [
    { name: "수수께끼", emoji: "❓", power: 1.5, type: "debuff" }, { name: "사자 발톱", emoji: "🦁", power: 2.2, type: "attack" },
  ])},
  { id: "volcano", name: "화산 지대", emoji: "🌋", desc: "용암이 흐르는 곳!", unlockLv: 10, monsters: [
    mkMon("fireelem", "불 정령", "🔥", 160, 25, 10, 12, 60, 30, [{ name: "화염 방사", emoji: "🔥", power: 1.8, type: "attack" }]),
    mkMon("lavaslime", "용암 슬라임", "🟠", 180, 22, 16, 6, 65, 32, [{ name: "용암 뿌리기", emoji: "🌋", power: 1.6, type: "attack" }]),
    mkMon("demon", "악마", "😈", 200, 28, 12, 14, 75, 38, [{ name: "어둠 마법", emoji: "🖤", power: 2.0, type: "attack" }, { name: "저주", emoji: "💜", power: 1.2, type: "debuff" }]),
  ], boss: mkMon("dragon", "드래곤 (보스)", "🐉", 800, 35, 20, 12, 400, 200, [
    { name: "불꽃 브레스", emoji: "🔥", power: 2.5, type: "attack" }, { name: "꼬리 휘두르기", emoji: "🐉", power: 2.0, type: "attack" }, { name: "포효", emoji: "😱", power: 1.5, type: "debuff" },
  ])},
  { id: "castle", name: "마왕성", emoji: "🏰", desc: "최종 던전!", unlockLv: 14, monsters: [
    mkMon("darkknight", "암흑 기사", "🗡️", 250, 32, 20, 10, 90, 45, [{ name: "암흑 검", emoji: "⚔️", power: 2.0, type: "attack" }]),
    mkMon("lich", "리치", "🧙‍♂️", 220, 35, 12, 15, 95, 48, [{ name: "죽음의 마법", emoji: "💀", power: 2.2, type: "attack" }, { name: "저주", emoji: "☠️", power: 1.5, type: "debuff" }]),
    mkMon("chimera", "키메라", "🦁", 300, 30, 18, 12, 100, 50, [{ name: "삼중 공격", emoji: "💥", power: 2.3, type: "attack" }]),
  ], boss: mkMon("demonking", "마왕 (최종 보스)", "👿", 1500, 45, 25, 15, 1000, 500, [
    { name: "파멸의 마법", emoji: "💀", power: 3.0, type: "attack" }, { name: "암흑 파동", emoji: "🖤", power: 2.5, type: "attack" },
    { name: "공포", emoji: "😱", power: 2.0, type: "debuff" }, { name: "재생", emoji: "💚", power: 0, type: "attack" },
  ])},
];

/* ═══════ 장비 ═══════ */
const EQUIPS: EquipDef[] = [
  { id: "wsword", name: "나무 검", emoji: "🗡️", slot: "weapon", atk: 3, def: 0, hp: 0, spd: 0, price: 20, desc: "기본 검" },
  { id: "wsword2", name: "철 검", emoji: "⚔️", slot: "weapon", atk: 8, def: 0, hp: 0, spd: 0, price: 60, desc: "단단한 철 검" },
  { id: "wsword3", name: "미스릴 검", emoji: "✨", slot: "weapon", atk: 15, def: 0, hp: 0, spd: 2, price: 150, desc: "가볍고 날카로운 검" },
  { id: "wsword4", name: "전설의 검", emoji: "🌟", slot: "weapon", atk: 25, def: 3, hp: 0, spd: 3, price: 400, desc: "빛나는 전설 무기" },
  { id: "wsword5", name: "용살검", emoji: "🐉", slot: "weapon", atk: 40, def: 5, hp: 50, spd: 5, price: 800, desc: "드래곤도 베는 검" },
  { id: "wstaff", name: "나무 지팡이", emoji: "🪄", slot: "weapon", atk: 5, def: 0, hp: 0, spd: 0, price: 25, desc: "마법사용 지팡이" },
  { id: "wstaff2", name: "크리스탈 지팡이", emoji: "🔮", slot: "weapon", atk: 12, def: 0, hp: 20, spd: 1, price: 120, desc: "마력이 깃든 지팡이" },
  { id: "wstaff3", name: "대마법사 지팡이", emoji: "⭐", slot: "weapon", atk: 22, def: 0, hp: 40, spd: 3, price: 350, desc: "강력한 마법 지팡이" },
  { id: "wbow", name: "단궁", emoji: "🏹", slot: "weapon", atk: 4, def: 0, hp: 0, spd: 2, price: 22, desc: "기본 활" },
  { id: "wbow2", name: "장궁", emoji: "🎯", slot: "weapon", atk: 10, def: 0, hp: 0, spd: 4, price: 90, desc: "멀리 쏘는 활" },
  { id: "wbow3", name: "정령의 활", emoji: "🌿", slot: "weapon", atk: 20, def: 2, hp: 20, spd: 6, price: 300, desc: "바람의 힘이 깃든 활" },
  { id: "aleather", name: "가죽 갑옷", emoji: "🦺", slot: "armor", atk: 0, def: 5, hp: 10, spd: 0, price: 30, desc: "기본 방어구" },
  { id: "achain", name: "사슬 갑옷", emoji: "⛓️", slot: "armor", atk: 0, def: 10, hp: 20, spd: -1, price: 80, desc: "무거운 갑옷" },
  { id: "aplate", name: "판금 갑옷", emoji: "🛡️", slot: "armor", atk: 0, def: 18, hp: 40, spd: -2, price: 200, desc: "단단한 갑옷" },
  { id: "amyth", name: "미스릴 갑옷", emoji: "✨", slot: "armor", atk: 2, def: 25, hp: 60, spd: 0, price: 450, desc: "가볍고 단단한 갑옷" },
  { id: "adragon", name: "드래곤 아머", emoji: "🐉", slot: "armor", atk: 5, def: 35, hp: 100, spd: 2, price: 900, desc: "드래곤 비늘 갑옷" },
  { id: "xring", name: "힘의 반지", emoji: "💍", slot: "accessory", atk: 5, def: 0, hp: 0, spd: 0, price: 50, desc: "공격력 UP" },
  { id: "xneck", name: "보호의 목걸이", emoji: "📿", slot: "accessory", atk: 0, def: 5, hp: 30, spd: 0, price: 60, desc: "방어력 UP" },
  { id: "xboots", name: "신속의 장화", emoji: "👢", slot: "accessory", atk: 0, def: 0, hp: 0, spd: 8, price: 80, desc: "속도 UP" },
  { id: "xcrown", name: "왕관", emoji: "👑", slot: "accessory", atk: 10, def: 10, hp: 50, spd: 5, price: 600, desc: "모든 스탯 UP" },
];

/* ═══════ 소비 아이템 ═══════ */
const ITEMS: ItemDef[] = [
  { id: "potion", name: "체력 포션", emoji: "🧪", effect: "healHp", value: 50, price: 15, desc: "HP +50" },
  { id: "hpotion", name: "고급 체력 포션", emoji: "🧪", effect: "healHp", value: 150, price: 40, desc: "HP +150" },
  { id: "mpotion", name: "마나 포션", emoji: "💧", effect: "healMp", value: 30, price: 20, desc: "MP +30" },
  { id: "elixir", name: "엘릭서", emoji: "⭐", effect: "healAll", value: 999, price: 100, desc: "HP/MP 완전 회복" },
  { id: "atkbuff", name: "공격력 물약", emoji: "⚔️", effect: "atkBuff", value: 10, price: 30, desc: "전투 중 공격력 +10" },
  { id: "revive", name: "부활석", emoji: "💎", effect: "revive", value: 50, price: 80, desc: "HP 50으로 부활" },
];

type Screen = "classSelect" | "main" | "area" | "battle" | "shop" | "equip" | "status" | "victory" | "gameover";

export default function RpgPage() {
  const [screen, setScreen] = useState<Screen>("classSelect");
  const [playerClass, setPlayerClass] = useState<ClassDef | null>(null);
  const [playerName, setPlayerName] = useState("용사");
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(30);
  const [gold, setGold] = useState(50);
  const [stats, setStats] = useState<Stats>({ hp: 100, maxHp: 100, mp: 50, maxMp: 50, atk: 10, def: 8, spd: 8, luck: 5 });
  const [equipped, setEquipped] = useState<Record<string, EquipDef | null>>({ weapon: null, armor: null, accessory: null });
  const [inventory, setInventory] = useState<{ item: ItemDef; count: number }[]>([]);
  const [defeatedBosses, setDefeatedBosses] = useState<string[]>([]);
  const [statPoints, setStatPoints] = useState(0);

  // 전투 상태
  const [currentArea, setCurrentArea] = useState<AreaDef | null>(null);
  const [enemy, setEnemy] = useState<{ def: MonsterDef; stats: Stats } | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [playerTurn, setPlayerTurn] = useState(true);
  const [battleBuffs, setBattleBuffs] = useState<{ atkUp: number; defUp: number }>({ atkUp: 0, defUp: 0 });
  const [enemyDebuffs, setEnemyDebuffs] = useState<{ defDown: number }>({ defDown: 0 });
  const [battleOver, setBattleOver] = useState(false);
  const [isBoss, setIsBoss] = useState(false);

  // 장비 보너스
  const equipBonus = useMemo(() => {
    let atk = 0, def = 0, hp = 0, spd = 0;
    for (const eq of Object.values(equipped)) {
      if (eq) { atk += eq.atk; def += eq.def; hp += eq.hp; spd += eq.spd; }
    }
    return { atk, def, hp, spd };
  }, [equipped]);

  const totalAtk = stats.atk + equipBonus.atk + battleBuffs.atkUp;
  const totalDef = stats.def + equipBonus.def + battleBuffs.defUp;
  const totalMaxHp = stats.maxHp + equipBonus.hp;

  // 레벨업
  const checkLevelUp = useCallback((currentXp: number, currentXpNeeded: number) => {
    let lv = level, xpN = currentXpNeeded, xpC = currentXp, pts = 0;
    while (xpC >= xpN) {
      xpC -= xpN;
      lv++;
      pts += 3;
      xpN = Math.floor(xpN * 1.4);
    }
    if (lv > level) {
      setLevel(lv);
      setXpNeeded(xpN);
      setStatPoints(p => p + pts);
      setStats(s => ({ ...s, hp: Math.min(s.hp + 20 * (lv - level), s.maxHp + 20 * (lv - level)), maxHp: s.maxHp + 5 * (lv - level), mp: Math.min(s.mp + 10, s.maxMp + 3 * (lv - level)), maxMp: s.maxMp + 3 * (lv - level) }));
    }
    setXp(xpC);
  }, [level]);

  // 직업 선택
  const selectClass = useCallback((cls: ClassDef) => {
    setPlayerClass(cls);
    setStats({ ...cls.baseStats });
    setScreen("main");
  }, []);

  // 전투 시작
  const startBattle = useCallback((area: AreaDef, boss: boolean) => {
    const monDef = boss && area.boss ? area.boss : area.monsters[Math.floor(Math.random() * area.monsters.length)];
    const monStats = { ...monDef.stats };
    setCurrentArea(area);
    setEnemy({ def: monDef, stats: monStats });
    setBattleLog([`${monDef.emoji} ${monDef.name}이(가) 나타났다!`]);
    setPlayerTurn(stats.spd + equipBonus.spd >= monStats.spd);
    setBattleBuffs({ atkUp: 0, defUp: 0 });
    setEnemyDebuffs({ defDown: 0 });
    setBattleOver(false);
    setIsBoss(boss);
    setScreen("battle");
  }, [stats.spd, equipBonus.spd]);

  // 플레이어 공격/스킬
  const playerAction = useCallback((skill?: SkillDef) => {
    if (!enemy || !playerTurn || battleOver) return;

    const logs: string[] = [];
    let newEnemyStats = { ...enemy.stats };
    let newPlayerStats = { ...stats };
    let newBuffs = { ...battleBuffs };
    let newDebuffs = { ...enemyDebuffs };

    if (skill) {
      if (stats.mp < skill.mpCost) { setBattleLog(prev => [...prev, "MP가 부족합니다!"]); return; }
      newPlayerStats.mp -= skill.mpCost;

      if (skill.type === "attack") {
        const crit = Math.random() * 100 < stats.luck + 5 ? 1.5 : 1;
        const dmg = Math.max(1, Math.floor((totalAtk * skill.power * crit) - Math.max(0, newEnemyStats.def - newDebuffs.defDown) * 0.5));
        newEnemyStats.hp = Math.max(0, newEnemyStats.hp - dmg);
        logs.push(`${skill.emoji} ${skill.name}! ${crit > 1 ? "크리티컬! " : ""}${dmg} 데미지!`);
      } else if (skill.type === "heal") {
        const heal = Math.floor(totalAtk * skill.power);
        newPlayerStats.hp = Math.min(totalMaxHp, newPlayerStats.hp + heal);
        logs.push(`${skill.emoji} ${skill.name}! HP +${heal} 회복!`);
      } else if (skill.type === "buff") {
        const amount = Math.floor(skill.power * 5);
        if (skill.id === "shield" || skill.id === "barrier") {
          newBuffs.defUp += amount;
          logs.push(`${skill.emoji} ${skill.name}! 방어력 +${amount}!`);
        } else {
          newBuffs.atkUp += amount;
          logs.push(`${skill.emoji} ${skill.name}! 공격력 +${amount}!`);
        }
      } else if (skill.type === "debuff") {
        const amount = Math.floor(skill.power * 5);
        newDebuffs.defDown += amount;
        logs.push(`${skill.emoji} ${skill.name}! 적 방어력 -${amount}!`);
      }
    } else {
      // 기본 공격
      const crit = Math.random() * 100 < stats.luck + 5 ? 1.5 : 1;
      const dmg = Math.max(1, Math.floor((totalAtk * crit) - Math.max(0, newEnemyStats.def - newDebuffs.defDown) * 0.5));
      newEnemyStats.hp = Math.max(0, newEnemyStats.hp - dmg);
      logs.push(`⚔️ 공격! ${crit > 1 ? "크리티컬! " : ""}${dmg} 데미지!`);
    }

    setStats(newPlayerStats);
    setBattleBuffs(newBuffs);
    setEnemyDebuffs(newDebuffs);
    setEnemy(prev => prev ? { ...prev, stats: newEnemyStats } : null);

    // 적 처치 체크
    if (newEnemyStats.hp <= 0) {
      logs.push(`🎉 ${enemy.def.name}을(를) 물리쳤다!`);
      logs.push(`💰 +${enemy.def.goldReward} 골드 | ✨ +${enemy.def.xpReward} XP`);
      setGold(g => g + enemy.def.goldReward);
      const newXp = xp + enemy.def.xpReward;
      checkLevelUp(newXp, xpNeeded);
      if (isBoss && currentArea) {
        setDefeatedBosses(prev => prev.includes(currentArea.id) ? prev : [...prev, currentArea.id]);
        if (currentArea.id === "castle") {
          setBattleLog(prev => [...prev, ...logs]);
          setBattleOver(true);
          setTimeout(() => setScreen("victory"), 1500);
          return;
        }
      }
      setBattleOver(true);
      setBattleLog(prev => [...prev, ...logs]);
      return;
    }

    // 적 턴
    const enemySkill = enemy.def.skills[Math.floor(Math.random() * enemy.def.skills.length)];
    if (enemySkill.type === "attack") {
      const eDmg = Math.max(1, Math.floor(newEnemyStats.atk * enemySkill.power - (totalDef * 0.5)));
      newPlayerStats.hp = Math.max(0, newPlayerStats.hp - eDmg);
      logs.push(`${enemy.def.emoji} ${enemySkill.name}! ${eDmg} 데미지!`);
    } else {
      newBuffs.defUp = Math.max(0, newBuffs.defUp - 3);
      newBuffs.atkUp = Math.max(0, newBuffs.atkUp - 3);
      logs.push(`${enemy.def.emoji} ${enemySkill.name}! 버프 감소!`);
    }

    setStats(newPlayerStats);
    setBattleBuffs(newBuffs);

    if (newPlayerStats.hp <= 0) {
      // 부활석 체크
      const reviveIdx = inventory.findIndex(i => i.item.id === "revive" && i.count > 0);
      if (reviveIdx >= 0) {
        newPlayerStats.hp = 50;
        setStats(newPlayerStats);
        setInventory(prev => {
          const next = [...prev];
          next[reviveIdx] = { ...next[reviveIdx], count: next[reviveIdx].count - 1 };
          return next.filter(i => i.count > 0);
        });
        logs.push("💎 부활석으로 되살아났다! HP 50!");
      } else {
        logs.push("💀 쓰러졌다...");
        setBattleOver(true);
        setBattleLog(prev => [...prev, ...logs]);
        setTimeout(() => {
          setStats(s => ({ ...s, hp: Math.floor(s.maxHp / 2), mp: Math.floor(s.maxMp / 2) }));
          setGold(g => Math.floor(g * 0.8));
          setScreen("main");
        }, 2000);
        return;
      }
    }

    setBattleLog(prev => [...prev, ...logs]);
  }, [enemy, playerTurn, battleOver, stats, totalAtk, totalDef, totalMaxHp, battleBuffs, enemyDebuffs, xp, xpNeeded, checkLevelUp, inventory, isBoss, currentArea]);

  // 아이템 사용 (전투 중)
  const useItem = useCallback((itemDef: ItemDef) => {
    if (battleOver) return;
    const idx = inventory.findIndex(i => i.item.id === itemDef.id && i.count > 0);
    if (idx < 0) return;

    const logs: string[] = [];
    const newStats = { ...stats };

    if (itemDef.effect === "healHp") {
      newStats.hp = Math.min(totalMaxHp, newStats.hp + itemDef.value);
      logs.push(`${itemDef.emoji} ${itemDef.name} 사용! HP +${itemDef.value}`);
    } else if (itemDef.effect === "healMp") {
      newStats.mp = Math.min(newStats.maxMp, newStats.mp + itemDef.value);
      logs.push(`${itemDef.emoji} ${itemDef.name} 사용! MP +${itemDef.value}`);
    } else if (itemDef.effect === "healAll") {
      newStats.hp = totalMaxHp;
      newStats.mp = newStats.maxMp;
      logs.push(`${itemDef.emoji} ${itemDef.name} 사용! HP/MP 완전 회복!`);
    } else if (itemDef.effect === "atkBuff") {
      setBattleBuffs(b => ({ ...b, atkUp: b.atkUp + itemDef.value }));
      logs.push(`${itemDef.emoji} ${itemDef.name} 사용! 공격력 +${itemDef.value}!`);
    }

    setStats(newStats);
    setInventory(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], count: next[idx].count - 1 };
      return next.filter(i => i.count > 0);
    });
    setBattleLog(prev => [...prev, ...logs]);
  }, [battleOver, inventory, stats, totalMaxHp]);

  // 상점 구매
  const buyEquip = useCallback((eq: EquipDef) => {
    if (gold < eq.price) return;
    setGold(g => g - eq.price);
    setEquipped(prev => ({ ...prev, [eq.slot]: eq }));
  }, [gold]);

  const buyItemShop = useCallback((item: ItemDef) => {
    if (gold < item.price) return;
    setGold(g => g - item.price);
    setInventory(prev => {
      const idx = prev.findIndex(i => i.item.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], count: next[idx].count + 1 };
        return next;
      }
      return [...prev, { item, count: 1 }];
    });
  }, [gold]);

  // 스탯 투자
  const investStat = useCallback((stat: keyof Stats) => {
    if (statPoints <= 0) return;
    setStatPoints(p => p - 1);
    setStats(s => {
      const n = { ...s };
      if (stat === "maxHp") { n.maxHp += 10; n.hp += 10; }
      else if (stat === "maxMp") { n.maxMp += 5; n.mp += 5; }
      else { (n as unknown as Record<string, number>)[stat] += 2; }
      return n;
    });
  }, [statPoints]);

  // 휴식
  const rest = useCallback(() => {
    if (gold < 10) return;
    setGold(g => g - 10);
    setStats(s => ({ ...s, hp: s.maxHp + equipBonus.hp, mp: s.maxMp }));
  }, [gold, equipBonus.hp]);

  /* ═══════ 직업 선택 ═══════ */
  if (screen === "classSelect") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-indigo-300 text-sm mb-4 inline-block">← 홈으로</Link>
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">⚔️</div>
            <h1 className="text-3xl font-black">RPG 모험</h1>
            <p className="text-indigo-300 text-sm">직업을 선택하세요!</p>
          </div>
          <div className="space-y-3">
            {CLASSES.map(cls => (
              <button key={cls.id} onClick={() => selectClass(cls)}
                className="w-full bg-black/40 hover:bg-indigo-900/40 rounded-xl p-4 text-left flex items-center gap-4 transition-all hover:scale-[1.02]">
                <div className="text-5xl">{cls.emoji}</div>
                <div>
                  <div className="text-xl font-black">{cls.name}</div>
                  <div className="text-sm text-gray-400">{cls.desc}</div>
                  <div className="text-xs text-indigo-300 mt-1">
                    HP:{cls.baseStats.hp} MP:{cls.baseStats.mp} ATK:{cls.baseStats.atk} DEF:{cls.baseStats.def} SPD:{cls.baseStats.spd}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!playerClass) return null;
  const availableSkills = playerClass.skills.filter(s => s.unlockLv <= level);

  /* ═══════ 메인 화면 ═══════ */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-indigo-300 text-sm mb-4 inline-block">← 홈으로</Link>

          {/* 캐릭터 */}
          <div className="bg-black/30 rounded-xl p-4 mb-3 text-center">
            <div className="text-4xl mb-1">{playerClass.emoji}</div>
            <div className="text-lg font-black">Lv.{level} {playerName}</div>
            <div className="text-sm text-indigo-300">{playerClass.name}</div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-8">❤️</span>
                <div className="flex-1 bg-gray-800 rounded-full h-3"><div className="bg-red-500 h-3 rounded-full" style={{ width: `${(stats.hp / totalMaxHp) * 100}%` }} /></div>
                <span className="w-16 text-right">{stats.hp}/{totalMaxHp}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-8">💙</span>
                <div className="flex-1 bg-gray-800 rounded-full h-3"><div className="bg-blue-500 h-3 rounded-full" style={{ width: `${(stats.mp / stats.maxMp) * 100}%` }} /></div>
                <span className="w-16 text-right">{stats.mp}/{stats.maxMp}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-8">✨</span>
                <div className="flex-1 bg-gray-800 rounded-full h-3"><div className="bg-yellow-500 h-3 rounded-full" style={{ width: `${(xp / xpNeeded) * 100}%` }} /></div>
                <span className="w-16 text-right">{xp}/{xpNeeded}</span>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-1">💰 {gold} 골드 | ⚔️ {totalAtk} 🛡️ {totalDef}</div>
            {statPoints > 0 && <div className="text-xs text-yellow-400 mt-1">📊 스탯 포인트 {statPoints}개!</div>}
          </div>

          {/* 메뉴 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={() => setScreen("area")} className="bg-red-900/50 hover:bg-red-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl">⚔️</div><div className="text-sm font-bold">모험</div>
            </button>
            <button onClick={() => setScreen("shop")} className="bg-yellow-900/50 hover:bg-yellow-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl">🛒</div><div className="text-sm font-bold">상점</div>
            </button>
            <button onClick={() => setScreen("status")} className="bg-blue-900/50 hover:bg-blue-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl">📊</div><div className="text-sm font-bold">스탯</div>
            </button>
            <button onClick={rest} disabled={gold < 10}
              className="bg-green-900/50 hover:bg-green-800/50 disabled:opacity-40 rounded-xl p-3 text-center">
              <div className="text-2xl">🏨</div><div className="text-sm font-bold">휴식 (10G)</div>
            </button>
          </div>

          {/* 장비 미리보기 */}
          <div className="bg-black/20 rounded-xl p-3">
            <h3 className="text-xs font-bold mb-1 text-center">🎒 장비</h3>
            <div className="flex justify-around text-center text-xs">
              {(["weapon", "armor", "accessory"] as const).map(slot => {
                const eq = equipped[slot];
                return (
                  <div key={slot}>
                    <div className="text-2xl">{eq ? eq.emoji : "➖"}</div>
                    <div className="text-[10px] text-gray-400">{eq ? eq.name : "없음"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════ 지역 선택 ═══════ */
  if (screen === "area") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-green-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-green-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-4">🗺️ 모험 지역</h2>
          <div className="space-y-2">
            {AREAS.map(area => {
              const locked = level < area.unlockLv;
              const bossDefeated = defeatedBosses.includes(area.id);
              return (
                <div key={area.id} className={`rounded-xl p-3 ${locked ? "bg-gray-800/50 opacity-50" : "bg-black/30"}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-3xl">{locked ? "🔒" : area.emoji}</div>
                    <div className="flex-1">
                      <div className="font-bold">{area.name} {bossDefeated && "✅"}</div>
                      <div className="text-xs text-gray-400">{locked ? `Lv.${area.unlockLv} 필요` : area.desc}</div>
                    </div>
                  </div>
                  {!locked && (
                    <div className="flex gap-2">
                      <button onClick={() => startBattle(area, false)}
                        className="flex-1 bg-green-800/60 hover:bg-green-700/60 rounded-lg py-2 text-sm font-bold">
                        🐾 일반 전투
                      </button>
                      {area.boss && (
                        <button onClick={() => startBattle(area, true)}
                          className={`flex-1 rounded-lg py-2 text-sm font-bold ${bossDefeated ? "bg-gray-700/60" : "bg-red-800/60 hover:bg-red-700/60"}`}>
                          👑 보스 {bossDefeated && "(클리어)"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════ 전투 ═══════ */
  if (screen === "battle" && enemy) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          {/* 적 정보 */}
          <div className="bg-black/40 rounded-xl p-3 mb-2 text-center">
            <div className="text-5xl mb-1">{enemy.def.emoji}</div>
            <div className="font-bold">{enemy.def.name}</div>
            <div className="mt-1">
              <div className="flex items-center gap-2 text-xs">
                <span>❤️</span>
                <div className="flex-1 bg-gray-800 rounded-full h-3"><div className="bg-red-600 h-3 rounded-full transition-all" style={{ width: `${(enemy.stats.hp / enemy.stats.maxHp) * 100}%` }} /></div>
                <span>{enemy.stats.hp}/{enemy.stats.maxHp}</span>
              </div>
            </div>
          </div>

          {/* 내 정보 */}
          <div className="bg-black/40 rounded-xl p-3 mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{playerClass.emoji}</span>
              <div className="flex-1">
                <div className="text-sm font-bold">Lv.{level} {playerName}</div>
                <div className="flex gap-2 text-xs">
                  <span>⚔️{totalAtk}</span><span>🛡️{totalDef}</span>
                </div>
              </div>
            </div>
            <div className="space-y-0.5 text-xs">
              <div className="flex items-center gap-1">
                <span>❤️</span>
                <div className="flex-1 bg-gray-800 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full" style={{ width: `${(stats.hp / totalMaxHp) * 100}%` }} /></div>
                <span className="w-14 text-right">{stats.hp}/{totalMaxHp}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>💙</span>
                <div className="flex-1 bg-gray-800 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(stats.mp / stats.maxMp) * 100}%` }} /></div>
                <span className="w-14 text-right">{stats.mp}/{stats.maxMp}</span>
              </div>
            </div>
          </div>

          {/* 배틀 로그 */}
          <div className="bg-black/60 rounded-xl p-2 mb-2 h-24 overflow-y-auto text-xs space-y-0.5">
            {battleLog.slice(-6).map((log, i) => (
              <div key={i} className="text-gray-300">{log}</div>
            ))}
          </div>

          {/* 액션 */}
          {!battleOver ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => playerAction()} className="bg-red-800/60 hover:bg-red-700/60 rounded-lg py-2 text-sm font-bold">
                  ⚔️ 기본 공격
                </button>
                {availableSkills.map(skill => (
                  <button key={skill.id} onClick={() => playerAction(skill)}
                    disabled={stats.mp < skill.mpCost}
                    className="bg-indigo-800/60 hover:bg-indigo-700/60 disabled:opacity-40 rounded-lg py-2 text-xs font-bold">
                    {skill.emoji} {skill.name} <span className="text-blue-300">({skill.mpCost}MP)</span>
                  </button>
                ))}
              </div>
              {/* 아이템 */}
              {inventory.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {inventory.map((inv, i) => (
                    <button key={i} onClick={() => useItem(inv.item)}
                      className="bg-yellow-900/50 hover:bg-yellow-800/50 rounded-lg px-2 py-1 text-[10px]">
                      {inv.item.emoji} {inv.item.name} x{inv.count}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setScreen(stats.hp > 0 ? "area" : "main")}
              className="w-full bg-indigo-700 hover:bg-indigo-600 rounded-xl py-3 font-bold">
              {stats.hp > 0 ? "🗺️ 계속 모험" : "🏠 돌아가기"}
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ═══════ 상점 ═══════ */
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-yellow-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-yellow-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-1">🛒 상점</h2>
          <div className="text-center text-yellow-400 font-bold mb-3">💰 {gold} 골드</div>

          <h3 className="text-sm font-bold mb-1">⚔️ 장비</h3>
          <div className="space-y-1 mb-4">
            {EQUIPS.map(eq => {
              const isEquipped = equipped[eq.slot]?.id === eq.id;
              return (
                <div key={eq.id} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${isEquipped ? "bg-green-900/30 border border-green-700" : "bg-black/20"}`}>
                  <span className="text-xl">{eq.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs">{eq.name}</div>
                    <div className="text-[10px] text-gray-400">
                      {eq.atk > 0 && `⚔️+${eq.atk} `}{eq.def > 0 && `🛡️+${eq.def} `}{eq.hp > 0 && `❤️+${eq.hp} `}{eq.spd !== 0 && `💨${eq.spd > 0 ? "+" : ""}${eq.spd}`}
                    </div>
                  </div>
                  {isEquipped ? (
                    <span className="text-green-400 text-xs">✅장착</span>
                  ) : (
                    <button onClick={() => buyEquip(eq)} disabled={gold < eq.price}
                      className={`text-xs px-2 py-1 rounded-lg ${gold >= eq.price ? "bg-yellow-700 hover:bg-yellow-600" : "bg-gray-700 text-gray-500"}`}>
                      {eq.price}G
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <h3 className="text-sm font-bold mb-1">🧪 아이템</h3>
          <div className="space-y-1">
            {ITEMS.map(item => {
              const owned = inventory.find(i => i.item.id === item.id)?.count || 0;
              return (
                <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-black/20 text-sm">
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold text-xs">{item.name} {owned > 0 && <span className="text-green-400">({owned}개)</span>}</div>
                    <div className="text-[10px] text-gray-400">{item.desc}</div>
                  </div>
                  <button onClick={() => buyItemShop(item)} disabled={gold < item.price}
                    className={`text-xs px-2 py-1 rounded-lg ${gold >= item.price ? "bg-yellow-700 hover:bg-yellow-600" : "bg-gray-700 text-gray-500"}`}>
                    {item.price}G
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════ 스탯 ═══════ */
  if (screen === "status") {
    const statList: { key: keyof Stats; name: string; emoji: string }[] = [
      { key: "maxHp", name: "최대 HP", emoji: "❤️" },
      { key: "maxMp", name: "최대 MP", emoji: "💙" },
      { key: "atk", name: "공격력", emoji: "⚔️" },
      { key: "def", name: "방어력", emoji: "🛡️" },
      { key: "spd", name: "속도", emoji: "💨" },
      { key: "luck", name: "행운", emoji: "🍀" },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-blue-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">📊 캐릭터 정보</h2>

          <div className="text-center mb-4">
            <div className="text-5xl">{playerClass.emoji}</div>
            <div className="text-lg font-black">Lv.{level} {playerName}</div>
            <div className="text-sm text-blue-300">{playerClass.name}</div>
          </div>

          {statPoints > 0 && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-2 mb-3 text-center text-sm text-yellow-300">
              📊 스탯 포인트: {statPoints}개 (아래에서 투자하세요!)
            </div>
          )}

          <div className="space-y-2 mb-4">
            {statList.map(s => (
              <div key={s.key} className="flex items-center gap-2 bg-black/20 rounded-lg p-2">
                <span className="text-lg w-8 text-center">{s.emoji}</span>
                <span className="text-sm font-bold w-16">{s.name}</span>
                <span className="text-sm flex-1 text-right">
                  {(stats as unknown as Record<string, number>)[s.key]}
                  {equipBonus[s.key as keyof typeof equipBonus] ? <span className="text-green-400"> (+{equipBonus[s.key as keyof typeof equipBonus]})</span> : ""}
                </span>
                {statPoints > 0 && (
                  <button onClick={() => investStat(s.key)}
                    className="bg-yellow-700 hover:bg-yellow-600 text-xs px-2 py-1 rounded-lg">+</button>
                )}
              </div>
            ))}
          </div>

          <h3 className="text-sm font-bold mb-1">📜 스킬</h3>
          <div className="space-y-1">
            {playerClass.skills.map(skill => {
              const unlocked = level >= skill.unlockLv;
              return (
                <div key={skill.id} className={`flex items-center gap-2 p-2 rounded-lg ${unlocked ? "bg-indigo-900/30" : "bg-gray-800/30 opacity-50"}`}>
                  <span className="text-xl">{unlocked ? skill.emoji : "🔒"}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{skill.name}</div>
                    <div className="text-[10px] text-gray-400">{skill.desc} | MP: {skill.mpCost}</div>
                  </div>
                  {!unlocked && <span className="text-[10px] text-gray-500">Lv.{skill.unlockLv}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════ 엔딩 ═══════ */
  if (screen === "victory") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-600 via-amber-800 to-yellow-950 text-white p-4 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="text-8xl mb-4">🏆</div>
          <h1 className="text-4xl font-black mb-2 text-yellow-300">마왕을 물리쳤다!</h1>
          <p className="text-lg mb-4">세계에 평화가 찾아왔습니다!</p>
          <div className="bg-black/40 rounded-xl p-4 mb-4">
            <div className="text-5xl mb-2">{playerClass.emoji}</div>
            <div className="text-xl font-bold">Lv.{level} {playerName}</div>
            <div className="text-sm text-yellow-300">{playerClass.name}</div>
            <div className="text-sm text-gray-300 mt-2">클리어 보스: {defeatedBosses.length}/{AREAS.length}</div>
          </div>
          <button onClick={() => setScreen("main")}
            className="bg-yellow-600 hover:bg-yellow-500 rounded-xl px-6 py-3 font-bold text-lg">
            🗺️ 모험 계속하기
          </button>
        </div>
      </div>
    );
  }

  return null;
}
