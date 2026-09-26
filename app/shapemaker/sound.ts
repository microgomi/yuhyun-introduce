// ----------------------------------------------------------------------------
// 효과음: 파일 없이 WebAudio 로 짧은 소리를 만든다
// ----------------------------------------------------------------------------

export type Sfx = "click" | "good" | "bad" | "save" | "fanfare" | "levelup";

// [주파수(Hz), 시작 시각(초), 길이(초)] 목록
const SOUNDS: Record<Sfx, { notes: [number, number, number][]; type: OscillatorType; vol: number }> = {
  click: { notes: [[660, 0, 0.05]], type: "triangle", vol: 0.08 },
  good: { notes: [[660, 0, 0.1], [880, 0.08, 0.14]], type: "triangle", vol: 0.15 },
  bad: { notes: [[260, 0, 0.12], [200, 0.1, 0.18]], type: "square", vol: 0.07 },
  save: { notes: [[523, 0, 0.08], [784, 0.07, 0.12]], type: "sine", vol: 0.18 },
  fanfare: { notes: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.12], [1047, 0.3, 0.3]], type: "triangle", vol: 0.16 },
  levelup: { notes: [[392, 0, 0.1], [523, 0.1, 0.1], [659, 0.2, 0.1], [784, 0.3, 0.1], [1047, 0.4, 0.4]], type: "square", vol: 0.08 },
};

let ctx: AudioContext | null = null;

export function playSfx(sfx: Sfx) {
  try {
    ctx ??= new AudioContext();
    const now = ctx.currentTime;
    const { notes, type, vol } = SOUNDS[sfx];
    for (const [freq, at, dur] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, now + at);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + dur + 0.02);
    }
  } catch (err) {
    // 소리를 못 내는 브라우저여도 게임은 계속되도록 알리기만 한다
    console.warn("효과음을 재생하지 못했어요", err);
  }
}

// 도형 설명 읽어주기 (브라우저 음성 합성)
export function speak(text: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
  return true;
}
