"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import MissionModal from "./missions";

/* ───── 크루원 ───── */
interface Crewmate {
  id: number;
  name: string;
  color: string;
  colorName: string;
  isImpostor: boolean;
  isAlive: boolean;
  isEjected: boolean;
  role: "crew" | "impostor";
  personality: string;     // AI 성격
  suspicion: number;       // 의심도 (0~100)
  tasksDone: number;
  location: string;
  lastSeen: string;
  alibi: string;
  voteTarget: number | null;
}

const COLORS = [
  { color: "#ef4444", name: "빨강" }, { color: "#3b82f6", name: "파랑" },
  { color: "#22c55e", name: "초록" }, { color: "#fbbf24", name: "노랑" },
  { color: "#ec4899", name: "분홍" }, { color: "#f97316", name: "주황" },
  { color: "#8b5cf6", name: "보라" }, { color: "#06b6d4", name: "청록" },
  { color: "#6b7280", name: "회색" }, { color: "#92400e", name: "갈색" },
  { color: "#000000", name: "검정" }, { color: "#ffffff", name: "하양" },
];

const NAMES = ["민수", "영희", "철수", "지은", "서연", "동현", "수아", "준호", "하은", "태민", "소희", "강산"];

const PERSONALITIES = ["수상한", "조용한", "수다쟁이", "의심많은", "순진한", "똑똑한", "겁많은", "용감한", "느긋한", "급한"];

/* ───── 장소 ───── */
interface Location {
  id: string;
  name: string;
  emoji: string;
  tasks: string[];
  connectedTo: string[];
}

const LOCATIONS: Location[] = [
  { id: "cafeteria", name: "식당", emoji: "🍽️", tasks: ["쓰레기 버리기", "음식 준비"], connectedTo: ["medbay", "admin", "weapons", "hallway_upper"] },
  { id: "medbay", name: "의무실", emoji: "🏥", tasks: ["검체 분석", "건강 검진"], connectedTo: ["cafeteria", "hallway_upper"] },
  { id: "admin", name: "관리실", emoji: "🖥️", tasks: ["카드 긁기", "ID 확인"], connectedTo: ["cafeteria", "storage"] },
  { id: "storage", name: "창고", emoji: "📦", tasks: ["연료 넣기", "짐 옮기기"], connectedTo: ["admin", "electrical", "comms"] },
  { id: "electrical", name: "전기실", emoji: "⚡", tasks: ["배선 수리", "전력 복구"], connectedTo: ["storage", "hallway_lower"] },
  { id: "hallway_upper", name: "위쪽 복도", emoji: "🚪", tasks: [], connectedTo: ["cafeteria", "medbay", "reactor", "security"] },
  { id: "hallway_lower", name: "아래쪽 복도", emoji: "🚪", tasks: [], connectedTo: ["electrical", "comms", "shields", "navigation"] },
  { id: "reactor", name: "원자로", emoji: "☢️", tasks: ["원자로 가동", "매니폴드 열기"], connectedTo: ["hallway_upper", "security"] },
  { id: "security", name: "보안실", emoji: "📹", tasks: ["CCTV 확인"], connectedTo: ["hallway_upper", "reactor"] },
  { id: "comms", name: "통신실", emoji: "📡", tasks: ["통신 복구", "신호 조정"], connectedTo: ["storage", "hallway_lower"] },
  { id: "shields", name: "방패실", emoji: "🛡️", tasks: ["방패 활성화"], connectedTo: ["hallway_lower", "navigation"] },
  { id: "navigation", name: "조종실", emoji: "🧭", tasks: ["항로 설정", "방향 조정"], connectedTo: ["hallway_lower", "shields"] },
];

/* ───── 맵 ───── */
interface MapConfig {
  id: string;
  name: string;
  emoji: string;
  crewCount: number;
  impostorCount: number;
  taskCount: number;
  difficulty: number;
}

const MAPS: MapConfig[] = [
  { id: "skeld", name: "더 스켈드", emoji: "🚀", crewCount: 8, impostorCount: 1, taskCount: 5, difficulty: 1 },
  { id: "polus", name: "폴루스", emoji: "🏔️", crewCount: 10, impostorCount: 1, taskCount: 6, difficulty: 2 },
  { id: "airship", name: "에어쉽", emoji: "🛩️", crewCount: 10, impostorCount: 2, taskCount: 7, difficulty: 3 },
];

/* ───── 게임 로그 ───── */
interface GameLog {
  text: string;
  type: "info" | "kill" | "task" | "vote" | "emergency" | "impostor";
}

type Phase = "lobby" | "tasks" | "report" | "discuss" | "vote" | "eject" | "result";
type Screen = "main" | "mapselect" | "play";

/* ───── 크루원 SVG ───── */
function CrewmateAvatar({ color, size = 40, dead = false, ejected = false }: { color: string; size?: number; dead?: boolean; ejected?: boolean }) {
  const s = size;
  const isWhite = color === "#ffffff";
  const stroke = isWhite ? "#ccc" : "none";
  return (
    <svg width={s} height={s} viewBox="0 0 50 50" style={{ opacity: dead || ejected ? 0.4 : 1, filter: dead ? "grayscale(1)" : "" }}>
      {/* 몸통 */}
      <rect x={10} y={18} width={30} height={25} rx={10} fill={color} stroke={stroke} strokeWidth={1} />
      {/* 배낭 */}
      <rect x={5} y={22} width={8} height={15} rx={4} fill={color} stroke={stroke} strokeWidth={1} opacity={0.8} />
      {/* 헬멧 */}
      <ellipse cx={25} cy={18} rx={14} ry={14} fill={color} stroke={stroke} strokeWidth={1} />
      {/* 유리창 */}
      <ellipse cx={28} cy={16} rx={8} ry={9} fill="#bfdbfe" opacity={0.9} />
      <ellipse cx={30} cy={14} rx={3} ry={4} fill="#fff" opacity={0.4} />
      {/* 다리 */}
      <rect x={13} y={40} width={10} height={8} rx={4} fill={color} stroke={stroke} strokeWidth={1} />
      <rect x={27} y={40} width={10} height={8} rx={4} fill={color} stroke={stroke} strokeWidth={1} />
      {/* 죽었으면 X 표시 */}
      {dead && !ejected && (<>
        <line x1={15} y1={15} x2={35} y2={35} stroke="#dc2626" strokeWidth={4} />
        <line x1={35} y1={15} x2={15} y2={35} stroke="#dc2626" strokeWidth={4} />
      </>)}
      {/* 뼈 */}
      {dead && !ejected && <text x={25} y={50} textAnchor="middle" fontSize={12}>💀</text>}
    </svg>
  );
}

export default function AmongUsPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  // 게임 상태
  const [phase, setPhase] = useState<Phase>("lobby");
  const [selectedMap, setSelectedMap] = useState<MapConfig>(MAPS[0]);
  const [crew, setCrew] = useState<Crewmate[]>([]);
  const [playerColor, setPlayerColor] = useState(COLORS[0]);
  const [playerName, setPlayerName] = useState("나");
  const [playerLocation, setPlayerLocation] = useState("cafeteria");
  const [playerTasks, setPlayerTasks] = useState<{ location: string; task: string; done: boolean }[]>([]);
  const [tasksDoneCount, setTasksDoneCount] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [round, setRound] = useState(1);
  const [gameLog, setGameLog] = useState<GameLog[]>([]);
  const [gameActive, setGameActive] = useState(false);
  const [isImpostor, setIsImpostor] = useState(false);
  const [killCooldown, setKillCooldown] = useState(0);
  const [sabotageActive, setSabotageActive] = useState(false);

  // 미션 모달
  const [missionOpen, setMissionOpen] = useState(false);
  const [missionTaskIdx, setMissionTaskIdx] = useState<number | null>(null);
  const [missionTaskName, setMissionTaskName] = useState("");

  // 토론/투표
  const [discussionMessages, setDiscussionMessages] = useState<{ name: string; color: string; text: string }[]>([]);
  const [votedFor, setVotedFor] = useState<number | null>(null);
  const [voteResults, setVoteResults] = useState<Record<number, number>>({});
  const [ejectedId, setEjectedId] = useState<number | null>(null);
  const [discussTimer, setDiscussTimer] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 킬쿨 틱
  useEffect(() => {
    if (gameActive && phase === "tasks" && killCooldown > 0) {
      const t = setTimeout(() => setKillCooldown(c => Math.max(0, c - 1)), 1000);
      return () => clearTimeout(t);
    }
  }, [gameActive, phase, killCooldown]);

  // 토론 타이머
  useEffect(() => {
    if (phase === "discuss" && discussTimer > 0) {
      timerRef.current = setTimeout(() => setDiscussTimer(t => t - 1), 1000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    } else if (phase === "discuss" && discussTimer <= 0) {
      startVote();
    }
  }, [phase, discussTimer]);

  // 승리 체크
  useEffect(() => {
    if (!gameActive || phase !== "tasks") return;
    const alive = crew.filter(c => c.isAlive);
    const impostorsAlive = alive.filter(c => c.isImpostor);
    const crewAlive = alive.filter(c => !c.isImpostor);

    // 임포스터 승리: 크루 수 == 임포스터 수
    if (crewAlive.length <= impostorsAlive.length) {
      endGame(isImpostor);
    }
    // 크루 승리: 임포스터 모두 추방
    if (impostorsAlive.length === 0) {
      endGame(!isImpostor);
    }
  }, [crew, phase, gameActive]);

  // 태스크 완료 승리
  useEffect(() => {
    if (gameActive && !isImpostor && tasksDoneCount >= totalTasks && totalTasks > 0) {
      endGame(true);
    }
  }, [tasksDoneCount, totalTasks, gameActive, isImpostor]);

  const startGame = useCallback(() => {
    const map = selectedMap;
    const shuffledColors = [...COLORS].sort(() => Math.random() - 0.5);
    const shuffledNames = [...NAMES].sort(() => Math.random() - 0.5);

    // 임포스터 결정
    const playerIsImpostor = Math.random() < 0.25;
    setIsImpostor(playerIsImpostor);

    // 크루 생성
    const crewmates: Crewmate[] = [];
    const impostorIndices: number[] = [];

    // 임포스터 인덱스 결정 (플레이어 제외)
    while (impostorIndices.length < map.impostorCount - (playerIsImpostor ? 1 : 0)) {
      const idx = Math.floor(Math.random() * (map.crewCount - 1));
      if (!impostorIndices.includes(idx)) impostorIndices.push(idx);
    }

    for (let i = 0; i < map.crewCount - 1; i++) {
      const isImp = impostorIndices.includes(i);
      const locs = LOCATIONS.map(l => l.id);
      crewmates.push({
        id: i + 1,
        name: shuffledNames[i % shuffledNames.length],
        color: shuffledColors[(i + 1) % shuffledColors.length].color,
        colorName: shuffledColors[(i + 1) % shuffledColors.length].name,
        isImpostor: isImp,
        isAlive: true, isEjected: false,
        role: isImp ? "impostor" : "crew",
        personality: PERSONALITIES[i % PERSONALITIES.length],
        suspicion: isImp ? 30 + Math.random() * 30 : Math.random() * 20,
        tasksDone: 0,
        location: locs[Math.floor(Math.random() * locs.length)],
        lastSeen: "식당",
        alibi: "",
        voteTarget: null,
      });
    }

    setCrew(crewmates);
    setPlayerLocation("cafeteria");
    setRound(1);
    setKillCooldown(10);
    setSabotageActive(false);

    // 태스크 생성
    const tasks: { location: string; task: string; done: boolean }[] = [];
    const taskLocations = LOCATIONS.filter(l => l.tasks.length > 0).sort(() => Math.random() - 0.5);
    for (let i = 0; i < map.taskCount; i++) {
      const loc = taskLocations[i % taskLocations.length];
      const task = loc.tasks[Math.floor(Math.random() * loc.tasks.length)];
      tasks.push({ location: loc.id, task, done: false });
    }
    setPlayerTasks(tasks);
    setTasksDoneCount(0);
    setTotalTasks(map.taskCount * map.crewCount);

    setGameLog([{
      text: playerIsImpostor ? "🔪 당신은 임포스터입니다! 크루원을 처치하세요!" : "👤 당신은 크루원입니다! 태스크를 완료하세요!",
      type: playerIsImpostor ? "impostor" : "info"
    }]);
    setGameActive(true);
    setPhase("tasks");
    setScreen("play");
  }, [selectedMap]);

  const endGame = useCallback((won: boolean) => {
    setGameActive(false);
    if (won) setWins(w => w + 1); else setLosses(l => l + 1);
    setCoins(c => c + (won ? 30 : 10));
    setPhase("result");
  }, []);

  // 이동
  const moveTo = useCallback((locId: string) => {
    if (phase !== "tasks") return;
    const currentLoc = LOCATIONS.find(l => l.id === playerLocation);
    if (!currentLoc?.connectedTo.includes(locId)) return;
    setPlayerLocation(locId);

    // AI 이동
    setCrew(prev => prev.map(c => {
      if (!c.isAlive) return c;
      const cLoc = LOCATIONS.find(l => l.id === c.location);
      if (cLoc && Math.random() < 0.4) {
        const newLoc = cLoc.connectedTo[Math.floor(Math.random() * cLoc.connectedTo.length)];
        return { ...c, location: newLoc, lastSeen: LOCATIONS.find(l => l.id === c.location)?.name || "" };
      }
      return c;
    }));

    // AI 임포스터 킬 (자동)
    setCrew(prev => {
      const updated = [...prev];
      const imps = updated.filter(c => c.isImpostor && c.isAlive);
      for (const imp of imps) {
        const sameLocCrew = updated.filter(c => c.location === imp.location && !c.isImpostor && c.isAlive && c.id !== 0);
        const alone = updated.filter(c => c.location === imp.location && c.isAlive).length <= 2;
        if (sameLocCrew.length > 0 && alone && Math.random() < 0.1) {
          const victim = sameLocCrew[Math.floor(Math.random() * sameLocCrew.length)];
          const idx = updated.findIndex(c => c.id === victim.id);
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], isAlive: false };
            setGameLog(prev => [...prev, { text: `💀 ${victim.name}(${victim.colorName})이(가) 살해당했다...`, type: "kill" }]);
          }
        }
      }
      return updated;
    });

    setKillCooldown(c => Math.max(0, c - 1));
  }, [phase, playerLocation]);

  // 태스크 수행 — 미션 모달 열기
  const doTask = useCallback((taskIdx: number) => {
    if (isImpostor) return;
    const task = playerTasks[taskIdx];
    if (!task || task.done) return;
    setMissionTaskIdx(taskIdx);
    setMissionTaskName(task.task);
    setMissionOpen(true);
  }, [isImpostor, playerTasks]);

  // 미션 완료 콜백
  const handleMissionComplete = useCallback(() => {
    if (missionTaskIdx === null) return;
    setPlayerTasks(prev => prev.map((t, i) => i === missionTaskIdx ? { ...t, done: true } : t));
    setTasksDoneCount(c => c + 1);
    setGameLog(prev => [...prev, { text: `✅ 태스크 완료!`, type: "task" }]);
    setMissionOpen(false);
    setMissionTaskIdx(null);
  }, [missionTaskIdx]);

  const handleMissionCancel = useCallback(() => {
    setMissionOpen(false);
    setMissionTaskIdx(null);
  }, []);

  // 킬
  const killCrewmate = useCallback((targetId: number) => {
    if (!isImpostor || killCooldown > 0 || phase !== "tasks") return;
    const target = crew.find(c => c.id === targetId);
    if (!target || !target.isAlive || target.location !== playerLocation) return;

    setCrew(prev => prev.map(c => c.id === targetId ? { ...c, isAlive: false } : c));
    setKillCooldown(15);
    setGameLog(prev => [...prev, { text: `🔪 ${target.name}(${target.colorName})을(를) 처치했다!`, type: "kill" }]);
  }, [isImpostor, killCooldown, crew, playerLocation, phase]);

  // 시체 발견 / 긴급 회의
  const callMeeting = useCallback((type: "body" | "emergency") => {
    if (phase !== "tasks") return;
    setPhase("discuss");
    setDiscussTimer(20);
    setVotedFor(null);
    setVoteResults({});
    setEjectedId(null);

    const msg = type === "body" ? "💀 시체가 발견됐다!!" : "🚨 긴급 회의!!";
    setGameLog(prev => [...prev, { text: msg, type: "emergency" }]);

    // AI 토론 생성
    const alive = crew.filter(c => c.isAlive);
    const msgs: { name: string; color: string; text: string }[] = [
      { name: "시스템", color: "#666", text: msg },
    ];

    alive.forEach(c => {
      let text = "";
      if (c.isImpostor) {
        // 임포스터는 다른 사람을 의심
        const target = alive.filter(a => !a.isImpostor && a.id !== c.id)[Math.floor(Math.random() * (alive.length - 2))];
        const lines = [
          `${target?.name || "누군가"}이(가) 수상해요!`,
          `저는 ${LOCATIONS.find(l => l.id === c.location)?.name}에 있었어요`,
          `${target?.name || "아무개"}을(를) 못 봤는데...`,
          `저는 태스크 하고 있었어요!`,
        ];
        text = lines[Math.floor(Math.random() * lines.length)];
      } else {
        const lines = [
          `저는 ${LOCATIONS.find(l => l.id === c.location)?.name}에서 태스크 했어요`,
          `누가 수상하지?`,
          `아무도 못 봤어요...`,
          `${c.lastSeen}에서 누가 이상하게 움직였어요`,
          `저 아니에요! 태스크 하는 거 봤잖아요!`,
        ];
        text = lines[Math.floor(Math.random() * lines.length)];
      }
      msgs.push({ name: `${c.name}(${c.colorName})`, color: c.color, text });
    });

    setDiscussionMessages(msgs);
  }, [crew, phase]);

  // 투표 시작
  const startVote = () => {
    setPhase("vote");

    // AI 투표
    const alive = crew.filter(c => c.isAlive);
    const results: Record<number, number> = {};

    alive.forEach(c => {
      let target: number;
      if (c.isImpostor) {
        // 임포스터: 랜덤 크루원에게 투표
        const crewTargets = alive.filter(a => !a.isImpostor);
        target = crewTargets.length > 0 ? crewTargets[Math.floor(Math.random() * crewTargets.length)].id : -1;
      } else {
        // 크루: 의심도 높은 사람에게 투표 (약간 랜덤)
        const sorted = [...alive].sort((a, b) => b.suspicion - a.suspicion);
        target = Math.random() < 0.3 ? sorted[0].id : alive[Math.floor(Math.random() * alive.length)].id;
      }
      results[target] = (results[target] || 0) + 1;
    });

    setVoteResults(results);
  };

  // 플레이어 투표
  const castVote = useCallback((targetId: number) => {
    if (votedFor !== null) return;
    setVotedFor(targetId);

    const newResults = { ...voteResults };
    newResults[targetId] = (newResults[targetId] || 0) + 1;
    setVoteResults(newResults);

    // 결과 처리
    setTimeout(() => {
      const maxVotes = Math.max(...Object.values(newResults), 0);
      const topVoted = Object.entries(newResults).filter(([, v]) => v === maxVotes).map(([k]) => Number(k));

      if (topVoted.length === 1 && topVoted[0] !== -1) {
        const ejected = topVoted[0];
        setEjectedId(ejected);

        // 추방
        setCrew(prev => prev.map(c => c.id === ejected ? { ...c, isAlive: false, isEjected: true } : c));
        const ejectedCrew = crew.find(c => c.id === ejected);
        const wasImpostor = ejectedCrew?.isImpostor;

        setGameLog(prev => [...prev, {
          text: `🚀 ${ejectedCrew?.name}(${ejectedCrew?.colorName})이(가) 추방됐다! ${wasImpostor ? "임포스터였다!!" : "크루원이었다..."}`,
          type: "vote"
        }]);
        setPhase("eject");

        // 잠시 후 다시 태스크로
        setTimeout(() => {
          setRound(r => r + 1);
          setPhase("tasks");
        }, 3000);
      } else {
        setGameLog(prev => [...prev, { text: "⚖️ 투표가 무효됐다! 아무도 추방되지 않았다.", type: "vote" }]);
        setPhase("eject");
        setTimeout(() => { setRound(r => r + 1); setPhase("tasks"); }, 2000);
      }
    }, 1500);
  }, [votedFor, voteResults, crew]);

  // 사보타주
  const doSabotage = useCallback(() => {
    if (!isImpostor || sabotageActive) return;
    setSabotageActive(true);
    setGameLog(prev => [...prev, { text: "⚠️ 사보타주! 전력이 나갔다!!", type: "impostor" }]);
    setTimeout(() => setSabotageActive(false), 10000);
  }, [isImpostor, sabotageActive]);

  const currentLoc = LOCATIONS.find(l => l.id === playerLocation);
  const crewHere = crew.filter(c => c.isAlive && c.location === playerLocation);
  const deadHere = crew.filter(c => !c.isAlive && !c.isEjected && c.location === playerLocation);
  const availableTasks = playerTasks.filter(t => t.location === playerLocation && !t.done);

  /* ───── 메인 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-indigo-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-indigo-300 text-sm mb-4 inline-block">← 홈으로</Link>
          <div className="text-center mb-6">
            <div className="flex justify-center"><CrewmateAvatar color="#ef4444" size={70} /></div>
            <h1 className="text-3xl font-black mt-2">어몽어스</h1>
            <p className="text-indigo-300 text-sm">임포스터를 찾아라! 또는... 임포스터가 돼라!</p>
          </div>

          <div className="bg-indigo-900/40 rounded-xl p-3 mb-4 text-center text-sm">
            <span className="text-green-400 mr-3">🏆 승리 {wins}</span>
            <span className="text-red-400">💀 패배 {losses}</span>
          </div>

          {/* 색 선택 */}
          <div className="bg-black/30 rounded-xl p-3 mb-4">
            <div className="text-xs font-bold text-center mb-2">내 색 선택:</div>
            <div className="flex gap-1 flex-wrap justify-center">
              {COLORS.map(c => (
                <button key={c.name} onClick={() => setPlayerColor(c)}
                  className={`w-8 h-8 rounded-full border-2 ${playerColor.name === c.name ? "border-yellow-400 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c.color }} />
              ))}
            </div>
            <div className="text-center mt-2">
              <CrewmateAvatar color={playerColor.color} size={45} />
              <div className="text-xs text-gray-400 mt-1">{playerColor.name}</div>
            </div>
          </div>

          <button onClick={() => setScreen("mapselect")}
            className="w-full bg-red-600 hover:bg-red-500 rounded-xl p-4 text-center text-lg font-black">
            🚀 게임 시작!
          </button>
        </div>
      </div>
    );
  }

  /* ───── 맵 선택 ───── */
  if (screen === "mapselect") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-gray-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-4">🗺️ 맵 선택</h2>
          <div className="space-y-3">
            {MAPS.map(m => (
              <button key={m.id} onClick={() => { setSelectedMap(m); startGame(); }}
                className="w-full bg-black/30 hover:bg-black/50 rounded-xl p-4 text-left flex items-center gap-3">
                <span className="text-4xl">{m.emoji}</span>
                <div className="flex-1">
                  <div className="font-bold text-lg">{m.name}</div>
                  <div className="text-xs text-gray-400">👥 {m.crewCount}명 | 🔪 임포스터 {m.impostorCount}명 | 📋 태스크 {m.taskCount}개</div>
                  <div className="text-xs text-gray-500">{"⭐".repeat(m.difficulty)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 게임 플레이 ───── */
  if (screen === "play") {

    /* ── 결과 ── */
    if (phase === "result") {
      const won = (isImpostor && crew.filter(c => c.isAlive && !c.isImpostor).length <= crew.filter(c => c.isAlive && c.isImpostor).length) ||
                  (!isImpostor && crew.filter(c => c.isAlive && c.isImpostor).length === 0) ||
                  (!isImpostor && tasksDoneCount >= totalTasks);
      return (
        <div className={`min-h-screen ${won ? "bg-gradient-to-b from-green-800 to-black" : "bg-gradient-to-b from-red-900 to-black"} text-white p-4 flex items-center justify-center`}>
          <div className="max-w-md mx-auto text-center">
            <div className="text-7xl mb-4">{won ? "🎉" : "💀"}</div>
            <h2 className="text-3xl font-black mb-2">{won ? (isImpostor ? "임포스터 승리!" : "크루원 승리!") : (isImpostor ? "임포스터 패배..." : "크루원 패배...")}</h2>
            <div className="text-lg mb-4">{isImpostor ? "🔪 당신은 임포스터였습니다" : "👤 당신은 크루원이었습니다"}</div>

            {/* 전체 역할 공개 */}
            <div className="bg-black/40 rounded-xl p-3 mb-4">
              <div className="text-sm font-bold mb-2">역할 공개:</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {crew.map(c => (
                  <div key={c.id} className="text-center">
                    <CrewmateAvatar color={c.color} size={30} dead={!c.isAlive} ejected={c.isEjected} />
                    <div className="text-[8px]">{c.name}</div>
                    <div className={`text-[8px] font-bold ${c.isImpostor ? "text-red-400" : "text-green-400"}`}>
                      {c.isImpostor ? "🔪" : "👤"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setScreen("main")} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">🏠 메인</button>
              <button onClick={() => { setScreen("main"); setTimeout(startGame, 100); }} className="flex-1 bg-red-600 hover:bg-red-500 rounded-xl p-3 font-bold">🔄 다시</button>
            </div>
          </div>
        </div>
      );
    }

    /* ── 추방 장면 ── */
    if (phase === "eject") {
      const ejected = crew.find(c => c.id === ejectedId);
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            {ejected && <CrewmateAvatar color={ejected.color} size={80} ejected />}
            <div className="text-xl font-black mt-4">
              {ejected ? `${ejected.name}(${ejected.colorName})이(가) 추방됐다.` : "아무도 추방되지 않았다."}
            </div>
            {ejected && (
              <div className={`text-lg mt-2 ${ejected.isImpostor ? "text-green-400" : "text-red-400"}`}>
                {ejected.isImpostor ? "✅ 임포스터였다!" : "❌ 크루원이었다..."}
              </div>
            )}
            <div className="text-sm text-gray-500 mt-4 animate-pulse">잠시 후 게임이 계속됩니다...</div>
          </div>
        </div>
      );
    }

    /* ── 토론 / 투표 ── */
    if (phase === "discuss" || phase === "vote") {
      const alive = crew.filter(c => c.isAlive);
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-950 text-white p-3">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-2">
              <h2 className="text-lg font-black">{phase === "discuss" ? `🗣️ 토론 중... (${discussTimer}초)` : "🗳️ 투표하세요!"}</h2>
            </div>

            {/* 채팅 */}
            <div className="bg-black/60 rounded-xl p-2 mb-3 max-h-40 overflow-y-auto">
              {discussionMessages.map((msg, i) => (
                <div key={i} className="text-xs mb-1">
                  <span className="font-bold" style={{ color: msg.color === "#666" ? "#999" : msg.color }}>{msg.name}:</span>
                  <span className="text-gray-300 ml-1">{msg.text}</span>
                </div>
              ))}
            </div>

            {/* 투표 */}
            {phase === "vote" && (
              <div className="space-y-1.5">
                <div className="text-xs text-center text-gray-400 mb-1">{votedFor !== null ? "투표 완료!" : "누구를 추방할까요?"}</div>
                {alive.map(c => (
                  <button key={c.id} onClick={() => castVote(c.id)} disabled={votedFor !== null}
                    className={`w-full flex items-center gap-2 p-2 rounded-xl ${votedFor === c.id ? "bg-red-800 ring-1 ring-red-400" : "bg-black/30 hover:bg-black/50"}`}>
                    <CrewmateAvatar color={c.color} size={30} />
                    <span className="font-bold text-sm">{c.name} ({c.colorName})</span>
                    {votedFor !== null && <span className="ml-auto text-xs text-gray-400">{voteResults[c.id] || 0}표</span>}
                  </button>
                ))}
                <button onClick={() => castVote(-1)} disabled={votedFor !== null}
                  className="w-full bg-gray-800 hover:bg-gray-700 rounded-xl p-2 text-sm text-center text-gray-400">
                  ⏭️ 건너뛰기
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    /* ── 태스크 페이즈 (메인 게임) ── */
    return (
      <div className={`min-h-screen ${sabotageActive ? "bg-gradient-to-b from-red-950 to-black" : "bg-gradient-to-b from-gray-900 to-black"} text-white p-3`}>
        <div className="max-w-md mx-auto">
          {/* 역할 표시 */}
          <div className={`text-center text-xs font-bold mb-1 px-2 py-0.5 rounded-full inline-block ${isImpostor ? "bg-red-600" : "bg-green-700"}`}>
            {isImpostor ? "🔪 임포스터" : "👤 크루원"} | 라운드 {round}
          </div>

          {sabotageActive && <div className="text-center text-red-400 text-xs font-bold mb-1 animate-pulse">⚠️ 사보타주 발생!!</div>}

          {/* 현재 위치 */}
          <div className="bg-black/40 rounded-xl p-3 mb-2">
            <div className="text-sm font-bold mb-1">{currentLoc?.emoji} {currentLoc?.name}</div>

            {/* 이 방에 있는 크루원 */}
            <div className="flex gap-1 flex-wrap mb-2">
              <div className="text-center"><CrewmateAvatar color={playerColor.color} size={30} /><div className="text-[8px]">나</div></div>
              {crewHere.map(c => (
                <div key={c.id} className="text-center">
                  <CrewmateAvatar color={c.color} size={30} />
                  <div className="text-[8px]">{c.colorName}</div>
                </div>
              ))}
            </div>

            {/* 시체 발견 */}
            {deadHere.length > 0 && (
              <div className="bg-red-900/60 rounded-lg p-2 mb-2">
                <div className="text-xs text-red-300 mb-1">💀 시체 발견!</div>
                {deadHere.map(c => (
                  <div key={c.id} className="flex items-center gap-1">
                    <CrewmateAvatar color={c.color} size={20} dead />
                    <span className="text-xs">{c.name}({c.colorName})</span>
                  </div>
                ))}
                <button onClick={() => callMeeting("body")}
                  className="mt-1 bg-red-600 hover:bg-red-500 rounded-lg px-3 py-1 text-xs font-bold w-full">
                  📢 시체 리포트!
                </button>
              </div>
            )}

            {/* 태스크 (크루원) */}
            {!isImpostor && availableTasks.length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-bold text-green-400 mb-1">📋 이 방의 태스크:</div>
                {availableTasks.map((t, i) => {
                  const idx = playerTasks.indexOf(t);
                  return (
                    <button key={i} onClick={() => doTask(idx)}
                      className="w-full bg-green-900/40 hover:bg-green-800/40 rounded-lg p-1.5 text-xs text-left mb-1">
                      ✅ {t.task}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 킬 (임포스터) */}
            {isImpostor && crewHere.filter(c => !c.isImpostor).length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-bold text-red-400 mb-1">🔪 처치 가능: {killCooldown > 0 && `(${killCooldown}초 쿨다운)`}</div>
                {crewHere.filter(c => !c.isImpostor).map(c => (
                  <button key={c.id} onClick={() => killCrewmate(c.id)} disabled={killCooldown > 0}
                    className={`w-full rounded-lg p-1.5 text-xs text-left mb-1 flex items-center gap-1 ${killCooldown > 0 ? "bg-gray-800 opacity-50" : "bg-red-900/40 hover:bg-red-800/40"}`}>
                    <CrewmateAvatar color={c.color} size={18} />
                    <span>🔪 {c.name}({c.colorName}) 처치</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 이동 */}
          <div className="bg-black/30 rounded-xl p-2 mb-2">
            <div className="text-xs font-bold mb-1">🚪 이동:</div>
            <div className="flex gap-1 flex-wrap">
              {currentLoc?.connectedTo.map(locId => {
                const loc = LOCATIONS.find(l => l.id === locId);
                const crewCount = crew.filter(c => c.isAlive && c.location === locId).length;
                return (
                  <button key={locId} onClick={() => moveTo(locId)}
                    className="bg-gray-800 hover:bg-gray-700 rounded-lg px-2 py-1.5 text-xs">
                    {loc?.emoji} {loc?.name} {crewCount > 0 && <span className="text-yellow-400">({crewCount})</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 mb-2">
            <button onClick={() => callMeeting("emergency")}
              className="flex-1 bg-yellow-700 hover:bg-yellow-600 rounded-xl p-2 text-xs font-bold">🚨 긴급 회의</button>
            {isImpostor && (
              <button onClick={doSabotage} disabled={sabotageActive}
                className={`flex-1 rounded-xl p-2 text-xs font-bold ${sabotageActive ? "bg-gray-700 opacity-50" : "bg-red-700 hover:bg-red-600"}`}>
                ⚠️ 사보타주
              </button>
            )}
          </div>

          {/* 태스크 목록 */}
          {!isImpostor && (
            <div className="bg-black/30 rounded-xl p-2 mb-2">
              <div className="text-xs font-bold mb-1">📋 내 태스크 ({playerTasks.filter(t => t.done).length}/{playerTasks.length})</div>
              {playerTasks.map((t, i) => {
                const loc = LOCATIONS.find(l => l.id === t.location);
                return (
                  <div key={i} className={`text-[10px] ${t.done ? "text-green-400 line-through" : "text-gray-400"}`}>
                    {t.done ? "✅" : "⬜"} {loc?.emoji} {loc?.name}: {t.task}
                  </div>
                );
              })}
            </div>
          )}

          {/* 로그 */}
          <div className="bg-black/60 rounded-xl p-2 max-h-20 overflow-y-auto">
            {gameLog.slice(-5).map((log, i) => (
              <div key={i} className={`text-[9px] ${log.type === "kill" ? "text-red-400" : log.type === "impostor" ? "text-red-300" : log.type === "task" ? "text-green-400" : "text-gray-400"}`}>
                {log.text}
              </div>
            ))}
          </div>

          {/* 생존자 미니맵 */}
          <div className="bg-black/30 rounded-xl p-2 mt-2">
            <div className="text-[9px] text-gray-500 text-center mb-1">생존자</div>
            <div className="flex gap-1 flex-wrap justify-center">
              {crew.map(c => (
                <div key={c.id} className="text-center">
                  <CrewmateAvatar color={c.color} size={18} dead={!c.isAlive} ejected={c.isEjected} />
                </div>
              ))}
            </div>
          </div>

          {/* 미션 모달 */}
          {missionOpen && (
            <MissionModal
              taskName={missionTaskName}
              onComplete={handleMissionComplete}
              onCancel={handleMissionCancel}
            />
          )}
        </div>
      </div>
    );
  }

  return null;
}
