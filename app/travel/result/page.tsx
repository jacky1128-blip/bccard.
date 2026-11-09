// D2 현지인 맛집 (도착역 근처 · 도착 시간에 영업 · 동네맛집 우선)
import { Suspense } from 'react';
import ResultView from '@/components/ResultView';
import { MODES } from '@/lib/modes';
import { getCandidates } from '@/lib/stores';
import { dayOfDate, toMinutes } from '@/lib/time';
import { q, type SP } from '@/lib/params';

export const metadata = { title: '현지인 맛집' };

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const place = q(sp, 'place') ?? MODES.travel.place;
  const time = q(sp, 'time') && toMinutes(q(sp, 'time')) != null ? q(sp, 'time')! : '12:30';
  const date = q(sp, 'date');
  const near = q(sp, 'near') === '1';
  const local = q(sp, 'local') !== '0';

  const r = await getCandidates({
    place, mode: local ? 'travel' : 'meal', at: toMinutes(time)!, day: dayOfDate(date), maxWalk: near ? 10 : 20, limit: 3,
    when: `${date ?? ''} 도착 ${time}`.trim(),
  });

  return (
    <ResultView
      back="/travel"
      kicker={`여행 · 도착 ${time}`}
      title={
        <>
          {r.label} 도착하면
          <br />
          갈 만한 현지인 맛집
        </>
      }
      stats={[['도착', time], ['기준', local ? '현지인 결제' : '결제 순위'], ['거리', near ? '도보 10분 안' : '역 근처']]}
      stores={r.stores}
      demo={!r.live}
      highlight={() => `${time} 영업 중`}
      groupHref={`/group/new?mode=travel&from=/travel&place=${encodeURIComponent(r.label)}`}
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
