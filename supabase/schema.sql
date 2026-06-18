-- ============================================================
-- Ajrly OS — Supabase / Postgres schema
-- Run this FIRST (before policies.sql and seed.sql) in the
-- Supabase SQL editor. Safe to re-run (idempotent where possible).
--
-- Tables: profiles, tasks, content_posts, owners
-- Mirrors the data shapes used by the front-end (assets/js/data.js).
-- ============================================================

-- gen_random_uuid() lives in pgcrypto (enabled by default on Supabase,
-- but enabling here keeps the script portable).
create extension if not exists pgcrypto;

-- ---------- Enums ----------
do $$ begin
  create type app_role as enum ('admin', 'manager', 'member', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('High', 'Medium', 'Low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('pending', 'progress', 'complete', 'overdue', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type owner_stage as enum ('recruitment', 'communication', 'content', 'active');
exception when duplicate_object then null; end $$;

-- ---------- updated_at trigger function ----------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- profiles  (1:1 with auth.users)
-- ============================================================
create table if not exists profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        app_role    not null default 'member',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row whenever a new auth user is created.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- tasks
-- ============================================================
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  priority     task_priority not null default 'Medium',
  status       task_status   not null default 'pending',
  assigned_by  text,
  delegate_to  text,
  due_date     date,
  duration     text,
  date         date,
  notes        text,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists trg_tasks_updated on tasks;
create trigger trg_tasks_updated
  before update on tasks
  for each row execute function set_updated_at();

create index if not exists idx_tasks_status      on tasks (status);
create index if not exists idx_tasks_assigned_by on tasks (assigned_by);
create index if not exists idx_tasks_delegate_to on tasks (delegate_to);
create index if not exists idx_tasks_due_date    on tasks (due_date);
create index if not exists idx_tasks_created_by  on tasks (created_by);

-- ============================================================
-- content_posts
-- ============================================================
create table if not exists content_posts (
  id           uuid primary key default gen_random_uuid(),
  day          text,
  date         date,
  goal         text,
  platform     text[] not null default '{}',
  pillar       text,
  type         text,
  description  text,
  hook         text,
  caption      text,
  time         text,
  budget       text,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists trg_content_updated on content_posts;
create trigger trg_content_updated
  before update on content_posts
  for each row execute function set_updated_at();

create index if not exists idx_content_date       on content_posts (date);
create index if not exists idx_content_pillar     on content_posts (pillar);
create index if not exists idx_content_created_by on content_posts (created_by);

-- ============================================================
-- owners  (property-owner CRM pipeline)
-- ============================================================
create table if not exists owners (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text,
  email         text,
  listings      integer default 0,
  last_contact  date,
  stage         owner_stage not null default 'recruitment',
  notes         text,
  status        text,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_owners_updated on owners;
create trigger trg_owners_updated
  before update on owners
  for each row execute function set_updated_at();

create index if not exists idx_owners_stage      on owners (stage);
create index if not exists idx_owners_created_by on owners (created_by);
