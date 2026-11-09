import Anthropic from '@anthropic-ai/sdk';
import type { EatplItem } from '@/types/eatpl';

// 추천 이유: 잇플 필드만 근거, 없는 정보 생성 금지
export async function writeReasons(items: EatplItem[], context: { mode: string; cantEat: string[] }) {
  const client = new Anthropic();
  // TODO: 프롬프트 작성, JSON으로 가게별 이유 받기
  return items.map(() => '');
}
