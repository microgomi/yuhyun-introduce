"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// ----------------------------------------------------------------------------
// 마이크를 켜 두고 "소리 한 덩어리"를 자동으로 잘라 낸다.
//
// 조용히 기다리다가 소리가 나면 녹음을 시작하고, 다시 조용해지면 멈춘다.
// 시작 직전의 아주 짧은 부분도 함께 담아야 박수처럼 순간적인 소리의 앞머리가 잘리지 않는다.
// 녹음한 소리는 이 기기 안에서만 분석하고 어디로도 보내지 않는다.
// ----------------------------------------------------------------------------

export type RecStatus = "off" | "asking" | "idle" | "armed" | "recording" | "denied" | "unsupported";

/** 이 크기를 넘으면 소리가 시작된 것으로 본다. */
const START_LEVEL = 0.06;
/** 이 크기 아래로 이만큼 머무르면 소리가 끝난 것으로 본다. */
const STOP_LEVEL = 0.025;
const STOP_AFTER_MS = 450;
const MAX_RECORD_MS = 3000;
/** 소리가 시작되기 직전을 얼마나 담아 둘지 */
const PRE_ROLL_MS = 150;
const CHUNK = 1024;

export interface Clip {
  samples: Float32Array;
  sampleRate: number;
}

export function useRecorder() {
  const [status, setStatus] = useState<RecStatus>("off");
  const [level, setLevel] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const modeRef = useRef<"idle" | "armed" | "recording">("idle");
  const preRef = useRef<Float32Array[]>([]);
  const chunksRef = useRef<Float32Array[]>([]);
  const quietMsRef = useRef(0);
  const recordedMsRef = useRef(0);
  const onClipRef = useRef<((clip: Clip) => void) | null>(null);
  const levelRef = useRef(0);

  const stop = useCallback(() => {
    nodeRef.current?.disconnect();
    nodeRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    modeRef.current = "idle";
    setLevel(0);
    setStatus("off");
  }, []);

  // 페이지를 떠날 때 마이크를 반드시 끈다.
  useEffect(() => stop, [stop]);

  const finish = useCallback(() => {
    const ctx = ctxRef.current;
    const chunks = chunksRef.current;
    chunksRef.current = [];
    modeRef.current = "idle";
    setStatus("idle");
    if (!ctx || chunks.length === 0) return;
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const samples = new Float32Array(total);
    let offset = 0;
    for (const c of chunks) {
      samples.set(c, offset);
      offset += c.length;
    }
    onClipRef.current?.({ samples, sampleRate: ctx.sampleRate });
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || navigator.mediaDevices?.getUserMedia === undefined) {
      setStatus("unsupported");
      return;
    }
    setStatus("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // 브라우저가 소리를 다듬으면 박수·바람 소리의 모양이 바뀌어 분류가 틀어진다.
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      // ScriptProcessor 는 오래된 방식이지만 끊김 없는 원본 샘플을 가장 간단히 받을 수 있다.
      const node = ctx.createScriptProcessor(CHUNK, 1, 1);
      nodeRef.current = node;
      const chunkMs = (CHUNK / ctx.sampleRate) * 1000;
      const preChunks = Math.ceil(PRE_ROLL_MS / chunkMs);

      node.onaudioprocess = (event) => {
        const data = new Float32Array(event.inputBuffer.getChannelData(0));
        let sum = 0;
        for (const s of data) sum += s * s;
        const rms = Math.sqrt(sum / data.length);
        levelRef.current = rms > levelRef.current ? rms : levelRef.current * 0.8 + rms * 0.2;

        if (modeRef.current === "armed") {
          preRef.current.push(data);
          if (preRef.current.length > preChunks) preRef.current.shift();
          if (rms > START_LEVEL) {
            modeRef.current = "recording";
            chunksRef.current = [...preRef.current];
            preRef.current = [];
            quietMsRef.current = 0;
            recordedMsRef.current = 0;
            setStatus("recording");
          }
        } else if (modeRef.current === "recording") {
          chunksRef.current.push(data);
          recordedMsRef.current += chunkMs;
          quietMsRef.current = rms < STOP_LEVEL ? quietMsRef.current + chunkMs : 0;
          if (quietMsRef.current >= STOP_AFTER_MS || recordedMsRef.current >= MAX_RECORD_MS) finish();
        }
      };
      source.connect(node);
      // 일부 브라우저는 출력에 연결해야 onaudioprocess 를 불러 준다. 출력 버퍼는 비워 두므로 소리는 나지 않는다.
      node.connect(ctx.destination);
      setStatus("idle");
    } catch (err) {
      console.warn("마이크를 열지 못했어요", err);
      setStatus("denied");
    }
  }, [finish]);

  /** 다음 소리 한 덩어리를 기다린다. 잡히면 onClip 이 한 번 불린다. */
  const listen = useCallback((onClip: (clip: Clip) => void) => {
    if (!ctxRef.current) return;
    onClipRef.current = onClip;
    preRef.current = [];
    chunksRef.current = [];
    modeRef.current = "armed";
    setStatus("armed");
  }, []);

  const cancel = useCallback(() => {
    if (!ctxRef.current) return;
    modeRef.current = "idle";
    chunksRef.current = [];
    setStatus("idle");
  }, []);

  // 소리 크기 막대를 위한 값. 오디오 콜백마다 setState 하면 너무 잦아서 화면 주기에 맞춘다.
  useEffect(() => {
    if (status === "off" || status === "denied" || status === "unsupported" || status === "asking") return;
    let raf = 0;
    const tick = () => {
      setLevel(Math.min(1, levelRef.current * 3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status]);

  return { status, level, start, stop, listen, cancel };
}
