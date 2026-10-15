-- Appointment Prep drafts, saved to your account.
--
-- Run once in Supabase → SQL Editor. Safe to run again.
--
-- Signed in, each Appointment Prep draft (the form, plus the My Voice
-- sentence put on it) is kept here, so it follows the person to any device.
-- Until this is run, drafts simply stay in the browser they were made in.
--
-- Only the person who owns a draft can read, change, or delete it — not other
-- users, and not admins. Deleting the account deletes its drafts.

create table if not exists public.appointment_drafts (
  id uuid primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null default '',
  form jsonb not null,
  my_voice jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists appointment_drafts_user_idx
  on public.appointment_drafts (user_id, updated_at desc);

alter table public.appointment_drafts enable row level security;

drop policy if exists "Owners manage their own drafts" on public.appointment_drafts;
create policy "Owners manage their own drafts"
  on public.appointment_drafts
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
