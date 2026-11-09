// 잇플 응답 한 건 → 화면에서 쓰는 형태 (필드명은 2026-11-09 실제 응답 기준으로 확정)
import type { EatplItem } from '@/types/eatpl';
import { hhmm, toMinutes } from './time';

export type StoreView = {
  key: string;
  rank: number;
  name: string;
  cat: string;          // 업종
  address?: string;     // 괄호 뺀 도로명 주소
  open?: string;        // 'HH:MM' 영업 예상 시작
  close?: string;       // 'HH:MM' 영업 예상 종료 (자정 넘김 가능)
  hours: string;        // 표시용 "11:00~21:00" / "24시간"
  until: string;        // "21:00까지" / "24시간"
  fan?: string;         // 주요 고객층 1위 "20대 여성"
  fans: string[];       // 주요 고객층 1~3위
  walk?: string;        // "도보 4분"
  walkMin?: number;
  localRank?: number;   // 지역 매출 상위 %
  allRank?: number;     // 전국 매출 상위 %
  local?: boolean;      // 동네 맛집
  party?: boolean;      // 회식 적합
  foreign?: boolean;    // 외국인 방문 많음
  busyDay?: string;     // 가장 붐비는 요일
  busyTime?: string;    // 가장 붐비는 시간대
  closedDays: string[]; // 휴무 요일
  lat?: number;         // 지도 핀 (TM128 → WGS84)
  lng?: number;
  tags: string[];
  reason: string;       // 추천 이유
  reasonBy?: 'ai' | 'rule';
  url: string;          // merUrl 그대로
};

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

// "60대이상여성" → "60대 이상 여성"
export function fanLabel(v?: string) {
  if (!v) return undefined;
  return v.replace(/이상/, ' 이상').replace(/(여성|남성)$/, ' $1').replace(/\s+/g, ' ').trim();
}

// 영업 예상 시간이 23시간 이상이면 24시간으로 봄 (결제 승인 시각 기반이라 몇 분 비는 경우가 많음)
export function isAllDay(srt?: string, end?: string) {
  const s = toMinutes(srt);
  const e = toMinutes(end);
  if (s == null || e == null) return false;
  const span = (e - s + 1440) % 1440;
  return span === 0 || span >= 23 * 60;
}

// 가맹점 법인명 표기 정리 "(주)전한강강술래역삼점" → "전한강강술래역삼점"
// 카드 가맹점명은 "가게명/법인명"인 경우가 많음 → "술탄베이케밥/에스엘티에프엔비" → "술탄베이케밥"
export const cleanName = (n: string) =>
  n
    .replace(/^(.{2,}?)\s*\/.*$/, '$1')
    .replace(/^\s*(\(주\)|㈜|주식회사|\(유\)|유한회사)\s*/, '')
    .replace(/\s*(\(주\)|㈜)\s*$/, '')
    .trim() || n;

export function toView(it: EatplItem, i: number): StoreView {
  const name = cleanName(str(it.merNm) ?? '이름 없음');
  const open = hhmm(it.srtTime);
  const close = hhmm(it.endTime);
  const allDay = isAllDay(it.srtTime, it.endTime);
  const overnight = !allDay && open && close && toMinutes(close)! < toMinutes(open)!;
  const hours = allDay ? '24시간' : open && close ? `${open}~${overnight ? '익일 ' : ''}${close}` : '';
  const walkMin = num(it._walkMin);
  const rk = it.vistCstmrRnkList ?? {};
  const fans = [rk.rk01, rk.rk02, rk.rk03].map(fanLabel).filter((x): x is string => !!x);
  return {
    key: str(it._key) ?? (str(it.merUrl) || `${name}|${str(it.merAddr) ?? ''}`),
    rank: i + 1,
    name,
    cat: str(it.merTpbuzNm) ?? '',
    address: str(it.merAddr)?.replace(/\s*\(.*$/, '').replace(/,.*$/, '').trim(),
    open: allDay ? '00:00' : open,
    close: allDay ? '24:00' : close,
    hours,
    until: allDay ? '24시간' : close ? `${overnight ? '익일 ' : ''}${close}까지` : '',
    fan: fans[0],
    fans,
    walk: walkMin != null ? `도보 ${walkMin}분` : undefined,
    walkMin,
    localRank: num(it.ccgSaleRnk),
    allRank: num(it.allSaleRnk),
    local: it.loclPrsnPpltYn === true,
    party: it.empyVsitYn === true,
    foreign: it.frnrVsitYn === true,
    busyDay: str(it.congestionDwk),
    busyTime: str(it.congestionTizn),
    closedDays: Array.isArray(it.hldyDwk) ? it.hldyDwk.filter((d): d is string => typeof d === 'string') : [],
    lat: num(it._lat),
    lng: num(it._lng),
    tags: Array.isArray(it._tags) ? (it._tags as string[]) : [],
    reason: str(it._reason) ?? '',
    reasonBy: it._reasonBy,
    url: str(it.merUrl) ?? '',
  };
}

export const toViews = (items: EatplItem[]) => items.map(toView);
