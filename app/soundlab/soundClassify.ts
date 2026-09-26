// ----------------------------------------------------------------------------
// 녹음된 소리를 분석해서 "무슨 소리인지" 짐작한다.
//
// 완벽한 인공지능 분류기가 아니다. 소리의 네 가지 성질만 재서 규칙으로 맞춘다.
//   길이 · 얼마나 갑자기 시작했나 · 음이 높은가 낮은가 · 크기가 고른가 들쭉날쭉한가
// 그래서 결과는 항상 "짐작"으로 보여 주고, 2등 후보도 같이 알려 준다.
// ----------------------------------------------------------------------------

/** 제자리 라딕스-2 FFT. 길이는 반드시 2의 거듭제곱이어야 한다. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  // 비트 반전 정렬
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k];
        const ai = im[i + k];
        const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ar + br;
        im[i + k] = ai + bi;
        re[i + k + len / 2] = ar - br;
        im[i + k + len / 2] = ai - bi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

export interface Features {
  /** 앞뒤 고요한 부분을 잘라낸 실제 소리 길이(ms) */
  durationMs: number;
  peak: number;
  rms: number;
  /** 가장 큰 소리에 도달하기까지 걸린 시간(ms). 짧으면 "탁!" 하고 시작한 소리. */
  attackMs: number;
  /** 1초에 파형이 0을 지나간 횟수. 쉿·치익 같은 소리에서 높다. */
  zcr: number;
  /** 소리의 무게중심 주파수(Hz). 높으면 날카로운 소리. */
  centroid: number;
  /** 주파수가 퍼진 정도(Hz). 좁으면 휘파람처럼 한 음. */
  spread: number;
  /** 크기가 얼마나 들쭉날쭉한지(0=아주 고름). 부는 소리는 낮고 말소리는 높다. */
  wobble: number;
}

const FRAME = 1024;
const HOP = 512;
/** 이 비율보다 작은 부분은 고요한 것으로 보고 앞뒤를 잘라낸다. */
const SILENCE_RATIO = 0.08;

export function analyze(samples: Float32Array, sampleRate: number): Features {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  if (peak === 0) {
    return { durationMs: 0, peak: 0, rms: 0, attackMs: 0, zcr: 0, centroid: 0, spread: 0, wobble: 0 };
  }

  // 앞뒤 고요한 부분 잘라내기
  const floor = peak * SILENCE_RATIO;
  let start = 0;
  let end = samples.length - 1;
  while (start < end && Math.abs(samples[start]) < floor) start++;
  while (end > start && Math.abs(samples[end]) < floor) end--;
  const body = samples.subarray(start, end + 1);
  const durationMs = (body.length / sampleRate) * 1000;

  let sum = 0;
  let crossings = 0;
  let attackIndex = body.length - 1;
  for (let i = 0; i < body.length; i++) {
    sum += body[i] * body[i];
    if (i > 0 && (body[i - 1] < 0) !== (body[i] < 0)) crossings++;
    if (attackIndex === body.length - 1 && Math.abs(body[i]) >= peak * 0.9) attackIndex = i;
  }
  const rms = Math.sqrt(sum / Math.max(1, body.length));
  const zcr = (crossings / Math.max(1, body.length)) * sampleRate;
  const attackMs = (attackIndex / sampleRate) * 1000;

  // 프레임마다 스펙트럼을 구해 평균한다.
  const spectrum = new Float64Array(FRAME / 2);
  const frameRms: number[] = [];
  let frames = 0;
  for (let offset = 0; offset + FRAME <= body.length; offset += HOP) {
    const re = new Float64Array(FRAME);
    const im = new Float64Array(FRAME);
    let fSum = 0;
    for (let i = 0; i < FRAME; i++) {
      // 해닝 창: 프레임 경계에서 생기는 가짜 주파수를 줄인다.
      const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1));
      re[i] = body[offset + i] * window;
      fSum += body[offset + i] * body[offset + i];
    }
    fft(re, im);
    for (let k = 0; k < FRAME / 2; k++) spectrum[k] += Math.hypot(re[k], im[k]);
    frameRms.push(Math.sqrt(fSum / FRAME));
    frames++;
  }

  let centroid = 0;
  let spread = 0;
  if (frames > 0) {
    let magSum = 0;
    let weighted = 0;
    for (let k = 0; k < spectrum.length; k++) {
      const freq = (k * sampleRate) / FRAME;
      magSum += spectrum[k];
      weighted += freq * spectrum[k];
    }
    centroid = magSum > 0 ? weighted / magSum : 0;
    let variance = 0;
    for (let k = 0; k < spectrum.length; k++) {
      const freq = (k * sampleRate) / FRAME;
      variance += (freq - centroid) * (freq - centroid) * spectrum[k];
    }
    spread = magSum > 0 ? Math.sqrt(variance / magSum) : 0;
  }

  // 크기의 들쭉날쭉함 = 프레임 크기의 표준편차 / 평균
  let wobble = 0;
  if (frameRms.length > 1) {
    const mean = frameRms.reduce((a, b) => a + b, 0) / frameRms.length;
    if (mean > 0) {
      const variance = frameRms.reduce((a, b) => a + (b - mean) * (b - mean), 0) / frameRms.length;
      wobble = Math.sqrt(variance) / mean;
    }
  }

  return { durationMs, peak, rms, attackMs, zcr, centroid, spread, wobble };
}

export interface Guess {
  id: string;
  emoji: string;
  label: string;
  /** 0~1 */
  score: number;
  why: string;
}

/** 값이 목표에 가까울수록 1, 멀어지면 0에 가까워진다. */
function near(value: number, target: number, tolerance: number): number {
  return Math.max(0, 1 - Math.abs(value - target) / tolerance);
}
/** 값이 기준보다 클수록 1에 가까워진다. */
function above(value: number, low: number, high: number): number {
  return Math.max(0, Math.min(1, (value - low) / (high - low)));
}
/** 값이 기준보다 작을수록 1에 가까워진다. */
function below(value: number, high: number, low: number): number {
  return Math.max(0, Math.min(1, (high - value) / (high - low)));
}

/**
 * 후보마다 점수를 매겨 높은 순으로 돌려준다.
 * 규칙은 "그 소리가 실제로 어떻게 생겼는지"에서 나온다 — 박수는 순간적이고 날카롭고,
 * 부는 소리는 길고 고르며, 말소리는 중간 높이에서 크기가 계속 출렁인다.
 */
export function classify(f: Features): Guess[] {
  const short = below(f.durationMs, 400, 80);
  const long = above(f.durationMs, 500, 1200);
  const fastAttack = below(f.attackMs, 120, 10);
  const high = above(f.centroid, 1200, 4000);
  const low = below(f.centroid, 1200, 300);
  const steady = below(f.wobble, 0.9, 0.25);
  const wobbly = above(f.wobble, 0.25, 0.8);
  /** 부는 소리는 말소리보다 훨씬 고르다. 말소리의 약한 출렁임까지 "고르다"로 치지 않도록 따로 잰다. */
  const verySteady = below(f.wobble, 0.4, 0.1);
  const narrow = below(f.spread, 1800, 500);
  const noisy = above(f.zcr, 2000, 8000);

  const guesses: Guess[] = [
    {
      id: "clap",
      emoji: "👏",
      label: "박수 · 손뼉",
      score: short * 0.4 + fastAttack * 0.3 + high * 0.3,
      why: "아주 짧고 갑자기 시작하는 날카로운 소리",
    },
    {
      id: "knock",
      emoji: "🥁",
      label: "두드리는 소리 · 쿵",
      score: short * 0.4 + fastAttack * 0.3 + low * 0.3,
      why: "짧고 갑작스럽지만 음이 낮은 소리",
    },
    {
      id: "blow",
      emoji: "🌬️",
      label: "후~ 부는 소리",
      // 바람 소리는 "쉬익" 하는 잡음이라 파형이 0을 아주 자주 지난다. 이것이 말소리와 가르는 핵심이다.
      score: long * 0.3 + verySteady * 0.25 + noisy * 0.3 + below(f.centroid, 3000, 800) * 0.15,
      why: "길게 이어지고 크기가 고른 바람 소리",
    },
    {
      id: "voice",
      emoji: "🗣️",
      label: "사람 목소리 · 말소리",
      score: near(f.centroid, 1100, 1600) * 0.4 + wobbly * 0.35 + above(f.durationMs, 250, 900) * 0.25,
      why: "중간 높이에서 크기가 계속 출렁이는 소리",
    },
    {
      id: "whistle",
      emoji: "🎵",
      label: "휘파람 · 높은 노래",
      score: narrow * 0.45 + above(f.centroid, 1500, 3500) * 0.35 + steady * 0.2,
      why: "한 음에 몰려 있고 높이 이어지는 소리",
    },
    {
      id: "crash",
      emoji: "💥",
      label: "부수거나 떨어지는 소리",
      score: fastAttack * 0.3 + above(f.spread, 2500, 6000) * 0.4 + above(f.peak, 0.35, 0.8) * 0.3,
      why: "갑자기 크게 터지고 주파수가 넓게 퍼진 소리",
    },
  ];

  return guesses.sort((a, b) => b.score - a.score);
}
