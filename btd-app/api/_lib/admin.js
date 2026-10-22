import { createClient } from "@supabase/supabase-js";
import { removeAccount } from "./account.js";
import { loginKind } from "./family.js";

/** What the admin dashboard does that needs the service-role key: looking up
 *  accounts, deleting one, and the yearly cleanup the Privacy Policy
 *  promises. Shared by the Vercel function (api/admin.js) and the local dev
 *  server. Every action checks first that the caller is a Voiced admin.
 *
 *  It never reads anyone's health information: only sign-in details (email or
 *  username, when they joined, when they last signed in), the name on the
 *  profile, and who is linked to whom. */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// The same people as DEFAULT_ADMIN_EMAILS (src/context/AuthContext.tsx) plus
// VITE_ADMIN_EMAILS, so the server agrees with what the app shows.
const ADMIN_EMAILS = ["withvoiced@gmail.com", ...(process.env.VITE_ADMIN_EMAILS || "").split(",")]
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** The Privacy Policy's promise: accounts nobody has used in 2 years go. */
const INACTIVE_YEARS = 2;

const fail = (status, error) => ({ status, error });
const isAdminEmail = (email) => ADMIN_EMAILS.includes((email ?? "").toLowerCase());

async function allUsers(admin) {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

/** Names and family links, for showing people the way the app does. */
async function directory(admin) {
  const [users, { data: profiles }, { data: links }] = await Promise.all([
    allUsers(admin),
    admin.from("profiles").select("id, full_name"),
    admin.from("family_links").select("caregiver_id, child_id"),
  ]);
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  return { users, names, links: links ?? [] };
}

function describe(user, names, links) {
  const kind = user.phone && !user.email ? "phone" : loginKind(user.email);
  return {
    id: user.id,
    name: user.user_metadata?.preferred_name || names.get(user.id) || null,
    // What they sign in with. A profile a parent made, with no login yet, has none.
    login:
      kind === "username"
        ? user.email.split("@")[0]
        : kind === "none"
          ? null
          : user.email || user.phone || null,
    kind, // "email" | "phone" | "username" (a child 12 or under) | "none" (no login yet)
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
    children: links.filter((l) => l.caregiver_id === user.id).length,
    grownUps: links.filter((l) => l.child_id === user.id).length,
    admin: isAdminEmail(user.email),
  };
}

async function overview(admin) {
  const { users } = await directory(admin);
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const people = users.filter((u) => !isAdminEmail(u.email));
  const { count: pendingStories } = await admin
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return {
    status: 200,
    data: {
      people: people.length,
      children: people.filter((u) => {
        const k = loginKind(u.email);
        return k === "username" || k === "none";
      }).length,
      newThisWeek: people.filter((u) => new Date(u.created_at).getTime() > weekAgo).length,
      pendingStories: pendingStories ?? 0,
    },
  };
}

async function search(admin, body) {
  const q = String(body.query ?? "").trim().toLowerCase();
  const { users, names, links } = await directory(admin);
  const rows = users
    .map((u) => describe(u, names, links))
    .filter((p) => !q || [p.name, p.login].some((v) => v?.toLowerCase().includes(q)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
  return { status: 200, data: { people: rows, total: users.length } };
}

async function deleteUser(admin, caller, body) {
  const id = String(body.userId ?? "");
  const { data } = await admin.auth.admin.getUserById(id);
  const user = data?.user;
  if (!user) return fail(404, "That account is already gone.");
  if (user.id === caller.id || isAdminEmail(user.email)) return fail(400, "Admin accounts can't be deleted from here.");
  const error = await removeAccount(admin, user.id);
  if (error) {
    console.error("Admin couldn't delete an account:", error.message);
    return fail(500, "Couldn't delete that account. Please try again.");
  }
  return { status: 200, data: { deleted: user.id } };
}

/** Who the yearly cleanup would remove. A child's profile counts as used if
 *  the child or any of their grown-ups signed in, so a child is never
 *  removed while a parent still uses Voiced. */
async function staleAccounts(admin) {
  const { users, names, links } = await directory(admin);
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - INACTIVE_YEARS);
  const lastSeen = new Map(users.map((u) => [u.id, new Date(u.last_sign_in_at || u.created_at).getTime()]));
  const stale = users.filter((u) => {
    if (isAdminEmail(u.email)) return false;
    const grownUps = links.filter((l) => l.child_id === u.id).map((l) => lastSeen.get(l.caregiver_id) ?? 0);
    return Math.max(lastSeen.get(u.id) ?? 0, ...grownUps) < cutoff.getTime();
  });
  const { data: stories } = await admin.from("stories").select("id, title, created_at").eq("status", "rejected");
  return {
    people: stale.map((u) => describe(u, names, links)),
    stories: stories ?? [],
    cutoff: cutoff.toISOString(),
  };
}

async function cleanupPreview(admin) {
  return { status: 200, data: await staleAccounts(admin) };
}

/** Works out the list again rather than trusting one sent from the browser. */
async function cleanupRun(admin) {
  const { people, stories } = await staleAccounts(admin);
  let deleted = 0;
  const failed = [];
  for (const p of people) {
    const { data } = await admin.auth.admin.getUserById(p.id);
    if (!data?.user) continue; // went with a parent's account already
    const error = await removeAccount(admin, p.id);
    if (error) failed.push(p.login || p.name || p.id);
    else deleted++;
  }
  let storiesDeleted = 0;
  if (stories.length) {
    const { error } = await admin.from("stories").delete().in("id", stories.map((s) => s.id));
    if (error) console.error("Couldn't delete unpublished stories:", error.message);
    else storiesDeleted = stories.length;
  }
  return { status: 200, data: { deleted, storiesDeleted, failed } };
}

export async function adminAction(authorizationHeader, body) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return fail(500, "Admin tools need SUPABASE_SERVICE_ROLE_KEY set in Vercel's environment variables.");
  }
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = (authorizationHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return fail(401, "Sign in first.");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return fail(401, "Your session has expired. Sign in again.");
  if (!isAdminEmail(data.user.email)) return fail(403, "Only Voiced admins can do this.");

  try {
    switch (body?.action) {
      case "overview":
        return await overview(admin);
      case "search":
        return await search(admin, body);
      case "delete-user":
        return await deleteUser(admin, data.user, body);
      case "cleanup-preview":
        return await cleanupPreview(admin);
      case "cleanup-run":
        return await cleanupRun(admin);
      default:
        return fail(400, "Unknown admin action.");
    }
  } catch (err) {
    console.error("Admin action failed:", err?.message ?? err);
    return fail(500, "Something went wrong. Please try again.");
  }
}
