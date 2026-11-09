// B1 같이 정하기
import { Suspense } from 'react';
import CreateForm from '@/components/CreateForm';
import { toMode } from '@/lib/modes';
import { dbConfigured } from '@/lib/db';
import { q, type SP } from '@/lib/params';

export const metadata = { title: '같이 정하기' };

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const mode = toMode(q(sp, 'mode'), 'party');
  return <CreateForm initialMode={mode} initialPlace={q(sp, 'place')} back={q(sp, 'from') ?? `/?mode=${mode}${q(sp, 'place') ? `&place=${encodeURIComponent(q(sp, 'place')!)}` : ''}`} live={dbConfigured()} />;
}

export default function Page({ searchParams }: PageProps<'/group/new'>) {
  return (
    <Suspense fallback={null}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
