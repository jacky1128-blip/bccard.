'use client';
// 첫 방문 안내 3장: 무엇으로 고르는지(결제) → 상황 고르기 → 같이 정하기
// 첫 화면(HomeView) 위에 덮어서 보여 주고, 끝나면 그때 위치 권한을 물음 (설명 없이 권한 창부터 뜨지 않게)
// 한 번 보면 다시 안 뜸 (localStorage). 주소에 ?intro=1 이면 다시 보기
import { useRef, useState } from 'react';
import { MODES, MODE_ORDER } from '@/lib/modes';
import { LogoMark, SERVICE_NAME, btn, t } from './ui';

export const INTRO_KEY = 'babplan_intro_v1';

export function introSeen() {
  try {
    if (new URLSearchParams(window.location.search).get('intro') === '1') return false;
    return localStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return true; // 저장소를 못 쓰면 매번 뜨지 않게 그냥 넘어감
  }
}

function markSeen() {
  try {
    localStorage.setItem(INTRO_KEY, '1');
  } catch {}
}

/* ---------- 장마다 그림 (실제 화면 조각을 단순하게) ---------- */

function RankArt() {
  const rows: [string, string, number][] = [
    ['골목 고깃집', '지역 상위 2%', 92],
    ['시장 칼국수', '지역 상위 5%', 74],
    ['동네 초밥집', '지역 상위 8%', 58],
  ];
  return (
    <div className="flex w-full flex-col gap-2.5 rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <span className={t.kicker}>최근 1개월 결제 많은 가게</span>
      {rows.map(([name, rank, w], i) => (
        <div key={name} className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white tabular-nums">{i + 1}</span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-[14px]">{name}</span>
              <span className={t.meta}>{rank}</span>
            </div>
            <span className="h-1.5 rounded-full bg-primary-soft">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${w}%` }} />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ModeArt() {
  return (
    <div className="flex w-full flex-col gap-2">
      {MODE_ORDER.map((m, i) => (
        <div
          key={m}
          className={`flex items-center justify-between rounded-2xl px-4 py-3 ${i === 0 ? 'border-[1.5px] border-primary bg-primary-soft' : 'border border-line bg-white'}`}
        >
          <span className={`font-display text-[14px] ${i === 0 ? 'text-primary-ink' : ''}`}>{MODES[m].label}</span>
          <span className="text-[12px] text-sub">{MODES[m].homeTitle}</span>
        </div>
      ))}
    </div>
  );
}

function VoteArt() {
  const opts: [string, number][] = [
    ['골목 고깃집', 4],
    ['시장 칼국수', 2],
    ['동네 초밥집', 1],
  ];
  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between">
        <span className={t.kicker}>금요일 팀 회식 · 7명</span>
        <span className="rounded-full bg-fill px-2 py-0.5 text-[11px] font-bold text-sub">투표 중</span>
      </div>
      {opts.map(([name, n], i) => (
        <div key={name} className="flex items-center gap-2.5">
          <span className="font-display w-24 shrink-0 text-[13px]">{name}</span>
          <span className="flex flex-1 gap-1">
            {Array.from({ length: 7 }, (_, k) => (
              <span key={k} className={`h-5 flex-1 rounded ${k < n ? (i === 0 ? 'bg-primary' : 'bg-line-2') : 'bg-fill'}`} />
            ))}
          </span>
          <span className={`w-7 text-right ${t.meta}`}>{n}표</span>
        </div>
      ))}
      <span className="flex items-center gap-1.5 rounded-xl bg-fill px-3 py-2 text-[12px] text-sub">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
        단톡방에 링크 하나만 보내면 끝
      </span>
    </div>
  );
}

const STEPS = [
  {
    art: <RankArt />,
    kicker: '별점 말고, 결제로',
    title: <>사람들이 실제로<br />돈 내고 먹은 곳</>,
    desc: '최근 1개월 BC카드 결제가 많은 가게를 보여드려요. 체인점은 빼고 그 동네 가게 위주로 골랐어요.',
  },
  {
    art: <ModeArt />,
    kicker: '상황만 고르면',
    title: <>지금 열었고, 가깝고,<br />덜 붐비는 곳으로</>,
    desc: '혼밥인지 회식인지, 경기 끝나고인지 여행 중인지에 따라 영업 시간·거리·붐비는 때를 따져 다시 골라요.',
  },
  {
    art: <VoteArt />,
    kicker: '여럿이 정할 땐',
    title: <>후보 고르고<br />링크로 투표까지</>,
    desc: '가입 없이 방을 만들고 링크를 보내면, 다 같이 투표해서 한 곳으로 정해져요.',
  },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === STEPS.length - 1;
  const finish = () => {
    markSeen();
    onDone();
  };
  const next = () => (last ? finish() : setI(i + 1));

  // 좌우로 밀어서 넘기기
  const startX = useRef<number | null>(null);
  const onDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
  };
  const onUp = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (dx < -50 && !last) setI(i + 1);
    if (dx > 50 && i > 0) setI(i - 1);
  };

  const s = STEPS[i];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${SERVICE_NAME} 소개`}
      className="fixed inset-0 z-50 flex justify-center bg-fill md:items-center md:bg-black/40 md:p-6"
      onKeyDown={(e) => {
        if (e.key === 'Escape') finish();
        if (e.key === 'ArrowRight' && !last) setI(i + 1);
        if (e.key === 'ArrowLeft' && i > 0) setI(i - 1);
      }}
    >
      <div className="flex h-full w-full max-w-[480px] flex-col bg-fill md:h-auto md:max-h-[760px] md:min-h-[640px] md:overflow-hidden md:rounded-3xl">
        {/* 위: 로고 + 건너뛰기 */}
        <div className="flex shrink-0 items-center justify-between px-5 pt-[max(16px,env(safe-area-inset-top))] md:pt-5">
          <span className="flex items-center gap-1.5">
            <LogoMark size={24} />
            <span className={t.logo}>{SERVICE_NAME}</span>
          </span>
          {!last && (
            <button type="button" onClick={finish} className={btn.textLink}>
              건너뛰기
            </button>
          )}
        </div>

        {/* 가운데: 그림 + 글 (밀어서 넘김) */}
        <div className="flex min-h-0 flex-1 touch-pan-y select-none flex-col justify-center gap-8 overflow-y-auto px-6 py-6" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (startX.current = null)}>
          <div key={i} className="flex flex-col gap-8 animate-[intro_.35s_ease-out]">
            <div className="flex min-h-[230px] items-center">{s.art}</div>
            <div className="flex flex-col gap-2" aria-live="polite">
              <span className={t.kicker}>{s.kicker}</span>
              <h2 className={t.pageTitle}>{s.title}</h2>
              <p className="text-[14px] leading-[1.6] text-sub">{s.desc}</p>
            </div>
          </div>
        </div>

        {/* 아래: 점 + 버튼 */}
        <div className="flex shrink-0 flex-col gap-4 px-5 pt-2 pb-[max(20px,env(safe-area-inset-bottom))] md:pb-6">
          <div className="flex justify-center gap-1.5" role="tablist" aria-label="소개 단계">
            {STEPS.map((_, k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={k === i}
                aria-label={`${k + 1}번째 소개`}
                onClick={() => setI(k)}
                className={`relative h-2 rounded-full transition-all after:absolute after:-inset-3 after:content-[''] ${k === i ? 'w-6 bg-primary' : 'w-2 bg-line-2'}`}
              />
            ))}
          </div>
          <button type="button" onClick={next} className={btn.primary} autoFocus>
            {last ? '내 주변 가게 보기' : '다음'}
          </button>
          <span className={`min-h-[18px] text-center ${t.desc}`}>
            {last ? '다음 화면에서 위치 권한을 물어봐요 · 내 주변 가게를 찾는 데만 써요' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
