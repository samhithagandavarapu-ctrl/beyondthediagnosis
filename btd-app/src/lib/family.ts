import { authEnabled, supabase } from "./supabaseClient";

// Family accounts: a grown-up linked with a child's account, so the grown-up
// can see (and add to) the child's Symptom Calendar. Every rule — who can
// see what, under-13 consent, at most 2 grown-ups — is enforced by the
// database (supabase/migrations/20261021_family_accounts.sql); this file only
// asks it things.

export type FamilyPerson = {
  linkId: string;
  personId: string;
  name: string;
  /** What they are to me. */
  role: "child" | "caregiver";
  linkedAt: string;
  /** For a child under 13: this link holds the parent's consent. */
  consent: boolean;
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
  return (data as { link_id: string; person_id: string; name: string; role: "child" | "caregiver"; linked_at: string; consent: boolean }[]).map(
    (r) => ({ linkId: r.link_id, personId: r.person_id, name: r.name, role: r.role, linkedAt: r.linked_at, consent: r.consent })
  );
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

/** Make a code: as a grown-up to give a child ("caregiver"), or as a child to
 *  give a grown-up ("child"). */
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

// ---- Birth year (for the under-13 rule) ----

export async function getBirthYear(userId: string): Promise<number | null> {
  if (!authEnabled) return null;
  const { data } = await supabase.from("account_ages").select("birth_year").eq("user_id", userId).maybeSingle();
  return (data as { birth_year: number } | null)?.birth_year ?? null;
}

/** Set once; the database won't let it change afterwards. */
export async function setBirthYear(year: number): Promise<{ error: string | null }> {
  const { error } = await supabase.from("account_ages").insert({ birth_year: year });
  return { error: error ? message(error, "Couldn't save that. Please try again.") : null };
}

/** Under 13 this year, counted on the safe side (as the database does). */
export const isUnder13 = (birthYear: number) => birthYear > new Date().getFullYear() - 13;

// Sign-up asks the birth year (and, under 13, a parent's code) before the
// account exists — and with email confirmation, before anyone is signed in.
// They wait here until the first sign-in, then go to the database.
const PENDING_KEY = "voiced:pending-family-signup";

export function savePendingSignup(p: { birthYear: number; code?: string }) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

/** After sign-in: save the birth year and use the parent's code, if any are
 *  waiting. Returns an error to show if the code didn't work. */
export async function finishPendingSignup(userId: string): Promise<{ error: string | null }> {
  let pending: { birthYear: number; code?: string } | null = null;
  try {
    pending = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
  } catch {
    pending = null;
  }
  if (!pending) return { error: null };
  if ((await getBirthYear(userId)) === null) await setBirthYear(pending.birthYear);
  let error: string | null = null;
  if (pending.code) error = (await acceptInvite(pending.code)).error;
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
  return { error };
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
