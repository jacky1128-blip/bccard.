-- 밥플랜 DB 스키마 (Supabase SQL Editor 에서 한 번 실행)
-- 모든 읽기·쓰기는 서버(lib/db.ts)가 SUPABASE_DB_URL 로 직접 접속해서 함. 브라우저(anon 키)는 직접 못 읽게 RLS만 켜 둠

-- 모임
create table if not exists groups (
  id text primary key,                 -- 짧은 공유용 ID (6자)
  mode text not null,                  -- 'meal' | 'party' | 'event' | 'travel'
  title text not null,
  place_text text not null,            -- 화면에 보이는 장소 이름 (강남역)
  place_region text,                   -- 잇플 location 파라미터로 쓴 지역 (서울 강남구 역삼동)
  place_lat double precision,
  place_lng double precision,
  meet_date date,                      -- 만나는 날 (한국 날짜)
  meet_time text,                      -- 'HH:MM'
  when_label text,                     -- 표시용 "11/14(금) 19:00"
  memo text,
  mid boolean not null default false,  -- 중간에서 만나요 (참여자가 출발역을 넣음)
  headcount int not null check (headcount >= 2 and headcount <= 12),
  vote_deadline timestamptz,
  status text not null default 'waiting', -- waiting | voting | confirmed
  confirmed_mer_key text,
  created_at timestamptz default now()
);

-- 참여자 (가입 없이, 브라우저별 익명 토큰)
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  group_id text references groups(id) on delete cascade,
  anon_token text not null,
  nickname text,
  is_host boolean default false,
  cant_eat text[] default '{}',        -- 매운 거, 해산물, 술 못 마심
  origin text,                         -- 출발역 (중간에서 만나요)
  joined_at timestamptz default now(),
  unique (group_id, anon_token)
);

-- 후보 가게 (잇플 응답 스냅샷 + 추천 이유)
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  group_id text references groups(id) on delete cascade,
  mer_key text not null,               -- 가맹점 식별 (merUrl)
  rank int not null,
  eatpl jsonb not null,                -- 잇플 응답 원본 한 건 (merUrl 포함, 수정 금지)
  ai_reason text,
  reason_by text,                      -- 'ai' | 'rule'
  unique (group_id, mer_key)
);

-- 투표 (한 사람 한 표, 바꾸면 덮어씀)
create table if not exists votes (
  group_id text references groups(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  mer_key text not null,
  voted_at timestamptz default now(),
  primary key (group_id, participant_id)
);

-- 잇플 응답 캐시 (지금은 Next.js 'use cache' 로 캐시 중 · 여러 서버로 늘리면 사용)
create table if not exists eatpl_cache (
  cache_key text primary key,          -- location|업종 등
  payload jsonb not null,
  fetched_at timestamptz default now()
);

create index if not exists participants_group_idx on participants (group_id);
create index if not exists candidates_group_idx on candidates (group_id);
create index if not exists votes_group_idx on votes (group_id);

-- 브라우저에서 anon 키로 직접 접근 못 하게 (정책 없이 RLS만 켜면 service_role 만 접근 가능)
alter table groups enable row level security;
alter table participants enable row level security;
alter table candidates enable row level security;
alter table votes enable row level security;
alter table eatpl_cache enable row level security;
