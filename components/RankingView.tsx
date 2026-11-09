'use client';
// A1 결제 순위 본문: 상황 탭 + 필터 + 카드 목록 + 같이 정하기 안내
// 탭을 누르면 제목·설명·기준·목록·안내 박스가 함께 바뀜
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Mode } from '@/types/group';
import type { StoreView } from '@/lib/view';
import { MODES } from '@/lib/modes';
import { isOpenAtMinutes } from '@/lib/time';
import { useNowMinutes } from '@/lib/useNowMinutes';
import ModeChips, { syncModeToUrl } from './ModeChips';
import Filters, { DEFAULT_FILTER, type FilterValue } from './Filters';
import StoreCard from './StoreCard';
import { BrandHeader, PageTitle, btn, t } from './ui';

export default function RankingView({
  initialMode,
  storesByMode,
  fixedPlace,
}: {
  initialMode: Mode;
  storesByMode: Record<Mode, StoreView[]>;
  fixedPlace?: string; // /r/[place] 처럼 장소가 정해진 경우
}) {
  const [mode, setMode] = useState(initialMode);
  const [f, setF] = useState<FilterValue>(DEFAULT_FILTER);
  const [more, setMore] = useState(false);
  const now = useNowMinutes();
  const m = MODES[mode];
  const stores = storesByMode[mode];
  const place = fixedPlace ?? m.place;

  const changeMode = (x: Mode) => {
    setMode(x);
    setF(DEFAULT_FILTER);
    setMore(false);
    syncModeToUrl(x);
  };

  const cats = useMemo(() => [...new Set(stores.map((s) => s.cat))], [stores]);
  // 영업 중 조건만 뺀 나머지 필터 결과
  const base = useMemo(
    () =>
      stores.filter(
        (s) =>
          (!f.cat || s.cat === f.cat) &&
          (!f.near || (s.walkMin ?? 99) <= 10) &&
          (!f.lessBusy || s.tags.some((x) => x.includes('덜 붐'))),
      ),
    [stores, f],
  );
  const isOpen = (s: StoreView) => now == null || isOpenAtMinutes(s.open, s.close, now) !== false;
  const list = f.openNow ? base.filter(isOpen) : base;
  // 영업 중 필터를 켰는데 문 연 곳이 5곳 미만이면 → 문 닫은 곳을 아래에 따로 보여줘서 화면이 비지 않게
  const closed = f.openNow && list.length < 5 ? base.filter((s) => !isOpen(s)) : [];
  const shown = more ? list : list.slice(0, 5);

  return (
    <>
      <BrandHeader back={`/?mode=${mode}`} />
      <PageTitle
        title={
          <>
            {place} 근처 {m.label}
            <br />
            결제 순위
          </>
        }
        desc={`${fixedPlace ? '고른 장소 기준' : m.placeNote} · 리뷰 말고 최근 1개월 BC카드 결제 기준`}
      />
      <ModeChips variant="tabs" value={mode} onChange={changeMode} />
      <Filters value={f} onChange={setF} cats={cats} />
      <span className={`-mt-2 ${t.desc}`}>매출 높은 순 · 최대 10곳 · 이 상황 기준 {m.crit}</span>

      <div className="flex flex-col gap-2.5">
        {shown.length === 0 && (
          <p className={`rounded-2xl bg-fill py-8 text-center ${t.desc}`}>
            {closed.length ? '지금 문 연 곳이 없어요 · 아래는 지금 닫은 곳이에요' : '조건에 맞는 곳이 없어요'}
          </p>
        )}
        {shown.map((s) => <StoreCard key={s.key} store={s} showRank />)}
        {!more && list.length > 5 && (
          <button type="button" onClick={() => setMore(true)} className={btn.outline}>
            6~{list.length}위 더 보기
          </button>
        )}
        {closed.length > 0 && (
          <>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={t.sectionTitle}>지금은 문 닫은 곳</span>
              <span className={t.desc}>여는 시간 확인하고 가요</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {closed.map((s) => <StoreCard key={s.key} store={s} showRank highlight={`${s.open} 오픈`} />)}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2.5 rounded-2xl bg-primary-soft p-[18px]">
        <h2 className={t.sheetTitle}>{m.boxTitle}</h2>
        <span className={`${t.body} text-sub`}>{m.boxSub}</span>
        <Link href={m.boxHref} className={btn.primary}>{m.boxBtn}</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`w-full ${t.desc}`}>근처 다른 역</span>
        {['[근처역 1]', '[근처역 2]', '[근처역 3]'].map((s) => (
          <Link key={s} href={`/r/${encodeURIComponent(s)}/${mode}`} className={btn.pillOff}>
            {s}
          </Link>
        ))}
      </div>
    </>
  );
}
