-- Story-published notifications.
--
-- Run once in Supabase → SQL Editor. Safe to run again.
--
-- Links each new story to the account that sent it in, so the app can tell
-- that person (in Notifications) when it's approved. The app never sends
-- user_id itself — the database fills it in from whoever is signed in — so
-- submitting keeps working before and after this is run, and signed-out
-- submissions simply have no owner.

alter table public.stories
  add column if not exists user_id uuid
    default auth.uid()
    references auth.users (id) on delete set null;

create index if not exists stories_user_id_idx on public.stories (user_id);

-- Let people read their own submissions, whatever their status. Approved
-- stories are already public; this only adds "your own".
drop policy if exists "Submitters can read their own stories" on public.stories;
create policy "Submitters can read their own stories"
  on public.stories
  for select
  to authenticated
  using (user_id = auth.uid());
