import type { EatplItem } from '@/types/eatpl';
import type { Mode } from '@/types/group';

// 코드로 하는 필터: 영업시간, 혼잡, 못 먹는 거, 거리 → 상위 N
export function pickCandidates(items: EatplItem[], opts: { mode: Mode; at?: Date; cantEat?: string[]; limit?: number }) {
  // TODO
  return items.slice(0, opts.limit ?? 3);
}
