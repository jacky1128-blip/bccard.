// 잇플 검색 (서버에서 k-skill 프록시 호출 + 1시간 캐시)
// GET /api/eatpl/search?location=서울 강남구 역삼동&genre=고기구이&merNm=
import { NextResponse, type NextRequest } from 'next/server';
import { EatplError, searchEatpl } from '@/lib/eatpl';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const location = sp.get('location')?.slice(0, 100) || undefined;
  const genre = sp.get('genre')?.slice(0, 30) || undefined;
  const merchantName = sp.get('merNm')?.slice(0, 50) || undefined;
  if (!location && !genre && !merchantName) {
    return NextResponse.json({ error: 'location, genre, merNm 중 하나는 있어야 해요' }, { status: 400 });
  }
  try {
    return NextResponse.json(await searchEatpl({ location, genre, merchantName }));
  } catch (e) {
    const status = e instanceof EatplError ? (e.status >= 500 ? 502 : e.status) : 502;
    return NextResponse.json({ error: '결제 데이터를 불러오지 못했어요' }, { status });
  }
}
