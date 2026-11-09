# 불러오는 API 목록

## 1. 잇플 (필수) · k-skill 프록시
`GET {KSKILL_PROXY_BASE_URL}/v1/bccard-eatpl/search`
- 쿼리: `location`(주소·지역 텍스트), `merTpbuzNm`(업종), `merNm`(가맹점명 일부)
- 결과: 매출 상위 순 최대 100건
- 확인된 필드: `allSaleRnk`(전국 매출 상위 %), `ccgSaleRnk`(지역 매출 상위 %), `srtTime`/`endTime`(영업 예상 시간), `merUrl`(잇플 상세 링크)
- 그 외 표시 항목: 가맹점명, 주소, 업종, 동네 맛집 여부, 외국인·회식 적합 여부, 혼잡 시간, 주요 고객층 → **실제 필드명은 첫 호출 응답을 보고 types/eatpl.ts에 확정**
- 반경 검색이 아니라 주소 텍스트 검색이므로, 거리는 네이버 지오코딩 좌표로 따로 계산
- 오류: 401/403 권한·IP, 502 상위 서버, 503 프록시 설정

## 2. 장소 해석 · 네이버 (서버에서만) — `lib/naver.ts`, `GET /api/places/resolve?q=`
1. 장소 이름(역·학교·가게) → **네이버 검색 API 지역 검색**
   - `GET https://openapi.naver.com/v1/search/local.json?query=`
   - 헤더 `X-Naver-Client-Id`, `X-Naver-Client-Secret` (developers.naver.com 앱 등록)
   - `mapx`/`mapy`는 WGS84 × 10,000,000 으로 처리 중 → **첫 실제 응답으로 확인**
2. 주소 → **네이버 클라우드 Maps Geocoding** (장소 이름은 문서상 미지원이라 1번 실패 시에만)
   - `GET https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=`
   - 헤더 `x-ncp-apigw-api-key-id`, `x-ncp-apigw-api-key`
   - 응답 `addresses[].x`(경도), `.y`(위도), `roadAddress`, `jibunAddress`
- 잇플 가게 주소 → 지도 핀 좌표도 2번으로 채움 (`StoreView.lat/lng`)

## 3. 지도 표시 · 네이버 지도 JavaScript API v3 — `components/MapView.tsx`
- `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId={NEXT_PUBLIC_NAVER_MAP_KEY_ID}`
  (예전 `ncpClientId` 파라미터는 `ncpKeyId`로 바뀜, 구버전 키는 새로 발급)
- 네이버 클라우드 콘솔 Application에 **Web 서비스 URL**(localhost:3000, 실제 도메인) 등록 필요
- 키가 없으면 자리표시 지도로 보여줌

## 3-1. 공유 · 카카오 JavaScript SDK (카카오톡 공유 버튼만)
- 카카오톡으로 초대 링크·결과 보내기는 카카오 SDK가 필요해서 이 용도로만 사용
- 카카오 디벨로퍼스 앱 등록 + 서비스 도메인 등록 필요

## 4. 경기 일정 (선택) · k-skill KBO / K리그
- KBO: 날짜별 일정·결과, K리그: 결과·순위
- 종료 시간은 제공되지 않음 → 평균 경기 시간으로 추정, 사용자가 수정
- 11~12월은 비시즌이라 공모전 기간엔 보조 기능

## 5. 지하철 (선택) · k-skill 서울 지하철
- 중간에서 만나요 모드의 이동 시간 계산에 사용 (MVP 이후)

## 6. LLM · Anthropic Messages API
- 서버에서만 호출, 후보 3곳 + 잇플 필드 + 참여자 조건만 입력
- 모임 공개 시점에 1회 호출 후 DB 저장

## 7. Supabase
- 모임·참여자·후보·투표·잇플 응답 캐시

## 8. GA4
- 이벤트: eatpl_click, create_group, join_group, vote, share_link

## 9. 열차 (선택) · `lib/trains.ts`, `GET /api/trains/lookup?type=KTX&no=101&date=`
- 여행 화면 "예매한 열차로 채우기": 열차 종류 + 열차번호 + 날짜 → 도착역·도착 시간 자동 입력
- **선택 기능**: 연동이 없거나 실패해도 도착역·시간을 직접 입력해서 넘어갈 수 있어야 함
- 지금은 데모 값. 실제 조회 소스 확정 후 `lookupTrain()`만 교체
- 예매 내역 직접 연동(코레일·SR 로그인)은 일반 사용자 서비스에 못 붙이므로 열차번호 조회 방식 전제
