// 모임 조회 (GET ?token=) → GroupState
import type { NextRequest } from 'next/server';
import { cleanToken, getGroupState } from '@/lib/groups';
import { groupRoute } from '@/lib/groupApi';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/groups/[id]'>) {
  const { id } = await ctx.params;
  const token = cleanToken(req.nextUrl.searchParams.get('token'));
  return groupRoute(() => getGroupState(id, token));
}
