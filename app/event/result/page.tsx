// C2 끝나고 문 연 곳 (경기·공연장 근처 · 끝나는 시간 이후 1시간 이상 영업 · 도보 15분 안)
import { Suspense } from 'react';
import ResultView from '@/components/ResultView';
import { MODES } from '@/lib/modes';
import { getCandidates } from '@/lib/stores';
import { dayOfDate, toMinutes } from '@/lib/time';
import { q, type SP } from '@/lib/params';

export const metadata = { title: '끝나고 문 연 곳' };

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const place = q(sp, 'place') ?? MODES.event.place;
  const after = q(sp, 'timing') !== 'before';
  const time = q(sp, 'time') && toMinutes(q(sp, 'time')) != null ? q(sp, 'time')! : '22:00';
  const date = q(sp, 'date');
  const hour = time.slice(0, 2).replace(/^0/, '');
  const at = toMinutes(time)!;

  const r = await getCandidates({
    place, mode: 'event', at, day: dayOfDate(date), after, maxWalk: 15, limit: 3,
    when: `${date ?? ''} ${after ? '끝나는 시간' : '시작 시간'} ${time}`.trim(),
  });

  return (
    <ResultView
      back="/event"
      kicker={`경기·공연 전후 · ${after ? '끝나고' : '시작 전'}`}
      title={
        <>
          {r.label}
          <br />
          {after ? `${hour}시 이후에도 문 연 곳` : `${hour}시 전에 들를 곳`}
        </>
      }
      stats={[[after ? '종료 예상' : '시작', time], ['거리', '도보 15분 안'], ['정렬', '매출 높은 순']]}
      notice={after ? `공연 직후 ${hour}시에는 주변이 붐빌 수 있어요 · 혼잡 낮은 순으로 보여드려요` : undefined}
      stores={r.stores}
      demo={!r.live}
      highlight={(s) => s.until}
      altTime={(s) => s.until}
      groupHref={`/group/new?mode=event&from=/event&place=${encodeURIComponent(r.label)}`}
    />
  );
}

export default function Page({ searchParams }: PageProps<'/event/result'>) {
  return (
    <Suspense fallback={null}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
