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
    destroy?: () => void;
  };
  LatLng: new (lat: number, lng: number) => unknown;
  LatLngBounds: new (sw: unknown, ne: unknown) => unknown;
  Marker: new (opts: Record<string, unknown>) => NaverMarker;
  Event: { addListener: (target: unknown, type: string, fn: () => void) => unknown };
};
type NaverMarker = { setMap: (m: unknown) => void; setIcon: (icon: unknown) => void; setZIndex: (z: number) => void };
declare global {
  interface Window { naver?: { maps: NaverMaps }; navermap_authFailure?: () => void }
}

// 핀: 처음엔 셋 다 숫자만, 누른 핀만 파란색 "번호 가게명"
function pinHtml(rank: number, name: string, selected: boolean) {
  const style = selected
    ? 'background:#2F54EB;color:#fff;padding:0 12px;box-shadow:0 4px 12px rgba(47,84,235,.35);'
    : 'background:#fff;color:#2F54EB;border:1.5px solid #2F54EB;width:32px;justify-content:center;';
  const safe = name.replace(/[<>&"]/g, '');
  return `<div style="${style}height:32px;border-radius:999px;display:flex;align-items:center;font-family:var(--font-display);font-size:13px;white-space:nowrap;cursor:pointer;transform:translate(-50%,-100%)">${rank}${selected ? ` ${safe}` : ''}</div>`;
}

type PinProps = { selected?: string | null; onSelect?: (key: string | null) => void };

function NaverMap({ center, top3, className, onAuthFail, selected, onSelect }: { center: LatLng; top3: StoreView[]; className: string; onAuthFail: () => void } & PinProps) {
  const el = useRef<HTMLDivElement>(null);
  const markers = useRef<Map<string, NaverMarker>>(new Map());
  const stores = useRef(top3);
  const select = useRef(onSelect);
  const chosen = useRef(selected);
  useEffect(() => {
    stores.current = top3;
    select.current = onSelect;
    chosen.current = selected;
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
  // 화면이 다시 그려질 때마다 지도를 새로 만들지 않도록, 가게 목록이 실제로 바뀔 때만
  const storeKey = top3.map((s) => `${s.key}@${s.lat},${s.lng}`).join('|');

  useEffect(() => {
    const maps = window.naver?.maps;
    if (!ready || !maps || !el.current) return;
    const list = stores.current;
    // 인증 실패 등으로 SDK 가 망가져 있어도 화면 전체가 죽지 않게
    let map: InstanceType<NaverMaps['Map']>;
    try {
      map = new maps.Map(el.current, { center: new maps.LatLng(center.lat, center.lng), zoom: 16, scaleControl: false, mapDataControl: false });
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
        const sel = chosen.current === s.key;
        const m = new maps.Marker({ position: new maps.LatLng(s.lat!, s.lng!), map, zIndex: sel ? 100 : 10 - s.rank, icon: { content: pinHtml(s.rank, s.name, sel) } });
        // 같은 핀을 다시 누르면 선택 해제
        maps.Event.addListener(m, 'click', () => select.current?.(chosen.current === s.key ? null : s.key));
        return [s.key, m] as const;
      }),
    );
    // 내 위치 + 핀이 모두 보이게 (위쪽은 검색창·상황 칩, 아래쪽은 시트가 덮으니 그만큼 여백)
    const pts = [{ lat: center.lat, lng: center.lng }, ...pins.map((s) => ({ lat: s.lat!, lng: s.lng! }))];
    if (pts.length > 1) {
      // 네이버 fitBounds 의 여백 옵션이 적용되지 않아서, 범위를 직접 넓혀 여백을 만듦
      // 지도 460px 중 위 ~200px 은 검색창·상황 칩, 아래 ~60px 은 시트가 덮음 → 가운데 200px 에 핀이 오게
      const h = el.current.clientHeight || 460;
      const top = 200;
      const bottom = 60;
      const usable = Math.max(120, h - top - bottom);
      const lats = pts.map((p) => p.lat);
      const lngs = pts.map((p) => p.lng);
      const latSpan = Math.max(Math.max(...lats) - Math.min(...lats), 0.002);
      const lngSpan = Math.max(Math.max(...lngs) - Math.min(...lngs), 0.002);
      const n = Math.max(...lats) + (latSpan * top) / usable;
      const sLat = Math.min(...lats) - (latSpan * bottom) / usable;
      const w = Math.min(...lngs) - lngSpan * 0.18;
      const e = Math.max(...lngs) + lngSpan * 0.32; // 핀 이름표가 오른쪽으로 펼쳐지니 오른쪽을 더
      map.fitBounds(new maps.LatLngBounds(new maps.LatLng(sLat, w), new maps.LatLng(n, e)));
    }
    return () => {
      try {
        me.setMap(null);
        markers.current.forEach((m) => m.setMap(null));
        markers.current.clear();
        map.destroy?.();
      } catch {
        /* SDK 오류는 무시 */
      }
    };
  }, [ready, center.lat, center.lng, storeKey]);

  // 선택이 바뀌면 핀 모양만 바꿈 (지도는 그대로)
  useEffect(() => {
    for (const s of stores.current) {
      const m = markers.current.get(s.key);
      if (!m) continue;
      const sel = selected === s.key;
      try {
        m.setIcon({ content: pinHtml(s.rank, s.name, sel) });
        m.setZIndex(sel ? 100 : 10 - s.rank);
      } catch {
        /* SDK 오류는 무시 */
      }
    }
  }, [selected, storeKey]);

  return (
    <>
      <Script src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${KEY_ID}`} strategy="afterInteractive" onReady={() => setReady(true)} />
      <div ref={el} className={`bg-map ${className}`} role="img" aria-label="결제 순위 1·2·3위 위치 지도" />
    </>
  );
}

/* ---------- 키 없을 때 자리표시 지도 ---------- */
// 지도 위쪽은 검색창·질문·상황 칩이 덮고(약 40%), 아래는 시트가 덮음 → 핀은 그 사이(46~88%)에만
const ME = { left: 46, top: 66 };
const PINS = [
  { left: 56, top: 58 },
  { left: 20, top: 76 },
  { left: 70, top: 84 },
];

// 키가 없어도 실제 좌표가 있으면 중심(내 위치·역) 기준 상대 위치로 핀을 찍음
function pinPositions(top3: StoreView[], center?: LatLng) {
  let pts = PINS.slice(0, top3.length);
  if (center && !top3.some((s) => s.lat == null || s.lng == null)) {
    const kx = 88_000; // 경도 1도 ≈ 88km (위도 37도 부근)
    const ky = 111_000;
    const d = top3.map((s) => ({ x: (s.lng! - center.lng) * kx, y: (s.lat! - center.lat) * ky }));
    const max = Math.max(150, ...d.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))));
    pts = d.map((p) => ({ left: ME.left + (p.x / max) * 32, top: ME.top - (p.y / max) * 20 }));
  }
  // 1위는 이름까지 나와서 넓음 → 다른 핀과 겹치면 아래로 비켜 줌
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const placed: { left: number; top: number }[] = [];
  for (const [i, p] of pts.entries()) {
    const base = { left: clamp(p.left, 14, 82), top: clamp(p.top, 46, 88) };
    const hits = (q: { left: number; top: number }) =>
      placed.some((o, j) => Math.abs(o.top - q.top) < 9 && Math.abs(o.left - q.left) < (j === 0 || i === 0 ? 32 : 12));
    // 위아래로 조금씩 멀리 → 그래도 겹치면 좌우로
    const tries = [0, 10, -10, 20, -20, 30, -30].flatMap((dy) => [0, 30, -30].map((dx) => ({ left: clamp(base.left + dx, 14, 82), top: clamp(base.top + dy, 46, 88) })));
    placed.push(tries.find((q) => !hits(q)) ?? base);
  }
  return placed.map((p) => ({ left: `${Math.round(p.left)}%`, top: `${Math.round(p.top)}%` }));
}

function PlaceholderMap({ top3, center, className, note, selected, onSelect }: { top3: StoreView[]; center?: LatLng; className: string; note?: string } & PinProps) {
  const pins = pinPositions(top3, center);
  return (
    <div className={`overflow-hidden bg-map ${className.includes("absolute") ? "" : "relative"} ${className}`} aria-label="결제 순위 1·2·3위 위치 지도">
      <div className="absolute inset-x-0 top-[37.5%] h-3.5 bg-white" />
      <div className="absolute inset-y-0 left-[38%] w-3 bg-white" />
      <div className="absolute inset-x-0 top-[71%] h-2 bg-[#F7F8FA]" />
      <div className="absolute inset-y-0 left-[74%] w-2 bg-[#F7F8FA]" />
      <div className="absolute left-[8%] top-[45%] h-[21%] w-1/4 rounded-lg bg-[#DDE6D8]" />
      <div className="absolute left-[46%] top-[66%] size-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-navy shadow-[0_0_0_8px_rgba(38,50,92,0.15)]" />
      {top3.map((s, i) => {
        const sel = selected === s.key;
        return (
          <button
            key={s.key}
            type="button"
            aria-pressed={sel}
            aria-label={`${i + 1}위 ${s.name}`}
            onClick={() => onSelect?.(sel ? null : s.key)}
            className={`absolute flex h-8 -translate-x-1/2 -translate-y-full items-center justify-center whitespace-nowrap rounded-full font-display text-[13px] ${
              sel ? 'z-10 bg-primary px-3 text-white shadow-[0_4px_12px_rgba(47,84,235,0.35)]' : 'w-8 border-[1.5px] border-primary bg-white text-primary'
            }`}
            style={pins[i]}
          >
            {i + 1}
            {sel && ` ${s.name}`}
          </button>
        );
      })}
      <span className="absolute bottom-3 right-3 text-[11px] text-sub">{note ?? (center ? '위치는 결제 데이터 좌표 기준 · 네이버 지도 키 연결 전' : '[지도] 네이버 지도 키 연결 전')}</span>
    </div>
  );
}

export default function MapView({ top3, center, className = '', selected, onSelect }: { top3: StoreView[]; center?: LatLng; className?: string } & PinProps) {
  const [authFailed, setAuthFailed] = useState(false);
  const onAuthFail = useCallback(() => setAuthFailed(true), []);
  if (!KEY_ID) return <PlaceholderMap top3={top3} center={center} className={className} selected={selected} onSelect={onSelect} />;
  // 인증 실패해도 네이버 지도 영역은 그대로 두고(SDK 가 그 요소를 계속 참조함) 위에 자리표시 지도를 덮음.
  // 먼저 없애 버리면 SDK 내부 오류로 페이지 전체가 죽음 (2026-11-10 확인: 등록 안 된 주소 → 401 → 'capitalize' of null)
  return (
    // isolate: 덮는 지도의 z-index 가 이 상자 안에서만 작동 (위의 검색창·상황 칩을 가리지 않게)
    <div className={`relative isolate ${className}`}>
      {/* 네이버 지도가 이 요소에 position:relative 를 강제로 넣어서 absolute 로는 높이가 0이 됨 → h-full w-full */}
      <NaverMap center={center ?? DEFAULT_CENTER} top3={top3} className="h-full w-full" onAuthFail={onAuthFail} selected={selected} onSelect={onSelect} />
      {authFailed && (
        <PlaceholderMap top3={top3} center={center} className="absolute inset-0 z-[1]" note="네이버 지도 인증 실패 · 콘솔 Web 서비스 URL에 이 주소 등록 필요" selected={selected} onSelect={onSelect} />
      )}
    </div>
  );
}
