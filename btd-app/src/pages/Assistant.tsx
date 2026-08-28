import { FormEvent, useRef, useState, useEffect } from "react";
import { sendChatMessage, ChatMessage } from "../lib/api";

const STARTER_PROMPTS = [
  "What are my rights at a doctor's appointment?",
  "My doctor said it's just because of Down syndrome, but I don't think that's right.",
  "How do I describe a new symptom clearly to a provider?",
];

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
    } catch (err: any) {
      setError(
        "The assistant couldn't respond just now. Make sure the API server is running (npm run server) and ANTHROPIC_API_KEY is set."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="btd-container py-10 max-w-3xl">
      <h1 className="text-3xl font-display font-semibold mb-2">AI Advocacy Assistant</h1>
      <p className="text-slate mb-6">
        Education and advocacy support only. This assistant never diagnoses, never
        recommends medication, and always defers to your provider's care plan.
      </p>

      <div className="btd-card flex flex-col h-[60vh]">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-ink text-paper"
                    : "bg-sage/10 text-ink border border-sage/30"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-3 text-sm bg-sage/10 border border-sage/30 text-slate">
                Thinking…
              </div>
            </div>
          )}
          {error && (
            <div className="text-sm text-clay bg-clay/10 border border-clay/30 rounded px-4 py-3">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length <= 1 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {STARTER_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setInput(p)}
                className="text-xs px-3 py-1.5 rounded-full border border-ink/15 text-slate hover:border-gold hover:text-ink transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="border-t border-ink/10 p-3 flex gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message the AI Advocacy Assistant
          </label>
          <input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about rights, accommodations, or how to raise a concern…"
            className="flex-1 rounded border border-ink/15 px-3 py-2 text-sm focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded bg-ink text-paper text-sm font-semibold disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>

      <p className="text-xs text-slate-light mt-4">
        In a medical emergency, call 911 or your local emergency number immediately — do
        not wait on a response here.
      </p>
    </div>
  );
}
