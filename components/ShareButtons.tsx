'use client';
// 카카오톡·인스타·링크 복사
// NEXT_PUBLIC_KAKAO_JS_KEY 가 있으면 카카오 JS SDK 로 카카오톡 공유, 없으면 링크 복사로 대신
// (카카오 디벨로퍼스 > 앱 > 플랫폼 > Web 에 localhost:3000 과 서비스 도메인 등록 필요)
import { useState } from 'react';
import Script from 'next/script';
import { track } from '@/lib/analytics';
import { btn } from './ui';

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
const KAKAO_SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';

type KakaoSdk = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: { sendDefault: (o: Record<string, unknown>) => void };
};
declare global {
  interface Window { Kakao?: KakaoSdk }
}

// 공유 링크는 전부 우리 도메인 경유 (현재 페이지 주소)
export function useCopy() {
  const [msg, setMsg] = useState('');
  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 1800);
  };
  const copy = async (text: string, done = '복사했어요', channel = 'link') => {
    track('share_link', { channel });
    try {
      await navigator.clipboard.writeText(text);
      flash(done);
    } catch {
      flash('복사하지 못했어요');
    }
  };
  const toast = msg ? (
    <p role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-4 py-2 text-[13px] text-white">
      {msg}
    </p>
  ) : null;
  return { copy, toast, flash };
}

const pageUrl = () => (typeof window === 'undefined' ? '' : window.location.href);

function kakaoShare(url: string, title: string, text: string) {
  const k = window.Kakao;
  if (!KAKAO_KEY || !k) return false;
  if (!k.isInitialized()) k.init(KAKAO_KEY);
  k.Share.sendDefault({
    objectType: 'text',
    text: `${title}\n${text}`.slice(0, 200),
    link: { mobileWebUrl: url, webUrl: url },
    buttonTitle: '열어 보기',
  });
  return true;
}

export default function ShareButtons({
  url = pageUrl,
  title = '같이 정해요',
  text = '결제 데이터로 고른 후보예요',
}: {
  url?: () => string;
  title?: string;
  text?: string;
}) {
  const { copy, toast } = useCopy();
  const cls = btn.mdOutline;
  return (
    <>
      {KAKAO_KEY && <Script src={KAKAO_SDK} strategy="lazyOnload" crossOrigin="anonymous" />}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className={cls}
          onClick={() => {
            const link = url();
            if (kakaoShare(link, title, text)) track('share_link', { channel: 'kakao' });
            else copy(link, '링크 복사됨 · 카카오톡에 붙여 넣어요', 'kakao');
          }}
        >
          카카오톡
        </button>
        <button type="button" className={cls} onClick={() => copy(url(), '링크 복사됨 · 인스타에 붙여 넣어요', 'instagram')}>인스타</button>
        <button type="button" className={cls} onClick={() => copy(url(), '링크를 복사했어요')}>링크 복사</button>
      </div>
      {toast}
    </>
  );
}

// 버튼 하나짜리 링크 복사 ("결과 링크 복사", "링크 복사")
export function CopyLinkButton({ label, className }: { label: string; className: string }) {
  const { copy, toast } = useCopy();
  return (
    <>
      <button type="button" className={className} onClick={() => copy(pageUrl(), '링크를 복사했어요')}>{label}</button>
      {toast}
    </>
  );
}
