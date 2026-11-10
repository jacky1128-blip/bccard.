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
    // 지도 위 칩은 손가락도 가로로만(touch-pan-x · 지도가 같이 안 움직이게). 방 만들기 화면은 칩 위에서도 세로로 페이지가 내려가야 해서 제외
    // 가로로만: overflow-x 만 켜면 세로도 auto 가 돼서 그림자·터치 영역만큼 위아래로 흔들림 → 세로 막고, 그림자 자리는 py 로 확보
    <div className={`no-scrollbar -my-1.5 flex ${map ? 'touch-pan-x' : ''} gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain py-1.5 pr-8 [mask-image:linear-gradient(to_right,#000_calc(100%-36px),transparent)]`}>
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
