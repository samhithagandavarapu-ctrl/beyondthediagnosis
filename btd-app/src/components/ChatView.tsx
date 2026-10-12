import { useEffect, useRef, useState } from "react";
import Icon from "./icons/Icon";
import type { Message } from "../lib/messages";

function when(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/** One conversation: messages in order, and a box to write the next one.
 *  "Mine" sits on the right in navy; the other side on the left in white. */
export default function ChatView({
  messages,
  viewerIsAdmin,
  theirName,
  onSend,
  emptyText,
  placeholder = "Write a message",
}: {
  messages: Message[];
  /** Which side is "me": the team's messages, or the person's. */
  viewerIsAdmin: boolean;
  theirName: string;
  onSend: (body: string) => Promise<string | null>;
  emptyText: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const err = await onSend(body);
    setSending(false);
    if (err) setError(err);
    else setDraft("");
  }

  return (
    <div className="flex min-h-[420px] flex-col">
      <div
        className="flex-1 space-y-3 overflow-y-auto rounded-tile bg-mist p-4 max-h-[60vh]"
        aria-live="polite"
        aria-label="Conversation"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">{emptyText}</p>
        ) : (
          messages.map((m) => {
            const mine = m.from_admin === viewerIsAdmin;
            const who = mine ? "You" : m.from_admin ? "Voiced team" : theirName;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%] sm:max-w-[70%]">
                  <p className={`mb-1 text-11 font-bold uppercase tracking-[0.08em] text-muted ${mine ? "text-right" : ""}`}>
                    {who} · {when(m.created_at)}
                  </p>
                  <p
                    className={`whitespace-pre-wrap break-words rounded-tile px-4 py-2.5 text-15 leading-[1.55] ${
                      mine ? "bg-navy text-mist" : "border border-navy/12 bg-white text-navy"
                    }`}
                  >
                    {m.body}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="mt-3 grid gap-2">
        {error && (
          <p role="alert" className="rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
            {error}
          </p>
        )}
        <label htmlFor="chat-draft" className="sr-only">
          Your message
        </label>
        <textarea
          id="chat-draft"
          className="btd-input min-h-[84px]"
          value={draft}
          maxLength={4000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/Cmd + Enter sends; plain Enter is a new line, so nobody
            // sends half a message by accident.
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
          }}
          placeholder={placeholder}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="hidden text-12 text-muted sm:inline">Ctrl + Enter to send</span>
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="ml-auto inline-flex items-center gap-2 rounded bg-navy px-4 py-2.5 text-sm font-semibold text-mist disabled:opacity-50"
          >
            <Icon name="send" size={16} />
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
