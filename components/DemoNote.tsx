// 잇플·장소 조회가 실패해 예시 데이터를 보여줄 때 안내
import { t } from './ui';

export default function DemoNote({ notFound, place }: { notFound?: boolean; place?: string }) {
  return (
    <p role="status" className={`rounded-xl bg-fill px-3.5 py-2.5 ${t.desc}`}>
      {notFound
        ? `‘${place ?? ''}’ 위치를 찾지 못했어요 · 역이나 동네 이름으로 다시 검색해 주세요`
        : '지금 결제 데이터를 불러오지 못해 예시를 보여드려요 · 잠시 뒤 다시 시도해 주세요'}
    </p>
  );
}
