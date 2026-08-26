-- 在 Supabase SQL Editor 里整段执行一次（可重复执行）。
-- 文字、进度、曲谱/打卡图元数据；图片本体在 Storage bucket `rike`。

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

create table if not exists public.rike_assets (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id text not null,
  role text not null,
  name text not null default '',
  mime text not null default 'image/jpeg',
  width int,
  height int,
  created_at timestamptz,
  updated_at timestamptz not null default now(),
  "order" int not null default 0,
  date date,
  featured boolean not null default false,
  deleted_at timestamptz,
  strokes jsonb,
  primary key (user_id, id)
);

create table if not exists public.rike_push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  tz text not null default 'Asia/Shanghai',
  updated_at timestamptz not null default now()
);

create table if not exists public.rike_remind_sent (
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id text not null,
  date date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, task_id, date)
);

alter table public.rike_days
  add column if not exists subtasks jsonb not null default '{}'::jsonb;

alter table public.rike_meta enable row level security;
alter table public.rike_days enable row level security;
alter table public.rike_journals enable row level security;
alter table public.rike_task_notes enable row level security;
alter table public.rike_assets enable row level security;
alter table public.rike_push_subs enable row level security;
alter table public.rike_remind_sent enable row level security;

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

drop policy if exists rike_assets_own on public.rike_assets;
create policy rike_assets_own on public.rike_assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists rike_push_subs_own on public.rike_push_subs;
create policy rike_push_subs_own on public.rike_push_subs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists rike_remind_sent_own on public.rike_remind_sent;
create policy rike_remind_sent_own on public.rike_remind_sent
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rike',
  'rike',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists rike_storage_own on storage.objects;
create policy rike_storage_own on storage.objects
  for all
  using (
    bucket_id = 'rike'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'rike'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
