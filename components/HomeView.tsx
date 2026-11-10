'use client';
// A0 첫 화면 본문: 상황 칩을 누르면 지도 핀·TOP 3·하단 버튼이 함께 바뀜
// 모바일: 지도 전체 + 끌어서 3단계로 조절하는 하단 시트(접힘·반·펼침), 추천 버튼은 시트 맨 아래에 항상 보임
// 태블릿·PC(768px~): 왼쪽 400px 패널(검색·상황 칩·TOP 3·추천 버튼) + 오른쪽 지도 전체
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTablet, useViewportHeight } from '@/lib/useMedia';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Mode } from '@/types/group';
import type { StoreView } from '@/lib/view';
import { MODES } from '@/lib/modes';
import MapView from './MapView';
import ModeChips, { syncModeToUrl } from './ModeChips';
import { TopRow } from './StoreRow';
import DemoNote from './DemoNote';
import { Brand, btn, t } from './ui';

const MAP_TOP = 172; // 모바일 지도 위 검색창·질문·상황 칩 높이

export default function HomeView({
  initialMode,
  storesByMode,
  center,
  placeLabel,
  live = true,
  notFound = false,
  defaultPlace = false,
}: {
  initialMode: Mode;
  storesByMode: Record<Mode, StoreView[]>;
  center?: { lat: number; lng: number };
  placeLabel?: string;
  live?: boolean;
  notFound?: boolean;
  defaultPlace?: boolean; // 주소에 place 가 없어 기본 위치(역삼역)로 보여주는 중
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [locating, setLocating] = useState(false);
  const [geoFail, setGeoFail] = useState(false);
  const m = MODES[mode];
  const top3 = useMemo(() => storesByMode[mode].slice(0, 3), [storesByMode, mode]);
  // 지도 핀 ↔ TOP 3 줄 연결 (누른 가게)
  const [picked, setPicked] = useState<string | null>(null);
  const selected = top3.some((s) => s.key === picked) ? picked : null;
  // PC: 목록·핀에 마우스를 올리면 서로 강조
  const [hovered, setHovered] = useState<string | null>(null);
  const active = (hovered && top3.some((s) => s.key === hovered) ? hovered : null) ?? selected;
  const rowsRef = useRef<HTMLDivElement>(null);
  const pickFromMap = (key: string | null) => {
    setPicked(key);
    // 시트에서 그 줄이 보이게
    if (key) rowsRef.current?.querySelector(`[data-key="${CSS.escape(key)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // 하단 시트 3단계 (모바일). 접힘: 제목 + 추천 버튼 / 반: TOP 3 목록 / 펼침: 화면 대부분
  const wide = useTablet();
  const vh = useViewportHeight();
  // 반: 실제 내용(머리 + TOP 3 + 버튼) 높이만큼, 단 지도가 너무 가려지지 않게 화면 높이 - 230 까지
  const headRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState(520);
  useEffect(() => {
    const els = [headRef.current, listRef.current?.firstElementChild as HTMLElement | null, footRef.current];
    if (els.some((x) => !x)) return;
    // 목록 칸은 시트를 채우려고 늘어나므로, 늘어난 칸이 아니라 안의 내용 높이를 잼
    const measure = () => {
      // 화면을 떠난 직후에도 한 번 더 불릴 수 있어서 요소가 없으면 무시
      const head = headRef.current;
      const list = listRef.current?.firstElementChild;
      const foot = footRef.current;
      if (!head || !list || !foot) return;
      setNatural(head.offsetHeight + list.getBoundingClientRect().height + foot.offsetHeight + 14);
    };
    const ro = new ResizeObserver(measure);
    els.forEach((x) => ro.observe(x!));
    measure();
    return () => ro.disconnect();
  }, []);
  const snaps = { peek: 236, half: Math.max(300, Math.min(vh - 230, natural)), full: Math.max(320, vh - 64) };
  const [snap, setSnap] = useState<keyof typeof snaps>('half');
  const [dragH, setDragH] = useState<number | null>(null);
  const drag = useRef<{ y: number; h: number; moved: boolean } | null>(null);
  const sheetH = dragH ?? snaps[snap];
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('a,button')) return;
    drag.current = { y: e.clientY, h: sheetH, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 4) d.moved = true;
    if (d.moved) setDragH(Math.min(snaps.full, Math.max(snaps.peek - 40, d.h - dy)));
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      // 손잡이를 톡 누르면: 반 ↔ 펼침, 접힘이면 반으로
      setSnap(snap === 'half' ? 'full' : 'half');
      return;
    }
    const h = dragH ?? sheetH;
    const nearest = (Object.keys(snaps) as (keyof typeof snaps)[]).reduce((a, k) => (Math.abs(snaps[k] - h) < Math.abs(snaps[a] - h) ? k : a), 'half');
    setSnap(nearest);
    setDragH(null);
  };
  const place = placeLabel ?? m.place;
  const placeQs = placeLabel ? `&place=${encodeURIComponent(placeLabel === '내 위치' && center ? `${center.lat},${center.lng}` : placeLabel)}` : '';

  // 내 위치 → 좌표를 장소로 넘기면 서버가 행정구역으로 바꿔 그 동네 결제 순위를 보여줌
  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lng = pos.coords.longitude.toFixed(4);
        router.replace(`/?mode=${mode}&place=${lat},${lng}`);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  };

  // 처음 열었을 때(장소 지정 없음) 바로 내 위치로. 권한 거부·실패하면 기본 위치(역삼역) 그대로 + 안내
  useEffect(() => {
    if (!defaultPlace) return;
    if (!('geolocation' in navigator)) {
      queueMicrotask(() => setGeoFail(true));
      return;
    }
    // 위치 응답이 늦게 와도, 그사이 사용자가 다른 화면으로 갔거나 장소를 골랐으면 첫 화면으로 끌고 오지 않음
    // (두 화면 이동이 겹쳐 React 'conditional use()' 오류가 나던 원인)
    let alive = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!alive || window.location.pathname !== '/' || new URLSearchParams(window.location.search).has('place')) return;
        const mode = new URLSearchParams(window.location.search).get('mode') ?? initialMode;
        router.replace(`/?mode=${mode}&place=${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`);
      },
      () => alive && setGeoFail(true),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    );
    return () => {
      alive = false;
    };
  }, [defaultPlace, initialMode, router]);

  // 검색창 + 내 위치 + 상황 질문·칩 (모바일은 지도 위에 띄우고, 태블릿·PC 는 왼쪽 패널 맨 위)
  const controls = (
    <>
      <div className="flex gap-2">
        <Link
          href={`/ranking?mode=${mode}${placeQs}`}
          className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-[14px] bg-white px-3.5 no-underline shadow-[0_2px_10px_rgba(0,0,0,0.10)] md:border md:border-line md:shadow-none"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B5F66" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <span className="truncate text-sm text-sub">동네나 역 이름으로 검색해요</span>
        </Link>
        <button type="button" aria-label="내 위치로 이동" onClick={locate} disabled={locating} className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.10)] md:border md:border-line md:shadow-none">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F54EB" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
        </button>
      </div>
      {/* 칩이 필터가 아니라 "상황 고르기"라는 걸 질문으로 먼저 보여줌 */}
      <span className="self-start rounded-full bg-white/90 px-3 py-1 text-[13px] font-bold text-ink shadow-[0_2px_8px_rgba(0,0,0,0.08)] md:bg-transparent md:px-0 md:shadow-none">
        어떤 상황에서 식당을 찾으세요?
      </span>
      <ModeChips
        value={mode}
        onChange={(x) => {
          setMode(x);
          setPicked(null);
          syncModeToUrl(x);
        }}
      />
    </>
  );

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-white md:flex md:flex-row-reverse">
      <MapView
        stores={top3}
        center={center}
        className="absolute inset-0 md:static md:h-full md:min-w-0 md:flex-1"
        inset={wide ? { top: 24, bottom: 24 } : { top: MAP_TOP, bottom: snaps.half }}
        selected={active}
        onSelect={pickFromMap}
        onHover={setHovered}
      />

      {/* 모바일: 지도 위 검색 + 상황 칩 (노치 아래로) */}
      <div className="absolute inset-x-4 top-[max(16px,env(safe-area-inset-top))] z-10 flex flex-col gap-2.5 md:hidden">{controls}</div>

      {/* 모바일: 하단 시트 / 태블릿·PC: 왼쪽 패널 */}
      <section
        aria-label="결제 많은 가게 TOP 3"
        style={wide ? undefined : { height: sheetH }}
        className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[22px] bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] ${
          dragH == null ? 'transition-[height] duration-300 ease-out' : ''
        } md:static md:h-full md:w-[400px] md:shrink-0 md:rounded-none md:shadow-[1px_0_0_var(--line)]`}
      >
        {/* 끌어서 높이 조절 (손잡이 + 머리 부분) */}
        <div
          ref={headRef}
          className="flex shrink-0 cursor-grab touch-none flex-col gap-3 px-5 pt-3 active:cursor-grabbing md:cursor-auto md:touch-auto md:gap-4 md:pt-6"
          onPointerDown={wide ? undefined : onDown}
          onPointerMove={wide ? undefined : onMove}
          onPointerUp={wide ? undefined : onUp}
          onPointerCancel={wide ? undefined : onUp}
        >
          <button
            type="button"
            aria-label={snap === 'full' ? '목록 줄이기' : '목록 펼치기'}
            onClick={() => setSnap(snap === 'half' ? 'full' : 'half')}
            className="-my-1.5 flex h-5 items-center justify-center self-center px-6 md:hidden"
          >
            <span className="h-1 w-10 rounded-sm bg-[#D5D8DC]" />
          </button>
          <Brand />
          <div className="hidden flex-col gap-2.5 md:flex">{controls}</div>
          {/* 위: 장소 + TOP 3 (작은 파란 글씨) / 큰 제목: 상황마다 바뀜 (혼자·여럿이 구분) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className={`min-w-0 truncate ${t.kicker}`}>{placeLabel === '내 위치' || !placeLabel ? '내 주변' : `${place} 근처`} 결제 많은 가게 TOP 3</span>
              <Link href={`/ranking?mode=${mode}${placeQs}`} className={`shrink-0 ${btn.textLink}`}>전체 순위 보기</Link>
            </div>
            <h2 className={t.sheetTitle}>{m.homeTitle}</h2>
          </div>
        </div>

        {/* 목록: 시트 높이 안에서 스크롤 */}
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-1.5">
         <div className="flex flex-col gap-3">
          <span className={t.desc}>
            {locating || (defaultPlace && !geoFail)
              ? `내 위치 찾는 중… 잠시 ${place} 기준으로 보여드려요 · `
              : defaultPlace
                ? `내 위치를 가져오지 못해 기본 위치(${place}) 기준이에요 · 오른쪽 위 ⊙ 버튼이나 검색으로 바꿀 수 있어요 · `
                : ''}
            지도의 번호와 같아요. 최근 1개월 BC카드 결제 정보를 참고했어요.
          </span>
          {!live && <DemoNote notFound={notFound} place={place} />}
          <div ref={rowsRef} className="flex flex-col">
            {top3.map((s) => (
              <div key={s.key} data-key={s.key}>
                <TopRow
                  store={s}
                  active={active === s.key}
                  onSelect={() => setPicked(selected === s.key ? null : s.key)}
                  onHover={(on) => setHovered(on ? s.key : null)}
                />
              </div>
            ))}
          </div>
         </div>
        </div>

        {/* 추천 버튼: 시트 높이와 상관없이 항상 보임 (홈바만큼 아래 여백) */}
        <div ref={footRef} className="flex shrink-0 flex-col gap-1.5 border-t border-line/60 bg-white px-5 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] md:border-t-0 md:pb-6">
          <Link href={m.ctaHref.includes('?') ? `${m.ctaHref}${placeQs}` : m.ctaHref} className={btn.primary}>{m.cta}</Link>
          <span className={`text-center ${t.desc}`}>{m.ctaSub}</span>
        </div>
      </section>
    </main>
  );
}
