import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import { Profile, displayNameFor, fetchProfile, savePreferredName } from "../lib/profile";
import {
  Message,
  ThreadState,
  clearMyThread,
  fetchThread,
  fetchThreadStates,
  markSeen,
  markThreadRead,
  markThreadUnread,
  mergeMessages,
  sendWithFiles,
  subscribeToMessages,
  unsendMessage,
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
  const [state, setState] = useState<ThreadState | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  // What they've asked to be called goes on every message, so the team
  // knows how to address them.
  const name = displayNameFor(user, profile);
  // After "Mark as unread", don't immediately mark it read again just because
  // the page is still open. Leaving and coming back, or sending, resets it.
  const holdUnread = useRef(false);

  const userId = user?.id ?? null;

  const load = useCallback(async () => {
    if (!userId) return;
    const [{ messages, error }, { states }] = await Promise.all([
      fetchThread(userId),
      fetchThreadStates(userId),
    ]);
    setError(error);
    // Replace rather than merge, so unsent and deleted messages update too.
    setMessages(messages);
    setState(states.get(userId));
    setFetching(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setFetching(false);
      return;
    }
    let cancelled = false;
    load();
    fetchProfile(userId).then((p) => {
      if (!cancelled) setProfile(p);
    });
    const stop = subscribeToMessages(userId, (m) => {
      if (m) setMessages((prev) => mergeMessages(prev, [m]));
      load();
    });
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => {
      cancelled = true;
      stop();
      window.clearInterval(timer);
    };
  }, [userId, load]);

  // Being on this page means everything here has been read.
  const newestFromTeam = [...messages].reverse().find((m) => m.from_admin)?.created_at;
  useEffect(() => {
    if (!userId || !newestFromTeam) return;
    if (holdUnread.current) return;
    markSeen(userId, userId, newestFromTeam);
    markThreadRead(userId).then(refreshNotifications);
  }, [userId, newestFromTeam, refreshNotifications]);

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

  // Cleared on this side: only show what came after.
  const clearedAt = state?.user_cleared_at ? Date.parse(state.user_cleared_at) : 0;
  const visible = messages.filter((m) => Date.parse(m.created_at) > clearedAt);

  async function markUnread() {
    if (!userId) return;
    holdUnread.current = true;
    const err = await markThreadUnread(userId);
    if (err) {
      holdUnread.current = false;
      setNotice(err);
      return;
    }
    setNotice("Marked as unread.");
    refreshNotifications();
  }

  async function deleteChat() {
    if (
      !window.confirm(
        "Delete this chat? The messages disappear from your screen. The Voiced team keeps its copy, so they can still help you."
      )
    ) {
      return;
    }
    const err = await clearMyThread();
    if (err) {
      setNotice(err);
      return;
    }
    setNotice("Chat deleted. You can start a new one any time.");
    load();
    refreshNotifications();
  }

  return (
    <div>
      <PageHero
        tone="navy"
        eyebrow="Messages"
        title="Message the Voiced team"
        lede="Ask a question, tell us about a problem with the site, or ask about a story you sent in. You can add photos or files too. A real person reads every message."
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
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-navy">Voiced team</h2>
              {visible.length > 0 && (
                <div className="flex flex-wrap gap-3 text-13 font-semibold">
                  <button type="button" onClick={markUnread} className="text-link hover:underline">
                    Mark as unread
                  </button>
                  <button type="button" onClick={deleteChat} className="text-coral-ink hover:underline">
                    Delete chat
                  </button>
                </div>
              )}
            </div>
            {notice && (
              <p role="status" className="mb-3 rounded bg-sky-tint px-3 py-2 text-13 text-sky-ink">
                {notice}
              </p>
            )}
            <CallMe current={name} />
            <ChatView
              messages={visible}
              viewerIsAdmin={false}
              theirName="Voiced team"
              otherLastReadAt={state?.admin_last_read_at ?? null}
              emptyText="No messages yet. Say hello — we usually reply within a few days."
              onSend={async (body, files) => {
                holdUnread.current = false;
                setNotice(null);
                const { sent, error } = await sendWithFiles({
                  threadUserId: user.id,
                  body,
                  fromAdmin: false,
                  senderName: name,
                  files,
                });
                if (sent.length) setMessages((prev) => mergeMessages(prev, sent));
                return error;
              }}
              onUnsend={async (m) => {
                const err = await unsendMessage(m.id);
                if (!err) load();
                return err;
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** "What should we call you?" — asked once, right where they write to us,
 *  then shown as a line they can change. */
function CallMe({ current }: { current: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setSaving(true);
    const { error } = await savePreferredName(value);
    setSaving(false);
    setError(error);
    if (!error) setEditing(false);
  }

  if (current && !editing) {
    return (
      <p className="mb-3 text-13 text-body">
        We'll call you <strong className="text-navy">{current}</strong>.{" "}
        <button
          type="button"
          onClick={() => {
            setValue(current);
            setEditing(true);
          }}
          className="font-semibold text-link hover:underline"
        >
          Change
        </button>
      </p>
    );
  }

  return (
    <form onSubmit={save} className="mb-4 rounded-tile bg-sky-tint p-3">
      <label htmlFor="call-me" className="block text-sm font-bold text-navy">
        What should we call you?
      </label>
      <div className="mt-1.5 flex flex-wrap gap-2">
        <input
          id="call-me"
          className="btd-input min-w-0 flex-1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your name, or a nickname"
        />
        <button
          type="submit"
          disabled={saving || !value.trim()}
          className="btd-btn-sky min-h-[40px] px-4 text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {current && (
          <button type="button" onClick={() => setEditing(false)} className="text-13 font-semibold text-link hover:underline">
            Cancel
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-12 text-coral-ink">{error}</p>}
    </form>
  );
}
