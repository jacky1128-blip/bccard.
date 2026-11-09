// 'HH:MM' 또는 'HHMM' → 분. 24:00은 1440
export function toMinutes(t?: string): number | null {
  if (!t) return null;
  const m = t.replace(':', '').match(/^(\d{1,2})(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

// 자정 넘는 영업(17:00~02:00)도 처리
export function isOpenAtMinutes(srt: string | undefined, end: string | undefined, at: number) {
  const s = toMinutes(srt);
  const e = toMinutes(end);
  if (s == null || e == null) return null;
  if (s === e || (s === 0 && e === 1440)) return true;
  return s < e ? at >= s && at < e : at >= s || at < e;
}

export const nowMinutes = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

export const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 서버(Vercel 등 UTC)에서도 한국 시간 기준으로: 지금 몇 분째 · 무슨 요일
export function kstNow(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { minutes: Number(get('hour')) * 60 + Number(get('minute')), dow: DAYS[dow < 0 ? 0 : dow] };
}

// 'YYYY-MM-DD' → '금' (날짜만 쓰므로 시간대 영향 없음)
export function dayOfDate(date?: string) {
  if (!date) return undefined;
  const d = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? undefined : DAYS[d.getUTCDay()];
}

// 'HHMM' / 'HH:MM' → 'HH:MM'
export function hhmm(t?: string) {
  const m = toMinutes(t);
  if (m == null) return undefined;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// 잇플 혼잡 시간대 이름과 맞추는 시간대 구분 (분 → '오전' | '점심' | '오후' | '저녁' | '심야')
export function timeBucket(min: number) {
  const h = Math.floor(min / 60) % 24;
  if (h >= 5 && h < 11) return '오전';
  if (h < 14 && h >= 11) return '점심';
  if (h < 17 && h >= 14) return '오후';
  if (h < 21 && h >= 17) return '저녁';
  return '심야';
}

export function addMinutes(t: string, plus: number) {
  const m = ((toMinutes(t) ?? 0) + plus) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
