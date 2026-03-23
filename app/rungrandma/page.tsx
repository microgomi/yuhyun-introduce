"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

/* ═══════════════════════════════════════════
   할머니한테서 도망치기 - Run from Grandma!
   ═══════════════════════════════════════════ */

// ──── 타입 ────
interface Pos { x: number; y: number }
interface PowerUp { pos: Pos; type: PowerUpType; id: number }
interface HideSpot { pos: Pos; type: "closet" | "bed" | "curtain"; emoji: string; label: string }

type PowerUpType = "cookie" | "remote" | "doll" | "shoes";
type CellType = "floor" | "wall" | "furniture" | "door";
type RoomName = "거실" | "부엌" | "방" | "화장실" | "베란다" | "창고" | "복도";
type Difficulty = "쉬움" | "보통" | "어려움";
type GameState = "menu" | "playing" | "hiding" | "caught" | "won";

interface Cell {
  type: CellType;
  emoji: string;
  room: RoomName;
  walkable: boolean;
}

// ──── 상수 ────
const COLS = 12;
const ROWS = 8;
const GAME_DURATION = 90;
const TICK_MS = 200;

const POWER_UP_INFO: Record<PowerUpType, { emoji: string; name: string; desc: string }> = {
  cookie: { emoji: "🍪", name: "쿠키", desc: "할머니를 5초간 유인!" },
  remote: { emoji: "📺", name: "리모컨", desc: "TV 켜기! 5초간 멈춤" },
  doll:   { emoji: "🧸", name: "인형", desc: "던져서 할머니 유인!" },
  shoes:  { emoji: "👟", name: "운동화", desc: "3초간 속도 2배!" },
};

const GRANDMA_DIALOGUES = [
  "유현아~ 어디 있니?",
  "밥 다 식겠다!",
  "여기 있었구나! 아... 아닌가?",
  "할머니가 맛있는 거 만들었는데~",
  "공부 안 하면 혼난다!",
  "밥 먹어라!",
  "공부해!",
  "이리 와!",
  "어딜 도망가!",
  "할머니 말 안 들을 거야?",
  "여기 숨었겠지~?",
  "나와라~ 혼 안 낸다~",
];

const CAUGHT_SCENES = [
  { title: "밥 먹기 엔딩 🍚", desc: "할머니가 밥 3공기를 먹였습니다...\n배가 터질 것 같아요!" },
  { title: "공부 엔딩 📚", desc: "할머니가 수학 문제집을 꺼냈습니다...\n100문제를 풀어야 합니다!" },
  { title: "목욕 엔딩 🛁", desc: "할머니가 때밀이 타올을 들고 옵니다...\n등이 빨개졌어요!" },
  { title: "간식 폭격 엔딩 🍰", desc: "할머니가 간식을 끝없이 줍니다...\n떡, 과일, 약과, 한과..." },
];

// ──── 맵 정의 ────
// 0=floor, 1=wall, 2=sofa, 3=table, 4=bed, 5=fridge, 6=sink, 7=toilet, 8=washer, 9=shelf
const MAP_DATA: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,2,0,1,0,0,5,0,1,1],
  [1,0,0,0,0,1,0,3,0,0,1,1],
  [1,0,3,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,1,0,4,0,0,0,1],
  [1,0,0,0,0,1,0,0,0,1,7,1],
  [1,0,9,0,0,1,0,0,0,1,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1],
];

const ROOM_MAP: RoomName[][] = [
  ["복도","복도","복도","복도","복도","복도","복도","복도","복도","복도","복도","복도"],
  ["거실","거실","거실","거실","거실","부엌","부엌","부엌","부엌","부엌","창고","창고"],
  ["거실","거실","거실","거실","거실","부엌","부엌","부엌","부엌","부엌","창고","창고"],
  ["거실","거실","거실","거실","거실","복도","복도","방","방","방","방","베란다"],
  ["거실","거실","거실","거실","거실","방","방","방","방","방","방","베란다"],
  ["복도","복도","복도","복도","복도","방","방","방","방","화장실","화장실","베란다"],
  ["복도","복도","창고","창고","창고","방","방","방","방","화장실","화장실","베란다"],
  ["복도","복도","복도","복도","복도","복도","복도","복도","복도","복도","복도","복도"],
];

const FURNITURE_EMOJI: Record<number, string> = {
  0: "", 1: "🧱", 2: "🛋️", 3: "🪑", 4: "🛏️", 5: "🧊", 6: "🚰", 7: "🚽", 8: "🫧", 9: "📦",
};

const ROOM_COLORS: Record<RoomName, string> = {
  "거실": "bg-amber-900/60",
  "부엌": "bg-orange-900/60",
  "방": "bg-yellow-900/50",
  "화장실": "bg-cyan-900/50",
  "베란다": "bg-green-900/40",
  "창고": "bg-stone-800/60",
  "복도": "bg-stone-700/50",
};

function buildGrid(): Cell[][] {
  const grid: Cell[][] = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      const v = MAP_DATA[r][c];
      const room = ROOM_MAP[r][c];
      const isWall = v === 1;
      const isFurniture = v >= 2;
      grid[r][c] = {
        type: isWall ? "wall" : isFurniture ? "furniture" : "floor",
        emoji: FURNITURE_EMOJI[v],
        room,
        walkable: !isWall && !isFurniture,
      };
    }
  }
  return grid;
}

const HIDE_SPOTS: HideSpot[] = [
  { pos: { x: 3, y: 1 }, type: "closet", emoji: "🚪", label: "옷장" },
  { pos: { x: 7, y: 4 }, type: "bed", emoji: "🛏️", label: "침대 밑" },
  { pos: { x: 4, y: 5 }, type: "curtain", emoji: "🪟", label: "커튼 뒤" },
  { pos: { x: 2, y: 6 }, type: "closet", emoji: "🚪", label: "창고 문" },
  { pos: { x: 10, y: 5 }, type: "curtain", emoji: "🪟", label: "화장실 커튼" },
];

// ──── BFS 경로 찾기 ────
function bfs(grid: Cell[][], from: Pos, to: Pos): Pos | null {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const queue: { pos: Pos; first: Pos | null }[] = [{ pos: from, first: null }];
  visited[from.y][from.x] = true;

  const dirs = [
    { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
  ];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.pos.x === to.x && cur.pos.y === to.y) {
      return cur.first;
    }
    for (const d of dirs) {
      const nx = cur.pos.x + d.x;
      const ny = cur.pos.y + d.y;
      if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !visited[ny][nx] && grid[ny][nx].walkable) {
        visited[ny][nx] = true;
        queue.push({ pos: { x: nx, y: ny }, first: cur.first || { x: nx, y: ny } });
      }
    }
  }
  return null;
}

// ──── 맨해튼 거리 ────
function dist(a: Pos, b: Pos) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export default function RunGrandmaGame() {
  const grid = useRef(buildGrid()).current;

  // 게임 상태
  const [gameState, setGameState] = useState<GameState>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("보통");
  const [player, setPlayer] = useState<Pos>({ x: 1, y: 3 });
  const [grandma, setGrandma] = useState<Pos>({ x: 8, y: 2 });
  const [grandpa, setGrandpa] = useState<Pos>({ x: 10, y: 1 });
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [inventory, setInventory] = useState<PowerUpType[]>([]);
  const [dialogue, setDialogue] = useState("");
  const [dialogueTimer, setDialogueTimer] = useState(0);
  const [isHiding, setIsHiding] = useState(false);
  const [hideSpotIdx, setHideSpotIdx] = useState(-1);
  const [hideTension, setHideTension] = useState(0);
  const [speedBoost, setSpeedBoost] = useState(false);
  const [grandmaDistracted, setGrandmaDistracted] = useState(false);
  const [distractTarget, setDistractTarget] = useState<Pos | null>(null);
  const [grandmaMoveCounter, setGrandmaMoveCounter] = useState(0);
  const [caughtScene, setCaughtScene] = useState(CAUGHT_SCENES[0]);
  const [dangerGlow, setDangerGlow] = useState(false);
  const [timesHidden, setTimesHidden] = useState(0);
  const [itemsCollected, setItemsCollected] = useState(0);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [powerUpIdCounter, setPowerUpIdCounter] = useState(0);
  const [grandmaCheckingSpot, setGrandmaCheckingSpot] = useState(false);

  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const gameTickRef = useRef(0);

  // ──── 게임 시작 ────
  const startGame = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    setGameState("playing");
    setPlayer({ x: 1, y: 3 });
    setGrandma({ x: 8, y: 2 });
    setGrandpa({ x: 10, y: 1 });
    setTimeLeft(GAME_DURATION);
    setScore(0);
    setInventory([]);
    setIsHiding(false);
    setHideSpotIdx(-1);
    setHideTension(0);
    setSpeedBoost(false);
    setGrandmaDistracted(false);
    setDistractTarget(null);
    setGrandmaMoveCounter(0);
    setDialogue("");
    setDialogueTimer(0);
    setTimesHidden(0);
    setItemsCollected(0);
    setShakeScreen(false);
    setGrandmaCheckingSpot(false);
    setPowerUpIdCounter(0);

    // 파워업 배치
    const spots: Pos[] = [];
    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        if (grid[r][c].walkable && !(c === 1 && r === 3) && !(c === 8 && r === 2)) {
          spots.push({ x: c, y: r });
        }
      }
    }
    const shuffled = spots.sort(() => Math.random() - 0.5);
    const types: PowerUpType[] = ["cookie", "remote", "doll", "shoes", "cookie", "remote", "doll", "shoes"];
    const pups: PowerUp[] = shuffled.slice(0, 8).map((pos, i) => ({
      pos, type: types[i % types.length], id: i,
    }));
    setPowerUps(pups);
    setPowerUpIdCounter(8);
    gameTickRef.current = 0;
  }, [grid]);

  // ──── 이동 ────
  const movePlayer = useCallback((dx: number, dy: number) => {
    if (gameState !== "playing" || isHiding) return;

    setPlayer(prev => {
      let nx = prev.x + dx;
      let ny = prev.y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return prev;
      if (!grid[ny][nx].walkable) return prev;
      // 속도 부스트: 2칸 이동
      if (speedBoost) {
        const nx2 = nx + dx;
        const ny2 = ny + dy;
        if (nx2 >= 0 && nx2 < COLS && ny2 >= 0 && ny2 < ROWS && grid[ny2][nx2].walkable) {
          nx = nx2;
          ny = ny2;
        }
      }
      return { x: nx, y: ny };
    });
  }, [gameState, isHiding, grid, speedBoost]);

  // ──── 아이템 사용 ────
  const useItem = useCallback(() => {
    if (gameState !== "playing" || inventory.length === 0) return;
    const item = inventory[0];
    setInventory(prev => prev.slice(1));

    if (item === "cookie") {
      // 쿠키: 할머니 현재 위치에 고정 5초
      setGrandmaDistracted(true);
      setDialogue("앗! 쿠키다! 냠냠~");
      setDialogueTimer(25);
      setTimeout(() => setGrandmaDistracted(false), 5000);
    } else if (item === "remote") {
      // 리모컨: TV 켜기
      setGrandmaDistracted(true);
      setDistractTarget({ x: 1, y: 1 });
      setDialogue("어머! 드라마 시작했네!");
      setDialogueTimer(25);
      setTimeout(() => { setGrandmaDistracted(false); setDistractTarget(null); }, 5000);
    } else if (item === "doll") {
      // 인형: 반대편으로 유인
      const targetX = player.x < 6 ? 10 : 1;
      const targetY = player.y < 4 ? 6 : 1;
      setDistractTarget({ x: targetX, y: targetY });
      setGrandmaDistracted(true);
      setDialogue("어? 저기서 소리가 났어!");
      setDialogueTimer(25);
      setTimeout(() => { setGrandmaDistracted(false); setDistractTarget(null); }, 5000);
    } else if (item === "shoes") {
      setSpeedBoost(true);
      setTimeout(() => setSpeedBoost(false), 3000);
    }
  }, [gameState, inventory, player]);

  // ──── 숨기 ────
  const tryHide = useCallback(() => {
    if (gameState !== "playing") return;

    if (isHiding) {
      // 숨기에서 나오기
      setIsHiding(false);
      setHideSpotIdx(-1);
      setHideTension(0);
      return;
    }

    // 근처 숨기 장소 찾기
    const spotIdx = HIDE_SPOTS.findIndex(s =>
      dist(s.pos, player) <= 1
    );
    if (spotIdx >= 0) {
      setIsHiding(true);
      setHideSpotIdx(spotIdx);
      setHideTension(0);
      setTimesHidden(prev => prev + 1);
    }
  }, [gameState, isHiding, player]);

  // ──── 키보드 입력 ────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      switch (e.key) {
        case "ArrowUp": case "w": e.preventDefault(); movePlayer(0, -1); break;
        case "ArrowDown": case "s": e.preventDefault(); movePlayer(0, 1); break;
        case "ArrowLeft": case "a": e.preventDefault(); movePlayer(-1, 0); break;
        case "ArrowRight": case "d": e.preventDefault(); movePlayer(1, 0); break;
        case " ": e.preventDefault(); tryHide(); break;
        case "e": case "Enter": e.preventDefault(); useItem(); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameState, movePlayer, tryHide, useItem]);

  // ──── 게임 틱 ────
  useEffect(() => {
    if (gameState !== "playing") return;

    tickRef.current = setInterval(() => {
      gameTickRef.current++;
      const tick = gameTickRef.current;

      // 타이머
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState("won");
          return 0;
        }
        return prev - 1;
      });

      // 할머니 대사
      if (tick % 15 === 0) {
        const msg = GRANDMA_DIALOGUES[Math.floor(Math.random() * GRANDMA_DIALOGUES.length)];
        setDialogue(msg);
        setDialogueTimer(12);
      }

      // 대사 타이머 감소
      setDialogueTimer(prev => Math.max(0, prev - 1));

      // 할머니 이동
      setGrandmaMoveCounter(prev => prev + 1);
    }, 1000);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [gameState]);

  // ──── 할머니 이동 로직 (빠른 틱) ────
  useEffect(() => {
    if (gameState !== "playing") return;

    const speedBase = difficulty === "쉬움" ? 500 : difficulty === "보통" ? 380 : 280;
    const elapsed = GAME_DURATION - timeLeft;
    const speedBonus = Math.floor(elapsed / 15) * 20;
    const speed = Math.max(180, speedBase - speedBonus);

    const interval = setInterval(() => {
      if (grandmaDistracted && !distractTarget) return; // 쿠키에 고정

      setGrandma(prev => {
        const target = distractTarget || player;
        if (isHiding && !distractTarget) {
          // 할머니가 숨기 장소 순찰
          const randomSpot = HIDE_SPOTS[Math.floor(Math.random() * HIDE_SPOTS.length)];
          const next = bfs(grid, prev, randomSpot.pos);
          return next || prev;
        }
        const next = bfs(grid, prev, target);
        return next || prev;
      });

      // 할아버지 (어려움 모드)
      if (difficulty === "어려움") {
        setGrandpa(prev => {
          const next = bfs(grid, prev, player);
          return next || prev;
        });
      }
    }, speed);

    return () => clearInterval(interval);
  }, [gameState, difficulty, timeLeft, grandmaDistracted, distractTarget, player, isHiding, grid]);

  // ──── 충돌 / 아이템 수집 ────
  useEffect(() => {
    if (gameState !== "playing") return;

    // 할머니 거리 체크
    const gDist = dist(grandma, player);
    setDangerGlow(gDist <= 3);

    if (gDist <= 3 && !isHiding) {
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 200);
    }

    // 잡힘
    if (!isHiding && !grandmaDistracted) {
      if (grandma.x === player.x && grandma.y === player.y) {
        caught();
        return;
      }
      if (difficulty === "어려움" && grandpa.x === player.x && grandpa.y === player.y) {
        caught();
        return;
      }
    }

    // 숨어있을 때 할머니 체크
    if (isHiding && hideSpotIdx >= 0) {
      const spot = HIDE_SPOTS[hideSpotIdx];
      const gDistToSpot = dist(grandma, spot.pos);
      if (gDistToSpot <= 1) {
        setHideTension(prev => {
          const newTension = Math.min(100, prev + 15);
          // 확률적으로 발각
          const checkChance = newTension / 200;
          if (Math.random() < checkChance) {
            setGrandmaCheckingSpot(true);
            setTimeout(() => {
              if (Math.random() < 0.5 + newTension / 200) {
                caught();
              } else {
                setGrandmaCheckingSpot(false);
                setDialogue("여기 아닌가...?");
                setDialogueTimer(10);
              }
            }, 800);
          }
          return newTension;
        });
      } else {
        setHideTension(prev => Math.max(0, prev - 2));
      }
    }

    // 아이템 수집
    setPowerUps(prev => {
      const remaining = prev.filter(p => {
        if (p.pos.x === player.x && p.pos.y === player.y) {
          setInventory(inv => inv.length < 3 ? [...inv, p.type] : inv);
          setScore(s => s + 50);
          setItemsCollected(c => c + 1);
          return false;
        }
        return true;
      });
      return remaining;
    });
  }, [player, grandma, grandpa, isHiding, hideSpotIdx, grandmaDistracted, gameState, difficulty]);

  // ──── 파워업 리스폰 ────
  useEffect(() => {
    if (gameState !== "playing") return;
    const interval = setInterval(() => {
      setPowerUps(prev => {
        if (prev.length >= 6) return prev;
        const spots: Pos[] = [];
        for (let r = 1; r < ROWS - 1; r++) {
          for (let c = 1; c < COLS - 1; c++) {
            if (grid[r][c].walkable && !(c === player.x && r === player.y)) {
              const taken = prev.some(p => p.pos.x === c && p.pos.y === r);
              if (!taken) spots.push({ x: c, y: r });
            }
          }
        }
        if (spots.length === 0) return prev;
        const pos = spots[Math.floor(Math.random() * spots.length)];
        const types: PowerUpType[] = ["cookie", "remote", "doll", "shoes"];
        const type = types[Math.floor(Math.random() * types.length)];
        setPowerUpIdCounter(c => c + 1);
        return [...prev, { pos, type, id: powerUpIdCounter + 1 }];
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [gameState, player, grid, powerUpIdCounter]);

  const caught = () => {
    const scene = CAUGHT_SCENES[Math.floor(Math.random() * CAUGHT_SCENES.length)];
    setCaughtScene(scene);
    const elapsed = GAME_DURATION - timeLeft;
    setScore(prev => prev + elapsed * 10 + timesHidden * 100 + itemsCollected * 50);
    setGameState("caught");
  };

  // ──── 승리 점수 계산 ────
  useEffect(() => {
    if (gameState === "won") {
      const bonus = difficulty === "쉬움" ? 1 : difficulty === "보통" ? 2 : 3;
      setScore(prev => prev + GAME_DURATION * 10 * bonus + timesHidden * 200 + itemsCollected * 100);
    }
  }, [gameState, difficulty, timesHidden, itemsCollected]);

  // ──── 숨기 장소 근처 확인 ────
  const nearHideSpot = HIDE_SPOTS.findIndex(s => dist(s.pos, player) <= 1);

  // ──── 렌더 ────
  const renderCell = (r: number, c: number) => {
    const cell = grid[r][c];
    const isPlayer = player.x === c && player.y === r && !isHiding;
    const isGrandma = grandma.x === c && grandma.y === r;
    const isGrandpa = difficulty === "어려움" && grandpa.x === c && grandpa.y === r;
    const powerUp = powerUps.find(p => p.pos.x === c && p.pos.y === r);
    const hideSpot = HIDE_SPOTS.find(s => s.pos.x === c && s.pos.y === r);
    const isHidingHere = isHiding && hideSpotIdx >= 0 && HIDE_SPOTS[hideSpotIdx].pos.x === c && HIDE_SPOTS[hideSpotIdx].pos.y === r;

    let content = cell.emoji;
    let extraClass = "";

    if (hideSpot && cell.type === "floor") {
      content = hideSpot.emoji;
    }
    if (powerUp && cell.type === "floor") {
      content = POWER_UP_INFO[powerUp.type].emoji;
      extraClass = "animate-bounce";
    }
    if (isGrandpa) {
      content = "👴";
      extraClass = "animate-pulse";
    }
    if (isGrandma) {
      content = "👵";
      extraClass = "animate-pulse text-2xl";
    }
    if (isPlayer) {
      content = speedBoost ? "💨" : "🧒";
      extraClass = "text-2xl z-10";
    }
    if (isHidingHere) {
      content = hideSpot?.emoji || "🚪";
      extraClass = "ring-2 ring-yellow-400 animate-pulse";
    }

    const roomColor = ROOM_COLORS[cell.room];

    return (
      <div
        key={`${r}-${c}`}
        className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-lg sm:text-xl relative
          ${cell.type === "wall" ? "bg-stone-800 border border-stone-700" : roomColor}
          ${extraClass}
          border border-stone-800/30 transition-all duration-100`}
        title={cell.room}
      >
        {content}
        {/* 할머니 대사 말풍선 */}
        {isGrandma && dialogueTimer > 0 && dialogue && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] sm:text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-30 shadow-lg border-2 border-orange-400 animate-bounce">
            {dialogue}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-orange-400" />
          </div>
        )}
      </div>
    );
  };

  // ──── 미니맵 ────
  const renderMinimap = () => (
    <div className="grid grid-cols-12 gap-0 w-24 h-16 border border-stone-600 rounded overflow-hidden bg-stone-900">
      {Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: COLS }, (_, c) => {
          const isP = player.x === c && player.y === r;
          const isG = grandma.x === c && grandma.y === r;
          const isWall = grid[r][c].type === "wall";
          return (
            <div
              key={`mini-${r}-${c}`}
              className={`w-2 h-2
                ${isP ? "bg-green-400" : isG ? "bg-red-500 animate-pulse" : isWall ? "bg-stone-700" : "bg-stone-500/30"}`}
            />
          );
        })
      )}
    </div>
  );

  // ──── 메뉴 화면 ────
  if (gameState === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 via-orange-950 to-stone-900 flex flex-col items-center justify-center p-4 text-white">
        <Link href="/" className="absolute top-4 left-4 text-orange-300 hover:text-white transition text-sm">← 홈으로</Link>

        <div className="text-center mb-8 animate-pulse">
          <div className="text-6xl mb-4">👵💨🧒</div>
          <h1 className="text-3xl sm:text-4xl font-black text-orange-300 mb-2">할머니한테서 도망치기!</h1>
          <p className="text-orange-200/80 text-sm">할머니의 밥 공격, 공부 공격, 목욕 공격을 피해 도망쳐라!</p>
          <p className="text-orange-200/60 text-xs mt-1">90초간 살아남으면 승리!</p>
        </div>

        <div className="flex flex-col gap-3 w-64">
          {(["쉬움", "보통", "어려움"] as Difficulty[]).map(diff => (
            <button
              key={diff}
              onClick={() => startGame(diff)}
              className={`px-6 py-3 rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95
                ${diff === "쉬움" ? "bg-green-700 hover:bg-green-600" :
                  diff === "보통" ? "bg-yellow-700 hover:bg-yellow-600" :
                  "bg-red-700 hover:bg-red-600"}`}
            >
              {diff === "쉬움" ? "😊 쉬움 - 느린 할머니" :
               diff === "보통" ? "😅 보통 - 보통 할머니" :
               "😱 어려움 - 빠른 할머니 + 할아버지"}
            </button>
          ))}
        </div>

        <div className="mt-8 bg-stone-800/60 rounded-xl p-4 max-w-md text-sm text-orange-200/80">
          <p className="font-bold text-orange-300 mb-2">🎮 조작법</p>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <span>⬆️⬇️⬅️➡️ / WASD</span><span>이동</span>
            <span>스페이스바</span><span>숨기 / 나오기</span>
            <span>E / Enter</span><span>아이템 사용</span>
          </div>
          <p className="mt-2 text-xs text-orange-200/50">모바일: 화면 하단 D패드와 버튼 사용</p>
        </div>
      </div>
    );
  }

  // ──── 잡힌 화면 ────
  if (gameState === "caught") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-900 via-orange-950 to-stone-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="text-center animate-bounce mb-6">
          <div className="text-6xl mb-4">👵🤝🧒</div>
          <h2 className="text-3xl font-black text-red-300 mb-2">잡혔다!</h2>
        </div>

        <div className="bg-stone-800/80 rounded-xl p-6 max-w-sm text-center mb-6">
          <h3 className="text-xl font-bold text-yellow-300 mb-2">{caughtScene.title}</h3>
          <p className="text-orange-200 whitespace-pre-line">{caughtScene.desc}</p>
        </div>

        <div className="bg-stone-800/60 rounded-xl p-4 mb-6 text-center">
          <p className="text-sm text-orange-300">⏱️ 생존 시간: {GAME_DURATION - timeLeft}초</p>
          <p className="text-sm text-orange-300">🏆 점수: {score}</p>
          <p className="text-sm text-orange-300">📦 아이템 수집: {itemsCollected}개</p>
          <p className="text-sm text-orange-300">🫣 숨은 횟수: {timesHidden}번</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => startGame(difficulty)}
            className="px-6 py-3 bg-orange-700 hover:bg-orange-600 rounded-xl font-bold transition hover:scale-105"
          >
            🔄 다시 도전!
          </button>
          <button
            onClick={() => setGameState("menu")}
            className="px-6 py-3 bg-stone-700 hover:bg-stone-600 rounded-xl font-bold transition hover:scale-105"
          >
            📋 메뉴로
          </button>
        </div>
      </div>
    );
  }

  // ──── 승리 화면 ────
  if (gameState === "won") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-emerald-950 to-stone-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4 animate-bounce">🎉🧒🏆</div>
          <h2 className="text-3xl font-black text-green-300 mb-2">도망 성공!</h2>
          <p className="text-green-200/80">90초 동안 할머니를 피해 살아남았습니다!</p>
        </div>

        <div className="bg-stone-800/60 rounded-xl p-4 mb-6 text-center">
          <p className="text-2xl font-bold text-yellow-300 mb-2">🏆 {score}점!</p>
          <p className="text-sm text-green-300">난이도: {difficulty}</p>
          <p className="text-sm text-green-300">📦 아이템 수집: {itemsCollected}개</p>
          <p className="text-sm text-green-300">🫣 숨은 횟수: {timesHidden}번</p>
        </div>

        <div className="bg-stone-800/40 rounded-xl p-3 mb-6 text-center text-sm text-yellow-200/80">
          <p>할머니: &quot;그래 잘 놀았으면 이제 밥 먹어라!!!&quot;</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => startGame(difficulty)}
            className="px-6 py-3 bg-green-700 hover:bg-green-600 rounded-xl font-bold transition hover:scale-105"
          >
            🔄 다시 도전!
          </button>
          <button
            onClick={() => setGameState("menu")}
            className="px-6 py-3 bg-stone-700 hover:bg-stone-600 rounded-xl font-bold transition hover:scale-105"
          >
            📋 메뉴로
          </button>
        </div>
      </div>
    );
  }

  // ──── 게임 플레이 화면 ────
  return (
    <div className={`min-h-screen bg-gradient-to-b from-amber-900 via-orange-950 to-stone-900 flex flex-col items-center p-2 sm:p-4 text-white
      ${dangerGlow ? "ring-4 ring-red-500/50 ring-inset" : ""}
      ${shakeScreen ? "animate-pulse" : ""}`}>

      {/* 상단 HUD */}
      <div className="w-full max-w-xl flex items-center justify-between mb-2 px-2">
        <Link href="/" className="text-orange-300 hover:text-white transition text-xs sm:text-sm">← 홈으로</Link>

        <div className="flex items-center gap-3">
          {/* 타이머 */}
          <div className={`text-lg sm:text-xl font-mono font-bold ${timeLeft <= 15 ? "text-red-400 animate-pulse" : timeLeft <= 30 ? "text-yellow-400" : "text-green-400"}`}>
            ⏱️ {timeLeft}초
          </div>
          {/* 점수 */}
          <div className="text-sm sm:text-base text-yellow-300 font-bold">🏆 {score}</div>
        </div>

        {/* 미니맵 */}
        {renderMinimap()}
      </div>

      {/* 난이도 표시 */}
      <div className="text-xs text-orange-400/60 mb-1">
        난이도: {difficulty} {difficulty === "어려움" && "| 👴 할아버지도 쫓아옵니다!"}
      </div>

      {/* 숨기 상태 */}
      {isHiding && (
        <div className="mb-2 bg-stone-800/80 rounded-lg px-4 py-2 text-center">
          <p className="text-sm text-yellow-300 font-bold">🫣 숨는 중... ({HIDE_SPOTS[hideSpotIdx]?.label})</p>
          <div className="w-48 h-2 bg-stone-700 rounded-full mt-1 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${hideTension > 70 ? "bg-red-500 animate-pulse" : hideTension > 40 ? "bg-yellow-500" : "bg-green-500"}`}
              style={{ width: `${hideTension}%` }}
            />
          </div>
          <p className="text-[10px] text-stone-400 mt-1">긴장도 {hideTension}% | 스페이스바로 나오기</p>
          {grandmaCheckingSpot && (
            <p className="text-xs text-red-400 animate-pulse font-bold mt-1">⚠️ 할머니가 확인하고 있어...!</p>
          )}
        </div>
      )}

      {/* 현재 방 */}
      <div className="text-xs text-orange-300/70 mb-1">
        📍 {grid[player.y]?.[player.x]?.room || "집"}
        {nearHideSpot >= 0 && !isHiding && (
          <span className="ml-2 text-yellow-400 animate-pulse">
            → 스페이스바로 {HIDE_SPOTS[nearHideSpot].label}에 숨기!
          </span>
        )}
      </div>

      {/* 게임 그리드 */}
      <div className="border-2 border-stone-600 rounded-lg overflow-hidden shadow-2xl bg-stone-900 mb-3">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => renderCell(r, c))
          )}
        </div>
      </div>

      {/* 인벤토리 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-orange-300">아이템:</span>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`w-10 h-10 border-2 rounded-lg flex items-center justify-center text-xl
                ${i === 0 && inventory.length > 0 ? "border-yellow-400 bg-yellow-900/40" : "border-stone-600 bg-stone-800/40"}`}
            >
              {inventory[i] ? POWER_UP_INFO[inventory[i]].emoji : ""}
            </div>
          ))}
        </div>
        {inventory.length > 0 && (
          <button
            onClick={useItem}
            className="px-3 py-1 bg-yellow-700 hover:bg-yellow-600 rounded-lg text-xs font-bold transition active:scale-90"
          >
            사용 (E)
          </button>
        )}
        {inventory.length > 0 && (
          <span className="text-[10px] text-stone-400">{POWER_UP_INFO[inventory[0]].desc}</span>
        )}
      </div>

      {/* 할머니 거리 경고 */}
      {dangerGlow && !isHiding && (
        <div className="text-xs text-red-400 animate-pulse font-bold mb-2">
          ⚠️ 할머니가 가까이 있어! 도망쳐!
        </div>
      )}

      {/* 모바일 D패드 */}
      <div className="flex flex-col items-center gap-1 sm:hidden">
        <button
          onTouchStart={(e) => { e.preventDefault(); movePlayer(0, -1); }}
          className="w-14 h-14 bg-stone-700 hover:bg-stone-600 active:bg-stone-500 rounded-xl text-2xl flex items-center justify-center"
        >⬆️</button>
        <div className="flex gap-1">
          <button
            onTouchStart={(e) => { e.preventDefault(); movePlayer(-1, 0); }}
            className="w-14 h-14 bg-stone-700 hover:bg-stone-600 active:bg-stone-500 rounded-xl text-2xl flex items-center justify-center"
          >⬅️</button>
          <button
            onTouchStart={(e) => { e.preventDefault(); tryHide(); }}
            className="w-14 h-14 bg-yellow-800 hover:bg-yellow-700 active:bg-yellow-600 rounded-xl text-xs font-bold flex items-center justify-center"
          >숨기</button>
          <button
            onTouchStart={(e) => { e.preventDefault(); movePlayer(1, 0); }}
            className="w-14 h-14 bg-stone-700 hover:bg-stone-600 active:bg-stone-500 rounded-xl text-2xl flex items-center justify-center"
          >➡️</button>
        </div>
        <div className="flex gap-1">
          <button
            onTouchStart={(e) => { e.preventDefault(); movePlayer(0, 1); }}
            className="w-14 h-14 bg-stone-700 hover:bg-stone-600 active:bg-stone-500 rounded-xl text-2xl flex items-center justify-center"
          >⬇️</button>
          <button
            onTouchStart={(e) => { e.preventDefault(); useItem(); }}
            className="w-14 h-14 bg-orange-800 hover:bg-orange-700 active:bg-orange-600 rounded-xl text-xs font-bold flex items-center justify-center"
          >아이템</button>
        </div>
      </div>

      {/* 모바일 D패드 (데스크톱에서는 안내) */}
      <div className="hidden sm:flex text-[10px] text-stone-500 mt-2 gap-4">
        <span>⬆️⬇️⬅️➡️ 이동</span>
        <span>Space 숨기</span>
        <span>E 아이템</span>
      </div>

      {/* 할머니 산만 효과 */}
      {grandmaDistracted && (
        <div className="fixed top-4 right-4 bg-green-800/90 text-green-200 px-3 py-1 rounded-lg text-xs animate-pulse z-50">
          ✅ 할머니 주의 분산 중!
        </div>
      )}

      {/* 속도 부스트 */}
      {speedBoost && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-blue-800/90 text-blue-200 px-3 py-1 rounded-lg text-xs animate-pulse z-50">
          👟 속도 부스트!
        </div>
      )}
    </div>
  );
}
