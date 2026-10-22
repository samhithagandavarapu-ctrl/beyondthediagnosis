import { authEnabled, supabase } from "./supabaseClient";

// Messages an admin sends to everyone (the broadcasts table, see
// supabase/migrations/20261029_admin_comms.sql). Signed-in people get each one
// in Notifications; one marked popup also shows once to every visitor.

export type Broadcast = {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
  linkLabel: string | null;
  popup: boolean;
  active: boolean;
  createdAt: string;
};

type Row = {
  id: string;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
  popup: boolean;
  active: boolean;
  created_at: string;
};

const fromRow = (r: Row): Broadcast => ({
  id: r.id,
  title: r.title,
  body: r.body,
  linkUrl: r.link_url,
  linkLabel: r.link_label,
  popup: r.popup,
  active: r.active,
  createdAt: r.created_at,
});

const MISSING =
  "Broadcasts aren't set up yet. Run supabase/migrations/20261029_admin_comms.sql in Supabase first.";

/** Live ones for everyone; an admin also gets the ones turned off. */
export async function listBroadcasts(): Promise<Broadcast[]> {
  if (!authEnabled) return [];
  const { data, error } = await supabase.from("broadcasts").select("*").order("created_at", { ascending: false }).limit(50);
  if (error || !data) return [];
  return (data as Row[]).map(fromRow);
}

export async function sendBroadcast(b: {
  title: string;
  body: string;
  linkUrl: string;
  linkLabel: string;
  popup: boolean;
}): Promise<string | null> {
  const { error } = await supabase.from("broadcasts").insert({
    title: b.title.trim(),
    body: b.body.trim(),
    link_url: b.linkUrl.trim() || null,
    link_label: b.linkLabel.trim() || null,
    popup: b.popup,
  });
  if (error) return /broadcasts/.test(error.message) ? MISSING : error.message;
  return null;
}

export async function setBroadcastActive(id: string, active: boolean): Promise<string | null> {
  const { error } = await supabase.from("broadcasts").update({ active }).eq("id", id);
  return error?.message ?? null;
}

export async function deleteBroadcast(id: string): Promise<string | null> {
  const { error } = await supabase.from("broadcasts").delete().eq("id", id);
  return error?.message ?? null;
}
