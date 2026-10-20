-- Symptom Calendar: calendar entries and custom symptoms, saved to your
-- account.
--
-- Run once in Supabase → SQL Editor. Safe to run again.
--
-- Every entry is one thing logged on one day: a period, something that
-- hurts, how someone feels, and so on. My Voice check-ins are saved here
-- too, as a "How I feel" entry and a "Something hurts" entry that share a
-- check_in_id. Cycle numbers (period length, cycle length, predictions) are
-- worked out in the browser and never stored.
--
-- Only the person who owns an entry can read, change, or delete it. There is
-- deliberately NO admin policy: people listed in VITE_ADMIN_EMAILS cannot
-- read anyone's calendar (unlike the stories table). Deleting the account
-- deletes everything in it.

-- ---- calendar_entries ----

create table if not exists public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  -- The day it happened. Past days are fine; future days are not (one day of
  -- slack, so someone ahead of the server's time zone can log "today").
  entry_date date not null check (entry_date <= current_date + 1),
  logged_at timestamptz not null default now(),
  category text not null check (category in (
    'period', 'pain', 'mood', 'behavior', 'sleep',
    'eating', 'bathroom', 'energy', 'event', 'other'
  )),
  custom_label text,
  -- 1-3 on the faces scale, 0-10 on the caregiver scale, or 1-5 from the
  -- body map's "how much does it hurt" faces.
  severity smallint,
  severity_scale text check (severity_scale in ('faces', 'ten', 'five')),
  typical text check (typical in ('typical', 'new', 'unsure')),
  reported_by text not null default 'self'
    check (reported_by in ('self', 'caregiver', 'both')),
  body_locations text[],
  details jsonb not null default '{}'::jsonb,
  medication_note text,
  note text,
  add_to_visit boolean not null default false,
  -- Set on entries that came from one My Voice check-in, so they can be
  -- shown, changed and deleted together.
  check_in_id uuid,
  updated_at timestamptz not null default now(),
  constraint calendar_entries_severity_range check (
    severity is null
    or (severity_scale = 'faces' and severity between 1 and 3)
    or (severity_scale = 'ten' and severity between 0 and 10)
    or (severity_scale = 'five' and severity between 1 and 5)
  )
);

create index if not exists calendar_entries_user_date_idx
  on public.calendar_entries (user_id, entry_date);

create index if not exists calendar_entries_check_in_idx
  on public.calendar_entries (user_id, check_in_id)
  where check_in_id is not null;

create or replace function public.calendar_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists calendar_entries_touch on public.calendar_entries;
create trigger calendar_entries_touch
  before update on public.calendar_entries
  for each row execute function public.calendar_touch_updated_at();

alter table public.calendar_entries enable row level security;

drop policy if exists "Owners read their own entries" on public.calendar_entries;
create policy "Owners read their own entries"
  on public.calendar_entries for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owners add their own entries" on public.calendar_entries;
create policy "Owners add their own entries"
  on public.calendar_entries for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owners change their own entries" on public.calendar_entries;
create policy "Owners change their own entries"
  on public.calendar_entries for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owners delete their own entries" on public.calendar_entries;
create policy "Owners delete their own entries"
  on public.calendar_entries for delete to authenticated
  using (auth.uid() = user_id);

-- ---- custom_symptoms ----

create table if not exists public.custom_symptoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  icon text not null,
  created_at timestamptz not null default now()
);

create index if not exists custom_symptoms_user_idx
  on public.custom_symptoms (user_id, created_at);

alter table public.custom_symptoms enable row level security;

drop policy if exists "Owners read their own symptoms" on public.custom_symptoms;
create policy "Owners read their own symptoms"
  on public.custom_symptoms for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owners add their own symptoms" on public.custom_symptoms;
create policy "Owners add their own symptoms"
  on public.custom_symptoms for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owners change their own symptoms" on public.custom_symptoms;
create policy "Owners change their own symptoms"
  on public.custom_symptoms for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owners delete their own symptoms" on public.custom_symptoms;
create policy "Owners delete their own symptoms"
  on public.custom_symptoms for delete to authenticated
  using (auth.uid() = user_id);
