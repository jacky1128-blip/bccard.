# 밥콕 · 결제로 고른 한 끼

<img src="app/icon.svg" width="56" alt="밥콕 로고">

BC카드 eat.pl(잇플) AI 서비스 수익화 챌린지 참가작.

## 시작하기
1. `npm install`
2. `npm run dev` → http://localhost:3000
   - **키 없이도** 잇플 실데이터·장소 검색·지도 핀·추천 규칙·경기 일정까지 동작 (k-skill 프록시 경유)
3. 기능을 더 켜려면 `.env.local`에 키 입력 후 서버 재시작 (`.env.example` 참고, 무엇이 켜지는지는 `docs/TODO.md` 1-1)
   - Supabase(`SUPABASE_DB_URL`): 모임 저장 · Anthropic: AI 추천 이유 · 네이버: 실제 지도 · 카카오: 카카오톡 공유 · GA4: 이벤트 수집
4. 새 Supabase 프로젝트를 쓰면 SQL Editor에서 `supabase/migrations/0001_init.sql` 실행 (지금 팀 프로젝트는 2026-11-09에 실행 완료)

## 구조 요약
- `app/` 화면(페이지)과 백엔드(API 라우트)를 같이 둔 Next.js App Router
- `lib/` 외부 API 호출(`eatpl`, `places`, `sports`), 좌표 변환(`geo`), 추천 규칙(`recommend`), 화면용 목록(`stores`), AI(`llm`), 모임 DB(`groups`)
- `supabase/` DB 스키마 · DB 접속은 `lib/db.ts` (Postgres 직접 연결, 서버 전용)
- `docs/API.md` 불러오는 API 목록

## 꼭 지킬 것
- 잇플 호출은 **서버(API 라우트)에서만**, k-skill 프록시 경유
- `merUrl`(잇플 상세 링크)은 **응답값 그대로** 사용, 수정 금지
- 잇플 링크에 `rel="noreferrer"` 금지, 새 탭으로 열기
- 모든 결과에 `eat.pl 잇플 · BC카드 결제 데이터 기반` 출처 표시
- AI 추천 이유는 잇플 응답 필드로만 작성
