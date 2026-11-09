// A1 역 × 상황 순위 (검색 유입용, 서버 렌더링)
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import RankingView from '@/components/RankingView';
import SourceNote from '@/components/SourceNote';
import { Page as Shell } from '@/components/ui';
import { MODES, isMode } from '@/lib/modes';
import { mockViewsByMode } from '@/lib/mock';

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
  const name = decodeURIComponent(place);
  return <RankingView initialMode={mode} storesByMode={mockViewsByMode()} fixedPlace={name} />;
}

export default function Page({ params }: PageProps<'/r/[place]/[mode]'>) {
  return (
    <Shell>
      <Suspense fallback={null}>
        <Content params={params} />
      </Suspense>
      <SourceNote />
    </Shell>
  );
}
