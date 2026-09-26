import { BASES, baseInfo, DEFAULT_PARAMS, getBase, vertexAngleSum, type BaseInfo, type ShapeParams } from "./shapeGeometry";

// ----------------------------------------------------------------------------
// 도형 퀴즈: 화면에 보이는 도형에 대해 묻는 4지선다 문제
// ----------------------------------------------------------------------------

export const QUIZ_LENGTH = 10;

export interface QuizQuestion {
  shape: ShapeParams;
  text: string;
  choices: string[];
  answer: number; // choices 안의 정답 위치
  explain: string;
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

function numberChoices(answer: number, unit = ""): { choices: string[]; answer: number } {
  const spread = Math.max(2, Math.round(answer * 0.25));
  const set = new Set<number>([answer]);
  while (set.size < 4) {
    const d = (Math.floor(Math.random() * spread) + 1) * (Math.random() < 0.5 ? -1 : 1);
    if (answer + d > 0) set.add(answer + d);
  }
  const choices = shuffle([...set]);
  return { choices: choices.map((n) => `${n}${unit}`), answer: choices.indexOf(answer) };
}

const SIDES_NAME: Record<number, string> = { 3: "삼각형", 4: "사각형", 5: "오각형", 6: "육각형" };

type Maker = (info: BaseInfo) => Omit<QuizQuestion, "shape"> | null;

const MAKERS: Maker[] = [
  (info) => {
    const n = getBase(info.key).faces.length;
    return { text: "이 도형의 면은 모두 몇 개일까요?", ...numberChoices(n, "개"), explain: `${info.name}의 면은 ${n}개예요.` };
  },
  (info) => {
    const n = getBase(info.key).verts.length;
    return { text: "꼭짓점(뾰족한 점)은 모두 몇 개일까요?", ...numberChoices(n, "개"), explain: `${info.name}의 꼭짓점은 ${n}개예요.` };
  },
  (info) => {
    const b = getBase(info.key);
    const v = b.verts.length;
    const f = b.faces.length;
    return {
      text: "모서리(선)는 모두 몇 개일까요?",
      ...numberChoices(b.edges, "개"),
      explain: `꼭짓점 ${v} − 모서리 ${b.edges} + 면 ${f} = 2 (오일러 공식)이에요!`,
    };
  },
  (info) => {
    if (!info.platonic) return null;
    const n = Number(info.perVertex);
    return { text: "한 꼭짓점에 면이 몇 개씩 모일까요?", ...numberChoices(n, "개"), explain: `${info.name}은(는) 한 꼭짓점에 ${info.faceShape} ${n}개가 모여요.` };
  },
  (info) => {
    if (!info.platonic) return null;
    const sum = Math.round(vertexAngleSum({ ...DEFAULT_PARAMS, base: info.key }, 0));
    const opts = shuffle([...new Set([sum, 180, 240, 270, 300, 324, 360])].filter((n) => n !== sum)).slice(0, 3);
    const choices = shuffle([sum, ...opts]);
    return {
      text: "한 꼭짓점에 모인 각을 모두 더하면 몇 도일까요?",
      choices: choices.map((n) => `${n}°`),
      answer: choices.indexOf(sum),
      explain: `${sum}°예요. 360°보다 ${360 - sum}° 모자라서 꼭짓점이 뾰족하게 튀어나와요!`,
    };
  },
  (info) => {
    const sides = new Set(getBase(info.key).faces.map((f) => f.length));
    if (sides.size !== 1) return null;
    const s = [...sides][0];
    const choices = shuffle(Object.values(SIDES_NAME));
    return { text: "이 도형의 면은 어떤 모양일까요?", choices, answer: choices.indexOf(SIDES_NAME[s]), explain: `${info.name}의 면은 모두 ${SIDES_NAME[s]}이에요.` };
  },
  (info) => {
    if (!info.dual) return null;
    const dual = baseInfo(info.dual);
    const others = shuffle(BASES.filter((b) => b.key !== dual.key)).slice(0, 3).map((b) => b.name);
    const choices = shuffle([dual.name, ...others]);
    return {
      text: "이 도형의 짝꿍(쌍대) 도형은 무엇일까요?",
      choices,
      answer: choices.indexOf(dual.name),
      explain: `면 가운데 점을 이으면 ${dual.name}이(가) 나와요.${dual.key === info.key ? " 자기 자신이 짝꿍이에요!" : ""}`,
    };
  },
  (info) => {
    if (!info.platonic || info.dihedral === null) return null;
    const all = BASES.filter((b) => b.platonic && b.dihedral !== null).map((b) => b.dihedral as number);
    const choices = shuffle(all.filter((d) => d !== info.dihedral)).slice(0, 3).concat(info.dihedral);
    const mixed = shuffle(choices);
    return {
      text: "이웃한 두 면 사이의 각도(이면각)는 약 몇 도일까요?",
      choices: mixed.map((d) => `약 ${d.toFixed(1)}°`),
      answer: mixed.indexOf(info.dihedral),
      explain: `${info.name}의 면과 면은 약 ${info.dihedral}°로 만나요. 면이 많을수록 이 각이 커져서 공처럼 둥글어져요.`,
    };
  },
  (info) => {
    const others = shuffle(BASES.filter((b) => b.key !== info.key)).slice(0, 3).map((b) => b.name);
    const choices = shuffle([info.name, ...others]);
    return { text: "이 도형의 이름은 무엇일까요?", choices, answer: choices.indexOf(info.name), explain: `정답은 ${info.name}! ${info.fact}` };
  },
];

export function makeQuestion(prevBase?: string): QuizQuestion {
  for (;;) {
    const info = pick(BASES.filter((b) => b.key !== prevBase));
    const q = pick(MAKERS)(info);
    if (q) return { ...q, shape: { ...DEFAULT_PARAMS, base: info.key } };
  }
}
