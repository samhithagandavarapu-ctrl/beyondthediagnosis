import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import SpeakButton from "../components/myvoice/SpeakButton";
import Icon, { type IconName } from "../components/icons/Icon";
import { useMyVoice } from "../context/MyVoiceContext";
import {
  FEATURES,
  Feedback as Answers,
  ROLES,
  emptyFeedback,
  hasAnswers,
  loadDraft,
  saveDraft,
  sendFeedback,
} from "../lib/feedback";

// A few quick questions for families testing Voiced. Every question can be
// skipped. What's typed is kept in this browser as it goes, and an answer
// that can't be sent right now waits there and goes next time (lib/feedback).
// No health details are asked for.

function Question({ n, title, hint, speak, children }: { n: number; title: string; hint?: string; speak?: boolean; children: ReactNode }) {
  return (
    <fieldset className="btd-card grid gap-4 p-6">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-tint text-15 font-extrabold text-navy">{n}</span>
        <div className="grid gap-1">
          <p className="flex flex-wrap items-center gap-2 text-17 font-extrabold leading-snug text-navy">
            {title}
            {speak && <SpeakButton text={title} />}
          </p>
          {hint && <p className="text-15 text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </fieldset>
  );
}

function Choice({ on, onClick, children, icon }: { on: boolean; onClick: () => void; children: ReactNode; icon?: IconName }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex min-h-[48px] items-center gap-2 rounded-full border-2 px-4 text-15 font-bold transition-colors ${
        on ? "border-navy bg-coral text-navy" : "border-navy/15 bg-white text-navy hover:border-sky hover:bg-sky-tint"
      }`}
    >
      {icon && <Icon name={icon} size={20} />}
      {children}
    </button>
  );
}

/** Big picture buttons for the self-advocate's questions. */
function FaceChoice({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: IconName; label: string }) {
  const { say } = useMyVoice();
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={() => {
        onClick();
        say(label);
      }}
      className={`flex min-h-[112px] min-w-[104px] flex-col items-center justify-center gap-2 rounded-tile border-2 px-3 py-3 transition-colors ${
        on ? "border-navy bg-coral" : "border-navy/15 bg-white hover:border-sky hover:bg-sky-tint"
      }`}
    >
      <Icon name={icon} size={44} className="text-navy" />
      <span className="text-15 font-bold text-navy">{label}</span>
    </button>
  );
}

const EASE: { n: number; icon: IconName; label: string }[] = [
  { n: 1, icon: "face-awful", label: "Very hard" },
  { n: 2, icon: "face-bad", label: "Hard" },
  { n: 3, icon: "face-okay", label: "Okay" },
  { n: 4, icon: "face-good", label: "Easy" },
  { n: 5, icon: "face-great", label: "Very easy" },
];

export default function Feedback() {
  const [answers, setAnswers] = useState<Answers>(() => loadDraft() ?? emptyFeedback());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"sent" | "saved" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Kept as it's typed, so a closed tab or a dropped connection loses nothing.
  useEffect(() => {
    if (!done) saveDraft(hasAnswers(answers) || answers.contact ? answers : null);
  }, [answers, done]);

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers((a) => ({ ...a, [key]: value }));
  /** Tapping the picked answer again un-picks it. */
  const pick = <K extends keyof Answers>(key: K, value: Answers[K]) => set(key, answers[key] === value ? (null as Answers[K]) : value);

  async function send() {
    if (!hasAnswers(answers)) return setError("Answer at least one question first. Any of them is fine.");
    setError(null);
    setBusy(true);
    const result = await sendFeedback(answers);
    setBusy(false);
    saveDraft(null);
    setDone(result);
  }

  if (done)
    return (
      <>
        <PageHero eyebrow="Feedback" title="Thank you" lede="Your answers help us make Voiced better for every family." />
        <div className="btd-container max-w-2xl py-12 pb-20">
          <div role="status" className="btd-card grid gap-4 p-6">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-coral text-navy">
              <Icon name="celebrate" size={26} />
            </span>
            <p className="text-17 leading-[1.6] text-body">
              {done === "sent"
                ? "We got your answers. The Voiced team reads every one."
                : "We couldn't reach Voiced just now, so your answers are saved on this device. They'll be sent automatically the next time you open Voiced here."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/" className="btd-btn-coral min-h-[48px] px-6 text-base">
                Back to Voiced
              </Link>
              <button
                type="button"
                onClick={() => {
                  setAnswers(emptyFeedback());
                  setDone(null);
                }}
                className="btd-btn min-h-[48px] border-2 border-navy/20 px-6 text-base text-navy hover:bg-sky-tint"
              >
                Answer again for someone else
              </button>
            </div>
          </div>
        </div>
      </>
    );

  const textArea = (key: "wouldBringWhy" | "confusing" | "wish", label: string) => (
    <label className="grid gap-1.5 text-15 font-bold text-navy">
      <span className="sr-only">{label}</span>
      <textarea
        className="btd-input min-h-[110px] text-base font-normal"
        maxLength={4000}
        value={answers[key]}
        onChange={(e) => set(key, e.target.value)}
      />
    </label>
  );

  return (
    <>
      <PageHero
        eyebrow="Feedback"
        title="Tell us how it went"
        lede="A few quick questions, about 3 minutes. Skip any you like. Please don't include health details or names of doctors."
      />
      <div className="btd-container grid max-w-2xl gap-5 py-12 pb-20">
        <Question n={1} title="Who is answering?">
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <Choice key={r.id} on={answers.role === r.id} onClick={() => pick("role", r.id)}>
                {r.label}
              </Choice>
            ))}
          </div>
        </Question>

        <Question n={2} title="What did you try?" hint="Pick all you used.">
          <div className="flex flex-wrap gap-2">
            {FEATURES.map((f) => {
              const on = answers.tried.includes(f);
              return (
                <Choice key={f} on={on} icon={on ? "check" : undefined} onClick={() => set("tried", on ? answers.tried.filter((t) => t !== f) : [...answers.tried, f])}>
                  {f}
                </Choice>
              );
            })}
          </div>
        </Question>

        <Question n={3} title="How easy was Voiced to use?">
          <div className="flex flex-wrap gap-3">
            {EASE.map((e) => (
              <FaceChoice key={e.n} on={answers.ease === e.n} onClick={() => pick("ease", e.n)} icon={e.icon} label={e.label} />
            ))}
          </div>
        </Question>

        <Question n={4} title="Would you bring the Appointment Prep summary to a real doctor's visit?">
          <div className="flex flex-wrap gap-2">
            {(["yes", "maybe", "no"] as const).map((v) => (
              <Choice key={v} on={answers.wouldBring === v} onClick={() => pick("wouldBring", v)}>
                {v[0].toUpperCase() + v.slice(1)}
              </Choice>
            ))}
          </div>
          <p className="text-15 font-bold text-navy">Why, or why not?</p>
          {textArea("wouldBringWhy", "Why, or why not?")}
        </Question>

        <Question n={5} title="Was anything confusing, or did anything feel wrong?" hint="Including anything the AI Advocate said.">
          {textArea("confusing", "Was anything confusing, or did anything feel wrong?")}
        </Question>

        <Question n={6} title="What's one thing you wish it did?">
          {textArea("wish", "What's one thing you wish it did?")}
        </Question>

        <Question n={7} title="Will you use it again before your next appointment?">
          <div className="flex flex-wrap gap-2">
            {(["not likely", "maybe", "definitely"] as const).map((v) => (
              <Choice key={v} on={answers.useAgain === v} onClick={() => pick("useAgain", v)}>
                {v[0].toUpperCase() + v.slice(1)}
              </Choice>
            ))}
          </div>
        </Question>

        <section className="grid gap-5 rounded-tile border-2 border-dashed border-navy/20 p-5">
          <div>
            <h2 className="text-21 font-extrabold text-navy">For the person with Down syndrome</h2>
            <p className="mt-1 text-15 text-body">
              If they used My Voice, ask them these two, in their own words. Tap the speaker to read a question out loud.
            </p>
          </div>
          <Question n={8} title="Did you like it?" speak>
            <div className="flex flex-wrap gap-3">
              <FaceChoice on={answers.personLiked === "no"} onClick={() => pick("personLiked", "no")} icon="face-bad" label="No" />
              <FaceChoice on={answers.personLiked === "okay"} onClick={() => pick("personLiked", "okay")} icon="face-okay" label="Okay" />
              <FaceChoice on={answers.personLiked === "yes"} onClick={() => pick("personLiked", "yes")} icon="face-great" label="Yes" />
            </div>
          </Question>
          <Question n={9} title="Could you tell your doctor something with it?" speak>
            <div className="flex flex-wrap gap-3">
              <FaceChoice on={answers.personCouldTell === "no"} onClick={() => pick("personCouldTell", "no")} icon="face-bad" label="No" />
              <FaceChoice on={answers.personCouldTell === "a little"} onClick={() => pick("personCouldTell", "a little")} icon="face-okay" label="A little" />
              <FaceChoice on={answers.personCouldTell === "yes"} onClick={() => pick("personCouldTell", "yes")} icon="face-great" label="Yes" />
            </div>
          </Question>
        </section>

        <div className="btd-card grid gap-3 p-6">
          <label className="flex items-start gap-3 text-15 font-semibold text-navy">
            <input
              type="checkbox"
              checked={answers.contactOk}
              onChange={(e) => set("contactOk", e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-navy"
            />
            <span>The Voiced team can contact me about my answers</span>
          </label>
          {answers.contactOk && (
            <label className="grid gap-1.5 text-15 font-bold text-navy">
              Email or phone
              <input className="btd-input text-base font-normal" maxLength={200} value={answers.contact} onChange={(e) => set("contact", e.target.value)} />
            </label>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
            {error}
          </p>
        )}
        <button type="button" onClick={send} disabled={busy} className="btd-btn-coral min-h-[56px] justify-self-start gap-2 px-8 text-base disabled:opacity-50">
          <Icon name="send" size={20} />
          {busy ? "Sending…" : "Send feedback"}
        </button>
      </div>
    </>
  );
}
