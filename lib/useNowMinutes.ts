'use client';
// 지금 시각(분). 서버 프리렌더에서는 null → 브라우저에서만 값이 생김
import { useSyncExternalStore } from 'react';
import { nowMinutes } from './time';

const subscribe = (cb: () => void) => {
  const t = setInterval(cb, 30_000);
  return () => clearInterval(t);
};

export function useNowMinutes(): number | null {
  return useSyncExternalStore(subscribe, () => nowMinutes(), () => null);
}
