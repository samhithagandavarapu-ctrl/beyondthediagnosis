import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import {
  Message,
  Thread,
  ThreadState,
  deleteThread,
  fetchInbox,
  fetchThread,
  fetchThreadStates,
  isUnread,
  lastSeen,
  markSeen,
  markThreadRead,
  markThreadUnread,
  mergeMessages,
  messagePreview,
  sendWithFiles,
  subscribeToMessages,
  unreadCount,
  unsendMessage,
} from "../lib/messages";
import ChatView from "../components/ChatView";
import PageLoading from "../components/PageLoading";

const POLL_MS = 20_000;

function shortWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date().toDateString() === d.toDateString()
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

const displayName = (t: Thread) => t.name || t.email || "Someone without a name";

type Filter = "all" | "unread";

/** Every conversation with the Voiced team, and a reply box for each. */
export default function AdminMessages() {
  const { user, isAdmin, loading } = useAuth();
  const { refresh: refreshNotifications } = useNotifications();
  const [params, setParams] = useSearchParams();
  const selected = params.get("user");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [states, setStates] = useState<Map<string, ThreadState>>(new Map());
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  // The conversation just marked unread: don't mark it read again while it's
  // still on screen.
  const holdUnread = useRef<string | null>(null);

  const loadInbox = useCallback(async () => {
    const [{ threads, error }, { states }] = await Promise.all([fetchInbox(), fetchThreadStates()]);
    setThreads(threads);
    setStates(states);
    setError(error);
    setFetching(false);
  }, []);

  const loadThread = useCallback(async (id: string) => {
    const { messages } = await fetchThread(id);
    setMessages(messages);
  }, []);

  // The list of conversations, and the open one: on load, live, and every so often.
  useEffect(() => {
    if (!isAdmin) return;
    loadInbox();
    const stop = subscribeToMessages(null, (m) => {
      loadInbox();
      if (selected && (!m || m.thread_user_id === selected)) {
        if (m) setMessages((prev) => mergeMessages(prev, [m]));
        loadThread(selected);
      }
    });
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadInbox();
      if (selected) loadThread(selected);
    }, POLL_MS);
    return () => {
      stop();
      window.clearInterval(timer);
    };
  }, [isAdmin, loadInbox, loadThread, selected]);

  useEffect(() => {
    setMessages([]);
    setNotice(null);
    if (holdUnread.current !== selected) holdUnread.current = null;
    if (isAdmin && selected) loadThread(selected);
  }, [isAdmin, selected, loadThread]);

  // Opening a conversation marks it as read.
  const newestFromThem = [...messages].reverse().find((m) => !m.from_admin)?.created_at;
  useEffect(() => {
    if (!user || !selected || !newestFromThem) return;
    if (holdUnread.current === selected) return;
    markSeen(user.id, selected, newestFromThem);
    markThreadRead(selected).then(() => {
      loadInbox();
      refreshNotifications();
    });
  }, [user, selected, newestFromThem, refreshNotifications, loadInbox]);

  const rows = useMemo(() => {
    if (!user) return [];
    const q = query.trim().toLowerCase();
    return threads
      .map((t) => {
        const state = states.get(t.userId);
        const local = lastSeen(user.id, t.userId);
        const unread = isUnread({ latestFromThem: t.latestFromThem, state, viewerIsAdmin: true, localSeen: local });
        const count = unread ? unreadCount(t.fromThem, state, true, local) : 0;
        return { t, unread, count };
      })
      .filter(({ t, unread }) => {
        if (filter === "unread" && !unread) return false;
        if (!q) return true;
        return [t.name, t.email, t.latest.body].some((v) => v?.toLowerCase().includes(q));
      });
  }, [threads, states, filter, query, user]);

  const unreadTotal = useMemo(
    () =>
      user
        ? threads.filter((t) =>
            isUnread({
              latestFromThem: t.latestFromThem,
              state: states.get(t.userId),
              viewerIsAdmin: true,
              localSeen: lastSeen(user.id, t.userId),
            })
          ).length
        : 0,
    [threads, states, user]
  );

  if (loading) return <PageLoading />;

  if (!user || !isAdmin) {
    return (
      <div className="btd-container py-14 max-w-md">
        <h1 className="text-2xl font-display font-semibold mb-2">Not authorized</h1>
        <p className="text-slate">This inbox is only visible to Voiced admins.</p>
        {!user && (
          <Link to="/login" className="mt-4 inline-block text-gold-dark font-semibold hover:underline">
            Sign in →
          </Link>
        )}
      </div>
    );
  }

  const current = threads.find((t) => t.userId === selected) ?? null;
  // A person's first message may not be in the inbox list yet; fall back to
  // what the open conversation itself says about them.
  const fromThem = messages.find((m) => !m.from_admin);
  const currentName = current ? displayName(current) : fromThem?.sender_name || fromThem?.sender_email || "This person";
  const currentEmail = current?.email || fromThem?.sender_email || "";
  const currentState = selected ? states.get(selected) : undefined;

  async function markUnread() {
    if (!selected) return;
    holdUnread.current = selected;
    const err = await markThreadUnread(selected);
    if (err) {
      holdUnread.current = null;
      setNotice(err);
      return;
    }
    // Back to the list, where it now shows as unread.
    setParams({});
    loadInbox();
    refreshNotifications();
  }

  async function removeConversation() {
    if (!selected) return;
    if (
      !window.confirm(
        `Delete the whole conversation with ${currentName}, including photos and files? This deletes it for them too, and can't be undone.`
      )
    ) {
      return;
    }
    const err = await deleteThread(selected);
    if (err) {
      setNotice(err);
      return;
    }
    setParams({});
    loadInbox();
    refreshNotifications();
  }

  return (
    <div className="btd-container py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-semibold">Messages</h1>
          <p className="text-slate">
            Only admins can see this page.
            {unreadTotal > 0 && ` ${unreadTotal} unread.`}
          </p>
        </div>
        <Link to="/admin/stories" className="text-sm font-semibold text-link hover:underline">
          Story review →
        </Link>
      </div>

      {error && (
        <p role="alert" className="mb-6 rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
          {error}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-[320px_minmax(0,1fr)]">
        {/* Conversation list — hidden on phones while one is open. */}
        <aside className={selected ? "hidden md:block" : ""} aria-label="Conversations">
          <label htmlFor="inbox-search" className="sr-only">
            Search conversations
          </label>
          <input
            id="inbox-search"
            className="btd-input mb-2"
            placeholder="Search by name, email, or message"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="mb-3 inline-flex rounded-full border border-navy/20 p-0.5" role="group" aria-label="Show">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3.5 py-1.5 text-13 font-semibold ${
                  filter === f ? "bg-navy text-mist" : "text-navy"
                }`}
              >
                {f === "all" ? "All" : `Unread${unreadTotal ? ` (${unreadTotal})` : ""}`}
              </button>
            ))}
          </div>

          {fetching ? (
            <p className="text-sm text-slate">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="rounded-tile border border-dashed border-navy/20 bg-mist p-4 text-sm text-slate">
              {threads.length === 0
                ? "No messages yet. When someone writes to you from their Messages page, it shows up here."
                : filter === "unread"
                ? "Nothing unread. You're all caught up."
                : "No conversations match that search."}
            </p>
          ) : (
            <ul className="grid gap-2">
              {rows.map(({ t, unread, count }) => {
                const active = t.userId === selected;
                return (
                  <li key={t.userId}>
                    <button
                      type="button"
                      onClick={() => setParams({ user: t.userId })}
                      aria-current={active ? "true" : undefined}
                      className={`w-full rounded-tile border-2 p-3 text-left transition-colors ${
                        active ? "border-navy bg-sky-tint" : unread ? "border-sky bg-white" : "border-navy/12 bg-white hover:border-sky"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`min-w-0 flex-1 truncate text-sm text-navy ${unread ? "font-extrabold" : "font-semibold"}`}>
                          {unread && <span className="sr-only">{count ? `${count} unread: ` : "Marked unread: "}</span>}
                          {displayName(t)}
                        </span>
                        <span className="shrink-0 text-11 text-muted">{shortWhen(t.latest.created_at)}</span>
                        {unread && (
                          <span
                            aria-hidden="true"
                            className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-coral-hover px-1.5 text-11 font-bold text-coral-ink"
                          >
                            {count > 9 ? "9+" : count || "•"}
                          </span>
                        )}
                      </span>
                      {t.name && t.email && (
                        <span className="block truncate text-12 text-muted">{t.email}</span>
                      )}
                      <span className={`mt-1 block truncate text-13 ${unread ? "font-semibold text-navy" : "text-body"}`}>
                        {t.latest.from_admin ? "You: " : ""}
                        {messagePreview(t.latest)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className={selected ? "" : "hidden md:block"} aria-label="Conversation">
          {!selected ? (
            <div className="btd-card grid min-h-[300px] place-items-center p-6 text-center text-sm text-slate">
              Pick a conversation to read it and reply.
            </div>
          ) : (
            <div className="btd-card p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-navy/10 pb-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setParams({})}
                    className="mb-1 text-13 font-semibold text-link hover:underline md:hidden"
                  >
                    ← All conversations
                  </button>
                  {current?.name ? (
                    <p className="text-11 font-bold uppercase tracking-[0.1em] text-muted">
                      Wants to be called
                    </p>
                  ) : (
                    <p className="text-12 text-muted">They haven't said what to call them yet.</p>
                  )}
                  <h2 className="text-lg font-bold text-navy break-words">{currentName}</h2>
                  {currentEmail && currentEmail !== currentName && (
                    <a href={`mailto:${currentEmail}`} className="text-13 text-link hover:underline break-all">
                      {currentEmail}
                    </a>
                  )}
                  <p className="mt-0.5 text-11 text-muted break-all">Account ID: {selected}</p>
                  {currentState?.user_cleared_at && (
                    <p className="mt-1 text-12 text-muted">
                      They deleted this chat on their side on{" "}
                      {new Date(currentState.user_cleared_at).toLocaleDateString()}. Earlier messages are
                      only visible to you.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-13 font-semibold">
                  <button type="button" onClick={markUnread} className="text-link hover:underline">
                    Mark as unread
                  </button>
                  <button type="button" onClick={removeConversation} className="text-coral-ink hover:underline">
                    Delete conversation
                  </button>
                </div>
              </div>
              {notice && (
                <p role="status" className="mb-3 rounded border border-coral bg-coral/20 px-3 py-2 text-13 text-coral-ink">
                  {notice}
                </p>
              )}
              <ChatView
                messages={messages}
                viewerIsAdmin
                theirName={currentName}
                otherLastReadAt={currentState?.user_last_read_at ?? null}
                emptyText="Nothing in this conversation yet."
                placeholder={`Reply to ${currentName}`}
                onSend={async (body, files) => {
                  holdUnread.current = null;
                  const { sent, error } = await sendWithFiles({
                    threadUserId: selected,
                    body,
                    fromAdmin: true,
                    senderName: "Voiced team",
                    files,
                  });
                  if (sent.length) {
                    setMessages((prev) => mergeMessages(prev, sent));
                    loadInbox();
                  }
                  return error;
                }}
                onUnsend={async (m) => {
                  const err = await unsendMessage(m.id);
                  if (!err) {
                    loadThread(selected);
                    loadInbox();
                  }
                  return err;
                }}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
