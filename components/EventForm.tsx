'use client';
// 경기·공연: 어디서 → 언제(전/후) → 무엇(경기/공연) → 끝나는 시간
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MODES } from '@/lib/modes';
import { addMinutes } from '@/lib/time';
import PickerInput from './PickerInput';
import { Page, PinIcon, Section, TitleHeader, btn, t } from './ui';

const VENUES = ['[공연장 A]', '[경기장 B]', '[공연장 C]'];
const GAME_START = '19:00';     // TODO: lib/sports.ts 일정에서 불러오기 (KBO·K리그 시즌 중)
const GAME_MINUTES = 180;       // 평균 경기 시간

export default function EventForm() {
  const router = useRouter();
  const [venue, setVenue] = useState(MODES.event.place);
  const [timing, setTiming] = useState<'before' | 'after'>('after');
  const [kind, setKind] = useState<'game' | 'show'>('game');
  const [time, setTime] = useState(addMinutes(GAME_START, GAME_MINUTES));

  const pickKind = (k: 'game' | 'show') => {
    setKind(k);
    if (k === 'game' && timing === 'after') setTime(addMinutes(GAME_START, GAME_MINUTES));
  };
  const pickTiming = (t: 'before' | 'after') => {
    setTiming(t);
    setTime(t === 'before' ? (kind === 'game' ? GAME_START : '18:00') : addMinutes(GAME_START, GAME_MINUTES));
  };

  return (
    <Page>
      <TitleHeader back="/?mode=event" title="경기·공연 전후" />
      <span className={`-mt-2 ${t.desc}`}>끝나는 시간에 맞춰, 그때도 문 연 결제 상위만 보여드려요</span>
      <form
        className="flex flex-1 flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/event/result?${new URLSearchParams({ place: venue, time, timing })}`);
        }}
      >
        <Section title="1. 어디서 봐요?">
          <label className="flex h-12 items-center gap-2 rounded-xl border border-line-2 px-3.5 focus-within:border-primary">
            <PinIcon />
            <input aria-label="공연장·경기장" className="flex-1 text-[15px] outline-none" value={venue} onChange={(e) => setVenue(e.target.value)} required />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {VENUES.map((v) => (
              <button key={v} type="button" onClick={() => setVenue(v)} className={venue === v ? btn.pillOn : btn.pillOff}>{v}</button>
            ))}
          </div>
        </Section>

        <Section title="2. 언제 먹어요?">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={timing === 'before'} onClick={() => pickTiming('before')} className={timing === 'before' ? btn.segOn : btn.segOff}>시작 전</button>
            <button type="button" aria-pressed={timing === 'after'} onClick={() => pickTiming('after')} className={timing === 'after' ? btn.segOn : btn.segOff}>끝나고</button>
          </div>
        </Section>

        <Section title="3. 무엇을 봐요?">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={kind === 'game'} onClick={() => pickKind('game')} className={kind === 'game' ? btn.segOn : btn.segOff}>경기</button>
            <button type="button" aria-pressed={kind === 'show'} onClick={() => pickKind('show')} className={kind === 'show' ? btn.segOn : btn.segOff}>공연</button>
          </div>
          {kind === 'game' && (
            <div className="flex flex-col gap-1.5 rounded-[14px] border-[1.5px] border-primary bg-primary-soft p-3.5">
              <span className={t.kicker}>경기 일정에서 불러오기 · KBO·K리그 시즌 중</span>
              <span className={`text-[15px] font-bold ${t.num}`}>[팀 A] vs [팀 B] · 11/15(토) {GAME_START}</span>
              <span className={t.desc}>시작 시간만 자동 · 끝나는 시간은 아래에서 확인</span>
            </div>
          )}
        </Section>

        <Section title={timing === 'after' ? '4. 끝나는 시간' : '4. 시작 시간'}>
          <PickerInput type="time" aria-label={timing === 'after' ? '끝나는 시간' : '시작 시간'} value={time} onChange={(e) => setTime(e.target.value)} required />
          <span className={t.desc}>경기는 평균 경기 시간으로 미리 채워요 · 공연은 직접 입력 · 언제든 수정 가능</span>
        </Section>

        <button className={btn.primary + ' mt-auto'}>{timing === 'after' ? '끝나고 문 연 곳 보기' : '시작 전에 갈 곳 보기'}</button>
      </form>
    </Page>
  );
}
