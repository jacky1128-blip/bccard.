// A0 첫 화면 · 지도 + 상황 선택 + 결제 TOP 3 (잇플 실제 데이터, 실패 시 예시 데이터)
import { Suspense } from 'react';
import { connection } from 'next/server';
import HomeView from '@/components/HomeView';
import { DEFAULT_PLACE, toMode } from '@/lib/modes';
import { getStoresByMode } from '@/lib/stores';
import { kstNow } from '@/lib/time';
import { q, type SP } from '@/lib/params';

async function Home({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  await connection();
  const mode = toMode(q(sp, 'mode'));
  const { minutes, dow } = kstNow();
  const r = await getStoresByMode(q(sp, 'place') ?? DEFAULT_PLACE, { at: minutes, day: dow, limit: 3 });
  return <HomeView initialMode={mode} storesByMode={r.storesByMode} center={r.center} placeLabel={r.label} live={r.live} notFound={r.notFound} />;
}

export default function Page({ searchParams }: PageProps<'/'>) {
  return (
    <Suspense fallback={null}>
      <Home searchParams={searchParams} />
    </Suspense>
  );
}
