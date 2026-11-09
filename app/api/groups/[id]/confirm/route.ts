// 방장 확정 (POST) { token, merKey? } 또는 { token, startVote: true } (지금 인원으로 투표 시작) → GroupState
import { confirmGroup } from '@/lib/groups';
import { groupRoute, readBody } from '@/lib/groupApi';

export async function POST(req: Request, ctx: RouteContext<'/api/groups/[id]/confirm'>) {
  const { id } = await ctx.params;
  const body = await readBody(req);
  return groupRoute(() => confirmGroup(id, body));
}
