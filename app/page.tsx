// A0 첫 화면 · 지도 + 상황 선택 + 결제 TOP 3
import { Suspense } from 'react';
import HomeView from '@/components/HomeView';
import { toMode } from '@/lib/modes';
import { mockViewsByMode } from '@/lib/mock';
import { q, type SP } from '@/lib/params';

async function Home({ searchParams }: { searchParams: Promise<SP> }) {
  const mode = toMode(q(await searchParams, 'mode'));
  return <HomeView initialMode={mode} storesByMode={mockViewsByMode(3)} />;
}

export default function Page({ searchParams }: PageProps<'/'>) {
  return (
    <Suspense fallback={null}>
      <Home searchParams={searchParams} />
    </Suspense>
  );
}
