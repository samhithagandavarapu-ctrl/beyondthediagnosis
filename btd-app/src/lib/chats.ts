import { authEnabled, supabase } from "./supabaseClient";
import type { ChatMessage } from "./api";

// AI Advocacy Assistant chat history, like Appointment Prep drafts.
//
// Signed in, chats are kept in your account (the assistant_chats table — see
// supabase/assistant-chats.sql) so they follow you to any device. Signed out,
// or before that table exists, they're kept in this browser. Signing in moves
// any chats made on this device into the account.

export type Chat = {
  id: string;
  /** Empty means "use the first thing the person asked". */
  title: string;
  messages: ChatMessage[];
  pinned: boolean;
  updatedAt: string;
};

export type ChatStore = "account" | "device";

const LOCAL_KEY = "voiced:assistant-chats";

export function newChat(messages: ChatMessage[]): Chat {
  return {
    id: crypto.randomUUID(),
    title: "",
    messages,
    pinned: false,
    updatedAt: new Date().toISOString(),
  };
}

/** The name shown for a chat in the list. */
export function chatLabel(chat: Chat): string {
  if (chat.title.trim()) return chat.title.trim();
  const first = chat.messages.find((m) => m.role === "user")?.content.trim() ?? "";
  if (!first) return "New chat";
  return first.length > 48 ? `${first.slice(0, 47).trimEnd()}…` : first;
}

/** Pinned first, then newest first. */
export function sortChats(chats: Chat[]): Chat[] {
  return [...chats].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)
  );
}

// ---- This device ----

function readLocal(): Chat[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Chat[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(chats: Chat[]) {
  try {
    if (chats.length) localStorage.setItem(LOCAL_KEY, JSON.stringify(chats));
    else localStorage.removeItem(LOCAL_KEY);
  } catch {
    // Full or blocked storage just means chats aren't kept on this device.
  }
}

// ---- The account ----

type Row = {
  id: string;
  title: string;
  messages: ChatMessage[];
  pinned: boolean;
  updated_at: string;
};

const fromRow = (r: Row): Chat => ({
  id: r.id,
  title: r.title,
  messages: r.messages,
  pinned: r.pinned,
  updatedAt: r.updated_at,
});

const toRow = (c: Chat) => ({
  id: c.id,
  title: c.title,
  messages: c.messages,
  pinned: c.pinned,
  updated_at: c.updatedAt,
});

/** Every chat for whoever is here, pinned then newest, and where they live. */
export async function listChats(userId: string | null): Promise<{ chats: Chat[]; store: ChatStore }> {
  const local = readLocal();
  if (!userId || !authEnabled) return { chats: sortChats(local), store: "device" };

  // Bring anything made on this device into the account first.
  if (local.length) {
    const { error } = await supabase.from("assistant_chats").upsert(local.map(toRow), { onConflict: "id" });
    if (!error) writeLocal([]);
  }

  const { data, error } = await supabase
    .from("assistant_chats")
    .select("id, title, messages, pinned, updated_at")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("Couldn't load chats from the account:", error.message);
    return { chats: sortChats(readLocal()), store: "device" };
  }
  return { chats: sortChats((data as Row[]).map(fromRow)), store: "account" };
}

/** Save one chat where it lives. If the account can't take it, it's kept on
 *  this device instead of lost. */
export async function saveChat(userId: string | null, chat: Chat): Promise<ChatStore> {
  if (userId && authEnabled) {
    const { error } = await supabase.from("assistant_chats").upsert(toRow(chat), { onConflict: "id" });
    if (!error) return "account";
    console.error("Couldn't save chat to the account:", error.message);
  }
  writeLocal([chat, ...readLocal().filter((c) => c.id !== chat.id)]);
  return "device";
}

export async function deleteChat(userId: string | null, id: string): Promise<void> {
  writeLocal(readLocal().filter((c) => c.id !== id));
  if (userId && authEnabled) {
    const { error } = await supabase.from("assistant_chats").delete().eq("id", id);
    if (error) console.error("Couldn't delete chat from the account:", error.message);
  }
}
