"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ═══════════════════════════════════════════════
   탈출하기 - 방탈출 어드벤처
   ═══════════════════════════════════════════════ */

/* ────── 타입 ────── */
interface Item {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  used: boolean;
}

interface Puzzle {
  id: string;
  solved: boolean;
}

type RoomId =
  | "cell"
  | "hallway"
  | "office"
  | "lab"
  | "storage"
  | "control"
  | "vent"
  | "rooftop";

interface Room {
  id: RoomId;
  name: string;
  emoji: string;
  desc: string;
  darkDesc?: string;
  bgClass: string;
  connections: RoomId[];
  locked?: boolean;
  lockMessage?: string;
  requireItem?: string;
  requirePuzzle?: string;
}

type Screen = "title" | "intro" | "game" | "puzzle" | "ending";
type PuzzleType =
  | "keypad"
  | "wire"
  | "simon"
  | "slider"
  | "maze"
  | "decode"
  | "lockpick"
  | "laser";

/* ────── 방 데이터 ────── */
const ROOMS: Room[] = [
  {
    id: "cell",
    name: "감옥방",
    emoji: "🔒",
    desc: "어두컴컴한 감옥방이다. 벽에는 긁힌 자국이 있고, 녹슨 침대와 부서진 세면대가 있다. 문은 굳게 잠겨 있다.",
    darkDesc: "아무것도 보이지 않는다... 어딘가에 불을 켤 수 있는 것이 있을까?",
    bgClass: "from-gray-900 via-stone-900 to-gray-950",
    connections: ["hallway"],
    locked: true,
    requirePuzzle: "cell_lock",
  },
  {
    id: "hallway",
    name: "복도",
    emoji: "🚪",
    desc: "긴 복도다. 비상등이 깜빡이고 있다. 양쪽에 문들이 보이고, 저 멀리 엘리베이터가 있다. 천장에 환기구가 보인다.",
    bgClass: "from-slate-900 via-slate-800 to-slate-950",
    connections: ["cell", "office", "lab", "storage", "control"],
  },
  {
    id: "office",
    name: "사무실",
    emoji: "🖥️",
    desc: "어질러진 사무실이다. 컴퓨터가 켜져 있고, 서랍에 서류가 잔뜩 있다. 금고가 벽에 걸려 있다.",
    bgClass: "from-slate-800 via-zinc-800 to-slate-900",
    connections: ["hallway"],
  },
  {
    id: "lab",
    name: "실험실",
    emoji: "🧪",
    desc: "실험 장비가 즐비한 실험실이다. 유리 비커와 시약이 있고, 레이저 장치가 작동 중이다. 문 하나가 레이저로 막혀 있다.",
    bgClass: "from-emerald-950 via-teal-950 to-gray-950",
    connections: ["hallway"],
  },
  {
    id: "storage",
    name: "창고",
    emoji: "📦",
    desc: "먼지 쌓인 창고다. 상자가 잔뜩 쌓여 있고, 그 사이로 뭔가 반짝이는 것이 보인다. 한쪽에 환기구 입구가 있다.",
    bgClass: "from-amber-950 via-stone-900 to-gray-950",
    connections: ["hallway", "vent"],
    locked: true,
    requireItem: "storage_key",
    lockMessage: "🔒 잠겨 있다. 열쇠가 필요하다.",
  },
  {
    id: "control",
    name: "통제실",
    emoji: "🎛️",
    desc: "시설 전체를 통제하는 방이다. 모니터에 CCTV 화면이 보이고, 거대한 제어 패널이 있다. 비상탈출 시스템이 있지만 잠겨 있다.",
    bgClass: "from-blue-950 via-indigo-950 to-gray-950",
    connections: ["hallway"],
    locked: true,
    requireItem: "access_card",
    lockMessage: "🔒 출입증이 필요합니다.",
  },
  {
    id: "vent",
    name: "환기구",
    emoji: "🌀",
    desc: "좁고 어두운 환기구 안이다. 기어서 움직여야 한다. 저 앞에 격자 너머로 빛이 보인다.",
    bgClass: "from-gray-900 via-neutral-900 to-zinc-950",
    connections: ["storage", "rooftop"],
    locked: true,
    requirePuzzle: "vent_maze",
  },
  {
    id: "rooftop",
    name: "옥상",
    emoji: "🌃",
    desc: "드디어 밖이다! 차가운 바람이 불고 도시의 불빛이 보인다. 헬리콥터 착륙장이 있고, 저 멀리 헬리콥터 소리가 들린다!",
    bgClass: "from-indigo-900 via-purple-950 to-gray-950",
    connections: ["vent"],
  },
];

/* ────── 메인 컴포넌트 ────── */
export default function EscapeGame() {
  const [screen, setScreen] = useState<Screen>("title");
  const [currentRoom, setCurrentRoom] = useState<RoomId>("cell");
  const [inventory, setInventory] = useState<Item[]>([]);
  const [puzzles, setPuzzles] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<{ text: string; type: "info" | "success" | "warn" | "story" }[]>([]);
  const [discoveredItems, setDiscoveredItems] = useState<Set<string>>(new Set());
  const [roomsVisited, setRoomsVisited] = useState<Set<RoomId>>(new Set(["cell"]));
  const [activePuzzle, setActivePuzzle] = useState<PuzzleType | null>(null);
  const [activePuzzleId, setActivePuzzleId] = useState<string>("");
  const [darkMode, setDarkMode] = useState(true); // 감옥에서 시작하면 어두움
  const [timer, setTimer] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [hintCount, setHintCount] = useState(3);
  const [showHint, setShowHint] = useState("");
  const msgEndRef = useRef<HTMLDivElement>(null);

  // 타이머
  useEffect(() => {
    if (!gameStarted || screen !== "game") return;
    const t = setInterval(() => setTimer((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [gameStarted, screen]);

  // 메시지 자동 스크롤
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMsg = useCallback(
    (text: string, type: "info" | "success" | "warn" | "story" = "info") => {
      setMessages((prev) => [...prev.slice(-50), { text, type }]);
    },
    []
  );

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  /* ────── 게임 시작 ────── */
  const startGame = () => {
    setScreen("intro");
  };

  const startPlaying = () => {
    setScreen("game");
    setCurrentRoom("cell");
    setInventory([]);
    setPuzzles({});
    setMessages([]);
    setDiscoveredItems(new Set());
    setRoomsVisited(new Set(["cell"]));
    setDarkMode(true);
    setTimer(0);
    setGameStarted(true);
    setHintCount(3);
    addMsg("💭 눈을 떴다... 여기가 어디지?", "story");
    addMsg("🔦 너무 어둡다. 주변을 더듬어 보자.", "info");
  };

  /* ────── 방 이동 ────── */
  const moveToRoom = useCallback(
    (targetId: RoomId) => {
      const room = ROOMS.find((r) => r.id === targetId)!;

      // 잠긴 방 체크
      if (room.locked) {
        if (room.requireItem && !inventory.find((i) => i.id === room.requireItem && !i.used)) {
          addMsg(room.lockMessage || "🔒 잠겨 있다.", "warn");
          return;
        }
        if (room.requirePuzzle && !puzzles[room.requirePuzzle]) {
          // 퍼즐 열기
          if (room.requirePuzzle === "cell_lock") {
            addMsg("🔐 문에 키패드가 있다. 비밀번호를 입력해야 한다.", "info");
            setActivePuzzle("keypad");
            setActivePuzzleId("cell_lock");
            return;
          }
          if (room.requirePuzzle === "vent_maze") {
            addMsg("🌀 환기구 안이 미로처럼 되어 있다...", "info");
            setActivePuzzle("maze");
            setActivePuzzleId("vent_maze");
            return;
          }
          return;
        }
        // 아이템으로 열기
        if (room.requireItem) {
          const item = inventory.find((i) => i.id === room.requireItem && !i.used);
          if (item) {
            setInventory((prev) =>
              prev.map((i) => (i.id === room.requireItem ? { ...i, used: true } : i))
            );
            addMsg(`🔓 ${item.emoji} ${item.name}(을)를 사용해서 문을 열었다!`, "success");
          }
        }
      }

      setCurrentRoom(targetId);
      setRoomsVisited((prev) => new Set([...prev, targetId]));
      addMsg(`🚶 ${room.emoji} ${room.name}(으)로 이동했다.`, "info");

      // 옥상 도착 = 엔딩
      if (targetId === "rooftop") {
        addMsg("🌃 밖이다! 자유의 공기가 느껴진다!", "success");
        setTimeout(() => {
          addMsg("🚁 헬리콥터가 다가오고 있다...", "story");
          setTimeout(() => setScreen("ending"), 2000);
        }, 1500);
      }
    },
    [inventory, puzzles, addMsg]
  );

  /* ────── 방 상호작용 ────── */
  const getInteractions = useCallback(() => {
    const room = currentRoom;
    const items: {
      label: string;
      emoji: string;
      action: () => void;
      condition?: boolean;
    }[] = [];

    switch (room) {
      case "cell":
        if (darkMode) {
          items.push({
            label: "벽을 더듬어 본다",
            emoji: "🤚",
            action: () => {
              addMsg("🤚 벽을 더듬다가... 스위치를 발견했다!", "info");
              setDarkMode(false);
              addMsg("💡 불이 켜졌다! 주변이 보이기 시작한다.", "success");
            },
          });
        }
        if (!darkMode && !discoveredItems.has("note")) {
          items.push({
            label: "침대 밑을 본다",
            emoji: "🛏️",
            action: () => {
              addMsg("🛏️ 침대 밑에서 구겨진 쪽지를 발견했다!", "success");
              addMsg('📝 "비밀번호는 내 생일... 0425"', "story");
              setDiscoveredItems((prev) => new Set([...prev, "note"]));
            },
          });
        }
        if (!darkMode && !discoveredItems.has("cell_pin")) {
          items.push({
            label: "세면대를 조사한다",
            emoji: "🚰",
            action: () => {
              addMsg("🚰 부서진 세면대 뒤에서 뾰족한 핀을 발견했다!", "success");
              setInventory((prev) => [
                ...prev,
                { id: "pin", name: "핀", emoji: "📌", desc: "뾰족한 핀. 자물쇠를 딸 수 있을지도?", used: false },
              ]);
              setDiscoveredItems((prev) => new Set([...prev, "cell_pin"]));
            },
          });
        }
        if (!darkMode && !puzzles["cell_lock"]) {
          items.push({
            label: "문 키패드에 비밀번호 입력",
            emoji: "🔐",
            action: () => {
              setActivePuzzle("keypad");
              setActivePuzzleId("cell_lock");
            },
          });
        }
        break;

      case "hallway":
        if (!discoveredItems.has("hallway_map")) {
          items.push({
            label: "벽에 붙은 안내도를 본다",
            emoji: "🗺️",
            action: () => {
              addMsg("🗺️ 시설 안내도를 발견했다! 사무실, 실험실, 창고, 통제실이 표시되어 있다.", "success");
              setDiscoveredItems((prev) => new Set([...prev, "hallway_map"]));
            },
          });
        }
        if (!discoveredItems.has("hallway_vent")) {
          items.push({
            label: "천장 환기구를 살펴본다",
            emoji: "🌀",
            action: () => {
              addMsg("🌀 환기구 커버가 느슨하다. 도구가 있으면 열 수 있을 것 같다.", "info");
              setDiscoveredItems((prev) => new Set([...prev, "hallway_vent"]));
            },
          });
        }
        break;

      case "office":
        if (!discoveredItems.has("office_computer")) {
          items.push({
            label: "컴퓨터를 조사한다",
            emoji: "💻",
            action: () => {
              addMsg('💻 컴퓨터 화면에 "통제실 비상 탈출: 빨강-파랑-초록-노랑 순서로 입력"이라고 적혀 있다.', "success");
              setDiscoveredItems((prev) => new Set([...prev, "office_computer"]));
            },
          });
        }
        if (!discoveredItems.has("office_safe") && !puzzles["safe"]) {
          items.push({
            label: "금고를 연다",
            emoji: "🔐",
            action: () => {
              addMsg("🔐 다이얼 금고다. 비밀번호를 맞춰야 한다...", "info");
              setActivePuzzle("slider");
              setActivePuzzleId("safe");
            },
          });
        }
        if (puzzles["safe"] && !discoveredItems.has("safe_card")) {
          items.push({
            label: "금고 안을 확인한다",
            emoji: "📦",
            action: () => {
              addMsg("💳 금고 안에서 출입 카드를 발견했다!", "success");
              setInventory((prev) => [
                ...prev,
                {
                  id: "access_card",
                  name: "출입 카드",
                  emoji: "💳",
                  desc: "통제실 출입용 카드",
                  used: false,
                },
              ]);
              setDiscoveredItems((prev) => new Set([...prev, "safe_card"]));
            },
          });
        }
        if (!discoveredItems.has("office_drawer")) {
          items.push({
            label: "서랍을 뒤진다",
            emoji: "🗄️",
            action: () => {
              addMsg("🗄️ 서랍에서 서류를 발견했다.", "info");
              addMsg('📄 "실험실 레이저 해제: 거울을 이용하여 광선을 반사시킬 것"', "story");
              setDiscoveredItems((prev) => new Set([...prev, "office_drawer"]));
            },
          });
        }
        break;

      case "lab":
        if (!discoveredItems.has("lab_beaker")) {
          items.push({
            label: "실험대를 조사한다",
            emoji: "🧪",
            action: () => {
              addMsg("🧪 시약과 비커가 있다. 특별한 용도는 없어 보인다.", "info");
              setDiscoveredItems((prev) => new Set([...prev, "lab_beaker"]));
            },
          });
        }
        if (!puzzles["laser"]) {
          items.push({
            label: "레이저 장치를 조작한다",
            emoji: "🔴",
            action: () => {
              addMsg("🔴 레이저가 문을 막고 있다. 거울을 배치해서 광선을 돌려야 한다!", "info");
              setActivePuzzle("laser");
              setActivePuzzleId("laser");
            },
          });
        }
        if (puzzles["laser"] && !discoveredItems.has("lab_key")) {
          items.push({
            label: "레이저 뒤 방을 확인한다",
            emoji: "🚪",
            action: () => {
              addMsg("🔑 숨겨진 보관함에서 창고 열쇠를 발견했다!", "success");
              setInventory((prev) => [
                ...prev,
                {
                  id: "storage_key",
                  name: "창고 열쇠",
                  emoji: "🔑",
                  desc: "창고 문을 여는 열쇠",
                  used: false,
                },
              ]);
              setDiscoveredItems((prev) => new Set([...prev, "lab_key"]));
            },
          });
        }
        if (!discoveredItems.has("lab_mirror")) {
          items.push({
            label: "선반을 뒤진다",
            emoji: "📚",
            action: () => {
              addMsg("🪞 선반 뒤에서 작은 거울을 발견했다!", "success");
              setInventory((prev) => [
                ...prev,
                { id: "mirror", name: "거울", emoji: "🪞", desc: "레이저를 반사할 수 있을 것 같다", used: false },
              ]);
              setDiscoveredItems((prev) => new Set([...prev, "lab_mirror"]));
            },
          });
        }
        break;

      case "storage":
        if (!discoveredItems.has("storage_tool")) {
          items.push({
            label: "상자 사이를 뒤진다",
            emoji: "📦",
            action: () => {
              addMsg("🔧 상자 뒤에서 드라이버를 발견했다!", "success");
              setInventory((prev) => [
                ...prev,
                {
                  id: "screwdriver",
                  name: "드라이버",
                  emoji: "🔧",
                  desc: "환기구 나사를 풀 수 있다",
                  used: false,
                },
              ]);
              setDiscoveredItems((prev) => new Set([...prev, "storage_tool"]));
            },
          });
        }
        if (!discoveredItems.has("storage_flashlight")) {
          items.push({
            label: "반짝이는 것을 확인한다",
            emoji: "✨",
            action: () => {
              addMsg("🔦 손전등을 발견했다!", "success");
              setInventory((prev) => [
                ...prev,
                { id: "flashlight", name: "손전등", emoji: "🔦", desc: "어두운 곳을 비출 수 있다", used: false },
              ]);
              setDiscoveredItems((prev) => new Set([...prev, "storage_flashlight"]));
            },
          });
        }
        if (inventory.find((i) => i.id === "screwdriver" && !i.used)) {
          items.push({
            label: "환기구 나사를 푼다",
            emoji: "🌀",
            action: () => {
              addMsg("🔧 드라이버로 환기구 커버를 열었다! 기어서 들어갈 수 있다.", "success");
              setInventory((prev) =>
                prev.map((i) => (i.id === "screwdriver" ? { ...i, used: true } : i))
              );
            },
          });
        }
        break;

      case "control":
        if (!puzzles["control_simon"]) {
          items.push({
            label: "비상탈출 시스템을 작동한다",
            emoji: "🎛️",
            action: () => {
              addMsg("🎛️ 비상탈출 시스템! 올바른 색 순서를 입력해야 한다.", "info");
              setActivePuzzle("simon");
              setActivePuzzleId("control_simon");
            },
          });
        }
        if (!discoveredItems.has("control_monitor")) {
          items.push({
            label: "CCTV 모니터를 본다",
            emoji: "📺",
            action: () => {
              addMsg("📺 CCTV에 각 방의 모습이 보인다. 옥상에 헬리콥터 착륙장이 있다!", "success");
              addMsg("📺 환기구를 통해 옥상으로 갈 수 있는 길이 보인다.", "info");
              setDiscoveredItems((prev) => new Set([...prev, "control_monitor"]));
            },
          });
        }
        if (puzzles["control_simon"] && !discoveredItems.has("control_unlocked")) {
          items.push({
            label: "탈출 경로를 확인한다",
            emoji: "🗺️",
            action: () => {
              addMsg("🗺️ 비상탈출 시스템 가동! 환기구→옥상 경로가 표시된다!", "success");
              addMsg("💡 창고의 환기구를 통해 옥상으로 갈 수 있다!", "info");
              setDiscoveredItems((prev) => new Set([...prev, "control_unlocked"]));
            },
          });
        }
        break;

      case "vent":
        if (!puzzles["vent_maze"]) {
          items.push({
            label: "미로를 통과한다",
            emoji: "🌀",
            action: () => {
              setActivePuzzle("maze");
              setActivePuzzleId("vent_maze");
            },
          });
        }
        break;

      case "rooftop":
        break;
    }

    return items;
  }, [currentRoom, darkMode, discoveredItems, puzzles, inventory, addMsg]);

  /* ────── 힌트 ────── */
  const getHint = () => {
    if (hintCount <= 0) {
      addMsg("💡 힌트를 다 사용했어요!", "warn");
      return;
    }
    setHintCount((h) => h - 1);
    let hint = "";
    if (currentRoom === "cell" && darkMode) hint = "벽을 더듬어서 스위치를 찾아보세요!";
    else if (currentRoom === "cell" && !puzzles["cell_lock"])
      hint = "침대 밑을 확인해 보세요. 비밀번호 단서가 있을지도...";
    else if (!discoveredItems.has("safe_card") && !puzzles["safe"])
      hint = "사무실 금고에 중요한 것이 있어요!";
    else if (!discoveredItems.has("lab_key"))
      hint = "실험실 레이저를 해제하면 뒤에 뭔가 있어요!";
    else if (!discoveredItems.has("storage_tool"))
      hint = "창고 상자 사이를 찾아보세요!";
    else if (!puzzles["control_simon"])
      hint = "통제실의 비상탈출 시스템을 작동시켜야 해요!";
    else hint = "환기구를 통해 옥상으로 탈출하세요!";
    addMsg(`💡 힌트: ${hint}`, "info");
    setShowHint(hint);
    setTimeout(() => setShowHint(""), 5000);
  };

  /* ────── 퍼즐 완료 ────── */
  const solvePuzzle = useCallback(
    (puzzleId: string) => {
      setPuzzles((prev) => ({ ...prev, [puzzleId]: true }));
      setActivePuzzle(null);
      setActivePuzzleId("");
      if (puzzleId === "cell_lock") {
        addMsg("🔓 문이 열렸다! 복도로 나갈 수 있다!", "success");
      } else if (puzzleId === "safe") {
        addMsg("🔓 금고가 열렸다!", "success");
      } else if (puzzleId === "laser") {
        addMsg("✅ 레이저가 꺼졌다! 뒤의 방으로 갈 수 있다!", "success");
      } else if (puzzleId === "control_simon") {
        addMsg("🎉 비상탈출 시스템이 가동됐다!", "success");
      } else if (puzzleId === "vent_maze") {
        addMsg("✅ 미로를 통과했다! 빛이 보인다!", "success");
      }
    },
    [addMsg]
  );

  const cancelPuzzle = () => {
    setActivePuzzle(null);
    setActivePuzzleId("");
  };

  const room = ROOMS.find((r) => r.id === currentRoom)!;
  const interactions = getInteractions();

  /* ═══════ 타이틀 ═══════ */
  if (screen === "title") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
        <Link
          href="/"
          className="absolute top-4 left-4 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2 text-sm z-10"
        >
          ← 홈으로
        </Link>

        {/* 배경 효과 */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-red-500/5 rounded-full animate-pulse"
              style={{
                width: 100 + Math.random() * 200,
                height: 100 + Math.random() * 200,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center">
          <div className="text-8xl mb-6 animate-bounce" style={{ animationDuration: "2s" }}>
            🏃
          </div>
          <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
            탈출하기
          </h1>
          <p className="text-gray-400 mb-2 text-lg">ESCAPE</p>
          <p className="text-gray-500 text-sm mb-8">
            감옥에서 깨어난 당신. 이곳에서 탈출할 수 있을까?
          </p>

          <button
            onClick={startGame}
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-xl px-12 py-4 rounded-2xl shadow-lg shadow-red-500/30 transition-all hover:scale-105 active:scale-95 mb-6"
          >
            탈출 시작 🔓
          </button>

          <div className="bg-white/5 rounded-2xl p-5 max-w-sm mx-auto text-sm text-gray-400 leading-relaxed">
            <p className="font-bold text-gray-300 mb-2">🎮 게임 방법</p>
            <p>
              • 방을 탐색하고 아이템을 모으세요
              <br />
              • 퍼즐을 풀어 잠긴 문을 열세요
              <br />
              • 옥상까지 도달하면 탈출 성공!
              <br />• 힌트는 3번 사용할 수 있어요
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════ 인트로 ═══════ */
  if (screen === "intro") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
        <div className="max-w-md text-center space-y-6 animate-fade-in">
          <IntroText
            lines={[
              "눈을 떴다.",
              "차가운 바닥... 어두운 방...",
              "여기가 어디지?",
              "기억이 나지 않는다.",
              "한 가지 확실한 건...",
              "여기서 나가야 한다는 것.",
            ]}
            onDone={startPlaying}
          />
        </div>
      </div>
    );
  }

  /* ═══════ 엔딩 ═══════ */
  if (screen === "ending") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-black flex flex-col items-center justify-center p-6 text-white">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-6">🚁</div>
          <h2 className="text-4xl font-black mb-3 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
            탈출 성공!
          </h2>
          <p className="text-gray-300 mb-6">
            헬리콥터가 도착했다. 드디어 자유다!
          </p>

          <div className="bg-white/10 rounded-2xl p-6 mb-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">탈출 시간</span>
              <span className="text-yellow-400 font-bold">⏱️ {formatTime(timer)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">방문한 방</span>
              <span className="text-cyan-400 font-bold">🚪 {roomsVisited.size}개</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">수집 아이템</span>
              <span className="text-green-400 font-bold">🎒 {inventory.length}개</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">사용한 힌트</span>
              <span className="text-orange-400 font-bold">💡 {3 - hintCount}개</span>
            </div>
            <div className="border-t border-white/10 pt-3">
              <span className="text-lg font-black text-yellow-400">
                ⭐ 등급:{" "}
                {timer < 180
                  ? "S"
                  : timer < 300
                  ? "A"
                  : timer < 600
                  ? "B"
                  : "C"}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setScreen("title");
                setGameStarted(false);
              }}
              className="flex-1 bg-white/10 hover:bg-white/20 rounded-xl py-3 font-bold transition-all"
            >
              🏠 처음으로
            </button>
            <button
              onClick={startPlaying}
              className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl py-3 font-bold transition-all"
            >
              🔄 다시 도전
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════ 게임 화면 ═══════ */
  return (
    <div className={`min-h-screen bg-gradient-to-b ${room.bgClass} text-white flex flex-col`}>
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/40 border-b border-white/10">
        <Link href="/" className="text-xs text-gray-400 hover:text-white">
          ← 홈
        </Link>
        <div className="flex gap-2 text-xs">
          <span className="bg-white/10 px-2 py-1 rounded-lg">⏱️ {formatTime(timer)}</span>
          <button
            onClick={() => setShowInventory(!showInventory)}
            className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg"
          >
            🎒 {inventory.filter((i) => !i.used).length}
          </button>
          <button
            onClick={getHint}
            className="bg-yellow-600/30 hover:bg-yellow-600/50 px-2 py-1 rounded-lg"
          >
            💡 {hintCount}
          </button>
        </div>
      </div>

      {/* 힌트 표시 */}
      {showHint && (
        <div className="mx-3 mt-2 bg-yellow-600/20 border border-yellow-500/30 rounded-xl px-4 py-2 text-sm text-yellow-300 animate-pulse">
          💡 {showHint}
        </div>
      )}

      {/* 인벤토리 드롭다운 */}
      {showInventory && (
        <div className="mx-3 mt-2 bg-black/60 backdrop-blur rounded-xl border border-white/10 p-3">
          <h4 className="text-sm font-bold mb-2">🎒 인벤토리</h4>
          {inventory.length === 0 ? (
            <p className="text-xs text-gray-500">아이템이 없습니다</p>
          ) : (
            <div className="space-y-1">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
                    item.used ? "bg-white/5 opacity-40 line-through" : "bg-white/10"
                  }`}
                >
                  <span className="text-lg">{item.emoji}</span>
                  <div>
                    <span className="font-bold">{item.name}</span>
                    <p className="text-gray-400 text-[10px]">{item.desc}</p>
                  </div>
                  {item.used && (
                    <span className="ml-auto text-[10px] text-gray-500">사용됨</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 방 정보 */}
      <div className="p-4 flex-1 flex flex-col max-w-lg mx-auto w-full">
        {/* 방 헤더 */}
        <div className="bg-black/30 rounded-2xl p-4 mb-3 border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{room.emoji}</span>
            <div>
              <h2 className="text-xl font-black">{room.name}</h2>
              <div className="flex gap-1">
                {ROOMS.filter((r) => roomsVisited.has(r.id)).map((r) => (
                  <span key={r.id} className="text-[10px] opacity-50">
                    {r.emoji}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">
            {darkMode && currentRoom === "cell" ? room.darkDesc : room.desc}
          </p>
        </div>

        {/* 상호작용 버튼 */}
        {interactions.length > 0 && (
          <div className="bg-black/20 rounded-2xl p-3 mb-3 border border-white/10">
            <h3 className="text-xs font-bold text-gray-400 mb-2">🔍 조사하기</h3>
            <div className="space-y-1.5">
              {interactions.map((item, i) => (
                <button
                  key={i}
                  onClick={item.action}
                  className="w-full flex items-center gap-2 bg-white/5 hover:bg-white/15 rounded-xl px-4 py-3 text-sm text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="text-xl">{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 이동 */}
        <div className="bg-black/20 rounded-2xl p-3 mb-3 border border-white/10">
          <h3 className="text-xs font-bold text-gray-400 mb-2">🚪 이동하기</h3>
          <div className="flex flex-wrap gap-1.5">
            {room.connections.map((connId) => {
              const connRoom = ROOMS.find((r) => r.id === connId)!;
              const isLocked =
                connRoom.locked &&
                ((connRoom.requireItem &&
                  !inventory.find((i) => i.id === connRoom.requireItem && !i.used)) ||
                  (connRoom.requirePuzzle && !puzzles[connRoom.requirePuzzle]));
              // 환기구 특별 체크 - 드라이버 사용 필요
              const needsScrewdriver =
                connId === "vent" &&
                !inventory.find((i) => i.id === "screwdriver" && i.used);

              return (
                <button
                  key={connId}
                  onClick={() => {
                    if (needsScrewdriver && currentRoom === "storage") {
                      addMsg("🔧 환기구 나사를 먼저 풀어야 한다!", "warn");
                      return;
                    }
                    moveToRoom(connId);
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm transition-all hover:scale-105 active:scale-95 ${
                    isLocked || (needsScrewdriver && currentRoom === "storage")
                      ? "bg-red-900/30 text-red-300 border border-red-500/20"
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  <span>{connRoom.emoji}</span>
                  <span>{connRoom.name}</span>
                  {(isLocked || (needsScrewdriver && currentRoom === "storage")) && (
                    <span className="text-xs">🔒</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 메시지 로그 */}
        <div className="flex-1 bg-black/40 rounded-2xl p-3 border border-white/10 min-h-[120px] max-h-[200px] overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-400 mb-2">📜 기록</h3>
          <div className="space-y-1">
            {messages.map((msg, i) => (
              <p
                key={i}
                className={`text-xs leading-relaxed ${
                  msg.type === "success"
                    ? "text-green-400"
                    : msg.type === "warn"
                    ? "text-red-400"
                    : msg.type === "story"
                    ? "text-yellow-300 italic"
                    : "text-gray-400"
                }`}
              >
                {msg.text}
              </p>
            ))}
            <div ref={msgEndRef} />
          </div>
        </div>

        {/* 진행도 */}
        <div className="mt-3 bg-black/30 rounded-xl p-2">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>탈출 진행도</span>
            <span>
              {Math.min(
                100,
                Math.floor(
                  ((Object.keys(puzzles).filter((k) => puzzles[k]).length * 20 +
                    roomsVisited.size * 5 +
                    inventory.length * 5) /
                    100) *
                    100
                )
              )}
              %
            </span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-green-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  (Object.keys(puzzles).filter((k) => puzzles[k]).length * 20 +
                    roomsVisited.size * 5 +
                    inventory.length * 5)
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ═══ 퍼즐 모달 ═══ */}
      {activePuzzle && (
        <PuzzleModal
          type={activePuzzle}
          puzzleId={activePuzzleId}
          onSolve={() => solvePuzzle(activePuzzleId)}
          onCancel={cancelPuzzle}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   인트로 텍스트 애니메이션
   ══════════════════════════════════════ */
function IntroText({
  lines,
  onDone,
}: {
  lines: string[];
  onDone: () => void;
}) {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines < lines.length) {
      const t = setTimeout(() => setVisibleLines((v) => v + 1), 1200);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(onDone, 1500);
      return () => clearTimeout(t);
    }
  }, [visibleLines, lines.length, onDone]);

  return (
    <div className="space-y-4">
      {lines.slice(0, visibleLines).map((line, i) => (
        <p
          key={i}
          className="text-lg text-gray-300 animate-fade-in"
          style={{ animationDelay: `${i * 0.2}s` }}
        >
          {line}
        </p>
      ))}
      {visibleLines >= lines.length && (
        <button
          onClick={onDone}
          className="mt-6 text-sm text-gray-500 hover:text-white transition-colors animate-pulse"
        >
          [ 계속하기 ]
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   퍼즐 모달
   ══════════════════════════════════════ */
function PuzzleModal({
  type,
  puzzleId,
  onSolve,
  onCancel,
}: {
  type: PuzzleType;
  puzzleId: string;
  onSolve: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-3xl border-2 border-slate-600 shadow-2xl p-5 max-w-[360px] w-full max-h-[90vh] overflow-y-auto">
        {type === "keypad" && <KeypadPuzzle onSolve={onSolve} />}
        {type === "slider" && <SliderPuzzle onSolve={onSolve} />}
        {type === "simon" && <SimonPuzzle onSolve={onSolve} />}
        {type === "maze" && <MazePuzzle onSolve={onSolve} />}
        {type === "laser" && <LaserPuzzle onSolve={onSolve} />}
        <button
          onClick={onCancel}
          className="mt-3 w-full bg-slate-700 hover:bg-slate-600 text-gray-300 text-sm py-2 rounded-xl"
        >
          ✕ 취소
        </button>
      </div>
    </div>
  );
}

/* ────── 키패드 퍼즐 ────── */
function KeypadPuzzle({ onSolve }: { onSolve: () => void }) {
  const [input, setInput] = useState("");
  const [wrong, setWrong] = useState(false);
  const code = "0425";

  const press = (n: string) => {
    if (input.length >= 4) return;
    const newInput = input + n;
    setInput(newInput);
    if (newInput.length === 4) {
      if (newInput === code) {
        setTimeout(onSolve, 400);
      } else {
        setWrong(true);
        setTimeout(() => {
          setWrong(false);
          setInput("");
        }, 800);
      }
    }
  };

  return (
    <div className="text-center">
      <h3 className="text-lg font-bold mb-2">🔐 키패드</h3>
      <p className="text-xs text-gray-400 mb-4">4자리 비밀번호를 입력하세요</p>

      {/* 디스플레이 */}
      <div
        className={`flex justify-center gap-3 mb-5 ${wrong ? "animate-shake" : ""}`}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-black ${
              wrong
                ? "border-red-500 bg-red-900/30 text-red-400"
                : input[i]
                ? "border-green-500 bg-green-900/30 text-green-400"
                : "border-slate-600 bg-slate-800"
            }`}
          >
            {input[i] ? "●" : ""}
          </div>
        ))}
      </div>

      {/* 키패드 */}
      <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map(
          (key) =>
            key === "" ? (
              <div key="empty" />
            ) : (
              <button
                key={key}
                onClick={() => {
                  if (key === "⌫") setInput((p) => p.slice(0, -1));
                  else press(key);
                }}
                className="h-14 rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-lg font-bold transition-all active:scale-90"
              >
                {key}
              </button>
            )
        )}
      </div>

      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20%,
          60% {
            transform: translateX(-8px);
          }
          40%,
          80% {
            transform: translateX(8px);
          }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}

/* ────── 슬라이더 퍼즐 (다이얼 금고) ────── */
function SliderPuzzle({ onSolve }: { onSolve: () => void }) {
  const [dials, setDials] = useState([0, 0, 0]);
  const target = [3, 7, 1];
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done && dials.every((d, i) => d === target[i])) {
      setDone(true);
      setTimeout(onSolve, 600);
    }
  }, [dials, done]);

  const rotateDial = (idx: number, dir: number) => {
    setDials((prev) => {
      const n = [...prev];
      n[idx] = (n[idx] + dir + 10) % 10;
      return n;
    });
  };

  return (
    <div className="text-center">
      <h3 className="text-lg font-bold mb-2">🔐 다이얼 금고</h3>
      <p className="text-xs text-gray-400 mb-1">
        다이얼을 맞추세요!
      </p>
      <p className="text-xs text-yellow-400 mb-4">
        힌트: 3-7-1
      </p>

      <div className="flex justify-center gap-4 mb-4">
        {dials.map((val, i) => (
          <div key={i} className="flex flex-col items-center">
            <button
              onClick={() => rotateDial(i, 1)}
              className="w-14 h-8 bg-slate-700 hover:bg-slate-600 rounded-t-xl flex items-center justify-center text-lg"
            >
              ▲
            </button>
            <div
              className={`w-14 h-16 flex items-center justify-center text-3xl font-black border-x-2 ${
                val === target[i]
                  ? "bg-green-900/40 text-green-400 border-green-500"
                  : "bg-slate-800 text-white border-slate-600"
              }`}
            >
              {val}
            </div>
            <button
              onClick={() => rotateDial(i, -1)}
              className="w-14 h-8 bg-slate-700 hover:bg-slate-600 rounded-b-xl flex items-center justify-center text-lg"
            >
              ▼
            </button>
          </div>
        ))}
      </div>

      {done && (
        <p className="text-green-400 font-bold animate-bounce">🔓 열렸다!</p>
      )}
    </div>
  );
}

/* ────── 사이먼 퍼즐 (색 순서) ────── */
function SimonPuzzle({ onSolve }: { onSolve: () => void }) {
  const sequence = ["red", "blue", "green", "yellow"];
  const [playerSeq, setPlayerSeq] = useState<string[]>([]);
  const [showingIdx, setShowingIdx] = useState(-1);
  const [phase, setPhase] = useState<"showing" | "input" | "wrong">("showing");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // 순서 보여주기
    sequence.forEach((_, i) => {
      setTimeout(() => setShowingIdx(i), (i + 1) * 700);
    });
    setTimeout(() => {
      setShowingIdx(-1);
      setPhase("input");
    }, (sequence.length + 1) * 700);
  }, []);

  const press = (color: string) => {
    if (phase !== "input" || done) return;
    const newSeq = [...playerSeq, color];

    if (sequence[newSeq.length - 1] !== color) {
      setPhase("wrong");
      setTimeout(() => {
        setPlayerSeq([]);
        setPhase("showing");
        setShowingIdx(-1);
        sequence.forEach((_, i) => {
          setTimeout(() => setShowingIdx(i), (i + 1) * 700);
        });
        setTimeout(() => {
          setShowingIdx(-1);
          setPhase("input");
        }, (sequence.length + 1) * 700);
      }, 800);
      return;
    }

    setPlayerSeq(newSeq);
    if (newSeq.length === sequence.length) {
      setDone(true);
      setTimeout(onSolve, 600);
    }
  };

  const colors: Record<string, { bg: string; active: string; label: string }> = {
    red: { bg: "bg-red-800", active: "bg-red-500 shadow-red-500/60 shadow-lg", label: "빨강" },
    blue: { bg: "bg-blue-800", active: "bg-blue-500 shadow-blue-500/60 shadow-lg", label: "파랑" },
    green: { bg: "bg-green-800", active: "bg-green-500 shadow-green-500/60 shadow-lg", label: "초록" },
    yellow: { bg: "bg-yellow-800", active: "bg-yellow-500 shadow-yellow-500/60 shadow-lg", label: "노랑" },
  };

  return (
    <div className="text-center">
      <h3 className="text-lg font-bold mb-2">🎛️ 비상탈출 시스템</h3>
      <p className="text-xs text-gray-400 mb-2">
        {phase === "showing"
          ? "패턴을 기억하세요!"
          : phase === "wrong"
          ? "❌ 틀렸어요! 다시..."
          : `순서대로 누르세요! (${playerSeq.length}/${sequence.length})`}
      </p>

      <div className="grid grid-cols-2 gap-3 max-w-[220px] mx-auto mt-4">
        {Object.entries(colors).map(([key, val]) => {
          const isShowing = phase === "showing" && showingIdx >= 0 && sequence[showingIdx] === key;
          return (
            <button
              key={key}
              onClick={() => press(key)}
              className={`h-20 rounded-2xl border-2 border-white/10 transition-all font-bold ${
                isShowing ? val.active + " scale-105" : val.bg + " hover:brightness-125"
              }`}
              disabled={phase !== "input"}
            >
              {val.label}
            </button>
          );
        })}
      </div>

      {done && (
        <p className="text-green-400 font-bold mt-4 animate-bounce">
          ✅ 시스템 가동!
        </p>
      )}
    </div>
  );
}

/* ────── 미로 퍼즐 ────── */
function MazePuzzle({ onSolve }: { onSolve: () => void }) {
  // 7x7 미로 (0=길, 1=벽, 2=시작, 3=끝)
  const maze = [
    [2, 0, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 1],
    [1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 0],
    [1, 1, 1, 0, 1, 1, 3],
  ];

  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [done, setDone] = useState(false);
  const [path, setPath] = useState<{ x: number; y: number }[]>([{ x: 0, y: 0 }]);

  const move = (dx: number, dy: number) => {
    if (done) return;
    const nx = pos.x + dx;
    const ny = pos.y + dy;
    if (nx < 0 || nx >= 7 || ny < 0 || ny >= 7) return;
    if (maze[ny][nx] === 1) return;
    setPos({ x: nx, y: ny });
    setPath((p) => [...p, { x: nx, y: ny }]);
    if (maze[ny][nx] === 3) {
      setDone(true);
      setTimeout(onSolve, 500);
    }
  };

  // 키보드 지원
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") move(0, -1);
      else if (e.key === "ArrowDown") move(0, 1);
      else if (e.key === "ArrowLeft") move(-1, 0);
      else if (e.key === "ArrowRight") move(1, 0);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return (
    <div className="text-center">
      <h3 className="text-lg font-bold mb-2">🌀 환기구 미로</h3>
      <p className="text-xs text-gray-400 mb-3">
        버튼이나 방향키로 출구를 찾으세요!
      </p>

      {/* 미로 */}
      <div className="inline-block bg-slate-800 rounded-xl p-2 mb-3 border border-slate-600">
        {maze.map((row, y) => (
          <div key={y} className="flex">
            {row.map((cell, x) => {
              const isPlayer = pos.x === x && pos.y === y;
              const isPath = path.some((p) => p.x === x && p.y === y);
              return (
                <div
                  key={x}
                  className={`w-9 h-9 flex items-center justify-center text-sm ${
                    cell === 1
                      ? "bg-slate-600"
                      : cell === 3
                      ? "bg-green-900/60"
                      : isPlayer
                      ? "bg-yellow-500/40"
                      : isPath
                      ? "bg-blue-900/30"
                      : "bg-slate-900"
                  } border border-slate-700/50`}
                >
                  {isPlayer
                    ? "😀"
                    : cell === 3
                    ? "🚪"
                    : cell === 2 && !isPlayer
                    ? "📍"
                    : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 방향 버튼 */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => move(0, -1)}
          className="w-14 h-10 bg-slate-700 hover:bg-slate-600 rounded-xl text-xl active:scale-90"
        >
          ↑
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => move(-1, 0)}
            className="w-14 h-10 bg-slate-700 hover:bg-slate-600 rounded-xl text-xl active:scale-90"
          >
            ←
          </button>
          <button
            onClick={() => move(0, 1)}
            className="w-14 h-10 bg-slate-700 hover:bg-slate-600 rounded-xl text-xl active:scale-90"
          >
            ↓
          </button>
          <button
            onClick={() => move(1, 0)}
            className="w-14 h-10 bg-slate-700 hover:bg-slate-600 rounded-xl text-xl active:scale-90"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────── 레이저 퍼즐 ────── */
function LaserPuzzle({ onSolve }: { onSolve: () => void }) {
  // 5x5 그리드, 거울을 배치해서 레이저를 꺾기
  // 레이저: 왼쪽 중앙 → 오른쪽 하단 수신기
  const [mirrors, setMirrors] = useState<Record<string, "/" | "\\" | null>>({});
  const [done, setDone] = useState(false);

  // 미리 정답 거울 위치 (간단한 퍼즐)
  // 레이저: (0,2)에서 오른쪽으로 시작 → (2,2)에서 \로 아래로 → (2,4)에서 /로 오른쪽으로 → (4,4)에 도착
  const receiverPos = { x: 4, y: 4 };
  const emitterPos = { x: -1, y: 2 }; // 왼쪽 밖

  // 레이저 경로 계산
  const calcLaser = useCallback(() => {
    const path: { x: number; y: number }[] = [];
    let x = 0;
    let y = 2;
    let dx = 1;
    let dy = 0;

    for (let step = 0; step < 30; step++) {
      if (x < 0 || x >= 5 || y < 0 || y >= 5) break;
      path.push({ x, y });

      const key = `${x},${y}`;
      const m = mirrors[key];

      if (m === "/") {
        // / 거울: 오른쪽→위, 아래→왼쪽, 왼쪽→아래, 위→오른쪽
        [dx, dy] = [-dy, -dx];
      } else if (m === "\\") {
        // \ 거울: 오른쪽→아래, 위→왼쪽, 왼쪽→위, 아래→오른쪽
        [dx, dy] = [dy, dx];
      }

      x += dx;
      y += dy;
    }

    return path;
  }, [mirrors]);

  const laserPath = calcLaser();
  const hitsReceiver = laserPath.some(
    (p) => p.x === receiverPos.x && p.y === receiverPos.y
  );

  useEffect(() => {
    if (!done && hitsReceiver) {
      setDone(true);
      setTimeout(onSolve, 600);
    }
  }, [hitsReceiver, done, onSolve]);

  const toggleMirror = (x: number, y: number) => {
    if (done) return;
    const key = `${x},${y}`;
    const current = mirrors[key];
    let next: "/" | "\\" | null;
    if (!current) next = "/";
    else if (current === "/") next = "\\";
    else next = null;
    setMirrors((prev) => ({ ...prev, [key]: next }));
  };

  return (
    <div className="text-center">
      <h3 className="text-lg font-bold mb-2">🔴 레이저 퍼즐</h3>
      <p className="text-xs text-gray-400 mb-1">
        칸을 클릭해서 거울을 배치하세요!
      </p>
      <p className="text-xs text-gray-500 mb-3">
        클릭: 없음 → / → \ → 없음
      </p>

      <div className="inline-block bg-slate-800 rounded-xl p-2 border border-slate-600">
        {/* 발사기 표시 */}
        <div className="flex items-center gap-1 mb-1">
          <div className="w-8 text-right text-red-400 text-xs">🔴→</div>
          <div className="w-[225px]" />
        </div>

        {Array.from({ length: 5 }).map((_, y) => (
          <div key={y} className="flex items-center gap-1">
            <div className="w-8 text-right text-[10px] text-gray-500">
              {y === 2 ? "→" : ""}
            </div>
            {Array.from({ length: 5 }).map((_, x) => {
              const key = `${x},${y}`;
              const m = mirrors[key];
              const isOnPath = laserPath.some(
                (p) => p.x === x && p.y === y
              );
              const isReceiver =
                x === receiverPos.x && y === receiverPos.y;

              return (
                <button
                  key={x}
                  onClick={() => !isReceiver && toggleMirror(x, y)}
                  className={`w-[43px] h-[43px] rounded-lg border flex items-center justify-center text-lg transition-all ${
                    isReceiver
                      ? hitsReceiver
                        ? "bg-green-600 border-green-400"
                        : "bg-slate-700 border-orange-400"
                      : isOnPath
                      ? "bg-red-900/40 border-red-500/40"
                      : "bg-slate-900 border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  {isReceiver ? (
                    hitsReceiver ? (
                      "✅"
                    ) : (
                      "🎯"
                    )
                  ) : m === "/" ? (
                    <span className="text-2xl text-cyan-400 font-bold">╱</span>
                  ) : m === "\\" ? (
                    <span className="text-2xl text-cyan-400 font-bold">╲</span>
                  ) : isOnPath ? (
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  ) : (
                    ""
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {done && (
        <p className="text-green-400 font-bold mt-3 animate-bounce">
          ✅ 레이저 해제!
        </p>
      )}
    </div>
  );
}
