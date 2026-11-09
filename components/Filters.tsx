'use client';
// 영업 중·덜 붐비는 곳·거리·업종
import { btn } from './ui';
export type FilterValue = {
  openNow: boolean;
  lessBusy: boolean;
  near: boolean;   // 도보 10분
  cat: string;     // '' = 업종 전체
};

// 와이어프레임처럼 "지금 영업 중"이 켜진 채로 시작
export const DEFAULT_FILTER: FilterValue = { openNow: true, lessBusy: false, near: false, cat: '' };

const on = btn.chipDarkOn;
const off = btn.pillOff;

export default function Filters({ value, onChange, cats }: { value: FilterValue; onChange: (v: FilterValue) => void; cats: string[] }) {
  const set = (p: Partial<FilterValue>) => onChange({ ...value, ...p });
  return (
    <div className="-mt-1.5 flex flex-wrap gap-1.5">
      <button type="button" aria-pressed={value.openNow} className={value.openNow ? on : off} onClick={() => set({ openNow: !value.openNow })}>지금 영업 중</button>
      <button type="button" aria-pressed={value.lessBusy} className={value.lessBusy ? on : off} onClick={() => set({ lessBusy: !value.lessBusy })}>덜 붐비는 곳</button>
      <button type="button" aria-pressed={value.near} className={value.near ? on : off} onClick={() => set({ near: !value.near })}>도보 10분</button>
      <label className={`relative ${value.cat ? on : off}`}>
        <span>{value.cat || '업종 전체'} ▾</span>
        <select
          aria-label="업종"
          value={value.cat}
          onChange={(e) => set({ cat: e.target.value })}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          <option value="">업종 전체</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
    </div>
  );
}
