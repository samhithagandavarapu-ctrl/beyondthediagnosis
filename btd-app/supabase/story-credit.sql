-- How a published story is credited.
--
-- Run once in Supabase → SQL Editor. Safe to run again.
--
-- The writer picks one when they send a story in: their first name, just
-- their role ("A parent"), or anonymous. credit_name holds the first name and
-- is only filled in for 'first_name'. Stories sent before this (or before it
-- was run) have no credit_type and are shown with just the role.
--
-- submitter_name is untouched: it's still the account name, for reviewers.

alter table public.stories
  add column if not exists credit_type text
    check (credit_type in ('first_name', 'role', 'anonymous'));

alter table public.stories
  add column if not exists credit_name text;
