// 투표 (POST) { token, merKey } → GroupState
import { voteGroup } from '@/lib/groups';
import { groupRoute, readBody } from '@/lib/groupApi';

export async function POST(req: Request, ctx: RouteContext<'/api/groups/[id]/vote'>) {
  const { id } = await ctx.params;
  const body = await readBody(req);
  return groupRoute(() => voteGroup(id, body));
}
