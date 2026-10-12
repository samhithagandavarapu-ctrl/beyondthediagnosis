import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import {
  Message,
  Thread,
  fetchInbox,
  fetchThread,
  lastSeen,
  markSeen,
  mergeMessages,
  messagePreview,
  sendMessage,
  subscribeToMessages,
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

/** Every conversation with the Voiced team, and a reply box for each. */
export default function AdminMessages() {
  const { user, isAdmin, loading } = useAuth();
  const { refresh: refreshNotifications } = useNotifications();
  const [params, setParams] = useSearchParams();
  const selected = params.get("user");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  const loadInbox = useCallback(() => {
    fetchInbox().then(({ threads, error }) => {
      setThreads(threads);
      setError(error);
      setFetching(false);
    });
  }, []);

  // The list of conversations: on load, live, and every so often.
  useEffect(() => {
    if (!isAdmin) return;
    loadInbox();
    const stop = subscribeToMessages(null, (m) => {
      loadInbox();
      if (m.thread_user_id === selected) setMessages((prev) => mergeMessages(prev, [m]));
    });
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadInbox();
    }, POLL_MS);
    return () => {
      stop();
      window.clearInterval(timer);
    };
  }, [isAdmin, loadInbox, selected]);

  // The open conversation.
  useEffect(() => {
    setMessages([]);
    if (!isAdmin || !selected) return;
    let cancelled = false;
    const load = () =>
      fetchThread(selected).then(({ messages }) => {
        if (!cancelled) setMessages((prev) => mergeMessages(prev, messages));
      });
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isAdmin, selected]);

  // Opening a conversation marks it as seen.
  const newest = messages[messages.length - 1]?.created_at;
  useEffect(() => {
    if (!user || !selected || !newest) return;
    markSeen(user.id, selected, newest);
    refreshNotifications();
  }, [user, selected, newest, refreshNotifications]);

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

  return (
    <div className="btd-container py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-semibold">Messages</h1>
          <p className="text-slate">Only admins can see this page.</p>
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

      <div className="grid gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
        {/* Conversation list — hidden on phones while one is open. */}
        <aside className={selected ? "hidden md:block" : ""} aria-label="Conversations">
          {fetching ? (
            <p className="text-sm text-slate">Loading…</p>
          ) : threads.length === 0 ? (
            <p className="rounded-tile border border-dashed border-navy/20 bg-mist p-4 text-sm text-slate">
              No messages yet. When someone writes to you from their Messages page, it
              shows up here.
            </p>
          ) : (
            <ul className="grid gap-2">
              {threads.map((t) => {
                const unread =
                  t.latestFromThem && t.latestFromThem.created_at > lastSeen(user.id, t.userId);
                const active = t.userId === selected;
                return (
                  <li key={t.userId}>
                    <button
                      type="button"
                      onClick={() => setParams({ user: t.userId })}
                      aria-current={active ? "true" : undefined}
                      className={`w-full rounded-tile border-2 p-3 text-left transition-colors ${
                        active ? "border-navy bg-sky-tint" : "border-navy/12 bg-white hover:border-sky"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-navy">
                          {unread && <span className="sr-only">New: </span>}
                          {displayName(t)}
                        </span>
                        <span className="shrink-0 text-11 text-muted">{shortWhen(t.latest.created_at)}</span>
                        {unread && <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-coral-hover" />}
                      </span>
                      {t.name && t.email && (
                        <span className="block truncate text-12 text-muted">{t.email}</span>
                      )}
                      <span className="mt-1 block truncate text-13 text-body">
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
                  <h2 className="text-lg font-bold text-navy break-words">{currentName}</h2>
                  {currentEmail && (
                    <a href={`mailto:${currentEmail}`} className="text-13 text-link hover:underline break-all">
                      {currentEmail}
                    </a>
                  )}
                  <p className="mt-0.5 text-11 text-muted break-all">Account ID: {selected}</p>
                </div>
              </div>
              <ChatView
                messages={messages}
                viewerIsAdmin
                theirName={currentName}
                emptyText="Nothing in this conversation yet."
                placeholder={`Reply to ${currentName}`}
                onSend={async (body, file) => {
                  const { message, error } = await sendMessage({
                    threadUserId: selected,
                    body,
                    fromAdmin: true,
                    senderName: "Voiced team",
                    file,
                  });
                  if (message) {
                    setMessages((prev) => mergeMessages(prev, [message]));
                    loadInbox();
                  }
                  return error;
                }}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
