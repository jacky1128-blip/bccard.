'use client';
// A1 결제 순위 본문: 상황 탭 + 필터 + 카드 목록 + 같이 정하기 안내
// 탭을 누르면 제목·설명·기준·목록·안내 박스가 함께 바뀜
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Mode } from '@/types/group';
import type { StoreView } from '@/lib/view';
import { MODES } from '@/lib/modes';
import { timeBucket } from '@/lib/time';
import { likelyOpenAt } from '@/lib/view';
import { useNowMinutes } from '@/lib/useNowMinutes';
import ModeChips, { syncModeToUrl } from './ModeChips';
import Filters, { DEFAULT_FILTER, type FilterValue } from './Filters';
import StoreCard from './StoreCard';
import DemoNote from './DemoNote';
import { BrandHeader, PageTitle, btn, t } from './ui';

export default function RankingView({
  initialMode,
  storesByMode,
  fixedPlace,
  placeLabel,
  nearby = [],
  live = true,
  notFound = false,
}: {
  initialMode: Mode;
  storesByMode: Record<Mode, StoreView[]>;
  fixedPlace?: string; // /r/[place] · ?place= 처럼 장소를 고른 경우
  placeLabel?: string; // 실제로 조회한 장소 이름
  nearby?: string[];   // 근처 다른 역
  live?: boolean;      // false면 예시 데이터
  notFound?: boolean;  // 장소를 못 찾음
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState(initialMode);
  const [f, setF] = useState<FilterValue>(DEFAULT_FILTER);
  const [more, setMore] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const now = useNowMinutes();
  const m = MODES[mode];
  const stores = storesByMode[mode];
  const place = fixedPlace ?? placeLabel ?? m.place;

  // 다른 화면에 갔다가 돌아오면(Next 가 이전 화면 상태를 기억해 둠) 필터를 기본값으로 — "지금 영업중인 가게"가 다시 켜진 채로
  // (같은 화면 안에서 고른 필터는 그대로. 화면이 다시 보일 때만 effect 가 실행됨)
  useEffect(() => {
    queueMicrotask(() => {
      setF(DEFAULT_FILTER);
      setMore(false);
      setShowClosed(false);
    });
  }, []);

  const changeMode = (x: Mode) => {
    setMode(x);
    setF(DEFAULT_FILTER);
    setMore(false);
    setShowClosed(false);
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
          // 덜 붐비는 가게: 잇플 '가장 붐비는 시간대'가 지금 시간대가 아닌 곳
          (!f.lessBusy || now == null || !s.busyTime || s.busyTime !== timeBucket(now)),
      ),
    [stores, f, now],
  );
  const isOpen = (s: StoreView) => now == null || likelyOpenAt(s.open, s.close, now) !== false;
  const list = f.openNow ? base.filter(isOpen) : base;
  // 영업 중 필터를 켜면 문 닫은 곳은 목록에서 빼고, 보고 싶을 때만 펼침 (섞여 보이지 않게)
  const closed = f.openNow ? base.filter((s) => !isOpen(s)) : [];
  const shown = more ? list : list.slice(0, 5);

  return (
    <>
      <BrandHeader back={`/?mode=${mode}${fixedPlace ? `&place=${encodeURIComponent(fixedPlace)}` : ''}`} />
      <PageTitle
        kicker={m.label}
        title={
          <>
            {place} 근처
            <br />
            결제 많은 가게
          </>
        }
        desc={
          <>
            {fixedPlace ? `고른 ${place} 기준이에요` : `현재 내 위치에서 가까운 ${place} 기준이에요`}
            <br />
            최근 1개월 BC카드 결제 정보를 참고했어요
          </>
        }
      />
      <form
        role="search"
        className="-mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = query.trim();
          if (v) router.push(`/ranking?mode=${mode}&place=${encodeURIComponent(v)}`);
        }}
      >
        <input aria-label="다른 동네·역 검색" className={btn.field} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="다른 동네·역 검색 (예: 성수역)" />
        <button className={`${btn.smOutline} h-12`}>찾기</button>
      </form>
      {!live && <DemoNote notFound={notFound} place={place} />}
      <ModeChips variant="tabs" value={mode} onChange={changeMode} />
      <Filters value={f} onChange={setF} cats={cats} />
      <span className={`-mt-2 ${t.desc}`}>최근 결제 금액 순으로 최대 10곳이에요.</span>

      <div className="flex flex-col gap-2.5">
        {shown.length === 0 && (
          <p className={`rounded-2xl bg-fill py-8 text-center ${t.desc}`}>
            {closed.length ? '지금 문 연 곳이 없어요' : '조건에 맞는 곳이 없어요'}
          </p>
        )}
        {shown.map((s) => <StoreCard key={s.key} store={s} showRank />)}
        {!more && list.length > 5 && (
          <button type="button" onClick={() => setMore(true)} className={btn.outline}>
            {list.length > 6 ? `6~${list.length}위` : '6위'} 더 보기
          </button>
        )}
        {closed.length > 0 && !showClosed && (
          <button type="button" onClick={() => setShowClosed(true)} className={`${btn.textLink} self-center py-2`}>
            지금 문 닫은 곳 {closed.length}곳도 보기
          </button>
        )}
        {closed.length > 0 && showClosed && (
          <>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={t.sectionTitle}>지금 문 닫은 곳</span>
              <button type="button" onClick={() => setShowClosed(false)} className={btn.textLink}>접기</button>
            </div>
            <div className="flex flex-col gap-2.5 opacity-60">
              {closed.map((s) => (
                <StoreCard key={s.key} store={s} showRank highlight={s.hoursUnsure ? '영업시간 확인 필요' : s.openAt ? `${s.openAt} 오픈 예상` : undefined} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2.5 rounded-2xl bg-primary-soft p-[18px]">
        <h2 className={t.sheetTitle}>{m.boxTitle}</h2>
        <span className={`${t.body} text-sub`}>{m.boxSub}</span>
        <Link href={m.boxHref} className={btn.primary}>{m.boxBtn}</Link>
      </div>

      {nearby.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className={`w-full ${t.desc}`}>근처 다른 역도 보기</span>
          {nearby.map((s) => (
            <Link key={s} href={`/r/${encodeURIComponent(s)}/${mode}`} className={btn.pillOff}>
              {s}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
