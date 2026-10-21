import { authEnabled, supabase } from "./supabaseClient";
import { API_BASE } from "./api";

// Family: each person has one profile, and grown-ups are linked to it. A
// parent adds their child's profile; the child's own login (a username, or
// their own email from an invite) connects to that same profile. Every rule —
// who can see what, under-13 consent, at most 2 grown-ups — is enforced by
// the database (supabase/migrations/20261021_family_accounts.sql and
// 20261025_one_profile_per_person.sql); this file only asks it things.

export type FamilyPerson = {
  linkId: string;
  personId: string;
  name: string;
  /** What they are to me. */
  role: "child" | "caregiver";
  linkedAt: string;
  /** For a child under 13: this link holds the parent's consent. */
  consent: boolean;
  /** For a child: the year they were born, and their sign-in — none yet, a
   *  username their parent made, or their own email. */
  birthYear: number | null;
  login: "none" | "username" | "email" | null;
  username: string | null;
  /** How the grown-up is related ("Mom"). */
  relation: string | null;
};

export type FamilyInvite = {
  id: string;
  code: string;
  creatorRole: "caregiver" | "child";
  forUnder13: boolean;
  expiresAt: string;
};

export type FamilyNotice = {
  id: string;
  kind: "linked" | "unlinked" | "deleted";
  actorName: string;
  createdAt: string;
  read: boolean;
};

/** "HX492K" shown as "HX4-92K", easier to read out. */
export const showCode = (code: string) => `${code.slice(0, 3)}-${code.slice(3)}`;

/** Database errors are written for people (see the migration); anything
 *  else becomes a plain sentence. */
function message(error: { message?: string } | null, fallback: string): string {
  const text = error?.message ?? "";
  return /^[A-Z].*[.!]$/.test(text) && !text.includes("violates") ? text : fallback;
}

export async function listFamily(): Promise<FamilyPerson[]> {
  if (!authEnabled) return [];
  const { data, error } = await supabase.rpc("family_people");
  if (error) {
    console.error("Couldn't load family links:", error.message);
    return [];
  }
  type Row = {
    link_id: string;
    person_id: string;
    name: string;
    role: "child" | "caregiver";
    linked_at: string;
    consent: boolean;
    birth_year?: number | null;
    login?: FamilyPerson["login"];
    username?: string | null;
    relation?: string | null;
  };
  return (data as Row[]).map((r) => ({
    linkId: r.link_id,
    personId: r.person_id,
    name: r.name,
    role: r.role,
    linkedAt: r.linked_at,
    consent: r.consent,
    birthYear: r.birth_year ?? null,
    login: r.login ?? null,
    username: r.username ?? null,
    relation: r.relation ?? null,
  }));
}

export async function listMyInvites(): Promise<FamilyInvite[]> {
  if (!authEnabled) return [];
  const { data, error } = await supabase
    .from("family_invites")
    .select("id, code, creator_role, for_under_13, expires_at")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as { id: string; code: string; creator_role: "caregiver" | "child"; for_under_13: boolean; expires_at: string }[]).map((r) => ({
    id: r.id,
    code: r.code,
    creatorRole: r.creator_role,
    forUnder13: r.for_under_13,
    expiresAt: r.expires_at,
  }));
}

/** Make a code for a grown-up to enter ("child": the person inviting is the
 *  one they'll look after). Grown-ups don't make codes for children any more:
 *  they add the child's profile instead. */
export async function createInvite(
  creatorRole: "caregiver" | "child",
  forUnder13 = false
): Promise<{ code: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc("create_family_invite", {
    p_creator_role: creatorRole,
    p_for_under_13: forUnder13,
  });
  if (error) return { code: null, error: message(error, "Couldn't make a code. Please try again.") };
  return { code: data as string, error: null };
}

export async function cancelInvite(id: string): Promise<void> {
  await supabase.from("family_invites").delete().eq("id", id);
}

export async function acceptInvite(code: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("accept_family_invite", { p_code: code });
  return { error: error ? message(error, "That code didn't work. Please check it and try again.") : null };
}

export async function unlink(linkId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("unlink_family", { p_link: linkId });
  return { error: error ? message(error, "Couldn't unlink. Please try again.") : null };
}

// ---- One profile per person ----
// A parent adds each child once; logins connect to that profile. Making a
// profile or a child's login needs the server (api/family.js).

/** Might still be 12 this year (born no more than 13 years ago): the parent
 *  makes them a username login. Otherwise they're invited with a code. */
export const getsUsernameLogin = (birthYear: number) => new Date().getFullYear() - birthYear <= 13;

/** A child's username, as typed at sign-in, is this address underneath. */
export const USERNAME_DOMAIN = "kids.voiced.invalid";
export const usernameEmail = (username: string) => `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
/** "maya7" for a child's username login, or null for anyone else. */
export function usernameOf(email: string | null | undefined): string | null {
  return email?.endsWith(`@${USERNAME_DOMAIN}`) ? email.split("@")[0] : null;
}

export async function familyApi<T = Record<string, unknown>>(
  action: "add-child" | "child-login" | "remove-child" | "move-mine" | "claim",
  body: Record<string, unknown>
): Promise<{ data: T | null; error: string | null }> {
  if (!authEnabled) return { data: null, error: "Accounts aren't available right now." };
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  try {
    const res = await fetch(`${API_BASE}/api/family`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ action, ...body }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: json.error || "Something went wrong. Please try again." };
    return { data: json as T, error: null };
  } catch {
    return { data: null, error: "We couldn't reach the server. Check your connection and try again." };
  }
}

/** A 6-letter invite for a child 13 or older to make their own login. */
export async function createProfileClaim(personId: string): Promise<{ code: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc("create_profile_claim", { p_person: personId });
  if (error) return { code: null, error: message(error, "Couldn't make an invite. Please try again.") };
  return { code: data as string, error: null };
}

/** The unused invite for a child, if there is one. */
export async function profileClaimFor(personId: string): Promise<{ code: string; expiresAt: string } | null> {
  if (!authEnabled) return null;
  const { data } = await supabase
    .from("profile_claims")
    .select("code, expires_at")
    .eq("person_id", personId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data ? { code: (data as { code: string }).code, expiresAt: (data as { expires_at: string }).expires_at } : null;
}

/** Notes a parent kept on their own account before each child had a profile
 *  (their "All about …" board, drafts, calendar). Shown once, so they can be
 *  moved onto the child's profile. Null when there's nothing. */
export async function myOldNotes(userId: string): Promise<{ name: string; count: number } | null> {
  if (!authEnabled) return null;
  const count = async (table: string) => {
    const { count } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("user_id", userId);
    return count ?? 0;
  };
  const [{ data: board }, drafts, entries] = await Promise.all([
    supabase.from("me_boards").select("about_name, answers").eq("user_id", userId).maybeSingle(),
    count("appointment_drafts"),
    count("calendar_entries"),
  ]);
  const b = board as { about_name: string; answers: Record<string, unknown> } | null;
  const boardCount = b && Object.keys(b.answers ?? {}).length ? 1 : 0;
  const total = boardCount + drafts + entries;
  return total ? { name: b?.about_name?.trim() ?? "", count: total } : null;
}

// ---- Notices ----

export async function listNotices(): Promise<FamilyNotice[]> {
  if (!authEnabled) return [];
  const { data, error } = await supabase
    .from("family_events")
    .select("id, kind, actor_name, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return (data as { id: string; kind: "linked" | "unlinked" | "deleted"; actor_name: string | null; created_at: string; read_at: string | null }[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    actorName: r.actor_name || "Someone",
    createdAt: r.created_at,
    read: !!r.read_at,
  }));
}

export async function markNoticesRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await supabase.from("family_events").update({ read_at: new Date().toISOString() }).in("id", ids);
}
