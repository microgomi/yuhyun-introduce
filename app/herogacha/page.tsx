"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

/* ───── 등급 정의 ───── */
interface Rarity {
  name: string;
  color: string;
  glow: string;
  bg: string;
  chance: number; // 누적 확률 아님, 개별 가중치
  stars: number;
}
const RARITIES: Rarity[] = [
  { name: "노말", color: "#aaa", glow: "#ccc", bg: "#f0f0f0", chance: 40, stars: 1 },
  { name: "레어", color: "#4dabf7", glow: "#74c0fc", bg: "#e7f5ff", chance: 30, stars: 2 },
  { name: "에픽", color: "#ae3ec9", glow: "#cc5de8", bg: "#f3d9fa", chance: 18, stars: 3 },
  { name: "전설", color: "#f59f00", glow: "#fcc419", bg: "#fff9db", chance: 9, stars: 4 },
  { name: "신화", color: "#e03131", glow: "#ff6b6b", bg: "#ffe3e3", chance: 2.7, stars: 5 },
  { name: "???", color: "#000", glow: "#845ef7", bg: "#e5dbff", chance: 0.3, stars: 6 },
];

/* ───── 히어로 정의 ───── */
interface HeroDef {
  id: number;
  name: string;
  emoji: string;
  rarity: number; // index into RARITIES
  power: number;
  skill: string;
  desc: string;
}

const HEROES: HeroDef[] = [
  // 노말 (0)
  { id: 1, name: "동네 아저씨", emoji: "👨", rarity: 0, power: 10, skill: "응원", desc: "힘내라 얘야!" },
  { id: 2, name: "길고양이", emoji: "🐱", rarity: 0, power: 12, skill: "할퀴기", desc: "야옹~ 할퀴기 공격!" },
  { id: 3, name: "비둘기 전사", emoji: "🐦", rarity: 0, power: 8, skill: "똥 폭격", desc: "하늘에서 폭격!" },
  { id: 4, name: "풍선맨", emoji: "🎈", rarity: 0, power: 11, skill: "떠오르기", desc: "둥둥 떠올라요" },
  { id: 5, name: "연필 용사", emoji: "✏️", rarity: 0, power: 9, skill: "찌르기", desc: "뾰족하게 찌른다!" },
  { id: 6, name: "양말 전사", emoji: "🧦", rarity: 0, power: 7, skill: "냄새 공격", desc: "극악의 냄새!" },
  // 레어 (1)
  { id: 7, name: "급식 요리사", emoji: "👨‍🍳", rarity: 1, power: 25, skill: "급식 투척", desc: "뜨거운 국물이다!" },
  { id: 8, name: "댕댕이 기사", emoji: "🐕", rarity: 1, power: 28, skill: "돌진", desc: "멍멍! 돌격!" },
  { id: 9, name: "로봇 청소기", emoji: "🤖", rarity: 1, power: 22, skill: "흡입", desc: "위이잉~ 다 빨아들인다" },
  { id: 10, name: "축구 선수", emoji: "⚽", rarity: 1, power: 27, skill: "슈팅", desc: "골인~!" },
  { id: 11, name: "마법 토끼", emoji: "🐰", rarity: 1, power: 24, skill: "당근 미사일", desc: "당근 발사!" },
  // 에픽 (2)
  { id: 12, name: "번개 닌자", emoji: "⚡", rarity: 2, power: 50, skill: "번개 베기", desc: "찌지직! 순식간에!" },
  { id: 13, name: "얼음 마법사", emoji: "🧊", rarity: 2, power: 48, skill: "빙결", desc: "꽁꽁 얼어라!" },
  { id: 14, name: "불꽃 사무라이", emoji: "🔥", rarity: 2, power: 52, skill: "화염참", desc: "활활 타올라!" },
  { id: 15, name: "바람의 궁수", emoji: "🏹", rarity: 2, power: 46, skill: "질풍 사격", desc: "바람을 타고!" },
  { id: 16, name: "대왕 문어", emoji: "🐙", rarity: 2, power: 55, skill: "먹물 폭발", desc: "먹물 뿌려!" },
  // 전설 (3)
  { id: 17, name: "드래곤 나이트", emoji: "🐉", rarity: 3, power: 100, skill: "용의 숨결", desc: "불을 뿜어라!" },
  { id: 18, name: "우주 전사", emoji: "🚀", rarity: 3, power: 95, skill: "레이저 빔", desc: "우주의 힘이다!" },
  { id: 19, name: "시간의 마법사", emoji: "⏰", rarity: 3, power: 105, skill: "시간 정지", desc: "시간이여 멈춰라!" },
  { id: 20, name: "황금 기사", emoji: "🏆", rarity: 3, power: 98, skill: "황금 방패", desc: "무적의 방어!" },
  // 신화 (4)
  { id: 21, name: "태양신 라", emoji: "☀️", rarity: 4, power: 200, skill: "태양 폭발", desc: "태양의 분노!" },
  { id: 22, name: "바다의 왕", emoji: "🌊", rarity: 4, power: 195, skill: "쓰나미", desc: "파도가 밀려온다!" },
  { id: 23, name: "어둠의 제왕", emoji: "👿", rarity: 4, power: 210, skill: "암흑 차원", desc: "어둠에 잠겨라!" },
  // ??? (5)
  { id: 24, name: "진유현 히어로", emoji: "🦸‍♂️", rarity: 5, power: 999, skill: "궁극의 힘", desc: "내가 바로 최강!" },
  { id: 25, name: "전설의 갓", emoji: "👑", rarity: 5, power: 888, skill: "전지전능", desc: "모든 것을 지배한다!" },
];

/* ───── 컬렉션 히어로 ───── */
interface CollectedHero {
  hero: HeroDef;
  count: number;
  level: number;
}

type Screen = "main" | "pull" | "result" | "collection" | "battle";

/* ───── 뽑기 애니메이션 단계 ───── */
type PullPhase = "shaking" | "cracking" | "reveal";

export default function HeroGachaPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(100);
  const [collection, setCollection] = useState<Map<number, CollectedHero>>(new Map());
  const [pullResult, setPullResult] = useState<HeroDef | null>(null);
  const [pullPhase, setPullPhase] = useState<PullPhase>("shaking");
  const [isNew, setIsNew] = useState(false);
  const [totalPulls, setTotalPulls] = useState(0);
  const [pity, setPity] = useState(0); // 천장 카운터
  const [battleTeam, setBattleTeam] = useState<number[]>([]);
  const [battleResult, setBattleResult] = useState<{ won: boolean; enemy: string; reward: number } | null>(null);
  const [battlePhase, setBattlePhase] = useState<"select" | "enemy" | "fighting" | "done">("select");
  const [selectedEnemy, setSelectedEnemy] = useState(0);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [multiResults, setMultiResults] = useState<HeroDef[]>([]);
  const [showMulti, setShowMulti] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  /* ───── 뽑기 로직 ───── */
  const pickRarity = useCallback((currentPity: number): number => {
    // 50회 천장: 신화 확정
    if (currentPity >= 49) return 4;
    // 30회 이상: 전설 확률 증가
    const boost = currentPity >= 29 ? 2 : 1;
    const weights = RARITIES.map((r, i) => {
      if (i === 3) return r.chance * boost;
      if (i === 4) return r.chance * (1 + currentPity * 0.02);
      return r.chance;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return i;
    }
    return 0;
  }, []);

  const pickHero = useCallback((rarityIdx: number): HeroDef => {
    const pool = HEROES.filter(h => h.rarity === rarityIdx);
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);

  const addToCollection = useCallback((hero: HeroDef): boolean => {
    let isNewHero = false;
    setCollection(prev => {
      const next = new Map(prev);
      const existing = next.get(hero.id);
      if (existing) {
        next.set(hero.id, { ...existing, count: existing.count + 1 });
      } else {
        next.set(hero.id, { hero, count: 1, level: 1 });
        isNewHero = true;
      }
      return next;
    });
    return isNewHero;
  }, []);

  const doPull = useCallback((count: number) => {
    const cost = count === 1 ? 10 : count === 10 ? 90 : 800; // 100연차 할인
    if (coins < cost) return;
    setCoins(c => c - cost);
    setTotalPulls(t => t + count);

    if (count === 1) {
      const rarityIdx = pickRarity(pity);
      const hero = pickHero(rarityIdx);
      const newHero = !collection.has(hero.id);
      addToCollection(hero);
      setPullResult(hero);
      setIsNew(newHero);
      setPity(rarityIdx >= 4 ? 0 : pity + 1);
      setPullPhase("shaking");
      setScreen("pull");
      setTimeout(() => setPullPhase("cracking"), 1000);
      setTimeout(() => {
        setPullPhase("reveal");
        setScreen("result");
      }, 2000);
    } else {
      // 10연차 / 100연차
      const results: HeroDef[] = [];
      let currentPity = pity;
      for (let i = 0; i < count; i++) {
        const rarityIdx = pickRarity(currentPity);
        const hero = pickHero(rarityIdx);
        addToCollection(hero);
        results.push(hero);
        currentPity = rarityIdx >= 4 ? 0 : currentPity + 1;
      }
      setPity(currentPity);
      setMultiResults(results);
      setPullPhase("shaking");
      setScreen("pull");
      setTimeout(() => setPullPhase("cracking"), 1000);
      setTimeout(() => {
        setPullPhase("reveal");
        setShowMulti(true);
        setScreen("result");
      }, 2000);
    }
  }, [coins, pity, collection, pickRarity, pickHero, addToCollection]);

  /* ───── 배틀 ───── */
  const enemies = [
    { name: "슬라임 군단", emoji: "🟢", power: 30, reward: 15, desc: "말랑말랑한 초보 적" },
    { name: "고블린 부대", emoji: "👺", power: 80, reward: 25, desc: "도둑질 좋아하는 녀석들" },
    { name: "스켈레톤 왕", emoji: "💀", power: 150, reward: 40, desc: "뼈다귀 군대의 왕" },
    { name: "독 거미 여왕", emoji: "🕷️", power: 220, reward: 50, desc: "독을 뿜는 거대 거미" },
    { name: "다크 드래곤", emoji: "🐲", power: 300, reward: 60, desc: "불을 뿜는 용" },
    { name: "얼음 골렘", emoji: "🧊", power: 400, reward: 75, desc: "얼어붙은 거인" },
    { name: "마왕", emoji: "😈", power: 500, reward: 100, desc: "어둠의 지배자" },
    { name: "카오스 신", emoji: "🌀", power: 700, reward: 150, desc: "혼돈 그 자체" },
    { name: "료멘 스쿠나", emoji: "👹", power: 1000, reward: 250, desc: "저주의 왕, 손가락 20개의 주인" },
    { name: "진시현", emoji: "👦", power: 1500, reward: 400, desc: "유현이의 형, 최종 보스" },
  ];

  const startBattle = useCallback(() => {
    if (battleTeam.length === 0) return;
    setBattlePhase("fighting");
    const teamPower = battleTeam.reduce((sum, id) => {
      const c = collection.get(id);
      if (!c) return sum;
      return sum + c.hero.power * (1 + (c.level - 1) * 0.2);
    }, 0);

    const enemy = enemies[selectedEnemy];
    const logs: string[] = [];
    logs.push(`⚔️ ${enemy.emoji} ${enemy.name} 등장!`);
    logs.push(`우리 팀 전투력: ${Math.floor(teamPower)}`);
    logs.push(`적 전투력: ${enemy.power}`);

    // 전투 시뮬레이션
    let hp = teamPower;
    let enemyHp = enemy.power;
    let turn = 1;
    while (hp > 0 && enemyHp > 0 && turn <= 10) {
      const dmg = Math.floor(teamPower * (0.2 + Math.random() * 0.3));
      const enemyDmg = Math.floor(enemy.power * (0.1 + Math.random() * 0.3));
      enemyHp -= dmg;
      hp -= enemyDmg;
      logs.push(`턴 ${turn}: 💥 ${dmg} 데미지! / 적 반격 ${enemyDmg}`);
      turn++;
    }

    const won = enemyHp <= 0;
    if (won) {
      logs.push(`🎉 승리! +${enemy.reward} 코인`);
      setCoins(c => c + enemy.reward);
    } else {
      logs.push(`💔 패배... +5 코인`);
      setCoins(c => c + 5);
    }

    setBattleLog(logs);
    setBattleResult({ won, enemy: enemy.name, reward: won ? enemy.reward : 5 });
    setTimeout(() => setBattlePhase("done"), 500);
  }, [battleTeam, collection, selectedEnemy]);

  /* ───── 레벨업 ───── */
  const levelUp = useCallback((heroId: number) => {
    setCollection(prev => {
      const next = new Map(prev);
      const c = next.get(heroId);
      if (!c || c.count < c.level + 1) return prev;
      next.set(heroId, { ...c, level: c.level + 1, count: c.count - (c.level + 1) });
      return next;
    });
  }, []);

  /* ───── 뽑기 연출 캔버스 ───── */
  useEffect(() => {
    if (screen !== "pull") return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const W = cvs.width;
    const H = cvs.height;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; color: string; life: number }[] = [];
    let shake = 0;
    let crack = 0;

    const loop = () => {
      ctx.clearRect(0, 0, W, H);

      // 배경
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, W, H);

      const phase = pullPhase;
      const cx = W / 2;
      const cy = H / 2;

      if (phase === "shaking") {
        shake += 0.3;
        const ox = Math.sin(shake * 10) * Math.min(shake * 2, 15);
        const oy = Math.cos(shake * 8) * Math.min(shake * 2, 10);

        // 빛나는 원
        const grad = ctx.createRadialGradient(cx + ox, cy + oy, 10, cx + ox, cy + oy, 80);
        grad.addColorStop(0, "#ffd43b");
        grad.addColorStop(0.5, "#fab005");
        grad.addColorStop(1, "#1a1a2e");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, 80, 0, Math.PI * 2);
        ctx.fill();

        // 물음표
        ctx.fillStyle = "#fff";
        ctx.font = "bold 60px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", cx + ox, cy + oy);

        // 흔들림 파티클
        if (Math.random() < 0.3) {
          const angle = Math.random() * Math.PI * 2;
          particles.push({
            x: cx + Math.cos(angle) * 60,
            y: cy + Math.sin(angle) * 60,
            vx: Math.cos(angle) * 2,
            vy: Math.sin(angle) * 2,
            r: 3 + Math.random() * 3,
            color: `hsl(${Math.random() * 60 + 30}, 100%, 60%)`,
            life: 30,
          });
        }
      } else if (phase === "cracking") {
        crack += 0.05;
        // 갈라지는 효과
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 + crack * 100);
        grad.addColorStop(0, "#fff");
        grad.addColorStop(0.3, "#ffd43b");
        grad.addColorStop(1, "#1a1a2e");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 60 + crack * 50, 0, Math.PI * 2);
        ctx.fill();

        // 갈라짐 선
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + crack;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * (40 + crack * 80), cy + Math.sin(angle) * (40 + crack * 80));
          ctx.stroke();
        }

        // 폭발 파티클
        for (let i = 0; i < 5; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 3 + Math.random() * 5;
          particles.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: 2 + Math.random() * 4,
            color: `hsl(${Math.random() * 360}, 100%, 70%)`,
            life: 40,
          });
        }
      }

      // 파티클 업데이트
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.r *= 0.97;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life / 40;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (phase !== "reveal") {
        animRef.current = requestAnimationFrame(loop);
      }
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [screen, pullPhase]);

  /* ───── 렌더링 ───── */
  const rarityBorder = (r: number) => {
    const colors = ["#aaa", "#4dabf7", "#ae3ec9", "#f59f00", "#e03131", "#845ef7"];
    return colors[r] || "#aaa";
  };

  // 메인 화면
  if (screen === "main") {
    const collectedCount = collection.size;
    const totalHeroes = HEROES.length;
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-purple-300 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🎰</div>
            <h1 className="text-3xl font-black mb-1">히어로 뽑기</h1>
            <p className="text-purple-300 text-sm">최강의 히어로를 모아라!</p>
          </div>

          {/* 코인 & 상태 */}
          <div className="bg-purple-900/50 rounded-xl p-3 mb-4 flex justify-between items-center">
            <div>
              <span className="text-yellow-400 text-lg font-bold">🪙 {coins}</span>
              <span className="text-purple-300 text-xs ml-2">코인</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-purple-300">도감: {collectedCount}/{totalHeroes}</div>
              <div className="text-xs text-purple-400">총 뽑기: {totalPulls}회</div>
              <div className="text-xs text-purple-400">천장: {pity}/50</div>
            </div>
          </div>

          {/* 뽑기 버튼 */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button
              onClick={() => doPull(1)}
              disabled={coins < 10}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 disabled:from-gray-600 disabled:to-gray-700 rounded-xl p-4 text-center font-bold shadow-lg active:scale-95 transition-transform"
            >
              <div className="text-2xl mb-1">🎲</div>
              <div>1회 뽑기</div>
              <div className="text-xs opacity-80">🪙 10</div>
            </button>
            <button
              onClick={() => doPull(10)}
              disabled={coins < 90}
              className="bg-gradient-to-r from-purple-500 to-pink-500 disabled:from-gray-600 disabled:to-gray-700 rounded-xl p-4 text-center font-bold shadow-lg active:scale-95 transition-transform"
            >
              <div className="text-2xl mb-1">🎰</div>
              <div>10연차</div>
              <div className="text-xs opacity-80">🪙 90</div>
            </button>
            <button
              onClick={() => doPull(100)}
              disabled={coins < 800}
              className="bg-gradient-to-r from-red-500 to-yellow-500 disabled:from-gray-600 disabled:to-gray-700 rounded-xl p-4 text-center font-bold shadow-lg active:scale-95 transition-transform"
            >
              <div className="text-2xl mb-1">💎</div>
              <div>100연차</div>
              <div className="text-xs opacity-80">🪙 800</div>
            </button>
          </div>

          {/* 메뉴 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => { setBattleTeam([]); setBattleResult(null); setBattlePhase("select"); setBattleLog([]); setScreen("battle"); }}
              className="bg-red-900/60 hover:bg-red-800/60 rounded-xl p-3 text-center"
            >
              <div className="text-2xl">⚔️</div>
              <div className="text-sm font-bold">배틀</div>
              <div className="text-xs text-red-300">코인 벌기</div>
            </button>
            <button
              onClick={() => setScreen("collection")}
              className="bg-blue-900/60 hover:bg-blue-800/60 rounded-xl p-3 text-center"
            >
              <div className="text-2xl">📖</div>
              <div className="text-sm font-bold">도감</div>
              <div className="text-xs text-blue-300">{collectedCount}마리 수집</div>
            </button>
          </div>

          {/* 확률표 */}
          <div className="bg-black/30 rounded-xl p-3">
            <h3 className="text-sm font-bold mb-2 text-center">📊 등급 확률</h3>
            <div className="grid grid-cols-3 gap-1 text-xs">
              {RARITIES.map(r => (
                <div key={r.name} className="text-center p-1 rounded" style={{ color: r.color }}>
                  {"⭐".repeat(r.stars).slice(0, 5)}{r.stars > 5 ? "💎" : ""}<br />
                  {r.name} {r.chance}%
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 뽑기 연출
  if (screen === "pull") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <canvas ref={canvasRef} width={400} height={400} className="max-w-full" />
      </div>
    );
  }

  // 결과 화면
  if (screen === "result") {
    if (showMulti && multiResults.length > 0) {
      const is100 = multiResults.length === 100;
      // 등급별 요약 (100연차용)
      const summary = RARITIES.map((r, i) => ({
        ...r,
        count: multiResults.filter(h => h.rarity === i).length,
      })).filter(s => s.count > 0).reverse();
      // 하이라이트: 에픽 이상
      const highlights = multiResults.filter(h => h.rarity >= 2);

      return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white p-4">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-black text-center mb-4">
              {is100 ? "💎 100연차 결과!" : "🎰 10연차 결과!"}
            </h2>

            {is100 ? (
              <>
                {/* 100연차: 등급별 요약 */}
                <div className="bg-black/30 rounded-xl p-3 mb-4 space-y-2">
                  {summary.map(s => (
                    <div key={s.name} className="flex items-center justify-between" style={{ color: s.color }}>
                      <span className="font-bold">{"⭐".repeat(Math.min(s.stars, 5))}{s.stars > 5 ? "💎" : ""} {s.name}</span>
                      <span className="font-black text-lg">{s.count}마리</span>
                    </div>
                  ))}
                </div>

                {/* 에픽 이상 하이라이트 */}
                {highlights.length > 0 && (
                  <>
                    <h3 className="text-sm font-bold text-center mb-2 text-yellow-400">🔥 에픽 이상 획득!</h3>
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {highlights.map((hero, i) => {
                        const rarity = RARITIES[hero.rarity];
                        return (
                          <div key={i} className="text-center p-2 rounded-lg"
                            style={{
                              background: rarity.bg + "22",
                              border: `2px solid ${rarity.color}`,
                            }}>
                            <div className="text-xl">{hero.emoji}</div>
                            <div className="text-[9px]" style={{ color: rarity.color }}>{rarity.name}</div>
                            <div className="text-[8px] truncate">{hero.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* 전체 목록 (스크롤) */}
                <div className="bg-black/20 rounded-xl p-2 max-h-40 overflow-y-auto mb-4">
                  <div className="grid grid-cols-10 gap-1">
                    {multiResults.map((hero, i) => {
                      const rarity = RARITIES[hero.rarity];
                      return (
                        <div key={i} className="text-center text-lg rounded"
                          style={{ background: rarity.color + "22" }}
                          title={`${rarity.name} ${hero.name}`}>
                          {hero.emoji}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              /* 10연차: 기존 그리드 */
              <div className="grid grid-cols-5 gap-2 mb-6">
                {multiResults.map((hero, i) => {
                  const rarity = RARITIES[hero.rarity];
                  return (
                    <div key={i} className="text-center p-2 rounded-lg animate-bounce"
                      style={{
                        background: rarity.bg + "22",
                        border: `2px solid ${rarity.color}`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: "0.5s",
                      }}>
                      <div className="text-2xl">{hero.emoji}</div>
                      <div className="text-[10px] mt-1" style={{ color: rarity.color }}>{rarity.name}</div>
                      <div className="text-[9px] truncate">{hero.name}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-center text-sm text-purple-300 mb-4">
              {multiResults.filter(h => h.rarity >= 3).length > 0 &&
                `🔥 ${multiResults.filter(h => h.rarity >= 3).map(h => RARITIES[h.rarity].name + " " + h.name).join(", ")} 획득!`}
            </div>
            <button onClick={() => { setShowMulti(false); setMultiResults([]); setScreen("main"); }}
              className="w-full bg-purple-600 hover:bg-purple-500 rounded-xl p-3 font-bold">
              확인
            </button>
          </div>
        </div>
      );
    }

    // 1회 결과
    if (!pullResult) return null;
    const rarity = RARITIES[pullResult.rarity];
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm w-full">
          {/* 등급 표시 */}
          <div className="mb-2" style={{ color: rarity.color }}>
            {"⭐".repeat(rarity.stars)}
          </div>
          <div className="text-sm font-bold mb-4 px-3 py-1 rounded-full inline-block"
            style={{ background: rarity.color + "33", color: rarity.color, border: `1px solid ${rarity.color}` }}>
            {rarity.name}
          </div>

          {/* 히어로 카드 */}
          <div className="mx-auto w-48 h-64 rounded-2xl p-4 mb-4 flex flex-col items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${rarity.color}22, ${rarity.glow}44)`,
              border: `3px solid ${rarity.color}`,
              boxShadow: `0 0 30px ${rarity.glow}66`,
            }}>
            <div className="text-7xl mb-3">{pullResult.emoji}</div>
            <div className="text-xl font-black">{pullResult.name}</div>
            <div className="text-sm opacity-70 mt-1">⚔️ {pullResult.power}</div>
            <div className="text-xs mt-2 px-2 py-1 bg-white/10 rounded-full">{pullResult.skill}</div>
          </div>

          {isNew && (
            <div className="text-yellow-400 font-bold mb-2 animate-pulse text-lg">✨ NEW! ✨</div>
          )}
          <p className="text-purple-300 text-sm mb-4">&ldquo;{pullResult.desc}&rdquo;</p>

          <button onClick={() => { setPullResult(null); setScreen("main"); }}
            className="w-full bg-purple-600 hover:bg-purple-500 rounded-xl p-3 font-bold">
            확인
          </button>
        </div>
      </div>
    );
  }

  // 도감
  if (screen === "collection") {
    const sorted = [...collection.values()].sort((a, b) => b.hero.rarity - a.hero.rarity || b.level - a.level);
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-purple-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-4">📖 히어로 도감 ({collection.size}/{HEROES.length})</h2>

          {sorted.length === 0 ? (
            <p className="text-center text-purple-400 mt-10">아직 히어로가 없어요! 뽑기를 해보세요!</p>
          ) : (
            <div className="space-y-2">
              {sorted.map(c => {
                const rarity = RARITIES[c.hero.rarity];
                const canLevel = c.count >= c.level + 1;
                const totalPower = Math.floor(c.hero.power * (1 + (c.level - 1) * 0.2));
                return (
                  <div key={c.hero.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: rarity.color + "15",
                      border: `1px solid ${rarity.color}44`,
                    }}>
                    <div className="text-3xl">{c.hero.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{c.hero.name}</span>
                        <span className="text-xs px-1 rounded" style={{ background: rarity.color + "33", color: rarity.color }}>
                          {rarity.name}
                        </span>
                      </div>
                      <div className="text-xs text-purple-300">
                        Lv.{c.level} | ⚔️ {totalPower} | 보유 {c.count}장
                      </div>
                      <div className="text-xs text-purple-400">{c.hero.skill}: {c.hero.desc}</div>
                    </div>
                    {canLevel && (
                      <button onClick={() => levelUp(c.hero.id)}
                        className="bg-green-600 hover:bg-green-500 text-xs px-2 py-1 rounded-lg font-bold whitespace-nowrap">
                        강화 ({c.level + 1}장)
                      </button>
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

  // 배틀
  if (screen === "battle") {
    const collArr = [...collection.values()].sort((a, b) => b.hero.rarity - a.hero.rarity);
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950 via-gray-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-red-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-4">⚔️ 배틀</h2>

          {battlePhase === "select" && (
            <>
              <p className="text-center text-sm text-red-300 mb-3">팀을 선택하세요 (최대 5명)</p>
              <div className="flex gap-2 justify-center mb-4 min-h-[50px]">
                {battleTeam.map(id => {
                  const c = collection.get(id);
                  if (!c) return null;
                  return (
                    <button key={id} onClick={() => setBattleTeam(t => t.filter(x => x !== id))}
                      className="text-2xl bg-red-900/50 rounded-lg p-2 w-12 h-12 flex items-center justify-center">
                      {c.hero.emoji}
                    </button>
                  );
                })}
                {battleTeam.length === 0 && <span className="text-red-400 text-sm self-center">히어로를 터치하세요</span>}
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {collArr.map(c => {
                  const selected = battleTeam.includes(c.hero.id);
                  const rarity = RARITIES[c.hero.rarity];
                  return (
                    <button key={c.hero.id}
                      onClick={() => {
                        if (selected) setBattleTeam(t => t.filter(x => x !== c.hero.id));
                        else if (battleTeam.length < 5) setBattleTeam(t => [...t, c.hero.id]);
                      }}
                      className={`p-2 rounded-lg text-center ${selected ? "ring-2 ring-yellow-400" : ""}`}
                      style={{ background: rarity.color + "22", border: `1px solid ${rarity.color}44` }}>
                      <div className="text-xl">{c.hero.emoji}</div>
                      <div className="text-[10px] truncate">{c.hero.name}</div>
                      <div className="text-[9px] text-gray-400">Lv.{c.level}</div>
                    </button>
                  );
                })}
              </div>

              {collArr.length === 0 && (
                <p className="text-center text-red-400 text-sm">히어로가 없어요! 먼저 뽑기를 하세요!</p>
              )}

              <button onClick={() => setBattlePhase("enemy")} disabled={battleTeam.length === 0}
                className="w-full bg-red-600 disabled:bg-gray-700 hover:bg-red-500 rounded-xl p-3 font-bold">
                적 고르기 →
              </button>
            </>
          )}

          {battlePhase === "enemy" && (
            <>
              <p className="text-center text-sm text-red-300 mb-3">싸울 적을 골라라!</p>
              <div className="space-y-2 mb-4">
                {enemies.map((e, i) => (
                  <button key={i}
                    onClick={() => setSelectedEnemy(i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selectedEnemy === i ? "ring-2 ring-yellow-400 bg-red-900/60" : "bg-black/30 hover:bg-red-900/30"}`}>
                    <div className="text-3xl w-12 text-center">{e.emoji}</div>
                    <div className="flex-1">
                      <div className="font-bold">{e.name}</div>
                      <div className="text-xs text-gray-400">{e.desc}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-red-300">⚔️ {e.power}</div>
                      <div className="text-xs text-yellow-400">🪙 +{e.reward}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setBattlePhase("select")}
                  className="bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">
                  ← 팀 변경
                </button>
                <button onClick={startBattle}
                  className="bg-red-600 hover:bg-red-500 rounded-xl p-3 font-bold">
                  전투 시작!
                </button>
              </div>
            </>
          )}

          {battlePhase === "fighting" && (
            <div className="text-center py-20">
              <div className="text-5xl animate-bounce">⚔️</div>
              <p className="mt-4 text-lg font-bold">전투 중...</p>
            </div>
          )}

          {battlePhase === "done" && battleResult && (
            <div className="space-y-2">
              <div className={`text-center text-3xl font-black mb-2 ${battleResult.won ? "text-yellow-400" : "text-red-400"}`}>
                {battleResult.won ? "🎉 승리!" : "💔 패배..."}
              </div>
              <div className="text-center text-sm mb-2">
                vs {battleResult.enemy} | +{battleResult.reward} 코인
              </div>
              <div className="bg-black/30 rounded-xl p-3 max-h-48 overflow-y-auto text-sm space-y-1">
                {battleLog.map((log, i) => (
                  <div key={i} className="text-gray-300">{log}</div>
                ))}
              </div>
              <button onClick={() => setScreen("main")}
                className="w-full bg-purple-600 hover:bg-purple-500 rounded-xl p-3 font-bold mt-4">
                돌아가기
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
