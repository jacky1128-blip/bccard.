// B2~B5 모임 화면 (상태에 따라 참여 / 대기 / 투표 / 확정)
import { Suspense } from 'react';
import GroupRoom from '@/components/GroupRoom';
import { MODES, toMode } from '@/lib/modes';
import { mockItems } from '@/lib/mock';
import { toViews } from '@/lib/view';
import { q, type SP } from '@/lib/params';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 2026-11-14 + 19:00 → 11/14(금) 19:00
function formatWhen(date?: string, time?: string) {
  if (!date) return time;
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return time;
  return `${d.getMonth() + 1}/${d.getDate()}(${DAYS[d.getDay()]})${time ? ` ${time}` : ''}`;
}

async function Room({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params;
  const sp = await searchParams;
  const mode = toMode(q(sp, 'mode'), 'party');
  const m = MODES[mode];
  const headcount = Math.max(2, Math.min(12, Number(q(sp, 'headcount')) || m.defaultHeadcount));
  return (
    <GroupRoom
      id={id}
      mode={mode}
      host={q(sp, 'host') === '1'}
      title={q(sp, 'title') ?? m.event}
      place={q(sp, 'place') ?? m.place}
      when={formatWhen(q(sp, 'date'), q(sp, 'time')) ?? m.when}
      headcount={headcount}
      stores={toViews(mockItems(mode, 3))}
    />
  );
}

export default function Page(props: PageProps<'/g/[id]'>) {
  return (
    <Suspense fallback={null}>
      <Room params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
