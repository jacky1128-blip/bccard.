import type { Mode } from '@/types/group';

// 상황별 설정: 화면 문구, 잇플 조건, 기본값 (와이어프레임 기준)
export type ModeConfig = {
  label: string;          // 오늘 밥 한 끼
  short: string;          // 탭용 짧은 이름
  defaultHeadcount: number;
  deadline: string;       // 투표 마감 기본값
  event: string;          // 기본 모임 이름
  place: string;          // 기본 장소
  when: string;           // 기본 일시
  crit: string;           // 이 상황의 잇플 기준
  ask: string;            // 초대 화면 질문
  placeNote: string;      // 장소 기준 설명
  showMid: boolean;       // "중간에서 만나요" 선택지 노출
  homeTitle: string;      // 첫 화면 시트 큰 제목 · 상황마다 바뀜 (혼자/여럿이 구분)
  cta: string;            // 첫 화면 하단 버튼
  ctaSub: string;         // 하단 버튼 아래 설명
  ctaHref: string;
  boxTitle: string;       // 순위 화면 하단 안내 박스
  boxSub: string;
  boxBtn: string;
  boxHref: string;
};

export const MODE_ORDER: Mode[] = ['meal', 'party', 'event', 'travel'];

// 위치를 모를 때 기본 장소 (첫 화면·순위)
export const DEFAULT_PLACE = '역삼역';

export const MODES: Record<Mode, ModeConfig> = {
  meal: {
    label: '오늘 밥 한 끼', short: '밥 한 끼', defaultHeadcount: 2, deadline: '식사 30분 전',
    event: '[우리] 오늘 밥 한 끼', place: '역삼역', when: '오늘 12:00',
    crit: '동네 메뉴별 매출 1위 · 지금 시간대 혼잡도 · 도보 거리', ask: '뭐 먹을까요?',
    placeNote: '내 위치 기준 · 가장 가까운 역', showMid: true,
    homeTitle: '혼자 지금 바로 갈 곳',
    cta: '지금 갈 식당 추천받기', ctaSub: 'AI가 영업 시간과 거리, 예상 혼잡도까지 따져서 골라드려요', ctaHref: '/pick?mode=meal',
    boxTitle: '같이 먹을 사람 있어요?', boxSub: '링크 하나 보내면 다 같이 투표로 정할 수 있어요.',
    boxBtn: '투표할 방 만들기', boxHref: '/group/new?mode=meal',
  },
  party: {
    label: '회식·모임', short: '회식·모임', defaultHeadcount: 6, deadline: '모임 전날 18:00',
    event: '[과] 종강총회', place: '강남역', when: '11/14(금) 19:00',
    crit: '회식 적합 · 단체석 · 모임 시간대 혼잡도', ask: '어디서 할까요?',
    placeNote: '고른 장소 기준', showMid: true,
    homeTitle: '여럿이 함께 정할 회식 장소',
    cta: '투표할 방 만들기', ctaSub: '날짜와 시간만 고르면 단톡에 보낼 링크가 나와요', ctaHref: '/group/new?mode=party',
    boxTitle: '이 중에서 단톡 투표로 정할래요?', boxSub: '장소·상황은 자동 입력. 날짜와 시간만 고르면 링크가 나와요.',
    boxBtn: '투표할 방 만들기', boxHref: '/group/new?mode=party',
  },
  event: {
    label: '경기·공연 전후', short: '경기 전후', defaultHeadcount: 2, deadline: '시작 1시간 전',
    event: '[콘서트] 끝나고 한 끼', place: '잠실종합운동장', when: '11/15(토) 22:00',
    crit: '공연장 근처 · 심야·24시간 · 끝나고도 영업', ask: '끝나고 어디 갈까요?',
    placeNote: '고른 공연장·경기장 기준', showMid: false,
    homeTitle: '경기·공연 끝나고 갈 곳',
    cta: '경기·공연 일정 불러오기', ctaSub: '끝나는 시간에도 영업하는, 결제 많은 식당을 보여드려요', ctaHref: '/event',
    boxTitle: '끝나는 시간에 맞춰 볼래요?', boxSub: '공연·경기를 고르면 끝난 뒤에도 문 연 곳만 보여드려요.',
    boxBtn: '공연·경기 고르기', boxHref: '/event',
  },
  travel: {
    label: '여행', short: '여행', defaultHeadcount: 2, deadline: '출발 전날 21:00',
    event: '[부산] 여행 첫 끼', place: '부산역', when: '11/18(화) 12:30 도착',
    crit: '현지인 결제 동네맛집 · 도착 시간대 영업', ask: '도착하면 어디로?',
    placeNote: '도착역 기준', showMid: false,
    homeTitle: '도착해서 갈 현지인 맛집',
    cta: '도착역·시간 입력', ctaSub: '관광객 말고, 현지인 결제가 많은 곳을 찾아요', ctaHref: '/travel',
    boxTitle: '도착 시간에 맞춰 볼래요?', boxSub: '도착역과 시간을 넣으면 그 시간에 문 연 현지인 맛집만 보여드려요.',
    boxBtn: '도착역·시간 입력', boxHref: '/travel',
  },
};

export const isMode = (v: unknown): v is Mode => typeof v === 'string' && v in MODES;
export const toMode = (v: unknown, fallback: Mode = 'meal'): Mode => (isMode(v) ? v : fallback);
