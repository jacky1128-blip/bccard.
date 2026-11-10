# 불러오는 API 목록

## 1. 잇플 (필수) · k-skill 프록시 · `lib/eatpl.ts`
`GET {KSKILL_PROXY_BASE_URL}/v1/bccard-eatpl/search` (키 없이 동작, 서버에서만 호출, 1시간 캐시)
- 쿼리: `location`(주소·지역 텍스트, 예: `서울 강남구 역삼동`), `merTpbuzNm`(업종), `merNm`(가맹점명 일부)
- 결과: `{ items: [...], query, attribution }` · 최근 1개월 매출 상위 순 최대 100건
- 반경 검색이 아니라 주소 텍스트 검색 → 장소를 먼저 `시 구 동`으로 바꿔서 넣음 (`lib/places.ts`)
- 오류: 401/403 권한·IP, 502 상위 서버, 503 프록시 설정

### 응답 필드 (2026-11-09 실제 응답으로 확정 · `types/eatpl.ts`)
| 필드 | 뜻 | 예시 |
|---|---|---|
| `merNm` | 가맹점명 (화면에선 `(주)`·`주식회사` 떼고 표시) | `(주)전한강강술래역삼점` |
| `merAddr` | 주소 | `서울 강남구 논현로 325 (역삼동)` |
| `merTpno` | 전화 (유효하지 않을 수 있어 안 씀) | `02-...` |
| `merTpbuzNm` | 업종 | `고기구이`, `카페`, `스시/초밥` |
| `allSaleRnk` / `ccgSaleRnk` | 전국 / 지역 매출 상위 % (낮을수록 상위) | `0.1` / `0.12` |
| `loclPrsnPpltYn` | 동네 맛집 | `true` |
| `frnrVsitYn` | 외국인 방문 많음 | `false` |
| `empyVsitYn` | 회식 적합 | `false` |
| `srtTime` / `endTime` | 영업 예상 시간 (결제 승인 시각 기반, `HHMM`, 끝이 더 이르면 자정 넘김) | `1035` / `2153` |
| `hldyDwk` | 휴무 요일 배열 | `[]` |
| `congestionDwk` / `congestionTizn` | 가장 붐비는 요일 / 시간대 | `목` / `점심` (오전·점심·저녁 등) |
| `vistCstmrRnkList` | 주요 고객층 1~3위 | `{ rk01: "60대이상여성", ... }` |
| `merUrl` | 잇플 상세 링크 (그대로 사용, `https://web.paybooc.ai/` 아니면 버림) | |
| `xaxsVal` / `yaxsVal` | TM128 좌표 → `lib/geo.ts`가 위경도로 변환 (카카오 대비 평균 8m) | `315259` / `543986` |

## 2. 장소 해석 — `lib/places.ts`, `GET /api/places/resolve?q=`
- 네이버 키가 있으면 네이버(아래 1·2), 없거나 실패하면 **k-skill 카카오 키워드 검색** `GET {KSKILL_PROXY_BASE_URL}/v1/kakao-map/search/keyword?q=` (키 없음)
- 좌표 입력(`37.5007,127.0365`, 첫 화면 "내 위치")은 `GET /v1/kakao-map/coord2address?x=&y=` 로 동네를 찾음
- 근처 지하철역: `GET /v1/kakao-map/search/category?category_group_code=SW8&x=&y=&radius=2000`

### 네이버 (선택, 서버에서만) — `lib/naver.ts`
1. 장소 이름(역·학교·가게) → **네이버 검색 API 지역 검색**
   - `GET https://openapi.naver.com/v1/search/local.json?query=`
   - 헤더 `X-Naver-Client-Id`, `X-Naver-Client-Secret` (developers.naver.com 앱 등록)
   - `mapx`/`mapy`는 WGS84 × 10,000,000 으로 처리 중 → **첫 실제 응답으로 확인**
2. 주소 → **네이버 클라우드 Maps Geocoding** (장소 이름은 문서상 미지원이라 1번 실패 시에만)
   - `GET https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=`
   - 헤더 `x-ncp-apigw-api-key-id`, `x-ncp-apigw-api-key`
   - 응답 `addresses[].x`(경도), `.y`(위도), `roadAddress`, `jibunAddress`
- 지도 핀 좌표는 잇플 TM128 좌표를 변환해서 씀 (지오코딩 호출 없음)

## 3. 지도 표시 · 네이버 지도 JavaScript API v3 — `components/MapView.tsx`
- `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId={NEXT_PUBLIC_NAVER_MAP_KEY_ID}`
  (예전 `ncpClientId` 파라미터는 `ncpKeyId`로 바뀜, 구버전 키는 새로 발급)
- 네이버 클라우드 콘솔 Application에 **Web 서비스 URL**(localhost:3000, 실제 도메인) 등록 필요
- 키가 없으면 자리표시 지도로 보여줌

## 3-1. 공유 · 카카오 JavaScript SDK (카카오톡 공유 버튼만)
- 카카오톡으로 초대 링크·결과 보내기는 카카오 SDK가 필요해서 이 용도로만 사용
- 카카오 디벨로퍼스 앱 등록 + 서비스 도메인 등록 필요

## 4. 경기 일정 (선택) · `lib/sports.ts`, `GET /api/sports/schedule?date=YYYY-MM-DD`
- KBO: `POST https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList` (form `leId=1&srId=0,1,3,4,5,6,7,8,9&date=YYYYMMDD`, `X-Requested-With`·`Referer` 헤더 필요) — k-skill kbo-results 와 같은 소스
- K리그: `POST https://www.kleague.com/getScheduleList.do` (JSON `{leagueId, year, month}`, `Accept-Language: ko` 없으면 영문 팀명) — k-skill kleague-results 와 같은 소스
- 종료 시간은 제공되지 않음 → 평균 경기 시간(KBO 190분, K리그 115분)으로 추정, 사용자가 수정
- 11~12월은 비시즌이라 공모전 기간엔 보조 기능

## 5. 지하철 (선택)
- k-skill 서울 지하철은 **실시간 도착 정보만** 있어 소요 시간 계산에 못 씀
- 실제 소요 시간은 경로 API(예: ODsay, 키 필요)로 교체 예정. 지금은 직선거리 어림값 (`lib/midpoint.ts`)

## 6. LLM · Anthropic Messages API · `lib/llm.ts`
- 서버에서만 호출, 후보 3곳 + 잇플 필드 + 상황·못 먹는 거만 입력 (전화·좌표·링크는 안 넘김)
- 모델 `claude-haiku-5-5` (`LLM_MODEL`로 변경), effort `low`, JSON 스키마 출력, 거절·실패 시 규칙 문장으로 대체
- 같은 후보·상황은 하루 캐시, 모임은 만들 때 1회 호출 후 `candidates.ai_reason`에 저장
- 키가 없거나 실패하면 같은 필드로 만든 규칙 문장(`ruleReason`)으로 대체

## 7. Supabase · `lib/groups.ts`, `lib/db.ts`
- 모임·참여자·후보·투표. 서버가 `SUPABASE_DB_URL`(Transaction pooler, 포트 6543)로 Postgres에 직접 접속 (`pg`)
- 브라우저는 DB에 직접 못 붙음: anon 키를 쓰지 않고, 테이블은 RLS만 켜 둠 (정책 없음)
- 모임 만들기·장소 바꾸기는 트랜잭션으로 한 번에 저장, 모임 조회는 쿼리 1번
- 투표 시작: 절반(2명이면 둘 다) 차면 자동. **중간에서 만나요**는 자동으로 열지 않고 방장이 중간역을 정한 뒤 직접 시작
- API: `POST /api/groups` · `GET /api/groups/[id]?token=` · `POST /api/groups/[id]/join|vote|confirm|place`
- 참여자는 브라우저별 익명 토큰(localStorage)으로 구분, 화면은 4초마다 새로고침

## 8. GA4
- 이벤트: eatpl_click, create_group, join_group, vote, share_link

## 9. 열차 (선택) · `lib/trains.ts`, `GET /api/trains/lookup?type=KTX&no=101&date=`
- 여행 화면 "예매한 열차로 채우기": 열차 종류 + 열차번호 + 날짜 → 도착역·도착 시간 자동 입력
- **선택 기능**: 연동이 없거나 실패해도 도착역·시간을 직접 입력해서 넘어갈 수 있어야 함
- 지금은 데모 값. 실제 조회 소스 확정 후 `lookupTrain()`만 교체
- 예매 내역 직접 연동(코레일·SR 로그인)은 일반 사용자 서비스에 못 붙이므로 열차번호 조회 방식 전제
