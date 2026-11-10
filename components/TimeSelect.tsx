'use client';
// 시간 선택: 30분 단위 목록. <input type="time"> 은 맥 Safari 에서 눌러도 선택창이 안 떠서 모든 브라우저에서 같은 목록으로
// 경기 종료 예상처럼 30분 단위가 아닌 값이 들어오면 그 값도 목록에 넣어 둠
import { btn } from './ui';

const SLOTS = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

export function timeLabel(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ap} ${h12}:${String(m).padStart(2, '0')}`;
}

type Props = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export default function TimeSelect({ value, onChange, placeholder = '시간 선택', className = '', ...props }: Props) {
  const slots = value && !SLOTS.includes(value) ? [...SLOTS, value].sort() : SLOTS;
  return (
    <div className={`relative min-w-0 ${className}`}>
      <select
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${btn.field} min-w-0 cursor-pointer appearance-none pr-9 tabular-nums ${value ? '' : 'text-sub'}`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {slots.map((t) => (
          <option key={t} value={t}>
            {timeLabel(t)}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sub" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </div>
  );
}
