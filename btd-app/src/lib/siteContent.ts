import { authEnabled, supabase } from "./supabaseClient";

// Words an admin changed on the site, from the site_content table
// (supabase/migrations/20261029_admin_comms.sql). Each one says: where the
// site shows `original`, show `replacement`, on one page or everywhere ("*").

export type ContentEdit = { original: string; path: string; replacement: string; updatedAt: string };

const MISSING =
  "Editing isn't set up yet. Run supabase/migrations/20261029_admin_comms.sql in Supabase first.";

export async function loadContentEdits(): Promise<ContentEdit[]> {
  if (!authEnabled) return [];
  const { data, error } = await supabase.from("site_content").select("original, path, replacement, updated_at");
  if (error || !data) return [];
  return (data as { original: string; path: string; replacement: string; updated_at: string }[]).map((r) => ({
    original: r.original,
    path: r.path,
    replacement: r.replacement,
    updatedAt: r.updated_at,
  }));
}

export async function saveContentEdit(original: string, path: string, replacement: string): Promise<string | null> {
  const { error } = await supabase
    .from("site_content")
    .upsert({ original, path, replacement, updated_at: new Date().toISOString() }, { onConflict: "original,path" });
  if (error) return /site_content/.test(error.message) ? MISSING : error.message;
  // One rule per piece of text: saving it for everywhere replaces this page's own.
  if (path === "*") await supabase.from("site_content").delete().eq("original", original).neq("path", "*");
  return null;
}

/** Back to the original words: on one page, or (path "*") everywhere. */
export async function resetContentEdit(original: string, path: string): Promise<string | null> {
  let query = supabase.from("site_content").delete().eq("original", original);
  if (path !== "*") query = query.eq("path", path);
  const { error } = await query;
  return error?.message ?? null;
}

/** The edit that applies to this text on this page, if any: a page's own
 *  wins over one for everywhere. */
export function editFor(edits: ContentEdit[], original: string, path: string): ContentEdit | undefined {
  return edits.find((e) => e.original === original && e.path === path) ?? edits.find((e) => e.original === original && e.path === "*");
}
