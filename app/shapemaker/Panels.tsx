import { useRef } from "react";
import { SLIDERS, baseInfo, type BaseKey, type ShapeParams } from "./shapeGeometry";
import { ACHIEVEMENTS, GALLERY_LIMIT, levelOf, MATCH_DEFS, type MatchResult, type SaveData, type SavedShape } from "./shapeGame";
import { QUIZ_LENGTH, type QuizQuestion } from "./shapeQuiz";
import { BasePicker, Section, Slider } from "./ui";

// ----------------------------------------------------------------------------
// 탭별 패널 (상태는 ShapeMaker 가 가지고, 여기서는 보여주기만)
// ----------------------------------------------------------------------------

// 채점하는 값만 슬라이더로 보여준다
const MATCH_SLIDERS = SLIDERS.filter((s) => MATCH_DEFS.some((d) => d.key === s.key));

export interface RushView {
  secondsLeft: number;
  solved: number;
  finished: boolean;
}

export function MatchPanel(props: {
  round: number;
  totalStars: number;
  match: MatchResult;
  stars: number;
  hint: string | null;
  params: ShapeParams;
  daily: boolean; // 지금 오늘의 도형을 푸는 중
  dailyDoneToday: boolean;
  rush: RushView | null;
  rushBest: number;
  onChange: (patch: Partial<ShapeParams>) => void;
  onHint: () => void;
  onSkip: () => void;
  onDone: () => void;
  onDaily: () => void;
  onRushStart: () => void;
  onRushClose: () => void;
}) {
  const { match, stars, params, rush } = props;
  const title = rush ? "⏱ 60초 타임어택" : props.daily ? "📅 오늘의 도형" : `🎯 모양 맞추기 · ${props.round}단계`;
  return (
    <>
      <Section title={title}>
        {rush?.finished ? (
          <div className="py-3 text-center">
            <div className="text-4xl font-extrabold text-yellow-300">{rush.solved}개</div>
            <div className="mt-1">60초 동안 맞춘 도형이에요!</div>
            <div className="text-xs text-white/50">최고 기록 {props.rushBest}개</div>
            <button onClick={props.onRushClose} className="mt-3 rounded-xl bg-yellow-400 px-5 py-2 font-bold text-zinc-900">
              확인
            </button>
          </div>
        ) : (
          <>
            {rush ? (
              <div className="mb-3 flex items-center justify-between rounded-xl bg-black/30 px-3 py-2">
                <span className={`text-2xl font-extrabold tabular-nums ${rush.secondsLeft <= 10 ? "text-rose-400" : "text-cyan-300"}`}>⏱ {rush.secondsLeft}초</span>
                <span className="text-lg font-bold">✅ {rush.solved}개</span>
              </div>
            ) : (
              <p className="mb-3 text-xs leading-relaxed text-white/70">
                오른쪽 위 <b className="text-fuchsia-300">목표 도형</b>과 똑같아지도록 각도와 모양을 맞춰 보세요.{" "}
                {props.daily ? "오늘의 도형은 성공하면 별 3개를 더 받아요!" : "90% 이상이면 별을 받아요!"}
              </p>
            )}
            <div className="mb-1 flex items-end justify-between">
              <span className="text-sm">일치도</span>
              <span className="text-3xl font-extrabold tabular-nums">{match.score}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-black/40">
              <div
                className={`h-full transition-all ${match.score >= 90 ? "bg-green-400" : match.score >= 70 ? "bg-yellow-400" : "bg-rose-400"}`}
                style={{ width: `${match.score}%` }}
              />
            </div>
            {!rush && (
              <div className="mt-2 text-center text-2xl">
                {[1, 2, 3].map((i) => (
                  <span key={i} className={i <= stars ? "" : "opacity-20"}>
                    ⭐
                  </span>
                ))}
              </div>
            )}
            {rush && <p className="mt-2 text-center text-xs text-white/60">90%가 되면 저절로 다음 도형으로 넘어가요!</p>}
            {props.hint && <div className="mt-2 rounded-lg bg-fuchsia-500/20 p-2 text-center text-sm">{props.hint}</div>}
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-sm">
              <button onClick={props.onHint} className="rounded-lg bg-white/10 py-2 hover:bg-white/20">
                💡 힌트
              </button>
              <button onClick={props.onSkip} className="rounded-lg bg-white/10 py-2 hover:bg-white/20">
                ⏭ {rush ? "넘기기" : "다른 문제"}
              </button>
              {!rush && (
                <button
                  onClick={props.onDone}
                  disabled={stars === 0}
                  className="rounded-lg bg-green-400 py-2 font-bold text-zinc-900 enabled:hover:bg-green-300 disabled:opacity-30"
                >
                  ✅ 완성!
                </button>
              )}
            </div>
            {!rush && (
              <div className="mt-3 grid grid-cols-2 gap-1.5 text-sm">
                <button
                  onClick={props.onDaily}
                  disabled={props.dailyDoneToday && !props.daily}
                  className={`rounded-lg py-2 ${props.daily ? "bg-cyan-400 font-bold text-zinc-900" : "bg-white/10 enabled:hover:bg-white/20 disabled:opacity-40"}`}
                >
                  {props.dailyDoneToday ? "📅 오늘 완료 ✅" : props.daily ? "📅 오늘의 도형 중" : "📅 오늘의 도형"}
                </button>
                <button onClick={props.onRushStart} className="rounded-lg bg-white/10 py-2 hover:bg-white/20">
                  ⏱ 60초 타임어택
                </button>
              </div>
            )}
            <p className="mt-2 text-center text-xs text-white/50">
              모은 별: ⭐ {props.totalStars}개 · 타임어택 최고 {props.rushBest}개
            </p>
          </>
        )}
      </Section>

      <Section title="기본 도형">
        <BasePicker value={params.base} onPick={(k: BaseKey) => props.onChange({ base: k, pulls: {} })} />
      </Section>
      <Section title="각도와 모양">
        {MATCH_SLIDERS.map((def) => (
          <Slider key={def.key} def={def} value={params[def.key]} onChange={(v) => props.onChange({ [def.key]: v })} />
        ))}
      </Section>
    </>
  );
}

export interface QuizState {
  question: QuizQuestion;
  index: number; // 0부터
  correct: number;
  streak: number; // 지금 연속 정답 수
  picked: number | null;
  finished: boolean;
}

export function QuizPanel({ quiz, best, bestStreak, onPick, onNext, onRestart }: {
  quiz: QuizState;
  best: number;
  bestStreak: number;
  onPick: (i: number) => void;
  onNext: () => void;
  onRestart: () => void;
}) {
  if (quiz.finished) {
    const msg = quiz.correct === QUIZ_LENGTH ? "🎓 만점! 도형 박사님이에요!" : quiz.correct >= 7 ? "🧠 아주 잘했어요!" : "💪 다시 도전해 볼까요?";
    return (
      <Section title="❓ 도형 퀴즈 결과">
        <div className="py-4 text-center">
          <div className="text-5xl font-extrabold text-yellow-300">
            {quiz.correct} / {QUIZ_LENGTH}
          </div>
          <div className="mt-2 text-lg">{msg}</div>
          <div className="mt-1 text-xs text-white/50">
            최고 기록: {best}점 · 최고 연속 정답: {bestStreak}개
          </div>
          <button onClick={onRestart} className="mt-4 rounded-xl bg-yellow-400 px-6 py-2 font-bold text-zinc-900 hover:bg-yellow-300">
            🔄 다시 풀기
          </button>
        </div>
      </Section>
    );
  }
  const q = quiz.question;
  const answered = quiz.picked !== null;
  return (
    <Section title={`❓ 도형 퀴즈 · ${quiz.index + 1} / ${QUIZ_LENGTH}`}>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-black/40">
        <div className="h-full bg-cyan-400 transition-all" style={{ width: `${(quiz.index / QUIZ_LENGTH) * 100}%` }} />
      </div>
      {quiz.streak >= 2 && (
        <div className="mb-2 animate-pulse text-center text-lg font-extrabold text-orange-300">🔥 {quiz.streak}연속 정답!</div>
      )}
      <p className="mb-1 text-xs text-white/60">왼쪽 도형을 돌려 보면서 풀어 보세요!</p>
      <p className="mb-3 text-lg font-bold">{q.text}</p>
      <div className="grid grid-cols-2 gap-2">
        {q.choices.map((c, i) => {
          let style = "bg-white/10 hover:bg-white/20";
          if (answered && i === q.answer) style = "bg-green-500 text-white";
          else if (answered && i === quiz.picked) style = "bg-rose-500 text-white";
          else if (answered) style = "bg-white/5 opacity-50";
          return (
            <button key={c} disabled={answered} onClick={() => onPick(i)} className={`rounded-xl py-3 text-base font-bold transition ${style}`}>
              {c}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="mt-3 rounded-xl bg-black/30 p-3 text-sm">
          <div className="mb-1 font-bold">{quiz.picked === q.answer ? "⭕ 정답!" : "❌ 아쉬워요!"}</div>
          <div className="text-white/80">{q.explain}</div>
          <button onClick={onNext} className="mt-3 w-full rounded-lg bg-cyan-400 py-2 font-bold text-zinc-900 hover:bg-cyan-300">
            {quiz.index + 1 >= QUIZ_LENGTH ? "결과 보기" : "다음 문제 ▶"}
          </button>
        </div>
      )}
      <p className="mt-3 text-center text-xs text-white/50">
        맞힌 문제 {quiz.correct}개 · 최고 기록 {best}점 · 최고 연속 {bestStreak}개
      </p>
    </Section>
  );
}

export function GalleryPanel(props: {
  gallery: SavedShape[];
  picked: string[]; // 교배할 도형 (최대 2개)
  onLoad: (g: SavedShape) => void;
  onDelete: (g: SavedShape) => void;
  onRename: (g: SavedShape) => void;
  onFavorite: (g: SavedShape) => void;
  onPick: (g: SavedShape) => void;
  onBreed: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  // 즐겨찾기 먼저, 그다음 최근에 만든 순서
  const sorted = [...props.gallery].sort((a, b) => Number(b.favorite ?? false) - Number(a.favorite ?? false) || b.createdAt - a.createdAt);
  return (
    <>
      <Section title="🧬 도형 교배 · 파일">
        <p className="mb-2 text-xs text-white/60">도형 두 개의 🧬 버튼을 눌러 고른 다음 섞어 보세요. 새로운 도형이 태어나요!</p>
        <button
          onClick={props.onBreed}
          disabled={props.picked.length !== 2}
          className="mb-2 w-full rounded-lg bg-fuchsia-500 py-2 font-bold enabled:hover:bg-fuchsia-400 disabled:opacity-30"
        >
          🧬 두 도형 섞기 ({props.picked.length}/2)
        </button>
        <div className="grid grid-cols-2 gap-1.5 text-sm">
          <button onClick={props.onExport} disabled={props.gallery.length === 0} className="rounded-lg bg-white/10 py-2 enabled:hover:bg-white/20 disabled:opacity-30">
            📤 갤러리 파일로 저장
          </button>
          <button onClick={() => fileRef.current?.click()} className="rounded-lg bg-white/10 py-2 hover:bg-white/20">
            📥 파일 불러오기
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) props.onImport(f);
              e.target.value = "";
            }}
          />
        </div>
      </Section>
      <Section title={`🖼 내 도형 갤러리 (${props.gallery.length}/${GALLERY_LIMIT})`}>
        {props.gallery.length === 0 && <p className="text-sm text-white/60">아직 저장한 도형이 없어요. 만들기에서 💾 저장을 눌러 보세요!</p>}
        <div className="grid grid-cols-2 gap-2">
          {sorted.map((g) => {
            const picked = props.picked.includes(g.id);
            return (
              <div key={g.id} className={`relative overflow-hidden rounded-xl bg-black/30 ${picked ? "ring-2 ring-fuchsia-400" : ""}`}>
                <div className="absolute right-1 top-1 flex gap-1">
                  <button onClick={() => props.onFavorite(g)} title="즐겨찾기" className="rounded-full bg-black/50 px-1.5 text-sm">
                    {g.favorite ? "⭐" : "☆"}
                  </button>
                  <button onClick={() => props.onPick(g)} title="교배할 도형으로 고르기" className={`rounded-full px-1.5 text-sm ${picked ? "bg-fuchsia-500" : "bg-black/50"}`}>
                    🧬
                  </button>
                </div>
                {g.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 만든 data URL 썸네일이라 next/image 최적화 대상이 아님
                  <img src={g.thumb} alt={g.name} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square items-center justify-center text-4xl">{baseInfo(g.params.base).emoji}</div>
                )}
                <div className="p-2">
                  <button onClick={() => props.onRename(g)} title="이름 바꾸기" className="block w-full truncate text-left text-sm font-bold hover:text-yellow-300">
                    {g.name} ✏️
                  </button>
                  <div className="mt-1 grid grid-cols-2 gap-1 text-xs">
                    <button onClick={() => props.onLoad(g)} className="rounded bg-cyan-400 py-1 font-bold text-zinc-900">
                      불러오기
                    </button>
                    <button onClick={() => props.onDelete(g)} className="rounded bg-white/10 py-1 hover:bg-rose-500/60">
                      지우기
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}

export function TrophyPanel({ save }: { save: SaveData }) {
  const lv = levelOf(save.progress.xp);
  return (
    <>
      <Section title="🏅 내 레벨">
        <div className="flex items-center justify-between">
          <span className="text-lg font-extrabold text-yellow-300">
            Lv.{lv.level} {lv.title}
          </span>
          <span className="text-xs text-white/60">경험치 {save.progress.xp}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
          <div className="h-full bg-yellow-400" style={{ width: `${lv.progress * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-white/50">다음 레벨까지 {lv.toNext} · 도전과제, 저장, 퀴즈, 맞추기로 경험치를 모아요</p>
      </Section>
      <Section title={`🏆 도전과제 ${save.unlocked.length}/${ACHIEVEMENTS.length}`}>
        <ul className="space-y-2">
          {ACHIEVEMENTS.map((a) => {
            const done = save.unlocked.includes(a.id);
            return (
              <li key={a.id} className={`flex items-center gap-3 rounded-xl p-2 ${done ? "bg-yellow-400/20" : "bg-black/20 opacity-60"}`}>
                <span className={`text-2xl ${done ? "" : "grayscale"}`}>{a.emoji}</span>
                <div>
                  <div className="text-sm font-bold">
                    {a.title} {done && "✅"}
                  </div>
                  <div className="text-xs text-white/70">{a.desc}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>
    </>
  );
}
