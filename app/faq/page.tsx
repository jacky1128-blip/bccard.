// 자주 묻는 질문 (GEO: AI 검색이 "모임 장소 어떻게 정해?" 같은 질문에 밥콕을 인용하도록)
// 질문·답은 lib/seo.ts 의 SERVICE_FAQ 한 곳에서 관리 (llms.txt 와 같이 씀)
import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import SourceNote from '@/components/SourceNote';
import { BrandHeader, Page as Shell, PageTitle, Section, t } from '@/components/ui';
import { GUIDES } from '@/lib/guides';
import { SERVICE_FAQ, breadcrumbLd, faqLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: '자주 묻는 질문',
  description: '밥콕으로 모임 장소 정하는 법, 중간 지점 찾는 법, 결제 데이터 순위가 리뷰 순위와 다른 점을 정리했어요.',
  alternates: { canonical: '/faq' },
};

export default function Page() {
  return (
    <Shell>
      <BrandHeader back="/" />
      <PageTitle kicker="도움말" title="자주 묻는 질문" desc="밥콕은 BC카드 eat.pl 잇플 결제 데이터로 식당을 골라요" />
      <dl className="flex flex-col gap-3">
        {SERVICE_FAQ.map((x) => (
          <div key={x.q} className="flex flex-col gap-1 rounded-2xl bg-fill p-4">
            <dt className="text-[14px] font-bold">{x.q}</dt>
            <dd className={t.body}>{x.a}</dd>
          </div>
        ))}
      </dl>
      <Section title="동네별 가이드">
        <ul className="flex flex-col gap-1.5">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link href={`/guide/${g.slug}`} className="text-[14px]">{g.title}</Link>
            </li>
          ))}
        </ul>
      </Section>
      <JsonLd data={[faqLd(SERVICE_FAQ), breadcrumbLd([['밥콕', '/'], ['자주 묻는 질문', '/faq']])]} />
      <SourceNote />
    </Shell>
  );
}
