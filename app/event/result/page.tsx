// C2 끝나고 문 연 곳
import { Suspense } from 'react';
import ResultView from '@/components/ResultView';
import { MODES } from '@/lib/modes';
import { mockItems } from '@/lib/mock';
import { toViews } from '@/lib/view';
import { isOpenAtMinutes, toMinutes } from '@/lib/time';
import { q, type SP } from '@/lib/params';

export const metadata = { title: '끝나고 문 연 곳' };

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const place = q(sp, 'place') ?? MODES.event.place;
  const after = q(sp, 'timing') !== 'before';
  const time = q(sp, 'time') && toMinutes(q(sp, 'time')) != null ? q(sp, 'time')! : '22:00';
  const hour = time.slice(0, 2).replace(/^0/, '');
  const at = toMinutes(time)!;

  const stores = toViews(mockItems('event', 5))
    .filter((s) => isOpenAtMinutes(s.open, s.close, at) !== false)
    .slice(0, 3);

  return (
    <ResultView
      back="/event"
      kicker={`경기·공연 전후 · ${after ? '끝나고' : '시작 전'}`}
      title={
        <>
          {place}
          <br />
          {after ? `${hour}시 이후에도 문 연 곳` : `${hour}시 전에 들를 곳`}
        </>
      }
      stats={[[after ? '종료 예상' : '시작', time], ['거리', '도보 15분 안'], ['정렬', '매출 높은 순']]}
      notice={after ? `끝난 직후 ${hour}시대는 공연장 근처가 붐벼요 · 혼잡 낮은 순으로 보기` : undefined}
      stores={stores}
      highlight={(s) => s.until}
      altTime={(s) => s.until}
      groupHref="/group/new?mode=event&from=/event"
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
