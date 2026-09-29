// ----------------------------------------------------------------------------
// 라이브 방송 게임의 데이터: 방송 종류, 시청자 채팅, 구독자 보상 단계.
// ----------------------------------------------------------------------------

export type CategoryId = "game" | "mukbang" | "song" | "talk" | "dance";

export interface Category {
  id: CategoryId;
  emoji: string;
  label: string;
  /** 이 방송에서 시청자가 좋아하는 것. talk 은 말소리, move 는 움직임. 합이 1 */
  talk: number;
  move: number;
  chats: string[];
}

export const CATEGORIES: Category[] = [
  {
    id: "game",
    emoji: "🎮",
    label: "게임 방송",
    talk: 0.7,
    move: 0.3,
    chats: ["오 그거 어떻게 깼어요?", "ㅋㅋㅋㅋ 개웃겨", "다음 판 가자!", "로블록스 해주세요", "고수다 고수", "와 컨트롤 미쳤다"],
  },
  {
    id: "mukbang",
    emoji: "🍜",
    label: "먹방",
    talk: 0.4,
    move: 0.6,
    chats: ["맛있겠다 ㅠㅠ", "한 입만!!", "뭐 먹어요?", "배고파졌어요", "쩝쩝 소리 좋아요", "라면 먹고 싶다"],
  },
  {
    id: "song",
    emoji: "🎤",
    label: "노래 방송",
    talk: 0.85,
    move: 0.15,
    chats: ["목소리 너무 좋아요", "앵콜!!!", "신청곡 받아요?", "고음 미쳤다", "가수해도 되겠다", "👏👏👏"],
  },
  {
    id: "talk",
    emoji: "💬",
    label: "소통 방송",
    talk: 0.8,
    move: 0.2,
    chats: ["안녕하세요~", "오늘 학교 어땠어요?", "첫 방송 축하해요", "좋아하는 음식 뭐예요?", "몇 살이에요?", "재밌다 ㅋㅋ"],
  },
  {
    id: "dance",
    emoji: "💃",
    label: "댄스 방송",
    talk: 0.2,
    move: 0.8,
    chats: ["춤 잘 춘다!", "와 리듬감 ㄷㄷ", "한 번 더!!", "챌린지 해주세요", "몸이 막 움직여요", "🔥🔥🔥"],
  },
];

/** 방송 종류와 상관없이 나오는 채팅 */
export const COMMON_CHATS = ["구독 누르고 가요!", "좋아요 꾹", "알림 설정 완료", "처음 왔어요", "ㅎㅇㅎㅇ", "오늘도 재밌다"];
/** 조용하고 가만히 있을 때 */
export const BORED_CHATS = ["말 좀 해주세요~", "자요?", "화면 멈췄나?", "심심해요 ㅠ", "뭐 해요??", "나갈게요..."];
/** 소리를 크게 냈을 때 */
export const LOUD_CHATS = ["깜짝이야 ㅋㅋㅋ", "목소리 크다 ㅋㅋ", "귀 아파요 ㅋㅋㅋ", "텐션 최고!!", "와아아아"];

export const NICKNAMES = [
  "딸기우유", "코딩왕", "민트초코", "로블록스고수", "냥냥펀치", "구름빵", "초코칩",
  "별빛소년", "치즈볼", "무지개", "떡볶이러버", "하늘다람쥐", "보라돌이", "라면요정",
];

export interface Award {
  subs: number;
  emoji: string;
  label: string;
}

/** 진짜 유튜브 보상 단계를 게임에 맞게 줄인 것 */
export const AWARDS: Award[] = [
  { subs: 100, emoji: "🌱", label: "새싹 유튜버" },
  { subs: 1000, emoji: "🥉", label: "브론즈 버튼" },
  { subs: 10000, emoji: "🥈", label: "실버 버튼" },
  { subs: 100000, emoji: "🥇", label: "골드 버튼" },
  { subs: 1000000, emoji: "💎", label: "다이아 버튼" },
];

export function awardFor(subs: number): Award | null {
  let best: Award | null = null;
  for (const a of AWARDS) if (subs >= a.subs) best = a;
  return best;
}

export function nextAward(subs: number): Award | null {
  return AWARDS.find((a) => subs < a.subs) ?? null;
}

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return String(Math.floor(n));
}
