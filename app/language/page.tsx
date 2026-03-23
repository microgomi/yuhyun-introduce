"use client";
import { useState, useCallback, useRef } from "react";
import Link from "next/link";

/* ───── 글자 유형 ───── */
type LetterShape = "circle" | "square" | "triangle" | "line" | "curve" | "dot" | "zigzag" | "spiral";

interface LetterPart {
  shape: LetterShape;
  x: number;
  y: number;
  rotation: number;
  size: number;
  color: string;
}

interface CustomLetter {
  id: number;
  sound: string;       // 발음
  parts: LetterPart[];
  meaning?: string;    // 의미 (단어용)
}

/* ───── 단어 ───── */
interface CustomWord {
  id: number;
  letters: number[];   // 글자 ID 배열
  meaning: string;     // 뜻
  category: string;
}

/* ───── 문장 ───── */
interface CustomSentence {
  id: number;
  words: number[];     // 단어 ID 배열
  meaning: string;
}

/* ───── 문법 규칙 ───── */
interface GrammarRule {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  example: string;
  unlockLevel: number;
}

const GRAMMAR_RULES: GrammarRule[] = [
  { id: "sov", name: "주어-목적어-동사", emoji: "📝", desc: "나 사과 먹다 (한국어/일본어 순서)", example: "나 + 밥 + 먹다", unlockLevel: 1 },
  { id: "svo", name: "주어-동사-목적어", emoji: "📝", desc: "나 먹다 사과 (영어 순서)", example: "나 + 먹다 + 밥", unlockLevel: 1 },
  { id: "vso", name: "동사-주어-목적어", emoji: "📝", desc: "먹다 나 사과 (아랍어 순서)", example: "먹다 + 나 + 밥", unlockLevel: 2 },
  { id: "plural_suffix", name: "복수 접미사", emoji: "🔤", desc: "글자를 뒤에 붙여서 '여러 개' 표현", example: "고양이 + 들 = 고양이들", unlockLevel: 2 },
  { id: "tense_prefix", name: "시제 접두사", emoji: "⏰", desc: "앞에 글자를 붙여서 시제 표현", example: "과거~ + 먹다 = 먹었다", unlockLevel: 3 },
  { id: "question_end", name: "의문 어미", emoji: "❓", desc: "끝에 붙여서 질문 만들기", example: "먹다 + ~까 = 먹니?", unlockLevel: 3 },
  { id: "negative", name: "부정 표현", emoji: "🚫", desc: "앞에 붙여서 '안' 표현", example: "안~ + 먹다 = 안 먹다", unlockLevel: 4 },
  { id: "honorific", name: "존댓말", emoji: "🙇", desc: "특별한 형태로 존경 표현", example: "먹다 → 드시다", unlockLevel: 5 },
];

/* ───── 소리 유형 ───── */
const CONSONANTS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
  "ka", "na", "ta", "ra", "ma", "ba", "sa", "za", "pa", "ha", "ga", "da", "wa", "ya"];
const VOWELS = ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅡ", "ㅣ", "ㅐ", "ㅔ",
  "a", "e", "i", "o", "u", "ai", "ou", "ei"];

/* ───── 도형 색상 ───── */
const SHAPE_COLORS = [
  "#ef4444", "#f97316", "#fbbf24", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#000000", "#6b7280",
  "#ffffff", "#92400e",
];

/* ───── 카테고리 ───── */
const WORD_CATEGORIES = [
  { id: "nature", name: "자연", emoji: "🌳" },
  { id: "animal", name: "동물", emoji: "🐾" },
  { id: "food", name: "음식", emoji: "🍔" },
  { id: "emotion", name: "감정", emoji: "😊" },
  { id: "action", name: "동작", emoji: "🏃" },
  { id: "number", name: "숫자", emoji: "🔢" },
  { id: "color", name: "색깔", emoji: "🎨" },
  { id: "family", name: "가족", emoji: "👨‍👩‍👧‍👦" },
  { id: "body", name: "신체", emoji: "🦶" },
  { id: "object", name: "물건", emoji: "📦" },
];

/* ───── 업적 ───── */
interface Achievement { id: string; name: string; emoji: string; desc: string; check: (letters: number, words: number, sentences: number) => boolean; }
const ACHIEVEMENTS: Achievement[] = [
  { id: "a1", name: "첫 글자!", emoji: "✏️", desc: "글자 1개 만들기", check: (l) => l >= 1 },
  { id: "a2", name: "알파벳 시작", emoji: "🔤", desc: "글자 5개 만들기", check: (l) => l >= 5 },
  { id: "a3", name: "글자 마스터", emoji: "📝", desc: "글자 15개 만들기", check: (l) => l >= 15 },
  { id: "a4", name: "첫 단어!", emoji: "📖", desc: "단어 1개 만들기", check: (_, w) => w >= 1 },
  { id: "a5", name: "사전 시작", emoji: "📚", desc: "단어 10개 만들기", check: (_, w) => w >= 10 },
  { id: "a6", name: "첫 문장!", emoji: "💬", desc: "문장 1개 만들기", check: (_, __, s) => s >= 1 },
  { id: "a7", name: "언어학자", emoji: "🎓", desc: "글자 20 + 단어 15 + 문장 5", check: (l, w, s) => l >= 20 && w >= 15 && s >= 5 },
  { id: "a8", name: "완전한 언어", emoji: "🌍", desc: "글자 30 + 단어 30 + 문장 10", check: (l, w, s) => l >= 30 && w >= 30 && s >= 10 },
];

/* ───── 글자 SVG 렌더 ───── */
function LetterPreview({ letter, size = 40 }: { letter: CustomLetter; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" className="inline-block">
      <rect width={50} height={50} fill="transparent" />
      {letter.parts.map((p, i) => {
        const cx = p.x, cy = p.y, s = p.size;
        switch (p.shape) {
          case "circle": return <circle key={i} cx={cx} cy={cy} r={s} fill="none" stroke={p.color} strokeWidth={2.5} transform={`rotate(${p.rotation},${cx},${cy})`} />;
          case "square": return <rect key={i} x={cx - s} y={cy - s} width={s * 2} height={s * 2} fill="none" stroke={p.color} strokeWidth={2.5} transform={`rotate(${p.rotation},${cx},${cy})`} />;
          case "triangle": return <polygon key={i} points={`${cx},${cy - s} ${cx - s},${cy + s} ${cx + s},${cy + s}`} fill="none" stroke={p.color} strokeWidth={2.5} transform={`rotate(${p.rotation},${cx},${cy})`} />;
          case "line": return <line key={i} x1={cx - s} y1={cy} x2={cx + s} y2={cy} stroke={p.color} strokeWidth={2.5} strokeLinecap="round" transform={`rotate(${p.rotation},${cx},${cy})`} />;
          case "curve": return <path key={i} d={`M${cx - s},${cy} Q${cx},${cy - s * 1.5} ${cx + s},${cy}`} fill="none" stroke={p.color} strokeWidth={2.5} transform={`rotate(${p.rotation},${cx},${cy})`} />;
          case "dot": return <circle key={i} cx={cx} cy={cy} r={s * 0.4} fill={p.color} transform={`rotate(${p.rotation},${cx},${cy})`} />;
          case "zigzag": return <polyline key={i} points={`${cx-s},${cy} ${cx-s/2},${cy-s} ${cx},${cy} ${cx+s/2},${cy-s} ${cx+s},${cy}`} fill="none" stroke={p.color} strokeWidth={2.5} transform={`rotate(${p.rotation},${cx},${cy})`} />;
          case "spiral": return <path key={i} d={`M${cx},${cy} Q${cx+s},${cy-s} ${cx},${cy-s} Q${cx-s*0.7},${cy-s} ${cx-s*0.5},${cy-s*0.3} Q${cx-s*0.3},${cy+s*0.3} ${cx+s*0.3},${cy+s*0.3}`} fill="none" stroke={p.color} strokeWidth={2} transform={`rotate(${p.rotation},${cx},${cy})`} />;
          default: return null;
        }
      })}
    </svg>
  );
}

const SHAPES: { id: LetterShape; name: string; emoji: string }[] = [
  { id: "circle", name: "원", emoji: "⭕" },
  { id: "square", name: "네모", emoji: "⬜" },
  { id: "triangle", name: "세모", emoji: "🔺" },
  { id: "line", name: "선", emoji: "➖" },
  { id: "curve", name: "곡선", emoji: "〰️" },
  { id: "dot", name: "점", emoji: "⚫" },
  { id: "zigzag", name: "지그재그", emoji: "⚡" },
  { id: "spiral", name: "나선", emoji: "🌀" },
];

type Screen = "main" | "letter_create" | "letter_list" | "word_create" | "word_list" | "sentence_create" | "sentence_list" | "grammar" | "test" | "achievements";

export default function LanguagePage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(30);
  const [languageName, setLanguageName] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [letters, setLetters] = useState<CustomLetter[]>([]);
  const [words, setWords] = useState<CustomWord[]>([]);
  const [sentences, setSentences] = useState<CustomSentence[]>([]);
  const [selectedGrammar, setSelectedGrammar] = useState("sov");
  const [earnedAchievements, setEarnedAchievements] = useState<string[]>([]);
  const letterId = useRef(0);
  const wordId = useRef(0);
  const sentenceId = useRef(0);

  // 글자 편집
  const [editParts, setEditParts] = useState<LetterPart[]>([]);
  const [editSound, setEditSound] = useState("");
  const [editShape, setEditShape] = useState<LetterShape>("circle");
  const [editColor, setEditColor] = useState("#000000");
  const [editSize, setEditSize] = useState(8);
  const [editRotation, setEditRotation] = useState(0);

  // 단어 편집
  const [wordLetterIds, setWordLetterIds] = useState<number[]>([]);
  const [wordMeaning, setWordMeaning] = useState("");
  const [wordCategory, setWordCategory] = useState("nature");

  // 문장 편집
  const [sentenceWordIds, setSentenceWordIds] = useState<number[]>([]);
  const [sentenceMeaning, setSentenceMeaning] = useState("");

  // 테스트
  const [testQ, setTestQ] = useState<{ type: "letter" | "word"; target: CustomLetter | CustomWord; options: string[]; correct: number } | null>(null);
  const [testScore, setTestScore] = useState(0);
  const [testTotal, setTestTotal] = useState(0);
  const [testResult, setTestResult] = useState<"none" | "correct" | "wrong">("none");

  // 레벨업
  const addXp = (amount: number) => {
    setXp(prev => {
      const next = prev + amount;
      if (next >= xpNeeded) {
        setPlayerLevel(l => l + 1);
        setXpNeeded(n => Math.floor(n * 1.3));
        return next - xpNeeded;
      }
      return next;
    });
  };

  // 업적 체크
  const checkAchievements = () => {
    ACHIEVEMENTS.forEach(a => {
      if (!earnedAchievements.includes(a.id) && a.check(letters.length, words.length, sentences.length)) {
        setEarnedAchievements(prev => [...prev, a.id]);
      }
    });
  };

  // 글자 파츠 추가
  const addPart = () => {
    // 캔버스 내 랜덤 위치
    const x = 10 + Math.random() * 30;
    const y = 10 + Math.random() * 30;
    setEditParts(prev => [...prev, { shape: editShape, x, y, rotation: editRotation, size: editSize, color: editColor }]);
  };

  // 글자 파츠를 그리드에 배치
  const addPartAt = (gridX: number, gridY: number) => {
    setEditParts(prev => [...prev, { shape: editShape, x: gridX, y: gridY, rotation: editRotation, size: editSize, color: editColor }]);
  };

  // 글자 저장
  const saveLetter = () => {
    if (editParts.length === 0 || !editSound) return;
    const id = letterId.current++;
    setLetters(prev => [...prev, { id, sound: editSound, parts: [...editParts] }]);
    setEditParts([]);
    setEditSound("");
    addXp(5);
    checkAchievements();
    setScreen("letter_list");
  };

  // 단어 저장
  const saveWord = () => {
    if (wordLetterIds.length === 0 || !wordMeaning) return;
    const id = wordId.current++;
    setWords(prev => [...prev, { id, letters: [...wordLetterIds], meaning: wordMeaning, category: wordCategory }]);
    setWordLetterIds([]);
    setWordMeaning("");
    addXp(10);
    checkAchievements();
    setScreen("word_list");
  };

  // 문장 저장
  const saveSentence = () => {
    if (sentenceWordIds.length === 0 || !sentenceMeaning) return;
    const id = sentenceId.current++;
    setSentences(prev => [...prev, { id, words: [...sentenceWordIds], meaning: sentenceMeaning }]);
    setSentenceWordIds([]);
    setSentenceMeaning("");
    addXp(15);
    checkAchievements();
    setScreen("sentence_list");
  };

  // 테스트 생성
  const generateTest = () => {
    if (letters.length < 2 && words.length < 2) return;

    const useWords = words.length >= 4 && Math.random() > 0.4;

    if (useWords) {
      const target = words[Math.floor(Math.random() * words.length)];
      const wrongAnswers = words.filter(w => w.id !== target.id).sort(() => Math.random() - 0.5).slice(0, 3).map(w => w.meaning);
      const options = [...wrongAnswers, target.meaning].sort(() => Math.random() - 0.5);
      setTestQ({ type: "word", target, options, correct: options.indexOf(target.meaning) });
    } else {
      const target = letters[Math.floor(Math.random() * letters.length)];
      const wrongSounds = letters.filter(l => l.id !== target.id).sort(() => Math.random() - 0.5).slice(0, 3).map(l => l.sound);
      const allSounds = [...wrongSounds];
      while (allSounds.length < 3) allSounds.push(CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)]);
      const options = [...allSounds.slice(0, 3), target.sound].sort(() => Math.random() - 0.5);
      setTestQ({ type: "letter", target, options, correct: options.indexOf(target.sound) });
    }
    setTestResult("none");
  };

  const answerTest = (idx: number) => {
    if (!testQ) return;
    setTestTotal(t => t + 1);
    if (idx === testQ.correct) {
      setTestScore(s => s + 1);
      setTestResult("correct");
      addXp(3);
    } else {
      setTestResult("wrong");
    }
    setTimeout(() => generateTest(), 1200);
  };

  // 글자 편집 그리드
  const GRID_SIZE = 5;
  const GRID_POSITIONS = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
    x: 5 + (i % GRID_SIZE) * 10,
    y: 5 + Math.floor(i / GRID_SIZE) * 10,
  }));

  /* ───── 이름 입력 ───── */
  if (!nameSet) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-indigo-950 to-black text-white p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <Link href="/" className="text-purple-300 text-sm mb-4 inline-block">← 홈으로</Link>
          <div className="text-6xl mb-4">🌍</div>
          <h1 className="text-3xl font-black mb-2">언어 만들기</h1>
          <p className="text-purple-300 mb-6">나만의 언어를 만들자!</p>
          <div className="bg-black/40 rounded-xl p-4">
            <label className="text-sm text-gray-400 block mb-1">언어 이름을 정하세요</label>
            <input type="text" value={languageName} onChange={e => setLanguageName(e.target.value)}
              placeholder="예: 유현어, 드래곤어..." maxLength={15}
              className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white text-center text-lg outline-none focus:ring-2 ring-purple-500 mb-3" />
            <button onClick={() => { if (languageName.trim()) setNameSet(true); }}
              disabled={!languageName.trim()}
              className={`w-full py-3 rounded-xl font-black text-lg ${languageName.trim() ? "bg-purple-600 hover:bg-purple-500" : "bg-gray-700 text-gray-500"}`}>
              🌍 언어 만들기 시작!
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 메인 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-indigo-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-purple-300 text-sm mb-4 inline-block">← 홈으로</Link>
          <div className="text-center mb-5">
            <div className="text-5xl mb-2">🌍</div>
            <h1 className="text-2xl font-black">{languageName}</h1>
            <p className="text-purple-300 text-sm">나만의 언어를 만들자!</p>
          </div>

          <div className="bg-purple-900/40 rounded-xl p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-purple-300 text-sm">Lv.{playerLevel}</span>
              <span className="text-xs text-gray-400">{xp}/{xpNeeded} XP</span>
            </div>
            <div className="bg-purple-900 rounded-full h-2 overflow-hidden">
              <div className="bg-purple-400 h-2 rounded-full" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs">
              <div>✏️ 글자 {letters.length}개</div>
              <div>📖 단어 {words.length}개</div>
              <div>💬 문장 {sentences.length}개</div>
            </div>
          </div>

          {/* 글자 미리보기 */}
          {letters.length > 0 && (
            <div className="bg-black/30 rounded-xl p-2 mb-4">
              <div className="flex gap-1 overflow-x-auto pb-1">
                {letters.slice(0, 15).map(l => (
                  <div key={l.id} className="flex-shrink-0 bg-white/10 rounded-lg p-1 text-center">
                    <LetterPreview letter={l} size={32} />
                    <div className="text-[8px] text-gray-400">{l.sound}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <button onClick={() => { setEditParts([]); setEditSound(""); setScreen("letter_create"); }}
              className="w-full bg-red-600 hover:bg-red-500 rounded-xl p-3 font-bold text-lg">✏️ 글자 만들기</button>
            <button onClick={() => setScreen("letter_list")} className="w-full bg-orange-700 hover:bg-orange-600 rounded-xl p-3 font-bold">
              🔤 내 글자 ({letters.length})
            </button>
            <button onClick={() => { setWordLetterIds([]); setWordMeaning(""); setScreen("word_create"); }}
              disabled={letters.length < 1}
              className={`w-full rounded-xl p-3 font-bold ${letters.length >= 1 ? "bg-blue-600 hover:bg-blue-500" : "bg-gray-700 text-gray-500"}`}>
              📖 단어 만들기
            </button>
            <button onClick={() => setScreen("word_list")} className="w-full bg-cyan-700 hover:bg-cyan-600 rounded-xl p-3 font-bold">
              📚 내 단어 ({words.length})
            </button>
            <button onClick={() => { setSentenceWordIds([]); setSentenceMeaning(""); setScreen("sentence_create"); }}
              disabled={words.length < 2}
              className={`w-full rounded-xl p-3 font-bold ${words.length >= 2 ? "bg-green-600 hover:bg-green-500" : "bg-gray-700 text-gray-500"}`}>
              💬 문장 만들기
            </button>
            <button onClick={() => setScreen("grammar")} className="w-full bg-amber-700 hover:bg-amber-600 rounded-xl p-3 font-bold">📐 문법 설정</button>
            <button onClick={() => { setTestScore(0); setTestTotal(0); generateTest(); setScreen("test"); }}
              disabled={letters.length < 2}
              className={`w-full rounded-xl p-3 font-bold ${letters.length >= 2 ? "bg-pink-600 hover:bg-pink-500" : "bg-gray-700 text-gray-500"}`}>
              📝 테스트!
            </button>
            <button onClick={() => setScreen("achievements")} className="w-full bg-yellow-700 hover:bg-yellow-600 rounded-xl p-3 font-bold">
              🏆 업적 ({earnedAchievements.length}/{ACHIEVEMENTS.length})
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 글자 만들기 ───── */
  if (screen === "letter_create") {
    const preview: CustomLetter = { id: -1, sound: editSound || "?", parts: editParts };

    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-red-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-2">✏️ 글자 만들기</h2>

          {/* 미리보기 */}
          <div className="bg-white rounded-xl p-3 mb-3 text-center">
            <LetterPreview letter={preview} size={80} />
            <div className="text-sm font-bold text-gray-900 mt-1">발음: {editSound || "?"}</div>
          </div>

          {/* 캔버스 그리드 */}
          <div className="bg-gray-100 rounded-xl p-2 mb-3">
            <div className="text-xs text-gray-500 text-center mb-1">터치해서 도형 배치!</div>
            <div className="grid grid-cols-5 gap-1">
              {GRID_POSITIONS.map((pos, i) => (
                <button key={i} onClick={() => addPartAt(pos.x, pos.y)}
                  className="aspect-square bg-white border border-gray-300 rounded hover:bg-purple-100 active:bg-purple-200 transition-colors" />
              ))}
            </div>
          </div>

          {/* 도형 선택 */}
          <div className="mb-2">
            <div className="text-xs font-bold mb-1">도형:</div>
            <div className="flex gap-1 flex-wrap">
              {SHAPES.map(s => (
                <button key={s.id} onClick={() => setEditShape(s.id)}
                  className={`px-2 py-1 rounded-lg text-xs ${editShape === s.id ? "bg-red-600" : "bg-gray-800"}`}>
                  {s.emoji} {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* 색상 */}
          <div className="mb-2">
            <div className="text-xs font-bold mb-1">색:</div>
            <div className="flex gap-1 flex-wrap">
              {SHAPE_COLORS.map(c => (
                <button key={c} onClick={() => setEditColor(c)}
                  className={`w-7 h-7 rounded-full border-2 ${editColor === c ? "border-yellow-400" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* 크기 & 회전 */}
          <div className="flex gap-3 mb-2">
            <div className="flex-1">
              <div className="text-xs font-bold mb-1">크기: {editSize}</div>
              <input type="range" min={3} max={15} value={editSize} onChange={e => setEditSize(Number(e.target.value))} className="w-full" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold mb-1">회전: {editRotation}°</div>
              <input type="range" min={0} max={360} step={15} value={editRotation} onChange={e => setEditRotation(Number(e.target.value))} className="w-full" />
            </div>
          </div>

          {/* 발음 */}
          <div className="mb-3">
            <div className="text-xs font-bold mb-1">발음:</div>
            <div className="flex gap-1 flex-wrap mb-1">
              {CONSONANTS.slice(0, 13).map(s => (
                <button key={s} onClick={() => setEditSound(s)}
                  className={`px-1.5 py-0.5 rounded text-xs ${editSound === s ? "bg-red-600" : "bg-gray-800"}`}>{s}</button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap mb-1">
              {VOWELS.slice(0, 8).map(s => (
                <button key={s} onClick={() => setEditSound(s)}
                  className={`px-1.5 py-0.5 rounded text-xs ${editSound === s ? "bg-red-600" : "bg-gray-800"}`}>{s}</button>
              ))}
            </div>
            <input type="text" value={editSound} onChange={e => setEditSound(e.target.value)}
              placeholder="직접 입력도 가능!" maxLength={5}
              className="w-full bg-gray-800 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 ring-red-500" />
          </div>

          <div className="flex gap-2">
            <button onClick={() => setEditParts([])} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-2 font-bold text-sm">🗑️ 초기화</button>
            <button onClick={() => setEditParts(prev => prev.slice(0, -1))} className="flex-1 bg-orange-700 hover:bg-orange-600 rounded-xl p-2 font-bold text-sm">↩️ 되돌리기</button>
            <button onClick={saveLetter} disabled={editParts.length === 0 || !editSound}
              className={`flex-1 rounded-xl p-2 font-bold text-sm ${editParts.length > 0 && editSound ? "bg-green-600 hover:bg-green-500" : "bg-gray-700 text-gray-500"}`}>
              ✅ 저장!
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 내 글자 ───── */
  if (screen === "letter_list") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-orange-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-3">🔤 {languageName} 글자 ({letters.length})</h2>
          {letters.length === 0 && <div className="text-center text-gray-500 py-8">글자를 만들어보세요!</div>}
          <div className="grid grid-cols-4 gap-2">
            {letters.map(l => (
              <div key={l.id} className="bg-white rounded-xl p-2 text-center">
                <LetterPreview letter={l} size={45} />
                <div className="text-xs font-bold text-gray-900 mt-1">{l.sound}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 단어 만들기 ───── */
  if (screen === "word_create") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-blue-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-2">📖 단어 만들기</h2>

          {/* 만든 단어 미리보기 */}
          <div className="bg-white rounded-xl p-3 mb-3 min-h-[60px] flex items-center justify-center gap-1">
            {wordLetterIds.length === 0 && <span className="text-gray-400 text-sm">아래에서 글자를 선택하세요!</span>}
            {wordLetterIds.map((lid, i) => {
              const l = letters.find(lt => lt.id === lid);
              return l ? <LetterPreview key={i} letter={l} size={40} /> : null;
            })}
          </div>

          {/* 발음 표시 */}
          <div className="text-center text-sm text-gray-400 mb-2">
            발음: {wordLetterIds.map(lid => letters.find(l => l.id === lid)?.sound || "").join("")}
          </div>

          {/* 글자 선택 */}
          <div className="bg-black/30 rounded-xl p-2 mb-3">
            <div className="text-xs font-bold mb-1">글자 선택 (터치하여 추가):</div>
            <div className="flex gap-1 flex-wrap">
              {letters.map(l => (
                <button key={l.id} onClick={() => setWordLetterIds(prev => [...prev, l.id])}
                  className="bg-white rounded-lg p-1 hover:bg-blue-100 active:scale-95">
                  <LetterPreview letter={l} size={32} />
                  <div className="text-[8px] text-gray-600 text-center">{l.sound}</div>
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setWordLetterIds(prev => prev.slice(0, -1))} className="w-full bg-gray-700 rounded-lg p-1.5 text-xs mb-2">↩️ 마지막 글자 제거</button>

          {/* 카테고리 */}
          <div className="mb-2">
            <div className="text-xs font-bold mb-1">카테고리:</div>
            <div className="flex gap-1 flex-wrap">
              {WORD_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setWordCategory(c.id)}
                  className={`px-2 py-1 rounded-lg text-xs ${wordCategory === c.id ? "bg-blue-600" : "bg-gray-800"}`}>
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* 뜻 */}
          <div className="mb-3">
            <div className="text-xs font-bold mb-1">뜻 (한국어):</div>
            <input type="text" value={wordMeaning} onChange={e => setWordMeaning(e.target.value)}
              placeholder="예: 사과, 달리다, 행복..." maxLength={20}
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 ring-blue-500" />
          </div>

          <button onClick={saveWord} disabled={wordLetterIds.length === 0 || !wordMeaning}
            className={`w-full rounded-xl p-3 font-bold ${wordLetterIds.length > 0 && wordMeaning ? "bg-green-600 hover:bg-green-500" : "bg-gray-700 text-gray-500"}`}>
            ✅ 단어 저장!
          </button>
        </div>
      </div>
    );
  }

  /* ───── 내 단어 ───── */
  if (screen === "word_list") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-cyan-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-3">📚 {languageName} 단어 ({words.length})</h2>
          {words.length === 0 && <div className="text-center text-gray-500 py-8">단어를 만들어보세요!</div>}
          <div className="space-y-2">
            {words.map(w => {
              const cat = WORD_CATEGORIES.find(c => c.id === w.category);
              return (
                <div key={w.id} className="bg-black/30 rounded-xl p-3 flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {w.letters.map((lid, i) => {
                      const l = letters.find(lt => lt.id === lid);
                      return l ? <LetterPreview key={i} letter={l} size={28} /> : null;
                    })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400">{w.letters.map(lid => letters.find(l => l.id === lid)?.sound || "").join("")}</div>
                    <div className="font-bold text-sm">{w.meaning}</div>
                  </div>
                  <span className="text-sm">{cat?.emoji}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 문장 만들기 ───── */
  if (screen === "sentence_create") {
    const grammar = GRAMMAR_RULES.find(g => g.id === selectedGrammar);
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-green-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-2">💬 문장 만들기</h2>
          <div className="text-xs text-gray-400 text-center mb-3">문법: {grammar?.name} ({grammar?.example})</div>

          {/* 문장 미리보기 */}
          <div className="bg-white rounded-xl p-3 mb-3 min-h-[50px] flex items-center justify-center gap-2 flex-wrap">
            {sentenceWordIds.length === 0 && <span className="text-gray-400 text-sm">단어를 선택하세요!</span>}
            {sentenceWordIds.map((wid, i) => {
              const w = words.find(wd => wd.id === wid);
              if (!w) return null;
              return (
                <div key={i} className="bg-gray-100 rounded-lg px-2 py-1 text-center">
                  <div className="flex gap-0.5">{w.letters.map((lid, j) => { const l = letters.find(lt => lt.id === lid); return l ? <LetterPreview key={j} letter={l} size={20} /> : null; })}</div>
                  <div className="text-[8px] text-gray-600">{w.meaning}</div>
                </div>
              );
            })}
          </div>

          {/* 단어 선택 */}
          <div className="bg-black/30 rounded-xl p-2 mb-3">
            <div className="text-xs font-bold mb-1">단어 선택:</div>
            <div className="flex gap-1 flex-wrap">
              {words.map(w => (
                <button key={w.id} onClick={() => setSentenceWordIds(prev => [...prev, w.id])}
                  className="bg-gray-800 hover:bg-gray-700 rounded-lg px-2 py-1 text-xs">
                  {w.meaning}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setSentenceWordIds(prev => prev.slice(0, -1))} className="w-full bg-gray-700 rounded-lg p-1.5 text-xs mb-2">↩️ 마지막 단어 제거</button>

          <div className="mb-3">
            <div className="text-xs font-bold mb-1">문장 뜻:</div>
            <input type="text" value={sentenceMeaning} onChange={e => setSentenceMeaning(e.target.value)}
              placeholder="예: 나는 사과를 먹는다" maxLength={50}
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 ring-green-500" />
          </div>

          <button onClick={saveSentence} disabled={sentenceWordIds.length === 0 || !sentenceMeaning}
            className={`w-full rounded-xl p-3 font-bold ${sentenceWordIds.length > 0 && sentenceMeaning ? "bg-green-600 hover:bg-green-500" : "bg-gray-700 text-gray-500"}`}>
            ✅ 문장 저장!
          </button>
        </div>
      </div>
    );
  }

  /* ───── 문장 목록 ───── */
  if (screen === "sentence_list") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-emerald-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-3">💬 {languageName} 문장 ({sentences.length})</h2>
          {sentences.length === 0 && <div className="text-center text-gray-500 py-8">문장을 만들어보세요!</div>}
          <div className="space-y-2">
            {sentences.map(s => (
              <div key={s.id} className="bg-black/30 rounded-xl p-3">
                <div className="flex gap-2 flex-wrap mb-1">
                  {s.words.map((wid, i) => {
                    const w = words.find(wd => wd.id === wid);
                    if (!w) return null;
                    return (
                      <div key={i} className="flex gap-0.5">
                        {w.letters.map((lid, j) => { const l = letters.find(lt => lt.id === lid); return l ? <LetterPreview key={j} letter={l} size={22} /> : null; })}
                      </div>
                    );
                  })}
                </div>
                <div className="text-sm font-bold">{s.meaning}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 문법 ───── */
  if (screen === "grammar") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-amber-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-3">📐 {languageName} 문법</h2>
          <div className="space-y-2">
            {GRAMMAR_RULES.map(g => {
              const locked = playerLevel < g.unlockLevel;
              return (
                <button key={g.id} onClick={() => !locked && setSelectedGrammar(g.id)} disabled={locked}
                  className={`w-full text-left p-3 rounded-xl ${selectedGrammar === g.id ? "bg-amber-700 ring-1 ring-yellow-400" : locked ? "bg-gray-800/50 opacity-50" : "bg-black/30 hover:bg-black/50"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{g.emoji}</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{g.name}</div>
                      <div className="text-xs text-gray-400">{g.desc}</div>
                      <div className="text-[10px] text-amber-400">예: {g.example}</div>
                      {locked && <div className="text-[10px] text-red-400">Lv.{g.unlockLevel} 필요</div>}
                    </div>
                    {selectedGrammar === g.id && <span className="text-yellow-400">✅</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 테스트 ───── */
  if (screen === "test") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-pink-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-2">📝 {languageName} 테스트!</h2>
          <div className="text-center text-sm text-gray-400 mb-4">맞힌 수: {testScore}/{testTotal}</div>

          {testQ ? (
            <div className="text-center">
              <div className="bg-white rounded-xl p-4 mb-4">
                <div className="text-xs text-gray-500 mb-2">이 {testQ.type === "letter" ? "글자" : "단어"}의 {testQ.type === "letter" ? "발음" : "뜻"}은?</div>
                {testQ.type === "letter" ? (
                  <LetterPreview letter={testQ.target as CustomLetter} size={80} />
                ) : (
                  <div className="flex gap-1 justify-center">
                    {(testQ.target as CustomWord).letters.map((lid, i) => {
                      const l = letters.find(lt => lt.id === lid);
                      return l ? <LetterPreview key={i} letter={l} size={40} /> : null;
                    })}
                  </div>
                )}
              </div>

              {testResult !== "none" && (
                <div className={`text-lg font-bold mb-3 ${testResult === "correct" ? "text-green-400" : "text-red-400"}`}>
                  {testResult === "correct" ? "⭕ 정답!" : `❌ 오답! 정답: ${testQ.options[testQ.correct]}`}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {testQ.options.map((opt, i) => (
                  <button key={i} onClick={() => answerTest(i)}
                    disabled={testResult !== "none"}
                    className={`p-3 rounded-xl font-bold text-sm transition-all ${
                      testResult !== "none" && i === testQ.correct ? "bg-green-600" :
                      testResult !== "none" ? "bg-gray-700 opacity-50" :
                      "bg-pink-700 hover:bg-pink-600 active:scale-95"
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">글자나 단어가 더 필요해요!</div>
          )}
        </div>
      </div>
    );
  }

  /* ───── 업적 ───── */
  if (screen === "achievements") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-900 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-yellow-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-3">🏆 업적</h2>
          <div className="space-y-2">
            {ACHIEVEMENTS.map(a => {
              const done = earnedAchievements.includes(a.id);
              return (
                <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl ${done ? "bg-yellow-900/40 border border-yellow-700" : "bg-black/30"}`}>
                  <span className="text-3xl">{done ? a.emoji : "🔒"}</span>
                  <div><div className="font-bold text-sm">{a.name}</div><div className="text-xs text-gray-400">{a.desc}</div></div>
                  {done && <span className="ml-auto text-yellow-400">✅</span>}
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
