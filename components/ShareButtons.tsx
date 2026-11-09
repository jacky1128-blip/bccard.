'use client';
// 카카오톡·인스타·링크 복사
import { useState } from 'react';
import { track } from '@/lib/analytics';
import { btn } from './ui';

// 공유 링크는 전부 우리 도메인 경유 (현재 페이지 주소)
export function useCopy() {
  const [msg, setMsg] = useState('');
  const copy = async (text: string, done = '복사했어요', channel = 'link') => {
    track('share_link', { channel });
    try {
      await navigator.clipboard.writeText(text);
      setMsg(done);
    } catch {
      setMsg('복사하지 못했어요');
    }
    setTimeout(() => setMsg(''), 1800);
  };
  const toast = msg ? (
    <p role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-4 py-2 text-[13px] text-white">
      {msg}
    </p>
  ) : null;
  return { copy, toast, setMsg };
}

const pageUrl = () => (typeof window === 'undefined' ? '' : window.location.href);

export default function ShareButtons() {
  const { copy, toast, setMsg } = useCopy();
  const cls = btn.mdOutline;
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className={cls}
          onClick={() => {
            track('share_link', { channel: 'kakao' });
            // TODO: 카카오 JS SDK Kakao.Share.sendDefault 연결
            setMsg('카카오 키 연결 후 카카오톡 공유가 열려요');
            setTimeout(() => setMsg(''), 1800);
          }}
        >
          카카오톡
        </button>
        <button type="button" className={cls} onClick={() => copy(pageUrl(), '링크 복사됨 · 인스타에 붙여 넣어요', 'instagram')}>인스타</button>
        <button type="button" className={cls} onClick={() => copy(pageUrl(), '링크를 복사했어요')}>링크 복사</button>
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
