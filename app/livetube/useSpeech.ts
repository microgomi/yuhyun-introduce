"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// ----------------------------------------------------------------------------
// 브라우저 음성 인식으로 내가 한 말을 글자로 바꾼다.
//
// 크롬·엣지·사파리에서 된다(파이어폭스는 안 됨). 크롬은 목소리를 구글 서버로 보내 글자로 바꾸므로
// 인터넷이 연결돼 있어야 한다. 조용하면 브라우저가 알아서 멈추기 때문에, 켜져 있는 동안 계속 다시 켠다.
// ----------------------------------------------------------------------------

export type SpeechStatus = "off" | "on" | "unsupported" | "denied";

// 타입 정의에 없는 브라우저도 있어서 필요한 부분만 적어 둔다.
interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechHandlers {
  /** 말하는 도중의 글자(아직 확정 안 됨) */
  onInterim: (text: string) => void;
  /** 한 문장이 끝나 확정된 글자 */
  onFinal: (text: string) => void;
}

export function useSpeech() {
  const [status, setStatus] = useState<SpeechStatus>("off");
  const recRef = useRef<Recognition | null>(null);
  const activeRef = useRef(false);
  const handlersRef = useRef<SpeechHandlers | null>(null);

  const stop = useCallback(() => {
    activeRef.current = false;
    recRef.current?.abort();
    recRef.current = null;
    setStatus((s) => (s === "on" ? "off" : s));
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback((handlers: SpeechHandlers) => {
    const Ctor = getCtor();
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }
    handlersRef.current = handlers;
    activeRef.current = true;

    const launch = () => {
      if (!activeRef.current) return;
      const rec = new Ctor();
      rec.lang = "ko-KR";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const text = r[0].transcript;
          if (r.isFinal) {
            if (text.trim()) handlersRef.current?.onFinal(text.trim());
          } else {
            interim += text;
          }
        }
        handlersRef.current?.onInterim(interim.trim());
      };
      rec.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          activeRef.current = false;
          setStatus("denied");
        }
        // no-speech, network 등은 onend 에서 다시 켠다
      };
      rec.onend = () => {
        if (activeRef.current) setTimeout(launch, 250);
      };
      recRef.current = rec;
      try {
        rec.start();
        setStatus("on");
      } catch {
        // 이미 켜져 있으면 예외가 난다. 무시한다.
      }
    };
    launch();
  }, []);

  return { status, start, stop };
}
