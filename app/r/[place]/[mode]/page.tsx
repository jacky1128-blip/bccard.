// A1 역 × 상황 순위 (검색 유입용)
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import RankingView from '@/components/RankingView';
import SourceNote from '@/components/SourceNote';
import { Page as Shell } from '@/components/ui';
import { MODES, isMode } from '@/lib/modes';
import { getStoresByMode, nearbyStations } from '@/lib/stores';
import { kstNow } from '@/lib/time';

type P = PageProps<'/r/[place]/[mode]'>['params'];

export function generateStaticParams() {
  return [{ place: '강남역', mode: 'party' }, { place: '역삼역', mode: 'meal' }];
}

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { place, mode } = await params;
  if (!isMode(mode)) return {};
  const name = decodeURIComponent(place);
  return {
    title: `${name} 근처 ${MODES[mode].label} 결제 순위`,
    description: `${name} 근처 ${MODES[mode].label}, 리뷰 말고 최근 1개월 BC카드 결제 기준 순위예요.`,
  };
}

async function Content({ params }: { params: P }) {
  const { place, mode } = await params;
  if (!isMode(mode)) notFound();
  await connection();
  const name = decodeURIComponent(place);
  const { minutes, dow } = kstNow();
  const r = await getStoresByMode(name, { at: minutes, day: dow, limit: 10 });
  const nearby = r.center ? await nearbyStations(r.center, r.label) : [];
  return <RankingView initialMode={mode} storesByMode={r.storesByMode} fixedPlace={r.label} placeLabel={r.label} nearby={nearby} center={r.center} live={r.live} />;
}

export default function Page({ params }: PageProps<'/r/[place]/[mode]'>) {
  return (
    <Shell wide className="lg:max-w-[1240px]">
      <Suspense fallback={null}>
        <Content params={params} />
      </Suspense>
      <SourceNote />
    </Shell>
  );
}
