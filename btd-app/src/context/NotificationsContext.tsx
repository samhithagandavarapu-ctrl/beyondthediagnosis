import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { fetchMyReviewedStories, StoryRow } from "../lib/stories";
import { Message, fetchIncoming, lastSeen, messagePreview, subscribeToMessages } from "../lib/messages";

// Notifications are worked out, not stored: each one is a fact about the
// person's account ("a story you sent in was published", "you have a new
// message") checked against the list of ones they've already read. Only that
// read list is kept, in this browser, per account.

export const CONTACT_EMAIL = "withvoiced@gmail.com";

export type AppNotification = {
  id: string;
  kind: "story-approved" | "story-rejected" | "message";
  title: string;
  body: string;
  /** Where the button goes, and what it says. */
  href: string;
  action: string;
  at: string;
  read: boolean;
};

type NotificationsState = {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  refresh: () => void;
};

const NotificationsContext = createContext<NotificationsState | undefined>(undefined);

// How often to look again while a tab sits open. Approvals happen by hand, so
// there's no need to be quick about it — and focusing the tab checks at once.
const POLL_MS = 2 * 60_000;

const readKey = (userId: string) => `voiced:notifications-read:${userId}`;

function loadRead(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(readKey(userId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveRead(userId: string, ids: Set<string>) {
  try {
    localStorage.setItem(readKey(userId), JSON.stringify([...ids]));
  } catch {
    // ignore — worst case a notification shows as new again
  }
}

/** autoRead: already read without being marked, e.g. a message whose
 *  conversation has been opened since. */
type Raw = Omit<AppNotification, "read"> & { autoRead?: boolean };

function storyNotification(s: StoryRow): Raw {
  if (s.status === "approved") {
    return {
      id: `story-approved:${s.id}`,
      kind: "story-approved",
      title: "Your story was published",
      body: `"${s.title}" is now on Community Stories for everyone to read.`,
      href: `/stories#story-${s.id}`,
      action: "See your story",
      at: s.created_at,
    };
  }
  const reason = s.rejection_reason?.trim();
  const note = s.rejection_note?.trim();
  return {
    id: `story-rejected:${s.id}`,
    kind: "story-rejected",
    title: "Your story wasn't published",
    body: [
      `"${s.title}" didn't follow our community guidelines, so it won't appear on Community Stories.`,
      reason ? `Reason: ${reason}.` : "",
      note ? `Note from the reviewer: ${note}` : "",
      `If you have questions, send us a message or email ${CONTACT_EMAIL}.`,
    ]
      .filter(Boolean)
      .join(" "),
    href: "/messages",
    action: "Message us",
    at: s.created_at,
  };
}

/** One notification per conversation with something new in it: the newest
 *  message from the other side. A newer message makes a new notification. */
function messageNotifications(incoming: Message[], viewerId: string, asAdmin: boolean): Raw[] {
  const newestPerThread = new Map<string, Message>();
  for (const m of incoming) {
    if (!newestPerThread.has(m.thread_user_id)) newestPerThread.set(m.thread_user_id, m);
  }
  return [...newestPerThread.values()].map((m) => {
    const who = asAdmin ? m.sender_name?.trim() || m.sender_email || "someone" : "the Voiced team";
    const text = messagePreview(m);
    const preview = text.length > 140 ? `${text.slice(0, 140).trimEnd()}…` : text;
    return {
      id: `message:${m.id}`,
      kind: "message",
      title: `New message from ${who}`,
      body: preview,
      href: asAdmin ? `/admin/messages?user=${m.thread_user_id}` : "/messages",
      action: "Read and reply",
      at: m.created_at,
      autoRead: lastSeen(viewerId, m.thread_user_id) >= m.created_at,
    };
  });
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  const userId = user?.id ?? null;
  const [raw, setRaw] = useState<Raw[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  // Whose notifications are on screen, so a slow answer for an account that
  // has since signed out can't land in the next one's list.
  const currentUser = useRef(userId);

  useEffect(() => {
    currentUser.current = userId;
    setRaw([]);
    setReadIds(userId ? loadRead(userId) : new Set());
  }, [userId]);

  const refresh = useCallback(() => {
    if (!userId) return;
    Promise.all([fetchMyReviewedStories(userId), fetchIncoming(isAdmin)]).then(
      ([stories, incoming]) => {
        if (currentUser.current !== userId) return;
        const items = [
          ...stories.map(storyNotification),
          ...messageNotifications(incoming, userId, isAdmin),
        ].sort((a, b) => b.at.localeCompare(a.at));
        setRaw(items);
      }
    );
  }, [userId, isAdmin]);

  useEffect(() => {
    if (!userId) return;
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    // Messages are a conversation, so don't wait for the next check: a new
    // one updates the bell straight away (when live updates are switched on).
    const stopLive = subscribeToMessages(isAdmin ? null : userId, () => refresh());
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
      stopLive();
    };
  }, [userId, isAdmin, refresh]);

  const notifications = useMemo(
    () => raw.map(({ autoRead, ...n }) => ({ ...n, read: Boolean(autoRead) || readIds.has(n.id) })),
    [raw, readIds]
  );

  const markRead = useCallback(
    (id: string) => {
      if (!userId) return;
      setReadIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev).add(id);
        saveRead(userId, next);
        return next;
      });
    },
    [userId]
  );

  const markAllRead = useCallback(() => {
    if (!userId) return;
    setReadIds((prev) => {
      const next = new Set(prev);
      raw.forEach((n) => next.add(n.id));
      saveRead(userId, next);
      return next;
    });
  }, [userId, raw]);

  const value: NotificationsState = {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    markRead,
    markAllRead,
    refresh,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
