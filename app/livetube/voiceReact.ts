// ----------------------------------------------------------------------------
// 내가 방송에서 한 말(음성 인식 결과)에 시청자가 어떻게 반응할지 정한다.
//
// 진짜 인공지능이 아니라 낱말 규칙이다. 들린 말에 들어 있는 낱말을 보고
// 어울리는 채팅을 고르고, 말한 것만큼 방송 분위기를 올린다.
// ----------------------------------------------------------------------------

import { pick } from "./liveData";

export interface Reaction {
  replies: string[];
  /** 0~1 분위기를 이만큼 띄운다 */
  hype: number;
  /** 구독을 부탁했다 */
  subs: boolean;
  /** 좋아요를 부탁했다 */
  likes: boolean;
}

interface Rule {
  words: string[];
  replies: string[];
  hype?: number;
  subs?: boolean;
  likes?: boolean;
}

// 위에 있는 규칙일수록 먼저 본다. 한 말에서 여러 규칙이 맞으면 두 개까지 반응한다.
const RULES: Rule[] = [
  { words: ["안녕", "하이", "반가", "헬로"], replies: ["안녕하세요!!", "ㅎㅇㅎㅇ", "반가워요~ 👋", "왔어요!!", "하이하이"], hype: 0.3 },
  { words: ["구독"], replies: ["구독했어요!!", "알림설정까지 완료 🔔", "벌써 구독 중이에요 ㅎㅎ", "구독 꾹!"], hype: 0.2, subs: true },
  { words: ["좋아요"], replies: ["좋아요 눌렀어요 👍", "좋아요 백 번 누르고 싶다", "👍👍👍"], hype: 0.2, likes: true },
  { words: ["고마", "감사"], replies: ["저희가 더 감사하죠 ㅠㅠ", "천만에요~", "항상 응원해요!!"], hype: 0.2 },
  { words: ["잘 가", "잘가", "바이", "끝낼", "마칠", "내일 봐"], replies: ["벌써요?? ㅠㅠ", "다음 방송 기다릴게요!", "빠이빠이~", "더 해주세요 ㅠㅠ"], hype: 0.1 },
  { words: ["배고", "먹", "맛있", "라면", "치킨", "피자", "떡볶이", "과자"], replies: ["저도 배고파요 ㅠㅠ", "맛있겠다!!", "한 입만~", "치킨 먹고 싶다", "뭐 먹어요??"], hype: 0.25 },
  { words: ["게임", "로블록스", "마크", "마인크래프트", "브롤", "포켓몬"], replies: ["오 그 게임 저도 해요!", "같이 해요!!", "게임 방송 해주세요", "고수다 고수", "초대해주세요 ㅋㅋ"], hype: 0.25 },
  { words: ["노래", "부를", "불러"], replies: ["노래 불러주세요!!", "신청곡 있어요!", "🎤 앵콜 앵콜", "목소리 좋아요"], hype: 0.3 },
  { words: ["춤", "댄스"], replies: ["춤 보여주세요!!", "💃💃💃", "챌린지 해주세요"], hype: 0.3 },
  { words: ["퀴즈", "문제", "맞혀", "맞춰"], replies: ["저요저요!!", "정답 3번!", "어려워요 ㅠㅠ", "힌트 주세요!"], hype: 0.35 },
  { words: ["학교", "숙제", "공부", "선생님"], replies: ["학교 재밌어요?", "숙제 싫어요 ㅠㅠ", "저도 초등학생이에요!", "공부 화이팅!!"], hype: 0.2 },
  { words: ["이름"], replies: ["이름 알려주세요!", "닉네임 귀여워요", "이름 멋지다"], hype: 0.15 },
  { words: ["몇 살", "나이"], replies: ["저는 10살!", "동갑이다!!", "나이 비밀 ㅋㅋ"], hype: 0.15 },
  { words: ["웃기", "웃겨", "ㅋㅋ", "하하"], replies: ["ㅋㅋㅋㅋㅋㅋ", "개웃겨 ㅋㅋㅋ", "빵 터졌다 ㅋㅋ"], hype: 0.3 },
  { words: ["슬퍼", "속상", "힘들"], replies: ["힘내요!! 💪", "괜찮아요 ㅠㅠ", "우리가 있잖아요!"], hype: 0.15 },
  { words: ["사랑", "좋아해"], replies: ["저도 사랑해요 💖", "💕💕💕", "최고의 유튜버!"], hype: 0.3 },
];

/** 물어보는 말이면 시청자가 대답한다 */
const QUESTION_WORDS = ["?", "뭐", "어때", "할까", "어떻게", "누구", "언제", "어디", "왜", "맞죠", "그죠", "알아"];
const ANSWERS = ["좋아요!!", "저는 찬성!", "ㅇㅇ 해주세요", "음... 글쎄요?", "무조건 하죠!", "아니요 ㅋㅋ", "저요!!"];

/** 규칙에 안 맞는 말에는 맞장구 */
const NODS = ["오 그렇구나", "맞아요 맞아", "진짜요??", "대박", "오오", "ㅇㅈ", "그래서요??"];

export function reactTo(text: string): Reaction {
  const said = text.trim();
  const replies: string[] = [];
  let hype = Math.min(0.2, said.length * 0.01);
  let subs = false;
  let likes = false;

  for (const rule of RULES) {
    if (replies.length >= 2) break;
    if (rule.words.some((w) => said.includes(w))) {
      replies.push(pick(rule.replies));
      hype += rule.hype ?? 0.2;
      subs ||= rule.subs ?? false;
      likes ||= rule.likes ?? false;
    }
  }
  if (QUESTION_WORDS.some((w) => said.includes(w))) {
    replies.push(pick(ANSWERS));
    hype += 0.15;
  }
  if (replies.length === 0 && said.length > 0) {
    // 들린 말 한 토막을 따라 하며 맞장구친다
    const words = said.split(/\s+/).filter((w) => w.length >= 2);
    replies.push(words.length > 0 && Math.random() < 0.5 ? `"${pick(words)}" ㅋㅋㅋ` : pick(NODS));
  }
  return { replies, hype: Math.min(0.8, hype), subs, likes };
}
