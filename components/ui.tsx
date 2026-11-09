// 와이어프레임 공통 조각: 글자 스타일, 버튼 스타일, 브랜드, 뒤로 가기, 페이지 틀
import Link from 'next/link';

export const SERVICE_NAME = '밥콕';
export const SERVICE_TAGLINE = '결제로 고른 한 끼';
export const LOGO_BLUE = '#2E5E9F'; // 로고 마크 전용 색 (버튼 등 화면 파랑은 --primary)

/* ---------- 글자 스타일 (모바일 390px 기준) ----------
 * 주아체(font-display)는 굵기가 400 하나뿐 → font-bold 금지, 크기로 위계
 * 숫자(순위·%·시간·거리)는 Pretendard + tabular-nums 로 자리 맞춤
 */
export const t = {
  // 주아체
  logo: 'font-display text-[18px] leading-none',
  pageTitle: 'font-display text-[28px] leading-[1.3]',
  headerTitle: 'font-display text-[22px] leading-[1.3]', // 뒤로 가기 옆 화면 이름 (같이 정하기, 여행 등)
  sectionTitle: 'font-display text-base leading-snug',
  sheetTitle: 'font-display text-[19px] leading-snug',  // 첫 화면 시트 제목, 파란 안내 박스 제목
  storeLg: 'font-display text-[18px] leading-snug',
  storeSm: 'font-display text-[17px] leading-snug',
  tag: 'font-display text-[13px]',
  aiLabel: 'font-display text-[13px] text-primary-ink',
  // Pretendard
  kicker: 'text-[13px] font-bold text-primary-ink',
  desc: 'text-[13px] text-sub',
  meta: 'text-[13px] text-sub tabular-nums',
  badge: 'text-[11px] font-bold tabular-nums',
  body: 'text-[13px] leading-[1.5]',
  num: 'tabular-nums',
};

/* ---------- 버튼 (크기 4단계, 글씨는 모두 주아체 15px) ----------
 *  lg   56px · 화면 주요 버튼, 전체 너비 버튼
 *  md   48px · 카드 안 버튼, 공유, 선택 토글
 *  sm   36px · 줄 옆 작은 버튼
 *  chip 36px · 알약 모양 선택 칩
 * 새 버튼도 여기서 골라 쓰기 (높이·굵기 덮어쓰기 금지)
 */
const LABEL = 'font-display text-[15px] leading-none no-underline transition disabled:opacity-40';
const LG = `flex h-14 w-full items-center justify-center rounded-2xl ${LABEL}`;
const MD = `flex h-12 w-full items-center justify-center rounded-xl ${LABEL}`;
const SM = `flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-[10px] px-3 ${LABEL}`;
const CHIP = `flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3.5 ${LABEL}`;

export const btn = {
  primary: `${LG} bg-primary text-white hover:brightness-110`,
  outline: `${LG} border border-line-2 bg-white text-ink hover:bg-fill`,
  mdPrimary: `${MD} bg-primary text-white hover:brightness-110`,
  mdOutline: `${MD} border border-line-2 bg-white text-ink hover:bg-fill`,
  mdSelected: `${MD} border-[1.5px] border-primary bg-primary-soft text-primary-ink`,
  smPrimary: `${SM} bg-primary text-white hover:brightness-110`,
  smSoft: `${SM} bg-primary-soft text-primary-ink hover:brightness-95`,
  smOutline: `${SM} border border-line-2 bg-white text-ink hover:bg-fill`,
  textLink: `${LABEL} whitespace-nowrap text-primary-ink`,
  pillOn: `${CHIP} border-[1.5px] border-primary bg-primary text-white`,
  pillOff: `${CHIP} border border-line bg-white text-ink hover:bg-fill`,
  chipDarkOn: `${CHIP} border-[1.5px] border-ink bg-ink text-white`,
  segOn: `${MD} border-[1.5px] border-primary bg-primary text-white`,
  segOff: `${MD} border border-line bg-white text-ink hover:bg-fill`,
  field: 'h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink outline-none focus:border-primary',
};

// 밥콕 로고 마크: 파란 둥근 사각형 + 흰 선 위치 핀 + 밥그릇 (app/icon.svg 와 같은 그림)
export function LogoMark({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={`shrink-0 ${className}`} role="img" aria-label={`${SERVICE_NAME} 로고`}>
      <rect width="64" height="64" rx="15" fill={LOGO_BLUE} />
      <g fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 36C26.5 30 21.5 26 21.5 19a10.5 10.5 0 0 1 21 0C42.5 26 37.5 30 32 36Z" />
        <circle cx="32" cy="19" r="4" />
        <path d="M17.5 43C20 38.5 25.5 36 32 36s12 2.5 14.5 7" />
        <path d="M10.5 43h43C52 52.5 43.5 56.5 32 56.5S12 52.5 10.5 43Z" />
      </g>
    </svg>
  );
}

export function Brand() {
  return (
    <div className="flex items-center gap-1.5">
      <LogoMark size={24} />
      <span className={t.logo}>{SERVICE_NAME}</span>
      <span className="text-[11px] text-sub">{SERVICE_TAGLINE}</span>
    </div>
  );
}

export function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} aria-label="뒤로" className="flex size-11 items-center justify-center text-ink">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
    </Link>
  );
}

// 뒤로 + 브랜드 (순위·추천·결과 화면 머리)
export function BrandHeader({ back }: { back: string }) {
  return (
    <div className="-ml-3 flex items-center gap-1">
      <BackLink href={back} />
      <Brand />
    </div>
  );
}

// 뒤로 + 화면 제목 (입력 화면 머리)
export function TitleHeader({ back, title, right }: { back: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="-ml-3 flex items-center gap-1">
      <BackLink href={back} />
      <span className={t.headerTitle}>{title}</span>
      {right && <span className="ml-auto text-xs text-sub">{right}</span>}
    </div>
  );
}

// 큰 제목 묶음: 위 안내 줄(파랑) + 제목(주아체 28) + 아래 설명(회색)
export function PageTitle({ kicker, title, desc }: { kicker?: React.ReactNode; title: React.ReactNode; desc?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {kicker && <span className={t.kicker}>{kicker}</span>}
      <h1 className={t.pageTitle}>{title}</h1>
      {desc && <span className={t.desc}>{desc}</span>}
    </div>
  );
}

export function SectionTitle({ children, as: Tag = 'h2' }: { children: React.ReactNode; as?: 'h2' | 'span' }) {
  return <Tag className={t.sectionTitle}>{children}</Tag>;
}

export function Page({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <main className={`flex flex-1 flex-col gap-5 px-5 pb-6 pt-6 ${className}`}>{children}</main>;
}

export function Section({ title, children, gap = 'gap-2' }: { title?: React.ReactNode; children: React.ReactNode; gap?: string }) {
  return (
    <div className={`flex flex-col ${gap}`}>
      {title && <SectionTitle as="span">{title}</SectionTitle>}
      {children}
    </div>
  );
}

export function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B5F66" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export function StatBoxes({ items }: { items: [string, string][] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5 rounded-xl bg-fill p-2.5">
          <span className="text-[11px] text-sub">{k}</span>
          <span className={`text-sm font-bold ${t.num}`}>{v}</span>
        </div>
      ))}
    </div>
  );
}
