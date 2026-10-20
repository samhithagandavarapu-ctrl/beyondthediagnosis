-- My Voice check-ins, saved to your account.
--
-- Run once in Supabase → SQL Editor. Safe to run again.
--
-- Signed in, every My Voice check-in (how they feel, where it hurts, since
-- when, and any note) is kept here as its own dated entry, so the history
-- follows the person to any device. Until this is run, check-ins simply stay
-- in the browser they were made in. Voice recordings are never stored.
--
-- Only the person who owns a check-in can read, change, or delete it — not
-- other users, and not admins. Deleting the account deletes its check-ins.

create table if not exists public.my_voice_check_ins (
  id uuid primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists my_voice_check_ins_user_idx
  on public.my_voice_check_ins (user_id, created_at desc);

alter table public.my_voice_check_ins enable row level security;

drop policy if exists "Owners manage their own check-ins" on public.my_voice_check_ins;
create policy "Owners manage their own check-ins"
  on public.my_voice_check_ins
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
