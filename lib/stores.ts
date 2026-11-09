// 화면에서 쓰는 가게 목록을 만드는 한 곳
// 장소 해석(lib/places) → 잇플 검색(lib/eatpl) → 도보 거리 → 규칙으로 후보 선정(lib/recommend) → 추천 이유(lib/llm)
// 잇플·장소 조회가 실패하면 예시 데이터(lib/mock)로 화면이 비지 않게 함 (live:false)
import 'server-only';
import { cacheLife } from 'next/cache';
import type { EatplItem } from '@/types/eatpl';
import type { Mode } from '@/types/group';
import { distanceKm, walkMinutes, type LatLng } from './geo';
import { searchEatpl } from './eatpl';
import { cleanPlace, isCoord, resolvePlace, type Place } from './places';
import { pickCandidates, rankForMode, ruleReason, type PickOptions } from './recommend';
import { writeReasons } from './llm';
import { MODE_ORDER } from './modes';
import { mockItems } from './mock';
import { likelyOpenAt, toViews, type StoreView } from './view';


const BASE = (process.env.KSKILL_PROXY_BASE_URL || 'https://k-skill-proxy.nomadamas.org').replace(/\/+$/, '');

export type StoresResult = {
  live: boolean;           // 실제 잇플 데이터인지 (false면 예시 데이터)
  label: string;           // 화면에 보일 장소 이름
  center?: LatLng;
  region?: string;         // 잇플 검색에 쓴 지역
  stores: StoreView[];
  items?: EatplItem[];      // 후보 원본 (모임 저장용 스냅샷, live 일 때만)
  error?: string;
  notFound?: boolean;      // 입력한 장소를 못 찾음 (예시 데이터 대신 빈 목록 + 안내)
  widened?: boolean;       // 가까운 곳에 없어서 거리를 넓혀 찾음
};

class PlaceNotFound extends Error {}

// 장소 → 좌표 + 그 동네 잇플 결과(도보 분 포함)
async function loadArea(placeInput: string): Promise<{ place: Place; items: EatplItem[] }> {
  const place = await resolvePlace(placeInput);
  if (!place) throw new PlaceNotFound(`장소를 찾지 못했어요: ${placeInput}`);
  const { items } = await searchEatpl({ location: place.region });
  const center = { lat: place.lat, lng: place.lng };
  return {
    place,
    items: items.map((it) =>
      it._lat != null && it._lng != null ? { ...it, _walkMin: walkMinutes(distanceKm(center, { lat: it._lat, lng: it._lng })) } : it,
    ),
  };
}

const shortArea = (p: Place) => p.region.split(' ').slice(-1)[0];
// 내 위치(좌표)는 좌표 대신 동 이름으로 보여줌 "37.48,126.92" → "신림동"
const labelOf = (input: string, p: Place) => (isCoord(input) ? shortArea(p) : cleanPlace(input));

export type CandidateQuery = Omit<PickOptions, 'limit'> & {
  place: string;
  limit?: number;
  ai?: boolean;            // 추천 이유를 AI로 (키 없으면 규칙 이유)
  widenWalk?: number;      // 조건에 맞는 곳이 없으면 이 도보 분까지 넓혀서 한 번 더
  when?: string;
  headcount?: number;
};

// 후보 N곳 + 추천 이유 (AI 추천 · 끝나고 문 연 곳 · 여행 · 모임 후보)
export async function getCandidates(q: CandidateQuery): Promise<StoresResult> {
  const limit = q.limit ?? 3;
  try {
    const { place, items } = await loadArea(q.place);
    let picked = pickCandidates(items, { ...q, limit });
    let widened = false;
    if (picked.length === 0 && q.widenWalk) {
      picked = pickCandidates(items, { ...q, limit, maxWalk: q.widenWalk });
      widened = picked.length > 0;
    }
    const label = labelOf(q.place, place);
    const ai = q.ai === false ? null : await writeReasons(picked, { mode: q.mode, place: label, when: q.when, cantEat: q.cantEat, headcount: q.headcount });
    const withReasons = picked.map((it, i) => ({
      ...it,
      _reason: ai?.[i] ?? ruleReason(it, { mode: q.mode, at: q.at, day: q.day, area: shortArea(place) }),
      _reasonBy: ai ? ('ai' as const) : ('rule' as const),
    }));
    return { live: true, label, center: { lat: place.lat, lng: place.lng }, region: place.region, stores: toViews(withReasons), items: withReasons, widened };
  } catch (e) {
    if (e instanceof PlaceNotFound) return { live: false, notFound: true, label: cleanPlace(q.place), stores: [], error: e.message };
    let views = toViews(mockItems(q.mode, 10));
    if (q.at != null) views = views.filter((s) => likelyOpenAt(s.open, s.close, q.at!) !== false);
    if (q.maxWalk != null) views = views.filter((s) => (s.walkMin ?? 0) <= q.maxWalk!);
    return { live: false, label: cleanPlace(q.place), stores: views.slice(0, limit).map((s, i) => ({ ...s, rank: i + 1 })), error: (e as Error).message };
  }
}

export type ByModeResult = Omit<StoresResult, 'stores'> & { storesByMode: Record<Mode, StoreView[]> };

// 첫 화면·순위 화면: 잇플 한 번 호출로 상황 4개 목록 (각 최대 10곳)
export async function getStoresByMode(placeInput: string, o: { at?: number; day?: string; limit?: number } = {}): Promise<ByModeResult> {
  const label = cleanPlace(placeInput);
  try {
    const { place, items: all } = await loadArea(placeInput);
    // 법정동이 넓으면(예: 신림동) 30~40분 거리 가게가 섞임 → "내 주변"답게 도보 20분 안, 모자라면 30분 안, 그래도 모자라면 전체
    const within = (min: number) => all.filter((it) => it._walkMin == null || it._walkMin <= min);
    const items = [20, 30].map(within).find((xs) => xs.length >= 10) ?? all;
    const storesByMode = Object.fromEntries(MODE_ORDER.map((m) => [m, toViews(rankForMode(items, m, o))])) as Record<Mode, StoreView[]>;
    return { live: true, label: labelOf(placeInput, place), center: { lat: place.lat, lng: place.lng }, region: place.region, storesByMode };
  } catch (e) {
    if (e instanceof PlaceNotFound) {
      return { live: false, notFound: true, label, storesByMode: Object.fromEntries(MODE_ORDER.map((m) => [m, []])) as unknown as Record<Mode, StoreView[]>, error: e.message };
    }
    const storesByMode = Object.fromEntries(MODE_ORDER.map((m) => [m, toViews(mockItems(m, o.limit ?? 10))])) as Record<Mode, StoreView[]>;
    return { live: false, label, storesByMode, error: (e as Error).message };
  }
}

// 근처 지하철역 (순위 화면 하단 "근처 다른 역" · sitemap)
export async function nearbyStations(center: LatLng, exclude?: string): Promise<string[]> {
  'use cache';
  cacheLife('weeks');
  try {
    const qs = new URLSearchParams({ category_group_code: 'SW8', x: String(center.lng), y: String(center.lat), radius: '2000', sort: 'distance', size: '15' });
    const res = await fetch(`${BASE}/v1/kakao-map/search/category?${qs}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { documents?: { place_name: string }[] };
    // "역삼역 2호선" → "역삼역"
    const names = (data.documents ?? []).map((d) => d.place_name.replace(/\s.*$/, ''));
    const skip = exclude?.replace(/역$/, '');
    return [...new Set(names)].filter((n) => n.replace(/역$/, '') !== skip).slice(0, 3);
  } catch {
    return [];
  }
}
