-- Family accounts: linking a parent (or other grown-up) with a child's
-- account, so the grown-up can see and add to the child's Symptom Calendar.
--
-- Run once in Supabase → SQL Editor, after the symptom calendar migrations.
-- Safe to run again.
--
-- The rules, all enforced here in the database (not just in the app):
--  - Linking needs both people: one makes a code, the other enters it.
--  - A grown-up can link several children; a child has at most 2 grown-ups.
--  - Either side can unlink at any time; the other is told.
--  - A linked grown-up can read the child's entries EXCEPT ones the child
--    marked "Just for me", and can add entries of their own, marked as
--    theirs. They can change or delete only the entries they wrote.
--  - Only the child can mark "Just for me", change or delete their own
--    entries, or delete the whole calendar. "Something scary happened"
--    entries can never be "Just for me".
--  - A child under 13 can only save to their account once linked through a
--    parent's under-13 code (the parent's consent).
--  - There is still no admin access to anyone's calendar.

-- ---- Who's under 13 ----

create table if not exists public.account_ages (
  user_id uuid primary key default auth.uid()
    references auth.users (id) on delete cascade,
  birth_year smallint not null check (birth_year between 1900 and 2100),
  created_at timestamptz not null default now()
);

alter table public.account_ages enable row level security;

-- Set once at sign-up; there's no update policy, so it can't be changed later
-- to get around the under-13 rule.
drop policy if exists "Owners read their own age" on public.account_ages;
create policy "Owners read their own age"
  on public.account_ages for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owners set their own age once" on public.account_ages;
create policy "Owners set their own age once"
  on public.account_ages for insert to authenticated
  with check (auth.uid() = user_id);

-- ---- Links ----

create table if not exists public.family_links (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Set when the link came from a parent's under-13 code: their consent.
  consent_at timestamptz,
  constraint family_links_not_self check (caregiver_id <> child_id),
  constraint family_links_once unique (caregiver_id, child_id)
);

create index if not exists family_links_child_idx on public.family_links (child_id);

alter table public.family_links enable row level security;

-- Both people can see their link. Links are only made and removed through
-- accept_family_invite() and unlink_family() below, never directly.
drop policy if exists "Linked people see their link" on public.family_links;
create policy "Linked people see their link"
  on public.family_links for select to authenticated
  using (auth.uid() in (caregiver_id, child_id));

-- ---- Invite codes ----

create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  -- Who made the code: a grown-up inviting a child, or a child inviting a
  -- grown-up.
  creator_role text not null check (creator_role in ('caregiver', 'child')),
  -- A parent's code for a child under 13; using it records consent.
  for_under_13 boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz,
  constraint family_invites_under_13_from_caregiver check (not for_under_13 or creator_role = 'caregiver')
);

alter table public.family_invites enable row level security;

drop policy if exists "Makers see their own codes" on public.family_invites;
create policy "Makers see their own codes"
  on public.family_invites for select to authenticated
  using (auth.uid() = created_by);

drop policy if exists "Makers cancel their own codes" on public.family_invites;
create policy "Makers cancel their own codes"
  on public.family_invites for delete to authenticated
  using (auth.uid() = created_by);

-- ---- Family notices ("Mom linked to your calendar", "Sam unlinked") ----

create table if not exists public.family_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('linked', 'unlinked')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists family_events_recipient_idx on public.family_events (recipient_id, created_at desc);

alter table public.family_events enable row level security;

drop policy if exists "Recipients see their notices" on public.family_events;
create policy "Recipients see their notices"
  on public.family_events for select to authenticated
  using (auth.uid() = recipient_id);

drop policy if exists "Recipients mark notices read" on public.family_events;
create policy "Recipients mark notices read"
  on public.family_events for update to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- ---- Helpers ----

-- Is the signed-in person a linked grown-up of this child?
create or replace function public.is_caregiver_of(p_child uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_links
    where caregiver_id = auth.uid() and child_id = p_child
  );
$$;

-- Under 13 (by birth year, counted on the safe side) with no parent consent
-- yet. Accounts that never gave a birth year are treated as 13 or older.
create or replace function public.needs_parent_consent(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.account_ages a
    where a.user_id = p_user
      and a.birth_year > extract(year from now())::int - 13
      and not exists (
        select 1 from public.family_links l
        where l.child_id = p_user and l.consent_at is not null
      )
  );
$$;

-- Make a code. Letters and numbers that can't be mixed up (no 0/O, 1/I/L),
-- from the database's strong random source.
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
  if p_creator_role not in ('caregiver', 'child') then
    raise exception 'Unknown role.';
  end if;
  if p_for_under_13 and p_creator_role <> 'caregiver' then
    raise exception 'Only a parent can make an under-13 code.';
  end if;
  if p_creator_role = 'child' and public.needs_parent_consent(auth.uid()) then
    raise exception 'A parent needs to link first.';
  end if;
  loop
    bytes := uuid_send(gen_random_uuid());
    new_code := '';
    for i in 0..5 loop
      new_code := new_code || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
    end loop;
    begin
      insert into public.family_invites (code, created_by, creator_role, for_under_13)
      values (new_code, auth.uid(), p_creator_role, p_for_under_13);
      return new_code;
    exception when unique_violation then
      -- Same code as one already made: try another.
    end;
  end loop;
end;
$$;

-- Enter a code. Returns the new link.
create or replace function public.accept_family_invite(p_code text)
returns public.family_links
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.family_invites;
  v_caregiver uuid;
  v_child uuid;
  link public.family_links;
begin
  if auth.uid() is null then
    raise exception 'Sign in to enter a code.';
  end if;

  select * into inv from public.family_invites
  where code = upper(replace(trim(p_code), '-', ''))
  for update;

  if inv.id is null or inv.used_at is not null or inv.expires_at < now() then
    raise exception 'That code doesn''t work. Codes last 7 days and work once.';
  end if;
  if inv.created_by = auth.uid() then
    raise exception 'That''s your own code. Give it to the other person.';
  end if;

  if inv.creator_role = 'caregiver' then
    v_caregiver := inv.created_by;
    v_child := auth.uid();
  else
    v_caregiver := auth.uid();
    v_child := inv.created_by;
  end if;

  -- A child under 13 needs their parent's under-13 code the first time.
  if public.needs_parent_consent(v_child) and not inv.for_under_13 then
    raise exception 'A child under 13 needs a parent''s under-13 code.';
  end if;

  if (select count(*) from public.family_links where child_id = v_child) >= 2 then
    raise exception 'This child already has 2 grown-ups linked.';
  end if;
  if exists (select 1 from public.family_links where caregiver_id = v_caregiver and child_id = v_child) then
    raise exception 'You''re already linked.';
  end if;
  -- No linking in both directions between the same two people.
  if exists (select 1 from public.family_links where caregiver_id = v_child and child_id = v_caregiver) then
    raise exception 'You''re already linked the other way round.';
  end if;

  insert into public.family_links (caregiver_id, child_id, consent_at)
  values (v_caregiver, v_child, case when inv.for_under_13 then now() end)
  returning * into link;

  update public.family_invites set used_by = auth.uid(), used_at = now() where id = inv.id;

  insert into public.family_events (recipient_id, actor_id, kind)
  values (inv.created_by, auth.uid(), 'linked');

  return link;
end;
$$;

-- Unlink. Either person can; the other is told. The grown-up's entries stay
-- in the child's calendar.
create or replace function public.unlink_family(p_link uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  link public.family_links;
begin
  delete from public.family_links
  where id = p_link and auth.uid() in (caregiver_id, child_id)
  returning * into link;
  if link.id is null then
    raise exception 'That link isn''t yours to remove.';
  end if;
  insert into public.family_events (recipient_id, actor_id, kind)
  values (case when link.caregiver_id = auth.uid() then link.child_id else link.caregiver_id end, auth.uid(), 'unlinked');
end;
$$;

revoke all on function public.create_family_invite(text, boolean) from public;
revoke all on function public.accept_family_invite(text) from public;
revoke all on function public.unlink_family(uuid) from public;
grant execute on function public.create_family_invite(text, boolean) to authenticated;
grant execute on function public.accept_family_invite(text) to authenticated;
grant execute on function public.unlink_family(uuid) to authenticated;
grant execute on function public.is_caregiver_of(uuid) to authenticated;
grant execute on function public.needs_parent_consent(uuid) to authenticated;

-- ---- The calendar, shared with linked grown-ups ----

alter table public.calendar_entries
  add column if not exists private boolean not null default false;

-- Who wrote it: the owner, or a linked grown-up. Older rows (null) are the
-- owner's.
alter table public.calendar_entries
  add column if not exists logged_by uuid default auth.uid()
    references auth.users (id) on delete set null;

alter table public.calendar_entries
  drop constraint if exists calendar_entries_scary_not_private;
alter table public.calendar_entries
  add constraint calendar_entries_scary_not_private check (not (private and category = 'event'));

-- Whose calendar an entry is in, and who wrote it, never change.
create or replace function public.calendar_entries_keep_owner()
returns trigger
language plpgsql
as $$
begin
  if new.user_id <> old.user_id or new.logged_by is distinct from old.logged_by then
    raise exception 'An entry can''t move to another calendar or change who wrote it.';
  end if;
  return new;
end;
$$;

drop trigger if exists calendar_entries_keep_owner on public.calendar_entries;
create trigger calendar_entries_keep_owner
  before update on public.calendar_entries
  for each row execute function public.calendar_entries_keep_owner();

drop policy if exists "Owners read their own entries" on public.calendar_entries;
drop policy if exists "Owners and grown-ups read entries" on public.calendar_entries;
create policy "Owners and grown-ups read entries"
  on public.calendar_entries for select to authenticated
  using (auth.uid() = user_id or (not private and public.is_caregiver_of(user_id)));

drop policy if exists "Owners add their own entries" on public.calendar_entries;
drop policy if exists "Owners and grown-ups add entries" on public.calendar_entries;
create policy "Owners and grown-ups add entries"
  on public.calendar_entries for insert to authenticated
  with check (
    (
      auth.uid() = user_id
      and (logged_by is null or logged_by = auth.uid())
      and not public.needs_parent_consent(auth.uid())
    )
    or (
      public.is_caregiver_of(user_id)
      and logged_by = auth.uid()
      and not private
      and reported_by in ('caregiver', 'both')
    )
  );

drop policy if exists "Owners change their own entries" on public.calendar_entries;
drop policy if exists "Owners and writers change entries" on public.calendar_entries;
create policy "Owners and writers change entries"
  on public.calendar_entries for update to authenticated
  using (auth.uid() = user_id or (public.is_caregiver_of(user_id) and logged_by = auth.uid()))
  with check (auth.uid() = user_id or (public.is_caregiver_of(user_id) and logged_by = auth.uid() and not private));

drop policy if exists "Owners delete their own entries" on public.calendar_entries;
drop policy if exists "Owners and writers delete entries" on public.calendar_entries;
create policy "Owners and writers delete entries"
  on public.calendar_entries for delete to authenticated
  using (auth.uid() = user_id or (public.is_caregiver_of(user_id) and logged_by = auth.uid()));

-- A child's own symptom buttons show for their grown-ups too.
drop policy if exists "Owners read their own symptoms" on public.custom_symptoms;
drop policy if exists "Owners and grown-ups read symptoms" on public.custom_symptoms;
create policy "Owners and grown-ups read symptoms"
  on public.custom_symptoms for select to authenticated
  using (auth.uid() = user_id or public.is_caregiver_of(user_id));
