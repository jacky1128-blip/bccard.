# 앞으로 할 일

마지막 정리: 2026-11-09

## 지금 상태 한눈에

- **화면(프론트)**: 와이어프레임 기준 전 화면 완성. 모두 **예시 데이터**로 동작
- **백엔드(API·DB·AI)**: 아직 연결 전. 새로고침하면 모임 진행 상태가 처음으로 돌아감
- **키**: `.env.local`에 아직 아무 키도 없음
- **공개 링크**: Cloudflare 임시 링크 (노트북·서버가 켜져 있을 때만 열림)

---

## 1. 직접 해야 하는 것

### 1-1. 키 발급 → `.env.local`에 입력 ★ 가장 먼저

| 우선 | 무엇 | 어디서 | `.env.local` 변수 |
|---|---|---|---|
| ★ | 네이버 지도 + 지오코딩 | 네이버 클라우드 콘솔 → Maps → Application 등록 (Dynamic Map, Geocoding 선택) | `NEXT_PUBLIC_NAVER_MAP_KEY_ID`, `NAVER_MAP_KEY_ID`, `NAVER_MAP_KEY` |
| ★ | 네이버 지역 검색 | developers.naver.com → 애플리케이션 등록 (검색 API) | `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET` |
| ★ | Supabase | supabase.com 프로젝트 생성 → Settings → API | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| ★ | Anthropic (AI 추천 이유) | console.anthropic.com → API Keys | `ANTHROPIC_API_KEY` (`LLM_MODEL`은 비워둬도 됨) |
| 선택 | 카카오톡 공유 버튼 | developers.kakao.com → 앱 → JavaScript 키 | `NEXT_PUBLIC_KAKAO_JS_KEY` |
| 선택 | GA4 | Google Analytics → 측정 ID (G-…) | `NEXT_PUBLIC_GA_ID` |
| 나중 | 서비스 도메인 | 공모전에 등록할 도메인 | `NEXT_PUBLIC_SITE_URL` |

- [ ] 네이버 클라우드 Application의 **Web 서비스 URL**에 `http://localhost:3000`과 실제 도메인 등록 (빠지면 지도 인증 오류)
- [ ] 카카오도 플랫폼 → Web 도메인에 같은 주소 등록
- [ ] 키를 넣은 뒤 **dev 서버 재시작** (`npm run dev` 끄고 다시)
- 키 값은 채팅에 붙여넣지 말고 파일에만 넣기

### 1-2. Supabase 테이블 만들기

- [ ] Supabase 대시보드 → SQL Editor → `supabase/migrations/0001_init.sql` 내용 붙여넣고 실행

### 1-3. 정해야 하는 것

- [ ] **서비스 이름**: 지금 `[서비스명]`. 정하면 `components/ui.tsx`의 `SERVICE_NAME` 한 곳만 바꾸면 됨
- [ ] **열차 시간표 소스**: 여행 화면 "예매한 열차로 채우기"는 지금 데모 시간. 열차번호로 조회할 공개 API(공공데이터포털 열차 운행 정보, k-skill 열차 시간표 등) 결정
- [ ] **상시 공개 링크**: 공모전 제출용이면 Vercel 배포 추천 → Vercel 가입 + GitHub 저장소 연결

---

## 2. 키가 들어오면 이어서 개발할 것

| 순서 | 할 일 | 관련 파일 | 필요한 것 |
|---|---|---|---|
| 1 | 잇플 실제 호출 + 응답 필드명 확정 (가맹점명·주소·업종·동네맛집·회식 적합·혼잡·고객층) | `lib/eatpl.ts`, `types/eatpl.ts`, `lib/view.ts`, `app/api/eatpl/search` | 없음 (프록시 키 불필요) |
| 2 | 예시 데이터 → 실제 잇플 데이터로 교체 | `lib/mock.ts` 쓰는 페이지들 | 1번 |
| 3 | 장소 검색 연결 + 지역 검색 좌표 형식 확인 (mapx/mapy가 위경도 × 10,000,000인지) | `lib/naver.ts`, `app/api/places/resolve` | 네이버 검색 키 |
| 4 | 가게 주소 → 지도 핀 좌표 채우기 | `lib/naver.ts`, `components/MapView.tsx` | 네이버 지도·지오코딩 키 |
| 5 | 추천 규칙 (영업시간·혼잡·못 먹는 거·거리 → 상위 3곳) | `lib/recommend.ts`, `app/api/recommend` | 1번 |
| 6 | AI 추천 이유 (잇플 필드만 근거) | `lib/llm.ts` | Anthropic 키 |
| 7 | 모임 저장: 만들기·참여·투표·확정 | `app/api/groups/**`, `components/GroupRoom.tsx`, `CreateForm.tsx` | Supabase |
| 8 | 친구가 초대 링크에서 자기 출발역 직접 입력 (중간에서 만나요) | `components/MidpointPicker.tsx` | 7번 |
| 9 | 카카오톡 공유 | `components/ShareButtons.tsx` | 카카오 키 |
| 10 | GA4 이벤트 (`eatpl_click`, `create_group`, `join_group`, `vote`, `share_link`) | `lib/analytics.ts`, `app/layout.tsx` | GA ID |
| 11 | 열차번호 → 실제 도착역·시간 | `lib/trains.ts` | 1-3에서 정한 소스 |
| 12 | 중간역 계산을 실제 지하철 시간으로 | `lib/midpoint.ts` | k-skill 지하철 |
| 13 | 경기 일정 자동 불러오기 (KBO·K리그, 시즌 중에만) | `lib/sports.ts`, `components/EventForm.tsx` | 없음 |

---

## 3. 지금 데모라서 생기는 한계

- 가게 이름·순위·태그·AI 이유는 와이어프레임 자리표시자 (`[가게명 A]`, `지역 상위 [N]%`)
- 지도는 키가 없어서 그림 지도, 키를 넣어도 가게 좌표가 없어 핀은 아직 안 뜸 (2-4번)
- "메뉴 보기"는 잇플 링크(`merUrl`)가 없어 눌러도 이동 안 함
- 모임은 화면 상태로만 흉내 → 대기 화면의 "데모: 친구 한 명 들어온 걸로 하기" 버튼은 DB 연결 후 삭제
- 중간에서 만나요: 수도권 주요 역 44곳만, 시간은 직선거리 어림값
- 열차 조회: 데모 시간

---

## 4. 꼭 지킬 것 (README 규칙)

- 잇플 호출은 서버(API 라우트)에서만, k-skill 프록시 경유
- `merUrl`은 응답값 그대로, 새 탭, `rel="noreferrer"` 금지 (`components/EatplLink.tsx`가 처리 중)
- 모든 결과에 `eat.pl 잇플 · BC카드 결제 데이터 기반` 출처 표시
- AI 추천 이유는 잇플 응답 필드로만 작성
- 네이버 비밀키(`NAVER_MAP_KEY`, `NAVER_SEARCH_CLIENT_SECRET`)는 `NEXT_PUBLIC_` 붙이지 않기 (브라우저 노출 금지)

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
