import { createClient } from "@supabase/supabase-js";
import { USERNAME_DOMAIN, removeChildrenOnlyIHad } from "./family.js";

/** Account deletion, shared by the Vercel function (api/delete-account.js) and
 *  the local dev server.
 *
 *  Removing a sign-in needs Supabase's service-role key, which can do anything
 *  to the database — so it lives only in server environment variables and
 *  this file is the only place that uses it. The caller proves who they are
 *  with their own access token; nobody can delete an account but its owner. */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** For /api/health: whether account deletion can work, without revealing
 *  anything. "key not accepted" means the key is set but Supabase won't take
 *  it as the service-role key (often the anon key pasted by mistake, or
 *  another project's key). */
export async function accountDeletionStatus() {
  if (!SUPABASE_URL) return "missing Supabase URL";
  if (!SERVICE_ROLE_KEY) return "missing SUPABASE_SERVICE_ROLE_KEY";
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  return error ? "key not accepted (wrong key, or wrong Supabase URL)" : "ready";
}

export async function deleteAccount(authorizationHeader) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error(!SUPABASE_URL ? "No SUPABASE_URL or VITE_SUPABASE_URL set." : "No SUPABASE_SERVICE_ROLE_KEY set.");
    return {
      status: 500,
      error:
        "Account deletion isn't set up on this site yet. Email us and we'll delete it for you.",
    };
  }

  const token = (authorizationHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { status: 401, error: "Sign in first." };

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error: userError } = await admin.auth.getUser(token);
  const user = data?.user;
  if (userError || !user) {
    return { status: 401, error: "Your session has expired. Sign in again, then try once more." };
  }

  // A child's username login is on a profile their grown-up looks after:
  // deleting it would delete everything they share. The grown-up can.
  if ((user.email ?? "").endsWith(`@${USERNAME_DOMAIN}`)) {
    return { status: 403, error: "Ask your grown-up. They can remove your profile from their account." };
  }

  const deleteError = await removeAccount(admin, user.id);
  if (deleteError) {
    console.error("Couldn't delete user:", deleteError.message);
    return { status: 500, error: "We couldn't delete your account. Please try again." };
  }

  return { status: 200, error: null };
}

/** Everything of one account's, then the sign-in itself. Used when someone
 *  deletes their own account, and by an admin (api/_lib/admin.js). Resolves
 *  to the error if the sign-in couldn't be removed. */
export async function removeAccount(admin, userId) {
  // Children's profiles that only this parent looked after, and that have no
  // login of their own, go with the account: nobody could reach them after.
  await removeChildrenOnlyIHad(admin, userId);

  // The profile row first, in case the table wasn't created with
  // "on delete cascade" — otherwise it would block removing the sign-in.
  const { error: profileError } = await admin.from("profiles").delete().eq("id", userId);
  if (profileError) console.error("Couldn't delete profile row:", profileError.message);

  // Drafts cascade with the account, but clear them explicitly too in case
  // the table was made without that. A missing table is fine.
  const { error: draftsError } = await admin
    .from("appointment_drafts")
    .delete()
    .eq("user_id", userId);
  if (draftsError) console.error("Couldn't delete drafts:", draftsError.message);

  const { error: boardError } = await admin.from("me_boards").delete().eq("user_id", userId);
  if (boardError) console.error("Couldn't delete the Me board:", boardError.message);

  const { error } = await admin.auth.admin.deleteUser(userId);
  return error;
}
