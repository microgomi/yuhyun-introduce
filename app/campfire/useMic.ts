"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// ----------------------------------------------------------------------------
// 마이크로 소리 크기를 잰다.
//
// 브라우저는 사용자가 허락해야만 마이크를 열어 준다(그리고 https 에서만 된다).
// 여기서는 소리의 크기(RMS)만 재고, 녹음하거나 어디로 보내지 않는다.
// ----------------------------------------------------------------------------

export type MicStatus = "off" | "asking" | "on" | "denied" | "unsupported";

/** 이 값을 넘으면 "불고 있다"고 본다. 숨소리와 생활 소음을 가르는 선. */
export const BLOW_THRESHOLD = 0.12;

/**
 * 치거나 부수는 소리(박수·쿵·탁)를 가르는 기준.
 *
 * 부는 소리와 치는 소리는 크기만으로는 구분되지 않는다. 다른 것은 "모양"이다.
 * 부는 소리는 고르게 이어지고, 치는 소리는 한 순간에 확 솟았다가 곧바로 잦아든다.
 * 그래서 절대 크기(IMPACT_LEVEL)와 함께, 직전 평균보다 얼마나 갑자기 뛰었는지
 * (IMPACT_JUMP)를 같이 본다.
 */
export const IMPACT_LEVEL = 0.3;
export const IMPACT_JUMP = 0.16;
/** 한 번 친 뒤 이 시간 동안은 같은 소리의 울림을 다시 세지 않는다. */
export const IMPACT_COOLDOWN_MS = 600;

export function useMic() {
  const [status, setStatus] = useState<MicStatus>("off");
  /** 0~1 로 정규화한 소리 크기 */
  const [level, setLevel] = useState(0);

  const levelRef = useRef(0);
  /** 치는 소리를 감지한 횟수. 게임 쪽에서 늘어난 만큼 반응한다. */
  const impactsRef = useRef(0);
  /** 갑작스러움을 재기 위한 느린 평균 */
  const baselineRef = useRef(0);
  const lastImpactRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    levelRef.current = 0;
    setLevel(0);
    setStatus("off");
  }, []);

  // 페이지를 떠날 때 마이크를 반드시 끈다. 켜진 채로 남으면 탭에 녹음 표시가 남는다.
  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || navigator.mediaDevices?.getUserMedia === undefined) {
      setStatus("unsupported");
      return;
    }
    setStatus("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // 자동 이득 조절을 끄지 않으면 부는 소리가 눌려서 잘 안 잡힌다.
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      const buffer = new Float32Array(analyser.fftSize);
      const tick = () => {
        analyser.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (const sample of buffer) sum += sample * sample;
        const rms = Math.sqrt(sum / buffer.length);

        // 치는 소리 판정은 부드럽게 만들기 전의 값으로 해야 한다.
        // 부드럽게 만든 뒤에는 "갑자기"가 사라지기 때문이다.
        const at = performance.now();
        const sudden = rms - baselineRef.current;
        if (
          rms > IMPACT_LEVEL &&
          sudden > IMPACT_JUMP &&
          at - lastImpactRef.current > IMPACT_COOLDOWN_MS
        ) {
          impactsRef.current += 1;
          lastImpactRef.current = at;
        }
        // 느린 평균: 치는 소리 한 번에 평균이 끌려 올라가지 않도록 천천히 따라간다.
        baselineRef.current = baselineRef.current * 0.92 + rms * 0.08;

        // 표시용 값은 부드럽게: 커질 땐 빠르게, 작아질 땐 천천히 따라간다.
        const next = rms > levelRef.current ? rms : levelRef.current * 0.85 + rms * 0.15;
        levelRef.current = Math.min(1, next);
        setLevel(levelRef.current);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      setStatus("on");
    } catch (err) {
      // 사용자가 거절했거나 마이크가 없는 경우. 게임은 손가락으로 계속할 수 있다.
      console.warn("마이크를 열지 못했어요", err);
      setStatus("denied");
    }
  }, []);

  // ref 를 그대로 내보내면 쓰는 쪽에서 의존성 규칙이 서로 어긋난다
  // (exhaustive-deps 는 넣으라 하고, React Compiler 는 .current 접근과 맞지 않는다고 한다).
  // 언제나 같은 함수를 내보내면 양쪽 모두 깔끔해진다.
  const readLevel = useCallback(() => levelRef.current, []);
  const readImpacts = useCallback(() => impactsRef.current, []);

  return { status, level, readLevel, readImpacts, start, stop };
}
