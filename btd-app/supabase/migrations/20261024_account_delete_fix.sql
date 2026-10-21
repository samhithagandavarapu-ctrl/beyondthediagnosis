-- Deleting an account: a grown-up who added notes to a child's calendar
-- couldn't delete their account, because the rule that keeps "who wrote it"
-- fixed also blocked clearing it when the writer is gone. Their notes stay in
-- the child's calendar, written by no one.
--
-- Run once in Supabase → SQL Editor, after 20261023_family_notes_delete_only.sql.
-- Safe to run again.

create or replace function public.calendar_entries_keep_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id <> old.user_id then
    raise exception 'An entry can''t move to another calendar or change who wrote it.';
  end if;
  if new.logged_by is distinct from old.logged_by then
    -- Who wrote it can only be cleared, and only by their account being
    -- deleted (the database does this itself; nothing else changes).
    if new.logged_by is null
       and not exists (select 1 from auth.users where id = old.logged_by)
       and (to_jsonb(new) - 'logged_by') = (to_jsonb(old) - 'logged_by') then
      return new;
    end if;
    raise exception 'An entry can''t move to another calendar or change who wrote it.';
  end if;
  -- Someone other than the writer (the calendar's owner, on a grown-up's
  -- note) may only change whether it goes to the next appointment.
  if auth.uid() is not null
     and auth.uid() is distinct from coalesce(old.logged_by, old.user_id)
     and (to_jsonb(new) - 'add_to_visit' - 'updated_at') <> (to_jsonb(old) - 'add_to_visit' - 'updated_at') then
    raise exception 'Only the person who wrote this can change it. You can delete it.';
  end if;
  return new;
end;
$$;

-- When someone deletes their account, everyone linked with them is told.
-- The notice is written just before the account goes, while their name can
-- still be looked up; the links themselves go with the account.
alter table public.family_events drop constraint if exists family_events_kind_check;
alter table public.family_events
  add constraint family_events_kind_check check (kind in ('linked', 'unlinked', 'deleted'));

create or replace function public.family_tell_on_account_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.family_events (recipient_id, actor_id, kind)
  select case when l.caregiver_id = old.id then l.child_id else l.caregiver_id end, old.id, 'deleted'
  from public.family_links l
  where l.caregiver_id = old.id or l.child_id = old.id;
  return old;
end;
$$;

drop trigger if exists family_tell_on_account_delete on auth.users;
create trigger family_tell_on_account_delete
  before delete on auth.users
  for each row execute function public.family_tell_on_account_delete();
