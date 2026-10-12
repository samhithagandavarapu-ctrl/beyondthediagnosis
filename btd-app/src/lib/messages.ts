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
  /** One photo or file, stored privately (see message-attachments.sql). */
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
};

// ---- Attachments ----

const BUCKET = "message-files";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** What the file picker offers. Kept in step with the bucket's allowed types. */
export const ACCEPT_FILES = [
  "image/*",
  ".pdf",
  ".txt",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
].join(",");

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

/** A reason this file can't be sent, written for a person — or null if fine. */
export function checkFile(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" is ${formatBytes(file.size)}. Files can be up to 10 MB.`;
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return `"${file.name}" can't be sent. You can send photos, PDFs, Word or Excel files, and text files.`;
  }
  return null;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} bytes`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export const isImage = (type?: string | null) => Boolean(type && type.startsWith("image/"));

/** The text that stands in for a message that is only a file. */
export function messagePreview(m: Message): string {
  if (m.body.trim()) return m.body;
  if (m.attachment_path) return isImage(m.attachment_type) ? "Sent a photo" : `Sent a file: ${m.attachment_name ?? ""}`.trim();
  return "";
}

async function uploadAttachment(threadUserId: string, file: File) {
  // The folder is the conversation; the file gets a random name so two
  // uploads called "photo.jpg" never collide, and the real name is kept on
  // the message for display.
  const ext = (file.name.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? "").toLowerCase();
  const path = `${threadUserId}/${crypto.randomUUID()}${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  return { path, error };
}

// Signed links last an hour; reuse them rather than asking again every render.
const linkCache = new Map<string, { url: string; until: number }>();

/** A short-lived link to open a private attachment, or null if not allowed. */
export async function attachmentUrl(path: string): Promise<string | null> {
  const cached = linkCache.get(path);
  if (cached && cached.until > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  linkCache.set(path, { url: data.signedUrl, until: Date.now() + 50 * 60_000 });
  return data.signedUrl;
}

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

export const FILES_NOT_SET_UP =
  "Sending photos and files isn't switched on yet — the site owner needs to run supabase/message-attachments.sql in Supabase.";

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
  file?: File | null;
}): Promise<{ message: Message | null; error: string | null }> {
  if (!authEnabled) return { message: null, error: "Login isn't set up on this site yet." };

  let attachment: Record<string, unknown> = {};
  if (input.file) {
    const problem = checkFile(input.file);
    if (problem) return { message: null, error: problem };
    const { path, error } = await uploadAttachment(input.threadUserId, input.file);
    if (error) {
      return {
        message: null,
        error: /bucket not found/i.test(error.message)
          ? FILES_NOT_SET_UP
          : `Couldn't upload "${input.file.name}": ${error.message}`,
      };
    }
    attachment = {
      attachment_path: path,
      attachment_name: input.file.name,
      attachment_type: input.file.type || null,
      attachment_size: input.file.size,
    };
  }

  // sender_id and sender_email are filled in by the database from the
  // signed-in account, so they can't be made up here.
  const { data, error } = await supabase
    .from("messages")
    .insert({
      thread_user_id: input.threadUserId,
      from_admin: input.fromAdmin,
      sender_name: input.senderName || null,
      body: input.body.trim(),
      ...attachment,
    })
    .select()
    .single();
  if (error && input.file && /attachment_|column/i.test(error.message)) {
    return { message: null, error: FILES_NOT_SET_UP };
  }
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
