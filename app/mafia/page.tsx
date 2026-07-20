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

// ===== 대사 뱅크 (조합형: 수십만 가지 문장 생성) =====
const rp = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;
const fill = (s: string, n: string) => s.split("{n}").join(n);
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

const SUS_OPENERS = [
  "솔직히", "내 생각엔", "아까부터 봤는데", "가만 보니까", "다들 눈치챘어요?", "이거 느낌 오는데",
  "냉정하게 보면", "확실친 않지만", "딱 봐도", "계속 지켜봤는데", "뭔가", "은근히", "진짜로",
  "곰곰이 생각해보면", "제 촉으로는", "이상하게", "요즘 보면", "어젯밤부터", "아무리 봐도",
  "말하기 좀 그렇지만", "조심스럽게 말하면", "제 눈엔", "가만있어 보자", "지금 딱 느꼈는데", "음...",
];
const SUS_REASONS = [
  "말이 자꾸 바뀌어요", "눈을 안 마주쳐요", "너무 조용해요", "갑자기 말이 많아졌어요", "질문을 자꾸 피해요",
  "표정이 굳어 있어요", "웃는 게 어색해요", "남 얘기만 해요", "투표할 때 눈치를 봐요", "밤마다 반응이 이상해요",
  "변명이 너무 빨라요", "말끝을 흐려요", "괜히 나서요", "조용히 있다가 튀어나와요", "논리가 이상해요",
  "아까랑 말이 달라요", "혼자만 여유로워요", "시선이 불안해요", "대답이 애매해요", "괜히 화를 내요",
  "너무 착한 척해요", "핵심을 자꾸 피해요", "누굴 감싸는 것 같아요", "티나게 긴장했어요", "말투가 부자연스러워요",
  "자기 얘기를 안 해요", "결정적일 때 말을 아껴요", "은근슬쩍 넘어가려 해요", "행동이 부자연스러워요", "뭔가 숨기는 것 같아요",
];
const SUS_ENDERS = [
  "진짜 수상해요.", "마피아 아니에요?", "저는 의심돼요.", "투표합시다.", "해명 좀 해보세요.", "딱 마피아 각인데요.",
  "인정하죠?", "솔직히 말해봐요.", "저만 그렇게 느껴요?", "이번엔 확실해요.", "느낌이 쎄해요.", "제 눈은 못 속여요.",
  "오늘 투표는 정했어요.", "슬슬 걸리네요.", "긴장한 거 티나요.", "다들 잘 봐요.", "저 이 사람 뽑을래요.", "수상함 그 자체예요.",
  "설명해봐요 어서.", "냄새가 나요.", "저는 못 믿겠어요.", "무조건 봐야 돼요.",
];
const DEFLECT_OPEN = [
  "저는 진짜 시민이에요.", "왜 다들 저를 봐요? 저 아니에요.", "저 억울해요 진짜.", "저 완전 결백해요.",
  "저 의심하지 마세요, 시민이라고요.", "제가 마피아면 이렇게 나서겠어요?", "저 진짜 아무것도 몰라요.",
  "저 믿어주세요 제발.", "저 정말 시민이에요, 답답하네요.", "저한테 왜 이러세요...", "저 그런 사람 아니에요.",
];
const DEFLECT_COUNTER = [
  "근데 {n}님은 좀 이상하지 않아요?", "오히려 {n}님이 더 수상한데요.", "제 눈엔 {n}님이 더 걸려요.",
  "{n}님 아까 반응 보셨어요?", "저보다 {n}님을 보세요.", "{n}님이 너무 조용하잖아요.",
  "{n}님이 절 몰아가는 게 더 의심돼요.", "{n}님부터 해명해보세요.", "{n}님 표정 보셨어요? 그게 더 이상해요.",
];
const INNOCENT_DEFEND = [
  "네?! 저 아니에요 진짜로요 ㅠㅠ", "왜 저를 의심하세요... 억울해요.", "저 시민이에요! 믿어주세요.",
  "증거도 없이 왜 이래요...", "저 진짜 결백해요!", "제가 뭘 잘못했다고요 ㅠ", "아니 저 아니라니까요!",
  "너무 몰아가지 마세요, 저 시민이에요.", "헉 저요? 진짜 아니에요.", "저 억울해서 눈물 나요 ㅠㅠ", "제발 오해 풀어주세요.",
];
const MAFIA_DEFEND = [
  "네?! 제가 왜 마피아예요! 말도 안 돼요.", "억울해요! 증거 있어요?", "오히려 절 의심하는 그쪽이 더 수상한데요?",
  "저 진짜 시민이에요!! 왜 저한테 뒤집어씌워요?", "지금 저 몰아가는 거, 그게 마피아 수법 아니에요?",
  "저 그런 사람 아니에요, 진정하세요.", "하... 어이없네요, 저 결백해요.", "저 지목하는 사람이 진짜 마피아 같은데요?",
];
const AGREE_LINES = [
  "맞아요, 저도 {n}님 이상하다 했어요!", "오 저도요! {n}님 투표.", "인정, {n}님 수상했어요.",
  "동의해요, {n}님 걸려요.", "그니까요, {n}님 딱이에요.", "저도 {n}님 찍을래요.",
  "{n}님 아까부터 티 났어요.", "맞네요, {n}님이네.", "저도 {n}님 계속 걸렸어요.", "{n}님 확실한 듯요.",
];
const DEFEND_OTHER = [
  "음, {n}님은 아닌 것 같은데요?", "{n}님 너무 몰아가지 맙시다.", "증거도 없이 {n}님을 왜요?",
  "{n}님은 계속 시민처럼 굴었어요.", "저는 {n}님 안 의심해요.", "{n}님 말고 다른 사람 같은데요.",
  "{n}님한테 너무 심한 거 아니에요?",
];
const GENERAL_LINES = [
  "아직 잘 모르겠어요, 더 지켜봐요.", "단서가 너무 부족해요.", "다들 솔직하게 말해요!", "마피아가 대체 누구야...",
  "조용한 사람이 제일 무서워요.", "이번 밤은 다들 조심합시다.", "누구 말을 믿어야 할지 모르겠어요.",
  "논리적으로 생각해봐요 우리.", "감으로만 뽑으면 안 돼요.", "저는 아직 중립이에요.", "정보 가진 사람 있으면 말해줘요.",
  "지금까지 나온 말 좀 정리해봐요.", "억울한 사람 없게 신중히 해요.", "저 오늘 촉이 좀 와요.", "다들 알리바이 말해봐요.",
  "너무 조용하면 그것도 수상해요.", "이러다 시민만 죽어요, 집중합시다.", "한 명씩 의견 말해봐요.",
];
const QUESTION_LINES = [
  "무슨 근거로요?", "증거 있어요?", "왜 그렇게 생각해요?", "확실해요 그거?", "그쪽은 누구 의심하는데요?",
  "그럼 님은 뭔데요?", "너무 성급한 거 아니에요?", "좀 더 설명해봐요.", "진짜 그렇게 느꼈어요?", "왜 하필 그 사람이에요?",
];
const POLICE_LINES = [
  "제가 좀 알아봤는데... {n}님 정말 수상해요.", "믿을 만한 정보가 있어요. {n}님 조심하세요.",
  "{n}님 강력하게 의심합니다. 이유는 묻지 마세요.", "제 감이 아니라 근거가 있어요. {n}님이에요.",
  "오늘은 {n}님을 봐야 해요, 확신해요.", "저 믿고 {n}님 같이 투표해요.",
];
const ROLECLAIM_REACT = [
  "오 정말요? 그럼 누가 마피아예요?", "그 말 믿어도 돼요? 확실해요?", "결과 있으면 지금 말해줘요!",
  "오오 그럼 빨리 지목해요.", "진짜면 완전 든든한데요.", "증명할 수 있어요?",
];
const DISCREDIT_LINES = [
  "에이~ 진짜 맞아요? 가짜 같은데.", "말로는 다 특수직업이죠.", "저 사람이 오히려 거짓말하는 것 같은데요?",
  "너무 급하게 커밍아웃하는 거 아니에요?", "마피아가 경찰인 척하는 걸 수도 있어요.", "솔직히 못 믿겠어요.",
];
const DOUBT_LINES = [
  "말로는 다들 시민이라고 하죠...", "그걸 어떻게 믿어요?", "변명이 너무 빠른데요?", "글쎄요, 좀 더 볼게요.",
  "그렇게 말할수록 더 수상해요.", "믿고 싶은데 증거가 없네요.",
];
const TRUST_LINES = [
  "알겠어요, 일단 믿어볼게요.", "좋아요, 같이 마피아 찾아요.", "오케이 협력합시다!",
  "그래요, 대신 수상하게 굴지 마요.", "믿어드릴게요 이번엔.", "좋아요, 그 말 믿을게요.",
];
const EMOJI_SUFFIX = ["", "", "", "", " 🤔", " 👀", " 😤", " 🧐", " 😳", " 🔥", " ㅋㅋ", " ..."];

function saySuspect(n: string): string {
  const forms = [
    () => `${rp(SUS_OPENERS)} ${n}님 ${rp(SUS_REASONS)}. ${rp(SUS_ENDERS)}`,
    () => `${n}님, ${rp(SUS_REASONS)}. ${rp(SUS_ENDERS)}`,
    () => `${rp(SUS_ENDERS)} ${rp(SUS_OPENERS)} ${n}님 ${rp(SUS_REASONS)}.`,
    () => `${rp(SUS_OPENERS)} ${n}님 좀 봐요. ${rp(SUS_ENDERS)}`,
    () => `${n}님 ${rp(SUS_REASONS)}... ${rp(SUS_ENDERS)}`,
  ];
  return norm(rp(forms)()) + rp(EMOJI_SUFFIX);
}
function sayMafiaDeflect(targetName: string | null): string {
  if (targetName && chance(0.45)) return saySuspect(targetName); // 시민인 척 남 의심
  if (targetName && chance(0.75)) return norm(`${rp(DEFLECT_OPEN)} ${fill(rp(DEFLECT_COUNTER), targetName)}`) + rp(EMOJI_SUFFIX);
  return rp(DEFLECT_OPEN) + rp(EMOJI_SUFFIX);
}

function generateDiscussion(player: Player, allPlayers: Player[], _dayNum: number, _lastKilled: Player | null, _lastVoted: Player | null, knownMafia: number[]): string {
  const alive = allPlayers.filter((p) => p.alive && p.id !== player.id);

  // 마피아: 발뺌 / 역공 / 시민인 척 의심
  if (player.role === "mafia") {
    const innocent = alive.filter((p) => p.role !== "mafia");
    const target = innocent.length ? rp(innocent) : null;
    return sayMafiaDeflect(target ? target.name : null);
  }

  // 경찰: 아는 마피아 지목
  if (player.role === "police" && knownMafia.length > 0) {
    const known = allPlayers.find((p) => p.id === knownMafia[knownMafia.length - 1] && p.alive);
    if (known && chance(0.7)) return norm(fill(rp(POLICE_LINES), known.name)) + rp(EMOJI_SUFFIX);
  }

  // 일반 시민/의사: 가장 의심되는 사람 지목
  const highest = Object.entries(player.suspicion)
    .filter(([id]) => allPlayers.find((p) => p.id === Number(id))?.alive)
    .sort((a, b) => b[1] - a[1])[0];
  if (highest && highest[1] > 2) {
    const suspect = allPlayers.find((p) => p.id === Number(highest[0]));
    if (suspect) return saySuspect(suspect.name);
  }

  return rp(GENERAL_LINES) + rp(EMOJI_SUFFIX);
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

// --- 플레이어 채팅에 대한 AI 반응 생성 ---
interface Reaction {
  speakerId: number;
  text: string;
}

function detectMention(text: string, players: Player[], selfId: number): Player | null {
  const candidates = players.filter(
    (p) => p.alive && p.id !== selfId && p.name && p.name !== "나" && text.includes(p.name)
  );
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.name.length - a.name.length)[0];
}

function buildReactions(
  text: string,
  players: Player[]
): { reactions: Reaction[]; newSuspicion: Record<number, Record<number, number>> } {
  const self = players.find((p) => p.isPlayer)!;
  const aliveAI = players.filter((p) => p.alive && !p.isPlayer);
  const mentioned = detectMention(text, players, self.id);
  const accuseWords = ["의심", "마피아", "수상", "범인", "거짓", "이상", "조용", "무서", "너지", "너야", "같은데", "같아", "이야", "이에요?"];
  const defendWords = ["시민", "아니", "결백", "믿어", "억울", "오해", "안했", "안 했"];
  const roleWords = ["경찰", "의사", "확인했", "조사했", "확인해", "조사해", "역할"];
  const isAccuse = accuseWords.some((w) => text.includes(w));
  const isDefend = defendWords.some((w) => text.includes(w));
  const isRoleClaim = roleWords.some((w) => text.includes(w));

  const susp: Record<number, Record<number, number>> = {};
  for (const ai of aliveAI) susp[ai.id] = { ...ai.suspicion };
  const bump = (byId: number, targetId: number, amt: number) => {
    if (!susp[byId]) return;
    susp[byId][targetId] = (susp[byId][targetId] ?? 0) + amt;
  };
  const reactions: Reaction[] = [];

  if (mentioned && isAccuse && !mentioned.isPlayer) {
    const target = mentioned;
    // 무리 심리: 다른 AI들도 지목당한 사람을 조금 더 의심
    for (const ai of aliveAI) if (ai.id !== target.id) bump(ai.id, target.id, 1);
    // 지목당한 AI의 반박
    if (target.role === "mafia") {
      bump(target.id, self.id, 3);
      reactions.push({ speakerId: target.id, text: rp(MAFIA_DEFEND) + rp(EMOJI_SUFFIX) });
    } else {
      bump(target.id, self.id, 1);
      reactions.push({ speakerId: target.id, text: rp(INNOCENT_DEFEND) + rp(EMOJI_SUFFIX) });
    }
    // 다른 AI 1~2명이 끼어듦
    const others = shuffle(aliveAI.filter((a) => a.id !== target.id)).slice(0, chance(0.5) ? 2 : 1);
    for (const r of others) {
      if (r.role === "mafia" && target.role !== "mafia") {
        bump(r.id, target.id, 2);
        reactions.push({ speakerId: r.id, text: fill(rp(AGREE_LINES), target.name) + rp(EMOJI_SUFFIX) });
      } else if (r.role === "mafia" && target.role === "mafia") {
        bump(r.id, self.id, 2);
        reactions.push({ speakerId: r.id, text: fill(rp(DEFEND_OTHER), target.name) + rp(EMOJI_SUFFIX) });
      } else {
        const s = r.suspicion[target.id] ?? 0;
        if (s >= 2) {
          bump(r.id, target.id, 1);
          reactions.push({ speakerId: r.id, text: chance(0.5) ? fill(rp(AGREE_LINES), target.name) : saySuspect(target.name) });
        } else {
          reactions.push({ speakerId: r.id, text: rp(QUESTION_LINES) + rp(EMOJI_SUFFIX) });
        }
      }
    }
  } else if (isRoleClaim) {
    const r1 = rp(aliveAI);
    reactions.push({ speakerId: r1.id, text: rp(ROLECLAIM_REACT) + rp(EMOJI_SUFFIX) });
    const maf = aliveAI.find((a) => a.role === "mafia");
    if (maf) {
      bump(maf.id, self.id, 2);
      reactions.push({ speakerId: maf.id, text: rp(DISCREDIT_LINES) + rp(EMOJI_SUFFIX) });
    }
  } else if (isDefend) {
    const maf = aliveAI.find((a) => a.role === "mafia");
    if (maf) {
      bump(maf.id, self.id, 1);
      reactions.push({ speakerId: maf.id, text: rp(DOUBT_LINES) + rp(EMOJI_SUFFIX) });
    }
    const cit = aliveAI.find((a) => ROLE_INFO[a.role].team === "citizen" && a.id !== maf?.id);
    if (cit) reactions.push({ speakerId: cit.id, text: rp(TRUST_LINES) + rp(EMOJI_SUFFIX) });
  } else {
    const n = 1 + (chance(0.5) ? 1 : 0);
    const pool = [...GENERAL_LINES, ...QUESTION_LINES];
    for (const r of shuffle(aliveAI).slice(0, n)) {
      reactions.push({ speakerId: r.id, text: rp(pool) + rp(EMOJI_SUFFIX) });
    }
  }

  return { reactions, newSuspicion: susp };
}

export default function MafiaPage() {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [players, setPlayers] = useState<Player[]>([]);
  const [dayNum, setDayNum] = useState(0);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
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

    // AI 자유 토론 (LLM). 실패하면 규칙기반 대사로 폴백
    setAiTyping(true);
    (async () => {
      const transcript = buildTranscript();
      const lines = await fetchAiLines("discuss", transcript);
      let finalDelay = 0;
      if (lines.length) {
        finalDelay = applyAiLines(lines);
      } else {
        const alive = players.filter((p) => p.alive && !p.isPlayer && (lastKilled ? p.id !== lastKilled.id : true));
        let delay = 500;
        for (const ai of alive) {
          const captured = ai;
          setTimeout(() => {
            const msg = generateDiscussion(captured, players, dayNum, lastKilled, lastVoted, knownMafia);
            setChat((prev) => [...prev, { speakerId: captured.id, text: msg, isSystem: false }]);
          }, delay);
          delay += 800 + Math.random() * 600;
          finalDelay = delay;
        }
      }
      setTimeout(() => setAiTyping(false), finalDelay + 200);
    })();
  };

  // --- LLM 연동 헬퍼 ---
  const reqPlayers = () => players.map((p) => ({ id: p.id, name: p.name, role: p.role, alive: p.alive, isPlayer: p.isPlayer }));

  const buildTranscript = (extra?: { name: string; text: string }) => {
    const base = chat
      .filter((m) => !m.isSystem)
      .map((m) => ({ name: players.find((p) => p.id === m.speakerId)?.name ?? "?", text: m.text }));
    return extra ? [...base, extra] : base;
  };

  const fetchAiLines = async (
    mode: "react" | "discuss",
    transcript: { name: string; text: string }[],
    playerMessage?: string
  ): Promise<{ name: string; text: string; suspects?: string }[]> => {
    try {
      const res = await fetch("/api/mafia-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, dayNum, playerMessage, players: reqPlayers(), transcript }),
      });
      const data = await res.json();
      return Array.isArray(data.lines) ? data.lines : [];
    } catch {
      return [];
    }
  };

  // 반환: 마지막 메시지가 출력되는 시각(ms). AI들의 대사를 시간차로 출력하고 의심도 반영.
  const applyAiLines = (lines: { name: string; text: string; suspects?: string }[]): number => {
    const nameToId = new Map(players.filter((p) => p.alive).map((p) => [p.name, p.id] as const));
    const susUpdates: { byId: number; targetId: number }[] = [];
    let delay = 400;
    let last = -99;
    for (const ln of lines) {
      const sid = nameToId.get(ln.name);
      if (sid == null) continue;
      const speaker = players.find((p) => p.id === sid);
      if (!speaker || speaker.isPlayer || !speaker.alive || sid === last) continue;
      last = sid;
      const captured = ln.text;
      setTimeout(() => setChat((prev) => [...prev, { speakerId: sid, text: captured, isSystem: false }]), delay);
      delay += 700 + Math.random() * 500;
      if (ln.suspects && ln.suspects.trim()) {
        let tid = nameToId.get(ln.suspects.trim());
        if (tid == null && (ln.suspects.includes("나") || ln.suspects.includes("당신"))) tid = 0;
        if (tid != null && tid !== sid) susUpdates.push({ byId: sid, targetId: tid });
      }
    }
    if (susUpdates.length) {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.isPlayer) return p;
          const ups = susUpdates.filter((u) => u.byId === p.id);
          if (!ups.length) return p;
          const s = { ...p.suspicion };
          for (const u of ups) s[u.targetId] = (s[u.targetId] ?? 0) + 2;
          return { ...p, suspicion: s };
        })
      );
    }
    return delay;
  };

  // 규칙기반 폴백 반응. 반환: 마지막 출력 시각(ms)
  const applyRuleReactions = (text: string): number => {
    const { reactions, newSuspicion } = buildReactions(text, players);
    setPlayers((prev) => prev.map((p) => (!p.isPlayer && newSuspicion[p.id] ? { ...p, suspicion: newSuspicion[p.id] } : p)));
    let delay = 500;
    for (const r of reactions) {
      const rr = r;
      setTimeout(() => setChat((prev) => [...prev, { speakerId: rr.speakerId, text: rr.text, isSystem: false }]), delay);
      delay += 700 + Math.random() * 500;
    }
    return delay;
  };

  const sendPlayerMessage = async () => {
    const text = chatInput.trim();
    if (!text || phase !== "day" || aiTyping) return;
    const me = players.find((p) => p.isPlayer);
    if (!me || !me.alive) return;

    setChat((prev) => [...prev, { speakerId: me.id, text, isSystem: false }]);
    setChatInput("");
    setAiTyping(true);

    const transcript = buildTranscript({ name: "나", text });
    const lines = await fetchAiLines("react", transcript, text);
    const finalDelay = lines.length ? applyAiLines(lines) : applyRuleReactions(text);
    setTimeout(() => setAiTyping(false), finalDelay + 200);
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
                      <div className={`flex items-start gap-2 ${speaker?.isPlayer ? "flex-row-reverse" : ""}`}>
                        <span className="text-lg">{speaker?.emoji}</span>
                        <div className={speaker?.isPlayer ? "text-right" : ""}>
                          <span className={`text-xs font-bold ${speaker?.isPlayer ? "text-indigo-300" : "text-gray-300"}`}>
                            {speaker?.isPlayer ? "나" : speaker?.name}
                          </span>
                          <p className={`text-sm ${speaker?.isPlayer ? "inline-block rounded-lg bg-indigo-600/40 px-2 py-1 text-white" : "text-gray-200"}`}>
                            {msg.text}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* AI 발언 중 표시 */}
            {aiTyping && (
              <p className="text-center text-xs text-indigo-300 animate-pulse">🤖 AI들이 이야기하는 중...</p>
            )}

            {/* 내 채팅 입력 */}
            {myPlayer?.alive ? (
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendPlayerMessage();
                  }}
                  disabled={aiTyping}
                  maxLength={80}
                  placeholder={aiTyping ? "AI들이 말하는 중..." : "의견을 말해보세요! 예: 민수야 너 마피아지?"}
                  className="flex-1 rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-400 disabled:opacity-50"
                />
                <button
                  onClick={sendPlayerMessage}
                  disabled={!chatInput.trim() || aiTyping}
                  className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-bold shadow transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
                >
                  전송
                </button>
              </div>
            ) : (
              <p className="text-center text-xs text-gray-500">💀 당신은 사망하여 발언할 수 없습니다 (지켜보세요)</p>
            )}
            <p className="text-center text-[11px] text-gray-500">
              💬 AI들이 진짜로 자유롭게 대답해요! 이름을 넣어 의심하거나 변호해보세요. 대화가 투표에도 영향을 줍니다.
            </p>

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
