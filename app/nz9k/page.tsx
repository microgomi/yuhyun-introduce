"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// ----------------------------------------------------------------------------
// 숨겨진 전투 게임 — 홈 목록에 없고 주소를 알아야 들어올 수 있어요.
// 들어오면 비밀번호 4자리를 눌러야 시작돼요.
// (브라우저 안에서만 확인하는 잠금이라, 진짜 비밀을 지키는 자물쇠는 아니에요)
// ----------------------------------------------------------------------------

const PASSWORD = "4731";
const UNLOCK_KEY = "nz9k-unlocked";

const BattleGame = dynamic(() => import("./BattleGame"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 flex items-center justify-center bg-black text-lg text-white">⚔️ 아레나를 여는 중...</div>,
});

function Lock({ onOpen }: { onOpen: () => void }) {
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);

  const press = (n: string) => {
    if (code.length >= 4) return;
    const next = code + n;
    setCode(next);
    setWrong(false);
    if (next.length === 4) {
      if (next === PASSWORD) {
        try {
          window.sessionStorage.setItem(UNLOCK_KEY, "1");
        } catch (err) {
          console.warn("잠금 해제를 기억하지 못했어요", err);
        }
        onOpen();
      } else {
        setWrong(true);
        window.setTimeout(() => setCode(""), 500);
      }
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-[#05070f] to-[#160a1c] p-6 text-white">
      <div className="w-80 rounded-3xl border border-white/10 bg-black/60 p-6 text-center">
        <div className="mb-1 text-5xl">🔒</div>
        <h1 className="mb-1 text-xl font-extrabold">비밀 아레나</h1>
        <p className="mb-5 text-xs text-white/50">비밀번호 4자리를 눌러 주세요</p>
        <div className={`mb-5 flex justify-center gap-2 ${wrong ? "animate-bounce" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-12 w-10 rounded-xl border text-2xl leading-[3rem] ${
                wrong ? "border-rose-500 bg-rose-500/20" : code.length > i ? "border-emerald-400 bg-emerald-400/20" : "border-white/20 bg-white/5"
              }`}
            >
              {code.length > i ? "●" : ""}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
            <button key={n} onClick={() => press(n)} className="rounded-xl bg-white/10 py-3 text-xl font-bold hover:bg-white/20">
              {n}
            </button>
          ))}
          <button onClick={() => setCode("")} className="rounded-xl bg-white/5 py-3 text-sm hover:bg-white/15">
            지우기
          </button>
          <button onClick={() => press("0")} className="rounded-xl bg-white/10 py-3 text-xl font-bold hover:bg-white/20">
            0
          </button>
          <button onClick={() => setCode(code.slice(0, -1))} className="rounded-xl bg-white/5 py-3 text-sm hover:bg-white/15">
            ←
          </button>
        </div>
        {wrong && <p className="mt-4 text-sm text-rose-400">❌ 비밀번호가 달라요</p>}
      </div>
    </div>
  );
}

export default function SecretArenaPage() {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(UNLOCK_KEY) === "1";
    } catch {
      return false;
    }
  });
  return open ? <BattleGame /> : <Lock onOpen={() => setOpen(true)} />;
}
