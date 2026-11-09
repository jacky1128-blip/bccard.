// C2 · D2 결과 화면 공통: 1순위 + 대안 + 같이 갈 사람 부르기
import Link from 'next/link';
import type { StoreView } from '@/lib/view';
import StoreCard from './StoreCard';
import { AltRow } from './StoreRow';
import SourceNote from './SourceNote';
import DemoNote from './DemoNote';
import { CopyLinkButton } from './ShareButtons';
import { BrandHeader, Page, PageTitle, Section, StatBoxes, btn, t } from './ui';

export default function ResultView({
  back, kicker, title, stats, notice, stores, highlight, altTime, groupHref, demo = false,
}: {
  back: string;
  kicker: string;
  title: React.ReactNode;
  stats: [string, string][];
  notice?: string;
  stores: StoreView[];
  highlight: (s: StoreView) => string;
  altTime?: (s: StoreView) => string;
  groupHref: string;
  demo?: boolean;
}) {
  const [first, ...alts] = stores;
  return (
    <Page>
      <BrandHeader back={back} />
      <PageTitle kicker={kicker} title={title} />
      <StatBoxes items={stats} />
      {demo && <DemoNote />}
      {notice && (
        <div className="rounded-xl bg-primary-soft px-3.5 py-3">
          <span className={t.kicker}>{notice}</span>
        </div>
      )}
      {first ? (
        <>
          <Section title="지금 1순위">
            <StoreCard store={first} reason highlight={highlight(first)} />
          </Section>
          {alts.length > 0 && (
            <Section title="여기가 아니라면">
              {alts.map((s) => <AltRow key={s.key} store={s} timeLabel={altTime?.(s)} />)}
            </Section>
          )}
        </>
      ) : (
        <p className="rounded-2xl bg-fill py-10 text-center text-sm text-sub">그 시간에 문 연 곳이 없어요. 시간을 바꿔 보세요</p>
      )}
      <div className="flex flex-col gap-2">
        <Link href={groupHref} className={btn.primary}>같이 갈 사람 부르기</Link>
        <CopyLinkButton label="결과 링크 복사" className={btn.outline} />
      </div>
      <SourceNote ai />
    </Page>
  );
}
