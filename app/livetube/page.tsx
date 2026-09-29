"use client";

import dynamic from "next/dynamic";

// 카메라·마이크·녹화·localStorage 를 쓰므로 브라우저에서만 그린다
const LiveTube = dynamic(() => import("./LiveTube"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-zinc-950 text-lg text-white">
      📺 방송국 준비 중...
    </div>
  ),
});

export default function LiveTubePage() {
  return <LiveTube />;
}
