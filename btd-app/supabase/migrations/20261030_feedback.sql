-- Feedback from families testing Voiced (the /feedback page).
--
-- Run once in Supabase → SQL Editor. Safe to run again. Needs
-- public.is_voiced_admin() (supabase/rejections-and-messages.sql, updated by
-- 20261027_admin_email.sql).
--
-- Anyone can send feedback, signed in or not; only Voiced admins can read it
-- (at /admin/feedback, where it downloads as a spreadsheet). Nobody can
-- change an answer from the site; only admins can delete one
-- (20261031_feedback_delete.sql).
--
-- The app makes each answer's id itself, so if a send is retried (say the
-- connection dropped after it arrived) the second copy is refused as a
-- duplicate instead of being counted twice.

create table if not exists public.feedback (
  id uuid primary key,
  created_at timestamptz not null default now(),
  -- Whoever was signed in, filled in by the database; empty if signed out.
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  role text check (role in ('parent', 'caregiver', 'self-advocate', 'clinician', 'other')),
  tried text[] not null default '{}',
  ease smallint check (ease between 1 and 5),
  would_bring text check (would_bring in ('yes', 'maybe', 'no')),
  would_bring_why text check (char_length(would_bring_why) <= 4000),
  confusing text check (char_length(confusing) <= 4000),
  wish text check (char_length(wish) <= 4000),
  use_again text check (use_again in ('not likely', 'maybe', 'definitely')),
  person_liked text check (person_liked in ('no', 'okay', 'yes')),
  person_could_tell text check (person_could_tell in ('no', 'a little', 'yes')),
  contact_ok boolean not null default false,
  contact text check (char_length(contact) <= 200)
);

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

drop policy if exists "Anyone sends feedback" on public.feedback;
create policy "Anyone sends feedback"
  on public.feedback for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "Admins read feedback" on public.feedback;
create policy "Admins read feedback"
  on public.feedback for select to authenticated
  using (public.is_voiced_admin());
