import type { EatplItem } from '@/types/eatpl';

const BASE = process.env.KSKILL_PROXY_BASE_URL ?? 'https://k-skill-proxy.nomadamas.org';

// 서버에서만 호출할 것
export async function searchEatpl(params: { location: string; genre?: string; merchantName?: string }) {
  const q = new URLSearchParams({ location: params.location });
  if (params.genre) q.set('merTpbuzNm', params.genre);
  if (params.merchantName) q.set('merNm', params.merchantName);
  const res = await fetch(`${BASE}/v1/bccard-eatpl/search?${q}`, { next: { revalidate: 60 * 60 * 24 } });
  if (!res.ok) throw new Error(`eatpl ${res.status}`);
  const data = await res.json();
  // TODO: 첫 응답 구조 확인 후 목록 위치에 맞게 수정
  return data as { items?: EatplItem[] } & Record<string, unknown>;
}
