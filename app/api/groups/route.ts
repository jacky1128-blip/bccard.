// 모임 생성 (POST) { token, mode, place, date, time, headcount, title?, memo?, mid?, origin? } → { id }
import { createGroup } from '@/lib/groups';
import { groupRoute, readBody } from '@/lib/groupApi';

export async function POST(req: Request) {
  const body = await readBody(req);
  return groupRoute(async () => ({ id: await createGroup(body) }));
}
