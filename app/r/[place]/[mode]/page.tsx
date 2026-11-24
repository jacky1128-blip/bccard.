// A1 역 × 상황 순위 (검색 유입용)
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import RankingView from '@/components/RankingView';
import SourceNote from '@/components/SourceNote';
import JsonLd from '@/components/JsonLd';
import { breadcrumbLd, itemListLd, kstDate } from '@/lib/seo';
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
  const title = `${name} 근처 ${MODES[mode].label} 결제 순위`;
  const description = `${name} 근처 ${MODES[mode].label}, 리뷰 말고 최근 1개월 BC카드 결제 기준 순위예요.`;
  const url = `/r/${encodeURIComponent(name)}/${mode}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url } };
}

async function Content({ params }: { params: P }) {
  const { place, mode } = await params;
  if (!isMode(mode)) notFound();
  await connection();
  const name = decodeURIComponent(place);
  const { minutes, dow } = kstNow();
  const r = await getStoresByMode(name, { at: minutes, day: dow, full: true });
  const nearby = r.center ? await nearbyStations(r.center, r.label) : [];
  const top = r.live ? (r.storesByMode[mode] ?? []).slice(0, 10) : [];
  const url = `/r/${encodeURIComponent(name)}/${mode}`;
  const title = `${name} 근처 ${MODES[mode].label} 결제 순위`;
  return (
    <>
      {/* 예시 데이터(가짜 가게)는 구조화 데이터에 싣지 않음 */}
      {top.length > 0 && (
        <JsonLd
          data={[
            { ...itemListLd(title, `${name} 근처 ${MODES[mode].label}, 최근 1개월 BC카드 결제 기준 순위`, top, url), dateModified: kstDate() },
            breadcrumbLd([['밥콕', '/'], ['순위', '/ranking'], [title, url]]),
          ]}
        />
      )}
      <RankingView initialMode={mode} placeQuery={name}storesByMode={r.storesByMode} fixedPlace={r.label} placeLabel={r.label} nearby={nearby} center={r.center} live={r.live} />
    </>
  );
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
