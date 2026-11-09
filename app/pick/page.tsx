// A2 AI 추천 · 지금 갈 만한 곳
import { Suspense } from 'react';
import Link from 'next/link';
import StoreCard from '@/components/StoreCard';
import { AltRow } from '@/components/StoreRow';
import SourceNote from '@/components/SourceNote';
import { BrandHeader, Page as Shell, PageTitle, Section, btn } from '@/components/ui';
import { MODES, toMode } from '@/lib/modes';
import { mockItems } from '@/lib/mock';
import { toViews } from '@/lib/view';
import { q, type SP } from '@/lib/params';

export const metadata = { title: 'AI 추천' };

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const mode = toMode(q(await searchParams, 'mode'));
  const m = MODES[mode];
  const [first, ...alts] = toViews(mockItems(mode, 3));

  return (
    <>
      <BrandHeader back={`/?mode=${mode}`} />
      <PageTitle
        kicker="AI 추천 · 지금 시간 기준 영업 · 혼잡 · 거리까지"
        title={
          <>
            {m.place} 근처
            <br />
            지금 갈 만한 곳
          </>
        }
        desc={`${m.label} · 결제 순위를 지금 상황에 맞춰 다시 골랐어요`}
      />
      <Section title="지금 1순위">
        <StoreCard store={first} reason />
      </Section>
      <Section title="여기가 아니라면">
        {alts.map((s) => <AltRow key={s.key} store={s} />)}
      </Section>
      <div className="flex flex-col gap-2">
        <Link href={`/ranking?mode=${mode}`} className={btn.outline}>전체 결제 순위 보기</Link>
        <Link href={`/group/new?mode=${mode}`} className={btn.outline}>같이 먹을 사람 있으면 · 같이 정하기</Link>
      </div>
    </>
  );
}

export default function Page({ searchParams }: PageProps<'/pick'>) {
  return (
    <Shell>
      <Suspense fallback={null}>
        <Content searchParams={searchParams} />
      </Suspense>
      <SourceNote ai />
    </Shell>
  );
}
