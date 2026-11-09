'use client';
// 같이 정하기: 상황 → 어디서 → 날짜 → 시간 → 인원 → 초대 링크
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Mode } from '@/types/group';
import { MODES } from '@/lib/modes';
import { track } from '@/lib/analytics';
import ModeChips from './ModeChips';
import PickerInput from './PickerInput';
import MidpointPicker from './MidpointPicker';
import { createRule } from './SeatTable';
import { Page, Section, TitleHeader, btn, t } from './ui';

export default function CreateForm({ initialMode, back }: { initialMode: Mode; back: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [mid, setMid] = useState(false);
  const [place, setPlace] = useState(MODES[initialMode].place);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [headcount, setHeadcount] = useState(MODES[initialMode].defaultHeadcount);
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const m = MODES[mode];

  const pickMode = (x: Mode) => {
    // 장소를 직접 안 고쳤으면 상황 기본값으로 같이 바꿈
    if (place === MODES[mode].place) setPlace(MODES[x].place);
    setMode(x);
    setHeadcount(MODES[x].defaultHeadcount);
    if (!MODES[x].showMid && mid) {
      setMid(false);
      setPlace(MODES[x].place);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Math.random().toString(36).slice(2, 8);
    track('create_group', { mode, headcount });
    const qs = new URLSearchParams({ mode, place, headcount: String(headcount), title: title || m.event, host: '1' });
    if (date) qs.set('date', date);
    if (time) qs.set('time', time);
    if (memo) qs.set('memo', memo);
    router.push(`/g/${id}?${qs}`);
  };

  return (
    <Page>
      <TitleHeader back={back} title="같이 정하기" right="필수 4개" />
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className={t.desc}>이전 화면에서 고른 상황이 그대로 선택돼요 · 바꿀 수 있어요</span>
          <ModeChips variant="pills" value={mode} onChange={pickMode} />
        </div>

        <Section title="1. 어디서?">
          {m.showMid && (
            <div className="grid grid-cols-2 gap-2">
              {[
                [false, '장소 정해졌어요', '학교 앞·특정 역'],
                [true, '중간에서 만나요', '다들 흩어져 있을 때'],
              ].map(([v, label, s]) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={mid === v}
                  onClick={() => {
                    if (v === mid) return;
                    setMid(v as boolean);
                    // 중간에서 만나요 → 출발역을 넣으면 장소가 자동으로 채워짐 / 되돌리면 상황 기본 장소
                    setPlace(v ? '' : m.place);
                  }}
                  className={`flex h-16 flex-col justify-center gap-0.5 rounded-xl px-3 text-left ${
                    mid === v ? 'border-[1.5px] border-primary bg-primary-soft text-primary-ink' : 'border border-line bg-white text-ink'
                  }`}
                >
                  <span className="font-display text-[15px]">{label}</span>
                  <span className={t.desc}>{s}</span>
                </button>
              ))}
            </div>
          )}
          {mid && <MidpointPicker maxPeople={headcount} value={place} onPick={setPlace} />}
          <label className="flex flex-col gap-1">
            {mid && <span className={t.desc}>만날 역 · 위에서 고르거나 직접 고쳐도 돼요</span>}
            <input
              aria-label={mid ? '만날 역' : '장소'}
              className={btn.field}
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder={mid ? '출발역을 2곳 이상 넣으면 자동으로 채워져요' : '역·동네·학교 이름'}
              required
            />
          </label>
        </Section>

        <div className="grid grid-cols-2 gap-2.5">
          <Section title="2. 날짜">
            <PickerInput type="date" aria-label="날짜" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Section>
          <Section title="3. 시간">
            <PickerInput type="time" aria-label="시간" value={time} onChange={(e) => setTime(e.target.value)} required />
          </Section>
        </div>

        <Section title="4. 몇 명이서?">
          <div className="flex h-14 items-center justify-between rounded-xl border-[1.5px] border-primary bg-primary-soft pl-4 pr-2">
            <span className="text-[15px] font-bold text-primary-ink">2명 이상</span>
            <div className="flex items-center gap-2.5">
              <button type="button" aria-label="인원 줄이기" onClick={() => setHeadcount(Math.max(2, headcount - 1))} className="size-9 rounded-full border border-line bg-white text-lg">−</button>
              <span className={`w-8 text-center text-[15px] font-bold ${t.num}`}>{headcount}명</span>
              <button type="button" aria-label="인원 늘리기" onClick={() => setHeadcount(Math.min(12, headcount + 1))} className="size-9 rounded-full border border-line bg-white text-lg">+</button>
            </div>
          </div>
          <span className={t.desc}>{createRule(headcount)}</span>
        </Section>

        <button className={btn.primary}>초대 링크 만들기</button>

        <details className="group flex flex-col gap-2 rounded-[14px] bg-fill p-4">
          <summary className={`cursor-pointer list-none ${t.sectionTitle}`}>
            더 설정하기 <span className={`font-sans ${t.desc}`}>선택 · 기본값 그대로 둬도 돼요</span>
          </summary>
          <div className="mt-2 text-[13px] leading-[1.7] text-sub group-open:hidden">
            모임 이름 · {title || m.event}
            <br />
            투표 마감 · {m.deadline} (상황별 자동)
            <br />
            한 줄 메모 · {memo || '없음'}
          </div>
          <div className="mt-3 hidden flex-col gap-3 group-open:flex">
            <label className="flex flex-col gap-1 text-[13px] text-sub">
              모임 이름
              <input className={btn.field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={m.event} />
            </label>
            <span className="text-[13px] text-sub">투표 마감 · {m.deadline} (상황별 자동)</span>
            <label className="flex flex-col gap-1 text-[13px] text-sub">
              한 줄 메모
              <input className={btn.field} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="없음" maxLength={40} />
            </label>
          </div>
        </details>
      </form>
    </Page>
  );
}
