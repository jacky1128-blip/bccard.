// 가게 카드 (업종·영업시간·거리·지역 상위·태그·메뉴 보기)
import type { StoreView } from '@/lib/view';
import EatplLink from './EatplLink';
import AiReason from './AiReason';
import { t } from './ui';

export function RankBadge({ store }: { store: StoreView }) {
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-md bg-badge px-2 py-1 text-navy ${t.badge}`}>
      지역 상위 {store.localRank ?? '[N]'}%
    </span>
  );
}

// 업종 · 영업시간 · 도보 거리 줄 (Pretendard 13px 회색)
export function Meta({ parts }: { parts: (string | undefined)[] }) {
  const p = parts.filter(Boolean) as string[];
  return (
    <span className={t.meta}>
      {p.map((s, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          <span className="whitespace-nowrap">{s}</span>
        </span>
      ))}
    </span>
  );
}

export function Tag({ children, blue = false }: { children: React.ReactNode; blue?: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-1 ${t.tag} ${blue ? 'bg-primary-soft text-primary-ink' : 'bg-fill'}`}>{children}</span>
  );
}

export default function StoreCard({
  store,
  showRank = false,
  showWalk = true,
  reason = false,
  highlight,
  menuLabel = '메뉴 보기',
  action,
}: {
  store: StoreView;
  showRank?: boolean;
  showWalk?: boolean;
  reason?: boolean;           // AI 추천 이유 표시
  highlight?: string;         // 파란 칩 ("01:00까지", "12:30 영업 중")
  menuLabel?: string;
  action?: React.ReactNode;   // 메뉴 버튼 옆 버튼 (투표)
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-line p-4">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-start gap-2">
          {showRank && <span className={`w-[22px] text-lg font-black text-primary ${t.num}`}>{store.rank}</span>}
          <div className="flex flex-col gap-0.5">
            <h3 className={t.storeLg}>{store.name}</h3>
            <Meta parts={[store.cat, store.hours, showWalk ? store.walk : undefined]} />
          </div>
        </div>
        <RankBadge store={store} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {store.fan && <Tag>{store.fan}이 많이 가요</Tag>}
        {store.tags.map((x) => <Tag key={x}>{x}</Tag>)}
        {highlight && <Tag blue>{highlight}</Tag>}
      </div>
      {reason && <AiReason text={store.reason} by={store.reasonBy} />}
      {action ? (
        <div className="grid grid-cols-2 gap-2">
          <EatplLink url={store.url} name={store.name} label={menuLabel} />
          {action}
        </div>
      ) : (
        <EatplLink url={store.url} name={store.name} label={menuLabel} />
      )}
    </div>
  );
}
