'use client';
// 출발역들 → 서버(/api/stations/meet)에서 역 좌표 + 공평한 역 후보. 입력이 멈추면(0.4초) 한 번 호출
import { useEffect, useState } from 'react';
import type { MeetingOption, Station } from './midpoint';

export type MeetState = { resolved: (Station | null)[]; options: MeetingOption[]; loading: boolean };

const cache = new Map<string, { resolved: (Station | null)[]; options: MeetingOption[] }>();

export function useMeet(origins: string[], limit = 3): MeetState {
  const key = JSON.stringify([origins.map((o) => o.trim()), limit]);
  const [state, setState] = useState<MeetState>(() => ({ ...(cache.get(key) ?? { resolved: [], options: [] }), loading: false }));
  useEffect(() => {
    const hit = cache.get(key);
    if (hit) {
      queueMicrotask(() => setState({ ...hit, loading: false }));
      return;
    }
    const [names] = JSON.parse(key) as [string[], number];
    if (names.filter(Boolean).length === 0) {
      queueMicrotask(() => setState({ resolved: [], options: [], loading: false }));
      return;
    }
    let alive = true;
    queueMicrotask(() => alive && setState((s) => ({ ...s, loading: true })));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/stations/meet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ origins: names, limit }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        cache.set(key, data);
        if (alive) setState({ ...data, loading: false });
      } catch {
        if (alive) setState((s) => ({ ...s, loading: false }));
      }
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [key, limit]);
  return state;
}
