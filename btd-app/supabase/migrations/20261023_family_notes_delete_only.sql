-- Family accounts: a grown-up's note on a child's calendar is the grown-up's
-- words. The child can delete it, or tick it for their next appointment, but
-- not rewrite it. Only the grown-up who wrote it can change what it says.
--
-- Run once in Supabase → SQL Editor, after 20261022_family_names.sql.
-- Safe to run again.

create or replace function public.calendar_entries_keep_owner()
returns trigger
language plpgsql
as $$
begin
  if new.user_id <> old.user_id or new.logged_by is distinct from old.logged_by then
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
