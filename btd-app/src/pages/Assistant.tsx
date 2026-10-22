import { FormEvent, useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { sendChatMessage, prepNotesFromChat, ChatMessage } from "../lib/api";
import { addNotesToDraft, draftLabel } from "../lib/drafts";
import { useAccountMode } from "../context/AccountModeContext";
import { useAuth } from "../context/AuthContext";
import { Chat, ChatStore, chatLabel, deleteChat, listChats, newChat, saveChat, sortChats } from "../lib/chats";
import DictateButton from "../components/DictateButton";
import { inkLastWord } from "../components/Scribble";

export const STARTER_PROMPTS = [
  "What are my rights at a doctor's appointment?",
  "My doctor said it's just because of Down syndrome, but I don't think that's right.",
  "How do I describe a new symptom clearly to a provider?",
];

const bubble = "max-w-[80%] px-[18px] py-4 text-15 leading-[1.65] whitespace-pre-wrap";
const assistantBubble = `${bubble} justify-self-start bg-sky-tint border border-navy/10 rounded-[18px_18px_18px_4px]`;
const userBubble = `${bubble} btd-dark justify-self-end rounded-[18px_18px_4px_18px]`;

/** The assistant is asked for plain text, but strip any Markdown that slips
 *  through so people never see stray asterisks or # signs. */
function plainText(text: string) {
  return text
    .replace(/^(\s*)[-*]\s+/gm, "$1• ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*/g, "");
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi — I'm the Voiced AI Advocate. I'm an AI, not a person. I can help you understand your rights, prepare for an appointment, or think through how to raise a concern with a provider. I can't diagnose anything or recommend treatment — but I can help you build a clear, confident case to bring to your doctor. What's going on?",
};

export default function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  // Notes go on the drafts of whoever this account is for (a parent's child).
  const { subjectId } = useAccountMode();
  const userId = user?.id ?? null;
  // Chat history: every saved chat, and which one is open (null = a new chat
  // that hasn't been sent yet, so isn't saved).
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatStore, setChatStore] = useState<ChatStore>("device");
  const [chatId, setChatId] = useState<string | null>(null);
  const [showChats, setShowChats] = useState(false);
  // Latest values for code that finishes after a reply streams in.
  const chatsRef = useRef(chats);
  chatsRef.current = chats;
  const openIdRef = useRef<string | null>(null);
  // Saving the chat to Appointment Prep.
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep the newest message in view by scrolling only the chat box, never the
  // page. Skipped while it's just the greeting, so it opens at the top.
  useEffect(() => {
    const box = scrollRef.current;
    if (!box || (messages.length <= 1 && !loading)) return;
    box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [messages, loading, error]);

  // Load saved chats once we know who's here, and again if that changes
  // (signing in brings this device's chats into the account).
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    listChats(userId).then((res) => {
      if (cancelled) return;
      setChats(res.chats);
      setChatStore(res.store);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  /** Save the open chat with these messages, and keep the list in step. */
  async function persist(id: string, final: ChatMessage[]) {
    const existing = chatsRef.current.find((c) => c.id === id);
    const chat: Chat = {
      ...(existing ?? { ...newChat(final), id }),
      messages: final,
      updatedAt: new Date().toISOString(),
    };
    setChats((prev) => sortChats([chat, ...prev.filter((c) => c.id !== id)]));
    await saveChat(userId, chat);
  }

  function resetView(next: ChatMessage[]) {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setMessages(next);
    setInput("");
    setError(null);
    setSaved(null);
    setSaveError(null);
    setShowChats(false);
  }

  function openChat(c: Chat) {
    resetView(c.messages.length ? c.messages : [GREETING]);
    setChatId(c.id);
    openIdRef.current = c.id;
  }

  function startNewChat() {
    resetView([GREETING]);
    setChatId(null);
    openIdRef.current = null;
  }

  async function updateChat(c: Chat, patch: Partial<Chat>) {
    const updated = { ...c, ...patch };
    setChats((prev) => sortChats(prev.map((x) => (x.id === c.id ? updated : x))));
    await saveChat(userId, updated);
  }

  function renameChat(c: Chat) {
    const title = window.prompt("Name this chat:", chatLabel(c));
    if (title === null) return;
    updateChat(c, { title: title.trim() });
  }

  async function removeChat(c: Chat) {
    if (!window.confirm(`Delete the chat "${chatLabel(c)}"? This can't be undone.`)) return;
    setChats((prev) => prev.filter((x) => x.id !== c.id));
    if (c.id === chatId) startNewChat();
    await deleteChat(userId, c.id);
  }

  async function handleSend(e?: FormEvent, prompt?: string) {
    e?.preventDefault();
    const text = (prompt ?? input).trim();
    if (!text || loading) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError(null);
    setSaved(null);
    setSaveError(null);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let soFar = "";
    let final: ChatMessage[] = next;
    const id = chatId ?? crypto.randomUUID();
    setChatId(id);
    openIdRef.current = id;
    // If the person opens another chat mid-reply, keep this reply off screen.
    const show = (m: ChatMessage[]) => {
      if (openIdRef.current === id) setMessages(m);
    };

    try {
      // Show the reply as it streams in; "Thinking…" covers the gap before
      // the first words arrive.
      const reply = await sendChatMessage(
        next,
        (text) => {
          soFar = text;
          show([...next, { role: "assistant", content: text }]);
        },
        controller.signal
      );
      final = [...next, { role: "assistant", content: reply }];
      show(final);
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        // Stopped on purpose: keep whatever had arrived, and say it was cut short.
        if (soFar.trim()) {
          final = [...next, { role: "assistant", content: `${soFar.trimEnd()}\n\n(Stopped)` }];
          show(final);
        }
        return;
      }
      if (openIdRef.current !== id) return;
      // Show what actually went wrong. The old text blamed a local dev server,
      // which is misleading anywhere but a developer's own machine.
      setError(
        err instanceof Error && err.message
          ? err.message
          : "The assistant couldn't respond just now. Please try again."
      );
    } finally {
      // Save the chat even if it was stopped or another chat was opened.
      // A newer request may own the loading state by now; only clear our own.
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
      persist(id, final);
    }
  }

  async function handleSaveToPrep(where: "current" | "new") {
    setSaving(true);
    setSaved(null);
    setSaveError(null);
    try {
      const notes = await prepNotesFromChat(messages);
      const found = notes.symptoms.length + notes.questions.length + (notes.reasonForVisit ? 1 : 0);
      if (found === 0) {
        setSaveError(
          "I didn't find any symptoms or questions for your doctor in this chat yet. Tell me what's going on, then try again."
        );
        return;
      }
      const draft = await addNotesToDraft(user?.id ?? null, notes, where, subjectId);
      const parts = [
        notes.symptoms.length && `${notes.symptoms.length} symptom${notes.symptoms.length > 1 ? "s" : ""}`,
        notes.questions.length && `${notes.questions.length} question${notes.questions.length > 1 ? "s" : ""}`,
        notes.reasonForVisit && "the reason for the visit",
      ].filter(Boolean) as string[];
      const list =
        parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
      setSaved(`Added ${list} to "${draftLabel(draft)}".`);
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error && err.message ? err.message : "Couldn't save to Appointment Prep. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  // Leaving the page stops a reply that's still coming.
  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <section className="mx-auto max-w-[1200px] px-6 pt-14 pb-20">
      <span className="btd-eyebrow">Always free</span>
      <h1 className="mt-3 text-[clamp(2rem,4.5vw,3rem)] font-extrabold leading-[1.1]">
        {inkLastWord("AI Advocate")}
      </h1>
      <p className="mt-3.5 mb-7 max-w-[40em] text-17 leading-[1.7] text-body">
        Education and advocacy support only. This assistant never diagnoses, never
        recommends medication, and always defers to your provider's care plan.
      </p>
      <p
        role="note"
        className="-mt-3 mb-7 max-w-[40em] rounded-tile border border-navy/16 bg-mist px-4 py-3 text-15 leading-[1.6] text-body"
      >
        <strong className="text-navy">AI can make mistakes.</strong> Answers here may be
        wrong or missing something. Always check important information with your doctor
        or another trusted source.
      </p>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* On small screens the list folds away behind a button above the chat. */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setShowChats((v) => !v)}
          aria-expanded={showChats}
          className="rounded-full border border-navy/16 bg-white px-4 py-2 text-sm font-semibold text-navy"
        >
          {showChats ? "Hide your chats" : `Your chats${chats.length ? ` (${chats.length})` : ""}`}
        </button>
      </div>
      <aside
        aria-label="Your chats"
        className={`${showChats ? "block" : "hidden"} lg:block btd-card rounded-panel overflow-hidden lg:h-[70vh] lg:min-h-[460px]`}
      >
        <ChatList
          chats={chats}
          openId={chatId}
          store={chatStore}
          signedIn={Boolean(userId)}
          onNew={startNewChat}
          onOpen={openChat}
          onPin={(c) => updateChat(c, { pinned: !c.pinned })}
          onRename={renameChat}
          onDelete={removeChat}
        />
      </aside>

      <div className="btd-card rounded-panel overflow-hidden flex flex-col h-[70vh] min-h-[460px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 grid gap-4 content-start">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? userBubble : assistantBubble}>
              {m.role === "assistant" ? plainText(m.content) : m.content}
            </div>
          ))}
          {loading && messages[messages.length - 1]?.role === "user" && <div className={`${assistantBubble} text-body`}>Thinking…</div>}
          {error && (
            <div className="rounded-tile bg-coral/25 px-4 py-3 text-sm text-coral-ink">
              {error}
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="px-6 pb-4 flex flex-wrap gap-2">
            {STARTER_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSend(undefined, p)}
                disabled={loading}
                className="rounded-full border border-navy/16 bg-mist px-3.5 py-[9px] text-13 text-body transition-colors hover:border-link hover:text-navy"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {messages.some((m) => m.role === "user") && !loading && (
          <div className="border-t border-navy/10 px-6 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body">Save this chat to Appointment Prep:</span>
              <button
                type="button"
                onClick={() => handleSaveToPrep("current")}
                disabled={saving}
                className="rounded-full border border-navy/16 bg-mist px-3.5 py-[7px] text-13 text-navy transition-colors hover:border-link disabled:opacity-50"
              >
                Add to my draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveToPrep("new")}
                disabled={saving}
                className="rounded-full border border-navy/16 bg-mist px-3.5 py-[7px] text-13 text-navy transition-colors hover:border-link disabled:opacity-50"
              >
                Start a new draft
              </button>
              {saving && <span className="text-muted">Saving…</span>}
            </div>
            {saved && (
              <p className="mt-2 text-navy" role="status">
                {saved}{" "}
                <Link to="/appointment-prep" className="font-semibold text-link underline">
                  Open Appointment Prep
                </Link>
              </p>
            )}
            {saveError && (
              <p className="mt-2 text-coral-ink" role="alert">
                {saveError}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSend} className="border-t border-navy/10 p-3.5 flex gap-2.5 items-center">
          <label htmlFor="chat-input" className="sr-only">
            Message the AI Advocate
          </label>
          <input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            className="flex-1 min-w-0 rounded-full border border-navy/16 bg-white px-[18px] py-[13px] text-15 placeholder:text-[#6C8095] focus:border-link focus:outline-none"
          />
          <DictateButton variant="icon" value={input} onChange={setInput} label="your message" />
          {loading ? (
            <button
              type="button"
              onClick={handleStop}
              className="min-h-[46px] rounded-full border border-navy/30 bg-white px-[22px] text-15 font-semibold text-navy transition-colors hover:border-navy"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="btd-btn-coral min-h-[46px] px-[22px] text-15 disabled:opacity-40"
            >
              Send
            </button>
          )}
        </form>
      </div>

      </div>

      <p className="mt-4 text-sm text-muted">
        In a medical emergency, call 911 or your local emergency number immediately — do
        not wait on a response here.
      </p>
    </section>
  );
}

// ---- Chat history ----

function ChatList({
  chats,
  openId,
  store,
  signedIn,
  onNew,
  onOpen,
  onPin,
  onRename,
  onDelete,
}: {
  chats: Chat[];
  openId: string | null;
  store: ChatStore;
  signedIn: boolean;
  onNew: () => void;
  onOpen: (c: Chat) => void;
  onPin: (c: Chat) => void;
  onRename: (c: Chat) => void;
  onDelete: (c: Chat) => void;
}) {
  // Which chat's Pin / Rename / Delete menu is open.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const pinned = chats.filter((c) => c.pinned);
  const recent = chats.filter((c) => !c.pinned);

  const row = (c: Chat) => {
    const open = c.id === openId;
    const menuOpen = menuFor === c.id;
    return (
      <li key={c.id}>
        <div
          className={`group flex items-center gap-1 rounded-tile pr-1 ${
            open ? "bg-sky-tint" : "hover:bg-mist"
          }`}
        >
          <button
            type="button"
            onClick={() => onOpen(c)}
            aria-current={open ? "true" : undefined}
            className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm text-navy"
            title={chatLabel(c)}
          >
            {chatLabel(c)}
          </button>
          <button
            type="button"
            onClick={() => setMenuFor(menuOpen ? null : c.id)}
            aria-expanded={menuOpen}
            aria-label={`Options for ${chatLabel(c)}`}
            className="shrink-0 rounded-full px-2 py-1 text-body hover:bg-white"
          >
            ⋯
          </button>
        </div>
        {menuOpen && (
          <div className="mx-2 mb-1 flex gap-1 text-13">
            {[
              [c.pinned ? "Unpin" : "Pin", () => onPin(c)],
              ["Rename", () => onRename(c)],
              ["Delete", () => onDelete(c)],
            ].map(([label, action]) => (
              <button
                key={label as string}
                type="button"
                onClick={() => {
                  setMenuFor(null);
                  (action as () => void)();
                }}
                className={`rounded-full border border-navy/16 bg-white px-3 py-1 ${
                  label === "Delete" ? "text-coral-ink" : "text-navy"
                }`}
              >
                {label as string}
              </button>
            ))}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-navy/10 p-3">
        <button
          type="button"
          onClick={onNew}
          className="w-full rounded-full border border-navy/16 bg-white px-4 py-2 text-sm font-semibold text-navy hover:border-link"
        >
          + New chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {chats.length === 0 && (
          <p className="px-3 py-2 text-13 text-muted">Your chats will show up here.</p>
        )}
        {pinned.length > 0 && (
          <>
            <h2 className="px-3 pt-2 pb-1 text-11 font-semibold uppercase tracking-wide text-muted">
              Pinned
            </h2>
            <ul>{pinned.map(row)}</ul>
          </>
        )}
        {recent.length > 0 && (
          <>
            <h2 className="px-3 pt-2 pb-1 text-11 font-semibold uppercase tracking-wide text-muted">
              Recent
            </h2>
            <ul>{recent.map(row)}</ul>
          </>
        )}
      </div>
      <p className="border-t border-navy/10 px-4 py-2 text-11 text-muted">
        {store === "account"
          ? "Saved to your account."
          : signedIn
            ? "Saved in this browser for now."
            : "Saved in this browser. Sign in to keep chats on every device."}
      </p>
    </div>
  );
}
