// 잇플 응답 한 건 → 화면에서 쓰는 형태. 실제 필드명이 확정되면 여기만 고치면 됨.
import type { EatplItem } from '@/types/eatpl';

export type StoreView = {
  key: string;
  rank: number;
  name: string;
  cat: string;          // 업종
  open?: string;
  close?: string;
  hours: string;        // 표시용 "11:00~21:00" / "24시간"
  until: string;        // "21:00까지" / "24시간"
  fan?: string;         // 주요 고객층
  walk?: string;        // "도보 4분"
  walkMin?: number;
  localRank?: number;   // 지역 매출 상위 %
  lat?: number;         // 지도 핀 위치 (잇플 주소 → 네이버 지오코딩으로 채움)
  lng?: number;
  tags: string[];
  reason: string;       // AI 추천 이유 (실제로는 lib/llm.ts 결과)
  url: string;          // merUrl 그대로
};

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
const num = (v: unknown) => (typeof v === 'number' ? v : undefined);

export function toView(it: EatplItem, i: number): StoreView {
  const name = str(it.merNm) ?? '이름 없음';
  const allDay = it.srtTime === '00:00' && it.endTime === '24:00';
  const hours = allDay ? '24시간' : it.srtTime && it.endTime ? `${it.srtTime}~${it.endTime}` : '';
  const walkMin = num(it._walkMin);
  return {
    key: str(it._key) ?? `${name}|${str(it.merAddr) ?? ''}`,
    rank: i + 1,
    name,
    cat: str(it.merTpbuzNm) ?? '',
    open: it.srtTime,
    close: it.endTime,
    hours,
    until: allDay ? '24시간' : it.endTime ? `${it.endTime}까지` : '',
    fan: str(it.mainCust),
    walk: walkMin != null ? `도보 ${walkMin}분` : undefined,
    walkMin,
    localRank: it.ccgSaleRnk,
    lat: num(it._lat),
    lng: num(it._lng),
    tags: Array.isArray(it._tags) ? (it._tags as string[]) : [],
    reason: str(it._reason) ?? '',
    url: it.merUrl,
  };
}

export const toViews = (items: EatplItem[]) => items.map(toView);
