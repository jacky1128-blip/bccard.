'use client';
// A0 첫 화면 본문: 상황 칩을 누르면 지도 핀·TOP 3·하단 버튼이 함께 바뀜
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const rowsRef = useRef<HTMLDivElement>(null);
  const pickFromMap = (key: string | null) => {
    setPicked(key);
    // 시트에서 그 줄이 보이게
    if (key) rowsRef.current?.querySelector(`[data-key="${CSS.escape(key)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

  return (
    <main className="relative flex flex-1 flex-col">
      <MapView top3={top3} center={center} className="h-[460px] shrink-0" selected={selected} onSelect={pickFromMap} />

      {/* 지도 위 검색 + 상황 칩 */}
      <div className="absolute inset-x-4 top-4 flex flex-col gap-2.5">
        <div className="flex gap-2">
          <Link
            href={`/ranking?mode=${mode}${placeQs}`}
            className="flex h-12 flex-1 items-center gap-2 rounded-[14px] bg-white px-3.5 no-underline shadow-[0_2px_10px_rgba(0,0,0,0.10)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B5F66" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <span className="text-sm text-sub">동네나 역 이름으로 검색해요</span>
          </Link>
          <button type="button" aria-label="내 위치로 이동" onClick={locate} disabled={locating} className="flex size-12 items-center justify-center rounded-[14px] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.10)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F54EB" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          </button>
        </div>
        {/* 칩이 필터가 아니라 "상황 고르기"라는 걸 질문으로 먼저 보여줌 */}
        <span className="self-start rounded-full bg-white/90 px-3 py-1 text-[13px] font-bold text-ink shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          어떤 상황에서 식당을 찾으세요?
        </span>
        <ModeChips
          value={mode}
          onChange={(x) => {
            setMode(x);
            syncModeToUrl(x);
          }}
        />
      </div>

      {/* 바텀 시트 */}
      <div className="relative -mt-8 flex flex-1 flex-col gap-3 rounded-t-[22px] bg-white px-5 pb-5 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <span className="h-1 w-10 self-center rounded-sm bg-[#D5D8DC]" />
        <Brand />
        {/* 위: 장소 + TOP 3 (작은 파란 글씨) / 큰 제목: 상황마다 바뀜 (혼자·여럿이 구분) */}
        <div className="flex items-baseline justify-between gap-2">
          <span className={t.kicker}>{placeLabel === '내 위치' || !placeLabel ? '내 주변' : `${place} 근처`} 결제 많은 가게 TOP 3</span>
          <Link href={`/ranking?mode=${mode}${placeQs}`} className={`shrink-0 ${btn.textLink}`}>전체 순위 보기</Link>
        </div>
        <h2 className={`-mt-1.5 ${t.sheetTitle}`}>{m.homeTitle}</h2>
        <span className={`-mt-1.5 ${t.desc}`}>
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
              <TopRow store={s} active={selected === s.key} onSelect={() => setPicked(selected === s.key ? null : s.key)} />
            </div>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-1.5 pt-2">
          <Link href={m.ctaHref.includes('?') ? `${m.ctaHref}${placeQs}` : m.ctaHref} className={btn.primary}>{m.cta}</Link>
          <span className={`text-center ${t.desc}`}>{m.ctaSub}</span>
        </div>
      </div>
    </main>
  );
}
