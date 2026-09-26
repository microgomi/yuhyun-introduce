import * as THREE from "three";

// 네모난 점 대신 가장자리가 부드러운 동그란 점 (처음 쓸 때 한 번만 만든다)
let dotTex: THREE.CanvasTexture | null = null;
export function dotTexture(): THREE.CanvasTexture {
  if (dotTex) return dotTex;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  dotTex = new THREE.CanvasTexture(canvas);
  return dotTex;
}

// ----------------------------------------------------------------------------
// 허리케인: 반지름 1 기준으로 만든 입자 소용돌이. 복제 고리 안쪽 빈 곳에 맞춰 늘린다.
// 입자마다 (반지름, 각도, 높이, 회전 속도)를 기억해 두고 매 프레임 각도만 바꾼다.
// ----------------------------------------------------------------------------

const EYE = 0.13; // 태풍의 눈 반지름

// 입자 소용돌이 모양(geometry)은 하나만 계산하고, 여러 곳에 크기만 바꿔 그릴 수 있다
export class Hurricane {
  readonly geometry = new THREE.BufferGeometry();
  private data: Float32Array; // 입자마다 r, theta, y, speed
  private pos: Float32Array;

  constructor(private count: number) {
    this.data = new Float32Array(count * 4);
    this.pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const white = new THREE.Color("#ffffff");
    const blue = new THREE.Color("#6fa8ff");
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const wall = i % 12 === 0; // 눈벽: 눈 바로 바깥에 높이 솟은 구름 기둥 (너무 많으면 하얗게 뭉친다)
      const arm = i % 3;
      const r = wall ? EYE + Math.random() * 0.08 : EYE + (1 - EYE) * Math.sqrt(Math.random());
      // 로그 나선 팔 3개 + 바깥으로 갈수록 흩어지는 구름
      const jitter = (Math.random() - 0.5) * (0.25 + 0.6 * r);
      const theta = (arm * 2 * Math.PI) / 3 + Math.log(r / EYE) * 2.3 + jitter;
      const thick = wall ? 0.9 : 0.35 * (1 - r) + 0.04;
      const o = i * 4;
      this.data[o] = r;
      this.data[o + 1] = theta;
      this.data[o + 2] = (Math.random() - 0.5) * 2 * thick;
      this.data[o + 3] = 1.4 / (r + 0.15); // 안쪽일수록 빨리 돈다
      c.copy(white).lerp(blue, Math.min(1, (r - EYE) / (1 - EYE)));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.update(0);
  }

  // 이 소용돌이를 그리는 입자 묶음 하나 (radius: 빈 곳 반지름, height: 두께)
  makePoints(radius: number, height: number, opacity: number): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
    const pts = new THREE.Points(
      this.geometry,
      new THREE.PointsMaterial({ size: 0.08, map: dotTexture(), vertexColors: true, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    fitStorm(pts, radius, height);
    return pts;
  }

  update(dt: number) {
    for (let i = 0; i < this.count; i++) {
      const o = i * 4;
      const theta = (this.data[o + 1] += this.data[o + 3] * dt);
      const r = this.data[o];
      this.pos[i * 3] = r * Math.cos(theta);
      this.pos[i * 3 + 1] = this.data[o + 2];
      this.pos[i * 3 + 2] = r * Math.sin(theta);
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
  }
}

// 반지름 1 기준 소용돌이를 빈 곳 크기에 맞춘다. 점 크기는 월드 단위라 반지름에 비례시킨다.
export function fitStorm(pts: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>, radius: number, height: number) {
  pts.scale.set(radius, height, radius);
  pts.material.size = 0.08 * radius;
}
