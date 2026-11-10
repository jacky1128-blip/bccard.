'use client';
// 여행: 도착역 → 도착 시간 → 어떤 곳
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MODES } from '@/lib/modes';
import PickerInput from './PickerInput';
import TrainFill from './TrainFill';
import { BottomBar, Page, PinIcon, Section, TitleHeader, btn, t } from './ui';

export default function TravelForm() {
  const router = useRouter();
  const [place, setPlace] = useState(MODES.travel.place);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('12:30');
  const [local, setLocal] = useState(true);
  const [near, setNear] = useState(false);

  return (
    <Page>
      <TitleHeader back="/?mode=travel" title="여행" />
      <span className={`-mt-2 ${t.desc}`}>관광객 말고, 현지인 결제가 많은 곳을 찾아요</span>
      <form
        className="flex flex-1 flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const qs = new URLSearchParams({ place, time });
          if (date) qs.set('date', date);
          if (!local) qs.set('local', '0');
          if (near) qs.set('near', '1');
          router.push(`/travel/result?${qs}`);
        }}
      >
        {/* 1. 예매 정보 하나로 도착역·시간까지 채움 (선택 · 안 써도 2번에 직접 입력하면 넘어감) */}
        <Section title="1. 예매 정보 불러오기">
          <TrainFill
            defaultDate={date}
            onFill={(tr) => {
              setPlace(tr.to);
              if (tr.date) setDate(tr.date);
              setTime(tr.arrive);
            }}
          />
        </Section>

        <Section title="2. 어디에 몇 시에 도착해요?">
          <label className="flex h-12 items-center gap-2 rounded-xl border border-line-2 px-3.5 focus-within:border-primary">
            <PinIcon />
            <input aria-label="도착역" className="flex-1 text-[15px] outline-none" value={place} onChange={(e) => setPlace(e.target.value)} required />
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,auto)] gap-2">
            <PickerInput type="date" aria-label="도착 날짜" value={date} onChange={(e) => setDate(e.target.value)} />
            <PickerInput type="time" aria-label="도착 시간" className="w-28 min-[360px]:w-32" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
          <span className={t.desc}>도착 시간에 영업 중인 곳만 보여드려요</span>
        </Section>

        <Section title="3. 어떤 곳?">
          <div className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={local} onClick={() => setLocal(!local)} className={local ? btn.pillOn : btn.pillOff}>동네맛집만</button>
            <button type="button" aria-pressed={near} onClick={() => setNear(!near)} className={near ? btn.pillOn : btn.pillOff}>역에서 가까운 곳</button>
            <button type="button" className={btn.pillOff}>업종 전체 ▾</button>
          </div>
        </Section>

        <BottomBar>
          <button className={btn.primary}>도착하면 갈 곳 보기</button>
        </BottomBar>
      </form>
    </Page>
  );
}
