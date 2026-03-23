"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

// --- Types ---
interface RobloxGame {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  bg: string;
  players: number;
  likes: number;
  genre: string;
}

interface Avatar {
  hat: string;
  face: string;
  body: string;
  color: string;
  pet: string;
}

interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  type: "hat" | "face" | "body" | "pet";
  rarity: "common" | "rare" | "epic" | "legendary";
  price: number;
}

interface ObbyBlock {
  x: number;
  y: number;
  w: number;
  type: "normal" | "lava" | "ice" | "bounce" | "moving" | "finish";
  moving?: { range: number; speed: number; offset: number };
}

interface TycoonBuilding {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  income: number;
  owned: boolean;
}

interface FightChar {
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
}

// --- Data ---
const ROBLOX_GAMES: RobloxGame[] = [
  { id: "obby", name: "메가 오비", emoji: "🏃", desc: "장애물을 피해 결승점까지!", bg: "from-green-400 to-cyan-500", players: 12453, likes: 8921, genre: "오비" },
  { id: "tycoon", name: "부자 타이쿤", emoji: "🏭", desc: "공장을 짓고 부자가 되자!", bg: "from-yellow-400 to-amber-500", players: 8732, likes: 6543, genre: "타이쿤" },
  { id: "fight", name: "배틀 아레나", emoji: "⚔️", desc: "최강의 전사가 되어 싸우자!", bg: "from-red-500 to-orange-500", players: 15621, likes: 11234, genre: "전투" },
  { id: "tower", name: "타워 디펜스", emoji: "🏰", desc: "타워를 세워 적을 막자!", bg: "from-purple-500 to-indigo-500", players: 9876, likes: 7654, genre: "전략" },
  { id: "pet", name: "펫 시뮬레이터", emoji: "🐾", desc: "귀여운 펫을 모으자!", bg: "from-pink-400 to-rose-500", players: 20145, likes: 15432, genre: "시뮬" },
];

const SHOP_ITEMS: ShopItem[] = [
  { id: "hat_cap", name: "야구 모자", emoji: "🧢", type: "hat", rarity: "common", price: 50 },
  { id: "hat_crown", name: "왕관", emoji: "👑", type: "hat", rarity: "legendary", price: 5000 },
  { id: "hat_wizard", name: "마법사 모자", emoji: "🎩", type: "hat", rarity: "rare", price: 500 },
  { id: "hat_helmet", name: "전투 헬멧", emoji: "⛑️", type: "hat", rarity: "rare", price: 600 },
  { id: "hat_halo", name: "천사 후광", emoji: "😇", type: "hat", rarity: "epic", price: 2000 },
  { id: "hat_devil", name: "악마 뿔", emoji: "😈", type: "hat", rarity: "epic", price: 2000 },
  { id: "face_cool", name: "선글라스", emoji: "😎", type: "face", rarity: "common", price: 100 },
  { id: "face_star", name: "스타 페이스", emoji: "🤩", type: "face", rarity: "rare", price: 400 },
  { id: "face_mask", name: "마스크", emoji: "😷", type: "face", rarity: "common", price: 80 },
  { id: "face_robot", name: "로봇 페이스", emoji: "🤖", type: "face", rarity: "epic", price: 1500 },
  { id: "body_ninja", name: "닌자 옷", emoji: "🥷", type: "body", rarity: "rare", price: 800 },
  { id: "body_armor", name: "기사 갑옷", emoji: "🛡️", type: "body", rarity: "epic", price: 2500 },
  { id: "body_suit", name: "정장", emoji: "🤵", type: "body", rarity: "common", price: 200 },
  { id: "body_astro", name: "우주복", emoji: "🧑‍🚀", type: "body", rarity: "legendary", price: 8000 },
  { id: "pet_dog", name: "강아지", emoji: "🐕", type: "pet", rarity: "common", price: 150 },
  { id: "pet_cat", name: "고양이", emoji: "🐈", type: "pet", rarity: "common", price: 150 },
  { id: "pet_dragon", name: "미니 드래곤", emoji: "🐲", type: "pet", rarity: "legendary", price: 10000 },
  { id: "pet_unicorn", name: "유니콘", emoji: "🦄", type: "pet", rarity: "epic", price: 3000 },
  { id: "pet_phoenix", name: "불사조", emoji: "🔥", type: "pet", rarity: "legendary", price: 12000 },
];

// Obby levels
function generateObbyLevel(level: number): ObbyBlock[] {
  const blocks: ObbyBlock[] = [];
  const startY = 500;
  blocks.push({ x: 50, y: startY, w: 80, type: "normal" });

  const count = 8 + level * 2;
  let lastX = 50;
  let lastY = startY;

  for (let i = 0; i < count; i++) {
    const gap = 40 + Math.random() * (30 + level * 5);
    const yChange = (Math.random() - 0.5) * (40 + level * 5);
    const newX = lastX + gap + 40;
    const newY = Math.max(100, Math.min(500, lastY + yChange));
    const w = Math.max(30, 60 - level * 2);

    let type: ObbyBlock["type"] = "normal";
    const typeRoll = Math.random();
    if (level >= 2 && typeRoll < 0.15) type = "lava";
    else if (level >= 3 && typeRoll < 0.25) type = "ice";
    else if (level >= 2 && typeRoll < 0.35) type = "bounce";
    else if (level >= 4 && typeRoll < 0.45) type = "moving";

    const block: ObbyBlock = { x: newX, y: newY, w, type };
    if (type === "moving") {
      block.moving = { range: 30 + Math.random() * 30, speed: 0.5 + Math.random() * 1, offset: Math.random() * Math.PI * 2 };
    }

    blocks.push(block);
    lastX = newX;
    lastY = newY;
  }

  blocks.push({ x: lastX + 60 + 40, y: lastY, w: 80, type: "finish" });
  return blocks;
}

// Tycoon data
const TYCOON_BUILDINGS: TycoonBuilding[] = [
  { id: "t_lemon", name: "레모네이드 가판대", emoji: "🍋", cost: 50, income: 2, owned: false },
  { id: "t_pizza", name: "피자 가게", emoji: "🍕", cost: 200, income: 8, owned: false },
  { id: "t_burger", name: "햄버거 체인", emoji: "🍔", cost: 500, income: 20, owned: false },
  { id: "t_cafe", name: "카페", emoji: "☕", cost: 1000, income: 40, owned: false },
  { id: "t_cinema", name: "영화관", emoji: "🎬", cost: 2500, income: 100, owned: false },
  { id: "t_hotel", name: "호텔", emoji: "🏨", cost: 5000, income: 200, owned: false },
  { id: "t_mall", name: "쇼핑몰", emoji: "🏬", cost: 10000, income: 400, owned: false },
  { id: "t_tower", name: "초고층 빌딩", emoji: "🏙️", cost: 25000, income: 1000, owned: false },
  { id: "t_rocket", name: "로켓 발사대", emoji: "🚀", cost: 50000, income: 2500, owned: false },
  { id: "t_castle", name: "황금 성", emoji: "🏰", cost: 100000, income: 5000, owned: false },
];

// Fight enemies
const FIGHT_ENEMIES: FightChar[] = [
  { name: "좀비", emoji: "🧟", hp: 80, maxHp: 80, atk: 8, def: 2, speed: 3 },
  { name: "해골 전사", emoji: "💀", hp: 120, maxHp: 120, atk: 12, def: 5, speed: 5 },
  { name: "오크 용병", emoji: "👹", hp: 200, maxHp: 200, atk: 18, def: 8, speed: 4 },
  { name: "다크 나이트", emoji: "🖤", hp: 300, maxHp: 300, atk: 25, def: 15, speed: 6 },
  { name: "화염 마법사", emoji: "🔥", hp: 180, maxHp: 180, atk: 35, def: 5, speed: 7 },
  { name: "드래곤 로드", emoji: "🐲", hp: 500, maxHp: 500, atk: 40, def: 20, speed: 5 },
  { name: "마왕", emoji: "👿", hp: 1000, maxHp: 1000, atk: 60, def: 30, speed: 8 },
];

// Pet data
interface Pet {
  id: string;
  name: string;
  emoji: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  power: number;
}

const PET_POOL: Pet[] = [
  { id: "p_cat", name: "고양이", emoji: "🐱", rarity: "common", power: 5 },
  { id: "p_dog", name: "강아지", emoji: "🐶", rarity: "common", power: 5 },
  { id: "p_bunny", name: "토끼", emoji: "🐰", rarity: "common", power: 6 },
  { id: "p_hamster", name: "햄스터", emoji: "🐹", rarity: "common", power: 4 },
  { id: "p_fox", name: "여우", emoji: "🦊", rarity: "rare", power: 12 },
  { id: "p_panda", name: "판다", emoji: "🐼", rarity: "rare", power: 14 },
  { id: "p_owl", name: "부엉이", emoji: "🦉", rarity: "rare", power: 13 },
  { id: "p_wolf", name: "늑대", emoji: "🐺", rarity: "rare", power: 15 },
  { id: "p_lion", name: "사자", emoji: "🦁", rarity: "epic", power: 30 },
  { id: "p_tiger", name: "호랑이", emoji: "🐯", rarity: "epic", power: 32 },
  { id: "p_phoenix", name: "불사조", emoji: "🔥", rarity: "epic", power: 35 },
  { id: "p_unicorn", name: "유니콘", emoji: "🦄", rarity: "legendary", power: 70 },
  { id: "p_dragon", name: "드래곤", emoji: "🐲", rarity: "legendary", power: 80 },
  { id: "p_angel", name: "천사", emoji: "😇", rarity: "legendary", power: 75 },
  { id: "p_galaxy", name: "은하 펫", emoji: "🌌", rarity: "mythic", power: 200 },
  { id: "p_void", name: "보이드 펫", emoji: "🕳️", rarity: "mythic", power: 250 },
];

const PET_HATCH_COST = 100;
const PET_GOLDEN_COST = 500;

function hatchPet(golden: boolean): Pet {
  const rand = Math.random();
  let rarity: Pet["rarity"];
  if (golden) {
    if (rand < 0.30) rarity = "rare";
    else if (rand < 0.60) rarity = "epic";
    else if (rand < 0.90) rarity = "legendary";
    else rarity = "mythic";
  } else {
    if (rand < 0.50) rarity = "common";
    else if (rand < 0.80) rarity = "rare";
    else if (rand < 0.95) rarity = "epic";
    else if (rand < 0.99) rarity = "legendary";
    else rarity = "mythic";
  }
  const pool = PET_POOL.filter((p) => p.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

function petRarityColor(r: string) {
  switch (r) {
    case "common": return "text-gray-400";
    case "rare": return "text-blue-400";
    case "epic": return "text-purple-400";
    case "legendary": return "text-amber-400";
    case "mythic": return "text-red-400";
    default: return "";
  }
}

function petRarityBorder(r: string) {
  switch (r) {
    case "common": return "border-gray-600";
    case "rare": return "border-blue-500";
    case "epic": return "border-purple-500";
    case "legendary": return "border-amber-500 shadow-amber-500/20 shadow-md";
    case "mythic": return "border-red-500 shadow-red-500/30 shadow-lg";
    default: return "";
  }
}

function petRarityLabel(r: string) {
  switch (r) {
    case "common": return "일반";
    case "rare": return "레어";
    case "epic": return "에픽";
    case "legendary": return "전설";
    case "mythic": return "신화";
    default: return "";
  }
}

function shopRarityColor(r: string) {
  switch (r) {
    case "common": return "text-gray-400";
    case "rare": return "text-blue-400";
    case "epic": return "text-purple-400";
    case "legendary": return "text-amber-400";
    default: return "";
  }
}

type Screen = "lobby" | "avatar" | "shop" | "obby" | "tycoon" | "fight" | "petSim" | "petResult" | "tower";

export default function RobloxPage() {
  const [screen, setScreen] = useState<Screen>("lobby");
  const [robux, setRobux] = useState(500);
  const [ownedItems, setOwnedItems] = useState<string[]>(["hat_cap", "face_cool", "body_suit", "pet_dog"]);
  const [avatar, setAvatar] = useState<Avatar>({ hat: "🧢", face: "😎", body: "🤵", color: "bg-blue-500", pet: "🐕" });

  // Obby state
  const [obbyLevel, setObbyLevel] = useState(1);
  const [obbyBlocks, setObbyBlocks] = useState<ObbyBlock[]>([]);
  const [playerX, setPlayerX] = useState(70);
  const [playerY, setPlayerY] = useState(470);
  const [playerVY, setPlayerVY] = useState(0);
  const [onGround, setOnGround] = useState(true);
  const [cameraX, setCameraX] = useState(0);
  const [obbyDead, setObbyDead] = useState(false);
  const [obbyClear, setObbyClear] = useState(false);
  const keysRef = useRef<Set<string>>(new Set());
  const obbyTickRef = useRef<number | null>(null);

  // Tycoon state
  const [tycoonMoney, setTycoonMoney] = useState(100);
  const [tycoonBuildings, setTycoonBuildings] = useState<TycoonBuilding[]>(TYCOON_BUILDINGS.map((b) => ({ ...b })));

  // Fight state
  const [fightStage, setFightStage] = useState(0);
  const [playerChar, setPlayerChar] = useState<FightChar>({ name: "나", emoji: "🦸", hp: 150, maxHp: 150, atk: 20, def: 10, speed: 5 });
  const [enemyChar, setEnemyChar] = useState<FightChar>(FIGHT_ENEMIES[0]);
  const [fightLog, setFightLog] = useState<string[]>([]);
  const [fightTurn, setFightTurn] = useState<"player" | "enemy" | "win" | "lose">("player");

  // Pet sim state
  const [ownedPets, setOwnedPets] = useState<Pet[]>([]);
  const [petResult, setPetResult] = useState<Pet | null>(null);
  const [totalPetPower, setTotalPetPower] = useState(0);

  // Tycoon income timer
  useEffect(() => {
    if (screen !== "tycoon") return;
    const interval = setInterval(() => {
      const income = tycoonBuildings.filter((b) => b.owned).reduce((sum, b) => sum + b.income, 0);
      if (income > 0) setTycoonMoney((m) => m + income);
    }, 1000);
    return () => clearInterval(interval);
  }, [screen, tycoonBuildings]);

  // Obby game
  const startObby = useCallback((level: number) => {
    const blocks = generateObbyLevel(level);
    setObbyBlocks(blocks);
    setPlayerX(70);
    setPlayerY(470);
    setPlayerVY(0);
    setOnGround(true);
    setCameraX(0);
    setObbyDead(false);
    setObbyClear(false);
    setScreen("obby");
  }, []);

  useEffect(() => {
    if (screen !== "obby" || obbyDead || obbyClear) return;

    const handleKey = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if ((e.key === " " || e.key === "ArrowUp") && onGround) {
        setPlayerVY(-10);
        setOnGround(false);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKeyUp);

    const interval = setInterval(() => {
      const keys = keysRef.current;
      let dx = 0;
      if (keys.has("ArrowLeft") || keys.has("a")) dx = -4;
      if (keys.has("ArrowRight") || keys.has("d")) dx = 4;

      setPlayerX((px) => {
        const newX = px + dx;
        setPlayerY((py) => {
          setPlayerVY((vy) => {
            const gravity = 0.5;
            let newVY = vy + gravity;
            let newY = py + newVY;
            let grounded = false;

            // Check block collisions
            const tick = Date.now() / 1000;
            for (const block of obbyBlocks) {
              let bx = block.x;
              const by = block.y;
              if (block.moving) {
                bx += Math.sin(tick * block.moving.speed + block.moving.offset) * block.moving.range;
              }

              if (newX + 12 > bx && newX - 12 < bx + block.w && newY + 20 > by && newY + 20 < by + 20 && newVY >= 0) {
                newY = by - 20;
                newVY = 0;
                grounded = true;

                if (block.type === "lava") {
                  setObbyDead(true);
                } else if (block.type === "bounce") {
                  newVY = -15;
                  grounded = false;
                } else if (block.type === "finish") {
                  setObbyClear(true);
                  const reward = 50 + obbyLevel * 30;
                  setRobux((r) => r + reward);
                  setObbyLevel((l) => l + 1);
                }
              }
            }

            if (newY > 600) {
              setObbyDead(true);
            }

            setOnGround(grounded);
            setPlayerY(newY);
            return newVY;
          });
          return py;
        });

        setCameraX(Math.max(0, newX - 180));
        return newX;
      });
    }, 33);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [screen, obbyDead, obbyClear, obbyBlocks, onGround, obbyLevel]);

  // Fight actions
  const playerAttack = useCallback(() => {
    if (fightTurn !== "player") return;
    const dmg = Math.max(1, playerChar.atk - enemyChar.def + Math.floor(Math.random() * 5));
    const crit = Math.random() < 0.15;
    const finalDmg = crit ? dmg * 2 : dmg;

    setEnemyChar((e) => {
      const newHp = Math.max(0, e.hp - finalDmg);
      if (newHp <= 0) {
        const reward = 30 + fightStage * 20;
        setRobux((r) => r + reward);
        setFightLog((l) => [...l, `${crit ? "크리티컬! " : ""}${e.name}에게 ${finalDmg} 데미지! 승리! +${reward} 로벅스`]);
        setFightTurn("win");
        return { ...e, hp: 0 };
      }
      setFightLog((l) => [...l, `${crit ? "크리티컬! " : ""}${e.name}에게 ${finalDmg} 데미지!`]);
      setFightTurn("enemy");
      // Enemy counterattack
      setTimeout(() => {
        const eDmg = Math.max(1, e.atk - playerChar.def + Math.floor(Math.random() * 3));
        setPlayerChar((p) => {
          const pHp = Math.max(0, p.hp - eDmg);
          if (pHp <= 0) {
            setFightLog((l) => [...l, `${e.name}의 반격! ${eDmg} 데미지! 패배...`]);
            setFightTurn("lose");
            return { ...p, hp: 0 };
          }
          setFightLog((l) => [...l, `${e.name}의 반격! ${eDmg} 데미지!`]);
          setFightTurn("player");
          return { ...p, hp: pHp };
        });
      }, 500);
      return { ...e, hp: newHp };
    });
  }, [fightTurn, playerChar, enemyChar, fightStage]);

  const startFight = useCallback((stage: number) => {
    const enemy = { ...FIGHT_ENEMIES[Math.min(stage, FIGHT_ENEMIES.length - 1)] };
    enemy.hp = enemy.maxHp;
    const petPower = ownedPets.reduce((sum, p) => sum + p.power, 0);
    setPlayerChar({ name: "나", emoji: "🦸", hp: 150 + petPower, maxHp: 150 + petPower, atk: 20 + Math.floor(petPower / 5), def: 10 + Math.floor(petPower / 10), speed: 5 });
    setEnemyChar(enemy);
    setFightLog([`${enemy.emoji} ${enemy.name} 등장!`]);
    setFightTurn("player");
    setScreen("fight");
  }, [ownedPets]);

  // Pet power calc
  useEffect(() => {
    setTotalPetPower(ownedPets.reduce((sum, p) => sum + p.power, 0));
  }, [ownedPets]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-slate-900 via-gray-900 to-slate-900 text-white">

      {/* === LOBBY === */}
      {screen === "lobby" && (
        <div className="w-full max-w-lg px-4 py-6">
          <Link href="/" className="mb-4 inline-block rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">
            ← 홈
          </Link>

          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-4xl font-black">
              <span className="bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 bg-clip-text text-transparent">ROBLOX</span>
            </h1>
            <p className="text-slate-400">상상을 현실로!</p>
          </div>

          {/* Avatar + Robux */}
          <div className="mb-6 flex items-center justify-between rounded-xl bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-16 w-16 items-center justify-center rounded-xl ${avatar.color}`}>
                <span className="text-3xl">{avatar.face}</span>
              </div>
              <div>
                <p className="font-bold">내 아바타</p>
                <div className="flex gap-1 text-sm">
                  <span>{avatar.hat}</span>
                  <span>{avatar.body}</span>
                  <span>{avatar.pet}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">로벅스</p>
              <p className="text-xl font-black text-green-400">R$ {robux.toLocaleString()}</p>
            </div>
          </div>

          {/* Quick buttons */}
          <div className="mb-6 flex gap-2">
            <button onClick={() => setScreen("avatar")} className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 py-2 text-sm font-bold transition-transform hover:scale-105 active:scale-95">
              🎨 아바타
            </button>
            <button onClick={() => setScreen("shop")} className="flex-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 py-2 text-sm font-bold transition-transform hover:scale-105 active:scale-95">
              🛒 상점
            </button>
          </div>

          {/* Game list */}
          <h2 className="mb-3 text-lg font-black">🎮 인기 게임</h2>
          <div className="space-y-3">
            {ROBLOX_GAMES.map((game) => (
              <button
                key={game.id}
                onClick={() => {
                  if (game.id === "obby") startObby(obbyLevel);
                  else if (game.id === "tycoon") setScreen("tycoon");
                  else if (game.id === "fight") startFight(fightStage);
                  else if (game.id === "pet") setScreen("petSim");
                  else if (game.id === "tower") setScreen("tower");
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${game.bg}`}>
                    <span className="text-2xl">{game.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{game.name}</p>
                    <p className="text-xs text-slate-400">{game.desc}</p>
                    <div className="mt-1 flex gap-3 text-[10px] text-slate-500">
                      <span>👤 {game.players.toLocaleString()}</span>
                      <span>👍 {game.likes.toLocaleString()}</span>
                      <span className="rounded bg-white/10 px-1">{game.genre}</span>
                    </div>
                  </div>
                  <span className="text-green-400 text-2xl">▶</span>
                </div>
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-6 rounded-xl bg-white/5 p-4 text-sm space-y-1">
            <p>🐾 보유 펫: <span className="font-bold text-pink-400">{ownedPets.length}</span> 마리 (전투력: {totalPetPower})</p>
            <p>🏃 오비 레벨: <span className="font-bold text-cyan-400">{obbyLevel}</span></p>
            <p>⚔️ 전투 스테이지: <span className="font-bold text-red-400">{fightStage + 1}</span></p>
          </div>
        </div>
      )}

      {/* === AVATAR === */}
      {screen === "avatar" && (
        <div className="w-full max-w-lg px-4 py-6">
          <h2 className="mb-4 text-2xl font-black">🎨 아바타 커스텀</h2>

          <div className="mb-6 flex justify-center">
            <div className={`flex h-32 w-32 flex-col items-center justify-center rounded-2xl ${avatar.color} shadow-xl`}>
              <span className="text-sm">{avatar.hat}</span>
              <span className="text-4xl">{avatar.face}</span>
              <span className="text-lg">{avatar.body}</span>
              <span className="text-sm">{avatar.pet}</span>
            </div>
          </div>

          {/* Color picker */}
          <p className="mb-2 text-sm font-bold">색상</p>
          <div className="mb-4 flex gap-2">
            {["bg-blue-500", "bg-red-500", "bg-green-500", "bg-purple-500", "bg-yellow-500", "bg-pink-500", "bg-cyan-500", "bg-orange-500"].map((c) => (
              <button
                key={c}
                onClick={() => setAvatar((a) => ({ ...a, color: c }))}
                className={`h-8 w-8 rounded-full ${c} border-2 ${avatar.color === c ? "border-white" : "border-transparent"}`}
              />
            ))}
          </div>

          {/* Equipped items */}
          {(["hat", "face", "body", "pet"] as const).map((type) => {
            const typeLabel = type === "hat" ? "모자" : type === "face" ? "얼굴" : type === "body" ? "옷" : "펫";
            const items = SHOP_ITEMS.filter((i) => i.type === type && ownedItems.includes(i.id));
            return (
              <div key={type} className="mb-3">
                <p className="mb-1 text-sm font-bold">{typeLabel}</p>
                <div className="flex gap-2 flex-wrap">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setAvatar((a) => ({ ...a, [type]: item.emoji }))}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-lg hover:bg-white/10"
                    >
                      {item.emoji}
                    </button>
                  ))}
                  {items.length === 0 && <p className="text-xs text-slate-500">상점에서 구매하세요!</p>}
                </div>
              </div>
            );
          })}

          <button onClick={() => setScreen("lobby")} className="mt-4 rounded-lg bg-white/10 px-6 py-2 font-bold hover:bg-white/20">
            ← 로비
          </button>
        </div>
      )}

      {/* === SHOP === */}
      {screen === "shop" && (
        <div className="w-full max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black">🛒 상점</h2>
            <p className="font-bold text-green-400">R$ {robux.toLocaleString()}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {SHOP_ITEMS.map((item) => {
              const owned = ownedItems.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (owned || robux < item.price) return;
                    setRobux((r) => r - item.price);
                    setOwnedItems((o) => [...o, item.id]);
                  }}
                  disabled={owned}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                    owned ? "border-green-500/30 bg-green-500/10 opacity-60" : "border-white/10 bg-white/5 hover:bg-white/10 hover:scale-105 active:scale-95"
                  }`}
                >
                  <span className="text-3xl">{item.emoji}</span>
                  <span className="font-bold text-sm">{item.name}</span>
                  <span className={`text-xs ${shopRarityColor(item.rarity)}`}>{item.rarity === "common" ? "일반" : item.rarity === "rare" ? "레어" : item.rarity === "epic" ? "에픽" : "전설"}</span>
                  {owned ? (
                    <span className="text-xs text-green-400">보유중</span>
                  ) : (
                    <span className={`text-xs ${robux >= item.price ? "text-green-400" : "text-red-400"}`}>R$ {item.price}</span>
                  )}
                </button>
              );
            })}
          </div>

          <button onClick={() => setScreen("lobby")} className="mt-4 rounded-lg bg-white/10 px-6 py-2 font-bold hover:bg-white/20">
            ← 로비
          </button>
        </div>
      )}

      {/* === OBBY === */}
      {screen === "obby" && (
        <div className="flex flex-col items-center pt-4">
          <div className="mb-2 flex w-[360px] items-center justify-between text-sm">
            <span className="font-bold text-cyan-400">🏃 오비 레벨 {obbyLevel}</span>
            <span className="text-slate-400">방향키로 이동, 스페이스바로 점프</span>
          </div>

          <div
            className="relative overflow-hidden rounded-xl border-2 border-cyan-500/30 bg-gradient-to-b from-sky-900/50 to-slate-900"
            style={{ width: 360, height: 400 }}
          >
            {/* Blocks */}
            {obbyBlocks.map((block, i) => {
              const tick = Date.now() / 1000;
              let bx = block.x;
              if (block.moving) {
                bx += Math.sin(tick * block.moving.speed + block.moving.offset) * block.moving.range;
              }
              const screenX = bx - cameraX;
              const colors = {
                normal: "bg-emerald-500",
                lava: "bg-red-600 animate-pulse",
                ice: "bg-cyan-300",
                bounce: "bg-yellow-400",
                moving: "bg-orange-500",
                finish: "bg-gradient-to-r from-yellow-400 to-amber-500",
              };
              return (
                <div
                  key={i}
                  className={`absolute h-3 rounded ${colors[block.type]}`}
                  style={{ left: screenX, top: block.y, width: block.w }}
                >
                  {block.type === "finish" && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-lg">🏁</span>}
                  {block.type === "lava" && <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs">🔥</span>}
                  {block.type === "bounce" && <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs">🔼</span>}
                </div>
              );
            })}

            {/* Player */}
            <div
              className="absolute text-2xl transition-none"
              style={{ left: playerX - cameraX - 12, top: playerY }}
            >
              {avatar.face}
            </div>

            {/* Death/Clear overlay */}
            {obbyDead && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                <p className="text-3xl font-black text-red-400">💀 탈락!</p>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => startObby(obbyLevel)} className="rounded-lg bg-red-500 px-6 py-2 font-bold">재시작</button>
                  <button onClick={() => setScreen("lobby")} className="rounded-lg bg-white/10 px-6 py-2 font-bold">로비</button>
                </div>
              </div>
            )}
            {obbyClear && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                <p className="text-3xl font-black text-amber-400">🎉 클리어!</p>
                <p className="text-sm text-green-400">+{50 + (obbyLevel - 1) * 30} 로벅스!</p>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => startObby(obbyLevel)} className="rounded-lg bg-cyan-500 px-6 py-2 font-bold">다음 레벨</button>
                  <button onClick={() => setScreen("lobby")} className="rounded-lg bg-white/10 px-6 py-2 font-bold">로비</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === TYCOON === */}
      {screen === "tycoon" && (
        <div className="w-full max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black">🏭 부자 타이쿤</h2>
            <p className="font-bold text-yellow-400">💰 {tycoonMoney.toLocaleString()}</p>
          </div>

          <p className="mb-4 text-sm text-slate-400">
            건물을 구매해서 수입을 올리세요! (초당 수입: 💰{tycoonBuildings.filter((b) => b.owned).reduce((s, b) => s + b.income, 0)})
          </p>

          <div className="space-y-2">
            {tycoonBuildings.map((building, i) => (
              <div
                key={building.id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  building.owned ? "border-green-500/30 bg-green-500/10" : "border-white/10 bg-white/5"
                }`}
              >
                <span className="text-3xl">{building.emoji}</span>
                <div className="flex-1">
                  <p className="font-bold">{building.name}</p>
                  <p className="text-xs text-slate-400">수입: 💰{building.income}/초</p>
                </div>
                {building.owned ? (
                  <span className="rounded bg-green-500/20 px-2 py-1 text-xs text-green-400">운영중</span>
                ) : (
                  <button
                    onClick={() => {
                      if (tycoonMoney < building.cost) return;
                      setTycoonMoney((m) => m - building.cost);
                      setTycoonBuildings((prev) => prev.map((b, j) => j === i ? { ...b, owned: true } : b));
                    }}
                    disabled={tycoonMoney < building.cost}
                    className={`rounded-lg px-4 py-2 text-sm font-bold ${
                      tycoonMoney >= building.cost ? "bg-yellow-500 text-black hover:bg-yellow-400" : "bg-gray-700 text-gray-500"
                    }`}
                  >
                    💰 {building.cost.toLocaleString()}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => {
                const convert = Math.min(tycoonMoney, 1000);
                if (convert >= 100) {
                  setTycoonMoney((m) => m - convert);
                  setRobux((r) => r + Math.floor(convert / 10));
                }
              }}
              className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-bold hover:bg-green-500"
            >
              💰→R$ 환전 (10:1)
            </button>
            <button onClick={() => setScreen("lobby")} className="rounded-lg bg-white/10 px-6 py-2 font-bold hover:bg-white/20">
              ← 로비
            </button>
          </div>
        </div>
      )}

      {/* === FIGHT === */}
      {screen === "fight" && (
        <div className="w-full max-w-lg px-4 py-6">
          <h2 className="mb-4 text-2xl font-black">⚔️ 배틀 아레나 - 스테이지 {fightStage + 1}</h2>

          <div className="mb-4 flex items-center justify-between">
            {/* Player */}
            <div className="flex-1 text-center">
              <span className="text-5xl">{playerChar.emoji}</span>
              <p className="mt-1 font-bold">{playerChar.name}</p>
              <div className="mx-auto mt-1 h-3 w-32 overflow-hidden rounded-full bg-gray-700">
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(playerChar.hp / playerChar.maxHp) * 100}%` }} />
              </div>
              <p className="text-xs text-slate-400">{playerChar.hp}/{playerChar.maxHp}</p>
            </div>

            <span className="text-2xl font-black text-red-400">VS</span>

            {/* Enemy */}
            <div className="flex-1 text-center">
              <span className="text-5xl">{enemyChar.emoji}</span>
              <p className="mt-1 font-bold">{enemyChar.name}</p>
              <div className="mx-auto mt-1 h-3 w-32 overflow-hidden rounded-full bg-gray-700">
                <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${(enemyChar.hp / enemyChar.maxHp) * 100}%` }} />
              </div>
              <p className="text-xs text-slate-400">{enemyChar.hp}/{enemyChar.maxHp}</p>
            </div>
          </div>

          {/* Fight log */}
          <div className="mb-4 h-32 overflow-y-auto rounded-xl bg-black/30 p-3 text-sm space-y-1">
            {fightLog.map((log, i) => (
              <p key={i} className="text-slate-300">{log}</p>
            ))}
          </div>

          {/* Actions */}
          {fightTurn === "player" && (
            <div className="flex gap-3">
              <button onClick={playerAttack} className="flex-1 rounded-xl bg-red-500 py-3 font-bold hover:bg-red-400">⚔️ 공격</button>
              <button
                onClick={() => {
                  setPlayerChar((p) => ({ ...p, hp: Math.min(p.maxHp, p.hp + 30) }));
                  setFightLog((l) => [...l, "HP 30 회복!"]);
                  setFightTurn("enemy");
                  setTimeout(() => {
                    const eDmg = Math.max(1, enemyChar.atk - playerChar.def);
                    setPlayerChar((p) => {
                      const newHp = Math.max(0, p.hp - eDmg);
                      if (newHp <= 0) { setFightTurn("lose"); setFightLog((l) => [...l, `${enemyChar.name}의 반격! 패배...`]); }
                      else { setFightTurn("player"); setFightLog((l) => [...l, `${enemyChar.name}의 반격! ${eDmg} 데미지`]); }
                      return { ...p, hp: newHp };
                    });
                  }, 500);
                }}
                className="flex-1 rounded-xl bg-green-600 py-3 font-bold hover:bg-green-500"
              >
                💚 회복
              </button>
            </div>
          )}

          {fightTurn === "enemy" && <p className="text-center text-slate-400 animate-pulse">적의 턴...</p>}

          {fightTurn === "win" && (
            <div className="text-center space-y-3">
              <p className="text-xl font-black text-amber-400">🎉 승리!</p>
              <button
                onClick={() => {
                  setFightStage((s) => s + 1);
                  startFight(fightStage + 1);
                }}
                className="rounded-xl bg-red-500 px-8 py-3 font-bold"
              >
                다음 스테이지
              </button>
            </div>
          )}

          {fightTurn === "lose" && (
            <div className="text-center space-y-3">
              <p className="text-xl font-black text-red-400">💀 패배...</p>
              <button onClick={() => startFight(fightStage)} className="rounded-xl bg-red-500 px-8 py-3 font-bold">재도전</button>
            </div>
          )}

          <button onClick={() => setScreen("lobby")} className="mt-4 w-full rounded-lg bg-white/10 py-2 text-sm font-bold hover:bg-white/20">
            ← 로비
          </button>
        </div>
      )}

      {/* === PET SIMULATOR === */}
      {screen === "petSim" && (
        <div className="w-full max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black">🐾 펫 시뮬레이터</h2>
            <p className="font-bold text-green-400">R$ {robux.toLocaleString()}</p>
          </div>

          <p className="mb-2 text-sm text-slate-400">알을 부화해서 펫을 모으세요! 펫은 전투력을 올려줍니다.</p>
          <p className="mb-4 text-sm text-pink-400">총 전투력: ⚡{totalPetPower}</p>

          {/* Hatch buttons */}
          <div className="mb-6 flex gap-3">
            <button
              onClick={() => {
                if (robux < PET_HATCH_COST) return;
                setRobux((r) => r - PET_HATCH_COST);
                const pet = hatchPet(false);
                setOwnedPets((prev) => [...prev, pet]);
                setPetResult(pet);
                setScreen("petResult");
              }}
              disabled={robux < PET_HATCH_COST}
              className={`flex-1 rounded-xl py-4 font-black text-center transition-transform hover:scale-105 active:scale-95 ${
                robux >= PET_HATCH_COST ? "bg-gradient-to-r from-green-500 to-emerald-500" : "bg-gray-700 text-gray-500"
              }`}
            >
              🥚 일반 알<br /><span className="text-xs">R$ {PET_HATCH_COST}</span>
            </button>
            <button
              onClick={() => {
                if (robux < PET_GOLDEN_COST) return;
                setRobux((r) => r - PET_GOLDEN_COST);
                const pet = hatchPet(true);
                setOwnedPets((prev) => [...prev, pet]);
                setPetResult(pet);
                setScreen("petResult");
              }}
              disabled={robux < PET_GOLDEN_COST}
              className={`flex-1 rounded-xl py-4 font-black text-center transition-transform hover:scale-105 active:scale-95 ${
                robux >= PET_GOLDEN_COST ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black" : "bg-gray-700 text-gray-500"
              }`}
            >
              🌟 골든 알<br /><span className="text-xs">R$ {PET_GOLDEN_COST}</span>
            </button>
          </div>

          {/* Owned pets */}
          <p className="mb-2 text-sm font-bold">보유 펫 ({ownedPets.length})</p>
          {ownedPets.length === 0 ? (
            <p className="text-sm text-slate-500">아직 펫이 없어요! 알을 부화해보세요!</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {ownedPets.map((pet, i) => (
                <div key={i} className={`flex flex-col items-center rounded-lg border-2 p-2 ${petRarityBorder(pet.rarity)} bg-white/5`}>
                  <span className="text-2xl">{pet.emoji}</span>
                  <span className={`text-[10px] font-bold ${petRarityColor(pet.rarity)}`}>{pet.name}</span>
                  <span className="text-[10px] text-slate-400">⚡{pet.power}</span>
                </div>
              ))}
            </div>
          )}

          {/* Pet index */}
          <p className="mt-4 mb-2 text-sm font-bold text-slate-400">📖 펫 도감</p>
          <div className="grid grid-cols-5 gap-1.5">
            {PET_POOL.map((pet) => {
              const owned = ownedPets.some((p) => p.id === pet.id);
              return (
                <div key={pet.id} className={`flex flex-col items-center rounded-lg border p-1 text-[10px] ${
                  owned ? `${petRarityBorder(pet.rarity)} bg-white/5` : "border-gray-800 bg-black/30 opacity-40"
                }`}>
                  <span className="text-lg">{owned ? pet.emoji : "❓"}</span>
                  <span className={petRarityColor(pet.rarity)}>{owned ? pet.name : "???"}</span>
                </div>
              );
            })}
          </div>

          <button onClick={() => setScreen("lobby")} className="mt-4 rounded-lg bg-white/10 px-6 py-2 font-bold hover:bg-white/20">
            ← 로비
          </button>
        </div>
      )}

      {/* === PET RESULT === */}
      {screen === "petResult" && petResult && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-2xl font-black">🎊 부화 성공!</h2>
          <div className={`rounded-2xl border-4 ${petRarityBorder(petResult.rarity)} bg-gradient-to-b from-white/10 to-white/5 p-8`}>
            {petResult.rarity === "mythic" && <p className="text-sm text-red-400 animate-pulse mb-2">✦ 신화 ✦</p>}
            {petResult.rarity === "legendary" && <p className="text-sm text-amber-400 animate-pulse mb-2">★ 전설 ★</p>}
            <span className="text-8xl">{petResult.emoji}</span>
          </div>
          <p className={`text-2xl font-black ${petRarityColor(petResult.rarity)}`}>{petResult.name}</p>
          <p className={`text-sm ${petRarityColor(petResult.rarity)}`}>{petRarityLabel(petResult.rarity)}</p>
          <p className="text-sm text-slate-400">전투력: ⚡{petResult.power}</p>

          <div className="flex gap-3 mt-4">
            <button onClick={() => setScreen("petSim")} className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-8 py-3 font-bold hover:scale-105 active:scale-95">
              🥚 더 뽑기!
            </button>
            <button onClick={() => setScreen("lobby")} className="rounded-xl bg-white/10 px-8 py-3 font-bold">
              로비
            </button>
          </div>
        </div>
      )}

      {/* === TOWER DEFENSE (간단) === */}
      {screen === "tower" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-2xl font-black">🏰 타워 디펜스</h2>
          <p className="text-slate-400">준비 중입니다!</p>
          <div className="text-8xl">🚧</div>
          <p className="text-sm text-slate-500">곧 업데이트 될 예정이에요!</p>
          <button onClick={() => setScreen("lobby")} className="rounded-xl bg-white/10 px-8 py-3 font-bold">
            ← 로비
          </button>
        </div>
      )}
    </div>
  );
}
