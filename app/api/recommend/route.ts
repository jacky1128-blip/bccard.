// 후보 선정 + 추천 이유
// POST /api/recommend { place, mode, time?: 'HH:MM', date?: 'YYYY-MM-DD', cantEat?: string[], limit?: 1~5 }
import { NextResponse } from 'next/server';
import { toMode } from '@/lib/modes';
import { getCandidates } from '@/lib/stores';
import { dayOfDate, kstNow, toMinutes } from '@/lib/time';
import { CANT_RULES } from '@/lib/recommend';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const place = typeof body.place === 'string' ? body.place.slice(0, 100) : '';
  if (!place.trim()) return NextResponse.json({ error: 'place 가 필요해요' }, { status: 400 });
  const mode = toMode(body.mode);
  const time = typeof body.time === 'string' ? body.time : undefined;
  const date = typeof body.date === 'string' ? body.date : undefined;
  const now = kstNow();
  const at = time ? toMinutes(time) ?? now.minutes : now.minutes;
  const cantEat = Array.isArray(body.cantEat) ? body.cantEat.filter((c): c is string => typeof c === 'string' && c in CANT_RULES) : [];
  const limit = Math.min(5, Math.max(1, Number(body.limit) || 3));
  const r = await getCandidates({ place, mode, at, day: date ? dayOfDate(date) : now.dow, cantEat, limit, maxWalk: 20, when: `${date ?? '오늘'} ${time ?? '지금'}` });
  return NextResponse.json(r);
}
