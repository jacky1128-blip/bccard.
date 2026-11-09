// 참여 (POST) { token, nickname?, cantEat?, origin? } → GroupState
import { joinGroup } from '@/lib/groups';
import { groupRoute, readBody } from '@/lib/groupApi';

export async function POST(req: Request, ctx: RouteContext<'/api/groups/[id]/join'>) {
  const { id } = await ctx.params;
  const body = await readBody(req);
  return groupRoute(() => joinGroup(id, body));
}
