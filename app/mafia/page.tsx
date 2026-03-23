"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

// --- Types ---
type Role = "mafia" | "citizen" | "police" | "doctor";
type Phase = "lobby" | "roleReveal" | "night" | "nightResult" | "day" | "voting" | "voteResult" | "win" | "lose";

interface Player {
  id: number;
  name: string;
  emoji: string;
  role: Role;
  alive: boolean;
  isPlayer: boolean;
  personality: string;
  suspicion: Record<number, number>; // id -> suspicion level
}

interface ChatMessage {
  speakerId: number;
  text: string;
  isSystem: boolean;
}

interface NightAction {
  actorId: number;
  role: Role;
  targetId: number;
}

// --- Constants ---
const ROLE_INFO: Record<Role, { name: string; emoji: string; color: string; team: "mafia" | "citizen"; desc: string }> = {
  mafia: { name: "마피아", emoji: "🔪", color: "text-red-400", team: "mafia", desc: "밤에 시민을 제거합니다" },
  citizen: { name: "시민", emoji: "👤", color: "text-blue-400", team: "citizen", desc: "투표로 마피아를 찾아내세요" },
  police: { name: "경찰", emoji: "🔍", color: "text-yellow-400", team: "citizen", desc: "밤에 한 명을 조사합니다" },
  doctor: { name: "의사", emoji: "💊", color: "text-green-400", team: "citizen", desc: "밤에 한 명을 치료합니다" },
};

const NPC_DATA: { name: string; emoji: string; personality: string }[] = [
  { name: "민수", emoji: "👦", personality: "활발하고 적극적으로 의견을 말한다" },
  { name: "지은", emoji: "👧", personality: "조용하지만 날카로운 관찰력" },
  { name: "서준", emoji: "🧑", personality: "유머러스하고 남을 잘 의심한다" },
  { name: "하윤", emoji: "👩", personality: "논리적이고 증거를 중시한다" },
  { name: "도현", emoji: "👨", personality: "감정적이고 직감으로 판단한다" },
  { name: "수아", emoji: "🧒", personality: "신중하고 다수 의견을 따른다" },
];

// Role distribution: 2 mafia, 1 police, 1 doctor, 3 citizen = 7
const ROLE_POOL: Role[] = ["mafia", "mafia", "police", "doctor", "citizen", "citizen", "citizen"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateDiscussion(player: Player, allPlayers: Player[], dayNum: number, lastKilled: Player | null, lastVoted: Player | null, knownMafia: number[]): string {
  const alive = allPlayers.filter((p) => p.alive && p.id !== player.id);
  const isMafia = player.role === "mafia";

  // Mafia tries to deflect
  if (isMafia) {
    const innocentTargets = alive.filter((p) => p.role !== "mafia");
    const target = innocentTargets[Math.floor(Math.random() * innocentTargets.length)];
    const deflects = [
      `${target?.name}님이 좀 의심스러워요... 표정이 이상했어요.`,
      `저는 확실히 시민이에요! 다들 저를 믿어주세요.`,
      `어젯밤에 ${target?.name}님이 수상한 행동을 한 것 같아요.`,
      `저는 아무것도 모르겠어요... 근데 ${target?.name}님은 좀 조용하지 않나요?`,
      `${lastKilled ? `${lastKilled.name}님이 죽다니... ${target?.name}님이 제일 의심돼요.` : "다들 조심해야 해요."}`,
    ];
    return deflects[Math.floor(Math.random() * deflects.length)];
  }

  // Police who knows mafia
  if (player.role === "police" && knownMafia.length > 0) {
    const known = allPlayers.find((p) => p.id === knownMafia[knownMafia.length - 1] && p.alive);
    if (known && Math.random() < 0.7) {
      return `제가 확인해봤는데... ${known.name}님이 정말 의심스러워요! 강력하게 추천합니다.`;
    }
  }

  // Regular citizen/doctor discussion
  const highest = Object.entries(player.suspicion)
    .filter(([id]) => allPlayers.find((p) => p.id === Number(id))?.alive)
    .sort((a, b) => b[1] - a[1])[0];

  if (highest && highest[1] > 2) {
    const suspect = allPlayers.find((p) => p.id === Number(highest[0]));
    const reasons = [
      `${suspect?.name}님이 계속 눈치를 보는 것 같아요.`,
      `${suspect?.name}님의 말이 자꾸 바뀌는 것 같아요... 의심스러워요.`,
      `저는 ${suspect?.name}님이 마피아라고 생각해요!`,
      `${suspect?.name}님, 왜 그렇게 조용하세요? 마피아 아니에요?`,
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  const generals = [
    "아직 잘 모르겠어요... 좀 더 지켜봐야 할 것 같아요.",
    "다들 의심스럽지만, 확신은 없어요.",
    `${lastKilled ? `${lastKilled.name}님이 죽은 게 너무 안타깝네요...` : "조심합시다!"}`,
    "마피아가 누구일까... 단서가 부족해요.",
    "모두 솔직하게 말해주세요!",
  ];
  return generals[Math.floor(Math.random() * generals.length)];
}

function aiVote(player: Player, allPlayers: Player[], knownMafia: number[]): number {
  const alive = allPlayers.filter((p) => p.alive && p.id !== player.id);
  if (alive.length === 0) return -1;

  // Mafia votes for non-mafia
  if (player.role === "mafia") {
    const targets = alive.filter((p) => p.role !== "mafia");
    if (targets.length > 0) return targets[Math.floor(Math.random() * targets.length)].id;
  }

  // Police votes for known mafia
  if (player.role === "police" && knownMafia.length > 0) {
    const knownAlive = knownMafia.filter((id) => allPlayers.find((p) => p.id === id)?.alive);
    if (knownAlive.length > 0) return knownAlive[Math.floor(Math.random() * knownAlive.length)];
  }

  // Vote based on suspicion
  const highest = Object.entries(player.suspicion)
    .filter(([id]) => {
      const p = allPlayers.find((pp) => pp.id === Number(id));
      return p && p.alive && p.id !== player.id;
    })
    .sort((a, b) => b[1] - a[1]);

  if (highest.length > 0 && highest[0][1] > 1) {
    return Number(highest[0][0]);
  }

  return alive[Math.floor(Math.random() * alive.length)].id;
}

export default function MafiaPage() {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [players, setPlayers] = useState<Player[]>([]);
  const [dayNum, setDayNum] = useState(0);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [nightActions, setNightActions] = useState<NightAction[]>([]);
  const [lastKilled, setLastKilled] = useState<Player | null>(null);
  const [lastSaved, setLastSaved] = useState<Player | null>(null);
  const [lastVoted, setLastVoted] = useState<Player | null>(null);
  const [voteResults, setVoteResults] = useState<Record<number, number[]>>({});
  const [knownMafia, setKnownMafia] = useState<number[]>([]);
  const [policeResult, setPoliceResult] = useState<string | null>(null);
  const [revealAnim, setRevealAnim] = useState(false);
  const [wins, setWins] = useState(0);
  const [games, setGames] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);

  const myPlayer = players.find((p) => p.isPlayer);
  const alivePlayers = players.filter((p) => p.alive);
  const aliveMafia = alivePlayers.filter((p) => p.role === "mafia");
  const aliveCitizens = alivePlayers.filter((p) => ROLE_INFO[p.role].team === "citizen");

  // Auto scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chat]);

  // Load stats
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mafia_stats");
      if (raw) { const s = JSON.parse(raw); setWins(s.wins || 0); setGames(s.games || 0); }
    } catch { /* ignore */ }
  }, []);

  const saveStats = (w: number, g: number) => {
    localStorage.setItem("mafia_stats", JSON.stringify({ wins: w, games: g }));
  };

  const startGame = useCallback(() => {
    const roles = shuffle(ROLE_POOL);
    const newPlayers: Player[] = [
      { id: 0, name: "나", emoji: "🙂", role: roles[0], alive: true, isPlayer: true, personality: "", suspicion: {} },
      ...NPC_DATA.map((npc, i) => ({
        id: i + 1,
        name: npc.name,
        emoji: npc.emoji,
        role: roles[i + 1],
        alive: true,
        isPlayer: false,
        personality: npc.personality,
        suspicion: {} as Record<number, number>,
      })),
    ];

    // Initialize random suspicion
    for (const p of newPlayers) {
      if (!p.isPlayer) {
        for (const other of newPlayers) {
          if (other.id !== p.id) {
            p.suspicion[other.id] = Math.floor(Math.random() * 2);
          }
        }
      }
    }

    setPlayers(newPlayers);
    setDayNum(0);
    setChat([]);
    setLastKilled(null);
    setLastSaved(null);
    setLastVoted(null);
    setKnownMafia([]);
    setPoliceResult(null);
    setSelectedTarget(null);
    setRevealAnim(true);
    setPhase("roleReveal");
    setTimeout(() => setRevealAnim(false), 1500);
  }, []);

  const startNight = () => {
    setDayNum((p) => p + 1);
    setPhase("night");
    setSelectedTarget(null);
    setPoliceResult(null);
    setNightActions([]);
    setChat((p) => [...p, { speakerId: -1, text: `🌙 ${dayNum + 1}번째 밤이 찾아왔습니다...`, isSystem: true }]);
  };

  const submitNightAction = () => {
    if (selectedTarget === null || !myPlayer?.alive) return;

    const actions: NightAction[] = [];

    // Player action
    if (myPlayer.role !== "citizen") {
      actions.push({ actorId: 0, role: myPlayer.role, targetId: selectedTarget });
    }

    // AI actions
    const aliveAI = players.filter((p) => !p.isPlayer && p.alive);
    for (const ai of aliveAI) {
      if (ai.role === "mafia") {
        const targets = players.filter((p) => p.alive && ROLE_INFO[p.role].team === "citizen");
        if (targets.length > 0) {
          // Mafia targets someone (coordinate: pick same target)
          const t = targets[Math.floor(Math.random() * targets.length)];
          actions.push({ actorId: ai.id, role: "mafia", targetId: t.id });
        }
      } else if (ai.role === "police") {
        const targets = players.filter((p) => p.alive && p.id !== ai.id);
        if (targets.length > 0) {
          const t = targets[Math.floor(Math.random() * targets.length)];
          actions.push({ actorId: ai.id, role: "police", targetId: t.id });
        }
      } else if (ai.role === "doctor") {
        const targets = players.filter((p) => p.alive);
        if (targets.length > 0) {
          const t = targets[Math.floor(Math.random() * targets.length)];
          actions.push({ actorId: ai.id, role: "doctor", targetId: t.id });
        }
      }
    }

    setNightActions(actions);

    // Resolve night
    const mafiaKills = actions.filter((a) => a.role === "mafia");
    const doctorSaves = actions.filter((a) => a.role === "doctor");
    const policeChecks = actions.filter((a) => a.role === "police");

    // Determine who mafia kills (majority vote among mafia)
    const killVotes: Record<number, number> = {};
    for (const k of mafiaKills) {
      killVotes[k.targetId] = (killVotes[k.targetId] || 0) + 1;
    }
    const killTarget = Object.entries(killVotes).sort((a, b) => b[1] - a[1])[0];
    const killId = killTarget ? Number(killTarget[0]) : -1;

    // Doctor save
    const saveIds = doctorSaves.map((s) => s.targetId);
    const saved = saveIds.includes(killId);

    const killed = killId >= 0 && !saved ? players.find((p) => p.id === killId) || null : null;
    const savedPerson = saved ? players.find((p) => p.id === killId) || null : null;

    // Police investigation
    for (const check of policeChecks) {
      const target = players.find((p) => p.id === check.targetId);
      if (target) {
        const ai = players.find((p) => p.id === check.actorId);
        if (ai && target.role === "mafia") {
          // AI police learns mafia
          setKnownMafia((p) => [...p, target.id]);
          ai.suspicion[target.id] = 10;
        }
        // If player is police
        if (check.actorId === 0) {
          if (target.role === "mafia") {
            setPoliceResult(`🔍 ${target.name}님은 마피아입니다! 🔪`);
            setKnownMafia((p) => [...p, target.id]);
          } else {
            setPoliceResult(`🔍 ${target.name}님은 마피아가 아닙니다. ✅`);
          }
        }
      }
    }

    // Apply kill
    if (killed) {
      setPlayers((prev) => prev.map((p) => p.id === killed.id ? { ...p, alive: false } : p));
      setLastKilled(killed);
      setLastSaved(null);

      // Increase suspicion on active/quiet players
      setPlayers((prev) => prev.map((p) => {
        if (!p.isPlayer && p.alive && p.role !== "mafia") {
          const newSusp = { ...p.suspicion };
          // Random suspicion increase
          const alivePeople = prev.filter((pp) => pp.alive && pp.id !== p.id && pp.id !== killed.id);
          if (alivePeople.length > 0) {
            const suspect = alivePeople[Math.floor(Math.random() * alivePeople.length)];
            newSusp[suspect.id] = (newSusp[suspect.id] || 0) + 1;
          }
          return { ...p, suspicion: newSusp };
        }
        return p.id === killed.id ? { ...p, alive: false } : p;
      }));
    } else {
      setLastKilled(null);
      setLastSaved(savedPerson);
    }

    setTimeout(() => setPhase("nightResult"), 1500);
  };

  const startDay = () => {
    setPhase("day");
    setChat((prev) => {
      const msgs = [...prev];
      if (lastKilled) {
        msgs.push({ speakerId: -1, text: `☀️ 아침이 밝았습니다. ${lastKilled.emoji} ${lastKilled.name}님이 사망했습니다... (${ROLE_INFO[lastKilled.role].emoji} ${ROLE_INFO[lastKilled.role].name})`, isSystem: true });
      } else if (lastSaved) {
        msgs.push({ speakerId: -1, text: `☀️ 아침이 밝았습니다. 어젯밤 아무도 죽지 않았습니다! 의사가 살렸나봐요! 💊`, isSystem: true });
      } else {
        msgs.push({ speakerId: -1, text: `☀️ 아침이 밝았습니다. 어젯밤은 평화로웠습니다.`, isSystem: true });
      }
      return msgs;
    });

    // Check win condition
    const currentAlive = players.filter((p) => p.alive && (lastKilled ? p.id !== lastKilled.id : true));
    const mafiaAlive = currentAlive.filter((p) => p.role === "mafia");
    const citizenAlive = currentAlive.filter((p) => ROLE_INFO[p.role].team === "citizen");

    if (mafiaAlive.length === 0) {
      const newGames = games + 1;
      const playerWin = myPlayer && ROLE_INFO[myPlayer.role].team === "citizen";
      const newWins = playerWin ? wins + 1 : wins;
      setWins(newWins); setGames(newGames); saveStats(newWins, newGames);
      setPhase(playerWin ? "win" : "lose");
      return;
    }
    if (mafiaAlive.length >= citizenAlive.length) {
      const newGames = games + 1;
      const playerWin = myPlayer && myPlayer.role === "mafia";
      const newWins = playerWin ? wins + 1 : wins;
      setWins(newWins); setGames(newGames); saveStats(newWins, newGames);
      setPhase(playerWin ? "win" : "lose");
      return;
    }

    // AI discussion
    const alive = players.filter((p) => p.alive && !p.isPlayer && (lastKilled ? p.id !== lastKilled.id : true));
    let delay = 500;
    for (const ai of alive) {
      setTimeout(() => {
        const msg = generateDiscussion(ai, players, dayNum, lastKilled, lastVoted, knownMafia);
        setChat((prev) => [...prev, { speakerId: ai.id, text: msg, isSystem: false }]);
      }, delay);
      delay += 800 + Math.random() * 600;
    }
  };

  const startVoting = () => {
    setPhase("voting");
    setSelectedTarget(null);
    setChat((prev) => [...prev, { speakerId: -1, text: "🗳️ 투표를 시작합니다! 누구를 처형할까요?", isSystem: true }]);
  };

  const submitVote = () => {
    if (selectedTarget === null) return;

    const votes: Record<number, number[]> = {};

    // Player vote
    votes[selectedTarget] = [0];

    // AI votes
    const aliveAI = players.filter((p) => !p.isPlayer && p.alive);
    for (const ai of aliveAI) {
      const target = aiVote(ai, players, knownMafia);
      if (target >= 0) {
        if (!votes[target]) votes[target] = [];
        votes[target].push(ai.id);
      }
    }

    setVoteResults(votes);

    // Find most voted
    const sorted = Object.entries(votes).sort((a, b) => b[1].length - a[1].length);
    const topVoteCount = sorted[0][1].length;
    const topCandidates = sorted.filter((s) => s[1].length === topVoteCount);

    let eliminated: Player | null = null;
    if (topCandidates.length === 1) {
      const eid = Number(topCandidates[0][0]);
      eliminated = players.find((p) => p.id === eid) || null;
    }
    // Tie = no elimination

    if (eliminated) {
      setPlayers((prev) => prev.map((p) => p.id === eliminated!.id ? { ...p, alive: false } : p));
      setLastVoted(eliminated);

      // Update suspicion: if someone voted for an innocent, increase suspicion on the voters
      if (ROLE_INFO[eliminated.role].team === "citizen") {
        setPlayers((prev) => prev.map((p) => {
          if (!p.isPlayer && p.alive) {
            const newSusp = { ...p.suspicion };
            const votersForEliminated = votes[eliminated!.id] || [];
            for (const vid of votersForEliminated) {
              if (vid !== p.id) newSusp[vid] = (newSusp[vid] || 0) + 1;
            }
            return { ...p, suspicion: newSusp };
          }
          return p;
        }));
      }
    } else {
      setLastVoted(null);
    }

    setChat((prev) => [
      ...prev,
      {
        speakerId: -1,
        text: eliminated
          ? `🗳️ 투표 결과: ${eliminated.emoji} ${eliminated.name}님이 처형되었습니다. (${ROLE_INFO[eliminated.role].emoji} ${ROLE_INFO[eliminated.role].name})`
          : "🗳️ 투표가 동률이라 아무도 처형되지 않았습니다.",
        isSystem: true,
      },
    ]);

    setPhase("voteResult");

    // Check win after vote
    setTimeout(() => {
      const postPlayers = eliminated
        ? players.map((p) => p.id === eliminated.id ? { ...p, alive: false } : p)
        : players;
      const postAlive = postPlayers.filter((p) => p.alive);
      const postMafia = postAlive.filter((p) => p.role === "mafia");
      const postCitizen = postAlive.filter((p) => ROLE_INFO[p.role].team === "citizen");

      if (postMafia.length === 0) {
        const newGames = games + 1;
        const playerWin = myPlayer && ROLE_INFO[myPlayer.role].team === "citizen";
        const newWins = playerWin ? wins + 1 : wins;
        setWins(newWins); setGames(newGames); saveStats(newWins, newGames);
        setTimeout(() => setPhase(playerWin ? "win" : "lose"), 2000);
      } else if (postMafia.length >= postCitizen.length) {
        const newGames = games + 1;
        const playerWin = myPlayer && myPlayer.role === "mafia";
        const newWins = playerWin ? wins + 1 : wins;
        setWins(newWins); setGames(newGames); saveStats(newWins, newGames);
        setTimeout(() => setPhase(playerWin ? "win" : "lose"), 2000);
      }
    }, 100);
  };

  const proceedAfterVote = () => {
    // Check if game already ended
    if (phase === "win" || phase === "lose") return;
    startNight();
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-gray-950 to-slate-950 text-white">
      {/* Header */}
      <header className="fixed top-0 z-40 w-full border-b border-gray-800 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-300 transition-colors hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            🏠 소개페이지
          </Link>
          <span className="text-lg font-bold">
            <span className="bg-gradient-to-r from-red-400 to-rose-300 bg-clip-text text-transparent">마피아</span>
            <span className="ml-1">🔪</span>
          </span>
          <span className="text-xs text-gray-400">{wins}승 / {games}판</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pt-24 pb-8">
        {/* === LOBBY === */}
        {phase === "lobby" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 w-full max-w-md">
            <span className="text-8xl">🔪</span>
            <h1 className="text-4xl font-black">마피아 게임</h1>
            <p className="text-center text-gray-400">AI NPC 6명과 함께하는 마피아 게임!</p>

            <div className="w-full rounded-2xl bg-slate-900 p-4 text-sm text-gray-300">
              <p className="mb-2 font-bold text-white">규칙</p>
              <p>🔪 마피아 2명 / 👤 시민 3명 / 🔍 경찰 1명 / 💊 의사 1명</p>
              <p className="mt-1">🌙 밤: 각 역할 행동 → ☀️ 낮: 토론 + 투표</p>
              <p className="mt-1">시민팀: 마피아 전원 제거 시 승리</p>
              <p className="mt-1">마피아팀: 시민 수 이하로 줄이면 승리</p>
            </div>

            <div className="grid grid-cols-4 gap-2 w-full">
              {Object.entries(ROLE_INFO).map(([key, info]) => (
                <div key={key} className="rounded-xl bg-slate-800/60 p-3 text-center">
                  <span className="text-2xl">{info.emoji}</span>
                  <p className={`mt-1 text-xs font-bold ${info.color}`}>{info.name}</p>
                </div>
              ))}
            </div>

            <button onClick={startGame} className="w-full rounded-full bg-gradient-to-r from-red-500 to-rose-500 py-4 text-lg font-black shadow-lg transition-transform hover:scale-105 active:scale-95">
              게임 시작! 🎮
            </button>
            <Link href="/" className="block w-full rounded-full border-2 border-gray-600 bg-slate-800/80 py-3 text-center text-sm font-bold text-gray-300 transition-transform hover:scale-105 active:scale-95">
              🏠 소개페이지로
            </Link>
          </div>
        )}

        {/* === ROLE REVEAL === */}
        {phase === "roleReveal" && myPlayer && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 w-full max-w-md">
            <div className={`rounded-3xl border-2 p-8 text-center transition-all ${revealAnim ? "scale-110 border-yellow-400" : "scale-100 border-gray-700"}`} style={{ animation: revealAnim ? "pulse 0.5s" : "none" }}>
              <span className="text-7xl">{ROLE_INFO[myPlayer.role].emoji}</span>
              <h2 className={`mt-4 text-3xl font-black ${ROLE_INFO[myPlayer.role].color}`}>
                {ROLE_INFO[myPlayer.role].name}
              </h2>
              <p className="mt-2 text-gray-400">{ROLE_INFO[myPlayer.role].desc}</p>
              {myPlayer.role === "mafia" && (
                <div className="mt-4 rounded-xl bg-red-900/30 p-3">
                  <p className="text-xs text-red-300">동료 마피아:</p>
                  {players.filter((p) => p.role === "mafia" && !p.isPlayer).map((p) => (
                    <p key={p.id} className="text-sm font-bold text-red-400">{p.emoji} {p.name}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 w-full">
              {players.filter((p) => !p.isPlayer).map((p) => (
                <div key={p.id} className="rounded-xl bg-slate-800/60 p-2 text-center">
                  <span className="text-xl">{p.emoji}</span>
                  <p className="text-[10px] font-bold">{p.name}</p>
                </div>
              ))}
            </div>

            <button onClick={startNight} className="w-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">
              밤이 됩니다... 🌙
            </button>
          </div>
        )}

        {/* === NIGHT === */}
        {phase === "night" && myPlayer && (
          <div className="w-full max-w-md space-y-4">
            <div className="rounded-xl bg-indigo-950/60 p-4 text-center">
              <p className="text-2xl">🌙</p>
              <h2 className="text-xl font-black">{dayNum}번째 밤</h2>
              {myPlayer.alive ? (
                <p className={`mt-1 text-sm ${ROLE_INFO[myPlayer.role].color}`}>
                  {myPlayer.role === "mafia" && "누구를 제거할까요?"}
                  {myPlayer.role === "police" && "누구를 조사할까요?"}
                  {myPlayer.role === "doctor" && "누구를 살릴까요?"}
                  {myPlayer.role === "citizen" && "밤이 지나가길 기다려요... (아무나 선택하세요)"}
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">당신은 사망했습니다... 관전 중</p>
              )}
            </div>

            {myPlayer.alive && (
              <div className="grid grid-cols-2 gap-2">
                {players.filter((p) => p.alive && p.id !== 0).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedTarget(p.id)}
                    className={`rounded-xl border-2 p-3 text-left transition-all active:scale-95 ${
                      selectedTarget === p.id
                        ? "border-red-400 bg-red-900/40"
                        : "border-gray-700 bg-gray-800/40 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{p.emoji}</span>
                      <div>
                        <p className="text-sm font-bold">{p.name}</p>
                        {myPlayer.role === "mafia" && p.role === "mafia" && (
                          <p className="text-[10px] text-red-400">동료 마피아</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={submitNightAction}
              disabled={selectedTarget === null && myPlayer.alive}
              className="w-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
            >
              {myPlayer.alive ? "확인 ✅" : "다음으로 ➡️"}
            </button>
          </div>
        )}

        {/* === NIGHT RESULT === */}
        {phase === "nightResult" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 w-full max-w-md">
            <span className="text-6xl">🌙</span>
            <h2 className="text-2xl font-black">밤이 지나갔습니다...</h2>

            {lastKilled && (
              <div className="rounded-xl bg-red-900/40 p-4 text-center">
                <span className="text-4xl">{lastKilled.emoji}</span>
                <p className="mt-2 text-lg font-bold text-red-400">{lastKilled.name}님이 사망했습니다</p>
                <p className="text-xs text-gray-400">{ROLE_INFO[lastKilled.role].emoji} {ROLE_INFO[lastKilled.role].name}</p>
              </div>
            )}

            {!lastKilled && lastSaved && (
              <div className="rounded-xl bg-green-900/40 p-4 text-center">
                <span className="text-4xl">💊</span>
                <p className="mt-2 text-lg font-bold text-green-400">아무도 죽지 않았습니다!</p>
                <p className="text-xs text-gray-400">의사가 살렸나봐요!</p>
              </div>
            )}

            {!lastKilled && !lastSaved && (
              <p className="text-gray-400">평화로운 밤이었습니다.</p>
            )}

            {policeResult && myPlayer?.role === "police" && myPlayer.alive && (
              <div className="rounded-xl bg-yellow-900/40 p-4 text-center">
                <p className="text-sm font-bold text-yellow-400">{policeResult}</p>
              </div>
            )}

            <button onClick={startDay} className="mt-4 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 px-8 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">
              아침이 밝습니다 ☀️
            </button>
          </div>
        )}

        {/* === DAY === */}
        {phase === "day" && (
          <div className="w-full max-w-md space-y-4">
            <div className="rounded-xl bg-amber-900/30 p-3 text-center">
              <p className="text-sm font-bold text-amber-300">☀️ {dayNum}번째 낮 - 토론 시간</p>
              <p className="text-xs text-gray-400">생존: {alivePlayers.length}명 (마피아 {aliveMafia.length}명 남음)</p>
            </div>

            {/* Player list */}
            <div className="flex flex-wrap gap-2 justify-center">
              {players.map((p) => (
                <div key={p.id} className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs ${p.alive ? "bg-slate-800" : "bg-slate-900 opacity-40 line-through"}`}>
                  <span>{p.emoji}</span>
                  <span>{p.name}</span>
                  {!p.alive && <span className="text-[9px] text-gray-500">({ROLE_INFO[p.role].emoji})</span>}
                </div>
              ))}
            </div>

            {/* Chat */}
            <div ref={chatRef} className="h-64 overflow-y-auto rounded-xl bg-slate-900/60 p-3 space-y-2">
              {chat.map((msg, i) => {
                const speaker = players.find((p) => p.id === msg.speakerId);
                return (
                  <div key={i} className={msg.isSystem ? "text-center" : ""}>
                    {msg.isSystem ? (
                      <p className="text-xs text-yellow-300/80">{msg.text}</p>
                    ) : (
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{speaker?.emoji}</span>
                        <div>
                          <span className="text-xs font-bold text-gray-300">{speaker?.name}</span>
                          <p className="text-sm text-gray-200">{msg.text}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={startVoting} className="w-full rounded-full bg-gradient-to-r from-rose-500 to-red-600 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">
              🗳️ 투표 시작!
            </button>
          </div>
        )}

        {/* === VOTING === */}
        {phase === "voting" && (
          <div className="w-full max-w-md space-y-4">
            <div className="rounded-xl bg-red-900/30 p-3 text-center">
              <p className="text-lg font-bold text-red-300">🗳️ 투표</p>
              <p className="text-xs text-gray-400">누구를 처형할까요?</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {alivePlayers.filter((p) => !p.isPlayer).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedTarget(p.id)}
                  className={`rounded-xl border-2 p-3 text-left transition-all active:scale-95 ${
                    selectedTarget === p.id
                      ? "border-red-400 bg-red-900/40"
                      : "border-gray-700 bg-gray-800/40 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{p.emoji}</span>
                    <p className="text-sm font-bold">{p.name}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={submitVote}
              disabled={selectedTarget === null}
              className="w-full rounded-full bg-gradient-to-r from-red-500 to-rose-500 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
            >
              투표하기! 🗳️
            </button>
          </div>
        )}

        {/* === VOTE RESULT === */}
        {phase === "voteResult" && (
          <div className="w-full max-w-md space-y-4">
            <div className="rounded-xl bg-slate-900/60 p-4 text-center">
              <p className="text-lg font-bold">🗳️ 투표 결과</p>
            </div>

            <div className="space-y-2">
              {Object.entries(voteResults)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([targetId, voterIds]) => {
                  const target = players.find((p) => p.id === Number(targetId));
                  return (
                    <div key={targetId} className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{target?.emoji}</span>
                        <span className="text-sm font-bold">{target?.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {voterIds.map((vid) => {
                          const voter = players.find((p) => p.id === vid);
                          return <span key={vid} className="text-sm" title={voter?.name}>{voter?.emoji}</span>;
                        })}
                        <span className="ml-2 rounded-full bg-red-800 px-2 py-0.5 text-xs font-bold">{voterIds.length}표</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {lastVoted && (
              <div className="rounded-xl bg-red-900/40 p-4 text-center">
                <span className="text-3xl">{lastVoted.emoji}</span>
                <p className="mt-1 font-bold text-red-400">{lastVoted.name}님이 처형되었습니다</p>
                <p className="text-xs text-gray-400">{ROLE_INFO[lastVoted.role].emoji} {ROLE_INFO[lastVoted.role].name}</p>
              </div>
            )}

            {!lastVoted && (
              <p className="text-center text-gray-400">동률! 아무도 처형되지 않았습니다.</p>
            )}

            <button onClick={proceedAfterVote} className="w-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">
              다음 밤으로 🌙
            </button>
          </div>
        )}

        {/* === WIN === */}
        {phase === "win" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <span className="text-8xl">🎉</span>
            <h2 className="text-4xl font-black">승리!</h2>
            <p className="text-lg text-green-400">
              {myPlayer && ROLE_INFO[myPlayer.role].team === "citizen"
                ? "시민팀이 마피아를 모두 찾아냈습니다!"
                : "마피아가 마을을 장악했습니다!"}
            </p>

            <div className="w-full max-w-sm rounded-xl bg-slate-800/60 p-4">
              <p className="mb-2 text-center text-sm font-bold text-gray-400">역할 공개</p>
              <div className="space-y-1">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-700/40 px-3 py-2 text-sm">
                    <span>{p.emoji} {p.name} {p.isPlayer && "(나)"}</span>
                    <span className={ROLE_INFO[p.role].color}>{ROLE_INFO[p.role].emoji} {ROLE_INFO[p.role].name}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={startGame} className="mt-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">
              다시 하기! 🎮
            </button>
          </div>
        )}

        {/* === LOSE === */}
        {phase === "lose" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <span className="text-8xl">💀</span>
            <h2 className="text-4xl font-black">패배...</h2>
            <p className="text-lg text-red-400">
              {myPlayer && ROLE_INFO[myPlayer.role].team === "citizen"
                ? "마피아가 마을을 장악했습니다..."
                : "시민팀이 마피아를 모두 찾아냈습니다..."}
            </p>

            <div className="w-full max-w-sm rounded-xl bg-slate-800/60 p-4">
              <p className="mb-2 text-center text-sm font-bold text-gray-400">역할 공개</p>
              <div className="space-y-1">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-700/40 px-3 py-2 text-sm">
                    <span>{p.emoji} {p.name} {p.isPlayer && "(나)"}</span>
                    <span className={ROLE_INFO[p.role].color}>{ROLE_INFO[p.role].emoji} {ROLE_INFO[p.role].name}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={startGame} className="mt-4 rounded-full bg-gradient-to-r from-red-500 to-rose-500 px-8 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">
              다시 하기! 🎮
            </button>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
      `}</style>
    </div>
  );
}
