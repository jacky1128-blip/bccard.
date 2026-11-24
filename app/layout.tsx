import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
// Pretendard: 필요한 글자만 내려받는 dynamic subset
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { SERVICE_NAME, SERVICE_TAGLINE } from "@/components/ui";
import { NavTracker } from "@/components/BackLink";
import JsonLd from "@/components/JsonLd";

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
  // 아이폰 '홈 화면에 추가' 시 주소창 없이 열리고, 아이콘 아래 이름은 밥콕 (manifest 는 app/manifest.ts)
  appleWebApp: { capable: true, title: SERVICE_NAME, statusBarStyle: "default" },
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
        {/* 서비스 자체 소개 (구글·네이버·AI 검색이 "밥콕이 뭔지" 알게) */}
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: SERVICE_NAME,
            alternateName: 'Babkok',
            ...(/^https?:\/\/[^/]+/.test(SITE) ? { url: SITE } : {}),
            applicationCategory: 'LifestyleApplication',
            operatingSystem: 'Web',
            inLanguage: 'ko',
            description: 'BC카드 eat.pl(잇플) 결제 데이터로 지금 갈 만한 식당을 고르고, 친구들과 링크 하나로 투표해 모임 장소를 정하는 무료 웹 서비스',
            featureList: ['동네·역별 결제 매출 순위', '회식·모임 장소 추천', '친구들과 모임 장소 투표', '중간 지점 역 추천', '경기·공연 끝나고 갈 식당', '여행지 현지인 맛집'],
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
          }}
        />
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
