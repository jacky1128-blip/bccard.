// 잇플 검색 (k-skill 프록시 경유, 서버에서만 호출)
// GET {KSKILL_PROXY_BASE_URL}/v1/bccard-eatpl/search?location=&merTpbuzNm=&merNm=
// 응답 { items: EatplItem[] (최대 100, 최근 1개월 매출 상위 순), query, attribution }
import 'server-only';
import { cacheLife } from 'next/cache';
import type { EatplItem, EatplSearchResult } from '@/types/eatpl';
import { tm128ToWgs84 } from './geo';

const BASE = (process.env.KSKILL_PROXY_BASE_URL || 'https://k-skill-proxy.nomadamas.org').replace(/\/+$/, '');

export class EatplError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type EatplQuery = { location?: string; genre?: string; merchantName?: string };

// 같은 조건은 1시간 동안 다시 부르지 않음 (데이터 자체가 최근 1개월 집계라 자주 바뀌지 않음)
export async function searchEatpl(params: EatplQuery): Promise<EatplSearchResult> {
  'use cache';
  cacheLife('hours');

  const q = new URLSearchParams();
  if (params.location) q.set('location', params.location);
  if (params.genre) q.set('merTpbuzNm', params.genre);
  if (params.merchantName) q.set('merNm', params.merchantName);
  if (![...q.keys()].length) throw new EatplError(400, '주소·업종·가맹점명 중 하나는 있어야 해요');

  const res = await fetch(`${BASE}/v1/bccard-eatpl/search?${q}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new EatplError(res.status, `eatpl ${res.status}`);
  const data = (await res.json()) as Partial<EatplSearchResult>;
  const items = (Array.isArray(data.items) ? data.items : [])
    // 잇플 상세 링크가 없거나 잇플 도메인이 아니면 쓰지 않음 (링크는 응답값 그대로)
    .filter((it) => typeof it.merUrl === 'string' && it.merUrl.startsWith('https://web.paybooc.ai/'))
    .map((it, i) => {
      const c = tm128ToWgs84(Number(it.xaxsVal), Number(it.yaxsVal));
      return { ...it, _key: it.merUrl || `${it.merNm}|${it.merAddr ?? i}`, _lat: c?.lat, _lng: c?.lng } satisfies EatplItem;
    });
  return {
    items,
    query: data.query ?? { location: params.location ?? null, merNm: params.merchantName ?? null, merTpbuzNm: params.genre ?? null },
    attribution: data.attribution ?? 'eat.pl 잇플 · BC카드 결제 데이터 기반',
  };
}
