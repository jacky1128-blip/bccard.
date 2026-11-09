// 모임 API 라우트 공통: DB 미설정 · 오류를 JSON으로
import 'server-only';
import { NextResponse } from 'next/server';
import { GroupError } from './groups';
import { dbConfigured } from './db';

export async function groupRoute(fn: () => Promise<unknown>) {
  if (!dbConfigured()) {
    return NextResponse.json({ error: 'DB 연결 정보(SUPABASE_DB_URL)가 없어요 · 지금은 화면 데모로만 동작해요' }, { status: 503 });
  }
  try {
    return NextResponse.json(await fn());
  } catch (e) {
    const status = e instanceof GroupError ? e.status : 500;
    if (status >= 500) console.error('[groups]', e);
    return NextResponse.json({ error: e instanceof GroupError ? e.message : '잠시 후 다시 시도해 주세요' }, { status });
  }
}

export const readBody = async (req: Request) => (await req.json().catch(() => ({}))) as Record<string, unknown>;
