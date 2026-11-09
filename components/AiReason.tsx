// 추천 이유 박스 (AI가 쓴 이유인지, 키가 없어 규칙으로 만든 이유인지 구분해서 표시)
import { t } from './ui';

export default function AiReason({ text, by = 'ai' }: { text: string; by?: 'ai' | 'rule' }) {
  if (!text) return null;
  return (
    <div className="flex flex-col gap-1 rounded-[10px] bg-fill px-3 py-2.5">
      <span className={t.aiLabel}>{by === 'ai' ? 'AI 추천 이유' : '추천 이유'} · 결제 데이터 근거</span>
      <span className={t.body}>{text}</span>
    </div>
  );
}
