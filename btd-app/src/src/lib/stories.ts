import { supabase, authEnabled } from "./supabaseClient";

export type StoryRow = {
  id: string;
  title: string;
  audience: "Self-advocate" | "Parent" | "Caregiver" | "Clinician";
  excerpt: string;
  submitter_name: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

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

export async function fetchApprovedStories(): Promise<StoryRow[]> {
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
  status: "approved" | "rejected" | "pending"
): Promise<{ error: string | null }> {
  if (!authEnabled) return { error: "Not set up yet." };
  const { error } = await supabase.from("stories").update({ status }).eq("id", id);
  return { error: error?.message ?? null };
}
