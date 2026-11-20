import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
// Pretendard: 필요한 글자만 내려받는 dynamic subset
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { SERVICE_NAME, SERVICE_TAGLINE } from "@/components/ui";
import { NavTracker } from "@/components/BackLink";

// 넥슨 Lv1 고딕 Bold (넥슨 무료 글꼴, 상업적 사용 가능). globals.css 의 --font-display 가 이 변수를 씀
const nexon = localFont({ src: "./fonts/NEXONLv1GothicBold.woff", weight: "700", display: "swap", variable: "--font-nexon" });

// 검색용 대표 주소(canonical)·공유 미리보기의 기준 주소. 없으면 상대 주소 그대로
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

export const metadata: Metadata = {
  ...(/^https?:\/\/[^/]+/.test(SITE) ? { metadataBase: new URL(SITE) } : {}),
  // 구글 서치 콘솔·네이버 서치어드바이저 소유 확인 (HTML 태그 방식의 content 값만 Vercel 환경변수에)
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : {}),
    ...(process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION ? { other: { "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION } } : {}),
  },
  title: { default: `${SERVICE_NAME} · ${SERVICE_TAGLINE}`, template: `%s · ${SERVICE_NAME}` },
  description: "BC카드 eat.pl 잇플 결제 데이터로 지금 갈 만한 곳을 찾고, 친구들과 같이 정해요.",
};

// GA4 측정 ID (G-XXXX). 형식이 맞을 때만 태그를 넣음
const GA_ID = /^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA_ID ?? "") ? process.env.NEXT_PUBLIC_GA_ID : undefined;

// viewportFit cover: 아이폰 노치·홈바 영역까지 쓰고, 그만큼은 safe-area 여백으로 비움
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={nexon.variable}>
      <body className="min-h-dvh bg-white font-sans md:bg-fill">
        {/* 폭 제한은 화면마다 (폼·결과 480px, 첫 화면·순위·추천은 넓게) */}
        <div className="relative flex min-h-dvh w-full flex-col">
          <NavTracker />
          {children}
        </div>
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
