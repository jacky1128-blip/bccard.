// A1 전체 결제 순위 (내 위치 기준)
import { Suspense } from 'react';
import RankingView from '@/components/RankingView';
import SourceNote from '@/components/SourceNote';
import { Page as Shell } from '@/components/ui';
import { toMode } from '@/lib/modes';
import { mockViewsByMode } from '@/lib/mock';
import { q, type SP } from '@/lib/params';

export const metadata = { title: '결제 순위' };

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const mode = toMode(q(await searchParams, 'mode'));
  return <RankingView initialMode={mode} storesByMode={mockViewsByMode()} />;
}

export default function Page({ searchParams }: PageProps<'/ranking'>) {
  return (
    <Shell>
      <Suspense fallback={null}>
        <Content searchParams={searchParams} />
      </Suspense>
      <SourceNote />
    </Shell>
  );
}
