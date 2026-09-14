import { useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import Mascot, { MascotFace, forLevel } from "../components/Mascot";
import PracticeModeToggle from "../components/PracticeModeToggle";
import BodyMap from "../components/myvoice/BodyMap";
import FaceScale from "../components/myvoice/FaceScale";
import SentenceBuilder from "../components/myvoice/SentenceBuilder";
import SpeakButton from "../components/myvoice/SpeakButton";
import StickerBook from "../components/myvoice/StickerBook";
import VisitWalkthrough from "../components/myvoice/VisitWalkthrough";
import VoiceRecorder from "../components/myvoice/VoiceRecorder";
import { useMyVoice } from "../context/MyVoiceContext";
import { usePracticeMode } from "../context/PracticeModeContext";
import {
  CheckIn,
  READING_LEVELS,
  ReadingLevel,
  buildSentence,
  checkInHasContent,
  emptyCheckIn,
} from "../lib/myVoice";

type Section = "home" | "check-in" | "tell" | "visit" | "stickers";

export default function MyVoice() {
  const [section, setSection] = useState<Section>("home");
  const [checkIn, setCheckIn] = useState<CheckIn>(emptyCheckIn());
  const { readingLevel, savedCheckIn } = useMyVoice();

  function patchCheckIn(patch: Partial<CheckIn>) {
    setCheckIn((c) => ({ ...c, ...patch }));
  }

  return (
    <div>
      <PageHero
        eyebrow="My Voice"
        title="Say how you feel, in your own way"
        lede="This part of Verity is for you — not for the grown-up who brought you. Tap pictures to show how you feel, build a sentence to tell your doctor, and see what happens at a visit before you go."
      />

      <section className="btd-container pt-10 pb-20 grid gap-8">
        <SettingsStrip />

        {section === "home" ? (
          <Home onPick={setSection} hasSaved={!!savedCheckIn} />
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setSection("home")}
              className="mb-6 text-sm font-bold text-link hover:underline"
            >
              ← Back
            </button>
            {section === "check-in" && (
              <CheckInFlow
                checkIn={checkIn}
                onPatch={patchCheckIn}
                onRestart={() => setCheckIn(emptyCheckIn())}
                onTellDoctor={() => setSection("tell")}
                readingLevel={readingLevel}
              />
            )}
            {section === "tell" && (
              <TellMyDoctor checkIn={checkIn} onPatch={patchCheckIn} readingLevel={readingLevel} />
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
              {readAloud ? "🔊 Read aloud on" : "🔇 Read aloud off"}
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

// ---- Hub ----

const TILES: { id: Section; icon: string; copy: { icon: string; short: string; full: string } }[] = [
  {
    id: "check-in",
    icon: "🙂",
    copy: { icon: "How I feel", short: "How I feel today", full: "Check in: how does my body feel today?" },
  },
  {
    id: "tell",
    icon: "🗣️",
    copy: {
      icon: "Tell my doctor",
      short: "Tell my doctor",
      full: "Build a sentence to tell my doctor",
    },
  },
  {
    id: "visit",
    icon: "🏥",
    copy: {
      icon: "What happens",
      short: "What happens at a visit",
      full: "See what happens at a doctor visit, step by step",
    },
  },
  {
    id: "stickers",
    icon: "⭐",
    copy: { icon: "My stickers", short: "My stickers", full: "My sticker book" },
  },
];

function Home({ onPick, hasSaved }: { onPick: (s: Section) => void; hasSaved: boolean }) {
  const { readingLevel, say } = useMyVoice();

  return (
    <div className="grid gap-7">
      <Mascot
        mood="hello"
        copy={{
          icon: "Hi! Tap one.",
          short: "Hi, I'm Vee. Tap one to start.",
          full: "Hi, I'm Vee. Pick anything below — there's no wrong answer, and you can stop whenever you want.",
        }}
      />

      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))]">
        {TILES.map((tile) => {
          const label = forLevel(readingLevel, tile.copy);
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => {
                say(label);
                onPick(tile.id);
              }}
              className="btd-card btd-card-hover flex min-h-[170px] flex-col items-center justify-center gap-3 p-6 text-center"
            >
              <span aria-hidden="true" className="text-[3.25rem] leading-none">
                {tile.icon}
              </span>
              <span className="text-17 font-display font-extrabold text-navy">{label}</span>
            </button>
          );
        })}
      </div>

      {hasSaved && (
        <div className="rounded-card border-2 border-sky bg-sky-tint p-5">
          <p className="text-15 font-semibold text-navy">
            You have a check-in saved. It can go on the summary your family brings to the doctor.
          </p>
          <Link
            to="/appointment-prep"
            className="btd-btn-sky mt-3 min-h-[46px] px-5 py-3 text-sm"
          >
            Add it to the appointment summary →
          </Link>
        </div>
      )}
    </div>
  );
}

// ---- Feelings check-in ----

function CheckInFlow({
  checkIn,
  onPatch,
  onRestart,
  onTellDoctor,
  readingLevel,
}: {
  checkIn: CheckIn;
  onPatch: (patch: Partial<CheckIn>) => void;
  onRestart: () => void;
  onTellDoctor: () => void;
  readingLevel: ReadingLevel;
}) {
  const { say, saveCheckIn, earnSticker } = useMyVoice();
  const { practice } = usePracticeMode();
  const [done, setDone] = useState(false);
  const showText = readingLevel !== "icon";

  function finish() {
    saveCheckIn(checkIn);
    earnSticker("said-how-i-feel");
    if (checkIn.hasVoiceNote) earnSticker("used-my-voice");
    setDone(true);
    say("All done. Thank you for telling me.");
  }

  if (done) {
    return (
      <div className="grid gap-6">
        <Mascot
          mood="cheer"
          copy={{
            icon: "All done!",
            short: "All done. Great job!",
            full: "All done — thank you for telling me how you feel. That was the important part.",
          }}
        />
        <div className="btd-card p-6">
          <p className="btd-eyebrow">What you said</p>
          <p className="mt-2 text-21 font-display font-extrabold leading-[1.35] text-navy">
            {buildSentence(checkIn) || "You finished your check-in."}
          </p>
          {practice ? (
            <p className="mt-4 rounded-tile border border-butter bg-butter/30 px-4 py-3 text-13 font-semibold text-navy">
              That was practice, so nothing was saved. Turn practice mode off when it's real.
            </p>
          ) : (
            <p className="mt-4 text-13 text-muted">
              Saved on this device. You earned a sticker.
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={onTellDoctor} className="btd-btn-coral min-h-[48px] px-5 py-3 text-sm">
              Now tell my doctor →
            </button>
            <button
              onClick={() => {
                onRestart();
                setDone(false);
              }}
              className="btd-btn-outline min-h-[48px] px-5 py-3 text-sm"
            >
              Start again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <Mascot
        mood="think"
        copy={{
          icon: "Tap how you feel.",
          short: "Tap the face that fits, then where it hurts.",
          full: "First tap the face that's closest to how you feel. Then tap the place on the body that hurts. You can tap more than one place.",
        }}
      />

      <Step number={1} title="How do you feel today?" showText={showText}>
        <FaceScale
          value={checkIn.overall}
          onChange={(id) => onPatch({ overall: id })}
          readingLevel={readingLevel}
        />
      </Step>

      <Step number={2} title="Where does it hurt?" showText={showText}>
        <BodyMap
          selected={checkIn.bodyParts}
          onToggle={(id) =>
            onPatch({
              bodyParts: checkIn.bodyParts.includes(id)
                ? checkIn.bodyParts.filter((p) => p !== id)
                : [...checkIn.bodyParts, id],
            })
          }
          readingLevel={readingLevel}
        />
      </Step>

      <Step number={3} title="Anything else?" showText={showText}>
        <div className="grid gap-4">
          <VoiceRecorder
            recorded={checkIn.hasVoiceNote}
            onRecordedChange={(recorded) => onPatch({ hasVoiceNote: recorded })}
          />
          {readingLevel !== "icon" && (
            <div>
              <label className="mb-2 flex items-center gap-2 text-15 font-bold text-navy">
                Or write it
                <SpeakButton text="Or write it" />
              </label>
              <textarea
                className="btd-input min-h-[90px]"
                value={checkIn.note}
                onChange={(e) => onPatch({ note: e.target.value })}
                placeholder="You don't have to write anything."
              />
            </div>
          )}
        </div>
      </Step>

      <button
        type="button"
        onClick={finish}
        disabled={!checkInHasContent(checkIn)}
        className="btd-btn-coral min-h-[56px] justify-self-start px-8 py-4 text-base disabled:opacity-40"
      >
        ✅ I'm done
      </button>
    </div>
  );
}

function Step({
  number,
  title,
  showText,
  children,
}: {
  number: number;
  title: string;
  showText: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="btd-card p-6">
      {showText && (
        <div className="mb-5 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky font-bold text-navy">
            {number}
          </span>
          <h2 className="text-21 font-extrabold text-navy">{title}</h2>
          <SpeakButton text={title} />
        </div>
      )}
      {children}
    </div>
  );
}

// ---- Tell my doctor ----

function TellMyDoctor({
  checkIn,
  onPatch,
  readingLevel,
}: {
  checkIn: CheckIn;
  onPatch: (patch: Partial<CheckIn>) => void;
  readingLevel: ReadingLevel;
}) {
  const { saveCheckIn, earnSticker, say } = useMyVoice();
  const { practice } = usePracticeMode();
  const [saved, setSaved] = useState(false);
  const sentence = buildSentence(checkIn);

  function save() {
    saveCheckIn(checkIn);
    earnSticker("told-my-doctor");
    setSaved(true);
    say("Saved. You told your doctor something today.");
  }

  return (
    <div className="grid gap-7">
      <Mascot
        mood="hello"
        copy={{
          icon: "Tap to build it.",
          short: "Tap the pictures to build your sentence.",
          full: "Tap a face, a body part, and when it started. I'll put the sentence together for you — you can change it any time.",
        }}
      />

      <div className="btd-card p-6">
        <SentenceBuilder value={checkIn} onChange={onPatch} readingLevel={readingLevel} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!sentence}
          className="btd-btn-coral min-h-[56px] px-8 py-4 text-base disabled:opacity-40"
        >
          {practice ? "Practice saying it" : "💾 Save this to tell my doctor"}
        </button>
        {saved &&
          (practice ? (
            <p className="text-sm font-semibold text-navy">
              Good practice. Nothing was saved, because practice mode is on.
            </p>
          ) : (
            <p className="text-sm font-semibold text-navy">
              Saved — and you earned the “I told my doctor something” sticker.
            </p>
          ))}
      </div>

      {saved && !practice && (
        <div className="rounded-card border-2 border-sky bg-sky-tint p-5">
          <p className="text-15 text-navy">
            Your sentence can be printed on the summary your family brings to the visit.
          </p>
          <Link to="/appointment-prep" className="btd-btn-sky mt-3 min-h-[46px] px-5 py-3 text-sm">
            Put it on the summary →
          </Link>
        </div>
      )}
    </div>
  );
}

// ---- Visit walkthrough ----

function VisitSection({ readingLevel }: { readingLevel: ReadingLevel }) {
  const { earnSticker } = useMyVoice();
  return (
    <div className="grid gap-7">
      <Mascot
        mood="calm"
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
      <div className="flex items-center gap-4">
        <MascotFace mood="cheer" size={72} />
        <div>
          <h2 className="text-28 font-extrabold text-navy">My stickers</h2>
          <p className="mt-1 max-w-[36em] text-body">
            You earn a sticker for doing something — telling your doctor, saying how you feel,
            learning what happens at a visit. There are no streaks here, and no missed days.
          </p>
        </div>
      </div>
      <StickerBook />
    </div>
  );
}
