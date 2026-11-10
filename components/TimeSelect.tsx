'use client';
// 시간 선택: 오전/오후 · 시 · 분(1분 단위)을 굴려서 고르는 휠
// <input type="time"> 은 맥 Safari 에서 선택창이 안 떠서, 모든 브라우저에서 같은 휠을 씀 (휴대폰은 아래에서 올라오는 시트)
import { useEffect, useRef, useState } from 'react';
import { btn } from './ui';

const ITEM = 40; // 한 칸 높이(px)
const VISIBLE = 5; // 보이는 칸 수 (가운데가 선택)

export function timeLabel(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ap} ${h12}:${String(m).padStart(2, '0')}`;
}

const AMPM = ['오전', '오후'];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1)); // 1~12
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function split(hhmm: string) {
  const [h, m] = (hhmm || '12:30').split(':').map(Number);
  return { ap: h < 12 ? 0 : 1, hour: (h % 12 === 0 ? 12 : h % 12) - 1, minute: m };
}
function join(ap: number, hour: number, minute: number) {
  const h12 = hour + 1;
  const h = ap === 0 ? (h12 === 12 ? 0 : h12) : h12 === 12 ? 12 : h12 + 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// 굴리는 한 줄. 멈추면 가운데 칸을 고른 것으로
function Wheel({ items, index, onChange, label }: { items: string[]; index: number; onChange: (i: number) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = index * ITEM;
    // 처음 열 때만 위치 맞춤
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pick = (i: number) => {
    ref.current?.scrollTo({ top: i * ITEM, behavior: 'smooth' });
    onChange(i);
  };
  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      className="no-scrollbar relative flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain"
      style={{ height: ITEM * VISIBLE, paddingBlock: ITEM * Math.floor(VISIBLE / 2) }}
      onScroll={(e) => {
        const el = e.currentTarget;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM)));
          if (i !== index) onChange(i);
        }, 80);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); pick(Math.min(items.length - 1, index + 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); pick(Math.max(0, index - 1)); }
      }}
    >
      {items.map((x, i) => (
        <button
          key={x}
          type="button"
          role="option"
          aria-selected={i === index}
          tabIndex={-1}
          onClick={() => pick(i)}
          className={`flex w-full snap-center items-center justify-center tabular-nums transition-colors ${i === index ? 'text-[20px] font-bold text-ink' : 'text-[17px] text-sub'}`}
          style={{ height: ITEM }}
        >
          {x}
        </button>
      ))}
    </div>
  );
}

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  'aria-label'?: string;
};

export default function TimeSelect({ value, onChange, placeholder = '시간 선택', className = '', required, 'aria-label': ariaLabel = '시간' }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => split(value));
  const show = () => {
    setDraft(split(value));
    setOpen(true);
  };
  const done = () => {
    onChange(join(draft.ap, draft.hour, draft.minute));
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={`relative min-w-0 ${className}`}>
      <button type="button" aria-label={ariaLabel} aria-haspopup="dialog" onClick={show} className={`${btn.field} flex min-w-0 cursor-pointer items-center justify-between text-left tabular-nums ${value ? '' : 'text-sub'}`}>
        <span className="truncate">{value ? timeLabel(value) : placeholder}</span>
        <svg className="shrink-0 text-sub" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {/* 필수 입력 확인용 (화면에는 안 보임) */}
      {required && <input tabIndex={-1} aria-hidden="true" required value={value} onChange={() => {}} className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0" />}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label={`${ariaLabel} 고르기`}
            className="w-full max-w-[480px] rounded-t-2xl bg-white px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] md:max-w-[360px] md:rounded-2xl md:pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-[17px]">{ariaLabel}</span>
              <span className="text-[15px] font-bold tabular-nums text-primary">{timeLabel(join(draft.ap, draft.hour, draft.minute))}</span>
            </div>
            <div className="relative flex gap-1">
              {/* 가운데 선택 줄 */}
              <div className="pointer-events-none absolute inset-x-0 rounded-lg bg-fill" style={{ top: ITEM * Math.floor(VISIBLE / 2), height: ITEM }} />
              <div className="relative flex flex-1 gap-1">
                <Wheel label="오전 오후" items={AMPM} index={draft.ap} onChange={(ap) => setDraft((d) => ({ ...d, ap }))} />
                <Wheel label="시" items={HOURS} index={draft.hour} onChange={(hour) => setDraft((d) => ({ ...d, hour }))} />
                <Wheel label="분" items={MINUTES} index={draft.minute} onChange={(minute) => setDraft((d) => ({ ...d, minute }))} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className={btn.mdOutline} onClick={() => setOpen(false)}>취소</button>
              <button type="button" className={btn.mdPrimary} onClick={done}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
