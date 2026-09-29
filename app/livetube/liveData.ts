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
  /** 받는 데 필요한 누적 시청자 수 */
  viewers: number;
  emoji: string;
  label: string;
}

/** 누적 시청자(지금까지 방송을 보러 온 사람 수의 합)로 받는 버튼 */
export const AWARDS: Award[] = [
  { viewers: 100_000, emoji: "🥈", label: "실버 버튼" },
  { viewers: 1_000_000, emoji: "🥇", label: "골드 버튼" },
  { viewers: 10_000_000, emoji: "💎", label: "다이아 버튼" },
  { viewers: 100_000_000, emoji: "🔷", label: "사파이어 버튼" },
];

export function awardFor(totalViewers: number): Award | null {
  let best: Award | null = null;
  for (const a of AWARDS) if (totalViewers >= a.viewers) best = a;
  return best;
}

export function nextAward(totalViewers: number): Award | null {
  return AWARDS.find((a) => totalViewers < a.viewers) ?? null;
}

export interface Food {
  id: string;
  emoji: string;
  name: string;
  /** 원. 0 이면 공짜 */
  price: number;
  /** 배부름이 이만큼 찬다(0~100) */
  fill: number;
  /** 먹는 동안 방송 분위기를 이만큼 띄운다 */
  hype: number;
  /** 먹는 시간(ms) */
  eatMs: number;
  chats: string[];
}

/** 방송 중에 사 먹는 음식. 비쌀수록 시청자가 더 좋아한다. */
export const FOODS: Food[] = [
  { id: "ramen", emoji: "🍜", name: "라면", price: 0, fill: 25, hype: 0.35, eatMs: 3500, chats: ["후루룩 소리 좋아요", "라면 먹고 싶다 ㅠㅠ", "계란 넣었어요?", "국물까지 드세요!"] },
  { id: "gimbap", emoji: "🍙", name: "김밥", price: 1000, fill: 20, hype: 0.35, eatMs: 2500, chats: ["김밥 맛있겠다", "한 줄 더!", "참치김밥이에요?"] },
  { id: "tteok", emoji: "🍢", name: "떡볶이", price: 3000, fill: 30, hype: 0.5, eatMs: 3500, chats: ["매워 보여요 ㅋㅋ", "떡볶이 최고!!", "어묵도 드세요", "맵찔이 인증?"] },
  { id: "burger", emoji: "🍔", name: "햄버거", price: 5000, fill: 40, hype: 0.6, eatMs: 3500, chats: ["한 입 크다 ㅋㅋ", "감자튀김은요?", "버거 먹방 최고"] },
  { id: "chicken", emoji: "🍗", name: "치킨", price: 10000, fill: 55, hype: 0.8, eatMs: 4500, chats: ["치킨은 사랑입니다", "양념이에요 후라이드예요?", "닭다리 누구 줘요?", "와 바삭바삭 ㅠㅠ"] },
  { id: "pizza", emoji: "🍕", name: "피자", price: 15000, fill: 70, hype: 1, eatMs: 4500, chats: ["치즈 늘어나는 거 봐!!", "피자 파티다", "한 조각만 ㅠㅠ", "대왕 먹방이다"] },
];

/** 배가 고플 때 시청자 채팅 */
export const HUNGRY_CHATS = ["배고파 보여요 ㅠㅠ", "밥 좀 드세요!", "힘 없어 보여요", "먹방 해주세요~", "라면이라도 드세요"];
/** 배부름이 0 이 되어 팬이 나갈 때 */
export const LEAVING_CHATS = ["밥 먹고 오세요... 나갈게요", "힘이 없어 보여서 나갈게요 ㅠ", "다음에 올게요", "배고픈 방송은 좀..."];

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function formatCount(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(n >= 1_000_000_000 ? 0 : 1)}억`;
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return String(Math.floor(n));
}
