// eat.pl 잇플 · BC카드 결제 데이터 기반 출처 표시
export default function SourceNote({ ai = false }: { ai?: boolean }) {
  return (
    <span className="mt-auto text-[11px] text-sub">
      eat.pl 잇플 · BC카드 결제 데이터 기반{ai && ' · 추천 이유는 결제 데이터로만 AI가 작성'}
    </span>
  );
}
