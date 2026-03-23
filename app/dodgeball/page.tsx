"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 스킬 ───── */
interface Skill {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  type: "attack" | "defense" | "buff" | "special";
  power: number;
  cooldown: number;     // 턴 쿨
  effect: string;       // 모션 텍스트
}

const ALL_SKILLS: Record<string, Skill> = {
  // 공격 스킬
  meteor: { id: "meteor", name: "메테오 슛", emoji: "☄️", desc: "하늘에서 불공이 떨어진다!", type: "attack", power: 4, cooldown: 3, effect: "하늘에서 불공이 떨어진다!" },
  snipe: { id: "snipe", name: "저격", emoji: "🎯", desc: "100% 명중! 회피 불가!", type: "attack", power: 2, cooldown: 2, effect: "정확하게 조준... 발사!" },
  triple: { id: "triple", name: "트리플 샷", emoji: "🔱", desc: "3명에게 동시에 던진다!", type: "attack", power: 1, cooldown: 3, effect: "세 방향으로 동시 발사!" },
  thunder: { id: "thunder", name: "썬더볼트", emoji: "⚡", desc: "번개 속도로 날아간다!", type: "attack", power: 3, cooldown: 2, effect: "번개처럼 빠른 공!!" },
  bomb: { id: "bomb", name: "폭탄공", emoji: "💣", desc: "폭발! 주변 적도 데미지!", type: "attack", power: 2, cooldown: 3, effect: "쾅!! 폭발 피해!" },
  // 방어 스킬
  shield: { id: "shield", name: "철벽 방어", emoji: "🛡️", desc: "2턴 동안 데미지 0!", type: "defense", power: 0, cooldown: 4, effect: "철벽 방어 자세!" },
  matrix: { id: "matrix", name: "매트릭스", emoji: "🕶️", desc: "다음 공격 100% 회피!", type: "defense", power: 0, cooldown: 3, effect: "슬로우 모션으로 회피!" },
  counter: { id: "counter", name: "카운터", emoji: "🪃", desc: "공을 잡아서 되돌려친다!", type: "defense", power: 3, cooldown: 3, effect: "잡았다! 되돌려쳐!" },
  // 버프 스킬
  rage: { id: "rage", name: "분노 모드", emoji: "😡", desc: "3턴 동안 공격력 2배!", type: "buff", power: 0, cooldown: 4, effect: "으아아아! 파워 UP!!" },
  heal: { id: "heal", name: "응급 치료", emoji: "💉", desc: "HP 2 회복!", type: "buff", power: 0, cooldown: 4, effect: "치료 중... HP 회복!" },
  speed: { id: "speed", name: "터보 부스트", emoji: "💨", desc: "3턴 동안 회피율 대폭 UP!", type: "buff", power: 0, cooldown: 4, effect: "초고속 모드 ON!!" },
  // 특수 스킬
  revive: { id: "revive", name: "부활", emoji: "✨", desc: "아웃된 동료 1명 부활!", type: "special", power: 0, cooldown: 5, effect: "일어나! 다시 싸우자!" },
  swap: { id: "swap", name: "자리 바꾸기", emoji: "🔄", desc: "적 한 명을 앞으로 끌어온다!", type: "special", power: 0, cooldown: 3, effect: "이리 와!!" },
};

/* ───── 캐릭터 ───── */
interface CharacterDef {
  id: string;
  name: string;
  title: string;
  hair: string;
  hairColor: string;
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
  accessory: string;
  face: string;
  hp: number;
  throwPower: number;
  speed: number;
  catchSkill: number;
  skills: string[];      // 스킬 id 3개
  desc: string;
}

const CHARACTERS: CharacterDef[] = [
  {
    id: "jin", name: "번개 진", title: "⚡ 스피드형",
    hair: "spiky", hairColor: "#fbbf24", skinColor: "#fde68a", shirtColor: "#3b82f6", pantsColor: "#1e3a5f", accessory: "headband",
    face: "determined", hp: 3, throwPower: 2, speed: 5, catchSkill: 35,
    skills: ["thunder", "speed", "matrix"],
    desc: "빠른 발! 번개처럼 피하고 던진다!",
  },
  {
    id: "sora", name: "파워 소라", title: "💪 파워형",
    hair: "ponytail", hairColor: "#ef4444", skinColor: "#fde68a", shirtColor: "#dc2626", pantsColor: "#7f1d1d", accessory: "bandana",
    face: "fierce", hp: 4, throwPower: 4, speed: 2, catchSkill: 25,
    skills: ["meteor", "rage", "bomb"],
    desc: "엄청난 파워! 맞으면 바로 아웃!",
  },
  {
    id: "haru", name: "철벽 하루", title: "🛡️ 수비형",
    hair: "short", hairColor: "#60a5fa", skinColor: "#fde68a", shirtColor: "#22c55e", pantsColor: "#14532d", accessory: "glasses",
    face: "calm", hp: 5, throwPower: 1, speed: 3, catchSkill: 50,
    skills: ["shield", "counter", "heal"],
    desc: "철벽 수비! 잡는 건 내가 최고!",
  },
  {
    id: "miko", name: "닌자 미코", title: "🥷 기술형",
    hair: "long", hairColor: "#a855f7", skinColor: "#fde68a", shirtColor: "#581c87", pantsColor: "#3b0764", accessory: "mask",
    face: "sly", hp: 3, throwPower: 3, speed: 4, catchSkill: 30,
    skills: ["snipe", "matrix", "swap"],
    desc: "정확한 조준! 100% 명중 저격수!",
  },
  {
    id: "taro", name: "폭격왕 타로", title: "💣 범위형",
    hair: "mohawk", hairColor: "#f97316", skinColor: "#d2b48c", shirtColor: "#000000", pantsColor: "#1c1917", accessory: "scar",
    face: "wild", hp: 4, throwPower: 2, speed: 2, catchSkill: 20,
    skills: ["triple", "bomb", "rage"],
    desc: "한 번에 여러 명! 범위 공격 전문!",
  },
  {
    id: "yuki", name: "힐러 유키", title: "💉 서포트형",
    hair: "twintail", hairColor: "#ec4899", skinColor: "#fde68a", shirtColor: "#fbbf24", pantsColor: "#854d0e", accessory: "ribbon",
    face: "gentle", hp: 3, throwPower: 2, speed: 3, catchSkill: 35,
    skills: ["heal", "revive", "shield"],
    desc: "팀을 살린다! 회복과 부활 전문!",
  },
];

/* ───── 캐릭터 SVG 렌더 ───── */
function CharacterAvatar({ char, size = 60, isOut = false, isHit = false, skillAnim = "" }: {
  char: CharacterDef; size?: number; isOut?: boolean; isHit?: boolean; skillAnim?: string;
}) {
  const s = size;
  const headR = s * 0.22;
  const bodyH = s * 0.3;

  // 헤어 스타일
  const renderHair = () => {
    const hx = s / 2, hy = s * 0.25;
    switch (char.hair) {
      case "spiky":
        return (<>
          <polygon points={`${hx - headR},${hy} ${hx - headR * 0.5},${hy - headR * 1.2} ${hx},${hy - headR * 0.4} ${hx + headR * 0.5},${hy - headR * 1.3} ${hx + headR},${hy}`} fill={char.hairColor} />
        </>);
      case "ponytail":
        return (<>
          <ellipse cx={hx} cy={hy - headR * 0.3} rx={headR * 1.1} ry={headR * 0.7} fill={char.hairColor} />
          <ellipse cx={hx + headR * 1.2} cy={hy + headR * 0.5} rx={headR * 0.3} ry={headR * 0.8} fill={char.hairColor} />
        </>);
      case "short":
        return <ellipse cx={hx} cy={hy - headR * 0.15} rx={headR * 1.1} ry={headR * 0.8} fill={char.hairColor} />;
      case "long":
        return (<>
          <ellipse cx={hx} cy={hy - headR * 0.2} rx={headR * 1.15} ry={headR * 0.75} fill={char.hairColor} />
          <rect x={hx - headR * 1.1} y={hy} width={headR * 0.4} height={headR * 1.5} rx={3} fill={char.hairColor} />
          <rect x={hx + headR * 0.7} y={hy} width={headR * 0.4} height={headR * 1.5} rx={3} fill={char.hairColor} />
        </>);
      case "mohawk":
        return (<>
          <rect x={hx - headR * 0.25} y={hy - headR * 1.4} width={headR * 0.5} height={headR * 1.2} rx={3} fill={char.hairColor} />
          <ellipse cx={hx} cy={hy - headR * 0.15} rx={headR * 1.05} ry={headR * 0.6} fill={char.hairColor} />
        </>);
      case "twintail":
        return (<>
          <ellipse cx={hx} cy={hy - headR * 0.2} rx={headR * 1.1} ry={headR * 0.7} fill={char.hairColor} />
          <ellipse cx={hx - headR * 1.1} cy={hy + headR * 0.8} rx={headR * 0.3} ry={headR * 0.7} fill={char.hairColor} />
          <ellipse cx={hx + headR * 1.1} cy={hy + headR * 0.8} rx={headR * 0.3} ry={headR * 0.7} fill={char.hairColor} />
        </>);
      default:
        return <ellipse cx={hx} cy={hy - headR * 0.15} rx={headR * 1.1} ry={headR * 0.8} fill={char.hairColor} />;
    }
  };

  // 얼굴 표정
  const renderFace = () => {
    const hx = s / 2, hy = s * 0.25;
    const eyeY = hy + headR * 0.05;
    const eyeGap = headR * 0.35;
    const eyeR = headR * 0.12;

    if (isOut) {
      return (<>
        <line x1={hx - eyeGap - eyeR} y1={eyeY - eyeR} x2={hx - eyeGap + eyeR} y2={eyeY + eyeR} stroke="#333" strokeWidth={1.5} />
        <line x1={hx - eyeGap + eyeR} y1={eyeY - eyeR} x2={hx - eyeGap - eyeR} y2={eyeY + eyeR} stroke="#333" strokeWidth={1.5} />
        <line x1={hx + eyeGap - eyeR} y1={eyeY - eyeR} x2={hx + eyeGap + eyeR} y2={eyeY + eyeR} stroke="#333" strokeWidth={1.5} />
        <line x1={hx + eyeGap + eyeR} y1={eyeY - eyeR} x2={hx + eyeGap - eyeR} y2={eyeY + eyeR} stroke="#333" strokeWidth={1.5} />
        <path d={`M${hx - headR * 0.3},${eyeY + headR * 0.45} Q${hx},${eyeY + headR * 0.25} ${hx + headR * 0.3},${eyeY + headR * 0.45}`} fill="none" stroke="#333" strokeWidth={1.2} />
      </>);
    }

    switch (char.face) {
      case "determined":
        return (<>
          <circle cx={hx - eyeGap} cy={eyeY} r={eyeR} fill="#333" />
          <circle cx={hx + eyeGap} cy={eyeY} r={eyeR} fill="#333" />
          <line x1={hx - eyeGap - eyeR} y1={eyeY - eyeR * 1.5} x2={hx - eyeGap + eyeR} y2={eyeY - eyeR * 1.2} stroke="#333" strokeWidth={1} />
          <line x1={hx + eyeGap + eyeR} y1={eyeY - eyeR * 1.5} x2={hx + eyeGap - eyeR} y2={eyeY - eyeR * 1.2} stroke="#333" strokeWidth={1} />
          <path d={`M${hx - headR * 0.2},${eyeY + headR * 0.35} Q${hx},${eyeY + headR * 0.5} ${hx + headR * 0.2},${eyeY + headR * 0.35}`} fill="none" stroke="#333" strokeWidth={1} />
        </>);
      case "fierce":
        return (<>
          <circle cx={hx - eyeGap} cy={eyeY} r={eyeR * 1.2} fill="#333" />
          <circle cx={hx + eyeGap} cy={eyeY} r={eyeR * 1.2} fill="#333" />
          <line x1={hx - eyeGap - eyeR * 1.5} y1={eyeY - eyeR * 2} x2={hx - eyeGap + eyeR} y2={eyeY - eyeR} stroke="#333" strokeWidth={1.5} />
          <line x1={hx + eyeGap + eyeR * 1.5} y1={eyeY - eyeR * 2} x2={hx + eyeGap - eyeR} y2={eyeY - eyeR} stroke="#333" strokeWidth={1.5} />
          <path d={`M${hx - headR * 0.25},${eyeY + headR * 0.3} L${hx},${eyeY + headR * 0.42} L${hx + headR * 0.25},${eyeY + headR * 0.3}`} fill="none" stroke="#333" strokeWidth={1.2} />
        </>);
      case "calm":
        return (<>
          <circle cx={hx - eyeGap} cy={eyeY} r={eyeR} fill="#333" />
          <circle cx={hx + eyeGap} cy={eyeY} r={eyeR} fill="#333" />
          <circle cx={hx - eyeGap} cy={eyeY} r={eyeR * 0.4} fill="white" />
          <circle cx={hx + eyeGap} cy={eyeY} r={eyeR * 0.4} fill="white" />
          <path d={`M${hx - headR * 0.15},${eyeY + headR * 0.35} Q${hx},${eyeY + headR * 0.45} ${hx + headR * 0.15},${eyeY + headR * 0.35}`} fill="none" stroke="#333" strokeWidth={1} />
        </>);
      case "sly":
        return (<>
          <line x1={hx - eyeGap - eyeR} y1={eyeY} x2={hx - eyeGap + eyeR * 1.5} y2={eyeY - eyeR * 0.5} stroke="#333" strokeWidth={1.8} strokeLinecap="round" />
          <line x1={hx + eyeGap - eyeR * 1.5} y1={eyeY - eyeR * 0.5} x2={hx + eyeGap + eyeR} y2={eyeY} stroke="#333" strokeWidth={1.8} strokeLinecap="round" />
          <path d={`M${hx - headR * 0.2},${eyeY + headR * 0.3} Q${hx},${eyeY + headR * 0.45} ${hx + headR * 0.2},${eyeY + headR * 0.3}`} fill="none" stroke="#333" strokeWidth={1} />
        </>);
      case "wild":
        return (<>
          <circle cx={hx - eyeGap} cy={eyeY} r={eyeR * 1.3} fill="#fff" stroke="#333" strokeWidth={1} />
          <circle cx={hx + eyeGap} cy={eyeY} r={eyeR * 1.3} fill="#fff" stroke="#333" strokeWidth={1} />
          <circle cx={hx - eyeGap + 1} cy={eyeY} r={eyeR * 0.7} fill="#333" />
          <circle cx={hx + eyeGap + 1} cy={eyeY} r={eyeR * 0.7} fill="#333" />
          <path d={`M${hx - headR * 0.3},${eyeY + headR * 0.3} Q${hx},${eyeY + headR * 0.55} ${hx + headR * 0.3},${eyeY + headR * 0.3}`} fill="#333" stroke="none" />
        </>);
      case "gentle":
        return (<>
          <path d={`M${hx - eyeGap - eyeR},${eyeY} Q${hx - eyeGap},${eyeY - eyeR * 1.5} ${hx - eyeGap + eyeR},${eyeY}`} fill="none" stroke="#333" strokeWidth={1.5} />
          <path d={`M${hx + eyeGap - eyeR},${eyeY} Q${hx + eyeGap},${eyeY - eyeR * 1.5} ${hx + eyeGap + eyeR},${eyeY}`} fill="none" stroke="#333" strokeWidth={1.5} />
          <path d={`M${hx - headR * 0.15},${eyeY + headR * 0.3} Q${hx},${eyeY + headR * 0.45} ${hx + headR * 0.15},${eyeY + headR * 0.3}`} fill="none" stroke="#e11d48" strokeWidth={1} />
          <circle cx={hx - headR * 0.5} cy={eyeY + headR * 0.25} r={headR * 0.12} fill="#fca5a5" opacity={0.5} />
          <circle cx={hx + headR * 0.5} cy={eyeY + headR * 0.25} r={headR * 0.12} fill="#fca5a5" opacity={0.5} />
        </>);
      default:
        return (<>
          <circle cx={hx - eyeGap} cy={eyeY} r={eyeR} fill="#333" />
          <circle cx={hx + eyeGap} cy={eyeY} r={eyeR} fill="#333" />
        </>);
    }
  };

  // 악세사리
  const renderAccessory = () => {
    const hx = s / 2, hy = s * 0.25;
    switch (char.accessory) {
      case "headband":
        return <rect x={hx - headR * 1.05} y={hy - headR * 0.15} width={headR * 2.1} height={headR * 0.25} rx={2} fill="#ef4444" />;
      case "bandana":
        return (<>
          <rect x={hx - headR * 1.1} y={hy - headR * 0.3} width={headR * 2.2} height={headR * 0.3} rx={2} fill="#1e1b4b" />
          <polygon points={`${hx + headR * 1.1},${hy - headR * 0.3} ${hx + headR * 1.6},${hy - headR * 0.1} ${hx + headR * 1.1},${hy}`} fill="#1e1b4b" />
        </>);
      case "glasses":
        return (<>
          <circle cx={hx - headR * 0.35} cy={hy + headR * 0.05} r={headR * 0.28} fill="none" stroke="#333" strokeWidth={1.2} />
          <circle cx={hx + headR * 0.35} cy={hy + headR * 0.05} r={headR * 0.28} fill="none" stroke="#333" strokeWidth={1.2} />
          <line x1={hx - headR * 0.07} y1={hy + headR * 0.05} x2={hx + headR * 0.07} y2={hy + headR * 0.05} stroke="#333" strokeWidth={1} />
        </>);
      case "mask":
        return <rect x={hx - headR * 0.8} y={hy + headR * 0.2} width={headR * 1.6} height={headR * 0.4} rx={3} fill="#1e1b4b" opacity={0.8} />;
      case "scar":
        return <line x1={hx - headR * 0.5} y1={hy - headR * 0.2} x2={hx - headR * 0.1} y2={hy + headR * 0.4} stroke="#dc2626" strokeWidth={1.5} />;
      case "ribbon":
        return (<>
          <polygon points={`${hx - headR * 0.6},${hy - headR * 0.6} ${hx - headR * 0.3},${hy - headR * 0.35} ${hx - headR * 0.6},${hy - headR * 0.1}`} fill="#ec4899" />
          <polygon points={`${hx},${hy - headR * 0.6} ${hx - headR * 0.3},${hy - headR * 0.35} ${hx},${hy - headR * 0.1}`} fill="#ec4899" />
          <circle cx={hx - headR * 0.3} cy={hy - headR * 0.35} r={headR * 0.1} fill="#be185d" />
        </>);
      default: return null;
    }
  };

  const hx = s / 2, hy = s * 0.25;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={`${isHit ? "animate-bounce" : ""} ${skillAnim}`}
      style={{ filter: isOut ? "grayscale(1) opacity(0.5)" : "" }}>
      {/* 머리카락 (뒤) */}
      {renderHair()}
      {/* 머리 */}
      <circle cx={hx} cy={hy} r={headR} fill={char.skinColor} />
      {/* 얼굴 */}
      {renderFace()}
      {/* 악세사리 */}
      {renderAccessory()}
      {/* 몸통 */}
      <rect x={hx - s * 0.13} y={hy + headR + 1} width={s * 0.26} height={bodyH} rx={4} fill={char.shirtColor} />
      {/* 팔 */}
      <rect x={hx - s * 0.2} y={hy + headR + 2} width={s * 0.06} height={bodyH * 0.7} rx={3} fill={char.skinColor} />
      <rect x={hx + s * 0.14} y={hy + headR + 2} width={s * 0.06} height={bodyH * 0.7} rx={3} fill={char.skinColor} />
      {/* 바지 */}
      <rect x={hx - s * 0.12} y={hy + headR + bodyH} width={s * 0.1} height={bodyH * 0.55} rx={3} fill={char.pantsColor} />
      <rect x={hx + s * 0.02} y={hy + headR + bodyH} width={s * 0.1} height={bodyH * 0.55} rx={3} fill={char.pantsColor} />
      {/* 신발 */}
      <ellipse cx={hx - s * 0.07} cy={hy + headR + bodyH + bodyH * 0.55} rx={s * 0.06} ry={s * 0.025} fill="#333" />
      <ellipse cx={hx + s * 0.07} cy={hy + headR + bodyH + bodyH * 0.55} rx={s * 0.06} ry={s * 0.025} fill="#333" />
    </svg>
  );
}

/* ───── 적 캐릭터 외형 ───── */
const ENEMY_DEFS: { name: string; char: CharacterDef }[] = [
  { name: "뚱보 철수", char: { id: "e1", name: "뚱보 철수", title: "", hair: "short", hairColor: "#1e1b4b", skinColor: "#fde68a", shirtColor: "#ef4444", pantsColor: "#991b1b", accessory: "", face: "fierce", hp: 2, throwPower: 2, speed: 1, catchSkill: 15, skills: [], desc: "" } },
  { name: "안경 영희", char: { id: "e2", name: "안경 영희", title: "", hair: "ponytail", hairColor: "#333", skinColor: "#fde68a", shirtColor: "#f472b6", pantsColor: "#831843", accessory: "glasses", face: "calm", hp: 2, throwPower: 1, speed: 2, catchSkill: 30, skills: [], desc: "" } },
  { name: "머리띠 민수", char: { id: "e3", name: "머리띠 민수", title: "", hair: "spiky", hairColor: "#f97316", skinColor: "#d2b48c", shirtColor: "#3b82f6", pantsColor: "#1e3a5f", accessory: "headband", face: "determined", hp: 3, throwPower: 2, speed: 2, catchSkill: 20, skills: [], desc: "" } },
  { name: "리본 지은", char: { id: "e4", name: "리본 지은", title: "", hair: "twintail", hairColor: "#a855f7", skinColor: "#fde68a", shirtColor: "#fbbf24", pantsColor: "#854d0e", accessory: "ribbon", face: "gentle", hp: 2, throwPower: 1, speed: 3, catchSkill: 25, skills: [], desc: "" } },
  { name: "모히칸 동현", char: { id: "e5", name: "모히칸 동현", title: "", hair: "mohawk", hairColor: "#22c55e", skinColor: "#d2b48c", shirtColor: "#000", pantsColor: "#333", accessory: "scar", face: "wild", hp: 3, throwPower: 3, speed: 1, catchSkill: 10, skills: [], desc: "" } },
  { name: "마스크 서연", char: { id: "e6", name: "마스크 서연", title: "", hair: "long", hairColor: "#ec4899", skinColor: "#fde68a", shirtColor: "#6b21a8", pantsColor: "#3b0764", accessory: "mask", face: "sly", hp: 2, throwPower: 2, speed: 3, catchSkill: 25, skills: [], desc: "" } },
  { name: "반다나 준호", char: { id: "e7", name: "반다나 준호", title: "", hair: "short", hairColor: "#60a5fa", skinColor: "#fde68a", shirtColor: "#16a34a", pantsColor: "#14532d", accessory: "bandana", face: "determined", hp: 3, throwPower: 2, speed: 2, catchSkill: 20, skills: [], desc: "" } },
];

/* ───── 스테이지 ───── */
/* ───── 스테이지 테마 ───── */
interface StageTheme {
  courtBg: string;
  courtBorder: string;
  groundColor: string;
  lineColor: string;
  pageBg: string;
  decoEmojis: string[];    // 배경 장식
  ambientColor: string;
}

const STAGE_THEMES: Record<string, StageTheme> = {
  s1: { courtBg: "linear-gradient(180deg, #d4edda 0%, #a8d5a2 100%)", courtBorder: "#6b8e6b", groundColor: "#5a7d5a", lineColor: "rgba(255,255,255,0.6)", pageBg: "from-sky-100 to-green-100", decoEmojis: ["📚", "✏️", "🎒"], ambientColor: "#a8d5a2" },
  s2: { courtBg: "linear-gradient(180deg, #4ade80 0%, #22c55e 100%)", courtBorder: "#166534", groundColor: "#15803d", lineColor: "rgba(255,255,255,0.7)", pageBg: "from-sky-200 to-green-200", decoEmojis: ["🌳", "☀️", "🏃"], ambientColor: "#4ade80" },
  s3: { courtBg: "linear-gradient(180deg, #c4a97d 0%, #a67c52 100%)", courtBorder: "#78350f", groundColor: "#92400e", lineColor: "rgba(255,255,255,0.5)", pageBg: "from-amber-100 to-orange-100", decoEmojis: ["🏀", "🏐", "🎽"], ambientColor: "#c4a97d" },
  s4: { courtBg: "linear-gradient(180deg, #fde68a 0%, #fbbf24 100%)", courtBorder: "#92400e", groundColor: "#d2b48c", lineColor: "rgba(255,255,255,0.5)", pageBg: "from-cyan-100 to-yellow-100", decoEmojis: ["🌊", "🐚", "🦀", "🌴"], ambientColor: "#fde68a" },
  s5: { courtBg: "linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)", courtBorder: "#4338ca", groundColor: "#312e81", lineColor: "rgba(147,130,255,0.4)", pageBg: "from-indigo-900 to-slate-950", decoEmojis: ["⭐", "🌙", "🪐", "🛸"], ambientColor: "#6366f1" },
  s6: { courtBg: "linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)", courtBorder: "#dc2626", groundColor: "#991b1b", lineColor: "rgba(251,146,60,0.5)", pageBg: "from-red-800 to-orange-950", decoEmojis: ["🌋", "🔥", "💀", "🪨"], ambientColor: "#ef4444" },
  s7: { courtBg: "linear-gradient(180deg, #3b0764 0%, #1e1b4b 100%)", courtBorder: "#7c3aed", groundColor: "#581c87", lineColor: "rgba(192,132,252,0.4)", pageBg: "from-purple-900 to-indigo-950", decoEmojis: ["🥷", "⚔️", "🎋", "🏯"], ambientColor: "#a855f7" },
  s8: { courtBg: "linear-gradient(180deg, #1c1917 0%, #0c0a09 100%)", courtBorder: "#f97316", groundColor: "#292524", lineColor: "rgba(251,146,60,0.3)", pageBg: "from-stone-900 to-black", decoEmojis: ["🐉", "🔥", "💎", "🏰"], ambientColor: "#f97316" },
  s9: { courtBg: "linear-gradient(180deg, #fbbf24 10%, #f59e0b 50%, #d97706 100%)", courtBorder: "#fbbf24", groundColor: "#92400e", lineColor: "rgba(255,255,255,0.7)", pageBg: "from-yellow-500 via-amber-600 to-orange-800", decoEmojis: ["👑", "🏆", "⭐", "🎉"], ambientColor: "#fbbf24" },
};

/* ───── 파티클 ───── */
interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  size: number;
  duration: number;
  delay: number;
  animation: string;
  color?: string;
}

/* ───── 날아가는 공 ───── */
interface FlyingBall {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  emoji: string;
  color: string;
  duration: number;
  trail: string;   // 잔상 종류
}

interface Stage { id: string; name: string; emoji: string; desc: string; enemyCount: number; enemyHpMult: number; enemyPowerMult: number; reward: number; xpReward: number; difficulty: number; }
const STAGES: Stage[] = [
  { id: "s1", name: "교실", emoji: "🏫", desc: "친구들과 피구!", enemyCount: 3, enemyHpMult: 1, enemyPowerMult: 1, reward: 20, xpReward: 15, difficulty: 1 },
  { id: "s2", name: "운동장", emoji: "🏟️", desc: "반 대항전!", enemyCount: 4, enemyHpMult: 1, enemyPowerMult: 1, reward: 30, xpReward: 20, difficulty: 1 },
  { id: "s3", name: "체육관", emoji: "🏀", desc: "체육관 피구!", enemyCount: 4, enemyHpMult: 1.5, enemyPowerMult: 1.3, reward: 45, xpReward: 25, difficulty: 2 },
  { id: "s4", name: "해변", emoji: "🏖️", desc: "비치 피구!", enemyCount: 5, enemyHpMult: 1.5, enemyPowerMult: 1.5, reward: 55, xpReward: 30, difficulty: 2 },
  { id: "s5", name: "우주", emoji: "🚀", desc: "무중력 피구!", enemyCount: 5, enemyHpMult: 2, enemyPowerMult: 1.8, reward: 70, xpReward: 40, difficulty: 3 },
  { id: "s6", name: "화산", emoji: "🌋", desc: "용암 피구!", enemyCount: 5, enemyHpMult: 2, enemyPowerMult: 2, reward: 85, xpReward: 50, difficulty: 3 },
  { id: "s7", name: "닌자 도장", emoji: "🥷", desc: "닌자 피구!", enemyCount: 6, enemyHpMult: 2, enemyPowerMult: 2, reward: 100, xpReward: 60, difficulty: 4 },
  { id: "s8", name: "드래곤 성", emoji: "🐉", desc: "드래곤 피구!", enemyCount: 6, enemyHpMult: 2.5, enemyPowerMult: 2.5, reward: 130, xpReward: 75, difficulty: 5 },
  { id: "s9", name: "피구왕 결승", emoji: "👑", desc: "최강의 피구왕!", enemyCount: 7, enemyHpMult: 3, enemyPowerMult: 3, reward: 200, xpReward: 100, difficulty: 5 },
];

interface PlayerState {
  id: number; charDef: CharacterDef; hp: number; maxHp: number; isOut: boolean; team: "player" | "enemy";
  buffTurns: number; buffType: "" | "rage" | "speed" | "shield";
  x: number; y: number;
}

type Screen = "main" | "charselect" | "stage_select" | "play" | "result";

export default function DodgeballPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(30);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(40);
  const [highScore, setHighScore] = useState(0);
  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const [selectedChar, setSelectedChar] = useState<CharacterDef | null>(null);

  // 플레이
  const [gameActive, setGameActive] = useState(false);
  const [currentStage, setCurrentStage] = useState<Stage | null>(null);
  const [myTeam, setMyTeam] = useState<PlayerState[]>([]);
  const [enemyTeam, setEnemyTeam] = useState<PlayerState[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const [hitCount, setHitCount] = useState(0);
  const [catchCount, setCatchCount] = useState(0);
  const [skillCooldowns, setSkillCooldowns] = useState<Record<string, number>>({});
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isEnemyTurn, setIsEnemyTurn] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [gameMessage, setGameMessage] = useState("");
  const [animatingSkill, setAnimatingSkill] = useState("");
  const [floatTexts, setFloatTexts] = useState<{ id: number; text: string; x: number; y: number; color: string }[]>([]);
  const floatId = useRef(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleId = useRef(0);
  const [flyingBalls, setFlyingBalls] = useState<FlyingBall[]>([]);
  const ballAnimId = useRef(0);
  const courtRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (xp >= xpNeeded) { setXp(x => x - xpNeeded); setPlayerLevel(l => l + 1); setXpNeeded(n => Math.floor(n * 1.3)); }
  }, [xp, xpNeeded]);

  useEffect(() => {
    if (!gameActive) return;
    const ea = enemyTeam.filter(e => !e.isOut);
    const ma = myTeam.filter(m => !m.isOut);
    if (ea.length === 0 && enemyTeam.length > 0) setTimeout(() => endGame(true), 500);
    else if (ma.length === 0 && myTeam.length > 0) setTimeout(() => endGame(false), 500);
  }, [enemyTeam, myTeam, gameActive]);

  const startStage = useCallback((stage: Stage) => {
    if (!selectedChar) return;
    setCurrentStage(stage);
    setScore(0); setCombo(0); setMaxCombo(0); setHitCount(0); setCatchCount(0);
    setTurnCount(0); setBattleLog([]); setFloatTexts([]); setSelectedTarget(null);
    setShaking(false); setIsEnemyTurn(false); setGameMessage(""); setAnimatingSkill("");
    setSkillCooldowns({});

    const me: PlayerState = {
      id: 0, charDef: selectedChar, hp: selectedChar.hp, maxHp: selectedChar.hp,
      isOut: false, team: "player", buffTurns: 0, buffType: "", x: 18, y: 50,
    };
    setMyTeam([me]);

    const enemies: PlayerState[] = Array.from({ length: stage.enemyCount }, (_, i) => {
      const eDef = ENEMY_DEFS[i % ENEMY_DEFS.length];
      const baseHp = Math.ceil(eDef.char.hp * stage.enemyHpMult);
      return {
        id: 100 + i, charDef: { ...eDef.char, name: eDef.name, throwPower: Math.ceil(eDef.char.throwPower * stage.enemyPowerMult) },
        hp: baseHp, maxHp: baseHp, isOut: false, team: "enemy" as const,
        buffTurns: 0, buffType: "" as const, x: 62 + Math.random() * 22, y: 8 + (i * 84) / stage.enemyCount,
      };
    });
    setEnemyTeam(enemies);
    setGameActive(true);
    setScreen("play");
  }, [selectedChar]);

  const endGame = useCallback((victory: boolean) => {
    setGameActive(false);
    if (victory && currentStage && !completedStages.includes(currentStage.id))
      setCompletedStages(prev => [...prev, currentStage.id]);
    const earned = Math.floor(score / 3) + hitCount * 5 + catchCount * 8 + (victory && currentStage ? currentStage.reward : 0);
    setCoins(c => c + earned);
    setXp(x => x + (victory && currentStage ? currentStage.xpReward : Math.floor(score / 5)));
    if (score > highScore) setHighScore(score);
    setScreen("result");
  }, [score, hitCount, catchCount, currentStage, completedStages, highScore]);

  // 일반 던지기
  const throwBall = useCallback((targetId: number) => {
    if (!gameActive || isEnemyTurn || !selectedChar) return;
    const me = myTeam.find(p => p.id === 0);
    if (!me || me.isOut) return;
    const target = enemyTeam.find(e => e.id === targetId);
    if (!target || target.isOut) return;

    const power = selectedChar.throwPower * (me.buffType === "rage" ? 2 : 1);
    const accuracy = 50 + power * 5 + playerLevel * 2 - target.charDef.speed * 3;
    const hit = Math.random() * 100 < accuracy;
    const caught = hit && Math.random() * 100 < target.charDef.catchSkill;

    const log: string[] = [];
    setTurnCount(t => t + 1);
    tickBuffs();

    // 공 날아가기 애니메이션
    const fromPos = courtToScreen(me.x, me.y);
    const toPos = courtToScreen(target.x, target.y);
    spawnBallAnim(fromPos.x, fromPos.y, toPos.x, toPos.y, "🔴", "#ef4444", "normal", 400);

    setTimeout(() => {
      if (caught) {
        log.push(`✋ ${target.charDef.name}이(가) 공을 잡았다!`);
        spawnParticles(toPos.x, toPos.y, "catch");
        setCombo(0); setCatchCount(c => c + 1);
      } else if (hit) {
        const dmg = Math.max(1, power);
        spawnParticles(toPos.x, toPos.y, "hit");
        applyDamageToEnemy(targetId, dmg, log);
      } else {
        log.push(`💨 ${target.charDef.name}이(가) 피했다!`);
        setCombo(0);
      }
      setBattleLog(prev => [...prev, ...log].slice(-8));
    }, 400);

    setIsEnemyTurn(true);
    setTimeout(() => enemyTurn(), 1400);
  }, [gameActive, isEnemyTurn, selectedChar, myTeam, enemyTeam, combo, playerLevel]);

  const applyDamageToEnemy = (targetId: number, dmg: number, log: string[]) => {
    setEnemyTeam(prev => {
      const updated = prev.map(e => {
        if (e.id !== targetId) return e;
        const newHp = e.hp - dmg;
        if (newHp <= 0) {
          log.push(`🎉 ${e.charDef.name} 아웃!! (-${dmg})`);
          setHitCount(h => h + 1);
          const sc = Math.floor(20 * (1 + combo * 0.2));
          setScore(s => s + sc);
          setCombo(c => { const n = c + 1; setMaxCombo(m => Math.max(m, n)); return n; });
          addFloat(`+${sc} 아웃!`, "#fbbf24");
          return { ...e, hp: 0, isOut: true };
        }
        log.push(`💥 ${e.charDef.name}에게 명중! (-${dmg} HP)`);
        setScore(s => s + 10);
        setCombo(c => { const n = c + 1; setMaxCombo(m => Math.max(m, n)); return n; });
        addFloat(`+10 💥`, "#4ade80");
        return { ...e, hp: newHp };
      });
      return updated;
    });
  };

  // 스킬 사용
  const useSkill = useCallback((skillId: string) => {
    if (!gameActive || isEnemyTurn || !selectedChar) return;
    if ((skillCooldowns[skillId] || 0) > 0) return;
    const skill = ALL_SKILLS[skillId];
    if (!skill) return;
    const me = myTeam.find(p => p.id === 0);
    if (!me || me.isOut) return;

    setAnimatingSkill(skillId);
    setGameMessage(`${skill.emoji} ${skill.effect}`);
    setTimeout(() => { setAnimatingSkill(""); setGameMessage(""); }, 1800);

    setSkillCooldowns(prev => ({ ...prev, [skillId]: skill.cooldown }));
    setTurnCount(t => t + 1);
    tickBuffs();

    const log: string[] = [];
    log.push(`${skill.emoji} ${skill.name} 발동!!`);

    const aliveEnemies = enemyTeam.filter(e => !e.isOut);
    const mePos = courtToScreen(me.x, me.y);

    // 스킬별 공 + 파티클
    const skillBallEmoji: Record<string, string> = { meteor: "☄️", snipe: "🎯", triple: "🔱", thunder: "⚡", bomb: "💣", counter: "🪃" };
    const skillBallColor: Record<string, string> = { meteor: "#f97316", snipe: "#dc2626", triple: "#8b5cf6", thunder: "#fbbf24", bomb: "#1e1b4b", counter: "#22c55e" };
    const skillTrail: Record<string, string> = { meteor: "fire", snipe: "laser", triple: "triple", thunder: "lightning", bomb: "smoke", counter: "spin" };

    switch (skill.type) {
      case "attack": {
        if (skill.id === "snipe") {
          const target = selectedTarget !== null ? enemyTeam.find(e => e.id === selectedTarget && !e.isOut) : aliveEnemies[0];
          if (target) {
            const tPos = courtToScreen(target.x, target.y);
            spawnBallAnim(mePos.x, mePos.y, tPos.x, tPos.y, "🎯", "#dc2626", "laser", 300);
            setTimeout(() => {
              const dmg = skill.power * (me.buffType === "rage" ? 2 : 1);
              spawnParticles(tPos.x, tPos.y, "snipe");
              applyDamageToEnemy(target.id, dmg, log);
              setBattleLog(prev => [...prev, ...log].slice(-8));
            }, 300);
          }
        } else if (skill.id === "triple") {
          spawnParticles(mePos.x, mePos.y, "triple");
          aliveEnemies.slice(0, 3).forEach((e, i) => {
            const tPos = courtToScreen(e.x, e.y);
            spawnBallAnim(mePos.x, mePos.y, tPos.x, tPos.y, "🔱", "#8b5cf6", "triple", 350 + i * 100);
          });
          setTimeout(() => {
            aliveEnemies.slice(0, 3).forEach(e => {
              const hit = Math.random() * 100 < 65;
              const tPos = courtToScreen(e.x, e.y);
              if (hit) { spawnParticles(tPos.x, tPos.y, "hit"); applyDamageToEnemy(e.id, skill.power, log); }
              else log.push(`💨 ${e.charDef.name} 회피!`);
            });
            setBattleLog(prev => [...prev, ...log].slice(-8));
          }, 600);
        } else if (skill.id === "bomb") {
          const target = selectedTarget !== null ? enemyTeam.find(e => e.id === selectedTarget && !e.isOut) : aliveEnemies[0];
          if (target) {
            const tPos = courtToScreen(target.x, target.y);
            spawnBallAnim(mePos.x, mePos.y, tPos.x, tPos.y, "💣", "#1e1b4b", "smoke", 450);
            setTimeout(() => {
              spawnParticles(tPos.x, tPos.y, "bomb");
              applyDamageToEnemy(target.id, skill.power + 1, log);
              log.push(`💣 폭발!! 주변 피해!`);
              aliveEnemies.filter(e2 => e2.id !== target.id).slice(0, 2).forEach(e2 => {
                if (Math.random() < 0.6) { const p2 = courtToScreen(e2.x, e2.y); spawnParticles(p2.x, p2.y, "hit"); applyDamageToEnemy(e2.id, 1, log); }
              });
              setBattleLog(prev => [...prev, ...log].slice(-8));
            }, 500);
          }
        } else {
          // meteor, thunder
          const target = selectedTarget !== null ? enemyTeam.find(e => e.id === selectedTarget && !e.isOut) : aliveEnemies[0];
          if (target) {
            const tPos = courtToScreen(target.x, target.y);
            const bEmoji = skillBallEmoji[skill.id] || "🔴";
            const bColor = skillBallColor[skill.id] || "#ef4444";
            const bTrail = skillTrail[skill.id] || "normal";
            const dur = skill.id === "thunder" ? 250 : 500;
            spawnBallAnim(skill.id === "meteor" ? tPos.x : mePos.x, skill.id === "meteor" ? tPos.y - 200 : mePos.y, tPos.x, tPos.y, bEmoji, bColor, bTrail, dur);
            setTimeout(() => {
              spawnParticles(tPos.x, tPos.y, skill.id);
              const dmg = skill.power * (me.buffType === "rage" ? 2 : 1);
              const hit = Math.random() * 100 < 80;
              if (hit) applyDamageToEnemy(target.id, dmg, log);
              else log.push(`💨 ${target.charDef.name} 회피!`);
              setBattleLog(prev => [...prev, ...log].slice(-8));
            }, dur);
          }
        }
        setShaking(true); setTimeout(() => setShaking(false), 400);
        break;
      }
      case "defense": {
        if (skill.id === "shield") {
          setMyTeam(prev => prev.map(p => p.id === 0 ? { ...p, buffType: "shield" as const, buffTurns: 2 } : p));
          spawnParticles(mePos.x, mePos.y, "shield");
          log.push(`🛡️ 철벽 방어! 2턴 무적!`);
        } else if (skill.id === "matrix") {
          setMyTeam(prev => prev.map(p => p.id === 0 ? { ...p, buffType: "speed" as const, buffTurns: 1 } : p));
          spawnParticles(mePos.x, mePos.y, "speed");
          log.push(`🕶️ 매트릭스! 다음 공격 회피!`);
        } else if (skill.id === "counter") {
          setMyTeam(prev => prev.map(p => p.id === 0 ? { ...p, buffType: "shield" as const, buffTurns: 1 } : p));
          if (aliveEnemies.length > 0) {
            const randomEnemy = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
            const tPos = courtToScreen(randomEnemy.x, randomEnemy.y);
            spawnBallAnim(mePos.x, mePos.y, tPos.x, tPos.y, "🪃", "#22c55e", "spin", 400);
            setTimeout(() => { spawnParticles(tPos.x, tPos.y, "hit"); applyDamageToEnemy(randomEnemy.id, 3, log); log.push(`🪃 카운터! ${randomEnemy.charDef.name}에게 반격!`); setBattleLog(prev => [...prev, ...log].slice(-8)); }, 400);
          }
        }
        if (skill.id !== "counter") setBattleLog(prev => [...prev, ...log].slice(-8));
        break;
      }
      case "buff": {
        if (skill.id === "rage") {
          setMyTeam(prev => prev.map(p => p.id === 0 ? { ...p, buffType: "rage" as const, buffTurns: 3 } : p));
          spawnParticles(mePos.x, mePos.y, "rage");
          log.push(`😡 분노 모드! 3턴 공격력 2배!`);
        } else if (skill.id === "heal") {
          setMyTeam(prev => prev.map(p => p.id === 0 ? { ...p, hp: Math.min(p.maxHp, p.hp + 2) } : p));
          spawnParticles(mePos.x, mePos.y, "heal");
          log.push(`💉 HP 2 회복!`);
          addFloat("+2 HP", "#4ade80");
        } else if (skill.id === "speed") {
          setMyTeam(prev => prev.map(p => p.id === 0 ? { ...p, buffType: "speed" as const, buffTurns: 3 } : p));
          spawnParticles(mePos.x, mePos.y, "speed");
          log.push(`💨 터보 부스트! 3턴 회피 UP!`);
        }
        setBattleLog(prev => [...prev, ...log].slice(-8));
        break;
      }
      case "special": {
        if (skill.id === "revive") {
          const dead = myTeam.find(p => p.isOut);
          if (dead) { setMyTeam(prev => prev.map(p => p.id === dead.id ? { ...p, isOut: false, hp: 1 } : p)); spawnParticles(mePos.x, mePos.y, "heal"); log.push(`✨ ${dead.charDef.name} 부활!`); }
          else log.push(`부활시킬 동료가 없다!`);
        } else if (skill.id === "swap") {
          if (aliveEnemies.length > 0) { const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)]; applyDamageToEnemy(target.id, 1, log); log.push(`🔄 ${target.charDef.name}을 끌어왔다!`); }
        }
        setBattleLog(prev => [...prev, ...log].slice(-8));
        break;
      }
    }

    setIsEnemyTurn(true);
    setTimeout(() => enemyTurn(), 1800);
  }, [gameActive, isEnemyTurn, selectedChar, myTeam, enemyTeam, selectedTarget, skillCooldowns, combo]);

  const tickBuffs = () => {
    setMyTeam(prev => prev.map(p => ({
      ...p,
      buffTurns: Math.max(0, p.buffTurns - 1),
      buffType: p.buffTurns <= 1 ? "" as const : p.buffType,
    })));
    setSkillCooldowns(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) next[k] = Math.max(0, next[k] - 1);
      return next;
    });
  };

  const enemyTurn = useCallback(() => {
    const aliveEnemies = enemyTeam.filter(e => !e.isOut);
    const aliveAllies = myTeam.filter(m => !m.isOut);
    if (aliveEnemies.length === 0 || aliveAllies.length === 0) { setIsEnemyTurn(false); return; }

    const attacker = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    const target = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
    const log: string[] = [];
    log.push(`${attacker.charDef.name}이(가) ${target.charDef.name}에게 던졌다!`);

    // 방어 버프 체크
    if (target.buffType === "shield") {
      log.push(`🛡️ 방어 성공! 데미지 0!`);
      setBattleLog(prev => [...prev, ...log].slice(-8));
      setIsEnemyTurn(false);
      return;
    }
    if (target.buffType === "speed") {
      log.push(`💨 초고속 회피 성공!`);
      setBattleLog(prev => [...prev, ...log].slice(-8));
      setIsEnemyTurn(false);
      return;
    }

    const accuracy = 40 + attacker.charDef.throwPower * 5 - target.charDef.speed * 3;
    const hit = Math.random() * 100 < accuracy;
    const caught = hit && Math.random() * 100 < target.charDef.catchSkill;

    // 적 공 날아가기
    const aPos = courtToScreen(attacker.x, attacker.y);
    const tPos = courtToScreen(target.x, target.y);
    spawnBallAnim(aPos.x, aPos.y, tPos.x, tPos.y, "🔴", "#ef4444", "normal", 450);

    setTimeout(() => {
      if (caught) {
        log.push(`✋ 캐치 성공!!`);
        spawnParticles(tPos.x, tPos.y, "catch");
        setCatchCount(c => c + 1);
        setScore(s => s + 15);
        addFloat("+15 캐치!", "#60a5fa");
      } else if (hit) {
        const dmg = Math.max(1, attacker.charDef.throwPower);
        const newHp = target.hp - dmg;
        log.push(`💢 ${target.charDef.name} 맞았다! (-${dmg} HP)`);
        spawnParticles(tPos.x, tPos.y, "hit");
        setShaking(true); setTimeout(() => setShaking(false), 300);
        setMyTeam(prev => prev.map(m => m.id === target.id ? { ...m, hp: Math.max(0, newHp), isOut: newHp <= 0 } : m));
        if (newHp <= 0) log.push(`😱 ${target.charDef.name} 아웃...`);
        setCombo(0);
      } else {
        log.push(`😮‍💨 회피 성공!`);
      }
      setBattleLog(prev => [...prev, ...log].slice(-8));
      setIsEnemyTurn(false);
    }, 500);
  }, [enemyTeam, myTeam]);

  const addFloat = (text: string, color: string) => {
    const fid = floatId.current++;
    setFloatTexts(prev => [...prev, { id: fid, text, x: 150 + Math.random() * 100, y: 180 + Math.random() * 40, color }]);
    setTimeout(() => setFloatTexts(prev => prev.filter(f => f.id !== fid)), 1000);
  };

  // ── 공 날아가는 애니메이션 ──
  const spawnBallAnim = (fromX: number, fromY: number, toX: number, toY: number, emoji: string, color: string, trail: string, duration = 500) => {
    const id = ballAnimId.current++;
    setFlyingBalls(prev => [...prev, { id, startX: fromX, startY: fromY, endX: toX, endY: toY, emoji, color, duration, trail }]);
    setTimeout(() => setFlyingBalls(prev => prev.filter(b => b.id !== id)), duration + 100);
  };

  // ── 파티클 이펙트 ──
  const spawnParticles = (cx: number, cy: number, type: string) => {
    const newParticles: Particle[] = [];
    const base = particleId.current;

    switch (type) {
      case "hit": // 일반 명중
        for (let i = 0; i < 6; i++) {
          newParticles.push({ id: base + i, x: cx + (Math.random() - 0.5) * 40, y: cy + (Math.random() - 0.5) * 30,
            emoji: ["💥", "✨", "⭐"][i % 3], size: 14 + Math.random() * 10, duration: 600, delay: i * 50, animation: "particle-explode" });
        }
        break;
      case "meteor": // 메테오
        for (let i = 0; i < 10; i++) {
          newParticles.push({ id: base + i, x: cx + (Math.random() - 0.5) * 60, y: cy - 20 + Math.random() * 40,
            emoji: ["🔥", "☄️", "💫"][i % 3], size: 12 + Math.random() * 14, duration: 800, delay: i * 60, animation: "particle-fall" });
        }
        break;
      case "thunder": // 썬더볼트
        for (let i = 0; i < 8; i++) {
          newParticles.push({ id: base + i, x: cx + (Math.random() - 0.5) * 50, y: cy + (Math.random() - 0.5) * 40,
            emoji: ["⚡", "💛", "✨"][i % 3], size: 10 + Math.random() * 16, duration: 400, delay: i * 30, animation: "particle-zap" });
        }
        break;
      case "bomb": // 폭발
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          newParticles.push({ id: base + i, x: cx + Math.cos(angle) * 35, y: cy + Math.sin(angle) * 25,
            emoji: ["💥", "🔥", "💣", "💨"][i % 4], size: 12 + Math.random() * 12, duration: 700, delay: i * 40, animation: "particle-burst" });
        }
        break;
      case "triple": // 3방향
        for (let i = 0; i < 9; i++) {
          newParticles.push({ id: base + i, x: cx + (i % 3 - 1) * 30, y: cy + Math.floor(i / 3) * 15 - 15,
            emoji: ["🔴", "⚡", "💫"][i % 3], size: 10 + Math.random() * 8, duration: 500, delay: i * 40, animation: "particle-spread" });
        }
        break;
      case "snipe": // 저격
        for (let i = 0; i < 5; i++) {
          newParticles.push({ id: base + i, x: cx, y: cy + (i - 2) * 8,
            emoji: ["🎯", "💢", "✨"][i % 3], size: 10 + i * 3, duration: 500, delay: i * 80, animation: "particle-zoom" });
        }
        break;
      case "shield": // 방어
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          newParticles.push({ id: base + i, x: cx + Math.cos(angle) * 25, y: cy + Math.sin(angle) * 20,
            emoji: ["🛡️", "✨", "💠"][i % 3], size: 12 + Math.random() * 8, duration: 800, delay: i * 60, animation: "particle-orbit" });
        }
        break;
      case "heal": // 힐
        for (let i = 0; i < 8; i++) {
          newParticles.push({ id: base + i, x: cx + (Math.random() - 0.5) * 30, y: cy + 20 - i * 8,
            emoji: ["💚", "✨", "💉", "❤️‍🩹"][i % 4], size: 10 + Math.random() * 10, duration: 900, delay: i * 70, animation: "particle-rise" });
        }
        break;
      case "rage": // 분노
        for (let i = 0; i < 8; i++) {
          newParticles.push({ id: base + i, x: cx + (Math.random() - 0.5) * 40, y: cy + (Math.random() - 0.5) * 30,
            emoji: ["😡", "🔥", "💢", "👊"][i % 4], size: 12 + Math.random() * 12, duration: 700, delay: i * 50, animation: "particle-shake" });
        }
        break;
      case "speed": // 스피드
        for (let i = 0; i < 6; i++) {
          newParticles.push({ id: base + i, x: cx - 15 + i * 8, y: cy + (Math.random() - 0.5) * 20,
            emoji: ["💨", "✨", "⚡"][i % 3], size: 10 + Math.random() * 8, duration: 500, delay: i * 50, animation: "particle-dash" });
        }
        break;
      case "catch": // 캐치
        for (let i = 0; i < 6; i++) {
          newParticles.push({ id: base + i, x: cx + (Math.random() - 0.5) * 30, y: cy + (Math.random() - 0.5) * 20,
            emoji: ["✋", "✨", "💪"][i % 3], size: 14 + Math.random() * 8, duration: 600, delay: i * 50, animation: "particle-explode" });
        }
        break;
      default: // 기본
        for (let i = 0; i < 4; i++) {
          newParticles.push({ id: base + i, x: cx + (Math.random() - 0.5) * 30, y: cy + (Math.random() - 0.5) * 20,
            emoji: "✨", size: 12, duration: 500, delay: i * 50, animation: "particle-explode" });
        }
    }

    particleId.current += newParticles.length;
    setParticles(prev => [...prev, ...newParticles]);
    const maxDur = Math.max(...newParticles.map(p => p.duration + p.delay));
    setTimeout(() => setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id))), maxDur + 200);
  };

  // ── 코트 좌표 → 화면 좌표 변환 ──
  const courtToScreen = (xPct: number, yPct: number) => {
    const court = courtRef.current;
    if (!court) return { x: 200, y: 150 };
    const rect = court.getBoundingClientRect();
    return { x: rect.left + (xPct / 100) * rect.width, y: rect.top + (yPct / 100) * rect.height };
  };

  /* ───── 메인 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-900 via-orange-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-red-300 text-sm mb-4 inline-block">← 홈으로</Link>
          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🔴</div>
            <h1 className="text-3xl font-black mb-1">피구왕</h1>
            <p className="text-red-300 text-sm">캐릭터를 고르고, 스킬로 싸워라!</p>
          </div>

          <div className="bg-red-900/40 rounded-xl p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-yellow-400 font-bold">🪙 {coins}</span>
              <span className="text-red-300 text-sm">Lv.{playerLevel}</span>
            </div>
            <div className="bg-red-900 rounded-full h-2 overflow-hidden">
              <div className="bg-red-400 h-2 rounded-full" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            {highScore > 0 && <div className="text-xs text-yellow-300 text-center mt-1">🏆 최고: {highScore}</div>}
          </div>

          {selectedChar && (
            <div className="bg-black/30 rounded-xl p-3 mb-4 flex items-center gap-3">
              <CharacterAvatar char={selectedChar} size={50} />
              <div>
                <div className="font-bold">{selectedChar.name}</div>
                <div className="text-xs text-gray-400">{selectedChar.title}</div>
                <div className="flex gap-1 mt-1">
                  {selectedChar.skills.map(sId => <span key={sId} className="text-sm">{ALL_SKILLS[sId]?.emoji}</span>)}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button onClick={() => setScreen("charselect")}
              className="w-full bg-purple-600 hover:bg-purple-500 rounded-xl p-3 text-center font-black text-lg">
              🧑 캐릭터 선택
            </button>
            <button onClick={() => { if (selectedChar) setScreen("stage_select"); }}
              disabled={!selectedChar}
              className={`w-full rounded-xl p-4 text-center text-lg font-black ${selectedChar ? "bg-red-600 hover:bg-red-500" : "bg-gray-700 text-gray-500"}`}>
              🔴 스테이지 선택!
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 캐릭터 선택 ───── */
  if (screen === "charselect") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-purple-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-4">🧑 캐릭터 선택</h2>

          <div className="space-y-3">
            {CHARACTERS.map(c => {
              const isSelected = selectedChar?.id === c.id;
              return (
                <button key={c.id} onClick={() => { setSelectedChar(c); setScreen("main"); }}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                    isSelected ? "bg-purple-700 ring-2 ring-yellow-400" : "bg-black/30 hover:bg-black/50"
                  }`}>
                  <div className="flex-shrink-0">
                    <CharacterAvatar char={c} size={60} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black">{c.name}</div>
                    <div className="text-xs text-purple-300">{c.title}</div>
                    <div className="text-[10px] text-gray-400">{c.desc}</div>
                    <div className="flex gap-2 mt-1 text-[10px]">
                      <span>❤️{c.hp}</span>
                      <span>💪{c.throwPower}</span>
                      <span>🏃{c.speed}</span>
                      <span>✋{c.catchSkill}%</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {c.skills.map(sId => {
                        const sk = ALL_SKILLS[sId];
                        return sk ? (
                          <span key={sId} className="text-[9px] bg-purple-900/60 px-1.5 py-0.5 rounded">
                            {sk.emoji} {sk.name}
                          </span>
                        ) : null;
                      })}
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

  /* ───── 스테이지 선택 ───── */
  if (screen === "stage_select") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-red-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-4">🏟️ 스테이지</h2>
          <div className="space-y-2">
            {STAGES.map(s => {
              const done = completedStages.includes(s.id);
              return (
                <button key={s.id} onClick={() => startStage(s)}
                  className={`w-full text-left p-3 rounded-xl ${done ? "bg-green-900/30 border border-green-700" : "bg-black/30 hover:bg-black/50"}`}>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{s.emoji}</div>
                    <div className="flex-1">
                      <span className="font-bold">{s.name}</span>
                      {done && <span className="text-green-400 text-xs ml-2">✅</span>}
                      <div className="text-xs text-gray-400">{s.desc}</div>
                      <span className="text-[10px] text-gray-500">{"⭐".repeat(s.difficulty)}{"☆".repeat(5 - s.difficulty)}</span>
                    </div>
                    <div className="text-xs text-right"><div>👥 {s.enemyCount}</div><div className="text-yellow-400">🪙 {s.reward}</div></div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 플레이 ───── */
  if (screen === "play" && currentStage && selectedChar) {
    const me = myTeam.find(p => p.id === 0);
    const theme = STAGE_THEMES[currentStage.id] || STAGE_THEMES.s1;
    const isDark = ["s5", "s6", "s7", "s8"].includes(currentStage.id);

    return (
      <div className={`min-h-screen bg-gradient-to-b ${theme.pageBg} ${isDark ? "text-white" : "text-gray-900"} p-3 relative overflow-hidden select-none ${shaking ? "animate-pulse" : ""}`}>
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-1 text-sm">
            <span className="font-bold">🎯 {score}</span>
            <span>{currentStage.emoji} {currentStage.name}</span>
            <span>턴 {turnCount}</span>
          </div>

          {combo >= 3 && (
            <div className="text-center mb-1">
              <span className="text-sm font-black px-2 py-0.5 rounded-full bg-red-500 text-white">🔥 {combo} COMBO!</span>
            </div>
          )}

          {gameMessage && (
            <div className="text-center text-sm font-bold mb-1 animate-pulse bg-white/90 text-purple-700 rounded-lg py-1 shadow-lg">{gameMessage}</div>
          )}

          {/* 코트 (스테이지별 테마) */}
          <div ref={courtRef} className="rounded-xl relative overflow-hidden" style={{ height: "38vh", background: theme.courtBg, border: `4px solid ${theme.courtBorder}` }}>
            {/* 중앙선 */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5" style={{ backgroundColor: theme.lineColor }} />

            {/* 배경 장식 이모지 */}
            {theme.decoEmojis.map((emoji, i) => (
              <div key={i} className="absolute pointer-events-none opacity-20 text-2xl" style={{
                left: `${10 + (i * 25) % 90}%`,
                top: `${5 + (i * 35) % 85}%`,
                animation: `decoFloat ${3 + i}s ease-in-out infinite`,
                animationDelay: `${i * 0.7}s`,
              }}>{emoji}</div>
            ))}

            {/* 내 팀 */}
            {myTeam.map(p => (
              <div key={p.id} className="absolute transition-all" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -50%)" }}>
                <CharacterAvatar char={p.charDef} size={p.id === 0 ? 55 : 45} isOut={p.isOut}
                  skillAnim={p.id === 0 && animatingSkill ? "animate-bounce" : ""} />
                <div className="text-center -mt-1">
                  <div className="text-[7px] font-bold bg-blue-500 text-white px-1 rounded">{p.charDef.name}</div>
                  {!p.isOut && (
                    <div className="flex gap-0.5 justify-center">
                      {Array.from({ length: p.maxHp }, (_, i) => <span key={i} className="text-[7px]">{i < p.hp ? "❤️" : "🖤"}</span>)}
                    </div>
                  )}
                  {p.buffType && <div className="text-[8px] text-yellow-300 font-bold animate-pulse">{p.buffType === "rage" ? "😡" : p.buffType === "shield" ? "🛡️" : "💨"} {p.buffTurns}턴</div>}
                </div>
              </div>
            ))}

            {/* 적 팀 */}
            {enemyTeam.map(e => (
              <div key={e.id}
                className={`absolute transition-all ${e.isOut ? "" : "cursor-pointer"} ${selectedTarget === e.id && !e.isOut ? "scale-110" : ""}`}
                style={{ left: `${e.x}%`, top: `${e.y}%`, transform: "translate(-50%, -50%)" }}
                onClick={() => !e.isOut && setSelectedTarget(e.id)}>
                <CharacterAvatar char={e.charDef} size={45} isOut={e.isOut} />
                <div className="text-center -mt-1">
                  <div className="text-[7px] font-bold bg-red-500 text-white px-1 rounded">{e.charDef.name}</div>
                  {!e.isOut && (
                    <div className="flex gap-0.5 justify-center">
                      {Array.from({ length: e.maxHp }, (_, i) => <span key={i} className="text-[7px]">{i < e.hp ? "❤️" : "🖤"}</span>)}
                    </div>
                  )}
                  {selectedTarget === e.id && !e.isOut && <div className="text-[8px] text-yellow-300 font-bold">🎯</div>}
                </div>
              </div>
            ))}
          </div>

          {/* 배틀 로그 */}
          <div className="bg-black/70 rounded-xl p-2 mt-1 max-h-16 overflow-y-auto">
            {battleLog.map((log, i) => <div key={i} className="text-[9px] text-gray-300">{log}</div>)}
            {battleLog.length === 0 && <div className="text-[9px] text-gray-500 text-center">적을 선택하고 공격하자!</div>}
          </div>

          {/* 액션 버튼 */}
          <div className="mt-2">
            {/* 일반 던지기 */}
            <button onClick={() => selectedTarget !== null && throwBall(selectedTarget)}
              disabled={!me || me.isOut || isEnemyTurn || selectedTarget === null}
              className={`w-full p-2 rounded-xl text-center font-bold mb-2 ${
                !isEnemyTurn && selectedTarget !== null && me && !me.isOut ? "bg-red-600 hover:bg-red-500 text-white" : "bg-gray-400 text-gray-600"
              }`}>
              🔴 던지기!
            </button>

            {/* 스킬 버튼 */}
            <div className="grid grid-cols-3 gap-1.5">
              {selectedChar.skills.map(sId => {
                const skill = ALL_SKILLS[sId];
                if (!skill) return null;
                const onCd = (skillCooldowns[sId] || 0) > 0;
                const needTarget = skill.type === "attack" && skill.id !== "triple";

                return (
                  <button key={sId}
                    onClick={() => useSkill(sId)}
                    disabled={onCd || isEnemyTurn || !me || me.isOut || (needTarget && selectedTarget === null)}
                    className={`relative p-2 rounded-xl text-center transition-all ${
                      onCd || isEnemyTurn ? "bg-gray-300 opacity-50" : "bg-white hover:bg-purple-50 shadow-md active:scale-95"
                    }`}>
                    <div className="text-xl">{skill.emoji}</div>
                    <div className="text-[9px] font-bold">{skill.name}</div>
                    <div className="text-[7px] text-gray-500">{skill.desc.slice(0, 8)}...</div>
                    {onCd && <div className="absolute top-0.5 right-1 text-[8px] bg-red-500 text-white px-1 rounded-full">{skillCooldowns[sId]}</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {isEnemyTurn && <div className="text-center mt-2 text-sm animate-pulse font-bold text-red-600">적의 턴...</div>}
        </div>

        {/* 날아가는 공 */}
        {flyingBalls.map(b => {
          const dx = b.endX - b.startX;
          const dy = b.endY - b.startY;
          return (
            <div key={b.id} className="fixed pointer-events-none z-40"
              style={{
                left: b.startX, top: b.startY,
                transition: `transform ${b.duration}ms ease-in, opacity ${b.duration * 0.3}ms ease-in ${b.duration * 0.7}ms`,
                transform: `translate(${dx}px, ${dy}px) scale(0.8)`,
              }}>
              <span className="text-2xl" style={{ filter: `drop-shadow(0 0 8px ${b.color})` }}>{b.emoji}</span>
              {b.trail === "fire" && <span className="absolute -left-2 -top-1 text-lg opacity-60">🔥</span>}
              {b.trail === "lightning" && <span className="absolute -left-3 top-0 text-sm opacity-70">⚡</span>}
              {b.trail === "smoke" && <span className="absolute -left-2 -top-2 text-lg opacity-40">💨</span>}
              {b.trail === "spin" && <span className="absolute left-0 top-0 text-lg" style={{ animation: "spinTrail 0.4s linear infinite" }}>✨</span>}
            </div>
          );
        })}

        {/* 파티클 이펙트 */}
        {particles.map(p => (
          <div key={p.id} className="fixed pointer-events-none z-50" style={{
            left: p.x, top: p.y, fontSize: p.size,
            animation: `${p.animation} ${p.duration}ms ease-out forwards`,
            animationDelay: `${p.delay}ms`,
            opacity: 0,
          }}>
            {p.emoji}
          </div>
        ))}

        {/* 플로팅 텍스트 */}
        {floatTexts.map(f => (
          <div key={f.id} className="fixed pointer-events-none font-black text-lg z-50"
            style={{ left: f.x, top: f.y, color: f.color, textShadow: "0 0 4px rgba(0,0,0,0.3)", animation: "floatUp 1s ease-out forwards" }}>
            {f.text}
          </div>
        ))}

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes floatUp { 0% { opacity:1; transform:translateY(0) scale(1); } 100% { opacity:0; transform:translateY(-80px) scale(1.3); } }
          @keyframes decoFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
          @keyframes spinTrail { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }
          @keyframes particle-explode {
            0% { opacity:0; transform:scale(0); }
            30% { opacity:1; transform:scale(1.5); }
            100% { opacity:0; transform:scale(0.5) translate(10px, -10px); }
          }
          @keyframes particle-fall {
            0% { opacity:0; transform:translateY(-40px) scale(0.5); }
            40% { opacity:1; transform:translateY(0) scale(1.3); }
            100% { opacity:0; transform:translateY(20px) scale(0.3); }
          }
          @keyframes particle-zap {
            0% { opacity:0; transform:scale(0) rotate(0deg); }
            20% { opacity:1; transform:scale(2) rotate(90deg); }
            100% { opacity:0; transform:scale(0) rotate(360deg); }
          }
          @keyframes particle-burst {
            0% { opacity:0; transform:translate(0,0) scale(0.5); }
            30% { opacity:1; transform:translate(10px,10px) scale(1.5); }
            100% { opacity:0; transform:translate(20px,20px) scale(0); }
          }
          @keyframes particle-spread {
            0% { opacity:0; transform:translateX(0) scale(0.5); }
            40% { opacity:1; transform:translateX(15px) scale(1.2); }
            100% { opacity:0; transform:translateX(40px) scale(0.3); }
          }
          @keyframes particle-zoom {
            0% { opacity:0; transform:scale(0) translateX(-20px); }
            50% { opacity:1; transform:scale(1.8) translateX(0); }
            100% { opacity:0; transform:scale(0.5) translateX(10px); }
          }
          @keyframes particle-orbit {
            0% { opacity:0; transform:rotate(0deg) translateX(0) scale(0.5); }
            50% { opacity:1; transform:rotate(180deg) translateX(5px) scale(1.2); }
            100% { opacity:0; transform:rotate(360deg) translateX(0) scale(0.5); }
          }
          @keyframes particle-rise {
            0% { opacity:0; transform:translateY(10px) scale(0.5); }
            50% { opacity:1; transform:translateY(-10px) scale(1.3); }
            100% { opacity:0; transform:translateY(-30px) scale(0.5); }
          }
          @keyframes particle-shake {
            0% { opacity:0; transform:translate(0,0) scale(0.5); }
            25% { opacity:1; transform:translate(-5px,3px) scale(1.5); }
            50% { opacity:1; transform:translate(5px,-3px) scale(1.3); }
            75% { opacity:0.5; transform:translate(-3px,5px) scale(1); }
            100% { opacity:0; transform:translate(0,0) scale(0.3); }
          }
          @keyframes particle-dash {
            0% { opacity:0; transform:translateX(-15px) scaleX(0.5); }
            40% { opacity:1; transform:translateX(0) scaleX(1.5); }
            100% { opacity:0; transform:translateX(25px) scaleX(0.3); }
          }
        ` }} />
      </div>
    );
  }

  /* ───── 결과 ───── */
  if (screen === "result" && currentStage) {
    const victory = enemyTeam.every(e => e.isOut);
    const earned = Math.floor(score / 3) + hitCount * 5 + catchCount * 8 + (victory ? currentStage.reward : 0);
    return (
      <div className={`min-h-screen bg-gradient-to-b ${victory ? "from-yellow-600 via-red-800 to-slate-950" : "from-gray-800 to-black"} text-white p-4 flex items-center justify-center`}>
        <div className="max-w-md mx-auto text-center">
          <div className="text-8xl mb-4">{victory ? "🏆" : "😭"}</div>
          <h2 className="text-3xl font-black mb-2" style={{ color: victory ? "#fbbf24" : "#f87171" }}>{victory ? "승리!!" : "패배..."}</h2>
          {selectedChar && <div className="mb-3 flex justify-center"><CharacterAvatar char={selectedChar} size={60} /></div>}
          <div className="bg-black/40 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-2xl">🎯</div><div className="text-xl font-bold">{score}</div><div className="text-xs text-gray-400">점수</div></div>
              <div><div className="text-2xl">💥</div><div className="text-xl font-bold">{hitCount}</div><div className="text-xs text-gray-400">아웃</div></div>
              <div><div className="text-2xl">🔥</div><div className="text-xl font-bold">{maxCombo}</div><div className="text-xs text-gray-400">콤보</div></div>
              <div><div className="text-2xl">🪙</div><div className="text-xl font-bold text-yellow-400">+{earned}</div><div className="text-xs text-gray-400">코인</div></div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setScreen("stage_select")} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">🏟️ 스테이지</button>
            <button onClick={() => startStage(currentStage)} className="flex-1 bg-red-600 hover:bg-red-500 rounded-xl p-3 font-bold">🔄 재도전</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
