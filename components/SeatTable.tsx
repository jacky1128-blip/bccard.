// 식탁 자리 채우기 (투표 대기)
import { voteThreshold } from '@/lib/rules';

// joined: 들어온 사람 표시 글자 (예: ['방', '나'])
export default function SeatTable({ headcount, joined }: { headcount: number; joined: string[] }) {
  const need = voteThreshold(headcount);
  const left = Math.max(0, need - joined.length);
  const half = Math.ceil(headcount / 2);
  const seats = Array.from({ length: headcount }, (_, i) => joined[i]);
  // 다음에 앉을 자리 하나는 '+'로 강조
  const nextIdx = joined.length < headcount ? joined.length : -1;
  const rows = [seats.slice(0, half).map((s, i) => [s, i] as const), seats.slice(half).map((s, i) => [s, i + half] as const)];

  const Seat = ({ name, idx }: { name?: string; idx: number }) =>
    name ? (
      <span className="flex size-10 items-center justify-center rounded-full bg-primary font-display text-[15px] text-white">{name}</span>
    ) : idx === nextIdx ? (
      <span className="flex size-10 items-center justify-center rounded-full border-2 border-dashed border-primary bg-primary-soft text-lg font-bold text-primary-ink">+</span>
    ) : (
      <span className="size-10 rounded-full border-[1.5px] border-dashed border-[#B8BCC2]" />
    );

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex justify-center gap-6">{rows[0].map(([n, i]) => <Seat key={i} name={n} idx={i} />)}</div>
      <div className="flex h-[88px] w-[210px] flex-col items-center justify-center gap-0.5 rounded-full border-[1.5px] border-[#D5D8DC] bg-white">
        <span className="text-[26px] font-black tabular-nums text-primary">{Math.min(joined.length, need)} / {need}</span>
        <span className="font-display text-[15px]">{left > 0 ? `투표까지 ${left}자리` : '투표가 열렸어요'}</span>
      </div>
      <div className="flex justify-center gap-6">{rows[1].map(([n, i]) => <Seat key={i} name={n} idx={i} />)}</div>
    </div>
  );
}

export function seatRule(headcount: number) {
  return headcount === 2 ? '2자리가 모두 차면 투표가 열려요' : `${headcount}자리 중 절반이 차면 투표가 열려요`;
}

export function createRule(headcount: number) {
  return headcount === 2 ? '둘 다 들어오면 투표가 열려요' : '절반이 들어오면 투표가 열려요';
}

export function lockFoot(headcount: number) {
  return headcount === 2
    ? '2명 모임은 둘 다 들어와야 투표가 열려요.'
    : '끝까지 절반이 안 차면 투표 마감 전에 방장이 지금 인원으로 시작할 수 있어요.';
}
