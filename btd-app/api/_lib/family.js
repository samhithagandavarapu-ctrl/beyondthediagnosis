import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";

/** Family profiles: one profile per person, and the logins that connect to
 *  it. Shared by the Vercel function (api/family.js) and the local dev server.
 *
 *  These need Supabase's service-role key (to make a sign-in for a child, or
 *  change one), so every action checks first that the caller is who they say
 *  (their own access token) and is allowed: a parent only ever acts on a
 *  child they're linked to. The database rules (supabase/migrations/
 *  20261025_one_profile_per_person.sql) decide who can read what.
 *
 *  A profile a parent makes has a sign-in nobody can use until it gets a
 *  login: an @people.voiced.invalid address and a random password that's
 *  never shown. A child's username login is <username>@kids.voiced.invalid.
 *  Neither address is ever emailed. */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const PROFILE_DOMAIN = "people.voiced.invalid";
export const USERNAME_DOMAIN = "kids.voiced.invalid";
const MAX_CHILDREN = 10;

const thisYear = () => new Date().getFullYear();
/** Might still be 12 this year: born no more than 13 years ago. Counted on
 *  the safe side, so a child turning 13 this year gets a parent-made login. */
export const getsUsernameLogin = (birthYear) => thisYear() - birthYear <= 13;

export function loginKind(email) {
  if (!email || email.endsWith(`@${PROFILE_DOMAIN}`)) return "none";
  if (email.endsWith(`@${USERNAME_DOMAIN}`)) return "username";
  return "email";
}

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const fail = (status, error) => ({ status, error });

/** Remove everything of one person's, then their sign-in. Rows cascade with
 *  the sign-in; these are cleared too in case a table was made without that. */
async function deletePerson(admin, id) {
  for (const [table, column] of [
    ["profiles", "id"],
    ["appointment_drafts", "user_id"],
    ["me_boards", "user_id"],
  ]) {
    const { error } = await admin.from(table).delete().eq(column, id);
    if (error) console.error(`Couldn't delete from ${table}:`, error.message);
  }
  const { error } = await admin.auth.admin.deleteUser(id);
  return error;
}

/** When a parent deletes their account: the children's profiles only they
 *  looked after, with no login of their own, go too (nobody else could ever
 *  reach them). A child with their own email login, or another grown-up,
 *  keeps theirs. */
export async function removeChildrenOnlyIHad(admin, parentId) {
  const { data: links } = await admin.from("family_links").select("child_id").eq("caregiver_id", parentId);
  for (const { child_id } of links ?? []) {
    const { count } = await admin
      .from("family_links")
      .select("id", { count: "exact", head: true })
      .eq("child_id", child_id)
      .neq("caregiver_id", parentId);
    if (count) continue;
    const { data } = await admin.auth.admin.getUserById(child_id);
    if (loginKind(data?.user?.email) === "email") continue;
    const error = await deletePerson(admin, child_id);
    if (error) console.error("Couldn't delete a child's profile:", error.message);
  }
}

async function linkedChild(admin, parentId, childId) {
  if (typeof childId !== "string") return null;
  const { data } = await admin
    .from("family_links")
    .select("id")
    .eq("caregiver_id", parentId)
    .eq("child_id", childId)
    .maybeSingle();
  if (!data) return null;
  const [{ data: user }, { data: age }] = await Promise.all([
    admin.auth.admin.getUserById(childId),
    admin.from("account_ages").select("birth_year").eq("user_id", childId).maybeSingle(),
  ]);
  if (!user?.user) return null;
  return { user: user.user, birthYear: age?.birth_year ?? null };
}

// ---- Actions ----

async function addChild(admin, parent, body) {
  const name = String(body.name ?? "").trim();
  const birthYear = Number(body.birthYear);
  const relation = String(body.relation ?? "").trim().slice(0, 40) || null;
  if (!name || name.length > 40) return fail(400, "Type their first name or nickname (up to 40 letters).");
  if (!Number.isInteger(birthYear) || birthYear > thisYear() || birthYear < thisYear() - 100) {
    return fail(400, "Choose the year they were born.");
  }
  const { count } = await admin
    .from("family_links")
    .select("id", { count: "exact", head: true })
    .eq("caregiver_id", parent.id);
  if ((count ?? 0) >= MAX_CHILDREN) return fail(400, `You can add up to ${MAX_CHILDREN} people.`);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: `p-${randomUUID()}@${PROFILE_DOMAIN}`,
    password: randomBytes(32).toString("hex"),
    email_confirm: true,
    user_metadata: { preferred_name: name, profile_only: true },
  });
  if (createError || !created?.user) {
    console.error("Couldn't make a child's profile:", createError?.message);
    return fail(500, "Couldn't add them just now. Please try again.");
  }
  const childId = created.user.id;

  // Their profile: a self-advocate's space, with nothing to set up when they
  // later sign in. Older databases may not have the setup columns yet.
  let { error } = await admin
    .from("profiles")
    .upsert({ id: childId, full_name: name, user_role: "self", setup_status: "done" }, { onConflict: "id" });
  if (error) ({ error } = await admin.from("profiles").upsert({ id: childId, full_name: name }, { onConflict: "id" }));
  if (!error) ({ error } = await admin.from("account_ages").insert({ user_id: childId, birth_year: birthYear }));
  if (!error) {
    // The parent adding the child is the parent's consent (for under 13).
    const link = { caregiver_id: parent.id, child_id: childId, consent_at: new Date().toISOString(), relation };
    ({ error } = await admin.from("family_links").insert(link));
    if (error && /relation/.test(error.message)) {
      delete link.relation;
      ({ error } = await admin.from("family_links").insert(link));
    }
  }
  if (error) {
    console.error("Couldn't finish a child's profile:", error.message);
    await admin.auth.admin.deleteUser(childId);
    return fail(500, "Couldn't add them just now. Has supabase/migrations/20261025_one_profile_per_person.sql been run?");
  }

  if (body.moveMine) await moveMine(admin, parent, { childId });
  return { status: 200, data: { childId } };
}

/** Before profiles, a parent's notes about their child were kept as the
 *  parent's own: the Me board, drafts, calendar and symptom buttons. Move
 *  them onto the child's profile. A board the child already filled in is
 *  kept, not overwritten. */
async function moveMine(admin, parent, body) {
  const child = await linkedChild(admin, parent.id, body.childId);
  if (!child) return fail(403, "That isn't one of your children.");
  const childId = child.user.id;
  const moved = { board: false, drafts: 0, entries: 0 };

  const [{ data: mine }, { data: theirs }] = await Promise.all([
    admin.from("me_boards").select("*").eq("user_id", parent.id).maybeSingle(),
    admin.from("me_boards").select("answers").eq("user_id", childId).maybeSingle(),
  ]);
  const theirsFilled = theirs && Object.keys(theirs.answers ?? {}).length > 0;
  if (mine && !theirsFilled) {
    const { error } = await admin
      .from("me_boards")
      .upsert({ ...mine, user_id: childId, about_name: "", relation: "" }, { onConflict: "user_id" });
    if (!error) {
      await admin.from("me_boards").delete().eq("user_id", parent.id);
      moved.board = true;
    }
  }

  const { data: drafts } = await admin.from("appointment_drafts").update({ user_id: childId }).eq("user_id", parent.id).select("id");
  moved.drafts = drafts?.length ?? 0;
  await admin.from("custom_symptoms").update({ user_id: childId }).eq("user_id", parent.id);

  // Calendar entries can't change owner in place (the database stops that),
  // so each moves as a copy, marked as written by the parent.
  const { data: entries } = await admin.from("calendar_entries").select("*").eq("user_id", parent.id);
  if (entries?.length) {
    const copies = entries.map((e) => ({
      ...e,
      user_id: childId,
      logged_by: parent.id,
      private: false,
      reported_by: e.reported_by === "self" ? "caregiver" : e.reported_by,
    }));
    const ids = entries.map((e) => e.id);
    const { error: delError } = await admin.from("calendar_entries").delete().in("id", ids);
    if (!delError) {
      const { error: insError } = await admin.from("calendar_entries").insert(copies);
      if (insError) {
        console.error("Couldn't move calendar entries; putting them back:", insError.message);
        await admin.from("calendar_entries").insert(entries);
      } else moved.entries = copies.length;
    }
  }
  return { status: 200, data: moved };
}

const USERNAME = /^[a-z0-9][a-z0-9._-]{2,23}$/;

/** A username and password a parent makes for a child 12 or under (or one
 *  who might still be), or a new password for one they made before. */
async function childLogin(admin, parent, body) {
  const child = await linkedChild(admin, parent.id, body.childId);
  if (!child) return fail(403, "That isn't one of your children.");
  const kind = loginKind(child.user.email);
  if (kind === "email") return fail(400, "They have their own login. They can reset their password from the sign-in page.");
  if (child.birthYear !== null && !getsUsernameLogin(child.birthYear)) {
    return fail(400, "At 13 and older, invite them instead, so they use their own email.");
  }
  const password = String(body.password ?? "");
  if (password.length < 8) return fail(400, "Make the password at least 8 characters.");
  const update = { password };
  if (kind === "none" || body.username) {
    const username = String(body.username ?? "").trim().toLowerCase();
    if (!USERNAME.test(username)) {
      return fail(400, "Usernames are 3 to 24 letters or numbers (dots, dashes and underscores are OK), starting with a letter or number.");
    }
    update.email = `${username}@${USERNAME_DOMAIN}`;
    update.email_confirm = true;
  }
  const { error } = await admin.auth.admin.updateUserById(child.user.id, update);
  if (error) {
    if (/already|exists|registered/i.test(error.message)) return fail(400, "That username is taken. Try another.");
    console.error("Couldn't set a child's login:", error.message);
    return fail(500, "Couldn't save that login. Please try again.");
  }
  return { status: 200, data: { username: (update.email ?? child.user.email).split("@")[0] } };
}

/** A teen uses their invite code: their own email and password become the
 *  sign-in for the profile their parent made. Nothing is entered twice. */
async function claim(admin, body) {
  const code = String(body.code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (code.length !== 6) return fail(400, "Type the 6-letter code from your invite.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.endsWith(".invalid")) return fail(400, "Type your email address.");
  if (password.length < 8) return fail(400, "Make your password at least 8 characters.");

  const { data: row } = await admin.from("profile_claims").select("*").eq("code", code).maybeSingle();
  if (!row || row.used_at || new Date(row.expires_at) < new Date()) {
    return fail(400, "That invite doesn't work. Invites last 7 days and work once — ask for a new one.");
  }
  const { data: person } = await admin.auth.admin.getUserById(row.person_id);
  if (!person?.user || loginKind(person.user.email) !== "none") {
    return fail(400, "This profile already has a login. Sign in instead.");
  }
  const { error } = await admin.auth.admin.updateUserById(row.person_id, {
    email,
    password,
    email_confirm: true,
    user_metadata: { ...(person.user.user_metadata ?? {}), profile_only: false },
  });
  if (error) {
    if (/already|exists|registered/i.test(error.message)) {
      return fail(400, "That email already has a Voiced account. Use a different email, or ask your grown-up for help.");
    }
    console.error("Couldn't connect a teen's login:", error.message);
    return fail(500, "Couldn't set up your login. Please try again.");
  }
  await admin.from("profile_claims").update({ used_at: new Date().toISOString() }).eq("id", row.id);
  return { status: 200, data: { email } };
}

/** Take a child off a parent's account. With another grown-up linked, only
 *  this parent's link goes. Otherwise the whole profile and everything in it
 *  is deleted — unless the child has their own email login (then unlink). */
async function removeChild(admin, parent, body) {
  const child = await linkedChild(admin, parent.id, body.childId);
  if (!child) return fail(403, "That isn't one of your children.");
  const { count } = await admin
    .from("family_links")
    .select("id", { count: "exact", head: true })
    .eq("child_id", child.user.id)
    .neq("caregiver_id", parent.id);
  if (count) {
    await admin.from("family_links").delete().eq("caregiver_id", parent.id).eq("child_id", child.user.id);
    return { status: 200, data: { removed: "link" } };
  }
  if (loginKind(child.user.email) === "email") {
    return fail(400, "They have their own login, so their profile is theirs to keep. Unlink instead.");
  }
  const error = await deletePerson(admin, child.user.id);
  if (error) return fail(500, "Couldn't remove the profile. Please try again.");
  return { status: 200, data: { removed: "profile" } };
}

export async function familyAction(authorizationHeader, body) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error(!SUPABASE_URL ? "No SUPABASE_URL or VITE_SUPABASE_URL set." : "No SUPABASE_SERVICE_ROLE_KEY set.");
    return fail(500, "Family profiles aren't set up on this site yet. Email withvoiced@gmail.com and we'll help.");
  }
  const admin = adminClient();
  const action = body?.action;

  // A teen claiming their profile isn't signed in yet: the code is the proof.
  if (action === "claim") return claim(admin, body);

  const token = (authorizationHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return fail(401, "Sign in first.");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return fail(401, "Your session has expired. Sign in again, then try once more.");
  const caller = data.user;
  // A child's own login can't add or manage other people. (Phone sign-ins
  // have no email at all, and are grown-ups' own accounts.)
  const callerEmail = caller.email ?? "";
  if (callerEmail.endsWith(`@${USERNAME_DOMAIN}`) || callerEmail.endsWith(`@${PROFILE_DOMAIN}`)) {
    return fail(403, "Ask your grown-up to do this.");
  }

  switch (action) {
    case "add-child":
      return addChild(admin, caller, body);
    case "child-login":
      return childLogin(admin, caller, body);
    case "remove-child":
      return removeChild(admin, caller, body);
    case "move-mine":
      return moveMine(admin, caller, body);
    default:
      return fail(400, "Unknown action.");
  }
}
