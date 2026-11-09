// 장소 이름·주소 → 주소/좌표 (서버에서만 호출. 키가 브라우저로 나가지 않게)
//
// 1) 장소 이름("강남역", "OO대학교")  → 네이버 검색 API · 지역 검색 (developers.naver.com)
//    GET https://openapi.naver.com/v1/search/local.json?query=...
//    헤더 X-Naver-Client-Id / X-Naver-Client-Secret
// 2) 주소("서울 강남구 테헤란로 152")   → 네이버 클라우드 Maps · Geocoding
//    GET https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=...
//    헤더 x-ncp-apigw-api-key-id / x-ncp-apigw-api-key  (주소만 찾고 장소 이름은 문서상 미지원)
import 'server-only';

export type ResolvedPlace = { name: string; address: string; lat: number; lng: number; source: 'search' | 'geocode' };

const strip = (s: string) => s.replace(/<[^>]+>/g, '');

// 지역 검색 mapx/mapy: 현재 응답은 WGS84 경위도 × 10,000,000 (예: 1270276000)
// 예전 KATECH 좌표(6자리대)가 오면 변환하지 않고 건너뜀 → 실제 응답으로 꼭 한 번 확인
function fromSearchCoord(mapx: string, mapy: string) {
  const x = Number(mapx);
  const y = Number(mapy);
  if (!(x > 1e8 && y > 1e7)) return null;
  return { lng: x / 1e7, lat: y / 1e7 };
}

async function searchLocal(query: string): Promise<ResolvedPlace | null> {
  const id = process.env.NAVER_SEARCH_CLIENT_ID;
  const secret = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!id || !secret) return null;
  const res = await fetch(`https://openapi.naver.com/v1/search/local.json?${new URLSearchParams({ query, display: '1' })}`, {
    headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret },
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) throw new Error(`naver search ${res.status}`);
  const data = (await res.json()) as { items?: { title: string; address: string; roadAddress: string; mapx: string; mapy: string }[] };
  const it = data.items?.[0];
  if (!it) return null;
  const c = fromSearchCoord(it.mapx, it.mapy);
  if (!c) return null;
  return { name: strip(it.title), address: it.roadAddress || it.address, ...c, source: 'search' };
}

async function geocode(query: string): Promise<ResolvedPlace | null> {
  const id = process.env.NAVER_MAP_KEY_ID;
  const key = process.env.NAVER_MAP_KEY;
  if (!id || !key) return null;
  const res = await fetch(`https://maps.apigw.ntruss.com/map-geocode/v2/geocode?${new URLSearchParams({ query })}`, {
    headers: { 'x-ncp-apigw-api-key-id': id, 'x-ncp-apigw-api-key': key, Accept: 'application/json' },
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) throw new Error(`naver geocode ${res.status}`);
  const data = (await res.json()) as { addresses?: { roadAddress: string; jibunAddress: string; x: string; y: string }[] };
  const a = data.addresses?.[0];
  if (!a) return null;
  return { name: query, address: a.roadAddress || a.jibunAddress, lat: Number(a.y), lng: Number(a.x), source: 'geocode' };
}

export async function resolvePlace(query: string): Promise<ResolvedPlace | null> {
  const q = query.trim().replace(/^\[|\]$/g, '');
  if (!q) return null;
  return (await searchLocal(q)) ?? (await geocode(q));
}

export const naverConfigured = () =>
  !!(process.env.NAVER_SEARCH_CLIENT_ID && process.env.NAVER_SEARCH_CLIENT_SECRET) ||
  !!(process.env.NAVER_MAP_KEY_ID && process.env.NAVER_MAP_KEY);
