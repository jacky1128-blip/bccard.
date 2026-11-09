import type { Metadata, Viewport } from "next";
import { Jua } from "next/font/google";
// Pretendard: 필요한 글자만 내려받는 dynamic subset
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { SERVICE_NAME } from "@/components/ui";

// 배민 주아체. globals.css 의 --font-display 가 이 변수를 씀
const jua = Jua({ weight: "400", subsets: ["latin"], display: "swap", preload: false, variable: "--font-jua" });

export const metadata: Metadata = {
  title: { default: `${SERVICE_NAME} · 결제 데이터로 같이 정하는 한 끼`, template: `%s · ${SERVICE_NAME}` },
  description: "BC카드 eat.pl 잇플 결제 데이터로 지금 갈 만한 곳을 찾고, 친구들과 같이 정해요.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={jua.variable}>
      <body className="min-h-dvh font-sans">
        <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-white shadow-[0_0_0_1px_var(--line)]">
          {children}
        </div>
      </body>
    </html>
  );
}
