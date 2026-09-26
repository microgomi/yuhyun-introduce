import { BASES, baseInfo, MAX_EXTRAS, MAX_SUBDIV, PULL_MAX, PULL_MIN, SLIDERS, type BaseKey, type ShapeParams, type SliderDef } from "./shapeGeometry";
import { BG_THEMES, COLOR_MODES, type BgTheme, type Look } from "./shapeLook";
import { ANIMS, type Anim } from "./shapeAnim";
import { levelMass, levelOf, MAX_LEVEL, STAGES, stageOf } from "./cosmic";
import type { CameraView } from "./shapeScene";
import { BasePicker, Section, Slider, Toggle } from "./ui";

// ----------------------------------------------------------------------------
// "만들기" 탭 패널
// ----------------------------------------------------------------------------

export const COLORS = ["#ff5d8f", "#ff9f1c", "#ffd23f", "#3ddc97", "#2ec4f1", "#7b61ff", "#c0c0c8", "#f5f5f5"];
const SUBDIV_LEVELS = Array.from({ length: MAX_SUBDIV + 1 }, (_, i) => i);
const VIEWS: [CameraView, string][] = [
  ["front", "⬜ 앞"],
  ["top", "⬆️ 위"],
  ["side", "➡️ 옆"],
  ["iso", "🧊 비스듬히"],
];

export interface ViewSettings {
  bg: BgTheme;
  showGrid: boolean;
  showAxes: boolean;
  showEdges: boolean;
  autoRotate: boolean;
  rotateSpeed: number;
  lightAngle: number;
  hurricane: boolean; // 복제했을 때 가운데 허리케인 그리기
  blackHole: boolean; // 가장 큰 허리케인 가운데 블랙홀
  bhSize: number; // 블랙홀 크기 배율 (손으로는 50배까지, 먹으면 그 이상 자란다)
  bhGrown: number; // 먹어서 늘어난 크기 (되살리기 때 되돌린다)
  bhBright: number; // 블랙홀 밝기 배율
  bhPull: number; // 빨아들이는 힘 배율
  solar: boolean; // 장식용 태양계
}

function MiniRange(props: { label: string; value: number; min: number; max: number; step: number; unit: string; log?: boolean; onChange: (v: number) => void }) {
  // log: 0~1000 위치를 min~max 로그 눈금으로 (0.5배~2000배처럼 범위가 넓을 때)
  const toPos = (v: number) => (Math.log(v / props.min) / Math.log(props.max / props.min)) * 1000;
  const fromPos = (pos: number) => {
    const v = props.min * Math.pow(props.max / props.min, pos / 1000);
    // 100 이상은 10 단위, 10 이상은 1 단위로 딱 떨어지게 (1000배 같은 조건 값을 맞출 수 있도록)
    if (v >= 100) return Math.round(v / 10) * 10;
    return v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
  };
  // 먹어서 최대값보다 커지면 손잡이는 끝에 두고 글자로 진짜 값을 보여준다
  const shown = Math.min(Math.max(props.value, props.min), props.max);
  return (
    <label className="block text-xs">
      {props.label}{" "}
      <b className="text-yellow-300">
        {props.value.toLocaleString(undefined, { maximumFractionDigits: props.step < 1 || props.log ? 1 : 0 })}
        {props.unit}
      </b>
      <input
        type="range"
        min={props.log ? 0 : props.min}
        max={props.log ? 1000 : props.max}
        step={props.log ? 1 : props.step}
        value={props.log ? toPos(shown) : shown}
        onChange={(e) => props.onChange(props.log ? fromPos(Number(e.target.value)) : Number(e.target.value))}
        className="w-full accent-orange-400"
      />
    </label>
  );
}

export interface FreePanelProps {
  params: ShapeParams;
  triangles: number;
  selected: number | null;
  angleSum: number | null;
  showHandles: boolean;
  look: Look;
  view: ViewSettings;
  anim: Anim;
  saveName: string;
  onUpdate: (patch: Partial<ShapeParams>, editKey?: string) => void;
  onPickBase: (k: BaseKey) => void;
  onDual: () => void;
  onAddExtra: (k: BaseKey) => void;
  onRemoveExtra: (index: number) => void;
  onRandomExtras: (count: number) => void;
  onResetCosmic: () => void;
  onSpeak: () => void;
  onShowHandles: (on: boolean) => void;
  onLook: (look: Look) => void;
  onView: (patch: Partial<ViewSettings>) => void;
  onCamera: (v: CameraView) => void;
  onAnim: (a: Anim) => void;
  onSaveName: (name: string) => void;
  onSave: () => void;
  onRandom: () => void;
  onReset: () => void;
  onShare: () => void;
  onPhoto: () => void;
  onStl: () => void;
  onObj: () => void;
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-yellow-400" />
      {children}
    </label>
  );
}

// 먹보 천체의 지금 레벨·모습과 다음 레벨까지 진행도
function CosmicLevel({ size }: { size: number }) {
  const level = levelOf(size);
  const stage = stageOf(level);
  const cur = levelMass(level);
  const next = level < MAX_LEVEL ? levelMass(level + 1) : null;
  const progress = next ? Math.min(1, Math.log(Math.max(size, 1) / cur) / Math.log(next / cur)) : 1;
  return (
    <div className="rounded-lg bg-black/30 p-2 text-xs">
      <div className="flex justify-between">
        <b>
          {stage.emoji} Lv.{level} {stage.name}
        </b>
        <span className="text-white/60">{next ? `다음: ${Math.round(next).toLocaleString()}배` : "최고 레벨!"}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-orange-400" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-white/50">
        {STAGES.map((s) => (
          <span key={s.key} className={s.key === stage.key ? "text-orange-300" : ""} title={`Lv.${s.from}~${s.to} ${s.name}`}>
            {s.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FreePanel(p: FreePanelProps) {
  const { params, look, view } = p;
  const info = baseInfo(params.base);
  const sliders = (group: SliderDef["group"]) =>
    SLIDERS.filter((d) => d.group === group).map((def) => (
      <Slider key={def.key} def={def} value={params[def.key]} onChange={(v) => p.onUpdate({ [def.key]: v }, def.key)} />
    ));
  const handlesBlocked = params.copies > 1 || params.explode > 0 || params.extras.length > 0 || p.anim !== "none";
  const full = params.extras.length >= MAX_EXTRAS;
  const extraCounts = [...params.extras.reduce((acc, k) => acc.set(k, (acc.get(k) ?? 0) + 1), new Map<BaseKey, number>())];
  const total = (params.extras.length + 1) * params.copies;

  return (
    <>
      <Section title="1. 기본 도형 고르기">
        <BasePicker value={params.base} onPick={p.onPickBase} />
        <div className="mt-3 rounded-xl bg-black/25 p-3 text-xs leading-relaxed text-white/80">
          <b className="text-sm text-white">
            {info.emoji} {info.name}
          </b>
          <div>
            면 모양: {info.faceShape} · 한 꼭짓점에 면 {info.perVertex}개 · 면 사이 각도{" "}
            {info.dihedral !== null ? `${info.dihedral}°` : "곳마다 달라요"}
          </div>
          <div className="mt-1 text-white/60">{info.fact}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button onClick={p.onSpeak} className="rounded-lg bg-white/10 px-2 py-1 hover:bg-white/20">
              🔊 읽어주기
            </button>
            {info.dual && (
              <button onClick={p.onDual} className="rounded-lg bg-pink-500/30 px-2 py-1 hover:bg-pink-500/50">
                💞 짝꿍 도형({baseInfo(info.dual).name})으로 바꾸기
              </button>
            )}
          </div>
        </div>
      </Section>

      <Section title={`➕ 새 도형 추가 (${params.extras.length}/${MAX_EXTRAS})`}>
        <p className="mb-2 text-xs text-white/60">
          누르는 도형이 옆에 새로 생겨요. 비틀기·휘기·크기·색 같은 효과가 모든 도형에 똑같이 들어가요! 회전목마 복제를 올리면 도형마다 각자 복제돼요.
        </p>
        <div className="mb-2 grid grid-cols-6 gap-1">
          {BASES.map((b) => (
            <button
              key={b.key}
              onClick={() => p.onAddExtra(b.key)}
              disabled={full}
              title={`${b.name} 추가`}
              className="rounded-lg bg-white/10 py-1 text-lg enabled:hover:bg-white/25 disabled:opacity-30"
            >
              {b.emoji}
            </button>
          ))}
        </div>
        {params.extras.length > 0 && (
          // 100개까지 늘어나므로 같은 도형끼리 묶어 "×개수"로 보여준다. 누르면 하나씩 빠진다.
          <div className="mb-2 flex flex-wrap gap-1">
            {extraCounts.map(([k, count]) => (
              <button
                key={k}
                onClick={() => p.onRemoveExtra(params.extras.lastIndexOf(k))}
                title="눌러서 하나 빼기"
                className="rounded-full bg-cyan-500/25 px-2 py-0.5 text-xs hover:bg-rose-500/50"
              >
                {baseInfo(k).emoji} {baseInfo(k).name} ×{count} ✕
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-1.5 text-sm">
          <button onClick={() => p.onRandomExtras(5)} disabled={full} className="rounded-lg bg-white/10 py-1.5 enabled:hover:bg-white/20 disabled:opacity-30">
            🎲 +5
          </button>
          <button onClick={() => p.onRandomExtras(20)} disabled={full} className="rounded-lg bg-white/10 py-1.5 enabled:hover:bg-white/20 disabled:opacity-30">
            🎲 +20
          </button>
          <button
            onClick={() => p.onUpdate({ extras: [] })}
            disabled={params.extras.length === 0}
            className="rounded-lg bg-white/10 py-1.5 enabled:hover:bg-rose-500/40 disabled:opacity-30"
          >
            🗑 모두 빼기
          </button>
        </div>
      </Section>

      <Section title="2. 각도 바꾸기">{sliders("angle")}</Section>

      <Section title="3. 모양 바꾸기">
        {sliders("shape")}
        <div className="text-sm">🔺 삼각형 쪼개기 (부드럽게)</div>
        <div className="mt-1 grid grid-cols-6 gap-1">
          {SUBDIV_LEVELS.map((n) => (
            <Toggle key={n} active={params.subdiv === n} onClick={() => p.onUpdate({ subdiv: n })}>
              {n}
            </Toggle>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/50">
          💡 쪼개기를 올리면 비틀기·휘기·물결이 훨씬 부드러워져요. 한 단계마다 삼각형이 4배! (삼각형 {p.triangles.toLocaleString()}개)
        </p>
        {params.subdiv >= 4 && <p className="mt-1 text-xs text-amber-300">⚠️ 4~5단계는 아주 촘촘해서 컴퓨터가 조금 느려질 수 있어요.</p>}
      </Section>

      <Section title="4. 신기한 변형 ✨">
        {sliders("fun")}
        {(params.copies > 1 || params.extras.length > 0) && (
          <div className="mb-2">
            <Check checked={view.hurricane} onChange={(v) => p.onView({ hurricane: v })}>
              🌀 둥글게 섰을 때 가운데 빈 곳에 허리케인 그리기
            </Check>
            {view.hurricane && (
              <Check checked={view.blackHole} onChange={(v) => p.onView({ blackHole: v })}>
                🕳️ 가장 큰 허리케인 가운데 먹보 천체 (레벨마다 변신!)
              </Check>
            )}
            {view.hurricane && view.blackHole && (
              <div className="mt-2 space-y-1 rounded-xl bg-orange-500/10 p-2">
                <CosmicLevel size={view.bhSize} />
                <MiniRange label="🕳️ 크기(질량)" value={view.bhSize} min={0.5} max={50} step={0.5} unit="배" log onChange={(v) => p.onView({ bhSize: v, bhGrown: 0 })} />
                <p className="text-[11px] text-orange-200">
                  손으로는 50배까지! 천체를 먹으면 더 커져요{view.bhGrown > 0 ? ` (먹고 +${Math.round(view.bhGrown).toLocaleString()}배)` : ""}. 🪐 행성 16배~ · ☀️ 태양 36배 · 🌑 초거대 블랙홀 250배 · 💫 중성자별 1,000배 · 🌌 안드로메다 1,000,000배
                </p>
                <button onClick={p.onResetCosmic} className="w-full rounded-lg bg-white/10 py-1 text-[11px] hover:bg-white/20">
                  🔄 크기 처음으로 (Lv.1 먼지구름부터 다시)
                </button>
                <MiniRange label="💡 밝기" value={view.bhBright} min={0} max={10} step={0.1} unit="배" onChange={(v) => p.onView({ bhBright: v })} />
                <MiniRange label="🧲 빨아들이는 힘" value={view.bhPull} min={0.2} max={5} step={0.1} unit="배" onChange={(v) => p.onView({ bhPull: v })} />
                <p className="text-[11px] text-white/50">📊 통계는 화면 오른쪽 위에 나와요!</p>
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-white/50">💡 구불구불·돌멩이·계단은 쪼개기를 2단계 이상 올리면 더 잘 보여요.</p>
        {total > 500 && params.subdiv >= 3 && (
          <p className="mt-1 text-xs text-amber-300">⚠️ 도형이 {total.toLocaleString()}개예요! 쪼개기를 2단계 이하로 낮추면 훨씬 부드러워져요.</p>
        )}
      </Section>

      <Section title="5. 꼭짓점 당기기">
        <Check checked={p.showHandles} onChange={p.onShowHandles}>
          꼭짓점 보이기 (흰 점을 눌러 고르기)
        </Check>
        {p.showHandles && handlesBlocked && (
          <p className="mt-2 text-xs text-white/60">움직이는 도형·복제·펼치기를 끄면 꼭짓점을 고를 수 있어요.</p>
        )}
        {p.showHandles && !handlesBlocked && p.selected === null && <p className="mt-2 text-xs text-white/60">도형 위의 흰 점을 눌러 보세요!</p>}
        {p.showHandles && p.selected !== null && (
          <div className="mt-3">
            <Slider
              def={{ key: "spike", label: `${p.selected + 1}번 꼭짓점 당기기`, emoji: "🧲", min: PULL_MIN, max: PULL_MAX, step: 0.05, unit: "num" }}
              value={params.pulls[p.selected] ?? 0}
              onChange={(v) => p.selected !== null && p.onUpdate({ pulls: { ...params.pulls, [p.selected]: v } }, `pull-${p.selected}`)}
            />
            {p.angleSum !== null && (
              <div className="rounded-xl bg-black/25 p-3 text-xs leading-relaxed">
                이 꼭짓점에 모인 각의 합: <b className="text-yellow-300">{p.angleSum.toFixed(1)}°</b>
                <div className="text-white/60">
                  {p.angleSum < 359.5
                    ? `360°보다 ${(360 - p.angleSum).toFixed(1)}° 모자라서 뾰족하게 튀어나와요!`
                    : p.angleSum > 360.5
                      ? `360°보다 ${(p.angleSum - 360).toFixed(1)}° 넘쳐서 말안장처럼 울퉁불퉁해요!`
                      : "딱 360°라서 평평해요!"}
                </div>
              </div>
            )}
          </div>
        )}
        {Object.keys(params.pulls).length > 0 && (
          <button onClick={() => p.onUpdate({ pulls: {} })} className="mt-2 rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20">
            당기기 모두 풀기
          </button>
        )}
      </Section>

      <Section title="6. 색칠하기">
        <div className="mb-2 grid grid-cols-3 gap-1">
          {COLOR_MODES.map((m) => (
            <Toggle key={m.key} active={look.colorMode === m.key} onClick={() => p.onLook({ ...look, colorMode: m.key })}>
              {m.label}
            </Toggle>
          ))}
        </div>
        {COLOR_MODES.find((m) => m.key === look.colorMode)?.usesColor && (
          <div className="flex flex-wrap items-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => p.onLook({ ...look, color: c })}
                aria-label={`색 ${c}`}
                className={`h-7 w-7 rounded-full border-2 ${look.color === c ? "scale-110 border-white" : "border-transparent"}`}
                style={{ background: c }}
              />
            ))}
            <label className="flex cursor-pointer items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs" title="원하는 색 고르기">
              🎨 직접
              <input type="color" value={look.color} onChange={(e) => p.onLook({ ...look, color: e.target.value })} className="h-6 w-8 cursor-pointer bg-transparent" />
            </label>
          </div>
        )}
      </Section>

      <Section title="7. 배경 · 보기">
        <div className="mb-2 grid grid-cols-5 gap-1 text-xs">
          {BG_THEMES.map((t) => (
            <button
              key={t.key}
              onClick={() => p.onView({ bg: t.key })}
              className={`rounded-lg py-1.5 ${view.bg === t.key ? "ring-2 ring-yellow-400" : ""}`}
              style={{ background: `linear-gradient(${t.top}, ${t.bottom})`, color: t.light ? "#222" : "#fff" }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mb-2 grid grid-cols-4 gap-1 text-xs">
          {VIEWS.map(([v, label]) => (
            <button key={v} onClick={() => p.onCamera(v)} className="rounded-lg bg-white/10 py-1.5 hover:bg-white/20">
              {label}
            </button>
          ))}
        </div>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <Check checked={view.showEdges} onChange={(v) => p.onView({ showEdges: v })}>
            모서리 선
          </Check>
          <Check checked={view.autoRotate} onChange={(v) => p.onView({ autoRotate: v })}>
            자동 회전
          </Check>
          <Check checked={view.showGrid} onChange={(v) => p.onView({ showGrid: v })}>
            📐 모눈 바닥
          </Check>
          <Check checked={view.showAxes} onChange={(v) => p.onView({ showAxes: v })}>
            🧭 좌표축 (빨강 x·초록 y·파랑 z)
          </Check>
          <Check checked={view.solar} onChange={(v) => p.onView({ solar: v })}>
            ☀️ 장식 태양계
          </Check>
        </div>
        <label className="block text-sm">
          💡 조명 각도 <b className="text-yellow-300">{view.lightAngle}°</b>
          <input type="range" min={0} max={360} step={5} value={view.lightAngle} onChange={(e) => p.onView({ lightAngle: Number(e.target.value) })} className="w-full accent-yellow-400" />
        </label>
        <label className="block text-sm">
          🔁 회전 속도 <b className="text-yellow-300">{view.rotateSpeed.toFixed(1)}배</b>
          <input type="range" min={0.1} max={5} step={0.1} value={view.rotateSpeed} onChange={(e) => p.onView({ rotateSpeed: Number(e.target.value) })} className="w-full accent-yellow-400" />
        </label>
      </Section>

      <Section title="8. 움직이는 도형 🎬">
        <div className="grid grid-cols-3 gap-1">
          {ANIMS.map(([key, label]) => (
            <Toggle key={key} active={p.anim === key} onClick={() => p.onAnim(key)}>
              {label}
            </Toggle>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/50">한 번 더 누르면 멈춰요. 움직여도 내가 만든 모양은 그대로예요.</p>
      </Section>

      <Section title="9. 저장하고 자랑하기">
        <input
          value={p.saveName}
          onChange={(e) => p.onSaveName(e.target.value)}
          placeholder="도형 이름 (비우면 자동으로 지어요)"
          maxLength={20}
          className="mb-2 w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:ring-2 focus:ring-yellow-400"
        />
        <div className="grid grid-cols-3 gap-1.5 text-sm">
          <button onClick={p.onSave} className="rounded-lg bg-yellow-400 py-2 font-bold text-zinc-900 hover:bg-yellow-300">
            💾 저장
          </button>
          <button onClick={p.onRandom} className="rounded-lg bg-white/10 py-2 hover:bg-white/20">
            🎲 랜덤
          </button>
          <button onClick={p.onReset} className="rounded-lg bg-white/10 py-2 hover:bg-white/20">
            ↺ 처음으로
          </button>
          <button onClick={p.onShare} className="rounded-lg bg-white/10 py-2 hover:bg-white/20">
            🔗 공유 링크
          </button>
          <button onClick={p.onPhoto} className="rounded-lg bg-white/10 py-2 hover:bg-white/20">
            📷 사진
          </button>
          <button onClick={p.onStl} className="rounded-lg bg-white/10 py-2 hover:bg-white/20" title="3D 프린터로 뽑을 수 있는 파일">
            🖨 STL
          </button>
          <button onClick={p.onObj} className="col-span-3 rounded-lg bg-white/10 py-2 hover:bg-white/20" title="블렌더 같은 3D 프로그램에서 열 수 있는 파일">
            🧱 OBJ 파일 (3D 프로그램용)
          </button>
        </div>
      </Section>
    </>
  );
}
