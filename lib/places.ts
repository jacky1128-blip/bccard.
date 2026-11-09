// 장소 이름("강남역", "잠실종합운동장", "서울 강남구 역삼동") → 좌표 + 잇플 검색용 지역 텍스트
// 1순위: 네이버 (키가 있으면, lib/naver.ts · 이름은 NAVER API HUB 지역 검색, 내 위치는 Reverse Geocoding)
// 2순위: k-skill 프록시의 카카오 (키 없이 동작) — 네이버 실패·키 없음일 때만
import 'server-only';
import { cacheLife } from 'next/cache';
import { naverConfigured, naverMapsConfigured, resolveNaver, reverseGeocode, type ResolvedPlace } from './naver';

const BASE = (process.env.KSKILL_PROXY_BASE_URL || 'https://k-skill-proxy.nomadamas.org').replace(/\/+$/, '');

export type Place = ResolvedPlace & {
  label: string;   // 화면 표시용 (입력값 그대로, 대괄호 제거)
  region: string;  // 잇플 location 파라미터 "서울 강남구 역삼동"
};

// "[역삼역]" 같은 와이어프레임 자리표시 괄호 제거
export const cleanPlace = (s: string) => s.trim().replace(/^\[|\]$/g, '').trim();

// 시·도 이름은 잇플 주소 표기(짧은 이름)에 맞춤. 긴 이름으로 검색하면 결과가 0~14건으로 줄어듦 (2026-11-10 확인)
// "서울특별시 강남구 역삼동" 14건 / "서울 강남구 역삼동" 100건
const SIDO: Record<string, string> = {
  서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천', 광주광역시: '광주', 대전광역시: '대전', 울산광역시: '울산',
  세종특별자치시: '세종', 경기도: '경기', 강원도: '강원', 강원특별자치도: '강원', 충청북도: '충북', 충청남도: '충남',
  전라북도: '전북', 전북특별자치도: '전북', 전라남도: '전남', 경상북도: '경북', 경상남도: '경남', 제주특별자치도: '제주',
};

// 지번 주소 "서울특별시 강남구 역삼동 804" → "서울 강남구 역삼동" (동·읍·면·가·리 까지)
export function regionOf(addr?: string) {
  if (!addr) return '';
  const words = addr.trim().split(/\s+/);
  if (SIDO[words[0]]) words[0] = SIDO[words[0]];
  const end = words.findIndex((w, i) => i >= 1 && /(동|읍|면|가|리)$/.test(w) && !/\d/.test(w));
  return (end >= 0 ? words.slice(0, end + 1) : words.slice(0, 3)).join(' ');
}

async function kakaoKeyword(query: string): Promise<ResolvedPlace | null> {
  const res = await fetch(`${BASE}/v1/kakao-map/search/keyword?${new URLSearchParams({ q: query, size: '1' })}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`kakao keyword ${res.status}`);
  const data = (await res.json()) as {
    documents?: { place_name: string; address_name: string; road_address_name: string; x: string; y: string }[];
  };
  const d = data.documents?.[0];
  if (!d) return null;
  return {
    name: d.place_name,
    address: d.road_address_name || d.address_name,
    jibun: d.address_name,
    lat: Number(d.y),
    lng: Number(d.x),
    source: 'kakao',
  };
}

// "37.5007,127.0365" (내 위치) → 좌표 → 행정구역
const COORD = /^(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)$/;

async function fromCoord(lat: number, lng: number): Promise<ResolvedPlace | null> {
  const res = await fetch(`${BASE}/v1/kakao-map/coord2address?${new URLSearchParams({ x: String(lng), y: String(lat) })}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`kakao coord2address ${res.status}`);
  const data = (await res.json()) as { documents?: { address?: { address_name: string }; road_address?: { address_name: string } | null }[] };
  const d = data.documents?.[0];
  const jibun = d?.address?.address_name;
  if (!jibun) return null;
  return { name: '내 위치', address: d?.road_address?.address_name || jibun, jibun, lat, lng, source: 'kakao' };
}

export const isCoord = (s: string) => COORD.test(s.trim());

export async function resolvePlace(input: string): Promise<Place | null> {
  'use cache';
  cacheLife('weeks');

  const q = cleanPlace(input).slice(0, 100);
  if (!q) return null;
  const c = q.match(COORD);
  if (c) {
    const lat = Math.round(Number(c[1]) * 1e4) / 1e4; // 약 10m 단위로 묶어 캐시 효율
    const lng = Math.round(Number(c[2]) * 1e4) / 1e4;
    let p: ResolvedPlace | null = null;
    if (naverMapsConfigured()) {
      try {
        p = await reverseGeocode(lat, lng);
      } catch {
        p = null; // 네이버 실패(Application 에 Reverse Geocoding 미선택 등) 시 카카오로
      }
    }
    if (!p) p = await fromCoord(lat, lng);
    return p ? { ...p, label: '내 위치', region: regionOf(p.jibun) || regionOf(p.address) } : null;
  }
  let found: ResolvedPlace | null = null;
  if (naverConfigured()) {
    try {
      found = await resolveNaver(q);
    } catch {
      found = null; // 네이버 실패 시 카카오로
    }
  }
  if (!found) found = await kakaoKeyword(q);
  if (!found || !Number.isFinite(found.lat) || !Number.isFinite(found.lng)) return null;
  const region = regionOf(found.jibun) || regionOf(found.address);
  return { ...found, label: q, region: region || q };
}
