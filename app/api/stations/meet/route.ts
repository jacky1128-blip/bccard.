// 중간에서 만나요: 출발역들 → 각 역 좌표 + 공평한 역 후보
// POST /api/stations/meet { origins: string[], limit?: 1~5 } → { resolved: (Station|null)[], options: MeetingOption[] }
import { NextResponse } from 'next/server';
import { meet } from '@/lib/stations';
import { MAX_HEADCOUNT } from '@/lib/rules';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { origins?: unknown; limit?: unknown };
  const origins = Array.isArray(body.origins) ? body.origins.filter((x): x is string => typeof x === 'string').slice(0, MAX_HEADCOUNT).map((x) => x.slice(0, 30)) : [];
  const limit = Math.min(5, Math.max(1, Number(body.limit) || 3));
  try {
    return NextResponse.json(await meet(origins, limit));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
