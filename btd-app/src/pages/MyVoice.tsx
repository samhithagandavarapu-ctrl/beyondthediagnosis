import { useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import HelperMessage, { forLevel } from "../components/HelperMessage";
import PracticeModeToggle from "../components/PracticeModeToggle";
import FaceScale from "../components/myvoice/FaceScale";
import PainMap from "../components/myvoice/PainMap";
import SayCards from "../components/myvoice/SayCards";
import AboutMe from "../components/myvoice/AboutMe";
import Scenarios from "../components/myvoice/Scenarios";
import VoiceMemo from "../components/myvoice/VoiceMemo";
import SpeakButton from "../components/myvoice/SpeakButton";
import StickerBook from "../components/myvoice/StickerBook";
import { CheckInSummary, FeelingsOverTime } from "../components/myvoice/CheckInHistory";
import VisitWalkthrough from "../components/myvoice/VisitWalkthrough";
import VoiceRecorder from "../components/myvoice/VoiceRecorder";
import Icon, { IconName } from "../components/icons/Icon";
import { useAuth } from "../context/AuthContext";
import { useMyVoice } from "../context/MyVoiceContext";
import { usePracticeMode } from "../context/PracticeModeContext";
import type { CheckInStore } from "../lib/checkIns";
import {
  CheckIn,
  READING_LEVELS,
  ReadingLevel,
  SINCE_OPTIONS,
  checkInHasContent,
  checkInSentences,
  emptyCheckIn,
  feeling,
  painArea,
  sinceOption,
} from "../lib/myVoice";
import {
  PRACTICE_KEYS,
  PlannedVisit,
  countdownText,
  daysUntil,
  readJson,
} from "../lib/practiceVisit";
import { shortDate } from "../lib/shortDate";

type Section =
  | "home"
  | "check-in"
  | "history"
  | "cards"
  | "about"
  | "voice"
  | "stories"
  | "visit"
  | "stickers";

/** Where "Put it on my doctor sheet" goes: Appointment Prep, with this
 *  check-in ticked. */
const doctorSheetLink = (id: string) => `/appointment-prep?checkIn=${id}`;

export default function MyVoice() {
  const [section, setSection] = useState<Section>("home");
  // The check-in being made, or an old one being changed.
  const [editing, setEditing] = useState<CheckIn | null>(null);
  const { readingLevel } = useMyVoice();

  function go(next: Section) {
    setSection(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startCheckIn(from?: CheckIn) {
    setEditing(from ?? emptyCheckIn());
    go("check-in");
  }

  return (
    <div>
      <PageHero
        eyebrow="My Voice"
        title="Say how you feel, in your own way"
        lede="This part of Voiced is for you — not for the grown-up who brought you. Check in to say how you feel, get ready for the doctor, and tell them in your own words."
      />

      <section className="btd-container pt-10 pb-20 grid gap-8">
        <SettingsStrip />

        {section === "home" ? (
          <Home onPick={go} onCheckIn={() => startCheckIn()} />
        ) : (
          <div>
            <button
              type="button"
              onClick={() => go("home")}
              className="mb-6 text-sm font-bold text-link hover:underline"
            >
              ← Back to My Voice
            </button>
            {section === "check-in" && editing && (
              <CheckInFlow
                key={editing.id}
                initial={editing}
                readingLevel={readingLevel}
                onSeeAll={() => go("history")}
                onHome={() => go("home")}
              />
            )}
            {section === "history" && (
              <HistorySection onOpen={startCheckIn} onNew={() => startCheckIn()} />
            )}
            {section === "cards" && (
              <ToolSection
                title="Say it my way"
                helper={{
                  icon: "Tap a card.",
                  short: "Tap a card to say it. Tap the star to keep it on top.",
                  full: "Tap a card and it says the words out loud. Tap the star to make it a favorite. Tap Show the doctor to make it big.",
                }}
              >
                <SayCards readingLevel={readingLevel} />
              </ToolSection>
            )}
            {section === "about" && (
              <ToolSection
                title="All About Me"
                helper={{
                  icon: "Tap the pictures.",
                  short: "Tap the pictures that are like me.",
                  full: "Tap every picture that sounds like you. A helper can add words. This page goes at the top of your visit summary, so your doctor gets to know you.",
                }}
              >
                <AboutMe readingLevel={readingLevel} />
              </ToolSection>
            )}
            {section === "voice" && (
              <ToolSection
                title="Record my voice"
                helper={{
                  icon: "Tap to talk.",
                  short: "Tap the big button and talk. Up to one minute.",
                  full: "Tap the big button and say what you want your doctor to know. You have up to one minute. It stays on this device, and you can play it at your visit.",
                }}
              >
                <VoiceMemo readingLevel={readingLevel} />
              </ToolSection>
            )}
            {section === "stories" && (
              <ToolSection
                title="Practice stories"
                helper={{
                  icon: "Pick a story.",
                  short: "Pick a story. Then pick what to do.",
                  full: "Each story is a hard moment at the doctor. Look at the pictures, then pick what you could do. There are no wrong answers here — just practice.",
                }}
              >
                <Scenarios readingLevel={readingLevel} />
              </ToolSection>
            )}
            {section === "visit" && <VisitSection readingLevel={readingLevel} />}
            {section === "stickers" && <StickerSection />}
          </div>
        )}
      </section>
    </div>
  );
}

// ---- Settings: one reading level, plus read-aloud and practice mode ----

function SettingsStrip() {
  const { readingLevel, setReadingLevel, readAloud, toggleReadAloud, canSpeak, say } = useMyVoice();
  const { practice } = usePracticeMode();

  return (
    <div className="btd-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="btd-eyebrow">How much reading?</span>
        <div className="flex flex-wrap gap-2">
          {READING_LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              aria-pressed={readingLevel === level.id}
              title={level.description}
              onClick={() => {
                setReadingLevel(level.id);
                say(level.label);
              }}
              className={`min-h-[40px] rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors ${
                readingLevel === level.id
                  ? "border-navy bg-sky text-navy"
                  : "border-navy/15 bg-white text-body hover:border-sky"
              }`}
            >
              {level.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {canSpeak && (
            <button
              type="button"
              onClick={toggleReadAloud}
              aria-pressed={readAloud}
              className={`min-h-[40px] rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors ${
                readAloud ? "border-navy bg-butter text-navy" : "border-navy/15 bg-white text-body"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Icon name={readAloud ? "speaker" : "speaker-off"} size={16} />
                {readAloud ? "Read aloud on" : "Read aloud off"}
              </span>
            </button>
          )}
          <PracticeModeToggle tone="light" />
        </div>
      </div>
      <p className="mt-3 text-13 text-muted">
        {READING_LEVELS.find((l) => l.id === readingLevel)?.description} This one setting
        changes every part of My Voice.{" "}
        <Link to="/profile" className="font-semibold text-link hover:underline">
          It saves to your profile.
        </Link>
      </p>
      {practice && (
        <p className="mt-2 rounded-tile border border-butter bg-butter/30 px-4 py-2 text-13 font-semibold text-navy">
          Practice mode is on. Nothing you do here is saved, downloaded, or added to a real
          appointment — it's just for rehearsing.
        </p>
      )}
    </div>
  );
}

// ---- Hub: one big way to check in, then the other tools in groups ----

type Copy = { icon: string; short: string; full: string };

type Tile =
  | { kind: "section"; id: Section; icon: IconName; copy: Copy }
  | { kind: "link"; to: string; icon: IconName; copy: Copy };

const GROUPS: { title: Copy; practiceCard?: boolean; tiles: Tile[] }[] = [
  {
    title: { icon: "Get ready", short: "Get ready for the doctor", full: "Get ready for the doctor" },
    practiceCard: true,
    tiles: [
      {
        kind: "section",
        id: "visit",
        icon: "hub-visit",
        copy: {
          icon: "What happens",
          short: "What happens at a visit",
          full: "See what happens at a doctor visit, step by step",
        },
      },
      {
        kind: "section",
        id: "stories",
        icon: "book",
        copy: { icon: "Practice", short: "Practice stories", full: "Practice stories: what I can do when it's hard" },
      },
    ],
  },
  {
    title: { icon: "At the doctor", short: "At the doctor", full: "At the doctor" },
    tiles: [
      {
        kind: "section",
        id: "cards",
        icon: "card",
        copy: { icon: "My cards", short: "Say it my way", full: "Say it my way: picture cards that talk for me" },
      },
      {
        kind: "section",
        id: "voice",
        icon: "mic",
        copy: { icon: "My voice", short: "Record my voice", full: "Record my voice to play for my doctor" },
      },
      {
        kind: "link",
        to: "/appointment-prep",
        icon: "clipboard",
        copy: { icon: "Doctor sheet", short: "My doctor sheet", full: "My doctor sheet: what I said, printed for the visit" },
      },
    ],
  },
  {
    title: { icon: "About me", short: "About me", full: "About me" },
    tiles: [
      {
        kind: "section",
        id: "about",
        icon: "person",
        copy: { icon: "About me", short: "All about me", full: "All about me: help my doctor get to know me" },
      },
      {
        kind: "section",
        id: "stickers",
        icon: "hub-stickers",
        copy: { icon: "My stickers", short: "My stickers", full: "My sticker book" },
      },
    ],
  },
];

const tileClass =
  "btd-card btd-card-hover flex min-h-[150px] flex-col items-center justify-center gap-3 p-5 text-center";

function Home({ onPick, onCheckIn }: { onPick: (s: Section) => void; onCheckIn: () => void }) {
  const { readingLevel, say } = useMyVoice();

  return (
    <div className="grid gap-10">
      <CheckInStart onCheckIn={onCheckIn} onHistory={() => onPick("history")} />

      {GROUPS.map((group) => {
        const title = forLevel(readingLevel, group.title);
        return (
          <section key={group.title.short} aria-label={group.title.full} className="grid gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-23 font-display font-extrabold text-navy">{title}</h2>
              <SpeakButton text={title} />
            </div>
            {group.practiceCard && <PracticeVisitCard />}
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))]">
              {group.tiles.map((tile) => {
                const label = forLevel(readingLevel, tile.copy);
                const inner = (
                  <>
                    <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-sky-tint text-navy">
                      <Icon name={tile.icon} size={34} />
                    </span>
                    <span className="text-17 font-display font-extrabold text-navy">{label}</span>
                  </>
                );
                return tile.kind === "link" ? (
                  <Link key={tile.to} to={tile.to} onClick={() => say(label)} className={tileClass}>
                    {inner}
                  </Link>
                ) : (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => {
                      say(label);
                      onPick(tile.id);
                    }}
                    className={tileClass}
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** The first thing on the page: check in now, and how the last ones went. */
function CheckInStart({ onCheckIn, onHistory }: { onCheckIn: () => void; onHistory: () => void }) {
  const { readingLevel, say, checkIns } = useMyVoice();
  const last = checkIns[0];
  const label = forLevel(readingLevel, {
    icon: "Check in",
    short: "Check in now",
    full: "Check in: how do I feel today?",
  });

  return (
    <div className="btd-card grid items-center gap-6 border-2 border-navy p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="grid gap-3">
        {readingLevel !== "icon" && (
          <h2 className="font-display text-[clamp(1.5rem,3vw,2rem)] font-extrabold leading-tight text-navy">
            How do I feel today?
          </h2>
        )}
        {readingLevel !== "icon" && (
          <p className="text-15 text-body">
            {last
              ? `Last time: ${shortDate(last.createdAt)}${last.overall ? ` · ${feeling(last.overall).short}` : ""}.`
              : "Four quick steps. Every check-in is saved, so you can look back later."}
          </p>
        )}
        <FeelingsOverTime checkIns={checkIns} max={7} />
      </div>
      <div className="grid justify-items-start gap-3 md:justify-items-end">
        <button
          type="button"
          onClick={() => {
            say(label);
            onCheckIn();
          }}
          className="btd-btn-coral min-h-[64px] gap-2.5 px-8 py-4 text-lg"
        >
          <Icon name="hub-feelings" size={26} />
          {label} →
        </button>
        {checkIns.length > 0 && (
          <button
            type="button"
            onClick={() => {
              say("My check-ins");
              onHistory();
            }}
            className="text-15 font-bold text-link hover:underline"
          >
            See my check-ins ({checkIns.length}) →
          </button>
        )}
      </div>
    </div>
  );
}

/** The way into Practice My Visit, with the countdown as a reminder to
 *  practice when a visit date has been set. */
function PracticeVisitCard() {
  const { readingLevel, say } = useMyVoice();
  const plan = readJson<PlannedVisit | null>(PRACTICE_KEYS.plan, null);
  const days = plan ? daysUntil(plan.date) : null;
  const upcoming = days !== null && days >= 0;
  const label = forLevel(readingLevel, {
    icon: "Practice my visit",
    short: "Practice my visit",
    full: "Practice my visit before I go",
  });

  return (
    <Link
      to="/my-voice/practice"
      onClick={() => say(label)}
      className="btd-card btd-card-hover flex flex-wrap items-center gap-4 border-2 border-coral p-5"
    >
      <span className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full bg-coral/30 text-navy">
        <Icon name="hub-visit" size={32} />
      </span>
      <span className="min-w-0 flex-1 basis-[180px]">
        <span className="block text-21 font-display font-extrabold text-navy">{label}</span>
        {readingLevel !== "icon" && (
          <span className="mt-0.5 block text-15 text-body">
            {upcoming
              ? `${countdownText(days as number)}. Want to practice?`
              : "Go through the visit step by step, and practice what I will say."}
          </span>
        )}
      </span>
      <span className="btd-btn-coral min-h-[48px] px-5 text-sm">Start →</span>
    </Link>
  );
}

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
  if (step === 0) return c.overall ? feeling(c.overall).short : "Skipped";
  if (step === 1) {
    return c.pain?.length ? c.pain.map((s) => painArea(s.area).short).join(", ") : "Nothing hurts";
  }
  if (step === 2) return c.since ? sinceOption(c.since).short : "Skipped";
  const more = [c.hasVoiceNote ? "Voice note" : "", c.note.trim() ? "A note" : ""].filter(Boolean);
  return more.length ? more.join(" and ") : "Nothing else";
}

function CheckInFlow({
  initial,
  readingLevel,
  onSeeAll,
  onHome,
}: {
  initial: CheckIn;
  readingLevel: ReadingLevel;
  onSeeAll: () => void;
  onHome: () => void;
}) {
  const { say, saveCheckIn, earnSticker, checkIns } = useMyVoice();
  const { practice } = usePracticeMode();
  // Opening an old check-in goes straight to the look-over, to change one part.
  const [isEdit] = useState(() => checkIns.some((c) => c.id === initial.id));
  const [checkIn, setCheckIn] = useState<CheckIn>(initial);
  const [step, setStep] = useState(isEdit ? REVIEW : 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<CheckInStore | "practice" | null>(null);
  const showText = readingLevel !== "icon";
  const sentences = toldSentences(checkIn);

  function patch(p: Partial<CheckIn>) {
    setCheckIn((c) => ({ ...c, ...p }));
  }

  function goTo(next: number) {
    setStep(next);
    say(next === REVIEW ? "Here is what I will tell my doctor." : STEPS[next].title);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    setSaved(where ?? "practice");
    say("Saved. Thank you for telling me.");
  }

  if (saved) {
    return <CheckInSaved checkIn={checkIn} where={saved} onSeeAll={onSeeAll} onHome={onHome} />;
  }

  return (
    <div className="grid gap-6">
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
              <FaceScale
                value={checkIn.overall}
                onChange={(id) => patch({ overall: id })}
                readingLevel={readingLevel}
              />
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

function CheckInSaved({
  checkIn,
  where,
  onSeeAll,
  onHome,
}: {
  checkIn: CheckIn;
  where: CheckInStore | "practice";
  onSeeAll: () => void;
  onHome: () => void;
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
          {where !== "practice" && (
            <button type="button" onClick={onSeeAll} className="btd-btn-outline min-h-[52px] px-5 py-3 text-sm">
              See all my check-ins
            </button>
          )}
          <button type="button" onClick={onHome} className="btd-btn-outline min-h-[52px] px-5 py-3 text-sm">
            Back to My Voice
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- My check-ins: every one, newest first ----

function HistorySection({ onOpen, onNew }: { onOpen: (c: CheckIn) => void; onNew: () => void }) {
  const { checkIns, checkInsLoaded, checkInStore, checkInAccountMissing, deleteCheckIn, earnSticker } =
    useMyVoice();
  const { user } = useAuth();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-28 font-extrabold text-navy">My check-ins</h2>
            <SpeakButton text="My check-ins" />
          </div>
          <p className="mt-1 text-15 text-body">
            {checkInStore === "account"
              ? "Saved to your account, so they're here on any device."
              : checkInAccountMissing
                ? "Saved on this device for now. Your account can't hold check-ins yet."
                : "Saved on this device only."}{" "}
            {!user && (
              <Link to="/login" className="font-semibold text-link hover:underline">
                Sign in to keep them safe.
              </Link>
            )}
          </p>
        </div>
        <button type="button" onClick={onNew} className="btd-btn-coral min-h-[52px] gap-2 px-6 py-3 text-base">
          <Icon name="hub-feelings" size={22} />
          Check in now
        </button>
      </div>

      {!checkInsLoaded ? (
        <p className="text-body">Loading your check-ins…</p>
      ) : checkIns.length === 0 ? (
        <div className="btd-card p-6">
          <p className="text-17 text-body">No check-ins yet. Your first one will show up here.</p>
        </div>
      ) : (
        <>
          {checkIns.filter((c) => c.overall).length >= 2 && (
            <div className="btd-card p-6">
              <p className="btd-eyebrow mb-3">How I've felt</p>
              <FeelingsOverTime checkIns={checkIns} />
            </div>
          )}
          <ul className="grid gap-4">
            {checkIns.map((c) => (
              <li key={c.id} className="btd-card p-5">
                {c.ownWords?.length ? (
                  <span className="btd-tag mb-3 bg-butter">From Practice My Visit</span>
                ) : null}
                <CheckInSummary checkIn={c} />
                <div className="mt-4 flex flex-wrap gap-2">
                  {!c.ownWords?.length && (
                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      className="btd-btn-outline min-h-[44px] px-4 py-2 text-sm"
                    >
                      Open and change
                    </button>
                  )}
                  <Link
                    to={doctorSheetLink(c.id)}
                    onClick={() => earnSticker("told-my-doctor")}
                    className="btd-btn-sky min-h-[44px] px-4 py-2 text-sm"
                  >
                    Put on my doctor sheet →
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Delete this check-in? This can't be undone.")) deleteCheckIn(c.id);
                    }}
                    className="min-h-[44px] px-3 text-sm font-semibold text-clay hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ---- Cards, All About Me, recording, stories ----

function ToolSection({
  title,
  helper,
  children,
}: {
  title: string;
  helper: { icon: string; short: string; full: string };
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-2">
        <h2 className="text-28 font-extrabold text-navy">{title}</h2>
        <SpeakButton text={title} />
      </div>
      <HelperMessage copy={helper} />
      {children}
    </div>
  );
}

// ---- Visit walkthrough ----

function VisitSection({ readingLevel }: { readingLevel: ReadingLevel }) {
  const { earnSticker } = useMyVoice();
  return (
    <div className="grid gap-7">
      <HelperMessage
        copy={{
          icon: "Swipe to see.",
          short: "Swipe to see what happens.",
          full: "Here's what a visit looks like, start to finish. Swipe or tap Next. Nothing here is a surprise on the day.",
        }}
      />
      <VisitWalkthrough
        readingLevel={readingLevel}
        onReachedEnd={() => earnSticker("knows-the-visit")}
      />
    </div>
  );
}

// ---- Sticker book ----

function StickerSection() {
  return (
    <div className="grid gap-7">
      <div>
        <h2 className="text-28 font-extrabold text-navy">My stickers</h2>
        <p className="mt-1 max-w-[36em] text-body">
          You earn a sticker for doing something — telling your doctor, saying how you feel,
          learning what happens at a visit. There are no streaks here, and no missed days.
        </p>
      </div>
      <StickerBook />
    </div>
  );
}
