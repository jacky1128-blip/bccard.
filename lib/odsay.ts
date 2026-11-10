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

let authFailed = false;

export function transitTime(from: Pt, to: Pt): Promise<Trip | null> {
  if (!KEY || authFailed) return Promise.resolve(null);
  const k = [from.lng, from.lat, to.lng, to.lat].map((x) => x.toFixed(4)).join(',');
  if (k in saved) return Promise.resolve(saved[k]);
  const hit = memo.get(k);
  if (hit) return hit;
  const p = (async () => {
    try {
      const qs = new URLSearchParams({ apiKey: KEY, SX: String(from.lng), SY: String(from.lat), EX: String(to.lng), EY: String(to.lat), OPT: '0', SearchPathType: '0' });
      const res = await fetch(`https://api.odsay.com/v1/api/searchPubTransPathT?${qs}`, { signal: AbortSignal.timeout(10_000) });
      const j = (await res.json()) as {
        error?: { code?: string; message?: string }[] | { code?: string; msg?: string };
        result?: { path?: { info: { totalTime: number; subwayTransitCount?: number; busTransitCount?: number } }[] };
      };
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
  return p;
}
