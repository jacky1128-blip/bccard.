'use client';
// 모임 방: 참여(B2) → 대기(B3) → 투표(B4) → 확정(B5)
// TODO: 지금은 화면 상태로만 흉내. Supabase 연결 후 participants / votes 테이블로 교체
import { useState } from 'react';
import Link from 'next/link';
import type { Mode } from '@/types/group';
import type { StoreView } from '@/lib/view';
import { MODES } from '@/lib/modes';
import { voteThreshold } from '@/lib/rules';
import { track } from '@/lib/analytics';
import SeatTable, { lockFoot, seatRule, createRule } from './SeatTable';
import ShareButtons, { useCopy } from './ShareButtons';
import StoreCard from './StoreCard';
import { PreviewRow } from './StoreRow';
import SourceNote from './SourceNote';
import { Brand, Page, SectionTitle, btn, t } from './ui';

type Step = 'join' | 'lock' | 'vote' | 'done';
const CANT = ['매운 거', '해산물', '술 못 마심'];
const FRIENDS = ['민', '서', '지', '하', '도', '윤', '준', '아', '현', '수'];

export default function GroupRoom(props: {
  id: string; mode: Mode; host: boolean; title: string; place: string; when: string; headcount: number; stores: StoreView[];
}) {
  const { id, mode, host, title, place, when, headcount, stores } = props;
  const m = MODES[mode];
  const need = voteThreshold(headcount);
  const [step, setStep] = useState<Step>(host ? 'lock' : 'join');
  const [joined, setJoined] = useState<string[]>(['방']);
  const [cant, setCant] = useState<string[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [myVote, setMyVote] = useState<string | null>(null);
  const { copy, toast } = useCopy();
  const left = Math.max(0, need - joined.length);

  // 투표가 열릴 때 먼저 들어온 사람들 표를 데모로 채움
  const openVote = (people: string[]) => {
    const seeded: Record<string, number> = {};
    people.filter((p) => p !== '나').forEach((_, i) => {
      const k = stores[i % 3 === 1 ? 1 : 0].key;
      seeded[k] = (seeded[k] ?? 0) + 1;
    });
    setVotes(seeded);
    setStep('vote');
  };
  const addPerson = (name: string) => {
    const next = [...joined, name];
    setJoined(next);
    if (next.length >= need) openVote(next);
    else setStep('lock');
  };
  const vote = (key: string) => {
    track('vote', { id, key });
    setVotes((v) => {
      const n = { ...v };
      if (myVote) n[myVote] = Math.max(0, (n[myVote] ?? 1) - 1);
      n[key] = (n[key] ?? 0) + 1;
      return n;
    });
    setMyVote(key);
  };

  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const ranked = [...stores].sort((a, b) => (votes[b.key] ?? 0) - (votes[a.key] ?? 0));
  const [winner, runner] = ranked;

  /* ---------- B2 링크 받은 친구 ---------- */
  if (step === 'join') {
    return (
      <Page>
        <Brand />
        <div className="flex flex-col gap-1.5">
          <span className={t.desc}>[방장]님이 초대했어요 · 가입 없이</span>
          <h1 className={t.pageTitle}>
            {title}
            <br />
            {place} 근처 {m.ask}
          </h1>
          <span className={`${t.desc} ${t.num}`}>{when} · {m.label}</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-primary-soft px-3.5 py-3">
          <div className="flex gap-1">
            {joined.map((_, i) => <span key={i} className="size-3.5 rounded-full bg-primary" />)}
            <span className="size-3.5 rounded-full border-2 border-dashed border-primary" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className={`text-sm font-bold text-primary-ink ${t.num}`}>투표까지 {left}자리 남았어요</span>
            <span className={t.desc}>{createRule(headcount)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <SectionTitle>후보 3곳 · 결제 데이터 기준</SectionTitle>
          {stores.map((s) => <StoreCard key={s.key} store={s} showWalk={false} menuLabel="메뉴 확인하기" />)}
          <span className={t.desc}>AI 추천 이유는 투표가 시작되면 함께 보여요</span>
        </div>
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
        <button
          type="button"
          className={btn.primary + ' mt-auto'}
          onClick={() => {
            track('join_group', { id, cant });
            addPerson('나');
          }}
        >
          참여하고 투표 기다리기
        </button>
      </Page>
    );
  }

  /* ---------- B3 대기 · 자리 채우기 ---------- */
  if (step === 'lock') {
    return (
      <Page>
        <div className="flex flex-col gap-1">
          <h1 className={t.pageTitle}>{title}</h1>
          <span className={`${t.desc} ${t.num}`}>{when} · {place} 근처</span>
        </div>
        <div className="flex flex-col gap-3.5 rounded-[20px] bg-fill p-5">
          <SeatTable headcount={headcount} joined={joined} />
          <span className={`text-center ${t.body}`}>
            {seatRule(headcount)}
            <br />
            <span className="text-sub">후보는 지금도 볼 수 있어요</span>
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" className={btn.primary} onClick={() => copy(window.location.href.replace(/[?&]host=1/, ''), '초대 링크를 복사했어요')}>
            빈자리 채울 친구 부르기
          </button>
          <ShareButtons />
          <span className={`text-center ${t.desc}`}>방장이 아니어도 누구나 부를 수 있어요</span>
        </div>
        <div className="flex flex-col gap-2">
          <SectionTitle>기다리는 동안 후보 미리 보기</SectionTitle>
          {stores.map((s) => <PreviewRow key={s.key} store={s} />)}
        </div>
        <span className={`mt-auto ${t.desc}`}>{lockFoot(headcount)}</span>
        <button
          type="button"
          onClick={() => addPerson(FRIENDS[(joined.length - 1) % FRIENDS.length])}
          className="self-center text-xs text-sub underline underline-offset-2"
        >
          데모: 친구 한 명 들어온 걸로 하기
        </button>
        {toast}
      </Page>
    );
  }

  /* ---------- B4 투표 ---------- */
  if (step === 'vote') {
    return (
      <Page>
        <div className="flex flex-col gap-1.5">
          <span className={`${t.kicker} ${t.num}`}>투표 시작 · 지금까지 {total}명 투표</span>
          <h1 className={t.pageTitle}>{title}</h1>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[14px] bg-fill px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className={t.sectionTitle}>{place} 근처</span>
            <span className={`${t.desc} ${t.num}`}>마감 {m.deadline}</span>
          </div>
          <button type="button" disabled={!total} onClick={() => setStep('done')} className={btn.smOutline}>
            방장: 지금 확정
          </button>
        </div>
        {total < joined.length && (
          <div className="flex items-center justify-between gap-3 rounded-[14px] bg-primary-soft px-4 py-3.5">
            <span className={`${t.sectionTitle} text-primary-ink`}>아직 투표 안 한 친구가 있어요</span>
            <button type="button" onClick={() => copy(window.location.href, '투표 링크를 복사했어요')} className={btn.smPrimary}>
              투표 알리기
            </button>
          </div>
        )}
        <div className="flex flex-col gap-3">
          <SectionTitle>후보 3곳 · 메뉴 보고 투표해요</SectionTitle>
          {stores.map((s) => {
            const mine = myVote === s.key;
            return (
              <StoreCard
                key={s.key}
                store={s}
                showWalk={false}
                reason
                menuLabel="메뉴 확인하기"
                action={
                  <button
                    type="button"
                    aria-pressed={mine}
                    onClick={() => vote(s.key)}
                    className={mine ? btn.mdSelected : btn.mdOutline}
                  >
                    {mine ? `투표함 · ${votes[s.key] ?? 0}표` : `투표 · ${votes[s.key] ?? 0}표`}
                  </button>
                }
              />
            );
          })}
        </div>
        <SourceNote ai />
        {toast}
      </Page>
    );
  }

  /* ---------- B5 확정 ---------- */
  const pct = (k: string) => (total ? Math.round(((votes[k] ?? 0) / total) * 100) : 0);
  const shareUrl = typeof window === 'undefined' ? '' : window.location.href.replace(/[?&]host=1/, '');
  const notice = `${when} ${title}\n${winner.name} · ${place} 근처 ${winner.walk ?? ''}\n메뉴·투표 결과: ${shareUrl}`;
  return (
    <Page>
      <div className="flex flex-col gap-1.5">
        <span className={t.kicker}>투표 마감 · 확정</span>
        <h1 className={t.pageTitle}>
          {title}
          <br />
          {winner.name}, 여기로 정했어요
        </h1>
      </div>
      <div className="flex flex-col gap-2.5">
        {[winner, runner].map((s, i) => (
          <div key={s.key} className="flex flex-col gap-1">
            <div className={`flex items-baseline justify-between ${i ? 'text-sub' : ''}`}>
              <span className={i ? t.storeSm.replace('17px', '15px') : t.storeSm}>{s.name}</span>
              <span className={`text-[13px] font-bold ${t.num}`}>{votes[s.key] ?? 0}표</span>
            </div>
            <div className="h-2.5 rounded-[5px] bg-fill">
              <div className={`h-2.5 rounded-[5px] ${i ? 'bg-[#B8BCC2]' : 'bg-primary'}`} style={{ width: `${pct(s.key)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2.5 rounded-[14px] bg-fill p-4">
        <SectionTitle>단톡 공지</SectionTitle>
        <span className={`whitespace-pre-line break-all ${t.body} ${t.num}`}>{notice}</span>
        <button type="button" onClick={() => copy(notice, '공지를 복사했어요', 'notice')} className={btn.outline}>공지 복사</button>
      </div>
      <div className="flex flex-col gap-2">
        <SectionTitle>다른 사람에게도 공유하기</SectionTitle>
        <span className={t.desc}>“우리는 결제 데이터로 여기 골랐어요” · 받은 사람도 바로 써볼 수 있어요</span>
        <button type="button" onClick={() => copy(shareUrl, '링크를 복사했어요')} className={btn.primary}>링크 복사</button>
      </div>
      <div className="flex flex-col gap-2">
        <SectionTitle>다음 모임 방장은 누구?</SectionTitle>
        <Link href={`/group/new?mode=${mode}`} className={btn.outline}>내 모임 만들기</Link>
      </div>
      <SourceNote />
      {toast}
    </Page>
  );
}
