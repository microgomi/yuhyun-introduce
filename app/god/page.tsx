'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

// ========== TYPES ==========
interface Star {
  id: number;
  x: number;
  y: number;
  type: number; // 0-3
  power: number;
}

interface Planet {
  id: number;
  starId: number;
  type: number; // 0-4
  hasWater: boolean;
  hasAtmo: boolean;
  tempOk: boolean;
  habitable: boolean;
  orbitAngle: number;
  orbitRadius: number;
}

interface LifeWorld {
  planetId: number;
  stage: number; // 0-7 evolution stages
  evolving: boolean;
  progress: number;
}

interface CivStats {
  population: number;
  tech: number;
  happiness: number;
  military: number;
  choices: string[];
  wonders: string[];
}

interface CosmicSystem {
  id: number;
  name: string;
  stars: number;
  planets: number;
  megaStructures: string[];
}

// ========== CONSTANTS ==========
const STAR_TYPES = [
  { name: '백색왜성', emoji: '⚪', power: 2, color: '#ffffff' },
  { name: '적색거성', emoji: '🔴', power: 5, color: '#ff4444' },
  { name: '청색거성', emoji: '🔵', power: 8, color: '#4488ff' },
  { name: '초신성', emoji: '💥', power: 15, color: '#ffaa00' },
];

const PLANET_TYPES = [
  { name: '바위행성', emoji: '🪨', cost: 50 },
  { name: '가스행성', emoji: '🟤', cost: 80 },
  { name: '얼음행성', emoji: '🧊', cost: 60 },
  { name: '물행성', emoji: '🌊', cost: 100 },
  { name: '용암행성', emoji: '🌋', cost: 70 },
];

const EVOLUTION = [
  { name: '미생물', emoji: '🦠', cost: 100 },
  { name: '식물', emoji: '🌱', cost: 200 },
  { name: '곤충', emoji: '🐛', cost: 350 },
  { name: '물고기', emoji: '🐟', cost: 500 },
  { name: '공룡', emoji: '🦕', cost: 800 },
  { name: '포유류', emoji: '🐕', cost: 1200 },
  { name: '유인원', emoji: '🐵', cost: 1800 },
  { name: '인간', emoji: '👤', cost: 2500 },
];

const CIV_CHOICES = [
  { a: '농업 🌾', b: '수렵 🏹', key: 'economy' },
  { a: '과학 🔬', b: '마법 🔮', key: 'knowledge' },
  { a: '평화 🕊️', b: '전쟁 ⚔️', key: 'diplomacy' },
  { a: '자연 🌿', b: '기술 ⚙️', key: 'path' },
];

const WONDERS = ['피라미드', '만리장성', '콜로세움', '타지마할', '우주정거장'];

const RANDOM_EVENTS_LIFE = [
  { name: '운석 충돌 ☄️', cost: 300 },
  { name: '빙하기 🧊', cost: 200 },
  { name: '화산 폭발 🌋', cost: 150 },
];

const RANDOM_EVENTS_CIV = [
  { name: '전쟁 발발 ⚔️', cost: 500 },
  { name: '전염병 🦠', cost: 400 },
  { name: '혁명 ✊', cost: 300 },
  { name: '위대한 발명 💡', cost: 0, bonus: 1000 },
];

const MEGA_STRUCTURES = [
  { name: '다이슨 구', cost: 5000, power: 100 },
  { name: '링월드', cost: 8000, power: 150 },
  { name: '인공 행성', cost: 10000, power: 200 },
];

const STAGE_NAMES = ['탄생', '별 만들기', '행성 창조', '생명 창조', '문명 발전', '우주 확장', '초월'];
const STAGE_THRESHOLDS = [100, 500, 2000, 5000, 15000, 50000, 0];

export default function GodPage() {
  // Core state
  const [stage, setStage] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [divinePower, setDivinePower] = useState(0);
  const [powerPerSec, setPowerPerSec] = useState(0);
  const [sparkScale, setSparkScale] = useState(1);

  // Stage 2: Stars
  const [stars, setStars] = useState<Star[]>([]);
  const [selectedStarType, setSelectedStarType] = useState(0);

  // Stage 3: Planets
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [selectedPlanetType, setSelectedPlanetType] = useState(0);
  const [selectedStar, setSelectedStar] = useState<number | null>(null);

  // Stage 4: Life
  const [lifeWorlds, setLifeWorlds] = useState<LifeWorld[]>([]);
  const [activeEvent, setActiveEvent] = useState<{ name: string; cost: number } | null>(null);

  // Stage 5: Civilization
  const [civStats, setCivStats] = useState<CivStats>({
    population: 100,
    tech: 1,
    happiness: 50,
    military: 10,
    choices: [],
    wonders: [],
  });
  const [civEvent, setCivEvent] = useState<{ name: string; cost: number; bonus?: number } | null>(null);

  // Stage 6: Cosmic
  const [cosmicSystems, setCosmicSystems] = useState<CosmicSystem[]>([]);

  // Stage 7: Transcendence
  const [divineTitle, setDivineTitle] = useState('');

  // UI state
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [message, setMessage] = useState('');
  const [totalSpecies, setTotalSpecies] = useState(0);

  const nextId = useRef(1);
  const getId = () => nextId.current++;

  // ========== PASSIVE INCOME ==========
  useEffect(() => {
    let rate = 0;
    stars.forEach((s) => (rate += STAR_TYPES[s.type].power));
    planets.forEach((p) => (rate += p.habitable ? 10 : 3));
    lifeWorlds.forEach((lw) => (rate += (lw.stage + 1) * 5));
    if (stage >= 5) rate += civStats.population * 0.01 + civStats.tech * 2;
    cosmicSystems.forEach((cs) => {
      rate += cs.stars * 20 + cs.planets * 10;
      cs.megaStructures.forEach((ms) => {
        const m = MEGA_STRUCTURES.find((x) => x.name === ms);
        if (m) rate += m.power;
      });
    });
    setPowerPerSec(Math.floor(rate));
  }, [stars, planets, lifeWorlds, stage, civStats, cosmicSystems]);

  useEffect(() => {
    if (stage < 1) return;
    const interval = setInterval(() => {
      setDivinePower((p) => p + powerPerSec);
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, powerPerSec]);

  // Evolution timer
  useEffect(() => {
    const interval = setInterval(() => {
      setLifeWorlds((prev) =>
        prev.map((lw) => {
          if (!lw.evolving) return lw;
          const np = lw.progress + 2;
          if (np >= 100) {
            return { ...lw, stage: lw.stage + 1, evolving: false, progress: 0 };
          }
          return { ...lw, progress: np };
        })
      );
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Random events
  useEffect(() => {
    if (stage === 3 && !activeEvent) {
      const t = setInterval(() => {
        if (Math.random() < 0.15) {
          const ev = RANDOM_EVENTS_LIFE[Math.floor(Math.random() * RANDOM_EVENTS_LIFE.length)];
          setActiveEvent(ev);
        }
      }, 5000);
      return () => clearInterval(t);
    }
    if (stage === 4 && !civEvent) {
      const t = setInterval(() => {
        if (Math.random() < 0.12) {
          const ev = RANDOM_EVENTS_CIV[Math.floor(Math.random() * RANDOM_EVENTS_CIV.length)];
          setCivEvent(ev);
        }
      }, 6000);
      return () => clearInterval(t);
    }
  }, [stage, activeEvent, civEvent]);

  // Planet orbit animation
  useEffect(() => {
    const interval = setInterval(() => {
      setPlanets((prev) =>
        prev.map((p) => ({ ...p, orbitAngle: (p.orbitAngle + 2) % 360 }))
      );
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Civ passive growth
  useEffect(() => {
    if (stage !== 4) return;
    const interval = setInterval(() => {
      setCivStats((prev) => ({
        ...prev,
        population: Math.min(prev.population + Math.floor(prev.population * 0.02), 999999),
        tech: prev.tech + (prev.choices.includes('과학 🔬') ? 2 : 1),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [stage]);

  // ========== STAGE TRANSITIONS ==========
  const checkAdvance = useCallback(
    (dp: number) => {
      if (stage >= 6) return;
      const threshold = STAGE_THRESHOLDS[stage + 1];
      if (threshold && dp >= threshold && stage >= 1) {
        setShowLevelUp(true);
        setTimeout(() => {
          setStage((s) => s + 1);
          setShowLevelUp(false);
          if (stage + 1 === 6) {
            // Calculate divine title
            const choices = civStats.choices;
            let title = '창조의 신';
            if (choices.includes('전쟁 ⚔️') && choices.includes('기술 ⚙️')) title = '파괴의 신';
            else if (choices.includes('과학 🔬') && choices.includes('평화 🕊️')) title = '지혜의 신';
            else if (choices.includes('자연 🌿')) title = '자연의 신';
            else if (choices.includes('기술 ⚙️')) title = '기술의 신';
            setDivineTitle(title);
          }
        }, 2000);
      }
    },
    [stage, civStats.choices]
  );

  useEffect(() => {
    checkAdvance(divinePower);
  }, [divinePower, checkAdvance]);

  // ========== STAGE 1: Birth ==========
  const handleSparkClick = () => {
    const newE = energy + 3;
    setEnergy(Math.min(newE, 100));
    setSparkScale((s) => Math.min(s + 0.08, 3));
    if (newE >= 100 && stage === 0) {
      setShowLevelUp(true);
      setTimeout(() => {
        setStage(1);
        setShowLevelUp(false);
        setMessage('별의 씨앗이 되었습니다! 우주에 별을 배치하세요!');
        setTimeout(() => setMessage(''), 3000);
      }, 2000);
    }
  };

  // ========== STAGE 2: Stars ==========
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (stage !== 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const cost = (selectedStarType + 1) * 20;
    if (divinePower >= cost || stars.length === 0) {
      setDivinePower((p) => Math.max(0, p - cost));
      setStars((prev) => [
        ...prev,
        { id: getId(), x, y, type: selectedStarType, power: STAR_TYPES[selectedStarType].power },
      ]);
    } else {
      setMessage('신력이 부족합니다!');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  // ========== STAGE 3: Planets ==========
  const createPlanet = () => {
    if (selectedStar === null) {
      setMessage('먼저 별을 선택하세요!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    const pt = PLANET_TYPES[selectedPlanetType];
    if (divinePower < pt.cost) {
      setMessage('신력이 부족합니다!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    setDivinePower((p) => p - pt.cost);
    const existingCount = planets.filter((p) => p.starId === selectedStar).length;
    const newPlanet: Planet = {
      id: getId(),
      starId: selectedStar,
      type: selectedPlanetType,
      hasWater: selectedPlanetType === 3,
      hasAtmo: selectedPlanetType === 0 || selectedPlanetType === 1,
      tempOk: selectedPlanetType === 0 || selectedPlanetType === 3,
      habitable: false,
      orbitAngle: Math.random() * 360,
      orbitRadius: 30 + existingCount * 18,
    };
    newPlanet.habitable = newPlanet.hasWater && newPlanet.hasAtmo && newPlanet.tempOk;
    if (newPlanet.habitable) {
      setMessage('생명이 가능한 행성을 창조했습니다! 🌍');
      setTimeout(() => setMessage(''), 3000);
    }
    setPlanets((prev) => [...prev, newPlanet]);
  };

  const toggleElement = (planetId: number, element: 'water' | 'atmo' | 'temp') => {
    const cost = 30;
    if (divinePower < cost) return;
    setDivinePower((p) => p - cost);
    setPlanets((prev) =>
      prev.map((p) => {
        if (p.id !== planetId) return p;
        const np = { ...p };
        if (element === 'water') np.hasWater = true;
        if (element === 'atmo') np.hasAtmo = true;
        if (element === 'temp') np.tempOk = true;
        np.habitable = np.hasWater && np.hasAtmo && np.tempOk;
        return np;
      })
    );
  };

  // ========== STAGE 4: Life ==========
  const seedLife = (planetId: number) => {
    if (lifeWorlds.find((lw) => lw.planetId === planetId)) return;
    if (divinePower < 100) {
      setMessage('신력이 부족합니다!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    setDivinePower((p) => p - 100);
    setLifeWorlds((prev) => [...prev, { planetId, stage: 0, evolving: false, progress: 0 }]);
    setTotalSpecies((s) => s + 1);
  };

  const evolveLife = (planetId: number) => {
    setLifeWorlds((prev) =>
      prev.map((lw) => {
        if (lw.planetId !== planetId || lw.evolving || lw.stage >= 7) return lw;
        const cost = EVOLUTION[lw.stage + 1]?.cost || 0;
        if (divinePower < cost) return lw;
        setDivinePower((p) => p - cost);
        setTotalSpecies((s) => s + 1);
        return { ...lw, evolving: true, progress: 0 };
      })
    );
  };

  const handleLifeEvent = (save: boolean) => {
    if (!activeEvent) return;
    if (save) {
      if (divinePower >= activeEvent.cost) {
        setDivinePower((p) => p - activeEvent.cost);
        setMessage('생명을 구했습니다! 🛡️');
      } else {
        setMessage('신력이 부족합니다... 생명이 위험합니다!');
        setLifeWorlds((prev) => prev.map((lw) => ({ ...lw, stage: Math.max(0, lw.stage - 1) })));
      }
    } else {
      setLifeWorlds((prev) => prev.map((lw) => ({ ...lw, stage: Math.max(0, lw.stage - 1) })));
      setMessage('생명이 큰 피해를 입었습니다... 😢');
    }
    setActiveEvent(null);
    setTimeout(() => setMessage(''), 3000);
  };

  // ========== STAGE 5: Civilization ==========
  const makeCivChoice = (choice: string) => {
    if (civStats.choices.length >= 4) return;
    const cost = 500;
    if (divinePower < cost) {
      setMessage('신력이 부족합니다!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    setDivinePower((p) => p - cost);
    setCivStats((prev) => {
      const nc = { ...prev, choices: [...prev.choices, choice] };
      if (choice.includes('농업')) nc.population += 500;
      if (choice.includes('수렵')) nc.military += 20;
      if (choice.includes('과학')) nc.tech += 50;
      if (choice.includes('마법')) nc.happiness += 30;
      if (choice.includes('평화')) nc.happiness += 40;
      if (choice.includes('전쟁')) nc.military += 50;
      if (choice.includes('자연')) nc.happiness += 20;
      if (choice.includes('기술')) nc.tech += 80;
      return nc;
    });
  };

  const buildWonder = (wonder: string) => {
    if (civStats.wonders.includes(wonder)) return;
    const cost = 1000;
    if (divinePower < cost) {
      setMessage('신력이 부족합니다!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    setDivinePower((p) => p - cost);
    setCivStats((prev) => ({ ...prev, wonders: [...prev.wonders, wonder] }));
    setMessage(`${wonder} 건설 완료! 🏛️`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCivEvent = (deal: boolean) => {
    if (!civEvent) return;
    if (deal) {
      if (civEvent.bonus) {
        setDivinePower((p) => p + civEvent.bonus);
        setMessage(`축하합니다! +${civEvent.bonus} 신력!`);
      } else if (divinePower >= civEvent.cost) {
        setDivinePower((p) => p - civEvent.cost);
        setMessage('위기를 극복했습니다!');
      } else {
        setCivStats((prev) => ({
          ...prev,
          population: Math.max(10, prev.population - 100),
          happiness: Math.max(0, prev.happiness - 20),
        }));
        setMessage('신력이 부족하여 피해가 발생했습니다...');
      }
    } else {
      setCivStats((prev) => ({
        ...prev,
        population: Math.max(10, prev.population - 200),
        happiness: Math.max(0, prev.happiness - 10),
      }));
      setMessage('문명이 피해를 입었습니다...');
    }
    setCivEvent(null);
    setTimeout(() => setMessage(''), 3000);
  };

  // ========== STAGE 6: Cosmic ==========
  const createStarSystem = () => {
    const cost = 3000;
    if (divinePower < cost) {
      setMessage('신력이 부족합니다!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    setDivinePower((p) => p - cost);
    const names = ['안드로메다', '오리온', '페가수스', '카시오페아', '용자리', '사자자리', '독수리자리', '백조자리'];
    setCosmicSystems((prev) => [
      ...prev,
      {
        id: getId(),
        name: names[prev.length % names.length] + ` ${prev.length + 1}`,
        stars: Math.floor(Math.random() * 5) + 3,
        planets: Math.floor(Math.random() * 10) + 5,
        megaStructures: [],
      },
    ]);
  };

  const buildMegaStructure = (systemId: number, structure: string) => {
    const ms = MEGA_STRUCTURES.find((m) => m.name === structure);
    if (!ms || divinePower < ms.cost) {
      setMessage('신력이 부족합니다!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    setDivinePower((p) => p - ms.cost);
    setCosmicSystems((prev) =>
      prev.map((cs) => {
        if (cs.id !== systemId) return cs;
        if (cs.megaStructures.includes(structure)) return cs;
        return { ...cs, megaStructures: [...cs.megaStructures, structure] };
      })
    );
    setMessage(`${structure} 건설 완료!`);
    setTimeout(() => setMessage(''), 3000);
  };

  // ========== STAGE 7: Reset ==========
  const resetUniverse = () => {
    setStage(0);
    setEnergy(0);
    setDivinePower(500); // bonus
    setSparkScale(1);
    setStars([]);
    setPlanets([]);
    setLifeWorlds([]);
    setCivStats({ population: 100, tech: 1, happiness: 50, military: 10, choices: [], wonders: [] });
    setCosmicSystems([]);
    setActiveEvent(null);
    setCivEvent(null);
    setMessage('우주가 재탄생했습니다! 보너스 500 신력!');
    setTimeout(() => setMessage(''), 3000);
  };

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-purple-950 to-black text-white overflow-hidden relative">
      {/* Background stars */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.7 + 0.1,
              animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite ${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
          50% { box-shadow: 0 0 60px rgba(255, 215, 0, 0.9), 0 0 100px rgba(255, 215, 0, 0.3); }
        }
        @keyframes level-up {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spark-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.5); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(var(--orbit-r)) rotate(0deg); }
          to { transform: rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes cosmic-bg {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* Level Up Animation */}
      {showLevelUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div
            className="text-center"
            style={{ animation: 'level-up 2s ease-out' }}
          >
            <div className="text-8xl mb-6">
              {stage === 0 ? '⭐' : stage === 1 ? '🌟' : stage === 2 ? '🪐' : stage === 3 ? '🧬' : stage === 4 ? '🏛️' : stage === 5 ? '🌌' : '👑'}
            </div>
            <div className="text-4xl font-bold text-yellow-400 mb-2">
              {stage < 6 ? `${STAGE_NAMES[stage + 1]} 단계 해금!` : '초월!'}
            </div>
            <div className="text-xl text-yellow-200">신의 힘이 성장합니다...</div>
          </div>
        </div>
      )}

      {/* Message Toast */}
      {message && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-yellow-900/90 border border-yellow-500 text-yellow-200 px-6 py-3 rounded-xl text-lg font-bold shadow-lg shadow-yellow-500/20">
          {message}
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 p-4">
        <div className="flex items-center justify-between mb-2">
          <Link href="/" className="text-yellow-400 hover:text-yellow-300 font-bold text-lg">
            ← 홈으로
          </Link>
          <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500">
            ✨ 신 되기 ✨
          </h1>
          <div className="text-sm text-purple-300">Stage {stage + 1}/7</div>
        </div>

        {/* Stage Progress Bar */}
        <div className="flex gap-1 mb-3">
          {STAGE_NAMES.map((name, i) => (
            <div key={i} className="flex-1">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  i <= stage
                    ? 'bg-gradient-to-r from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/30'
                    : 'bg-gray-800'
                }`}
              />
              <div className={`text-[10px] text-center mt-1 ${i <= stage ? 'text-yellow-400' : 'text-gray-600'}`}>
                {name}
              </div>
            </div>
          ))}
        </div>

        {/* Stats Bar */}
        {stage >= 1 && (
          <div className="flex items-center justify-center gap-6 bg-black/50 rounded-xl p-3 border border-yellow-900/50 mb-3">
            <div className="text-center">
              <div className="text-yellow-400 text-2xl font-black" style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}>
                ⚡ {Math.floor(divinePower).toLocaleString()}
              </div>
              <div className="text-xs text-yellow-600">신력</div>
            </div>
            <div className="text-center">
              <div className="text-amber-400 text-lg font-bold">+{powerPerSec}/초</div>
              <div className="text-xs text-amber-600">생성률</div>
            </div>
            <div className="text-center">
              <div className="text-purple-400 text-lg font-bold">⭐ {stars.length}</div>
              <div className="text-xs text-purple-600">별</div>
            </div>
            <div className="text-center">
              <div className="text-blue-400 text-lg font-bold">🪐 {planets.length}</div>
              <div className="text-xs text-blue-600">행성</div>
            </div>
          </div>
        )}

        {/* Next stage threshold */}
        {stage >= 1 && stage < 6 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>다음 단계: {STAGE_NAMES[stage + 1]}</span>
              <span>{Math.floor(divinePower).toLocaleString()} / {STAGE_THRESHOLDS[stage + 1].toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (divinePower / STAGE_THRESHOLDS[stage + 1]) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Game Area */}
      <div className="relative z-10 px-4 pb-8">
        {/* ==================== STAGE 0: BIRTH ==================== */}
        {stage === 0 && (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
            <div className="text-purple-400 text-lg mb-8 text-center">
              어둠 속에서 빛의 점이 태어났습니다...<br />
              클릭하여 에너지를 모으세요!
            </div>

            <div
              onClick={handleSparkClick}
              className="cursor-pointer select-none relative"
              style={{
                width: 120 * sparkScale,
                height: 120 * sparkScale,
                transition: 'all 0.1s',
              }}
            >
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-300 to-amber-400"
                style={{
                  animation: 'spark-pulse 1s ease-in-out infinite',
                  boxShadow: `0 0 ${30 * sparkScale}px rgba(255, 215, 0, 0.7), 0 0 ${60 * sparkScale}px rgba(255, 215, 0, 0.3), 0 0 ${100 * sparkScale}px rgba(255, 215, 0, 0.1)`,
                }}
              />
            </div>

            <div className="mt-8 w-64">
              <div className="flex justify-between text-sm text-yellow-400 mb-1">
                <span>에너지</span>
                <span>{energy}/100</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full transition-all"
                  style={{ width: `${energy}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ==================== STAGE 1: CREATE STARS ==================== */}
        {stage === 1 && (
          <div>
            <div className="text-center text-purple-300 mb-3 text-sm">
              우주의 캔버스를 클릭하여 별을 배치하세요!
            </div>

            {/* Star type selector */}
            <div className="flex gap-2 justify-center mb-3 flex-wrap">
              {STAR_TYPES.map((st, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedStarType(i)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    selectedStarType === i
                      ? 'bg-yellow-600 border-2 border-yellow-400 shadow-lg shadow-yellow-500/30'
                      : 'bg-gray-800 border-2 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {st.emoji} {st.name}
                  <div className="text-[10px] text-gray-400">+{st.power}/초 | {(i + 1) * 20} 신력</div>
                </button>
              ))}
            </div>

            {/* Star Canvas */}
            <div
              onClick={handleCanvasClick}
              className="relative w-full bg-black/60 rounded-2xl border border-purple-900/50 cursor-crosshair overflow-hidden"
              style={{ height: '50vh' }}
            >
              {stars.map((star) => (
                <div
                  key={star.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${star.x}%`,
                    top: `${star.y}%`,
                    animation: 'twinkle 2s ease-in-out infinite',
                  }}
                >
                  <div className="text-2xl">{STAR_TYPES[star.type].emoji}</div>
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      boxShadow: `0 0 20px ${STAR_TYPES[star.type].color}, 0 0 40px ${STAR_TYPES[star.type].color}40`,
                    }}
                  />
                </div>
              ))}
              {stars.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-lg">
                  여기를 클릭하여 첫 번째 별을 만드세요
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== STAGE 2: CREATE PLANETS ==================== */}
        {stage === 2 && (
          <div>
            <div className="text-center text-purple-300 mb-3 text-sm">
              별을 선택하고 행성을 창조하세요! 물 + 대기 + 온도 = 생명 가능!
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Stars list - select a star */}
              <div className="bg-black/40 rounded-xl p-3 border border-purple-900/50">
                <h3 className="text-yellow-400 font-bold mb-2">⭐ 별 목록 (클릭하여 선택)</h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {stars.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStar(s.id)}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                        selectedStar === s.id ? 'bg-yellow-900/50 border border-yellow-600' : 'bg-gray-900/50 hover:bg-gray-800'
                      }`}
                    >
                      {STAR_TYPES[s.type].emoji} {STAR_TYPES[s.type].name} #{s.id}
                      <span className="text-gray-500 ml-2">({planets.filter((p) => p.starId === s.id).length}행성)</span>
                    </button>
                  ))}
                </div>

                {/* Planet type selector */}
                <h3 className="text-blue-400 font-bold mt-3 mb-2">🪐 행성 유형</h3>
                <div className="flex flex-wrap gap-1.5">
                  {PLANET_TYPES.map((pt, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPlanetType(i)}
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        selectedPlanetType === i
                          ? 'bg-blue-700 border border-blue-400'
                          : 'bg-gray-800 border border-gray-700'
                      }`}
                    >
                      {pt.emoji} {pt.name} ({pt.cost})
                    </button>
                  ))}
                </div>
                <button
                  onClick={createPlanet}
                  className="mt-2 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 py-2 rounded-lg font-bold text-sm"
                >
                  행성 창조! 🪐
                </button>
              </div>

              {/* Visual - Star system with orbiting planets */}
              <div className="bg-black/60 rounded-xl border border-purple-900/50 relative overflow-hidden" style={{ minHeight: 300 }}>
                {selectedStar !== null && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Central star */}
                    <div className="text-4xl relative z-10" style={{ animation: 'spark-pulse 2s ease-in-out infinite' }}>
                      {STAR_TYPES[stars.find((s) => s.id === selectedStar)?.type || 0].emoji}
                    </div>
                    {/* Orbiting planets */}
                    {planets
                      .filter((p) => p.starId === selectedStar)
                      .map((p, i) => {
                        const angle = (p.orbitAngle * Math.PI) / 180;
                        const r = 50 + i * 35;
                        const px = Math.cos(angle) * r;
                        const py = Math.sin(angle) * r * 0.6;
                        return (
                          <div key={p.id}>
                            {/* Orbit ring */}
                            <div
                              className="absolute rounded-full border border-gray-800/50"
                              style={{
                                width: r * 2,
                                height: r * 1.2,
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                              }}
                            />
                            {/* Planet */}
                            <div
                              className="absolute text-xl transform -translate-x-1/2 -translate-y-1/2"
                              style={{
                                left: `calc(50% + ${px}px)`,
                                top: `calc(50% + ${py}px)`,
                              }}
                            >
                              <div className="relative">
                                {PLANET_TYPES[p.type].emoji}
                                {p.habitable && (
                                  <div className="absolute -top-1 -right-1 text-[8px]">✨</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
                {selectedStar === null && (
                  <div className="flex items-center justify-center h-full text-gray-600">왼쪽에서 별을 선택하세요</div>
                )}
              </div>
            </div>

            {/* Planet details with element toggles */}
            {planets.length > 0 && (
              <div className="mt-3 bg-black/40 rounded-xl p-3 border border-purple-900/50">
                <h3 className="text-green-400 font-bold mb-2">행성 관리 (원소 추가: 30 신력)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {planets.map((p) => (
                    <div key={p.id} className={`p-2 rounded-lg text-xs ${p.habitable ? 'bg-green-900/30 border border-green-700' : 'bg-gray-900/50 border border-gray-800'}`}>
                      <div className="font-bold">{PLANET_TYPES[p.type].emoji} {PLANET_TYPES[p.type].name} #{p.id}</div>
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => toggleElement(p.id, 'water')}
                          className={`px-1.5 py-0.5 rounded ${p.hasWater ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-500'}`}
                        >
                          💧물
                        </button>
                        <button
                          onClick={() => toggleElement(p.id, 'atmo')}
                          className={`px-1.5 py-0.5 rounded ${p.hasAtmo ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-500'}`}
                        >
                          🌬대기
                        </button>
                        <button
                          onClick={() => toggleElement(p.id, 'temp')}
                          className={`px-1.5 py-0.5 rounded ${p.tempOk ? 'bg-orange-700 text-white' : 'bg-gray-800 text-gray-500'}`}
                        >
                          🌡온도
                        </button>
                      </div>
                      {p.habitable && <div className="text-green-400 mt-1 font-bold">생명 가능! 🌍</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== STAGE 3: CREATE LIFE ==================== */}
        {stage === 3 && (
          <div>
            <div className="text-center text-purple-300 mb-3 text-sm">
              생명이 가능한 행성에 생명을 심고 진화시키세요!
            </div>

            {/* Random Event Popup */}
            {activeEvent && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
                <div className="bg-gradient-to-b from-red-900 to-red-950 border-2 border-red-500 rounded-2xl p-6 max-w-sm text-center shadow-2xl">
                  <div className="text-4xl mb-3">⚠️</div>
                  <div className="text-xl font-bold text-red-300 mb-2">{activeEvent.name}</div>
                  <div className="text-sm text-red-200 mb-4">
                    생명이 위험합니다! 신력 {activeEvent.cost}을 사용하여 구하시겠습니까?
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => handleLifeEvent(true)}
                      className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg font-bold"
                    >
                      구한다! 🛡️ (-{activeEvent.cost})
                    </button>
                    <button
                      onClick={() => handleLifeEvent(false)}
                      className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-bold"
                    >
                      방관한다...
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Habitable planets with life */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {planets.filter((p) => p.habitable).map((planet) => {
                const lw = lifeWorlds.find((l) => l.planetId === planet.id);
                return (
                  <div
                    key={planet.id}
                    className="bg-black/40 rounded-xl p-4 border border-green-900/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold">
                        🌍 행성 #{planet.id}
                      </span>
                      {!lw && (
                        <button
                          onClick={() => seedLife(planet.id)}
                          className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm font-bold"
                        >
                          생명 심기 🦠 (100)
                        </button>
                      )}
                    </div>

                    {lw && (
                      <div>
                        {/* Evolution tree */}
                        <div className="flex items-center gap-1 flex-wrap mb-2">
                          {EVOLUTION.map((evo, i) => (
                            <div
                              key={i}
                              className={`text-center px-1.5 py-1 rounded text-xs ${
                                i < lw.stage
                                  ? 'bg-green-800 text-green-300'
                                  : i === lw.stage
                                  ? 'bg-yellow-700 text-yellow-300 border border-yellow-500'
                                  : 'bg-gray-900 text-gray-600'
                              }`}
                            >
                              <div className="text-lg">{evo.emoji}</div>
                              <div>{evo.name}</div>
                            </div>
                          ))}
                        </div>

                        {/* Evolution progress */}
                        {lw.evolving && (
                          <div className="mb-2">
                            <div className="text-xs text-yellow-400 mb-1">진화 중... {lw.progress}%</div>
                            <div className="w-full bg-gray-800 rounded-full h-2">
                              <div
                                className="h-full bg-gradient-to-r from-green-500 to-yellow-400 rounded-full transition-all"
                                style={{ width: `${lw.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {!lw.evolving && lw.stage < 7 && (
                          <button
                            onClick={() => evolveLife(planet.id)}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 px-4 py-1.5 rounded-lg text-sm font-bold"
                          >
                            진화! → {EVOLUTION[lw.stage + 1]?.emoji} {EVOLUTION[lw.stage + 1]?.name} ({EVOLUTION[lw.stage + 1]?.cost} 신력)
                          </button>
                        )}

                        {lw.stage >= 7 && (
                          <div className="text-yellow-400 font-bold text-center py-2" style={{ animation: 'float 2s ease-in-out infinite' }}>
                            👤 인간이 탄생했습니다! 문명의 시작!
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {planets.filter((p) => p.habitable).length === 0 && (
                <div className="col-span-full text-center text-gray-500 py-12">
                  생명이 가능한 행성이 없습니다.<br />
                  이전 단계에서 행성에 물 + 대기 + 온도를 부여하세요.
                </div>
              )}
            </div>

            {/* Non-habitable planets summary */}
            {planets.filter((p) => !p.habitable).length > 0 && (
              <div className="mt-3 text-xs text-gray-500 text-center">
                생명 불가능한 행성 {planets.filter((p) => !p.habitable).length}개 (원소가 부족합니다)
              </div>
            )}
          </div>
        )}

        {/* ==================== STAGE 4: CIVILIZATION ==================== */}
        {stage === 4 && (
          <div>
            <div className="text-center text-purple-300 mb-3 text-sm">
              인류 문명을 인도하세요! 선택이 운명을 결정합니다!
            </div>

            {/* Civ Event Popup */}
            {civEvent && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
                <div className={`border-2 rounded-2xl p-6 max-w-sm text-center shadow-2xl ${
                  civEvent.bonus ? 'bg-gradient-to-b from-yellow-900 to-yellow-950 border-yellow-500' : 'bg-gradient-to-b from-red-900 to-red-950 border-red-500'
                }`}>
                  <div className="text-4xl mb-3">{civEvent.bonus ? '🎉' : '⚠️'}</div>
                  <div className={`text-xl font-bold mb-2 ${civEvent.bonus ? 'text-yellow-300' : 'text-red-300'}`}>
                    {civEvent.name}
                  </div>
                  {civEvent.bonus ? (
                    <div className="text-sm text-yellow-200 mb-4">+{civEvent.bonus} 신력 획득!</div>
                  ) : (
                    <div className="text-sm text-red-200 mb-4">
                      신력 {civEvent.cost}을 사용하여 대응하시겠습니까?
                    </div>
                  )}
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => handleCivEvent(true)}
                      className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg font-bold"
                    >
                      {civEvent.bonus ? '받기!' : `대응! (-${civEvent.cost})`}
                    </button>
                    {!civEvent.bonus && (
                      <button
                        onClick={() => handleCivEvent(false)}
                        className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-bold"
                      >
                        방관...
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Civ Stats */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-blue-900/30 rounded-lg p-2 text-center border border-blue-800/50">
                <div className="text-2xl">👥</div>
                <div className="text-sm font-bold text-blue-300">{civStats.population.toLocaleString()}</div>
                <div className="text-[10px] text-blue-500">인구</div>
              </div>
              <div className="bg-cyan-900/30 rounded-lg p-2 text-center border border-cyan-800/50">
                <div className="text-2xl">🔬</div>
                <div className="text-sm font-bold text-cyan-300">{civStats.tech}</div>
                <div className="text-[10px] text-cyan-500">기술력</div>
              </div>
              <div className="bg-green-900/30 rounded-lg p-2 text-center border border-green-800/50">
                <div className="text-2xl">😊</div>
                <div className="text-sm font-bold text-green-300">{civStats.happiness}</div>
                <div className="text-[10px] text-green-500">행복도</div>
              </div>
              <div className="bg-red-900/30 rounded-lg p-2 text-center border border-red-800/50">
                <div className="text-2xl">⚔️</div>
                <div className="text-sm font-bold text-red-300">{civStats.military}</div>
                <div className="text-[10px] text-red-500">군사력</div>
              </div>
            </div>

            {/* Civ Choices */}
            <div className="bg-black/40 rounded-xl p-3 border border-purple-900/50 mb-3">
              <h3 className="text-yellow-400 font-bold mb-2">문명의 방향을 선택하세요 (500 신력)</h3>
              <div className="space-y-2">
                {CIV_CHOICES.map((cc, i) => {
                  const chosen = civStats.choices.find(
                    (c) => c === cc.a || c === cc.b
                  );
                  if (chosen) {
                    return (
                      <div key={i} className="bg-yellow-900/20 rounded-lg px-3 py-2 text-sm border border-yellow-800/30">
                        ✅ 선택됨: <span className="text-yellow-400 font-bold">{chosen}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="flex gap-2">
                      <button
                        onClick={() => makeCivChoice(cc.a)}
                        className="flex-1 bg-purple-800/50 hover:bg-purple-700/50 border border-purple-600/50 px-3 py-2 rounded-lg text-sm font-bold"
                      >
                        {cc.a}
                      </button>
                      <span className="text-gray-600 self-center">vs</span>
                      <button
                        onClick={() => makeCivChoice(cc.b)}
                        className="flex-1 bg-purple-800/50 hover:bg-purple-700/50 border border-purple-600/50 px-3 py-2 rounded-lg text-sm font-bold"
                      >
                        {cc.b}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Wonders */}
            <div className="bg-black/40 rounded-xl p-3 border border-purple-900/50">
              <h3 className="text-amber-400 font-bold mb-2">🏛️ 불가사의 건설 (1000 신력)</h3>
              <div className="flex flex-wrap gap-2">
                {WONDERS.map((w) => (
                  <button
                    key={w}
                    onClick={() => buildWonder(w)}
                    disabled={civStats.wonders.includes(w)}
                    className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                      civStats.wonders.includes(w)
                        ? 'bg-amber-900/50 text-amber-400 border border-amber-600'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                    }`}
                  >
                    {civStats.wonders.includes(w) ? '✅ ' : '🏗️ '}
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Animated Civ Visual */}
            <div className="mt-3 bg-black/30 rounded-xl p-4 border border-purple-900/30 text-center">
              <div className="text-3xl mb-2" style={{ animation: 'float 3s ease-in-out infinite' }}>
                🏘️🏠🏢🏗️🏛️
              </div>
              <div className="text-xs text-gray-500">문명이 발전하고 있습니다...</div>
            </div>
          </div>
        )}

        {/* ==================== STAGE 5: COSMIC EXPANSION ==================== */}
        {stage === 5 && (
          <div>
            <div className="text-center text-purple-300 mb-3 text-sm">
              우주로 진출하세요! 새로운 항성계를 만들고 거대 구조물을 건설하세요!
            </div>

            <button
              onClick={createStarSystem}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 py-3 rounded-xl font-bold text-lg mb-4 shadow-lg shadow-purple-500/20"
            >
              새 항성계 창조 🌌 (3000 신력)
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cosmicSystems.map((cs) => (
                <div key={cs.id} className="bg-black/40 rounded-xl p-4 border border-indigo-900/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-indigo-300">🌌 {cs.name}</span>
                    <span className="text-xs text-gray-500">⭐{cs.stars} 🪐{cs.planets}</span>
                  </div>

                  {/* Mega structures */}
                  <div className="space-y-1.5">
                    {MEGA_STRUCTURES.map((ms) => {
                      const built = cs.megaStructures.includes(ms.name);
                      return (
                        <button
                          key={ms.name}
                          onClick={() => buildMegaStructure(cs.id, ms.name)}
                          disabled={built}
                          className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                            built
                              ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-600'
                              : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'
                          }`}
                        >
                          {built ? '✅' : '🔨'} {ms.name}
                          <span className="text-xs ml-2 text-gray-500">
                            {built ? `+${ms.power}/초` : `${ms.cost.toLocaleString()} 신력`}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Visual */}
                  <div className="mt-2 flex justify-center gap-1 text-xl" style={{ animation: 'float 4s ease-in-out infinite' }}>
                    {Array.from({ length: Math.min(cs.stars, 5) }).map((_, i) => (
                      <span key={i} style={{ animation: `twinkle ${2 + i * 0.5}s ease-in-out infinite` }}>⭐</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {cosmicSystems.length === 0 && (
              <div className="text-center text-gray-600 py-12">
                아직 항성계가 없습니다. 첫 항성계를 창조하세요!
              </div>
            )}
          </div>
        )}

        {/* ==================== STAGE 6: TRANSCENDENCE ==================== */}
        {stage === 6 && (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
            <div
              className="text-center"
              style={{ animation: 'level-up 2s ease-out' }}
            >
              <div className="text-8xl mb-6" style={{ animation: 'float 3s ease-in-out infinite' }}>
                👑
              </div>
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 mb-4">
                {divineTitle || '창조의 신'}
              </div>
              <div className="text-xl text-purple-300 mb-8">당신은 우주의 최고신이 되었습니다!</div>

              {/* Stats Summary */}
              <div className="bg-black/50 rounded-2xl p-6 border border-yellow-900/50 max-w-md mx-auto mb-6">
                <h3 className="text-yellow-400 font-bold text-lg mb-4">우주 창조 기록</h3>
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-3xl mb-1">⭐</div>
                    <div className="text-yellow-400 font-bold text-xl">{stars.length}</div>
                    <div className="text-xs text-gray-500">창조한 별</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-3xl mb-1">🪐</div>
                    <div className="text-blue-400 font-bold text-xl">{planets.length}</div>
                    <div className="text-xs text-gray-500">창조한 행성</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-3xl mb-1">🧬</div>
                    <div className="text-green-400 font-bold text-xl">{totalSpecies}</div>
                    <div className="text-xs text-gray-500">진화시킨 종</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-3xl mb-1">🏛️</div>
                    <div className="text-amber-400 font-bold text-xl">{civStats.wonders.length}</div>
                    <div className="text-xs text-gray-500">건설한 불가사의</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-3xl mb-1">🌌</div>
                    <div className="text-indigo-400 font-bold text-xl">{cosmicSystems.length}</div>
                    <div className="text-xs text-gray-500">항성계</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-3xl mb-1">⚡</div>
                    <div className="text-yellow-400 font-bold text-xl">{Math.floor(divinePower).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">총 신력</div>
                  </div>
                </div>

                {/* Choices made */}
                {civStats.choices.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm text-gray-400 mb-1">문명의 선택:</div>
                    <div className="flex flex-wrap gap-1">
                      {civStats.choices.map((c, i) => (
                        <span key={i} className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded text-xs">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {civStats.wonders.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm text-gray-400 mb-1">건설한 불가사의:</div>
                    <div className="flex flex-wrap gap-1">
                      {civStats.wonders.map((w, i) => (
                        <span key={i} className="bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded text-xs">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={resetUniverse}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl shadow-purple-500/30 transition-all hover:scale-105"
              >
                🔄 우주 재탄생 (보너스와 함께 다시 시작!)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
