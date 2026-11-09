'use client';
// 중간에서 만나요: 각자 출발역 입력 → 공평한 중간역 추천 → 고르면 모임 장소로
import { useState } from 'react';
import { STATIONS, findStation, meetingOptions, type Station } from '@/lib/midpoint';
import { btn, t } from './ui';

const WHO = (i: number) => (i === 0 ? '나' : `친구 ${i}`);

// 입력값 → (몇 번째 사람, 역) 목록과 추천 결과
function compute(origins: string[]) {
  const people = origins
    .map((o, i) => ({ i, station: findStation(o) }))
    .filter((p): p is { i: number; station: Station } => !!p.station);
  return { people, options: meetingOptions(people.map((p) => p.station)) };
}

export default function MidpointPicker({
  maxPeople,
  value,
  onPick,
  onMyOrigin,
}: {
  maxPeople: number;
  value: string;                       // 지금 모임 장소
  onPick: (station: string) => void;   // 장소 칸에 넣기
  onMyOrigin?: (station: string) => void; // 첫 칸(나)의 출발역 → 모임 저장 시 방장 출발역
}) {
  const [origins, setOrigins] = useState<string[]>(['', '']);
  const { people, options } = compute(origins);
  const chosen = options.find((o) => `${o.station.name}역` === value) ?? options[0];

  // 출발지가 바뀌면 가장 공평한 역을 바로 장소로 채움
  const update = (next: string[]) => {
    setOrigins(next);
    onMyOrigin?.(findStation(next[0] ?? '') ? next[0] : '');
    const best = compute(next).options[0];
    if (best) onPick(`${best.station.name}역`);
  };

  return (
    <div className="flex flex-col gap-3 rounded-[14px] bg-fill p-4">
      <span className={t.sectionTitle}>각자 어디서 출발해요?</span>
      <datalist id="stations">
        {STATIONS.map((s) => <option key={s.name} value={`${s.name}역`} />)}
      </datalist>

      {origins.map((o, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 font-display text-[15px]">{WHO(i)}</span>
            <input
              list="stations"
              aria-label={`${WHO(i)} 출발역`}
              className={btn.field}
              value={o}
              onChange={(e) => update(origins.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder="출발역 (예: 홍대입구)"
            />
            {origins.length > 2 && (
              <button
                type="button"
                aria-label={`${WHO(i)} 지우기`}
                onClick={() => update(origins.filter((_, j) => j !== i))}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-sub hover:bg-white"
              >
                ✕
              </button>
            )}
          </div>
          {o && !findStation(o) && <span className="pl-16 text-xs text-[#C92A2A]">목록에 있는 역 이름으로 넣어 주세요</span>}
        </div>
      ))}

      {origins.length < maxPeople && (
        <button type="button" onClick={() => setOrigins([...origins, ''])} className={btn.mdOutline}>
          + 출발지 추가
        </button>
      )}

      {chosen ? (
        <div className="flex flex-col gap-3 rounded-xl border-[1.5px] border-primary bg-white p-3.5">
          <span className={t.kicker}>가장 멀리 오는 사람 기준으로 공평한 곳</span>
          <div className="flex flex-wrap gap-1.5">
            {options.map((op) => (
              <button
                key={op.station.name}
                type="button"
                aria-pressed={op === chosen}
                onClick={() => onPick(`${op.station.name}역`)}
                className={op === chosen ? btn.pillOn : btn.pillOff}
              >
                {op.station.name}역 · 최대 {op.maxMin}분
              </button>
            ))}
          </div>
          <ul className="flex flex-col gap-1">
            {chosen.legs.map((l, k) => (
              <li key={k} className={`flex justify-between ${t.meta}`}>
                <span>{WHO(people[k].i)} · {l.from.name}역</span>
                <span className="font-bold text-ink">{l.min === 0 ? '바로 여기' : `약 ${l.min}분`}</span>
              </li>
            ))}
          </ul>
          <span className="text-[11px] text-sub">직선거리로 어림잡은 시간이에요 · 실제 지하철 시간은 연결 후 반영</span>
        </div>
      ) : (
        <span className={t.desc}>2명 이상 출발역을 넣으면 중간역을 찾아드려요</span>
      )}
    </div>
  );
}
