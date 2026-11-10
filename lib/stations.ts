// 지하철역 찾기 (서버 전용): 고정 목록(lib/midpoint STATIONS) 대신 카카오 지하철역(SW8)으로 전국 어느 역이든
// - 출발역: "양재", "양재역", "양재역 3호선" → 카카오 키워드 검색에서 지하철역만
// - 만날 역 후보: 주요 역 목록 + 모두의 가운데 지점 근처 실제 역 + 각자 출발역
import 'server-only';
import { cacheLife } from 'next/cache';
import { STATIONS, meetingOptions, type MeetingOption, type Station } from './midpoint';

const BASE = (process.env.KSKILL_PROXY_BASE_URL || 'https://k-skill-proxy.nomadamas.org').replace(/\/+$/, '');

type Doc = { place_name: string; category_group_code?: string; x: string; y: string };

// "강남역 2호선" → "강남", "서울역 1호선" → "서울역"(이름 자체가 '역'으로 끝나는 곳은 그대로)
export function stationName(placeName: string) {
  const base = placeName.replace(/\s.*$/, '');
  return base === '서울역' ? '서울역' : base.replace(/역$/, '');
}

async function kakao(path: string, params: Record<string, string>): Promise<Doc[]> {
  const res = await fetch(`${BASE}/v1/kakao-map/${path}?${new URLSearchParams(params)}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`kakao ${path} ${res.status}`);
  return ((await res.json()) as { documents?: Doc[] }).documents ?? [];
}

const toStation = (d: Doc): Station => ({ name: stationName(d.place_name), lat: Number(d.y), lng: Number(d.x) });

// 역 이름 하나 → 역 (못 찾으면 null). 같은 입력은 하루 캐시
export async function findStationKakao(input: string): Promise<Station | null> {
  'use cache';
  cacheLife('days');
  const q = input.trim().replace(/\s+/g, ' ').replace(/\s*\d+호선$/, '');
  if (!q) return null;
  const query = /역$/.test(q) ? q : `${q}역`;
  const docs = await kakao('search/keyword', { q: query, size: '5' });
  const hit = docs.find((d) => d.category_group_code === 'SW8');
  return hit ? toStation(hit) : null;
}

// 좌표 근처 지하철역 (반경 m, 가까운 순 최대 15곳)
async function stationsNear(lat: number, lng: number, radius: number): Promise<Station[]> {
  'use cache';
  cacheLife('days');
  const docs = await kakao('search/category', {
    category_group_code: 'SW8',
    x: lng.toFixed(4),
    y: lat.toFixed(4),
    radius: String(radius),
    size: '15',
    sort: 'distance',
  });
  return docs.map(toStation);
}

const uniq = (xs: Station[]) => {
  const seen = new Set<string>();
  return xs.filter((s) => (seen.has(s.name) ? false : (seen.add(s.name), true)));
};

export type MeetResult = { resolved: (Station | null)[]; options: MeetingOption[] };

export async function meet(inputs: string[], limit = 3): Promise<MeetResult> {
  const resolved = await Promise.all(inputs.map((x) => (x.trim() ? findStationKakao(x).catch(() => null) : Promise.resolve(null))));
  const origins = resolved.filter((s): s is Station => !!s);
  if (origins.length < 2) return { resolved, options: [] };
  const lat = origins.reduce((a, s) => a + s.lat, 0) / origins.length;
  const lng = origins.reduce((a, s) => a + s.lng, 0) / origins.length;
  // 가운데 근처는 촘촘히(2km), 조금 넓게(5km)도 한 번 → 주요 역 목록과 합쳐서 계산
  const near = (await Promise.all([stationsNear(lat, lng, 2000), stationsNear(lat, lng, 5000)]).catch(() => [[], []])).flat();
  const candidates = uniq([...near, ...origins, ...STATIONS]);
  return { resolved, options: meetingOptions(origins, limit, candidates) };
}
