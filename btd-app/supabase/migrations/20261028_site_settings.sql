-- Site settings an admin can change from the admin dashboard (/admin/site),
-- without a code change: the survey banner on the home page and an
-- announcement bar across the top of every page.
--
-- Run once in Supabase → SQL Editor. Safe to run again. Needs
-- public.is_voiced_admin() (supabase/rejections-and-messages.sql, updated by
-- 20261027_admin_email.sql).
--
-- Everyone can read them (they're shown on public pages); only Voiced admins
-- can change them. Until a setting is saved, the app uses its built-in text.

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "Anyone reads site settings" on public.site_settings;
create policy "Anyone reads site settings"
  on public.site_settings for select to anon, authenticated
  using (true);

drop policy if exists "Admins change site settings" on public.site_settings;
create policy "Admins change site settings"
  on public.site_settings for all to authenticated
  using (public.is_voiced_admin())
  with check (public.is_voiced_admin());
