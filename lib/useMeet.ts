'use client';
// 출발역들 → 공평한 역 후보
// 1) 서버(/api/stations/meet): 역 찾기 + 직선거리로 후보 5곳까지 좁힘 (입력이 멈추면 0.4초 뒤 한 번)
// 2) ODsay 키가 있으면 그 3곳만 실제 대중교통 시간으로 다시 계산해 순서를 바꿈 (lib/odsay.ts)
import { useEffect, useState } from 'react';
import { byFairness, type MeetingOption, type Station } from './midpoint';
import { odsayConfigured, transitTime } from './odsay';

export type MeetState = { resolved: (Station | null)[]; options: MeetingOption[]; loading: boolean; real: boolean };
type Result = Omit<MeetState, 'loading'>;

const SHORTLIST = 3; // 실제 시간을 물어볼 후보 수 (사람 수 × 3번 호출 · ODsay 하루 한도 아끼기)
const cache = new Map<string, Result>();
const EMPTY: Result = { resolved: [], options: [], real: false };

// 후보마다 각자 실제 시간 → 가장 오래 걸리는 사람 기준으로 다시 줄 세움. 하나라도 못 구하면 그 후보는 어림값 그대로
async function realOption(op: MeetingOption, retry: boolean): Promise<MeetingOption> {
  const trips = await Promise.all(op.legs.map((l) => (l.min === 0 ? Promise.resolve({ min: 0, transfers: 0 }) : transitTime(l.from, op.station, retry))));
  if (trips.some((t) => !t)) return op;
  const legs = op.legs.map((l, i) => ({ ...l, min: trips[i]!.min, transfers: trips[i]!.transfers }));
  const mins = legs.map((l) => l.min);
  return { ...op, legs, maxMin: Math.max(...mins), gapMin: Math.max(...mins) - Math.min(...mins), real: true };
}

async function withRealTimes(options: MeetingOption[]): Promise<MeetingOption[]> {
  let out = await Promise.all(options.map((op) => realOption(op, false)));
  // 한꺼번에 부르다 실패한 후보는 잠깐 쉬고 한 번 더 (한도 소진이면 transitTime 이 바로 null)
  if (out.some((o) => !o.real) && out.some((o) => o.real)) {
    await new Promise((r) => setTimeout(r, 400));
    out = await Promise.all(out.map((o) => (o.real ? o : realOption(o, true))));
  }
  // 실제 시간을 하나라도 구했으면 그 후보끼리만 비교 (어림값과 섞으면 순서가 틀어짐)
  const real = out.filter((o) => o.real);
  return (real.length ? real : out).sort(byFairness);
}

export function useMeet(origins: string[], limit = 3): MeetState {
  const key = JSON.stringify([origins.map((o) => o.trim()), limit]);
  const [state, setState] = useState<MeetState>(() => ({ ...(cache.get(key) ?? EMPTY), loading: false }));
  useEffect(() => {
    const hit = cache.get(key);
    if (hit) {
      queueMicrotask(() => setState({ ...hit, loading: false }));
      return;
    }
    const [names] = JSON.parse(key) as [string[], number];
    if (names.filter(Boolean).length === 0) {
      queueMicrotask(() => setState({ ...EMPTY, loading: false }));
      return;
    }
    let alive = true;
    queueMicrotask(() => alive && setState((s) => ({ ...s, loading: true })));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/stations/meet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origins: names, limit: odsayConfigured() ? SHORTLIST : limit }),
        });
        const data = (await res.json()) as { resolved: (Station | null)[]; options: MeetingOption[]; error?: string };
        if (!res.ok) throw new Error(data.error);
        // 먼저 어림값으로 바로 보여 주고, 실제 시간이 오면 바꿈
        if (alive) setState({ resolved: data.resolved, options: data.options.slice(0, limit), real: false, loading: odsayConfigured() && data.options.length > 0 });
        let options = data.options;
        if (odsayConfigured() && options.length) options = await withRealTimes(options);
        const result: Result = { resolved: data.resolved, options: options.slice(0, limit), real: !!options[0]?.real };
        cache.set(key, result);
        if (alive) setState({ ...result, loading: false });
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
