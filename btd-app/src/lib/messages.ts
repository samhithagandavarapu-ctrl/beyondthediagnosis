import { supabase, authEnabled } from "./supabaseClient";

// Messages between a person and the Voiced team. Every conversation ("thread")
// belongs to one person: all messages whose thread_user_id is their id. The
// table and its access rules are in supabase/rejections-and-messages.sql.

export type Message = {
  id: string;
  thread_user_id: string;
  sender_id: string | null;
  from_admin: boolean;
  sender_name: string | null;
  sender_email: string | null;
  body: string;
  created_at: string;
};

export type Thread = {
  userId: string;
  /** Who the conversation is with, from their most recent message. */
  name: string;
  email: string;
  latest: Message;
  /** Their newest message, for the admin's unread marker. */
  latestFromThem: Message | null;
};

export const NOT_SET_UP =
  "Messaging isn't switched on yet — the site owner needs to run supabase/rejections-and-messages.sql in Supabase.";

/** Turn a Supabase error into something worth showing a person. A missing
 *  table is the common one before the SQL has been run. */
function describe(error: { message?: string; code?: string } | null): string | null {
  if (!error) return null;
  if (error.code === "42P01" || /relation .*messages.* does not exist|schema cache/i.test(error.message ?? "")) {
    return NOT_SET_UP;
  }
  return error.message || "Something went wrong. Please try again.";
}

export async function fetchThread(threadUserId: string): Promise<{ messages: Message[]; error: string | null }> {
  if (!authEnabled) return { messages: [], error: "Login isn't set up on this site yet." };
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_user_id", threadUserId)
    .order("created_at", { ascending: true })
    .limit(500);
  return { messages: data ?? [], error: describe(error) };
}

export async function sendMessage(input: {
  threadUserId: string;
  body: string;
  fromAdmin: boolean;
  senderName: string;
}): Promise<{ message: Message | null; error: string | null }> {
  if (!authEnabled) return { message: null, error: "Login isn't set up on this site yet." };
  // sender_id and sender_email are filled in by the database from the
  // signed-in account, so they can't be made up here.
  const { data, error } = await supabase
    .from("messages")
    .insert({
      thread_user_id: input.threadUserId,
      from_admin: input.fromAdmin,
      sender_name: input.senderName || null,
      body: input.body.trim(),
    })
    .select()
    .single();
  return { message: data ?? null, error: describe(error) };
}

/** Admin only: every conversation, newest first. */
export async function fetchInbox(): Promise<{ threads: Thread[]; error: string | null }> {
  if (!authEnabled) return { threads: [], error: "Login isn't set up on this site yet." };
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) return { threads: [], error: describe(error) };

  const byUser = new Map<string, Thread>();
  for (const m of (data ?? []) as Message[]) {
    let t = byUser.get(m.thread_user_id);
    if (!t) {
      t = { userId: m.thread_user_id, name: "", email: "", latest: m, latestFromThem: null };
      byUser.set(m.thread_user_id, t);
    }
    if (!m.from_admin) {
      if (!t.latestFromThem) t.latestFromThem = m;
      if (!t.name && m.sender_name) t.name = m.sender_name;
      if (!t.email && m.sender_email) t.email = m.sender_email;
    }
  }
  return { threads: [...byUser.values()], error: null };
}

/** The newest messages from the other side, for notifications. RLS already
 *  limits a person to their own conversation; an admin sees everyone's. */
export async function fetchIncoming(asAdmin: boolean): Promise<Message[]> {
  if (!authEnabled) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("from_admin", !asAdmin)
    .order("created_at", { ascending: false })
    .limit(100);
  return error ? [] : (data ?? []);
}

/** Calls back with each new message as it's sent. Live updates need the
 *  table added to Supabase Realtime (the SQL does it); without that this
 *  simply never fires, and the pages fall back to checking every so often. */
export function subscribeToMessages(
  threadUserId: string | null,
  onInsert: (m: Message) => void
): () => void {
  if (!authEnabled) return () => {};
  const channel = supabase
    .channel(`messages:${threadUserId ?? "all"}:${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        ...(threadUserId ? { filter: `thread_user_id=eq.${threadUserId}` } : {}),
      },
      (payload: { new: Message }) => onInsert(payload.new)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ---- Read markers ----
// When someone last looked at a conversation, kept in this browser per
// account. Good enough for "new" dots and notifications; nothing is uploaded.

const seenKey = (viewerId: string, threadUserId: string) =>
  `voiced:messages-seen:${viewerId}:${threadUserId}`;

export function lastSeen(viewerId: string, threadUserId: string): string {
  try {
    return localStorage.getItem(seenKey(viewerId, threadUserId)) ?? "";
  } catch {
    return "";
  }
}

export function markSeen(viewerId: string, threadUserId: string, at: string) {
  try {
    if (at > lastSeen(viewerId, threadUserId)) localStorage.setItem(seenKey(viewerId, threadUserId), at);
  } catch {
    // ignore
  }
}

/** Merge new messages into a list, oldest first, without duplicates. */
export function mergeMessages(list: Message[], more: Message[]): Message[] {
  const byId = new Map(list.map((m) => [m.id, m]));
  more.forEach((m) => byId.set(m.id, m));
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
}
