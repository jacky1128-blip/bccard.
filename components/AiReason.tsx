// AI 추천 이유 박스
import { t } from './ui';

export default function AiReason({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="flex flex-col gap-1 rounded-[10px] bg-fill px-3 py-2.5">
      <span className={t.aiLabel}>AI 추천 이유 · 결제 데이터 근거</span>
      <span className={t.body}>{text}</span>
    </div>
  );
}
