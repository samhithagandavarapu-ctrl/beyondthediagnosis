import { useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import HelperMessage, { forLevel } from "../components/HelperMessage";
import PracticeModeToggle from "../components/PracticeModeToggle";
import SayCards from "../components/myvoice/SayCards";
import AboutMe from "../components/myvoice/AboutMe";
import Scenarios from "../components/myvoice/Scenarios";
import VoiceMemo from "../components/myvoice/VoiceMemo";
import SpeakButton from "../components/myvoice/SpeakButton";
import StickerBook from "../components/myvoice/StickerBook";
import { CheckInSummary, FeelingsOverTime } from "../components/myvoice/CheckInHistory";
import CheckInFlow, { doctorSheetLink } from "../components/myvoice/CheckInFlow";
import VisitWalkthrough from "../components/myvoice/VisitWalkthrough";
import Icon, { IconName } from "../components/icons/Icon";
import { useAuth } from "../context/AuthContext";
import { useMyVoice } from "../context/MyVoiceContext";
import { usePracticeMode } from "../context/PracticeModeContext";
import {
  CheckIn,
  READING_LEVELS,
  ReadingLevel,
  emptyCheckIn,
  feeling,
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
