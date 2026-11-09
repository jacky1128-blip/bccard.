'use client';
// 공유는 "링크 복사" 하나로 (카톡·인스타 어디든 붙여 넣으면 됨). 2026-11-10 카카오톡·인스타 버튼 정리
import { useState } from 'react';
import { track } from '@/lib/analytics';
import { btn } from './ui';

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
