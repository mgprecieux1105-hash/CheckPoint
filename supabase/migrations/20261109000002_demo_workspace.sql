-- CheckPoint — optional demo workspace.
-- All rows created here carry is_demo = true so the UI can label them and the
-- user can remove them in one click without touching their real data.

create or replace function public.seed_demo_workspace(p_today date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  p_uni uuid;
  p_biz uuid;
  p_fit uuid;
  g_thesis uuid;
  g_clients uuid;
  g_run uuid;
  g_read uuid;
  d date;
  i integer;
  n integer;
  r double precision;
  st public.task_status;
  titles_uni text[] := array['Lire 2 articles pour l''état de l''art', 'Rédiger la section méthodologie',
    'Préparer les slides du séminaire', 'Nettoyer le jeu de données', 'Réunion avec la directrice de mémoire',
    'Réviser le chapitre 2', 'Lancer les expériences de référence', 'Mettre à jour la bibliographie'];
  titles_biz text[] := array['Appeler 3 prospects', 'Écrire la page tarifs', 'Préparer la démo client',
    'Envoyer la newsletter', 'Relancer les devis en attente', 'Mettre à jour le prévisionnel',
    'Publier un post LinkedIn', 'Configurer la facturation'];
  titles_fit text[] := array['Footing 5 km', 'Séance de renforcement', 'Fractionné 6×400 m',
    'Étirements 20 min', 'Sortie longue 8 km'];
  titles_life text[] := array['Faire les courses', 'Payer les factures', 'Ranger le bureau',
    'Appeler maman', 'Préparer les repas de la semaine', 'Lire 30 minutes'];
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from public.projects where user_id = uid and is_demo) then
    return;
  end if;

  insert into public.projects (name, description, color, icon, start_date, target_date, priority, status, is_demo)
  values ('Mémoire de Master', 'Rédaction et soutenance du mémoire de fin d''études.', '#3978F6', 'graduation-cap',
          p_today - 75, p_today + 60, 'high', 'active', true)
  returning id into p_uni;

  insert into public.projects (name, description, color, icon, start_date, target_date, priority, status, is_demo)
  values ('Lancement Studio Nova', 'Création d''une activité freelance de design produit.', '#25C8C4', 'rocket',
          p_today - 70, p_today + 120, 'urgent', 'active', true)
  returning id into p_biz;

  insert into public.projects (name, description, color, icon, start_date, target_date, priority, status, is_demo)
  values ('Objectif 10 km', 'Préparer une course de 10 km en moins de 55 minutes.', '#26B887', 'dumbbell',
          p_today - 60, p_today + 30, 'medium', 'active', true)
  returning id into p_fit;

  insert into public.goals (project_id, title, description, goal_type, progress_mode, unit, target_value, current_value,
                            start_date, target_date, status, priority, is_demo)
  values (p_uni, 'Terminer la rédaction du mémoire', 'Toutes les sections validées par la directrice.', 'custom',
          'milestones', null, 1, 0, p_today - 75, p_today + 45, 'in_progress', 'high', true)
  returning id into g_thesis;

  insert into public.milestones (goal_id, title, target_date, status, position) values
    (g_thesis, 'Plan détaillé validé', p_today - 50, 'completed', 0),
    (g_thesis, 'État de l''art rédigé', p_today - 20, 'completed', 1),
    (g_thesis, 'Expériences terminées', p_today + 10, 'pending', 2),
    (g_thesis, 'Version complète envoyée', p_today + 35, 'pending', 3),
    (g_thesis, 'Soutenance préparée', p_today + 45, 'pending', 4);

  insert into public.goals (project_id, title, description, goal_type, progress_mode, unit, target_value, current_value,
                            start_date, target_date, status, priority, is_demo)
  values (p_biz, 'Signer 5 clients ce trimestre', null, 'custom', 'target', 'clients', 5, 2,
          p_today - 40, p_today + 50, 'in_progress', 'urgent', true)
  returning id into g_clients;

  insert into public.goals (project_id, title, description, goal_type, progress_mode, unit, target_value, current_value,
                            start_date, target_date, status, priority, is_demo)
  values (p_fit, 'Courir 80 km ce mois-ci', null, 'monthly', 'target', 'km', 80, 52,
          date_trunc('month', p_today)::date, (date_trunc('month', p_today) + interval '1 month - 1 day')::date,
          'in_progress', 'medium', true)
  returning id into g_run;

  insert into public.goals (project_id, title, description, goal_type, progress_mode, unit, target_value, current_value,
                            start_date, target_date, status, priority, is_demo)
  values (null, 'Lire 12 livres cette année', null, 'annual', 'target', 'livres', 12, 9,
          date_trunc('year', p_today)::date, (date_trunc('year', p_today) + interval '1 year - 1 day')::date,
          'in_progress', 'low', true)
  returning id into g_read;

  insert into public.goals (project_id, title, description, goal_type, progress_mode, unit, target_value, current_value,
                            start_date, target_date, status, priority, is_demo)
  values (p_uni, 'Valider le plan du mémoire', null, 'weekly', 'target', null, 1, 1,
          p_today - 56, p_today - 50, 'achieved', 'high', true);

  -- 60 days of history plus today and tomorrow.
  for i in reverse 60..-1 loop
    d := p_today - i;
    -- fewer tasks on weekends
    n := case when extract(isodow from d) >= 6 then 1 + floor(random() * 2)::int else 3 + floor(random() * 3)::int end;
    for k in 1..n loop
      r := random();
      if d < p_today then
        st := case when r < 0.74 then 'completed'::public.task_status
                   when r < 0.94 then 'missed'::public.task_status
                   else 'pending'::public.task_status end;
      elsif d = p_today then
        st := case when k <= 2 then 'completed'::public.task_status else 'pending'::public.task_status end;
      else
        st := 'pending';
      end if;

      if k = 1 then
        insert into public.tasks (project_id, goal_id, title, category, priority, status, scheduled_date, is_demo,
                                  completed_at)
        values (p_uni, g_thesis, titles_uni[1 + floor(random() * array_length(titles_uni, 1))::int], 'Études',
                (array['medium', 'high']::public.priority_level[])[1 + floor(random() * 2)::int], st, d, true,
                case when st = 'completed' then (d + time '17:00')::timestamptz end);
      elsif k = 2 then
        insert into public.tasks (project_id, goal_id, title, category, priority, status, scheduled_date, is_demo,
                                  completed_at)
        values (p_biz, g_clients, titles_biz[1 + floor(random() * array_length(titles_biz, 1))::int], 'Business',
                (array['medium', 'high', 'urgent']::public.priority_level[])[1 + floor(random() * 3)::int], st, d, true,
                case when st = 'completed' then (d + time '18:30')::timestamptz end);
      elsif k = 3 then
        insert into public.tasks (project_id, goal_id, title, category, priority, status, scheduled_date, is_demo,
                                  completed_at)
        values (p_fit, g_run, titles_fit[1 + floor(random() * array_length(titles_fit, 1))::int], 'Sport',
                'medium', st, d, true, case when st = 'completed' then (d + time '07:30')::timestamptz end);
      else
        insert into public.tasks (title, category, priority, status, scheduled_date, is_demo, completed_at)
        values (titles_life[1 + floor(random() * array_length(titles_life, 1))::int], 'Quotidien', 'low', st, d, true,
                case when st = 'completed' then (d + time '20:00')::timestamptz end);
      end if;
    end loop;

    if d < p_today and random() < 0.35 then
      insert into public.daily_reflections (reflection_date, positive_reflection, missed_accomplishments,
                                            improvement_notes, mood, is_demo)
      values (d, 'Bonne concentration le matin, la partie la plus difficile est avancée.',
              'Je n''ai pas eu le temps de relancer tous les prospects.',
              'Bloquer un créneau de 45 min dédié aux relances avant midi.',
              3 + floor(random() * 3)::int, true)
      on conflict (user_id, reflection_date) do nothing;
    end if;
  end loop;
end;
$$;

create or replace function public.clear_demo_workspace()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  -- Only rows explicitly flagged as demo are removed; real records are never touched.
  delete from public.tasks where user_id = auth.uid() and is_demo;
  delete from public.daily_reflections where user_id = auth.uid() and is_demo;
  delete from public.goals where user_id = auth.uid() and is_demo;
  delete from public.projects where user_id = auth.uid() and is_demo;
end;
$$;

revoke execute on function public.seed_demo_workspace(date) from public, anon;
grant execute on function public.seed_demo_workspace(date) to authenticated;
revoke execute on function public.clear_demo_workspace() from public, anon;
grant execute on function public.clear_demo_workspace() to authenticated;
