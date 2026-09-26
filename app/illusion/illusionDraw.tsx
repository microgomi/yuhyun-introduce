import { VIEW_H, VIEW_W, type Kind, type Params } from "./illusionSpec";

// ----------------------------------------------------------------------------
// 착시 그리기. 모든 착시가 같은 viewBox 를 쓰므로 갤러리 미리보기와 사진 저장에
// 똑같은 그림을 그대로 다시 쓸 수 있다.
// ----------------------------------------------------------------------------

const DASH = { stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "5 4" } as const;
const INK = "#1e293b";

function gray(level: number): string {
  const v = Math.round(Math.max(0, Math.min(255, level)));
  return `rgb(${v},${v},${v})`;
}

/** 원을 둥글게 배치한다. */
function ring(count: number, radius: number, cx: number, cy: number) {
  return Array.from({ length: Math.max(1, Math.round(count)) }, (_, i) => {
    const angle = (i / Math.max(1, Math.round(count))) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
}

function Muller({ p, revealed }: { p: Params; revealed: boolean }) {
  const x1 = VIEW_W / 2 - p.len / 2;
  const x2 = VIEW_W / 2 + p.len / 2;
  const rad = (p.angle * Math.PI) / 180;
  const dx = Math.cos(rad) * p.fin;
  const dy = Math.sin(rad) * p.fin;
  const arm = (x: number, y: number, dir: 1 | -1) =>
    `M${x} ${y} L${x + dx * dir} ${y - dy} M${x} ${y} L${x + dx * dir} ${y + dy}`;
  return (
    <g>
      <line x1={x1} y1={70} x2={x2} y2={70} stroke={INK} strokeWidth={p.weight} />
      <path d={arm(x1, 70, 1)} stroke={INK} strokeWidth={p.weight} fill="none" />
      <path d={arm(x2, 70, -1)} stroke={INK} strokeWidth={p.weight} fill="none" />

      <line x1={x1} y1={160} x2={x2} y2={160} stroke={INK} strokeWidth={p.weight} />
      <path d={arm(x1, 160, -1)} stroke={INK} strokeWidth={p.weight} fill="none" />
      <path d={arm(x2, 160, 1)} stroke={INK} strokeWidth={p.weight} fill="none" />

      {revealed && (
        <g>
          <line x1={x1} y1={38} x2={x1} y2={196} {...DASH} />
          <line x1={x2} y1={38} x2={x2} y2={196} {...DASH} />
          <text x={VIEW_W / 2} y={118} fontSize="13" fill="#ef4444" fontWeight="bold" textAnchor="middle">
            둘 다 {Math.round(p.len)}!
          </text>
        </g>
      )}
    </g>
  );
}

function Ponzo({ p, revealed }: { p: Params; revealed: boolean }) {
  const cx = VIEW_W / 2;
  const topHalf = 55;
  const botHalf = 55 + p.slant;
  const ties = Math.round(p.ties);
  const halfAt = (y: number) => topHalf + ((botHalf - topHalf) * (y - 20)) / 180;
  return (
    <g>
      {!revealed && (
        <g stroke="#64748b" strokeWidth={3}>
          <line x1={cx - topHalf} y1={20} x2={cx - botHalf} y2={200} />
          <line x1={cx + topHalf} y1={20} x2={cx + botHalf} y2={200} />
          {Array.from({ length: ties }, (_, i) => {
            const y = 30 + ((i + 1) * 160) / (ties + 1);
            const h = halfAt(y) - 3;
            return <line key={i} x1={cx - h} y1={y} x2={cx + h} y2={y} strokeWidth={1.5} />;
          })}
        </g>
      )}
      <rect x={cx - p.bar / 2} y={p.topY} width={p.bar} height={15} rx={3} fill="#eab308" />
      <rect x={cx - p.bar / 2} y={178} width={p.bar} height={15} rx={3} fill="#eab308" />
      {revealed && (
        <g>
          <line x1={cx - p.bar / 2} y1={p.topY - 8} x2={cx - p.bar / 2} y2={201} {...DASH} />
          <line x1={cx + p.bar / 2} y1={p.topY - 8} x2={cx + p.bar / 2} y2={201} {...DASH} />
          <text x={cx} y={125} fontSize="13" fill="#ef4444" fontWeight="bold" textAnchor="middle">
            양쪽 끝이 딱 맞아요!
          </text>
        </g>
      )}
    </g>
  );
}

function Ebbing({ p, revealed }: { p: Params; revealed: boolean }) {
  const leftRing = ring(p.count, p.dist, 90, 110);
  const rightRing = ring(p.count, p.dist, 250, 110);
  return (
    <g>
      {!revealed && leftRing.map((c, i) => <circle key={`l${i}`} cx={c.x} cy={c.y} r={p.big} fill="#94a3b8" />)}
      <circle cx={90} cy={110} r={p.center} fill="#f97316" />
      {!revealed && rightRing.map((c, i) => <circle key={`r${i}`} cx={c.x} cy={c.y} r={p.small} fill="#94a3b8" />)}
      <circle cx={250} cy={110} r={p.center} fill="#f97316" />
      {revealed && (
        <g>
          <line x1={90} y1={110} x2={250} y2={110} {...DASH} />
          <text x={VIEW_W / 2} y={98} fontSize="13" fill="#ef4444" fontWeight="bold" textAnchor="middle">
            둘 다 똑같아요!
          </text>
        </g>
      )}
    </g>
  );
}

function Vertical({ p, revealed }: { p: Params; revealed: boolean }) {
  const baseY = 190;
  const left = (VIEW_W - p.len) / 2;
  const right = left + p.len;
  // shift 0 이면 가로선 왼쪽 끝, 100 이면 오른쪽 끝에 세로선이 선다.
  const stemX = left + (p.len * p.shift) / 100;
  const topY = baseY - p.len;
  return (
    <g>
      <line x1={left} y1={baseY} x2={right} y2={baseY} stroke={INK} strokeWidth={p.weight} />
      <line x1={stemX} y1={topY} x2={stemX} y2={baseY} stroke={INK} strokeWidth={p.weight} />
      {revealed && (
        <g>
          <line x1={left} y1={topY} x2={left} y2={baseY} {...DASH} />
          <line x1={left} y1={topY} x2={stemX} y2={topY} {...DASH} />
          <text x={VIEW_W - 12} y={topY + 24} fontSize="13" fill="#ef4444" fontWeight="bold" textAnchor="end">
            {Math.round(p.len)} = {Math.round(p.len)}
          </text>
        </g>
      )}
    </g>
  );
}

function Cafe({ p, revealed }: { p: Params; revealed: boolean }) {
  const rowH = p.tile + p.mortar;
  const rows = Math.max(1, Math.floor(VIEW_H / rowH));
  const cols = Math.ceil(VIEW_W / p.tile) + 2;
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const offset = ((r % 4) * (p.shift / 100) * p.tile) % (p.tile * 2);
    for (let c = 0; c < cols; c++) {
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={c * p.tile - p.tile + offset}
          y={r * rowH}
          width={p.tile}
          height={p.tile}
          fill={(r + c) % 2 === 0 ? "#111827" : "#ffffff"}
        />
      );
    }
  }
  return (
    <g>
      <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={gray(p.gray)} />
      {cells}
      {revealed &&
        Array.from({ length: rows }, (_, r) => (
          <line key={r} x1={0} y1={r * rowH} x2={VIEW_W} y2={r * rowH} {...DASH} />
        ))}
    </g>
  );
}

function Contrast({ p, revealed }: { p: Params; revealed: boolean }) {
  const half = VIEW_W / 2;
  const s = p.size;
  return (
    <g>
      <rect x={0} y={0} width={half} height={VIEW_H} fill={gray(p.bgL)} />
      <rect x={half} y={0} width={half} height={VIEW_H} fill={gray(p.bgR)} />
      <rect x={half / 2 - s / 2} y={110 - s / 2} width={s} height={s} fill={gray(p.square)} />
      <rect x={half + half / 2 - s / 2} y={110 - s / 2} width={s} height={s} fill={gray(p.square)} />
      {revealed && <rect x={0} y={96} width={VIEW_W} height={28} fill={gray(p.square)} />}
    </g>
  );
}

function Hermann({ p, revealed }: { p: Params; revealed: boolean }) {
  const n = Math.round(p.cells);
  // 선이 너무 굵으면 칸이 사라지므로 최소 크기를 보장한다.
  const size = Math.max(4, (VIEW_H - (n + 1) * p.line) / n);
  const boxW = n * size + (n + 1) * p.line;
  const offsetX = (VIEW_W - boxW) / 2;
  const squares: React.ReactNode[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      squares.push(
        <rect
          key={`${r}-${c}`}
          x={offsetX + p.line + c * (size + p.line)}
          y={p.line + r * (size + p.line)}
          width={size}
          height={size}
          fill={gray(p.dark)}
        />
      );
    }
  }
  return (
    <g>
      <rect x={offsetX} y={0} width={boxW} height={VIEW_H} fill="#ffffff" />
      {squares}
      {revealed &&
        Array.from({ length: (n - 1) * (n - 1) }, (_, i) => {
          const col = i % (n - 1);
          const row = Math.floor(i / (n - 1));
          return (
            <circle
              key={i}
              cx={offsetX + p.line + (col + 1) * (size + p.line) - p.line / 2}
              cy={p.line + (row + 1) * (size + p.line) - p.line / 2}
              r={Math.max(3, p.line / 2)}
              fill="none"
              stroke="#ef4444"
              strokeWidth={2}
            />
          );
        })}
    </g>
  );
}

const DRAWERS: Record<Kind, (props: { p: Params; revealed: boolean }) => React.ReactElement> = {
  muller: Muller,
  ponzo: Ponzo,
  ebbing: Ebbing,
  vertical: Vertical,
  cafe: Cafe,
  contrast: Contrast,
  hermann: Hermann,
};

export function IllusionArt({ kind, params, revealed }: { kind: Kind; params: Params; revealed: boolean }) {
  const Drawer = DRAWERS[kind];
  return <Drawer p={params} revealed={revealed} />;
}

/** 저장·공유·사진에 쓰는, 그 자체로 완결된 SVG 한 장. */
export function IllusionSvg({
  kind,
  params,
  revealed,
  className,
  ref,
}: {
  kind: Kind;
  params: Params;
  revealed: boolean;
  className?: string;
  /** 사진으로 굽기 위해 바깥에서 이 svg 엘리먼트를 잡을 수 있게 한다. */
  ref?: React.Ref<SVGSVGElement>;
}) {
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="#ffffff" />
      <IllusionArt kind={kind} params={params} revealed={revealed} />
    </svg>
  );
}
