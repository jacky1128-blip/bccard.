'use client';
// 뒤로 가기: 앱 안에서 이동해 왔으면 진짜 이전 화면으로(장소·필터 유지), 링크로 바로 들어왔으면 href 로
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const KEY = 'babkok-nav-depth';
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

// layout 에 한 번: 앱 안에서 새 화면으로 갈 때(history.pushState)마다 +1, 브라우저 뒤로 가기는 -1
// usePathname 을 쓰지 않음: 화면 이동 중에 잠깐 멈추는(suspend) 훅이라 React 'conditional use()' 경고의 원인이 됐음 (2026-11-10)
export function NavTracker() {
  useEffect(() => {
    const w = window as Window & { __babkokNav?: boolean };
    if (w.__babkokNav) return;
    w.__babkokNav = true;
    const push = history.pushState.bind(history);
    history.pushState = (...args: Parameters<History['pushState']>) => {
      write(read() + 1);
      return push(...args);
    };
    const onPop = () => write(read() - 1);
    window.addEventListener('popstate', onPop);
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
          router.back(); // 숫자는 popstate 에서 줄어듦
        }
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
    </Link>
  );
}
