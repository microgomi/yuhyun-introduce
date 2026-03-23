"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 블록 ───── */
interface Block {
  id: number;
  row: number;       // 0(맨아래) ~ maxRow
  col: number;       // 0,1,2 (한 줄에 3개)
  material: Material;
  removed: boolean;
  wobble: number;    // 흔들림 (0~100, 높을수록 위험)
  cracked: boolean;
}

interface Material {
  id: string;
  name: string;
  emoji: string;
  color: string;
  weight: number;     // 무게 (뺄 때 난이도)
  fragile: boolean;   // 깨지기 쉬운지
  score: number;
}

const MATERIALS: Material[] = [
  { id: "wood", name: "나무", emoji: "🪵", color: "#92400e", weight: 2, fragile: false, score: 5 },
  { id: "brick", name: "벽돌", emoji: "🧱", color: "#dc2626", weight: 3, fragile: false, score: 8 },
  { id: "stone", name: "돌", emoji: "🪨", color: "#6b7280", weight: 4, fragile: false, score: 10 },
  { id: "glass", name: "유리", emoji: "🪟", color: "#67e8f9", weight: 1, fragile: true, score: 15 },
  { id: "steel", name: "철", emoji: "🔩", color: "#4b5563", weight: 5, fragile: false, score: 12 },
  { id: "gold", name: "금", emoji: "🥇", color: "#fbbf24", weight: 3, fragile: false, score: 20 },
  { id: "ice", name: "얼음", emoji: "🧊", color: "#a5f3fc", weight: 1, fragile: true, score: 18 },
  { id: "diamond", name: "다이아", emoji: "💎", color: "#818cf8", weight: 2, fragile: false, score: 25 },
  { id: "obsidian", name: "흑요석", emoji: "🖤", color: "#1e1b4b", weight: 6, fragile: false, score: 15 },
  { id: "crystal", name: "크리스탈", emoji: "🔮", color: "#c084fc", weight: 2, fragile: true, score: 22 },
  { id: "rainbow", name: "무지개", emoji: "🌈", color: "#f472b6", weight: 1, fragile: false, score: 30 },
  { id: "tnt", name: "TNT", emoji: "🧨", color: "#ef4444", weight: 2, fragile: true, score: 35 },
];

/* ───── 도전 미션 ───── */
interface Challenge {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  rows: number;
  specialMaterials?: string[];   // 특수 재료 포함
  targetRemoves: number;
  reward: number;
  xpReward: number;
  difficulty: number;
}

const CHALLENGES: Challenge[] = [
  { id: "easy", name: "연습", emoji: "🟢", desc: "6층 탑에서 5개 빼기", rows: 6, targetRemoves: 5, reward: 10, xpReward: 8, difficulty: 1 },
  { id: "normal", name: "기본", emoji: "🟡", desc: "8층 탑에서 8개 빼기", rows: 8, targetRemoves: 8, reward: 20, xpReward: 15, difficulty: 2 },
  { id: "tall", name: "높은 탑", emoji: "🔵", desc: "12층! 10개 빼기", rows: 12, targetRemoves: 10, reward: 35, xpReward: 25, difficulty: 3 },
  { id: "glass", name: "유리 젠가", emoji: "🪟", desc: "유리가 섞인 8층!", rows: 8, specialMaterials: ["glass"], targetRemoves: 7, reward: 30, xpReward: 20, difficulty: 3 },
  { id: "heavy", name: "무거운 탑", emoji: "🪨", desc: "돌+철로 된 10층!", rows: 10, specialMaterials: ["stone", "steel", "obsidian"], targetRemoves: 8, reward: 40, xpReward: 30, difficulty: 4 },
  { id: "ice", name: "얼음 탑", emoji: "🧊", desc: "얼음이 섞인 10층!", rows: 10, specialMaterials: ["ice"], targetRemoves: 9, reward: 45, xpReward: 30, difficulty: 4 },
  { id: "mixed", name: "혼합 탑", emoji: "🌈", desc: "모든 재료! 12층!", rows: 12, specialMaterials: ["glass", "ice", "crystal", "gold", "diamond"], targetRemoves: 10, reward: 50, xpReward: 35, difficulty: 4 },
  { id: "tnt", name: "TNT 탑", emoji: "🧨", desc: "폭탄 주의! 10층!", rows: 10, specialMaterials: ["tnt"], targetRemoves: 8, reward: 55, xpReward: 40, difficulty: 5 },
  { id: "mega", name: "메가 탑", emoji: "🏗️", desc: "15층 초대형! 15개!", rows: 15, specialMaterials: ["glass", "ice", "tnt", "diamond", "rainbow"], targetRemoves: 15, reward: 80, xpReward: 60, difficulty: 5 },
  { id: "impossible", name: "불가능", emoji: "💀", desc: "18층에서 20개?!", rows: 18, specialMaterials: ["glass", "ice", "tnt", "crystal"], targetRemoves: 20, reward: 120, xpReward: 80, difficulty: 5 },
];

/* ───── 상점 ───── */
interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  price: number;
  effect: string;
  effectType: "steadyHand" | "scoreBoost" | "extraLife" | "xray";
  value: number;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: "gloves", name: "미끄럼방지 장갑", emoji: "🧤", desc: "흔들림 감소", price: 50, effect: "-15% 흔들림", effectType: "steadyHand", value: 15 },
  { id: "glasses", name: "스마트 안경", emoji: "🥽", desc: "점수 보너스", price: 70, effect: "+20% 점수", effectType: "scoreBoost", value: 0.2 },
  { id: "helmet", name: "안전모", emoji: "⛑️", desc: "1회 무너짐 방어", price: 100, effect: "1회 보호", effectType: "extraLife", value: 1 },
  { id: "xray", name: "투시경", emoji: "🔍", desc: "안전한 블록 표시", price: 80, effect: "안전도 표시", effectType: "xray", value: 1 },
  { id: "proGloves", name: "프로 장갑", emoji: "🫳", desc: "흔들림 대폭 감소", price: 150, effect: "-30% 흔들림", effectType: "steadyHand", value: 30 },
  { id: "trophy", name: "트로피", emoji: "🏆", desc: "점수 대폭 보너스", price: 200, effect: "+40% 점수", effectType: "scoreBoost", value: 0.4 },
  { id: "superHelmet", name: "강화 헬멧", emoji: "🪖", desc: "2회 무너짐 방어", price: 250, effect: "2회 보호", effectType: "extraLife", value: 2 },
  { id: "megaXray", name: "초투시경", emoji: "👁️", desc: "위험도 정밀 표시", price: 180, effect: "정밀 안전도", effectType: "xray", value: 2 },
];

/* ───── 블록 생성 ───── */
function generateTower(rows: number, level: number, specialMaterials?: string[]): Block[] {
  const blocks: Block[] = [];
  let id = 0;

  // 사용 가능 재료
  const baseMats = MATERIALS.filter(m => {
    if (m.id === "tnt" || m.id === "rainbow" || m.id === "diamond" || m.id === "crystal") return false;
    return true;
  }).slice(0, Math.min(3 + level, 6));

  const specialMats = specialMaterials
    ? MATERIALS.filter(m => specialMaterials.includes(m.id))
    : [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < 3; col++) {
      // 특수 재료를 랜덤으로 섞기
      let mat: Material;
      if (specialMats.length > 0 && Math.random() < 0.3) {
        mat = specialMats[Math.floor(Math.random() * specialMats.length)];
      } else {
        mat = baseMats[Math.floor(Math.random() * baseMats.length)];
      }

      blocks.push({
        id: id++,
        row,
        col,
        material: mat,
        removed: false,
        wobble: 0,
        cracked: false,
      });
    }
  }
  return blocks;
}

type Screen = "main" | "challenge" | "play" | "result" | "shop";

export default function JengaPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(40);
  const [highScore, setHighScore] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);
  const [ownedShopItems, setOwnedShopItems] = useState<string[]>([]);

  // 플레이
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [score, setScore] = useState(0);
  const [removedCount, setRemovedCount] = useState(0);
  const [towerStability, setTowerStability] = useState(100);
  const [gameActive, setGameActive] = useState(false);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lastRemovedRow, setLastRemovedRow] = useState(-1);
  const [extraLives, setExtraLives] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [floatTexts, setFloatTexts] = useState<{ id: number; text: string; x: number; y: number; color: string }[]>([]);
  const floatId = useRef(0);
  const [warning, setWarning] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [towerCollapsed, setTowerCollapsed] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const pullTimer = useRef<NodeJS.Timeout | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 보너스
  const steadyHand = ownedShopItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "steadyHand" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const scoreBoost = ownedShopItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "scoreBoost" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const extraLifeBonus = ownedShopItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "extraLife" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const hasXray = ownedShopItems.some(id => SHOP_ITEMS.find(i => i.id === id)?.effectType === "xray");
  const xrayLevel = ownedShopItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "xray" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);

  // 레벨업
  useEffect(() => {
    if (xp >= xpNeeded) {
      setXp(x => x - xpNeeded);
      setPlayerLevel(l => l + 1);
      setXpNeeded(n => Math.floor(n * 1.3));
    }
  }, [xp, xpNeeded]);

  // 타이머
  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    } else if (gameActive && timeLeft <= 0) {
      endGame(false);
    }
  }, [gameActive, timeLeft]);

  // 블록 위험도 계산
  const getBlockDanger = useCallback((block: Block, allBlocks: Block[]): number => {
    if (block.removed) return 0;

    const sameRow = allBlocks.filter(b => b.row === block.row && !b.removed);
    const remainingInRow = sameRow.length;

    // 마지막 하나면 매우 위험
    if (remainingInRow <= 1) return 95;

    // 위에 블록이 많으면 위험
    const aboveBlocks = allBlocks.filter(b => b.row > block.row && !b.removed);
    const aboveWeight = aboveBlocks.reduce((s, b) => s + b.material.weight, 0);

    // 가운데 블록은 덜 위험
    const isMiddle = block.col === 1;

    let danger = 10;
    danger += aboveWeight * 2;
    danger += block.material.weight * 3;
    if (block.material.fragile) danger += 15;
    if (isMiddle && remainingInRow === 3) danger -= 5;
    if (remainingInRow === 2) danger += 20;
    if (block.row === 0) danger += 10; // 맨 아래줄

    // 줄에서 이미 하나 빠졌으면 위험 증가
    const removedInRow = allBlocks.filter(b => b.row === block.row && b.removed).length;
    danger += removedInRow * 15;

    // TNT는 폭발 위험
    if (block.material.id === "tnt") danger += 20;

    return Math.min(95, Math.max(5, danger - steadyHand));
  }, [steadyHand]);

  const getDangerColor = (danger: number) => {
    if (danger >= 70) return "#ef4444";
    if (danger >= 45) return "#f59e0b";
    if (danger >= 25) return "#22c55e";
    return "#60a5fa";
  };

  const getDangerLabel = (danger: number) => {
    if (danger >= 70) return "매우 위험!";
    if (danger >= 45) return "주의!";
    if (danger >= 25) return "보통";
    return "안전";
  };

  const startChallenge = useCallback((challenge: Challenge) => {
    setCurrentChallenge(challenge);
    const tower = generateTower(challenge.rows, playerLevel, challenge.specialMaterials);
    setBlocks(tower);
    setScore(0);
    setRemovedCount(0);
    setTowerStability(100);
    setCombo(0);
    setMaxCombo(0);
    setExtraLives(extraLifeBonus);
    setSelectedBlock(null);
    setFloatTexts([]);
    setWarning("");
    setTowerCollapsed(false);
    setLastRemovedRow(-1);
    setPullProgress(0);
    setIsPulling(false);
    setShaking(false);
    setTimeLeft(60 + challenge.rows * 5);
    setGameActive(true);
    setScreen("play");
  }, [playerLevel, extraLifeBonus]);

  const endGame = useCallback((success: boolean) => {
    setGameActive(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pullTimer.current) clearTimeout(pullTimer.current);

    if (success && currentChallenge && !completedChallenges.includes(currentChallenge.id)) {
      setCompletedChallenges(prev => [...prev, currentChallenge.id]);
    }

    const earned = Math.floor(score / 5) + removedCount * 3 + (success && currentChallenge ? currentChallenge.reward : 0);
    setCoins(c => c + earned);
    setXp(x => x + Math.floor(score / 3) + (success && currentChallenge ? currentChallenge.xpReward : 0));
    if (score > highScore) setHighScore(score);
    setScreen("result");
  }, [score, removedCount, currentChallenge, completedChallenges, highScore]);

  // 성공 체크
  useEffect(() => {
    if (gameActive && currentChallenge && removedCount >= currentChallenge.targetRemoves) {
      endGame(true);
    }
  }, [removedCount, gameActive, currentChallenge]);

  // 블록 뽑기 시작
  const startPull = useCallback((blockId: number) => {
    if (!gameActive || isPulling) return;
    const block = blocks.find(b => b.id === blockId);
    if (!block || block.removed) return;

    setSelectedBlock(blockId);
    setPullProgress(0);
    setIsPulling(true);
  }, [gameActive, isPulling, blocks]);

  // 블록 뽑기 (꾹 누르기)
  const doPull = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (!gameActive || !isPulling || selectedBlock === null) return;

    const block = blocks.find(b => b.id === selectedBlock);
    if (!block) return;

    const danger = getBlockDanger(block, blocks);
    const pullSpeed = Math.max(5, 20 - Math.floor(danger / 10));

    setPullProgress(prev => {
      const next = prev + pullSpeed;
      if (next >= 100) {
        // 뽑기 성공 or 실패 판정
        const failChance = danger / 100;
        const roll = Math.random();

        if (roll < failChance) {
          // 실패 - 타워 흔들림
          if (extraLives > 0) {
            setExtraLives(l => l - 1);
            setWarning("⛑️ 위험했다! 안전모로 버텼다!");
            setTowerStability(s => Math.max(0, s - 15));
            setShaking(true);
            setTimeout(() => { setShaking(false); setWarning(""); }, 1200);
            setIsPulling(false);
            setSelectedBlock(null);
          } else {
            // 붕괴
            setTowerCollapsed(true);
            setShaking(true);
            setWarning("💥 탑이 무너졌다!!");
            setTimeout(() => endGame(false), 1500);
          }
        } else {
          // 성공!
          completeRemoval(block, e);
        }
        return 0;
      }
      return next;
    });
  }, [gameActive, isPulling, selectedBlock, blocks, extraLives, getBlockDanger]);

  const completeRemoval = useCallback((block: Block, e?: React.MouseEvent | React.TouchEvent) => {
    const danger = getBlockDanger(block, blocks);

    // 블록 제거
    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, removed: true } : b));

    // TNT 특수 효과: 같은 줄 전부 제거 (점수 보너스)
    if (block.material.id === "tnt") {
      setWarning("💥 TNT 폭발! 같은 줄 제거!");
      setShaking(true);
      setBlocks(prev => prev.map(b =>
        b.row === block.row && !b.removed ? { ...b, removed: true } : b
      ));
      const rowBlocks = blocks.filter(b => b.row === block.row && !b.removed).length;
      setRemovedCount(c => c + rowBlocks);
      setTowerStability(s => Math.max(0, s - 10));
      setTimeout(() => { setShaking(false); setWarning(""); }, 800);
    } else {
      setRemovedCount(c => c + 1);
    }

    // 안정성 감소
    const stabilityLoss = Math.max(1, Math.floor(danger / 8));
    setTowerStability(s => Math.max(0, s - stabilityLoss));

    // 흔들림
    if (danger >= 40) {
      setShaking(true);
      setTimeout(() => setShaking(false), 300);
    }

    // 콤보
    const isConsecutiveRow = Math.abs(block.row - lastRemovedRow) <= 1 && lastRemovedRow !== -1;
    if (isConsecutiveRow) {
      setCombo(c => { const n = c + 1; setMaxCombo(m => Math.max(m, n)); return n; });
    } else {
      setCombo(1);
    }
    setLastRemovedRow(block.row);

    // 점수
    const dangerBonus = Math.floor(danger / 5);
    const comboMult = 1 + combo * 0.15;
    const totalScore = Math.floor((block.material.score + dangerBonus) * comboMult * (1 + scoreBoost));
    setScore(s => s + totalScore);

    // 플로팅
    const id = floatId.current++;
    let x = 200, y = 300;
    if (e && "clientX" in e) { x = e.clientX; y = e.clientY; }
    setFloatTexts(prev => [...prev, {
      id,
      text: `+${totalScore} ${block.material.emoji}`,
      x, y,
      color: danger >= 60 ? "#fbbf24" : "#4ade80",
    }]);
    setTimeout(() => setFloatTexts(prev => prev.filter(f => f.id !== id)), 1000);

    setIsPulling(false);
    setSelectedBlock(null);
  }, [blocks, combo, lastRemovedRow, scoreBoost, getBlockDanger]);

  const cancelPull = useCallback(() => {
    setIsPulling(false);
    setSelectedBlock(null);
    setPullProgress(0);
  }, []);

  const buyItem = useCallback((id: string) => {
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item || coins < item.price || ownedShopItems.includes(id)) return;
    setCoins(c => c - item.price);
    setOwnedShopItems(prev => [...prev, id]);
  }, [coins, ownedShopItems]);

  /* ───── 메인 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 via-orange-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-amber-300 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🏗️</div>
            <h1 className="text-3xl font-black mb-1">젠가</h1>
            <p className="text-amber-300 text-sm">블록을 빼도 무너지지 않게!</p>
          </div>

          <div className="bg-amber-900/40 rounded-xl p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-yellow-400 font-bold">🪙 {coins}코인</span>
              <span className="text-amber-300 text-sm">Lv.{playerLevel}</span>
            </div>
            <div className="bg-amber-900 rounded-full h-2 overflow-hidden">
              <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <div className="text-[10px] text-amber-400 text-right mt-0.5">{xp}/{xpNeeded} XP</div>
            {highScore > 0 && <div className="text-xs text-yellow-300 text-center mt-1">🏆 최고 점수: {highScore}</div>}
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 mb-4 text-center">
            <div className="text-4xl mb-2">🪵🧱🪨</div>
            <p className="text-sm text-gray-300">블록을 하나씩 조심히 빼세요!</p>
            <p className="text-sm text-gray-300">위험한 블록일수록 높은 점수!</p>
            <p className="text-xs text-yellow-300 mt-1">탑이 무너지면 게임 오버!</p>
          </div>

          <div className="space-y-3">
            <button onClick={() => setScreen("challenge")}
              className="w-full bg-amber-600 hover:bg-amber-500 rounded-xl p-4 text-center text-lg font-black">
              🏗️ 도전 시작!
            </button>
            <button onClick={() => setScreen("shop")}
              className="w-full bg-yellow-700/60 hover:bg-yellow-600/60 rounded-xl p-3 text-center">
              <span className="font-bold">🛒 장비 상점</span>
            </button>
          </div>

          <div className="mt-4 bg-black/30 rounded-xl p-3 text-center text-xs text-gray-400">
            <p>🏆 완료한 도전: {completedChallenges.length}/{CHALLENGES.length}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 도전 선택 ───── */
  if (screen === "challenge") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 via-orange-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-amber-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-4">🎯 도전 선택</h2>

          <div className="space-y-2">
            {CHALLENGES.map(c => {
              const done = completedChallenges.includes(c.id);
              return (
                <button key={c.id} onClick={() => startChallenge(c)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    done ? "bg-green-900/30 border border-green-700" : "bg-black/30 hover:bg-black/50"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{c.emoji}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{c.name}</span>
                        {done && <span className="text-green-400 text-xs">✅</span>}
                      </div>
                      <div className="text-xs text-gray-400">{c.desc}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-500">{"⭐".repeat(c.difficulty)}{"☆".repeat(5 - c.difficulty)}</span>
                        <span className="text-[10px] text-yellow-400">🪙 {c.reward}</span>
                      </div>
                    </div>
                    <div className="text-xs text-right text-gray-500">
                      <div>🏗️ {c.rows}층</div>
                      <div>🎯 {c.targetRemoves}개</div>
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

  /* ───── 플레이 ───── */
  if (screen === "play" && currentChallenge) {
    const maxRow = Math.max(...blocks.map(b => b.row));
    const rows = Array.from({ length: maxRow + 1 }, (_, i) => i).reverse();

    return (
      <div className={`min-h-screen bg-gradient-to-b from-sky-100 to-amber-50 text-gray-900 p-3 relative overflow-hidden select-none ${shaking ? "animate-pulse" : ""}`}>
        <div className="max-w-md mx-auto">
          {/* 상단 */}
          <div className="flex justify-between items-center mb-1 text-sm">
            <span className="font-bold">⏱️ {timeLeft}초</span>
            <span className="font-bold">🎯 {score}</span>
            <span>📦 {removedCount}/{currentChallenge.targetRemoves}</span>
          </div>

          {/* 안정성 */}
          <div className="mb-1">
            <div className="flex justify-between text-[10px]">
              <span>🏗️ 안정성 {extraLives > 0 && `(⛑️x${extraLives})`}</span>
              <span className={towerStability < 30 ? "text-red-600 font-bold" : ""}>{Math.floor(towerStability)}%</span>
            </div>
            <div className="bg-gray-300 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full transition-all" style={{
                width: `${towerStability}%`,
                background: towerStability >= 70 ? "#22c55e" : towerStability >= 40 ? "#f59e0b" : "#dc2626",
              }} />
            </div>
          </div>

          {combo >= 3 && (
            <div className="text-center mb-1">
              <span className="text-sm font-black px-2 py-0.5 rounded-full bg-amber-500 text-white">🔥 {combo} COMBO!</span>
            </div>
          )}

          {warning && <div className="text-center text-sm font-bold text-red-600 mb-1 animate-pulse">{warning}</div>}

          {/* 뽑기 진행바 */}
          {isPulling && selectedBlock !== null && (
            <div className="mb-2 bg-white rounded-xl p-2 shadow-md">
              <div className="text-xs text-center font-bold mb-1">
                🫳 계속 터치해서 뽑기! ({Math.floor(pullProgress)}%)
              </div>
              <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                <div className="h-3 bg-amber-500 rounded-full transition-all" style={{ width: `${pullProgress}%` }} />
              </div>
              <button onClick={cancelPull} className="text-[10px] text-gray-400 mt-1 block mx-auto">취소</button>
            </div>
          )}

          {/* 타워 */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-2 mb-2 relative"
            style={{ maxHeight: "55vh", overflowY: "auto" }}>
            {towerCollapsed && (
              <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center z-20 rounded-xl">
                <div className="text-center">
                  <div className="text-6xl mb-2">💥</div>
                  <div className="text-2xl font-black text-white">와르르르!</div>
                </div>
              </div>
            )}

            {rows.map(rowIdx => {
              const rowBlocks = blocks.filter(b => b.row === rowIdx);
              const allRemoved = rowBlocks.every(b => b.removed);
              if (allRemoved) return null;

              return (
                <div key={rowIdx} className="flex gap-0.5 mb-0.5 items-center">
                  <div className="text-[8px] text-gray-400 w-4 text-right mr-1">{rowIdx + 1}</div>
                  {rowBlocks.sort((a, b) => a.col - b.col).map(block => {
                    if (block.removed) {
                      return <div key={block.id} className="flex-1 h-9 rounded bg-gray-100/50 border border-dashed border-gray-300" />;
                    }

                    const danger = getBlockDanger(block, blocks);
                    const isSelected = selectedBlock === block.id;

                    return (
                      <button key={block.id}
                        onClick={(e) => {
                          if (isPulling && selectedBlock === block.id) {
                            doPull(e);
                          } else if (!isPulling) {
                            startPull(block.id);
                          }
                        }}
                        className={`flex-1 h-9 rounded text-center transition-all relative ${
                          isSelected ? "ring-2 ring-yellow-400 scale-105 z-10" : "hover:brightness-110"
                        }`}
                        style={{
                          backgroundColor: block.material.color + "dd",
                          border: `2px solid ${block.material.color}`,
                          transform: isSelected ? "scale(1.05)" : shaking ? `rotate(${(Math.random() - 0.5) * 3}deg)` : "",
                        }}>
                        <span className="text-lg">{block.material.emoji}</span>
                        {hasXray && (
                          <div className="absolute -top-1 -right-1 text-[7px] px-0.5 rounded-full font-bold"
                            style={{ backgroundColor: getDangerColor(danger), color: "white" }}>
                            {xrayLevel >= 2 ? `${danger}%` : getDangerLabel(danger).charAt(0)}
                          </div>
                        )}
                        {block.material.fragile && (
                          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[7px]">⚠️</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {/* 땅 */}
            <div className="h-3 bg-green-700 rounded-b mt-1" />
          </div>

          {/* 선택된 블록 정보 */}
          {selectedBlock !== null && (() => {
            const block = blocks.find(b => b.id === selectedBlock);
            if (!block || block.removed) return null;
            const danger = getBlockDanger(block, blocks);
            return (
              <div className="bg-white rounded-xl p-2 shadow-md text-center text-sm">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">{block.material.emoji}</span>
                  <span className="font-bold">{block.material.name}</span>
                  <span className="text-xs text-gray-500">{block.row + 1}층 {block.col + 1}번</span>
                </div>
                <div className="flex justify-center gap-3 mt-1 text-xs">
                  <span>무게: {block.material.weight}</span>
                  <span style={{ color: getDangerColor(danger) }}>위험도: {danger}%</span>
                  <span>점수: +{block.material.score}</span>
                </div>
                <p className="text-[10px] text-amber-600 mt-1">블록을 계속 터치해서 뽑기!</p>
              </div>
            );
          })()}
        </div>

        {/* 플로팅 */}
        {floatTexts.map(f => (
          <div key={f.id} className="fixed pointer-events-none font-black text-lg z-50"
            style={{
              left: f.x, top: f.y, color: f.color,
              textShadow: "0 0 4px rgba(0,0,0,0.3)",
              animation: "floatUp 1s ease-out forwards",
            }}>
            {f.text}
          </div>
        ))}

        <style jsx>{`
          @keyframes floatUp {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-80px) scale(1.3); }
          }
        `}</style>
      </div>
    );
  }

  /* ───── 결과 ───── */
  if (screen === "result" && currentChallenge) {
    const success = removedCount >= currentChallenge.targetRemoves;
    const earned = Math.floor(score / 5) + removedCount * 3 + (success ? currentChallenge.reward : 0);

    return (
      <div className={`min-h-screen bg-gradient-to-b ${success ? "from-amber-600 via-orange-800 to-slate-950" : "from-gray-800 via-gray-900 to-black"} text-white p-4 flex items-center justify-center`}>
        <div className="max-w-md mx-auto text-center">
          <div className="text-8xl mb-4">{success ? "🎉" : towerCollapsed ? "💥" : "⏰"}</div>
          <h2 className="text-3xl font-black mb-2" style={{ color: success ? "#fbbf24" : "#f87171" }}>
            {success ? "도전 성공!" : towerCollapsed ? "탑이 무너졌다!" : "시간 초과!"}
          </h2>
          <p className="text-gray-400 mb-2">{currentChallenge.emoji} {currentChallenge.name}</p>

          <div className="bg-black/40 rounded-xl p-3 mb-4 text-left text-sm">
            <div className={`flex items-center gap-2 ${removedCount >= currentChallenge.targetRemoves ? "text-green-400" : "text-red-400"}`}>
              <span>{removedCount >= currentChallenge.targetRemoves ? "✅" : "❌"}</span>
              <span>제거: {removedCount}/{currentChallenge.targetRemoves}개</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <span>🏗️</span>
              <span>남은 안정성: {Math.floor(towerStability)}%</span>
            </div>
          </div>

          <div className="bg-black/40 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-2xl">🎯</div><div className="text-xl font-bold">{score}</div><div className="text-xs text-gray-400">점수</div></div>
              <div><div className="text-2xl">📦</div><div className="text-xl font-bold">{removedCount}</div><div className="text-xs text-gray-400">제거 블록</div></div>
              <div><div className="text-2xl">🔥</div><div className="text-xl font-bold">{maxCombo}</div><div className="text-xs text-gray-400">최대 콤보</div></div>
              <div><div className="text-2xl">🪙</div><div className="text-xl font-bold text-yellow-400">+{earned}</div><div className="text-xs text-gray-400">획득 코인</div></div>
            </div>
          </div>

          {score > highScore && score > 0 && (
            <div className="text-yellow-300 font-bold mb-3">🏆 새로운 최고 기록!</div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setScreen("challenge")} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">🎯 도전</button>
            <button onClick={() => startChallenge(currentChallenge)} className="flex-1 bg-amber-600 hover:bg-amber-500 rounded-xl p-3 font-bold">🔄 재도전</button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 상점 ───── */
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 via-orange-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-amber-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">🛒 장비 상점</h2>
          <div className="text-center text-yellow-400 font-bold mb-4">🪙 {coins}코인</div>

          <div className="space-y-2">
            {SHOP_ITEMS.map(item => {
              const owned = ownedShopItems.includes(item.id);
              return (
                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl ${owned ? "bg-green-900/30 border border-green-800" : "bg-black/30"}`}>
                  <div className="text-3xl">{item.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.desc}</div>
                    <div className="text-xs text-yellow-300">{item.effect}</div>
                  </div>
                  {owned ? (
                    <span className="text-green-400 text-sm font-bold">✅</span>
                  ) : (
                    <button onClick={() => buyItem(item.id)} disabled={coins < item.price}
                      className={`text-xs px-3 py-2 rounded-lg font-bold ${coins >= item.price ? "bg-yellow-600 hover:bg-yellow-500" : "bg-gray-700 text-gray-500"}`}>
                      🪙 {item.price}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
