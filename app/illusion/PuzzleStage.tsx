"use client";
import { useCallback, useMemo, useRef } from "react";

import {
  isSnapped,
  stageScore,
  STAGE_H,
  STAGE_W,
  type Piece,
  type Placement,
  type PieceShape,
  type Stage,
} from "./illusionPuzzle";

// ----------------------------------------------------------------------------
// 조각을 잡아 옮기고 돌려서 착시를 완성하는 무대
// ----------------------------------------------------------------------------

/** 입이 0° 방향(오른쪽)으로 벌어진 팩맨. */
function pacPath(r: number, mouth: number): string {
  const h = (mouth / 2) * (Math.PI / 180);
  const ax = r * Math.cos(h);
  const ay = r * Math.sin(h);
  // 입을 뺀 나머지(180°보다 크다)를 한 번에 돌아오는 호로 그린다.
  return `M0,0 L${ax.toFixed(2)},${ay.toFixed(2)} A${r},${r} 0 1,1 ${ax.toFixed(2)},${(-ay).toFixed(2)} Z`;
}

function PieceArt({ shape, color }: { shape: PieceShape; color: string }) {
  switch (shape.type) {
    case "pac":
      return <path d={pacPath(shape.r, shape.mouth)} fill={color} />;
    case "fin": {
      const rad = (shape.spread / 2) * (Math.PI / 180);
      const dx = shape.arm * Math.cos(rad);
      const dy = shape.arm * Math.sin(rad);
      return (
        <path
          d={`M${dx.toFixed(2)},${(-dy).toFixed(2)} L0,0 L${dx.toFixed(2)},${dy.toFixed(2)}`}
          stroke={color}
          strokeWidth={shape.weight}
          fill="none"
          strokeLinecap="round"
        />
      );
    }
    case "line":
      return (
        <line
          x1={-shape.len / 2}
          y1={0}
          x2={shape.len / 2}
          y2={0}
          stroke={color}
          strokeWidth={shape.weight}
        />
      );
    case "tilerow": {
      const { tile, cols } = shape;
      return (
        <g>
          {Array.from({ length: cols }, (_, i) => (
            <rect
              key={i}
              x={(i - cols / 2) * tile}
              y={-tile / 2}
              width={tile}
              height={tile}
              fill={i % 2 === 0 ? "#111827" : "#ffffff"}
            />
          ))}
        </g>
      );
    }
  }
}

export function PuzzleStage({
  stage,
  placements,
  onMove,
  selectedId,
  onSelect,
  showHint,
  cleared,
}: {
  stage: Stage;
  placements: Record<string, Placement>;
  onMove: (id: string, next: Placement) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showHint: boolean;
  cleared: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  // 잡은 조각과, 조각 중심에서 손가락까지의 어긋남
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const toStage = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (svg === null) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * STAGE_W,
      y: ((clientY - rect.top) / rect.height) * STAGE_H,
    };
  }, []);

  const handleDown = useCallback(
    (event: React.PointerEvent, piece: Piece) => {
      if (piece.fixed || cleared) return;
      event.stopPropagation();
      const at = placements[piece.id] ?? piece.start;
      const point = toStage(event.clientX, event.clientY);
      dragRef.current = { id: piece.id, dx: at.x - point.x, dy: at.y - point.y };
      onSelect(piece.id);
      svgRef.current?.setPointerCapture(event.pointerId);
    },
    [placements, toStage, onSelect, cleared]
  );

  const handleMove = useCallback(
    (event: React.PointerEvent) => {
      const drag = dragRef.current;
      if (drag === null) return;
      const piece = stage.pieces.find((p) => p.id === drag.id);
      if (piece === undefined) return;

      const point = toStage(event.clientX, event.clientY);
      const at = placements[piece.id] ?? piece.start;
      const x = Math.max(10, Math.min(STAGE_W - 10, point.x + drag.dx));
      // 타일 줄은 좌우로만 움직인다. 위아래로 흔들리면 벽이 무너져 보인다.
      const y = piece.axis === "x" ? piece.target.y : Math.max(10, Math.min(STAGE_H - 10, point.y + drag.dy));
      onMove(piece.id, { x, y, rot: at.rot });
    },
    [stage.pieces, placements, toStage, onMove]
  );

  const endDrag = useCallback((event: React.PointerEvent) => {
    dragRef.current = null;
    svgRef.current?.releasePointerCapture(event.pointerId);
  }, []);

  const ghosts = useMemo(() => stage.pieces.filter((p) => !p.fixed), [stage.pieces]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
      className="w-full touch-none select-none"
      onPointerMove={handleMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerDown={() => onSelect(null)}
    >
      <rect x={0} y={0} width={STAGE_W} height={STAGE_H} fill={stage.bg ?? "#ffffff"} />

      {/* 힌트: 조각이 가야 할 자리를 흐리게 보여준다 */}
      {showHint &&
        !cleared &&
        ghosts.map((piece) => (
          <g
            key={`ghost-${piece.id}`}
            transform={`translate(${piece.target.x} ${piece.target.y}) rotate(${piece.target.rot})`}
            opacity={0.18}
          >
            <PieceArt shape={piece.shape} color={piece.color} />
          </g>
        ))}

      {stage.pieces.map((piece) => {
        const at = placements[piece.id] ?? piece.start;
        const snapped = isSnapped(piece, at);
        const selected = selectedId === piece.id;
        return (
          <g
            key={piece.id}
            transform={`translate(${at.x} ${at.y}) rotate(${at.rot})`}
            onPointerDown={(event) => handleDown(event, piece)}
            style={{ cursor: piece.fixed || cleared ? "default" : "grab" }}
          >
            <PieceArt shape={piece.shape} color={piece.color} />
            {selected && !cleared && (
              <circle r={44} fill="none" stroke="#facc15" strokeWidth={2} strokeDasharray="6 5" />
            )}
            {snapped && !piece.fixed && !cleared && (
              <circle r={6} cx={0} cy={0} fill="#22c55e" opacity={0.85} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export { stageScore };
