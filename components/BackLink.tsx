'use client';
// 뒤로 가기: 앱 안에서 이동해 왔으면 진짜 이전 화면으로(장소·필터 유지), 링크로 바로 들어왔으면 href 로
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const KEY = 'babkok-nav-depth';
const LAST = 'babkok-nav-last';
const read = () => {
  try {
    return Number(sessionStorage.getItem(KEY) || 0);
  } catch {
    return 0;
  }
};
const write = (n: number) => {
  try {
    sessionStorage.setItem(KEY, String(Math.max(0, n)));
  } catch {
    /* 저장 안 되면 href 로 이동 */
  }
};

// layout 에 한 번: 앱 안에서 화면이 바뀔 때마다 +1, 브라우저 뒤로 가기는 -1
export function NavTracker() {
  const path = usePathname();
  useEffect(() => {
    // 이전에 본 경로와 다를 때만 +1 (새 탭·링크로 바로 들어온 첫 화면은 0, 개발 모드 effect 두 번 실행에도 안전)
    let last: string | null = null;
    try {
      last = sessionStorage.getItem(LAST);
      sessionStorage.setItem(LAST, path);
    } catch {
      return;
    }
    if (last && last !== path) write(read() + 1);
  }, [path]);
  useEffect(() => {
    const onPop = () => write(read() - 1);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return null;
}

export default function BackLink({ href }: { href: string }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      aria-label="뒤로"
      className="flex size-11 items-center justify-center text-ink"
      onClick={(e) => {
        if (read() > 0) {
          e.preventDefault();
          write(read() - 1);
          router.back();
        }
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
    </Link>
  );
}
