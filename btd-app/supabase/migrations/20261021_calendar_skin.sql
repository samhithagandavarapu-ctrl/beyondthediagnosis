-- Symptom Calendar: adds "My skin" as a kind of entry.
--
-- Run once in Supabase → SQL Editor, after 20261020_symptom_calendar.sql.
-- Safe to run again.

alter table public.calendar_entries
  drop constraint if exists calendar_entries_category_check;

alter table public.calendar_entries
  add constraint calendar_entries_category_check check (category in (
    'period', 'pain', 'mood', 'behavior', 'sleep', 'skin',
    'eating', 'bathroom', 'energy', 'event', 'other'
  ));
