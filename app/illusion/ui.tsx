import { useState } from "react";

import {
  CATEGORY_LABEL,
  inputRange,
  KINDS,
  specOf,
  type Category,
  type Kind,
  type SliderDef,
  type Unit,
} from "./illusionSpec";

// ----------------------------------------------------------------------------
// 여러 곳에서 함께 쓰는 작은 UI 조각
// 도형 만들기의 ui.tsx 와 같은 자리에 해당한다.
// ----------------------------------------------------------------------------

const UNIT_LABEL: Record<Unit, string> = { deg: "°", px: "", count: "개", pct: "%", light: "" };

export function formatValue(def: SliderDef, v: number): string {
  return `${Math.round(v)}${UNIT_LABEL[def.unit]}`;
}

function fromInput(def: SliderDef, text: string): number | null {
  const n = Number(text);
  if (text.trim() === "" || !Number.isFinite(n)) return null;
  const [lo, hi] = inputRange(def);
  if (n < lo || n > hi) return null;
  return Math.round(n / def.step) * def.step;
}

export function Slider({
  def,
  value,
  initial,
  onChange,
}: {
  def: SliderDef;
  value: number;
  initial: number;
  onChange: (v: number) => void;
}) {
  // 입력 중인 글자 (null 이면 실제 값을 보여준다)
  const [draft, setDraft] = useState<string | null>(null);
  const [lo, hi] = inputRange(def);
  const invalid = draft !== null && fromInput(def, draft) === null;
  const outOfSlider = value < def.min || value > def.max;

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 truncate">
          {def.emoji} {def.label}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            value={draft ?? String(Math.round(value))}
            title={`${lo}~${hi}${UNIT_LABEL[def.unit]} 사이로 입력하세요`}
            onFocus={(e) => {
              setDraft(String(Math.round(value)));
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
            className={`w-[4.2rem] rounded-md bg-black/40 px-1.5 py-0.5 text-right font-bold tabular-nums text-yellow-300 outline-none focus:ring-2 ${
              invalid ? "ring-2 ring-rose-400" : "focus:ring-yellow-400"
            } [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
          />
          <span className="w-3 text-xs text-white/60">{UNIT_LABEL[def.unit]}</span>
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
        min={def.min}
        max={def.max}
        step={def.step}
        value={Math.min(def.max, Math.max(def.min, value))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-yellow-400"
      />
      {invalid && (
        <p className="text-xs text-rose-300">
          {lo}~{hi}
          {UNIT_LABEL[def.unit]} 사이의 숫자를 넣어 주세요
        </p>
      )}
      {!invalid && outOfSlider && <p className="text-xs text-cyan-300">✨ 슬라이더보다 큰 값을 직접 입력했어요!</p>}
    </div>
  );
}

export function KindPicker({ value, onPick }: { value: Kind; onPick: (k: Kind) => void }) {
  const categories = Object.keys(CATEGORY_LABEL) as Category[];
  return (
    <div className="space-y-2">
      {categories.map((cat) => (
        <div key={cat}>
          <div className="mb-1 text-[11px] text-white/50">{CATEGORY_LABEL[cat]}</div>
          <div className="grid grid-cols-4 gap-1.5">
            {KINDS.filter((k) => k.category === cat).map((k) => (
              <button
                key={k.key}
                onClick={() => onPick(k.key)}
                className={`rounded-xl px-0.5 py-2 text-center text-[10.5px] leading-tight transition ${
                  value === k.key ? "bg-yellow-400 font-bold text-zinc-900" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                <div className="text-xl">{k.emoji}</div>
                {k.name}
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

export function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg py-1.5 text-sm transition ${
        active ? "bg-yellow-400 font-bold text-zinc-900" : "bg-white/10 hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}

export function kindTitle(kind: Kind): string {
  const spec = specOf(kind);
  return `${spec.emoji} ${spec.name} 착시`;
}
