create extension if not exists "pgcrypto";

do
$$
begin
  if not exists (select 1 from pg_type where typname = 'session_state') then
    create type session_state as enum ('lobby', 'racing', 'finished', 'closed');
  end if;
end
$$;

create table if not exists public.shelters (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  share_code text not null,
  external_id text,
  sequence_no integer,
  name_en text,
  name_jp text,
  address text,
  address_en text,
  address_jp text,
  category text,
  category_jp text,
  flood_depth_rank integer,
  flood_depth text,
  storm_surge_depth_rank integer,
  storm_surge_depth text,
  flood_duration_rank integer,
  flood_duration text,
  inland_waters_depth_rank integer,
  inland_waters_depth text,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now(),
  unique (code),
  unique (share_code)
);

create index if not exists shelters_category_idx on public.shelters (category);
create index if not exists shelters_lat_idx on public.shelters (latitude);
create index if not exists shelters_lng_idx on public.shelters (longitude);

alter table if exists public.shelters
  add column if not exists share_code text,
  add column if not exists code text,
  add column if not exists external_id text,
  add column if not exists sequence_no integer,
  add column if not exists name_en text,
  add column if not exists name_jp text,
  add column if not exists address text,
  add column if not exists address_en text,
  add column if not exists address_jp text,
  add column if not exists category text,
  add column if not exists category_jp text,
  add column if not exists flood_depth_rank integer,
  add column if not exists flood_depth text,
  add column if not exists storm_surge_depth_rank integer,
  add column if not exists storm_surge_depth text,
  add column if not exists flood_duration_rank integer,
  add column if not exists flood_duration text,
  add column if not exists inland_waters_depth_rank integer,
  add column if not exists inland_waters_depth text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists created_at timestamptz default now();

create index if not exists shelters_share_code_idx on public.shelters (share_code);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references public.shelters(id) on delete restrict,
  shelter_code text not null,
  host_id uuid not null,
  state session_state not null default 'lobby',
  max_players integer not null default 8,
  expires_at timestamptz not null,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table if exists public.sessions
  add column if not exists shelter_id uuid,
  add column if not exists shelter_code text,
  add column if not exists host_id uuid,
  add column if not exists state session_state default 'lobby',
  add column if not exists max_players integer default 8,
  add column if not exists expires_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists created_at timestamptz default now();

do
$$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_shelter_fk'
      and conrelid = 'public.sessions'::regclass
  ) then
    alter table public.sessions
      add constraint sessions_shelter_fk foreign key (shelter_id)
        references public.shelters(id) on delete restrict;
  end if;
end
$$;

create index if not exists sessions_shelter_code_idx on public.sessions (shelter_code);
create index if not exists sessions_state_idx on public.sessions (state);
create index if not exists sessions_expires_idx on public.sessions (expires_at);
create unique index if not exists sessions_active_unique
  on public.sessions (shelter_id)
  where state in ('lobby', 'racing');

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null,
  display_name text,
  ready boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  constraint players_unique_member unique (session_id, user_id)
);

create index if not exists players_session_idx on public.players (session_id);
