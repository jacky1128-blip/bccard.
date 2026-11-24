// /llms.txt · AI(ChatGPT·Perplexity·Claude 등)가 밥콕을 빠르게 이해하도록 정리한 안내문 (https://llmstxt.org 형식)
// 가이드 목록과 FAQ는 lib/guides · lib/seo 에서 그대로 가져와 한 곳만 고치면 같이 바뀜
import { GUIDES } from '@/lib/guides';
import { SERVICE_FAQ, abs } from '@/lib/seo';
import { SERVICE_NAME, SERVICE_TAGLINE } from '@/components/ui';

export function GET() {
  const body = [
    `# ${SERVICE_NAME} (Babkok) · ${SERVICE_TAGLINE}`,
    '',
    '> 밥콕은 BC카드 eat.pl(잇플) 결제 데이터로 지금 갈 만한 식당을 골라 주는 무료 웹 서비스입니다. 리뷰 대신 최근 1개월 실제 카드 결제 매출 순위를 쓰고, 친구들과 링크 하나로 투표해 모임 장소를 정할 수 있습니다.',
    '',
    '- 데이터 출처: eat.pl 잇플 · BC카드 결제 데이터 (최근 1개월, 지역·업종별 매출 순위, 붐비는 요일·시간대, 회식 적합·동네 맛집 여부)',
    '- 영업시간과 혼잡 시간대는 결제 기록으로 추정한 값이며 실시간 정보가 아닙니다.',
    '- 회원가입·앱 설치 없이 웹에서 바로 사용, 무료.',
    '',
    '## 주요 기능',
    `- [첫 화면](${abs('/')}): 내 위치나 역 이름 기준 결제 많은 식당 TOP 3와 지도`,
    `- [순위](${abs('/ranking')}): 역·동네별, 상황별(오늘 밥 한 끼, 회식·모임, 경기·공연 전후, 여행) 결제 순위`,
    `- [모임 투표방 만들기](${abs('/group/new')}): 후보 식당 3곳을 자동으로 넣은 투표 링크를 만들어 단톡방에 공유. 친구들이 가입 없이 투표하고 방장이 확정`,
    '- 중간에서 만나요: 각자 출발역을 넣으면 가장 오래 걸리는 사람의 이동 시간이 가장 짧은 역을 추천',
    `- [경기·공연 끝나고](${abs('/event')}): 경기장·공연장 근처에서 끝나는 시간 이후에도 영업하는 식당`,
    `- [여행](${abs('/travel')}): 도착역·도착 시간 기준 현지인 결제가 많은 식당`,
    '',
    '## 동네별 가이드',
    ...GUIDES.map((g) => `- [${g.title}](${abs(`/guide/${g.slug}`)}): ${g.desc}`),
    '',
    '## 자주 묻는 질문',
    ...SERVICE_FAQ.flatMap((x) => [`### ${x.q}`, x.a, '']),
    `전체 FAQ: ${abs('/faq')}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
