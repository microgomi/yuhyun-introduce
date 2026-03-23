"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

// --- Types ---
interface RoomItem {
  id: string;
  name: string;
  emoji: string;
  type: "key" | "heal" | "light" | "lock" | "hiding" | "chest" | "book" | "crucifix";
  desc: string;
}

interface Entity {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  behavior: "rush" | "lurk" | "chase" | "scream" | "dark" | "mimic";
  killMessage: string;
  surviveHint: string;
  speed: number;
}

interface Room {
  id: number;
  hasDoor: boolean;
  hasCloset: boolean;
  hasBed: boolean;
  hasKey: boolean;
  hasChest: boolean;
  hasBook: boolean;
  isDark: boolean;
  entity: Entity | null;
  entityPhase: "none" | "warning" | "active" | "passed";
  items: RoomItem[];
  doorLocked: boolean;
}

// --- Data ---
const ENTITIES: Entity[] = [
  { id: "rush", name: "러쉬", emoji: "⚡", desc: "복도를 질주하는 번개!", behavior: "rush", killMessage: "러쉬에게 잡혔다!", surviveHint: "옷장이나 침대 밑에 숨어!", speed: 3, },
  { id: "ambush", name: "앰부쉬", emoji: "👁️", desc: "여러 번 돌아오는 기습!", behavior: "rush", killMessage: "앰부쉬에게 잡혔다!", surviveHint: "숨어! 여러 번 올 수 있어!", speed: 4, },
  { id: "screech", name: "스크리치", emoji: "😱", desc: "문 뒤에 숨어있다!", behavior: "scream", killMessage: "스크리치에게 잡혔다!", surviveHint: "보이면 빨리 뒤를 돌아봐!", speed: 2, },
  { id: "halt", name: "홀트", emoji: "🛑", desc: "복도에서 멈춰 서라!", behavior: "lurk", killMessage: "홀트에게 잡혔다!", surviveHint: "빛이 깜빡이면 뒤로 가!", speed: 1, },
  { id: "eyes", name: "아이즈", emoji: "👀", desc: "어둠 속의 눈...", behavior: "dark", killMessage: "아이즈에게 잡혔다!", surviveHint: "어둠 속에서 눈을 피해 이동해!", speed: 1, },
  { id: "seek", name: "시크", emoji: "🔥", desc: "끝까지 쫓아오는 추격자!", behavior: "chase", killMessage: "시크에게 잡혔다!", surviveHint: "빛을 따라 도망쳐!", speed: 5, },
  { id: "figure", name: "피규어", emoji: "🖤", desc: "어둠 속의 그림자...", behavior: "dark", killMessage: "피규어에게 잡혔다!", surviveHint: "라이터를 켜고 움직여!", speed: 2, },
  { id: "dupe", name: "듀프", emoji: "🚪", desc: "가짜 문을 만드는 속임수!", behavior: "mimic", killMessage: "듀프에게 속았다!", surviveHint: "번호가 이상한 문을 조심해!", speed: 1, },
  { id: "timothy", name: "티모시", emoji: "🕷️", desc: "서랍 속의 거미!", behavior: "lurk", killMessage: "티모시에게 물렸다!", surviveHint: "서랍을 열 때 조심해!", speed: 0, },
  { id: "jack", name: "잭", emoji: "📦", desc: "상자 속의 놀라움!", behavior: "lurk", killMessage: "잭에게 당했다!", surviveHint: "상자를 열 때 주의해!", speed: 0, },
];

const ITEMS: RoomItem[] = [
  { id: "key", name: "열쇠", emoji: "🔑", type: "key", desc: "잠긴 문을 열 수 있다" },
  { id: "bandage", name: "붕대", emoji: "🩹", type: "heal", desc: "체력을 30 회복" },
  { id: "medkit", name: "구급상자", emoji: "💊", type: "heal", desc: "체력을 60 회복" },
  { id: "lighter", name: "라이터", emoji: "🔥", type: "light", desc: "어두운 방을 밝힌다" },
  { id: "flashlight", name: "손전등", emoji: "🔦", type: "light", desc: "넓은 범위를 비춘다" },
  { id: "crucifix", name: "십자가", emoji: "✝️", type: "crucifix", desc: "엔티티를 한 번 쫓아낸다" },
  { id: "book", name: "낡은 책", emoji: "📕", type: "book", desc: "호텔의 비밀이 적혀있다..." },
];

// --- Room Generator ---
function generateRoom(roomNum: number): Room {
  const hasCloset = Math.random() < 0.7;
  const hasBed = Math.random() < 0.5;
  const hasKey = Math.random() < 0.15;
  const hasChest = Math.random() < 0.3;
  const hasBook = Math.random() < 0.1;
  const isDark = roomNum > 10 && Math.random() < 0.2 + roomNum * 0.01;
  const doorLocked = Math.random() < 0.15 + roomNum * 0.005;

  // Entity spawn
  let entity: Entity | null = null;
  const entityChance = Math.min(0.1 + roomNum * 0.03, 0.6);
  if (Math.random() < entityChance && roomNum > 2) {
    const available = ENTITIES.filter((e) => {
      if (e.id === "seek" && roomNum < 30) return false;
      if (e.id === "eyes" && !isDark) return false;
      if (e.id === "figure" && !isDark) return false;
      return true;
    });
    if (available.length > 0) {
      entity = available[Math.floor(Math.random() * available.length)];
    }
  }

  // Items in room
  const roomItems: RoomItem[] = [];
  if (hasKey) roomItems.push(ITEMS[0]);
  if (Math.random() < 0.2) roomItems.push(Math.random() < 0.5 ? ITEMS[1] : ITEMS[2]);
  if (isDark && Math.random() < 0.4) roomItems.push(Math.random() < 0.5 ? ITEMS[3] : ITEMS[4]);
  if (Math.random() < 0.08) roomItems.push(ITEMS[5]);
  if (hasBook) roomItems.push(ITEMS[6]);

  return {
    id: roomNum,
    hasDoor: true,
    hasCloset,
    hasBed,
    hasKey,
    hasChest,
    hasBook,
    isDark,
    entity,
    entityPhase: entity ? "none" : "none",
    items: roomItems,
    doorLocked,
  };
}

type Screen = "menu" | "playing" | "hiding" | "entity_event" | "death" | "escape" | "chest" | "seek_chase";
type HidingSpot = "closet" | "bed";

export default function DoorsPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [roomNumber, setRoomNumber] = useState(1);
  const [room, setRoom] = useState<Room>(generateRoom(1));
  const [hp, setHp] = useState(100);
  const [maxHp] = useState(100);
  const [inventory, setInventory] = useState<RoomItem[]>([]);
  const [keys, setKeys] = useState(0);
  const [lightOn, setLightOn] = useState(false);
  const [hasCrucifix, setHasCrucifix] = useState(false);
  const [log, setLog] = useState<string[]>(["호텔에 들어왔다... 문을 찾아 탈출하자."]);
  const [highestRoom, setHighestRoom] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [entityTimer, setEntityTimer] = useState(0);
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [hidingIn, setHidingIn] = useState<HidingSpot | null>(null);
  const [rushCount, setRushCount] = useState(0);
  const [seekProgress, setSeekProgress] = useState(0);
  const [screechVisible, setScreechVisible] = useState(false);
  const [haltFlicker, setHaltFlicker] = useState(false);
  const [dupeActive, setDupeActive] = useState(false);
  const [dupeCorrectDoor, setDupeCorrectDoor] = useState(0);
  const [eyesPositions, setEyesPositions] = useState<{ x: number; y: number }[]>([]);
  const [playerPos, setPlayerPos] = useState({ x: 180, y: 250 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-8), msg]);
  }, []);

  // Start / restart game
  const startGame = useCallback(() => {
    const firstRoom = generateRoom(1);
    setRoomNumber(1);
    setRoom(firstRoom);
    setHp(100);
    setInventory([]);
    setKeys(0);
    setLightOn(false);
    setHasCrucifix(false);
    setLog(["호텔에 들어왔다... 문을 찾아 탈출하자."]);
    setScreen("playing");
    setCurrentEntity(null);
    setHidingIn(null);
    setRushCount(0);
    setSeekProgress(0);
    setScreechVisible(false);
    setDupeActive(false);
  }, []);

  // Enter next room
  const enterNextRoom = useCallback(() => {
    if (room.doorLocked && keys <= 0) {
      addLog("🔒 문이 잠겨있다! 열쇠가 필요해!");
      return;
    }
    if (room.doorLocked && keys > 0) {
      setKeys((k) => k - 1);
      addLog("🔑 열쇠로 문을 열었다!");
    }

    const nextNum = roomNumber + 1;

    // Check if escaped (every 100 rooms)
    if (nextNum > 100) {
      if (nextNum > highestRoom) setHighestRoom(nextNum);
      setScreen("escape");
      return;
    }

    const nextRoom = generateRoom(nextNum);
    setRoomNumber(nextNum);
    setRoom(nextRoom);
    setLightOn(false);
    setHidingIn(null);
    setScreechVisible(false);
    setDupeActive(false);

    if (nextNum > highestRoom) setHighestRoom(nextNum);
    addLog(`🚪 ${nextNum}번 방에 들어왔다.`);

    if (nextRoom.isDark) addLog("🌑 어둡다... 아무것도 안 보인다.");
    if (nextRoom.doorLocked) addLog("🔒 다음 문이 잠겨있다...");

    // Entity trigger
    if (nextRoom.entity) {
      const ent = nextRoom.entity;
      setTimeout(() => {
        setCurrentEntity(ent);

        if (ent.behavior === "rush") {
          addLog(`⚠️ 불빛이 깜빡인다...! 뭔가 온다!`);
          const count = ent.id === "ambush" ? 2 + Math.floor(Math.random() * 3) : 1;
          setRushCount(count);
          setScreen("entity_event");
        } else if (ent.behavior === "scream") {
          setTimeout(() => {
            setScreechVisible(true);
            addLog(`😱 뒤에 뭔가 있다...!`);
            // Auto-kill timer
            timerRef.current = setTimeout(() => {
              setScreechVisible(false);
              takeDamage(40, ent.killMessage);
            }, 2000);
          }, 500 + Math.random() * 2000);
        } else if (ent.behavior === "lurk" && ent.id === "halt") {
          setHaltFlicker(true);
          addLog("🛑 앞의 빛이 깜빡인다... 멈춰!");
        } else if (ent.behavior === "dark") {
          if (!lightOn) {
            addLog(`👀 어둠 속에서 눈이 보인다...`);
            const eyes = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => ({
              x: Math.random() * 300 + 30,
              y: Math.random() * 300 + 50,
            }));
            setEyesPositions(eyes);
          }
        } else if (ent.behavior === "chase") {
          addLog("🔥 시크가 나타났다! 도망쳐!!!");
          setSeekProgress(0);
          setScreen("seek_chase");
        } else if (ent.behavior === "mimic") {
          setDupeActive(true);
          setDupeCorrectDoor(Math.floor(Math.random() * 3));
          addLog("🚪 문이 여러 개 보인다... 진짜 문은?");
        }
      }, 800);
    }
  }, [roomNumber, room, keys, highestRoom, lightOn, addLog]);

  const takeDamage = useCallback((dmg: number, msg: string) => {
    setHp((prev) => {
      const next = prev - dmg;
      if (next <= 0) {
        setDeaths((d) => d + 1);
        addLog(`💀 ${msg}`);
        setTimeout(() => setScreen("death"), 300);
        return 0;
      }
      addLog(`💔 ${msg} (-${dmg} HP)`);
      return next;
    });
  }, [addLog]);

  // Hide
  const hideIn = useCallback((spot: HidingSpot) => {
    setHidingIn(spot);
    addLog(`🫣 ${spot === "closet" ? "옷장" : "침대 밑"}에 숨었다...`);
  }, [addLog]);

  // Rush event handler
  const handleRushEvent = useCallback(() => {
    if (!currentEntity) return;

    if (hidingIn) {
      addLog(`${currentEntity.emoji} ${currentEntity.name}이 지나갔다! 살았다!`);
      setRushCount((c) => {
        const next = c - 1;
        if (next <= 0) {
          setScreen("playing");
          setCurrentEntity(null);
          setHidingIn(null);
        }
        return next;
      });
    } else if (hasCrucifix) {
      addLog(`✝️ 십자가가 ${currentEntity.name}을 쫓아냈다!`);
      setHasCrucifix(false);
      setRushCount(0);
      setScreen("playing");
      setCurrentEntity(null);
    } else {
      takeDamage(40, currentEntity.killMessage);
      setRushCount(0);
      setScreen("playing");
      setCurrentEntity(null);
    }
  }, [currentEntity, hidingIn, hasCrucifix, addLog, takeDamage]);

  // Rush auto-timer
  useEffect(() => {
    if (screen !== "entity_event" || rushCount <= 0) return;
    const timer = setTimeout(() => {
      handleRushEvent();
    }, 2500);
    return () => clearTimeout(timer);
  }, [screen, rushCount, handleRushEvent]);

  // Screech - look back
  const lookBack = useCallback(() => {
    if (screechVisible) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setScreechVisible(false);
      addLog("😱 뒤를 돌아봐서 스크리치를 피했다!");
      setCurrentEntity(null);
    }
  }, [screechVisible, addLog]);

  // Halt - go back
  const goBack = useCallback(() => {
    if (haltFlicker) {
      setHaltFlicker(false);
      addLog("🛑 뒤로 물러나 홀트를 피했다!");
      setCurrentEntity(null);
    }
  }, [haltFlicker, addLog]);

  // Seek chase
  useEffect(() => {
    if (screen !== "seek_chase") return;
    const interval = setInterval(() => {
      setSeekProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          addLog("🏃 시크를 따돌렸다!");
          setScreen("playing");
          setCurrentEntity(null);
          return 0;
        }
        return p;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [screen, addLog]);

  // Dupe - pick door
  const pickDupeDoor = useCallback((doorIdx: number) => {
    if (doorIdx === dupeCorrectDoor) {
      addLog("🚪 진짜 문을 찾았다!");
      setDupeActive(false);
    } else {
      takeDamage(30, "듀프에게 속았다!");
      setDupeActive(false);
    }
  }, [dupeCorrectDoor, addLog, takeDamage]);

  // Pickup item
  const pickupItem = useCallback((item: RoomItem) => {
    if (item.type === "key") {
      setKeys((k) => k + 1);
      addLog("🔑 열쇠를 획득했다!");
    } else if (item.type === "heal") {
      const heal = item.id === "medkit" ? 60 : 30;
      setHp((h) => Math.min(maxHp, h + heal));
      addLog(`${item.emoji} ${item.name} 사용! HP +${heal}`);
    } else if (item.type === "light") {
      setLightOn(true);
      setInventory((inv) => [...inv, item]);
      addLog(`${item.emoji} ${item.name}을 켰다!`);
      setEyesPositions([]);
    } else if (item.type === "crucifix") {
      setHasCrucifix(true);
      addLog("✝️ 십자가를 획득했다! 엔티티를 한 번 쫓아낼 수 있다.");
    } else if (item.type === "book") {
      addLog("📕 '이곳을 떠나라... 100번 문 너머에 출구가 있다...'");
    }
    setRoom((r) => ({ ...r, items: r.items.filter((i) => i.id !== item.id) }));
  }, [maxHp, addLog]);

  // Seek chase - tap to run
  const seekTap = useCallback(() => {
    setSeekProgress((p) => Math.min(100, p + 8 + Math.random() * 4));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-gray-950 via-zinc-950 to-black text-white select-none">

      {/* === MENU === */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/20">← 홈</Link>

          <div className="text-7xl animate-pulse">🚪</div>
          <h1 className="text-5xl font-black tracking-wider">
            <span className="bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 bg-clip-text text-transparent">DOORS</span>
          </h1>
          <p className="text-zinc-500">호텔을 탐험하고... 살아남아라.</p>

          <button onClick={startGame} className="mt-4 rounded-xl bg-gradient-to-r from-red-600 to-red-800 px-12 py-4 text-xl font-black shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-transform">
            🚪 입장하기
          </button>

          <div className="mt-6 rounded-xl bg-white/5 px-6 py-4 space-y-1">
            <p className="text-sm text-zinc-500">🚪 최고 기록: <span className="font-bold text-amber-400">{highestRoom}번 방</span></p>
            <p className="text-sm text-zinc-500">💀 사망 횟수: <span className="font-bold text-red-400">{deaths}</span></p>
          </div>

          {/* Entity guide */}
          <div className="mt-4 w-full max-w-sm">
            <p className="mb-2 text-sm font-bold text-zinc-500">📖 엔티티 도감</p>
            <div className="grid grid-cols-5 gap-2">
              {ENTITIES.map((e) => (
                <div key={e.id} className="flex flex-col items-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 text-[10px]" title={`${e.name}: ${e.surviveHint}`}>
                  <span className="text-xl">{e.emoji}</span>
                  <span className="text-zinc-400">{e.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === PLAYING === */}
      {screen === "playing" && (
        <div className="flex flex-col items-center pt-3 px-2 w-full max-w-md">
          {/* HUD */}
          <div className="mb-2 flex w-full items-center justify-between text-sm">
            <span className="font-bold text-amber-400">🚪 {roomNumber}번 방</span>
            <div className="flex gap-3">
              <span>❤️ {hp}/{maxHp}</span>
              <span className="text-yellow-400">🔑 {keys}</span>
              {hasCrucifix && <span>✝️</span>}
              {lightOn && <span>🔦</span>}
            </div>
          </div>

          {/* HP Bar */}
          <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all" style={{ width: `${(hp / maxHp) * 100}%` }} />
          </div>

          {/* Room visual */}
          <div className={`relative w-full rounded-2xl border-2 ${room.isDark && !lightOn ? "border-zinc-800 bg-black" : "border-zinc-700 bg-gradient-to-b from-zinc-800 to-zinc-900"} shadow-2xl overflow-hidden`} style={{ height: 320 }}>
            {/* Dark overlay */}
            {room.isDark && !lightOn && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <p className="text-4xl animate-pulse">👀</p>
                <p className="absolute bottom-4 text-sm text-zinc-600">어둡다... 아무것도 보이지 않는다</p>
              </div>
            )}

            {/* Eyes entity */}
            {eyesPositions.map((pos, i) => (
              <div key={i} className="absolute text-xl animate-pulse" style={{ left: pos.x, top: pos.y }}>👀</div>
            ))}

            {(!room.isDark || lightOn) && (
              <>
                {/* Room furniture */}
                <div className="absolute inset-0 p-4">
                  {/* Walls pattern */}
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-900/40 to-amber-800/40" />

                  {/* Closet */}
                  {room.hasCloset && (
                    <button onClick={() => hideIn("closet")} className="absolute left-4 top-12 flex flex-col items-center hover:scale-110 transition-transform">
                      <span className="text-4xl">🚪</span>
                      <span className="text-[10px] text-zinc-500">옷장</span>
                    </button>
                  )}

                  {/* Bed */}
                  {room.hasBed && (
                    <button onClick={() => hideIn("bed")} className="absolute left-4 bottom-12 flex flex-col items-center hover:scale-110 transition-transform">
                      <span className="text-4xl">🛏️</span>
                      <span className="text-[10px] text-zinc-500">침대</span>
                    </button>
                  )}

                  {/* Items */}
                  {room.items.map((item, i) => (
                    <button key={item.id + i} onClick={() => pickupItem(item)} className="absolute flex flex-col items-center hover:scale-125 transition-transform animate-bounce" style={{ right: 20 + i * 50, top: 80 + i * 30 }}>
                      <span className="text-3xl">{item.emoji}</span>
                      <span className="text-[10px] text-amber-400">{item.name}</span>
                    </button>
                  ))}

                  {/* Chest */}
                  {room.hasChest && (
                    <div className="absolute right-4 bottom-12">
                      <span className="text-3xl">📦</span>
                      <span className="text-[10px] text-zinc-500 block text-center">상자</span>
                    </div>
                  )}

                  {/* Screech */}
                  {screechVisible && (
                    <button onClick={lookBack} className="absolute right-8 top-20 animate-pulse z-20">
                      <span className="text-6xl">😱</span>
                      <span className="text-xs text-red-400 block">뒤를 봐!</span>
                    </button>
                  )}

                  {/* Halt flicker */}
                  {haltFlicker && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="animate-ping text-6xl">🛑</div>
                      <button onClick={goBack} className="absolute bottom-8 rounded-xl bg-red-600 px-6 py-2 font-bold text-sm animate-pulse">
                        ← 뒤로 물러나!
                      </button>
                    </div>
                  )}
                </div>

                {/* Dupe doors */}
                {dupeActive && (
                  <div className="absolute inset-0 flex items-center justify-center gap-4 z-20 bg-black/60">
                    {[0, 1, 2].map((i) => (
                      <button key={i} onClick={() => pickDupeDoor(i)} className="flex flex-col items-center rounded-xl border-2 border-zinc-600 bg-zinc-800 p-4 hover:border-amber-400 hover:scale-110 transition-all">
                        <span className="text-4xl">🚪</span>
                        <span className="text-sm font-bold text-zinc-400">{roomNumber + (i === dupeCorrectDoor ? 1 : Math.floor(Math.random() * 50) + 50)}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Door to next room */}
                {!dupeActive && (
                  <button
                    onClick={enterNextRoom}
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center hover:scale-110 transition-transform"
                  >
                    <span className="text-5xl">🚪</span>
                    <span className={`text-xs font-bold ${room.doorLocked ? "text-red-400" : "text-green-400"}`}>
                      {room.doorLocked ? "🔒 잠김" : `${roomNumber + 1}번`}
                    </span>
                  </button>
                )}
              </>
            )}

            {/* Hiding overlay */}
            {hidingIn && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30">
                <div className="text-center">
                  <p className="text-xl">🫣</p>
                  <p className="text-sm text-zinc-400 mt-2">{hidingIn === "closet" ? "옷장" : "침대 밑"}에 숨는 중...</p>
                  <button onClick={() => setHidingIn(null)} className="mt-3 text-xs text-zinc-600 hover:text-white">나가기</button>
                </div>
              </div>
            )}
          </div>

          {/* Log */}
          <div className="mt-3 h-28 w-full overflow-y-auto rounded-xl bg-black/50 border border-zinc-800 p-3 text-sm space-y-1">
            {log.map((l, i) => (
              <p key={i} className={`${i === log.length - 1 ? "text-white" : "text-zinc-500"}`}>{l}</p>
            ))}
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex gap-2 w-full">
            {room.isDark && !lightOn && inventory.some((i) => i.type === "light") && (
              <button onClick={() => { setLightOn(true); setEyesPositions([]); addLog("🔦 불을 켰다!"); }} className="flex-1 rounded-xl bg-yellow-600 py-2 text-sm font-bold">
                🔦 불 켜기
              </button>
            )}
            <button onClick={() => setScreen("menu")} className="rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-700">
              메뉴
            </button>
          </div>
        </div>
      )}

      {/* === ENTITY EVENT (Rush/Ambush) === */}
      {screen === "entity_event" && currentEntity && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="animate-ping text-7xl">{currentEntity.emoji}</div>
          <h2 className="text-3xl font-black text-red-400 animate-pulse">{currentEntity.name}!</h2>
          <p className="text-zinc-400">{currentEntity.surviveHint}</p>
          <p className="text-sm text-amber-400">남은 횟수: {rushCount}</p>
          {!hidingIn && (
            <div className="flex gap-3">
              {room.hasCloset && <button onClick={() => hideIn("closet")} className="rounded-xl bg-blue-700 px-6 py-3 font-bold animate-bounce">🚪 옷장에 숨기!</button>}
              {room.hasBed && <button onClick={() => hideIn("bed")} className="rounded-xl bg-purple-700 px-6 py-3 font-bold animate-bounce">🛏️ 침대 밑에 숨기!</button>}
              {!room.hasCloset && !room.hasBed && <p className="text-red-400 font-bold">숨을 곳이 없다...!</p>}
            </div>
          )}
          {hidingIn && (
            <p className="text-zinc-400 animate-pulse">🫣 {hidingIn === "closet" ? "옷장" : "침대 밑"}에 숨는 중... 조용히...</p>
          )}
        </div>
      )}

      {/* === SEEK CHASE === */}
      {screen === "seek_chase" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center" onClick={seekTap}>
          <div className="text-7xl">🔥</div>
          <h2 className="text-3xl font-black text-red-500 animate-pulse">시크가 쫓아온다!</h2>
          <p className="text-zinc-400">빠르게 화면을 탭해서 도망쳐!</p>

          <div className="w-64 h-6 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all" style={{ width: `${seekProgress}%` }} />
          </div>
          <p className="text-sm text-zinc-500">{Math.floor(seekProgress)}% / 100%</p>

          <button onClick={seekTap} className="rounded-xl bg-red-600 px-12 py-4 text-xl font-black animate-bounce">
            🏃 뛰어! TAP!
          </button>
        </div>
      )}

      {/* === DEATH === */}
      {screen === "death" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">💀</div>
          <h2 className="text-3xl font-black text-red-500">사망</h2>
          <p className="text-zinc-400">{roomNumber}번 방에서 사망했습니다.</p>
          {currentEntity && <p className="text-sm text-red-400">{currentEntity.killMessage}</p>}
          <div className="flex gap-3">
            <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-red-600 to-red-800 px-8 py-3 font-bold hover:scale-105 active:scale-95 transition-transform">
              🔄 다시 도전
            </button>
            <button onClick={() => setScreen("menu")} className="rounded-xl bg-zinc-800 px-8 py-3 font-bold">메뉴</button>
          </div>
        </div>
      )}

      {/* === ESCAPE === */}
      {screen === "escape" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">🎉</div>
          <h2 className="text-3xl font-black text-amber-400">탈출 성공!</h2>
          <p className="text-zinc-400">호텔에서 무사히 탈출했습니다!</p>
          <p className="text-green-400 font-bold">🚪 {roomNumber}개의 문을 통과!</p>
          <div className="flex gap-3">
            <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3 font-bold hover:scale-105 active:scale-95 transition-transform">
              🔄 다시 도전
            </button>
            <button onClick={() => setScreen("menu")} className="rounded-xl bg-zinc-800 px-8 py-3 font-bold">메뉴</button>
          </div>
        </div>
      )}
    </div>
  );
}
