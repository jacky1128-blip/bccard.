// 가게 한 줄 요약 (TOP 3, 대안, 미리 보기)
import type { StoreView } from '@/lib/view';
import EatplLink from './EatplLink';
import { Meta } from './StoreCard';
import { t } from './ui';

// 첫 화면 TOP 3 줄. 지도 핀과 연결: 핀을 누르면 이 줄이 강조되고, 줄을 누르면 그 핀이 펼쳐짐
export function TopRow({ store, active = false, onSelect }: { store: StoreView; active?: boolean; onSelect?: () => void }) {
  return (
    <div
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-pressed={onSelect ? active : undefined}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a')) return; // 메뉴 보기는 그대로 잇플로
        onSelect?.();
      }}
      onKeyDown={(e) => {
        if (onSelect && (e.key === 'Enter' || e.key === ' ') && !(e.target as HTMLElement).closest('a')) {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`-mx-2.5 flex items-center gap-2.5 rounded-xl border-b border-line px-2.5 py-2.5 transition-colors ${
        onSelect ? 'cursor-pointer' : ''
      } ${active ? 'border-transparent bg-primary-soft' : ''}`}
    >
      <span className={`w-5 text-base font-black ${active ? 'text-primary-ink' : 'text-primary'} ${t.num}`}>{store.rank}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={t.storeSm}>{store.name}</span>
        <Meta parts={[store.cat, store.walk, `지역 상위 ${store.localRank ?? '[N]'}%`]} />
      </div>
      <EatplLink url={store.url} name={store.name} variant="soft" />
    </div>
  );
}

// "여기가 아니라면" 대안 카드
export function AltRow({ store, timeLabel }: { store: StoreView; timeLabel?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-line px-3.5 py-3">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex flex-col gap-0.5">
          <span className={t.storeSm}>{store.name}</span>
          <Meta parts={[store.cat, timeLabel ?? store.hours, store.walk]} />
        </div>
        <EatplLink url={store.url} name={store.name} variant="soft" />
      </div>
      {store.reason && <span className={`${t.body} text-sub`}>{store.reason}</span>}
    </div>
  );
}

// 대기 화면 후보 미리 보기
export function PreviewRow({ store }: { store: StoreView }) {
  return (
    <div className="flex items-center justify-between gap-2.5 rounded-xl border border-line px-3.5 py-3">
      <div className="flex flex-col gap-0.5">
        <span className={t.storeSm}>{store.name}</span>
        <Meta parts={[store.cat, `지역 상위 ${store.localRank ?? '[N]'}%`]} />
      </div>
      <EatplLink url={store.url} name={store.name} variant="text" />
    </div>
  );
}

export default TopRow;
