// ----------------------------------------------------------------------------
// 전투 효과음: 파일 없이 WebAudio 로 짧은 소리를 만든다
// ----------------------------------------------------------------------------

export type Sfx = "swing" | "hit" | "hurt" | "pickup" | "level" | "wave" | "boss" | "death" | "block";

interface Note {
  freq: number;
  at: number; // 시작 (초)
  dur: number;
  type: OscillatorType;
  vol: number;
  slideTo?: number; // 이 주파수까지 미끄러지듯 변한다
}

const SOUNDS: Record<Sfx, Note[]> = {
  swing: [{ freq: 520, at: 0, dur: 0.12, type: "sawtooth", vol: 0.05, slideTo: 180 }],
  hit: [
    { freq: 180, at: 0, dur: 0.1, type: "square", vol: 0.09 },
    { freq: 90, at: 0.04, dur: 0.14, type: "triangle", vol: 0.07 },
  ],
  block: [{ freq: 900, at: 0, dur: 0.12, type: "square", vol: 0.06, slideTo: 1400 }],
  hurt: [{ freq: 260, at: 0, dur: 0.22, type: "sawtooth", vol: 0.1, slideTo: 90 }],
  pickup: [
    { freq: 660, at: 0, dur: 0.08, type: "sine", vol: 0.12 },
    { freq: 990, at: 0.07, dur: 0.12, type: "sine", vol: 0.12 },
  ],
  level: [
    { freq: 523, at: 0, dur: 0.1, type: "triangle", vol: 0.12 },
    { freq: 659, at: 0.1, dur: 0.1, type: "triangle", vol: 0.12 },
    { freq: 784, at: 0.2, dur: 0.1, type: "triangle", vol: 0.12 },
    { freq: 1047, at: 0.3, dur: 0.3, type: "triangle", vol: 0.14 },
  ],
  wave: [
    { freq: 330, at: 0, dur: 0.18, type: "square", vol: 0.08 },
    { freq: 440, at: 0.16, dur: 0.24, type: "square", vol: 0.08 },
  ],
  boss: [
    { freq: 90, at: 0, dur: 0.6, type: "sawtooth", vol: 0.14, slideTo: 55 },
    { freq: 140, at: 0.2, dur: 0.5, type: "square", vol: 0.07 },
  ],
  death: [
    { freq: 400, at: 0, dur: 0.5, type: "sawtooth", vol: 0.12, slideTo: 60 },
    { freq: 200, at: 0.3, dur: 0.6, type: "triangle", vol: 0.1, slideTo: 40 },
  ],
};

let ctx: AudioContext | null = null;
let muted = false;

export const setMuted = (v: boolean) => {
  muted = v;
};

export function playSfx(sfx: Sfx) {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    const now = ctx.currentTime;
    for (const n of SOUNDS[sfx]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.freq, now + n.at);
      if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, now + n.at + n.dur);
      gain.gain.setValueAtTime(n.vol, now + n.at);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.at + n.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + n.at);
      osc.stop(now + n.at + n.dur + 0.02);
    }
  } catch (err) {
    // 소리를 못 내는 브라우저여도 게임은 계속되도록 알리기만 한다
    console.warn("효과음을 재생하지 못했어요", err);
  }
}
