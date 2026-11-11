// B2~B5 모임 화면 (상태에 따라 참여 / 대기 / 투표 / 확정)
// DB(Supabase) 연결 정보가 있으면 DB의 모임, 없으면 주소의 값으로 화면 데모
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import GroupRoom from '@/components/GroupRoom';
import type { GroupState } from '@/types/group';
import { MODES, toMode } from '@/lib/modes';
import { getCandidates } from '@/lib/stores';
import { formatWhen, getGroupPublic } from '@/lib/groups';
import { dbConfigured } from '@/lib/db';
import { MAX_HEADCOUNT, voteThreshold } from '@/lib/rules';
import { dayOfDate, toMinutes } from '@/lib/time';
import { q, type SP } from '@/lib/params';

async function Room({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params;
  const sp = await searchParams;

  if (dbConfigured()) {
    const g = await getGroupPublic(id);
    if (g) return <GroupRoom initial={g} live />;
    if (!q(sp, 'mode')) notFound();
  }

  // 데모: 주소에 담긴 값으로 모임 흉내
  const mode = toMode(q(sp, 'mode'), 'party');
  const m = MODES[mode];
  const headcount = Math.max(2, Math.min(MAX_HEADCOUNT, Number(q(sp, 'headcount')) || m.defaultHeadcount));
  const date = q(sp, 'date');
  const time = q(sp, 'time');
  const when = formatWhen(date, time) || m.when;
  const r = await getCandidates({
    place: q(sp, 'place') ?? m.place, mode, at: toMinutes(time) ?? undefined, day: dayOfDate(date),
    limit: 3, maxWalk: 20, when, headcount, now: false, stayMin: 60,
  });
  const host = q(sp, 'host') === '1';
  const initial: GroupState = {
    id, mode, title: q(sp, 'title') ?? m.event, place: r.label, when, memo: q(sp, 'memo'), mid: q(sp, 'mid') === '1',
    headcount, status: 'waiting', need: voteThreshold(headcount),
    participants: [{ name: '방', isHost: true }], stores: r.stores, votes: {}, totalVotes: 0,
    me: { joined: host, isHost: host },
  };
  return <GroupRoom initial={initial} live={false} />;
}

export default function Page(props: PageProps<'/g/[id]'>) {
  return (
    <Suspense fallback={null}>
      <Room params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
