-- CheckPoint — initial schema
-- Every user-owned table carries user_id, is protected by RLS and uses composite
-- foreign keys (id, user_id) so a row can never reference another user's data.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
create type public.priority_level as enum ('low', 'medium', 'high', 'urgent');
create type public.project_status as enum ('active', 'paused', 'completed', 'archived');
create type public.goal_type as enum ('weekly', 'monthly', 'annual', 'custom');
create type public.goal_status as enum ('not_started', 'in_progress', 'achieved', 'abandoned');
create type public.goal_progress_mode as enum ('target', 'milestones');
create type public.task_status as enum ('pending', 'completed', 'missed');
create type public.milestone_status as enum ('pending', 'completed');
create type public.notification_type as enum ('info', 'success', 'warning', 'reminder');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  email text,
  avatar_url text,
  timezone text not null default 'Europe/Paris',
  week_starts_on smallint not null default 1 check (week_starts_on in (0, 1, 6)),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  focus_areas text[] not null default '{}',
  preferences jsonb not null default '{"notifications":{"goal_achieved":true,"deadlines":true,"daily_reminder":true}}'::jsonb,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text check (char_length(description) <= 2000),
  color text not null default '#3978F6' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null default 'folder' check (char_length(icon) <= 40),
  start_date date,
  target_date date,
  status public.project_status not null default 'active',
  priority public.priority_level not null default 'medium',
  is_demo boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_dates_valid check (target_date is null or start_date is null or target_date >= start_date),
  constraint projects_id_user_unique unique (id, user_id)
);

create unique index projects_user_name_unique on public.projects (user_id, lower(name));
create index projects_user_status_idx on public.projects (user_id, status);

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- goals (objectives)
-- ---------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  project_id uuid,
  title text not null check (char_length(trim(title)) between 1 and 140),
  description text check (char_length(description) <= 2000),
  goal_type public.goal_type not null default 'monthly',
  progress_mode public.goal_progress_mode not null default 'target',
  unit text check (char_length(unit) <= 30),
  target_value numeric(12, 2) not null default 100 check (target_value > 0),
  current_value numeric(12, 2) not null default 0 check (current_value >= 0),
  start_date date not null default current_date,
  target_date date not null,
  status public.goal_status not null default 'not_started',
  priority public.priority_level not null default 'medium',
  achieved_at timestamptz,
  is_demo boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_dates_valid check (target_date >= start_date),
  constraint goals_id_user_unique unique (id, user_id),
  constraint goals_project_fk foreign key (project_id, user_id)
    references public.projects (id, user_id) on delete set null (project_id)
);

create index goals_user_status_idx on public.goals (user_id, status);
create index goals_project_idx on public.goals (project_id);

create trigger goals_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

-- Keep achieved_at coherent with the status. A goal is only achieved when the
-- user (or its measurable progress) says so — never because a deadline passed.
create or replace function public.goals_sync_achieved_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'achieved' and (tg_op = 'INSERT' or old.status is distinct from 'achieved') then
    new.achieved_at = coalesce(new.achieved_at, now());
  elsif new.status <> 'achieved' then
    new.achieved_at = null;
  end if;
  return new;
end;
$$;

create trigger goals_achieved_at before insert or update of status on public.goals
  for each row execute function public.goals_sync_achieved_at();

-- ---------------------------------------------------------------------------
-- milestones
-- ---------------------------------------------------------------------------
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  goal_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 140),
  description text check (char_length(description) <= 1000),
  target_date date,
  completed_at timestamptz,
  status public.milestone_status not null default 'pending',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint milestones_goal_fk foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete cascade
);

create index milestones_goal_idx on public.milestones (goal_id, position);

create trigger milestones_updated_at before update on public.milestones
  for each row execute function public.set_updated_at();

create or replace function public.milestones_sync_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' then
    new.completed_at = coalesce(new.completed_at, now());
  else
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger milestones_completed_at before insert or update of status on public.milestones
  for each row execute function public.milestones_sync_completed_at();

-- ---------------------------------------------------------------------------
-- tasks (daily accomplishments)
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  project_id uuid,
  goal_id uuid,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text check (char_length(description) <= 4000),
  notes text check (char_length(notes) <= 4000),
  category text check (char_length(category) <= 40),
  priority public.priority_level not null default 'medium',
  status public.task_status not null default 'pending',
  scheduled_date date not null default current_date,
  due_date date,
  completed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_project_fk foreign key (project_id, user_id)
    references public.projects (id, user_id) on delete set null (project_id),
  constraint tasks_goal_fk foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete set null (goal_id)
);

create index tasks_user_date_idx on public.tasks (user_id, scheduled_date desc);
create index tasks_user_status_idx on public.tasks (user_id, status);
create index tasks_project_idx on public.tasks (project_id, scheduled_date desc);
create index tasks_goal_idx on public.tasks (goal_id);
create index tasks_title_trgm_idx on public.tasks using gin (title extensions.gin_trgm_ops);

create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

create or replace function public.tasks_sync_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' then
    if tg_op = 'INSERT' or old.status is distinct from 'completed' then
      new.completed_at = coalesce(new.completed_at, now());
    end if;
  else
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger tasks_completed_at before insert or update of status on public.tasks
  for each row execute function public.tasks_sync_completed_at();

-- ---------------------------------------------------------------------------
-- daily_reflections
-- ---------------------------------------------------------------------------
create table public.daily_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reflection_date date not null,
  positive_reflection text check (char_length(positive_reflection) <= 4000),
  missed_accomplishments text check (char_length(missed_accomplishments) <= 4000),
  improvement_notes text check (char_length(improvement_notes) <= 4000),
  mood smallint check (mood between 1 and 5),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_reflections_unique_day unique (user_id, reflection_date)
);

create trigger daily_reflections_updated_at before update on public.daily_reflections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null,
  message text,
  type public.notification_type not null default 'info',
  link text,
  dedupe_key text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
-- NULL dedupe keys never collide, so ad-hoc notifications stay unrestricted.
alter table public.notifications
  add constraint notifications_dedupe_unique unique (user_id, dedupe_key);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.goals enable row level security;
alter table public.milestones enable row level security;
alter table public.tasks enable row level security;
alter table public.daily_reflections enable row level security;
alter table public.notifications enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

do $$
declare
  t text;
begin
  foreach t in array array['projects', 'goals', 'milestones', 'tasks', 'daily_reflections'] loop
    execute format('create policy "%1$s: select own" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s: insert own" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s: update own" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s: delete own" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

-- Notifications are created by the system (triggers / RPC); users can read,
-- mark as read and dismiss their own.
create policy "notifications: select own" on public.notifications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "notifications: update own" on public.notifications
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "notifications: delete own" on public.notifications
  for delete to authenticated using ((select auth.uid()) = user_id);

-- user_id must never be reassigned.
create or replace function public.prevent_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id cannot be changed';
  end if;
  return new;
end;
$$;

create trigger projects_owner before update on public.projects for each row execute function public.prevent_owner_change();
create trigger goals_owner before update on public.goals for each row execute function public.prevent_owner_change();
create trigger milestones_owner before update on public.milestones for each row execute function public.prevent_owner_change();
create trigger tasks_owner before update on public.tasks for each row execute function public.prevent_owner_change();
create trigger reflections_owner before update on public.daily_reflections for each row execute function public.prevent_owner_change();
create trigger notifications_owner before update on public.notifications for each row execute function public.prevent_owner_change();

-- ---------------------------------------------------------------------------
-- New user bootstrap
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.notifications (user_id, title, message, type, dedupe_key)
  values (new.id, 'Bienvenue sur CheckPoint',
          'Ajoutez vos premières tâches du jour pour commencer à mesurer vos progrès.',
          'info', 'welcome');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Event notifications
-- ---------------------------------------------------------------------------
create or replace function public.notify_goal_achieved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'achieved' and old.status is distinct from 'achieved' and not new.is_demo then
    insert into public.notifications (user_id, title, message, type, link, dedupe_key)
    values (new.user_id, 'Objectif atteint 🎯', new.title, 'success',
            '/objectives/' || new.id, 'goal-achieved-' || new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger goals_notify_achieved after update of status on public.goals
  for each row execute function public.notify_goal_achieved();

-- Deadline reminders, generated on demand (idempotent thanks to dedupe_key).
create or replace function public.generate_due_notifications(p_today date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted integer := 0;
  n integer;
begin
  if auth.uid() is null then
    return 0;
  end if;

  insert into public.notifications (user_id, title, message, type, link, dedupe_key)
  select g.user_id,
         'Échéance proche',
         format('« %s » arrive à échéance le %s.', g.title, to_char(g.target_date, 'DD/MM/YYYY')),
         'reminder',
         '/objectives/' || g.id,
         'goal-due-' || g.id || '-' || g.target_date
  from public.goals g
  join public.profiles p on p.id = g.user_id
  where g.user_id = auth.uid()
    and g.archived_at is null
    and g.status in ('not_started', 'in_progress')
    and g.target_date between p_today and p_today + 3
    and coalesce((p.preferences -> 'notifications' ->> 'deadlines')::boolean, true)
  on conflict do nothing;
  get diagnostics n = row_count;
  inserted := inserted + n;

  insert into public.notifications (user_id, title, message, type, link, dedupe_key)
  select t.user_id,
         'Tâche à rendre',
         format('« %s » est due le %s.', t.title, to_char(t.due_date, 'DD/MM/YYYY')),
         'reminder',
         '/tracker?date=' || t.scheduled_date,
         'task-due-' || t.id || '-' || t.due_date
  from public.tasks t
  join public.profiles p on p.id = t.user_id
  where t.user_id = auth.uid()
    and t.status = 'pending'
    and t.due_date between p_today and p_today + 1
    and coalesce((p.preferences -> 'notifications' ->> 'deadlines')::boolean, true)
  on conflict do nothing;
  get diagnostics n = row_count;
  inserted := inserted + n;

  return inserted;
end;
$$;

-- RLS blocks direct inserts into notifications, so the reminder generator needs
-- an insert policy limited to the caller's own rows.
create policy "notifications: insert own" on public.notifications
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Search
-- ---------------------------------------------------------------------------
create or replace function public.search_tasks(p_query text, p_limit integer default 30)
returns setof public.tasks
language sql
stable
security invoker
set search_path = ''
as $$
  select t.*
  from public.tasks t
  left join public.projects p on p.id = t.project_id
  where t.user_id = auth.uid()
    and char_length(trim(p_query)) > 0
    and (
      t.title ilike '%' || p_query || '%'
      or t.description ilike '%' || p_query || '%'
      or t.notes ilike '%' || p_query || '%'
      or p.name ilike '%' || p_query || '%'
    )
  order by t.scheduled_date desc, t.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

-- ---------------------------------------------------------------------------
-- Account deletion (user-initiated only)
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
revoke execute on function public.generate_due_notifications(date) from public, anon;
grant execute on function public.generate_due_notifications(date) to authenticated;
revoke execute on function public.search_tasks(text, integer) from public, anon;
grant execute on function public.search_tasks(text, integer) to authenticated;
