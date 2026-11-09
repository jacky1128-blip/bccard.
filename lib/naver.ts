// 장소 이름·주소·좌표 → 주소/좌표 (서버에서만 호출. 비밀키가 브라우저로 나가지 않게, NEXT_PUBLIC_ 금지)
//
// 1) 장소 이름("강남역", "신림동")  → NAVER API HUB · 지역 검색 (2026-11-10 실제 호출로 확인)
//    GET https://naverapihub.apigw.ntruss.com/search/v1/local?query=...&display=5
//    헤더 x-ncp-apigw-api-key-id / x-ncp-apigw-api-key   (NAVER_SEARCH_CLIENT_ID / _SECRET)
//    응답 items[].address(지번) · roadAddress · mapx/mapy(WGS84 경위도 × 10,000,000)
// 2) 주소("서울 강남구 테헤란로 152") → 네이버 클라우드 Maps · Geocoding
//    GET https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=...
// 3) 좌표(내 위치) → 네이버 클라우드 Maps · Reverse Geocoding (법정동)
//    GET https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=경도,위도&orders=legalcode&output=json
//    2·3 헤더 x-ncp-apigw-api-key-id / x-ncp-apigw-api-key   (NAVER_MAP_KEY_ID / NAVER_MAP_KEY)
//    콘솔 Application 에서 Geocoding · Reverse Geocoding 을 선택해야 함 (안 하면 403)
import 'server-only';

export type ResolvedPlace = {
  name: string;
  address: string;      // 도로명 우선
  jibun?: string;       // 지번 주소 (잇플 location 에 쓰는 '시 구 동' 을 여기서 뽑음)
  lat: number;
  lng: number;
  source: 'search' | 'geocode' | 'kakao';
};

const strip = (s: string) => s.replace(/<[^>]+>/g, '');

// 지역 검색 mapx/mapy: WGS84 경위도 × 10,000,000 (실제 응답 "1270363764" → 127.0363764, 2026-11-10 확인)
// 예전 KATECH 좌표(6자리대)가 오면 변환하지 않고 건너뜀
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
  const res = await fetch(`https://naverapihub.apigw.ntruss.com/search/v1/local?${new URLSearchParams({ query, display: '5' })}`, {
    headers: { 'x-ncp-apigw-api-key-id': id, 'x-ncp-apigw-api-key': secret },
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) throw new Error(`naver local ${res.status}`);
  const data = (await res.json()) as { items?: { title: string; category?: string; address: string; roadAddress: string; mapx: string; mapy: string }[] };
  const items = data.items ?? [];
  // 이름이 정확히 같은 곳 먼저 ("잠실종합운동장" → '…잠실종합운동장점' 카페 말고 운동장) /
  // "○○역" → 지하철역 결과 먼저 / "○○동" → 주소에 그 동이 들어 있는 결과 먼저 (이름만 비슷한 다른 동네 가게 제외)
  const it =
    items.find((x) => strip(x.title).replace(/\s/g, '') === query.replace(/\s/g, '')) ||
    (/역$/.test(query) && items.find((x) => x.category?.includes('지하철'))) ||
    (/(동|읍|면|가|리)$/.test(query) && items.find((x) => x.address.split(/\s+/).some((w) => w === query || w.replace(/\d+(동|가)$/, '$1') === query))) ||
    items[0];
  if (!it) return null;
  const c = fromSearchCoord(it.mapx, it.mapy);
  if (!c) return null;
  return { name: strip(it.title), address: it.roadAddress || it.address, jibun: it.address, ...c, source: 'search' };
}

async function geocode(query: string): Promise<ResolvedPlace | null> {
  const id = process.env.NAVER_MAP_KEY_ID;
  const key = process.env.NAVER_MAP_KEY;
  if (!id || !key) return null;
  const res = await fetch(`https://maps.apigw.ntruss.com/map-geocode/v2/geocode?${new URLSearchParams({ query })}`, {
    headers: { 'x-ncp-apigw-api-key-id': id, 'x-ncp-apigw-api-key': key, Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) throw new Error(`naver geocode ${res.status}`);
  const data = (await res.json()) as { addresses?: { roadAddress: string; jibunAddress: string; x: string; y: string }[] };
  const a = data.addresses?.[0];
  if (!a) return null;
  return { name: query, address: a.roadAddress || a.jibunAddress, jibun: a.jibunAddress, lat: Number(a.y), lng: Number(a.x), source: 'geocode' };
}

// 좌표 → 법정동 주소 "서울특별시 강남구 역삼동" (내 위치 버튼)
export async function reverseGeocode(lat: number, lng: number): Promise<ResolvedPlace | null> {
  const id = process.env.NAVER_MAP_KEY_ID;
  const key = process.env.NAVER_MAP_KEY;
  if (!id || !key) return null;
  const qs = new URLSearchParams({ coords: `${lng},${lat}`, orders: 'legalcode', output: 'json' });
  const res = await fetch(`https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?${qs}`, {
    headers: { 'x-ncp-apigw-api-key-id': id, 'x-ncp-apigw-api-key': key, Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) throw new Error(`naver reverse ${res.status}`);
  type Area = { name?: string };
  const data = (await res.json()) as { results?: { region?: { area1?: Area; area2?: Area; area3?: Area; area4?: Area } }[] };
  const r = data.results?.[0]?.region;
  const parts = [r?.area1?.name, r?.area2?.name, r?.area3?.name, r?.area4?.name].filter((x): x is string => !!x && x.trim() !== '');
  if (parts.length < 2) return null;
  const addr = parts.join(' ');
  return { name: '내 위치', address: addr, jibun: addr, lat, lng, source: 'geocode' };
}

export async function resolveNaver(query: string): Promise<ResolvedPlace | null> {
  const q = query.trim().replace(/^\[|\]$/g, '');
  if (!q) return null;
  return (await searchLocal(q)) ?? (await geocode(q));
}

export const naverConfigured = () =>
  !!(process.env.NAVER_SEARCH_CLIENT_ID && process.env.NAVER_SEARCH_CLIENT_SECRET) ||
  !!(process.env.NAVER_MAP_KEY_ID && process.env.NAVER_MAP_KEY);

export const naverMapsConfigured = () => !!(process.env.NAVER_MAP_KEY_ID && process.env.NAVER_MAP_KEY);
