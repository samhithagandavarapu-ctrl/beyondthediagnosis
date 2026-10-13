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
  /** Set when the sender unsent it; the text and file are gone. */
  unsent_at?: string | null;
};

/** Read state of one conversation (see messages-v2.sql). */
export type ThreadState = {
  user_id: string;
  user_last_read_at: string | null;
  admin_last_read_at: string | null;
  user_marked_unread: boolean;
  admin_marked_unread: boolean;
  user_cleared_at: string | null;
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

// Some phones and computers hand over files with no type at all (HEIC photos,
// older Word files). Work it out from the name, so storage accepts it.
const TYPE_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const extOf = (name: string) => (name.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? "").toLowerCase();

export function fileType(file: File): string {
  return file.type || TYPE_BY_EXT[extOf(file.name)] || "";
}

/** A reason this file can't be sent, written for a person — or null if fine. */
export function checkFile(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" is ${formatBytes(file.size)}. Files can be up to 10 MB.`;
  }
  if (!ALLOWED_TYPES.has(fileType(file))) {
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
  if (m.unsent_at) return "Message unsent";
  if (m.body.trim()) return m.body;
  if (m.attachment_path) return isImage(m.attachment_type) ? "Sent a photo" : `Sent a file: ${m.attachment_name ?? ""}`.trim();
  return "";
}

async function uploadAttachment(threadUserId: string, file: File) {
  // The folder is the conversation; the file gets a random name so two
  // uploads called "photo.jpg" never collide, and the real name is kept on
  // the message for display.
  const path = `${threadUserId}/${crypto.randomUUID()}${extOf(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: fileType(file) || undefined,
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
  /** All their (not unsent) messages, newest first, for unread counts. */
  fromThem: Message[];
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
      const msg = error.message ?? "";
      return {
        message: null,
        error: /bucket not found/i.test(msg)
          ? FILES_NOT_SET_UP
          : /row-level security|unauthorized|403/i.test(msg)
          ? `${FILES_NOT_SET_UP} (Storage refused the upload: ${msg})`
          : /mime|content type/i.test(msg)
          ? `"${input.file.name}" is a type of file that can't be sent. Try a photo, PDF, Word, Excel, or text file.`
          : /size|too large|exceed/i.test(msg)
          ? `"${input.file.name}" is too big. Files can be up to 10 MB.`
          : `Couldn't upload "${input.file.name}": ${msg}`,
      };
    }
    attachment = {
      attachment_path: path,
      attachment_name: input.file.name,
      attachment_type: fileType(input.file) || null,
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
  if (error && input.file) {
    // The file is up but the message didn't save; don't leave it orphaned.
    const path = attachment.attachment_path as string;
    supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    if (/attachment_|column|messages_body/i.test(error.message)) {
      return { message: null, error: FILES_NOT_SET_UP };
    }
  }
  return { message: data ?? null, error: describe(error) };
}

/** Send text and any number of files: the text rides with the first file,
 *  and each further file is its own message. Stops at the first failure and
 *  says which file it was. */
export async function sendWithFiles(input: {
  threadUserId: string;
  body: string;
  fromAdmin: boolean;
  senderName: string;
  files: File[];
}): Promise<{ sent: Message[]; error: string | null }> {
  const sent: Message[] = [];
  const queue: (File | null)[] = input.files.length ? input.files : [null];
  for (let i = 0; i < queue.length; i++) {
    const { message, error } = await sendMessage({
      threadUserId: input.threadUserId,
      body: i === 0 ? input.body : "",
      fromAdmin: input.fromAdmin,
      senderName: input.senderName,
      file: queue[i],
    });
    if (message) sent.push(message);
    if (error) return { sent, error };
  }
  return { sent, error: null };
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
      t = { userId: m.thread_user_id, name: "", email: "", latest: m, latestFromThem: null, fromThem: [] };
      byUser.set(m.thread_user_id, t);
    }
    if (!m.from_admin) {
      if (!m.unsent_at) {
        if (!t.latestFromThem) t.latestFromThem = m;
        t.fromThem.push(m);
      }
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
  onChange: (m: Message | null) => void
): () => void {
  if (!authEnabled) return () => {};
  const filter = threadUserId ? { filter: `thread_user_id=eq.${threadUserId}` } : {};
  const channel = supabase
    .channel(`messages:${threadUserId ?? "all"}:${Math.random().toString(36).slice(2)}`)
    // New messages and unsends. (A deleted conversation arrives as DELETE,
    // with no row to merge — callers just reload.)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages", ...filter },
      (payload: { eventType: string; new: Message }) =>
        onChange(payload.eventType === "DELETE" ? null : payload.new)
    )
    // Read receipts and "mark as unread".
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "message_threads",
        ...(threadUserId ? { filter: `user_id=eq.${threadUserId}` } : {}),
      },
      () => onChange(null)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ---- Read state, unsend, delete (messages-v2.sql) ----

export const V2_NOT_SET_UP =
  "This isn't switched on yet — the site owner needs to run supabase/messages-v2.sql in Supabase.";

const missingFunction = (e: { message?: string; code?: string } | null) =>
  Boolean(e && (e.code === "PGRST202" || e.code === "42883" || /could not find the function|does not exist/i.test(e.message ?? "")));

/** The read state of one conversation, or of every conversation for an admin.
 *  Empty if messages-v2.sql hasn't been run; callers then fall back to the
 *  read markers kept in this browser. */
export async function fetchThreadStates(threadUserId?: string): Promise<{ states: Map<string, ThreadState>; available: boolean }> {
  if (!authEnabled) return { states: new Map(), available: false };
  let q = supabase.from("message_threads").select("*");
  if (threadUserId) q = q.eq("user_id", threadUserId);
  const { data, error } = await q;
  if (error) return { states: new Map(), available: false };
  return {
    states: new Map((data as ThreadState[]).map((t) => [t.user_id, t])),
    available: true,
  };
}

export async function markThreadRead(threadUserId: string) {
  if (!authEnabled) return;
  await supabase.rpc("mark_thread_read", { p_thread: threadUserId });
}

export async function markThreadUnread(threadUserId: string): Promise<string | null> {
  if (!authEnabled) return "Login isn't set up on this site yet.";
  const { error } = await supabase.rpc("mark_thread_unread", { p_thread: threadUserId });
  if (missingFunction(error)) return V2_NOT_SET_UP;
  return error?.message ?? null;
}

/** Unsend one of your own messages, and remove its file. */
export async function unsendMessage(messageId: string): Promise<string | null> {
  if (!authEnabled) return "Login isn't set up on this site yet.";
  const { data, error } = await supabase.rpc("unsend_message", { p_message: messageId });
  if (missingFunction(error)) return V2_NOT_SET_UP;
  if (error) return error.message;
  if (typeof data === "string" && data) {
    await supabase.storage.from(BUCKET).remove([data]).catch(() => {});
  }
  return null;
}

/** The person clears the chat on their side (the team keeps its copy). */
export async function clearMyThread(): Promise<string | null> {
  if (!authEnabled) return "Login isn't set up on this site yet.";
  const { error } = await supabase.rpc("clear_my_thread");
  if (missingFunction(error)) return V2_NOT_SET_UP;
  return error?.message ?? null;
}

/** Admin only: delete a whole conversation, and its files, for everyone. */
export async function deleteThread(threadUserId: string): Promise<string | null> {
  if (!authEnabled) return "Login isn't set up on this site yet.";
  const { data, error } = await supabase.rpc("delete_thread", { p_thread: threadUserId });
  if (missingFunction(error)) return V2_NOT_SET_UP;
  if (error) return error.message;
  // The files the messages pointed at, plus anything else left in the folder
  // (from unsent messages, or an upload that never became a message).
  const paths = new Set<string>(((data as (string | null)[]) ?? []).filter(Boolean) as string[]);
  const listed = await supabase.storage.from(BUCKET).list(threadUserId, { limit: 1000 });
  (listed.data ?? []).forEach((f: { name: string }) => paths.add(`${threadUserId}/${f.name}`));
  const all = [...paths];
  for (let i = 0; i < all.length; i += 100) {
    await supabase.storage.from(BUCKET).remove(all.slice(i, i + 100)).catch(() => {});
  }
  return null;
}

/** Is there something in this conversation the viewer hasn't read? */
export function isUnread(opts: {
  latestFromThem: Message | null;
  state: ThreadState | undefined;
  viewerIsAdmin: boolean;
  /** Fallback read marker from this browser, when there's no server state. */
  localSeen: string;
}): boolean {
  const { latestFromThem, state, viewerIsAdmin, localSeen } = opts;
  if (state && (viewerIsAdmin ? state.admin_marked_unread : state.user_marked_unread)) return true;
  if (!latestFromThem) return false;
  const lastRead = state ? (viewerIsAdmin ? state.admin_last_read_at : state.user_last_read_at) : null;
  const since = lastRead ?? localSeen;
  return !since || Date.parse(latestFromThem.created_at) > Date.parse(since);
}

/** How many of their messages arrived after the viewer last read. */
export function unreadCount(messages: Message[], state: ThreadState | undefined, viewerIsAdmin: boolean, localSeen: string) {
  const lastRead = state ? (viewerIsAdmin ? state.admin_last_read_at : state.user_last_read_at) : null;
  const since = lastRead ?? localSeen;
  const t = since ? Date.parse(since) : 0;
  return messages.filter((m) => m.from_admin !== viewerIsAdmin && !m.unsent_at && Date.parse(m.created_at) > t).length;
}

// ---- Read markers (fallback) ----
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
    const prev = lastSeen(viewerId, threadUserId);
    if (!prev || Date.parse(at) > Date.parse(prev)) localStorage.setItem(seenKey(viewerId, threadUserId), at);
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
