// ----------------------------------------------------------------------------
// 착시 퍼즐: 흩어진 평면 조각을 잡아 옮기고 돌려서 착시를 완성하는 게임
// ----------------------------------------------------------------------------

export const STAGE_W = 340;
export const STAGE_H = 260;

/** 이 거리 안이면 위치 만점. 3배 거리에서 0점이 된다. */
export const POS_TOLERANCE = 14;
/** 이 각도 안이면 회전 만점. 3배 각도에서 0점이 된다. */
export const ROT_TOLERANCE = 12;
/** 완성으로 인정하는 점수. */
export const CLEAR_SCORE = 90;

export type PieceShape =
  /** 팩맨처럼 한 조각을 베어낸 원. 입은 조각의 0° 방향(오른쪽)으로 벌어진다. */
  | { type: "pac"; r: number; mouth: number }
  /** 화살표 깃. 꼭짓점이 원점이고 팔이 0° 방향으로 벌어진다. */
  | { type: "fin"; arm: number; spread: number; weight: number }
  /** 가로선. */
  | { type: "line"; len: number; weight: number }
  /** 흑백 타일 한 줄. */
  | { type: "tilerow"; tile: number; cols: number };

export interface Placement {
  x: number;
  y: number;
  rot: number;
}

export interface Piece {
  id: string;
  shape: PieceShape;
  color: string;
  start: Placement;
  target: Placement;
  /** 회전이 필요 없는 조각은 회전 점수를 매기지 않는다. */
  rotatable: boolean;
  /** 좌우로만 움직이는 조각(타일 줄). */
  axis: "x" | "both";
  /** 배경으로 깔린, 움직일 수 없는 조각. */
  fixed: boolean;
}

export interface Stage {
  id: string;
  emoji: string;
  name: string;
  goal: string;
  /** 무대 배경색. 카페 벽은 줄눈이 보이도록 회색을 깐다. */
  bg?: string;
  /** 완성했을 때 드러나는 착시의 이름과 설명. */
  revealTitle: string;
  why: string;
  pieces: Piece[];
}

const pac = (r: number, mouth: number): PieceShape => ({ type: "pac", r, mouth });

/** 삼각형 세 꼭짓점에서 가운데를 바라보는 각도 */
function facing(x: number, y: number, cx: number, cy: number): number {
  return Math.round((Math.atan2(cy - y, cx - x) * 180) / Math.PI);
}

function kanizsaPieces(
  corners: readonly (readonly [number, number])[],
  starts: readonly (readonly [number, number, number])[],
  radius: number
): Piece[] {
  const cx = corners.reduce((sum, c) => sum + c[0], 0) / corners.length;
  const cy = corners.reduce((sum, c) => sum + c[1], 0) / corners.length;
  return corners.map((corner, i) => ({
    id: `pac${i}`,
    shape: pac(radius, 60),
    color: "#1e293b",
    start: { x: starts[i][0], y: starts[i][1], rot: starts[i][2] },
    target: { x: corner[0], y: corner[1], rot: facing(corner[0], corner[1], cx, cy) },
    rotatable: true,
    axis: "both",
    fixed: false,
  }));
}

export const STAGES: Stage[] = [
  {
    id: "kanizsa3",
    emoji: "🔺",
    name: "없는 삼각형",
    goal: "팩맨 세 개의 입이 모두 가운데를 보도록 놓아보세요.",
    revealTitle: "카니자 삼각형",
    why: "선이 하나도 없는데 하얀 삼각형이 보이죠? 뇌가 빠진 부분을 스스로 채워서 없는 모서리를 만들어 내요.",
    pieces: kanizsaPieces(
      [
        [170, 62],
        [96, 190],
        [244, 190],
      ],
      [
        [50, 40, 0],
        [290, 60, 150],
        [60, 220, 210],
      ],
      30
    ),
  },
  {
    id: "kanizsa4",
    emoji: "⬜",
    name: "없는 네모",
    goal: "팩맨 네 개로 네모 모서리를 만들어 보세요.",
    revealTitle: "카니자 사각형",
    why: "네 귀퉁이만 있어도 뇌는 그 사이를 이어 붙여 하얀 네모를 봐요. 배경보다 더 하얗게 보이기까지 한답니다.",
    pieces: kanizsaPieces(
      [
        [112, 82],
        [228, 82],
        [228, 198],
        [112, 198],
      ],
      [
        [40, 220, 100],
        [300, 210, 200],
        [45, 45, 300],
        [295, 45, 20],
      ],
      28
    ),
  },
  {
    id: "muller",
    emoji: "📏",
    name: "화살표 붙이기",
    goal: "위 선에는 바깥으로, 아래 선에는 안쪽으로 화살표를 붙여보세요.",
    revealTitle: "뮐러-라이어 착시",
    why: "두 선의 길이는 똑같아요! 화살표가 바깥으로 벌어지면 길게, 안으로 모이면 짧게 느껴져요.",
    pieces: [
      {
        id: "lineTop",
        shape: { type: "line", len: 180, weight: 5 },
        color: "#1e293b",
        start: { x: 170, y: 95, rot: 0 },
        target: { x: 170, y: 95, rot: 0 },
        rotatable: false,
        axis: "both",
        fixed: true,
      },
      {
        id: "lineBottom",
        shape: { type: "line", len: 180, weight: 5 },
        color: "#1e293b",
        start: { x: 170, y: 185, rot: 0 },
        target: { x: 170, y: 185, rot: 0 },
        rotatable: false,
        axis: "both",
        fixed: true,
      },
      // 위 선: 깃이 바깥을 향해야 길어 보인다.
      {
        id: "finTL",
        shape: { type: "fin", arm: 26, spread: 40, weight: 5 },
        color: "#1e293b",
        start: { x: 60, y: 40, rot: 0 },
        target: { x: 80, y: 95, rot: 180 },
        rotatable: true,
        axis: "both",
        fixed: false,
      },
      {
        id: "finTR",
        shape: { type: "fin", arm: 26, spread: 40, weight: 5 },
        color: "#1e293b",
        start: { x: 280, y: 40, rot: 180 },
        target: { x: 260, y: 95, rot: 0 },
        rotatable: true,
        axis: "both",
        fixed: false,
      },
      // 아래 선: 깃이 안쪽을 향해야 짧아 보인다.
      {
        id: "finBL",
        shape: { type: "fin", arm: 26, spread: 40, weight: 5 },
        color: "#1e293b",
        start: { x: 60, y: 235, rot: 180 },
        target: { x: 80, y: 185, rot: 0 },
        rotatable: true,
        axis: "both",
        fixed: false,
      },
      {
        id: "finBR",
        shape: { type: "fin", arm: 26, spread: 40, weight: 5 },
        color: "#1e293b",
        start: { x: 280, y: 235, rot: 0 },
        target: { x: 260, y: 185, rot: 180 },
        rotatable: true,
        axis: "both",
        fixed: false,
      },
    ],
  },
  {
    id: "cafe",
    emoji: "🧱",
    name: "비뚤어진 벽",
    goal: "타일 줄을 좌우로 밀어 반 칸씩 어긋나게 쌓아보세요.",
    bg: "#9ca3af",
    revealTitle: "카페 벽 착시",
    why: "가로줄은 전부 평행해요! 칸이 반 칸씩 어긋나면 사이의 회색 줄눈이 기울어진 것처럼 보여요.",
    pieces: [0, 1, 2, 3, 4].map((row) => ({
      id: `row${row}`,
      shape: { type: "tilerow" as const, tile: 30, cols: 14 },
      color: "#1e293b",
      start: { x: 170 + (row % 2 === 0 ? -42 : 38), y: 45 + row * 36, rot: 0 },
      // 한 줄씩 반 칸(15)만큼 밀린 자리가 정답이다.
      target: { x: 170 + (row % 2 === 0 ? 0 : 15), y: 45 + row * 36, rot: 0 },
      rotatable: false,
      axis: "x" as const,
      fixed: false,
    })),
  },
];

/** 각도 차이를 -180~180 으로 접어서 잰다. 359° 와 1° 는 2° 차이다. */
export function angleDiff(a: number, b: number): number {
  return Math.abs(((((a - b) % 360) + 540) % 360) - 180);
}

export function pieceScore(piece: Piece, at: Placement): number {
  if (piece.fixed) return 1;
  const dist = Math.hypot(at.x - piece.target.x, at.y - piece.target.y);
  const posScore = Math.max(0, Math.min(1, 1 - (dist - POS_TOLERANCE) / (POS_TOLERANCE * 2)));
  if (!piece.rotatable) return posScore;

  const rotOff = angleDiff(at.rot, piece.target.rot);
  const rotScore = Math.max(0, Math.min(1, 1 - (rotOff - ROT_TOLERANCE) / (ROT_TOLERANCE * 2)));
  // 위치가 더 중요하지만, 카니자는 입이 어디를 보는지가 착시를 만든다.
  return posScore * 0.6 + rotScore * 0.4;
}

export function stageScore(stage: Stage, placements: Record<string, Placement>): number {
  const movable = stage.pieces.filter((p) => !p.fixed);
  if (movable.length === 0) return 100;
  const total = movable.reduce((sum, piece) => {
    const at = placements[piece.id] ?? piece.start;
    return sum + pieceScore(piece, at);
  }, 0);
  return Math.round((total / movable.length) * 100);
}

/** 조각이 제자리에 들어왔는지 — 딱 붙는 느낌과 효과음에 쓴다. */
export function isSnapped(piece: Piece, at: Placement): boolean {
  if (piece.fixed) return true;
  const dist = Math.hypot(at.x - piece.target.x, at.y - piece.target.y);
  if (dist > POS_TOLERANCE) return false;
  return !piece.rotatable || angleDiff(at.rot, piece.target.rot) <= ROT_TOLERANCE;
}
