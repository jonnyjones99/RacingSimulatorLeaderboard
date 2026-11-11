-- Racing leaderboard schema. Paste into Supabase: SQL Editor > New query > Run.
-- Safe to run more than once.

create table if not exists public.laps (
  id uuid primary key default gen_random_uuid(),
  driver_name text not null check (char_length(driver_name) between 1 and 40),
  time_ms integer not null check (time_ms > 0 and time_ms < 3600000),
  created_at timestamptz not null default now()
);

-- Single row describing what the big screen shows.
create table if not exists public.screen_state (
  id integer primary key default 1 check (id = 1),
  scene text not null default 'board' check (scene in ('board', 'podium', 'h2h')),
  on_track text,
  h2h_a text,
  h2h_b text,
  updated_at timestamptz not null default now()
);

insert into public.screen_state (id) values (1) on conflict (id) do nothing;

-- Access model: the site's public key can only READ. Every write goes through a
-- function below that checks the operator passphrase first, so a bot holding the
-- public key cannot add, change or delete anything.
alter table public.laps enable row level security;
alter table public.screen_state enable row level security;

drop policy if exists "event open access" on public.laps;
drop policy if exists "event open access" on public.screen_state;
drop policy if exists "public read" on public.laps;
drop policy if exists "public read" on public.screen_state;
create policy "public read" on public.laps for select to anon, authenticated using (true);
create policy "public read" on public.screen_state for select to anon, authenticated using (true);

-- Holds a hash of the operator passphrase. Row-level security with no policy
-- means the public key cannot read it. Set it with the snippet in README.md.
-- With no row here every write is refused.
create table if not exists public.operator_secret (
  id integer primary key default 1 check (id = 1),
  pin_hash text not null
);
alter table public.operator_secret enable row level security;

create or replace function public.check_operator_pin(p_pin text) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.operator_secret
    where id = 1 and pin_hash = encode(sha256(convert_to(coalesce(p_pin, ''), 'UTF8')), 'hex')
  );
$$;

create or replace function public.add_lap(p_pin text, p_driver_name text, p_time_ms integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.check_operator_pin(p_pin) then raise exception 'Wrong operator passphrase'; end if;
  insert into public.laps (driver_name, time_ms) values (p_driver_name, p_time_ms);
end $$;

create or replace function public.delete_lap(p_pin text, p_lap_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.check_operator_pin(p_pin) then raise exception 'Wrong operator passphrase'; end if;
  delete from public.laps where id = p_lap_id;
end $$;

-- p_patch holds only the fields to change; a key present with null clears that field.
create or replace function public.set_screen(p_pin text, p_patch jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.check_operator_pin(p_pin) then raise exception 'Wrong operator passphrase'; end if;
  update public.screen_state set
    scene = coalesce(p_patch ->> 'scene', scene),
    on_track = case when p_patch ? 'on_track' then left(p_patch ->> 'on_track', 40) else on_track end,
    h2h_a = case when p_patch ? 'h2h_a' then left(p_patch ->> 'h2h_a', 40) else h2h_a end,
    h2h_b = case when p_patch ? 'h2h_b' then left(p_patch ->> 'h2h_b', 40) else h2h_b end,
    updated_at = now()
  where id = 1;
end $$;

grant execute on function public.check_operator_pin(text), public.add_lap(text, text, integer),
  public.delete_lap(text, uuid), public.set_screen(text, jsonb) to anon, authenticated;

-- Push changes to connected screens.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'laps') then
    alter publication supabase_realtime add table public.laps;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'screen_state') then
    alter publication supabase_realtime add table public.screen_state;
  end if;
end $$;
