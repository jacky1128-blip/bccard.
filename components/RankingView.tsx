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
  placeQuery,
  storesByMode,
  fixedPlace,
  placeLabel,
  nearby = [],
  center,
  live = true,
  notFound = false,
}: {
  initialMode: Mode;
  placeQuery?: string; // 서버가 조회에 쓴 장소 입력 (업종별 순위를 따로 받을 때 그대로 넘김)
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

  // 업종 목록: 동네 전체 목록에서 가게가 많은 업종부터 (업종을 골라도 목록은 그대로)
  const cats = useMemo(() => {
    const n = new Map<string, number>();
    for (const s of stores) if (s.cat) n.set(s.cat, (n.get(s.cat) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [stores]);

  // 업종을 고르면 그 업종만의 순위를 따로 받아옴 (동네 전체 상위 100곳 안엔 한 업종이 몇 곳뿐이라)
  // 한 번 받은 업종은 기억해 두고, 받는 동안·실패하면 동네 전체 목록에서 그 업종만 거른 걸 보여 줌
  const [byCat, setByCat] = useState<Record<string, Record<Mode, StoreView[]> | 'loading' | 'error'>>({});
  const catState = f.cat ? byCat[f.cat] : undefined;
  useEffect(() => {
    const cat = f.cat;
    if (!cat || !live || !placeQuery || byCat[cat]) return;
    queueMicrotask(() => setByCat((x) => ({ ...x, [cat]: 'loading' })));
    fetch(`/api/ranking?${new URLSearchParams({ place: placeQuery, cat })}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { storesByMode: Record<Mode, StoreView[]> }) => setByCat((x) => ({ ...x, [cat]: d.storesByMode })))
      .catch(() => setByCat((x) => ({ ...x, [cat]: 'error' })));
  }, [f.cat, live, placeQuery, byCat]);
  const catLoading = catState === 'loading';
  // stores = 그 동네 식당 전체 (상황별 순서). 필터는 전체에서 거르고 위에서 10곳만 보여 줌
  const source = catState && typeof catState === 'object' ? catState[mode] : stores;
  const nowBucket = now == null ? undefined : timeBucket(now);
  // 영업 중 조건만 뺀 나머지 필터 결과 (예비 후보까지 전부, 매출 순)
  const base = useMemo(
    () =>
      source.filter(
        (s) =>
          (!f.cat || s.cat === f.cat) &&
          (!f.near || (s.walkMin ?? 99) <= 10) &&
          // 덜 붐비는 가게: 잇플 '가장 붐비는 시간대'가 지금 시간대가 아닌 곳
          (!f.lessBusy || !nowBucket || !s.busyTime || s.busyTime !== nowBucket),
      ),
    [source, f, nowBucket],
  );
  // 덜 붐비는 가게 때문에 다 빠졌는지 (빈 화면 안내용)
  const allBusyNow =
    f.lessBusy && !!nowBucket && source.some((s) => (!f.cat || s.cat === f.cat) && (!f.near || (s.walkMin ?? 99) <= 10) && s.busyTime === nowBucket);
  const isOpen = (s: StoreView) => now == null || likelyOpenAt(s.open, s.close, now) !== false;
  // 조건에 맞는 곳을 다 거른 다음 위에서 10곳 → 빠진 자리는 아래 순위 가게가 올라와 채움 (5위가 빠지면 6위가 5위로)
  // 순위 번호도 보이는 목록 기준으로 1부터 다시 매김 (지도 핀 번호도 같은 값)
  const list = (f.openNow ? base.filter(isOpen) : base).slice(0, 10).map((s, i) => ({ ...s, rank: i + 1 }));
  // 영업 중 필터를 켜면 문 닫은 곳은 목록에서 빼고, 보고 싶을 때만 펼침 (섞여 보이지 않게)
  // 원래 상위 10곳 안에 있었는데 문 닫아서 빠진 곳만. 지도 핀이 겹치지 않게 번호는 목록 다음부터
  const closed = f.openNow
    ? base
        .slice(0, 10)
        .filter((s) => !isOpen(s))
        .map((s, i) => ({ ...s, rank: list.length + i + 1 }))
    : [];
  const shown = more ? list : list.slice(0, 5);

  const active = hovered ?? picked;
  // 문 닫은 곳(dim)은 순위에서 빠졌으니 번호 없이
  const card = (s: StoreView, highlight?: string, dim = false) => (
    <div
      key={s.key}
      data-key={s.key}
      onMouseEnter={() => setHovered(s.key)}
      onMouseLeave={() => setHovered(null)}
      className={`rounded-2xl transition-shadow ${active === s.key ? 'shadow-[0_0_0_2px_var(--primary)]' : ''} ${dim ? 'opacity-60' : ''}`}
    >
      <StoreCard store={s} showRank={!dim} highlight={highlight} />
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
      <span className={`-mt-2 ${t.desc}`}>
        {f.cat ? `${f.cat} 중 ` : ''}
        {f.lessBusy && nowBucket
          ? `지금 시간대(${nowBucket})에 결제가 가장 몰리는 곳은 빼고, 결제 금액 순으로 최대 10곳이에요.`
          : '최근 결제 금액 순으로 최대 10곳이에요.'}
      </span>

      <div aria-busy={catLoading} className={`flex flex-col gap-2.5 transition-opacity md:grid md:grid-cols-2 md:gap-3 lg:flex ${catLoading ? 'opacity-50' : ''}`}>
        {shown.length === 0 && (
          <p className={`rounded-2xl bg-fill py-8 text-center md:col-span-2 ${t.desc}`}>
            {closed.length ? (
              '지금 문 연 곳이 없어요'
            ) : allBusyNow ? (
              <>
                이 동네는 지금({nowBucket})이 대부분 가게의 가장 붐비는 시간이에요
                <br />
                최근 1개월 결제가 가장 몰리는 시간대 기준이에요
              </>
            ) : (
              '조건에 맞는 곳이 없어요'
            )}
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
