'use client';
// 공유: 결과·공지는 "링크 복사", 모임 초대는 카카오톡 친구 고르기 창(InviteButton)
// 카카오톡 공유는 NEXT_PUBLIC_KAKAO_JS_KEY + 카카오 디벨로퍼스 > 플랫폼 > Web 사이트 도메인 등록 필요
// 안 되면 휴대폰 공유 시트(navigator.share), 그것도 안 되면 링크 복사
import { useState } from 'react';
import Script from 'next/script';
import { track } from '@/lib/analytics';
import { btn } from './ui';

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY?.trim();
const KAKAO_SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';

type KakaoSdk = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: { sendDefault: (o: Record<string, unknown>) => void };
};
declare global {
  interface Window { Kakao?: KakaoSdk }
}

function kakaoShare(url: string, text: string, button: string) {
  const k = window.Kakao;
  if (!KAKAO_KEY || !k) return false;
  try {
    if (!k.isInitialized()) k.init(KAKAO_KEY);
    k.Share.sendDefault({
      objectType: 'text',
      text: text.slice(0, 200),
      link: { mobileWebUrl: url, webUrl: url },
      buttonTitle: button,
    });
    return true;
  } catch {
    return false;
  }
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

export default function ShareButtons({
  url = pageUrl,
  label = '링크 복사',
}: {
  url?: () => string;
  label?: string;
  title?: string; // (예전 카카오 공유용, 지금은 안 씀)
  text?: string;
}) {
  const { copy, toast } = useCopy();
  return (
    <>
      <button type="button" className={btn.mdOutline} onClick={() => copy(url(), '링크를 복사했어요 · 단톡방에 붙여 넣어요')}>
        {label}
      </button>
      {toast}
    </>
  );
}

// 모임 초대: 누르면 카카오톡 친구·단톡방 고르는 창이 바로 뜸
export function InviteButton({ url, text, label = '카카오톡으로 친구 부르기', className = btn.primary }: { url: () => string; text: string; label?: string; className?: string }) {
  const { copy, toast } = useCopy();
  const invite = async () => {
    const link = url();
    if (kakaoShare(link, text, '모임 들어가기')) return track('share_link', { channel: 'kakao' });
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text, url: link });
        return track('share_link', { channel: 'native' });
      } catch (e) {
        if ((e as Error).name === 'AbortError') return; // 사용자가 닫음
      }
    }
    copy(link, '초대 링크를 복사했어요 · 단톡방에 붙여 넣어요', 'invite');
  };
  return (
    <>
      {KAKAO_KEY && <Script src={KAKAO_SDK} strategy="afterInteractive" crossOrigin="anonymous" />}
      <button type="button" className={className} onClick={invite}>
        {label}
      </button>
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
