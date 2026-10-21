import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import HelperMessage from "../HelperMessage";
import FaceScale from "./FaceScale";
import PainMap from "./PainMap";
import SpeakButton from "./SpeakButton";
import VoiceRecorder from "./VoiceRecorder";
import Icon, { IconName } from "../icons/Icon";
import { useAuth } from "../../context/AuthContext";
import { useMyVoice } from "../../context/MyVoiceContext";
import { usePracticeMode } from "../../context/PracticeModeContext";
import type { CheckInStore } from "../../lib/checkIns";
import {
  CheckIn,
  ReadingLevel,
  SINCE_OPTIONS,
  checkInHasContent,
  checkInSentences,
  feeling,
  painArea,
  sinceOption,
} from "../../lib/myVoice";
import { EMOTIONS } from "../../lib/calendar";
import { useFamily } from "../../lib/useFamily";

/** Where "Put it on my doctor sheet" goes: Appointment Prep, with this
 *  check-in ticked. */
export const doctorSheetLink = (id: string) => `/appointment-prep?checkIn=${id}`;

// ---- Check in: four steps, a look over, and save ----

const STEPS: { title: string; icon: IconName }[] = [
  { title: "How do I feel today?", icon: "hub-feelings" },
  { title: "Where does it hurt?", icon: "bandage" },
  { title: "When did it start?", icon: "since-few-days" },
  { title: "Anything else?", icon: "talk" },
];
const REVIEW = STEPS.length;

/** Everything they'll tell the doctor: the sentences, then their own note. */
function toldSentences(c: CheckIn): string[] {
  const note = c.note.trim();
  return [...checkInSentences(c), ...(note ? [note] : [])];
}

/** What each step's answer was, for the look-over screen. */
function stepAnswer(step: number, c: CheckIn): string {
  if (step === 0) {
    const parts = [
      c.overall ? feeling(c.overall).short : "",
      ...(c.feelings ?? []).map((f) => EMOTIONS.find((e) => e.id === f)!.label),
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : "Skipped";
  }
  if (step === 1) {
    return c.pain?.length ? c.pain.map((s) => painArea(s.area).short).join(", ") : "Nothing hurts";
  }
  if (step === 2) return c.since ? sinceOption(c.since).short : "Skipped";
  const more = [c.hasVoiceNote ? "Voice note" : "", c.note.trim() ? "A note" : ""].filter(Boolean);
  return more.length ? more.join(" and ") : "Nothing else";
}

export default function CheckInFlow({
  initial,
  readingLevel,
  onSeeAll,
  onHome,
  embedded,
}: {
  initial: CheckIn;
  readingLevel: ReadingLevel;
  onSeeAll?: () => void;
  onHome?: () => void;
  /** Opened inside another page (the doctor sheet): saving hands the
   *  check-in back instead of showing the "all done" screen, and there's a
   *  way to close it without saving. */
  embedded?: { onSaved: (checkIn: CheckIn) => void; onCancel: () => void };
}) {
  const { say, saveCheckIn, earnSticker, checkIns } = useMyVoice();
  const { practice } = usePracticeMode();
  const { grownUps } = useFamily();
  // Opening an old check-in goes straight to the look-over, to change one part.
  const [isEdit] = useState(() => checkIns.some((c) => c.id === initial.id));
  const [checkIn, setCheckIn] = useState<CheckIn>(initial);
  const [step, setStep] = useState(isEdit ? REVIEW : 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<CheckInStore | "practice" | null>(null);
  const showText = readingLevel !== "icon";
  const sentences = toldSentences(checkIn);
  const top = useRef<HTMLDivElement>(null);

  function patch(p: Partial<CheckIn>) {
    setCheckIn((c) => ({ ...c, ...p }));
  }

  function goTo(next: number) {
    setStep(next);
    say(next === REVIEW ? "Here is what I will tell my doctor." : STEPS[next].title);
    if (embedded) top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setSaving(true);
    const now = new Date().toISOString();
    const toSave = isEdit ? { ...checkIn, updatedAt: now } : { ...checkIn, createdAt: now };
    const where = await saveCheckIn(toSave);
    if (!isEdit) {
      earnSticker("said-how-i-feel");
      if (checkIn.hasVoiceNote) earnSticker("used-my-voice");
    }
    setCheckIn(toSave);
    setSaving(false);
    if (embedded && where) {
      say("Saved. It's on your doctor sheet.");
      embedded.onSaved(toSave);
      return;
    }
    setSaved(where ?? "practice");
    say("Saved. Thank you for telling me.");
  }

  if (saved) {
    return (
      <CheckInSaved
        checkIn={checkIn}
        where={saved}
        onSeeAll={onSeeAll}
        onHome={embedded?.onCancel ?? onHome}
        homeLabel={embedded ? "Close" : undefined}
      />
    );
  }

  return (
    <div ref={top} className="grid gap-6 scroll-mt-28">
      <StepDots step={step} onJump={goTo} showText={showText} />

      {step === REVIEW ? (
        <>
          <HelperMessage
            copy={{
              icon: "Look. Then save.",
              short: "Look it over. Then tap Save.",
              full: "Here is everything you said. Tap Change to fix any part. When it looks right, tap Save.",
            }}
          />
          <div className="btd-card p-6">
            <p className="btd-eyebrow">What I will tell my doctor</p>
            <div className="mt-2 flex items-start gap-3">
              <div className="grid flex-1 gap-1">
                {sentences.length ? (
                  sentences.map((line) => (
                    <p key={line} className="text-21 font-display font-extrabold leading-[1.35] text-navy">
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="text-17 text-body">Nothing yet. Tap Change to add something.</p>
                )}
              </div>
              {sentences.length > 0 && <SpeakButton text={sentences.join(" ")} className="mt-1" />}
            </div>
          </div>
          <ul className="grid gap-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="btd-card flex items-center gap-4 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky-tint text-navy">
                  <Icon name={s.icon} size={24} />
                </span>
                <span className="min-w-0 flex-1">
                  {showText && <span className="block text-13 font-bold text-link">{s.title}</span>}
                  <span className="block text-15 font-semibold text-navy">{stepAnswer(i, checkIn)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  className="btd-btn-outline min-h-[44px] px-4 py-2 text-sm"
                  aria-label={`Change: ${s.title}`}
                >
                  Change
                </button>
              </li>
            ))}
          </ul>
          {grownUps.length > 0 && !practice && (
            <button
              type="button"
              role="switch"
              aria-checked={!!checkIn.private}
              onClick={() => {
                patch({ private: !checkIn.private });
                say(checkIn.private ? "Shared with my grown-ups" : "Just for me");
              }}
              className={`flex min-h-[64px] items-center gap-4 rounded-card border-2 px-5 text-left ${
                checkIn.private ? "border-navy bg-butter/40" : "border-navy/15 bg-white hover:border-sky"
              }`}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${checkIn.private ? "bg-navy text-mist" : "bg-mist text-navy"}`}>
                <Icon name={checkIn.private ? "lock" : "eye"} size={20} />
              </span>
              <span>
                <span className="block text-15 font-extrabold text-navy">
                  {checkIn.private ? "Just for me" : `${grownUps.map((g) => g.name).join(" and ")} can see this`}
                </span>
                <span className="block text-13 text-body">
                  {checkIn.private ? "Your linked grown-ups won't see this check-in." : "Tap to keep this check-in just for you."}
                </span>
              </span>
            </button>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || !checkInHasContent(checkIn)}
              className="btd-btn-coral min-h-[56px] gap-2 px-8 py-4 text-base disabled:opacity-40"
            >
              <Icon name="save" size={22} />
              {practice ? "Practice saving" : isEdit ? "Save changes" : "Save my check-in"}
            </button>
            {embedded && <CancelButton onClick={embedded.onCancel} />}
          </div>
        </>
      ) : (
        <>
          <div className="btd-card p-6">
            <div className="mb-5 flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-sky text-navy">
                <Icon name={STEPS[step].icon} size={22} />
              </span>
              <h2 className="text-23 font-extrabold text-navy">{STEPS[step].title}</h2>
              <SpeakButton text={STEPS[step].title} />
            </div>

            {step === 0 && (
              <div className="grid gap-7">
                <FaceScale
                  value={checkIn.overall}
                  onChange={(id) => patch({ overall: id })}
                  readingLevel={readingLevel}
                />
                <div>
                  <div className="mb-3 flex items-center justify-center gap-2">
                    <p className="text-17 font-bold text-navy">
                      {showText ? "Any feelings? Tap all that fit." : <span className="sr-only">Any feelings?</span>}
                    </p>
                    <SpeakButton text="Any feelings? Tap all that fit." />
                  </div>
                  <div role="group" aria-label="Any feelings?" className="flex flex-wrap justify-center gap-2.5">
                    {EMOTIONS.map((e) => {
                      const on = !!checkIn.feelings?.includes(e.id);
                      return (
                        <button
                          key={e.id}
                          type="button"
                          aria-pressed={on}
                          aria-label={e.label}
                          onClick={() => {
                            const now = checkIn.feelings ?? [];
                            patch({ feelings: on ? now.filter((f) => f !== e.id) : [...now, e.id] });
                            say(e.label);
                          }}
                          className={`flex min-h-[84px] w-[92px] flex-col items-center justify-center gap-1 rounded-card border-2 bg-white p-2 transition-colors ${
                            on ? "border-navy bg-sky-tint" : "border-navy/12 hover:border-sky"
                          }`}
                        >
                          <Icon name={e.icon} size={34} className="text-navy" />
                          {showText && <span className="text-13 font-bold text-navy">{e.label}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {step === 1 && (
              <PainMap
                spots={checkIn.pain ?? []}
                onChange={(spots) => patch({ pain: spots })}
                readingLevel={readingLevel}
              />
            )}
            {step === 2 && (
              <div role="radiogroup" aria-label="When did it start?" className="flex flex-wrap justify-center gap-3">
                {SINCE_OPTIONS.map((o) => {
                  const on = checkIn.since === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={o.label}
                      onClick={() => {
                        patch({ since: on ? null : o.id });
                        say(o.label);
                      }}
                      className={`flex min-h-[110px] w-[132px] flex-col items-center justify-center gap-2 rounded-card border-2 bg-white p-3 transition-transform ${
                        on
                          ? "border-navy bg-sky-tint scale-[1.04] shadow-[0_8px_22px_rgba(33,50,68,0.16)]"
                          : "border-navy/12 hover:border-sky"
                      }`}
                    >
                      <Icon name={o.icon} size={40} className="text-navy" />
                      {showText && <span className="text-13 font-bold text-navy">{o.short}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {step === 3 && (
              <div className="grid gap-4">
                <VoiceRecorder
                  recorded={checkIn.hasVoiceNote}
                  onRecordedChange={(recorded) => patch({ hasVoiceNote: recorded })}
                />
                <p className="text-13 text-muted">
                  The recording is for now only. It isn't saved with your check-in.
                </p>
                {showText && (
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-15 font-bold text-navy">
                      Or write it
                      <SpeakButton text="Or write it" />
                    </label>
                    <textarea
                      className="btd-input min-h-[90px]"
                      value={checkIn.note}
                      onChange={(e) => patch({ note: e.target.value })}
                      placeholder="You don't have to write anything."
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => goTo(step - 1)}
                className="btd-btn-outline min-h-[56px] px-6 py-3 text-base"
              >
                ← Back
              </button>
            )}
            {step === 1 && !checkIn.pain?.length && (
              <button
                type="button"
                onClick={() => goTo(2)}
                className="btd-btn-outline min-h-[56px] gap-2 px-6 py-3 text-base"
              >
                <Icon name="face-great" size={22} />
                Nothing hurts
              </button>
            )}
            <button
              type="button"
              onClick={() => goTo(isEdit ? REVIEW : step + 1)}
              className="btd-btn-coral min-h-[56px] px-8 py-4 text-base"
            >
              {isEdit || step === STEPS.length - 1 ? "Look it over →" : "Next →"}
            </button>
            {embedded && <CancelButton onClick={embedded.onCancel} />}
          </div>
        </>
      )}
    </div>
  );
}

/** Four numbered dots and the look-over, with the current one filled in.
 *  Steps already passed can be tapped to go back to them. */
function StepDots({ step, onJump, showText }: { step: number; onJump: (n: number) => void; showText: boolean }) {
  return (
    <nav aria-label="Check-in steps">
      <ol className="flex flex-wrap items-center gap-2">
        {[...STEPS.map((s) => s.title), "Look it over"].map((title, i) => {
          const current = i === step;
          const done = i < step;
          return (
            <li key={title} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onJump(i)}
                disabled={!done}
                aria-current={current ? "step" : undefined}
                aria-label={`Step ${i + 1}: ${title}`}
                className={`grid h-10 w-10 place-items-center rounded-full border-2 text-15 font-bold transition-colors ${
                  current
                    ? "border-navy bg-navy text-mist"
                    : done
                      ? "border-navy bg-sky text-navy hover:bg-sky/70"
                      : "border-navy/20 bg-white text-navy/50"
                }`}
              >
                {i === STEPS.length ? <Icon name="check" size={18} /> : i + 1}
              </button>
              {i < STEPS.length && <span aria-hidden="true" className="h-0.5 w-5 rounded bg-navy/15" />}
            </li>
          );
        })}
      </ol>
      {showText && (
        <p className="mt-2 text-13 font-semibold text-muted">
          {step < STEPS.length ? `Step ${step + 1} of ${STEPS.length}` : "Last step: look it over"}
        </p>
      )}
    </nav>
  );
}

function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-[56px] px-3 text-sm font-semibold text-link hover:underline">
      Cancel
    </button>
  );
}

function CheckInSaved({
  checkIn,
  where,
  onSeeAll,
  onHome,
  homeLabel = "Back to My Voice",
}: {
  checkIn: CheckIn;
  where: CheckInStore | "practice";
  onSeeAll?: () => void;
  onHome?: () => void;
  homeLabel?: string;
}) {
  const { earnSticker } = useMyVoice();
  const { user } = useAuth();
  const sentences = toldSentences(checkIn);

  return (
    <div className="grid gap-6">
      <HelperMessage
        copy={{
          icon: "All done!",
          short: "All done. Great job!",
          full: "All done — thank you for telling me how you feel. That was the important part.",
        }}
      />
      <div className="btd-card p-6">
        <p className="btd-eyebrow">What I will tell my doctor</p>
        <div className="mt-2 flex items-start gap-3">
          <div className="grid flex-1 gap-1">
            {sentences.map((line) => (
              <p key={line} className="text-21 font-display font-extrabold leading-[1.35] text-navy">
                {line}
              </p>
            ))}
          </div>
          {sentences.length > 0 && <SpeakButton text={sentences.join(" ")} className="mt-1" />}
        </div>
        {where === "practice" ? (
          <p className="mt-4 rounded-tile border border-butter bg-butter/30 px-4 py-3 text-13 font-semibold text-navy">
            That was practice, so nothing was saved. Turn practice mode off when it's real.
          </p>
        ) : (
          <p className="mt-4 text-13 text-muted">
            {where === "account"
              ? "Saved to your account, with your other check-ins."
              : "Saved on this device, with your other check-ins."}{" "}
            {!user && (
              <Link to="/login" className="font-semibold text-link hover:underline">
                Sign in to keep them safe on any device.
              </Link>
            )}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          {where !== "practice" && (
            <Link
              to={doctorSheetLink(checkIn.id)}
              onClick={() => earnSticker("told-my-doctor")}
              className="btd-btn-coral min-h-[52px] px-6 py-3 text-sm"
            >
              Put it on my doctor sheet →
            </Link>
          )}
          {where !== "practice" && onSeeAll && (
            <button type="button" onClick={onSeeAll} className="btd-btn-outline min-h-[52px] px-5 py-3 text-sm">
              See all my check-ins
            </button>
          )}
          {onHome && (
            <button type="button" onClick={onHome} className="btd-btn-outline min-h-[52px] px-5 py-3 text-sm">
              {homeLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
