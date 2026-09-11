import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const authEnabled = Boolean(supabaseUrl && supabaseAnonKey);

// If Supabase isn't configured yet, we still export a client-shaped object
// so the rest of the app doesn't crash — AuthContext checks authEnabled
// before calling into it. See README "Setting up login" for setup steps.
export const supabase = authEnabled
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);
