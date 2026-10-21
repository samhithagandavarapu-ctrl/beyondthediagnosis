-- One profile per person.
--
-- Run once in Supabase → SQL Editor, after the other migrations and after
-- supabase/appointment-drafts.sql and supabase/me-board.sql. Safe to run again.
--
-- Each person exists once. A child is added by their parent, once, and that
-- is their profile: their calendar, Me board and Appointment Prep drafts all
-- belong to it. Logins connect to it:
--  - the parent's login, as a linked grown-up (family_links);
--  - for a child 12 or under, a username and password the parent makes
--    (the server creates it; there's no email);
--  - for 13 and older, the teen's own email login, made from an invite code
--    the parent gives them (profile_claims), which connects to the profile
--    instead of making a new one.
-- A self-advocate who signs up alone is their own profile, and can invite a
-- grown-up with a code (family_invites, as before).
--
-- Who can see a person's information: that person's own login, and their
-- linked grown-ups — nobody else, and not admins. "Just for me" calendar
-- entries stay hidden from grown-ups.
--
-- A profile a parent made, with no login of its own yet, is a sign-in that
-- nobody can use: its address ends in @people.voiced.invalid and its
-- password is random and never shown. A child's username login is
-- <username>@kids.voiced.invalid. Neither address is ever emailed.

-- ---- What kind of sign-in a person has ----

create or replace function public.person_login(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when u.email like '%@people.voiced.invalid' then 'none'
    when u.email like '%@kids.voiced.invalid' then 'username'
    else 'email'
  end
  from auth.users u
  where u.id = p_user;
$$;

create or replace function public.person_username(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select split_part(u.email, '@', 1)
  from auth.users u
  where u.id = p_user and u.email like '%@kids.voiced.invalid';
$$;

revoke all on function public.person_login(uuid) from public;
revoke all on function public.person_username(uuid) from public;

-- How a grown-up is related ("Mom"), as they said when adding the child.
alter table public.family_links
  add column if not exists relation text;

-- ---- Who I'm linked with, with what the family page needs ----

drop function if exists public.family_people();
create function public.family_people()
returns table (
  link_id uuid,
  person_id uuid,
  name text,
  -- What they are to me: 'child' or 'caregiver'.
  role text,
  linked_at timestamptz,
  consent boolean,
  -- For a child: their birth year, and their sign-in: 'none', 'username' or 'email'.
  birth_year smallint,
  login text,
  username text,
  relation text
)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.child_id, public.family_display_name(l.child_id), 'child', l.created_at,
         l.consent_at is not null, a.birth_year, public.person_login(l.child_id),
         public.person_username(l.child_id), l.relation
  from public.family_links l
  left join public.account_ages a on a.user_id = l.child_id
  where l.caregiver_id = auth.uid()
  union all
  select l.id, l.caregiver_id, public.family_display_name(l.caregiver_id), 'caregiver', l.created_at,
         l.consent_at is not null, null, null, null, l.relation
  from public.family_links l
  where l.child_id = auth.uid()
  order by 5;
$$;

revoke all on function public.family_people() from public;
grant execute on function public.family_people() to authenticated;

-- ---- A person's information: their own login and their grown-ups ----

do $$
begin
  if to_regclass('public.me_boards') is not null then
    drop policy if exists "Owners manage their own board" on public.me_boards;
    drop policy if exists "Owners and grown-ups manage the board" on public.me_boards;
    create policy "Owners and grown-ups manage the board"
      on public.me_boards for all to authenticated
      using (user_id = auth.uid() or public.is_caregiver_of(user_id))
      with check (user_id = auth.uid() or public.is_caregiver_of(user_id));
  else
    raise notice 'me_boards is missing: run supabase/me-board.sql, then this file again.';
  end if;

  if to_regclass('public.appointment_drafts') is not null then
    drop policy if exists "Owners manage their own drafts" on public.appointment_drafts;
    drop policy if exists "Owners and grown-ups manage drafts" on public.appointment_drafts;
    create policy "Owners and grown-ups manage drafts"
      on public.appointment_drafts for all to authenticated
      using (user_id = auth.uid() or public.is_caregiver_of(user_id))
      with check (user_id = auth.uid() or public.is_caregiver_of(user_id));
  else
    raise notice 'appointment_drafts is missing: run supabase/appointment-drafts.sql, then this file again.';
  end if;
end;
$$;

-- Symptom buttons a grown-up adds show for the person too.
drop policy if exists "Owners add their own symptoms" on public.custom_symptoms;
drop policy if exists "Owners and grown-ups add symptoms" on public.custom_symptoms;
create policy "Owners and grown-ups add symptoms"
  on public.custom_symptoms for insert to authenticated
  with check (auth.uid() = user_id or public.is_caregiver_of(user_id));

-- Grown-ups can read their children's birth year (the family page decides
-- login or invite from it).
drop policy if exists "Grown-ups read their children's age" on public.account_ages;
create policy "Grown-ups read their children's age"
  on public.account_ages for select to authenticated
  using (public.is_caregiver_of(user_id));

-- ---- Invite codes for a teen to claim their profile ----

create table if not exists public.profile_claims (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  person_id uuid not null references auth.users (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz
);

alter table public.profile_claims enable row level security;

-- Made only through create_profile_claim(); used only by the server, which
-- checks the code. The grown-up who made one can see and cancel it.
drop policy if exists "Makers see their claim codes" on public.profile_claims;
create policy "Makers see their claim codes"
  on public.profile_claims for select to authenticated
  using (created_by = auth.uid());

drop policy if exists "Makers cancel their claim codes" on public.profile_claims;
create policy "Makers cancel their claim codes"
  on public.profile_claims for delete to authenticated
  using (created_by = auth.uid());

-- A code for a child 13 or older (counted on the safe side: born at least 14
-- years ago this year) with no sign-in yet. Making a new one replaces any
-- unused one.
create or replace function public.create_profile_claim(p_person uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  new_code text;
  v_year smallint;
begin
  if auth.uid() is null then
    raise exception 'Sign in to make an invite.';
  end if;
  if not public.is_caregiver_of(p_person) then
    raise exception 'You can only invite your own child.';
  end if;
  if public.person_login(p_person) <> 'none' then
    raise exception 'They already have their own login.';
  end if;
  select birth_year into v_year from public.account_ages where user_id = p_person;
  if v_year is null or v_year > extract(year from now())::int - 14 then
    raise exception 'Under 13, give them a username login instead.';
  end if;
  delete from public.profile_claims where person_id = p_person and used_at is null;
  loop
    bytes := uuid_send(gen_random_uuid());
    new_code := '';
    for i in 0..5 loop
      new_code := new_code || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
    end loop;
    begin
      insert into public.profile_claims (code, person_id, created_by) values (new_code, p_person, auth.uid());
      return new_code;
    exception when unique_violation then
      -- Same code as one already made: try another.
    end;
  end loop;
end;
$$;

revoke all on function public.create_profile_claim(uuid) from public;
grant execute on function public.create_profile_claim(uuid) to authenticated;

-- ---- No more "link my child's own account" codes ----
-- A child is added once, by their parent, so a grown-up never makes a code
-- for a child's separate account (that made the same child twice). Codes go
-- the other way only: a self-advocate invites a grown-up.

delete from public.family_invites where creator_role = 'caregiver' and used_at is null;

create or replace function public.create_family_invite(p_creator_role text, p_for_under_13 boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to make a code.';
  end if;
  if p_creator_role <> 'child' then
    raise exception 'To add your child, use Add a child. Each person has one profile.';
  end if;
  if public.needs_parent_consent(auth.uid()) then
    raise exception 'A parent needs to link first.';
  end if;
  if public.person_login(auth.uid()) = 'username' then
    raise exception 'Ask your grown-up to add another grown-up.';
  end if;
  loop
    bytes := uuid_send(gen_random_uuid());
    new_code := '';
    for i in 0..5 loop
      new_code := new_code || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
    end loop;
    begin
      insert into public.family_invites (code, created_by, creator_role, for_under_13)
      values (new_code, auth.uid(), 'child', false);
      return new_code;
    exception when unique_violation then
      -- Same code as one already made: try another.
    end;
  end loop;
end;
$$;

-- ---- Unlinking never leaves a child's profile with nobody ----

create or replace function public.unlink_family(p_link uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  link public.family_links;
begin
  select * into link from public.family_links
  where id = p_link and auth.uid() in (caregiver_id, child_id);
  if link.id is null then
    raise exception 'That link isn''t yours to remove.';
  end if;
  if public.person_login(link.child_id) <> 'email'
     and (select count(*) from public.family_links where child_id = link.child_id) <= 1 then
    raise exception 'You''re the only grown-up on this profile. Remove the profile instead.';
  end if;
  delete from public.family_links where id = link.id;
  insert into public.family_events (recipient_id, actor_id, kind)
  values (case when link.caregiver_id = auth.uid() then link.child_id else link.caregiver_id end, auth.uid(), 'unlinked');
end;
$$;

revoke all on function public.unlink_family(uuid) from public;
grant execute on function public.unlink_family(uuid) to authenticated;
