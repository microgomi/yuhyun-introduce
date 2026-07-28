"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

// --- Types ---
type Grade = "grade4" | "grade3" | "grade2" | "grade1" | "special1" | "special";
type TechniqueType = "cursed" | "domain" | "reverse" | "physical" | "shikigami";

interface Technique {
  id: string;
  name: string;
  emoji: string;
  type: TechniqueType;
  damage: number;
  cursedEnergy: number;
  unlockLevel: number;
  cooldown: number;
  desc: string;
}

interface CursedSpirit {
  id: string;
  name: string;
  emoji: string;
  grade: Grade;
  hp: number;
  attack: number;
  xpReward: number;
  moneyReward: number;
  specialAbility?: string;
}

interface Character {
  id: string;
  name: string;
  emoji: string;
  title: string;
  techniques: string[];
}

// --- Constants ---
const GRADE_INFO: Record<Grade, { name: string; color: string; bg: string; emoji: string }> = {
  grade4: { name: "4급", color: "text-gray-400", bg: "bg-gray-600", emoji: "🔰" },
  grade3: { name: "3급", color: "text-green-400", bg: "bg-green-600", emoji: "🟢" },
  grade2: { name: "2급", color: "text-blue-400", bg: "bg-blue-600", emoji: "🔵" },
  grade1: { name: "1급", color: "text-purple-400", bg: "bg-purple-600", emoji: "🟣" },
  special1: { name: "특급1급", color: "text-red-400", bg: "bg-red-600", emoji: "🔴" },
  special: { name: "특급", color: "text-yellow-400", bg: "bg-yellow-600", emoji: "👑" },
};

const GRADES_ORDER: Grade[] = ["grade4", "grade3", "grade2", "grade1", "special1", "special"];

const PLAYER_GRADES: { grade: Grade; level: number }[] = [
  { grade: "grade4", level: 1 },
  { grade: "grade3", level: 5 },
  { grade: "grade2", level: 12 },
  { grade: "grade1", level: 22 },
  { grade: "special1", level: 38 },
  { grade: "special", level: 55 },
];

const TYPE_INFO: Record<TechniqueType, { name: string; emoji: string; color: string }> = {
  cursed: { name: "저주술", emoji: "👊", color: "text-purple-400" },
  domain: { name: "영역전개", emoji: "🌀", color: "text-red-400" },
  reverse: { name: "반전술식", emoji: "💚", color: "text-green-400" },
  physical: { name: "체술", emoji: "🥊", color: "text-orange-400" },
  shikigami: { name: "식신", emoji: "🐕", color: "text-cyan-400" },
};

const ALL_TECHNIQUES: Technique[] = [
  // Physical
  { id: "punch", name: "주력 강타", emoji: "👊", type: "physical", damage: 12, cursedEnergy: 5, unlockLevel: 1, cooldown: 1, desc: "저주력을 실은 주먹" },
  { id: "black_flash", name: "흑섬", emoji: "⚫", type: "physical", damage: 80, cursedEnergy: 30, unlockLevel: 15, cooldown: 5, desc: "저주력의 핵을 때리는 일격" },
  { id: "red_scale", name: "적린", emoji: "🔴", type: "physical", damage: 200, cursedEnergy: 60, unlockLevel: 35, cooldown: 7, desc: "주먹에 저주력을 극한으로 응축" },
  // Cursed
  { id: "cursed_strike", name: "저주력 방출", emoji: "💜", type: "cursed", damage: 18, cursedEnergy: 10, unlockLevel: 2, cooldown: 2, desc: "저주력을 방출하여 공격" },
  { id: "divergent_fist", name: "축차 팽창", emoji: "💥", type: "cursed", damage: 40, cursedEnergy: 20, unlockLevel: 8, cooldown: 3, desc: "타격 후 저주력이 팽창" },
  { id: "blue", name: "술식 순전 '파(蒼)'", emoji: "🔵", type: "cursed", damage: 100, cursedEnergy: 45, unlockLevel: 20, cooldown: 5, desc: "인력으로 끌어당기는 힘" },
  { id: "red", name: "술식 반전 '적(赫)'", emoji: "🔴", type: "cursed", damage: 120, cursedEnergy: 50, unlockLevel: 25, cooldown: 5, desc: "척력으로 밀어내는 힘" },
  { id: "hollow_purple", name: "허식 '자(茈)'", emoji: "🟣", type: "cursed", damage: 300, cursedEnergy: 90, unlockLevel: 45, cooldown: 10, desc: "파와 적의 합성 - 가상의 질량" },
  { id: "cleave", name: "해(解)", emoji: "🗡️", type: "cursed", damage: 150, cursedEnergy: 55, unlockLevel: 30, cooldown: 5, desc: "상대의 저주력에 맞춰 자르기" },
  { id: "dismantle", name: "첩(捷)", emoji: "✂️", type: "cursed", damage: 90, cursedEnergy: 35, unlockLevel: 18, cooldown: 4, desc: "저주력이 없는 것을 자르기" },
  { id: "fire_arrow", name: "화살", emoji: "🏹", type: "cursed", damage: 60, cursedEnergy: 25, unlockLevel: 12, cooldown: 3, desc: "저주력으로 만든 화살" },
  // Shikigami
  { id: "divine_dog", name: "옥견", emoji: "🐕", type: "shikigami", damage: 25, cursedEnergy: 12, unlockLevel: 3, cooldown: 2, desc: "저주를 먹는 신수" },
  { id: "nue", name: "누에", emoji: "⚡", type: "shikigami", damage: 50, cursedEnergy: 22, unlockLevel: 10, cooldown: 3, desc: "번개를 쏘는 식신" },
  { id: "mahoraga", name: "마호라가", emoji: "🗡️", type: "shikigami", damage: 350, cursedEnergy: 100, unlockLevel: 50, cooldown: 12, desc: "팔악검 이왕 - 최강 식신" },
  // Reverse
  { id: "heal", name: "반전술식", emoji: "💚", type: "reverse", damage: -50, cursedEnergy: 25, unlockLevel: 6, cooldown: 4, desc: "저주력을 반전시켜 치유" },
  { id: "great_heal", name: "반전술식 극", emoji: "💖", type: "reverse", damage: -150, cursedEnergy: 60, unlockLevel: 28, cooldown: 8, desc: "강력한 치유" },
  // Domain
  { id: "chimera", name: "복수 음적천정", emoji: "🌊", type: "domain", damage: 180, cursedEnergy: 70, unlockLevel: 22, cooldown: 10, desc: "바다의 영역전개" },
  { id: "unlimited_void", name: "무량공처", emoji: "♾️", type: "domain", damage: 280, cursedEnergy: 85, unlockLevel: 40, cooldown: 12, desc: "무한의 내부 - 고죠 사토루의 영역" },
  { id: "malevolent_shrine", name: "복마전생", emoji: "🏯", type: "domain", damage: 400, cursedEnergy: 100, unlockLevel: 48, cooldown: 15, desc: "료멘 스쿠나의 영역" },
  { id: "domain_simple", name: "간이영역", emoji: "🛡️", type: "domain", damage: 50, cursedEnergy: 30, unlockLevel: 14, cooldown: 6, desc: "불완전한 영역전개" },
];

const ALL_SPIRITS: CursedSpirit[] = [
  // Grade 4
  { id: "fly_head", name: "파리머리", emoji: "🪰", grade: "grade4", hp: 40, attack: 5, xpReward: 12, moneyReward: 100 },
  { id: "slug", name: "저주 벌레", emoji: "🐛", grade: "grade4", hp: 60, attack: 8, xpReward: 18, moneyReward: 150 },
  // Grade 3
  { id: "curse_doll", name: "저주 인형", emoji: "🪆", grade: "grade3", hp: 100, attack: 15, xpReward: 30, moneyReward: 250 },
  { id: "finger_bearer", name: "손가락 보유자", emoji: "🫳", grade: "grade3", hp: 150, attack: 20, xpReward: 50, moneyReward: 400, specialAbility: "손가락의 힘으로 공격력 1.5배" },
  // Grade 2
  { id: "grasshopper", name: "메뚜기 저주", emoji: "🦗", grade: "grade2", hp: 250, attack: 30, xpReward: 80, moneyReward: 600 },
  { id: "smallpox", name: "천연두 저주", emoji: "☠️", grade: "grade2", hp: 300, attack: 40, xpReward: 100, moneyReward: 800, specialAbility: "병의 저주 - 매턴 독 데미지" },
  // Grade 1
  { id: "hanami", name: "하나미", emoji: "🌸", grade: "grade1", hp: 500, attack: 55, xpReward: 180, moneyReward: 1200, specialAbility: "자연의 저주 - HP 회복" },
  { id: "dagon", name: "다곤", emoji: "🐙", grade: "grade1", hp: 600, attack: 65, xpReward: 220, moneyReward: 1500, specialAbility: "영역전개 가능" },
  { id: "jogo", name: "죠고", emoji: "🌋", grade: "grade1", hp: 700, attack: 75, xpReward: 280, moneyReward: 1800, specialAbility: "화산의 저주 - 화상 데미지" },
  // Special Grade 1
  { id: "choso", name: "초소", emoji: "🩸", grade: "special1", hp: 900, attack: 90, xpReward: 400, moneyReward: 2500, specialAbility: "혈류조작" },
  { id: "naoya", name: "나오야", emoji: "🏎️", grade: "special1", hp: 1000, attack: 100, xpReward: 500, moneyReward: 3000, specialAbility: "투사술식 - 빠른 연속 공격" },
  // Special
  { id: "mahito", name: "마히토", emoji: "👤", grade: "special", hp: 1500, attack: 130, xpReward: 800, moneyReward: 5000, specialAbility: "무위전변 - 영혼을 만진다" },
  { id: "geto", name: "게토 스구루", emoji: "😏", grade: "special", hp: 2000, attack: 150, xpReward: 1200, moneyReward: 7000, specialAbility: "저주령조작 - 저주를 흡수" },
  { id: "sukuna", name: "료멘 스쿠나", emoji: "👹", grade: "special", hp: 5000, attack: 250, xpReward: 3000, moneyReward: 15000, specialAbility: "주술의 왕 - 해/첩/복마전생" },
];

function xpForLevel(lv: number): number {
  return Math.floor(40 * Math.pow(1.25, lv - 1));
}

function getPlayerGrade(lv: number): typeof PLAYER_GRADES[0] {
  return [...PLAYER_GRADES].reverse().find((g) => lv >= g.level) || PLAYER_GRADES[0];
}

type Screen = "hub" | "battle" | "techniques" | "victory" | "defeat" | "gacha";

// ===== 주술 뽑기(가챠) =====
type GachaRarity = "normal" | "rare" | "legend" | "special";
interface GachaChar { id: string; name: string; emoji: string; rarity: GachaRarity }
const GACHA_RARITY: Record<GachaRarity, { name: string; weight: number; color: string; ring: string; emoji: string }> = {
  normal: { name: "일반", weight: 85, color: "text-gray-300", ring: "border-gray-500", emoji: "⚪" },
  rare: { name: "희귀", weight: 70, color: "text-blue-300", ring: "border-blue-400", emoji: "🔵" },
  legend: { name: "전설", weight: 43, color: "text-purple-300", ring: "border-purple-400", emoji: "🟣" },
  special: { name: "특급", weight: 35, color: "text-yellow-300", ring: "border-yellow-400", emoji: "👑" },
};
const GACHA_POOL: GachaChar[] = [
  // 특급
  { id: "sukuna", name: "료멘 스쿠나", emoji: "👹", rarity: "special" },
  { id: "gojo", name: "고죠 사토루", emoji: "🕶️", rarity: "special" },
  { id: "mahito_g", name: "마히토", emoji: "👤", rarity: "special" },
  { id: "geto_g", name: "게토 스구루", emoji: "😏", rarity: "special" },
  { id: "kenjaku", name: "켄자쿠", emoji: "🧠", rarity: "special" },
  // 전설
  { id: "itadori", name: "이타도리 유지", emoji: "🥋", rarity: "legend" },
  { id: "megumi", name: "후시구로 메구미", emoji: "🐕", rarity: "legend" },
  { id: "nobara", name: "쿠기사키 노바라", emoji: "🔨", rarity: "legend" },
  { id: "nanami", name: "나나미 켄토", emoji: "🧥", rarity: "legend" },
  { id: "choso_g", name: "초소", emoji: "🩸", rarity: "legend" },
  // 희귀
  { id: "panda", name: "팬더", emoji: "🐼", rarity: "rare" },
  { id: "inumaki", name: "이누마키 토게", emoji: "🍙", rarity: "rare" },
  { id: "maki", name: "젠인 마키", emoji: "🗡️", rarity: "rare" },
  { id: "todo", name: "토도 아오이", emoji: "🫰", rarity: "rare" },
  { id: "yuta", name: "옷코츠 유타", emoji: "⚔️", rarity: "rare" },
  // 일반
  { id: "student", name: "주술고전 학생", emoji: "🎒", rarity: "normal" },
  { id: "assistant", name: "보조감독", emoji: "👔", rarity: "normal" },
  { id: "cursebug", name: "저주 벌레", emoji: "🐛", rarity: "normal" },
  { id: "flyhead", name: "파리머리", emoji: "🪰", rarity: "normal" },
  { id: "rookie", name: "신입 주술사", emoji: "🔰", rarity: "normal" },
];
const GACHA_COST = 300;
const GACHA_PITY = 130; // 130번째 뽑기에 특급 확정
const GACHA_KEY = "jujutsu_gacha";

// 캐릭터별 주술 (뽑은 캐릭터만 사용 가능). domain=영역전개(도메인 샤드 필요), ultimate=최대 스킬(최대 스크롤 필요)
const CHAR_TECH: Record<string, { normal: string[]; domain: string; ultimate: string }> = {
  gojo: { normal: ["무하한(무량공처)", "술식반전 '적'", "술식순전 '창'"], domain: "영역전개 · 무량공처", ultimate: "허식 '자(紫)'" },
  sukuna: { normal: ["해(解) 연격", "봉(捌) 참격"], domain: "영역전개 · 복마어주자", ultimate: "개전(開展) · 어주자" },
  mahito_g: { normal: ["무위전변", "자충어신"], domain: "영역전개 · 자폐원돈과", ultimate: "진인 · 극의 형태" },
  geto_g: { normal: ["저주령 조작", "주술 회유"], domain: "영역전개 · 옥초", ultimate: "저주령 대량방출" },
  kenjaku: { normal: ["술식 복제", "저주 조종"], domain: "영역전개 · 태장맥도", ultimate: "천 년의 계략" },
  itadori: { normal: ["흑섬(黑閃)", "이차 발산", "발경"], domain: "영역전개 · 해방", ultimate: "흑섬 연속 작렬" },
  megumi: { normal: ["옥견", "대사(大蛇)", "마령"], domain: "영역전개 · 감뢰신람전어전", ultimate: "마허라 소환" },
  nobara: { normal: ["공진", "시침(時針)"], domain: "영역전개 · 짚인형 술식", ultimate: "공진 · 최대출력" },
  nanami: { normal: ["칠삼(七三)의 도", "비율 절단"], domain: "영역전개 · 라티오", ultimate: "중과 · 오버타임" },
  choso_g: { normal: ["천유혈사 · 경(穿血)", "적린약동"], domain: "영역전개 · 혈액 영역", ultimate: "누혈(縷血)" },
  panda: { normal: ["돌격 코어", "고릴라 모드"], domain: "영역전개 · 삼형제 각성", ultimate: "고릴라 난타" },
  inumaki: { normal: ["주언 '가라'", "주언 '터져'"], domain: "영역전개 · 주언 폭주", ultimate: "주언 '으깨져'" },
  maki: { normal: ["주구 검술", "완력 강타"], domain: "영역전개 · 천여주박 해방", ultimate: "필살 참격" },
  todo: { normal: ["부기우기", "박수 순간이동"], domain: "영역전개 · 부기우기 무한", ultimate: "필중 콤비네이션" },
  yuta: { normal: ["리카 소환", "술식 모방"], domain: "영역전개 · 리카 완전현현", ultimate: "순애의 리카" },
  student: { normal: ["기본 주력", "방어 자세"], domain: "영역전개 · 훈련장", ultimate: "전력 일격" },
  assistant: { normal: ["보급 지원", "정찰"], domain: "영역전개 · 지원 영역", ultimate: "긴급 호출" },
  cursebug: { normal: ["물어뜯기", "증식"], domain: "영역전개 · 벌레 무리", ultimate: "대증식" },
  flyhead: { normal: ["돌진", "무리 소환"], domain: "영역전개 · 파리 떼", ultimate: "떼 공격" },
  rookie: { normal: ["주먹질", "주력 방출"], domain: "영역전개 · 각성", ultimate: "혼신의 일격" },
};

function rollRarity(): GachaRarity {
  const total = GACHA_RARITY.normal.weight + GACHA_RARITY.rare.weight + GACHA_RARITY.legend.weight + GACHA_RARITY.special.weight;
  let r = Math.random() * total;
  if ((r -= GACHA_RARITY.normal.weight) < 0) return "normal";
  if ((r -= GACHA_RARITY.rare.weight) < 0) return "rare";
  if ((r -= GACHA_RARITY.legend.weight) < 0) return "legend";
  return "special";
}
function pickFromRarity(rarity: GachaRarity): GachaChar {
  const list = GACHA_POOL.filter(c => c.rarity === rarity);
  return list[Math.floor(Math.random() * list.length)];
}

const STORAGE_KEY = "jujutsu_save";
const MAX_OFFLINE_MINUTES = 480; // 8시간 최대

interface SaveData {
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  ce: number;
  maxCe: number;
  money: number;
  missions: number;
  timestamp: number;
}

interface OfflineReward {
  minutes: number;
  xpGained: number;
  moneyGained: number;
}

export default function JujutsuPage() {
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [hp, setHp] = useState(120);
  const [maxHp, setMaxHp] = useState(120);
  const [ce, setCe] = useState(60);
  const [maxCe, setMaxCe] = useState(60);
  const [money, setMoney] = useState(0);
  const [screen, setScreen] = useState<Screen>("hub");
  const [enemy, setEnemy] = useState<CursedSpirit | null>(null);
  const [enemyHp, setEnemyHp] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [atkAnim, setAtkAnim] = useState<string | null>(null);
  const [enemyAtkAnim, setEnemyAtkAnim] = useState(false);
  const [poisonDmg, setPoisonDmg] = useState(0);
  const [missions, setMissions] = useState(0);
  const [offlineReward, setOfflineReward] = useState<OfflineReward | null>(null);
  const [loaded, setLoaded] = useState(false);
  const cdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 가챠 상태
  const [pity, setPity] = useState(0);
  const [collection, setCollection] = useState<Record<string, number>>({});
  const [pullResults, setPullResults] = useState<GachaChar[]>([]);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [castFx, setCastFx] = useState<{ name: string; kind: "normal" | "domain" | "ultimate" } | null>(null);
  const [gachaLoaded, setGachaLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GACHA_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setPity(d.pity || 0); setCollection(d.collection || {});
      }
    } catch { /* ignore */ }
    setGachaLoaded(true);
  }, []);
  // 자동 저장
  useEffect(() => {
    if (!gachaLoaded) return;
    try { localStorage.setItem(GACHA_KEY, JSON.stringify({ pity, collection })); } catch { /* ignore */ }
  }, [pity, collection, gachaLoaded]);

  const doPull = useCallback((count: number) => {
    const cost = count === 10 ? GACHA_COST * 10 - 500 : GACHA_COST;
    setMoney(m => {
      if (m < cost) return m;
      let p = pity;
      const results: GachaChar[] = [];
      for (let i = 0; i < count; i++) {
        p++;
        let rarity: GachaRarity;
        if (p >= GACHA_PITY) rarity = "special"; else rarity = rollRarity();
        if (rarity === "special") p = 0;
        results.push(pickFromRarity(rarity));
      }
      setPity(p);
      setPullResults(results);
      setCollection(prev => {
        const n = { ...prev };
        results.forEach(c => { n[c.id] = (n[c.id] || 0) + 1; });
        return n;
      });
      return m - cost;
    });
  }, [pity]);

  const showCast = (name: string, kind: "normal" | "domain" | "ultimate") => {
    setCastFx({ name, kind });
    setTimeout(() => setCastFx(null), 1600);
  };
  const castNormal = (name: string) => showCast(name, "normal");
  const useDomain = (name: string) => showCast(name, "domain");
  const useUltimate = (name: string) => showCast(name, "ultimate");

  const gradeInfo = getPlayerGrade(level);
  const grade = GRADE_INFO[gradeInfo.grade];
  const xpNeeded = xpForLevel(level);
  const unlockedTech = ALL_TECHNIQUES.filter((t) => t.unlockLevel <= level);

  const availableSpirits = ALL_SPIRITS.filter((s) => {
    const si = GRADES_ORDER.indexOf(s.grade);
    const pi = GRADES_ORDER.indexOf(gradeInfo.grade);
    return si <= pi + 1;
  });

  // Level up
  useEffect(() => {
    if (xp >= xpNeeded) {
      setXp((p) => p - xpNeeded);
      setLevel((p) => p + 1);
      const newHp = 120 + level * 18;
      const newCe = 60 + level * 12;
      setMaxHp(newHp); setMaxCe(newCe);
      setHp(newHp); setCe(newCe);
      setLog((p) => [`🎉 레벨 업! Lv.${level + 1}!`, ...p.slice(0, 4)]);
    }
  }, [xp, xpNeeded, level]);

  // Cooldown timer
  useEffect(() => {
    cdTimer.current = setInterval(() => {
      setCooldowns((p) => {
        const n: Record<string, number> = {};
        for (const [k, v] of Object.entries(p)) { if (v > 1) n[k] = v - 1; }
        return n;
      });
    }, 1000);
    return () => { if (cdTimer.current) clearInterval(cdTimer.current); };
  }, []);

  // Hub regen
  useEffect(() => {
    if (screen !== "hub") return;
    const t = setInterval(() => {
      setHp((p) => Math.min(p + 4, maxHp));
      setCe((p) => Math.min(p + 3, maxCe));
    }, 1000);
    return () => clearInterval(t);
  }, [screen, maxHp, maxCe]);

  // --- Load save on mount ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { setLoaded(true); return; }
      const save: SaveData = JSON.parse(raw);
      setLevel(save.level);
      setXp(save.xp);
      const sMaxHp = save.maxHp; const sMaxCe = save.maxCe;
      setMaxHp(sMaxHp); setMaxCe(sMaxCe);
      setHp(Math.min(save.hp, sMaxHp));
      setCe(Math.min(save.ce, sMaxCe));
      setMoney(save.money);
      setMissions(save.missions);

      // Offline rewards
      const now = Date.now();
      const diffMs = now - save.timestamp;
      const diffMin = Math.min(Math.floor(diffMs / 60000), MAX_OFFLINE_MINUTES);
      if (diffMin >= 1) {
        const xpPerMin = Math.floor(3 + save.level * 0.5);
        const moneyPerMin = Math.floor(5 + save.level * 2);
        const xpGained = xpPerMin * diffMin;
        const moneyGained = moneyPerMin * diffMin;
        setXp((p) => p + xpGained);
        setMoney((p) => p + moneyGained);
        setHp(sMaxHp);
        setCe(sMaxCe);
        setOfflineReward({ minutes: diffMin, xpGained, moneyGained });
      }
    } catch { /* ignore corrupt save */ }
    setLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Save periodically + on unload ---
  useEffect(() => {
    if (!loaded) return;
    const save = () => {
      const data: SaveData = { level, xp, hp, maxHp, ce, maxCe, money, missions, timestamp: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    };
    save();
    const interval = setInterval(save, 5000);
    window.addEventListener("beforeunload", save);
    return () => { clearInterval(interval); window.removeEventListener("beforeunload", save); };
  }, [loaded, level, xp, hp, maxHp, ce, maxCe, money, missions]);

  const startBattle = (spirit: CursedSpirit) => {
    setEnemy(spirit);
    setEnemyHp(spirit.hp);
    setScreen("battle");
    setPoisonDmg(spirit.specialAbility?.includes("독") || spirit.specialAbility?.includes("병") ? 8 + level : 0);
    setLog([`⚔️ ${spirit.emoji} ${spirit.name} 출현! ${spirit.specialAbility ? `[${spirit.specialAbility}]` : ""}`]);
  };

  const useTechnique = useCallback((tech: Technique) => {
    if (!enemy || ce < tech.cursedEnergy || (cooldowns[tech.id] ?? 0) > 0) return;

    setCe((p) => p - tech.cursedEnergy);
    setCooldowns((p) => ({ ...p, [tech.id]: tech.cooldown }));

    // Healing
    if (tech.damage < 0) {
      const healAmt = Math.abs(tech.damage) + Math.floor(level * 2);
      setHp((p) => Math.min(p + healAmt, maxHp));
      setLog((p) => [`${tech.emoji} ${tech.name}! HP +${healAmt} 회복!`, ...p.slice(0, 4)]);
      return;
    }

    const dmg = Math.floor(tech.damage * (0.85 + Math.random() * 0.35) + level * 1.5);
    const isCrit = Math.random() < 0.15;
    const finalDmg = isCrit ? Math.floor(dmg * 1.8) : dmg;

    setAtkAnim(tech.emoji);
    setTimeout(() => setAtkAnim(null), 600);

    const newEhp = Math.max(0, enemyHp - finalDmg);
    setEnemyHp(newEhp);
    setLog((p) => [
      `${tech.emoji} ${tech.name}! ${finalDmg} 데미지!${isCrit ? " 💥크리티컬!" : ""}`,
      ...p.slice(0, 4),
    ]);

    if (newEhp <= 0) {
      setXp((p) => p + enemy.xpReward);
      setMoney((p) => p + enemy.moneyReward);
      setMissions((p) => p + 1);
      setScreen("victory");
      setLog((p) => [`🎉 ${enemy.emoji} ${enemy.name} 토벌 완료! +${enemy.xpReward}XP`, ...p.slice(0, 4)]);
      return;
    }

    // Enemy counter
    setTimeout(() => {
      let eDmg = Math.floor(enemy.attack * (0.8 + Math.random() * 0.4));
      // Special abilities
      if (enemy.specialAbility?.includes("1.5배")) eDmg = Math.floor(eDmg * 1.5);
      if (enemy.specialAbility?.includes("연속")) eDmg = Math.floor(eDmg * 1.3);

      setEnemyAtkAnim(true);
      setTimeout(() => setEnemyAtkAnim(false), 400);

      setHp((p) => {
        const newHp = Math.max(0, p - eDmg);
        if (newHp <= 0) {
          setScreen("defeat");
          setLog((pp) => [`💀 ${enemy.name}에게 패배...`, ...pp.slice(0, 4)]);
        } else {
          setLog((pp) => [`${enemy.emoji} 적 공격! ${eDmg} 데미지!`, ...pp.slice(0, 4)]);
        }
        return newHp;
      });

      // Poison
      if (poisonDmg > 0) {
        setTimeout(() => {
          setHp((p) => {
            const np = Math.max(0, p - poisonDmg);
            if (np <= 0) {
              setScreen("defeat");
              setLog((pp) => [`☠️ 독 데미지로 쓰러졌다...`, ...pp.slice(0, 4)]);
            } else {
              setLog((pp) => [`☠️ 독 ${poisonDmg} 데미지!`, ...pp.slice(0, 4)]);
            }
            return np;
          });
        }, 500);
      }

      // Boss heal
      if (enemy.specialAbility?.includes("회복")) {
        const healAmt = Math.floor(enemy.hp * 0.03);
        setEnemyHp((p) => Math.min(p + healAmt, enemy.hp));
        setLog((pp) => [`🌸 ${enemy.name} HP +${healAmt} 회복!`, ...pp.slice(0, 4)]);
      }
    }, 800);
  }, [enemy, ce, cooldowns, enemyHp, level, maxHp, poisonDmg]);

  const train = () => {
    const gain = 5 + Math.floor(level * 0.8);
    setXp((p) => p + gain);
    setLog((p) => [`🥊 수련! +${gain}XP`, ...p.slice(0, 4)]);
  };

  const heal = () => {
    const cost = 50 + level * 10;
    if (money < cost) return;
    setMoney((p) => p - cost);
    setHp(maxHp); setCe(maxCe);
    setLog((p) => [`🏥 이에리 쇼코의 치료! 완전 회복! -${cost}원`, ...p.slice(0, 4)]);
  };

  const toHub = () => {
    setScreen("hub");
    setEnemy(null);
    if (hp <= 0) { setHp(Math.floor(maxHp * 0.3)); setCe(Math.floor(maxCe * 0.3)); }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950 text-white">
      {/* Header */}
      <header className="fixed top-0 z-40 w-full border-b border-purple-800 bg-indigo-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-purple-300 transition-colors hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            🏠 소개페이지
          </Link>
          <span className="text-lg font-bold">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">주술회전</span>
            <span className="ml-1">👁️</span>
          </span>
          <button onClick={() => setScreen(screen === "techniques" ? "hub" : "techniques")} className="text-sm text-purple-300 hover:text-white">
            📜 술식
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pt-24 pb-8">
        {/* Player Stats */}
        <div className="mb-4 w-full max-w-lg">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold">{grade.emoji} {grade.name} 주술사 Lv.{level}</span>
            <span className="text-yellow-400">💰 {money.toLocaleString()}원</span>
          </div>
          <div className="mb-1 flex items-center gap-1 text-xs text-purple-300">
            <span>토벌: {missions}회</span>
          </div>
          {/* HP */}
          <div className="mb-1 flex items-center gap-2">
            <span className="w-8 text-xs text-red-400">HP</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all" style={{ width: `${(hp / maxHp) * 100}%` }} />
            </div>
            <span className="w-16 text-right text-xs">{hp}/{maxHp}</span>
          </div>
          {/* CE */}
          <div className="mb-1 flex items-center gap-2">
            <span className="w-8 text-xs text-blue-400">CE</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-400 transition-all" style={{ width: `${(ce / maxCe) * 100}%` }} />
            </div>
            <span className="w-16 text-right text-xs">{ce}/{maxCe}</span>
          </div>
          {/* XP */}
          <div className="flex items-center gap-2">
            <span className="w-8 text-xs text-green-400">XP</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <span className="w-16 text-right text-xs">{xp}/{xpNeeded}</span>
          </div>
        </div>

        {/* --- HUB --- */}
        {screen === "hub" && (
          <div className="w-full max-w-lg space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={train} className="rounded-2xl border border-purple-700 bg-purple-900/40 p-4 text-center transition-all hover:bg-purple-800/40 active:scale-95">
                <span className="text-3xl">🥊</span>
                <p className="mt-1 text-sm font-bold">수련</p>
                <p className="text-[10px] text-purple-300">+{5 + Math.floor(level * 0.8)} XP</p>
              </button>
              <button onClick={heal} disabled={money < 50 + level * 10} className="rounded-2xl border border-green-700 bg-green-900/40 p-4 text-center transition-all hover:bg-green-800/40 active:scale-95 disabled:opacity-40">
                <span className="text-3xl">🏥</span>
                <p className="mt-1 text-sm font-bold">이에리의 치료</p>
                <p className="text-[10px] text-green-300">💰 {50 + level * 10}원</p>
              </button>
            </div>

            <button onClick={() => setScreen("gacha")}
              className="w-full rounded-2xl border border-fuchsia-500 bg-gradient-to-r from-fuchsia-900/50 to-purple-900/50 p-3 text-center font-bold transition-all hover:from-fuchsia-800/50 hover:to-purple-800/50 active:scale-95 shadow-[0_0_12px_rgba(232,121,249,0.3)]">
              🔮 주술 뽑기 (가챠) <span className="text-[11px] text-fuchsia-300">특급 확정 천장 {GACHA_PITY}회</span>
            </button>

            <div>
              <h3 className="mb-2 text-center text-sm font-bold text-red-300">☠️ 저주령 토벌 임무</h3>
              <div className="grid grid-cols-2 gap-2">
                {availableSpirits.map((spirit) => {
                  const gi = GRADE_INFO[spirit.grade];
                  return (
                    <button
                      key={spirit.id}
                      onClick={() => startBattle(spirit)}
                      disabled={hp <= 0}
                      className="rounded-xl border border-purple-800 bg-purple-900/30 p-3 text-left transition-all hover:bg-purple-800/40 active:scale-95 disabled:opacity-40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{spirit.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{spirit.name}</p>
                          <p className="text-[10px] text-purple-300">
                            <span className={gi.color}>{gi.emoji}{gi.name}</span> HP:{spirit.hp}
                          </p>
                          <p className="text-[10px] text-yellow-400">+{spirit.xpReward}XP +{spirit.moneyReward}원</p>
                          {spirit.specialAbility && <p className="truncate text-[9px] text-red-300">⚠ {spirit.specialAbility}</p>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {log.length > 0 && (
              <div className="rounded-xl bg-slate-800/60 p-3">
                <p className="mb-1 text-xs font-bold text-slate-400">기록</p>
                {log.slice(0, 5).map((l, i) => <p key={i} className="text-xs text-slate-300">{l}</p>)}
              </div>
            )}

            <Link href="/" className="block w-full rounded-xl border border-purple-700 bg-purple-900/40 py-3 text-center text-sm font-bold text-purple-300 transition-all hover:bg-purple-800/40 active:scale-95">
              🏠 소개페이지로
            </Link>
          </div>
        )}

        {/* --- BATTLE --- */}
        {screen === "battle" && enemy && (
          <div className="w-full max-w-lg space-y-3">
            {/* Enemy */}
            <div className="rounded-2xl bg-purple-900/30 p-4 text-center">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-bold">{enemy.emoji} {enemy.name}</span>
                <span className={`text-xs ${GRADE_INFO[enemy.grade].color}`}>{GRADE_INFO[enemy.grade].emoji} {GRADE_INFO[enemy.grade].name}</span>
              </div>
              <div className="mb-1 h-4 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-400 transition-all" style={{ width: `${(enemyHp / enemy.hp) * 100}%` }} />
              </div>
              <p className="mb-2 text-xs">HP: {enemyHp}/{enemy.hp}</p>
              <span className={`inline-block text-6xl transition-transform ${enemyAtkAnim ? "scale-125" : ""}`} style={{ animation: enemyAtkAnim ? "shake 0.3s" : "float 2s ease-in-out infinite" }}>
                {enemy.emoji}
              </span>
              {atkAnim && <div className="mt-2 text-4xl" style={{ animation: "atkUp 0.6s ease-out forwards" }}>{atkAnim}</div>}
            </div>

            {/* Techniques */}
            <div className="grid grid-cols-2 gap-2" style={{ maxHeight: 260, overflowY: "auto" }}>
              {unlockedTech.map((tech) => {
                const cd = cooldowns[tech.id] ?? 0;
                const canUse = ce >= tech.cursedEnergy && cd === 0;
                const isHeal = tech.damage < 0;
                return (
                  <button
                    key={tech.id}
                    onClick={() => useTechnique(tech)}
                    disabled={!canUse}
                    className={`rounded-xl border p-2.5 text-left transition-all active:scale-95 ${
                      canUse
                        ? isHeal
                          ? "border-green-700 bg-green-900/40 hover:bg-green-800/40"
                          : "border-purple-700 bg-purple-900/40 hover:bg-purple-800/40"
                        : "border-slate-700 bg-slate-800/40 opacity-40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{tech.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold">{tech.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {isHeal ? `HP+${Math.abs(tech.damage)}` : `DMG:${tech.damage}`} CE:{tech.cursedEnergy}
                          {cd > 0 && <span className="ml-1 text-red-400">({cd}s)</span>}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button onClick={toHub} className="w-full rounded-xl bg-slate-700 py-2 text-sm font-bold hover:bg-slate-600">🏃 후퇴</button>

            <div className="rounded-xl bg-slate-800/60 p-3">
              {log.slice(0, 5).map((l, i) => <p key={i} className="text-xs text-slate-300">{l}</p>)}
            </div>
          </div>
        )}

        {/* --- VICTORY --- */}
        {screen === "victory" && enemy && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <span className="text-7xl">🎉</span>
            <h2 className="text-3xl font-black">토벌 완료!</h2>
            <p className="text-purple-300">{enemy.emoji} {enemy.name}을(를) 토벌했다!</p>
            <div className="flex gap-4 text-sm">
              <span className="text-green-400">+{enemy.xpReward} XP</span>
              <span className="text-yellow-400">+{enemy.moneyReward}원</span>
            </div>
            <button onClick={toHub} className="mt-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">
              돌아가기 🏘️
            </button>
          </div>
        )}

        {/* --- DEFEAT --- */}
        {screen === "defeat" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <span className="text-7xl">💀</span>
            <h2 className="text-3xl font-black">패배...</h2>
            <p className="text-red-300">더 강해져서 다시 도전하자!</p>
            <button onClick={toHub} className="mt-4 rounded-full bg-gradient-to-r from-slate-600 to-slate-700 px-8 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">
              돌아가기 🏘️
            </button>
          </div>
        )}

        {/* --- 주술 뽑기 (가챠) --- */}
        {screen === "gacha" && (
          <div className="w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setScreen("hub")} className="text-sm text-purple-300 hover:text-white">← 돌아가기</button>
              <h3 className="text-lg font-extrabold bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">🔮 주술 뽑기</h3>
              <span className="text-yellow-400 text-sm">💰 {money.toLocaleString()}</span>
            </div>

            {/* 확률 안내 */}
            <div className="rounded-xl bg-slate-800/60 p-3 text-xs">
              <div className="mb-1 font-bold text-slate-300">✨ 등급별 확률 (가중치)</div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {(["special", "legend", "rare", "normal"] as GachaRarity[]).map(r => {
                  const info = GACHA_RARITY[r];
                  const total = 85 + 70 + 43 + 35;
                  return <span key={r} className={info.color}>{info.emoji} {info.name} {((info.weight / total) * 100).toFixed(1)}%</span>;
                })}
              </div>
              <div className="mt-1 text-fuchsia-300">🎯 천장: {pity}/{GACHA_PITY} (130번째에 특급 확정!)</div>
            </div>

            {/* 뽑기 결과 */}
            {pullResults.length > 0 && (
              <div className="rounded-xl border border-fuchsia-500/40 bg-black/40 p-3">
                <div className="mb-2 text-center text-xs font-bold text-fuchsia-300">뽑기 결과 (캐릭터를 눌러 스킬 사용!) {pullResults.some(c => c.rarity === "special") && "— ✨특급 획득!✨"}</div>
                <div className="grid grid-cols-5 gap-2">
                  {pullResults.map((c, i) => {
                    const info = GACHA_RARITY[c.rarity];
                    return (
                      <button key={i} onClick={() => setSelectedChar(c.id)} className={`flex flex-col items-center rounded-lg border-2 ${info.ring} bg-slate-900/70 p-1 hover:brightness-125 active:scale-95 ${c.rarity === "special" ? "shadow-[0_0_10px_rgba(234,179,8,0.7)]" : ""}`}>
                        <span className="text-2xl">{c.emoji}</span>
                        <span className={`text-[8px] font-bold ${info.color}`}>{info.name}</span>
                        <span className="text-[8px] text-gray-400 text-center leading-tight">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 뽑기 버튼 */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => doPull(1)} disabled={money < GACHA_COST}
                className="rounded-2xl border border-fuchsia-600 bg-fuchsia-900/40 p-4 text-center font-bold transition-all hover:bg-fuchsia-800/40 active:scale-95 disabled:opacity-40">
                🔮 1회 뽑기<br /><span className="text-xs text-yellow-300">💰 {GACHA_COST}</span>
              </button>
              <button onClick={() => doPull(10)} disabled={money < GACHA_COST * 10 - 500}
                className="rounded-2xl border border-purple-500 bg-gradient-to-b from-purple-800/50 to-fuchsia-800/50 p-4 text-center font-bold transition-all hover:from-purple-700/50 active:scale-95 disabled:opacity-40">
                🔮 10연차<br /><span className="text-xs text-yellow-300">💰 {(GACHA_COST * 10 - 500).toLocaleString()} (할인!)</span>
              </button>
            </div>

            {/* 컬렉션 */}
            <div>
              <h4 className="mb-2 text-sm font-bold text-slate-300">📖 도감 ({Object.keys(collection).length}/{GACHA_POOL.length})</h4>
              <div className="grid grid-cols-5 gap-2">
                {GACHA_POOL.map(c => {
                  const owned = collection[c.id] || 0;
                  const info = GACHA_RARITY[c.rarity];
                  return (
                    <button key={c.id} onClick={() => owned && setSelectedChar(c.id)} disabled={!owned}
                      className={`flex flex-col items-center rounded-lg border p-1 ${owned ? info.ring + " bg-slate-900/70 hover:brightness-125 active:scale-95" : "border-gray-800 bg-black/40 opacity-40 cursor-not-allowed"}`}>
                      <span className="text-2xl">{owned ? c.emoji : "❔"}</span>
                      <span className={`text-[8px] font-bold ${owned ? info.color : "text-gray-600"}`}>{owned ? info.name : "???"}</span>
                      <span className="text-[8px] text-gray-400 text-center leading-tight">{owned ? c.name : "미획득"}</span>
                      {owned > 1 && <span className="text-[8px] text-yellow-400">x{owned}</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-center text-[10px] text-slate-500">보유 캐릭터를 눌러 주술을 사용해보세요!</p>
            </div>

            {/* 캐릭터 주술 사용 창 */}
            {selectedChar && (() => {
              const c = GACHA_POOL.find(x => x.id === selectedChar);
              const tech = CHAR_TECH[selectedChar];
              if (!c || !tech) return null;
              const info = GACHA_RARITY[c.rarity];
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedChar(null)}>
                  <div className="w-full max-w-sm rounded-2xl border-2 border-fuchsia-500/60 bg-slate-900 p-4" onClick={e => e.stopPropagation()}>
                    <div className="text-center">
                      <div className="text-5xl">{c.emoji}</div>
                      <div className="font-extrabold">{c.name}</div>
                      <div className={`text-xs ${info.color}`}>{info.emoji} {info.name}</div>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <div className="text-xs font-bold text-slate-400">🌀 주술 (자유 사용)</div>
                      {tech.normal.map(t => (
                        <button key={t} onClick={() => castNormal(t)} className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 p-2 text-sm text-left active:scale-95">🌀 {t}</button>
                      ))}
                      <div className="mt-2 text-xs font-bold text-fuchsia-400">🌌 영역전개</div>
                      <button onClick={() => useDomain(tech.domain)}
                        className="w-full rounded-lg bg-fuchsia-800 hover:bg-fuchsia-700 active:scale-95 p-2 text-sm text-left">
                        🌌 {tech.domain}
                      </button>
                      <div className="mt-2 text-xs font-bold text-yellow-400">💥 최대 스킬</div>
                      <button onClick={() => useUltimate(tech.ultimate)}
                        className="w-full rounded-lg bg-yellow-700 hover:bg-yellow-600 active:scale-95 p-2 text-sm text-left">
                        💥 {tech.ultimate}
                      </button>
                    </div>
                    <button onClick={() => setSelectedChar(null)} className="mt-3 w-full rounded-lg bg-slate-700 py-2 text-sm hover:bg-slate-600">닫기</button>
                  </div>
                </div>
              );
            })()}

            {/* 주술 발동 연출 */}
            {castFx && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
                <div className="absolute inset-0 animate-pulse" style={{
                  background: castFx.kind === "domain"
                    ? "radial-gradient(circle, rgba(232,121,249,0.5), transparent 70%)"
                    : castFx.kind === "ultimate"
                      ? "radial-gradient(circle, rgba(234,179,8,0.5), transparent 70%)"
                      : "radial-gradient(circle, rgba(56,189,248,0.4), transparent 70%)",
                }} />
                <div className="relative text-center">
                  <div className="text-sm font-bold text-white/80">{castFx.kind === "domain" ? "🌌 영역전개!" : castFx.kind === "ultimate" ? "💥 최대 스킬!" : "🌀 주술 발동!"}</div>
                  <div className={`text-3xl font-black animate-bounce ${castFx.kind === "domain" ? "text-fuchsia-300" : castFx.kind === "ultimate" ? "text-yellow-300" : "text-cyan-300"}`}>{castFx.name}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TECHNIQUES LIST --- */}
        {screen === "techniques" && (
          <div className="w-full max-w-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black">📜 술식 목록</h2>
              <button onClick={() => setScreen("hub")} className="text-sm text-purple-300 hover:text-white">닫기 ✕</button>
            </div>
            {(["physical", "cursed", "shikigami", "reverse", "domain"] as TechniqueType[]).map((type) => {
              const techs = ALL_TECHNIQUES.filter((t) => t.type === type);
              const info = TYPE_INFO[type];
              return (
                <div key={type} className="mb-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`text-sm font-bold ${info.color}`}>{info.emoji} {info.name}</span>
                  </div>
                  <div className="space-y-1">
                    {techs.map((tech) => {
                      const unlocked = level >= tech.unlockLevel;
                      return (
                        <div key={tech.id} className={`rounded-xl border p-3 ${unlocked ? "border-slate-700 bg-slate-800/50" : "border-slate-800 bg-slate-900/50 opacity-40"}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{unlocked ? tech.emoji : "🔒"}</span>
                            <div className="flex-1">
                              <p className="text-sm font-bold">{unlocked ? tech.name : "???"}</p>
                              <p className="text-[10px] text-slate-400">{unlocked ? tech.desc : `Lv.${tech.unlockLevel}에 해금`}</p>
                            </div>
                            {unlocked && (
                              <div className="text-right text-[10px] text-slate-400">
                                <p>{tech.damage < 0 ? `HP+${Math.abs(tech.damage)}` : `DMG:${tech.damage}`}</p>
                                <p>CE: {tech.cursedEnergy}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* --- OFFLINE REWARD MODAL --- */}
        {offlineReward && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-purple-600 bg-gradient-to-b from-indigo-900 to-purple-950 shadow-2xl">
              <div className="bg-gradient-to-r from-purple-600 to-pink-500 p-5 text-center">
                <span className="text-5xl">🌙</span>
                <h2 className="mt-2 text-2xl font-black">오프라인 보상!</h2>
                <p className="text-sm text-purple-100">
                  {offlineReward.minutes >= 60
                    ? `${Math.floor(offlineReward.minutes / 60)}시간 ${offlineReward.minutes % 60}분`
                    : `${offlineReward.minutes}분`} 동안 수련했어요!
                </p>
              </div>
              <div className="space-y-3 p-6">
                <div className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3">
                  <span className="text-sm text-green-300">경험치 획득</span>
                  <span className="text-lg font-black text-green-400">+{offlineReward.xpGained.toLocaleString()} XP</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3">
                  <span className="text-sm text-yellow-300">돈 획득</span>
                  <span className="text-lg font-black text-yellow-400">+{offlineReward.moneyGained.toLocaleString()}원</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3">
                  <span className="text-sm text-red-300">HP / CE</span>
                  <span className="text-sm font-bold text-red-400">완전 회복! 💖</span>
                </div>
                <button
                  onClick={() => setOfflineReward(null)}
                  className="mt-2 w-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 py-3 text-lg font-black shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  받기! 🎁
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-12deg) scale(1.1); } 75% { transform: rotate(12deg) scale(1.1); } }
        @keyframes atkUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-50px) scale(1.5); } }
      `}</style>
    </div>
  );
}
