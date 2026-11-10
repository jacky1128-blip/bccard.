'use client';
// 같이 정하기: 상황 → 어디서 → 날짜 → 시간 → 인원 → 초대 링크
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Mode } from '@/types/group';
import { MODES } from '@/lib/modes';
import { track } from '@/lib/analytics';
import { getAnonToken } from '@/lib/anon';
import ModeChips from './ModeChips';
import PickerInput from './PickerInput';
import TimeSelect from './TimeSelect';
import MidpointPicker from './MidpointPicker';
import { createRule } from './SeatTable';
import { BottomBar, Page, Section, TitleHeader, btn, t } from './ui';

export default function CreateForm({
  initialMode,
  initialPlace,
  back,
  live = false,
}: {
  initialMode: Mode;
  initialPlace?: string;
  back: string;
  live?: boolean; // DB(Supabase) 연결됨 → 서버에 모임 저장
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [mid, setMid] = useState(false);
  const [place, setPlace] = useState(initialPlace ?? MODES[initialMode].place);
  const [myOrigin, setMyOrigin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [headcount, setHeadcount] = useState(MODES[initialMode].defaultHeadcount);
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const m = MODES[mode];
  // 모임 이름을 안 정하면 "성수역 회식·모임"처럼 장소 + 상황으로
  const defaultTitle = `${place.trim() || '우리'} ${m.label}`;

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    track('create_group', { mode, headcount });
    if (live) {
      // 서버가 장소 해석 → 잇플 후보 3곳 → 추천 이유까지 만들어 저장
      setBusy(true);
      setError('');
      try {
        const res = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: getAnonToken(), mode, place, date, time, headcount, title: title || defaultTitle, memo, mid, origin: mid ? myOrigin : '' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '모임을 만들지 못했어요');
        router.push(`/g/${data.id}`);
      } catch (err) {
        setError((err as Error).message);
        setBusy(false);
      }
      return;
    }
    // 데모: 주소에 값을 담아 모임 화면으로
    const id = Math.random().toString(36).slice(2, 8);
    const qs = new URLSearchParams({ mode, place, headcount: String(headcount), title: title || defaultTitle, host: '1' });
    if (date) qs.set('date', date);
    if (time) qs.set('time', time);
    if (memo) qs.set('memo', memo);
    if (mid) qs.set('mid', '1');
    router.push(`/g/${id}?${qs}`);
  };

  return (
    <Page>
      <TitleHeader back={back} title="같이 정하기" right="필수 3개" />
      <form onSubmit={submit} className="flex flex-1 flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className={t.desc}>이전 화면에서 고른 내용은 그대로예요. 원하면 바꿀 수 있어요.</span>
          <ModeChips variant="pills" value={mode} onChange={pickMode} />
        </div>

        <Section title="1. 어디서 만날까요?">
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
          {mid && <MidpointPicker maxPeople={headcount} value={place} onPick={setPlace} onMyOrigin={setMyOrigin} />}
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

        <Section title="2. 언제 먹을까요?">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
            <PickerInput type="date" aria-label="날짜" value={date} onChange={(e) => setDate(e.target.value)} required />
            <TimeSelect aria-label="시간" value={time} onChange={setTime} required />
          </div>
        </Section>

        <Section title="3. 몇 명이서 함께 먹나요?">
          <div className="flex h-14 items-center justify-between rounded-xl border-[1.5px] border-primary bg-primary-soft pl-4 pr-2">
            <span className="text-[15px] font-bold text-primary-ink">2명 이상</span>
            <div className="flex items-center gap-2.5">
              <button type="button" aria-label="인원 줄이기" onClick={() => setHeadcount(Math.max(2, headcount - 1))} className="size-9 rounded-full border border-line bg-white text-lg">−</button>
              <span className={`w-8 text-center text-[15px] font-bold ${t.num}`}>{headcount}명</span>
              <button type="button" aria-label="인원 늘리기" onClick={() => setHeadcount(Math.min(12, headcount + 1))} className="size-9 rounded-full border border-line bg-white text-lg">+</button>
            </div>
          </div>
          <span className={t.desc}>{createRule(headcount, mid)}</span>
        </Section>

        <details className="group flex flex-col gap-2 rounded-[14px] bg-fill p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
            <span className={t.sectionTitle}>지금 설정 그대로 시작할까요?</span>
            <span className={`shrink-0 ${btn.textLink}`}>추가 설정하기</span>
          </summary>
          <div className="mt-2 text-[13px] leading-[1.7] text-sub group-open:hidden">
            모임 이름 · {title || defaultTitle}
            <br />
            투표 마감 · {m.deadline} (상황별 자동)
            <br />
            한 줄 메모 · {memo || '없음'}
          </div>
          <div className="mt-3 hidden flex-col gap-3 group-open:flex">
            <label className="flex flex-col gap-1 text-[13px] text-sub">
              모임 이름
              <input className={btn.field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={defaultTitle} />
            </label>
            <span className="text-[13px] text-sub">투표 마감 · {m.deadline} (상황별 자동)</span>
            <label className="flex flex-col gap-1 text-[13px] text-sub">
              한 줄 메모
              <input className={btn.field} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="없음" maxLength={40} />
            </label>
          </div>
        </details>
        {/* 모바일: 화면 아래 고정 / 태블릿·PC: 폼 바로 아래 */}
        <BottomBar>
          <div className="flex flex-col gap-2">
            {error && <p role="alert" className="rounded-xl bg-[#FFF0F0] px-3.5 py-2.5 text-[13px] text-[#C92A2A]">{error}</p>}
            <button className={btn.primary} disabled={busy}>{busy ? '결제 데이터로 후보 찾는 중…' : '초대 링크 만들기'}</button>
            {mid && <span className={`text-center ${t.desc}`}>친구들도 초대 링크에서 자기 출발역을 넣을 수 있어요</span>}
          </div>
        </BottomBar>
      </form>
    </Page>
  );
}
