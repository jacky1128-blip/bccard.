'use client';
// 경기·공연: 어디서 → 언제(전/후) → 무엇(경기/공연) → 끝나는 시간
// 경기는 날짜를 고르면 KBO·K리그 일정을 불러와서 구장·시작 시간을 채움 (끝나는 시간은 평균 경기 시간으로 추정)
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { MODES } from '@/lib/modes';
import { addMinutes } from '@/lib/time';
import PickerInput from './PickerInput';
import { Page, PinIcon, Section, TitleHeader, btn, t } from './ui';

const VENUES = ['잠실종합운동장', '고척스카이돔', 'KSPO DOME'];
const SHOW_START = '19:30';
const SHOW_MINUTES = 150;

type Game = { id: string; league: string; start: string; estEnd: string; home: string; away: string; venue: string; place: string; status: string };

const noop = () => () => {};

// 브라우저 기준 오늘 (YYYY-MM-DD)
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function EventForm() {
  const router = useRouter();
  const [venue, setVenue] = useState(MODES.event.place);
  const [timing, setTiming] = useState<'before' | 'after'>('after');
  const [kind, setKind] = useState<'game' | 'show'>('game');
  const [picked, setDate] = useState('');
  // 서버 렌더에서는 비워 두고 브라우저에서 오늘 날짜 (시간대 차이로 생기는 불일치 방지)
  const todayStr = useSyncExternalStore(noop, today, () => '');
  const date = picked || todayStr;
  const [result, setResult] = useState<{ date: string; games: Game[] } | null>(null);
  const games = result?.date === date ? result.games : null;
  const [game, setGame] = useState<Game | null>(null);
  const [time, setTime] = useState(addMinutes(SHOW_START, SHOW_MINUTES));

  // 경기 + 날짜 → 그날 KBO·K리그 일정
  useEffect(() => {
    if (kind !== 'game' || !date) return;
    let alive = true;
    fetch(`/api/sports/schedule?date=${date}`)
      .then((r) => r.json())
      .then((d: { games?: Game[] }) => alive && setResult({ date, games: d.games ?? [] }))
      .catch(() => alive && setResult({ date, games: [] }));
    return () => {
      alive = false;
    };
  }, [kind, date]);

  const applyTime = (g: Game | null, tm: 'before' | 'after', k: 'game' | 'show') => {
    if (k === 'game' && g) setTime(tm === 'after' ? g.estEnd : g.start);
    else setTime(tm === 'after' ? addMinutes(SHOW_START, SHOW_MINUTES) : SHOW_START);
  };
  const pickGame = (g: Game) => {
    setGame(g);
    setVenue(g.place);
    applyTime(g, timing, kind);
  };
  const pickKind = (k: 'game' | 'show') => {
    setKind(k);
    if (k === 'show') setGame(null);
    applyTime(k === 'game' ? game : null, timing, k);
  };
  const pickTiming = (tm: 'before' | 'after') => {
    setTiming(tm);
    applyTime(game, tm, kind);
  };

  return (
    <Page>
      <TitleHeader back="/?mode=event" title="경기·공연 전후" />
      <span className={`-mt-2 ${t.desc}`}>끝나는 시간에 맞춰, 그때도 문 연 결제 상위만 보여드려요</span>
      <form
        className="flex flex-1 flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const qs = new URLSearchParams({ place: venue, time, timing });
          if (date) qs.set('date', date);
          router.push(`/event/result?${qs}`);
        }}
      >
        <Section title="1. 무엇을 봐요?">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={kind === 'game'} onClick={() => pickKind('game')} className={kind === 'game' ? btn.segOn : btn.segOff}>경기</button>
            <button type="button" aria-pressed={kind === 'show'} onClick={() => pickKind('show')} className={kind === 'show' ? btn.segOn : btn.segOff}>공연</button>
          </div>
          <PickerInput type="date" aria-label="날짜" value={date} onChange={(e) => setDate(e.target.value)} />
          {kind === 'game' && (
            <div className="flex flex-col gap-2 rounded-[14px] border-[1.5px] border-primary bg-primary-soft p-3.5">
              <span className={t.kicker}>경기 일정에서 불러오기 · KBO·K리그</span>
              {games == null ? (
                <span className={t.desc}>일정을 불러오는 중…</span>
              ) : games.length === 0 ? (
                <span className={t.desc}>이 날은 KBO·K리그 경기가 없어요 · 아래에 장소와 시간을 직접 넣어 주세요</span>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {games.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      aria-pressed={game?.id === g.id}
                      onClick={() => pickGame(g)}
                      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left ${
                        game?.id === g.id ? 'border-[1.5px] border-primary bg-white' : 'border border-line bg-white'
                      }`}
                    >
                      <span className="text-[14px] font-bold">{g.away} vs {g.home}</span>
                      <span className={`${t.desc} ${t.num}`}>{g.league} · {g.venue} · {g.start}</span>
                    </button>
                  ))}
                </div>
              )}
              <span className={t.desc}>고르면 구장과 시작 시간이 채워져요 · 끝나는 시간은 평균 경기 시간으로 미리 채워요</span>
            </div>
          )}
        </Section>

        <Section title="2. 어디서 봐요?">
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

        <Section title="3. 언제 먹어요?">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={timing === 'before'} onClick={() => pickTiming('before')} className={timing === 'before' ? btn.segOn : btn.segOff}>시작 전</button>
            <button type="button" aria-pressed={timing === 'after'} onClick={() => pickTiming('after')} className={timing === 'after' ? btn.segOn : btn.segOff}>끝나고</button>
          </div>
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
