// 장소 이름 → 주소/좌표 (네이버)
// GET /api/places/resolve?q=강남역
import { NextResponse, type NextRequest } from 'next/server';
import { naverConfigured, resolvePlace } from '@/lib/naver';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.slice(0, 100) ?? '';
  if (!q.trim()) return NextResponse.json({ error: 'q 가 필요해요' }, { status: 400 });
  if (!naverConfigured()) return NextResponse.json({ error: '네이버 API 키가 설정되지 않았어요 (.env.local)' }, { status: 503 });
  try {
    const place = await resolvePlace(q);
    if (!place) return NextResponse.json({ error: '찾지 못했어요' }, { status: 404 });
    return NextResponse.json(place);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
