"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 게임 종목 ───── */
interface GameGenre {
  id: string;
  name: string;
  emoji: string;
  stats: ("reflex" | "strategy" | "teamwork" | "aim")[];
  desc: string;
}

const GENRES: GameGenre[] = [
  { id: "fps", name: "FPS", emoji: "🔫", stats: ["aim", "reflex"], desc: "총싸움 게임" },
  { id: "moba", name: "MOBA", emoji: "⚔️", stats: ["strategy", "teamwork"], desc: "팀 전투 게임" },
  { id: "battle_royale", name: "배틀로얄", emoji: "🏝️", stats: ["aim", "strategy"], desc: "최후의 1인!" },
  { id: "fighting", name: "격투", emoji: "🥊", stats: ["reflex", "strategy"], desc: "1대1 격투 게임" },
  { id: "rhythm", name: "리듬", emoji: "🎵", stats: ["reflex"], desc: "리듬 게임" },
  { id: "rts", name: "전략", emoji: "🏰", stats: ["strategy"], desc: "실시간 전략" },
];

/* ───── 대회 ───── */
interface Tournament {
  id: string;
  name: string;
  emoji: string;
  genre: string;
  rounds: number;
  difficulty: number;    // 1~5
  entryFee: number;
  prizeMoney: number;
  xpReward: number;
  minRank: number;       // 최소 랭크 (1=브론즈)
  desc: string;
}

const TOURNAMENTS: Tournament[] = [
  { id: "school", name: "교내 대회", emoji: "🏫", genre: "fps", rounds: 2, difficulty: 1, entryFee: 0, prizeMoney: 30, xpReward: 15, minRank: 1, desc: "학교 친구들과 겨루기!" },
  { id: "local", name: "동네 PC방 대회", emoji: "🖥️", genre: "moba", rounds: 3, difficulty: 1, entryFee: 10, prizeMoney: 50, xpReward: 20, minRank: 1, desc: "동네 최강자를 가리자!" },
  { id: "online_cup", name: "온라인 컵", emoji: "🌐", genre: "battle_royale", rounds: 3, difficulty: 2, entryFee: 20, prizeMoney: 80, xpReward: 30, minRank: 2, desc: "온라인 토너먼트!" },
  { id: "city", name: "시 대표 선발전", emoji: "🏙️", genre: "fps", rounds: 4, difficulty: 2, entryFee: 30, prizeMoney: 120, xpReward: 40, minRank: 2, desc: "시 대표를 뽑자!" },
  { id: "fighting_cup", name: "격투 챔피언십", emoji: "🥊", genre: "fighting", rounds: 4, difficulty: 3, entryFee: 40, prizeMoney: 150, xpReward: 50, minRank: 3, desc: "격투 최강을 가린다!" },
  { id: "rhythm_fest", name: "리듬 페스티벌", emoji: "🎶", genre: "rhythm", rounds: 3, difficulty: 3, entryFee: 30, prizeMoney: 130, xpReward: 45, minRank: 3, desc: "퍼펙트 콤보를 노려라!" },
  { id: "national", name: "전국 대회", emoji: "🇰🇷", genre: "moba", rounds: 5, difficulty: 3, entryFee: 50, prizeMoney: 200, xpReward: 60, minRank: 3, desc: "전국 최강 팀!" },
  { id: "pro_league", name: "프로 리그", emoji: "🏆", genre: "fps", rounds: 5, difficulty: 4, entryFee: 80, prizeMoney: 350, xpReward: 80, minRank: 4, desc: "프로 선수들의 무대!" },
  { id: "asia_cup", name: "아시아 컵", emoji: "🌏", genre: "battle_royale", rounds: 5, difficulty: 4, entryFee: 100, prizeMoney: 500, xpReward: 100, minRank: 5, desc: "아시아 최강을 가린다!" },
  { id: "strategy_masters", name: "전략 마스터즈", emoji: "🧠", genre: "rts", rounds: 4, difficulty: 4, entryFee: 70, prizeMoney: 300, xpReward: 70, minRank: 4, desc: "최고의 전략가!" },
  { id: "world", name: "월드 챔피언십", emoji: "🌍", genre: "moba", rounds: 6, difficulty: 5, entryFee: 150, prizeMoney: 800, xpReward: 150, minRank: 6, desc: "세계 최강을 가린다!!" },
  { id: "legends", name: "레전드 인비테이셔널", emoji: "👑", genre: "fps", rounds: 7, difficulty: 5, entryFee: 200, prizeMoney: 1200, xpReward: 200, minRank: 7, desc: "전설만 초대되는 대회!" },
];

/* ───── 훈련 ───── */
interface Training {
  id: string;
  name: string;
  emoji: string;
  stat: "reflex" | "strategy" | "teamwork" | "aim";
  gain: number;
  cost: number;
  cooldownSec: number;
  desc: string;
}

const TRAININGS: Training[] = [
  { id: "aim_train", name: "에임 훈련", emoji: "🎯", stat: "aim", gain: 2, cost: 0, cooldownSec: 3, desc: "조준 연습!" },
  { id: "reflex_train", name: "반응속도 훈련", emoji: "⚡", stat: "reflex", gain: 2, cost: 0, cooldownSec: 3, desc: "빠르게 반응!" },
  { id: "strategy_train", name: "전략 공부", emoji: "📖", stat: "strategy", gain: 2, cost: 0, cooldownSec: 3, desc: "전략 분석!" },
  { id: "team_train", name: "팀 연습", emoji: "🤝", stat: "teamwork", gain: 2, cost: 0, cooldownSec: 3, desc: "팀워크 향상!" },
  { id: "aim_coach", name: "에임 코칭", emoji: "🎯", stat: "aim", gain: 5, cost: 30, cooldownSec: 5, desc: "코치와 에임 훈련!" },
  { id: "reflex_coach", name: "반응속도 코칭", emoji: "⚡", stat: "reflex", gain: 5, cost: 30, cooldownSec: 5, desc: "코치와 반응속도!" },
  { id: "strategy_coach", name: "전략 코칭", emoji: "📖", stat: "strategy", gain: 5, cost: 30, cooldownSec: 5, desc: "프로의 전략 분석!" },
  { id: "bootcamp", name: "부트캠프", emoji: "🏋️", stat: "aim", gain: 10, cost: 80, cooldownSec: 10, desc: "집중 합숙 훈련!" },
];

/* ───── 장비 ───── */
interface Equipment {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  price: number;
  stat: "reflex" | "strategy" | "teamwork" | "aim" | "all";
  bonus: number;
}

const EQUIPMENTS: Equipment[] = [
  { id: "mouse1", name: "게이밍 마우스", emoji: "🖱️", desc: "에임 +3", price: 40, stat: "aim", bonus: 3 },
  { id: "keyboard1", name: "기계식 키보드", emoji: "⌨️", desc: "반응속도 +3", price: 40, stat: "reflex", bonus: 3 },
  { id: "headset1", name: "게이밍 헤드셋", emoji: "🎧", desc: "팀워크 +3", price: 40, stat: "teamwork", bonus: 3 },
  { id: "monitor1", name: "144Hz 모니터", emoji: "🖥️", desc: "반응속도 +5", price: 80, stat: "reflex", bonus: 5 },
  { id: "mouse2", name: "프로 마우스", emoji: "🖱️", desc: "에임 +6", price: 100, stat: "aim", bonus: 6 },
  { id: "chair", name: "게이밍 의자", emoji: "💺", desc: "전체 +2", price: 120, stat: "all", bonus: 2 },
  { id: "monitor2", name: "240Hz 모니터", emoji: "🖥️", desc: "반응속도 +8", price: 180, stat: "reflex", bonus: 8 },
  { id: "mouse3", name: "전설의 마우스", emoji: "🖱️", desc: "에임 +10", price: 250, stat: "aim", bonus: 10 },
  { id: "keyboard2", name: "커스텀 키보드", emoji: "⌨️", desc: "반응속도 +7", price: 150, stat: "reflex", bonus: 7 },
  { id: "headset2", name: "프로 헤드셋", emoji: "🎧", desc: "팀워크 +7", price: 150, stat: "teamwork", bonus: 7 },
  { id: "desk", name: "프로 데스크", emoji: "🪑", desc: "전략 +5", price: 130, stat: "strategy", bonus: 5 },
  { id: "pc", name: "최강 게이밍PC", emoji: "💻", desc: "전체 +5", price: 400, stat: "all", bonus: 5 },
  { id: "room", name: "전용 연습실", emoji: "🏠", desc: "전체 +8", price: 600, stat: "all", bonus: 8 },
];

/* ───── 랭크 ───── */
const RANKS = [
  { id: 1, name: "브론즈", emoji: "🥉", color: "#cd7f32", minXp: 0 },
  { id: 2, name: "실버", emoji: "🥈", color: "#c0c0c0", minXp: 50 },
  { id: 3, name: "골드", emoji: "🥇", color: "#ffd700", minXp: 150 },
  { id: 4, name: "플래티넘", emoji: "💎", color: "#00bfff", minXp: 350 },
  { id: 5, name: "다이아", emoji: "💠", color: "#b9f2ff", minXp: 600 },
  { id: 6, name: "마스터", emoji: "🔮", color: "#c084fc", minXp: 1000 },
  { id: 7, name: "그랜드마스터", emoji: "⭐", color: "#ff6b6b", minXp: 1500 },
  { id: 8, name: "챌린저", emoji: "👑", color: "#fbbf24", minXp: 2500 },
  { id: 9, name: "레전드", emoji: "🏆", color: "#f97316", minXp: 4000 },
  { id: 10, name: "T1", emoji: "🐐", color: "#ef4444", minXp: 6000 },
];

/* ───── 미니게임: 에임 훈련 ───── */
interface Target {
  id: number;
  x: number;
  y: number;
  size: number;
  timeLeft: number;
}

type Screen = "main" | "tournament_list" | "tournament_play" | "training" | "shop" | "result" | "minigame";

export default function ProGamerPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(50);
  const [totalXp, setTotalXp] = useState(0);
  const [stats, setStats] = useState({ aim: 10, reflex: 10, strategy: 10, teamwork: 10 });
  const [ownedEquipment, setOwnedEquipment] = useState<string[]>([]);
  const [tournamentsWon, setTournamentsWon] = useState<string[]>([]);
  const [fanCount, setFanCount] = useState(0);
  const [teamName, setTeamName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [nameSet, setNameSet] = useState(false);

  // 대회
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundResults, setRoundResults] = useState<{ won: boolean; score: number; enemyName: string }[]>([]);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isBattling, setIsBattling] = useState(false);

  // 훈련 쿨다운
  const [trainingCooldowns, setTrainingCooldowns] = useState<Record<string, number>>({});

  // 미니게임
  const [targets, setTargets] = useState<Target[]>([]);
  const [miniScore, setMiniScore] = useState(0);
  const [miniTimeLeft, setMiniTimeLeft] = useState(15);
  const [miniActive, setMiniActive] = useState(false);
  const miniTimerRef = useRef<NodeJS.Timeout | null>(null);
  const targetIdRef = useRef(0);
  const spawnRef = useRef<NodeJS.Timeout | null>(null);

  // 플로팅
  const [floatTexts, setFloatTexts] = useState<{ id: number; text: string; x: number; y: number; color: string }[]>([]);
  const floatId = useRef(0);

  // 쿨다운 틱
  useEffect(() => {
    const interval = setInterval(() => {
      setTrainingCooldowns(prev => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          next[key] = Math.max(0, next[key] - 1);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 랭크 계산
  const getRank = () => {
    let rank = RANKS[0];
    for (const r of RANKS) {
      if (totalXp >= r.minXp) rank = r;
    }
    return rank;
  };

  const getNextRank = () => {
    const current = getRank();
    const idx = RANKS.findIndex(r => r.id === current.id);
    return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  };

  // 장비 보너스
  const getEquipBonus = (stat: "aim" | "reflex" | "strategy" | "teamwork") => {
    return ownedEquipment.reduce((sum, eqId) => {
      const eq = EQUIPMENTS.find(e => e.id === eqId);
      if (!eq) return sum;
      if (eq.stat === stat || eq.stat === "all") return sum + eq.bonus;
      return sum;
    }, 0);
  };

  const totalStats = {
    aim: stats.aim + getEquipBonus("aim"),
    reflex: stats.reflex + getEquipBonus("reflex"),
    strategy: stats.strategy + getEquipBonus("strategy"),
    teamwork: stats.teamwork + getEquipBonus("teamwork"),
  };

  const overallPower = totalStats.aim + totalStats.reflex + totalStats.strategy + totalStats.teamwork;

  // 적 이름 생성
  const ENEMY_NAMES = [
    "Shadow_X", "ProKiller99", "NoobSlayer", "GG_Master", "FlashBang",
    "SniperKing", "RushB_Dude", "MVP_Star", "CyberWolf", "DragonFist",
    "StormBlade", "NightHawk", "IronHeart", "BlazeRunner", "FrostByte",
    "ThunderGod", "PixelNinja", "RocketMan", "SteelWall", "PhantomAce",
    "DarkMatter", "LightSpeed", "ZeroHero", "MegaMind", "UltraKill",
    "Faker_Jr", "T1_Fan", "SKT_Lover", "Deft_Jr", "Chovy_Fan",
  ];

  const getEnemyName = () => ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)];

  // 대회 전투 시뮬
  const simulateBattle = useCallback((tournament: Tournament, round: number): { won: boolean; score: number; log: string[]; enemyName: string } => {
    const genre = GENRES.find(g => g.id === tournament.genre)!;
    const relevantStats = genre.stats.map(s => totalStats[s]);
    const playerPower = relevantStats.reduce((a, b) => a + b, 0) / relevantStats.length;

    // 적 파워 (라운드가 올라갈수록 강해짐)
    const basePower = 10 + tournament.difficulty * 8 + round * 5;
    const enemyPower = basePower + Math.random() * 15 - 5;
    const enemyName = getEnemyName();

    const log: string[] = [];
    log.push(`📢 ${round + 1}라운드: vs ${enemyName}!`);
    log.push(`${genre.emoji} 종목: ${genre.name}`);

    // 전투 시뮬 (3교전)
    let playerScore = 0;
    let enemyScore = 0;

    for (let set = 1; set <= 3; set++) {
      const pRoll = playerPower * (0.7 + Math.random() * 0.6);
      const eRoll = enemyPower * (0.7 + Math.random() * 0.6);

      if (pRoll > eRoll) {
        playerScore++;
        const diff = Math.floor(pRoll - eRoll);
        if (diff > 15) log.push(`🔥 ${set}세트: 압도적 승리! (${diff}점 차)`);
        else if (diff > 5) log.push(`✅ ${set}세트: 승리! (${diff}점 차)`);
        else log.push(`😰 ${set}세트: 간신히 승리! (${diff}점 차)`);
      } else {
        enemyScore++;
        const diff = Math.floor(eRoll - pRoll);
        if (diff > 15) log.push(`💀 ${set}세트: 완패... (${diff}점 차)`);
        else if (diff > 5) log.push(`❌ ${set}세트: 패배 (${diff}점 차)`);
        else log.push(`😤 ${set}세트: 아깝게 패배 (${diff}점 차)`);
      }
    }

    const won = playerScore > enemyScore;
    const score = Math.floor(playerPower * (won ? 1.5 : 0.5));

    if (won) {
      log.push(`🎉 ${playerScore}:${enemyScore} 승리!!`);
    } else {
      log.push(`😭 ${playerScore}:${enemyScore} 패배...`);
    }

    return { won, score, log, enemyName };
  }, [totalStats]);

  // 대회 시작
  const startTournament = useCallback((tournament: Tournament) => {
    if (coins < tournament.entryFee) return;
    if (getRank().id < tournament.minRank) return;
    setCoins(c => c - tournament.entryFee);
    setCurrentTournament(tournament);
    setCurrentRound(0);
    setRoundResults([]);
    setBattleLog([]);
    setScreen("tournament_play");
  }, [coins, totalXp]);

  // 다음 라운드
  const playRound = useCallback(() => {
    if (!currentTournament || isBattling) return;
    setIsBattling(true);

    const result = simulateBattle(currentTournament, currentRound);
    setBattleLog(result.log);

    setTimeout(() => {
      setRoundResults(prev => [...prev, { won: result.won, score: result.score, enemyName: result.enemyName }]);
      setCurrentRound(r => r + 1);
      setIsBattling(false);

      if (!result.won) {
        // 패배 - 대회 종료
        const totalScore = roundResults.reduce((s, r) => s + r.score, 0) + result.score;
        const consolation = Math.floor(totalScore / 5);
        setCoins(c => c + consolation);
        setTotalXp(x => x + Math.floor(currentTournament.xpReward * currentRound / currentTournament.rounds));
        setFanCount(f => f + currentRound * 5);
        setTimeout(() => setScreen("result"), 500);
      } else if (currentRound + 1 >= currentTournament.rounds) {
        // 우승!
        setCoins(c => c + currentTournament.prizeMoney);
        setTotalXp(x => x + currentTournament.xpReward);
        setFanCount(f => f + currentTournament.difficulty * 50);
        if (!tournamentsWon.includes(currentTournament.id)) {
          setTournamentsWon(prev => [...prev, currentTournament.id]);
        }
        setTimeout(() => setScreen("result"), 500);
      }
    }, 1500);
  }, [currentTournament, currentRound, isBattling, simulateBattle, roundResults, tournamentsWon]);

  // 훈련
  const doTraining = useCallback((training: Training) => {
    if ((trainingCooldowns[training.id] || 0) > 0) return;
    if (coins < training.cost) return;
    setCoins(c => c - training.cost);
    setStats(prev => ({ ...prev, [training.stat]: prev[training.stat] + training.gain }));
    setTrainingCooldowns(prev => ({ ...prev, [training.id]: training.cooldownSec }));
    setTotalXp(x => x + training.gain);
  }, [trainingCooldowns, coins]);

  // 장비 구매
  const buyEquipment = useCallback((id: string) => {
    const eq = EQUIPMENTS.find(e => e.id === id);
    if (!eq || coins < eq.price || ownedEquipment.includes(id)) return;
    setCoins(c => c - eq.price);
    setOwnedEquipment(prev => [...prev, id]);
  }, [coins, ownedEquipment]);

  // 미니게임
  const startMinigame = useCallback(() => {
    setTargets([]);
    setMiniScore(0);
    setMiniTimeLeft(15);
    setMiniActive(true);
    setScreen("minigame");

    // 타겟 스폰
    spawnRef.current = setInterval(() => {
      const id = targetIdRef.current++;
      const size = 30 + Math.floor(Math.random() * 30);
      setTargets(prev => [...prev, {
        id,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 70,
        size,
        timeLeft: 20,
      }]);
    }, 600);
  }, []);

  // 미니게임 타이머
  useEffect(() => {
    if (miniActive && miniTimeLeft > 0) {
      miniTimerRef.current = setTimeout(() => setMiniTimeLeft(t => t - 1), 1000);
      return () => { if (miniTimerRef.current) clearTimeout(miniTimerRef.current); };
    } else if (miniActive && miniTimeLeft <= 0) {
      setMiniActive(false);
      if (spawnRef.current) clearInterval(spawnRef.current);
      // 보상
      const bonus = Math.floor(miniScore / 2);
      setStats(prev => ({ ...prev, aim: prev.aim + bonus, reflex: prev.reflex + Math.floor(bonus / 2) }));
      setTotalXp(x => x + miniScore);
      setCoins(c => c + Math.floor(miniScore / 3));
    }
  }, [miniActive, miniTimeLeft, miniScore]);

  // 타겟 소멸
  useEffect(() => {
    if (!miniActive) return;
    const interval = setInterval(() => {
      setTargets(prev => prev.map(t => ({ ...t, timeLeft: t.timeLeft - 1 })).filter(t => t.timeLeft > 0));
    }, 100);
    return () => clearInterval(interval);
  }, [miniActive]);

  const hitTarget = useCallback((id: number, e: React.MouseEvent) => {
    setTargets(prev => prev.filter(t => t.id !== id));
    setMiniScore(s => s + 1);

    const fid = floatId.current++;
    setFloatTexts(prev => [...prev, { id: fid, text: "+1 🎯", x: e.clientX, y: e.clientY, color: "#4ade80" }]);
    setTimeout(() => setFloatTexts(prev => prev.filter(f => f.id !== fid)), 700);
  }, []);

  const rank = getRank();
  const nextRank = getNextRank();

  /* ───── 이름 입력 ───── */
  if (!nameSet) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-950 to-black text-white p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <Link href="/" className="text-purple-300 text-sm mb-4 inline-block">← 홈으로</Link>
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-3xl font-black mb-2">프로게이머</h1>
          <p className="text-purple-300 mb-6">닉네임과 팀명을 정하자!</p>

          <div className="bg-black/40 rounded-xl p-4 space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">닉네임</label>
              <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)}
                placeholder="닉네임 입력..." maxLength={12}
                className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white text-center outline-none focus:ring-2 ring-purple-500" />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">팀명</label>
              <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)}
                placeholder="팀명 입력..." maxLength={12}
                className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white text-center outline-none focus:ring-2 ring-purple-500" />
            </div>
            <button onClick={() => { if (playerName.trim() && teamName.trim()) setNameSet(true); }}
              disabled={!playerName.trim() || !teamName.trim()}
              className={`w-full py-3 rounded-xl font-black text-lg ${playerName.trim() && teamName.trim() ? "bg-purple-600 hover:bg-purple-500" : "bg-gray-700 text-gray-500"}`}>
              🎮 시작!
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 메인 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-purple-300 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-4">
            <div className="text-5xl mb-1">🎮</div>
            <h1 className="text-2xl font-black">프로게이머</h1>
            <p className="text-purple-300 text-sm">세계 최고의 프로게이머가 되자!</p>
          </div>

          {/* 프로필 */}
          <div className="bg-gradient-to-r from-purple-900/60 to-blue-900/60 rounded-xl p-3 mb-3 border border-purple-700/50">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{rank.emoji}</div>
              <div className="flex-1">
                <div className="font-black">{playerName}</div>
                <div className="text-xs text-gray-400">팀 {teamName}</div>
                <div className="text-sm font-bold" style={{ color: rank.color }}>{rank.name}</div>
              </div>
              <div className="text-right">
                <div className="text-yellow-400 font-bold text-sm">🪙 {coins}</div>
                <div className="text-xs text-gray-400">👥 팬 {fanCount}명</div>
              </div>
            </div>
            {nextRank && (
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>다음: {nextRank.emoji} {nextRank.name}</span>
                  <span>{totalXp}/{nextRank.minXp} XP</span>
                </div>
                <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full transition-all" style={{
                    width: `${Math.min(100, ((totalXp - rank.minXp) / (nextRank.minXp - rank.minXp)) * 100)}%`,
                    backgroundColor: rank.color,
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* 스탯 */}
          <div className="bg-black/40 rounded-xl p-3 mb-3">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <div className="text-lg">🎯</div>
                <div className="font-bold text-blue-400">{totalStats.aim}</div>
                <div className="text-gray-500">에임</div>
              </div>
              <div>
                <div className="text-lg">⚡</div>
                <div className="font-bold text-yellow-400">{totalStats.reflex}</div>
                <div className="text-gray-500">반응</div>
              </div>
              <div>
                <div className="text-lg">🧠</div>
                <div className="font-bold text-green-400">{totalStats.strategy}</div>
                <div className="text-gray-500">전략</div>
              </div>
              <div>
                <div className="text-lg">🤝</div>
                <div className="font-bold text-pink-400">{totalStats.teamwork}</div>
                <div className="text-gray-500">팀워크</div>
              </div>
            </div>
            <div className="text-center text-xs text-gray-500 mt-1">전투력: {overallPower} | 🏆 우승: {tournamentsWon.length}회</div>
          </div>

          {/* 메뉴 */}
          <div className="space-y-2">
            <button onClick={() => setScreen("tournament_list")}
              className="w-full bg-red-700 hover:bg-red-600 rounded-xl p-3 text-center font-black text-lg">
              🏆 대회 참가
            </button>
            <button onClick={() => setScreen("training")}
              className="w-full bg-blue-700 hover:bg-blue-600 rounded-xl p-3 text-center font-bold">
              💪 훈련하기
            </button>
            <button onClick={startMinigame}
              className="w-full bg-green-700 hover:bg-green-600 rounded-xl p-3 text-center font-bold">
              🎯 에임 미니게임
            </button>
            <button onClick={() => setScreen("shop")}
              className="w-full bg-yellow-700/60 hover:bg-yellow-600/60 rounded-xl p-3 text-center font-bold">
              🛒 장비 상점
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 대회 목록 ───── */
  if (screen === "tournament_list") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-purple-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-4">🏆 대회 목록</h2>

          <div className="space-y-2">
            {TOURNAMENTS.map(t => {
              const won = tournamentsWon.includes(t.id);
              const canEnter = getRank().id >= t.minRank && coins >= t.entryFee;
              const rankLocked = getRank().id < t.minRank;

              return (
                <button key={t.id} onClick={() => !rankLocked && canEnter && startTournament(t)}
                  disabled={!canEnter}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    won ? "bg-green-900/30 border border-green-700" : rankLocked ? "bg-gray-900/50 opacity-50" : "bg-black/30 hover:bg-black/50"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{t.emoji}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{t.name}</span>
                        {won && <span className="text-green-400 text-xs">🏆</span>}
                      </div>
                      <div className="text-xs text-gray-400">{t.desc}</div>
                      <div className="flex gap-2 mt-0.5 text-[10px]">
                        <span className="text-gray-500">{"⭐".repeat(t.difficulty)}</span>
                        <span>{GENRES.find(g => g.id === t.genre)?.emoji} {GENRES.find(g => g.id === t.genre)?.name}</span>
                      </div>
                      {rankLocked && <div className="text-[10px] text-red-400">🔒 {RANKS.find(r => r.id === t.minRank)?.name} 이상 필요</div>}
                    </div>
                    <div className="text-right text-xs">
                      {t.entryFee > 0 && <div className="text-gray-400">참가비: 🪙{t.entryFee}</div>}
                      <div className="text-yellow-400">상금: 🪙{t.prizeMoney}</div>
                      <div className="text-gray-500">{t.rounds}라운드</div>
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

  /* ───── 대회 플레이 ───── */
  if (screen === "tournament_play" && currentTournament) {
    const allWon = roundResults.length === currentTournament.rounds && roundResults.every(r => r.won);
    const lost = roundResults.length > 0 && !roundResults[roundResults.length - 1]?.won;
    const isOver = allWon || lost;

    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950 via-gray-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-4">
            <div className="text-4xl">{currentTournament.emoji}</div>
            <h2 className="text-xl font-black">{currentTournament.name}</h2>
            <p className="text-xs text-gray-400">라운드 {Math.min(currentRound + 1, currentTournament.rounds)}/{currentTournament.rounds}</p>
          </div>

          {/* 라운드 결과 */}
          <div className="bg-black/40 rounded-xl p-3 mb-3">
            {roundResults.map((r, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm mb-1 ${r.won ? "text-green-400" : "text-red-400"}`}>
                <span>{r.won ? "✅" : "❌"}</span>
                <span>라운드 {i + 1}: vs {r.enemyName} - {r.won ? "승리" : "패배"} (+{r.score}점)</span>
              </div>
            ))}
          </div>

          {/* 배틀 로그 */}
          {battleLog.length > 0 && (
            <div className="bg-gray-900 rounded-xl p-3 mb-3 max-h-40 overflow-y-auto">
              {battleLog.map((log, i) => (
                <div key={i} className="text-xs text-gray-300 mb-0.5">{log}</div>
              ))}
            </div>
          )}

          {/* 액션 */}
          {!isOver && !isBattling && (
            <button onClick={playRound}
              className="w-full bg-red-600 hover:bg-red-500 rounded-xl p-4 text-center font-black text-lg">
              ⚔️ {currentRound + 1}라운드 시작!
            </button>
          )}

          {isBattling && (
            <div className="text-center text-lg animate-pulse font-bold">⚔️ 대전 중...</div>
          )}

          {isOver && (
            <button onClick={() => setScreen("result")}
              className="w-full bg-purple-600 hover:bg-purple-500 rounded-xl p-3 font-bold">
              📊 결과 보기
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ───── 결과 ───── */
  if (screen === "result" && currentTournament) {
    const allWon = roundResults.length === currentTournament.rounds && roundResults.every(r => r.won);
    const totalScore = roundResults.reduce((s, r) => s + r.score, 0);

    return (
      <div className={`min-h-screen bg-gradient-to-b ${allWon ? "from-yellow-700 via-purple-900 to-black" : "from-gray-800 to-black"} text-white p-4 flex items-center justify-center`}>
        <div className="max-w-md mx-auto text-center">
          <div className="text-8xl mb-4">{allWon ? "🏆" : "😤"}</div>
          <h2 className="text-3xl font-black mb-1" style={{ color: allWon ? "#fbbf24" : "#f87171" }}>
            {allWon ? "우승!!" : `${roundResults.filter(r => r.won).length}라운드에서 탈락`}
          </h2>
          <p className="text-gray-400 mb-4">{currentTournament.emoji} {currentTournament.name}</p>

          <div className="bg-black/40 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-2xl">⚔️</div><div className="text-xl font-bold">{roundResults.filter(r => r.won).length}승 {roundResults.filter(r => !r.won).length}패</div><div className="text-xs text-gray-400">전적</div></div>
              <div><div className="text-2xl">🎯</div><div className="text-xl font-bold">{totalScore}</div><div className="text-xs text-gray-400">총 점수</div></div>
              <div><div className="text-2xl">🪙</div><div className="text-xl font-bold text-yellow-400">+{allWon ? currentTournament.prizeMoney : Math.floor(totalScore / 5)}</div><div className="text-xs text-gray-400">획득 코인</div></div>
              <div><div className="text-2xl">👥</div><div className="text-xl font-bold text-pink-400">+{allWon ? currentTournament.difficulty * 50 : roundResults.filter(r => r.won).length * 5}</div><div className="text-xs text-gray-400">신규 팬</div></div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setScreen("main")} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">🏠 메인</button>
            <button onClick={() => setScreen("tournament_list")} className="flex-1 bg-red-700 hover:bg-red-600 rounded-xl p-3 font-bold">🏆 대회</button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 훈련 ───── */
  if (screen === "training") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-blue-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">💪 훈련</h2>
          <div className="text-center text-xs text-gray-400 mb-4">스탯을 올려서 대회에서 이기자!</div>

          <div className="space-y-2">
            {TRAININGS.map(t => {
              const onCooldown = (trainingCooldowns[t.id] || 0) > 0;
              const canAfford = coins >= t.cost;

              return (
                <button key={t.id} onClick={() => doTraining(t)}
                  disabled={onCooldown || !canAfford}
                  className={`w-full text-left p-3 rounded-xl flex items-center gap-3 ${
                    onCooldown ? "bg-gray-800/50 opacity-50" : canAfford ? "bg-black/30 hover:bg-black/50" : "bg-black/20 opacity-50"
                  }`}>
                  <div className="text-3xl">{t.emoji}</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.desc}</div>
                    <div className="text-xs text-green-400">+{t.gain} {t.stat === "aim" ? "에임" : t.stat === "reflex" ? "반응" : t.stat === "strategy" ? "전략" : "팀워크"}</div>
                  </div>
                  <div className="text-right text-xs">
                    {t.cost > 0 && <div className="text-yellow-400">🪙 {t.cost}</div>}
                    {onCooldown && <div className="text-red-400">{trainingCooldowns[t.id]}초</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 미니게임 ───── */
  if (screen === "minigame") {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 relative overflow-hidden select-none">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold">⏱️ {miniTimeLeft}초</span>
            <span className="font-bold text-xl">🎯 {miniScore}</span>
          </div>

          {/* 게임 영역 */}
          <div className="relative bg-gray-800 rounded-xl border-2 border-gray-600" style={{ height: "60vh" }}>
            {miniActive && targets.map(t => (
              <button key={t.id}
                onClick={(e) => hitTarget(t.id, e)}
                className="absolute rounded-full bg-red-500 hover:bg-red-400 transition-all flex items-center justify-center"
                style={{
                  left: `${t.x}%`,
                  top: `${t.y}%`,
                  width: `${t.size}px`,
                  height: `${t.size}px`,
                  transform: "translate(-50%, -50%)",
                  opacity: Math.min(1, t.timeLeft / 5),
                  boxShadow: "0 0 10px rgba(239,68,68,0.5)",
                }}>
                <span className="text-white text-xs font-bold">🎯</span>
              </button>
            ))}

            {!miniActive && miniTimeLeft <= 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
                <div className="text-center">
                  <div className="text-6xl mb-3">🎯</div>
                  <div className="text-2xl font-black mb-2">결과: {miniScore}타겟!</div>
                  <div className="text-sm text-gray-400 mb-1">에임 +{Math.floor(miniScore / 2)} | 반응 +{Math.floor(miniScore / 4)}</div>
                  <div className="text-sm text-yellow-400 mb-4">🪙 +{Math.floor(miniScore / 3)}</div>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => setScreen("main")} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-bold">메인</button>
                    <button onClick={startMinigame} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-bold">다시!</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 플로팅 */}
        {floatTexts.map(f => (
          <div key={f.id} className="fixed pointer-events-none font-black text-lg z-50"
            style={{ left: f.x, top: f.y, color: f.color, textShadow: "0 0 4px rgba(0,0,0,0.5)", animation: "floatUp 0.7s ease-out forwards" }}>
            {f.text}
          </div>
        ))}

        <style jsx>{`
          @keyframes floatUp {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-60px) scale(1.3); }
          }
        `}</style>
      </div>
    );
  }

  /* ───── 상점 ───── */
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-purple-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">🛒 장비 상점</h2>
          <div className="text-center text-yellow-400 font-bold mb-4">🪙 {coins}코인</div>

          <div className="space-y-2">
            {EQUIPMENTS.map(eq => {
              const owned = ownedEquipment.includes(eq.id);
              return (
                <div key={eq.id} className={`flex items-center gap-3 p-3 rounded-xl ${owned ? "bg-green-900/30 border border-green-800" : "bg-black/30"}`}>
                  <div className="text-3xl">{eq.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{eq.name}</div>
                    <div className="text-xs text-gray-400">{eq.desc}</div>
                  </div>
                  {owned ? (
                    <span className="text-green-400 text-sm font-bold">✅</span>
                  ) : (
                    <button onClick={() => buyEquipment(eq.id)} disabled={coins < eq.price}
                      className={`text-xs px-3 py-2 rounded-lg font-bold ${coins >= eq.price ? "bg-yellow-600 hover:bg-yellow-500" : "bg-gray-700 text-gray-500"}`}>
                      🪙 {eq.price}
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
