import { useState } from "react";
import { Link } from "react-router-dom";
import { submitStory } from "../lib/stories";
import { authEnabled } from "../lib/supabaseClient";

const AUDIENCES = ["Self-advocate", "Parent", "Caregiver", "Clinician"] as const;

export default function SubmitStory() {
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>("Parent");
  const [excerpt, setExcerpt] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [consent, setConsent] = useState(false);
  // Honeypot: real people never fill this in, bots often do.
  const [website, setWebsite] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (website) return; // silently drop bot submissions
    if (!consent) {
      setError("Please confirm you're okay with this being reviewed for publishing.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error } = await submitStory({ title, audience, excerpt, submitter_name: submitterName });
    setSubmitting(false);
    if (error) setError(error);
    else setDone(true);
  }

  if (done) {
    return (
      <div className="btd-container py-14 max-w-xl">
        <div className="btd-card p-8 text-center">
          <h1 className="text-2xl font-display font-semibold mb-2">Thank you</h1>
          <p className="text-slate mb-6">
            Your story has been submitted for review. It'll be checked before it's
            published — you won't see it on the Stories page right away.
          </p>
          <Link to="/stories" className="text-gold-dark font-semibold hover:underline">
            ← Back to Community Stories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="btd-container py-10 max-w-xl">
      <h1 className="text-3xl font-display font-semibold mb-2">Share your story</h1>
      <p className="text-slate mb-8">
        Real experiences from self-advocates, families, and clinicians help other
        families see what's possible. Every submission is reviewed before it's
        published — nothing goes live automatically.
      </p>

      {!authEnabled && (
        <div className="btd-card p-4 mb-6 bg-clay/10 border-clay/40 text-sm text-ink">
          <strong>Submissions aren't set up yet.</strong> See README "Setting up login"
          — this form needs the same free Supabase project as the login system.
        </div>
      )}

      <form onSubmit={handleSubmit} className="btd-card p-6 space-y-4">
        {error && (
          <p className="text-sm text-clay bg-clay/10 border border-clay/30 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div>
          <label className="block font-semibold text-sm text-ink mb-1">
            Your name (optional — leave blank to stay anonymous)
          </label>
          <input className="btd-input" value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} />
        </div>

        <div>
          <label className="block font-semibold text-sm text-ink mb-1">I'm sharing as a...</label>
          <select className="btd-input" value={audience} onChange={(e) => setAudience(e.target.value as any)}>
            {AUDIENCES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-sm text-ink mb-1">Title</label>
          <input required className="btd-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A short headline for your story" />
        </div>

        <div>
          <label className="block font-semibold text-sm text-ink mb-1">Your story</label>
          <textarea
            required
            className="btd-input min-h-[140px]"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="What happened, and what would you want another family to know?"
          />
        </div>

        {/* Honeypot field, hidden from real users via CSS, not display:none (bots skip that) */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>

        <label className="flex items-start gap-2 text-sm text-slate">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1"
          />
          I'm okay with this story being reviewed and possibly published on Verity.
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-3 rounded bg-ink text-paper font-semibold hover:bg-slate transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
      </form>
    </div>
  );
}
