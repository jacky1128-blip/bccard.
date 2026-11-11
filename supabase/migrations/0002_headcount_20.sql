-- 모임 최대 인원 12 → 20 (lib/rules.ts MAX_HEADCOUNT 와 같은 값)
-- 0001_init.sql 의 이름 없는 check 는 Postgres 기본 이름 groups_headcount_check 로 만들어짐
alter table groups drop constraint if exists groups_headcount_check;
alter table groups add constraint groups_headcount_check check (headcount >= 2 and headcount <= 20);
