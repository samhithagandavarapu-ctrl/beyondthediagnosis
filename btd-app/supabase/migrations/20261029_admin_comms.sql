-- Admin communication tools: editing the site's words, and broadcasts.
--
-- Run once in Supabase → SQL Editor, after 20261028_site_settings.sql.
-- Safe to run again. Needs public.is_voiced_admin().
--
-- site_content: words an admin changed on the site. Each row says "where the
-- site shows <original>, show <replacement> instead", on one page (path) or
-- everywhere (path = '*'). Everyone reads them; only admins change them.
--
-- broadcasts: messages an admin sends to everyone. Signed-in people see them
-- in Notifications; a broadcast can also pop up once for every visitor.
-- Everyone reads the ones that are on; only admins write them.

create table if not exists public.site_content (
  original text not null,
  path text not null default '*',
  replacement text not null,
  updated_at timestamptz not null default now(),
  primary key (original, path)
);

alter table public.site_content enable row level security;

drop policy if exists "Anyone reads site content" on public.site_content;
create policy "Anyone reads site content"
  on public.site_content for select to anon, authenticated
  using (true);

drop policy if exists "Admins change site content" on public.site_content;
create policy "Admins change site content"
  on public.site_content for all to authenticated
  using (public.is_voiced_admin())
  with check (public.is_voiced_admin());

create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 2000),
  link_url text,
  link_label text,
  -- Also show it once, as a pop-up, to everyone who visits.
  popup boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.broadcasts enable row level security;

drop policy if exists "Anyone reads live broadcasts" on public.broadcasts;
create policy "Anyone reads live broadcasts"
  on public.broadcasts for select to anon, authenticated
  using (active or public.is_voiced_admin());

drop policy if exists "Admins manage broadcasts" on public.broadcasts;
create policy "Admins manage broadcasts"
  on public.broadcasts for all to authenticated
  using (public.is_voiced_admin())
  with check (public.is_voiced_admin());
