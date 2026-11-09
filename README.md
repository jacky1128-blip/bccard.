# [서비스명] · 결제 데이터로 같이 정하는 한 끼

BC카드 eat.pl(잇플) AI 서비스 수익화 챌린지 참가작.

## 시작하기
1. `npx create-next-app@latest babplan --ts --tailwind --app --src-dir=false --eslint`
2. 이 폴더의 `app/`, `components/`, `lib/`, `types/`, `supabase/`, `docs/`, `.env.example`을 새 프로젝트에 덮어쓰기
3. `npm i @supabase/supabase-js @anthropic-ai/sdk`
4. `.env.example`을 `.env.local`로 복사하고 값 채우기
5. Supabase SQL Editor에서 `supabase/migrations/0001_init.sql` 실행
6. `npm run dev`

## 구조 요약
- `app/` 화면(페이지)과 백엔드(API 라우트)를 같이 둔 Next.js App Router
- `lib/` 외부 API 호출, 추천 규칙, AI, DB 연결
- `supabase/` DB 스키마
- `docs/API.md` 불러오는 API 목록

## 꼭 지킬 것
- 잇플 호출은 **서버(API 라우트)에서만**, k-skill 프록시 경유
- `merUrl`(잇플 상세 링크)은 **응답값 그대로** 사용, 수정 금지
- 잇플 링크에 `rel="noreferrer"` 금지, 새 탭으로 열기
- 모든 결과에 `eat.pl 잇플 · BC카드 결제 데이터 기반` 출처 표시
- AI 추천 이유는 잇플 응답 필드로만 작성
