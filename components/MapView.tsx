'use client';
// 네이버 지도 + 결제 순위 핀
// NEXT_PUBLIC_NAVER_MAP_KEY_ID 가 있으면 네이버 지도 JS v3, 없으면 와이어프레임 그대로의 자리표시 지도
import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import type { StoreView } from '@/lib/view';

const KEY_ID = process.env.NEXT_PUBLIC_NAVER_MAP_KEY_ID;
const DEFAULT_CENTER = { lat: 37.5007, lng: 127.0365 }; // 역삼역

type LatLng = { lat: number; lng: number };

/* ---------- 네이버 지도 (최소 타입) ---------- */
type NaverMaps = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => {
    setCenter: (c: unknown) => void;
    fitBounds: (b: unknown, margin?: { top: number; right: number; bottom: number; left: number }) => void;
    setSize?: (size: unknown) => void;
    destroy?: () => void;
  };
  LatLng: new (lat: number, lng: number) => unknown;
  LatLngBounds: new (sw: unknown, ne: unknown) => unknown;
  Marker: new (opts: Record<string, unknown>) => NaverMarker;
  Size: new (w: number, h: number) => unknown;
  Event: { addListener: (target: unknown, type: string, fn: () => void) => unknown };
};
type NaverMarker = { setMap: (m: unknown) => void; setIcon: (icon: unknown) => void; setZIndex: (z: number) => void; getElement?: () => HTMLElement | null };
declare global {
  interface Window { naver?: { maps: NaverMaps }; navermap_authFailure?: () => void }
}

// 핀: 처음엔 셋 다 숫자만, 누르면 숫자 원에서 오른쪽으로 늘어나며 가게 이름 (모양·움직임은 globals.css .bk-pin)
// 선택이 바뀔 때 HTML 을 갈아 끼우지 않고 클래스만 바꿔야 늘어나는 애니메이션이 보임
function pinHtml(rank: number, name: string, selected: boolean) {
  const safe = name.replace(/[<>&"]/g, '');
  return `<div class="bk-pin${selected ? ' is-on' : ''}" data-rank="${rank}"><span class="bk-pin__num">${rank}</span><span class="bk-pin__name">${safe}</span></div>`;
}

type PinProps = {
  selected?: string | null;                 // 펼쳐 보일 핀 (누름 · PC 마우스 올림)
  onSelect?: (key: string | null) => void;  // 핀 누름
  onHover?: (key: string | null) => void;   // 핀에 마우스 올림 (PC)
};
// 지도 위를 덮는 부분(px): 첫 화면 모바일은 위에 검색창·칩, 아래에 시트 → 핀은 그 사이에 오게
export type MapInset = { top: number; bottom: number };
const NO_INSET: MapInset = { top: 24, bottom: 24 };

function NaverMap({ center, stores, className, onAuthFail, selected, onSelect, onHover, inset }: { center: LatLng; stores: StoreView[]; className: string; onAuthFail: () => void; inset: MapInset } & PinProps) {
  const el = useRef<HTMLDivElement>(null);
  const markers = useRef<Map<string, NaverMarker>>(new Map());
  const latest = useRef({ stores, onSelect, onHover, selected, inset });
  useEffect(() => {
    latest.current = { stores, onSelect, onHover, selected, inset };
  });

  // 키·Web 서비스 URL 인증 실패 시 네이버가 이 전역 함수를 부름 → 자리표시 지도로
  useEffect(() => {
    window.navermap_authFailure = () => {
      console.error('[naver map] 인증 실패: ncpKeyId 값 또는 콘솔 Application 의 Web 서비스 URL(현재 주소의 호스트) 등록 확인');
      onAuthFail();
    };
    return () => {
      window.navermap_authFailure = undefined;
    };
  }, [onAuthFail]);
  const [ready, setReady] = useState(typeof window !== 'undefined' && !!window.naver?.maps);
  // 화면이 다시 그려질 때마다 지도를 새로 만들지 않도록, 가게 목록·여백이 실제로 바뀔 때만
  const storeKey = stores.map((s) => `${s.rank}:${s.key}@${s.lat},${s.lng}`).join('|');
  const insetKey = `${inset.top}/${inset.bottom}`;

  useEffect(() => {
    const maps = window.naver?.maps;
    const box = el.current;
    if (!ready || !maps || !box) return;
    const { stores: list, inset: pad } = latest.current;
    // 인증 실패 등으로 SDK 가 망가져 있어도 화면 전체가 죽지 않게
    let map: InstanceType<NaverMaps['Map']>;
    try {
      map = new maps.Map(box, { center: new maps.LatLng(center.lat, center.lng), zoom: 16, scaleControl: false, mapDataControl: false });
    } catch (e) {
      console.error('[naver map] 지도 생성 실패', e);
      return;
    }
    const me = new maps.Marker({
      position: new maps.LatLng(center.lat, center.lng),
      map,
      icon: { content: '<div style="width:22px;height:22px;border-radius:50%;background:#26325C;border:4px solid #fff;box-shadow:0 0 0 8px rgba(38,50,92,.15);transform:translate(-50%,-50%)"></div>' },
    });
    const pins = list.filter((s) => s.lat != null && s.lng != null);
    markers.current = new Map(
      pins.map((s) => {
        const sel = latest.current.selected === s.key;
        const m = new maps.Marker({ position: new maps.LatLng(s.lat!, s.lng!), map, zIndex: sel ? 100 : 20 - s.rank, icon: { content: pinHtml(s.rank, s.name, sel) } });
        // 같은 핀을 다시 누르면 선택 해제
        maps.Event.addListener(m, 'click', () => latest.current.onSelect?.(latest.current.selected === s.key ? null : s.key));
        maps.Event.addListener(m, 'mouseover', () => latest.current.onHover?.(s.key));
        maps.Event.addListener(m, 'mouseout', () => latest.current.onHover?.(null));
        return [s.key, m] as const;
      }),
    );
    // 내 위치 + 핀이 모두 보이게. 네이버 fitBounds 의 여백 옵션이 적용되지 않아서 범위를 직접 넓혀 여백을 만듦
    const pts = [{ lat: center.lat, lng: center.lng }, ...pins.map((s) => ({ lat: s.lat!, lng: s.lng! }))];
    if (pts.length > 1) {
      const h = box.clientHeight || 460;
      const usable = Math.max(120, h - pad.top - pad.bottom - 40);
      const lats = pts.map((p) => p.lat);
      const lngs = pts.map((p) => p.lng);
      const latSpan = Math.max(Math.max(...lats) - Math.min(...lats), 0.002);
      const lngSpan = Math.max(Math.max(...lngs) - Math.min(...lngs), 0.002);
      const n = Math.max(...lats) + (latSpan * (pad.top + 36)) / usable; // +36: 핀은 위로 솟음
      const sLat = Math.min(...lats) - (latSpan * (pad.bottom + 4)) / usable;
      const w = Math.min(...lngs) - lngSpan * 0.18;
      const e = Math.max(...lngs) + lngSpan * 0.32; // 핀 이름표가 오른쪽으로 펼쳐지니 오른쪽을 더
      map.fitBounds(new maps.LatLngBounds(new maps.LatLng(sLat, w), new maps.LatLng(n, e)));
    }
    // 창 크기·패널 전환으로 지도 영역이 바뀌면 지도 크기도 맞춤
    const ro = new ResizeObserver(() => {
      try {
        map.setSize?.(new maps.Size(box.clientWidth, box.clientHeight));
      } catch {
        /* 무시 */
      }
    });
    ro.observe(box);
    return () => {
      ro.disconnect();
      try {
        me.setMap(null);
        markers.current.forEach((m) => m.setMap(null));
        markers.current.clear();
        map.destroy?.();
      } catch {
        /* SDK 오류는 무시 */
      }
    };
  }, [ready, center.lat, center.lng, storeKey, insetKey]);

  // 선택이 바뀌면 핀 모양만 바꿈 (지도는 그대로)
  useEffect(() => {
    for (const s of latest.current.stores) {
      const m = markers.current.get(s.key);
      if (!m) continue;
      const sel = selected === s.key;
      try {
        // 클래스만 바꿔서 CSS 로 부드럽게 펼침 (요소를 못 찾으면 아이콘 교체로 대신)
        const pin = m.getElement?.()?.querySelector('.bk-pin');
        if (pin) pin.classList.toggle('is-on', sel);
        else m.setIcon({ content: pinHtml(s.rank, s.name, sel) });
        m.setZIndex(sel ? 100 : 20 - s.rank);
      } catch {
        /* SDK 오류는 무시 */
      }
    }
  }, [selected, storeKey]);

  return (
    <>
      <Script src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${KEY_ID}`} strategy="afterInteractive" onReady={() => setReady(true)} />
      <div ref={el} className={`bg-map ${className}`} role="img" aria-label="결제 순위 가게 위치 지도" />
    </>
  );
}

/* ---------- 키 없을 때(또는 인증 실패) 자리표시 지도 ---------- */
// 실제 좌표가 있으면 중심(내 위치·역) 기준 상대 위치로, 없으면 고정 자리. 위치는 "보이는 영역" 안의 비율(0~1)
const FALLBACK = [
  { x: 0.58, y: 0.3 },
  { x: 0.2, y: 0.62 },
  { x: 0.74, y: 0.8 },
];
function pinFractions(stores: StoreView[], center?: LatLng) {
  let pts = stores.map((_, i) => FALLBACK[i % 3] ?? { x: 0.5, y: 0.5 });
  if (center && !stores.some((s) => s.lat == null || s.lng == null)) {
    const kx = 88_000; // 경도 1도 ≈ 88km (위도 37도 부근)
    const ky = 111_000;
    const d = stores.map((s) => ({ x: (s.lng! - center.lng) * kx, y: (s.lat! - center.lat) * ky }));
    const max = Math.max(150, ...d.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))));
    pts = d.map((p) => ({ x: 0.46 + (p.x / max) * 0.36, y: 0.5 - (p.y / max) * 0.42 }));
  }
  // 다른 핀과 겹치면 조금씩 비켜 줌
  const clamp = (v: number) => Math.min(0.9, Math.max(0.08, v));
  const placed: { x: number; y: number }[] = [];
  for (const p of pts) {
    const tries = [0, 0.12, -0.12, 0.24, -0.24].flatMap((dy) => [0, 0.14, -0.14].map((dx) => ({ x: clamp(p.x + dx), y: clamp(p.y + dy) })));
    placed.push(tries.find((q) => !placed.some((o) => Math.abs(o.y - q.y) < 0.1 && Math.abs(o.x - q.x) < 0.12)) ?? { x: clamp(p.x), y: clamp(p.y) });
  }
  return placed;
}

function PlaceholderMap({ stores, center, className, note, selected, onSelect, onHover, inset }: { stores: StoreView[]; center?: LatLng; className: string; note?: string; inset: MapInset } & PinProps) {
  const fr = pinFractions(stores, center);
  // 보이는 영역(위·아래 덮인 부분 제외) 안의 비율 → CSS 위치
  const topOf = (f: number) => `calc(${inset.top + 36}px + (100% - ${inset.top + inset.bottom + 40}px) * ${f.toFixed(3)})`;
  return (
    <div className={`overflow-hidden bg-map ${className.includes('absolute') ? '' : 'relative'} ${className}`} aria-label="결제 순위 가게 위치 지도">
      <div className="absolute inset-x-0 top-[37.5%] h-3.5 bg-white" />
      <div className="absolute inset-y-0 left-[38%] w-3 bg-white" />
      <div className="absolute inset-x-0 top-[71%] h-2 bg-[#F7F8FA]" />
      <div className="absolute inset-y-0 left-[74%] w-2 bg-[#F7F8FA]" />
      <div className="absolute left-[8%] top-[45%] h-[21%] w-1/4 rounded-lg bg-[#DDE6D8]" />
      <div
        className="absolute size-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-navy shadow-[0_0_0_8px_rgba(38,50,92,0.15)]"
        style={{ left: '46%', top: topOf(0.5) }}
      />
      {stores.map((s, i) => {
        const sel = selected === s.key;
        return (
          <button
            key={s.key}
            type="button"
            aria-pressed={sel}
            aria-label={`${s.rank}위 ${s.name}`}
            data-rank={s.rank}
            onClick={() => onSelect?.(sel ? null : s.key)}
            onMouseEnter={() => onHover?.(s.key)}
            onMouseLeave={() => onHover?.(null)}
            className={`bk-pin absolute ${sel ? 'is-on z-10' : ''}`}
            style={{ left: `${(fr[i].x * 100).toFixed(1)}%`, top: topOf(fr[i].y) }}
          >
            <span className="bk-pin__num">{s.rank}</span>
            <span className="bk-pin__name">{s.name}</span>
          </button>
        );
      })}
      <span className="absolute right-3 text-[11px] text-sub" style={{ bottom: inset.bottom + 8 }}>
        {note ?? (center ? '위치는 결제 데이터 좌표 기준 · 네이버 지도 키 연결 전' : '[지도] 네이버 지도 키 연결 전')}
      </span>
    </div>
  );
}

export default function MapView({
  stores,
  center,
  className = '',
  inset = NO_INSET,
  selected,
  onSelect,
  onHover,
}: { stores: StoreView[]; center?: LatLng; className?: string; inset?: MapInset } & PinProps) {
  const [authFailed, setAuthFailed] = useState(false);
  const onAuthFail = useCallback(() => setAuthFailed(true), []);
  const pin = { selected, onSelect, onHover, inset };
  if (!KEY_ID) return <PlaceholderMap stores={stores} center={center} className={className} {...pin} />;
  // 인증 실패해도 네이버 지도 영역은 그대로 두고(SDK 가 그 요소를 계속 참조함) 위에 자리표시 지도를 덮음.
  // 먼저 없애 버리면 SDK 내부 오류로 페이지 전체가 죽음 (2026-11-10 확인: 등록 안 된 주소 → 401 → 'capitalize' of null)
  return (
    // isolate: 덮는 지도의 z-index 가 이 상자 안에서만 작동 (위의 검색창·상황 칩을 가리지 않게)
    <div className={`${/(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className) ? '' : 'relative'} isolate ${className}`}>
      {/* 네이버 지도가 이 요소에 position:relative 를 강제로 넣어서 absolute 로는 높이가 0이 됨 → h-full w-full */}
      <NaverMap center={center ?? DEFAULT_CENTER} stores={stores} className="h-full w-full" onAuthFail={onAuthFail} {...pin} />
      {authFailed && (
        <PlaceholderMap stores={stores} center={center} className="absolute inset-0 z-[1]" note="네이버 지도 인증 실패 · 콘솔 Web 서비스 URL에 이 주소 등록 필요" {...pin} />
      )}
    </div>
  );
}
