"use client";

import dynamic from "next/dynamic";

// three.js 와 localStorage 를 쓰므로 브라우저에서만 그린다
const ShapeMaker = dynamic(() => import("./ShapeMaker"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0b1026] text-lg text-white">💠 도형 공방을 여는 중...</div>
  ),
});

export default function ShapeMakerPage() {
  return <ShapeMaker />;
}
