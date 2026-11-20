// 검색 유입용 가이드 (/guide/[slug])
// 제목은 사람들이 네이버·구글에 실제로 치는 문장으로. 목록은 잇플 결제 데이터로 매번 새로 뽑음
import type { Mode } from '@/types/group';
import { likelyOpenAt, type StoreView } from './view';

export type GuideFilter = 'late' | 'party' | 'local';

export type Guide = {
  slug: string;
  station: string;       // 잇플 검색 기준 장소
  mode: Mode;            // 어떤 상황 순위로 줄 세울지
  genre?: string;        // 업종만 따로 (잇플 업종명 그대로)
  filter?: GuideFilter;  // 순위에서 한 번 더 거르기
  title: string;         // h1 · 검색 결과 제목
  desc: string;          // 검색 결과 설명
  intro: string;         // 본문 첫 문단
};

export const GUIDES: Guide[] = [
  {
    slug: 'gangnam-hoesik',
    station: '강남역', mode: 'party', filter: 'party',
    title: '강남역 회식 장소 TOP 10',
    desc: '강남역 근처 회식하기 좋은 식당을 리뷰 말고 최근 1개월 BC카드 결제 순위로 골랐어요.',
    intro: '단체 손님 결제가 많은, 회식에 맞는 곳만 골랐어요. 붐비는 요일과 시간대도 같이 보고 예약 잡으세요.',
  },
  {
    slug: 'gangnam-hoesik-gogi',
    station: '강남역', mode: 'party', genre: '고기구이',
    title: '강남역 회식 고깃집 TOP 10',
    desc: '강남역 고깃집 중 최근 1개월 BC카드 결제가 많은 순서예요. 회식 장소 고를 때 참고하세요.',
    intro: '회식 1순위 메뉴, 고기구이만 따로 줄 세웠어요. 동네 고깃집 안에서의 결제 순위예요.',
  },
  {
    slug: 'yeoksam-jeomsim',
    station: '역삼역', mode: 'meal',
    title: '역삼역 점심 맛집 TOP 10',
    desc: '역삼역 직장인이 실제로 결제한 점심 맛집 순위. 최근 1개월 BC카드 결제 기준이에요.',
    intro: '역삼역 근처에서 결제가 가장 많은 식당이에요. 점심 피크를 피할 수 있게 붐비는 시간대도 적어 뒀어요.',
  },
  {
    slug: 'yeouido-hoesik',
    station: '여의도역', mode: 'party', filter: 'party',
    title: '여의도 회식 장소 TOP 10',
    desc: '여의도역 근처 회식하기 좋은 식당, 최근 1개월 BC카드 결제 순위로 골랐어요.',
    intro: '여의도 직장인 단체 결제가 많은 곳 위주예요. 회식 자리로 검증된 식당만 모았어요.',
  },
  {
    slug: 'jonggak-hoesik',
    station: '종각역', mode: 'party', filter: 'party',
    title: '종각역 회식 장소 TOP 10',
    desc: '종각·광화문 회식 장소를 리뷰 말고 최근 1개월 BC카드 결제 순위로 골랐어요.',
    intro: '종각역 근처 회식에 맞는 식당을 결제가 많은 순서로 모았어요.',
  },
  {
    slug: 'seongsu-late-night',
    station: '성수역', mode: 'meal', filter: 'late',
    title: '성수역 늦게까지 하는 식당 TOP 10',
    desc: '성수역 근처 밤 11시에도 결제가 이어지는 식당 순위. 최근 1개월 BC카드 결제 기준이에요.',
    intro: '밤 11시 무렵에도 결제 기록이 있는 곳만 골랐어요. 영업시간은 결제 기록으로 본 예상이라 가기 전에 한 번 확인하세요.',
  },
  {
    slug: 'hongdae-local',
    station: '홍대입구역', mode: 'meal', filter: 'local',
    title: '홍대입구역 동네 맛집 TOP 10',
    desc: '관광객 말고 동네 사람이 자주 결제하는 홍대입구역 맛집 순위예요.',
    intro: '근처 주민 결제 비중이 높은 "동네 맛집"만 골랐어요. 줄 서는 유명 가게 말고 단골이 많은 곳이에요.',
  },
  {
    slug: 'jamsil-after-game',
    station: '잠실종합운동장', mode: 'event', filter: 'late',
    title: '잠실 야구·콘서트 끝나고 갈 식당 TOP 10',
    desc: '잠실종합운동장 경기·공연 끝나고 밤 11시에도 문 연 식당을 BC카드 결제 순위로 골랐어요.',
    intro: '경기나 공연이 끝나는 밤 시간에도 결제가 이어지는 곳만 모았어요.',
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);

// 순위에서 가이드 조건으로 한 번 더 거르기
export function applyGuideFilter(stores: StoreView[], f?: GuideFilter): StoreView[] {
  if (f === 'late') return stores.filter((s) => likelyOpenAt(s.open, s.close, 23 * 60) === true);
  if (f === 'party') return stores.filter((s) => s.party);
  if (f === 'local') return stores.filter((s) => s.local);
  return stores;
}
