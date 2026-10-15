-- AI Advocacy Assistant chat history, saved to your account.
--
-- Run once in Supabase → SQL Editor. Safe to run again.
--
-- Signed in, each assistant chat (its messages, title and whether it's
-- pinned) is kept here, so it follows the person to any device. Until this is
-- run, chats simply stay in the browser they were made in.
--
-- Only the person who owns a chat can read, change, or delete it — not other
-- users, and not admins. Deleting the account deletes its chats.

create table if not exists public.assistant_chats (
  id uuid primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  title text not null default '',
  messages jsonb not null,
  pinned boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists assistant_chats_user_idx
  on public.assistant_chats (user_id, updated_at desc);

alter table public.assistant_chats enable row level security;

drop policy if exists "Owners manage their own chats" on public.assistant_chats;
create policy "Owners manage their own chats"
  on public.assistant_chats
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
