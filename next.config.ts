import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // 코레일 시간표 엑셀 읽기(lib/trains.ts). 안의 압축 해제 라이브러리가 쓰지 않는 AWS 모듈까지 찾아서 묶으면 실패 → 서버에서 그대로 불러옴
  serverExternalPackages: ["read-excel-file", "unzipper"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
