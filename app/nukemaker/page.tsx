"use client";

import dynamic from "next/dynamic";

// localStorage 저장을 쓰므로 브라우저에서만 그린다
const NukeMaker = dynamic(() => import("./NukeMaker"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-zinc-950 text-lg text-white">
      ☢️ 기지를 여는 중...
    </div>
  ),
});

export default function NukeMakerPage() {
  return <NukeMaker />;
}
