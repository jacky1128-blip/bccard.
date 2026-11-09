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

export function addMinutes(t: string, plus: number) {
  const m = ((toMinutes(t) ?? 0) + plus) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
