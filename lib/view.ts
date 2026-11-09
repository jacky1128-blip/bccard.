// 잇플 응답 한 건 → 화면에서 쓰는 형태 (필드명은 2026-11-09 실제 응답 기준으로 확정)
// 태그·영업시간 문구는 모두 여기서 만듦. 잇플 필드에 없는 내용(실시간 혼잡·좌석·메뉴 등)은 쓰지 않음
import type { EatplItem } from '@/types/eatpl';
import type { Mode } from '@/types/group';
import { hhmm, isOpenAtMinutes, timeBucket, toMinutes } from './time';

export type StoreView = {
  key: string;
  rank: number;
  name: string;
  cat: string;          // 업종
  address?: string;     // 괄호 뺀 도로명 주소
  open?: string;        // 영업 예상 시작 (원래 값, 영업 중 판단용)
  close?: string;       // 영업 예상 종료 (원래 값, 자정 넘김 가능)
  openAt?: string;      // 표시용 시작 시각 (30분 단위) "10:30"
  hours: string;        // 표시용 "영업 예상 10:30~22:00" / "영업시간 확인 필요" (30분 단위)
  until: string;        // 경기·공연 결과 배지 "22:00까지" (영업시간 불확실하면 빈칸)
  hoursUnsure?: boolean; // 하루 종일 결제 기록 → 실제 영업시간 모름
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

// 영업 예상 시간이 23시간 이상 = 하루 종일 결제 기록이 있음.
// 잇플은 하루를 06:00~다음날 05:59로 집계하는 것으로 보임 → 이런 가게가 역삼동 100곳 중 19곳이고 거의 다 "0600~0555" 꼴.
// 진짜 24시간 가게(해장국 등)와 배달·정산 때문에 새벽 결제가 찍힌 가게(치킨·샌드위치 등)를 구분할 수 없음 (2026-11-10 확인)
// → 화면엔 "영업시간 확인 필요", 영업 중 판단은 낮(06~22시)에만 연 것으로 봄
export const UNSURE_OPEN = 6 * 60;
export const UNSURE_CLOSE = 22 * 60;
export function isAllDay(srt?: string, end?: string) {
  const s = toMinutes(srt);
  const e = toMinutes(end);
  if (s == null || e == null) return false;
  const span = (e - s + 1440) % 1440;
  return span === 0 || span >= 23 * 60;
}

// 결제 승인 시각 기반 추정이라 분 단위가 애매함 → 30분 단위로 반올림 "1035" → "10:30"
export function roundHalfHour(t?: string) {
  const m = toMinutes(t);
  if (m == null) return undefined;
  const r = (Math.round(m / 30) * 30) % 1440;
  return `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`;
}

// 그 시각에 열었을지: true / false / null(영업시간 정보 없음)
export function likelyOpenAt(srt: string | undefined, end: string | undefined, at: number): boolean | null {
  if (isAllDay(srt, end)) return at >= UNSURE_OPEN && at < UNSURE_CLOSE;
  return isOpenAtMinutes(srt, end, at);
}

/* ---------- 태그 (잇플 필드 → 문구) ---------- */

export type TagContext = {
  mode: Mode;
  at?: number;          // 기준 시각(분)
  day?: string;         // 기준 요일 '금'
  now?: boolean;        // 기준 시각이 지금이면 "지금은"/"오늘이", 고른 시간이면 "그 시간은"/"그날이"
  peers?: EatplItem[];  // 같은 응답 전체 (업종 내 1위 판단)
};

// 같은 응답 안에서 같은 업종끼리 지역 매출 순위(ccgSaleRnk, 낮을수록 상위)를 비교해 1위인지
export function isTopInCategory(it: EatplItem, peers?: EatplItem[]) {
  if (!peers || !it.merTpbuzNm || it.ccgSaleRnk == null) return false;
  const same = peers.filter((p) => p.merTpbuzNm === it.merTpbuzNm && p.ccgSaleRnk != null);
  if (same.length < 2) return false; // 그 업종이 하나뿐이면 1위라고 하지 않음
  return same.every((p) => p.ccgSaleRnk! >= it.ccgSaleRnk!);
}

export function buildTags(it: EatplItem, o: TagContext): string[] {
  const local = it.loclPrsnPpltYn === true ? '동네맛집' : undefined;
  const party = it.empyVsitYn === true ? '회식 적합' : undefined;
  const top = isTopInCategory(it, o.peers) ? `이 동네 ${it.merTpbuzNm} 중 매출 1위` : undefined;
  const peak =
    o.at != null && it.congestionTizn
      ? it.congestionTizn === timeBucket(o.at)
        ? `${it.congestionTizn}에 가장 붐벼요`
        : `${o.now === false ? '그 시간은' : '지금은'} 붐비는 시간 아님`
      : undefined;
  const peakDay = o.day && it.congestionDwk === o.day ? `${o.now === false ? '그날이' : '오늘이'} 가장 붐비는 요일` : undefined;
  const closed = it.hldyDwk?.length ? `${it.hldyDwk.join('·')}요일 휴무` : undefined;
  const foreign = it.frnrVsitYn === true ? '외국인도 많이 와요' : undefined;
  // 상황에 맞는 것부터 (회식이면 회식 적합, 밥 한 끼·여행이면 동네맛집)
  const first = o.mode === 'party' ? [party, local] : [local, party];
  return [...first, top, peak, closed, peakDay, foreign].filter((x): x is string => !!x).slice(0, 4);
}

// 주소는 도로명 + 건물번호까지만 "부산 동구 중앙대로 175 12 3층 (초량동)" → "부산 동구 중앙대로 175"
export function shortAddress(addr?: string) {
  if (!addr) return undefined;
  const base = addr.replace(/\s*\(.*$/, '').replace(/,.*$/, '').trim();
  const m = base.match(/^(.*?(?:로|길)\s?\d+(?:-\d+)?)(?=\s|$)/);
  return (m ? m[1] : base).trim();
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
  // 영업 중 판단은 원래 값, 화면 표시는 30분 단위
  const open = roundHalfHour(it.srtTime);
  const close = roundHalfHour(it.endTime);
  const allDay = isAllDay(it.srtTime, it.endTime);
  const hours = allDay ? '영업시간 확인 필요' : open && close ? `영업 예상 ${open}~${close}` : '';
  const walkMin = num(it._walkMin);
  const rk = it.vistCstmrRnkList ?? {};
  const fans = [rk.rk01, rk.rk02, rk.rk03].map(fanLabel).filter((x): x is string => !!x);
  return {
    key: str(it._key) ?? (str(it.merUrl) || `${name}|${str(it.merAddr) ?? ''}`),
    rank: i + 1,
    name,
    cat: str(it.merTpbuzNm) ?? '',
    address: shortAddress(str(it.merAddr)),
    open: hhmm(it.srtTime),
    close: hhmm(it.endTime),
    openAt: allDay ? undefined : open,
    hours,
    until: allDay ? '' : close ? `${close}까지` : '',
    hoursUnsure: allDay,
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
