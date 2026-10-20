import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ABOUT_ME_QUESTIONS,
  AboutMe as AboutMeData,
  AboutMeId,
  aboutMeAnswerText,
  aboutMeHasContent,
  emptyAboutMe,
} from "../../lib/aboutMe";
import { ReadingLevel } from "../../lib/myVoice";
import { useMyVoice } from "../../context/MyVoiceContext";
import { usePracticeMode } from "../../context/PracticeModeContext";
import SpeakButton from "./SpeakButton";
import Icon from "../icons/Icon";

// "All About Me": five questions, one at a time, answered by tapping
// pictures. A helper can add words underneath. The finished page goes at
// the top of the Appointment Prep PDF, so a new doctor meets the person
// before the problem.

export default function AboutMe({ readingLevel }: { readingLevel: ReadingLevel }) {
  const { say, savedAboutMe, saveAboutMe, clearAboutMe } = useMyVoice();
  const { practice } = usePracticeMode();
  // Null until something is changed this visit, so the saved page shows.
  const [draft, setDraft] = useState<AboutMeData | null>(null);
  const value = draft ?? (practice ? null : savedAboutMe) ?? emptyAboutMe();
  const [step, setStep] = useState<number>(() => (savedAboutMe && !practice ? ABOUT_ME_QUESTIONS.length : 0));
  const [saved, setSaved] = useState(false);
  const showText = readingLevel !== "icon";

  function patch(id: AboutMeId, change: Partial<{ picks: string[]; words: string }>) {
    setSaved(false);
    setDraft({
      ...value,
      updatedAt: new Date().toISOString(),
      answers: { ...value.answers, [id]: { ...value.answers[id], ...change } },
    });
  }

  function go(next: number) {
    setStep(next);
    const q = ABOUT_ME_QUESTIONS[next];
    say(q ? q.question : "Here is my All About Me page.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (step >= ABOUT_ME_QUESTIONS.length) {
    const spoken = ABOUT_ME_QUESTIONS.map((q) => {
      const answers = aboutMeAnswerText(q, value.answers[q.id]);
      return answers.length ? `${q.question}: ${answers.join(", ")}.` : "";
    })
      .filter(Boolean)
      .join(" ");

    return (
      <div className="grid gap-6">
        <div className="btd-card p-6">
          <div className="flex items-center gap-2">
            <h2 className="text-23 font-display font-extrabold text-navy">All About Me</h2>
            {spoken && <SpeakButton text={spoken} />}
          </div>
          <div className="mt-4 grid gap-3">
            {ABOUT_ME_QUESTIONS.map((q, i) => {
              const a = value.answers[q.id];
              const picked = q.options.filter((o) => a.picks.includes(o.id));
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Change: ${q.question}`}
                  className="grid gap-2 rounded-tile border-2 border-navy/12 bg-white p-4 text-left transition-colors hover:border-sky hover:bg-sky-tint"
                >
                  <span className="flex items-center gap-2 text-15 font-bold text-navy">
                    <Icon name={q.icon} size={22} />
                    {showText ? q.question : <span className="sr-only">{q.question}</span>}
                  </span>
                  {picked.length || a.words.trim() ? (
                    <span className="flex flex-wrap gap-2">
                      {picked.map((o) => (
                        <span
                          key={o.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-sky-tint px-3 py-1.5 text-13 font-semibold text-navy"
                        >
                          <Icon name={o.icon} size={18} />
                          {showText ? o.text : <span className="sr-only">{o.text}</span>}
                        </span>
                      ))}
                      {a.words.trim() && (
                        <span className="rounded-full bg-butter/40 px-3 py-1.5 text-13 font-semibold text-navy">
                          {a.words.trim()}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-13 text-muted">Nothing yet — tap to add.</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!aboutMeHasContent(value)}
              onClick={() => {
                saveAboutMe(value);
                setSaved(true);
                say(practice ? "Good practice. Nothing was saved." : "Saved. It will go at the top of my visit summary.");
              }}
              className="btd-btn-coral min-h-[56px] gap-2 px-8 text-base disabled:opacity-40"
            >
              <Icon name="save" size={22} />
              {practice ? "Practice saving" : "Save my page"}
            </button>
            <button type="button" onClick={() => go(0)} className="btd-btn-outline min-h-[56px] px-6 text-sm">
              Go through it again
            </button>
          </div>

          {saved &&
            (practice ? (
              <p className="mt-4 rounded-tile border border-butter bg-butter/30 px-4 py-3 text-13 font-semibold text-navy">
                That was practice, so nothing was saved. Turn practice mode off when it's real.
              </p>
            ) : (
              <div className="mt-4 rounded-card border-2 border-sky bg-sky-tint p-4">
                <p className="text-15 font-semibold text-navy">
                  Saved on this device only. It is not uploaded. It will go at the top of the
                  summary your family brings to the doctor.
                </p>
                <Link to="/appointment-prep" className="btd-btn-sky mt-3 min-h-[48px] px-5 text-sm">
                  See the summary →
                </Link>
              </div>
            ))}

          {savedAboutMe && !practice && (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm("Delete your All About Me page from this device?")) return;
                clearAboutMe();
                setDraft(emptyAboutMe());
                setStep(0);
                say("Deleted.");
              }}
              className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-13 font-bold text-clay hover:underline"
            >
              <Icon name="trash" size={16} />
              Delete my page
            </button>
          )}
        </div>
      </div>
    );
  }

  const q = ABOUT_ME_QUESTIONS[step];
  const a = value.answers[q.id];
  const wordsLabel = readingLevel === "icon" ? "A helper can write here" : "Add my own words";

  return (
    <div className="btd-card grid gap-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-sky-tint text-navy">
          <Icon name={q.icon} size={30} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-12 font-bold uppercase tracking-[0.12em] text-link" aria-label={`Question ${step + 1} of 5`}>
            {step + 1} / {ABOUT_ME_QUESTIONS.length}
          </p>
          <h2 className="flex items-center gap-2 text-23 font-display font-extrabold text-navy">
            {readingLevel === "icon-text" ? q.short : q.question}
            <SpeakButton text={q.question} />
          </h2>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,130px),1fr))]">
        {q.options.map((o) => {
          const isOn = a.picks.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={isOn}
              aria-label={o.text}
              onClick={() => {
                patch(q.id, { picks: isOn ? a.picks.filter((p) => p !== o.id) : [...a.picks, o.id] });
                say(o.text);
              }}
              className={`relative flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-tile border-2 px-3 py-3 text-center transition-colors ${
                isOn ? "border-navy bg-coral" : "border-navy/15 bg-white hover:border-sky hover:bg-sky-tint"
              }`}
            >
              {isOn && (
                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-navy text-mist">
                  <Icon name="check" size={14} />
                </span>
              )}
              <Icon name={o.icon} size={40} className="text-navy" />
              {showText && <span className="text-13 font-bold leading-tight text-navy">{o.text}</span>}
            </button>
          );
        })}
      </div>

      <label className="grid gap-2">
        <span className="flex items-center gap-2 text-15 font-bold text-navy">
          {wordsLabel}
          <SpeakButton text={wordsLabel} />
        </span>
        <textarea
          className="btd-input min-h-[80px] text-base"
          aria-label={wordsLabel}
          value={a.words}
          maxLength={300}
          onChange={(e) => patch(q.id, { words: e.target.value })}
          placeholder="You don't have to write anything."
        />
      </label>

      <div className="flex flex-wrap gap-3">
        {step > 0 && (
          <button type="button" onClick={() => go(step - 1)} className="btd-btn-outline min-h-[56px] px-6 text-sm">
            ← Back
          </button>
        )}
        <button type="button" onClick={() => go(step + 1)} className="btd-btn-coral min-h-[56px] gap-2 px-8 text-base">
          {step === ABOUT_ME_QUESTIONS.length - 1 ? "See my page" : "Next"}
          <Icon name="chevron-right" size={20} />
        </button>
      </div>
    </div>
  );
}
