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
import MapView from './MapView';
import { useDesktop } from '@/lib/useMedia';
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
  center,
  live = true,
  notFound = false,
}: {
  initialMode: Mode;
  storesByMode: Record<Mode, StoreView[]>;
  fixedPlace?: string; // /r/[place] · ?place= 처럼 장소를 고른 경우
  placeLabel?: string; // 실제로 조회한 장소 이름
  nearby?: string[];   // 근처 다른 역
  center?: { lat: number; lng: number }; // PC 오른쪽 지도 중심
  live?: boolean;      // false면 예시 데이터
  notFound?: boolean;  // 장소를 못 찾음
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState(initialMode);
  const [f, setF] = useState<FilterValue>(DEFAULT_FILTER);
  const [more, setMore] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  // PC: 목록 ↔ 지도 핀 연결 (누름 · 마우스 올림)
  const [picked, setPicked] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const desktop = useDesktop();
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

  const active = hovered ?? picked;
  const card = (s: StoreView, highlight?: string, dim = false) => (
    <div
      key={s.key}
      data-key={s.key}
      onMouseEnter={() => setHovered(s.key)}
      onMouseLeave={() => setHovered(null)}
      className={`rounded-2xl transition-shadow ${active === s.key ? 'shadow-[0_0_0_2px_var(--primary)]' : ''} ${dim ? 'opacity-60' : ''}`}
    >
      <StoreCard store={s} showRank highlight={highlight} />
    </div>
  );
  const pickPin = (key: string | null) => {
    setPicked(key);
    if (key) document.querySelector(`[data-key="${CSS.escape(key)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    // PC: 왼쪽 목록 + 오른쪽 지도(스크롤해도 고정) / 태블릿: 카드 2열 / 모바일: 한 줄 목록
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
     <div className="flex min-w-0 flex-col gap-5">
      <BrandHeader back={`/?mode=${mode}${fixedPlace ? `&place=${encodeURIComponent(fixedPlace)}` : ''}`} />
      {/* 첫 화면과 같은 규칙: 큰 제목 = 상황(탭마다 바뀜), 위 파란 글씨 = 장소 */}
      <PageTitle
        kicker={`${place} 근처 결제 많은 가게`}
        title={m.homeTitle}
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
      {/* 상황 탭 + 필터: 스크롤해도 위에 고정 */}
      <div className="sticky top-0 z-20 -mx-5 flex flex-col gap-3.5 bg-white px-5 pb-3 pt-[max(8px,env(safe-area-inset-top))] md:-mx-8 md:px-8 lg:mx-0 lg:px-0">
        <ModeChips variant="tabs" value={mode} onChange={changeMode} />
        <Filters value={f} onChange={setF} cats={cats} />
      </div>
      {/* 같이 정하기 안내: 태블릿·PC 는 목록 위 가로 배너 (모바일은 화면 아래 고정 버튼) */}
      <div className="hidden items-center justify-between gap-4 rounded-2xl bg-primary-soft px-5 py-4 md:flex">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className={t.sheetTitle}>{m.boxTitle}</h2>
          <span className={`${t.body} text-sub`}>{m.boxSub}</span>
        </div>
        <div className="w-52 shrink-0">
          <Link href={`${m.boxHref}${m.boxHref.includes('?') ? `&place=${encodeURIComponent(place)}` : ''}`} className={btn.primary}>{m.boxBtn}</Link>
        </div>
      </div>
      <span className={`-mt-2 ${t.desc}`}>최근 결제 금액 순으로 최대 10곳이에요.</span>

      <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-3 lg:flex">
        {shown.length === 0 && (
          <p className={`rounded-2xl bg-fill py-8 text-center md:col-span-2 ${t.desc}`}>
            {closed.length ? '지금 문 연 곳이 없어요' : '조건에 맞는 곳이 없어요'}
          </p>
        )}
        {shown.map((s) => card(s))}
        {!more && list.length > 5 && (
          <button type="button" onClick={() => setMore(true)} className={`${btn.outline} md:col-span-2`}>
            {list.length > 6 ? `6~${list.length}위` : '6위'} 더 보기
          </button>
        )}
        {closed.length > 0 && !showClosed && (
          <button type="button" onClick={() => setShowClosed(true)} className={`${btn.textLink} self-center py-2 md:col-span-2`}>
            지금 문 닫은 곳 {closed.length}곳도 보기
          </button>
        )}
        {closed.length > 0 && showClosed && (
          <>
            <div className="mt-2 flex items-baseline justify-between md:col-span-2">
              <span className={t.sectionTitle}>지금 문 닫은 곳</span>
              <button type="button" onClick={() => setShowClosed(false)} className={btn.textLink}>접기</button>
            </div>
            {closed.map((s) => card(s, s.hoursUnsure ? '영업시간 확인 필요' : s.openAt ? `${s.openAt} 오픈 예상` : undefined, true))}
          </>
        )}
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
      {/* 모바일: 같이 정하기 버튼을 화면 아래에 고정 (목록을 끝까지 안 내려도 보이게) */}
      <div className="sticky bottom-0 z-20 -mx-5 mt-auto bg-gradient-to-t from-white from-70% to-transparent px-5 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
        <span className={`mb-1.5 block text-center ${t.desc}`}>{m.boxTitle}</span>
        <Link href={`${m.boxHref}${m.boxHref.includes('?') ? `&place=${encodeURIComponent(place)}` : ''}`} className={btn.primary}>{m.boxBtn}</Link>
      </div>
     </div>

      {/* PC: 오른쪽 지도 (보이는 목록 순서 = 핀 번호) */}
      {desktop && (
        <div className="sticky top-6 h-[calc(100dvh-48px)] overflow-hidden rounded-2xl border border-line">
          <MapView stores={[...shown, ...(showClosed ? closed : [])]} center={center} className="h-full w-full" selected={active} onSelect={pickPin} onHover={setHovered} />
        </div>
      )}
    </div>
  );
}
