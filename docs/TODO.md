# 앞으로 할 일

마지막 정리: 2026-11-09 (Supabase 연결 · 모임 실제 DB 테스트 후)

## 지금 상태 한눈에

- **잇플 데이터**: 실제 호출 연결 완료. 키 없이 동작 (k-skill 프록시). 첫 화면·순위·AI 추천·경기 후·여행·모임 후보 모두 실데이터
- **장소 → 좌표**: 키 없이 동작 (k-skill 카카오 키워드 검색). 네이버 지역 검색은 쓰지 않기로 함 (1-1 참고)
- **지도 핀·도보 거리**: 잇플 응답의 TM128 좌표를 위경도로 변환해서 계산 (카카오 좌표와 평균 8m 차이 확인). 네이버 지도 키가 없어도 자리표시 지도에 실제 상대 위치로 핀이 찍힘
- **추천 규칙**: 영업 예상 시간 · 혼잡 시간대 · 휴무 요일 · 못 먹는 거(업종 기준) · 도보 거리 · 상황별 가산점으로 상위 3곳
- **추천 이유**: Anthropic 키가 있으면 AI(`claude-opus-5-5`)가 잇플 필드만 근거로 작성, 없으면 같은 필드로 만든 규칙 문장 (화면에 "AI 추천 이유" / "추천 이유"로 구분 표시)
- **모임 저장**: Supabase 연결 완료 (2026-11-09). 만들기 → 다른 브라우저에서 참여 → 투표 → 방장 확정, 중간에서 만나요 장소 바꾸기까지 실제 DB로 확인. `SUPABASE_DB_URL`이 없으면 화면 데모로 동작
- **경기 일정**: KBO·K리그 공식 데이터로 날짜별 일정 자동 불러오기 (키 없음)
- **카카오톡 공유·GA4**: 코드 완성, 키를 넣으면 켜짐
- **공개 링크**: Cloudflare 임시 링크 (노트북·서버가 켜져 있을 때만 열림)

---

## 1. 직접 해야 하는 것

### 1-1. 키 발급 → `.env.local`에 입력 ★ 가장 먼저

`.env.local` 파일은 만들어 두었음. 키 값은 채팅·깃허브에 올리지 말고 이 파일에만 넣기 (`.gitignore`로 제외됨)

| 상태 | 무엇 | 어디서 | `.env.local` 변수 | 없으면 |
|---|---|---|---|---|
| ✅ 입력 완료 | Supabase (모임 저장) | supabase.com 대시보드 → 상단 Connect → Transaction pooler (포트 6543) | `SUPABASE_DB_URL` | 모임이 화면 데모로만 동작 |
| ★ 1순위 | Anthropic (AI 추천 이유) | platform.claude.com → API Keys → Create Key (크레딧 필요) | `ANTHROPIC_API_KEY` (`LLM_MODEL` 비워두면 `claude-opus-5-5`) | 규칙으로 만든 추천 이유 |
| 2순위 | 카카오톡 공유 | developers.kakao.com → 애플리케이션 추가 → 앱 키 → JavaScript 키 | `NEXT_PUBLIC_KAKAO_JS_KEY` | 카카오톡 버튼이 링크 복사로 동작 |
| 3순위 | GA4 | analytics.google.com → 측정 시작 → 속성(대한민국·KRW) → 웹 스트림 → 측정 ID `G-…` | `NEXT_PUBLIC_GA_ID` | 이벤트 수집 안 함 |
| 선택 | 네이버 지도 + 지오코딩 | console.ncloud.com → Maps → Application 등록 (Dynamic Map, Geocoding 선택). NCP 가입 필요 | `NEXT_PUBLIC_NAVER_MAP_KEY_ID`·`NAVER_MAP_KEY_ID`(같은 Client ID), `NAVER_MAP_KEY`(Client Secret) | 자리표시 지도 (핀 위치는 실제 상대 위치) |
| ✕ 쓰지 않음 | ~~네이버 지역 검색~~ | 개발자센터 신규 신청 중단 (2026-07-30, NCP NAVER API HUB로 이관). 개정 약관(9/7)이 AI 입력·수익화·가공 노출을 금지 | 비워 두기 | 카카오(k-skill)로 장소 해석 (지금 동작 중) |
| 나중 | 서비스 도메인 | 배포 후 (Vercel 등) | `NEXT_PUBLIC_SITE_URL` | sitemap·robots에 주소가 안 들어감 |

- [ ] 카카오 플랫폼 → Web 도메인, 네이버 클라우드 Application → Web 서비스 URL에 `http://localhost:3000`, `http://localhost:3001`, 실제 도메인 등록 (빠지면 인증 오류)
- [ ] 키를 넣은 뒤 **서버 재시작** (`npm run dev` 끄고 다시, 배포본은 `npm run build` 부터)
- 검토 중: 네이버 지도 대신 **카카오맵** (카카오 앱에서 '카카오맵' 사용 설정 → 공유와 같은 JavaScript 키 하나로 지도까지). 바꾸면 `components/MapView.tsx`만 교체

### 1-2. Supabase 테이블 만들기 ✅

- [x] `supabase/migrations/0001_init.sql` 실행 (2026-11-09, 테이블 5개 + RLS)
- [x] 확인: 모임 만들기 → 다른 브라우저로 초대 링크 열기 → 참여 → 투표 → 방장 확정
- [ ] **DB 비밀번호 한 번 재설정**: Supabase → Project Settings → Database → Reset database password → 새 비밀번호로 `.env.local`의 `SUPABASE_DB_URL` 수정
- [ ] 다른 팀원 PC에서도 모임을 쓰려면 `SUPABASE_DB_URL`을 깃허브가 아닌 개인 메시지로 전달
- [ ] Vercel에 배포할 때 환경 변수 `SUPABASE_DB_URL` 도 같이 입력 (NEXT_PUBLIC_ 붙이지 않기)

### 1-3. 정해야 하는 것

- [ ] **서비스 이름**: 지금 `[서비스명]`. 정하면 `components/ui.tsx`의 `SERVICE_NAME` 한 곳만 바꾸면 됨
- [ ] **열차 시간표 소스**: 여행 화면 "예매한 열차로 채우기"는 아직 데모 시간. 확인한 후보:
  - k-skill `railway-timetable`: 코레일 공개 통합 시간표(XLSX). **KTX만, SRT 없음**, 엑셀 파싱 필요
  - 공공데이터포털 열차 운행 정보: 서비스 키 발급 필요
  - 정하면 `lib/trains.ts`의 `lookupTrain()`만 교체
- [ ] **실제 지하철 소요 시간 (중간에서 만나요)**: 경로 API 키가 필요 (예: ODsay). k-skill 서울 지하철은 실시간 도착 정보만 있어 소요 시간 계산에 못 씀. 지금은 직선거리 어림값
- [ ] **상시 공개 링크**: 공모전 제출용이면 Vercel 배포 추천 → Vercel 가입 + GitHub 저장소 연결 + 환경 변수 입력
- [ ] **모임 기본 이름·예시 문구**: `lib/modes.ts`의 `event`(예: `[과] 종강총회`)는 아직 자리표시

---

## 2. 개발 진행 상황

| 순서 | 할 일 | 상태 | 관련 파일 |
|---|---|---|---|
| 1 | 잇플 실제 호출 + 응답 필드명 확정 | ✅ 완료 (필드표는 `docs/API.md`) | `lib/eatpl.ts`, `types/eatpl.ts`, `lib/view.ts`, `app/api/eatpl/search` |
| 2 | 예시 데이터 → 실제 잇플 데이터로 교체 | ✅ 완료 (실패 시에만 예시 + 안내 문구) | `lib/stores.ts`, 각 `page.tsx` |
| 3 | 장소 검색 연결 | ✅ 키 없이 동작 (카카오). 네이버 지역 검색은 쓰지 않음 | `lib/places.ts`, `app/api/places/resolve` |
| 4 | 가게 주소 → 지도 핀 좌표 | ✅ 완료 (TM128 변환) · 네이버 지도 키 넣으면 실제 지도에 핀 | `lib/geo.ts`, `components/MapView.tsx` |
| 5 | 추천 규칙 | ✅ 완료 | `lib/recommend.ts`, `app/api/recommend` |
| 6 | AI 추천 이유 | ✅ 코드 완료 · 키 넣으면 켜짐 (같은 후보는 하루 캐시) | `lib/llm.ts` |
| 7 | 모임 저장: 만들기·참여·투표·확정 | ✅ 완료 · 실제 DB로 두 브라우저 테스트 | `lib/db.ts`, `lib/groups.ts`, `app/api/groups/**`, `components/GroupRoom.tsx`, `CreateForm.tsx` |
| 8 | 친구가 초대 링크에서 출발역 입력 (중간에서 만나요) | ✅ 완료 · 투표는 방장이 중간역을 정한 뒤 시작 | `components/GroupRoom.tsx`, `app/api/groups/[id]/place` |
| 9 | 카카오톡 공유 | ✅ 코드 완료 · 키 넣으면 켜짐 | `components/ShareButtons.tsx` |
| 10 | GA4 이벤트 5종 | ✅ 코드 완료 · 키 넣으면 켜짐 | `lib/analytics.ts`, `app/layout.tsx` |
| 11 | 열차번호 → 실제 도착역·시간 | ⏸ 1-3 소스 결정 대기 | `lib/trains.ts` |
| 12 | 중간역 계산을 실제 지하철 시간으로 | ⏸ 경로 API 키 필요 (1-3) | `lib/midpoint.ts` |
| 13 | 경기 일정 자동 불러오기 | ✅ 완료 (KBO·K리그1·K리그2, 11~12월은 경기가 거의 없음) | `lib/sports.ts`, `components/EventForm.tsx` |

같이 반영한 것: 첫 화면 "내 위치" 버튼(좌표 → 동네), 순위 화면 다른 동네·역 검색, "근처 다른 역" 실제 역, sitemap·robots, 가게 이름 정리(`(주)`·`주식회사`, "가게명/법인명" → 가게명), 점심·'오늘 밥 한 끼'는 술집을 뒤로, 추천 문장 조사("심야라")

### 2-2. 키 없이 바로 할 수 있는 남은 개발

| 할 일 | 지금 | 관련 파일 |
|---|---|---|
| 투표 마감 자동 종료 | "마감 모임 전날 18:00"이 안내만 되고, 시간이 지나도 투표가 안 닫힘 (`vote_deadline` 칸만 있음) | `lib/groups.ts`, `lib/modes.ts`, `components/GroupRoom.tsx` |
| 친구의 '못 먹는 거' 반영 | 후보는 모임 만들 때 고정. 친구가 고른 못 먹는 거는 중간에서 만나요 장소 바꿀 때만 반영 | `lib/groups.ts` |
| 여행 입력 화면 '업종 전체 ▾' 버튼 | 눌러도 동작 없음 (순위 화면 필터는 정상) | `components/TravelForm.tsx` |
| 네이버 지도 마커 | 키를 넣으면 화면이 바뀔 때마다 마커를 새로 그림 (깜빡임 가능) | `components/MapView.tsx` |
| 공유 미리보기 이미지 (OG) | 카톡·인스타로 링크 보낼 때 이미지 없음 | `app/g/[id]`, `app/layout.tsx` |
| 키 넣은 뒤 확인 | AI 추천 이유 문장, 카카오톡 공유, GA4 이벤트, 네이버 지도는 아직 실제 키로 못 봄 | — |

---

## 3. 남은 한계

- 잇플 검색은 반경이 아니라 **동 단위 주소 텍스트 검색** → 역이 동 경계에 있으면 옆 동 가게는 안 나옴. 도보 거리는 좌표로 따로 계산해서 20분 넘는 곳은 후보에서 뺌
- 못 먹는 거는 **업종 이름**으로만 거름 (메뉴 정보가 없음)
- 영업시간은 최근 1개월 결제 승인 시각으로 추정한 **영업 예상 시간**
- 중간에서 만나요: 수도권 주요 역 44곳만, 시간은 직선거리 어림값
- 열차 조회: 데모 시간
- 투표 마감 시각(`vote_deadline`)은 화면에 안내만 하고, 시간이 지나도 자동으로 닫지는 않음

---

## 4. 꼭 지킬 것 (README 규칙)

- 잇플 호출은 서버(API 라우트·서버 컴포넌트)에서만, k-skill 프록시 경유
- `merUrl`은 응답값 그대로, 새 탭, `rel="noreferrer"` 금지 (`components/EatplLink.tsx`가 처리 중)
- 모든 결과에 `eat.pl 잇플 · BC카드 결제 데이터 기반` 출처 표시
- AI 추천 이유는 잇플 응답 필드로만 작성 (`lib/llm.ts` 시스템 프롬프트에 규칙)
- 네이버 비밀키(`NAVER_MAP_KEY`)·`SUPABASE_DB_URL`·`ANTHROPIC_API_KEY`는 `NEXT_PUBLIC_` 붙이지 않기 (브라우저 노출 금지)

---

## 5. 참고

- 화면 구조·글꼴·버튼 규칙: `components/ui.tsx` (`t` = 글자, `btn` = 버튼 4단계)
- 상황별 문구·기본값: `lib/modes.ts`
- 외부 API 정리: `docs/API.md`
- 와이어프레임: https://claude.ai/artifact/VWfrQFbu952ZKjXgf2Q3Uh
- 임시 공개 링크 다시 열기 (코드 고친 뒤 반영하려면 빌드부터):
  ```bash
  npm run build
  npx next start -p 3001
  cloudflared tunnel --url http://localhost:3001   # 새 주소가 출력됨
  ```
