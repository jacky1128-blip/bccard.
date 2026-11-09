// 예매한 열차 → 도착역·시간
// GET /api/trains/lookup?type=KTX&no=101&date=2026-11-18
import { NextResponse, type NextRequest } from 'next/server';
import { lookupTrain, type TrainType } from '@/lib/trains';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type: TrainType = sp.get('type') === 'SRT' ? 'SRT' : 'KTX';
  const no = (sp.get('no') ?? '').slice(0, 6);
  const date = (sp.get('date') ?? '').slice(0, 10);
  if (!/^\d{1,6}$/.test(no)) return NextResponse.json({ error: '열차번호는 숫자로 넣어 주세요' }, { status: 400 });
  try {
    const train = await lookupTrain(type, no, date);
    if (!train) return NextResponse.json({ error: '열차를 찾지 못했어요' }, { status: 404 });
    return NextResponse.json(train);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
