import type { User } from "@supabase/supabase-js";
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

/** What someone wants to be called, as they typed it. Kept on the sign-in
 *  itself (user metadata), so it needs no database change. */
export function preferredName(user: User | null): string {
  return String(user?.user_metadata?.preferred_name ?? "").trim();
}

export async function savePreferredName(name: string): Promise<{ error: string | null }> {
  if (!authEnabled) return { error: "Not set up yet." };
  const { error } = await supabase.auth.updateUser({ data: { preferred_name: name.trim() } });
  return { error: error?.message ?? null };
}

/** The name to put on someone's messages: what they asked to be called,
 *  else their profile name, else the name their Google account gave. */
export function displayNameFor(user: User | null, profile: Profile | null): string {
  return (
    preferredName(user) ||
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "").trim()
  );
}
