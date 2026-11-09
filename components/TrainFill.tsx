'use client';
// 예매한 열차로 채우기 (선택). 불러오면 도착역·날짜·시간을 채워 줌. 안 써도 위에 직접 입력하면 됨
import { useState } from 'react';
import type { TrainInfo, TrainType } from '@/lib/trains';
import PickerInput from './PickerInput';
import { btn, t } from './ui';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const md = (date: string) => {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}/${d.getDate()}(${DAYS[d.getDay()]}) `;
};

export default function TrainFill({ defaultDate, onFill }: { defaultDate: string; onFill: (t: TrainInfo) => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TrainType>('KTX');
  const [no, setNo] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [train, setTrain] = useState<TrainInfo | null>(null);

  const load = async () => {
    setError('');
    if (!/^\d{1,6}$/.test(no)) return setError('열차번호를 숫자로 넣어 주세요');
    setLoading(true);
    try {
      const res = await fetch(`/api/trains/lookup?${new URLSearchParams({ type, no, date })}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '불러오지 못했어요');
      setTrain(data);
      onFill(data);
      setOpen(false);
    } catch (e) {
      setError(`${(e as Error).message} · 위에 직접 입력해도 돼요`);
    } finally {
      setLoading(false);
    }
  };

  // 불러온 열차 요약 (와이어프레임 카드)
  if (train && !open) {
    return (
      <div className="flex flex-col gap-1.5 rounded-[14px] border-[1.5px] border-primary bg-primary-soft p-3.5">
        <div className="flex items-center justify-between">
          <span className={t.kicker}>예매한 열차로 채웠어요{train.demo && ' · 데모 시간'}</span>
          <button type="button" onClick={() => setOpen(true)} className={btn.textLink}>바꾸기</button>
        </div>
        <span className={`text-[15px] font-bold ${t.num}`}>{train.type} {train.no} · {train.from} → {train.to}</span>
        <span className={`${t.desc} ${t.num}`}>도착 {train.date && md(train.date)}{train.arrive}</span>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex flex-col items-start gap-0.5 rounded-[14px] border-[1.5px] border-dashed border-primary bg-primary-soft px-3.5 py-3 text-left">
        <span className="font-display text-[15px] text-primary-ink">예매한 열차로 채우기</span>
        <span className={t.desc}>선택 · KTX·SRT 열차번호를 넣으면 도착역과 시간이 자동으로 들어가요</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border-[1.5px] border-primary bg-primary-soft p-3.5">
      <div className="flex items-center justify-between">
        <span className={t.kicker}>예매한 열차로 채우기</span>
        <button type="button" onClick={() => setOpen(false)} className={btn.textLink}>닫기</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(['KTX', 'SRT'] as const).map((x) => (
          <button key={x} type="button" aria-pressed={type === x} onClick={() => setType(x)} className={type === x ? btn.segOn : btn.segOff}>{x}</button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          aria-label="열차번호"
          inputMode="numeric"
          className={btn.field}
          value={no}
          onChange={(e) => setNo(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="열차번호 (예: 101)"
        />
        <PickerInput type="date" aria-label="탑승 날짜" className="w-40" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {error && <span className="text-xs text-[#C92A2A]">{error}</span>}
      <button type="button" onClick={load} disabled={loading || !no} className={btn.mdPrimary}>
        {loading ? '불러오는 중…' : '도착역·시간 불러오기'}
      </button>
      <span className="text-[11px] text-sub">승차권에 적힌 열차번호예요 · 안 넣어도 위에 직접 입력하면 돼요</span>
    </div>
  );
}
