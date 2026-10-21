-- Family accounts: names, so linked people see "Mom" and "Maya" instead of
-- nothing. Each person's profile stays private; only a display name is
-- shared, and only between people who are linked.
--
-- Run once in Supabase → SQL Editor, after 20261021_family_accounts.sql.
-- Safe to run again.

-- The name to show for someone: what they asked to be called, their name or
-- username on their profile, or the start of their email ("mom@…" → "Mom").
create or replace function public.family_display_name(p_user uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'preferred_name'), ''),
    nullif(trim(p.full_name), ''),
    nullif(trim(p.username), ''),
    initcap(split_part(u.email, '@', 1)),
    'Someone'
  )
  into v_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user;
  return coalesce(v_name, 'Someone');
end;
$$;

-- Not callable directly: it's only used inside the functions below, which
-- check that the two people are linked.
revoke all on function public.family_display_name(uuid) from public;

-- Everyone I'm linked with: my children (I'm their grown-up) and my
-- grown-ups (they can see my calendar).
create or replace function public.family_people()
returns table (
  link_id uuid,
  person_id uuid,
  name text,
  -- What they are to me: 'child' or 'caregiver'.
  role text,
  linked_at timestamptz,
  -- For a child: whether this link carries a parent's under-13 consent.
  consent boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.child_id, public.family_display_name(l.child_id), 'child', l.created_at, l.consent_at is not null
  from public.family_links l
  where l.caregiver_id = auth.uid()
  union all
  select l.id, l.caregiver_id, public.family_display_name(l.caregiver_id), 'caregiver', l.created_at, l.consent_at is not null
  from public.family_links l
  where l.child_id = auth.uid()
  order by 5;
$$;

revoke all on function public.family_people() from public;
grant execute on function public.family_people() to authenticated;

-- Each notice carries the name of who did it, written when it's made.
alter table public.family_events
  add column if not exists actor_name text;

create or replace function public.family_events_add_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.actor_id is not null and new.actor_name is null then
    new.actor_name := public.family_display_name(new.actor_id);
  end if;
  return new;
end;
$$;

drop trigger if exists family_events_add_name on public.family_events;
create trigger family_events_add_name
  before insert on public.family_events
  for each row execute function public.family_events_add_name();
