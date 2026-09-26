"use client";

import dynamic from "next/dynamic";

// localStorage 와 공유 링크를 쓰므로 브라우저에서만 그린다
const IllusionMaker = dynamic(() => import("./IllusionMaker"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0b1026] text-lg text-white">
      🌀 착시 공방을 여는 중...
    </div>
  ),
});

export default function IllusionPage() {
  return <IllusionMaker />;
}
