import { FormEvent, useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { sendChatMessage, prepNotesFromChat, ChatMessage } from "../lib/api";
import { addNotesToDraft, draftLabel } from "../lib/drafts";
import { useAuth } from "../context/AuthContext";
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

export default function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm the Voiced Advocacy Assistant. I can help you understand your rights, prepare for an appointment, or think through how to raise a concern with a provider. I can't diagnose anything or recommend treatment — but I can help you build a clear, confident case to bring to your doctor. What's going on?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
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

    try {
      // Show the reply as it streams in; "Thinking…" covers the gap before
      // the first words arrive.
      const reply = await sendChatMessage(
        next,
        (text) => {
          soFar = text;
          setMessages([...next, { role: "assistant", content: text }]);
        },
        controller.signal
      );
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        // Stopped on purpose: keep whatever had arrived, and say it was cut short.
        if (soFar.trim()) {
          setMessages([...next, { role: "assistant", content: `${soFar.trimEnd()}\n\n(Stopped)` }]);
        }
        return;
      }
      // Show what actually went wrong. The old text blamed a local dev server,
      // which is misleading anywhere but a developer's own machine.
      setError(
        err instanceof Error && err.message
          ? err.message
          : "The assistant couldn't respond just now. Please try again."
      );
    } finally {
      abortRef.current = null;
      setLoading(false);
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
      const draft = await addNotesToDraft(user?.id ?? null, notes, where);
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
    <section className="mx-auto max-w-[900px] px-6 pt-14 pb-20">
      <span className="btd-eyebrow">Always free</span>
      <h1 className="mt-3 text-[clamp(2rem,4.5vw,3rem)] font-extrabold leading-[1.1]">
        {inkLastWord("AI Advocacy Assistant")}
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
            Message the AI Advocacy Assistant
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

      <p className="mt-4 text-sm text-muted">
        In a medical emergency, call 911 or your local emergency number immediately — do
        not wait on a response here.
      </p>
    </section>
  );
}
