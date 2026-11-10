'use client';
// ODsay 대중교통 실제 소요 시간 (브라우저에서 호출)
// NEXT_PUBLIC_ODSAY_KEY 는 ODsay LAB 'Web(URI)' 키라 등록한 주소(babkok.vercel.app, localhost)에서만 동작 → 공개돼도 됨
// 키가 없거나 인증·호출이 실패하면 null → 직선거리 어림값을 그대로 씀
const KEY = process.env.NEXT_PUBLIC_ODSAY_KEY?.trim();
export const odsayConfigured = () => !!KEY;

type Pt = { lat: number; lng: number };
export type Trip = { min: number; transfers: number };

// 같은 출발·도착은 다시 묻지 않음 (탭 안에서 + 세션 저장)
const memo = new Map<string, Promise<Trip | null>>();
const SKEY = 'babkok-odsay';
const saved: Record<string, Trip | null> = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(SKEY) || '{}');
  } catch {
    return {};
  }
})();
const persist = (k: string, v: Trip | null) => {
  saved[k] = v;
  try {
    sessionStorage.setItem(SKEY, JSON.stringify(saved));
  } catch {
    /* 저장 안 되면 이번 탭에서만 */
  }
};

let authFailed = false; // 키 문제 또는 오늘 한도 소진 → 이 탭에서는 더 부르지 않음

// 한꺼번에 많이 부르면 ODsay 가 429(Too Many Requests)로 거절 → 동시에 2개까지, 시작 간격 150ms
const MAX_IN_FLIGHT = 2;
const GAP_MS = 150;
let inFlight = 0;
let lastStart = 0;
const waiting: (() => void)[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_IN_FLIGHT) await new Promise<void>((r) => waiting.push(r));
  inFlight++;
  const wait = lastStart + GAP_MS - Date.now();
  lastStart = Math.max(Date.now(), lastStart + GAP_MS);
  if (wait > 0) await sleep(wait);
  try {
    return await fn();
  } finally {
    inFlight--;
    waiting.shift()?.();
  }
}

export function transitTime(from: Pt, to: Pt, retry = false): Promise<Trip | null> {
  if (!KEY || authFailed) return Promise.resolve(null);
  const k = [from.lng, from.lat, to.lng, to.lat].map((x) => x.toFixed(4)).join(',');
  if (k in saved) return Promise.resolve(saved[k]);
  const hit = memo.get(k);
  if (hit && !retry) return hit;
  const p = (async () => {
    try {
      const qs = new URLSearchParams({ apiKey: KEY, SX: String(from.lng), SY: String(from.lat), EX: String(to.lng), EY: String(to.lat), OPT: '0', SearchPathType: '0' });
      type Res = {
        error?: { code?: string; message?: string }[] | { code?: string; msg?: string };
        result?: { path?: { info: { totalTime: number; subwayTransitCount?: number; busTransitCount?: number } }[] };
      };
      const call = () => slot(async () => authFailed ? ({ error: { code: 'stop' } } as Res) : (await fetch(`https://api.odsay.com/v1/api/searchPubTransPathT?${qs}`, { signal: AbortSignal.timeout(10_000) })).json() as Promise<Res>);
      let j = await call();
      // 하루 한도 소진이면 오늘은 더 부르지 않음 (다시 불러도 안 됨)
      if (j.error && /quota/i.test(JSON.stringify(j.error))) {
        authFailed = true;
        return null;
      }
      // 잠깐 몰려서 거절(Too Many Requests)이면 쉬고 두 번까지 다시
      for (let i = 0; i < 2 && j.error && /Too Many/i.test(JSON.stringify(j.error)); i++) {
        await sleep(700 * (i + 1));
        j = await call();
      }
      if (j.error) {
        const msg = JSON.stringify(j.error);
        if (/ApiKey|auth/i.test(msg)) authFailed = true; // 키 문제면 더 부르지 않음
        // 출발·도착이 너무 가까움(700m 이내) 같은 경우는 걷기로 봄
        if (/-98|700m|가까/.test(msg)) {
          const near = { min: 10, transfers: 0 };
          persist(k, near);
          return near;
        }
        return null;
      }
      const paths = j.result?.path ?? [];
      if (!paths.length) return null;
      const best = paths.reduce((a, b) => (b.info.totalTime < a.info.totalTime ? b : a));
      const trip = { min: best.info.totalTime, transfers: Math.max(0, (best.info.subwayTransitCount ?? 0) + (best.info.busTransitCount ?? 0) - 1) };
      persist(k, trip);
      return trip;
    } catch {
      return null;
    }
  })();
  memo.set(k, p);
  // 실패(null)는 기억하지 않음 → 다음에 다시 시도
  p.then((t) => t || memo.delete(k));
  return p;
}
