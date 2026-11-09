// D2 현지인 맛집
import { Suspense } from 'react';
import ResultView from '@/components/ResultView';
import { MODES } from '@/lib/modes';
import { mockItems } from '@/lib/mock';
import { toViews } from '@/lib/view';
import { isOpenAtMinutes, toMinutes } from '@/lib/time';
import { q, type SP } from '@/lib/params';

export const metadata = { title: '현지인 맛집' };

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const place = q(sp, 'place') ?? MODES.travel.place;
  const time = q(sp, 'time') && toMinutes(q(sp, 'time')) != null ? q(sp, 'time')! : '12:30';
  const at = toMinutes(time)!;

  let stores = toViews(mockItems('travel', 5)).filter((s) => isOpenAtMinutes(s.open, s.close, at) !== false);
  if (q(sp, 'near') === '1') stores = stores.filter((s) => (s.walkMin ?? 99) <= 10);
  stores = stores.slice(0, 3);

  return (
    <ResultView
      back="/travel"
      kicker={`여행 · 도착 ${time}`}
      title={
        <>
          {place} 도착하면
          <br />
          갈 만한 현지인 맛집
        </>
      }
      stats={[['도착', time], ['기준', q(sp, 'local') === '0' ? '결제 순위' : '현지인 결제'], ['거리', '역 근처']]}
      stores={stores}
      highlight={() => `${time} 영업 중`}
      groupHref="/group/new?mode=travel&from=/travel"
    />
  );
}

export default function Page({ searchParams }: PageProps<'/travel/result'>) {
  return (
    <Suspense fallback={null}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
