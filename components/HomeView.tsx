'use client';
// A0 첫 화면 본문: 상황 칩을 누르면 지도 핀·TOP 3·하단 버튼이 함께 바뀜
import { useState } from 'react';
import Link from 'next/link';
import type { Mode } from '@/types/group';
import type { StoreView } from '@/lib/view';
import { MODES } from '@/lib/modes';
import MapView from './MapView';
import ModeChips, { syncModeToUrl } from './ModeChips';
import { TopRow } from './StoreRow';
import { Brand, btn, t } from './ui';

export default function HomeView({ initialMode, storesByMode }: { initialMode: Mode; storesByMode: Record<Mode, StoreView[]> }) {
  const [mode, setMode] = useState(initialMode);
  const m = MODES[mode];
  const top3 = storesByMode[mode].slice(0, 3);

  return (
    <main className="relative flex flex-1 flex-col">
      <MapView top3={top3} className="h-[460px] shrink-0" />

      {/* 지도 위 검색 + 상황 칩 */}
      <div className="absolute inset-x-4 top-4 flex flex-col gap-2.5">
        <div className="flex gap-2">
          <Link
            href={`/ranking?mode=${mode}`}
            className="flex h-12 flex-1 items-center gap-2 rounded-[14px] bg-white px-3.5 no-underline shadow-[0_2px_10px_rgba(0,0,0,0.10)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B5F66" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <span className="text-sm text-sub">지금 주변에서 뭐 먹지? 동네·역 검색</span>
          </Link>
          <button type="button" aria-label="내 위치로 이동" className="flex size-12 items-center justify-center rounded-[14px] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.10)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F54EB" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          </button>
        </div>
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
        <div className="flex items-baseline justify-between">
          <h2 className={t.sheetTitle}>내 주변 {m.label} 결제 TOP 3</h2>
          <Link href={`/ranking?mode=${mode}`} className={btn.textLink}>전체 순위 보기</Link>
        </div>
        <span className={`-mt-1.5 ${t.desc}`}>{m.place} 기준 · 지도의 1·2·3 · 리뷰 말고 최근 1개월 BC카드 결제 기준</span>
        <div className="flex flex-col">
          {top3.map((s) => <TopRow key={s.key} store={s} />)}
        </div>
        <div className="mt-auto flex flex-col gap-1.5 pt-2">
          <Link href={m.ctaHref} className={btn.primary}>{m.cta}</Link>
          <span className={`text-center ${t.desc}`}>지금 시간 · 영업 여부 · 혼잡도까지 따져서 골라드려요</span>
        </div>
      </div>
    </main>
  );
}
