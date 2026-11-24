// 모임 결과 공개 페이지 ("강남역 6명 모임, 투표로 고른 곳") · 고유 주소라 검색·AI 검색에 쌓임
// 확정된 모임만 보여 주고, 모임 이름·메모·닉네임·출발역은 싣지 않음 (lib/groups getPublicResult)
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import SourceNote from '@/components/SourceNote';
import StoreCard from '@/components/StoreCard';
import { BrandHeader, Page as Shell, PageTitle, Section, btn, t } from '@/components/ui';
import { dbConfigured } from '@/lib/db';
import { getPublicResult, type PublicResult } from '@/lib/groups';
import { MODES } from '@/lib/modes';
import { abs, breadcrumbLd, faqLd, josa, koDate, restaurantLd } from '@/lib/seo';

type P = PageProps<'/s/[id]'>['params'];

async function load(params: P) {
  if (!dbConfigured()) return null;
  return getPublicResult((await params).id);
}

const headline = (r: PublicResult) => `${r.place} ${r.joined}명 ${MODES[r.mode].label}, 투표로 고른 곳은 ${r.winner.name}`;
const summary = (r: PublicResult) =>
  `${r.place}에서 ${r.joined}명이 만나는 ${MODES[r.mode].label} 장소를 밥콕 투표로 정했어요. BC카드 결제 데이터로 뽑은 후보 ${r.ranked.length}곳 중 ${josa(r.winner.name, '이', '가')} 골라졌어요.`;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const r = await load(params);
  if (!r) return { title: '모임 결과', robots: { index: false } };
  const title = headline(r);
  const description = summary(r);
  return { title, description, alternates: { canonical: `/s/${r.id}` }, openGraph: { title, description, type: 'article', url: `/s/${r.id}` } };
}

async function Content({ params }: { params: P }) {
  const r = await load(params);
  if (!r) notFound();
  const m = MODES[r.mode];
  const url = `/s/${r.id}`;
  const pct = (v: number) => (r.totalVotes ? Math.round((v / r.totalVotes) * 100) : 0);
  const qa = [
    {
      q: `${r.place} ${r.joined}명 ${m.label} 장소, 어디로 정했어요?`,
      a: `${r.winner.name}${r.winner.cat ? `(${r.winner.cat})` : ''}${r.winner.address ? ` · ${r.winner.address}` : ''}, 여기로 정했어요. 밥콕이 BC카드 결제 데이터로 뽑은 후보 중에서 ${r.totalVotes}표 투표로 골랐어요.`,
    },
    {
      q: '이렇게 투표로 모임 장소를 정하려면요?',
      a: '밥콕에서 장소와 날짜를 고르면 결제 데이터로 후보 3곳이 들어간 투표방 링크가 나와요. 단톡방에 보내면 친구들이 가입 없이 투표해요.',
    },
  ];

  return (
    <>
      <PageTitle
        kicker={`${r.place} · ${m.label}${r.date ? ` · ${koDate(r.date)}` : ''}`}
        title={<>{r.place} {r.joined}명 모임<br />{r.winner.name}, 여기로 정했어요</>}
        desc="밥콕 투표 결과 · 후보는 최근 1개월 BC카드 결제 데이터로 골랐어요"
      />
      <p className={t.body}>{summary(r)}</p>

      <Section title="투표 결과" gap="gap-2.5">
        {r.ranked.map(({ store, votes }, i) => (
          <div key={store.key} className="flex flex-col gap-1">
            <div className={`flex items-baseline justify-between ${i ? 'text-sub' : ''}`}>
              <span className={t.storeSm}>{store.name}</span>
              <span className={`text-[13px] font-bold ${t.num}`}>{votes}표</span>
            </div>
            <div className="h-2.5 rounded-[5px] bg-fill">
              <div className={`h-2.5 rounded-[5px] ${i ? 'bg-[#B8BCC2]' : 'bg-primary'}`} style={{ width: `${pct(votes)}%` }} />
            </div>
          </div>
        ))}
      </Section>

      <StoreCard store={r.winner} showWalk={false} menuLabel="메뉴 보기" source={`share:${r.id}`} />

      <Section title="자주 묻는 질문" gap="gap-3">
        <dl className="flex flex-col gap-3">
          {qa.map((x) => (
            <div key={x.q} className="flex flex-col gap-1 rounded-2xl bg-fill p-4">
              <dt className="text-[14px] font-bold">{x.q}</dt>
              <dd className={t.body}>{x.a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <div className="flex flex-col gap-2">
        <Link href={`/group/new?mode=${r.mode}&place=${encodeURIComponent(r.place)}`} className={btn.primary}>우리도 투표로 정하기</Link>
        <Link href={`/r/${encodeURIComponent(r.place)}/${r.mode === 'travel' ? 'meal' : r.mode}`} className={btn.outline}>
          {r.place} {m.label} 전체 순위 보기
        </Link>
      </div>

      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: headline(r),
            description: summary(r),
            url: abs(url),
            ...(r.date ? { datePublished: r.date } : {}),
            about: restaurantLd(r.winner),
            mentions: r.ranked.map(({ store }) => restaurantLd(store)),
            publisher: { '@type': 'Organization', name: '밥콕' },
          },
          faqLd(qa),
          breadcrumbLd([['밥콕', '/'], ['모임 결과', url]]),
        ]}
      />
    </>
  );
}

export default function Page({ params }: PageProps<'/s/[id]'>) {
  return (
    <Shell>
      <BrandHeader back="/" />
      <Suspense fallback={null}>
        <Content params={params} />
      </Suspense>
      <SourceNote />
    </Shell>
  );
}
