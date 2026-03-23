"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ═══════ 별 단계 ═══════ */
interface StarStage {
  id: string;
  name: string;
  emoji: string;
  size: number;       // 표시 크기 (px)
  color: string;
  glowColor: string;
  tempK: string;      // 표면온도
  massDesc: string;
  desc: string;
  energyNeeded: number; // 다음 단계까지 필요 에너지
  energyPerClick: number;
  autoEnergy: number;  // 초당 자동 에너지
  tier: number;
}

const STAR_STAGES: StarStage[] = [
  { id: "dust", name: "우주 먼지", emoji: "🌫️", size: 30, color: "#666", glowColor: "#44444444", tempK: "10K", massDesc: "아주 가벼움", desc: "우주 공간에 떠다니는 작은 먼지", energyNeeded: 30, energyPerClick: 1, autoEnergy: 0, tier: 0 },
  { id: "cloud", name: "성운", emoji: "☁️", size: 50, color: "#8b5cf6", glowColor: "#8b5cf644", tempK: "50K", massDesc: "가스 구름", desc: "가스와 먼지가 모여 성운이 되었다!", energyNeeded: 80, energyPerClick: 2, autoEnergy: 0.5, tier: 1 },
  { id: "protostar", name: "원시별", emoji: "🟠", size: 70, color: "#f97316", glowColor: "#f9731644", tempK: "2,000K", massDesc: "태양의 0.01배", desc: "중력으로 뭉쳐서 뜨거워지기 시작!", energyNeeded: 200, energyPerClick: 3, autoEnergy: 1, tier: 2 },
  { id: "tstar", name: "T형 항성", emoji: "🟡", size: 85, color: "#eab308", glowColor: "#eab30844", tempK: "4,000K", massDesc: "태양의 0.1배", desc: "빛을 내기 시작한 아기 별", energyNeeded: 500, energyPerClick: 5, autoEnergy: 2, tier: 3 },
  { id: "reddwarf", name: "적색 왜성", emoji: "🔴", size: 65, color: "#ef4444", glowColor: "#ef444444", tempK: "3,500K", massDesc: "태양의 0.3배", desc: "작지만 수조 년을 사는 별!", energyNeeded: 1000, energyPerClick: 8, autoEnergy: 4, tier: 4 },
  { id: "mainseq", name: "주계열성 (태양)", emoji: "☀️", size: 100, color: "#fbbf24", glowColor: "#fbbf2466", tempK: "5,800K", massDesc: "태양의 1배", desc: "우리 태양과 같은 별! 수소를 태운다", energyNeeded: 2500, energyPerClick: 12, autoEnergy: 8, tier: 5 },
  { id: "bluestar", name: "청색 거성", emoji: "🔵", size: 120, color: "#3b82f6", glowColor: "#3b82f666", tempK: "25,000K", massDesc: "태양의 10배", desc: "엄청 뜨겁고 밝은 거대한 별!", energyNeeded: 5000, energyPerClick: 20, autoEnergy: 15, tier: 6 },
  { id: "redgiant", name: "적색 거성", emoji: "🟠", size: 150, color: "#dc2626", glowColor: "#dc262666", tempK: "3,000K", massDesc: "태양의 100배 크기", desc: "부풀어 오른 늙은 별. 곧 폭발할지도!", energyNeeded: 10000, energyPerClick: 35, autoEnergy: 25, tier: 7 },
  { id: "supergiant", name: "초거성", emoji: "⭐", size: 180, color: "#f59e0b", glowColor: "#f59e0b88", tempK: "3,500K", massDesc: "태양의 1,000배 크기!", desc: "우주에서 가장 큰 별! 베텔기우스급", energyNeeded: 20000, energyPerClick: 50, autoEnergy: 40, tier: 8 },
  { id: "supernova", name: "초신성 폭발", emoji: "💥", size: 200, color: "#ffffff", glowColor: "#ffffff88", tempK: "10억K", massDesc: "은하보다 밝다!", desc: "별이 대폭발! 온 우주가 밝아진다!", energyNeeded: 40000, energyPerClick: 80, autoEnergy: 60, tier: 9 },
  { id: "neutron", name: "중성자별", emoji: "⚪", size: 40, color: "#c4b5fd", glowColor: "#c4b5fdaa", tempK: "100만K", massDesc: "태양의 1.5배 (크기는 도시만함)", desc: "초고밀도! 각설탕 1개가 10억 톤!", energyNeeded: 80000, energyPerClick: 120, autoEnergy: 100, tier: 10 },
  { id: "pulsar", name: "펄서", emoji: "💫", size: 45, color: "#a78bfa", glowColor: "#a78bfaaa", tempK: "100만K", massDesc: "빛의 등대", desc: "빙글빙글 도는 중성자별! 전파를 쏜다", energyNeeded: 150000, energyPerClick: 180, autoEnergy: 150, tier: 11 },
  { id: "blackhole", name: "블랙홀", emoji: "🕳️", size: 90, color: "#1a1a2e", glowColor: "#ff660066", tempK: "???", massDesc: "무한 밀도", desc: "빛도 빠져나올 수 없는 어둠의 구멍!", energyNeeded: 300000, energyPerClick: 300, autoEnergy: 250, tier: 12 },
  { id: "quasar", name: "퀘이사", emoji: "🌟", size: 110, color: "#ffd700", glowColor: "#ffd700aa", tempK: "10조K", massDesc: "은하핵 괴물", desc: "초대질량 블랙홀이 빛을 뿜는다!", energyNeeded: 600000, energyPerClick: 500, autoEnergy: 400, tier: 13 },
  { id: "multiverse", name: "우주 창조", emoji: "🌌", size: 200, color: "#e879f9", glowColor: "#e879f9aa", tempK: "∞", massDesc: "모든 것", desc: "별이 우주 그 자체가 되었다!", energyNeeded: 0, energyPerClick: 1000, autoEnergy: 800, tier: 14 },
];

/* ═══════ 업그레이드 ═══════ */
interface Upgrade {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  baseCost: number;
  maxLevel: number;
  effect: "clickPower" | "autoSpeed" | "critChance" | "critMulti" | "energyMulti";
  value: number;
}

const UPGRADES: Upgrade[] = [
  { id: "gravity", name: "중력 강화", emoji: "🌀", desc: "클릭당 에너지 +2", baseCost: 20, maxLevel: 20, effect: "clickPower", value: 2 },
  { id: "fusion", name: "핵융합 가속", emoji: "⚛️", desc: "자동 에너지 x1.3", baseCost: 50, maxLevel: 15, effect: "autoSpeed", value: 0.3 },
  { id: "darkmat", name: "암흑물질", emoji: "🖤", desc: "크리티컬 확률 +5%", baseCost: 80, maxLevel: 10, effect: "critChance", value: 5 },
  { id: "darken", name: "암흑에너지", emoji: "💜", desc: "크리티컬 배율 +0.5x", baseCost: 100, maxLevel: 10, effect: "critMulti", value: 0.5 },
  { id: "cosmic", name: "우주선", emoji: "☢️", desc: "전체 에너지 +10%", baseCost: 200, maxLevel: 10, effect: "energyMulti", value: 0.1 },
];

/* ═══════ 이벤트 ═══════ */
interface CosmicEvent {
  name: string;
  emoji: string;
  desc: string;
  energyBonus: number;
}
const EVENTS: CosmicEvent[] = [
  { name: "유성우!", emoji: "☄️", desc: "유성우가 에너지를 가져왔다!", energyBonus: 50 },
  { name: "태양풍!", emoji: "🌞", desc: "태양풍이 불어온다!", energyBonus: 80 },
  { name: "성간 먼지!", emoji: "🌫️", desc: "성간 먼지가 합류했다!", energyBonus: 30 },
  { name: "감마선 폭발!", emoji: "⚡", desc: "감마선 폭발! 대량 에너지!", energyBonus: 200 },
  { name: "외계 신호!", emoji: "📡", desc: "외계 문명의 에너지 선물!", energyBonus: 150 },
  { name: "중력파!", emoji: "🌊", desc: "중력파가 별을 강화한다!", energyBonus: 120 },
];

type Screen = "main" | "upgrade" | "history" | "evolve";

export default function StarEvolutionPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [stageIdx, setStageIdx] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [stardust, setStardust] = useState(0); // 업그레이드 화폐
  const [upgradeLevels, setUpgradeLevels] = useState<Record<string, number>>({});
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; text: string; color: string }[]>([]);
  const [cosmicEvent, setCosmicEvent] = useState<CosmicEvent | null>(null);
  const [pulseAnim, setPulseAnim] = useState(false);
  const [evolveAnim, setEvolveAnim] = useState(false);
  const [completedStages, setCompletedStages] = useState<string[]>(["dust"]);
  const particleIdRef = useRef(0);
  const autoRef = useRef<NodeJS.Timeout | null>(null);

  const stage = STAR_STAGES[stageIdx];
  const isMaxStage = stageIdx >= STAR_STAGES.length - 1;

  // 업그레이드 보너스 계산
  const clickBonus = (upgradeLevels["gravity"] || 0) * 2;
  const autoMulti = 1 + (upgradeLevels["fusion"] || 0) * 0.3;
  const critChance = 5 + (upgradeLevels["darkmat"] || 0) * 5;
  const critMulti = 2 + (upgradeLevels["darken"] || 0) * 0.5;
  const energyMulti = 1 + (upgradeLevels["cosmic"] || 0) * 0.1;

  const effectiveClick = Math.floor((stage.energyPerClick + clickBonus) * energyMulti);
  const effectiveAuto = Math.floor(stage.autoEnergy * autoMulti * energyMulti * 10) / 10;

  // 자동 에너지
  useEffect(() => {
    if (effectiveAuto <= 0) return;
    autoRef.current = setInterval(() => {
      setEnergy(e => e + effectiveAuto);
      setTotalEnergy(t => t + effectiveAuto);
    }, 1000);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [effectiveAuto]);

  // 우주 이벤트 (30초마다)
  useEffect(() => {
    const timer = setInterval(() => {
      if (Math.random() < 0.4 && stageIdx >= 2) {
        const evt = EVENTS[Math.floor(Math.random() * EVENTS.length)];
        const bonus = Math.floor(evt.energyBonus * (1 + stageIdx * 0.5) * energyMulti);
        setCosmicEvent(evt);
        setEnergy(e => e + bonus);
        setTotalEnergy(t => t + bonus);
        setTimeout(() => setCosmicEvent(null), 3000);
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [stageIdx, energyMulti]);

  // 클릭
  const clickStar = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const isCrit = Math.random() * 100 < critChance;
    const gained = Math.floor(effectiveClick * (isCrit ? critMulti : 1));

    setEnergy(en => en + gained);
    setTotalEnergy(t => t + gained);
    setStardust(s => s + Math.max(1, Math.floor(gained / 10)));
    setPulseAnim(true);
    setTimeout(() => setPulseAnim(false), 150);

    // 파티클
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const cx = "touches" in e ? e.touches[0]?.clientX || rect.left + rect.width / 2 : e.clientX;
    const cy = "touches" in e ? e.touches[0]?.clientY || rect.top + rect.height / 2 : e.clientY;
    const id = particleIdRef.current++;
    setParticles(prev => [...prev, {
      id, x: cx - rect.left + (Math.random() - 0.5) * 40, y: cy - rect.top,
      text: isCrit ? `⚡${gained}` : `+${gained}`,
      color: isCrit ? "#ffd700" : "#fff",
    }]);
    setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 1000);
  }, [effectiveClick, critChance, critMulti]);

  // 진화
  const evolve = useCallback(() => {
    if (isMaxStage || energy < stage.energyNeeded) return;
    setEvolveAnim(true);
    setTimeout(() => {
      setEnergy(e => e - stage.energyNeeded);
      setStageIdx(i => i + 1);
      const nextStage = STAR_STAGES[stageIdx + 1];
      setCompletedStages(prev => prev.includes(nextStage.id) ? prev : [...prev, nextStage.id]);
      setEvolveAnim(false);
      setScreen("evolve");
    }, 1500);
  }, [isMaxStage, energy, stage, stageIdx]);

  // 업그레이드 구매
  const buyUpgrade = useCallback((upId: string) => {
    const up = UPGRADES.find(u => u.id === upId);
    if (!up) return;
    const lv = upgradeLevels[upId] || 0;
    if (lv >= up.maxLevel) return;
    const cost = Math.floor(up.baseCost * Math.pow(1.5, lv));
    if (stardust < cost) return;
    setStardust(s => s - cost);
    setUpgradeLevels(prev => ({ ...prev, [upId]: lv + 1 }));
  }, [stardust, upgradeLevels]);

  const progress = isMaxStage ? 100 : Math.min(100, Math.floor((energy / stage.energyNeeded) * 100));

  /* ═══════ 메인 ═══════ */
  if (screen === "main") {
    return (
      <div className="min-h-screen text-white p-4 relative overflow-hidden"
        style={{ background: `radial-gradient(ellipse at center, ${stage.glowColor}, #0a0a1a 60%, #000)` }}>
        {/* 배경 별 */}
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} className="absolute bg-white rounded-full" style={{
            width: `${1 + Math.random() * 2}px`, height: `${1 + Math.random() * 2}px`,
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            opacity: 0.3 + Math.random() * 0.5,
            animation: `twinkle ${2 + Math.random() * 3}s infinite`,
          }} />
        ))}

        <div className="max-w-md mx-auto relative z-10">
          <Link href="/" className="text-blue-300 text-sm mb-2 inline-block">← 홈으로</Link>

          {/* 이벤트 배너 */}
          {cosmicEvent && (
            <div className="bg-yellow-900/60 border border-yellow-600 rounded-xl p-2 mb-2 text-center animate-pulse">
              <span className="text-xl">{cosmicEvent.emoji}</span>
              <span className="text-sm font-bold ml-2">{cosmicEvent.name}</span>
              <span className="text-xs text-yellow-300 ml-1">{cosmicEvent.desc}</span>
            </div>
          )}

          {/* 별 정보 */}
          <div className="text-center mb-2">
            <div className="text-xs px-2 py-0.5 rounded-full inline-block mb-1"
              style={{ background: stage.color + "33", color: stage.color }}>
              {STAR_STAGES.indexOf(stage) + 1}/{STAR_STAGES.length} 단계
            </div>
            <h1 className="text-2xl font-black">{stage.name}</h1>
            <p className="text-xs text-gray-400">{stage.desc}</p>
            <div className="text-[10px] text-gray-500 mt-0.5">
              🌡️ {stage.tempK} | ⚖️ {stage.massDesc}
            </div>
          </div>

          {/* 별 클릭 영역 */}
          <div className="flex justify-center mb-3 relative" style={{ minHeight: "200px" }}>
            <button
              onClick={clickStar}
              className="relative select-none focus:outline-none"
              style={{ touchAction: "manipulation" }}>
              {/* 글로우 */}
              <div className="absolute inset-0 rounded-full blur-xl transition-all"
                style={{
                  background: stage.glowColor,
                  transform: `scale(${pulseAnim ? 1.3 : 1.1})`,
                  width: stage.size * 2, height: stage.size * 2,
                  left: -(stage.size / 2), top: -(stage.size / 2),
                }} />
              {/* 별 */}
              <div className={`relative text-center transition-all ${pulseAnim ? "scale-110" : "scale-100"} ${evolveAnim ? "animate-spin" : ""}`}
                style={{ fontSize: `${stage.size}px`, lineHeight: 1 }}>
                {stage.emoji}
              </div>
            </button>

            {/* 파티클 */}
            {particles.map(p => (
              <div key={p.id} className="absolute pointer-events-none font-black text-sm"
                style={{
                  left: `calc(50% + ${p.x - 60}px)`, top: `${p.y}px`,
                  color: p.color,
                  textShadow: "0 0 6px rgba(255,255,255,0.5)",
                  animation: "floatUp 1s ease-out forwards",
                }}>
                {p.text}
              </div>
            ))}
          </div>

          {/* 에너지 바 */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-0.5">
              <span>⚡ 에너지</span>
              <span>{Math.floor(energy).toLocaleString()} / {isMaxStage ? "MAX" : stage.energyNeeded.toLocaleString()}</span>
            </div>
            <div className="bg-gray-800 rounded-full h-5 overflow-hidden">
              <div className="h-5 rounded-full transition-all relative" style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${stage.color}88, ${stage.color})`,
              }}>
                {progress > 15 && <span className="absolute right-2 top-0 text-xs font-bold leading-5">{progress}%</span>}
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
              <span>클릭: +{effectiveClick}/회</span>
              <span>자동: +{effectiveAuto}/초</span>
              <span>💎 {stardust.toLocaleString()}</span>
            </div>
          </div>

          {/* 진화 버튼 */}
          {!isMaxStage ? (
            <button onClick={evolve} disabled={energy < stage.energyNeeded || evolveAnim}
              className={`w-full rounded-xl p-3 font-black text-lg mb-3 transition-all ${
                energy >= stage.energyNeeded
                  ? "bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 animate-pulse"
                  : "bg-gray-800 text-gray-500"
              }`}>
              {evolveAnim ? "✨ 진화 중..." : `⬆️ 진화하기! (${stage.energyNeeded.toLocaleString()})`}
            </button>
          ) : (
            <div className="text-center text-yellow-400 font-black text-lg mb-3 animate-pulse">
              🌌 우주 그 자체가 되었다!
            </div>
          )}

          {/* 메뉴 */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setScreen("upgrade")}
              className="bg-purple-900/50 hover:bg-purple-800/50 rounded-xl p-3 text-center">
              <div className="text-xl">⬆️</div>
              <div className="text-sm font-bold">업그레이드</div>
              <div className="text-[10px] text-purple-300">💎 {stardust.toLocaleString()}</div>
            </button>
            <button onClick={() => setScreen("history")}
              className="bg-blue-900/50 hover:bg-blue-800/50 rounded-xl p-3 text-center">
              <div className="text-xl">📖</div>
              <div className="text-sm font-bold">별 도감</div>
              <div className="text-[10px] text-blue-300">{completedStages.length}/{STAR_STAGES.length}</div>
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes twinkle { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
          @keyframes floatUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-70px) scale(1.3); } }
        `}</style>
      </div>
    );
  }

  /* ═══════ 진화 연출 ═══════ */
  if (screen === "evolve") {
    const newStage = STAR_STAGES[stageIdx];
    return (
      <div className="min-h-screen text-white flex items-center justify-center relative overflow-hidden"
        style={{ background: `radial-gradient(ellipse at center, ${newStage.glowColor}, #0a0a1a 50%, #000)` }}>
        {/* 폭발 파티클 */}
        {Array.from({ length: 20 }, (_, i) => {
          const angle = (i / 20) * Math.PI * 2;
          return (
            <div key={i} className="absolute rounded-full" style={{
              width: "4px", height: "4px",
              background: newStage.color,
              left: "50%", top: "50%",
              animation: `explode${i % 4} 2s ease-out forwards`,
              animationDelay: `${i * 0.05}s`,
            }} />
          );
        })}

        <div className="text-center relative z-10 max-w-sm mx-auto px-4">
          <div className="text-xs text-gray-400 mb-2">⬆️ 진화 완료!</div>
          <div className="mb-4" style={{ fontSize: `${Math.min(newStage.size, 120)}px` }}>
            {newStage.emoji}
          </div>
          <h2 className="text-3xl font-black mb-1" style={{ color: newStage.color }}>{newStage.name}</h2>
          <p className="text-sm text-gray-400 mb-1">{newStage.desc}</p>
          <div className="text-xs text-gray-500 mb-4">🌡️ {newStage.tempK} | ⚖️ {newStage.massDesc}</div>

          <div className="bg-black/40 rounded-xl p-3 mb-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-gray-400 text-xs">클릭 에너지</div>
                <div className="font-bold" style={{ color: newStage.color }}>+{Math.floor((newStage.energyPerClick + clickBonus) * energyMulti)}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs">자동 에너지</div>
                <div className="font-bold" style={{ color: newStage.color }}>+{Math.floor(newStage.autoEnergy * autoMulti * energyMulti * 10) / 10}/초</div>
              </div>
            </div>
          </div>

          {stageIdx < STAR_STAGES.length - 1 ? (
            <div className="text-xs text-gray-500 mb-3">
              다음 단계: {STAR_STAGES[stageIdx + 1].emoji} {STAR_STAGES[stageIdx + 1].name}
            </div>
          ) : (
            <div className="text-yellow-400 font-bold mb-3">🌌 최종 단계 도달!</div>
          )}

          <button onClick={() => setScreen("main")}
            className="w-full rounded-xl p-3 font-bold" style={{ background: newStage.color + "88" }}>
            계속하기
          </button>
        </div>

        <style jsx>{`
          @keyframes explode0 { 0% { transform: translate(0,0) scale(1); opacity:1; } 100% { transform: translate(100px,-80px) scale(0); opacity:0; } }
          @keyframes explode1 { 0% { transform: translate(0,0) scale(1); opacity:1; } 100% { transform: translate(-90px,-100px) scale(0); opacity:0; } }
          @keyframes explode2 { 0% { transform: translate(0,0) scale(1); opacity:1; } 100% { transform: translate(80px,90px) scale(0); opacity:0; } }
          @keyframes explode3 { 0% { transform: translate(0,0) scale(1); opacity:1; } 100% { transform: translate(-100px,70px) scale(0); opacity:0; } }
        `}</style>
      </div>
    );
  }

  /* ═══════ 업그레이드 ═══════ */
  if (screen === "upgrade") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-indigo-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-purple-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-1">⬆️ 업그레이드</h2>
          <div className="text-center text-purple-300 font-bold mb-4">💎 {stardust.toLocaleString()} 별가루</div>

          <div className="space-y-3">
            {UPGRADES.map(up => {
              const lv = upgradeLevels[up.id] || 0;
              const maxed = lv >= up.maxLevel;
              const cost = Math.floor(up.baseCost * Math.pow(1.5, lv));
              const affordable = stardust >= cost;

              return (
                <div key={up.id} className="bg-black/30 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{up.emoji}</span>
                    <div className="flex-1">
                      <div className="font-bold">{up.name} <span className="text-yellow-400">Lv.{lv}</span></div>
                      <div className="text-xs text-gray-400">{up.desc}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-2">
                    {Array.from({ length: up.maxLevel }, (_, i) => (
                      <div key={i} className={`flex-1 h-1.5 rounded-full ${i < lv ? "bg-purple-500" : "bg-gray-700"}`} />
                    ))}
                  </div>
                  {!maxed ? (
                    <button onClick={() => buyUpgrade(up.id)} disabled={!affordable}
                      className={`w-full py-2 rounded-lg text-sm font-bold ${
                        affordable ? "bg-purple-600 hover:bg-purple-500" : "bg-gray-700 text-gray-500"
                      }`}>
                      💎 {cost.toLocaleString()} 별가루
                    </button>
                  ) : (
                    <div className="text-center text-yellow-400 text-sm font-bold py-1">✨ MAX!</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════ 별 도감 ═══════ */
  if (screen === "history") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-blue-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">📖 별 진화 도감</h2>
          <p className="text-center text-sm text-blue-300 mb-4">{completedStages.length}/{STAR_STAGES.length} 발견</p>

          <div className="space-y-2">
            {STAR_STAGES.map((s, i) => {
              const disc = completedStages.includes(s.id);
              const isCurrent = i === stageIdx;
              return (
                <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl ${
                  isCurrent ? "border-2" : disc ? "bg-black/20" : "bg-gray-900/30 opacity-40"
                }`} style={{ borderColor: isCurrent ? s.color : "transparent", background: isCurrent ? s.color + "15" : undefined }}>
                  <div className="text-3xl w-12 text-center">{disc ? s.emoji : "❓"}</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm" style={{ color: disc ? s.color : "#666" }}>
                      {disc ? s.name : "???"} {isCurrent && "← 현재"}
                    </div>
                    {disc ? (
                      <>
                        <div className="text-xs text-gray-400">{s.desc}</div>
                        <div className="text-[10px] text-gray-500">🌡️ {s.tempK} | ⚖️ {s.massDesc}</div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-600">아직 발견하지 못했어요</div>
                    )}
                  </div>
                  {disc && <div className="text-xs px-2 py-0.5 rounded-full" style={{ background: s.color + "33", color: s.color }}>Tier {s.tier}</div>}
                </div>
              );
            })}
          </div>

          {/* 진화 경로 */}
          <div className="mt-4 bg-black/30 rounded-xl p-3">
            <h3 className="text-sm font-bold text-center mb-2">🔄 별의 일생</h3>
            <div className="text-xs text-gray-400 text-center leading-relaxed">
              우주먼지 → 성운 → 원시별 → 아기별 → 적색왜성 → 태양 → 청색거성 → 적색거성 → 초거성 → 초신성 폭발💥 → 중성자별 → 펄서 → 블랙홀 → 퀘이사 → 우주 창조🌌
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
