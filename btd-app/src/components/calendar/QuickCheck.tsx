import { useState } from "react";
import Icon, { IconName } from "../icons/Icon";
import SpeakButton from "../myvoice/SpeakButton";
import { useMyVoice } from "../../context/MyVoiceContext";
import { CalendarEntry, CalendarStore, ENERGY_LEVELS, ReportedBy, SLEEP_QUALITY, SkinId, longDate, newEntry } from "../../lib/calendar";
import { FEELINGS, FeelingId, ReadingLevel } from "../../lib/myVoice";

// "How's today?": the everyday things on one screen — mood (and mood swings),
// energy, sleep, skin and cramps — one tap each. Saving makes an ordinary
// calendar entry for each row answered, so they show on the calendar, in
// patterns, and in Appointment Prep like anything else. Rows left alone
// aren't saved.

type Cramps = "none" | 1 | 2 | 3;
type SkinPick = "clear" | "breakouts" | "dry-itchy";

const SKIN_PICKS: { id: SkinPick; label: string; ids: SkinId[] }[] = [
  { id: "clear", label: "Clear", ids: ["clear"] },
  { id: "breakouts", label: "Breakouts", ids: ["breakouts"] },
  { id: "dry-itchy", label: "Dry or itchy", ids: ["dry", "itchy"] },
];

const CRAMPS: { id: Cramps; label: string; icon: IconName }[] = [
  { id: "none", label: "None", icon: "face-great" },
  { id: 1, label: "A little", icon: "face-okay" },
  { id: 2, label: "Medium", icon: "face-bad" },
  { id: 3, label: "A lot", icon: "face-awful" },
];

// Cramps go on the body map's 1–5 "how much" scale, in the lower belly.
const CRAMP_LEVEL = { 1: 2, 2: 3, 3: 4 } as const;

const LAST_REPORTER_KEY = "voiced:calendar-reported-by";

export default function QuickCheck({
  date,
  readingLevel,
  practice,
  onSave,
  onDone,
}: {
  date: string;
  readingLevel: ReadingLevel;
  practice: boolean;
  /** Saves all of today's entries together. */
  onSave: (entries: CalendarEntry[]) => Promise<CalendarStore | "practice">;
  onDone: () => void;
}) {
  const { say } = useMyVoice();
  const showText = readingLevel !== "icon";
  const [mood, setMood] = useState<FeelingId | null>(null);
  const [swings, setSwings] = useState(false);
  const [energy, setEnergy] = useState<(typeof ENERGY_LEVELS)[number]["id"] | null>(null);
  const [sleep, setSleep] = useState<(typeof SLEEP_QUALITY)[number]["id"] | null>(null);
  const [skin, setSkin] = useState<SkinPick[]>([]);
  const [cramps, setCramps] = useState<Cramps | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ where: CalendarStore | "practice"; count: number } | null>(null);

  const anything = mood || swings || energy || sleep || skin.length || (cramps !== null && cramps !== "none");

  async function save() {
    setSaving(true);
    let reportedBy: ReportedBy = "self";
    try {
      const v = localStorage.getItem(LAST_REPORTER_KEY);
      if (v === "caregiver" || v === "both") reportedBy = v;
    } catch {
      // ignore
    }
    const base = { entryDate: date, reportedBy };
    const out: CalendarEntry[] = [];
    if (mood || swings) {
      out.push(
        newEntry({
          ...base,
          category: "mood",
          details: { ...(mood ? { overall: mood } : {}), ...(swings ? { feelings: ["mood-swings"] } : {}) },
        })
      );
    }
    if (energy) out.push(newEntry({ ...base, category: "energy", details: { energy } }));
    if (sleep) out.push(newEntry({ ...base, category: "sleep", details: { sleepQuality: sleep } }));
    if (skin.length) {
      out.push(
        newEntry({ ...base, category: "skin", details: { skin: [...new Set(skin.flatMap((s) => SKIN_PICKS.find((p) => p.id === s)!.ids))] } })
      );
    }
    if (cramps !== null && cramps !== "none") {
      const level = CRAMP_LEVEL[cramps];
      out.push(
        newEntry({
          ...base,
          category: "pain",
          bodyLocations: ["lower-belly"],
          severity: level,
          severityScale: "five",
          details: { spots: [{ area: "lower-belly", kind: "cramping", level }] },
        })
      );
    }
    const where = await onSave(out);
    setSaving(false);
    setSaved({ where, count: out.length });
    say("Saved! You did it.");
  }

  if (saved) {
    return (
      <div className="btd-card grid justify-items-center gap-4 p-8 text-center">
        <span className="btd-cal-check grid h-20 w-20 place-items-center rounded-full bg-sky text-navy">
          <Icon name="check" size={44} />
        </span>
        <p className="font-display text-28 font-extrabold text-navy">Saved! You did it.</p>
        <p className="text-15 text-body">
          {saved.where === "practice"
            ? "That was practice, so nothing was saved."
            : `${saved.count} ${saved.count === 1 ? "thing" : "things"} added to your calendar for ${longDate(date)}.`}
        </p>
        <button type="button" onClick={onDone} className="btd-btn-outline min-h-[56px] px-6 py-3 text-base">
          Back to my calendar
        </button>
      </div>
    );
  }

  const row = (title: string, children: React.ReactNode) => (
    <section aria-label={title} className="grid gap-3 border-t border-navy/10 pt-5 first:border-0 first:pt-0">
      <div className="flex items-center gap-2">
        <h3 className="text-17 font-extrabold text-navy">{title}</h3>
        <SpeakButton text={title} />
      </div>
      {children}
    </section>
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-28 font-extrabold text-navy">How's today?</h2>
        <p className="text-15 font-semibold text-muted">{longDate(date)}</p>
      </div>
      <p className="text-15 text-body">Tap what fits. Skip anything you want.</p>

      <div className="btd-card grid gap-5 p-6">
        {row(
          "My mood",
          <div className="flex flex-wrap gap-2.5">
            {FEELINGS.map((f) => (
              <Pick
                key={f.id}
                on={mood === f.id}
                icon={f.icon}
                label={f.label}
                short={f.short}
                showText={showText}
                tone={f.tone}
                onClick={() => {
                  setMood(mood === f.id ? null : f.id);
                  say(f.label);
                }}
              />
            ))}
            <Pick
              on={swings}
              icon="repeat"
              label="Mood swings"
              short="Mood swings"
              showText={showText}
              onClick={() => {
                setSwings(!swings);
                say("Mood swings");
              }}
            />
          </div>
        )}
        {row(
          "My energy",
          <div className="flex flex-wrap gap-2.5">
            {ENERGY_LEVELS.map((e) => (
              <Pick
                key={e.id}
                on={energy === e.id}
                icon="battery"
                label={e.id === "normal" ? "Usual" : e.label}
                short={e.id === "normal" ? "Usual" : e.label}
                showText
                onClick={() => {
                  setEnergy(energy === e.id ? null : e.id);
                  say(e.label);
                }}
              />
            ))}
          </div>
        )}
        {row(
          "How I slept",
          <div className="flex flex-wrap gap-2.5">
            {SLEEP_QUALITY.map((q) => (
              <Pick
                key={q.id}
                on={sleep === q.id}
                icon={q.icon}
                label={q.label}
                short={q.label}
                showText={showText}
                onClick={() => {
                  setSleep(sleep === q.id ? null : q.id);
                  say(q.label);
                }}
              />
            ))}
          </div>
        )}
        {row(
          "My skin",
          <div className="flex flex-wrap gap-2.5">
            {SKIN_PICKS.map((s) => {
              const on = skin.includes(s.id);
              return (
                <Pick
                  key={s.id}
                  on={on}
                  icon="skin"
                  label={s.label}
                  short={s.label}
                  showText
                  onClick={() => {
                    // "Clear" and the others don't go together.
                    const rest = skin.filter((x) => x !== s.id);
                    setSkin(on ? rest : s.id === "clear" ? ["clear"] : [...rest.filter((x) => x !== "clear"), s.id]);
                    say(s.label);
                  }}
                />
              );
            })}
          </div>
        )}
        {row(
          "Cramps",
          <div className="flex flex-wrap gap-2.5">
            {CRAMPS.map((c) => (
              <Pick
                key={String(c.id)}
                on={cramps === c.id}
                icon={c.icon}
                label={c.label}
                short={c.label}
                showText
                onClick={() => {
                  setCramps(cramps === c.id ? null : c.id);
                  say(c.id === "none" ? "No cramps" : `Cramps, ${c.label}`);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!anything || saving}
          className="btd-btn-coral min-h-[56px] gap-2 px-8 py-4 text-base disabled:opacity-40"
        >
          <Icon name="save" size={22} />
          {practice ? "Practice saving" : "Save today"}
        </button>
        <button type="button" onClick={onDone} className="min-h-[56px] px-3 text-sm font-semibold text-link hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}

function Pick({
  on,
  icon,
  label,
  short,
  showText,
  tone = "bg-white",
  onClick,
}: {
  on: boolean;
  icon: IconName;
  label: string;
  short: string;
  showText: boolean;
  tone?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={`flex min-h-[80px] min-w-[88px] flex-col items-center justify-center gap-1 rounded-card border-2 px-3 py-2 transition-transform ${tone} ${
        on ? "border-navy scale-[1.04] shadow-[0_6px_18px_rgba(33,50,68,0.14)]" : "border-navy/12 hover:border-sky"
      }`}
    >
      <Icon name={icon} size={32} className="text-navy" />
      {showText && <span className="text-13 font-bold text-navy">{short}</span>}
    </button>
  );
}
