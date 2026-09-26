"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ShapeScene, type CameraView, type InsetRect } from "./shapeScene";
import { BASES, baseInfo, buildShape, DEFAULT_PARAMS, MAX_EXTRAS, vertexAngleSum, type BaseKey, type ShapeParams } from "./shapeGeometry";
import {
  ACHIEVEMENTS,
  autoName,
  breed,
  dailyTarget,
  GALLERY_LIMIT,
  galleryFileText,
  levelOf,
  loadSave,
  makeTarget,
  parseGalleryFile,
  scoreMatch,
  starsFor,
  todayKey,
  writeSave,
  XP,
  type GameProgress,
  type Look,
  type SaveData,
  type SavedShape,
} from "./shapeGame";
import { makeQuestion, QUIZ_LENGTH } from "./shapeQuiz";
import { dataUrlToBlob, decodeShare, downloadBlob, encodeShare, toObj, toStl } from "./shapeExport";
import { animateParams, type Anim } from "./shapeAnim";
import { playSfx, speak, type Sfx } from "./sound";
import { Confetti, makeConfetti, type ConfettiPiece } from "./Confetti";
import { COLORS, FreePanel, type ViewSettings } from "./FreePanel";
import { BlackHoleCard } from "./BlackHoleCard";
import type { BlackHoleStats } from "./cosmicEater";
import { gainMultiplier, levelOf as cosmicLevelOf, stageOf } from "./cosmic";
import { PlanetPanel, type SolarView } from "./PlanetPanel";
import { BODIES, bodyInfo, type BodyInfo, type BodyKey } from "./solarSystem";
import { GalleryPanel, MatchPanel, QuizPanel, TrophyPanel, type QuizState } from "./Panels";

type Mode = "free" | "match" | "quiz" | "gallery" | "trophy";

const QUIZ_LOOK: Look = { colorMode: "rainbow", color: COLORS[0] };
const MATCH_START: ShapeParams = { ...DEFAULT_PARAMS, subdiv: 2 };
const HISTORY_LIMIT = 50;
// 슬라이더를 끄는 동안 생기는 변화는 되돌리기 한 칸으로 묶는다
const COALESCE_MS = 700;
const RUSH_MS = 60_000;

const SHORTCUTS: [string, string][] = [
  ["Ctrl + Z", "되돌리기"],
  ["Ctrl + Shift + Z", "다시하기"],
  ["R", "랜덤 도형"],
  ["S", "갤러리에 저장"],
  ["스페이스", "자동 회전 켜기/끄기"],
  ["F", "전체화면"],
  ["H", "패널 숨기기/보이기"],
  ["?", "이 도움말"],
];

// 이벤트 핸들러에서만 부르는 시간/아이디/난수 헬퍼 (렌더 중에는 호출하지 않음)
const nowMs = () => Date.now();
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const chance = (p: number) => Math.random() < p;

function randomShape(base: ShapeParams): ShapeParams {
  const r = (min: number, max: number, step: number) => Math.round((min + Math.random() * (max - min)) / step) * step;
  return {
    ...base,
    base: BASES[Math.floor(Math.random() * BASES.length)].key,
    twist: chance(0.7) ? r(-270, 270, 15) : 0,
    spike: chance(0.6) ? r(-0.3, 1.2, 0.05) : 0,
    height: r(0.6, 1.8, 0.05),
    width: r(0.6, 1.6, 0.05),
    depth: r(0.6, 1.6, 0.05),
    shear: chance(0.3) ? r(-25, 25, 1) : 0,
    bend: chance(0.3) ? r(-90, 90, 5) : 0,
    taper: chance(0.3) ? r(-0.7, 0.7, 0.05) : 0,
    wave: chance(0.25) ? r(0.1, 0.35, 0.02) : 0,
    waveCount: Math.floor(1 + Math.random() * 6),
    rotX: chance(0.2) ? r(-60, 60, 15) : 0,
    rotZ: chance(0.2) ? r(-60, 60, 15) : 0,
    spherify: chance(0.2) ? r(0.3, 1, 0.05) : 0,
    snake: chance(0.2) ? r(0.1, 0.5, 0.05) : 0,
    snakeCount: Math.floor(1 + Math.random() * 4),
    steps: chance(0.15) ? Math.floor(3 + Math.random() * 8) : 0,
    bulge: chance(0.25) ? r(-0.5, 0.8, 0.05) : 0,
    noise: chance(0.15) ? r(0.05, 0.3, 0.02) : 0,
    explode: 0,
    slice: 0,
    copies: 1,
    sizePct: 100,
    subdiv: Math.floor(Math.random() * 3),
    pulls: {},
  };
}

// 새로 추가한 도형들: 내 도형과 같은 효과를 주고 기본 도형만 바꾼다 (꼭짓점 번호는 도형마다 달라 당기기는 뺌).
// 100개까지 늘어나므로 같은 기본 도형은 한 번만 계산해서 같은 객체를 돌려준다 → 화면에서도 한 번에 그림.
function buildExtras(P: ShapeParams) {
  const cache = new Map<BaseKey, ReturnType<typeof buildShape>>();
  return P.extras.map((base) => {
    let b = cache.get(base);
    if (!b) {
      b = buildShape({ ...P, base, pulls: {}, extras: [] });
      cache.set(base, b);
    }
    return b;
  });
}

// 3D 프린터로 뽑았을 때 크기 (반지름 1 = 30mm)
function realSize(radius: number): string {
  const mm = radius * 2 * 30;
  if (mm < 10) return `${mm.toFixed(1)}mm`;
  if (mm < 1000) return `${(mm / 10).toFixed(1)}cm`;
  return `${(mm / 1000).toFixed(2)}m`;
}

// 받침이 있으면 앞 글자, 없으면 뒤 글자 ("초신성이" / "은하수가")
function josa(word: string, withBatchim: string, without: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return word + (code >= 0 && code <= 11171 && code % 28 !== 0 ? withBatchim : without);
}

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: n < 10 ? 2 : 0 });

function readSharedShape() {
  const code = new URLSearchParams(window.location.search).get("s");
  return code ? decodeShare(code) : null;
}

function newQuiz(): QuizState {
  return { question: makeQuestion(), index: 0, correct: 0, streak: 0, picked: null, finished: false };
}

export default function ShapeMaker() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ShapeScene | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const confettiTimer = useRef<number | undefined>(undefined);
  const lastEdit = useRef({ key: "", at: 0 });
  const keyActions = useRef<Record<string, () => void>>({});
  const finishRushRef = useRef<() => void>(() => {});

  const [shared] = useState(readSharedShape);
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [mode, setMode] = useState<Mode>("free");
  const [freeParams, setFreeParams] = useState<ShapeParams>(shared?.p ?? DEFAULT_PARAMS);
  const [past, setPast] = useState<ShapeParams[]>([]);
  const [future, setFuture] = useState<ShapeParams[]>([]);
  const [matchParams, setMatchParams] = useState<ShapeParams>(MATCH_START);
  const [target, setTarget] = useState<ShapeParams>(() => makeTarget(save.matchRound));
  const [daily, setDaily] = useState(false);
  const [rush, setRush] = useState<{ endsAt: number; solved: number; finished: boolean } | null>(null);
  const [now, setNow] = useState(nowMs);
  const [hint, setHint] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [look, setLook] = useState<Look>(shared?.l ?? { colorMode: "rainbow", color: COLORS[0] });
  const [view, setView] = useState<ViewSettings>({ bg: "space", showGrid: false, showAxes: false, showEdges: true, autoRotate: true, rotateSpeed: 1, lightAngle: 50, hurricane: true, blackHole: true, bhSize: 1, bhGrown: 0, bhBright: 1, bhPull: 1, solar: true });
  const [solar, setSolar] = useState<SolarView | null>(null);
  const [showPlanets, setShowPlanets] = useState(false);
  const swallowRef = useRef<(info: BodyInfo) => void>(() => {});
  const tearRef = useRef<(info: BodyInfo) => void>(() => {});
  const [bhStats, setBhStats] = useState<BlackHoleStats | null>(null);
  const [showHandles, setShowHandles] = useState(false);
  const [anim, setAnim] = useState<Anim>("none");
  const [selected, setSelected] = useState<number | null>(null);
  const [inset, setInset] = useState<InsetRect | null>(null);
  const [toast, setToast] = useState<string | null>(shared ? "🔗 공유받은 도형을 불러왔어요!" : null);
  const [confetti, setConfetti] = useState<ConfettiPiece[] | null>(null);
  const [saveName, setSaveName] = useState("");
  const [panelHidden, setPanelHidden] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  const inMatch = mode === "match";
  const inQuiz = mode === "quiz" && quiz !== null;
  const params = inMatch ? matchParams : inQuiz ? quiz.question.shape : freeParams;
  const viewLook = inQuiz ? QUIZ_LOOK : look;
  const built = useMemo(() => buildShape(params), [params]);
  const extrasBuilt = useMemo(() => (mode === "free" ? buildExtras(freeParams) : []), [freeParams, mode]);
  const targetBuilt = useMemo(() => buildShape(target), [target]);
  const match = useMemo(() => scoreMatch(matchParams, target), [matchParams, target]);
  const matchStars = starsFor(match.score);
  const animating = anim !== "none" && mode === "free";
  const handlesOn = showHandles && mode === "free" && !animating && params.explode === 0 && params.extras.length === 0;
  const angleSum = useMemo(
    () => (selected !== null && mode === "free" ? vertexAngleSum(freeParams, selected) : null),
    [freeParams, selected, mode],
  );
  const lv = levelOf(save.progress.xp);
  const rushView = rush ? { secondsLeft: Math.max(0, Math.ceil((rush.endsAt - now) / 1000)), solved: rush.solved, finished: rush.finished } : null;

  // --- three.js 연결 ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const scene = new ShapeScene(el);
    scene.onVertexPick = (i) => setSelected(i);
    scene.onInset = (rect) => setInset(rect);
    scene.onSwallow = (info) => swallowRef.current(info);
    scene.onTear = (info) => tearRef.current(info);
    sceneRef.current = scene;
    // 공유 링크 안내 토스트를 잠시 뒤 닫는다
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
    return () => {
      scene.dispose();
      sceneRef.current = null;
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(confettiTimer.current);
    };
  }, []);

  useEffect(() => {
    if (animating) return;
    sceneRef.current?.setShape(built, {
      look: viewLook,
      showEdges: view.showEdges,
      showHandles: handlesOn,
      selected,
      copies: params.copies,
      slice: params.slice,
      hurricane: view.hurricane,
      extras: extrasBuilt,
      blackHole: view.blackHole,
      solar: view.solar && mode === "free",
    });
  }, [built, extrasBuilt, viewLook, view.showEdges, handlesOn, selected, animating, params.copies, params.slice, view.hurricane, view.blackHole, view.solar, mode]);

  // 움직이는 도형: 매 프레임 변형 값을 바꿔 다시 계산 (저장되는 값은 그대로)
  useEffect(() => {
    if (!animating) return;
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const P = animateParams(freeParams, anim, (t - start) / 1000);
      sceneRef.current?.setShape(buildShape(P), { look, showEdges: view.showEdges, showHandles: false, selected: null, copies: P.copies, slice: P.slice, hurricane: view.hurricane, extras: buildExtras(P), blackHole: view.blackHole, solar: view.solar });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animating, anim, freeParams, look, view.showEdges, view.hurricane, view.blackHole, view.solar]);

  useEffect(() => {
    sceneRef.current?.setTarget(inMatch ? targetBuilt : null, look);
  }, [inMatch, targetBuilt, look]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.autoRotate = view.autoRotate;
    scene.rotateSpeed = view.rotateSpeed;
    scene.setLightAngle(view.lightAngle);
  }, [view.autoRotate, view.rotateSpeed, view.lightAngle]);
  useEffect(() => sceneRef.current?.setBackground(view.bg), [view.bg]);
  useEffect(() => sceneRef.current?.setBlackHole({ size: view.bhSize, brightness: view.bhBright, pull: view.bhPull }), [view.bhSize, view.bhBright, view.bhPull]);

  // 블랙홀 통계는 1초에 4번 읽어 온다 (매 프레임 화면을 다시 그릴 필요는 없음)
  useEffect(() => {
    const id = window.setInterval(() => {
      setBhStats(sceneRef.current?.blackHoleStats() ?? null);
      setSolar(sceneRef.current?.solarStatus() ?? null);
    }, 250);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => sceneRef.current?.setGrid(view.showGrid), [view.showGrid]);
  useEffect(() => sceneRef.current?.setAxes(view.showAxes), [view.showAxes]);

  // 타임어택 시계
  const rushRunning = rush !== null && !rush.finished;
  useEffect(() => {
    if (!rushRunning) return;
    const id = window.setInterval(() => {
      const t = nowMs();
      setNow(t);
      finishRushRef.current();
    }, 250);
    return () => window.clearInterval(id);
  }, [rushRunning]);

  // 키보드 단축키 (입력칸에 글자를 쓰는 중에는 무시)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t instanceof HTMLInputElement && (t.type === "text" || t.type === "number");
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (typing) return;
        e.preventDefault();
        keyActions.current[e.shiftKey ? "redo" : "undo"]?.();
        return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey || t instanceof HTMLTextAreaElement) return;
      const onControl = t instanceof HTMLInputElement || t instanceof HTMLButtonElement;
      const key = e.key === " " ? "space" : e.key.toLowerCase();
      if (key === "space" && onControl) return;
      const action = { r: "random", s: "save", space: "rotate", f: "fullscreen", h: "panel", "?": "help", "/": "help", escape: "escape" }[key];
      if (!action || !keyActions.current[action]) return;
      e.preventDefault();
      keyActions.current[action]();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // --- 알림 · 소리 · 폭죽 ---
  function sfx(s: Sfx) {
    if (save.settings.sound) playSfx(s);
  }

  function showToast(msg: string) {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }

  function celebrate() {
    setConfetti(makeConfetti());
    window.clearTimeout(confettiTimer.current);
    confettiTimer.current = window.setTimeout(() => setConfetti(null), 3200);
  }

  // --- 진행 상황 저장 + 도전과제 + 경험치 ---
  function commit(nextSave: SaveData, P: ShapeParams = freeParams, xpGain = 0) {
    let data: SaveData = { ...nextSave, progress: { ...nextSave.progress, xp: nextSave.progress.xp + xpGain } };
    const fresh = ACHIEVEMENTS.filter((a) => !data.unlocked.includes(a.id) && a.check(P, data.progress));
    if (fresh.length) {
      data = {
        ...data,
        unlocked: [...data.unlocked, ...fresh.map((a) => a.id)],
        progress: { ...data.progress, xp: data.progress.xp + XP.achievement * fresh.length },
      };
    }
    setSave(data);
    if (!writeSave(data)) {
      showToast("⚠️ 저장 공간이 부족해서 저장하지 못했어요");
      return;
    }
    const before = levelOf(save.progress.xp).level;
    const after = levelOf(data.progress.xp);
    if (after.level > before) {
      showToast(`🎊 레벨 업! Lv.${after.level} ${after.title}`);
      sfx("levelup");
      celebrate();
    } else if (fresh.length) {
      showToast(`🏆 도전과제 달성! ${fresh.map((a) => `${a.emoji} ${a.title}`).join(", ")}`);
      sfx("fanfare");
      celebrate();
    }
  }

  // 자유 만들기 도형 바꾸기 (되돌리기 기록 + 도전과제 확인)
  function setFree(next: ShapeParams, editKey = "", progressPatch: Partial<GameProgress> = {}, xpGain = 0) {
    const t = nowMs();
    const coalesce = editKey !== "" && editKey === lastEdit.current.key && t - lastEdit.current.at < COALESCE_MS;
    if (!coalesce) setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), freeParams]);
    lastEdit.current = { key: editKey, at: t };
    setFuture([]);
    setFreeParams(next);

    let progress: GameProgress = { ...save.progress, ...progressPatch };
    if (!progress.touchedBases.includes(next.base)) progress = { ...progress, touchedBases: [...progress.touchedBases, next.base] };
    const changed = Object.keys(progressPatch).length > 0 || progress.touchedBases !== save.progress.touchedBases || xpGain > 0;
    const hasNew = ACHIEVEMENTS.some((a) => !save.unlocked.includes(a.id) && a.check(next, progress));
    if (hasNew || changed) commit({ ...save, progress }, next, xpGain);
  }

  function updateParams(patch: Partial<ShapeParams>, editKey = "") {
    setFree({ ...freeParams, ...patch }, editKey);
  }

  function undo() {
    const prev = past[past.length - 1];
    if (!prev || mode !== "free") return;
    setPast(past.slice(0, -1));
    setFuture([freeParams, ...future]);
    setFreeParams(prev);
    setSelected(null);
    lastEdit.current = { key: "", at: 0 };
  }

  function redo() {
    const next = future[0];
    if (!next || mode !== "free") return;
    setFuture(future.slice(1));
    setPast([...past, freeParams]);
    setFreeParams(next);
    setSelected(null);
    lastEdit.current = { key: "", at: 0 };
  }

  function pickBase(key: BaseKey) {
    setSelected(null);
    updateParams({ base: key, pulls: {} });
  }

  function addExtra(k: BaseKey) {
    if (freeParams.extras.length >= MAX_EXTRAS) {
      showToast(`도형은 ${MAX_EXTRAS}개까지 추가할 수 있어요`);
      return;
    }
    setSelected(null);
    updateParams({ extras: [...freeParams.extras, k] });
    sfx("click");
  }

  function removeExtra(index: number) {
    updateParams({ extras: freeParams.extras.filter((_, i) => i !== index) });
  }

  function randomExtras(add: number) {
    const count = Math.min(MAX_EXTRAS, freeParams.extras.length + add);
    const next = [...freeParams.extras];
    while (next.length < count) next.push(BASES[Math.floor(Math.random() * BASES.length)].key);
    setSelected(null);
    updateParams({ extras: next });
    sfx("click");
  }

  // --- 태양계 먹이기 ---
  function feedPlanet(key: BodyKey) {
    const info = bodyInfo(key);
    const result = sceneRef.current?.feedPlanet(key) ?? "no-hole";
    if (result === "ok") showToast(`🧲 ${info.name} 끌려가는 중… 로슈 한계(빨간 고리)를 넘으면 찢어져요!`);
    else if (result === "too-small") showToast(`📏 크기(질량)가 ${info.need.toLocaleString()}배 이상이어야 ${josa(info.name, "을", "를")} 먹을 수 있어요!`);
    else if (result === "no-hole") showToast("블랙홀이 있어야 먹일 수 있어요!");
  }

  function feedAllPlanets() {
    const count = sceneRef.current?.feedAllPlanets() ?? -1;
    if (count > 0) showToast("🍽️ 태양계 먹방 시작! (아직 작으면 큰 천체는 건너뛰어요)");
    else showToast(count === 0 ? "먹일 천체가 없어요" : "블랙홀이 있어야 먹일 수 있어요!");
  }

  function onTear(info: BodyInfo) {
    showToast(`🍝 ${josa(info.name, "이", "가")} 조석력에 찢어지고 있어요! 스파게티화!`);
    sfx("bad");
  }

  function onSwallow(info: BodyInfo) {
    // 먹은 만큼 크기 슬라이더가 커진다. 레벨이 높을수록 더 많이 자란다 (손으로 올리는 한도 50배를 넘어설 수 있다)
    const level = cosmicLevelOf(view.bhSize);
    const gain = info.grow * gainMultiplier(level);
    const nextLevel = cosmicLevelOf(view.bhSize + gain);
    setView((v) => ({ ...v, bhSize: v.bhSize + gain, bhGrown: v.bhGrown + gain }));
    const before = stageOf(level);
    const after = stageOf(nextLevel);
    const progressPatch = {
      maxCosmicLevel: Math.max(save.progress.maxCosmicLevel, nextLevel),
      ateAndromeda: save.progress.ateAndromeda || info.key === "andromeda",
    };
    if (after.key !== before.key) {
      window.setTimeout(() => showToast(`${after.emoji} 변신! Lv.${nextLevel} ${josa(after.name, "이", "가")} 되었어요!`), 1600);
      sfx("levelup");
      celebrate();
    }
    showToast(`😋 냠! ${josa(info.name, "을", "를")} 먹고 +${Math.round(gain).toLocaleString()}배 커졌어요!`);
    sfx(info.key === "earth" ? "bad" : "fanfare");
    const status = sceneRef.current?.solarStatus();
    const allEaten = !!status && BODIES.every((b) => status.states[b.key] === "eaten");
    if (allEaten && !save.progress.ateSolar) celebrate();
    const progress = { ...save.progress, ...progressPatch, ateSolar: save.progress.ateSolar || allEaten };
    if (JSON.stringify(progress) !== JSON.stringify(save.progress)) commit({ ...save, progress });
  }

  function pickDual() {
    const dual = baseInfo(freeParams.base).dual;
    if (!dual) return;
    setSelected(null);
    setFree({ ...freeParams, base: dual, pulls: {} }, "", { usedDual: true });
    showToast(`💞 ${baseInfo(freeParams.base).name}의 짝꿍은 ${baseInfo(dual).name}!`);
  }

  function startAnim(a: Anim) {
    setAnim(anim === a ? "none" : a);
    if (!save.progress.usedAnimation) commit({ ...save, progress: { ...save.progress, usedAnimation: true } });
  }

  function changeMode(next: Mode) {
    setMode(next);
    setSelected(null);
    if (next !== "match") setRush(null);
    if (next === "quiz" && quiz === null) setQuiz(newQuiz());
    sfx("click");
  }

  function randomize() {
    setSelected(null);
    setFree(randomShape(freeParams));
    sfx("click");
  }

  function resetShape() {
    setSelected(null);
    setFree({ ...DEFAULT_PARAMS, base: freeParams.base });
    sceneRef.current?.resetView();
  }

  function toggleFullscreen() {
    const req = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    req.catch((err: unknown) => {
      console.warn("전체화면을 바꾸지 못했어요", err);
      showToast("이 브라우저에서는 전체화면을 쓸 수 없어요");
    });
  }

  // --- 저장 / 내보내기 ---
  function saveShape() {
    const scene = sceneRef.current;
    if (!scene || mode !== "free") return;
    if (save.gallery.length >= GALLERY_LIMIT) {
      showToast(`갤러리가 가득 찼어요 (최대 ${GALLERY_LIMIT}개). 하나를 지워 주세요.`);
      return;
    }
    const item: SavedShape = {
      id: makeId(),
      name: saveName.trim() || autoName(freeParams),
      params: freeParams,
      look,
      thumb: scene.snapshot(),
      createdAt: nowMs(),
    };
    commit({ ...save, gallery: [item, ...save.gallery], progress: { ...save.progress, savedCount: save.progress.savedCount + 1 } }, freeParams, XP.save);
    setSaveName("");
    showToast(`💾 "${item.name}" 저장 완료! (+${XP.save} 경험치)`);
    sfx("save");
  }

  async function shareLink() {
    const url = `${window.location.origin}${window.location.pathname}?s=${encodeShare(freeParams, look)}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("🔗 공유 링크를 복사했어요! 친구에게 붙여넣기 해 보세요");
    } catch (err) {
      // 클립보드 권한이 없으면 직접 복사할 수 있게 보여준다
      console.warn("클립보드 복사 실패", err);
      window.prompt("이 링크를 복사해서 친구에게 보내 주세요", url);
    }
  }

  function savePhoto() {
    const dataUrl = sceneRef.current?.photo();
    if (!dataUrl) return;
    downloadBlob(dataUrlToBlob(dataUrl), `${autoName(freeParams)}.png`);
    showToast("📷 사진을 저장했어요!");
  }

  function saveStl() {
    const shape = buildShape(freeParams);
    downloadBlob(toStl(shape), `${autoName(freeParams)}.stl`);
    showToast(`🖨 3D 프린터용 STL 파일을 저장했어요! (약 ${realSize(shape.radius)})`);
  }

  function saveObj() {
    const name = autoName(freeParams);
    downloadBlob(toObj(buildShape(freeParams), name), `${name}.obj`);
    showToast("🧱 OBJ 파일을 저장했어요! 블렌더 같은 3D 프로그램에서 열어 보세요");
  }

  // --- 갤러리 ---
  function updateGallery(gallery: SavedShape[]) {
    commit({ ...save, gallery });
  }

  function renameShape(g: SavedShape) {
    const name = window.prompt("새 이름을 적어 주세요 (20자까지)", g.name)?.trim();
    if (!name) return;
    updateGallery(save.gallery.map((x) => (x.id === g.id ? { ...x, name: name.slice(0, 20) } : x)));
  }

  function togglePick(g: SavedShape) {
    setPicked((cur) => (cur.includes(g.id) ? cur.filter((id) => id !== g.id) : [...cur, g.id].slice(-2)));
  }

  function breedPicked() {
    const [a, b] = picked.map((id) => save.gallery.find((g) => g.id === id));
    if (!a || !b) return;
    setFree(breed(a.params, b.params), "", {}, XP.breed);
    setLook(chance(0.5) ? a.look : b.look);
    setPicked([]);
    setSelected(null);
    setMode("free");
    showToast(`🧬 "${a.name}" + "${b.name}" 에서 새 도형이 태어났어요!`);
    sfx("fanfare");
    celebrate();
  }

  function exportGallery() {
    downloadBlob(new Blob([galleryFileText(save.gallery)], { type: "application/json" }), "내-도형-갤러리.json");
    showToast("📤 갤러리를 파일로 저장했어요!");
  }

  async function importGallery(file: File) {
    const items = parseGalleryFile(await file.text(), makeId);
    if (!items) {
      showToast("⚠️ 도형 갤러리 파일이 아니에요");
      return;
    }
    const ids = new Set(save.gallery.map((g) => g.id));
    const fresh = items.map((g) => (ids.has(g.id) ? { ...g, id: makeId() } : g)).slice(0, GALLERY_LIMIT - save.gallery.length);
    updateGallery([...fresh, ...save.gallery]);
    showToast(fresh.length ? `📥 도형 ${fresh.length}개를 불러왔어요!` : "갤러리가 가득 차서 불러올 수 없어요");
  }

  // --- 모양 맞추기 ---
  function resetMatch(nextTarget: ShapeParams) {
    setTarget(nextTarget);
    setMatchParams(MATCH_START);
    setHint(null);
  }

  function nextTarget(passed: boolean) {
    if (passed && daily) {
      const bonus = matchStars + 3;
      commit(
        {
          ...save,
          progress: {
            ...save.progress,
            matchStars: save.progress.matchStars + bonus,
            dailyDone: todayKey(),
            dailyCount: save.progress.dailyCount + 1,
          },
        },
        freeParams,
        XP.daily + bonus * XP.matchStar,
      );
      showToast(`📅 오늘의 도형 성공! 별 ${bonus}개를 받았어요`);
      sfx("fanfare");
      celebrate();
    } else if (passed) {
      commit({ ...save, matchRound: save.matchRound + 1, progress: { ...save.progress, matchStars: save.progress.matchStars + matchStars } }, freeParams, matchStars * XP.matchStar);
      showToast(`${"⭐".repeat(matchStars)} 성공! 별 ${matchStars}개를 받았어요`);
      sfx("good");
    }
    setDaily(false);
    resetMatch(makeTarget(passed && !daily ? save.matchRound + 1 : save.matchRound));
  }

  function startDaily() {
    setDaily(true);
    resetMatch(dailyTarget());
  }

  function startRush() {
    setDaily(false);
    const t = nowMs();
    setNow(t);
    setRush({ endsAt: t + RUSH_MS, solved: 0, finished: false });
    resetMatch(makeTarget(1 + Math.floor(Math.random() * 3)));
  }

  function changeMatch(patch: Partial<ShapeParams>) {
    const next = { ...matchParams, ...patch };
    setHint(null);
    // 타임어택: 90% 가 되면 바로 다음 문제
    if (rush && !rush.finished && scoreMatch(next, target).score >= 90) {
      setRush({ ...rush, solved: rush.solved + 1 });
      resetMatch(makeTarget(1 + Math.floor(Math.random() * 3)));
      sfx("good");
      return;
    }
    setMatchParams(next);
  }

  function finishRush() {
    if (!rush || rush.finished || nowMs() < rush.endsAt) return;
    setRush({ ...rush, finished: true });
    commit({ ...save, progress: { ...save.progress, timeAttackBest: Math.max(save.progress.timeAttackBest, rush.solved) } }, freeParams, rush.solved * XP.timeAttackSolve);
    sfx(rush.solved > 0 ? "fanfare" : "bad");
    if (rush.solved > save.progress.timeAttackBest) celebrate();
  }

  function showHint() {
    if (!match.baseOk) setHint(`먼저 기본 도형을 ${baseInfo(target.base).name}(으)로 바꿔 보세요!`);
    else if (match.worst) setHint(`"${match.worst.label}"을(를) ${match.worst.direction === "up" ? "더 크게 ⬆️" : "더 작게 ⬇️"} 해 보세요!`);
    else setHint("거의 똑같아요! 👍");
  }

  // --- 퀴즈 ---
  function pickAnswer(i: number) {
    if (!quiz || quiz.picked !== null) return;
    const ok = i === quiz.question.answer;
    const streak = ok ? quiz.streak + 1 : 0;
    setQuiz({ ...quiz, picked: i, correct: quiz.correct + (ok ? 1 : 0), streak });
    sfx(ok ? "good" : "bad");
    if (ok) commit({ ...save, progress: { ...save.progress, bestStreak: Math.max(save.progress.bestStreak, streak) } }, freeParams, XP.quizCorrect);
  }

  function nextQuestion() {
    if (!quiz) return;
    if (quiz.index + 1 >= QUIZ_LENGTH) {
      setQuiz({ ...quiz, finished: true });
      if (quiz.correct > save.progress.quizBest) commit({ ...save, progress: { ...save.progress, quizBest: quiz.correct } });
      if (quiz.correct === QUIZ_LENGTH) celebrate();
      return;
    }
    setQuiz({ ...quiz, index: quiz.index + 1, picked: null, question: makeQuestion(quiz.question.shape.base) });
  }

  // 단축키·타이머가 항상 최신 함수를 부르도록
  useEffect(() => {
    finishRushRef.current = finishRush;
    swallowRef.current = onSwallow;
    tearRef.current = onTear;
    keyActions.current = {
      undo,
      redo,
      random: () => mode === "free" && randomize(),
      save: saveShape,
      rotate: () => setView((v) => ({ ...v, autoRotate: !v.autoRotate })),
      fullscreen: toggleFullscreen,
      panel: () => setPanelHidden((h) => !h),
      help: () => setShowHelp((h) => !h),
      escape: () => setShowHelp(false),
    };
  });

  // 카메라가 자동으로 멀어지거나 가까워진 정도 (기본 도형 반지름 1 기준)
  const viewScale = built.radius;
  const viewScaleText = (viewScale >= 1 ? viewScale : 1 / viewScale).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const tabs: { key: Mode; label: string }[] = [
    { key: "free", label: "🛠 만들기" },
    { key: "match", label: "🎯 맞추기" },
    { key: "quiz", label: "❓ 퀴즈" },
    { key: "gallery", label: `🖼 ${save.gallery.length}` },
    { key: "trophy", label: `🏆 ${save.unlocked.length}/${ACHIEVEMENTS.length}` },
  ];
  const hudButton = "rounded-full bg-black/40 px-3 py-1.5 text-sm backdrop-blur hover:bg-black/60";

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0b1026] text-white md:flex-row">
      {/* 3D 화면 */}
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="absolute inset-0" />

        <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
          <Link href="/" className="pointer-events-auto w-fit rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur hover:bg-white/25">
            ← 홈
          </Link>
          <h1 className="text-2xl font-extrabold drop-shadow md:text-3xl">💠 나만의 도형 만들기</h1>
          <div className="w-52 rounded-xl bg-black/35 px-3 py-1.5 backdrop-blur">
            <div className="flex justify-between text-xs">
              <b className="text-yellow-300">
                Lv.{lv.level} {lv.title}
              </b>
              <span className="text-white/60">{save.progress.xp} XP</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full bg-yellow-400 transition-all" style={{ width: `${lv.progress * 100}%` }} />
            </div>
          </div>
          {viewScale >= 2 && <p className="w-fit rounded-full bg-cyan-500/30 px-3 py-1 text-sm font-bold">🔭 도형이 커서 {viewScaleText}배 멀리서 보는 중!</p>}
          {viewScale <= 0.5 && <p className="w-fit rounded-full bg-fuchsia-500/30 px-3 py-1 text-sm font-bold">🔬 도형이 작아서 {viewScaleText}배 가까이서 보는 중!</p>}
        </div>

        {mode === "free" && bhStats && (
          <div className="absolute right-4 top-16 z-10">
            <BlackHoleCard stats={bhStats} />
          </div>
        )}

        {mode === "free" && (
          <div className="absolute right-4 top-4 flex gap-1.5">
            <button onClick={undo} disabled={past.length === 0} title="되돌리기 (Ctrl+Z)" className={`${hudButton} disabled:opacity-30`}>
              ↩️ 되돌리기
            </button>
            <button onClick={redo} disabled={future.length === 0} title="다시하기 (Ctrl+Shift+Z)" className={`${hudButton} disabled:opacity-30`}>
              ↪️
            </button>
          </div>
        )}

        {mode === "free" && view.solar && showPlanets && (
          <PlanetPanel
            solar={solar}
            onFeed={feedPlanet}
            onFeedAll={feedAllPlanets}
            onRestore={() => {
              // 태양계만 다시 만든다 (크기는 그대로라 또 먹으면 계속 자란다)
              sceneRef.current?.restoreSolar();
              showToast("♻️ 태양계가 다시 생겼어요! 또 먹어 보세요");
            }}
            onClose={() => setShowPlanets(false)}
          />
        )}

        <div className="absolute bottom-4 right-4 flex gap-1.5">
          {mode === "free" && view.solar && (
            <button onClick={() => setShowPlanets(!showPlanets)} title="블랙홀에게 행성 먹이기" className={`${hudButton} ${showPlanets ? "ring-2 ring-orange-400" : ""}`}>
              🪐 행성 먹이기
            </button>
          )}
          <button
            onClick={() => commit({ ...save, settings: { ...save.settings, sound: !save.settings.sound } })}
            title="효과음 켜기/끄기"
            className={hudButton}
          >
            {save.settings.sound ? "🔊" : "🔇"}
          </button>
          <button onClick={toggleFullscreen} title="전체화면 (F)" className={hudButton}>
            ⛶
          </button>
          <button onClick={() => setPanelHidden(!panelHidden)} title="패널 숨기기/보이기 (H)" className={hudButton}>
            {panelHidden ? "⚙️ 패널 열기" : "🙈 패널 숨기기"}
          </button>
          <button onClick={() => setShowHelp(true)} title="단축키 도움말 (?)" className={hudButton}>
            ❔
          </button>
        </div>

        {inMatch && inset && (
          <div
            className="pointer-events-none absolute rounded-xl border-2 border-fuchsia-400"
            style={{ right: inset.margin, top: inset.margin, width: inset.size, height: inset.size }}
          >
            <span className="absolute -bottom-7 right-0 rounded-full bg-fuchsia-500 px-3 py-0.5 text-xs font-bold">🎯 목표 도형</span>
          </div>
        )}

        {/* 퀴즈 중에는 정답이 보이지 않도록 정보 카드를 숨긴다 */}
        {mode !== "quiz" && (
          <div className="pointer-events-none absolute bottom-4 left-4 max-w-[60%] rounded-2xl bg-black/40 px-4 py-3 text-sm backdrop-blur">
            <div className="mb-1 text-base font-bold text-yellow-300">
              {inMatch ? "내 도형" : autoName(params)}
              {mode === "free" && params.extras.length > 0 && <span className="text-white/70"> + 도형 {params.extras.length}개</span>}
              {mode === "free" && params.copies > 1 && (
                <span className="text-white/70">
                  {" "}
                  × 복제 {params.copies} = 모두 {(params.extras.length + 1) * params.copies}개
                </span>
              )}
            </div>
            <div className="tabular-nums text-white/80">
              꼭짓점 {fmt(built.stats.vertices)} · 모서리 {fmt(built.stats.edges)} · 면 {fmt(built.stats.faces)}
            </div>
            <div className="text-xs text-white/70">
              📏 크기 {params.sizePct.toLocaleString()}% · 3D 프린트하면 약 {realSize(built.radius)}
            </div>
            <div className="text-xs text-white/70">
              🧊 부피 약 {fmt(built.volume * 27)}cm³ · 🎁 겉넓이 약 {fmt(built.area * 9)}cm²
            </div>
            <div className="text-xs text-white/50">
              오일러 공식: {fmt(built.stats.vertices)} − {fmt(built.stats.edges)} + {fmt(built.stats.faces)} ={" "}
              {built.stats.vertices - built.stats.edges + built.stats.faces}
            </div>
          </div>
        )}

        {toast && (
          <div className="pointer-events-none absolute left-1/2 top-16 z-40 max-w-[90%] -translate-x-1/2 animate-bounce rounded-full bg-yellow-400 px-5 py-2 text-center text-sm font-bold text-zinc-900 shadow-lg">
            {toast}
          </div>
        )}

        {confetti && <Confetti pieces={confetti} />}

        {showHelp && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowHelp(false)}>
            <div className="w-full max-w-sm rounded-2xl bg-[#1a2350] p-5" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-3 text-lg font-bold">⌨️ 단축키</h2>
              <ul className="space-y-1.5 text-sm">
                {SHORTCUTS.map(([k, d]) => (
                  <li key={k} className="flex justify-between">
                    <kbd className="rounded bg-white/15 px-2 py-0.5 font-mono text-xs">{k}</kbd>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-white/60">🖱 드래그: 돌리기 · 휠: 확대/축소 · 흰 점 클릭: 꼭짓점 고르기</p>
              <button onClick={() => setShowHelp(false)} className="mt-4 w-full rounded-lg bg-yellow-400 py-2 font-bold text-zinc-900">
                닫기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 조작 패널 */}
      {!panelHidden && (
        <aside className="h-[46%] w-full shrink-0 overflow-y-auto border-t border-white/10 bg-[#121a3a] p-4 md:h-full md:w-[400px] md:border-l md:border-t-0">
          <nav className="mb-4 grid grid-cols-5 gap-1 rounded-2xl bg-black/30 p-1 text-[11px]">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => changeMode(t.key)}
                className={`rounded-xl py-2 font-bold transition ${mode === t.key ? "bg-cyan-400 text-zinc-900" : "hover:bg-white/10"}`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {mode === "free" && (
            <FreePanel
              params={freeParams}
              triangles={built.positions.length / 9}
              selected={selected}
              angleSum={angleSum}
              showHandles={showHandles}
              look={look}
              view={view}
              anim={anim}
              saveName={saveName}
              onUpdate={updateParams}
              onPickBase={pickBase}
              onDual={pickDual}
              onAddExtra={addExtra}
              onRemoveExtra={removeExtra}
              onRandomExtras={randomExtras}
              onResetCosmic={() => {
                sceneRef.current?.restoreSolar();
                setView((v) => ({ ...v, bhSize: 1, bhGrown: 0 }));
                showToast("🌫️ 먼지구름부터 다시 시작해요!");
              }}
              onSpeak={() => {
                const info = baseInfo(freeParams.base);
                if (!speak(`${info.name}. 면 모양은 ${info.faceShape}. ${info.fact}`)) showToast("이 브라우저는 읽어주기를 지원하지 않아요");
              }}
              onShowHandles={setShowHandles}
              onLook={setLook}
              onView={(patch) => setView({ ...view, ...patch })}
              onCamera={(v: CameraView) => sceneRef.current?.setView(v)}
              onAnim={startAnim}
              onSaveName={setSaveName}
              onSave={saveShape}
              onRandom={randomize}
              onReset={resetShape}
              onShare={shareLink}
              onPhoto={savePhoto}
              onStl={saveStl}
              onObj={saveObj}
            />
          )}

          {mode === "match" && (
            <MatchPanel
              round={save.matchRound}
              totalStars={save.progress.matchStars}
              match={match}
              stars={matchStars}
              hint={hint}
              params={matchParams}
              daily={daily}
              dailyDoneToday={save.progress.dailyDone === todayKey()}
              rush={rushView}
              rushBest={save.progress.timeAttackBest}
              onChange={changeMatch}
              onHint={showHint}
              onSkip={() => (rush ? resetMatch(makeTarget(1 + Math.floor(Math.random() * 3))) : nextTarget(false))}
              onDone={() => nextTarget(true)}
              onDaily={startDaily}
              onRushStart={startRush}
              onRushClose={() => {
                setRush(null);
                resetMatch(makeTarget(save.matchRound));
              }}
            />
          )}

          {mode === "quiz" && quiz && (
            <QuizPanel
              quiz={quiz}
              best={save.progress.quizBest}
              bestStreak={save.progress.bestStreak}
              onPick={pickAnswer}
              onNext={nextQuestion}
              onRestart={() => setQuiz(newQuiz())}
            />
          )}

          {mode === "gallery" && (
            <GalleryPanel
              gallery={save.gallery}
              picked={picked}
              onLoad={(g) => {
                setFree(g.params);
                setLook(g.look);
                setSelected(null);
                setMode("free");
              }}
              onDelete={(g) => {
                if (window.confirm(`"${g.name}"을(를) 지울까요?`)) updateGallery(save.gallery.filter((x) => x.id !== g.id));
              }}
              onRename={renameShape}
              onFavorite={(g) => updateGallery(save.gallery.map((x) => (x.id === g.id ? { ...x, favorite: !x.favorite } : x)))}
              onPick={togglePick}
              onBreed={breedPicked}
              onExport={exportGallery}
              onImport={importGallery}
            />
          )}

          {mode === "trophy" && <TrophyPanel save={save} />}
        </aside>
      )}
    </div>
  );
}
