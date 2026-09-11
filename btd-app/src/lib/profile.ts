import { supabase, authEnabled } from "./supabaseClient";

export type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  large_text: boolean;
  high_contrast: boolean;
  easy_read: boolean;
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
