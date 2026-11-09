// 중간에서 만나요: 방장이 장소를 바꾸면 후보 다시 찾기 (POST) { token, place } → GroupState
import { changePlace } from '@/lib/groups';
import { groupRoute, readBody } from '@/lib/groupApi';

export async function POST(req: Request, ctx: RouteContext<'/api/groups/[id]/place'>) {
  const { id } = await ctx.params;
  const body = await readBody(req);
  return groupRoute(() => changePlace(id, body));
}
