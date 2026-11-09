-- Data isolation & business rule checks. Run with: npm run test:db
-- Uses a transaction that is rolled back, so it leaves no data behind.
begin;
\set ON_ERROR_STOP on

insert into auth.users (id, email, raw_user_meta_data, aud, role)
values ('00000000-0000-0000-0000-00000000000a', 'alice@test.local', '{"full_name":"Alice"}', 'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-00000000000b', 'bob@test.local', '{"full_name":"Bob"}', 'authenticated', 'authenticated');

-- profiles are created automatically
do $$ begin
  assert (select count(*) from public.profiles where id in ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b')) = 2, 'profiles not created';
end $$;

-- act as Alice
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

insert into public.projects (id, name) values ('10000000-0000-0000-0000-00000000000a', 'Projet Alice');
insert into public.tasks (title, project_id, scheduled_date) values ('Tâche Alice', '10000000-0000-0000-0000-00000000000a', '2026-11-01');
insert into public.tasks (title, scheduled_date, status) values ('Faite', '2026-11-01', 'completed');
select public.seed_demo_workspace('2026-11-09');

do $$ begin
  assert (select count(*) from public.tasks where status = 'completed' and completed_at is null) = 0, 'completed_at not set';
  assert (select count(*) from public.projects where is_demo) = 3, 'demo projects missing';
  assert (select count(*) from public.search_tasks('Alice')) >= 1, 'search failed';
end $$;

-- act as Bob
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

do $$ begin
  assert (select count(*) from public.tasks) = 0, 'Bob can read Alice tasks';
  assert (select count(*) from public.projects) = 0, 'Bob can read Alice projects';
  assert (select count(*) from public.profiles) = 1, 'Bob can read other profiles';
  assert (select count(*) from public.search_tasks('Alice')) = 0, 'search leaks data';
end $$;

-- Bob cannot attach a task to Alice's project (composite FK)
do $$ begin
  begin
    insert into public.tasks (title, project_id) values ('Intrusion', '10000000-0000-0000-0000-00000000000a');
    raise exception 'cross-user project link allowed';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.tasks (user_id, title) values ('00000000-0000-0000-0000-00000000000a', 'Spoof');
    raise exception 'insert for another user allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Bob's updates/deletes on Alice data affect nothing
update public.tasks set title = 'hacked';
delete from public.projects;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
do $$ begin
  assert (select count(*) from public.tasks where title = 'hacked') = 0, 'Bob updated Alice data';
  assert (select count(*) from public.projects where name = 'Projet Alice') = 1, 'Bob deleted Alice data';
end $$;

-- Deleting a project keeps its tasks in the history
delete from public.projects where id = '10000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.tasks where title = 'Tâche Alice' and project_id is null) = 1, 'history lost on project delete';
end $$;

-- Reopening a completed task clears completed_at; one reflection per day
update public.tasks set status = 'pending' where title = 'Faite';
do $$ begin
  assert (select completed_at from public.tasks where title = 'Faite') is null, 'completed_at not cleared';
end $$;
insert into public.daily_reflections (reflection_date, positive_reflection) values ('2026-12-25', 'ok');
do $$ begin
  begin
    insert into public.daily_reflections (reflection_date) values ('2026-12-25');
    raise exception 'duplicate reflection allowed';
  exception when unique_violation then null;
  end;
end $$;

-- Goal achievement creates one notification; demo clean-up keeps real data
insert into public.goals (id, title, target_date, start_date) values ('20000000-0000-0000-0000-00000000000a', 'Objectif', '2026-12-01', '2026-11-01');
update public.goals set status = 'achieved' where id = '20000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.notifications where dedupe_key like 'goal-achieved-%') = 1, 'achievement notification missing';
  assert (select achieved_at from public.goals where id = '20000000-0000-0000-0000-00000000000a') is not null, 'achieved_at missing';
end $$;
select public.clear_demo_workspace();
do $$ begin
  assert (select count(*) from public.tasks where is_demo) = 0, 'demo not cleared';
  assert (select count(*) from public.tasks where not is_demo) = 2, 'real data removed by demo clean-up';
end $$;

-- Deadline reminders are idempotent
select public.generate_due_notifications('2026-11-28');
select public.generate_due_notifications('2026-11-28');
do $$ begin
  assert (select count(*) from public.notifications where dedupe_key like 'goal-due-%') = 0, 'reminder for achieved goal';
end $$;

-- anon sees nothing
reset role;
set local role anon;
do $$ begin
  assert (select count(*) from public.tasks) = 0, 'anon can read tasks';
end $$;

\echo 'All database checks passed'
rollback;
