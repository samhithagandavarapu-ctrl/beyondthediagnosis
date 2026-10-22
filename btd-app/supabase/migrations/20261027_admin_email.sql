-- Only withvoiced@gmail.com is a Voiced admin. voiced@gmail.com was listed
-- too, but it isn't Voiced's address: whoever owns it could have signed up
-- and read every message and attachment.
--
-- Run once in Supabase → SQL Editor. Safe to run again. Keep this list the
-- same as DEFAULT_ADMIN_EMAILS in src/context/AuthContext.tsx (plus anything
-- in VITE_ADMIN_EMAILS).

create or replace function public.is_voiced_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'withvoiced@gmail.com'
  );
$$;
