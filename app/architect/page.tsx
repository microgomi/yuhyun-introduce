"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 블록 타입 ───── */
interface BlockType {
  id: string;
  name: string;
  emoji: string;
  color: string;
  weight: number;    // 무게 (높을수록 아래에 놓아야 안정)
  strength: number;  // 강도 (위에 올릴 수 있는 무게)
  score: number;
  unlockLevel: number;
}

const BLOCK_TYPES: BlockType[] = [
  { id: "wood", name: "나무", emoji: "🪵", color: "#92400e", weight: 2, strength: 3, score: 5, unlockLevel: 1 },
  { id: "brick", name: "벽돌", emoji: "🧱", color: "#dc2626", weight: 3, strength: 5, score: 8, unlockLevel: 1 },
  { id: "stone", name: "돌", emoji: "🪨", color: "#6b7280", weight: 5, strength: 8, score: 12, unlockLevel: 1 },
  { id: "glass", name: "유리", emoji: "🪟", color: "#67e8f9", weight: 1, strength: 1, score: 15, unlockLevel: 2 },
  { id: "steel", name: "철근", emoji: "🔩", color: "#4b5563", weight: 4, strength: 10, score: 18, unlockLevel: 2 },
  { id: "concrete", name: "콘크리트", emoji: "⬜", color: "#9ca3af", weight: 6, strength: 12, score: 20, unlockLevel: 3 },
  { id: "gold", name: "금", emoji: "🥇", color: "#fbbf24", weight: 7, strength: 6, score: 30, unlockLevel: 4 },
  { id: "diamond", name: "다이아몬드", emoji: "💎", color: "#60a5fa", weight: 3, strength: 15, score: 40, unlockLevel: 5 },
  { id: "crystal", name: "크리스탈", emoji: "🔮", color: "#c084fc", weight: 2, strength: 4, score: 25, unlockLevel: 3 },
  { id: "ice", name: "얼음", emoji: "🧊", color: "#a5f3fc", weight: 1, strength: 2, score: 20, unlockLevel: 4 },
  { id: "obsidian", name: "흑요석", emoji: "🖤", color: "#1e1b4b", weight: 8, strength: 20, score: 50, unlockLevel: 6 },
  { id: "rainbow", name: "무지개", emoji: "🌈", color: "#f472b6", weight: 2, strength: 7, score: 60, unlockLevel: 7 },
];

/* ───── 건물 미션 ───── */
interface Mission {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  targetHeight: number;
  targetScore: number;
  specialRule?: string;
  reward: number;
  xpReward: number;
  difficulty: number; // 1~5
}

const MISSIONS: Mission[] = [
  { id: "house", name: "작은 집", emoji: "🏠", desc: "3층 이상 집을 지어라!", targetHeight: 3, targetScore: 30, reward: 15, xpReward: 10, difficulty: 1 },
  { id: "tower", name: "탑", emoji: "🗼", desc: "5층 높이 탑을 쌓아라!", targetHeight: 5, targetScore: 60, reward: 25, xpReward: 15, difficulty: 1 },
  { id: "castle", name: "성", emoji: "🏰", desc: "넓고 높은 성을 지어라!", targetHeight: 4, targetScore: 100, reward: 35, xpReward: 20, difficulty: 2 },
  { id: "bridge", name: "다리", emoji: "🌉", desc: "3층 높이, 80점 이상!", targetHeight: 3, targetScore: 80, specialRule: "나무 금지!", reward: 30, xpReward: 18, difficulty: 2 },
  { id: "skyscraper", name: "마천루", emoji: "🏙️", desc: "7층 초고층 빌딩!", targetHeight: 7, targetScore: 120, reward: 50, xpReward: 30, difficulty: 3 },
  { id: "pyramid", name: "피라미드", emoji: "🔺", desc: "돌만 사용! 6층!", targetHeight: 6, targetScore: 100, specialRule: "돌만 사용!", reward: 45, xpReward: 25, difficulty: 3 },
  { id: "glasstower", name: "유리 타워", emoji: "🏢", desc: "유리를 3개 이상 사용! 5층!", targetHeight: 5, targetScore: 90, specialRule: "유리 3개 이상!", reward: 40, xpReward: 22, difficulty: 3 },
  { id: "palace", name: "궁전", emoji: "👑", desc: "금을 사용해 8층 궁전!", targetHeight: 8, targetScore: 200, specialRule: "금 2개 이상!", reward: 70, xpReward: 40, difficulty: 4 },
  { id: "babel", name: "바벨탑", emoji: "⛪", desc: "10층 전설의 탑!", targetHeight: 10, targetScore: 300, reward: 100, xpReward: 60, difficulty: 5 },
  { id: "space", name: "우주 기지", emoji: "🚀", desc: "다이아몬드+흑요석! 8층!", targetHeight: 8, targetScore: 250, specialRule: "다이아+흑요석 필수!", reward: 80, xpReward: 50, difficulty: 5 },
];

/* ───── 상점 ───── */
interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  price: number;
  effect: string;
  effectType: "extraSlot" | "stability" | "scoreBoost" | "extraTime";
  value: number;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: "blueprint", name: "설계도", emoji: "📐", desc: "블록 슬롯 +1", price: 50, effect: "+1 슬롯", effectType: "extraSlot", value: 1 },
  { id: "crane", name: "크레인", emoji: "🏗️", desc: "안정성 보너스", price: 80, effect: "+2 안정성", effectType: "stability", value: 2 },
  { id: "calculator", name: "계산기", emoji: "🧮", desc: "점수 보너스", price: 100, effect: "+20% 점수", effectType: "scoreBoost", value: 0.2 },
  { id: "hardhat", name: "안전모", emoji: "⛑️", desc: "추가 시간", price: 70, effect: "+10초", effectType: "extraTime", value: 10 },
  { id: "blueprint2", name: "고급 설계도", emoji: "📋", desc: "블록 슬롯 +2", price: 150, effect: "+2 슬롯", effectType: "extraSlot", value: 2 },
  { id: "megacrane", name: "대형 크레인", emoji: "🏗️", desc: "안정성 대폭 보너스", price: 200, effect: "+5 안정성", effectType: "stability", value: 5 },
  { id: "computer", name: "건축 AI", emoji: "💻", desc: "점수 대폭 보너스", price: 250, effect: "+40% 점수", effectType: "scoreBoost", value: 0.4 },
  { id: "overtime", name: "야근 커피", emoji: "☕", desc: "추가 시간 대폭", price: 180, effect: "+20초", effectType: "extraTime", value: 20 },
];

/* ───── 그리드 셀 ───── */
interface Cell {
  blockType: BlockType | null;
}

const GRID_WIDTH = 5;
const GRID_HEIGHT = 12;

type Screen = "main" | "mission" | "play" | "result" | "shop";

export default function ArchitectPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(40);
  const [highScore, setHighScore] = useState(0);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [ownedShopItems, setOwnedShopItems] = useState<string[]>([]);

  // 플레이 상태
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [currentMission, setCurrentMission] = useState<Mission | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [availableBlocks, setAvailableBlocks] = useState<BlockType[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<BlockType | null>(null);
  const [buildHeight, setBuildHeight] = useState(0);
  const [stability, setStability] = useState(100);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lastPlaced, setLastPlaced] = useState<string>("");
  const [floatTexts, setFloatTexts] = useState<{ id: number; text: string; x: number; y: number; color: string }[]>([]);
  const floatId = useRef(0);
  const [shaking, setShaking] = useState(false);
  const [warning, setWarning] = useState("");
  const [blocksUsed, setBlocksUsed] = useState<Record<string, number>>({});

  // 보너스
  const extraSlots = ownedShopItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "extraSlot" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const stabilityBonus = ownedShopItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "stability" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const scoreBoost = ownedShopItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "scoreBoost" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const extraTime = ownedShopItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "extraTime" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);

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
      endGame();
    }
  }, [gameActive, timeLeft]);

  // 안정성 체크
  useEffect(() => {
    if (stability <= 0 && gameActive) {
      setWarning("건물이 무너졌다!!");
      setShaking(true);
      setTimeout(() => {
        setShaking(false);
        endGame();
      }, 1500);
    }
  }, [stability, gameActive]);

  const initGrid = (): Cell[][] => {
    return Array.from({ length: GRID_HEIGHT }, () =>
      Array.from({ length: GRID_WIDTH }, () => ({ blockType: null }))
    );
  };

  const refreshBlocks = useCallback(() => {
    const unlocked = BLOCK_TYPES.filter(b => playerLevel >= b.unlockLevel);
    const count = 3 + extraSlots;
    const blocks: BlockType[] = [];
    for (let i = 0; i < count; i++) {
      blocks.push(unlocked[Math.floor(Math.random() * unlocked.length)]);
    }
    setAvailableBlocks(blocks);
  }, [playerLevel, extraSlots]);

  const startMission = useCallback((mission: Mission) => {
    setCurrentMission(mission);
    setGrid(initGrid());
    setScore(0);
    setTimeLeft(60 + extraTime);
    setStability(100 + stabilityBonus * 5);
    setCombo(0);
    setMaxCombo(0);
    setSelectedBlock(null);
    setBuildHeight(0);
    setBlocksUsed({});
    setFloatTexts([]);
    setLastPlaced("");
    setWarning("");
    setShaking(false);
    setGameActive(true);
    refreshBlocks();
    setScreen("play");
  }, [extraTime, stabilityBonus, refreshBlocks]);

  const endGame = useCallback(() => {
    setGameActive(false);
    if (timerRef.current) clearTimeout(timerRef.current);

    // 미션 체크
    let missionSuccess = false;
    if (currentMission) {
      const heightOk = buildHeight >= currentMission.targetHeight;
      const scoreOk = score >= currentMission.targetScore;
      let specialOk = true;

      if (currentMission.specialRule) {
        if (currentMission.id === "bridge") specialOk = !blocksUsed["wood"];
        if (currentMission.id === "pyramid") specialOk = Object.keys(blocksUsed).every(k => k === "stone");
        if (currentMission.id === "glasstower") specialOk = (blocksUsed["glass"] || 0) >= 3;
        if (currentMission.id === "palace") specialOk = (blocksUsed["gold"] || 0) >= 2;
        if (currentMission.id === "space") specialOk = (blocksUsed["diamond"] || 0) >= 1 && (blocksUsed["obsidian"] || 0) >= 1;
      }

      missionSuccess = heightOk && scoreOk && specialOk;
      if (missionSuccess && !completedMissions.includes(currentMission.id)) {
        setCompletedMissions(prev => [...prev, currentMission.id]);
      }
    }

    const earned = Math.floor(score / 5) + buildHeight * 3 + (missionSuccess && currentMission ? currentMission.reward : 0);
    setCoins(c => c + earned);
    setXp(x => x + Math.floor(score / 3) + (missionSuccess && currentMission ? currentMission.xpReward : 0));
    if (score > highScore) setHighScore(score);
    setScreen("result");
  }, [score, buildHeight, currentMission, blocksUsed, completedMissions, highScore]);

  const placeBlock = useCallback((col: number, e?: React.MouseEvent) => {
    if (!gameActive || !selectedBlock) return;

    // 가장 아래 빈 칸 찾기 (중력)
    let targetRow = -1;
    for (let row = GRID_HEIGHT - 1; row >= 0; row--) {
      if (!grid[row][col].blockType) {
        targetRow = row;
        break;
      }
    }
    if (targetRow === -1) {
      setWarning("이 열은 가득 찼어요!");
      setTimeout(() => setWarning(""), 1000);
      return;
    }

    // 아래 블록 강도 체크
    const belowRow = targetRow + 1;
    if (belowRow < GRID_HEIGHT && grid[belowRow][col].blockType) {
      const belowBlock = grid[belowRow][col].blockType!;
      if (selectedBlock.weight > belowBlock.strength) {
        // 안정성 감소
        const loss = (selectedBlock.weight - belowBlock.strength) * 5;
        setStability(s => Math.max(0, s - loss));
        setShaking(true);
        setTimeout(() => setShaking(false), 300);
        setWarning(`⚠️ 불안정! (-${loss} 안정성)`);
        setTimeout(() => setWarning(""), 1200);
      }
    }

    // 블록 배치
    const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
    newGrid[targetRow][col] = { blockType: selectedBlock };
    setGrid(newGrid);

    // 높이 갱신
    const newHeight = GRID_HEIGHT - targetRow;
    if (newHeight > buildHeight) setBuildHeight(newHeight);

    // 점수
    let heightBonus = newHeight;
    let comboBonus = combo >= 3 ? combo * 2 : 0;
    // 같은 블록 연속 콤보
    const isCombo = lastPlaced === selectedBlock.id;
    if (isCombo) {
      setCombo(c => {
        const next = c + 1;
        setMaxCombo(m => Math.max(m, next));
        return next;
      });
    } else {
      setCombo(1);
    }
    setLastPlaced(selectedBlock.id);

    // 같은 줄 보너스 (가로 한 줄 다 차면)
    let lineBonus = 0;
    const filledCells = newGrid[targetRow].filter(c => c.blockType !== null).length;
    if (filledCells === GRID_WIDTH) {
      lineBonus = 50;
      setWarning("🎉 한 줄 완성! +50점!");
      setTimeout(() => setWarning(""), 1200);
    }

    // 인접 블록 보너스 (같은 종류)
    let adjacentBonus = 0;
    const checkAdjacent = (r: number, c: number) => {
      if (r >= 0 && r < GRID_HEIGHT && c >= 0 && c < GRID_WIDTH) {
        return newGrid[r][c].blockType?.id === selectedBlock!.id;
      }
      return false;
    };
    if (checkAdjacent(targetRow - 1, col)) adjacentBonus += 5;
    if (checkAdjacent(targetRow + 1, col)) adjacentBonus += 5;
    if (checkAdjacent(targetRow, col - 1)) adjacentBonus += 5;
    if (checkAdjacent(targetRow, col + 1)) adjacentBonus += 5;

    const totalScore = Math.floor((selectedBlock.score + heightBonus + comboBonus + lineBonus + adjacentBonus) * (1 + scoreBoost));
    setScore(s => s + totalScore);

    // 블록 사용 기록
    setBlocksUsed(prev => ({ ...prev, [selectedBlock.id]: (prev[selectedBlock.id] || 0) + 1 }));

    // 플로팅 텍스트
    const id = floatId.current++;
    const x = e ? e.clientX : 100 + col * 50;
    const y = e ? e.clientY : 200;
    setFloatTexts(prev => [...prev, {
      id,
      text: `+${totalScore} ${selectedBlock.emoji}`,
      x, y,
      color: totalScore >= 50 ? "#fbbf24" : totalScore >= 25 ? "#60a5fa" : "#4ade80",
    }]);
    setTimeout(() => setFloatTexts(prev => prev.filter(f => f.id !== id)), 1000);

    // 블록 제거 및 새로 보충
    setAvailableBlocks(prev => {
      const idx = prev.indexOf(selectedBlock);
      const next = [...prev];
      if (idx !== -1) {
        const unlocked = BLOCK_TYPES.filter(b => playerLevel >= b.unlockLevel);
        next[idx] = unlocked[Math.floor(Math.random() * unlocked.length)];
      }
      return next;
    });
    setSelectedBlock(null);

  }, [gameActive, selectedBlock, grid, buildHeight, combo, lastPlaced, scoreBoost, playerLevel]);

  const buyItem = useCallback((id: string) => {
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item || coins < item.price || ownedShopItems.includes(id)) return;
    setCoins(c => c - item.price);
    setOwnedShopItems(prev => [...prev, id]);
  }, [coins, ownedShopItems]);

  /* ───── 메인 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-teal-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-emerald-300 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🏗️</div>
            <h1 className="text-3xl font-black mb-1">건축 퍼즐</h1>
            <p className="text-emerald-300 text-sm">블록을 쌓아 멋진 건물을 지어라!</p>
          </div>

          <div className="bg-emerald-900/40 rounded-xl p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-yellow-400 font-bold">🪙 {coins}코인</span>
              <span className="text-emerald-300 text-sm">Lv.{playerLevel}</span>
            </div>
            <div className="bg-emerald-900 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <div className="text-[10px] text-emerald-400 text-right mt-0.5">{xp}/{xpNeeded} XP</div>
            {highScore > 0 && <div className="text-xs text-yellow-300 text-center mt-1">🏆 최고 점수: {highScore}</div>}
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 mb-4 text-center">
            <div className="text-3xl mb-2">🧱🪨🪟💎</div>
            <p className="text-sm text-gray-300">다양한 블록으로 건물을 쌓아요!</p>
            <p className="text-sm text-gray-300">무거운 블록은 아래에, 가벼운 블록은 위에!</p>
            <p className="text-xs text-yellow-300 mt-1">안정성을 유지하며 높이 쌓으면 고득점!</p>
          </div>

          <div className="space-y-3">
            <button onClick={() => setScreen("mission")}
              className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-xl p-4 text-center text-lg font-black">
              🏗️ 미션 선택
            </button>
            <button onClick={() => setScreen("shop")}
              className="w-full bg-yellow-700/60 hover:bg-yellow-600/60 rounded-xl p-3 text-center">
              <span className="font-bold">🛒 장비 상점</span>
            </button>
          </div>

          <div className="mt-4 bg-black/30 rounded-xl p-3">
            <h3 className="text-sm font-bold mb-2 text-center">🧱 사용 가능한 블록 ({BLOCK_TYPES.filter(b => playerLevel >= b.unlockLevel).length}/{BLOCK_TYPES.length})</h3>
            <div className="flex flex-wrap gap-1 justify-center">
              {BLOCK_TYPES.map(b => (
                <div key={b.id} className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                  playerLevel >= b.unlockLevel ? "bg-emerald-800/50" : "bg-gray-800/50 opacity-40"
                }`} title={`${b.name} (무게:${b.weight} 강도:${b.strength})`}>
                  {playerLevel >= b.unlockLevel ? b.emoji : "🔒"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 미션 선택 ───── */
  if (screen === "mission") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-emerald-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-4">📋 건축 미션</h2>

          <div className="space-y-2">
            {MISSIONS.map(m => {
              const done = completedMissions.includes(m.id);
              const stars = m.difficulty;
              return (
                <button key={m.id} onClick={() => startMission(m)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    done ? "bg-green-900/30 border border-green-700" : "bg-black/30 hover:bg-black/50"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{m.emoji}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{m.name}</span>
                        {done && <span className="text-green-400 text-xs">✅ 완료</span>}
                      </div>
                      <div className="text-xs text-gray-400">{m.desc}</div>
                      {m.specialRule && <div className="text-xs text-yellow-400">⚠️ {m.specialRule}</div>}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-500">
                          {"⭐".repeat(stars)}{"☆".repeat(5 - stars)}
                        </span>
                        <span className="text-[10px] text-yellow-400">🪙 {m.reward}</span>
                      </div>
                    </div>
                    <div className="text-xs text-right text-gray-500">
                      <div>🏗️ {m.targetHeight}층</div>
                      <div>🎯 {m.targetScore}점</div>
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
  if (screen === "play" && currentMission) {
    return (
      <div className={`min-h-screen bg-gradient-to-b from-sky-200 via-sky-100 to-green-200 text-gray-900 p-3 relative overflow-hidden select-none ${shaking ? "animate-pulse" : ""}`}>
        <div className="max-w-md mx-auto">
          {/* 상단 */}
          <div className="flex justify-between items-center mb-1 text-sm">
            <span className="font-bold">⏱️ {timeLeft}초</span>
            <span className="font-bold">🎯 {score}/{currentMission.targetScore}</span>
            <span>🏗️ {buildHeight}/{currentMission.targetHeight}층</span>
          </div>

          {/* 안정성 */}
          <div className="mb-1">
            <div className="flex justify-between text-[10px] mb-0.5">
              <span>🏗️ 안정성</span>
              <span className={stability < 30 ? "text-red-600 font-bold" : ""}>{Math.floor(stability)}%</span>
            </div>
            <div className="bg-gray-300 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full transition-all" style={{
                width: `${Math.min(100, stability)}%`,
                background: stability >= 70 ? "#22c55e" : stability >= 40 ? "#f59e0b" : "#dc2626",
              }} />
            </div>
          </div>

          {combo >= 3 && (
            <div className="text-center mb-1">
              <span className="text-sm font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                🔥 {combo} COMBO!
              </span>
            </div>
          )}

          {warning && (
            <div className="text-center text-sm font-bold text-red-600 mb-1 animate-pulse">{warning}</div>
          )}

          {/* 미션 정보 */}
          <div className="text-center text-[10px] text-gray-600 mb-1">
            {currentMission.emoji} {currentMission.name} | 목표: {currentMission.targetHeight}층 & {currentMission.targetScore}점
            {currentMission.specialRule && <span className="text-yellow-600 ml-1">({currentMission.specialRule})</span>}
          </div>

          {/* 건축 그리드 */}
          <div className="bg-amber-100 border-2 border-amber-300 rounded-xl p-1 mb-2 relative">
            {/* 층 표시 */}
            <div className="absolute -left-4 top-0 bottom-0 flex flex-col justify-between text-[8px] text-gray-400 py-1">
              {Array.from({ length: GRID_HEIGHT }, (_, i) => (
                <div key={i} className="h-[28px] flex items-center">{GRID_HEIGHT - i}</div>
              ))}
            </div>

            {grid.map((row, rowIdx) => (
              <div key={rowIdx} className="flex gap-0.5 mb-0.5">
                {row.map((cell, colIdx) => (
                  <button key={colIdx}
                    onClick={(e) => placeBlock(colIdx, e)}
                    className={`flex-1 h-7 rounded transition-all flex items-center justify-center text-sm ${
                      cell.blockType
                        ? "shadow-inner"
                        : selectedBlock
                          ? "bg-gray-200/50 hover:bg-emerald-200/70 cursor-pointer"
                          : "bg-gray-100/30"
                    }`}
                    style={cell.blockType ? {
                      backgroundColor: cell.blockType.color + "cc",
                      border: `1px solid ${cell.blockType.color}`,
                    } : {}}
                    disabled={!selectedBlock || !!cell.blockType}>
                    {cell.blockType ? cell.blockType.emoji : ""}
                  </button>
                ))}
              </div>
            ))}

            {/* 땅 */}
            <div className="flex gap-0.5">
              {Array.from({ length: GRID_WIDTH }, (_, i) => (
                <div key={i} className="flex-1 h-3 bg-green-700 rounded-b" />
              ))}
            </div>
          </div>

          {/* 블록 선택 */}
          <div className="bg-white rounded-xl p-2 shadow-md">
            <div className="text-xs font-bold text-center mb-1 text-gray-600">🧱 블록 선택 (터치 후 위 그리드에 배치)</div>
            <div className="flex gap-1 justify-center">
              {availableBlocks.map((block, i) => (
                <button key={i} onClick={() => setSelectedBlock(block)}
                  className={`p-2 rounded-xl text-center transition-all flex-1 ${
                    selectedBlock === block
                      ? "ring-2 ring-emerald-500 bg-emerald-50 scale-105"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}>
                  <div className="text-2xl">{block.emoji}</div>
                  <div className="text-[8px] font-bold">{block.name}</div>
                  <div className="text-[7px] text-gray-500">W:{block.weight} S:{block.strength}</div>
                  <div className="text-[7px] text-emerald-600">+{block.score}</div>
                </button>
              ))}
            </div>
            {selectedBlock && (
              <div className="text-center text-[10px] text-emerald-600 mt-1">
                {selectedBlock.emoji} {selectedBlock.name} 선택됨 — 위 그리드에 배치하세요!
              </div>
            )}
          </div>
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
  if (screen === "result" && currentMission) {
    const heightOk = buildHeight >= currentMission.targetHeight;
    const scoreOk = score >= currentMission.targetScore;
    let specialOk = true;
    if (currentMission.specialRule) {
      if (currentMission.id === "bridge") specialOk = !blocksUsed["wood"];
      if (currentMission.id === "pyramid") specialOk = Object.keys(blocksUsed).every(k => k === "stone");
      if (currentMission.id === "glasstower") specialOk = (blocksUsed["glass"] || 0) >= 3;
      if (currentMission.id === "palace") specialOk = (blocksUsed["gold"] || 0) >= 2;
      if (currentMission.id === "space") specialOk = (blocksUsed["diamond"] || 0) >= 1 && (blocksUsed["obsidian"] || 0) >= 1;
    }
    const missionSuccess = heightOk && scoreOk && specialOk;
    const earned = Math.floor(score / 5) + buildHeight * 3 + (missionSuccess ? currentMission.reward : 0);

    return (
      <div className={`min-h-screen bg-gradient-to-b ${missionSuccess ? "from-emerald-700 via-teal-800 to-slate-950" : "from-gray-800 via-gray-900 to-black"} text-white p-4 flex items-center justify-center`}>
        <div className="max-w-md mx-auto text-center">
          <div className="text-8xl mb-4">{missionSuccess ? "🎉" : "🏚️"}</div>
          <h2 className="text-3xl font-black mb-2" style={{ color: missionSuccess ? "#6ee7b7" : "#f87171" }}>
            {missionSuccess ? "건축 성공!" : "미션 실패..."}
          </h2>
          <p className="text-gray-400 mb-2">{currentMission.emoji} {currentMission.name}</p>

          {/* 조건 체크리스트 */}
          <div className="bg-black/40 rounded-xl p-3 mb-4 text-left text-sm">
            <div className={`flex items-center gap-2 ${heightOk ? "text-green-400" : "text-red-400"}`}>
              <span>{heightOk ? "✅" : "❌"}</span>
              <span>높이: {buildHeight}/{currentMission.targetHeight}층</span>
            </div>
            <div className={`flex items-center gap-2 ${scoreOk ? "text-green-400" : "text-red-400"}`}>
              <span>{scoreOk ? "✅" : "❌"}</span>
              <span>점수: {score}/{currentMission.targetScore}점</span>
            </div>
            {currentMission.specialRule && (
              <div className={`flex items-center gap-2 ${specialOk ? "text-green-400" : "text-red-400"}`}>
                <span>{specialOk ? "✅" : "❌"}</span>
                <span>{currentMission.specialRule}</span>
              </div>
            )}
          </div>

          <div className="bg-black/40 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-2xl">🎯</div><div className="text-xl font-bold">{score}</div><div className="text-xs text-gray-400">점수</div></div>
              <div><div className="text-2xl">🏗️</div><div className="text-xl font-bold">{buildHeight}층</div><div className="text-xs text-gray-400">높이</div></div>
              <div><div className="text-2xl">🔥</div><div className="text-xl font-bold">{maxCombo}</div><div className="text-xs text-gray-400">최대 콤보</div></div>
              <div><div className="text-2xl">🪙</div><div className="text-xl font-bold text-yellow-400">+{earned}</div><div className="text-xs text-gray-400">획득 코인</div></div>
            </div>
          </div>

          {score > highScore && score > 0 && (
            <div className="text-yellow-300 font-bold mb-3">🏆 새로운 최고 기록!</div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setScreen("mission")} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">📋 미션</button>
            <button onClick={() => startMission(currentMission)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 rounded-xl p-3 font-bold">🔄 재도전</button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 상점 ───── */
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-900 via-emerald-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-emerald-300 text-sm mb-4">← 뒤로</button>
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
