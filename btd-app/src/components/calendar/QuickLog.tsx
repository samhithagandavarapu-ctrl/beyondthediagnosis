import { useRef, useState } from "react";
import DictateButton from "../DictateButton";
import Icon, { IconName } from "../icons/Icon";
import SpeakButton from "../myvoice/SpeakButton";
import { JustForMe } from "./LogFlow";
import { useMyVoice } from "../../context/MyVoiceContext";
import {
  BEHAVIORS,
  CalendarEntry,
  CalendarStore,
  CategoryId,
  CustomSymptom,
  EATING_AMOUNT,
  EMOTIONS,
  ENERGY_LEVELS,
  REPORTED_BY,
  ReportedBy,
  SKIN_CHANGES,
  SLEEP_QUALITY,
  STRENGTH_FACES,
  Typical,
  longDate,
  newEntry,
  todayKey,
} from "../../lib/calendar";
import { ELSE_KINDS, GroupId, asksIfUsual, group, groupOf, plainSummary } from "../../lib/calendarGroups";
import { PainAreaId } from "../../lib/myVoice";

// Logging, one question per screen: pick a kind (on Today), say how strong,
// and it's saved. Pain also asks where. "Is this normal for you?" only comes
// up when it matters (strong, or a worry). Everything else — a note,
// medicine, who's telling — waits behind "Add more" on the Saved screen.

type SaveResult = CalendarStore | "practice";
type Step = "else" | "own" | "strength" | "where" | "feeling" | "sleep" | "energy" | "eating" | "behavior" | "skin" | "event" | "usual";

const LAST_REPORTER_KEY = "voiced:calendar-reported-by";

function lastReporter(): ReportedBy {
  try {
    const v = localStorage.getItem(LAST_REPORTER_KEY);
    if (v === "self" || v === "caregiver" || v === "both") return v;
  } catch {
    // ignore
  }
  return "self";
}

// Where it hurts, as big buttons. The body map in My Voice has more places.
const WHERE: { id: PainAreaId; label: string }[] = [
  { id: "head", label: "Head" },
  { id: "neck", label: "Neck or throat" },
  { id: "chest", label: "Chest" },
  { id: "upper-belly", label: "Tummy" },
  { id: "lower-belly", label: "Lower belly" },
  { id: "upper-back", label: "Upper back" },
  { id: "lower-back", label: "Lower back" },
  { id: "arm-left", label: "Left arm" },
  { id: "arm-right", label: "Right arm" },
  { id: "leg-left", label: "Left leg" },
  { id: "leg-right", label: "Right leg" },
  { id: "foot-left", label: "Feet" },
];

const FEELINGS = EMOTIONS.filter((e) => e.id !== "dont-know");

const TITLES: Record<Step, (kind: string) => string> = {
  else: () => "What is it?",
  own: () => "What is it? Write a word or two.",
  strength: (k) => (k === "Pain" ? "How much does it hurt?" : "How much?"),
  where: () => "Where does it hurt?",
  feeling: () => "How do you feel?",
  sleep: () => "How did you sleep?",
  energy: () => "How is your energy?",
  eating: () => "How much did you eat?",
  behavior: () => "What is different? Tap all that fit.",
  skin: () => "What is your skin like? Tap all that fit.",
  event: () => "What happened?",
  usual: () => "Is this normal for you?",
};

/** The first question after a kind is picked. */
function firstStep(category: CategoryId, custom: boolean): Step {
  if (custom) return "strength";
  switch (category) {
    case "pain":
    case "bathroom":
      return "strength";
    case "mood":
      return "feeling";
    case "sleep":
      return "sleep";
    case "energy":
      return "energy";
    case "eating":
      return "eating";
    case "behavior":
      return "behavior";
    case "skin":
      return "skin";
    case "event":
      return "event";
    default:
      return "own";
  }
}

const CATEGORY_OF: Record<Exclude<GroupId, "period" | "else">, CategoryId> = {
  pain: "pain",
  feelings: "mood",
  sleep: "sleep",
  tummy: "bathroom",
};

export default function QuickLog({
  start,
  date,
  practice,
  customSymptoms,
  asCaregiverFor,
  canHide,
  canPlan,
  onSave,
  onAddCustomSymptom,
  onDone,
  onLogAnother,
}: {
  /** The tile tapped on Today. */
  start: Exclude<GroupId, "period">;
  date: string;
  practice: boolean;
  customSymptoms: CustomSymptom[];
  /** A linked grown-up logging in this child's calendar (their name). */
  asCaregiverFor?: string;
  canHide: boolean;
  /** "Bring this to my next visit" (the owner's own tray). */
  canPlan: boolean;
  onSave: (entry: CalendarEntry) => Promise<SaveResult>;
  onAddCustomSymptom: (s: CustomSymptom) => void;
  onDone: () => void;
  onLogAnother: () => void;
}) {
  const { say, earnSticker } = useMyVoice();
  const [entry, setEntry] = useState<CalendarEntry>(() =>
    newEntry({
      entryDate: date,
      category: start === "else" ? "other" : CATEGORY_OF[start],
      reportedBy: asCaregiverFor ? "caregiver" : lastReporter(),
    })
  );
  const [history, setHistory] = useState<Step[]>([start === "else" ? "else" : firstStep(CATEGORY_OF[start], false)]);
  const [keepAsButton, setKeepAsButton] = useState(false);
  const [saved, setSaved] = useState<SaveResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [more, setMore] = useState(false);
  const [dirty, setDirty] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  const step = history[history.length - 1];
  const kind = entry.customLabel?.trim() || (start === "else" ? ELSE_KINDS.find((k) => k.id === entry.category)?.label ?? "Something else" : group(start).label);
  const title = TITLES[step](kind);
  const g = groupOf(entry);

  // The site header sticks to the top, so start each screen at the very top.
  function scrollUp() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goTo(next: Step) {
    setHistory((h) => [...h, next]);
    say(TITLES[next](kind));
    scrollUp();
  }

  function back() {
    if (history.length <= 1) return onDone();
    setHistory((h) => h.slice(0, -1));
    scrollUp();
  }

  /** After the main answer: "Is this normal?" if it matters, then save. */
  function afterAnswer(next: CalendarEntry, from: Step) {
    setEntry(next);
    if (from === "strength" && next.category === "pain") return goTo("where");
    if (asksIfUsual(next)) return goTo("usual");
    finish(next);
  }

  async function finish(e: CalendarEntry) {
    setSaving(true);
    const now = new Date().toISOString();
    const toSave: CalendarEntry = { ...e, customLabel: e.customLabel?.trim() || null, loggedAt: now, updatedAt: now };
    if (toSave.category === "event" || !canHide) toSave.private = false;
    if (!practice && !asCaregiverFor && toSave.category === "other" && keepAsButton && toSave.customLabel && !toSave.details.customSymptomId) {
      const symptom = { id: crypto.randomUUID(), label: toSave.customLabel, icon: "star" as IconName, createdAt: now };
      toSave.details = { ...toSave.details, customSymptomId: symptom.id };
      onAddCustomSymptom(symptom);
    }
    setEntry(toSave);
    const where = await onSave(toSave);
    setSaving(false);
    setSaved(where);
    if (!practice && !asCaregiverFor) earnSticker("logged-my-day");
    say(practice ? "Saved, for practice." : "Saved! You got a sticker.");
    scrollUp();
  }

  /** Changes made on the Saved screen. Toggles save straight away; the
   *  "Add more" words save when they leave. */
  async function resave(next: CalendarEntry, now = true) {
    const e = { ...next, updatedAt: new Date().toISOString() };
    setEntry(e);
    if (now) await onSave(e);
    else setDirty(true);
  }

  async function leave(then: () => void) {
    if (dirty) {
      const e = {
        ...entry,
        note: entry.note?.trim() || null,
        medicationNote: entry.medicationNote?.trim() || null,
        updatedAt: new Date().toISOString(),
      };
      await onSave(e);
      try {
        if (!asCaregiverFor) localStorage.setItem(LAST_REPORTER_KEY, e.reportedBy);
      } catch {
        // ignore
      }
    }
    then();
  }

  // ---- Saved ----

  if (saved) {
    const s = plainSummary(entry);
    const time = new Date(entry.loggedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const who = asCaregiverFor
      ? [
          { id: "caregiver" as const, label: "I noticed it", icon: "doctor" as IconName },
          { id: "both" as const, label: `${asCaregiverFor} and I`, icon: "heart" as IconName },
        ]
      : REPORTED_BY;
    return (
      <div ref={top} className="mx-auto grid w-full max-w-xl scroll-mt-28 gap-4">
        <div className="grid justify-items-center gap-3 pt-2 text-center">
          <span className="btd-cal-check grid h-20 w-20 place-items-center rounded-full bg-butter text-navy">
            <Icon name={practice || asCaregiverFor ? "check" : "star"} size={40} />
          </span>
          <h2 className="font-display text-28 font-extrabold text-navy">
            {practice ? "Saved, for practice." : asCaregiverFor ? "Saved!" : "Saved! You got a sticker."}
          </h2>
          {practice && <p className="text-15 text-body">That was practice, so nothing was kept.</p>}
        </div>

        <div className="flex items-center gap-4 rounded-card bg-white p-4">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${g.tile} ${g.ink}`}>
            <Icon name={g.icon} size={22} />
          </span>
          <span className="min-w-0">
            <span className="block text-17 font-extrabold text-navy">{s.title}</span>
            <span className="block text-13 text-body">
              {[s.sub, `${entry.entryDate === todayKey() ? "Today" : longDate(entry.entryDate)}, ${time}`].filter(Boolean).join(" · ")}
            </span>
          </span>
        </div>

        {canPlan && (
          <button
            type="button"
            aria-pressed={entry.addToVisit}
            onClick={() => {
              resave({ ...entry, addToVisit: !entry.addToVisit });
              say(entry.addToVisit ? "Not for my visit" : "Bring this to my next visit");
            }}
            className={`flex min-h-[60px] items-center gap-3 rounded-card border-2 px-5 text-left text-15 font-bold text-navy ${
              entry.addToVisit ? "border-navy bg-butter/50" : "border-navy/15 bg-white hover:border-sky"
            }`}
          >
            <Icon name={entry.addToVisit ? "star-filled" : "star"} size={22} className={entry.addToVisit ? "text-coral-hover" : ""} />
            {entry.addToVisit ? "Bringing this to my next visit" : "Bring this to my next visit"}
          </button>
        )}

        {canHide && entry.category !== "event" && (
          <JustForMe on={entry.private} onChange={(v) => resave({ ...entry, private: v })} />
        )}

        {more ? (
          <div className="grid gap-5 rounded-card border-2 border-navy/15 bg-white p-5">
            <TextBox
              label="A note"
              value={entry.note ?? ""}
              onChange={(note) => resave({ ...entry, note }, false)}
              placeholder="You don't have to write anything."
            />
            <TextBox
              label="Medicine taken"
              value={entry.medicationNote ?? ""}
              onChange={(medicationNote) => resave({ ...entry, medicationNote }, false)}
              placeholder="For example: ibuprofen"
              single
            />
            <div>
              <p className="mb-2 text-15 font-bold text-navy">Who's telling?</p>
              <div role="radiogroup" aria-label="Who's telling?" className="flex flex-wrap gap-2">
                {who.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={entry.reportedBy === o.id}
                    onClick={() => {
                      resave({ ...entry, reportedBy: o.id }, false);
                      say(o.label);
                    }}
                    className={`flex min-h-[48px] items-center gap-2 rounded-full border-2 px-4 text-sm font-bold text-navy ${
                      entry.reportedBy === o.id ? "border-navy bg-sky-tint" : "border-navy/15 bg-white hover:border-sky"
                    }`}
                  >
                    <Icon name={o.icon} size={18} />
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMore(true);
              say("Add more");
            }}
            className="flex min-h-[64px] items-center justify-between gap-3 rounded-card border-2 border-dashed border-navy/25 bg-white/60 px-5 text-left hover:border-sky"
          >
            <span>
              <span className="block text-15 font-extrabold text-navy">Add more (you don't have to)</span>
              <span className="block text-13 text-body">A note, medicine, who's telling</span>
            </span>
            <Icon name="plus" size={22} className="text-navy" />
          </button>
        )}

        <div className="mt-4 grid gap-3">
          <button type="button" onClick={() => leave(onDone)} className="btd-btn-coral min-h-[56px] w-full px-6 py-3 text-base">
            Done
          </button>
          <button type="button" onClick={() => leave(onLogAnother)} className="btd-btn-outline min-h-[52px] w-full px-6 py-3 text-base">
            Log something else
          </button>
        </div>
      </div>
    );
  }

  // ---- The questions ----

  const strengthTone = ["border-[#F3D98A] bg-[#FFF5D6]", "border-[#F6B8AA] bg-[#FFE3DC]", "border-[#E99580] bg-[#FFC9BB]"];

  return (
    <div ref={top} className="mx-auto grid w-full max-w-xl scroll-mt-28 gap-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-navy shadow-sm hover:bg-sky-tint"
        >
          <Icon name="chevron-right" size={22} className="rotate-180" />
        </button>
        <span className="flex flex-1 justify-center gap-1.5" aria-hidden="true">
          {history.map((_, i) => (
            <span key={i} className={`h-1.5 w-7 rounded-full ${i === history.length - 1 ? "bg-navy" : "bg-navy/25"}`} />
          ))}
        </span>
        <span className="w-12" />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`btd-tag flex items-center gap-1 ${g.tile} text-navy`}>
          <Icon name={g.icon} size={14} />
          {step === "else" ? "Something else" : kind}
        </span>
        {entry.severityScale === "faces" && entry.severity && step !== "strength" && (
          <span className="btd-tag bg-coral/40 text-navy">{STRENGTH_FACES.find((f) => f.level === entry.severity)?.label}</span>
        )}
        {asCaregiverFor && <span className="btd-tag bg-sky text-navy">For {asCaregiverFor}</span>}
      </div>

      <div className="flex items-start gap-2">
        <h2 className="font-display text-28 font-extrabold leading-tight text-navy sm:text-[2rem]">{title}</h2>
        <SpeakButton text={title} />
      </div>

      {step === "else" && (
        <div className="grid gap-3">
          {[
            ...ELSE_KINDS.map((k) => ({ ...k, custom: undefined as CustomSymptom | undefined })),
            ...customSymptoms.map((c) => ({ id: "other" as CategoryId, label: c.label, icon: c.icon, custom: c as CustomSymptom | undefined })),
          ].map((k) => (
            <BigRow
              key={k.custom ? k.custom.id : k.id}
              icon={k.icon}
              label={k.label}
              onClick={() => {
                const custom = k.custom;
                const next = {
                  ...entry,
                  category: k.id,
                  customLabel: custom ? custom.label : null,
                  details: custom ? { customSymptomId: custom.id } : {},
                };
                setEntry(next);
                say(k.label);
                goTo(firstStep(k.id, !!custom));
              }}
            />
          ))}
          <BigRow
            icon="plus"
            label="Something not on the list"
            onClick={() => {
              setEntry({ ...entry, category: "other", customLabel: "", details: {} });
              goTo("own");
            }}
          />
        </div>
      )}

      {step === "own" && (
        <div className="grid gap-4">
          <TextBox
            label="What is it?"
            value={entry.customLabel ?? ""}
            onChange={(customLabel) => setEntry({ ...entry, customLabel })}
            placeholder="For example: hiccups, a headache at night."
            single
          />
          {!practice && !asCaregiverFor && (
            <label className="flex items-center gap-2 rounded-tile bg-white px-4 py-3 text-15 font-semibold text-navy">
              <input type="checkbox" checked={keepAsButton} onChange={(e) => setKeepAsButton(e.target.checked)} className="h-5 w-5" />
              Keep it as a button for next time
            </label>
          )}
          <NextButton disabled={!entry.customLabel?.trim()} onClick={() => goTo("strength")} />
        </div>
      )}

      {step === "strength" && (
        <div className="grid gap-3">
          {STRENGTH_FACES.map((f, i) => (
            <BigRow
              key={f.level}
              icon={f.icon}
              label={f.label}
              tone={strengthTone[i]}
              on={entry.severityScale === "faces" && entry.severity === f.level}
              onClick={() => {
                say(f.label);
                afterAnswer({ ...entry, severity: f.level, severityScale: "faces" }, "strength");
              }}
            />
          ))}
          <SkipLink onClick={() => afterAnswer({ ...entry, severity: null, severityScale: null }, "strength")} />
        </div>
      )}

      {step === "where" && (
        <div className="grid gap-4">
          <div role="group" aria-label="Where does it hurt?" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {WHERE.map((w) => {
              const on = !!entry.details.spots?.some((s) => s.area === w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const spots = on
                      ? (entry.details.spots ?? []).filter((s) => s.area !== w.id)
                      : [...(entry.details.spots ?? []), { area: w.id, kind: null, level: null }];
                    setEntry({ ...entry, details: { ...entry.details, spots }, bodyLocations: spots.map((s) => s.area) });
                    say(w.label);
                  }}
                  className={`min-h-[60px] rounded-card border-2 px-3 text-15 font-bold text-navy ${
                    on ? "border-navy bg-[#FFF0CF]" : "border-navy/12 bg-white hover:border-sky"
                  }`}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
          <NextButton onClick={() => afterAnswer(entry, "where")} label={entry.details.spots?.length ? "Next" : "Skip this"} />
        </div>
      )}

      {step === "feeling" && (
        <div className="grid grid-cols-2 gap-3">
          {FEELINGS.map((f) => (
            <BigTile
              key={f.id}
              icon={f.icon}
              label={f.label}
              onClick={() => {
                say(f.label);
                afterAnswer({ ...entry, details: { ...entry.details, feelings: [f.id] } }, "feeling");
              }}
            />
          ))}
        </div>
      )}

      {step === "sleep" && (
        <div className="grid gap-3">
          {SLEEP_QUALITY.map((q) => (
            <BigRow
              key={q.id}
              icon={q.icon}
              label={q.label}
              onClick={() => {
                say(q.label);
                afterAnswer({ ...entry, details: { ...entry.details, sleepQuality: q.id } }, "sleep");
              }}
            />
          ))}
        </div>
      )}

      {step === "energy" && (
        <div className="grid gap-3">
          {ENERGY_LEVELS.map((q) => (
            <BigRow
              key={q.id}
              icon="battery"
              label={q.label}
              onClick={() => {
                say(q.label);
                afterAnswer({ ...entry, details: { ...entry.details, energy: q.id } }, "energy");
              }}
            />
          ))}
        </div>
      )}

      {step === "eating" && (
        <div className="grid gap-3">
          {EATING_AMOUNT.map((q) => (
            <BigRow
              key={q.id}
              icon="utensils"
              label={q.label}
              onClick={() => {
                say(q.label);
                afterAnswer({ ...entry, details: { ...entry.details, eatingAmount: q.id } }, "eating");
              }}
            />
          ))}
        </div>
      )}

      {(step === "behavior" || step === "skin") && (
        <div className="grid gap-4">
          <div role="group" className="grid gap-2.5">
            {(step === "behavior" ? BEHAVIORS : SKIN_CHANGES).map((o) => {
              const list = (step === "behavior" ? entry.details.changes : entry.details.skin) ?? [];
              const on = (list as string[]).includes(o.id);
              const nextList = on ? list.filter((x) => x !== o.id) : [...list, o.id];
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setEntry({ ...entry, details: { ...entry.details, ...(step === "behavior" ? { changes: nextList } : { skin: nextList }) } as CalendarEntry["details"] });
                    say(o.label);
                  }}
                  className={`flex min-h-[60px] items-center gap-3 rounded-card border-2 px-4 text-left text-15 font-bold text-navy ${
                    on ? "border-navy bg-sky-tint" : "border-navy/12 bg-white hover:border-sky"
                  }`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded border-2 ${on ? "border-navy bg-navy text-mist" : "border-navy/30"}`}>
                    {on && <Icon name="check" size={16} />}
                  </span>
                  {o.label}
                </button>
              );
            })}
          </div>
          <NextButton onClick={() => afterAnswer(entry, step)} />
        </div>
      )}

      {step === "event" && (
        <div className="grid gap-4">
          <p className="rounded-tile border-2 border-coral bg-coral/20 px-4 py-3 text-15 font-bold text-navy">
            If someone is hurt, can't breathe, or won't wake up, call 911 now.
          </p>
          <TextBox
            label="What happened?"
            value={entry.details.whatHappened ?? ""}
            onChange={(whatHappened) => setEntry({ ...entry, details: { ...entry.details, whatHappened } })}
            placeholder="For example: shaking, fainting, a fall."
          />
          <div>
            <p className="mb-2 text-15 font-bold text-navy">How long did it last?</p>
            <div role="radiogroup" aria-label="How long did it last?" className="flex flex-wrap gap-2">
              {["Less than a minute", "A few minutes", "Longer"].map((h) => (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={entry.details.howLong === h}
                  onClick={() => setEntry({ ...entry, details: { ...entry.details, howLong: h } })}
                  className={`min-h-[48px] rounded-full border-2 px-4 text-sm font-bold text-navy ${
                    entry.details.howLong === h ? "border-navy bg-sky-tint" : "border-navy/15 bg-white"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
          <NextButton label="Save" disabled={saving} onClick={() => finish({ ...entry, details: { ...entry.details, whatHappened: entry.details.whatHappened?.trim() } })} />
        </div>
      )}

      {step === "usual" && (
        <div className="grid gap-3">
          {(
            [
              { id: "typical", label: "Normal for me", sub: "This happens a lot", icon: "check", tone: "border-navy/15 bg-white" },
              { id: "new", label: "New or different", sub: "This is not like me", icon: "alert", tone: "border-[#E8C45C] bg-[#FFF0CF]" },
            ] as { id: Typical; label: string; sub: string; icon: IconName; tone: string }[]
          ).map((o) => (
            <BigRow
              key={o.id}
              icon={o.icon}
              label={o.label}
              sub={o.sub}
              tone={o.tone}
              onClick={() => {
                say(o.label);
                finish({ ...entry, typical: o.id });
              }}
            />
          ))}
          <button
            type="button"
            onClick={() => finish({ ...entry, typical: "unsure" })}
            className="min-h-[48px] justify-self-center text-15 font-bold text-navy underline underline-offset-4"
          >
            I'm not sure
          </button>
          <p className="mt-6 rounded-card bg-sky-tint px-4 py-3 text-15 text-navy">
            Why we ask: doctors need to know what is new for <strong>you</strong>. This helps them not miss it.
          </p>
        </div>
      )}

      {saving && <p className="text-15 text-body" role="status">Saving…</p>}
    </div>
  );
}

// ---- Building blocks ----

function BigRow({
  icon,
  label,
  sub,
  tone = "border-navy/12 bg-white",
  on = false,
  onClick,
}: {
  icon: IconName;
  label: string;
  sub?: string;
  tone?: string;
  on?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex min-h-[84px] w-full items-center gap-4 rounded-card border-2 px-5 text-left transition-transform hover:scale-[1.01] ${tone} ${
        on ? "ring-[3px] ring-navy" : ""
      }`}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/80 text-navy">
        <Icon name={icon} size={30} />
      </span>
      <span className="min-w-0">
        <span className="block text-21 font-extrabold leading-tight text-navy">{label}</span>
        {sub && <span className="block text-13 text-body">{sub}</span>}
      </span>
    </button>
  );
}

function BigTile({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[110px] flex-col items-center justify-center gap-2 rounded-card border-2 border-navy/12 bg-white p-3 text-center hover:border-sky"
    >
      <Icon name={icon} size={40} className="text-navy" />
      <span className="text-17 font-extrabold text-navy">{label}</span>
    </button>
  );
}

function NextButton({ onClick, label = "Next", disabled }: { onClick: () => void; label?: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="btd-btn-coral min-h-[56px] w-full px-6 py-3 text-base disabled:opacity-40">
      {label}
    </button>
  );
}

function SkipLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-2 min-h-[48px] justify-self-center text-15 font-bold text-navy underline underline-offset-4">
      Skip this
    </button>
  );
}

function TextBox({
  label,
  value,
  onChange,
  placeholder,
  single,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  single?: boolean;
}) {
  const id = useRef(`ql-${Math.random().toString(36).slice(2)}`).current;
  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-center gap-2 text-15 font-bold text-navy">
        {label}
        <SpeakButton text={label} />
      </label>
      {single ? (
        <input id={id} className="btd-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <textarea id={id} className="btd-input min-h-[90px]" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
      <div className="mt-2">
        <DictateButton value={value} onChange={onChange} label={label} />
      </div>
    </div>
  );
}
