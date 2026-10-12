import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import { fetchProfile } from "../lib/profile";
import {
  Message,
  fetchThread,
  markSeen,
  mergeMessages,
  sendMessage,
  subscribeToMessages,
} from "../lib/messages";
import ChatView from "../components/ChatView";
import PageHero from "../components/PageHero";
import PageLoading from "../components/PageLoading";

// Checked this often as a backstop, in case live updates aren't switched on.
const POLL_MS = 20_000;

/** A signed-in person's conversation with the Voiced team. */
export default function Messages() {
  const { user, isAdmin, loading } = useAuth();
  const { refresh: refreshNotifications } = useNotifications();
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [name, setName] = useState("");

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setFetching(false);
      return;
    }
    let cancelled = false;
    const load = () =>
      fetchThread(userId).then(({ messages, error }) => {
        if (cancelled) return;
        setError(error);
        setMessages((prev) => mergeMessages(prev, messages));
        setFetching(false);
      });
    load();
    fetchProfile(userId).then((p) => {
      if (!cancelled) setName(p?.full_name?.trim() || p?.username?.trim() || "");
    });
    const stop = subscribeToMessages(userId, (m) => setMessages((prev) => mergeMessages(prev, [m])));
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => {
      cancelled = true;
      stop();
      window.clearInterval(timer);
    };
  }, [userId]);

  // Being on this page means everything here has been seen.
  const newest = messages[messages.length - 1]?.created_at;
  useEffect(() => {
    if (!userId || !newest) return;
    markSeen(userId, userId, newest);
    refreshNotifications();
  }, [userId, newest, refreshNotifications]);

  if (loading || fetching) return <PageLoading label="Loading your messages…" />;

  if (!user) {
    return (
      <div>
        <PageHero
          eyebrow="Messages"
          title="Sign in to message us"
          lede="Questions about the site, a story you sent in, or anything else — a real person on the Voiced team reads every message."
        />
        <div className="btd-container py-14">
          <Link to="/login" className="btd-btn-coral px-[18px] py-[11px] text-sm">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        tone="navy"
        eyebrow="Messages"
        title="Message the Voiced team"
        lede="Ask a question, tell us about a problem with the site, or ask about a story you sent in. A real person reads every message."
      />
      <div className="btd-container max-w-3xl pt-10 pb-20">
        <p className="mb-4 rounded-tile bg-coral px-4 py-3 text-sm font-semibold text-coral-ink">
          This isn't for emergencies or medical advice. If someone is in danger or very
          unwell right now, call 911.
        </p>

        {isAdmin && (
          <p className="mb-4 rounded-tile bg-sky-tint px-4 py-3 text-sm text-sky-ink">
            You're an admin, so people's messages to you are in the{" "}
            <Link to="/admin/messages" className="font-semibold text-link hover:underline">
              admin inbox
            </Link>
            .
          </p>
        )}

        {error ? (
          <p role="alert" className="rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
            {error}
          </p>
        ) : (
          <div className="btd-card p-4 sm:p-5">
            <ChatView
              messages={messages}
              viewerIsAdmin={false}
              theirName="Voiced team"
              emptyText="No messages yet. Say hello — we usually reply within a few days."
              onSend={async (body) => {
                const { message, error } = await sendMessage({
                  threadUserId: user.id,
                  body,
                  fromAdmin: false,
                  senderName: name,
                });
                if (message) setMessages((prev) => mergeMessages(prev, [message]));
                return error;
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
