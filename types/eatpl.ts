// 잇플 검색 결과 한 건. 확인된 필드만 명시, 나머지는 첫 응답 보고 채우기
export type EatplItem = {
  merUrl: string;          // 잇플 상세 링크 (그대로 사용)
  allSaleRnk?: number;     // 전국 매출 상위 %
  ccgSaleRnk?: number;     // 지역 매출 상위 %
  srtTime?: string;        // 영업 예상 시작
  endTime?: string;        // 영업 예상 종료
  [key: string]: unknown;  // 가맹점명, 주소, 업종, 동네맛집, 회식 적합, 혼잡 시간, 주요 고객층 등
};
