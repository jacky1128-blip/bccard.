'use client';
// 모임 방: 참여(B2) → 대기(B3) → 투표(B4) → 확정(B5)
// live  : DB(Supabase) 연결됨 → /api/groups/[id] 로 상태를 주고받고 4초마다 새로고침
// !live : 키가 없을 때 화면 상태로만 흉내 내는 데모 (친구 입장 버튼 제공)
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { GroupState } from '@/types/group';
import { MODES } from '@/lib/modes';
import { track } from '@/lib/analytics';
import { getAnonToken } from '@/lib/anon';
import { STATIONS, stationLabel } from '@/lib/midpoint';
import { useMeet } from '@/lib/useMeet';
import SeatTable, { lockFoot, seatRule, createRule } from './SeatTable';
import ShareButtons, { InviteButton, useCopy } from './ShareButtons';
import StoreCard from './StoreCard';
import { PreviewRow } from './StoreRow';
import SourceNote from './SourceNote';
import { BrandHeader, Page, SectionTitle, btn, t } from './ui';

const CANT = ['매운 거', '해산물', '술 못 마심'];
const FRIENDS = ['민', '서', '지', '하', '도', '윤', '준', '아', '현', '수'];

type Step = 'join' | 'lock' | 'vote' | 'done';

/* ---------- 상태 관리: live(서버) / 데모(화면) ---------- */
function useGroup(initial: GroupState, live: boolean) {
  const [g, setG] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(!live); // live: 내 토큰 기준 첫 응답 전까지는 내가 누군지 모름

  const call = useCallback(
    async (path: string, body?: Record<string, unknown>) => {
      const token = getAnonToken();
      const res = body
        ? await fetch(`/api/groups/${g.id}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, ...body }) })
        : await fetch(`/api/groups/${g.id}?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '잠시 후 다시 시도해 주세요');
      setG(data as GroupState);
    },
    [g.id],
  );

  // 내 토큰 기준 상태 받기 + 확정 전까지 4초마다 새로고침
  useEffect(() => {
    if (!live) return;
    let stop = false;
    const tick = () =>
      call('')
        .catch(() => {})
        .finally(() => setReady(true));
    const first = setTimeout(tick, 0);
    const timer = setInterval(() => !stop && g.status !== 'confirmed' && tick(), 4000);
    return () => {
      stop = true;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [live, call, g.status]);

  const run = async (fn: () => Promise<void> | void) => {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // 데모: 들어온 사람 수가 기준을 넘으면 투표 열고, 먼저 온 사람들 표를 예시로 채움
  const demoOpenIfFull = (next: GroupState): GroupState => {
    if (next.mid || next.status !== 'waiting' || next.participants.length < next.need) return next;
    const votes: Record<string, number> = {};
    next.participants.slice(0, -1).forEach((_, i) => {
      const k = next.stores[i % 3 === 1 ? 1 : 0]?.key;
      if (k) votes[k] = (votes[k] ?? 0) + 1;
    });
    return { ...next, status: 'voting', votes, totalVotes: Object.values(votes).reduce((a, b) => a + b, 0) };
  };

  const actions = {
    join: (cantEat: string[], origin: string) =>
      run(async () => {
        track('join_group', { id: g.id, cant: cantEat });
        if (live) return call('/join', { cantEat, origin });
        setG((x) => demoOpenIfFull({ ...x, participants: [...x.participants, { name: '나', origin, isHost: false }], me: { ...x.me, joined: true } }));
      }),
    vote: (key: string) =>
      run(async () => {
        track('vote', { id: g.id, key });
        if (live) return call('/vote', { merKey: key });
        setG((x) => {
          const votes = { ...x.votes };
          if (x.me.vote) votes[x.me.vote] = Math.max(0, (votes[x.me.vote] ?? 1) - 1);
          votes[key] = (votes[key] ?? 0) + 1;
          return { ...x, votes, totalVotes: x.totalVotes + (x.me.vote ? 0 : 1), me: { ...x.me, vote: key } };
        });
      }),
    confirm: () =>
      run(async () => {
        if (live) return call('/confirm', {});
        setG((x) => {
          const top = [...x.stores].sort((a, b) => (x.votes[b.key] ?? 0) - (x.votes[a.key] ?? 0))[0];
          return { ...x, status: 'confirmed', confirmedKey: top?.key };
        });
      }),
    startVote: () =>
      run(async () => {
        if (live) return call('/confirm', { startVote: true });
        setG((x) => ({ ...x, status: 'voting' }));
      }),
    changePlace: (place: string) => run(() => call('/place', { place })),
    demoFriend: () =>
      setG((x) => demoOpenIfFull({ ...x, participants: [...x.participants, { name: FRIENDS[(x.participants.length - 1) % FRIENDS.length], isHost: false }] })),
  };

  return { g, error, busy, ready, actions };
}

/* ---------- 중간에서 만나요: 들어온 사람들 출발역 → 공평한 역 ---------- */
function useMeeting(g: GroupState) {
  // 출발역은 전국 어디든 (서버가 카카오 지하철역으로 찾음)
  const { resolved, options, real } = useMeet(g.participants.map((p) => p.origin ?? ''), 1);
  return { count: resolved.filter(Boolean).length, best: options[0], real };
}

export default function GroupRoom({ initial, live }: { initial: GroupState; live: boolean }) {
  const { g, error, busy, ready, actions } = useGroup(initial, live);
  const m = MODES[g.mode];
  const { copy, toast } = useCopy();
  const [cant, setCant] = useState<string[]>([]);
  const [origin, setOrigin] = useState('');
  const meeting = useMeeting(g);
  // 중간에서 만나요: 출발역이 모여 중간역이 바뀌면 그 역 기준으로 후보를 자동으로 다시 불러옴 (방장 화면에서, 투표 전까지)
  const midTarget = live && g.mid && g.status === 'waiting' && g.me.isHost && meeting.best ? stationLabel(meeting.best.station.name) : null;
  const triedMid = useRef<string | null>(null);
  useEffect(() => {
    if (!midTarget || midTarget === g.place || triedMid.current === midTarget) return;
    triedMid.current = midTarget; // 같은 역으로 두 번 부르지 않음 (실패하면 아래 버튼으로 다시)
    actions.changePlace(midTarget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midTarget, g.place]);
  const joined = g.participants.map((p) => p.name);
  const left = Math.max(0, g.need - joined.length);
  const step: Step = !g.me.joined ? 'join' : g.status === 'waiting' ? 'lock' : g.status === 'voting' ? 'vote' : 'done';
  const shareUrl = () => (typeof window === 'undefined' ? '' : live ? `${window.location.origin}/g/${g.id}` : window.location.href.replace(/[?&]host=1/, ''));
  const errorBox = error ? <p role="alert" className="rounded-xl bg-[#FFF0F0] px-3.5 py-2.5 text-[13px] text-[#C92A2A]">{error}</p> : null;

  if (!ready) {
    return (
      <Page>
        <BrandHeader back="/" />
        <p role="status" className={`rounded-2xl bg-fill py-10 text-center ${t.desc}`}>모임을 불러오는 중…</p>
      </Page>
    );
  }

  /* ---------- B2 링크 받은 친구 ---------- */
  if (step === 'join') {
    return (
      <Page>
        <BrandHeader back={`/?mode=${g.mode}`} />
        <div className="flex flex-col gap-1.5">
          <span className={t.desc}>방장님이 초대했어요. 가입 없어도 참여할 수 있어요.</span>
          <h1 className={t.pageTitle}>
            {g.title}
            <br />
            {g.place} 근처 {m.ask}
          </h1>
          <span className={`${t.desc} ${t.num}`}>{g.when} · {m.label}</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-primary-soft px-3.5 py-3">
          <div className="flex gap-1">
            {joined.map((_, i) => <span key={i} className="size-3.5 rounded-full bg-primary" />)}
            <span className="size-3.5 rounded-full border-2 border-dashed border-primary" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className={`text-sm font-bold text-primary-ink ${t.num}`}>{g.status === 'voting' ? '투표가 열렸어요' : g.mid ? '출발역을 넣고 기다려 주세요' : left > 0 ? `${joined.length} / ${g.headcount}명 들어왔어요 · ${left}명 더 오면 투표 시작` : '투표가 열렸어요'}</span>
            <span className={t.desc}>{createRule(g.headcount, g.mid)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <SectionTitle>결제 데이터로 고른 후보 3곳</SectionTitle>
          {g.stores.map((s) => <StoreCard key={s.key} store={s} showWalk={false} menuLabel="메뉴 확인하기" />)}
          <span className={t.desc}>투표가 시작되면 AI 추천 이유도 볼 수 있어요</span>
        </div>
        {g.mid && (
          <div className="flex flex-col gap-2">
            <SectionTitle>어디서 출발해요? <span className={`font-sans ${t.desc}`}>중간에서 만나요</span></SectionTitle>
            <datalist id="stations">{STATIONS.map((s) => <option key={s.name} value={stationLabel(s.name)} />)}</datalist>
            <input list="stations" aria-label="내 출발역" className={btn.field} value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="출발역 (예: 홍대입구)" />
            <span className={t.desc}>다들 넣은 출발역으로 방장이 공평한 중간역을 정해요</span>
          </div>
        )}
        <div className="flex flex-col gap-2.5">
          <SectionTitle>못 먹는 거 있어요? <span className={`font-sans ${t.desc}`}>선택</span></SectionTitle>
          <div className="flex flex-wrap gap-2">
            {CANT.map((c) => {
              const on = cant.includes(c);
              return (
                <button key={c} type="button" aria-pressed={on} onClick={() => setCant(on ? cant.filter((x) => x !== c) : [...cant, c])} className={on ? btn.pillOn : btn.pillOff}>
                  {c}
                </button>
              );
            })}
            <button type="button" aria-pressed={cant.length === 0} onClick={() => setCant([])} className={cant.length === 0 ? btn.pillOn : btn.pillOff}>없음</button>
          </div>
        </div>
        {errorBox}
        <button type="button" disabled={busy} className={btn.primary + ' mt-auto'} onClick={() => actions.join(cant, origin.trim())}>
          {g.status === 'voting' ? '참여하고 바로 투표하기' : '참여하고 투표 기다리기'}
        </button>
      </Page>
    );
  }

  /* ---------- B3 대기 · 자리 채우기 ---------- */
  if (step === 'lock') {
    const best = meeting.best;
    return (
      <Page>
        <BrandHeader back={`/?mode=${g.mode}`} />
        <div className="flex flex-col gap-1">
          <h1 className={t.pageTitle}>{g.title}</h1>
          <span className={`${t.desc} ${t.num}`}>{g.when} · {g.place} 근처</span>
        </div>
        <div className="flex flex-col gap-3.5 rounded-[20px] bg-fill p-5">
          <SeatTable headcount={g.headcount} joined={joined} mid={g.mid} />
          <span className={`text-center ${t.body}`}>
            {seatRule(g.headcount, g.mid)}
            <br />
            <span className="text-sub">후보는 지금도 볼 수 있어요</span>
          </span>
        </div>
        {g.mid && (
          <div className="flex flex-col gap-2 rounded-[14px] border-[1.5px] border-primary bg-primary-soft p-4">
            <span className={t.kicker}>중간에서 만나요 · 출발역 {meeting.count}명 입력</span>
            {best ? (
              <>
                <span className="text-[15px] font-bold">
                  {stationLabel(best.station.name)} · 가장 먼 사람 약 {best.maxMin}분
                </span>
                {g.me.isHost && stationLabel(best.station.name) !== g.place && (
                  <button type="button" disabled={busy} onClick={() => actions.changePlace(stationLabel(best.station.name))} className={btn.mdPrimary}>
                    {busy ? `${stationLabel(best.station.name)} 근처 후보 불러오는 중…` : `${stationLabel(best.station.name)}으로 후보 다시 찾기`}
                  </button>
                )}
                <span className="text-[11px] text-sub">{meeting.real ? '실제 대중교통 시간이에요' : '직선거리로 어림잡은 시간이에요'}</span>
              </>
            ) : (
              <span className={t.desc}>2명 이상 출발역을 넣으면 공평한 중간역을 찾아드려요</span>
            )}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <InviteButton url={shareUrl} text={`[밥콕] ${g.title}\n${g.when} · ${g.place} 근처\n결제 데이터로 고른 후보 3곳 중에 같이 골라 줘!`} />
          <ShareButtons url={shareUrl} />
          <span className={`text-center ${t.desc}`}>방장이 아니어도 누구나 부를 수 있어요</span>
        </div>
        <div className="flex flex-col gap-2">
          <SectionTitle>기다리는 동안 후보 미리 보기</SectionTitle>
          {g.stores.map((s) => <PreviewRow key={s.key} store={s} />)}
        </div>
        {errorBox}
        <span className={`mt-auto ${t.desc}`}>{lockFoot(g.headcount, g.mid)}</span>
        {g.me.isHost && (g.mid || g.headcount > 2) && joined.length >= 2 && (
          <button type="button" disabled={busy} onClick={actions.startVote} className={btn.outline}>
            {g.mid ? `방장: ${g.place} 근처로 투표 시작` : '방장: 지금 인원으로 투표 시작'}
          </button>
        )}
        {!live && (
          <button type="button" onClick={actions.demoFriend} className="self-center text-xs text-sub underline underline-offset-2">
            데모: 친구 한 명 들어온 걸로 하기
          </button>
        )}
        {toast}
      </Page>
    );
  }

  const total = g.totalVotes;

  /* ---------- B4 투표 ---------- */
  if (step === 'vote') {
    return (
      // 투표: 태블릿 이상에선 후보 3곳을 가로 3열 카드로
      <Page wide>
        <BrandHeader back={`/?mode=${g.mode}`} />
        <div className="flex flex-col gap-1.5">
          <span className={`${t.kicker} ${t.num}`}>투표 시작 · 지금까지 {total}명 투표</span>
          <h1 className={t.pageTitle}>{g.title}</h1>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[14px] bg-fill px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className={t.sectionTitle}>{g.place} 근처</span>
            <span className={`${t.desc} ${t.num}`}>마감 {m.deadline}</span>
          </div>
          {g.me.isHost && (
            <button type="button" disabled={!total || busy} onClick={actions.confirm} className={btn.smOutline}>
              방장: 지금 확정
            </button>
          )}
        </div>
        {total < joined.length && (
          <div className="flex items-center justify-between gap-3 rounded-[14px] bg-primary-soft px-4 py-3.5">
            <span className={`${t.sectionTitle} text-primary-ink`}>아직 투표 안 한 친구가 있어요</span>
            <button type="button" onClick={() => copy(shareUrl(), '투표 링크를 복사했어요')} className={btn.smPrimary}>
              투표 알리기
            </button>
          </div>
        )}
        <div className="flex flex-col gap-3">
          <SectionTitle>후보 3곳 · 메뉴 보고 투표해요</SectionTitle>
          <div className="flex flex-col gap-3 md:grid md:grid-cols-3 md:items-stretch">
          {g.stores.map((s) => {
            const mine = g.me.vote === s.key;
            return (
              <StoreCard
                key={s.key}
                store={s}
                showWalk={false}
                reason
                menuLabel="메뉴 확인하기"
                action={
                  <button type="button" aria-pressed={mine} disabled={busy} onClick={() => actions.vote(s.key)} className={mine ? btn.mdSelected : btn.mdOutline}>
                    {mine ? `투표함 · ${g.votes[s.key] ?? 0}표` : `투표 · ${g.votes[s.key] ?? 0}표`}
                  </button>
                }
              />
            );
          })}
          </div>
        </div>
        {errorBox}
        <SourceNote ai />
        {toast}
      </Page>
    );
  }

  /* ---------- B5 확정 ---------- */
  const ranked = [...g.stores].sort((a, b) => (g.votes[b.key] ?? 0) - (g.votes[a.key] ?? 0));
  const winner = g.stores.find((s) => s.key === g.confirmedKey) ?? ranked[0];
  const runner = ranked.find((s) => s.key !== winner?.key);
  const pct = (k: string) => (total ? Math.round(((g.votes[k] ?? 0) / total) * 100) : 0);
  const notice = winner ? `${g.when} ${g.title}\n${winner.name} · ${g.place} 근처${winner.address ? ` (${winner.address})` : ''}\n메뉴·투표 결과: ${shareUrl()}` : '';
  return (
    <Page>
      <BrandHeader back={`/?mode=${g.mode}`} />
      <div className="flex flex-col gap-1.5">
        <span className={t.kicker}>투표 마감 · 확정</span>
        <h1 className={t.pageTitle}>
          {g.title}
          <br />
          {winner?.name}, 여기로 정했어요
        </h1>
      </div>
      <div className="flex flex-col gap-2.5">
        {[winner, runner].filter(Boolean).map((s, i) => (
          <div key={s!.key} className="flex flex-col gap-1">
            <div className={`flex items-baseline justify-between ${i ? 'text-sub' : ''}`}>
              <span className={i ? t.storeSm.replace('17px', '15px') : t.storeSm}>{s!.name}</span>
              <span className={`text-[13px] font-bold ${t.num}`}>{g.votes[s!.key] ?? 0}표</span>
            </div>
            <div className="h-2.5 rounded-[5px] bg-fill">
              <div className={`h-2.5 rounded-[5px] ${i ? 'bg-[#B8BCC2]' : 'bg-primary'}`} style={{ width: `${pct(s!.key)}%` }} />
            </div>
          </div>
        ))}
      </div>
      {winner && <StoreCard store={winner} showWalk={false} menuLabel="메뉴 보기" />}
      <div className="flex flex-col gap-2.5 rounded-[14px] bg-fill p-4">
        <SectionTitle>단톡 공지</SectionTitle>
        <span className={`whitespace-pre-line break-all ${t.body} ${t.num}`}>{notice}</span>
        <button type="button" onClick={() => copy(notice, '공지를 복사했어요', 'notice')} className={btn.outline}>공지 복사</button>
      </div>
      <div className="flex flex-col gap-2">
        <SectionTitle>다른 사람에게도 공유하기</SectionTitle>
        <span className={t.desc}>“우리는 결제 데이터로 여기 골랐어요” · 받은 사람도 바로 써볼 수 있어요</span>
        <ShareButtons url={shareUrl} title={`${g.title} · ${winner?.name ?? ''}`} text={`${g.when} ${winner?.name ?? ''}로 정했어요 · 결제 데이터로 고른 곳`} />
      </div>
      <div className="flex flex-col gap-2">
        <SectionTitle>방장이 되어 다음 모임을 만들 수 있어요</SectionTitle>
        <Link href={`/group/new?mode=${g.mode}`} className={btn.outline}>새 모임 만들기</Link>
      </div>
      <SourceNote />
      {toast}
    </Page>
  );
}
