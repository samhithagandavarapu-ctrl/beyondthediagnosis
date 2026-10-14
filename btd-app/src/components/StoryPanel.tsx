import { useState } from "react";
import { submitStory } from "../lib/stories";
import { authEnabled } from "../lib/supabaseClient";
import Panel from "./Panel";
import DictateButton from "./DictateButton";

const AUDIENCES = ["Self-advocate", "Parent", "Caregiver", "Clinician"] as const;

/** The signed-in story form at the top of Community Stories.
 *
 *  Being signed in is the whole point: the name is already known, so the form
 *  is three fields instead of four. */
export default function StoryPanel({ defaultName }: { defaultName: string }) {
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>("Parent");
  const [excerpt, setExcerpt] = useState("");
  const [consent, setConsent] = useState(false);
  // Honeypot: real people never fill this in, bots often do.
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (website) return;
    if (!consent) {
      setError("Please confirm you're okay with this being reviewed for publishing.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error } = await submitStory({
      title,
      audience,
      excerpt,
      submitter_name: defaultName,
    });
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    setTitle("");
    setExcerpt("");
    setConsent(false);
    setDone(true);
  }

  return (
    <Panel
      id="share"
      title="Share your story"
      intro="Real experiences help other families see what's possible. Everything is reviewed before it appears on this page — nothing goes live on its own."
    >
      {!authEnabled ? (
        <p className="rounded-tile bg-butter p-4 text-sm text-butter-ink">
          Submissions need the Supabase project connected — see the README.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4">
          {error && (
            <p className="rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
              {error}
            </p>
          )}
          {done && (
            <p className="rounded border border-sky bg-sky-tint px-3 py-2 text-sm text-sky-ink">
              Sent for review. It won't appear on this page right away — someone
              reads every submission first. You can write another below.
            </p>
          )}

          <div>
            <label htmlFor="s-title" className="mb-1 block text-sm font-bold text-navy">
              Title
            </label>
            <input
              id="s-title"
              required
              className="btd-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What would you call this?"
            />
          </div>

          <div>
            <label htmlFor="s-audience" className="mb-1 block text-sm font-bold text-navy">
              You're writing as
            </label>
            <select
              id="s-audience"
              className="btd-input"
              value={audience}
              onChange={(e) => setAudience(e.target.value as (typeof AUDIENCES)[number])}
            >
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="s-excerpt" className="mb-1 block text-sm font-bold text-navy">
              Your story
            </label>
            <textarea
              id="s-excerpt"
              required
              rows={5}
              className="btd-input"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="What happened, and what you wish had gone differently."
            />
            <DictateButton value={excerpt} onChange={setExcerpt} label="Your story" />
            <p className="mt-1 text-13 text-muted">
              Please leave out anything that identifies a provider or clinic by name.
            </p>
          </div>

          <label className="flex items-start gap-3 text-13 leading-[1.5] text-body">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              I'm okay with this being reviewed and published on Voiced
              {defaultName ? `, credited to "${defaultName}"` : ", with no name attached"}.
            </span>
          </label>

          {/* Honeypot — hidden from people, tempting to bots. */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />

          <button
            type="submit"
            disabled={submitting}
            className="btd-btn-sky justify-self-start px-[18px] py-[11px] text-sm disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send for review"}
          </button>
        </form>
      )}
    </Panel>
  );
}
