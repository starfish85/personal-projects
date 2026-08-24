-- 在 Supabase SQL Editor 里整段执行一次。
-- 只存任务、每日完成、日记文字、任务批注。不存图片。

create table if not exists public.rike_meta (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tasks jsonb not null default '[]'::jsonb,
  tasks_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rike_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id text not null,
  date date not null,
  count int not null default 0,
  target int,
  completed_at timestamptz,
  subtasks jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, task_id, date)
);

create table if not exists public.rike_journals (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  text text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.rike_task_notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id text not null,
  text text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

alter table public.rike_meta enable row level security;
alter table public.rike_days enable row level security;
alter table public.rike_journals enable row level security;
alter table public.rike_task_notes enable row level security;

alter table public.rike_days
  add column if not exists subtasks jsonb not null default '{}'::jsonb;

drop policy if exists rike_meta_own on public.rike_meta;
create policy rike_meta_own on public.rike_meta
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists rike_days_own on public.rike_days;
create policy rike_days_own on public.rike_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists rike_journals_own on public.rike_journals;
create policy rike_journals_own on public.rike_journals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists rike_task_notes_own on public.rike_task_notes;
create policy rike_task_notes_own on public.rike_task_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
