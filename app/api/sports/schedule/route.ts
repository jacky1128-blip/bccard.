// 경기 일정 (선택 기능) · GET /api/sports/schedule?date=2026-11-15
import { NextResponse, type NextRequest } from 'next/server';
import { getSchedule } from '@/lib/sports';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'date=YYYY-MM-DD 가 필요해요' }, { status: 400 });
  return NextResponse.json({ date, games: await getSchedule(date) });
}
