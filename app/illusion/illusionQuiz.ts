import { KINDS, specOf, type Kind, type KindSpec, type Params } from "./illusionSpec";

// ----------------------------------------------------------------------------
// 착시 퀴즈: 화면에 보이는 착시에 대해 묻는 4지선다 문제
// ----------------------------------------------------------------------------

export const QUIZ_LENGTH = 10;

export interface QuizQuestion {
  kind: Kind;
  params: Params;
  text: string;
  choices: string[];
  answer: number;
  explain: string;
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

/** 이 착시에서 "사실은 똑같은 것". */
const SAME_THING: Record<Kind, string> = {
  muller: "두 선의 길이",
  ponzo: "두 막대의 길이",
  ebbing: "가운데 두 원의 크기",
  vertical: "가로선과 세로선의 길이",
  cafe: "가로줄들의 기울기(모두 평행)",
  contrast: "두 네모의 색",
  hermann: "선의 색(전부 하얀색)",
};

type Maker = (spec: KindSpec) => Omit<QuizQuestion, "kind" | "params"> | null;

const MAKERS: Maker[] = [
  // 1. 이름 맞히기
  (spec) => {
    const others = shuffle(KINDS.filter((k) => k.key !== spec.key))
      .slice(0, 3)
      .map((k) => k.name);
    const choices = shuffle([spec.name, ...others]);
    return {
      text: "이 착시의 이름은 무엇일까요?",
      choices,
      answer: choices.indexOf(spec.name),
      explain: `정답은 "${spec.name}" 착시예요. ${spec.why}`,
    };
  },
  // 2. 사실은 무엇이 같은가
  (spec) => {
    const right = SAME_THING[spec.key];
    const others = shuffle(
      KINDS.filter((k) => k.key !== spec.key).map((k) => SAME_THING[k.key])
    )
      .filter((text) => text !== right)
      .slice(0, 3);
    const choices = shuffle([right, ...others]);
    return {
      text: "눈에는 달라 보이지만, 사실은 무엇이 똑같을까요?",
      choices,
      answer: choices.indexOf(right),
      explain: spec.answer,
    };
  },
  // 3. 더 강하게 만드는 방법
  (spec) => {
    const others = shuffle(KINDS.filter((k) => k.key !== spec.key))
      .slice(0, 3)
      .map((k) => k.tip);
    const choices = shuffle([spec.tip, ...others]);
    return {
      text: "이 착시를 더 강하게 만들려면 어떻게 해야 할까요?",
      choices,
      answer: choices.indexOf(spec.tip),
      explain: `${spec.tip} — 그러면 눈이 더 크게 속아요!`,
    };
  },
  // 4. 왜 그렇게 보일까
  (spec) => {
    const others = shuffle(KINDS.filter((k) => k.key !== spec.key))
      .slice(0, 3)
      .map((k) => k.why);
    const choices = shuffle([spec.why, ...others]);
    return {
      text: "왜 이렇게 보이는 걸까요?",
      choices,
      answer: choices.indexOf(spec.why),
      explain: spec.why,
    };
  },
];

export function makeQuestion(previousKind?: Kind): QuizQuestion {
  const spec = pick(KINDS.filter((k) => k.key !== previousKind));
  const made = pick(MAKERS)(spec);
  // 모든 메이커가 모든 착시에 대해 문제를 만들 수 있으므로 여기서 실패하지 않는다.
  if (made === null) return makeQuestion(previousKind);
  return { kind: spec.key, params: { ...specOf(spec.key).defaults }, ...made };
}
