// 검색 유입용 가이드 한 편 ("강남역 회식 장소 TOP 10" 등 · lib/guides)
// 목록은 잇플 결제 데이터로 매번 새로 뽑음 (잇플 검색은 1시간 캐시)
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import StoreCard from '@/components/StoreCard';
import SourceNote from '@/components/SourceNote';
import JsonLd from '@/components/JsonLd';
import { BrandHeader, Page as Shell, PageTitle, Section, t } from '@/components/ui';
import { GUIDES, applyGuideFilter, guideBySlug, type Guide } from '@/lib/guides';
import { MODES } from '@/lib/modes';
import { getStoresByMode } from '@/lib/stores';
import type { StoreView } from '@/lib/view';
import { breadcrumbLd, faqLd, itemListLd, josa, kstDate, koDate, type QA } from '@/lib/seo';

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
    openGraph: { title: g.title, description: g.desc, type: 'article', url: `/guide/${g.slug}` },
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

// 가이드마다 결제 데이터로 만드는 질문·답변 (화면에도 보이고 FAQPage 구조화 데이터로도 넣음)
// AI 검색이 그대로 인용하기 좋게 첫 문장에 결론
function guideFaq(g: Guide, stores: StoreView[], date: string): QA[] {
  if (!stores.length) return [];
  const top3 = stores.slice(0, 3).map((s) => `${s.rank}위 ${s.name}${s.cat ? `(${s.cat})` : ''}`).join(', ');
  const out: QA[] = [
    {
      q: `${g.station} ${g.topic} 어디가 좋아요?`,
      a: `${koDate(date)} 기준 최근 1개월 BC카드 결제 데이터로 보면 ${g.station} ${josa(g.topic, '은', '는')} ${top3} 순이에요. 리뷰가 아니라 실제 결제 매출 순위예요.`,
    },
  ];
  const times = stores.map((s) => s.busyTime).filter(Boolean) as string[];
  const days = stores.map((s) => s.busyDay).filter(Boolean) as string[];
  const most = (xs: string[]) => [...xs].sort((a, b) => xs.filter((x) => x === b).length - xs.filter((x) => x === a).length)[0];
  if (times.length) {
    out.push({
      q: `${g.station} ${josa(g.topic, '은', '는')} 언제 가장 붐벼요?`,
      a: `이 목록 가게들은 ${most(times)}${days.length ? `, 요일로는 ${most(days)}요일` : ''}에 결제가 가장 몰려요. 붐비는 때를 피하려면 그 시간 전에 가거나 예약하세요.`,
    });
  }
  const party = stores.filter((s) => s.party).map((s) => s.name).slice(0, 3);
  if (party.length) {
    out.push({
      q: `${g.station} 근처에서 단체로 가기 좋은 곳은요?`,
      a: `직장인 단체 결제가 많아 회식에 맞는 곳으로는 ${josa(party.join(', '), '이', '가')} 있어요.`,
    });
  }
  const local = stores.filter((s) => s.local).map((s) => s.name).slice(0, 3);
  if (local.length) {
    out.push({
      q: `${g.station} 동네 사람들이 자주 가는 곳은요?`,
      a: `근처 주민 결제 비중이 높은 동네 맛집으로는 ${josa(local.join(', '), '이', '가')} 있어요.`,
    });
  }
  out.push({
    q: '친구들이랑 이 중에서 어디 갈지 어떻게 정해요?',
    a: '밥콕에서 투표방을 만들면 이 동네 후보 3곳이 자동으로 들어가요. 링크를 단톡방에 보내면 친구들이 가입 없이 투표하고, 사는 곳이 다르면 "중간에서 만나요"로 모두에게 공평한 역부터 정할 수 있어요.',
  });
  return out;
}

async function Content({ params }: { params: P }) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  await connection();
  const { stores, live } = await loadStores(g);
  const line = summary(g, stores);
  const date = kstDate();
  const faq = guideFaq(g, stores, date);
  const url = `/guide/${g.slug}`;
  const others = GUIDES.filter((x) => x.slug !== g.slug);
  const rankingHref = `/r/${encodeURIComponent(g.station)}/${g.mode === 'travel' ? 'meal' : g.mode}`;

  return (
    <>
      <PageTitle
        kicker={`${g.station} · ${MODES[g.mode].label}`}
        title={g.title}
        desc={<>리뷰 말고 최근 1개월 BC카드 결제 기준 · <time dateTime={date}>{koDate(date)}</time> 업데이트</>}
      />
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
      <JsonLd
        data={[
          ...(stores.length ? [{ ...itemListLd(g.title, g.desc, stores, url), dateModified: date }] : []),
          ...(faq.length ? [faqLd(faq)] : []),
          breadcrumbLd([['밥콕', '/'], ['맛집 가이드', '/guide'], [g.title, url]]),
        ]}
      />

      <Link href={rankingHref} className="text-[14px] font-bold">
        {g.station} {MODES[g.mode].label} 전체 순위 보기 →
      </Link>

      {faq.length > 0 && (
        <Section title="자주 묻는 질문" gap="gap-3">
          <dl className="flex flex-col gap-3">
            {faq.map((x) => (
              <div key={x.q} className="flex flex-col gap-1 rounded-2xl bg-fill p-4">
                <dt className="text-[14px] font-bold">{x.q}</dt>
                <dd className={t.body}>{x.a}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      <Link href={`/group/new?mode=${g.mode === 'travel' ? 'meal' : g.mode}&place=${encodeURIComponent(g.station)}`} className="text-[14px] font-bold">
        이 동네로 친구들과 투표방 만들기 →
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
