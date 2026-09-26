import * as THREE from "three";

// ----------------------------------------------------------------------------
// 기본 도형: 꼭짓점 좌표만 주고, 면은 볼록 껍질 평면을 찾아 자동으로 만든다
// ----------------------------------------------------------------------------

export type BaseKey =
  | "tetra" | "cube" | "octa" | "dodeca" | "icosa"
  | "cubocta" | "truncOcta" | "soccer" | "rhombDodeca"
  | "prism3" | "prism5" | "prism6" | "cylinder" | "pyramid" | "cone" | "bipyr3" | "bipyr5";

export type BaseCategory = "platonic" | "archimedean" | "prismPyramid";

export const CATEGORY_LABEL: Record<BaseCategory, string> = {
  platonic: "정다면체",
  archimedean: "준정다면체 · 특별한 다면체",
  prismPyramid: "기둥 · 뿔",
};

export interface BaseInfo {
  key: BaseKey;
  name: string;
  emoji: string;
  category: BaseCategory;
  faceShape: string;
  platonic: boolean; // 정다면체 여부
  dihedral: number | null; // 이웃한 두 면 사이 각도(도). 면마다 다르면 null
  perVertex: string; // 한 꼭짓점에 모이는 면 수
  dual?: BaseKey; // 짝꿍(쌍대) 도형 — 면 가운데를 이으면 나오는 도형
  fact: string;
}

export const BASES: BaseInfo[] = [
  { key: "tetra", name: "정사면체", emoji: "🔺", category: "platonic", faceShape: "정삼각형", platonic: true, dihedral: 70.53, perVertex: "3", dual: "tetra", fact: "가장 적은 면으로 만든 정다면체예요. 짝꿍이 자기 자신이에요!" },
  { key: "cube", name: "정육면체", emoji: "🧊", category: "platonic", faceShape: "정사각형", platonic: true, dihedral: 90, perVertex: "3", dual: "octa", fact: "주사위와 각설탕 모양! 면끼리 딱 90°로 만나요." },
  { key: "octa", name: "정팔면체", emoji: "💎", category: "platonic", faceShape: "정삼각형", platonic: true, dihedral: 109.47, perVertex: "4", dual: "cube", fact: "피라미드 두 개를 밑면끼리 붙인 모양이에요. 다이아몬드 결정과 비슷해요." },
  { key: "dodeca", name: "정십이면체", emoji: "🪐", category: "platonic", faceShape: "정오각형", platonic: true, dihedral: 116.57, perVertex: "3", dual: "icosa", fact: "오각형 12개로 만들어요. 정이십면체와 서로 짝꿍(쌍대)이에요!" },
  { key: "icosa", name: "정이십면체", emoji: "🎲", category: "platonic", faceShape: "정삼각형", platonic: true, dihedral: 138.19, perVertex: "5", dual: "dodeca", fact: "삼각형 20개! D20 주사위, 바이러스 껍질, 지오데식 돔의 모양이에요." },
  { key: "cubocta", name: "육팔면체", emoji: "🔶", category: "archimedean", faceShape: "정삼각형 8개 + 정사각형 6개", platonic: false, dihedral: 125.26, perVertex: "4", dual: "rhombDodeca", fact: "정육면체와 정팔면체의 딱 중간 모양! 가운데에서 모든 꼭짓점까지 거리와 모서리 길이가 똑같아요." },
  { key: "truncOcta", name: "깎은 정팔면체", emoji: "🧩", category: "archimedean", faceShape: "정사각형 6개 + 정육각형 8개", platonic: false, dihedral: null, perVertex: "3", fact: "똑같은 모양만으로 공간을 빈틈없이 가득 채울 수 있는 신기한 도형이에요." },
  { key: "soccer", name: "축구공", emoji: "⚽", category: "archimedean", faceShape: "정오각형 12개 + 정육각형 20개", platonic: false, dihedral: null, perVertex: "3", fact: "정이십면체의 뾰족한 꼭짓점 12개를 잘라내면 축구공(깎은 정이십면체)이 돼요! 꼭짓점이 60개예요." },
  { key: "rhombDodeca", name: "마름모십이면체", emoji: "🔸", category: "archimedean", faceShape: "마름모 12개", platonic: false, dihedral: 120, perVertex: "3~4", dual: "cubocta", fact: "석류 씨앗과 벌집 바닥에서 볼 수 있는 모양이에요. 이것도 공간을 빈틈없이 채워요." },
  { key: "prism3", name: "삼각기둥", emoji: "🧀", category: "prismPyramid", faceShape: "삼각형 2개 + 직사각형 3개", platonic: false, dihedral: null, perVertex: "3", dual: "bipyr3", fact: "치즈 조각과 텐트 모양이에요. 유리로 만든 삼각기둥(프리즘)은 빛을 무지개로 나눠요!" },
  { key: "prism5", name: "오각기둥", emoji: "🏠", category: "prismPyramid", faceShape: "오각형 2개 + 직사각형 5개", platonic: false, dihedral: null, perVertex: "3", dual: "bipyr5", fact: "위아래가 오각형인 기둥이에요. 옆면 5개는 모두 직사각형이에요." },
  { key: "prism6", name: "육각기둥", emoji: "✏️", category: "prismPyramid", faceShape: "육각형 2개 + 직사각형 6개", platonic: false, dihedral: null, perVertex: "3", fact: "연필과 벌집 한 칸의 모양이에요. 옆면끼리는 120°로 만나요." },
  { key: "cylinder", name: "원기둥", emoji: "🥫", category: "prismPyramid", faceShape: "16각형 2개 + 직사각형 16개", platonic: false, dihedral: null, perVertex: "3", fact: "옆면이 아주 많은 각기둥은 원기둥처럼 보여요. 통조림 캔 모양!" },
  { key: "pyramid", name: "사각뿔", emoji: "🏜️", category: "prismPyramid", faceShape: "정사각형 1개 + 삼각형 4개", platonic: false, dihedral: null, perVertex: "3~4", dual: "pyramid", fact: "이집트 피라미드 모양! 짝꿍이 자기 자신인 도형이에요." },
  { key: "cone", name: "원뿔", emoji: "🎉", category: "prismPyramid", faceShape: "16각형 1개 + 삼각형 16개", platonic: false, dihedral: null, perVertex: "3~16", fact: "밑면이 아주 많은 각뿔은 원뿔처럼 보여요. 고깔모자 모양!" },
  { key: "bipyr3", name: "삼각쌍뿔", emoji: "🪁", category: "prismPyramid", faceShape: "삼각형 6개", platonic: false, dihedral: null, perVertex: "3~4", dual: "prism3", fact: "삼각뿔 두 개를 밑면끼리 붙였어요. 삼각기둥과 짝꿍이에요." },
  { key: "bipyr5", name: "오각쌍뿔", emoji: "🔷", category: "prismPyramid", faceShape: "삼각형 10개", platonic: false, dihedral: null, perVertex: "4~5", dual: "prism5", fact: "오각뿔 두 개를 밑면끼리 붙였어요. 허리 꼭짓점에는 면이 4개, 위아래 꼭짓점에는 5개가 모여요." },
];

export function baseInfo(key: BaseKey): BaseInfo {
  return BASES.find((b) => b.key === key) ?? BASES[4];
}

export interface BasePoly {
  verts: THREE.Vector3[];
  faces: number[][]; // 바깥에서 봤을 때 반시계 순서
  edges: number;
}

const PHI = (1 + Math.sqrt(5)) / 2;

// 좌표 묶음의 모든 순열 × 모든 부호 조합 (겹치는 점은 하나로)
function signedPerms(seed: number[], cyclicOnly = false): number[][] {
  const [a, b, c] = seed;
  const orders = cyclicOnly
    ? [[a, b, c], [b, c, a], [c, a, b]]
    : [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]];
  const out = new Map<string, number[]>();
  for (const [x, y, z] of orders) {
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const v = [x * sx, y * sy, z * sz];
      out.set(v.map((n) => n.toFixed(5)).join(","), v);
    }
  }
  return [...out.values()];
}

const ring = (n: number, y: number, r = 1) =>
  Array.from({ length: n }, (_, k) => [r * Math.cos((k * 2 * Math.PI) / n), y, r * Math.sin((k * 2 * Math.PI) / n)]);

function rawVerts(key: BaseKey): number[][] {
  switch (key) {
    case "tetra":
      return [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
    case "cube":
      return signedPerms([1, 1, 1]);
    case "octa":
      return signedPerms([1, 0, 0]);
    case "dodeca":
      return [...signedPerms([1, 1, 1]), ...signedPerms([0, 1 / PHI, PHI], true)];
    case "icosa":
      return signedPerms([0, 1, PHI], true);
    case "cubocta":
      return signedPerms([1, 1, 0]);
    case "truncOcta":
      return signedPerms([0, 1, 2]);
    case "soccer":
      // 깎은 정이십면체: 세 좌표 묶음의 순환 순열 × 부호 (60개)
      return [
        ...signedPerms([0, 1, 3 * PHI], true),
        ...signedPerms([1, 2 + PHI, 2 * PHI], true),
        ...signedPerms([PHI, 2, 2 * PHI + 1], true),
      ];
    case "rhombDodeca":
      // 꼭짓점이 두 종류(거리 √3, 2)라서 구에 올리면 안 된다 → 아래 getBase 에서 통째로 축소
      return [...signedPerms([1, 1, 1]), ...signedPerms([2, 0, 0])];
    case "prism3":
      return [...ring(3, 0.8), ...ring(3, -0.8)];
    case "prism5":
      return [...ring(5, 0.8), ...ring(5, -0.8)];
    case "prism6":
      return [...ring(6, 0.8), ...ring(6, -0.8)];
    case "cylinder":
      return [...ring(16, 0.8), ...ring(16, -0.8)];
    case "pyramid":
      return [[1, -0.6, 1], [1, -0.6, -1], [-1, -0.6, 1], [-1, -0.6, -1], [0, 1, 0]];
    case "cone":
      return [...ring(16, -0.6, 1.3), [0, 1.2, 0]];
    case "bipyr3":
      return [[0, 1.2, 0], [0, -1.2, 0], ...ring(3, 0)];
    case "bipyr5":
      return [[0, 1.2, 0], [0, -1.2, 0], ...ring(5, 0)];
  }
}

function buildFaces(verts: THREE.Vector3[]): number[][] {
  const faces: number[][] = [];
  const seen = new Set<string>();
  const n = verts.length;
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        ab.subVectors(verts[j], verts[i]);
        ac.subVectors(verts[k], verts[i]);
        const normal = new THREE.Vector3().crossVectors(ab, ac);
        if (normal.lengthSq() < 1e-12) continue;
        normal.normalize();
        const d = normal.dot(verts[i]);
        let pos = false;
        let neg = false;
        const on: number[] = [];
        for (let m = 0; m < n; m++) {
          const s = normal.dot(verts[m]) - d;
          if (s > 1e-6) pos = true;
          else if (s < -1e-6) neg = true;
          else on.push(m);
        }
        // 모든 점이 한쪽에 있어야 겉면
        if (pos && neg) continue;
        const key = on.join(",");
        if (seen.has(key)) continue;
        seen.add(key);
        const outward = pos ? normal.clone().negate() : normal;
        const center = new THREE.Vector3();
        on.forEach((m) => center.add(verts[m]));
        center.divideScalar(on.length);
        const u = verts[on[0]].clone().sub(center).normalize();
        const w = new THREE.Vector3().crossVectors(outward, u);
        const angleOf = (m: number) => {
          const p = verts[m].clone().sub(center);
          return Math.atan2(p.dot(w), p.dot(u));
        };
        faces.push([...on].sort((a, b) => angleOf(a) - angleOf(b)));
      }
    }
  }
  return faces;
}

const baseCache = new Map<BaseKey, BasePoly>();

export function getBase(key: BaseKey): BasePoly {
  const cached = baseCache.get(key);
  if (cached) return cached;
  const raw = rawVerts(key).map(([x, y, z]) => new THREE.Vector3(x, y, z));
  // 모양을 유지한 채 가장 먼 꼭짓점이 반지름 1이 되도록 통째로 줄인다
  const maxLen = Math.max(...raw.map((v) => v.length()));
  const verts = raw.map((v) => v.divideScalar(maxLen));
  const faces = buildFaces(verts);
  const edges = faces.reduce((sum, f) => sum + f.length, 0) / 2;
  const poly = { verts, faces, edges };
  baseCache.set(key, poly);
  return poly;
}
