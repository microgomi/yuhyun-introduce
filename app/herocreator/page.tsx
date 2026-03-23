"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 파츠 옵션 ───── */
const BODY_TYPES = [
  { id: "normal", name: "보통", emoji: "🧍", width: 26, height: 32 },
  { id: "muscular", name: "근육질", emoji: "💪", width: 30, height: 34 },
  { id: "slim", name: "날씬", emoji: "🏃", width: 22, height: 34 },
  { id: "big", name: "거대", emoji: "🦍", width: 34, height: 36 },
  { id: "small", name: "꼬마", emoji: "🧒", width: 20, height: 26 },
];

const HEAD_SHAPES = [
  { id: "round", name: "둥근형" },
  { id: "square", name: "각진형" },
  { id: "oval", name: "타원형" },
];

const HAIR_STYLES = [
  { id: "none", name: "민머리", draw: "none" },
  { id: "spiky", name: "뾰족", draw: "spiky" },
  { id: "long", name: "장발", draw: "long" },
  { id: "mohawk", name: "모히칸", draw: "mohawk" },
  { id: "curly", name: "곱슬", draw: "curly" },
  { id: "ponytail", name: "포니테일", draw: "ponytail" },
  { id: "twintail", name: "트윈테일", draw: "twintail" },
  { id: "afro", name: "아프로", draw: "afro" },
];

const EYES = [
  { id: "normal", name: "보통" },
  { id: "angry", name: "화난" },
  { id: "cool", name: "멋진" },
  { id: "cute", name: "귀여운" },
  { id: "laser", name: "레이저" },
  { id: "mask", name: "마스크" },
  { id: "visor", name: "바이저" },
  { id: "scar", name: "흉터" },
];

const CAPES = [
  { id: "none", name: "없음", color: "" },
  { id: "red", name: "빨간 망토", color: "#dc2626" },
  { id: "blue", name: "파란 망토", color: "#2563eb" },
  { id: "gold", name: "황금 망토", color: "#fbbf24" },
  { id: "purple", name: "보라 망토", color: "#7c3aed" },
  { id: "black", name: "검은 망토", color: "#1e1b4b" },
  { id: "rainbow", name: "무지개 망토", color: "url(#rainbow)" },
];

const EMBLEMS = [
  { id: "none", name: "없음", emoji: "" },
  { id: "star", name: "별", emoji: "⭐" },
  { id: "lightning", name: "번개", emoji: "⚡" },
  { id: "fire", name: "불", emoji: "🔥" },
  { id: "shield", name: "방패", emoji: "🛡️" },
  { id: "diamond", name: "다이아", emoji: "💎" },
  { id: "skull", name: "해골", emoji: "💀" },
  { id: "heart", name: "하트", emoji: "❤️" },
  { id: "crown", name: "왕관", emoji: "👑" },
  { id: "moon", name: "달", emoji: "🌙" },
];

const WEAPONS = [
  { id: "none", name: "맨손", emoji: "✊", power: 0, type: "melee" },
  { id: "sword", name: "검", emoji: "⚔️", power: 3, type: "melee" },
  { id: "hammer", name: "망치", emoji: "🔨", power: 4, type: "melee" },
  { id: "bow", name: "활", emoji: "🏹", power: 2, type: "range" },
  { id: "staff", name: "지팡이", emoji: "🪄", power: 3, type: "magic" },
  { id: "gun", name: "블라스터", emoji: "🔫", power: 3, type: "range" },
  { id: "trident", name: "삼지창", emoji: "🔱", power: 4, type: "melee" },
  { id: "shield_w", name: "방패", emoji: "🛡️", power: 1, type: "defense" },
  { id: "claws", name: "클로", emoji: "🐾", power: 3, type: "melee" },
];

const COLORS = [
  "#ef4444", "#f97316", "#fbbf24", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#1e1b4b",
  "#ffffff", "#6b7280", "#92400e", "#000000", "#c084fc",
];

/* ───── 능력 ───── */
interface Power {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  stat: "strength" | "speed" | "defense" | "magic" | "luck";
  value: number;
  cost: number;
}

const POWERS: Power[] = [
  { id: "super_strength", name: "초인 힘", emoji: "💪", desc: "건물도 들어올린다!", stat: "strength", value: 20, cost: 0 },
  { id: "flight", name: "비행", emoji: "🦅", desc: "하늘을 날자!", stat: "speed", value: 15, cost: 0 },
  { id: "invincible", name: "무적 방어", emoji: "🛡️", desc: "어떤 공격도 안 통해!", stat: "defense", value: 20, cost: 0 },
  { id: "fireball", name: "파이어볼", emoji: "🔥", desc: "불을 쏜다!", stat: "magic", value: 18, cost: 0 },
  { id: "ice_power", name: "얼음 능력", emoji: "🧊", desc: "모든 걸 얼린다!", stat: "magic", value: 16, cost: 0 },
  { id: "lightning", name: "번개", emoji: "⚡", desc: "번개를 소환!", stat: "magic", value: 18, cost: 0 },
  { id: "teleport", name: "순간이동", emoji: "🌀", desc: "어디든 순식간에!", stat: "speed", value: 20, cost: 0 },
  { id: "invisible", name: "투명", emoji: "👻", desc: "보이지 않는다!", stat: "luck", value: 15, cost: 0 },
  { id: "heal", name: "치유", emoji: "💚", desc: "상처를 낫게 한다!", stat: "defense", value: 15, cost: 0 },
  { id: "time_stop", name: "시간 정지", emoji: "⏰", desc: "시간을 멈춘다!", stat: "speed", value: 25, cost: 0 },
  { id: "laser_eyes", name: "레이저 눈", emoji: "👁️", desc: "눈에서 레이저!", stat: "strength", value: 16, cost: 0 },
  { id: "super_speed", name: "초고속", emoji: "💨", desc: "빛보다 빠르다!", stat: "speed", value: 22, cost: 0 },
  { id: "shape_shift", name: "변신", emoji: "🦎", desc: "무엇이든 변신!", stat: "luck", value: 18, cost: 0 },
  { id: "gravity", name: "중력 조종", emoji: "🌍", desc: "중력을 조종!", stat: "magic", value: 20, cost: 0 },
  { id: "mind_read", name: "독심술", emoji: "🧠", desc: "마음을 읽는다!", stat: "luck", value: 15, cost: 0 },
];

/* ───── 히어로 설정 ───── */
interface HeroConfig {
  name: string;
  bodyType: string;
  headShape: string;
  hairStyle: string;
  hairColor: string;
  skinColor: string;
  suitColor: string;
  suitColor2: string;
  beltColor: string;
  bootColor: string;
  eyes: string;
  cape: string;
  emblem: string;
  weapon: string;
  powers: string[];  // 최대 3개
  backstory: string;
}

/* ───── 빌런 ───── */
interface Villain {
  name: string;
  emoji: string;
  hp: number;
  attack: number;
  desc: string;
}

const VILLAINS: Villain[] = [
  { name: "좀비킹", emoji: "🧟", hp: 30, attack: 5, desc: "좀비 군단의 왕!" },
  { name: "다크 위자드", emoji: "🧙‍♂️", hp: 40, attack: 7, desc: "어둠의 마법사!" },
  { name: "메가 로봇", emoji: "🤖", hp: 50, attack: 8, desc: "파괴 로봇!" },
  { name: "드래곤 로드", emoji: "🐉", hp: 60, attack: 10, desc: "용의 제왕!" },
  { name: "우주 황제", emoji: "👾", hp: 80, attack: 12, desc: "은하의 지배자!" },
];

/* ───── 히어로 SVG ───── */
function HeroPreview({ config, size = 120, animate = false }: { config: HeroConfig; size?: number; animate?: boolean }) {
  const s = size;
  const body = BODY_TYPES.find(b => b.id === config.bodyType) || BODY_TYPES[0];
  const cx = s / 2;
  const headR = s * 0.14;
  const headY = s * 0.22;
  const bodyW = body.width * (s / 120);
  const bodyH = body.height * (s / 120);
  const bodyY = headY + headR + 2;

  const renderHair = () => {
    switch (config.hairStyle) {
      case "spiky":
        return <polygon points={`${cx-headR},${headY} ${cx-headR*0.5},${headY-headR*1.3} ${cx},${headY-headR*0.5} ${cx+headR*0.5},${headY-headR*1.4} ${cx+headR},${headY}`} fill={config.hairColor} />;
      case "long":
        return (<><ellipse cx={cx} cy={headY-headR*0.2} rx={headR*1.15} ry={headR*0.75} fill={config.hairColor} /><rect x={cx-headR*1.1} y={headY} width={headR*0.4} height={headR*1.8} rx={3} fill={config.hairColor} /><rect x={cx+headR*0.7} y={headY} width={headR*0.4} height={headR*1.8} rx={3} fill={config.hairColor} /></>);
      case "mohawk":
        return (<><rect x={cx-headR*0.25} y={headY-headR*1.5} width={headR*0.5} height={headR*1.3} rx={3} fill={config.hairColor} /><ellipse cx={cx} cy={headY-headR*0.15} rx={headR*1.05} ry={headR*0.55} fill={config.hairColor} /></>);
      case "curly":
        return (<>{[-1,-0.3,0.3,1].map((dx,i)=><circle key={i} cx={cx+dx*headR*0.8} cy={headY-headR*0.5-Math.abs(dx)*headR*0.3} r={headR*0.35} fill={config.hairColor} />)}</>);
      case "ponytail":
        return (<><ellipse cx={cx} cy={headY-headR*0.3} rx={headR*1.1} ry={headR*0.7} fill={config.hairColor} /><ellipse cx={cx+headR*1.3} cy={headY+headR*0.7} rx={headR*0.3} ry={headR*0.9} fill={config.hairColor} /></>);
      case "twintail":
        return (<><ellipse cx={cx} cy={headY-headR*0.2} rx={headR*1.1} ry={headR*0.7} fill={config.hairColor} /><ellipse cx={cx-headR*1.2} cy={headY+headR*0.9} rx={headR*0.25} ry={headR*0.7} fill={config.hairColor} /><ellipse cx={cx+headR*1.2} cy={headY+headR*0.9} rx={headR*0.25} ry={headR*0.7} fill={config.hairColor} /></>);
      case "afro":
        return <circle cx={cx} cy={headY-headR*0.2} r={headR*1.4} fill={config.hairColor} />;
      default: return null;
    }
  };

  const renderEyes = () => {
    const ey = headY + headR * 0.05;
    const eg = headR * 0.35;
    const er = headR * 0.12;
    switch (config.eyes) {
      case "angry":
        return (<><circle cx={cx-eg} cy={ey} r={er} fill="#fff" stroke="#333" strokeWidth={0.5}/><circle cx={cx-eg} cy={ey} r={er*0.6} fill="#333"/><circle cx={cx+eg} cy={ey} r={er} fill="#fff" stroke="#333" strokeWidth={0.5}/><circle cx={cx+eg} cy={ey} r={er*0.6} fill="#333"/><line x1={cx-eg-er} y1={ey-er*1.5} x2={cx-eg+er} y2={ey-er} stroke="#333" strokeWidth={1.2}/><line x1={cx+eg+er} y1={ey-er*1.5} x2={cx+eg-er} y2={ey-er} stroke="#333" strokeWidth={1.2}/></>);
      case "cool":
        return (<><line x1={cx-eg-er} y1={ey} x2={cx-eg+er*1.5} y2={ey-er*0.5} stroke="#333" strokeWidth={1.5} strokeLinecap="round"/><line x1={cx+eg-er*1.5} y1={ey-er*0.5} x2={cx+eg+er} y2={ey} stroke="#333" strokeWidth={1.5} strokeLinecap="round"/></>);
      case "cute":
        return (<><circle cx={cx-eg} cy={ey} r={er*1.3} fill="#333"/><circle cx={cx-eg+er*0.3} cy={ey-er*0.3} r={er*0.5} fill="#fff"/><circle cx={cx+eg} cy={ey} r={er*1.3} fill="#333"/><circle cx={cx+eg+er*0.3} cy={ey-er*0.3} r={er*0.5} fill="#fff"/></>);
      case "laser":
        return (<><circle cx={cx-eg} cy={ey} r={er} fill="#ef4444"/><circle cx={cx+eg} cy={ey} r={er} fill="#ef4444"/><circle cx={cx-eg} cy={ey} r={er*0.4} fill="#fff"/><circle cx={cx+eg} cy={ey} r={er*0.4} fill="#fff"/></>);
      case "mask":
        return <rect x={cx-headR*0.8} y={ey-er*1.5} width={headR*1.6} height={er*3} rx={er} fill={config.suitColor} stroke="#333" strokeWidth={0.5}/>;
      case "visor":
        return <rect x={cx-headR*0.85} y={ey-er} width={headR*1.7} height={er*2} rx={er*0.5} fill="#333" opacity={0.8}/>;
      case "scar":
        return (<><circle cx={cx-eg} cy={ey} r={er} fill="#333"/><circle cx={cx+eg} cy={ey} r={er} fill="#333"/><line x1={cx+eg-er} y1={ey-er*2} x2={cx+eg+er*0.5} y2={ey+er*2} stroke="#dc2626" strokeWidth={1.2}/></>);
      default:
        return (<><circle cx={cx-eg} cy={ey} r={er} fill="#333"/><circle cx={cx+eg} cy={ey} r={er} fill="#333"/></>);
    }
  };

  const capeData = CAPES.find(c => c.id === config.cape);

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={animate ? "animate-bounce" : ""}>
      <defs>
        <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444"/><stop offset="20%" stopColor="#f97316"/><stop offset="40%" stopColor="#fbbf24"/>
          <stop offset="60%" stopColor="#22c55e"/><stop offset="80%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#8b5cf6"/>
        </linearGradient>
        <linearGradient id="suit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={config.suitColor}/><stop offset="100%" stopColor={config.suitColor2}/>
        </linearGradient>
      </defs>

      {/* 망토 */}
      {capeData && capeData.id !== "none" && (
        <path d={`M${cx-bodyW/2-2},${bodyY+2} Q${cx},${bodyY+bodyH+15} ${cx+bodyW/2+2},${bodyY+2}`}
          fill={capeData.color.startsWith("url") ? capeData.color : capeData.color} opacity={0.85} />
      )}

      {/* 머리카락 (뒤) */}
      {renderHair()}

      {/* 머리 */}
      {config.headShape === "round" && <circle cx={cx} cy={headY} r={headR} fill={config.skinColor} />}
      {config.headShape === "square" && <rect x={cx-headR} y={headY-headR} width={headR*2} height={headR*2} rx={3} fill={config.skinColor} />}
      {config.headShape === "oval" && <ellipse cx={cx} cy={headY} rx={headR*0.85} ry={headR} fill={config.skinColor} />}

      {/* 눈 */}
      {renderEyes()}

      {/* 입 */}
      <path d={`M${cx-headR*0.2},${headY+headR*0.4} Q${cx},${headY+headR*0.55} ${cx+headR*0.2},${headY+headR*0.4}`} fill="none" stroke="#333" strokeWidth={0.8}/>

      {/* 몸통 (슈트) */}
      <rect x={cx-bodyW/2} y={bodyY} width={bodyW} height={bodyH} rx={4} fill="url(#suit-grad)" />

      {/* 엠블럼 */}
      {config.emblem !== "none" && (
        <text x={cx} y={bodyY + bodyH * 0.4} textAnchor="middle" fontSize={bodyW * 0.4} dominantBaseline="central">
          {EMBLEMS.find(e=>e.id===config.emblem)?.emoji}
        </text>
      )}

      {/* 벨트 */}
      <rect x={cx-bodyW/2-1} y={bodyY+bodyH*0.6} width={bodyW+2} height={bodyH*0.12} rx={2} fill={config.beltColor} />

      {/* 팔 */}
      <rect x={cx-bodyW/2-s*0.05} y={bodyY+2} width={s*0.05} height={bodyH*0.65} rx={3} fill={config.skinColor} />
      <rect x={cx+bodyW/2} y={bodyY+2} width={s*0.05} height={bodyH*0.65} rx={3} fill={config.skinColor} />

      {/* 장갑 */}
      <rect x={cx-bodyW/2-s*0.05} y={bodyY+bodyH*0.5} width={s*0.06} height={bodyH*0.2} rx={2} fill={config.suitColor2} />
      <rect x={cx+bodyW/2-s*0.01} y={bodyY+bodyH*0.5} width={s*0.06} height={bodyH*0.2} rx={2} fill={config.suitColor2} />

      {/* 다리 */}
      <rect x={cx-bodyW/2+2} y={bodyY+bodyH-1} width={bodyW*0.38} height={bodyH*0.5} rx={3} fill={config.suitColor2} />
      <rect x={cx+bodyW/2-2-bodyW*0.38} y={bodyY+bodyH-1} width={bodyW*0.38} height={bodyH*0.5} rx={3} fill={config.suitColor2} />

      {/* 부츠 */}
      <ellipse cx={cx-bodyW*0.17} cy={bodyY+bodyH+bodyH*0.47} rx={bodyW*0.22} ry={s*0.03} fill={config.bootColor} />
      <ellipse cx={cx+bodyW*0.17} cy={bodyY+bodyH+bodyH*0.47} rx={bodyW*0.22} ry={s*0.03} fill={config.bootColor} />

      {/* 무기 */}
      {config.weapon !== "none" && (
        <text x={cx+bodyW/2+s*0.06} y={bodyY+bodyH*0.3} fontSize={s*0.13} dominantBaseline="central">
          {WEAPONS.find(w=>w.id===config.weapon)?.emoji}
        </text>
      )}
    </svg>
  );
}

type Screen = "main" | "customize" | "powers" | "story" | "preview" | "battle";

const SKIN_COLORS = ["#fde68a", "#d2b48c", "#8b6f47", "#f5deb3", "#dda15e", "#bc6c25"];

export default function HeroCreatorPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [config, setConfig] = useState<HeroConfig>({
    name: "", bodyType: "normal", headShape: "round", hairStyle: "spiky",
    hairColor: "#fbbf24", skinColor: "#fde68a", suitColor: "#3b82f6", suitColor2: "#1e3a5f",
    beltColor: "#fbbf24", bootColor: "#dc2626", eyes: "normal", cape: "red",
    emblem: "star", weapon: "none", powers: [], backstory: "",
  });
  const [editTab, setEditTab] = useState("body");
  const [savedHeroes, setSavedHeroes] = useState<HeroConfig[]>([]);

  // 배틀
  const [villain, setVillain] = useState<Villain | null>(null);
  const [heroHp, setHeroHp] = useState(100);
  const [villainHp, setVillainHp] = useState(0);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [battleActive, setBattleActive] = useState(false);
  const [isHeroTurn, setIsHeroTurn] = useState(true);

  const heroStats = {
    strength: 10 + config.powers.reduce((s, pId) => s + (POWERS.find(p => p.id === pId)?.stat === "strength" ? POWERS.find(p => p.id === pId)!.value : 0), 0),
    speed: 10 + config.powers.reduce((s, pId) => s + (POWERS.find(p => p.id === pId)?.stat === "speed" ? POWERS.find(p => p.id === pId)!.value : 0), 0),
    defense: 10 + config.powers.reduce((s, pId) => s + (POWERS.find(p => p.id === pId)?.stat === "defense" ? POWERS.find(p => p.id === pId)!.value : 0), 0),
    magic: 10 + config.powers.reduce((s, pId) => s + (POWERS.find(p => p.id === pId)?.stat === "magic" ? POWERS.find(p => p.id === pId)!.value : 0), 0),
    luck: 10 + config.powers.reduce((s, pId) => s + (POWERS.find(p => p.id === pId)?.stat === "luck" ? POWERS.find(p => p.id === pId)!.value : 0), 0),
  };
  const weaponBonus = WEAPONS.find(w => w.id === config.weapon)?.power || 0;

  const updateConfig = (key: keyof HeroConfig, value: string | string[]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const togglePower = (powerId: string) => {
    setConfig(prev => {
      if (prev.powers.includes(powerId)) return { ...prev, powers: prev.powers.filter(p => p !== powerId) };
      if (prev.powers.length >= 3) return prev;
      return { ...prev, powers: [...prev.powers, powerId] };
    });
  };

  const saveHero = () => {
    if (!config.name.trim()) return;
    setSavedHeroes(prev => [...prev, { ...config }]);
  };

  const startBattle = (v: Villain) => {
    setVillain(v);
    setHeroHp(100);
    setVillainHp(v.hp);
    setBattleLog([`${v.emoji} ${v.name} 등장! "${v.desc}"`]);
    setIsHeroTurn(true);
    setBattleActive(true);
    setScreen("battle");
  };

  const heroAttack = (type: "normal" | "power" | "special") => {
    if (!battleActive || !villain || !isHeroTurn) return;
    const log: string[] = [];
    let dmg = 0;

    if (type === "normal") {
      dmg = Math.floor(heroStats.strength / 3 + weaponBonus + Math.random() * 5);
      log.push(`⚔️ ${config.name}의 공격! ${dmg} 데미지!`);
    } else if (type === "power" && config.powers.length > 0) {
      const power = POWERS.find(p => p.id === config.powers[Math.floor(Math.random() * config.powers.length)]);
      if (power) {
        dmg = Math.floor(power.value / 2 + weaponBonus + Math.random() * 8);
        log.push(`${power.emoji} ${power.name}!! ${dmg} 데미지!`);
      }
    } else if (type === "special") {
      const totalPower = Object.values(heroStats).reduce((a, b) => a + b, 0);
      dmg = Math.floor(totalPower / 5 + Math.random() * 10);
      log.push(`💥 필살기!! ${dmg} 데미지!!`);
    }

    const newVHp = Math.max(0, villainHp - dmg);
    setVillainHp(newVHp);

    if (newVHp <= 0) {
      log.push(`🎉 ${villain.name}을(를) 물리쳤다!!`);
      setBattleActive(false);
    }

    setBattleLog(prev => [...prev, ...log].slice(-8));
    setIsHeroTurn(false);

    if (newVHp > 0) {
      setTimeout(() => {
        const vDmg = Math.max(1, villain.attack - Math.floor(heroStats.defense / 10) + Math.floor(Math.random() * 4));
        setHeroHp(prev => {
          const next = prev - vDmg;
          if (next <= 0) { setBattleLog(p => [...p, `${villain.emoji} ${villain.name}의 공격! ${vDmg}! 😵 패배...`]); setBattleActive(false); return 0; }
          setBattleLog(p => [...p, `${villain.emoji} ${villain.name}의 공격! ${vDmg} 데미지!`].slice(-8));
          return next;
        });
        setIsHeroTurn(true);
      }, 800);
    }
  };

  const TABS = [
    { id: "body", name: "체형", emoji: "🧍" },
    { id: "head", name: "머리", emoji: "💇" },
    { id: "suit", name: "슈트", emoji: "👔" },
    { id: "gear", name: "장비", emoji: "⚔️" },
  ];

  /* ───── 메인 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-purple-300 text-sm mb-4 inline-block">← 홈으로</Link>
          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🦸</div>
            <h1 className="text-3xl font-black mb-1">히어로 만들기</h1>
            <p className="text-purple-300 text-sm">나만의 히어로를 만들고 빌런과 싸워라!</p>
          </div>

          <div className="bg-black/40 rounded-xl p-4 mb-4 text-center">
            <HeroPreview config={config} size={100} />
            {config.name && <div className="font-bold mt-2">{config.name}</div>}
          </div>

          <div className="space-y-2">
            <button onClick={() => setScreen("customize")} className="w-full bg-purple-600 hover:bg-purple-500 rounded-xl p-3 font-bold text-lg">🎨 외형 꾸미기</button>
            <button onClick={() => setScreen("powers")} className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl p-3 font-bold text-lg">⚡ 능력 선택</button>
            <button onClick={() => setScreen("story")} className="w-full bg-amber-600 hover:bg-amber-500 rounded-xl p-3 font-bold text-lg">📖 이름 & 스토리</button>
            <button onClick={() => setScreen("preview")} className="w-full bg-green-600 hover:bg-green-500 rounded-xl p-3 font-bold text-lg">👁️ 미리보기 & 배틀!</button>
          </div>

          {savedHeroes.length > 0 && (
            <div className="mt-4 bg-black/30 rounded-xl p-3">
              <h3 className="text-sm font-bold mb-2 text-center">💾 저장된 히어로</h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {savedHeroes.map((h, i) => (
                  <button key={i} onClick={() => setConfig(h)} className="flex-shrink-0 bg-purple-900/50 rounded-lg p-2 text-center hover:bg-purple-800/50">
                    <HeroPreview config={h} size={50} />
                    <div className="text-[9px] font-bold mt-1">{h.name || "이름없음"}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ───── 커스터마이즈 ───── */
  if (screen === "customize") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-purple-300 text-sm mb-3">← 뒤로</button>

          {/* 미리보기 */}
          <div className="text-center mb-3">
            <HeroPreview config={config} size={100} />
          </div>

          {/* 탭 */}
          <div className="flex gap-1 mb-3">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setEditTab(t.id)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${editTab === t.id ? "bg-purple-600" : "bg-gray-800 hover:bg-gray-700"}`}>
                {t.emoji} {t.name}
              </button>
            ))}
          </div>

          <div className="bg-black/40 rounded-xl p-3 space-y-3">
            {editTab === "body" && (<>
              <div>
                <div className="text-xs font-bold mb-1">체형</div>
                <div className="flex gap-1 flex-wrap">{BODY_TYPES.map(b => (
                  <button key={b.id} onClick={() => updateConfig("bodyType", b.id)}
                    className={`px-2 py-1 rounded-lg text-xs ${config.bodyType === b.id ? "bg-purple-600" : "bg-gray-700"}`}>{b.emoji} {b.name}</button>
                ))}</div>
              </div>
              <div>
                <div className="text-xs font-bold mb-1">피부색</div>
                <div className="flex gap-1">{SKIN_COLORS.map(c => (
                  <button key={c} onClick={() => updateConfig("skinColor", c)}
                    className={`w-8 h-8 rounded-full border-2 ${config.skinColor === c ? "border-yellow-400" : "border-transparent"}`} style={{ backgroundColor: c }} />
                ))}</div>
              </div>
            </>)}

            {editTab === "head" && (<>
              <div>
                <div className="text-xs font-bold mb-1">얼굴형</div>
                <div className="flex gap-1 flex-wrap">{HEAD_SHAPES.map(h => (
                  <button key={h.id} onClick={() => updateConfig("headShape", h.id)}
                    className={`px-2 py-1 rounded-lg text-xs ${config.headShape === h.id ? "bg-purple-600" : "bg-gray-700"}`}>{h.name}</button>
                ))}</div>
              </div>
              <div>
                <div className="text-xs font-bold mb-1">머리 스타일</div>
                <div className="flex gap-1 flex-wrap">{HAIR_STYLES.map(h => (
                  <button key={h.id} onClick={() => updateConfig("hairStyle", h.id)}
                    className={`px-2 py-1 rounded-lg text-xs ${config.hairStyle === h.id ? "bg-purple-600" : "bg-gray-700"}`}>{h.name}</button>
                ))}</div>
              </div>
              <div>
                <div className="text-xs font-bold mb-1">머리 색</div>
                <div className="flex gap-1 flex-wrap">{COLORS.map(c => (
                  <button key={c} onClick={() => updateConfig("hairColor", c)}
                    className={`w-7 h-7 rounded-full border-2 ${config.hairColor === c ? "border-yellow-400" : "border-transparent"}`} style={{ backgroundColor: c }} />
                ))}</div>
              </div>
              <div>
                <div className="text-xs font-bold mb-1">눈</div>
                <div className="flex gap-1 flex-wrap">{EYES.map(e => (
                  <button key={e.id} onClick={() => updateConfig("eyes", e.id)}
                    className={`px-2 py-1 rounded-lg text-xs ${config.eyes === e.id ? "bg-purple-600" : "bg-gray-700"}`}>{e.name}</button>
                ))}</div>
              </div>
            </>)}

            {editTab === "suit" && (<>
              <div>
                <div className="text-xs font-bold mb-1">슈트 메인 색</div>
                <div className="flex gap-1 flex-wrap">{COLORS.map(c => (
                  <button key={c} onClick={() => updateConfig("suitColor", c)}
                    className={`w-7 h-7 rounded-full border-2 ${config.suitColor === c ? "border-yellow-400" : "border-transparent"}`} style={{ backgroundColor: c }} />
                ))}</div>
              </div>
              <div>
                <div className="text-xs font-bold mb-1">슈트 보조 색</div>
                <div className="flex gap-1 flex-wrap">{COLORS.map(c => (
                  <button key={c} onClick={() => updateConfig("suitColor2", c)}
                    className={`w-7 h-7 rounded-full border-2 ${config.suitColor2 === c ? "border-yellow-400" : "border-transparent"}`} style={{ backgroundColor: c }} />
                ))}</div>
              </div>
              <div>
                <div className="text-xs font-bold mb-1">벨트 색</div>
                <div className="flex gap-1 flex-wrap">{COLORS.map(c => (
                  <button key={c} onClick={() => updateConfig("beltColor", c)}
                    className={`w-7 h-7 rounded-full border-2 ${config.beltColor === c ? "border-yellow-400" : "border-transparent"}`} style={{ backgroundColor: c }} />
                ))}</div>
              </div>
              <div>
                <div className="text-xs font-bold mb-1">부츠 색</div>
                <div className="flex gap-1 flex-wrap">{COLORS.map(c => (
                  <button key={c} onClick={() => updateConfig("bootColor", c)}
                    className={`w-7 h-7 rounded-full border-2 ${config.bootColor === c ? "border-yellow-400" : "border-transparent"}`} style={{ backgroundColor: c }} />
                ))}</div>
              </div>
              <div>
                <div className="text-xs font-bold mb-1">엠블럼</div>
                <div className="flex gap-1 flex-wrap">{EMBLEMS.map(e => (
                  <button key={e.id} onClick={() => updateConfig("emblem", e.id)}
                    className={`px-2 py-1 rounded-lg text-xs ${config.emblem === e.id ? "bg-purple-600" : "bg-gray-700"}`}>{e.emoji || "❌"} {e.name}</button>
                ))}</div>
              </div>
              <div>
                <div className="text-xs font-bold mb-1">망토</div>
                <div className="flex gap-1 flex-wrap">{CAPES.map(c => (
                  <button key={c.id} onClick={() => updateConfig("cape", c.id)}
                    className={`px-2 py-1 rounded-lg text-xs ${config.cape === c.id ? "bg-purple-600" : "bg-gray-700"}`}>{c.name}</button>
                ))}</div>
              </div>
            </>)}

            {editTab === "gear" && (<>
              <div>
                <div className="text-xs font-bold mb-1">무기</div>
                <div className="flex gap-1 flex-wrap">{WEAPONS.map(w => (
                  <button key={w.id} onClick={() => updateConfig("weapon", w.id)}
                    className={`px-2 py-1 rounded-lg text-xs ${config.weapon === w.id ? "bg-purple-600" : "bg-gray-700"}`}>{w.emoji} {w.name} {w.power > 0 && `(+${w.power})`}</button>
                ))}</div>
              </div>
            </>)}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 능력 ───── */
  if (screen === "powers") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-blue-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-2">⚡ 능력 선택 (최대 3개)</h2>
          <div className="text-center text-xs text-gray-400 mb-3">선택: {config.powers.length}/3</div>

          <div className="space-y-1.5">
            {POWERS.map(p => {
              const selected = config.powers.includes(p.id);
              return (
                <button key={p.id} onClick={() => togglePower(p.id)}
                  className={`w-full flex items-center gap-2 p-2 rounded-xl text-left ${selected ? "bg-blue-700 ring-1 ring-yellow-400" : "bg-black/30 hover:bg-black/50"}`}>
                  <span className="text-2xl">{p.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{p.name}</div>
                    <div className="text-[10px] text-gray-400">{p.desc}</div>
                  </div>
                  <div className="text-xs text-gray-400">{p.stat === "strength" ? "💪" : p.stat === "speed" ? "🏃" : p.stat === "defense" ? "🛡️" : p.stat === "magic" ? "🔮" : "🍀"}+{p.value}</div>
                  {selected && <span className="text-yellow-400">✅</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 스토리 ───── */
  if (screen === "story") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-amber-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-4">📖 이름 & 스토리</h2>

          <div className="text-center mb-4"><HeroPreview config={config} size={90} /></div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold block mb-1">히어로 이름</label>
              <input type="text" value={config.name} onChange={e => updateConfig("name", e.target.value)}
                placeholder="예: 슈퍼 블레이즈" maxLength={15}
                className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 ring-amber-500" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">배경 스토리</label>
              <textarea value={config.backstory} onChange={e => updateConfig("backstory", e.target.value)}
                placeholder="어떻게 히어로가 됐는지 적어보세요..." maxLength={200} rows={4}
                className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 ring-amber-500 text-sm resize-none" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 미리보기 & 배틀 ───── */
  if (screen === "preview") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-purple-300 text-sm mb-3">← 뒤로</button>

          <div className="text-center mb-4">
            <HeroPreview config={config} size={130} animate />
            <h2 className="text-2xl font-black mt-2">{config.name || "이름 없는 히어로"}</h2>
            {config.backstory && <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">{config.backstory}</p>}
          </div>

          {/* 스탯 */}
          <div className="bg-black/40 rounded-xl p-3 mb-3">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div><span className="text-lg">💪</span><div className="font-bold">{heroStats.strength}</div><div className="text-gray-500">힘</div></div>
              <div><span className="text-lg">🏃</span><div className="font-bold">{heroStats.speed}</div><div className="text-gray-500">속도</div></div>
              <div><span className="text-lg">🛡️</span><div className="font-bold">{heroStats.defense}</div><div className="text-gray-500">방어</div></div>
              <div><span className="text-lg">🔮</span><div className="font-bold">{heroStats.magic}</div><div className="text-gray-500">마법</div></div>
              <div><span className="text-lg">🍀</span><div className="font-bold">{heroStats.luck}</div><div className="text-gray-500">행운</div></div>
              <div><span className="text-lg">⚔️</span><div className="font-bold">{weaponBonus}</div><div className="text-gray-500">무기</div></div>
            </div>
            <div className="flex gap-1 justify-center mt-2">
              {config.powers.map(pId => { const p = POWERS.find(pw=>pw.id===pId); return p ? <span key={pId} className="text-xs bg-blue-900/60 px-2 py-0.5 rounded">{p.emoji} {p.name}</span> : null; })}
            </div>
          </div>

          <button onClick={saveHero} className="w-full bg-green-600 hover:bg-green-500 rounded-xl p-2 font-bold mb-3">💾 히어로 저장</button>

          <h3 className="text-sm font-bold text-center mb-2">⚔️ 빌런과 싸우기!</h3>
          <div className="space-y-1.5">
            {VILLAINS.map(v => (
              <button key={v.name} onClick={() => startBattle(v)}
                className="w-full flex items-center gap-2 p-2 rounded-xl bg-red-900/40 hover:bg-red-800/40">
                <span className="text-3xl">{v.emoji}</span>
                <div className="flex-1"><div className="font-bold text-sm">{v.name}</div><div className="text-[10px] text-gray-400">{v.desc}</div></div>
                <div className="text-xs text-red-400">HP:{v.hp} ATK:{v.attack}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 배틀 ───── */
  if (screen === "battle" && villain) {
    const victory = villainHp <= 0;
    const defeat = heroHp <= 0;

    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950 via-gray-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="text-center text-sm font-bold mb-2">⚔️ VS {villain.name}</div>

          {/* HP 바 */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <div className="text-xs mb-0.5">{config.name || "히어로"} ❤️{heroHp}</div>
              <div className="bg-gray-700 rounded-full h-3 overflow-hidden"><div className="h-3 bg-green-500 transition-all" style={{ width: `${heroHp}%` }} /></div>
            </div>
            <div className="flex-1">
              <div className="text-xs mb-0.5 text-right">{villain.emoji} {villain.name} ❤️{villainHp}</div>
              <div className="bg-gray-700 rounded-full h-3 overflow-hidden"><div className="h-3 bg-red-500 transition-all" style={{ width: `${(villainHp / villain.hp) * 100}%` }} /></div>
            </div>
          </div>

          {/* 캐릭터 */}
          <div className="flex justify-between items-end mb-3 px-4">
            <HeroPreview config={config} size={80} animate={isHeroTurn && battleActive} />
            <div className="text-5xl">{victory ? "💀" : defeat ? "😈" : villain.emoji}</div>
          </div>

          {/* 로그 */}
          <div className="bg-black/60 rounded-xl p-2 mb-3 max-h-28 overflow-y-auto">
            {battleLog.map((log, i) => <div key={i} className="text-xs text-gray-300">{log}</div>)}
          </div>

          {battleActive && isHeroTurn && (
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => heroAttack("normal")} className="bg-red-700 hover:bg-red-600 p-3 rounded-xl text-center">
                <div className="text-xl">⚔️</div><div className="text-[10px] font-bold">공격</div>
              </button>
              <button onClick={() => heroAttack("power")} disabled={config.powers.length === 0}
                className={`p-3 rounded-xl text-center ${config.powers.length > 0 ? "bg-blue-700 hover:bg-blue-600" : "bg-gray-700 opacity-50"}`}>
                <div className="text-xl">⚡</div><div className="text-[10px] font-bold">능력</div>
              </button>
              <button onClick={() => heroAttack("special")} className="bg-purple-700 hover:bg-purple-600 p-3 rounded-xl text-center">
                <div className="text-xl">💥</div><div className="text-[10px] font-bold">필살기</div>
              </button>
            </div>
          )}

          {!isHeroTurn && battleActive && <div className="text-center animate-pulse font-bold text-red-400">적의 턴...</div>}

          {!battleActive && (
            <div className="text-center space-y-2">
              <div className="text-2xl font-black">{victory ? "🎉 승리!!" : "😵 패배..."}</div>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setScreen("preview")} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-bold">돌아가기</button>
                <button onClick={() => startBattle(villain)} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg font-bold">재도전</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
