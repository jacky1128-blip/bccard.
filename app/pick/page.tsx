// A2 AI 추천 · 지금 갈 만한 곳 (지금 시각 · 영업 · 혼잡 · 거리 → 규칙으로 3곳, 이유는 AI)
import { Suspense } from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import StoreCard from '@/components/StoreCard';
import { AltRow } from '@/components/StoreRow';
import SourceNote from '@/components/SourceNote';
import DemoNote from '@/components/DemoNote';
import { BrandHeader, Page as Shell, PageTitle, Section, btn, t } from '@/components/ui';
import { DEFAULT_PLACE, MODES, toMode } from '@/lib/modes';
import { getCandidates } from '@/lib/stores';
import { addMinutes, kstNow } from '@/lib/time';
import { q, type SP } from '@/lib/params';

export const metadata = { title: 'AI 추천' };

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  await connection();
  const mode = toMode(q(sp, 'mode'));
  const m = MODES[mode];
  const place = q(sp, 'place') ?? DEFAULT_PLACE;
  const { minutes, dow } = kstNow();
  const now = addMinutes('00:00', minutes);
  const r = await getCandidates({ place, mode, at: minutes, day: dow, limit: 3, maxWalk: 20, stayMin: 30, when: `${dow}요일 지금 ${now}` });
  const [first, ...alts] = r.stores;
  const placeQs = q(sp, 'place') ? `&place=${encodeURIComponent(place)}` : '';

  return (
    <>
      <BrandHeader back={`/?mode=${mode}${placeQs}`} />
      <PageTitle
        kicker={`${m.label} · 지금 ${now} 기준`}
        title={
          <>
            {r.label} 근처
            <br />
            지금 갈 만한 곳
          </>
        }
        desc="결제 순위에 영업시간·거리·예상 혼잡을 반영했어요"
      />
      {!r.live && <DemoNote notFound={r.notFound} place={r.label} />}
      {first ? (
        // 모바일: 1순위 → 대안 세로 / 태블릿·PC: 왼쪽 1순위 크게, 오른쪽 대안 2곳 세로
        <div className="flex flex-col gap-5 md:grid md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:items-start md:gap-6">
          <Section title="지금 1순위">
            <StoreCard store={first} reason />
          </Section>
          {alts.length > 0 && <Section title="여기가 아니라면">{alts.map((s) => <AltRow key={s.key} store={s} />)}</Section>}
        </div>
      ) : (
        <p className={`rounded-2xl bg-fill py-10 text-center ${t.desc}`}>지금 문 연 곳이 없어요 · 전체 순위에서 여는 시간을 확인해 보세요</p>
      )}
      <div className="flex flex-col gap-2 md:grid md:grid-cols-2">
        <Link href={`/ranking?mode=${mode}${placeQs}`} className={btn.outline}>결제 순위 전체 보기</Link>
        <Link href={`/group/new?mode=${mode}${placeQs}`} className={btn.outline}>같이 먹을 사람 있으면 · 투표할 방 만들기</Link>
      </div>
    </>
  );
}

export default function Page({ searchParams }: PageProps<'/pick'>) {
  return (
    <Shell wide>
      <Suspense fallback={null}>
        <Content searchParams={searchParams} />
      </Suspense>
      <SourceNote ai />
    </Shell>
  );
}
