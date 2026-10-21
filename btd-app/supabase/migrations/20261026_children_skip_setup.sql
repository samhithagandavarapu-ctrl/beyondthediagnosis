-- Children's profiles: their own space, already set up.
--
-- Run once in Supabase → SQL Editor, after 20261025_one_profile_per_person.sql.
-- Safe to run again.
--
-- A child's profile is made by their grown-up, who answers the setup
-- questions for them. Profiles added before supabase/me-board.sql was run
-- couldn't store that, so a child signing in with their username was asked
-- the setup questions (and could pick "parent"). This marks every child's
-- profile that has no email login of its own (a username, or none yet) as a
-- self-advocate who's already set up.

update public.profiles p
set user_role = 'self', setup_status = 'done'
where p.id in (select child_id from public.family_links)
  and public.person_login(p.id) <> 'email';

-- A child with no profile row at all gets one (skipped quietly if the
-- profiles table needs more than these columns).
do $$
begin
  insert into public.profiles (id, user_role, setup_status)
  select distinct l.child_id, 'self', 'done'
  from public.family_links l
  where public.person_login(l.child_id) <> 'email'
    and not exists (select 1 from public.profiles p where p.id = l.child_id);
exception when others then
  raise notice 'Some children have no profile row: %', sqlerrm;
end;
$$;
