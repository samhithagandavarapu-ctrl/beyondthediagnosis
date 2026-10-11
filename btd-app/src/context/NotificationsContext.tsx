import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { fetchMyApprovedStories } from "../lib/stories";

// Notifications are worked out, not stored: each one is a fact about the
// person's account (today, "a story you sent in was published") checked
// against the list of ones they've already read. Only that read list is kept,
// in this browser, per account.

export type AppNotification = {
  id: string;
  kind: "story-approved";
  title: string;
  body: string;
  /** Where "see it" goes. */
  href: string;
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

type Raw = Omit<AppNotification, "read">;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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
    fetchMyApprovedStories(userId).then((stories) => {
      if (currentUser.current !== userId) return;
      setRaw(
        stories.map((s) => ({
          id: `story-approved:${s.id}`,
          kind: "story-approved",
          title: "Your story was published",
          body: `"${s.title}" is now on Community Stories for everyone to read.`,
          href: `/stories#story-${s.id}`,
          at: s.created_at,
        }))
      );
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [userId, refresh]);

  const notifications = useMemo(
    () => raw.map((n) => ({ ...n, read: readIds.has(n.id) })),
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
