import { authEnabled, supabase } from "./supabaseClient";
import { API_BASE } from "./api";

// The admin dashboard's calls to the server (api/_lib/admin.js), which checks
// the caller is a Voiced admin before doing anything.

export type AdminPerson = {
  id: string;
  name: string | null;
  login: string | null;
  kind: "email" | "phone" | "username" | "none";
  createdAt: string;
  lastSignInAt: string | null;
  children: number;
  grownUps: number;
  admin: boolean;
};

export type AdminOverview = { people: number; children: number; newThisWeek: number; pendingStories: number };
export type CleanupList = { people: AdminPerson[]; stories: { id: string; title: string; created_at: string }[]; cutoff: string };

export async function adminApi<T>(
  action: "overview" | "search" | "delete-user" | "cleanup-preview" | "cleanup-run",
  body: Record<string, unknown> = {}
): Promise<{ data: T | null; error: string | null }> {
  if (!authEnabled) return { data: null, error: "Accounts aren't connected on this site." };
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  try {
    const res = await fetch(`${API_BASE}/api/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ action, ...body }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: json.error || "Something went wrong. Please try again." };
    return { data: json as T, error: null };
  } catch {
    return { data: null, error: "We couldn't reach the server. Check your connection and try again." };
  }
}

/** "Grown-up", "Child (username)" and so on, for a person's sign-in. */
export function kindLabel(p: AdminPerson): string {
  if (p.admin) return "Admin";
  if (p.kind === "username") return "Child · username login";
  if (p.kind === "none") return p.grownUps ? "Child · no login yet" : "Profile · no login";
  if (p.grownUps) return "Teen or adult · own login";
  return p.kind === "phone" ? "Grown-up · phone" : "Grown-up";
}

export const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Never";
