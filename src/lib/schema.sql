-- ============================================================
--  AquaRho Solutions — Supabase database schema
--  Run this in the Supabase SQL editor (Project → SQL Editor)
-- ============================================================

-- ── 1. profiles ──────────────────────────────────────────────
-- One row per auth.users entry.
-- Created automatically via a trigger on user sign-up.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '',
  role       text not null default 'user' check (role in ('admin','user')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. sites ─────────────────────────────────────────────────
-- One row per monitored water source per user.
create table if not exists public.sites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  type       text not null,
  sample     jsonb not null default '{}',
  date       text not null,            -- ISO date string YYYY-MM-DD
  flow       numeric,
  lat        numeric,
  lng        numeric,
  is_demo    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sites enable row level security;

create policy "Users manage their own sites"
  on public.sites for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sites_updated_at on public.sites;
create trigger sites_updated_at
  before update on public.sites
  for each row execute procedure public.set_updated_at();

-- ── 3. user_settings ─────────────────────────────────────────
-- Stores the water-balance and demand configs (one row per user).
create table if not exists public.user_settings (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  water_balance jsonb not null default '{}',
  demand        jsonb not null default '{}',
  updated_at    timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users manage their own settings"
  on public.user_settings for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists settings_updated_at on public.user_settings;
create trigger settings_updated_at
  before update on public.user_settings
  for each row execute procedure public.set_updated_at();
