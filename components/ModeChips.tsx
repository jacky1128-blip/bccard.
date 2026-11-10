'use client';
// 상황 선택 (누르면 화면 안에서 바로 바뀌고, 주소의 ?mode= 도 같이 바뀜)
import type { Mode } from '@/types/group';
import { MODES, MODE_ORDER } from '@/lib/modes';
import { btn } from './ui';

// 새로고침·공유해도 같은 상황이 보이도록 주소만 조용히 갱신
export function syncModeToUrl(m: Mode) {
  const url = new URL(window.location.href);
  url.searchParams.set('mode', m);
  window.history.replaceState(null, '', url);
}

// variant: map = 지도 위 떠 있는 칩 (A0) / tabs = 밑줄 탭 (A1) / pills = 테두리 칩 (같이 정하기)
export default function ModeChips({
  value,
  onChange,
  variant = 'map',
}: {
  value: Mode;
  onChange: (m: Mode) => void;
  variant?: 'map' | 'tabs' | 'pills';
}) {
  if (variant === 'tabs') {
    return (
      <div role="tablist" className="grid grid-cols-4">
        {MODE_ORDER.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={m === value}
            onClick={() => onChange(m)}
            className={`h-11 font-display text-[15px] ${m === value ? 'border-b-[3px] border-primary text-ink' : 'border-b border-line text-sub hover:text-ink'}`}
          >
            {MODES[m].short}
          </button>
        ))}
      </div>
    );
  }
  const map = variant === 'map';
  return (
    // 좁은 화면: 줄바꿈 없이 가로 스크롤 + 오른쪽 끝을 흐리게 (더 있다는 표시)
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto pr-8 [mask-image:linear-gradient(to_right,#000_calc(100%-36px),transparent)]">
      {MODE_ORDER.map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={m === value}
          onClick={() => onChange(m)}
          className={`${m === value ? btn.pillOn : map ? btn.pillOff.replace('border-line', 'border-white') : btn.pillOff} ${map ? 'shadow-[0_2px_8px_rgba(0,0,0,0.10)]' : ''}`}
        >
          {MODES[m].label}
        </button>
      ))}
    </div>
  );
}
