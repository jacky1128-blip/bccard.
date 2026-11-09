// 가게 한 줄 요약 (TOP 3, 대안, 미리 보기)
import type { StoreView } from '@/lib/view';
import EatplLink from './EatplLink';
import { Meta } from './StoreCard';
import { t } from './ui';

// 첫 화면 TOP 3 줄
export function TopRow({ store }: { store: StoreView }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-line py-2.5">
      <span className={`w-5 text-base font-black text-primary ${t.num}`}>{store.rank}</span>
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
