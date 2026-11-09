// 코드로 하는 후보 고르기: 영업시간 · 혼잡 · 못 먹는 거 · 거리 + 상황별 가산점 → 상위 N
// AI는 여기서 고른 가게의 "이유"만 쓰고, 가게 선택은 항상 이 규칙이 함.
import type { EatplItem } from '@/types/eatpl';
import type { Mode } from '@/types/group';
import { isOpenAtMinutes, timeBucket, toMinutes } from './time';
import { fanLabel, isAllDay } from './view';

// 한 끼 서비스라 식사가 아닌 업종은 뺌
const NOT_MEAL = /카페|커피|디저트|베이커리|제과|빵|아이스크림|빙수|음료|주스|차 ?전문|떡집|편의점|도넛|와플|케이크|마카롱/;

// 못 먹는 거 → 빼는 업종 (업종 이름만으로 판단, 메뉴 정보는 없음)
export const CANT_RULES: Record<string, RegExp> = {
  '매운 거': /마라|떡볶이|낙지|쭈꾸미|주꾸미|짬뽕|닭발|불닭|매운|훠궈|찜닭|김치찜|아구찜|아귀찜/,
  해산물: /횟집|생선회|^회$|스시|초밥|해산물|해물|조개|생선|수산|대게|킹크랩|굴|낙지|오징어|아구|아귀|복어|장어|참치|쭈꾸미|주꾸미|새우|게장|매운탕|물회/,
  '술 못 마심': /주점|호프|이자카야|포차|술집|와인|맥주|막걸리|칵테일|^바$|펍|요리주점/,
};

export type PickOptions = {
  mode: Mode;
  at?: number;            // 기준 시각(분). 없으면 시간 조건 없이
  day?: string;           // 기준 요일 '금'
  cantEat?: string[];
  limit?: number;
  maxWalk?: number;       // 도보 분 상한
  after?: boolean;        // 경기·공연 끝나고: 기준 시각 이후 1시간 이상 영업해야 함
};

const closeAfter = (it: EatplItem, at: number, minutes: number) => {
  if (isAllDay(it.srtTime, it.endTime)) return true;
  const s = toMinutes(it.srtTime);
  const e = toMinutes(it.endTime);
  if (s == null || e == null) return false;
  const end = e <= s ? e + 1440 : e;            // 자정 넘김
  const now = at < s && e <= s ? at + 1440 : at; // 새벽 시간대
  return end - now >= minutes;
};

export const isBusyAt = (it: EatplItem, at?: number, day?: string) =>
  at != null && !!it.congestionTizn && it.congestionTizn === timeBucket(at) && (!day || !it.congestionDwk || it.congestionDwk === day);

export function passes(it: EatplItem, o: PickOptions) {
  const cat = it.merTpbuzNm ?? '';
  if (NOT_MEAL.test(cat)) return false;
  for (const c of o.cantEat ?? []) if (CANT_RULES[c]?.test(cat)) return false;
  if (o.day && it.hldyDwk?.includes(o.day)) return false;
  if (o.at != null && isOpenAtMinutes(it.srtTime, it.endTime, o.at) === false) return false;
  if (o.after && o.at != null && !closeAfter(it, o.at, 60)) return false;
  if (o.maxWalk != null && (it._walkMin ?? 0) > o.maxWalk) return false;
  return true;
}

// 점수가 낮을수록 위. 기본은 잇플 매출 순위(응답 순서), 상황별로 가감
function score(it: EatplItem, idx: number, o: PickOptions) {
  let s = idx;
  const walk = it._walkMin ?? 10;
  if (walk > 10) s += Math.ceil((walk - 10) / 5) * 3;
  if (isBusyAt(it, o.at, o.day)) s += 5;
  if (o.mode === 'party' && it.empyVsitYn) s -= 8;
  if ((o.mode === 'travel' || o.mode === 'meal') && it.loclPrsnPpltYn) s -= 6;
  // 오늘 밥 한 끼 · 낮 시간은 술집을 뒤로 (다른 후보가 없으면 그래도 나옴)
  if ((o.mode === 'meal' || (o.at != null && o.at < 17 * 60 && o.mode !== 'party')) && CANT_RULES['술 못 마심'].test(it.merTpbuzNm ?? '')) s += 10;
  if (o.mode === 'event' && o.at != null && closeAfter(it, o.at, 180)) s -= 4;
  return s;
}

export function pickCandidates(items: EatplItem[], o: PickOptions): EatplItem[] {
  return items
    .map((it, idx) => ({ it, idx }))
    .filter(({ it }) => passes(it, o))
    .sort((a, b) => score(a.it, a.idx, o) - score(b.it, b.idx, o))
    .slice(0, o.limit ?? 3)
    .map(({ it }) => ({ ...it, _tags: tagsFor(it, o) }));
}

/* ---------- 태그 · 규칙 기반 이유 (잇플 필드만 사용) ---------- */

export function tagsFor(it: EatplItem, o: Pick<PickOptions, 'mode' | 'at' | 'day'>): string[] {
  const tags: string[] = [];
  if (it.empyVsitYn) tags.push('회식 적합');
  if (it.loclPrsnPpltYn) tags.push('동네맛집');
  if (it.frnrVsitYn) tags.push('외국인 많이 와요');
  if (o.at != null) {
    if (isBusyAt(it, o.at, o.day)) tags.push('붐비는 시간대');
    else if (it.congestionTizn) tags.push('덜 붐비는 시간');
  } else if (it.congestionDwk && it.congestionTizn) {
    tags.push(`${it.congestionDwk} ${it.congestionTizn} 붐벼요`);
  }
  if (isAllDay(it.srtTime, it.endTime)) tags.push('24시간');
  return tags.slice(0, 3);
}

const pct = (n?: number) => (n == null ? undefined : `${n}%`);

// 받침 있으면 '이라', 없으면 '라' (점심이라 · 심야라)
const iRa = (w: string) => {
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  return c >= 0 && c < 11172 && c % 28 !== 0 ? '이라' : '라';
};

export function ruleReason(it: EatplItem, o: { mode: Mode; at?: number; day?: string; area?: string }): string {
  const parts: string[] = [];
  const cat = it.merTpbuzNm ? `${it.merTpbuzNm} ` : '';
  if (it.ccgSaleRnk != null) parts.push(`${o.area ? `${o.area} ` : ''}${cat}결제 지역 상위 ${pct(it.ccgSaleRnk)}예요.`);
  if (o.mode === 'party' && it.empyVsitYn) parts.push('회식 적합으로 분류된 곳이에요.');
  else if (it.loclPrsnPpltYn && (o.mode === 'travel' || o.mode === 'meal')) parts.push('동네 사람들이 실제로 많이 결제하는 동네맛집이에요.');
  if (o.at != null && it.congestionTizn) {
    parts.push(isBusyAt(it, o.at, o.day) ? `${it.congestionTizn} 시간대가 가장 붐벼요.` : `가장 붐비는 건 ${it.congestionDwk ?? ''} ${it.congestionTizn}${iRa(it.congestionTizn)} 이 시간은 비교적 여유 있어요.`.replace('  ', ' '));
  }
  const fan = fanLabel(it.vistCstmrRnkList?.rk01);
  if (fan && parts.length < 3) parts.push(`${fan} 손님이 가장 많아요.`);
  return parts.slice(0, 3).join(' ');
}

/* ---------- 순위 화면용: 응답 하나로 상황 4개 목록 ---------- */

export function rankForMode(items: EatplItem[], mode: Mode, o: { at?: number; day?: string; limit?: number } = {}): EatplItem[] {
  const base = items.filter((it) => !NOT_MEAL.test(it.merTpbuzNm ?? ''));
  const sorted = [...base].sort((a, b) => {
    const boost = (it: EatplItem) =>
      (mode === 'party' && it.empyVsitYn ? -1 : 0) +
      ((mode === 'travel' || mode === 'meal') && it.loclPrsnPpltYn ? -1 : 0) +
      (mode === 'event' && (isAllDay(it.srtTime, it.endTime) || (toMinutes(it.endTime) ?? 0) <= (toMinutes(it.srtTime) ?? 0)) ? -1 : 0);
    return boost(a) - boost(b); // 같은 그룹 안에서는 원래 매출 순서 유지 (stable sort)
  });
  return sorted.slice(0, o.limit ?? 10).map((it) => ({ ...it, _tags: tagsFor(it, { mode, at: o.at, day: o.day }), _reason: ruleReason(it, { mode, at: o.at, day: o.day }), _reasonBy: 'rule' as const }));
}
