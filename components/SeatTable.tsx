// 식탁 자리 채우기 (투표 대기)
import { voteThreshold } from '@/lib/rules';

// joined: 들어온 사람 표시 글자 (예: ['방', '나'])
// mid: 중간에서 만나요 → 자리가 차도 방장이 중간역을 정한 뒤 투표를 엶
export default function SeatTable({ headcount, joined, mid }: { headcount: number; joined: string[]; mid?: boolean }) {
  const need = mid ? headcount : voteThreshold(headcount); // 중간에서 만나요는 전체 인원 기준으로 보여 줌
  const left = Math.max(0, need - joined.length);
  const half = Math.ceil(headcount / 2);
  const seats = Array.from({ length: headcount }, (_, i) => joined[i]);
  // 다음에 앉을 자리 하나는 '+'로 강조
  const nextIdx = joined.length < headcount ? joined.length : -1;
  const rows = [seats.slice(0, half).map((s, i) => [s, i] as const), seats.slice(half).map((s, i) => [s, i + half] as const)];

  // 한 줄 7자리 넘게(13명 이상)면 자리를 줄여서 폰 폭에 10자리까지 들어가게
  const dense = half > 6;
  const size = dense ? 'size-[clamp(24px,7.6cqw,40px)]' : 'size-[clamp(34px,11.5cqw,48px)]';
  const rowGap = dense ? 'gap-[clamp(4px,1.6cqw,10px)]' : 'gap-[clamp(14px,7cqw,32px)]';
  const Seat = ({ name, idx }: { name?: string; idx: number }) =>
    name ? (
      // 도현체는 글자가 줄 높이 안에서 0.095em 위로 붙어 그려짐 → 위 여백 0.19em 으로 원 정중앙에 (실측)
      <span className={`flex ${size} items-center justify-center rounded-full bg-primary pt-[0.19em] font-display ${dense ? 'text-[clamp(11px,3.4cqw,15px)]' : 'text-[clamp(13px,4.3cqw,17px)]'} text-white`}>{name}</span>
    ) : idx === nextIdx ? (
      <span className={`flex ${size} items-center justify-center rounded-full border-2 border-dashed border-primary bg-primary-soft ${dense ? 'text-sm' : 'text-lg'} font-bold text-primary-ink`}>+</span>
    ) : (
      <span className={`${size} rounded-full border-[1.5px] border-dashed border-[#B8BCC2]`} />
    );

  return (
    // 식탁 그림은 들어 있는 상자 폭에 맞춰 비율 그대로 줄고 늘어남 (cqw = 상자 폭의 1%)
    // 자리 줄·식탁 모두 상자 가운데에 (줄은 상자 폭 전체를 쓰고 그 안에서 가운데 정렬)
    <div className="@container mx-auto w-full">
    <div className="mx-auto flex w-full flex-col items-center gap-[clamp(8px,3cqw,14px)]">
      <div className={`flex w-full justify-center ${rowGap}`}>{rows[0].map(([n, i]) => <Seat key={i} name={n} idx={i} />)}</div>
      <div className="flex aspect-[210/88] w-[clamp(180px,62cqw,280px)] flex-col items-center justify-center gap-0.5 rounded-full border-[1.5px] border-[#D5D8DC] bg-white">
        {/* 들어온 사람 / 전체 자리. 투표 열림 기준(절반)은 아래 줄에 따로 */}
        <span className="text-[clamp(22px,7.5cqw,32px)] font-black tabular-nums text-primary">{Math.min(joined.length, headcount)} / {headcount}</span>
        <span className="font-display text-[clamp(13px,4.3cqw,17px)]">{mid ? '방장이 장소 정하는 중' : left > 0 ? `${left}명 더 오면 투표 시작` : '투표가 열렸어요'}</span>
      </div>
      <div className={`flex w-full justify-center ${rowGap}`}>{rows[1].map(([n, i]) => <Seat key={i} name={n} idx={i} />)}</div>
    </div>
    </div>
  );
}

export function seatRule(headcount: number, mid?: boolean) {
  if (mid) return '출발역이 모이면 방장이 중간역을 정하고 투표를 열어요';
  return headcount === 2 ? '2자리가 모두 차면 투표가 열려요' : `${headcount}자리 중 절반이 차면 투표가 열려요`;
}

export function createRule(headcount: number, mid?: boolean) {
  if (mid) return '방장이 중간역을 정하면 투표가 열려요';
  return headcount === 2 ? '둘 다 들어오면 투표가 열려요' : '절반이 들어오면 투표가 열려요';
}

export function lockFoot(headcount: number, mid?: boolean) {
  if (mid) return '중간역으로 후보를 다시 찾았거나 지금 장소가 좋으면, 방장이 투표를 시작해요.';
  return headcount === 2
    ? '2명 모임은 둘 다 들어와야 투표가 열려요.'
    : '끝까지 절반이 안 차면 투표 마감 전에 방장이 지금 인원으로 시작할 수 있어요.';
}
