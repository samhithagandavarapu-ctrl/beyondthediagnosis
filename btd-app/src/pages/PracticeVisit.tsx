import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { openCalmingScreen } from "../components/CalmingScreen";
import BodyMap from "../components/myvoice/BodyMap";
import StickerBadge from "../components/myvoice/StickerBadge";
import Icon, { IconName } from "../components/icons/Icon";
import { useMyVoice } from "../context/MyVoiceContext";
import { usePracticeMode } from "../context/PracticeModeContext";
import { speak } from "../lib/speech";
import { ReadingLevel } from "../lib/myVoice";
import {
  AfterVisit,
  CARD_ICONS,
  DEFAULT_CARDS,
  HOW_MUCH,
  NOTICE_META,
  PRACTICE_KEYS,
  PRACTICE_SINCE,
  PlannedVisit,
  PracticeAnswers,
  SpeakUpCard,
  VISIT_TYPES,
  VisitType,
  answersToCheckIn,
  countdownText,
  daysUntil,
  emptyAfterVisit,
  emptyAnswers,
  needsEmergencyRedirect,
  noticeText,
  practiceSentences,
  practicesThisWeek,
  readJson,
  stepSpoken,
  visitType,
  writeJson,
} from "../lib/practiceVisit";

// Practice My Visit: seven screens, always in the same order, always with the
// same layout — back and read-aloud at the top, "I need a break" and one main
// action at the bottom. Nothing is graded, nothing times out, and every
// answer (including no answer) moves forward.

type Screen = "pick" | "walk" | "talk" | "say" | "cards" | "ready" | "after";

type Progress = {
  screen: Screen;
  visitId: string;
  step: number;
  answers: PracticeAnswers;
  /** Their yes on screen 4. Nothing reaches the doctor sheet without it. */
  addToSheet: boolean;
  walked: boolean;
};

function freshProgress(visitId = VISIT_TYPES[0]?.id ?? "checkup"): Progress {
  return {
    screen: "pick",
    visitId,
    step: 0,
    answers: emptyAnswers(),
    addToSheet: false,
    walked: false,
  };
}

function loadProgress(): Progress {
  const saved = readJson<Progress | null>(PRACTICE_KEYS.progress, null);
  if (!saved || !visitType(saved.visitId)) return freshProgress();
  // A finished practice starts over next time rather than reopening "I'm ready".
  if (saved.screen === "ready" || saved.screen === "after") return { ...freshProgress(saved.visitId) };
  return { ...freshProgress(), ...saved, answers: { ...emptyAnswers(), ...saved.answers } };
}

const NAVY_BTN = "btd-btn bg-navy text-mist hover:bg-navy/90";

export default function PracticeVisit() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const { readingLevel } = useMyVoice();
  const visit = visitType(progress.visitId) ?? VISIT_TYPES[0];

  // Leaving saves progress: whatever screen they were on is where they return.
  useEffect(() => {
    writeJson(PRACTICE_KEYS.progress, progress);
  }, [progress]);

  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "start" });
  }, [progress.screen, progress.step]);

  function patch(p: Partial<Progress>) {
    setProgress((prev) => ({ ...prev, ...p }));
  }

  const props = { progress, patch, visit, level: readingLevel };

  return (
    <section className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-12">
      <div ref={topRef} className="mx-auto w-full max-w-[440px] scroll-mt-4">
        <Link to="/my-voice" className="mb-4 inline-block text-sm font-bold text-link hover:underline">
          ← My Voice
        </Link>
        {progress.screen === "pick" && <PickScreen {...props} />}
        {progress.screen === "walk" && <WalkScreen {...props} />}
        {progress.screen === "talk" && <TalkScreen {...props} />}
        {progress.screen === "say" && <SayScreen {...props} />}
        {progress.screen === "cards" && <CardsScreen {...props} />}
        {progress.screen === "ready" && (
          <ReadyScreen {...props} onAgain={() => setProgress(freshProgress(progress.visitId))} />
        )}
        {progress.screen === "after" && <AfterScreen {...props} />}
      </div>
    </section>
  );
}

type ScreenProps = {
  progress: Progress;
  patch: (p: Partial<Progress>) => void;
  visit: VisitType;
  level: ReadingLevel;
};

// ---- Shared frame: the same layout and button positions on every screen ----

function Frame({
  title,
  spoken,
  onBack,
  children,
  footer,
}: {
  title: string;
  /** What the speaker button reads: the whole screen's main text. */
  spoken: string;
  onBack: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const { canSpeak } = useMyVoice();
  return (
    <div className="flex min-h-[640px] flex-col rounded-panel border border-navy/12 bg-mist p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-navy bg-white text-xl font-bold text-navy transition-colors hover:bg-sky-tint"
        >
          ←
        </button>
        <p className="flex-1 text-center text-15 font-bold text-navy">{title}</p>
        {canSpeak ? (
          <button
            type="button"
            onClick={() => speak(spoken)}
            aria-label="Read this screen aloud"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-navy bg-white text-navy transition-colors hover:bg-sky-tint"
          >
            <Icon name="speaker" size={22} />
          </button>
        ) : (
          <span className="h-12 w-12 shrink-0" aria-hidden="true" />
        )}
      </div>

      <div className="mt-5 flex-1">{children}</div>

      <div className="mt-8 grid gap-3">{footer}</div>
    </div>
  );
}

function BreakButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openCalmingScreen}
      className={`btd-btn min-h-[52px] gap-1.5 border-2 border-navy bg-white px-3 text-sm hover:bg-sky-tint ${className}`}
    >
      <Icon name="breath" size={18} />
      I need a break
    </button>
  );
}

function FooterRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function MainButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={`${NAVY_BTN} min-h-[52px] gap-2 px-3 text-sm`}>
      {children}
    </button>
  );
}

/** A big picture-plus-word choice. At the pictures-only tier the word moves
 *  to the screen reader and the read-aloud. */
function Choice({
  on,
  icon,
  label,
  level,
  onClick,
  tone = "coral",
  tall = false,
}: {
  on: boolean;
  icon?: IconName;
  label: string;
  level: ReadingLevel;
  onClick: () => void;
  tone?: "coral" | "sky";
  tall?: boolean;
}) {
  const onClass = tone === "sky" ? "border-navy bg-sky" : "border-navy bg-coral";
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={`flex ${tall ? "min-h-[84px] flex-col" : "min-h-[52px]"} items-center justify-center gap-1.5 rounded-tile border-2 px-3 py-2 text-15 font-bold text-navy transition-colors ${
        on ? onClass : "border-sky/60 bg-white hover:border-sky hover:bg-sky-tint"
      }`}
    >
      {icon && <Icon name={icon} size={tall ? 30 : 22} />}
      {level === "icon" ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </button>
  );
}

function Question({ text, level }: { text: string; level: ReadingLevel }) {
  if (level === "icon") return <p className="sr-only">{text}</p>;
  return <p className="mb-2 mt-6 text-15 font-bold text-navy first:mt-0">{text}</p>;
}

// ---- 1. Pick my visit ----

function PickScreen({ progress, patch, level }: ScreenProps) {
  const navigate = useNavigate();
  const { say } = useMyVoice();
  const [plan, setPlan] = useState<PlannedVisit | null>(() =>
    readJson<PlannedVisit | null>(PRACTICE_KEYS.plan, null)
  );
  const [editing, setEditing] = useState(false);
  const lastNote = readJson<AfterVisit[]>(PRACTICE_KEYS.after, [])
    .filter((a) => a.note.trim())
    .slice(-1)[0];

  function savePlan(next: PlannedVisit | null) {
    setPlan(next);
    writeJson(PRACTICE_KEYS.plan, next);
    setEditing(false);
  }

  const title = "Let's practice my visit";
  const sub = "Pick the kind of visit. We will go step by step.";

  return (
    <Frame
      title="Voiced"
      spoken={`${title}. ${sub}`}
      onBack={() => navigate("/my-voice")}
      footer={
        <FooterRow>
          <BreakButton />
          <MainButton
            onClick={() => {
              say("Let's start.");
              patch({ screen: "walk", step: 0 });
            }}
          >
            Start practice →
          </MainButton>
        </FooterRow>
      }
    >
      <h1 className="text-28 font-display font-extrabold leading-tight text-navy">{title}</h1>
      {level !== "icon" && <p className="mt-2 text-15 text-body">{sub}</p>}

      <div className="mt-5">
        {editing ? (
          <PlanForm plan={plan} onSave={savePlan} onCancel={() => setEditing(false)} />
        ) : plan ? (
          <Countdown plan={plan} visitLabel={visitType(progress.visitId)?.label ?? ""} onChange={() => setEditing(true)} />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-tile border-2 border-dashed border-navy/25 bg-white px-4 py-3 text-left text-15 font-bold text-navy hover:border-sky"
          >
            <Icon name="since-few-days" size={24} />
            When is my visit? Add the date
          </button>
        )}
      </div>

      {lastNote && (
        <div className="mt-4 rounded-tile border border-sky bg-white px-4 py-3">
          <p className="text-13 font-bold text-link">Last time, I wanted to remember:</p>
          <p className="mt-1 text-15 text-navy">{lastNote.note}</p>
        </div>
      )}

      <div role="radiogroup" aria-label="Kind of visit" className="mt-5 grid grid-cols-2 gap-3">
        {VISIT_TYPES.map((v) => {
          const on = v.id === progress.visitId;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={v.label}
              onClick={() => {
                patch({ visitId: v.id, step: 0, walked: false });
                say(v.label);
              }}
              className={`flex min-h-[92px] flex-col items-start justify-between gap-2 rounded-tile border-2 p-4 text-left text-15 font-bold text-navy transition-colors ${
                on ? "border-navy bg-sky" : "border-sky/60 bg-white hover:border-sky hover:bg-sky-tint"
              }`}
            >
              <Icon name={v.icon} size={28} />
              {level === "icon" ? <span className="sr-only">{v.label}</span> : v.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => patch({ screen: "after" })}
        className="mt-5 min-h-[48px] text-sm font-bold text-link hover:underline"
      >
        I already went. Tell how it went →
      </button>
    </Frame>
  );
}

function Countdown({
  plan,
  visitLabel,
  onChange,
}: {
  plan: PlannedVisit;
  visitLabel: string;
  onChange: () => void;
}) {
  const days = daysUntil(plan.date);
  const date = new Date(`${plan.date}T12:00:00`);
  const valid = days !== null && !Number.isNaN(date.getTime());
  return (
    <div className="flex items-center gap-3 rounded-tile bg-butter px-4 py-3">
      {valid && (
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-white text-navy">
          <span className="text-11 font-bold uppercase">
            {date.toLocaleDateString(undefined, { weekday: "short" })}
          </span>
          <span className="text-21 font-extrabold leading-none">{date.getDate()}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-15 font-extrabold text-navy">
          {valid ? countdownText(days as number) : "My visit"}
        </p>
        <p className="truncate text-13 text-navy">
          {[plan.doctor.trim(), visitLabel.toLowerCase()].filter(Boolean).join(" · ")}
        </p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="min-h-[44px] shrink-0 rounded-full px-3 text-13 font-bold text-navy underline"
      >
        Change
      </button>
    </div>
  );
}

function PlanForm({
  plan,
  onSave,
  onCancel,
}: {
  plan: PlannedVisit | null;
  onSave: (p: PlannedVisit | null) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(plan?.date ?? "");
  const [doctor, setDoctor] = useState(plan?.doctor ?? "");
  return (
    <div className="grid gap-3 rounded-tile border-2 border-butter bg-white p-4">
      <label className="grid gap-1 text-15 font-bold text-navy">
        My visit is on
        <input type="date" className="btd-input min-h-[48px] text-base" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="grid gap-1 text-15 font-bold text-navy">
        My doctor's name (if I want)
        <input className="btd-input min-h-[48px] text-base" value={doctor} onChange={(e) => setDoctor(e.target.value)} />
      </label>
      <p className="text-13 text-muted">This stays on this device.</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!date}
          onClick={() => onSave({ date, doctor })}
          className={`${NAVY_BTN} min-h-[48px] px-5 text-sm disabled:opacity-40`}
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="btd-btn-outline min-h-[48px] px-5 text-sm">
          Cancel
        </button>
        {plan && (
          <button type="button" onClick={() => onSave(null)} className="min-h-[48px] px-3 text-sm font-bold text-link underline">
            Remove date
          </button>
        )}
      </div>
    </div>
  );
}

// ---- 2. Visit walkthrough ----

function WalkScreen({ progress, patch, visit, level }: ScreenProps) {
  const { say } = useMyVoice();
  const steps = visit.steps;
  const index = Math.min(progress.step, steps.length - 1);
  const step = steps[index];
  const last = index === steps.length - 1;

  function go(next: number) {
    patch({ step: next });
    say(stepSpoken(steps[next], level));
  }

  return (
    <Frame
      title={`Step ${index + 1} of ${steps.length}`}
      spoken={`${stepSpoken(step, "full")} ${step.notice.map(noticeText).join(". ")}`}
      onBack={() => (index === 0 ? patch({ screen: "pick" }) : go(index - 1))}
      footer={
        <FooterRow>
          <BreakButton />
          <MainButton
            onClick={() => {
              if (last) {
                patch({ screen: "talk", walked: true });
                say("Now let's practice talking.");
              } else go(index + 1);
            }}
          >
            Next →
          </MainButton>
        </FooterRow>
      }
    >
      <div className="flex gap-1.5" aria-hidden="true">
        {steps.map((s, i) => (
          <span key={s.id + i} className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-navy" : "bg-sky/50"}`} />
        ))}
      </div>

      <div className="mt-4 flex aspect-[16/10] items-center justify-center rounded-card bg-sky">
        <span className="flex h-32 w-32 items-center justify-center rounded-full bg-white text-navy shadow-[0_6px_18px_rgba(33,50,68,0.12)]">
          <Icon name={step.icon} size={68} />
        </span>
      </div>

      <h2 className="mt-5 text-23 font-display font-extrabold leading-tight text-navy">
        {level === "icon" ? step.short : step.title}
      </h2>
      {level !== "icon" && <p className="mt-2 text-base leading-[1.6] text-body">{step.body}</p>}

      {step.notice.length > 0 && (
        <div className="mt-5">
          <Question text="What I might notice" level={level} />
          <ul className="flex flex-wrap gap-2">
            {step.notice.map((n, i) => (
              <li
                key={i}
                className="flex min-h-[40px] items-center gap-2 rounded-full border border-navy/20 bg-white px-3.5 py-1.5 text-sm font-semibold text-navy"
              >
                <Icon name={NOTICE_META[n.kind].icon} size={18} />
                {level === "icon" ? <span className="sr-only">{noticeText(n)}</span> : noticeText(n)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Frame>
  );
}

// ---- 3. Practice talking ----

function TalkScreen({ progress, patch, visit, level }: ScreenProps) {
  const { say } = useMyVoice();
  const [emergency, setEmergency] = useState(false);
  const a = progress.answers;

  function answer(p: Partial<PracticeAnswers>) {
    const next = { ...a, ...p };
    // Only when the pair is first completed, not on every later tap.
    if (needsEmergencyRedirect(next) && !needsEmergencyRedirect(a)) setEmergency(true);
    patch({ answers: next });
  }

  const question = "How are you feeling today?";

  return (
    <>
      <Frame
        title="Practice talking"
        spoken={`The doctor asks: ${question}`}
        onBack={() => patch({ screen: "walk", step: visit.steps.length - 1 })}
        footer={
          <FooterRow>
            <BreakButton />
            <MainButton
              onClick={() => {
                patch({ screen: "say" });
                const lines = practiceSentences(a);
                if (lines.length) say(lines.join(" "));
              }}
            >
              My sentence →
            </MainButton>
          </FooterRow>
        }
      >
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky text-navy">
            <Icon name="stethoscope" size={24} />
          </span>
          <div className="rounded-card rounded-tl-sm bg-white px-4 py-3 shadow-[0_2px_8px_rgba(33,50,68,0.08)]">
            {level !== "icon" && <p className="text-12 font-bold text-link">The doctor asks</p>}
            <p className="text-17 font-display font-extrabold text-navy">{question}</p>
          </div>
        </div>

        <div className="mt-6">
          <Question text="Where?" level={level} />
          <div className="rounded-card bg-white p-4">
            <BodyMap
              selected={a.where}
              onToggle={(id) =>
                answer({ where: a.where.includes(id) ? a.where.filter((p) => p !== id) : [...a.where, id] })
              }
              readingLevel={level}
            />
          </div>

          <Question text="How much?" level={level} />
          <div className="grid grid-cols-3 gap-2">
            {HOW_MUCH.map((h) => (
              <Choice
                key={h.id}
                tall
                on={a.howMuch === h.id}
                icon={h.icon}
                label={h.label}
                level={level}
                onClick={() => {
                  answer({ howMuch: h.id });
                  say(h.label);
                }}
              />
            ))}
          </div>

          <Question text="Since when?" level={level} />
          <div className="grid grid-cols-2 gap-2">
            {PRACTICE_SINCE.map((s) => (
              <Choice
                key={s.id}
                on={a.since === s.id}
                icon={s.icon}
                label={s.label}
                level={level}
                onClick={() => {
                  answer({ since: s.id });
                  say(s.label);
                }}
              />
            ))}
          </div>

          <Question text="Is this new for me?" level={level} />
          <div className="grid grid-cols-2 gap-2">
            <Choice
              on={a.isNew === true}
              icon="celebrate"
              label="Yes, it's new"
              level={level}
              onClick={() => {
                answer({ isNew: true });
                say("Yes, it's new");
              }}
            />
            <Choice
              on={a.isNew === false}
              icon="since-week"
              label="No, I always feel this"
              level={level}
              onClick={() => {
                answer({ isNew: false });
                say("No, I always feel this");
              }}
            />
          </div>
        </div>
      </Frame>
      {emergency && <EmergencyScreen onClose={() => setEmergency(false)} />}
    </>
  );
}

/** Pain that is "a lot" and started today. Calm, plain, and the same 911
 *  wording the AI assistant uses, so both features say one thing. */
function EmergencyScreen({ onClose }: { onClose: () => void }) {
  const { say } = useMyVoice();
  const text = "If I feel like this right now: tell a grown-up I trust now, or call 911.";
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    say(text);
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="practice-emergency-title"
      className="fixed inset-0 z-[55] flex items-center justify-center bg-navy/60 p-4"
    >
      <div className="w-full max-w-[400px] rounded-panel bg-white p-6 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-butter text-navy">
          <Icon name="person" size={32} />
        </span>
        <h2 id="practice-emergency-title" className="mt-4 text-23 font-display font-extrabold leading-tight text-navy">
          Tell a grown-up you trust now, or call 911.
        </h2>
        <p className="mt-3 text-15 leading-[1.6] text-body">
          A lot of pain that started today needs help today. If this is how I feel right now, I
          tell someone now.
        </p>
        <p className="mt-3 text-13 text-muted">
          In a medical emergency, call 911 or your local emergency number immediately.
        </p>
        <div className="mt-6 grid gap-3">
          <a href="tel:911" className="btd-btn-coral min-h-[52px] gap-2 px-5 text-base">
            Call 911
          </a>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="btd-btn-outline min-h-[52px] px-5 text-base"
          >
            I'm okay. Keep practicing
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- 4. What I will say ----

function SayScreen({ progress, patch, level }: ScreenProps) {
  const { saveCheckIn, say } = useMyVoice();
  const { practice } = usePracticeMode();
  const [sayingIt, setSayingIt] = useState(false);
  const lines = practiceSentences(progress.answers);
  const hasWords = lines.length > 0;

  function next() {
    // Their words, their choice: only a yes on this screen saves anything.
    if (progress.addToSheet && hasWords) saveCheckIn(answersToCheckIn(progress.answers));
    patch({ screen: "cards" });
  }

  return (
    <Frame
      title="What I will say"
      spoken={hasWords ? lines.join(" ") : "I did not pick anything. That is okay."}
      onBack={() => patch({ screen: "talk" })}
      footer={
        <FooterRow>
          <BreakButton />
          <MainButton onClick={next}>{progress.addToSheet && hasWords ? "Save →" : "Keep going →"}</MainButton>
        </FooterRow>
      }
    >
      {hasWords ? (
        <>
          {level !== "icon" && <p className="text-15 text-body">Here is what I can tell my doctor:</p>}
          <div className="mt-3 grid gap-2 rounded-card border-2 border-sky bg-white p-5">
            {lines.map((line) => (
              <p key={line} className="text-23 font-display font-extrabold leading-snug text-navy">
                {line}
              </p>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => speak(lines.join(" "))}
              className="btd-btn-sky min-h-[52px] gap-2 px-3 text-sm"
            >
              <Icon name="speaker" size={20} />
              Hear it
            </button>
            <button
              type="button"
              aria-pressed={sayingIt}
              onClick={() => {
                setSayingIt(true);
                say("Now I say it out loud. I take my time.");
              }}
              className="btd-btn-coral min-h-[52px] gap-2 px-3 text-sm"
            >
              <Icon name="talk" size={20} />
              Say it out loud
            </button>
          </div>
          {sayingIt && (
            <p className="mt-3 rounded-tile bg-butter/50 px-4 py-3 text-15 font-semibold text-navy">
              Now I say it out loud. I take my time. There is no wrong way to say it.
            </p>
          )}

          {level !== "icon" && (
            <p className="mt-4 text-15 text-body">
              It's okay to read this from my phone. It's okay to show it to the doctor.
            </p>
          )}

          <button
            type="button"
            role="checkbox"
            aria-checked={progress.addToSheet}
            onClick={() => {
              patch({ addToSheet: !progress.addToSheet });
              say(progress.addToSheet ? "Not on my doctor sheet." : "Yes, put this on my doctor sheet.");
            }}
            className={`mt-5 flex min-h-[60px] w-full items-center gap-3 rounded-tile border-2 px-4 py-3 text-left transition-colors ${
              progress.addToSheet ? "border-navy bg-sky-tint" : "border-navy/20 bg-white hover:border-sky"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 border-navy ${
                progress.addToSheet ? "bg-navy text-mist" : "bg-white"
              }`}
            >
              {progress.addToSheet && <Icon name="check" size={20} />}
            </span>
            <span className="text-15 font-bold text-navy">
              Put this on my doctor sheet.
              {progress.addToSheet && <span className="block font-semibold text-link">I said yes.</span>}
            </span>
          </button>
          {progress.addToSheet && practice && (
            <p className="mt-3 rounded-tile border border-butter bg-butter/30 px-4 py-2 text-13 font-semibold text-navy">
              Practice mode is on, so this won't be saved to the doctor sheet.
            </p>
          )}
        </>
      ) : (
        <div className="rounded-card bg-white p-5">
          <p className="text-21 font-display font-extrabold text-navy">I did not pick anything.</p>
          <p className="mt-2 text-15 text-body">
            That is okay. I can go back and tap, or keep going.
          </p>
        </div>
      )}
    </Frame>
  );
}

// ---- 5. Speak-up cards ----

function CardsScreen({ patch, level }: ScreenProps) {
  const { say, earnSticker } = useMyVoice();
  const { practice } = usePracticeMode();
  const [custom, setCustom] = useState<SpeakUpCard[]>(() => readJson<SpeakUpCard[]>(PRACTICE_KEYS.cards, []));
  const [showing, setShowing] = useState<SpeakUpCard | null>(null);
  const [making, setMaking] = useState(false);

  function saveCustom(next: SpeakUpCard[]) {
    setCustom(next);
    writeJson(PRACTICE_KEYS.cards, next);
  }

  function finish() {
    earnSticker("practiced-my-visit");
    if (!practice) {
      const log = readJson<string[]>(PRACTICE_KEYS.log, []);
      writeJson(PRACTICE_KEYS.log, [...log, new Date().toISOString()].slice(-50));
    }
    say("I'm ready!");
    patch({ screen: "ready" });
  }

  const cards = [...DEFAULT_CARDS, ...custom];

  return (
    <>
      <Frame
        title="My speak-up cards"
        spoken={`I can always say this. ${cards.map((c) => c.text).join(" ")}`}
        onBack={() => patch({ screen: "say" })}
        footer={
          <FooterRow>
            <BreakButton />
            <MainButton onClick={finish}>I'm ready →</MainButton>
          </FooterRow>
        }
      >
        <h2 className="text-23 font-display font-extrabold text-navy">I can always say this.</h2>
        {level !== "icon" && <p className="mt-1 text-15 text-body">Tap a card to show it big.</p>}

        <ul className="mt-4 grid gap-2.5">
          {cards.map((card) => {
            const mine = custom.some((c) => c.id === card.id);
            return (
              <li key={card.id} className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowing(card);
                    say(card.text);
                  }}
                  className="flex min-h-[60px] flex-1 items-center gap-3 rounded-tile border-2 border-sky/60 bg-white px-4 py-3 text-left text-17 font-bold text-navy transition-colors hover:border-sky hover:bg-sky-tint"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-tint">
                    <Icon name={card.icon} size={22} />
                  </span>
                  {card.text || <span className="sr-only">My card</span>}
                </button>
                {mine && (
                  <button
                    type="button"
                    aria-label={`Remove my card: ${card.text}`}
                    onClick={() => saveCustom(custom.filter((c) => c.id !== card.id))}
                    className="flex min-h-[60px] w-12 shrink-0 items-center justify-center rounded-tile border-2 border-navy/15 bg-white text-xl font-bold text-navy hover:border-coral"
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {making ? (
          <MakeCard
            onSave={(card) => {
              saveCustom([...custom, card]);
              setMaking(false);
            }}
            onCancel={() => setMaking(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setMaking(true)}
            className="mt-3 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-tile border-2 border-dashed border-navy/30 bg-transparent text-15 font-bold text-navy hover:border-navy"
          >
            + Make my own card
          </button>
        )}
      </Frame>
      {showing && <BigCard card={showing} onClose={() => setShowing(null)} />}
    </>
  );
}

function MakeCard({ onSave, onCancel }: { onSave: (c: SpeakUpCard) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  const [icon, setIcon] = useState<IconName>("card");
  const ready = text.trim() !== "" || icon !== "card";

  return (
    <div className="mt-3 grid gap-3 rounded-tile border-2 border-sky bg-white p-4">
      <label className="grid gap-1 text-15 font-bold text-navy">
        What do I want to say?
        <input
          className="btd-input min-h-[48px] text-base"
          value={text}
          maxLength={80}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <div>
        <p className="mb-2 text-15 font-bold text-navy">Pick a picture</p>
        <div role="radiogroup" aria-label="Picture for my card" className="grid grid-cols-6 gap-2">
          {CARD_ICONS.map((name) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={icon === name}
              aria-label={name.replace(/-/g, " ")}
              onClick={() => setIcon(name)}
              className={`flex aspect-square min-h-[48px] items-center justify-center rounded-lg border-2 text-navy ${
                icon === name ? "border-navy bg-sky" : "border-navy/15 bg-white hover:border-sky"
              }`}
            >
              <Icon name={name} size={22} />
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="btd-btn-outline min-h-[48px] px-4 text-sm">
          Cancel
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => onSave({ id: `mine-${Date.now()}`, icon, text: text.trim() })}
          className={`${NAVY_BTN} min-h-[48px] px-4 text-sm disabled:opacity-40`}
        >
          Save my card
        </button>
      </div>
    </div>
  );
}

/** A card shown full screen, to hold up in the room. */
function BigCard({ card, onClose }: { card: SpeakUpCard; onClose: () => void }) {
  const doneRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    doneRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={card.text || "My card"}
      className="fixed inset-0 z-[55] flex flex-col items-center justify-center bg-white p-6 text-center"
    >
      <span className="flex h-28 w-28 items-center justify-center rounded-full bg-sky text-navy">
        <Icon name={card.icon} size={64} />
      </span>
      <p className="mt-8 max-w-[14em] font-display text-[clamp(2.25rem,9vw,4.5rem)] font-extrabold leading-[1.1] text-navy">
        {card.text}
      </p>
      <button
        ref={doneRef}
        type="button"
        onClick={onClose}
        className={`${NAVY_BTN} mt-10 min-h-[56px] w-full max-w-[320px] px-8 text-base`}
      >
        Done
      </button>
    </div>
  );
}

// ---- 6. I'm ready ----

function ReadyScreen({ progress, patch, onAgain }: ScreenProps & { onAgain: () => void }) {
  const { practice } = usePracticeMode();
  const count = practicesThisWeek(readJson<string[]>(PRACTICE_KEYS.log, []));
  const said = practiceSentences(progress.answers).length > 0;
  const onSheet = said && progress.addToSheet && !practice;

  const checks = [
    { done: progress.walked, text: "I know the steps" },
    { done: said, text: "I know what to say" },
    { done: true, text: "My speak-up cards are ready" },
    ...(onSheet ? [{ done: true, text: "My words are on my doctor sheet" }] : []),
  ];

  return (
    <Frame
      title="I'm ready"
      spoken={`I'm ready! ${checks.filter((c) => c.done).map((c) => c.text).join(". ")}.`}
      onBack={() => patch({ screen: "cards" })}
      footer={
        <>
          <Link to="/appointment-prep" className={`${NAVY_BTN} min-h-[52px] gap-2 px-5 text-15`}>
            <Icon name="file" size={20} />
            Open my doctor sheet
          </Link>
          <FooterRow>
            <BreakButton />
            <button type="button" onClick={onAgain} className="btd-btn-outline min-h-[52px] px-3 text-sm">
              Practice again
            </button>
          </FooterRow>
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        <StickerBadge id="practiced-my-visit" earned={!practice} size={150} />
        <h2 className="mt-4 text-30 font-display font-extrabold text-navy">I'm ready!</h2>
        <p className="mt-1 text-15 text-body">
          {practice
            ? "Practice mode is on, so no sticker was saved."
            : "I got a new sticker for my sticker book."}
        </p>
      </div>

      <ul className="mt-6 rounded-card border-2 border-sky bg-white p-4">
        {checks.map((c) => (
          <li key={c.text} className="flex items-center gap-3 border-b border-sky/40 py-2.5 text-15 font-bold text-navy">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                c.done ? "bg-sky text-navy" : "border-2 border-navy/25"
              }`}
            >
              {c.done && <Icon name="check" size={16} />}
            </span>
            {c.text}
          </li>
        ))}
        <li className="pt-3 text-sm text-body">
          {count === 1 ? "Practiced 1 time this week" : `Practiced ${count} times this week`}
        </li>
      </ul>

      <button
        type="button"
        onClick={() => patch({ screen: "after" })}
        className="mt-5 min-h-[48px] text-sm font-bold text-link hover:underline"
      >
        After my visit, tell how it went →
      </button>
    </Frame>
  );
}

// ---- 7. After my visit ----

function AfterScreen({ progress, patch, level }: ScreenProps) {
  const { say } = useMyVoice();
  const { practice } = usePracticeMode();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<AfterVisit>(() => emptyAfterVisit(progress.visitId));
  const [saved, setSaved] = useState(false);

  function set(p: Partial<AfterVisit>, spoken?: string) {
    setEntry((e) => ({ ...e, ...p }));
    if (spoken) say(spoken);
  }

  function save() {
    if (!practice) {
      const all = readJson<AfterVisit[]>(PRACTICE_KEYS.after, []);
      writeJson(PRACTICE_KEYS.after, [...all, { ...entry, createdAt: new Date().toISOString() }]);
    }
    setSaved(true);
    say("Saved. Thank you for telling me.");
  }

  const options = <T extends string>(
    items: { id: T; label: string; icon?: IconName }[],
    value: T | null,
    key: keyof AfterVisit,
    tall = false
  ) => (
    <div className="grid grid-cols-3 gap-2">
      {items.map((o) => (
        <Choice
          key={o.id}
          tall={tall}
          tone={tall ? "sky" : "coral"}
          on={value === o.id}
          icon={o.icon}
          label={o.label}
          level={level}
          onClick={() => set({ [key]: o.id } as Partial<AfterVisit>, o.label)}
        />
      ))}
    </div>
  );

  if (saved) {
    return (
      <Frame
        title="After my visit"
        spoken="Saved. Thank you for telling me."
        onBack={() => setSaved(false)}
        footer={
          <FooterRow>
            <BreakButton />
            <MainButton onClick={() => navigate("/my-voice")}>Back to My Voice</MainButton>
          </FooterRow>
        }
      >
        <div className="rounded-card bg-white p-6 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky text-navy">
            <Icon name="check" size={32} />
          </span>
          <h2 className="mt-4 text-23 font-display font-extrabold text-navy">Thank you for telling me.</h2>
          <p className="mt-2 text-15 text-body">
            {practice
              ? "Practice mode is on, so this was not saved."
              : entry.note.trim()
              ? "I will see my note next time I practice."
              : "It is saved on this device."}
          </p>
          <button
            type="button"
            onClick={() => patch({ screen: "pick" })}
            className="btd-btn-outline mt-5 min-h-[48px] px-5 text-sm"
          >
            Practice for my next visit
          </button>
        </div>
      </Frame>
    );
  }

  return (
    <Frame
      title="After my visit"
      spoken="How did my visit go? Did the doctor talk to me? Did I say what I wanted?"
      onBack={() => patch({ screen: "pick" })}
      footer={
        <FooterRow>
          <BreakButton />
          <MainButton onClick={save}>Save</MainButton>
        </FooterRow>
      }
    >
      <h2 className="text-23 font-display font-extrabold text-navy">How did my visit go?</h2>
      <div className="mt-3">
        {options(
          [
            { id: "good", label: "Good", icon: "face-good" },
            { id: "okay", label: "Okay", icon: "face-okay" },
            { id: "hard", label: "Hard", icon: "face-bad" },
          ],
          entry.howItWent,
          "howItWent",
          true
        )}
      </div>

      <Question text="Did the doctor talk to me?" level={level} />
      {options(
        [
          { id: "yes", label: "Yes", icon: level === "icon" ? "face-good" : undefined },
          { id: "little", label: "A little", icon: level === "icon" ? "face-okay" : undefined },
          { id: "no", label: "No", icon: level === "icon" ? "face-bad" : undefined },
        ],
        entry.doctorTalkedToMe,
        "doctorTalkedToMe"
      )}

      <Question text="Did I say what I wanted?" level={level} />
      {options(
        [
          { id: "yes", label: "Yes", icon: level === "icon" ? "face-good" : undefined },
          { id: "some", label: "Some of it", icon: level === "icon" ? "face-okay" : undefined },
          { id: "not-yet", label: "Not yet", icon: level === "icon" ? "face-bad" : undefined },
        ],
        entry.saidWhatIWanted,
        "saidWhatIWanted"
      )}

      <label className="mt-6 grid gap-2 text-15 font-bold text-navy">
        For next time, I want to remember…
        <textarea
          className="btd-input min-h-[96px] text-base"
          value={entry.note}
          onChange={(e) => set({ note: e.target.value })}
          placeholder="I don't have to write anything."
        />
      </label>

      <p className="mt-4 text-center text-13 text-muted">
        This stays on this device. It is not sent anywhere.
      </p>
    </Frame>
  );
}
