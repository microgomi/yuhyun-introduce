"use client";

import Link from "next/link";
import { useState, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "playing" | "battle" | "result";

interface RobotDef {
  level: number;
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  desc: string;
}

interface Cell {
  robot: RobotDef | null;
}

interface Enemy {
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  atk: number;
  reward: number;
}

interface BattleLog {
  text: string;
  type: "player" | "enemy" | "info";
}

// --- Constants ---
const GRID_SIZE = 5;

const ROBOTS: RobotDef[] = [
  { level: 1, name: "나사", emoji: "🔩", hp: 10, atk: 3, desc: "작은 나사 하나" },
  { level: 2, name: "기어", emoji: "⚙️", hp: 25, atk: 7, desc: "톱니바퀴가 돌아간다" },
  { level: 3, name: "팔", emoji: "🦾", hp: 50, atk: 15, desc: "로봇 팔이 완성!" },
  { level: 4, name: "다리", emoji: "🦿", hp: 80, atk: 22, desc: "튼튼한 로봇 다리" },
  { level: 5, name: "미니봇", emoji: "🤖", hp: 130, atk: 35, desc: "작은 로봇 완성!" },
  { level: 6, name: "전투봇", emoji: "🦾🤖", hp: 200, atk: 55, desc: "전투형 로봇" },
  { level: 7, name: "탱크봇", emoji: "🛡️🤖", hp: 350, atk: 80, desc: "방어력 최강!" },
  { level: 8, name: "메가봇", emoji: "⚡🤖", hp: 500, atk: 120, desc: "메가 파워 로봇!" },
  { level: 9, name: "울트라봇", emoji: "🔥🤖", hp: 800, atk: 200, desc: "울트라급 로봇!" },
  { level: 10, name: "갓 로봇", emoji: "👑🤖", hp: 1500, atk: 400, desc: "최강의 갓 로봇!!" },
];

const ENEMIES: Enemy[] = [
  { name: "슬라임", emoji: "🟢", hp: 20, maxHp: 20, atk: 5, reward: 2 },
  { name: "박쥐", emoji: "🦇", hp: 40, maxHp: 40, atk: 10, reward: 3 },
  { name: "해골", emoji: "💀", hp: 80, maxHp: 80, atk: 18, reward: 4 },
  { name: "고블린", emoji: "👺", hp: 130, maxHp: 130, atk: 28, reward: 5 },
  { name: "오크", emoji: "👹", hp: 200, maxHp: 200, atk: 40, reward: 6 },
  { name: "용", emoji: "🐉", hp: 350, maxHp: 350, atk: 60, reward: 8 },
  { name: "악마", emoji: "😈", hp: 550, maxHp: 550, atk: 90, reward: 10 },
  { name: "마왕", emoji: "👿", hp: 900, maxHp: 900, atk: 140, reward: 15 },
  { name: "어둠의 왕", emoji: "🌑", hp: 1400, maxHp: 1400, atk: 200, reward: 20 },
  { name: "최종 보스", emoji: "☠️", hp: 2500, maxHp: 2500, atk: 350, reward: 50 },
];

const emptyGrid = (): Cell[][] =>
  Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ robot: null }))
  );

export default function RobotMergePage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [grid, setGrid] = useState<Cell[][]>(emptyGrid());
  const [coins, setCoins] = useState(10);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [mergeCount, setMergeCount] = useState(0);
  const [highestLevel, setHighestLevel] = useState(1);
  const [totalGames, setTotalGames] = useState(0);
  const [spawnCost, setSpawnCost] = useState(3);
  const [message, setMessage] = useState("");

  // Battle state
  const [battleRobot, setBattleRobot] = useState<RobotDef | null>(null);
  const [battleRobotHp, setBattleRobotHp] = useState(0);
  const [battleEnemy, setBattleEnemy] = useState<Enemy | null>(null);
  const [battleEnemyHp, setBattleEnemyHp] = useState(0);
  const [battleLog, setBattleLog] = useState<BattleLog[]>([]);
  const [battleStage, setBattleStage] = useState(0);
  const [battleTurn, setBattleTurn] = useState<"player" | "enemy" | "done">("player");
  const [victories, setVictories] = useState(0);

  const showMsg = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 1500);
  }, []);

  // Start new game
  const startGame = useCallback(() => {
    setGrid(emptyGrid());
    setCoins(10);
    setSelected(null);
    setScore(0);
    setMergeCount(0);
    setHighestLevel(1);
    setSpawnCost(3);
    setMessage("");
    setBattleStage(0);
    setVictories(0);
    setScreen("playing");
  }, []);

  // Spawn random robot (level 1 or 2)
  const spawnRobot = useCallback(() => {
    if (coins < spawnCost) {
      showMsg("💰 코인이 부족해요!");
      return;
    }

    // Find empty cells
    const empties: { r: number; c: number }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!grid[r][c].robot) empties.push({ r, c });
      }
    }
    if (empties.length === 0) {
      showMsg("❌ 빈 칸이 없어요!");
      return;
    }

    const pos = empties[Math.floor(Math.random() * empties.length)];
    const level = Math.random() < 0.75 ? 1 : 2;
    const robot = ROBOTS[level - 1];

    setGrid((prev) => {
      const next = prev.map((row) => row.map((cell) => ({ ...cell })));
      next[pos.r][pos.c].robot = robot;
      return next;
    });
    setCoins((c) => c - spawnCost);
    setScore((s) => s + 5);
  }, [coins, spawnCost, grid, showMsg]);

  // Cell tap
  const handleCellTap = useCallback((r: number, c: number) => {
    const cell = grid[r][c];

    if (!selected) {
      if (cell.robot) {
        setSelected({ r, c });
      }
      return;
    }

    // Same cell → deselect
    if (selected.r === r && selected.c === c) {
      setSelected(null);
      return;
    }

    const selCell = grid[selected.r][selected.c];

    // Target is empty → move
    if (!cell.robot && selCell.robot) {
      setGrid((prev) => {
        const next = prev.map((row) => row.map((cl) => ({ ...cl })));
        next[r][c].robot = selCell.robot;
        next[selected.r][selected.c].robot = null;
        return next;
      });
      setSelected(null);
      return;
    }

    // Both have robots → try merge
    if (cell.robot && selCell.robot) {
      if (cell.robot.level === selCell.robot.level && cell.robot.level < ROBOTS.length) {
        const newLevel = cell.robot.level + 1;
        const newRobot = ROBOTS[newLevel - 1];

        setGrid((prev) => {
          const next = prev.map((row) => row.map((cl) => ({ ...cl })));
          next[r][c].robot = newRobot;
          next[selected.r][selected.c].robot = null;
          return next;
        });

        const mergeScore = newLevel * 20;
        setScore((s) => s + mergeScore);
        setMergeCount((m) => m + 1);
        setCoins((co) => co + Math.floor(newLevel * 1.5));
        if (newLevel > highestLevel) setHighestLevel(newLevel);
        showMsg(`⚡ ${newRobot.emoji} ${newRobot.name} 합체 완성! +${mergeScore}점`);
      } else if (cell.robot.level !== selCell.robot.level) {
        showMsg("❌ 같은 레벨끼리만 합체 가능!");
      } else {
        showMsg("⭐ 이미 최고 레벨!");
      }
      setSelected(null);
      return;
    }

    setSelected(null);
  }, [grid, selected, highestLevel, showMsg]);

  // Find strongest robot for battle
  const getStrongest = useCallback((): { robot: RobotDef; r: number; c: number } | null => {
    let best: { robot: RobotDef; r: number; c: number } | null = null;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const rob = grid[r][c].robot;
        if (rob && (!best || rob.level > best.robot.level)) {
          best = { robot: rob, r, c };
        }
      }
    }
    return best;
  }, [grid]);

  // Start battle
  const startBattle = useCallback(() => {
    const strongest = getStrongest();
    if (!strongest) {
      showMsg("❌ 로봇이 없어요!");
      return;
    }

    const enemyIdx = Math.min(battleStage, ENEMIES.length - 1);
    const enemy = { ...ENEMIES[enemyIdx], hp: ENEMIES[enemyIdx].maxHp };

    setBattleRobot(strongest.robot);
    setBattleRobotHp(strongest.robot.hp);
    setBattleEnemy(enemy);
    setBattleEnemyHp(enemy.hp);
    setBattleLog([{ text: `${strongest.robot.emoji} ${strongest.robot.name} VS ${enemy.emoji} ${enemy.name}!`, type: "info" }]);
    setBattleTurn("player");

    // Remove robot from grid
    setGrid((prev) => {
      const next = prev.map((row) => row.map((cl) => ({ ...cl })));
      next[strongest.r][strongest.c].robot = null;
      return next;
    });

    setScreen("battle");
  }, [getStrongest, battleStage, showMsg]);

  // Battle attack
  const battleAttack = useCallback((isSpecial: boolean) => {
    if (battleTurn !== "player" || !battleRobot || !battleEnemy) return;

    let dmg = battleRobot.atk;
    let msg: string;

    if (isSpecial) {
      const crit = Math.random() < 0.3;
      if (crit) {
        dmg = Math.floor(dmg * 2.5);
        msg = `💥 ${battleRobot.emoji} 크리티컬! ${dmg} 데미지!`;
      } else {
        const miss = Math.random() < 0.25;
        if (miss) {
          dmg = 0;
          msg = `😅 ${battleRobot.emoji} 빗나감!`;
        } else {
          dmg = Math.floor(dmg * 1.5);
          msg = `⚡ ${battleRobot.emoji} 필살기! ${dmg} 데미지!`;
        }
      }
    } else {
      dmg = Math.floor(dmg * (0.9 + Math.random() * 0.2));
      msg = `🤖 ${battleRobot.emoji} 공격! ${dmg} 데미지!`;
    }

    const newEnemyHp = Math.max(0, battleEnemyHp - dmg);
    setBattleEnemyHp(newEnemyHp);
    setBattleLog((prev) => [...prev, { text: msg, type: "player" }]);

    if (newEnemyHp <= 0) {
      const reward = battleEnemy.reward;
      setBattleLog((prev) => [...prev, { text: `🎉 ${battleEnemy.emoji} ${battleEnemy.name} 처치! +${reward} 코인`, type: "info" }]);
      setBattleTurn("done");
      setTimeout(() => {
        setCoins((c) => c + reward);
        setScore((s) => s + reward * 10);
        setBestScore((prev) => Math.max(prev, score + reward * 10));
        setVictories((v) => v + 1);
        setBattleStage((s) => s + 1);
        setScreen("playing");
        showMsg(`🎉 승리! +${reward} 코인!`);
      }, 1500);
      return;
    }

    // Enemy turn
    setBattleTurn("enemy");
    setTimeout(() => {
      if (!battleRobot) return;
      const eDmg = Math.floor(battleEnemy.atk * (0.85 + Math.random() * 0.3));
      const newRobotHp = Math.max(0, battleRobotHp - eDmg);
      setBattleRobotHp(newRobotHp);
      setBattleLog((prev) => [...prev, { text: `${battleEnemy.emoji} ${battleEnemy.name} 공격! ${eDmg} 데미지!`, type: "enemy" }]);

      if (newRobotHp <= 0) {
        setBattleLog((prev) => [...prev, { text: `💔 ${battleRobot.emoji} 파괴됨...`, type: "info" }]);
        setBattleTurn("done");
        setTimeout(() => {
          setBestScore((prev) => Math.max(prev, score));
          setScreen("playing");
          showMsg("💔 로봇이 파괴되었어요...");
        }, 1500);
        return;
      }

      setBattleTurn("player");
    }, 800);
  }, [battleTurn, battleRobot, battleEnemy, battleEnemyHp, battleRobotHp, score, showMsg]);

  // Sell robot
  const sellSelected = useCallback(() => {
    if (!selected) return;
    const robot = grid[selected.r][selected.c].robot;
    if (!robot) return;

    const sellPrice = robot.level * 2;
    setGrid((prev) => {
      const next = prev.map((row) => row.map((cl) => ({ ...cl })));
      next[selected.r][selected.c].robot = null;
      return next;
    });
    setCoins((c) => c + sellPrice);
    setSelected(null);
    showMsg(`💰 ${robot.emoji} 판매! +${sellPrice} 코인`);
  }, [selected, grid, showMsg]);

  // Count robots on grid
  const robotCount = grid.flat().filter((c) => c.robot).length;
  const strongest = getStrongest();

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white">
      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">← 홈</Link>

          <div className="text-7xl">🤖⚡🤖</div>
          <h1 className="text-4xl font-black">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">로봇 합체</span>
          </h1>
          <p className="text-lg text-slate-400">로봇을 합체해서 최강의 로봇을 만들어라!</p>

          <button onClick={startGame}
            className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-12 py-4 text-xl font-black shadow-lg shadow-cyan-500/30 transition-transform hover:scale-105 active:scale-95">
            🔧 게임 시작!
          </button>

          {bestScore > 0 && (
            <div className="rounded-xl bg-white/5 px-8 py-4 space-y-1">
              <p className="text-sm text-slate-400">🏆 최고점수: <span className="font-bold text-amber-400">{bestScore}</span></p>
              <p className="text-sm text-slate-400">🎮 플레이: <span className="font-bold text-cyan-400">{totalGames}회</span></p>
            </div>
          )}

          <div className="w-full max-w-sm rounded-xl bg-white/5 p-4 text-left text-xs text-slate-400 space-y-2">
            <p className="font-bold text-cyan-400">🎮 플레이 방법</p>
            <p>1️⃣ 코인으로 로봇 부품을 소환해요</p>
            <p>2️⃣ 같은 레벨 로봇을 탭해서 합체!</p>
            <p>3️⃣ 합체할수록 강력한 로봇이 탄생!</p>
            <p>4️⃣ 강한 로봇으로 적과 배틀!</p>
            <p className="font-bold text-cyan-400 mt-2">🤖 로봇 단계</p>
            <div className="grid grid-cols-2 gap-1 text-center">
              {ROBOTS.slice(0, 6).map((r) => (
                <span key={r.level}>Lv.{r.level} {r.emoji} {r.name}</span>
              ))}
            </div>
            <p className="text-center">... Lv.10 👑🤖 갓 로봇!</p>
          </div>
        </div>
      )}

      {/* Playing */}
      {screen === "playing" && (
        <div className="flex min-h-screen flex-col items-center pt-3 px-3">
          <Link href="/" className="absolute left-3 top-3 rounded-lg bg-white/10 px-2 py-1 text-xs backdrop-blur hover:bg-white/20">← 홈</Link>

          {/* Stats */}
          <div className="mb-2 flex w-full max-w-[340px] items-center justify-between text-xs">
            <span className="rounded-lg bg-amber-500/20 px-2 py-1 text-amber-400 font-bold">💰 {coins}</span>
            <span className="rounded-lg bg-cyan-500/20 px-2 py-1 text-cyan-400 font-bold">⭐ {score}</span>
            <span className="rounded-lg bg-purple-500/20 px-2 py-1 text-purple-400 font-bold">⚔️ {battleStage}스테이지</span>
          </div>

          {message && (
            <div className="mb-2 rounded-lg bg-white/10 px-4 py-1.5 text-center text-sm font-bold animate-pulse">{message}</div>
          )}

          {/* Grid */}
          <div className="rounded-2xl border-2 border-cyan-500/20 bg-black/30 p-3 backdrop-blur">
            <div className="grid grid-cols-5 gap-2">
              {grid.map((row, r) =>
                row.map((cell, c) => {
                  const isSelected = selected?.r === r && selected?.c === c;
                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => handleCellTap(r, c)}
                      className={`flex h-[58px] w-[58px] flex-col items-center justify-center rounded-xl border-2 transition-all active:scale-90
                        ${isSelected
                          ? "border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/30 scale-105"
                          : cell.robot
                            ? "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
                            : "border-white/5 bg-white/[0.02] hover:border-white/10"
                        }`}
                    >
                      {cell.robot ? (
                        <>
                          <span className="text-2xl leading-none">{cell.robot.emoji}</span>
                          <span className="mt-0.5 text-[9px] font-bold text-slate-400">Lv.{cell.robot.level}</span>
                        </>
                      ) : (
                        <span className="text-lg text-white/10">+</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected info */}
          {selected && grid[selected.r][selected.c].robot && (
            <div className="mt-2 w-full max-w-[340px] rounded-xl bg-white/5 p-3 text-center text-sm">
              <p className="text-lg">{grid[selected.r][selected.c].robot!.emoji} <span className="font-bold">{grid[selected.r][selected.c].robot!.name}</span></p>
              <p className="text-xs text-slate-400">{grid[selected.r][selected.c].robot!.desc}</p>
              <p className="text-xs text-slate-400 mt-1">
                ❤️ HP: {grid[selected.r][selected.c].robot!.hp} | ⚔️ ATK: {grid[selected.r][selected.c].robot!.atk}
              </p>
              <button onClick={sellSelected}
                className="mt-2 rounded-lg bg-amber-500/20 px-4 py-1 text-xs text-amber-400 font-bold hover:bg-amber-500/30">
                💰 판매 (+{grid[selected.r][selected.c].robot!.level * 2} 코인)
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex w-full max-w-[340px] gap-2">
            <button onClick={spawnRobot}
              className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 py-3 text-center font-bold transition-transform hover:scale-105 active:scale-95 text-sm">
              🔧 소환 ({spawnCost}💰)
            </button>
            <button onClick={startBattle}
              disabled={robotCount === 0}
              className={`flex-1 rounded-xl py-3 text-center font-bold transition-transform text-sm
                ${robotCount > 0
                  ? "bg-gradient-to-r from-red-500 to-orange-500 hover:scale-105 active:scale-95"
                  : "bg-white/10 text-slate-500 cursor-not-allowed"
                }`}>
              ⚔️ 배틀!
            </button>
          </div>

          {/* Strongest info */}
          {strongest && (
            <div className="mt-2 text-center text-xs text-slate-500">
              최강 로봇: {strongest.robot.emoji} {strongest.robot.name} (Lv.{strongest.robot.level})
              {battleStage < ENEMIES.length && (
                <span> → 상대: {ENEMIES[Math.min(battleStage, ENEMIES.length - 1)].emoji} {ENEMIES[Math.min(battleStage, ENEMIES.length - 1)].name}</span>
              )}
            </div>
          )}

          {/* Merge hint */}
          <div className="mt-2 text-center text-[10px] text-slate-600">
            💡 같은 레벨 로봇 두 개를 순서대로 탭하면 합체!
          </div>

          {/* Stats */}
          <div className="mt-2 flex gap-4 text-[10px] text-slate-600">
            <span>🔧 합체: {mergeCount}회</span>
            <span>👑 최고 Lv: {highestLevel}</span>
            <span>🏆 승리: {victories}회</span>
          </div>

          <button onClick={() => { setBestScore((p) => Math.max(p, score)); setTotalGames((g) => g + 1); setScreen("menu"); }}
            className="mt-4 rounded-lg bg-white/5 px-4 py-1 text-xs text-slate-500 hover:bg-white/10">
            메뉴로
          </button>
        </div>
      )}

      {/* Battle */}
      {screen === "battle" && battleRobot && battleEnemy && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <h2 className="text-2xl font-black text-amber-400">⚔️ 배틀!</h2>

          {/* Fighters */}
          <div className="flex w-full max-w-sm items-center justify-between">
            {/* Robot */}
            <div className="flex flex-col items-center gap-2">
              <span className={`text-5xl ${battleTurn === "player" ? "animate-bounce" : ""}`}>{battleRobot.emoji}</span>
              <p className="text-sm font-bold">{battleRobot.name}</p>
              <div className="w-24 rounded-full bg-black/50 h-3 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.max(0, (battleRobotHp / battleRobot.hp) * 100)}%` }} />
              </div>
              <p className="text-xs text-slate-400">❤️ {battleRobotHp}/{battleRobot.hp}</p>
            </div>

            <span className="text-3xl font-black text-red-400">VS</span>

            {/* Enemy */}
            <div className="flex flex-col items-center gap-2">
              <span className={`text-5xl ${battleTurn === "enemy" ? "animate-bounce" : ""}`}>{battleEnemy.emoji}</span>
              <p className="text-sm font-bold">{battleEnemy.name}</p>
              <div className="w-24 rounded-full bg-black/50 h-3 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-300"
                  style={{ width: `${Math.max(0, (battleEnemyHp / battleEnemy.maxHp) * 100)}%` }} />
              </div>
              <p className="text-xs text-slate-400">❤️ {battleEnemyHp}/{battleEnemy.maxHp}</p>
            </div>
          </div>

          {/* Battle log */}
          <div className="w-full max-w-sm rounded-xl bg-black/30 p-3 h-36 overflow-y-auto space-y-1">
            {battleLog.map((log, i) => (
              <p key={i} className={`text-xs ${
                log.type === "player" ? "text-cyan-400" : log.type === "enemy" ? "text-red-400" : "text-amber-400"
              }`}>
                {log.text}
              </p>
            ))}
          </div>

          {/* Battle actions */}
          {battleTurn === "player" && (
            <div className="flex gap-3">
              <button onClick={() => battleAttack(false)}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
                🤖 일반공격
              </button>
              <button onClick={() => battleAttack(true)}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
                ⚡ 필살기
              </button>
            </div>
          )}

          {battleTurn === "enemy" && (
            <p className="text-sm text-red-400 animate-pulse font-bold">적이 공격 중...</p>
          )}
        </div>
      )}
    </div>
  );
}
