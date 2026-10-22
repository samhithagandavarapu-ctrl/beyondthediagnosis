-- Story rejection reasons + messaging between people and the Voiced team.
--
-- Run once in Supabase → SQL Editor, AFTER stories-notifications.sql.
-- Safe to run again.

-- ---------------------------------------------------------------------------
-- Who counts as a Voiced admin, inside the database.
--
-- Keep this list the same as the admin emails in the app (AuthContext's
-- DEFAULT_ADMIN_EMAILS plus anything in VITE_ADMIN_EMAILS). The app decides
-- what an admin SEES; this decides what an admin can actually READ and WRITE.
-- ---------------------------------------------------------------------------
create or replace function public.is_voiced_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'withvoiced@gmail.com'
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. Why a story wasn't published.
--
-- The person who sent it in can read these on their own story (the
-- "Submitters can read their own stories" rule from
-- stories-notifications.sql), which is how they're told in Notifications.
-- ---------------------------------------------------------------------------
alter table public.stories add column if not exists rejection_reason text;
alter table public.stories add column if not exists rejection_note text;

-- ---------------------------------------------------------------------------
-- 2. Messages.
--
-- Every conversation is between one person and the Voiced team, so a thread
-- is simply "all messages whose thread_user_id is that person".
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  -- The person this conversation is with (never an admin's own id).
  thread_user_id uuid not null references auth.users (id) on delete cascade,
  -- Who wrote this message. Filled in by the database.
  sender_id uuid default auth.uid() references auth.users (id) on delete set null,
  from_admin boolean not null default false,
  -- Shown to the admin so they know who they're talking to.
  sender_name text,
  sender_email text default (auth.jwt() ->> 'email'),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx
  on public.messages (thread_user_id, created_at);

alter table public.messages enable row level security;

-- Read: your own conversation, or every conversation if you're an admin.
drop policy if exists "Read own messages, admins read all" on public.messages;
create policy "Read own messages, admins read all"
  on public.messages
  for select
  to authenticated
  using (thread_user_id = auth.uid() or public.is_voiced_admin());

-- Write: a person writes into their own conversation as themselves; an admin
-- writes into anyone's conversation as the Voiced team. Nobody can sign a
-- message with someone else's id or email.
drop policy if exists "Send as yourself" on public.messages;
create policy "Send as yourself"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and sender_email is not distinct from (auth.jwt() ->> 'email')
    and (
      (from_admin = false and thread_user_id = auth.uid())
      or (from_admin = true and public.is_voiced_admin())
    )
  );

-- No update or delete policies: messages can't be edited or removed from the
-- site. (You can still delete rows yourself in the Supabase table editor.)

-- Live updates: new messages appear without refreshing the page.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
