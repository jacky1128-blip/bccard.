// A1 전체 결제 순위 (기본 장소 또는 ?place=)
import { Suspense } from 'react';
import { connection } from 'next/server';
import RankingView from '@/components/RankingView';
import SourceNote from '@/components/SourceNote';
import { Page as Shell } from '@/components/ui';
import { DEFAULT_PLACE, toMode } from '@/lib/modes';
import { getStoresByMode, nearbyStations } from '@/lib/stores';
import { kstNow } from '@/lib/time';
import { q, type SP } from '@/lib/params';

export const metadata = { title: '결제 순위' };

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  await connection();
  const mode = toMode(q(sp, 'mode'));
  const place = q(sp, 'place');
  const { minutes, dow } = kstNow();
  const r = await getStoresByMode(place ?? DEFAULT_PLACE, { at: minutes, day: dow, limit: 10 });
  const nearby = r.center ? await nearbyStations(r.center, r.label) : [];
  return <RankingView initialMode={mode} storesByMode={r.storesByMode} fixedPlace={place ? r.label : undefined} placeLabel={r.label} nearby={nearby} center={r.center} live={r.live} notFound={r.notFound} />;
}

export default function Page({ searchParams }: PageProps<'/ranking'>) {
  return (
    <Shell wide className="lg:max-w-[1240px]">
      <Suspense fallback={null}>
        <Content searchParams={searchParams} />
      </Suspense>
      <SourceNote />
    </Shell>
  );
}
