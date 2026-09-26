import { useState } from "react";
import { BASES, CATEGORY_LABEL, DEFAULT_PARAMS, inputRange, type BaseCategory, type BaseKey, type SliderDef } from "./shapeGeometry";

// ----------------------------------------------------------------------------
// 여러 패널에서 함께 쓰는 작은 UI 조각
// ----------------------------------------------------------------------------

const UNIT_LABEL: Record<SliderDef["unit"], string> = { deg: "°", x: "배", pct: "%", num: "", count: "개", percent: "%" };

export function formatValue(def: SliderDef, v: number): string {
  switch (def.unit) {
    case "deg":
      return `${Math.round(v)}°`;
    case "x":
      return `${v.toFixed(2)}배`;
    case "pct":
      return `${Math.round(v * 100)}%`;
    case "num":
      return v.toFixed(2);
    case "count":
      return `${Math.round(v)}개`;
    case "percent":
      return `${Math.round(v).toLocaleString()}%`;
  }
}

// 입력칸에 보여줄 숫자 (pct 는 0~1 값을 0~100 으로 보여준다)
function toInput(def: SliderDef, v: number): string {
  if (def.unit === "pct") return String(Math.round(v * 100));
  if (def.unit === "deg" || def.unit === "count" || def.unit === "percent") return String(Math.round(v));
  return String(Number(v.toFixed(2)));
}

function fromInput(def: SliderDef, text: string): number | null {
  const n = Number(text);
  if (text.trim() === "" || !Number.isFinite(n)) return null;
  const [lo, hi] = inputRange(def);
  const v = def.unit === "pct" ? n / 100 : n;
  if (v < lo || v > hi) return null;
  return def.unit === "count" || def.unit === "percent" ? Math.round(v) : v;
}

// 로그 눈금 슬라이더는 0~1000 위치를 값으로 바꿔서 쓴다
const LOG_STEPS = 1000;
const toPos = (def: SliderDef, v: number) =>
  def.log ? Math.round((Math.log(v / def.min) / Math.log(def.max / def.min)) * LOG_STEPS) : v;
const fromPos = (def: SliderDef, pos: number) =>
  def.log ? Math.round(def.min * Math.pow(def.max / def.min, pos / LOG_STEPS)) : pos;

export function Slider({ def, value, onChange }: { def: SliderDef; value: number; onChange: (v: number) => void }) {
  const initial = DEFAULT_PARAMS[def.key];
  // 입력 중인 글자 (null 이면 실제 값을 보여줌)
  const [draft, setDraft] = useState<string | null>(null);
  const [lo, hi] = inputRange(def);
  const invalid = draft !== null && fromInput(def, draft) === null;
  const outOfSlider = value < def.min || value > def.max;
  const range = def.unit === "pct" ? `${lo * 100}~${hi * 100}` : `${lo.toLocaleString()}~${hi.toLocaleString()}`;

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 truncate">
          {def.emoji} {def.label}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <input
            type="number"
            inputMode="decimal"
            value={draft ?? toInput(def, value)}
            title={`${range}${UNIT_LABEL[def.unit]} 사이로 입력하세요`}
            onFocus={(e) => {
              setDraft(toInput(def, value));
              e.target.select();
            }}
            onChange={(e) => {
              setDraft(e.target.value);
              const v = fromInput(def, e.target.value);
              if (v !== null) onChange(v);
            }}
            onBlur={() => setDraft(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className={`w-[4.8rem] rounded-md bg-black/40 px-1.5 py-0.5 text-right font-bold tabular-nums text-yellow-300 outline-none focus:ring-2 ${
              invalid ? "ring-2 ring-rose-400" : "focus:ring-yellow-400"
            } [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
          />
          <span className="w-4 text-xs text-white/60">{UNIT_LABEL[def.unit]}</span>
          <button
            onClick={() => onChange(initial)}
            className={`rounded bg-white/10 px-1.5 text-xs hover:bg-white/20 ${value === initial ? "invisible" : ""}`}
            title="원래대로"
          >
            ↺
          </button>
        </span>
      </div>
      <input
        type="range"
        min={toPos(def, def.min)}
        max={toPos(def, def.max)}
        step={def.log ? 1 : def.step}
        value={toPos(def, Math.min(def.max, Math.max(def.min, value)))}
        onChange={(e) => onChange(fromPos(def, Number(e.target.value)))}
        className="w-full accent-yellow-400"
      />
      {invalid && <p className="text-xs text-rose-300">{range}{UNIT_LABEL[def.unit]} 사이의 숫자를 넣어 주세요</p>}
      {!invalid && outOfSlider && <p className="text-xs text-cyan-300">✨ 슬라이더보다 큰 값을 직접 입력했어요!</p>}
    </div>
  );
}

export function BasePicker({ value, onPick }: { value: BaseKey; onPick: (k: BaseKey) => void }) {
  const categories = Object.keys(CATEGORY_LABEL) as BaseCategory[];
  return (
    <div className="space-y-2">
      {categories.map((cat) => (
        <div key={cat}>
          <div className="mb-1 text-[11px] text-white/50">{CATEGORY_LABEL[cat]}</div>
          <div className="grid grid-cols-5 gap-1.5">
            {BASES.filter((b) => b.category === cat).map((b) => (
              <button
                key={b.key}
                onClick={() => onPick(b.key)}
                className={`rounded-xl px-0.5 py-2 text-center text-[10.5px] leading-tight transition ${
                  value === b.key ? "bg-yellow-400 font-bold text-zinc-900" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                <div className="text-xl">{b.emoji}</div>
                {b.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl bg-white/5 p-3">
      <h3 className="mb-2 text-sm font-bold text-cyan-200">{title}</h3>
      {children}
    </section>
  );
}

export function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg py-1.5 text-sm transition ${active ? "bg-yellow-400 font-bold text-zinc-900" : "bg-white/10 hover:bg-white/20"}`}
    >
      {children}
    </button>
  );
}
