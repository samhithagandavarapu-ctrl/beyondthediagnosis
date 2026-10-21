-- Security tests for one profile per person
-- (supabase/migrations/20261025_one_profile_per_person.sql).
--
-- For a throwaway local Postgres 16, NOT the real project: it creates fake
-- users. Set up the same stand-in for Supabase's auth schema as
-- family_accounts_test.sql, run every migration in supabase/migrations in
-- order plus supabase/appointment-drafts.sql and supabase/me-board.sql, grant
-- the tables to "authenticated", then run this file.
--
-- Every "ERROR" printed is a refusal the test expects; each "==" line says
-- what should happen.

\set QUIET on
\set ON_ERROR_STOP off
-- P parent, Q second parent, K kid (10, profile made by P), T teen (15,
-- profile made by P), S adult self-advocate who signed up alone, X stranger.
-- K and T start with no sign-in of their own (a @people.voiced.invalid
-- address), the way the server makes a child's profile.
insert into auth.users (id, email) values
 ('a0000000-0000-4000-8000-000000000001', 'parent@example.com'),
 ('b0000000-0000-4000-8000-000000000001', 'parent2@example.com'),
 ('c0000000-0000-4000-8000-000000000001', 'p-c0@people.voiced.invalid'),
 ('70000000-0000-4000-8000-000000000001', 'p-70@people.voiced.invalid'),
 ('50000000-0000-4000-8000-000000000001', 'self@example.com'),
 ('e0000000-0000-4000-8000-000000000001', 'stranger@example.com')
on conflict do nothing;
insert into account_ages (user_id, birth_year) values
 ('c0000000-0000-4000-8000-000000000001', extract(year from now())::int - 10),
 ('70000000-0000-4000-8000-000000000001', extract(year from now())::int - 15);
insert into family_links (caregiver_id, child_id, consent_at, relation) values
 ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', now(), 'Mom'),
 ('a0000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', now(), 'Mom');

create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u::text, false); end $$;
set role authenticated;

\echo == 1. The parent sees both children, with birth year and "no login yet"
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001');
select '   ' || name || ' · ' || (extract(year from now())::int - birth_year) || ' · login ' || login || ' · ' || relation
from family_people() order by birth_year;

\echo == 2. The parent fills in the kid’s Me board and a draft; the kid sees both once signed in
insert into me_boards (user_id, answers) values ('c0000000-0000-4000-8000-000000000001', '{"usual":{"picks":["joke"],"words":""}}');
insert into appointment_drafts (id, user_id, form) values ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', '{}');
select pg_temp.as_user('c0000000-0000-4000-8000-000000000001');
select '   kid sees board: ' || count(*) from me_boards;
select '   kid sees drafts: ' || count(*) from appointment_drafts;
\echo == 2b. The kid adds a draft; the parent sees it
insert into appointment_drafts (id, form) values ('d0000000-0000-4000-8000-000000000002', '{}');
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001');
select '   parent sees kid drafts: ' || count(*) from appointment_drafts where user_id = 'c0000000-0000-4000-8000-000000000001';

\echo == 3. A stranger sees none of it, and can’t add to it
select pg_temp.as_user('e0000000-0000-4000-8000-000000000001');
select '   stranger sees boards: ' || count(*) || ', drafts: ' || (select count(*) from appointment_drafts) from me_boards;
insert into appointment_drafts (id, user_id, form) values (gen_random_uuid(), 'c0000000-0000-4000-8000-000000000001', '{}');
update me_boards set answers = '{}' where user_id = 'c0000000-0000-4000-8000-000000000001';
select pg_temp.as_user('c0000000-0000-4000-8000-000000000001');
select '   board untouched: ' || (answers ? 'usual') from me_boards;

\echo == 4. "Just for me" stays hidden from the parent
select pg_temp.as_user('c0000000-0000-4000-8000-000000000001');
insert into calendar_entries (entry_date, category, note) values (current_date, 'sleep', 'shared');
insert into calendar_entries (entry_date, category, private, note) values (current_date, 'mood', true, 'just for me');
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001');
select '   parent sees: ' || string_agg(note, ',') from calendar_entries where user_id = 'c0000000-0000-4000-8000-000000000001';

\echo == 5. Symptom buttons: the parent can add one for the kid; a stranger can’t
insert into custom_symptoms (user_id, label, icon) values ('c0000000-0000-4000-8000-000000000001', 'Ear pulling', 'ear');
select pg_temp.as_user('e0000000-0000-4000-8000-000000000001');
insert into custom_symptoms (user_id, label, icon) values ('c0000000-0000-4000-8000-000000000001', 'Nope', 'ear');
select pg_temp.as_user('c0000000-0000-4000-8000-000000000001');
select '   kid sees symptoms: ' || string_agg(label, ',') from custom_symptoms;

\echo == 6. Teen invite: refused for the 10-year-old, works for the 15-year-old, and only for their parent
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001');
select create_profile_claim('c0000000-0000-4000-8000-000000000001');
select '   teen code made: ' || (length(create_profile_claim('70000000-0000-4000-8000-000000000001')) = 6);
select pg_temp.as_user('e0000000-0000-4000-8000-000000000001');
select create_profile_claim('70000000-0000-4000-8000-000000000001');
select '   stranger sees claim codes: ' || count(*) from profile_claims;

\echo == 7. Parents can’t make "link my child’s own account" codes any more
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001');
select create_family_invite('caregiver', false);

\echo == 8. Once the kid has a username login, it shows; they can’t invite adults themselves
reset role;
update auth.users set email = 'maya@kids.voiced.invalid' where id = 'c0000000-0000-4000-8000-000000000001';
set role authenticated;
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001');
select '   kid login: ' || login || ' as ' || username from family_people() where person_id = 'c0000000-0000-4000-8000-000000000001';
select pg_temp.as_user('c0000000-0000-4000-8000-000000000001');
select create_family_invite('child', false);

\echo == 9. The only grown-up can’t unlink a child who has no email login (it would leave the profile with nobody)
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001');
select unlink_family((select link_id from family_people() where person_id = 'c0000000-0000-4000-8000-000000000001'));
select '   still linked: ' || count(*) from family_people() where person_id = 'c0000000-0000-4000-8000-000000000001';

\echo == 10. A self-advocate who signed up alone invites a grown-up; the grown-up sees their board
select pg_temp.as_user('50000000-0000-4000-8000-000000000001');
insert into me_boards (answers) values ('{"me":{"picks":["music"],"words":""}}');
select create_family_invite('child', false) as code \gset
select pg_temp.as_user('b0000000-0000-4000-8000-000000000001');
select '   linked: ' || ((accept_family_invite(:'code')).child_id = '50000000-0000-4000-8000-000000000001');
select '   grown-up sees board: ' || count(*) from me_boards where user_id = '50000000-0000-4000-8000-000000000001';
\echo == 10b. ...and the self-advocate can unlink them (they have their own email login)
select pg_temp.as_user('50000000-0000-4000-8000-000000000001');
select unlink_family((select link_id from family_people() limit 1));
select pg_temp.as_user('b0000000-0000-4000-8000-000000000001');
select '   grown-up sees board after unlink: ' || count(*) from me_boards where user_id = '50000000-0000-4000-8000-000000000001';
