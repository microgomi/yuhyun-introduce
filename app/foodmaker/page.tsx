"use client";

import dynamic from "next/dynamic";

// localStorage 와 포인터 끌기를 쓰므로 브라우저에서만 그린다
const FoodMaker = dynamic(() => import("./FoodMaker"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-stone-950 text-lg text-white">
      🍳 주방을 여는 중...
    </div>
  ),
});

export default function FoodMakerPage() {
  return <FoodMaker />;
}
