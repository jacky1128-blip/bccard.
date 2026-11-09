'use client';
// 네이버 지도 + 결제 순위 핀
// NEXT_PUBLIC_NAVER_MAP_KEY_ID 가 있으면 네이버 지도 JS v3, 없으면 와이어프레임 그대로의 자리표시 지도
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import type { StoreView } from '@/lib/view';

const KEY_ID = process.env.NEXT_PUBLIC_NAVER_MAP_KEY_ID;
const DEFAULT_CENTER = { lat: 37.5007, lng: 127.0365 }; // 역삼역

type LatLng = { lat: number; lng: number };

/* ---------- 네이버 지도 (최소 타입) ---------- */
type NaverMaps = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => { setCenter: (c: unknown) => void; destroy?: () => void };
  LatLng: new (lat: number, lng: number) => unknown;
  Marker: new (opts: Record<string, unknown>) => { setMap: (m: unknown) => void };
};
declare global {
  interface Window { naver?: { maps: NaverMaps } }
}

function pinHtml(rank: number, name: string) {
  const first = rank === 1;
  const style = first
    ? 'background:#2F54EB;color:#fff;'
    : 'background:#fff;color:#2F54EB;border:1.5px solid #2F54EB;';
  return `<div style="${style}height:32px;padding:0 10px;border-radius:999px;display:flex;align-items:center;font-family:var(--font-display);font-size:13px;white-space:nowrap;transform:translate(-50%,-100%)">${rank}${first ? ` ${name}` : ''}</div>`;
}

function NaverMap({ center, top3, className }: { center: LatLng; top3: StoreView[]; className: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(typeof window !== 'undefined' && !!window.naver?.maps);

  useEffect(() => {
    const maps = window.naver?.maps;
    if (!ready || !maps || !el.current) return;
    const map = new maps.Map(el.current, { center: new maps.LatLng(center.lat, center.lng), zoom: 16, scaleControl: false, mapDataControl: false });
    const markers = [
      new maps.Marker({
        position: new maps.LatLng(center.lat, center.lng),
        map,
        icon: { content: '<div style="width:22px;height:22px;border-radius:50%;background:#26325C;border:4px solid #fff;box-shadow:0 0 0 8px rgba(38,50,92,.15);transform:translate(-50%,-50%)"></div>' },
      }),
      ...top3
        .filter((s) => s.lat != null && s.lng != null)
        .map((s) => new maps.Marker({ position: new maps.LatLng(s.lat!, s.lng!), map, icon: { content: pinHtml(s.rank, s.name) } })),
    ];
    return () => {
      markers.forEach((m) => m.setMap(null));
      map.destroy?.();
    };
  }, [ready, center.lat, center.lng, top3]);

  return (
    <>
      <Script src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${KEY_ID}`} strategy="afterInteractive" onReady={() => setReady(true)} />
      <div ref={el} className={`bg-map ${className}`} role="img" aria-label="결제 순위 1·2·3위 위치 지도" />
    </>
  );
}

/* ---------- 키 없을 때 자리표시 지도 ---------- */
const PINS = [
  { left: '51%', top: '43%' },
  { left: '18%', top: '59%' },
  { left: '62%', top: '64%' },
];

// 키가 없어도 실제 좌표가 있으면 중심(내 위치·역) 기준 상대 위치로 핀을 찍음
function pinPositions(top3: StoreView[], center?: LatLng) {
  if (!center || top3.some((s) => s.lat == null || s.lng == null)) return PINS;
  const kx = 88_000; // 경도 1도 ≈ 88km (위도 37도 부근)
  const ky = 111_000;
  const d = top3.map((s) => ({ x: (s.lng! - center.lng) * kx, y: (s.lat! - center.lat) * ky }));
  const max = Math.max(150, ...d.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))));
  return d.map((p) => ({ left: `${Math.round(46 + (p.x / max) * 32)}%`, top: `${Math.round(52 - (p.y / max) * 32)}%` }));
}

function PlaceholderMap({ top3, center, className }: { top3: StoreView[]; center?: LatLng; className: string }) {
  const pins = pinPositions(top3, center);
  return (
    <div className={`relative overflow-hidden bg-map ${className}`} role="img" aria-label="결제 순위 1·2·3위 위치 지도">
      <div className="absolute inset-x-0 top-[37.5%] h-3.5 bg-white" />
      <div className="absolute inset-y-0 left-[38%] w-3 bg-white" />
      <div className="absolute inset-x-0 top-[71%] h-2 bg-[#F7F8FA]" />
      <div className="absolute inset-y-0 left-[74%] w-2 bg-[#F7F8FA]" />
      <div className="absolute left-[8%] top-[45%] h-[21%] w-1/4 rounded-lg bg-[#DDE6D8]" />
      <div className="absolute left-[46%] top-[52%] size-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-navy shadow-[0_0_0_8px_rgba(38,50,92,0.15)]" />
      {top3.map((s, i) => (
        <div
          key={s.key}
          className={`absolute flex h-8 -translate-x-1/2 -translate-y-full items-center whitespace-nowrap rounded-full px-2.5 font-display text-[13px] ${
            i === 0 ? 'bg-primary text-white' : 'border-[1.5px] border-primary bg-white text-primary'
          }`}
          style={pins[i]}
        >
          {i + 1}
          {i === 0 && ` ${s.name}`}
        </div>
      ))}
      <span className="absolute bottom-3 right-3 text-[11px] text-sub">{center ? '위치는 결제 데이터 좌표 기준 · 네이버 지도 키 연결 전' : '[지도] 네이버 지도 키 연결 전'}</span>
    </div>
  );
}

export default function MapView({ top3, center, className = '' }: { top3: StoreView[]; center?: LatLng; className?: string }) {
  return KEY_ID ? <NaverMap center={center ?? DEFAULT_CENTER} top3={top3} className={className} /> : <PlaceholderMap top3={top3} center={center} className={className} />;
}
