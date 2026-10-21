-- Security tests for family accounts (supabase/migrations/20261021_family_accounts.sql).
--
-- For a throwaway local Postgres 16, NOT the real project: it creates fake
-- users. Set up a stand-in for Supabase's auth schema, run the calendar and
-- family migrations, then this file:
--
--   create schema auth;
--   create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
--   create table public.profiles (id uuid primary key references auth.users on delete cascade, full_name text, username text);
--   create function auth.uid() returns uuid language sql stable as
--     $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
--   create role authenticated;
--   grant usage on schema public, auth to authenticated;
--   grant select, insert, update, delete on all tables in schema public to authenticated;
--
-- Every "ERROR" printed is a refusal the test expects; each "==" line says
-- what should happen.

\set QUIET on
\set ON_ERROR_STOP off
-- People: A parent, T teen (15), K kid (10), B second parent, C third adult, X stranger.
insert into auth.users values
 ('a0000000-0000-4000-8000-000000000001'),('70000000-0000-4000-8000-000000000001'),
 ('c0000000-0000-4000-8000-000000000001'),('b0000000-0000-4000-8000-000000000001'),
 ('cc000000-0000-4000-8000-000000000001'),('e0000000-0000-4000-8000-000000000001') on conflict do nothing;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u::text, false); end $$;
set role authenticated;

-- Ages
select pg_temp.as_user('70000000-0000-4000-8000-000000000001'); insert into account_ages (birth_year) values (extract(year from now())::int - 15);
select pg_temp.as_user('c0000000-0000-4000-8000-000000000001'); insert into account_ages (birth_year) values (extract(year from now())::int - 10);
\echo == 1. A 10-year-old can’t save to their account before a parent links
insert into calendar_entries (entry_date, category) values (current_date, 'mood');
\echo == 1b. ...and can’t change their birth year to get around it
update account_ages set birth_year = 1990; select '   birth year still: ' || (extract(year from now())::int - birth_year) || ' years old' from account_ages;

\echo == 2. Parent A makes a code; teen T enters it
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001'); select create_family_invite('caregiver', false) as code \gset
select pg_temp.as_user('70000000-0000-4000-8000-000000000001'); select '   linked: ' || (accept_family_invite(:'code')).caregiver_id;
\echo == 2b. The same code can’t be used twice
select pg_temp.as_user('e0000000-0000-4000-8000-000000000001'); select accept_family_invite(:'code');
\echo == 2c. Parent A got a "linked" notice
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001'); select '   notices for A: ' || string_agg(kind, ',') from family_events;

\echo == 3. Teen logs one shared and one "Just for me" entry; parent sees only the shared one
select pg_temp.as_user('70000000-0000-4000-8000-000000000001');
insert into calendar_entries (id, entry_date, category, note) values ('11111111-0000-4000-8000-000000000001', current_date, 'sleep', 'shared');
insert into calendar_entries (id, entry_date, category, private, note) values ('11111111-0000-4000-8000-000000000002', current_date, 'period', true, 'just for me');
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001'); select '   parent sees: ' || string_agg(note, ',') from calendar_entries where user_id = '70000000-0000-4000-8000-000000000001';
\echo == 3b. "Something scary happened" can’t be Just for me
select pg_temp.as_user('70000000-0000-4000-8000-000000000001'); insert into calendar_entries (entry_date, category, private) values (current_date, 'event', true);

\echo == 4. Parent adds an entry to the teen’s calendar (as caregiver)
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001');
insert into calendar_entries (id, user_id, entry_date, category, reported_by, note) values ('22222222-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', current_date, 'behavior', 'caregiver', 'from mom');
select '   added: ' || count(*) from calendar_entries where id = '22222222-0000-4000-8000-000000000001';
\echo == 4b. ...but not one marked Just for me
insert into calendar_entries (user_id, entry_date, category, reported_by, private) values ('70000000-0000-4000-8000-000000000001', current_date, 'mood', 'caregiver', true);
\echo == 4c. ...and not one pretending the teen said it
insert into calendar_entries (user_id, entry_date, category, reported_by) values ('70000000-0000-4000-8000-000000000001', current_date, 'mood', 'self');
\echo == 4d. ...and not one written as someone else
insert into calendar_entries (user_id, entry_date, category, reported_by, logged_by) values ('70000000-0000-4000-8000-000000000001', current_date, 'mood', 'caregiver', '70000000-0000-4000-8000-000000000001');

\echo == 5. Parent can’t change or delete the teen’s own entry
update calendar_entries set note = 'changed by mom' where id = '11111111-0000-4000-8000-000000000001';
delete from calendar_entries where id = '11111111-0000-4000-8000-000000000001';
select pg_temp.as_user('70000000-0000-4000-8000-000000000001'); select '   teen entry still says: ' || note from calendar_entries where id = '11111111-0000-4000-8000-000000000001';
\echo == 5b. Parent can change their own entry, but not move it or make it private
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001');
update calendar_entries set note = 'from mom, edited' where id = '22222222-0000-4000-8000-000000000001';
update calendar_entries set private = true where id = '22222222-0000-4000-8000-000000000001';
update calendar_entries set user_id = 'a0000000-0000-4000-8000-000000000001' where id = '22222222-0000-4000-8000-000000000001';
select '   parent entry now says: ' || note || ', private: ' || private from calendar_entries where id = '22222222-0000-4000-8000-000000000001';
\echo == 5c. The teen can’t take over the parent’s entry either
select pg_temp.as_user('70000000-0000-4000-8000-000000000001');
update calendar_entries set logged_by = '70000000-0000-4000-8000-000000000001' where id = '22222222-0000-4000-8000-000000000001';

\echo == 6. A stranger sees nothing and can’t add
select pg_temp.as_user('e0000000-0000-4000-8000-000000000001');
select '   stranger sees: ' || count(*) from calendar_entries; select '   stranger sees links: ' || count(*) from family_links;
insert into calendar_entries (user_id, entry_date, category, reported_by, logged_by) values ('70000000-0000-4000-8000-000000000001', current_date, 'mood', 'caregiver', 'e0000000-0000-4000-8000-000000000001');
\echo == 6b. A stranger can’t call the helper to learn about others, or unlink others
select '   stranger is caregiver of teen: ' || is_caregiver_of('70000000-0000-4000-8000-000000000001');
select unlink_family((select id from family_links limit 1));
\echo == 6c. A parent’s "delete everything" only touches their own calendar
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001');
insert into calendar_entries (entry_date, category) values (current_date, 'sleep');
delete from calendar_entries where user_id = 'a0000000-0000-4000-8000-000000000001';
select '   teen calendar rows still visible to parent: ' || count(*) from calendar_entries where user_id = '70000000-0000-4000-8000-000000000001';

\echo == 7. Under-13: kid K can’t use an ordinary code
select pg_temp.as_user('cc000000-0000-4000-8000-000000000001'); select create_family_invite('caregiver', false) as ccode \gset
select pg_temp.as_user('c0000000-0000-4000-8000-000000000001'); select accept_family_invite(:'ccode');
\echo == 7b. Kid K can’t make a code of their own before consent
select create_family_invite('child', false);
\echo == 7c. Parent A’s under-13 code works, records consent, and K can now save
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001'); select create_family_invite('caregiver', true) as kcode \gset
select pg_temp.as_user('c0000000-0000-4000-8000-000000000001'); select '   consent recorded: ' || ((accept_family_invite(:'kcode')).consent_at is not null);
insert into calendar_entries (entry_date, category) values (current_date, 'mood'); select '   kid can save: ' || count(*) from calendar_entries where user_id = 'c0000000-0000-4000-8000-000000000001';
\echo == 7d. A teen or child can’t make an under-13 code
select create_family_invite('child', true);

\echo == 8. Kid adds a second grown-up (B) with their own code; a third (C) is refused
select create_family_invite('child', false) as k2 \gset
select pg_temp.as_user('b0000000-0000-4000-8000-000000000001'); select '   B linked: ' || ((accept_family_invite(:'k2')).child_id is not null);
select pg_temp.as_user('c0000000-0000-4000-8000-000000000001'); select create_family_invite('child', false) as k3 \gset
select pg_temp.as_user('cc000000-0000-4000-8000-000000000001'); select accept_family_invite(:'k3');
\echo == 8b. Own code, expired code, and linking back the other way are refused
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001'); select create_family_invite('caregiver', false) as own \gset
select accept_family_invite(:'own');
reset role; update family_invites set expires_at = now() - interval '1 day' where code = :'own'; set role authenticated;
select pg_temp.as_user('e0000000-0000-4000-8000-000000000001'); select accept_family_invite(:'own');
select pg_temp.as_user('70000000-0000-4000-8000-000000000001'); select create_family_invite('caregiver', false) as back \gset
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001'); select accept_family_invite(:'back');

\echo == 9. Teen unlinks parent A: A loses access at once, is told, and A’s entry stays
select pg_temp.as_user('70000000-0000-4000-8000-000000000001');
select unlink_family((select id from family_links where child_id = '70000000-0000-4000-8000-000000000001'));
select '   teen still has mom''s entry: ' || count(*) from calendar_entries where id = '22222222-0000-4000-8000-000000000001';
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001');
select '   A now sees teen rows: ' || count(*) from calendar_entries where user_id = '70000000-0000-4000-8000-000000000001';
select '   A notices: ' || string_agg(kind, ',' order by created_at) from family_events;
\echo == 9b. ...and can’t edit their old entry there any more
update calendar_entries set note = 'after unlink' where id = '22222222-0000-4000-8000-000000000001';
select pg_temp.as_user('70000000-0000-4000-8000-000000000001'); select '   still says: ' || note from calendar_entries where id = '22222222-0000-4000-8000-000000000001';
\echo == 10. The old single-owner behaviour still works (teen edits and deletes own)
update calendar_entries set note = 'teen edit' where id = '11111111-0000-4000-8000-000000000001';
delete from calendar_entries where id = '22222222-0000-4000-8000-000000000001';
select '   teen rows: ' || string_agg(note, ',') from calendar_entries where user_id = '70000000-0000-4000-8000-000000000001';
reset role;

\echo == 11. Parent B adds a note to kid K’s calendar; K can’t clear who wrote it
select pg_temp.as_user('b0000000-0000-4000-8000-000000000001');
insert into calendar_entries (id, user_id, entry_date, category, reported_by, note)
  values ('33333333-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', current_date, 'mood', 'caregiver', 'from B');
select pg_temp.as_user('c0000000-0000-4000-8000-000000000001');
update calendar_entries set logged_by = null where id = '33333333-0000-4000-8000-000000000001';
\echo == 11b. B deletes their account: it goes through, the note stays in K’s calendar with no writer, and K is told
reset role;
delete from auth.users where id = 'b0000000-0000-4000-8000-000000000001';
select '   B gone: ' || (count(*) = 0) from auth.users where id = 'b0000000-0000-4000-8000-000000000001';
select '   note kept, writer cleared: ' || note || ', ' || coalesce(logged_by::text, 'none') from calendar_entries where id = '33333333-0000-4000-8000-000000000001';
select pg_temp.as_user('c0000000-0000-4000-8000-000000000001'); set role authenticated;
select '   K notices: ' || string_agg(kind || ' by ' || coalesce(actor_name, '?'), ',' order by created_at) from family_events;
reset role;
