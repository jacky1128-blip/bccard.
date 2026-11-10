'use client';
// 중간에서 만나요: 각자 출발역 입력 → 공평한 중간역 추천 → 고르면 모임 장소로
// 역은 전국 어디든 (서버가 카카오 지하철역 검색으로 찾음, lib/stations.ts)
import { useEffect, useState } from 'react';
import { STATIONS, stationLabel } from '@/lib/midpoint';
import { useMeet } from '@/lib/useMeet';
import { btn, t } from './ui';

const WHO = (i: number) => (i === 0 ? '나' : `친구 ${i}`);

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
  const { resolved, options, loading, real } = useMeet(origins);
  const [touched, setTouched] = useState(false); // 사용자가 후보를 직접 골랐는지
  const chosen = options.find((o) => stationLabel(o.station.name) === value) ?? options[0];
  // 결과의 각 줄이 몇 번째 사람인지 (찾은 역만 계산에 들어감)
  const people = resolved.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);

  // 추천이 바뀌면 가장 공평한 역을 장소로 채움 (직접 고른 역이 아직 후보에 있으면 그대로)
  const best = options[0] ? stationLabel(options[0].station.name) : '';
  const valueInOptions = options.some((o) => stationLabel(o.station.name) === value);
  useEffect(() => {
    if (best && (!touched || !valueInOptions)) onPick(best);
  }, [best, touched, valueInOptions, onPick]);

  const mine = resolved[0] ? origins[0] : '';
  useEffect(() => {
    onMyOrigin?.(mine);
  }, [mine, onMyOrigin]);

  const update = (next: string[]) => setOrigins(next);

  return (
    <div className="flex flex-col gap-3 rounded-[14px] bg-fill p-4">
      <span className={t.sectionTitle}>각자 어디서 출발해요?</span>
      {/* 자주 쓰는 역은 입력 도우미로만. 목록에 없는 역도 넣을 수 있어요 */}
      <datalist id="stations">
        {STATIONS.map((s) => <option key={s.name} value={stationLabel(s.name)} />)}
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
          {o.trim() && !loading && resolved.length === origins.length && !resolved[i] && (
            <span className="pl-16 text-xs text-[#C92A2A]">지하철역을 찾지 못했어요. 역 이름을 확인해 주세요</span>
          )}
        </div>
      ))}

      {origins.length < maxPeople && (
        <button type="button" onClick={() => setOrigins([...origins, ''])} className={btn.mdOutline}>
          + 출발지 추가
        </button>
      )}

      {chosen ? (
        <div className={`flex flex-col gap-3 rounded-xl border-[1.5px] border-primary bg-white p-3.5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <span className={t.kicker}>가장 멀리 오는 사람 기준으로 공평한 곳</span>
          <div className="flex flex-wrap gap-1.5">
            {options.map((op) => (
              <button
                key={op.station.name}
                type="button"
                aria-pressed={op === chosen}
                onClick={() => {
                  setTouched(true);
                  onPick(stationLabel(op.station.name));
                }}
                className={op === chosen ? btn.pillOn : btn.pillOff}
              >
                {stationLabel(op.station.name)} · {op.maxMin === 0 ? '바로 여기' : `최대 ${op.maxMin}분`}
              </button>
            ))}
          </div>
          <ul className="flex flex-col gap-1">
            {chosen.legs.map((l, k) => (
              <li key={k} className={`flex justify-between ${t.meta}`}>
                <span>{WHO(people[k] ?? k)} · {stationLabel(l.from.name)}</span>
                <span className="font-bold text-ink">
                  {l.min === 0 ? '바로 여기' : `약 ${l.min}분`}
                  {chosen.real && l.min > 0 && <span className="ml-1 font-normal text-sub">{l.transfers ? `환승 ${l.transfers}번` : '환승 없음'}</span>}
                </span>
              </li>
            ))}
          </ul>
          <span className="text-[11px] text-sub">{real ? '실제 대중교통 시간이에요' : loading ? '실제 대중교통 시간 확인 중…' : '직선거리로 어림잡은 시간이에요'}</span>
        </div>
      ) : (
        <span className={t.desc}>{loading ? '역을 찾는 중…' : '2명 이상 출발역을 넣으면 중간역을 찾아드려요'}</span>
      )}
    </div>
  );
}
