// 가이드 모아 보기 (검색 유입용 · lib/guides)
import type { Metadata } from 'next';
import Link from 'next/link';
import SourceNote from '@/components/SourceNote';
import { BrandHeader, Page as Shell, PageTitle, t } from '@/components/ui';
import { GUIDES } from '@/lib/guides';

export const metadata: Metadata = {
  title: '결제 데이터로 고른 맛집 가이드',
  description: '강남역 회식, 역삼역 점심, 성수역 늦게까지 하는 식당까지. 리뷰 말고 BC카드 결제 순위로 고른 맛집 가이드예요.',
  alternates: { canonical: '/guide' },
};

export default function Page() {
  return (
    <Shell>
      <BrandHeader back="/" />
      <PageTitle kicker="가이드" title="결제 데이터로 고른 맛집" desc="리뷰 말고 최근 1개월 BC카드 결제 기준" />
      <ul className="flex flex-col gap-2">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guide/${g.slug}`} className="flex flex-col gap-0.5 rounded-2xl border border-line p-4 text-ink no-underline">
              <span className={t.storeSm}>{g.title}</span>
              <span className={t.desc}>{g.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
      <SourceNote />
    </Shell>
  );
}
