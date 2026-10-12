import { supabase, authEnabled } from "./supabaseClient";

export type StoryRow = {
  id: string;
  title: string;
  audience: "Self-advocate" | "Parent" | "Caregiver" | "Clinician";
  excerpt: string;
  submitter_name: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  /** Only on a rejected story, and only once rejections-and-messages.sql
   *  has been run. */
  rejection_reason?: string | null;
  rejection_note?: string | null;
};

/** What the admin picks from when turning a story down. The writer is told
 *  the reason, alongside "it didn't follow our community guidelines". */
export const REJECTION_REASONS = [
  "Names a doctor, nurse, clinic, or hospital",
  "Shares private or identifying details",
  "Isn't about a healthcare experience",
  "Unkind, hurtful, or disrespectful language",
  "Looks like advertising or spam",
  "Gives medical advice",
  "Something else",
];

export type StorySubmission = {
  title: string;
  audience: StoryRow["audience"];
  excerpt: string;
  submitter_name: string;
};

export async function submitStory(submission: StorySubmission): Promise<{ error: string | null }> {
  if (!authEnabled) {
    return { error: "Story submission isn't set up yet — see README 'Setting up login'." };
  }
  const { error } = await supabase.from("stories").insert({
    title: submission.title,
    audience: submission.audience,
    excerpt: submission.excerpt,
    submitter_name: submission.submitter_name || null,
    status: "pending",
  });
  return { error: error?.message ?? null };
}

// Every column the public page needs, and nothing else — in particular not
// user_id, which links a published story back to an account.
const PUBLIC_COLUMNS = "id, title, audience, excerpt, submitter_name, status, created_at";

export async function fetchApprovedStories(): Promise<StoryRow[]> {
  if (!authEnabled) return [];
  const { data, error } = await supabase
    .from("stories")
    .select(PUBLIC_COLUMNS)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return [];
  }
  return data ?? [];
}

/** The signed-in person's own stories that have been reviewed — published or
 *  turned down — which is what their notifications are built from. Needs the user_id column from
 *  supabase/stories-notifications.sql; on a database without it this quietly
 *  returns nothing rather than erroring, so notifications are simply empty.
 *
 *  user_id is filled in by the database (default auth.uid()), never sent from
 *  here, so submitting keeps working whether or not that column exists. */
export async function fetchMyReviewedStories(userId: string): Promise<StoryRow[]> {
  if (!authEnabled) return [];
  const query = (columns: string) =>
    supabase
      .from("stories")
      .select(columns)
      .eq("user_id", userId)
      .in("status", ["approved", "rejected"])
      .order("created_at", { ascending: false });
  // With the rejection reasons if the database has them; without, if not.
  let { data, error } = await query(`${PUBLIC_COLUMNS}, rejection_reason, rejection_note`);
  if (error) ({ data, error } = await query(PUBLIC_COLUMNS));
  if (error) return [];
  return data ?? [];
}

export async function fetchPendingStories(): Promise<StoryRow[]> {
  if (!authEnabled) return [];
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) {
    console.error(error);
    return [];
  }
  return data ?? [];
}

export async function fetchApprovedForAdmin(): Promise<StoryRow[]> {
  if (!authEnabled) return [];
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return [];
  }
  return data ?? [];
}

export async function setStoryStatus(
  id: string,
  status: "approved" | "rejected" | "pending",
  rejection?: { reason: string; note: string }
): Promise<{ error: string | null; reasonSaved?: boolean }> {
  if (!authEnabled) return { error: "Not set up yet." };
  if (status === "rejected" && rejection) {
    const { error } = await supabase
      .from("stories")
      .update({ status, rejection_reason: rejection.reason, rejection_note: rejection.note || null })
      .eq("id", id);
    if (!error) return { error: null, reasonSaved: true };
    // Most likely the reason columns don't exist yet: still reject, and say
    // the reason wasn't kept.
    const fallback = await supabase.from("stories").update({ status }).eq("id", id);
    return { error: fallback.error?.message ?? null, reasonSaved: false };
  }
  const { error } = await supabase.from("stories").update({ status }).eq("id", id);
  return { error: error?.message ?? null };
}
