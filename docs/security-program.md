# Voiced written information security program

Last reviewed: October 22, 2026 · Next review due: October 2027

This is Voiced's written information security program. The amended COPPA Rule
(16 CFR 312.8) requires one for any service that collects personal
information from children under 13, and Washington's My Health My Data Act
requires "reasonable" security for consumer health data. It describes what
Voiced actually does today. If something here stops being true, fix the
practice or change this document. Never leave the two out of step.

## 1. Who is responsible

| Role | Person | Contact |
| --- | --- | --- |
| Security coordinator (runs this program, handles incidents) | Samhitha Gandavarapu | withvoiced@gmail.com |
| Backup, if the coordinator can't be reached | None yet | |

The coordinator does the yearly review (section 7), decides who gets access
(section 3), and leads the incident response (section 6).

## 2. What we protect, and where it lives

| Information | Where | Who can read it |
| --- | --- | --- |
| Sign-ins (email, phone, child usernames, password hashes) | Supabase Auth | Supabase; the server with the service-role key |
| Profiles, birth year, agreements (terms, health consent, parent consent) | Supabase (`profiles`, `account_ages`, auth user metadata) | The person themselves; linked grown-ups see name and birth year only |
| Health information: calendar entries, check-ins, Me board, Appointment Prep drafts | Supabase (`calendar_entries`, `me_boards`, `appointment_drafts`, …) | The person and their linked grown-ups (not "Just for me" entries). **No admin access.** |
| AI Advocate chats | Supabase (`assistant_chats`) | The person only. Sent to Anthropic to get each reply. Children's logins can't use it. |
| Messages to the team, attachments | Supabase (`messages`, private `message-attachments` bucket) | The person and Voiced admins. Attachments only through 1-hour signed links. |
| Stories | Supabase (`stories`) | Admins until published; public once published |
| Device-only data (voice recordings, practice progress, signed-out data) | The person's browser | Only that browser |

Who can read what is enforced by row-level security in the database
(`btd-app/supabase/*.sql` and `btd-app/supabase/migrations/`), not only by
the app. Any new table holding personal information must have row-level
security turned on, with policies, in the same change that adds it.

## 3. Access: who holds the keys

- **Admins** are only the emails listed in `public.is_voiced_admin()`
  (`btd-app/supabase/rejections-and-messages.sql`) and in the app
  (`DEFAULT_ADMIN_EMAILS` in `btd-app/src/context/AuthContext.tsx`, plus
  `VITE_ADMIN_EMAILS`). Keep the lists the same. Every admin address must
  belong to someone on the team, with two-step verification turned on.
- **Supabase dashboard, Vercel, GitHub, Anthropic console:** only the
  coordinator (and the backup, if any), each with two-step verification.
  Remove anyone who leaves the team on the same day.
- **Secret keys** (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`) live only
  in Vercel's environment variables and local `.env` files that are never
  committed. They are never put in `VITE_` variables, because those are sent
  to every browser. If a key may have leaked, rotate it at once (section 6).
- Nobody reads people's health information for any reason. There's no admin
  access to it in the database, and none is to be added.

## 4. Safeguards in place

- HTTPS everywhere (Vercel). Data encrypted at rest by Supabase.
- Row-level security on every table with personal information (section 2).
- Children 12 and under sign in with a username their parent makes. No child's
  email is collected. A parent's consent (who, when, which notice) is recorded
  before a child's first login (`childLogin` in `btd-app/api/_lib/family.js`).
- Children's logins can't use the AI features, send messages, or send stories,
  so nothing they type leaves their profile.
- Health information is only saved to an account after that person's separate
  health-data consent (`HealthConsentGate`, `MyVoiceContext`).
- Account deletion removes the sign-in and everything saved to it
  (`btd-app/api/_lib/account.js`).
- The AI Advocate's system prompt forbids diagnosis and medication advice, and
  flags emergencies (`btd-app/api/_lib/claude.js`).

## 5. Service providers

| Provider | What for | What to check yearly |
| --- | --- | --- |
| Supabase | Database, sign-in, file storage | Their security and data processing terms still apply; backups and retention |
| Vercel | Hosting and server functions | Same |
| Anthropic | AI Advocate and "Refine with AI" (grown-ups only) | Commercial terms: no training on our data; their retention period; their rules for products serving minors |

Before adding any new provider that would receive personal information: make
sure it has written terms that protect the data, update the Privacy Policy,
and, if children's or health information goes to it, ask whether new consent
is needed.

## 6. If something goes wrong (incident response)

An incident is anyone seeing, changing, or deleting information they
shouldn't, a leaked key, or a lost device signed in to an admin account.

1. **Contain (same day):** rotate any exposed key (Supabase service-role key,
   Anthropic key), sign out affected sessions, close the hole.
2. **Write it down:** what happened, when it was found, what information,
   whose, how many people.
3. **Tell people (as soon as possible, and within 60 days of finding it):**
   affected people, the parents of any children affected, and, where the law
   requires it, regulators. The FTC's Health Breach Notification Rule applies
   to health apps like Voiced. For 500 or more people, the FTC must be told at
   the same time. Get legal advice before sending notices if at all possible.
4. **Learn:** fix the cause, and update this document.

## 7. Yearly review (every October)

- [ ] Re-read this document. Update anything that's no longer true.
- [ ] Check every admin email belongs to a current team member with two-step
      verification.
- [ ] Check who has access to Supabase, Vercel, GitHub and Anthropic. Remove
      anyone who doesn't need it.
- [ ] Rotate the Supabase service-role key and the Anthropic key.
- [ ] Confirm every table with personal information has row-level security
      (Supabase dashboard → Database → Tables).
- [ ] **Retention:** delete accounts and children's profiles nobody has signed
      in to for 2 years (email first where there's an address), and delete
      stories that weren't published. This is promised in the Privacy Policy.
- [ ] Check the providers in section 5.
- [ ] Re-read the Privacy Policy and Terms against what the app does.
- [ ] Update "Last reviewed" at the top.

## Not done yet

These are known gaps, written down so they don't get lost:

- **Parental consent method.** Voiced records a parent's consent in the app.
  The COPPA Rule's "email plus" method also needs a confirmation sent to the
  parent afterwards (for example a follow-up email). That needs an email
  service (such as Resend), which Voiced doesn't have yet.
- **Teens (13 to 17) and the AI Advocate.** Anthropic's rules for products
  used by anyone under 18 ask for age-appropriate safeguards. Decide whether
  teens' logins should get the AI.
- **Legal review.** Have a lawyer review the Privacy Policy, Terms, and this
  program, especially whether COPPA applies to Voiced and whether the consent
  method is enough.
