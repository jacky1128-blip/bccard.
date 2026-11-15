// 순위 화면에서 업종을 골랐을 때: 그 동네 그 업종만의 결제 순위 (상황 4개 목록, 각 전체)
// GET /api/ranking?place=역삼역&cat=찜/탕/찌개
// 동네 전체 상위 100곳 안에는 한 업종이 몇 곳뿐이라, 업종을 잇플에 따로 물어봐야 1~10위가 나옴
import { NextResponse, type NextRequest } from 'next/server';
import { getStoresByMode } from '@/lib/stores';
import { kstNow } from '@/lib/time';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const place = sp.get('place')?.trim().slice(0, 100);
  const cat = sp.get('cat')?.trim().slice(0, 30);
  if (!place || !cat) return NextResponse.json({ error: 'place, cat 이 필요해요' }, { status: 400 });
  const { minutes, dow } = kstNow();
  const r = await getStoresByMode(place, { at: minutes, day: dow, full: true, genre: cat });
  // 실패하면 예시 데이터 대신 오류 → 화면은 기존 목록에서 그 업종만 거른 결과를 그대로 보여 줌
  if (!r.live) return NextResponse.json({ error: r.error ?? '결제 데이터를 불러오지 못했어요' }, { status: 502 });
  return NextResponse.json({ storesByMode: r.storesByMode });
}
