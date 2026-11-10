'use client';
// 화면 폭 기준: 작은 폰 ~359 / 모바일 360~767 / 태블릿 768~1023 / PC 1024~
import { useSyncExternalStore } from 'react';

const subscribe = (cb: () => void) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};

// 서버 렌더에선 모바일로 가정 (모바일 디자인이 기본)
export const useMinWidth = (px: number) => useSyncExternalStore(subscribe, () => window.matchMedia(`(min-width: ${px}px)`).matches, () => false);
export const useTablet = () => useMinWidth(768);
export const useDesktop = () => useMinWidth(1024);
export const useViewportHeight = () => useSyncExternalStore(subscribe, () => window.innerHeight, () => 844);
