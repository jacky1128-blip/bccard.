// 잇플 검색 결과 한 건 (k-skill 프록시 /v1/bccard-eatpl/search 의 items[])
// 2026-11-09 실제 응답으로 필드명 확정
export type EatplItem = {
  merNm: string;               // 가맹점명
  merAddr?: string;            // 주소 "서울 강남구 논현로 325 (역삼동)"
  merTpno?: string;            // 전화번호 (유효하지 않을 수 있음 · 화면에 안 씀)
  merTpbuzNm?: string;         // 업종 "고기구이", "카페", "스시/초밥"
  allSaleRnk?: number;         // 전국 매출 상위 % (낮을수록 상위)
  ccgSaleRnk?: number;         // 지역 매출 상위 %
  loclPrsnPpltYn?: boolean;    // 동네 맛집
  merUrl: string;              // 잇플 상세 링크 (응답값 그대로, 수정 금지)
  srtTime?: string;            // 영업 예상 시작 "1035" (최근 1개월 결제 승인 시각 기반)
  endTime?: string;            // 영업 예상 종료 "2153", 시작보다 이르면 자정 넘김
  frnrVsitYn?: boolean;        // 외국인 방문 많음
  empyVsitYn?: boolean;        // 회식 적합
  hldyDwk?: string[];          // 휴무 요일
  congestionDwk?: string;      // 가장 붐비는 요일 "목"
  congestionTizn?: string;     // 가장 붐비는 시간대 "점심" | "저녁" | "오전" | "오후" | "심야" 등
  vistCstmrRnkList?: { rk01?: string; rk02?: string; rk03?: string }; // 주요 고객층 1~3위 "20대여성"
  xaxsVal?: string;            // TM128 X
  yaxsVal?: string;            // TM128 Y

  // 아래는 잇플 응답이 아니라 서버에서 덧붙이는 값 (_ 접두사)
  _key?: string;
  _lat?: number;               // TM128 → WGS84 변환 좌표
  _lng?: number;
  _walkMin?: number;           // 검색 중심에서 도보 분
  _tags?: string[];
  _reason?: string;
  _reasonBy?: 'ai' | 'rule';
};

export type EatplSearchResult = {
  items: EatplItem[];
  query: { location: string | null; merNm: string | null; merTpbuzNm: string | null };
  attribution: string;
};
