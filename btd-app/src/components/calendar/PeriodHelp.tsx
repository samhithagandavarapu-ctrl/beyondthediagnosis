import { useState } from "react";
import Icon from "../icons/Icon";
import SpeakButton from "../myvoice/SpeakButton";
import { CalendarEntry, longDate } from "../../lib/calendar";
import { cycles, daysSinceLastPeriod, predictNext } from "../../lib/cycles";

// What goes around the period log: when to tell a doctor (fixed words, never
// worked out from what was logged), picture stories to learn more, a
// reminder to change at mealtimes, and a period bag checklist.

const TELL_A_DOCTOR = [
  "Soaking through a pad every hour, for a few hours in a row",
  "A period that lasts longer than 7 days",
  "Blobs (clots) the size of a quarter or bigger",
  "Bleeding between periods",
  "Feeling very tired or dizzy",
  "A big change from what's usual for you",
];

export function TellADoctor() {
  return (
    <div className="rounded-card border-2 border-butter bg-butter/25 p-5">
      <div className="flex items-center gap-2">
        <p className="text-17 font-extrabold text-navy">Tell a doctor if you have:</p>
        <SpeakButton text={`Tell a doctor if you have: ${TELL_A_DOCTOR.join(". ")}.`} />
      </div>
      <ul className="mt-2 grid list-disc gap-1 pl-5 text-15 text-navy">
        {TELL_A_DOCTOR.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <p className="mt-3 text-15 font-bold text-navy">
        If you faint, or the bleeding is very fast, call 911 now.
      </p>
    </div>
  );
}

// Links out to the Adult Down Syndrome Center's picture stories. Their words
// stay on their site; nothing is copied here.
export const PERIOD_STORIES = [
  { title: "Getting my period", href: "https://adultdownsyndrome.org/resources/story-about-getting-my-period/" },
  { title: "Changing my pad", href: "https://adultdownsyndrome.org/resources/story-about-how-to-change-my-pad/" },
  {
    title: "Changing period underwear",
    href: "https://adultdownsyndrome.org/resources/story-about-how-to-change-my-period-panties/",
  },
  {
    title: "When to change",
    href: "https://adultdownsyndrome.org/resources/story-about-when-to-change-my-menstrual-hygiene-product/",
  },
];

export function LearnMore() {
  return (
    <div className="btd-card p-5">
      <p className="btd-eyebrow mb-3">Picture stories about periods</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {PERIOD_STORIES.map((s) => (
          <li key={s.href}>
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[48px] items-center gap-2 rounded-tile border border-navy/12 bg-white px-4 py-2 text-15 font-semibold text-link hover:border-sky"
            >
              <Icon name="book" size={20} />
              {s.title}
              <span className="sr-only">(opens the Adult Down Syndrome Center site)</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-12 text-muted">From the Adult Down Syndrome Center. Opens their site.</p>
    </div>
  );
}

export function MealtimeReminder() {
  return (
    <div className="flex items-center gap-3 rounded-card border-2 border-coral bg-coral/15 px-5 py-4">
      <Icon name="utensils" size={26} className="text-navy" />
      <p className="flex-1 text-15 font-bold text-navy">Remember to change your pad at lunch and dinner.</p>
      <SpeakButton text="Remember to change your pad at lunch and dinner." />
    </div>
  );
}

const BAG = ["Pads", "Wipes", "Spare underwear", "My picture story"];
const BAG_KEY = "voiced:period-bag";

export function BagChecklist() {
  const [ticked, setTicked] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(BAG_KEY) || "[]") as string[];
    } catch {
      return [];
    }
  });
  function toggle(item: string) {
    const next = ticked.includes(item) ? ticked.filter((t) => t !== item) : [...ticked, item];
    setTicked(next);
    try {
      localStorage.setItem(BAG_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  return (
    <div className="btd-card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="btd-eyebrow">My period bag</p>
        {ticked.length > 0 && (
          <button type="button" onClick={() => setTicked([])} className="text-13 font-semibold text-link hover:underline">
            Start over
          </button>
        )}
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {BAG.map((item) => {
          const on = ticked.includes(item);
          return (
            <li key={item}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(item)}
                className={`flex min-h-[52px] w-full items-center gap-3 rounded-tile border-2 bg-white px-4 text-left text-15 font-semibold text-navy ${
                  on ? "border-navy bg-sky-tint" : "border-navy/12 hover:border-sky"
                }`}
              >
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded border-2 ${on ? "border-navy bg-navy text-mist" : "border-navy/30"}`}>
                  {on && <Icon name="check" size={16} />}
                </span>
                {item}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Next period (once there are 2 cycles), days since the last one, and the
 *  last few periods, in plain counts. */
export function MyPeriodCard({ entries }: { entries: CalendarEntry[] }) {
  const all = cycles(entries);
  const next = predictNext(entries);
  const since = daysSinceLastPeriod(entries);
  const done = all.filter((c) => c.length !== null);
  return (
    <div className="btd-card grid gap-4 p-5">
      <div className="flex items-center gap-2">
        <Icon name="drop" size={24} className="text-navy" />
        <h2 className="text-21 font-extrabold text-navy">My period</h2>
      </div>
      <ul className="grid gap-1.5 text-15 text-navy">
        {next ? (
          <li className="font-bold">
            Your next period might start around{" "}
            {new Date(`${next.start}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.
          </li>
        ) : (
          <li className="text-body">
            {done.length < 2
              ? "A guess for your next period shows up after 2 periods are logged from start to start."
              : "No guess right now."}
          </li>
        )}
        {since !== null && (
          <li>
            Days since my last period started: <strong>{since}</strong>
          </li>
        )}
        {all.length > 0 && (
          <li>
            Last period: {all[all.length - 1].periodDays} days, starting {longDate(all[all.length - 1].start)}
          </li>
        )}
      </ul>
    </div>
  );
}
