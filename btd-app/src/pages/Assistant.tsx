import { FormEvent, useRef, useState, useEffect } from "react";
import { sendChatMessage, ChatMessage } from "../lib/api";

export const STARTER_PROMPTS = [
  "What are my rights at a doctor's appointment?",
  "My doctor said it's just because of Down syndrome, but I don't think that's right.",
  "How do I describe a new symptom clearly to a provider?",
];

const bubble = "max-w-[80%] px-[18px] py-4 text-15 leading-[1.65] whitespace-pre-wrap";
const assistantBubble = `${bubble} justify-self-start bg-sky-tint border border-navy/10 rounded-[18px_18px_18px_4px]`;
const userBubble = `${bubble} btd-dark justify-self-end rounded-[18px_18px_4px_18px]`;

export default function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm the Verity Advocacy Assistant. I can help you understand your rights, prepare for an appointment, or think through how to raise a concern with a provider. I can't diagnose anything or recommend treatment — but I can help you build a clear, confident case to bring to your doctor. What's going on?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const reply = await sendChatMessage(next);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err: unknown) {
      // Show what actually went wrong. The old text blamed a local dev server,
      // which is misleading anywhere but a developer's own machine.
      setError(
        err instanceof Error && err.message
          ? err.message
          : "The assistant couldn't respond just now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-[900px] px-6 pt-14 pb-20">
      <span className="btd-eyebrow">Always free</span>
      <h1 className="mt-3 text-[clamp(2rem,4.5vw,3rem)] font-extrabold leading-[1.1]">
        AI Advocacy Assistant
      </h1>
      <p className="mt-3.5 mb-7 max-w-[40em] text-17 leading-[1.7] text-body">
        Education and advocacy support only. This assistant never diagnoses, never
        recommends medication, and always defers to your provider's care plan.
      </p>

      <div className="btd-card rounded-panel overflow-hidden flex flex-col h-[70vh] min-h-[460px]">
        <div className="flex-1 overflow-y-auto p-6 grid gap-4 content-start">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? userBubble : assistantBubble}>
              {m.content}
            </div>
          ))}
          {loading && <div className={`${assistantBubble} text-body`}>Thinking…</div>}
          {error && (
            <div className="rounded-tile bg-coral/25 px-4 py-3 text-sm text-coral-ink">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length <= 1 && (
          <div className="px-6 pb-4 flex flex-wrap gap-2">
            {STARTER_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setInput(p)}
                className="rounded-full border border-navy/16 bg-mist px-3.5 py-[9px] text-13 text-body transition-colors hover:border-link hover:text-navy"
              >
                {p}
              </button>
            ))}
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
            placeholder="Ask about rights, accommodations, or how to raise a concern…"
            className="flex-1 min-w-0 rounded-full border border-navy/16 bg-white px-[18px] py-[13px] text-15 placeholder:text-[#6C8095] focus:border-link focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btd-btn-coral min-h-[46px] px-[22px] text-15 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>

      <p className="mt-4 text-sm text-muted">
        In a medical emergency, call 911 or your local emergency number immediately — do
        not wait on a response here.
      </p>
    </section>
  );
}
