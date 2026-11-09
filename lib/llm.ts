// AI 추천 이유: 코드가 고른 후보마다 한두 문장. 잇플 필드만 근거, 없는 정보 생성 금지
// 키(ANTHROPIC_API_KEY)가 없거나 실패하면 null → 호출한 쪽이 규칙 기반 이유(ruleReason)를 씀
import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import { cacheLife } from 'next/cache';
import type { EatplItem } from '@/types/eatpl';
import type { Mode } from '@/types/group';
import { MODES } from './modes';
import { cleanName, fanLabel, isAllDay } from './view';
import { hhmm } from './time';

const MODEL = process.env.LLM_MODEL || 'claude-opus-5-5';

export const llmConfigured = () => !!process.env.ANTHROPIC_API_KEY;

export type ReasonContext = {
  mode: Mode;
  place: string;
  when?: string;        // "11/14(금) 19:00", "지금 12:10"
  cantEat?: string[];
  headcount?: number;
};

// 모델에 넘기는 값: 잇플 응답 필드 중 화면에 공개되는 것만 (전화번호·좌표·링크 제외)
function facts(it: EatplItem, i: number) {
  const fans = [it.vistCstmrRnkList?.rk01, it.vistCstmrRnkList?.rk02, it.vistCstmrRnkList?.rk03].map(fanLabel).filter(Boolean);
  return {
    id: `s${i + 1}`,
    가게명: cleanName(it.merNm),
    업종: it.merTpbuzNm ?? null,
    지역_매출_상위_퍼센트: it.ccgSaleRnk ?? null,
    전국_매출_상위_퍼센트: it.allSaleRnk ?? null,
    동네맛집: it.loclPrsnPpltYn ?? null,
    회식_적합: it.empyVsitYn ?? null,
    외국인_방문_많음: it.frnrVsitYn ?? null,
    영업_예상_시간: isAllDay(it.srtTime, it.endTime) ? '24시간' : `${hhmm(it.srtTime) ?? '?'}~${hhmm(it.endTime) ?? '?'}`,
    가장_붐비는_요일: it.congestionDwk ?? null,
    가장_붐비는_시간대: it.congestionTizn ?? null,
    휴무_요일: it.hldyDwk?.length ? it.hldyDwk : null,
    주요_고객층: fans.length ? fans : null,
    도보_분: it._walkMin ?? null,
  };
}

const SYSTEM = `너는 BC카드 결제 데이터(잇플)로 고른 식당 후보에 "왜 이 상황에 맞는지" 한국어로 짧게 설명하는 역할이다.
규칙:
- 근거는 각 가게에 주어진 필드뿐이다. 메뉴, 맛, 가격, 분위기, 좌석·룸, 주차, 예약, 리뷰, 별점처럼 주어지지 않은 정보는 절대 쓰지 않는다.
- 숫자는 주어진 값 그대로 쓴다. 매출은 "지역 상위 N%"처럼 백분위로만 말하고 매출액을 말하지 않는다.
- 영업시간은 결제 기록으로 추정한 "영업 예상 시간"이다. 확정 영업시간처럼 단정하지 않는다.
- 못 먹는 음식은 업종 이름으로만 판단할 수 있다. 업종에서 알 수 없으면 언급하지 않는다.
- 가게마다 1~2문장, 80자 이내, "~예요/~해요" 말투. 가게끼리 같은 문장을 반복하지 않는다.
- 상황과 관련된 근거(회식이면 회식 적합, 늦은 시간이면 영업 예상 시간, 여행이면 동네맛집)를 먼저 쓴다.`;

const schema = {
  type: 'object',
  properties: {
    reasons: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, reason: { type: 'string' } },
        required: ['id', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['reasons'],
  additionalProperties: false,
} as const;

// 같은 후보·같은 상황이면 하루 동안 다시 호출하지 않음 (실패는 캐시하지 않도록 여기서는 throw)
async function generate(items: EatplItem[], ctx: ReasonContext): Promise<string[]> {
  'use cache';
  cacheLife('days');

  const client = new Anthropic();
  const input = {
    상황: MODES[ctx.mode].label,
    상황_기준: MODES[ctx.mode].crit,
    장소: ctx.place,
    언제: ctx.when ?? null,
    인원: ctx.headcount ?? null,
    못_먹는_것: ctx.cantEat?.length ? ctx.cantEat : null,
    후보: items.map(facts),
  };
  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // 정책상 거절되면 서버가 기본 대체 모델로 다시 시도
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    output_config: { effort: 'low', format: jsonSchemaOutputFormat(schema) },
    messages: [{ role: 'user', content: `아래 후보마다 추천 이유를 써 줘.
${JSON.stringify(input)}` }],
  });
  if (res.stop_reason === 'refusal') throw new Error('refusal');
  if (!res.parsed_output) throw new Error('no parsed output');
  const byId = new Map(res.parsed_output.reasons.map((r) => [r.id, r.reason.trim()]));
  const out = items.map((_, i) => byId.get(`s${i + 1}`) ?? '');
  if (!out.every(Boolean)) throw new Error('missing reasons');
  return out.map((r) => (r.length > 120 ? `${r.slice(0, 118)}…` : r));
}

export async function writeReasons(items: EatplItem[], ctx: ReasonContext): Promise<string[] | null> {
  if (!llmConfigured() || items.length === 0) return null;
  try {
    return await generate(items, ctx);
  } catch (e) {
    console.error('[llm] writeReasons failed', e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return null;
  }
}
