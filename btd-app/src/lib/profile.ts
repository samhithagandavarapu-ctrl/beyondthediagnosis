import { supabase, authEnabled } from "./supabaseClient";
import type { ReadingLevel } from "./myVoice";

export type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  large_text: boolean;
  high_contrast: boolean;
  easy_read: boolean;
  // My Voice reading level. Optional because v1 needs no schema change —
  // accounts on a database without this column simply fall back to the copy
  // kept in this browser.
  reading_level?: ReadingLevel | null;
};

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!authEnabled) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

export async function upsertProfile(
  userId: string,
  patch: Partial<Omit<Profile, "id">>
): Promise<{ error: string | null }> {
  if (!authEnabled) return { error: "Not set up yet." };
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...patch }, { onConflict: "id" });
  return { error: error?.message ?? null };
}

/** Save the My Voice reading level alongside the other accessibility
 *  settings. v1 requires no schema change, so a database without the column
 *  is a normal outcome, not an error worth surfacing to the user — the
 *  browser copy stays authoritative in that case. */
export async function saveReadingLevel(
  userId: string,
  level: ReadingLevel
): Promise<{ stored: boolean }> {
  if (!authEnabled) return { stored: false };
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, reading_level: level }, { onConflict: "id" });
  return { stored: !error };
}
