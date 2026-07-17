"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// ----------------------------------------------------------------------------
// 끝말잇기 (Korean word-chain) vs 컴퓨터 — 난이도 4단계
// ----------------------------------------------------------------------------

type DiffKey = "easy" | "mid" | "hard" | "extreme" | "superextreme" | "boss" | "secret" | "ultra";

interface DiffCfg {
  key: DiffKey;
  label: string;
  emoji: string;
  time: number; // seconds per turn
  missRate: number; // chance computer "gives up" even if a word exists
  thinkMs: number; // computer thinking delay
  smart: boolean; // prefer hard-to-continue words (한방 전략)
  extreme: boolean;
  color: string;
  desc: string;
}

const DIFFS: DiffCfg[] = [
  { key: "easy", label: "쉬움", emoji: "😊", time: 150, missRate: 0.28, thinkMs: 1100, smart: false, extreme: false, color: "from-green-400 to-emerald-500", desc: "그래도 가끔 봐주는 컴퓨터" },
  { key: "mid", label: "중간", emoji: "🙂", time: 150, missRate: 0.05, thinkMs: 850, smart: true, extreme: false, color: "from-yellow-400 to-orange-500", desc: "제법 똑똑한 컴퓨터" },
  { key: "hard", label: "어려움", emoji: "😠", time: 150, missRate: 0, thinkMs: 600, smart: true, extreme: false, color: "from-orange-500 to-red-500", desc: "어려운 단어로 매섭게 공격!" },
  { key: "extreme", label: "익스트림", emoji: "💀", time: 150, missRate: 0, thinkMs: 350, smart: true, extreme: true, color: "from-red-600 to-purple-700", desc: "컴퓨터가 한방단어로 몰아붙여요" },
  { key: "superextreme", label: "슈퍼 익스트림", emoji: "☠️", time: 150, missRate: 0, thinkMs: 180, smart: true, extreme: true, color: "from-purple-700 via-fuchsia-800 to-black", desc: "최강 한방단어로 초고속 공격!" },
];

// --- 보스전 ---
interface Boss {
  name: string;
  emoji: string;
  hp: number;
  time: number;
  thinkMs: number;
  smart: boolean;
  extreme: boolean;
  bar: string; // HP 바 색
  scene: string; // 배경(화면) 그라데이션
  taunt: string;
  regen?: number; // 공격할 때마다 회복하는 체력 (무한의 진유현용)
}
const BOSSES: Boss[] = [
  { name: "느림보 달팽이", emoji: "🐌", hp: 16, time: 999, thinkMs: 1100, smart: false, extreme: false, bar: "from-lime-400 to-green-500", scene: "from-green-800 via-emerald-900 to-teal-950", taunt: "느긋하게 시작해볼까~" },
  { name: "강철 로봇", emoji: "🤖", hp: 26, time: 999, thinkMs: 800, smart: true, extreme: false, bar: "from-cyan-400 to-blue-500", scene: "from-slate-800 via-cyan-900 to-blue-950", taunt: "삐빅- 단어 분석 완료." },
  { name: "장난꾸러기 도깨비", emoji: "👹", hp: 36, time: 999, thinkMs: 600, smart: true, extreme: false, bar: "from-orange-400 to-red-500", scene: "from-orange-900 via-red-900 to-rose-950", taunt: "낄낄, 이건 어때?!" },
  { name: "폭풍의 드래곤", emoji: "🐉", hp: 48, time: 999, thinkMs: 420, smart: true, extreme: true, bar: "from-fuchsia-400 to-purple-500", scene: "from-purple-900 via-fuchsia-900 to-indigo-950", taunt: "크아앙! 불태워주마!" },
  { name: "끝말잇기 마왕", emoji: "👑", hp: 64, time: 999, thinkMs: 240, smart: true, extreme: true, bar: "from-amber-300 to-yellow-500", scene: "from-zinc-900 via-purple-950 to-black", taunt: "감히 나에게 도전하다니..." },
];
// 🤫 숨겨진 비밀 보스 (제목 3번 탭 또는 "진유현" 입력하면 해금)
const SECRET_BOSS: Boss = {
  name: "전설의 진유현", emoji: "🕶️", hp: 99, time: 999, thinkMs: 120, smart: true, extreme: true,
  bar: "from-pink-400 via-yellow-300 to-cyan-400", scene: "from-fuchsia-900 via-purple-900 to-black",
  taunt: "날 찾아내다니... 진짜 실력자군! 각오해라!",
};

// 🌌 최종 초-비밀 보스 (첫 비밀 해금 후 "무한의진유현" 연속 3번 외쳐야 해금)
const ULTRA_SECRET_BOSS: Boss = {
  name: "무한의 진유현", emoji: "🌌", hp: 200, time: 999, thinkMs: 90, smart: true, extreme: true, regen: 4,
  bar: "from-cyan-300 via-fuchsia-400 to-yellow-300", scene: "from-black via-purple-950 to-indigo-950",
  taunt: "나는 무한하다... 끝은 존재하지 않는다!",
};
function bossToCfg(b: Boss, key: DiffKey = "boss"): DiffCfg {
  return { key, label: b.name, emoji: b.emoji, time: b.time, missRate: 0, thinkMs: b.thinkMs, smart: b.smart, extreme: b.extreme, color: b.bar, desc: "" };
}

// --- 한글 낱말 사전 (2음절 이상 명사) ---
const DICT: string[] = [
  "가방","가족","가위","가게","가수","가슴","가을","간식","감자","강아지","개미","거미","거울","거북","건물","겨울","경찰","계란","고기","고양이",
  "고래","고구마","공책","공원","공기","과일","과자","교실","구름","구두","국수","군인","그림","극장","근육","글자","기차","기린","기타","김치",
  "나무","나비","나라","낙엽","날개","남자","냄비","냉장고","노래","노을","농구","눈물","늑대","다리","단추","달력","당근","대문","도시","도로",
  "도서관","독수리","돌고래","동생","돼지","두부","두더지","딸기","라디오","라면","레몬","로봇","마늘","마차","만두","매미","머리","먼지","메뚜기","모자",
  "목도리","무지개","문어","물감","미소","미역","바나나","바다","바람","바지","박쥐","반지","방석","배추","백조","버섯","버스","벌집","베개","병아리",
  "보물","복숭아","볼펜","부엌","북극","분수","불꽃","비누","비행기","사과","사슴","사자","산책","삼촌","상어","새우","생선","서점","석류","선물",
  "설탕","세수","소금","소나기","손가락","송아지","수박","수영","숟가락","시계","시장","신발","심장","아기","아침","안경","야구","약국","양파","어부",
  "얼음","여우","연필","열쇠","엽서","영화","오리","오이","옥수수","온도","왕자","요리","우산","우유","운동","원숭이","유리","은행","음악","의자",
  "이불","인형","자전거","잠자리","장갑","저녁","전화","젓가락","정원","제비","조개","종이","주머니","주사위","지갑","지도","지붕","진주","참새","창문",
  "책상","천둥","청소","초록","촛불","축구","치마","친구","침대","카메라","커피","컴퓨터","코끼리","콩나물","키위","타조","탁구","태양","택시","토끼",
  "토마토","통조림","파도","파랑","파리","팔찌","편지","포도","폭포","표범","풍선","하늘","하마","학교","한복","항아리","해바라기","향수","허리","호랑이",
  "호수","호박","홍시","화분","화장실","회오리","후추","휴지","이름","산삼","금괴","기와","와플","플라스틱","스키","키보드","드럼","럭비","비둘기","기차역",
  "역사","사탕","탕수육","육지","지구","구슬","슬리퍼","퍼즐","즐거움","움집","집게","게살","살구","구리","리본","본드","드라마","마술","술래","래퍼",
  // --- 확장 사전 ---
  "가락","가면","가마","가스","가시","가지","각도","간장","갈비","감기","감독","감기약","강물","강산","강줄기","개구리","개나리","개천","객실",
  "거리","거실","거인","거저리","건강","건포도","걸레","검객","검사","게시판","겨자","견과","결승","경기","경마","경비","경치","계곡","계단","계절",
  "고구려","고드름","고등어","고릴라","고물","고무","고비","고삐","고성","고집","곡식","곤충","골목","골짜기","곰팡이","공사","공주","공장","과속","관객",
  "관광","광부","광선","교문","교통","구멍","구석","구조","국화","군대","군밤","굴뚝","궁궐","궁수","권투","귀신","그늘","그물","극지",
  "근처","금고","금붕어","금성","기계","기록","기름","기사","기억","기와집","기저귀","기적","길목","김밥","까마귀","까치","깃발","깍두기","깨소금","꼬리",
  "꽃게","꽃병","꿀벌","나룻배","나사","나침반","나팔","낚시","난로","날씨","남극","남매","납치","낭떠러지","냇가","냉면","너구리","넝쿨","넥타이",
  "노른자","노트","녹차","놀이터","농부","농사","농약","누룽지","눈사람","눈싸움","느티나무","다람쥐","다슬기","다이아몬드","단풍","달걀","달팽이","담벼락","담요",
  "당나귀","대나무","대장","대추","대통령","댄서","더위","덤불","덧셈","덩굴","도끼","도넛","도라지","도마","도토리","독기","돌멩이","돌잔치","동굴","동네",
  "동전","동화","돛단배","된장","두루미","두루마기","두통","둥지","뒤꿈치","등대","등불","등산","딱따구리","딱지","땅콩","떡볶이","뚜껑","라일락","레이스","로켓",
  "루비","마당","마룻바닥","마을","마이크","막대기","만화","말썽","맷돌","맹수","머루","머슴","멍석","메기","메밀","멜론","면도기","명함","모기",
  "모래성","목걸이","목련","목수","목장","목화","몽둥이","묘목","무당벌레","무릎","무술","무용","무화과","문방구","문지방","물개","물레","물병","물통",
  "미꾸라지","미나리","미로","미술","민들레","밀가루","밀림","바구니","바늘","바둑","바이올린","박물관","박수","반달","반딧불","발톱","밤송이","방망이","방울",
  "배꼽","배낭","배터리","백사장","뱃사공","버드나무","버릇","버찌","번개","벌레","범인","벚꽃","벽돌","벽지","별똥별","병원","보름달","보리","보석",
  "보자기","복덩이","복도","볶음밥","봉선화","봉투","부채","부침개","분필","불가사리","불빛","붕대","붕어","블록","비녀","비석","비올라","빙수","빙판","빨래",
  "빨판","빵집","뻐꾸기","뿌리","사냥꾼","사다리","사막","사무실","사슬","사탕수수","산등성이","산딸기","산속","산소","산신령","살구나무","삼겹살","상자",
  "상추","새싹","색연필","샘물","생강","생쥐","서랍","서리","석고","석탄","선반","선인장","선장","선풍기","설거지","성게","성벽","성탄절","세면대",
  "세탁기","소나무","소매","소방관","소설","소풍","속담","손수건","손톱","솔개","솜사탕","송사리","송편","수건","수달","수레","수선화","수세미","수수께끼","수염",
  "수제비","수족관","순대","술병","숲속","스승","스웨터","스카프","스케치","슬픔","습기","승리","시냇물","시금치","시멘트","시소","식빵","식초","신문",
  "신비","실내화","심부름","싱크대","쌍둥이","쓰레기","씨앗","아궁이","아저씨","아파트","악어","안개","안장","알사탕","앵무새","야채","약수터","양배추","양초","양탄자",
  "어깨","어금니","얼룩말","엄지","여치","연기","연못","연잎","열매","염소","엽전","영양","영웅","예술","오두막","오솔길","오징어","오케스트라","옹기","완두콩",
  "왕관","외양간","요구르트","요정","용궁","용수철","우물","우표","운석","울타리","웅덩이","원두막","원피스","월계관","위성","유람선","유리병","유령","유채","윷놀이",
  "은하수","음료수","이끼","이삭","이슬","인삼","일기","임금","입술","잉어","잎사귀","자갈","자두","자석","자수","작살","잔디밭","잠수함","장구","장미",
  "장수풍뎅이","저울","저택","적갈색","전구","전봇대","절벽","젖소","제기","조약돌","족제비","졸음","종달새","종소리","주말","주먹밥","주전자","죽순","줄넘기","줄기",
  "쥐약","증기","지렁이","지팡이","진돗개","진달래","진흙","질경이","징검다리","짚신","쪽지","찌개","차돌","찰흙","참기름","참외","창고","창살","채소","책가방",
  "천막","철사","첨성대","청개구리","청둥오리","청포도","초가집","초승달","초음파","촛대","총각","추석","축제","춘장","치약","칠판","침엽수","카누","카드",
  "카펫","칸막이","칼자루","캥거루","커튼","코뿔소","콩나물국","크레용","클로버","키다리","타악기","타이어","탁자","탄광","태권도","태풍","털모자","털실","텃밭",
  "토란","톱니","통나무","투구","튤립","트럭","티눈","파김치","파인애플","파초","판다","팔각형","팥죽","팽이","펭귄","편지지","포수","포장마차","폭죽","표주박",
  "푸성귀","풀숲","풀잎","풍뎅이","피라미","피리","피망","하숙집","하품","한강","한숨","할미꽃","항구","해골","해녀","해삼","해파리","햇살","향나무","허깨비",
  "헛간","헝겊","현미경","호두","호루라기","호밀","호미","혹부리","홀씨","홍당무","홍합","화살","화음","화젓가락","환풍기","황소","횃불","횡단보도","후춧가루",
  "훈장","휘파람","흙탕물","흰쌀","히아신스",
];

// --- 한글 초/중/종성 분해 & 두음법칙 ---
const SBASE = 0xac00;
function decompose(ch: string): [number, number, number] | null {
  const c = ch.charCodeAt(0) - SBASE;
  if (c < 0 || c >= 11172) return null;
  return [Math.floor(c / 588), Math.floor((c % 588) / 28), c % 28];
}
function compose(cho: number, jung: number, jong: number) {
  return String.fromCharCode(SBASE + (cho * 21 + jung) * 28 + jong);
}
// 다음 단어가 시작할 수 있는 음절들 (두음법칙 포함)
function acceptableStarts(syl: string): string[] {
  const d = decompose(syl);
  if (!d) return [syl];
  const [cho, jung, jong] = d;
  const set = new Set<string>([syl]);
  if (cho === 5) {
    // ㄹ → ㅇ (리,력,료,류,례,래) 또는 ㄴ (라,로,루,르,뢰)
    const toIeung = [20, 2, 6, 7, 12, 17, 1]; // ㅣㅑㅕㅖㅛㅠㅐ
    set.add(compose(toIeung.includes(jung) ? 11 : 2, jung, jong));
  } else if (cho === 2) {
    // ㄴ → ㅇ (녀,뇨,뉴,니)
    const toIeung = [20, 6, 12, 17];
    if (toIeung.includes(jung)) set.add(compose(11, jung, jong));
  }
  return [...set];
}
const isHangulWord = (w: string) => /^[가-힣]{2,}$/.test(w);

interface Entry {
  who: "me" | "com";
  word: string;
}

export default function WordChainPage() {
  const [screen, setScreen] = useState<"menu" | "play" | "over">("menu");
  const [diff, setDiff] = useState<DiffCfg>(DIFFS[1]);
  const [history, setHistory] = useState<Entry[]>([]);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [turn, setTurn] = useState<"me" | "com">("me");
  const [timeLeft, setTimeLeft] = useState(13);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<Record<string, number>>({});

  // 보스전 상태
  const [mode, setMode] = useState<"normal" | "boss">("normal");
  const [bossIdx, setBossIdx] = useState(0);
  const [bossHp, setBossHp] = useState(0);
  const [playerHp, setPlayerHp] = useState(3);
  const [bossHit, setBossHit] = useState(false);
  const [playerHurt, setPlayerHurt] = useState(false);
  const [transition, setTransition] = useState<{ defeated: Boss; next: Boss } | null>(null);
  const [timerKey, setTimerKey] = useState(0); // 타이머 강제 재시작용
  const [bossList, setBossList] = useState<Boss[]>(BOSSES);
  const bossListRef = useRef<Boss[]>(BOSSES);
  const setBList = (l: Boss[]) => { bossListRef.current = l; setBossList(l); };
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [ultraUnlocked, setUltraUnlocked] = useState(false);
  const tapRef = useRef<{ n: number; t: number }>({ n: 0, t: 0 });
  const ultraSeqRef = useRef(0); // "무한의진유현" 연속 입력 횟수

  const modeRef = useRef<"normal" | "boss">("normal");
  const bossIdxRef = useRef(0);
  const bossHpRef = useRef(0);
  const playerHpRef = useRef(3);

  const setBHp = (v: number) => { bossHpRef.current = v; setBossHp(v); };
  const setPHp = (v: number) => { playerHpRef.current = v; setPlayerHp(v); };
  const setBIdx = (v: number) => { bossIdxRef.current = v; setBossIdx(v); };
  const setModeBoth = (v: "normal" | "boss") => { modeRef.current = v; setMode(v); };

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const comTO = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transTO = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashBoss = () => { setBossHit(true); setTimeout(() => setBossHit(false), 240); };

  useEffect(() => {
    const b: Record<string, number> = {};
    for (const d of DIFFS) b[d.key] = parseInt(localStorage.getItem(`wordchain-best-${d.key}`) || "0", 10) || 0;
    b["boss"] = parseInt(localStorage.getItem("wordchain-best-boss") || "0", 10) || 0;
    b["secret"] = parseInt(localStorage.getItem("wordchain-best-secret") || "0", 10) || 0;
    b["ultra"] = parseInt(localStorage.getItem("wordchain-best-ultra") || "0", 10) || 0;
    setBest(b);
    if (localStorage.getItem("wordchain-secret") === "1") setSecretUnlocked(true);
    if (localStorage.getItem("wordchain-ultra") === "1") setUltraUnlocked(true);
  }, []);

  // 🤫 제목 7번 연속 탭 → 비밀 보스 해금
  const onTitleTap = () => {
    const now = Date.now();
    const s = tapRef.current;
    s.n = now - s.t < 1500 ? s.n + 1 : 1;
    s.t = now;
    if (s.n >= 3) unlockSecret();
  };

  const unlockSecret = () => {
    if (secretUnlocked) {
      setMsg("🕶️ 비밀 보스는 이미 해금되어 있어요! 메뉴에서 골라보세요.");
      return;
    }
    setSecretUnlocked(true);
    localStorage.setItem("wordchain-secret", "1");
    setMsg("🕶️✨ 비밀 보스 '전설의 진유현'이 해금되었다! 메뉴를 확인하세요!");
  };

  const unlockUltra = () => {
    if (ultraUnlocked) {
      setMsg("🌌 '무한의 진유현'은 이미 각성했다! 메뉴에서 도전하세요.");
      return;
    }
    setUltraUnlocked(true);
    localStorage.setItem("wordchain-ultra", "1");
    setMsg("🌌💫 무한의 진유현이 각성했다!! 최종 히든 보스 해금!!!");
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, turn]);

  useEffect(() => () => {
    if (comTO.current) clearTimeout(comTO.current);
    if (transTO.current) clearTimeout(transTO.current);
  }, []);

  const endGame = useCallback((res: "win" | "lose") => {
    if (comTO.current) clearTimeout(comTO.current);
    setResult(res);
    setScreen("over");
    setScore((sc) => {
      setBest((prev) => {
        if (sc > (prev[diff.key] ?? 0)) {
          const next = { ...prev, [diff.key]: sc };
          localStorage.setItem(`wordchain-best-${diff.key}`, String(sc));
          return next;
        }
        return prev;
      });
      return sc;
    });
  }, [diff.key]);

  // 보스 격파 → 다음 보스 (화면 전환)
  const advanceBoss = useCallback(() => {
    setScore((s) => s + 1); // 격파한 보스 수
    const list = bossListRef.current;
    const nextIdx = bossIdxRef.current + 1;
    if (nextIdx >= list.length) {
      setMsg("👑 모든 보스를 물리쳤다! 완전 클리어! 🎉");
      endGame("win");
      return;
    }
    const cur = list[bossIdxRef.current];
    const nb = list[nextIdx];
    setTurn("com"); // 전환 중 입력 잠금
    setTransition({ defeated: cur, next: nb });
    if (transTO.current) clearTimeout(transTO.current);
    transTO.current = setTimeout(() => {
      setBIdx(nextIdx);
      setBHp(nb.hp);
      setDiff(bossToCfg(nb));
      setHistory([]);
      setUsed(new Set());
      setInput("");
      setTransition(null);
      setMsg(`${nb.emoji} ${nb.name} 등장! "${nb.taunt}"`);
      setTurn("me");
      setTimeout(() => inputRef.current?.focus(), 50);
    }, 1600);
  }, [endGame]);

  // 시간 초과 처리
  const handleTimeout = useCallback(() => {
    if (modeRef.current === "boss") {
      const hp = playerHpRef.current - 1;
      setPHp(hp);
      setPlayerHurt(true);
      setTimeout(() => setPlayerHurt(false), 400);
      if (hp <= 0) {
        setMsg("💀 하트를 모두 잃었다... 패배!");
        endGame("lose");
      } else {
        setMsg(`⏰ 시간 초과! 하트 -1 💔 (남은 하트 ${hp})  다시 아무 단어나!`);
        setHistory([]); // 체인 리셋 → 아무 단어나 가능
        setTurn("me");
        setTimerKey((k) => k + 1); // 타이머 재시작 보장
      }
    } else {
      setMsg("⏰ 시간 초과!");
      endGame("lose");
    }
  }, [endGame]);

  // 턴 타이머
  useEffect(() => {
    if (screen !== "play" || turn !== "me" || transition) return;
    setTimeLeft(diff.time);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        const n = +(t - 0.1).toFixed(1);
        if (n <= 0) {
          clearInterval(id);
          handleTimeout();
          return 0;
        }
        return n;
      });
    }, 100);
    return () => clearInterval(id);
  }, [screen, turn, diff.time, handleTimeout, history.length, transition, timerKey]);

  const start = (d: DiffCfg) => {
    setModeBoth("normal");
    setDiff(d);
    setHistory([]);
    setUsed(new Set());
    setInput("");
    setTurn("me");
    setTimeLeft(d.time);
    setMsg("아무 단어나 입력해서 시작하세요!");
    setResult(null);
    setScore(0);
    setTransition(null);
    setScreen("play");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const launchBoss = (list: Boss[], key: DiffKey) => {
    setModeBoth("boss");
    setBList(list);
    const b = list[0];
    setBIdx(0);
    setBHp(b.hp);
    setPHp(3);
    setDiff(bossToCfg(b, key));
    setHistory([]);
    setUsed(new Set());
    setInput("");
    setTurn("me");
    setTimeLeft(b.time);
    setMsg(`${b.emoji} ${b.name} 등장! "${b.taunt}"`);
    setResult(null);
    setScore(0);
    setTransition(null);
    setScreen("play");
    setTimeout(() => inputRef.current?.focus(), 50);
  };
  const startBoss = () => launchBoss(BOSSES, "boss");
  const startSecretBoss = () => launchBoss([SECRET_BOSS], "secret");
  const startUltraBoss = () => launchBoss([ULTRA_SECRET_BOSS], "ultra");

  // 컴퓨터 차례
  const computerMove = useCallback(
    (lastWord: string, usedSet: Set<string>) => {
      const lastSyl = lastWord[lastWord.length - 1];
      const starts = acceptableStarts(lastSyl);
      const candidates = DICT.filter((w) => isHangulWord(w) && !usedSet.has(w) && starts.includes(w[0]));

      const fail = () => {
        if (modeRef.current === "boss") {
          // 보스가 답 못함 → 큰 피해
          const dmg = 8;
          const nh = bossHpRef.current - dmg;
          setBHp(Math.max(0, nh));
          flashBoss();
          if (nh <= 0) {
            setMsg(`보스가 말문이 막혔다! 강타 -${dmg} 💥`);
            advanceBoss();
          } else {
            setMsg(`보스가 "${lastSyl}"에서 막혔다! 강타 -${dmg}! 💥 아무 단어나 이어가세요!`);
            setHistory([]); // 체인 리셋
            setTurn("me");
            setTimeout(() => inputRef.current?.focus(), 50);
          }
          return;
        }
        setMsg(`💡 컴퓨터가 "${lastSyl}"(으)로 시작하는 단어를 못 찾았어요!`);
        endGame("win");
      };

      if (candidates.length === 0 || Math.random() < diff.missRate) {
        comTO.current = setTimeout(fail, diff.thinkMs);
        return;
      }

      // 전략: 어려움/익스트림은 상대가 잇기 힘든 단어(한방)를 고름
      let pick: string;
      if (diff.smart) {
        const scored = candidates.map((w) => {
          const nextStarts = acceptableStarts(w[w.length - 1]);
          const cont = DICT.filter((x) => x !== w && !usedSet.has(x) && nextStarts.includes(x[0])).length;
          return { w, cont };
        });
        scored.sort((a, b) => a.cont - b.cont);
        const pool = diff.extreme ? scored.slice(0, 1) : scored.slice(0, 3);
        pick = pool[Math.floor(Math.random() * pool.length)].w;
      } else {
        pick = candidates[Math.floor(Math.random() * candidates.length)];
      }

      comTO.current = setTimeout(() => {
        const next = new Set(usedSet);
        next.add(pick);
        setUsed(next);
        setHistory((h) => [...h, { who: "com", word: pick }]);
        const tail = pick[pick.length - 1];
        // 🌌 무한 회복 보스: 공격할 때마다 체력 회복
        let healNote = "";
        const cb = bossListRef.current[bossIdxRef.current];
        if (modeRef.current === "boss" && cb?.regen && bossHpRef.current > 0) {
          const healed = Math.min(cb.hp, bossHpRef.current + cb.regen);
          const delta = healed - bossHpRef.current;
          if (delta > 0) {
            setBHp(healed);
            healNote = ` (♻️+${delta} 회복!)`;
          }
        }
        setMsg(
          modeRef.current === "boss"
            ? `${diff.emoji} 보스: "${pick}"! 이제 "${tail}"(으)로 반격!${healNote}`
            : `컴퓨터: "${pick}" → 이제 "${tail}"(으)로 시작!`
        );
        setTurn("me");
        setTimeout(() => inputRef.current?.focus(), 50);
      }, diff.thinkMs);
    },
    [diff, endGame, advanceBoss]
  );

  const submit = () => {
    if (turn !== "me" || screen !== "play") return;
    const w = input.trim();
    // 🤫 비밀 단어 → 비밀 보스 해금
    if (w === "진유현") {
      ultraSeqRef.current = 0;
      unlockSecret();
      setInput("");
      return;
    }
    // 🌌 초-비밀: (첫 비밀 해금 후) "무한의진유현" 연속 3번
    if (secretUnlocked && w === "무한의진유현") {
      ultraSeqRef.current += 1;
      setInput("");
      if (ultraSeqRef.current >= 3) {
        ultraSeqRef.current = 0;
        unlockUltra();
      } else {
        setMsg(`🌌 무한의 기운이 소용돌이친다... 계속 외쳐라! (${ultraSeqRef.current}/3)`);
      }
      return;
    }
    ultraSeqRef.current = 0; // 연속 끊김
    if (!isHangulWord(w)) {
      setMsg("⚠️ 2글자 이상 한글 단어를 입력하세요.");
      return;
    }
    if (used.has(w)) {
      setMsg(`⚠️ "${w}" 은(는) 이미 사용했어요!`);
      return;
    }
    const last = history[history.length - 1];
    if (last) {
      const need = last.word[last.word.length - 1];
      const starts = acceptableStarts(need);
      if (!starts.includes(w[0])) {
        const alt = starts.length > 1 ? ` (또는 ${starts.slice(1).join(", ")})` : "";
        setMsg(`⚠️ "${need}"${alt}(으)로 시작해야 해요!`);
        return;
      }
    }
    // 성공
    const next = new Set(used);
    next.add(w);
    setUsed(next);
    setHistory((h) => [...h, { who: "me", word: w }]);
    setInput("");

    if (mode === "boss") {
      const dmg = w.length; // 긴 단어일수록 강한 공격
      const nh = bossHpRef.current - dmg;
      setBHp(Math.max(0, nh));
      flashBoss();
      if (nh <= 0) {
        setMsg(`"${w}" 필살 공격! -${dmg} 💥`);
        advanceBoss();
      } else {
        setTurn("com");
        setMsg(`"${w}" 공격! 보스에게 -${dmg} 대미지! 🗡️`);
        computerMove(w, next);
      }
      return;
    }

    setScore((s) => s + 1);
    setTurn("com");
    setMsg("컴퓨터가 생각 중... 🤔");
    computerMove(w, next);
  };

  const timePct = Math.max(0, (timeLeft / diff.time) * 100);
  const curBoss = bossList[bossIdx] ?? bossList[0];
  const sceneBg = mode === "boss" ? curBoss.scene : "from-amber-900 via-orange-900 to-red-950";

  return (
    <main className={`flex min-h-screen flex-col items-center gap-3 bg-gradient-to-b ${sceneBg} px-4 py-5 text-white transition-[background] duration-700`}>
      <div className="flex w-full max-w-[420px] items-center justify-between">
        <Link href="/" className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20">
          ← 홈
        </Link>
        <h1 onClick={onTitleTap} className="cursor-pointer select-none text-lg font-bold text-amber-200">
          🔤 끝말잇기
        </h1>
        <div className="w-12" />
      </div>

      {/* MENU */}
      {screen === "menu" && (
        <div className="mt-4 flex w-full max-w-[420px] flex-col gap-4">
          <div className="rounded-2xl bg-black/25 p-6 text-center">
            <div className="text-6xl">🔤</div>
            <h2 className="mt-2 text-2xl font-extrabold text-amber-200">끝말잇기 대결</h2>
            <p className="mt-1 text-sm text-amber-100/80">컴퓨터와 단어를 이어가세요! 난이도를 골라주세요.</p>
          </div>
          {/* 보스전 */}
          <button
            onClick={startBoss}
            className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-purple-700 via-red-700 to-orange-600 px-5 py-5 text-left shadow-[0_0_25px_rgba(220,38,38,0.5)] ring-2 ring-yellow-400/60 transition active:scale-95"
          >
            <div>
              <div className="text-2xl font-extrabold text-white drop-shadow">👑 보스전</div>
              <div className="text-xs text-yellow-100/90">5마리 보스를 단어로 물리쳐라! 화면이 바뀐다!</div>
            </div>
            <div className="text-right text-xs text-yellow-100/90">
              <div>🐌🤖👹🐉👑</div>
              <div>🏆 {best["boss"] ?? 0}</div>
            </div>
          </button>

          {/* 🤫 숨겨진 비밀 보스 (해금 시에만 표시) */}
          {secretUnlocked && (
            <button
              onClick={startSecretBoss}
              className="flex animate-pulse items-center justify-between rounded-2xl bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400 px-5 py-4 text-left shadow-[0_0_25px_rgba(236,72,153,0.6)] ring-2 ring-white/70 transition active:scale-95"
            >
              <div>
                <div className="text-xl font-extrabold text-black drop-shadow">🕶️ 비밀 보스</div>
                <div className="text-xs text-black/80">전설의 진유현! (HP 99)</div>
              </div>
              <div className="text-right text-xs font-bold text-black/80">
                <div>✨히든✨</div>
                <div>🏆 {best["secret"] ?? 0}</div>
              </div>
            </button>
          )}

          {/* 🌌 최종 초-비밀 보스 (해금 시에만) */}
          {ultraUnlocked && (
            <button
              onClick={startUltraBoss}
              className="relative flex animate-pulse items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 px-5 py-4 text-left shadow-[0_0_35px_rgba(217,70,239,0.8)] ring-2 ring-white transition active:scale-95"
            >
              <div>
                <div className="text-xl font-extrabold text-black drop-shadow">🌌 무한의 진유현</div>
                <div className="text-xs text-black/80">최종 히든! 회복하는 무한 보스 (HP 200)</div>
              </div>
              <div className="text-right text-xs font-bold text-black/80">
                <div>💫최종💫</div>
                <div>🏆 {best["ultra"] ?? 0}</div>
              </div>
            </button>
          )}

          <div className="mt-1 text-center text-xs text-amber-100/60">
            — 또는 자유 대결 —
            {!secretUnlocked && <span className="ml-1 opacity-40">🤫</span>}
          </div>

          <div className="flex flex-col gap-3">
            {DIFFS.map((d) => (
              <button
                key={d.key}
                onClick={() => start(d)}
                className={`flex items-center justify-between rounded-2xl bg-gradient-to-r ${d.color} px-5 py-4 text-left shadow-lg transition active:scale-95`}
              >
                <div>
                  <div className="text-xl font-extrabold text-white drop-shadow">
                    {d.emoji} {d.label}
                  </div>
                  <div className="text-xs text-white/90">{d.desc}</div>
                </div>
                <div className="text-right text-xs text-white/90">
                  <div>⏱️ {d.time}초</div>
                  <div>🏆 {best[d.key] ?? 0}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PLAY */}
      {screen === "play" && (
        <div className="flex w-full max-w-[420px] flex-col gap-3">
          <div className="flex items-center justify-between rounded-xl bg-black/25 px-4 py-2 text-sm">
            <span className={`rounded-full bg-gradient-to-r ${diff.color} px-3 py-1 font-bold`}>
              {diff.emoji} {mode === "boss" ? `보스 ${bossIdx + 1}/${bossList.length}` : diff.label}
            </span>
            {mode === "boss" ? (
              <span className={`text-lg tracking-wide ${playerHurt ? "animate-pulse" : ""}`}>
                {"❤️".repeat(Math.max(0, playerHp))}
                {"🖤".repeat(Math.max(0, 3 - playerHp))}
              </span>
            ) : (
              <span className="text-amber-100">이은 단어 <b className="text-amber-300">{score}</b></span>
            )}
          </div>

          {/* 보스 패널 */}
          {mode === "boss" && (
            <div className="flex items-center gap-3 rounded-2xl bg-black/30 p-3">
              <div
                className={`text-5xl transition-transform duration-150 ${bossHit ? "scale-125 -rotate-12" : "scale-100"}`}
                style={{ filter: bossHit ? "drop-shadow(0 0 10px #f87171)" : "none" }}
              >
                {curBoss.emoji}
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between text-sm font-bold">
                  <span className="text-white">{curBoss.name}</span>
                  <span className="text-red-300">HP {Math.max(0, bossHp)}/{curBoss.hp}</span>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-full bg-black/40">
                  <div
                    className={`h-full bg-gradient-to-r ${curBoss.bar} transition-all duration-300`}
                    style={{ width: `${Math.max(0, (bossHp / curBoss.hp) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 타이머 바 */}
          <div className="h-3 w-full overflow-hidden rounded-full bg-black/30">
            <div
              className={`h-full transition-all duration-100 ${timePct < 30 ? "bg-red-500" : timePct < 60 ? "bg-yellow-400" : "bg-green-400"}`}
              style={{ width: `${timePct}%` }}
            />
          </div>

          {/* 대화 로그 */}
          <div ref={scrollRef} className="flex h-64 flex-col gap-2 overflow-y-auto rounded-2xl bg-black/20 p-3">
            {history.length === 0 && (
              <div className="m-auto text-center text-sm text-amber-100/60">
                아무 단어나 입력해서 시작하세요!<br />예) 사과, 나무, 학교…
              </div>
            )}
            {history.map((e, i) => (
              <div key={i} className={`flex ${e.who === "me" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-lg font-bold shadow ${
                    e.who === "me" ? "bg-amber-400 text-amber-950" : "bg-slate-700 text-white"
                  }`}
                >
                  {e.who === "com" && <span className="mr-1">🤖</span>}
                  {e.word}
                </div>
              </div>
            ))}
            {turn === "com" && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-700 px-4 py-2 text-lg">🤖 …</div>
              </div>
            )}
          </div>

          {/* 안내 메시지 */}
          <div className="min-h-[2.5rem] rounded-lg bg-black/20 px-3 py-2 text-center text-sm text-amber-100">
            {msg}
          </div>

          {/* 입력 */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              disabled={turn !== "me"}
              placeholder={turn === "me" ? "단어 입력…" : "컴퓨터 차례…"}
              className="flex-1 rounded-xl bg-white/95 px-4 py-3 text-lg font-bold text-amber-950 outline-none placeholder:text-amber-950/40 disabled:opacity-50"
            />
            <button
              onClick={submit}
              disabled={turn !== "me"}
              className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-lg font-extrabold text-amber-950 shadow active:scale-95 disabled:opacity-40"
            >
              입력
            </button>
          </div>
          <button onClick={() => endGame("lose")} className="text-xs text-amber-200/60 underline">
            포기하기
          </button>
        </div>
      )}

      {/* 화면 전환 (보스 격파) */}
      {transition && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-7xl opacity-50 grayscale">{transition.defeated.emoji}</div>
            <div className="mt-1 text-xl font-bold text-red-400">💥 {transition.defeated.name} 격파!</div>
          </div>
          <div className="animate-pulse text-3xl text-white/40">▼ ▼ ▼</div>
          <div className="animate-bounce text-center">
            <div className="text-8xl drop-shadow-[0_0_25px_rgba(250,204,21,0.6)]">{transition.next.emoji}</div>
            <div className="mt-2 text-2xl font-extrabold text-yellow-300">{transition.next.name} 등장!</div>
            <div className="mt-1 text-sm text-yellow-100/80">&quot;{transition.next.taunt}&quot;</div>
          </div>
        </div>
      )}

      {/* OVER */}
      {screen === "over" && (
        <div className="mt-6 flex w-full max-w-[420px] flex-col items-center gap-4 rounded-2xl bg-black/30 p-8 text-center">
          <div className="text-7xl">{result === "win" ? "🏆" : "😢"}</div>
          <h2 className={`text-3xl font-extrabold ${result === "win" ? "text-amber-300" : "text-red-300"}`}>
            {mode === "boss" ? (result === "win" ? "완전 클리어!" : "패배...") : result === "win" ? "승리!" : "패배..."}
          </h2>
          <p className="text-sm text-amber-100/90">{msg}</p>
          <div className="rounded-xl bg-black/25 px-6 py-3">
            {mode === "boss" ? (
              <>
                <div className="text-sm text-amber-100/80">{diff.key === "ultra" ? "🌌 무한 보스전" : diff.key === "secret" ? "🕶️ 비밀 보스전" : "👑 보스전"}</div>
                <div className="text-lg">물리친 보스 <b className="text-2xl text-amber-300">{score}</b> / {bossList.length}</div>
                <div className="text-xs text-amber-200/70">최고 기록: {best[diff.key] ?? 0}마리</div>
              </>
            ) : (
              <>
                <div className="text-sm text-amber-100/80">{diff.emoji} {diff.label} 난이도</div>
                <div className="text-lg">이은 단어 <b className="text-2xl text-amber-300">{score}</b>개</div>
                <div className="text-xs text-amber-200/70">최고 기록: {best[diff.key] ?? 0}개</div>
              </>
            )}
          </div>
          {score > 0 && score >= (best[diff.key] ?? 0) && (
            <div className="text-sm font-bold text-green-300">🎉 신기록 달성!</div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => (mode === "boss" ? (diff.key === "ultra" ? startUltraBoss() : diff.key === "secret" ? startSecretBoss() : startBoss()) : start(diff))}
              className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 font-bold text-amber-950 active:scale-95"
            >
              다시 하기 🔄
            </button>
            <button onClick={() => setScreen("menu")} className="rounded-full bg-white/10 px-6 py-3 font-bold active:scale-95">
              메뉴로
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
