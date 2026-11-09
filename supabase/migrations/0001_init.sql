-- 모임
create table groups (
  id text primary key,                 -- 짧은 공유용 ID
  mode text not null,                  -- 'meal' | 'party' | 'event' | 'travel'
  title text not null,
  place_text text not null,            -- 잇플 location 파라미터로 쓰는 주소/지역
  place_lat double precision,
  place_lng double precision,
  meet_at timestamptz,
  headcount int not null check (headcount >= 2),
  vote_deadline timestamptz,
  status text not null default 'waiting', -- waiting | voting | confirmed
  confirmed_mer_key text,
  created_at timestamptz default now()
);

-- 참여자 (가입 없이, 브라우저별 익명 토큰)
create table participants (
  id uuid primary key default gen_random_uuid(),
  group_id text references groups(id) on delete cascade,
  anon_token text not null,
  nickname text,
  is_host boolean default false,
  cant_eat text[] default '{}',        -- 매운 거, 해산물, 술 등
  joined_at timestamptz default now(),
  unique (group_id, anon_token)
);

-- 후보 가게 (잇플 응답 스냅샷 + AI 이유)
create table candidates (
  id uuid primary key default gen_random_uuid(),
  group_id text references groups(id) on delete cascade,
  mer_key text not null,               -- 가맹점 식별용 (가맹점명+주소 해시 등)
  rank int not null,
  eatpl jsonb not null,                -- 잇플 응답 원본 한 건 (merUrl 포함, 수정 금지)
  ai_reason text,
  unique (group_id, mer_key)
);

-- 투표
create table votes (
  group_id text references groups(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  mer_key text not null,
  voted_at timestamptz default now(),
  primary key (group_id, participant_id)
);

-- 잇플 응답 캐시 (같은 조건 반복 호출 줄이기)
create table eatpl_cache (
  cache_key text primary key,          -- location|업종 등
  payload jsonb not null,
  fetched_at timestamptz default now()
);
