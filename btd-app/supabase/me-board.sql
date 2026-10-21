-- The Me board ("All about me"), and the answers from the welcome setup.
--
-- Run once in Supabase → SQL Editor. Safe to run again.
--
-- me_boards: one board per account — eight sticky notes about how the
-- person usually is, how they show pain, how to talk with them. A grown-up's
-- account can keep one about the person they help (about_name, relation).
-- Only the owner can read, change, or delete it — not other users, and not
-- admins. Deleting the account deletes the board. Until this is run, boards
-- stay in the browser they were made in.
--
-- profiles: who someone is here (for themselves, a parent or caregiver, or a
-- provider), an age group (never a birthday), and whether they've been
-- through the welcome setup. Until this is run, those are kept in the browser.

create table if not exists public.me_boards (
  user_id uuid primary key default auth.uid()
    references auth.users (id) on delete cascade,
  about_name text not null default '',
  relation text not null default '',
  answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.me_boards enable row level security;

drop policy if exists "Owners manage their own board" on public.me_boards;
create policy "Owners manage their own board"
  on public.me_boards
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.profiles
  add column if not exists user_role text
    check (user_role in ('self', 'caregiver', 'provider'));

alter table public.profiles
  add column if not exists age_group text
    check (age_group in ('13-17', '18+'));

alter table public.profiles
  add column if not exists setup_status text
    check (setup_status in ('done', 'skipped'));
