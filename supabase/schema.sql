-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- USERS are in auth.users. Keep light profile info here.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- ROOM / LOBBY
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                   -- 6–8 char join code
  owner_id uuid not null references auth.users(id),
  name text not null,
  is_private boolean default true,
  created_at timestamptz default now()
);

create index on public.rooms (code);

-- MEMBERSHIP
create table public.room_members (
  room_id uuid references public.rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('host','player','viewer')) default 'player',
  joined_at timestamptz default now(),
  primary key (room_id, user_id)
);

-- UPLOADS (files live in Supabase Storage; we persist metadata + parse status)
create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  storage_path text not null,                 -- e.g. bucket/key.pdf
  title text,
  mime_type text,
  parse_status text check (parse_status in ('pending','ready','failed')) default 'pending',
  text_hash text,                             -- for dedupe/caching
  extracted_text text,                        -- processed text content
  created_at timestamptz default now()
);

-- "Unit" selection for the session (topic/subset of content)
create table public.units (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  label text not null,                        -- e.g., "Chapter 3 – Kinematics"
  criteria jsonb not null,                    -- { pages:[1,8], keywords:["velocity"], level:"medium" }
  created_at timestamptz default now()
);

-- Quiz session lifecycle
create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  unit_id uuid references public.units(id),
  status text check (status in ('pending','generating','active','complete')) default 'pending',
  total_questions int default 0,
  started_at timestamptz,
  ended_at timestamptz,
  winner_user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Generated question bank (durable, so late joiners can catch up)
create table public.quiz_questions (
  id bigserial primary key,
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  idx int not null,                           -- 0..N-1 sequence within session
  type text check (type in ('mcq','short','truefalse')) not null,
  prompt text not null,
  options text[],                             -- for MCQ
  answer text not null,                       -- canonical answer (server trusted)
  meta jsonb default '{}'::jsonb,             -- difficulty, source upload id, etc.
  created_at timestamptz default now()
);

create unique index on public.quiz_questions (session_id, idx);

-- Authoritative answers & scoring
create table public.quiz_answers (
  id bigserial primary key,
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  question_id bigint not null references public.quiz_questions(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  submitted_at timestamptz default now(),
  submission text not null,
  is_correct boolean,
  score_delta int default 0,
  constraint uniq_answer_per_q unique (question_id, user_id)
);

-- Lightweight progress for durable resumes & leaderboard
create table public.player_progress (
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  correct_count int default 0,
  total_answered int default 0,
  last_idx int default -1,                    -- last question index seen/answered
  primary key (session_id, user_id)
);

-- Optional: append-only audit/event log for replay/debug
create table public.session_events (
  id bigserial primary key,
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  ts timestamptz default now(),
  type text not null,                         -- 'start','reveal','answer','score','complete','cheat_detected'
  payload jsonb not null
);

-- Cheat detection event payload structure:
-- type: 'cheat_detected'
-- payload: {
--   user_id: uuid,
--   display_name: text,
--   violation_type: 'tab_switch' | 'window_blur' | 'visibility_change',
--   duration_seconds: integer,
--   timestamp: timestamptz
-- }

-- Indexes for performance
create index on quiz_answers (session_id);
create index on quiz_answers (question_id);
create index on quiz_questions (session_id);
create index on player_progress (session_id);
create index on uploads (room_id);
create index on room_members (room_id);
create index on room_members (user_id);

-- RLS (Row Level Security) Policies
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.uploads enable row level security;
alter table public.units enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.player_progress enable row level security;
alter table public.session_events enable row level security;

-- Helper: is the caller a member of the room?
create or replace function public.is_room_member(_room uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.room_members
    where room_id = _room and user_id = auth.uid()
  );
$$;

-- Helper: is the caller the owner of the room?
create or replace function public.is_room_owner(_room uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.rooms
    where id = _room and owner_id = auth.uid()
  );
$$;

-- Profiles policies
create policy "Users can view all profiles"
on public.profiles for select
using (true);

create policy "Users can update own profile"
on public.profiles for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can insert own profile"
on public.profiles for insert
with check (user_id = auth.uid());

-- Rooms policies
create policy "Room select"
on public.rooms for select
using (public.is_room_member(id));

create policy "Room insert"
on public.rooms for insert
with check (owner_id = auth.uid());

create policy "Room update"
on public.rooms for update
using (public.is_room_owner(id))
with check (public.is_room_owner(id));

-- Room members policies
create policy "Member select"
on public.room_members for select
using (public.is_room_member(room_id));

create policy "Member insert"
on public.room_members for insert
with check (public.is_room_member(room_id) or public.is_room_owner(room_id));

create policy "Member delete"
on public.room_members for delete
using (user_id = auth.uid() or public.is_room_owner(room_id));

-- Uploads policies
create policy "Upload select"
on public.uploads for select
using (public.is_room_member(room_id));

create policy "Upload insert"
on public.uploads for insert
with check (public.is_room_member(room_id));

create policy "Upload update"
on public.uploads for update
using (public.is_room_member(room_id))
with check (public.is_room_member(room_id));

-- Units policies
create policy "Unit select"
on public.units for select
using (public.is_room_member(room_id));

create policy "Unit insert"
on public.units for insert
with check (public.is_room_member(room_id));

create policy "Unit update"
on public.units for update
using (public.is_room_member(room_id))
with check (public.is_room_member(room_id));

-- Quiz sessions policies
create policy "Session select"
on public.quiz_sessions for select
using (public.is_room_member(room_id));

create policy "Session insert"
on public.quiz_sessions for insert
with check (public.is_room_member(room_id));

create policy "Session update"
on public.quiz_sessions for update
using (public.is_room_member(room_id))
with check (public.is_room_member(room_id));

-- Quiz questions policies
create policy "Question select"
on public.quiz_questions for select
using (exists (
  select 1 from public.quiz_sessions
  where id = session_id and public.is_room_member(room_id)
));

create policy "Question insert"
on public.quiz_questions for insert
with check (exists (
  select 1 from public.quiz_sessions
  where id = session_id and public.is_room_member(room_id)
));

-- Quiz answers policies
create policy "Answer select"
on public.quiz_answers for select
using (exists (
  select 1 from public.quiz_sessions
  where id = session_id and public.is_room_member(room_id)
));

create policy "Answer insert"
on public.quiz_answers for insert
with check (user_id = auth.uid() and exists (
  select 1 from public.quiz_sessions
  where id = session_id and public.is_room_member(room_id)
));

-- Player progress policies
create policy "Progress select"
on public.player_progress for select
using (exists (
  select 1 from public.quiz_sessions
  where id = session_id and public.is_room_member(room_id)
));

create policy "Progress upsert"
on public.player_progress for all
using (exists (
  select 1 from public.quiz_sessions
  where id = session_id and public.is_room_member(room_id)
))
with check (exists (
  select 1 from public.quiz_sessions
  where id = session_id and public.is_room_member(room_id)
));

-- Session events policies
create policy "Event select"
on public.session_events for select
using (exists (
  select 1 from public.quiz_sessions
  where id = session_id and public.is_room_member(room_id)
));

create policy "Event insert"
on public.session_events for insert
with check (exists (
  select 1 from public.quiz_sessions
  where id = session_id and public.is_room_member(room_id)
));
