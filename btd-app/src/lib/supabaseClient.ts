import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const authEnabled = Boolean(supabaseUrl && supabaseAnonKey);

// Read before the client starts, since it clears the link from the address
// bar once it has used it. (See cameFromPasswordResetLink below.)
let openedFromResetLink =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type") === "recovery";

// If Supabase isn't configured yet, we still export a client-shaped object
// so the rest of the app doesn't crash — AuthContext checks authEnabled
// before calling into it. See README "Setting up login" for setup steps.
export const supabase = authEnabled
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);

// Was this page opened from a "reset your password" email link?
//
// Supabase announces that only once (a PASSWORD_RECOVERY event), moments
// after the page loads, and React subscribes later than that — so the
// announcement was missed and the link simply signed people in. Read it from
// the link itself before the client tidies the address bar, and listen from
// right here, at start-up, so it can't be missed.
if (authEnabled) {
  supabase.auth.onAuthStateChange((event: string) => {
    if (event === "PASSWORD_RECOVERY") openedFromResetLink = true;
  });
}

export function cameFromPasswordResetLink() {
  return openedFromResetLink;
}
