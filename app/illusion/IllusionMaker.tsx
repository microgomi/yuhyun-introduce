"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Confetti, makeConfetti, type ConfettiPiece } from "../shapemaker/Confetti";
import { playSfx } from "../shapemaker/sound";
import { IllusionSvg } from "./illusionDraw";
import {
  CLEAR_SCORE,
  isSnapped,
  stageScore,
  STAGES,
  type Placement,
} from "./illusionPuzzle";
import { PuzzleStage } from "./PuzzleStage";
import { makeQuestion, QUIZ_LENGTH, type QuizQuestion } from "./illusionQuiz";
import {
  DEFAULT_KIND,
  specOf,
  strengthLabel,
  strengthOf,
  type Kind,
  type Params,
} from "./illusionSpec";
import {
  decodeShare,
  downloadBlob,
  encodeShare,
  readGallery,
  svgToPng,
  writeGallery,
  type SavedIllusion,
} from "./illusionShare";
import { KindPicker, kindTitle, Section, Slider, Toggle } from "./ui";

type Mode = "make" | "quiz" | "puzzle";

export default function IllusionMaker() {
  const [mode, setMode] = useState<Mode>("make");
  const [kind, setKind] = useState<Kind>(DEFAULT_KIND);
  const [params, setParams] = useState<Params>({ ...specOf(DEFAULT_KIND).defaults });
  const [revealed, setRevealed] = useState(false);
  const [gallery, setGallery] = useState<SavedIllusion[]>([]);
  const [toast, setToast] = useState("");

  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  const [stageIndex, setStageIndex] = useState(0);
  const [placements, setPlacements] = useState<Record<string, Placement>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [cleared, setCleared] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const loadedRef = useRef(false);
  /** 이미 "딱" 소리를 낸 조각. 같은 자리에서 소리가 반복되지 않게 한다. */
  const snappedRef = useRef<Set<string>>(new Set());

  // 갤러리와 공유 링크는 브라우저에만 있다. 서버 렌더 결과와 어긋나지 않도록
  // 마운트 뒤 마이크로태스크에서 읽는다.
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setGallery(readGallery());
      const code = new URLSearchParams(window.location.search).get("i");
      if (code === null) return;
      const shared = decodeShare(code);
      if (shared === null) return;
      setKind(shared.kind);
      setParams(shared.params);
      setToast("친구가 만든 착시를 불러왔어요! 🔗");
      setTimeout(() => setToast(""), 2200);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 1800);
  }, []);

  const spec = specOf(kind);
  const strength = strengthOf(kind, params);
  const label = strengthLabel(strength);

  const pickKind = useCallback((next: Kind) => {
    playSfx("click");
    setKind(next);
    setParams({ ...specOf(next).defaults });
    setRevealed(false);
  }, []);

  const save = useCallback(() => {
    const item: SavedIllusion = {
      id: Date.now(),
      name: `${spec.emoji} ${spec.name} (세기 ${strength})`,
      kind,
      params: { ...params },
    };
    const list = [item, ...gallery].slice(0, 12);
    setGallery(list);
    writeGallery(list);
    playSfx("save");
    showToast("갤러리에 저장했어요! 🖼️");
  }, [spec, strength, kind, params, gallery, showToast]);

  const removeItem = useCallback(
    (id: number) => {
      const list = gallery.filter((item) => item.id !== id);
      setGallery(list);
      writeGallery(list);
      playSfx("click");
    },
    [gallery]
  );

  const loadItem = useCallback((item: SavedIllusion) => {
    playSfx("click");
    setKind(item.kind);
    setParams({ ...item.params });
    setRevealed(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const savePhoto = useCallback(() => {
    const svg = svgRef.current;
    if (svg === null) return;
    void svgToPng(svg)
      .then((blob) => {
        downloadBlob(blob, `내착시-${spec.name}.png`);
        playSfx("save");
        showToast("사진으로 저장했어요! 📸");
      })
      .catch((err: unknown) => {
        console.warn("사진을 저장하지 못했어요", err);
        showToast("사진 저장에 실패했어요 😢");
      });
  }, [spec, showToast]);

  const copyLink = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?i=${encodeShare(kind, params)}`;
    void navigator.clipboard
      .writeText(url)
      .then(() => {
        playSfx("save");
        showToast("링크를 복사했어요! 친구에게 보내보세요 🔗");
      })
      .catch((err: unknown) => {
        console.warn("링크를 복사하지 못했어요", err);
        showToast("복사에 실패했어요 😢");
      });
  }, [kind, params, showToast]);

  // ── 퍼즐 ──
  const stage = STAGES[Math.min(stageIndex, STAGES.length - 1)];
  const puzzleScore = stageScore(stage, placements);

  const resetStage = useCallback((index: number) => {
    snappedRef.current = new Set();
    setStageIndex(index);
    setPlacements({});
    setSelectedId(null);
    setShowHint(false);
    setCleared(false);
  }, []);

  const startPuzzle = useCallback(() => {
    playSfx("click");
    setMode("puzzle");
    setConfetti([]);
    resetStage(0);
  }, [resetStage]);

  const movePiece = useCallback(
    (id: string, next: Placement) => {
      const piece = stage.pieces.find((p) => p.id === id);
      if (piece === undefined || cleared) return;

      const updated = { ...placements, [id]: next };
      setPlacements(updated);

      // 제자리에 막 들어온 순간에만 "딱" 소리를 낸다.
      const nowSnapped = isSnapped(piece, next);
      if (nowSnapped && !snappedRef.current.has(id)) {
        snappedRef.current.add(id);
        playSfx("good");
      } else if (!nowSnapped) {
        snappedRef.current.delete(id);
      }

      // 완성 판정은 조각을 움직인 결과로만 일어난다.
      if (stageScore(stage, updated) >= CLEAR_SCORE) {
        setCleared(true);
        setConfetti(makeConfetti());
        playSfx("fanfare");
      }
    },
    [stage, placements, cleared]
  );

  const rotateSelected = useCallback(
    (delta: number) => {
      if (selectedId === null) return;
      const piece = stage.pieces.find((p) => p.id === selectedId);
      if (piece === undefined || !piece.rotatable) return;
      const at = placements[selectedId] ?? piece.start;
      movePiece(selectedId, { ...at, rot: at.rot + delta });
    },
    [selectedId, stage, placements, movePiece]
  );

  // ── 퀴즈 ──
  const startQuiz = useCallback(() => {
    playSfx("click");
    setMode("quiz");
    setQuizIndex(0);
    setScore(0);
    setPicked(null);
    setConfetti([]);
    setQuestion(makeQuestion());
  }, []);

  const answerQuiz = useCallback(
    (choice: number) => {
      if (question === null || picked !== null) return;
      setPicked(choice);
      if (choice === question.answer) {
        setScore((prev) => prev + 1);
        playSfx("good");
      } else {
        playSfx("bad");
      }
    },
    [question, picked]
  );

  const nextQuestion = useCallback(() => {
    const next = quizIndex + 1;
    setPicked(null);
    if (next >= QUIZ_LENGTH) {
      setQuizIndex(next);
      setQuestion(null);
      playSfx(score >= QUIZ_LENGTH - 2 ? "fanfare" : "levelup");
      if (score >= QUIZ_LENGTH - 2) setConfetti(makeConfetti());
      return;
    }
    setQuizIndex(next);
    setQuestion(makeQuestion(question?.kind));
    playSfx("click");
  }, [quizIndex, score, question]);

  const quizDone = mode === "quiz" && question === null && quizIndex >= QUIZ_LENGTH;

  return (
    <div className="relative min-h-screen bg-[#0b1026] text-white">
      {confetti.length > 0 && <Confetti pieces={confetti} />}

      <Link
        href="/"
        className="fixed left-3 top-3 z-50 rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur transition hover:bg-white/25"
      >
        ← 홈으로
      </Link>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-yellow-400 px-6 py-3 font-bold text-zinc-900 shadow-lg">
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-lg px-4 pb-16 pt-16">
        <div className="mb-5 text-center">
          <div className="mb-2 text-6xl">🌀</div>
          <h1 className="mb-1 text-3xl font-black">착시 만들기</h1>
          <p className="text-sm text-white/60">값을 바꿔 나만의 착시를 만들고 친구를 속여보세요!</p>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <Toggle
            active={mode === "make"}
            onClick={() => {
              playSfx("click");
              setMode("make");
            }}
          >
            🛠️ 만들기
          </Toggle>
          <Toggle active={mode === "puzzle"} onClick={startPuzzle}>
            🧩 퍼즐
          </Toggle>
          <Toggle active={mode === "quiz"} onClick={startQuiz}>
            🧠 퀴즈
          </Toggle>
        </div>

        {mode === "make" && (
          <>
            <Section title="어떤 착시를 만들까요?">
              <KindPicker value={kind} onPick={pickKind} />
            </Section>

            <p className="mb-2 text-center text-sm text-white/70">{spec.question}</p>
            <div className="mb-3 overflow-hidden rounded-2xl">
              <IllusionSvg
                ref={svgRef}
                kind={kind}
                params={params}
                revealed={revealed}
                className="w-full"
              />
            </div>

            <Section title="착시 세기">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-white/60">{kindTitle(kind)}</span>
                <span className={`font-black ${label.color}`}>
                  {strength} · {label.text}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-yellow-400 to-fuchsia-500 transition-all duration-200"
                  style={{ width: `${strength}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-white/50">💡 {spec.tip}</p>
            </Section>

            <Section title="값 조절하기">
              {spec.sliders.map((slider) => (
                <Slider
                  key={slider.key}
                  def={slider}
                  value={params[slider.key]}
                  initial={spec.defaults[slider.key]}
                  onChange={(v) => setParams((prev) => ({ ...prev, [slider.key]: v }))}
                />
              ))}
            </Section>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <Toggle active={revealed} onClick={() => setRevealed((prev) => !prev)}>
                {revealed ? "🙈 정답 숨기기" : "🔍 정답 확인"}
              </Toggle>
              <Toggle
                active={false}
                onClick={() => {
                  playSfx("click");
                  setParams({ ...spec.defaults });
                  setRevealed(false);
                }}
              >
                ↺ 처음으로
              </Toggle>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              <Toggle active={false} onClick={save}>
                🖼️ 저장
              </Toggle>
              <Toggle active={false} onClick={savePhoto}>
                📸 사진
              </Toggle>
              <Toggle active={false} onClick={copyLink}>
                🔗 링크
              </Toggle>
            </div>

            {revealed && (
              <div className="mb-4 space-y-1 rounded-2xl bg-black/40 p-4 text-sm">
                <p className="font-bold text-emerald-300">✅ {spec.answer}</p>
                <p className="text-white/60">💡 {spec.why}</p>
              </div>
            )}

            <Section title="🖼️ 내가 만든 착시">
              {gallery.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-xs text-white/40">
                  아직 없어요. 마음에 드는 착시를 만들고 저장을 눌러보세요!
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {gallery.map((item) => (
                    <div key={item.id} className="overflow-hidden rounded-xl bg-white/5">
                      <button onClick={() => loadItem(item)} className="block w-full">
                        <IllusionSvg kind={item.kind} params={item.params} revealed={false} className="w-full" />
                      </button>
                      <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                        <span className="truncate text-[11px] text-white/60">{item.name}</span>
                        <button
                          onClick={() => removeItem(item.id)}
                          aria-label="삭제"
                          className="shrink-0 text-xs text-white/40 transition hover:text-rose-400"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}

        {mode === "puzzle" && (
          <>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-white/60">
                {stageIndex + 1} / {STAGES.length} 단계 · {stage.emoji} {stage.name}
              </span>
              <span className={`font-black ${cleared ? "text-emerald-300" : "text-yellow-300"}`}>
                완성도 {puzzleScore}%
              </span>
            </div>

            <div className="mb-2 h-3 overflow-hidden rounded-full bg-black/40">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  cleared ? "bg-emerald-400" : "bg-gradient-to-r from-cyan-400 to-yellow-400"
                }`}
                style={{ width: `${puzzleScore}%` }}
              />
            </div>

            <p className="mb-3 text-center text-sm text-white/70">{stage.goal}</p>

            <div className="mb-3 overflow-hidden rounded-2xl">
              <PuzzleStage
                stage={stage}
                placements={placements}
                onMove={movePiece}
                selectedId={selectedId}
                onSelect={setSelectedId}
                showHint={showHint}
                cleared={cleared}
              />
            </div>

            {!cleared && (
              <>
                <Section title="조각 돌리기">
                  <p className="mb-2 text-xs text-white/50">
                    {selectedId === null
                      ? "조각을 한 번 누르면 고를 수 있어요. 끌어서 옮기고, 아래 버튼으로 돌려요."
                      : "고른 조각을 15°씩 돌려보세요."}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => rotateSelected(-15)}
                      disabled={selectedId === null}
                      className="rounded-lg bg-white/10 py-2 text-sm transition hover:bg-white/20 disabled:opacity-40"
                    >
                      ↺ 왼쪽으로
                    </button>
                    <button
                      onClick={() => rotateSelected(15)}
                      disabled={selectedId === null}
                      className="rounded-lg bg-white/10 py-2 text-sm transition hover:bg-white/20 disabled:opacity-40"
                    >
                      ↻ 오른쪽으로
                    </button>
                  </div>
                </Section>

                <div className="mb-4 grid grid-cols-2 gap-2">
                  <Toggle
                    active={showHint}
                    onClick={() => {
                      playSfx("click");
                      setShowHint((prev) => !prev);
                    }}
                  >
                    {showHint ? "💡 힌트 끄기" : "💡 힌트 보기"}
                  </Toggle>
                  <Toggle
                    active={false}
                    onClick={() => {
                      playSfx("click");
                      resetStage(stageIndex);
                    }}
                  >
                    ↺ 다시 놓기
                  </Toggle>
                </div>
              </>
            )}

            {cleared && (
              <div className="mb-4">
                <div className="mb-3 space-y-1 rounded-2xl bg-black/40 p-4 text-sm">
                  <p className="text-lg font-black text-emerald-300">🎉 {stage.revealTitle} 완성!</p>
                  <p className="text-white/70">{stage.why}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      playSfx("click");
                      setConfetti([]);
                      resetStage(stageIndex);
                    }}
                    className="rounded-full bg-white/15 px-4 py-3 font-bold transition hover:bg-white/25 active:scale-95"
                  >
                    ↺ 다시 하기
                  </button>
                  {stageIndex + 1 < STAGES.length ? (
                    <button
                      onClick={() => {
                        playSfx("click");
                        setConfetti([]);
                        resetStage(stageIndex + 1);
                      }}
                      className="rounded-full bg-yellow-400 px-4 py-3 font-black text-zinc-900 transition hover:scale-105 active:scale-95"
                    >
                      다음 단계 →
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        playSfx("click");
                        setConfetti([]);
                        setMode("make");
                      }}
                      className="rounded-full bg-yellow-400 px-4 py-3 font-black text-zinc-900 transition hover:scale-105 active:scale-95"
                    >
                      🏆 전부 클리어!
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {mode === "quiz" && question !== null && (
          <>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-white/60">
                {quizIndex + 1} / {QUIZ_LENGTH} 번째
              </span>
              <span className="font-bold text-yellow-300">⭐ {score}점</span>
            </div>

            <div className="mb-4 overflow-hidden rounded-2xl">
              <IllusionSvg kind={question.kind} params={question.params} revealed={false} className="w-full" />
            </div>

            <p className="mb-3 text-center text-lg font-bold">{question.text}</p>

            <div className="mb-4 space-y-2">
              {question.choices.map((choice, i) => {
                const isAnswer = i === question.answer;
                const isPicked = i === picked;
                const show = picked !== null;
                return (
                  <button
                    key={i}
                    onClick={() => answerQuiz(i)}
                    disabled={show}
                    className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${
                      show && isAnswer
                        ? "bg-emerald-500 font-bold text-white"
                        : show && isPicked
                          ? "bg-rose-500 text-white"
                          : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {picked !== null && (
              <>
                <div className="mb-3 rounded-2xl bg-black/40 p-4 text-sm">
                  <p className="mb-1 font-bold text-cyan-200">
                    {picked === question.answer ? "🎉 정답이에요!" : "😅 아쉬워요!"}
                  </p>
                  <p className="text-white/70">{question.explain}</p>
                </div>
                <button
                  onClick={nextQuestion}
                  className="w-full rounded-full bg-yellow-400 px-6 py-3 font-black text-zinc-900 transition hover:scale-[1.02] active:scale-95"
                >
                  {quizIndex + 1 >= QUIZ_LENGTH ? "결과 보기 🏁" : "다음 문제 →"}
                </button>
              </>
            )}
          </>
        )}

        {quizDone && (
          <div className="py-10 text-center">
            <div className="mb-4 text-7xl">{score >= QUIZ_LENGTH - 2 ? "🏆" : score >= 6 ? "😃" : "🙂"}</div>
            <p className="mb-2 text-sm text-white/60">{QUIZ_LENGTH}문제 중</p>
            <p className="mb-6 text-6xl font-black text-yellow-300">{score}개 정답!</p>
            <div className="flex gap-2">
              <button
                onClick={startQuiz}
                className="flex-1 rounded-full bg-yellow-400 px-6 py-3 font-black text-zinc-900 transition hover:scale-105 active:scale-95"
              >
                다시 풀기 🔄
              </button>
              <button
                onClick={() => {
                  playSfx("click");
                  setMode("make");
                  setConfetti([]);
                }}
                className="flex-1 rounded-full bg-white/15 px-6 py-3 font-bold transition hover:bg-white/25 active:scale-95"
              >
                만들러 가기 🛠️
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
