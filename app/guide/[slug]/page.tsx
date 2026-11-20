// 검색 유입용 가이드 한 편 ("강남역 회식 장소 TOP 10" 등 · lib/guides)
// 목록은 잇플 결제 데이터로 매번 새로 뽑음 (잇플 검색은 1시간 캐시)
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import StoreCard from '@/components/StoreCard';
import SourceNote from '@/components/SourceNote';
import { BrandHeader, Page as Shell, PageTitle, Section, t } from '@/components/ui';
import { GUIDES, applyGuideFilter, guideBySlug, type Guide } from '@/lib/guides';
import { MODES } from '@/lib/modes';
import { getStoresByMode } from '@/lib/stores';
import type { StoreView } from '@/lib/view';

type P = PageProps<'/guide/[slug]'>['params'];

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.desc,
    alternates: { canonical: `/guide/${g.slug}` },
    openGraph: { title: g.title, description: g.desc, type: 'article' },
  };
}

async function loadStores(g: Guide): Promise<{ stores: StoreView[]; live: boolean }> {
  const r = await getStoresByMode(g.station, { full: true, genre: g.genre });
  // 예시 데이터(가짜 가게)는 검색 페이지에 절대 싣지 않음
  if (!r.live) return { stores: [], live: false };
  const all = r.storesByMode[g.mode] ?? [];
  let picked = applyGuideFilter(all, g.filter);
  // 회식·동네 맛집 표시가 붙은 곳이 하나도 없으면 상황 순위 그대로 (늦게까지는 거짓말이 되니 그대로 빈 목록)
  if (picked.length === 0 && g.filter !== 'late') picked = all;
  return { stores: picked.slice(0, 10).map((s, i) => ({ ...s, rank: i + 1 })), live: true };
}

// 결제 데이터로 쓰는 요약 한 줄
function summary(g: Guide, stores: StoreView[]): string | null {
  if (!stores.length) return null;
  const top = stores[0];
  const times = stores.map((s) => s.busyTime).filter(Boolean) as string[];
  const peak = times.sort((a, b) => times.filter((x) => x === b).length - times.filter((x) => x === a).length)[0];
  return `지금 ${g.station} 1위는 ${top.name}${top.cat ? `(${top.cat})` : ''}예요.${peak ? ` 이 목록 가게들은 ${peak}에 가장 붐벼요.` : ''}`;
}

function JsonLd({ g, stores }: { g: Guide; stores: StoreView[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: g.title,
    description: g.desc,
    itemListElement: stores.map((s) => ({
      '@type': 'ListItem',
      position: s.rank,
      item: {
        '@type': 'Restaurant',
        name: s.name,
        ...(s.cat ? { servesCuisine: s.cat } : {}),
        ...(s.address ? { address: s.address } : {}),
        ...(s.lat != null && s.lng != null ? { geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng } } : {}),
      },
    })),
  };
  // </script> 끊김 방지
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

async function Content({ params }: { params: P }) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  await connection();
  const { stores, live } = await loadStores(g);
  const line = summary(g, stores);
  const others = GUIDES.filter((x) => x.slug !== g.slug);
  const rankingHref = `/r/${encodeURIComponent(g.station)}/${g.mode === 'travel' ? 'meal' : g.mode}`;

  return (
    <>
      <PageTitle kicker={`${g.station} · ${MODES[g.mode].label}`} title={g.title} desc="리뷰 말고 최근 1개월 BC카드 결제 기준" />
      <p className={t.body}>
        {g.intro}
        {line && <> {line}</>}
      </p>

      {stores.length > 0 ? (
        <ol className="flex flex-col gap-3">
          {stores.map((s) => (
            <li key={s.key}>
              <StoreCard store={s} showRank showWalk={false} source={`guide:${g.slug}`} />
            </li>
          ))}
        </ol>
      ) : (
        <p className={t.desc}>
          {live ? '지금은 조건에 맞는 가게가 없어요.' : '결제 데이터를 잠시 불러오지 못했어요.'} 아래 전체 순위에서 확인해 보세요.
        </p>
      )}
      {stores.length > 0 && <JsonLd g={g} stores={stores} />}

      <Link href={rankingHref} className="text-[14px] font-bold">
        {g.station} {MODES[g.mode].label} 전체 순위 보기 →
      </Link>

      <Section title="다른 가이드">
        <ul className="flex flex-col gap-1.5">
          {others.map((x) => (
            <li key={x.slug}>
              <Link href={`/guide/${x.slug}`} className="text-[14px]">{x.title}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

export default function Page({ params }: PageProps<'/guide/[slug]'>) {
  return (
    <Shell>
      <BrandHeader back="/guide" />
      <Suspense fallback={null}>
        <Content params={params} />
      </Suspense>
      <SourceNote />
    </Shell>
  );
}
