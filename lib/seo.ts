// 검색·AI 검색(GEO)용 공통: 사이트 주소, 구조화 데이터 조각, FAQ
import type { StoreView } from './view';

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '');
export const hasSite = () => /^https?:\/\/[^/]+/.test(SITE);
// 절대 주소 (사이트 주소가 없으면 상대 주소)
export const abs = (path: string) => (hasSite() ? `${SITE}${path}` : path);

// 한국 날짜 "2026-11-24"
export function kstDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
// "2026-11-24" → "2026년 11월 24일"
export const koDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
};

// 한글 받침에 맞는 조사 ("맛집"+은/는 → "맛집은", "장소"+은/는 → "장소는"). 한글이 아니면 뒤 형태
export function josa(word: string, withBatchim: string, without: string) {
  const c = word.trim().charCodeAt(word.trim().length - 1);
  if (c < 0xac00 || c > 0xd7a3) return `${word}${without}`;
  return `${word}${(c - 0xac00) % 28 ? withBatchim : without}`;
}

// 가게 한 곳 → schema.org Restaurant
export function restaurantLd(s: StoreView) {
  return {
    '@type': 'Restaurant',
    name: s.name,
    ...(s.cat ? { servesCuisine: s.cat } : {}),
    ...(s.address ? { address: { '@type': 'PostalAddress', streetAddress: s.address, addressCountry: 'KR' } } : {}),
    ...(s.lat != null && s.lng != null ? { geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng } } : {}),
    ...(s.url ? { url: s.url } : {}),
  };
}

// 순위 목록 → schema.org ItemList
export function itemListLd(name: string, description: string, stores: StoreView[], url?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description,
    ...(url ? { url: abs(url) } : {}),
    numberOfItems: stores.length,
    itemListElement: stores.map((s, i) => ({ '@type': 'ListItem', position: s.rank || i + 1, item: restaurantLd(s) })),
  };
}

export type QA = { q: string; a: string };

export function faqLd(items: QA[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })),
  };
}

export function breadcrumbLd(items: [name: string, path: string][]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })),
  };
}

// 서비스 소개 FAQ (/faq 페이지와 llms.txt 에 같이 씀)
// AI 답변에 그대로 인용되기 좋게: 질문은 사람들이 실제로 묻는 말, 답은 첫 문장에 결론
export const SERVICE_FAQ: QA[] = [
  {
    q: '밥콕은 어떤 서비스예요?',
    a: '밥콕은 BC카드 eat.pl(잇플) 결제 데이터로 지금 갈 만한 식당을 골라 주는 무료 웹 서비스예요. 리뷰 대신 최근 1개월 실제 카드 결제 순위를 보고, 친구들과 링크 하나로 투표해서 모임 장소를 정할 수 있어요.',
  },
  {
    q: '모임 장소는 어떻게 정해요?',
    a: '밥콕에서 장소와 날짜·시간을 고르면 결제 데이터로 후보 식당 3곳을 뽑아 줘요. 투표방 링크를 단톡방에 보내면 친구들이 가입 없이 들어와 투표하고, 방장이 확정하면 끝이에요.',
  },
  {
    q: '친구들이 사는 곳이 다 다를 때 중간 지점은 어떻게 정해요?',
    a: '밥콕의 "중간에서 만나요"를 켜면 각자 출발역을 넣고, 가장 오래 걸리는 사람의 이동 시간이 가장 짧은 역을 추천해요. 그 역 근처에서 결제가 많은 식당을 후보로 보여 줘요.',
  },
  {
    q: '리뷰 맛집 순위와 뭐가 달라요?',
    a: '광고나 조작된 리뷰 대신 BC카드로 실제 결제된 매출을 기준으로 줄을 세워요. 그 동네 같은 업종 안에서 매출이 상위 몇 %인지, 회식 손님이 많은지, 동네 주민이 자주 가는지도 결제 데이터로 보여 줘요.',
  },
  {
    q: '회식 장소는 어떻게 골라요?',
    a: '밥콕의 회식·모임 순위는 직장인 단체 결제가 많은 "회식 적합" 식당을 먼저 보여 줘요. 가장 붐비는 요일과 시간대도 같이 보여 줘서 예약 시간을 잡기 쉬워요.',
  },
  {
    q: '야구·콘서트 끝나고 갈 식당도 찾을 수 있어요?',
    a: '네. 경기·공연 전후 모드에서 경기장이나 공연장을 고르면, 끝나는 시간 이후에도 결제 기록이 있는 식당만 골라 보여 줘요.',
  },
  {
    q: '여행 가서 현지인 맛집을 찾을 수 있어요?',
    a: '여행 모드에 도착역과 도착 시간을 넣으면 그 시간에 문을 연, 동네 주민 결제 비중이 높은 식당을 보여 줘요. 관광객 위주 가게 말고 현지인이 가는 곳을 찾을 때 좋아요.',
  },
  {
    q: '영업시간과 혼잡도는 정확해요?',
    a: '영업시간과 붐비는 시간대는 결제가 찍힌 시각으로 추정한 값이에요. 실시간 정보는 아니니 가기 전에 가게에 한 번 확인하는 게 좋아요.',
  },
  {
    q: '가입하거나 앱을 깔아야 해요?',
    a: '아니요. 밥콕은 웹 서비스라 앱 설치나 회원가입 없이 바로 쓸 수 있어요. 투표방에 들어온 친구도 가입 없이 투표해요.',
  },
  {
    q: '이용료가 있어요?',
    a: '없어요. 밥콕은 무료로 쓸 수 있어요.',
  },
];
