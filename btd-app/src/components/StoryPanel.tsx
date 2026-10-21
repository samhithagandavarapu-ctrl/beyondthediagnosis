import { useEffect, useState } from "react";
import { CreditType, storyCredit, submitStory } from "../lib/stories";
import { authEnabled } from "../lib/supabaseClient";
import Panel from "./Panel";
import DictateButton from "./DictateButton";

const AUDIENCES = ["Self-advocate", "Parent", "Caregiver", "Clinician"] as const;

/** The signed-in story form at the top of Community Stories.
 *
 *  Being signed in is the whole point: the name is already known, so the form
 *  is three fields instead of four. defaultName (the account name) still goes
 *  to reviewers; what's shown publicly is the credit the writer picks. */
export default function StoryPanel({
  defaultName,
  firstName,
}: {
  defaultName: string;
  firstName: string;
}) {
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>("Parent");
  const [excerpt, setExcerpt] = useState("");
  const [credit, setCredit] = useState<CreditType>("role");
  const [creditName, setCreditName] = useState(firstName);
  const [consent, setConsent] = useState(false);
  // Honeypot: real people never fill this in, bots often do.
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The profile loads after the form, so fill the name in once it arrives —
  // unless they've already typed one.
  useEffect(() => {
    setCreditName((current) => current || firstName);
  }, [firstName]);

  const creditLabel = storyCredit({ audience, credit_type: credit, credit_name: creditName });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (website) return;
    if (!consent) {
      setError("Please confirm you're okay with this being reviewed for publishing.");
      return;
    }
    if (credit === "first_name" && !creditName.trim()) {
      setError("Please type the first name you'd like to be credited with.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error } = await submitStory({
      title,
      audience,
      excerpt,
      submitter_name: defaultName,
      credit_type: credit,
      credit_name: creditName,
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
          Sending stories here isn't available right now. You can email your story to withvoiced@gmail.com instead.
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

          <fieldset>
            <legend className="mb-1.5 block text-sm font-bold text-navy">
              How should we credit you?
            </legend>
            <div className="grid gap-2">
              {(
                [
                  ["first_name", "My first name"],
                  ["role", "Just my role", `for example "${storyCredit({ audience, credit_type: "role" })}"`],
                  ["anonymous", "Anonymous"],
                ] as [CreditType, string, string?][]
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-tile border px-3.5 py-2.5 text-15 transition-colors ${
                    credit === value ? "border-navy bg-sky-tint font-bold" : "border-navy/15 bg-white hover:border-navy/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="s-credit"
                    value={value}
                    checked={credit === value}
                    onChange={() => setCredit(value)}
                    className="h-4 w-4 shrink-0"
                  />
                  <span>
                    {label}
                    {hint && <span className="font-normal text-muted"> ({hint})</span>}
                  </span>
                </label>
              ))}
            </div>
            {credit === "first_name" && (
              <div className="mt-3">
                <label htmlFor="s-credit-name" className="mb-1 block text-sm font-bold text-navy">
                  Your first name
                </label>
                <input
                  id="s-credit-name"
                  required
                  autoComplete="given-name"
                  className="btd-input"
                  value={creditName}
                  onChange={(e) => setCreditName(e.target.value)}
                />
              </div>
            )}
          </fieldset>

          <label className="flex items-start gap-3 text-13 leading-[1.5] text-body">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              I'm okay with this being reviewed and published on Voiced, credited as "
              {creditLabel}".
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
