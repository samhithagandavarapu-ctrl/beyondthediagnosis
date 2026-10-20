import { useRef, useState } from "react";
import DictateButton from "../DictateButton";
import HelperMessage from "../HelperMessage";
import Icon, { IconName } from "../icons/Icon";
import FaceScale from "../myvoice/FaceScale";
import PeriodPicture from "./PeriodPicture";
import { LearnMore, TellADoctor } from "./PeriodHelp";
import PainMap from "../myvoice/PainMap";
import SpeakButton from "../myvoice/SpeakButton";
import { useMyVoice } from "../../context/MyVoiceContext";
import {
  BATHROOM,
  BEHAVIORS,
  CATEGORIES,
  CLOT_SIZES,
  CalendarEntry,
  CalendarStore,
  CategoryId,
  CustomSymptom,
  EATING_AMOUNT,
  EMOTIONS,
  ENERGY_LEVELS,
  EntryDetails,
  FLOW_LEVELS,
  FLOW_PRODUCTS,
  PRODUCTS,
  ProductId,
  emptyFlow,
  REPORTED_BY,
  ReportedBy,
  SLEEP_QUALITY,
  STRENGTH_FACES,
  aboutLines,
  category,
  detailLines,
  entryTitle,
  longDate,
  newEntry,
} from "../../lib/calendar";
import { ReadingLevel, feeling, painSpotSentence } from "../../lib/myVoice";

// Logging one thing for one day. Two ways to do it, switchable at the top:
//  - "I'm logging for myself": one question per screen, big pictures, no
//    typing needed (the default at the picture reading levels);
//  - "I'm helping someone log": every question on one form (the default at
//    the full-sentence level).
// Every follow-up question is optional.

type Mode = "self" | "caregiver";
type SaveResult = CalendarStore | "practice";

// These have their own scale (the body map's faces, the face scale, the
// sleep and energy pictures), so "How strong?" isn't asked as well.
const OWN_SCALE: CategoryId[] = ["period", "pain", "mood", "sleep", "energy"];

const LAST_REPORTER_KEY = "voiced:calendar-reported-by";

function lastReporter(mode: Mode): ReportedBy {
  try {
    const v = localStorage.getItem(LAST_REPORTER_KEY);
    if (v === "self" || v === "caregiver" || v === "both") return v;
  } catch {
    // ignore
  }
  return mode === "caregiver" ? "caregiver" : "self";
}

const USUAL_PRODUCTS_KEY = "voiced:calendar-usual-products";

/** "What I usually use": what was saved last time, or failing that what was
 *  used on the latest period day logged. */
function usualProducts(fallback: ProductId[]): ProductId[] {
  try {
    const saved = JSON.parse(localStorage.getItem(USUAL_PRODUCTS_KEY) || "[]") as ProductId[];
    return saved.length ? saved : fallback;
  } catch {
    return fallback;
  }
}

const CUSTOM_ICONS: IconName[] = ["star", "heart", "alert", "eye", "ear", "tooth", "drop", "moon", "hand", "breath"];

type Screen = { id: string; title: string };

export default function LogFlow({
  date,
  initial,
  readingLevel,
  practice,
  customSymptoms,
  dayBeforeIsPeriod = false,
  lastProducts = [],
  onAddCustomSymptom,
  onSave,
  onLogAnother,
  onDone,
}: {
  /** The day being logged, "2026-10-20". */
  date: string;
  /** An entry being changed, or nothing for a new one. */
  initial?: CalendarEntry;
  readingLevel: ReadingLevel;
  practice: boolean;
  customSymptoms: CustomSymptom[];
  /** A period was logged the day before, so this one isn't the first day. */
  dayBeforeIsPeriod?: boolean;
  /** Products from the latest period day logged. */
  lastProducts?: ProductId[];
  onAddCustomSymptom: (s: CustomSymptom) => void;
  onSave: (entry: CalendarEntry) => Promise<SaveResult>;
  onLogAnother: () => void;
  onDone: () => void;
}) {
  const { say } = useMyVoice();
  const isEdit = !!initial;
  const [mode, setMode] = useState<Mode>(readingLevel === "full" ? "caregiver" : "self");
  const [entry, setEntry] = useState<CalendarEntry>(
    () => initial ?? newEntry({ entryDate: date, reportedBy: lastReporter(readingLevel === "full" ? "caregiver" : "self") })
  );
  const [picked, setPicked] = useState(isEdit);
  const [step, setStep] = useState(0);
  const [keepAsButton, setKeepAsButton] = useState(false);
  const [customIcon, setCustomIcon] = useState<IconName>("star");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SaveResult | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const showText = readingLevel !== "icon";

  const patch = (p: Partial<CalendarEntry>) => setEntry((e) => ({ ...e, ...p }));
  const patchDetails = (p: Partial<EntryDetails>) => setEntry((e) => ({ ...e, details: { ...e.details, ...p } }));

  // The screens for this entry, in order (one at a time when logging for
  // yourself; all together on the helper's form).
  const catScreens: Screen[] = picked ? categoryScreens(entry.category, mode === "caregiver") : [];
  const screens: Screen[] = [
    ...(isEdit ? [] : [{ id: "category", title: "What do you want to log?" }]),
    ...catScreens,
    ...(picked && !OWN_SCALE.includes(entry.category) ? [{ id: "strength", title: "How strong?" }] : []),
    ...(picked
      ? [
          { id: "typical", title: "Is this usual for me?" },
          { id: "who", title: "Who's telling?" },
          { id: "note", title: "Anything else?" },
          { id: "review", title: "Look it over" },
        ]
      : []),
  ];
  const current = screens[Math.min(step, screens.length - 1)];

  function go(next: number) {
    setStep(next);
    const s = screens[next];
    if (s) say(s.title);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function pickCategory(id: CategoryId, custom?: CustomSymptom) {
    setEntry((e) => ({
      ...e,
      category: id,
      customLabel: custom ? custom.label : null,
      details: custom
        ? { customSymptomId: custom.id }
        : id === "period"
          ? {
              firstDay: !dayBeforeIsPeriod,
              flow: emptyFlow(),
              flowProduct: "pad",
              products: usualProducts(lastProducts),
            }
          : {},
      severity: null,
      severityScale: null,
      bodyLocations: null,
    }));
    setPicked(true);
    say(custom ? custom.label : category(id).label);
    if (mode === "self") {
      setStep(1);
      top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function save() {
    setSaving(true);
    const now = new Date().toISOString();
    const toSave: CalendarEntry = {
      ...entry,
      loggedAt: isEdit ? entry.loggedAt : now,
      updatedAt: now,
      customLabel: entry.customLabel?.trim() || null,
      note: entry.note?.trim() || null,
      medicationNote: entry.medicationNote?.trim() || null,
    };
    try {
      localStorage.setItem(LAST_REPORTER_KEY, toSave.reportedBy);
      // "What I usually use" comes pre-picked next time.
      if (toSave.category === "period" && toSave.details.products?.length) {
        localStorage.setItem(USUAL_PRODUCTS_KEY, JSON.stringify(toSave.details.products));
      }
    } catch {
      // ignore
    }
    if (!practice && entry.category === "other" && keepAsButton && toSave.customLabel && !entry.details.customSymptomId) {
      const symptom = { id: crypto.randomUUID(), label: toSave.customLabel, icon: customIcon, createdAt: now };
      toSave.details = { ...toSave.details, customSymptomId: symptom.id };
      onAddCustomSymptom(symptom);
    }
    const where = await onSave(toSave);
    setSaving(false);
    setSaved(where);
    say("Saved! You did it.");
  }

  // ---- The questions ----

  function renderScreen(id: string) {
    switch (id) {
      case "category":
        return (
          <div className="grid gap-4">
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,140px),1fr))]">
              {CATEGORIES.map((c) => (
                <PictureButton
                  key={c.id}
                  icon={c.icon}
                  label={c.label}
                  showText={showText}
                  on={picked && entry.category === c.id && !entry.customLabel}
                  onClick={() => pickCategory(c.id)}
                  tall
                />
              ))}
            </div>
            {customSymptoms.length > 0 && (
              <div>
                <p className="mb-2 text-15 font-bold text-navy">{showText ? "My own" : <span className="sr-only">My own</span>}</p>
                <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,140px),1fr))]">
                  {customSymptoms.map((s) => (
                    <PictureButton
                      key={s.id}
                      icon={s.icon}
                      label={s.label}
                      showText={showText}
                      on={entry.details.customSymptomId === s.id}
                      onClick={() => pickCategory("other", s)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case "period-kind": {
        const kinds = [
          { id: "first", label: "First day of my period", icon: "drop" as IconName },
          { id: "more", label: "My period, not the first day", icon: "drop" as IconName },
          { id: "spotting", label: "Just spotting (between periods)", icon: "drop" as IconName },
        ];
        const kind = entry.details.spotting ? "spotting" : entry.details.firstDay ? "first" : "more";
        return (
          <OneOf
            options={kinds}
            value={kind}
            onChange={(k) => patchDetails({ firstDay: k === "first", spotting: k === "spotting" })}
            showText
            required
          />
        );
      }
      case "period-flow": {
        const flow = entry.details.flow ?? emptyFlow();
        const product = entry.details.flowProduct ?? "pad";
        return (
          <div className="grid gap-5">
            <div role="radiogroup" aria-label="What are you looking at?" className="flex flex-wrap gap-2">
              {FLOW_PRODUCTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={product === p.id}
                  onClick={() => {
                    patchDetails({ flowProduct: p.id });
                    say(p.label);
                  }}
                  className={`flex min-h-[52px] items-center gap-2 rounded-full border-2 bg-white px-4 text-sm font-bold text-navy ${
                    product === p.id ? "border-navy bg-sky-tint" : "border-navy/15 hover:border-sky"
                  }`}
                >
                  <PeriodPicture product={p.id} fill={0.42} size={32} />
                  {p.label}
                </button>
              ))}
            </div>
            {showText && <p className="text-15 text-body">Tap +1 each time you change it.</p>}
            <ul className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))]">
              {FLOW_LEVELS.map((l) => (
                <li key={l.id} className={`grid justify-items-center gap-2 rounded-card border-2 bg-white p-3 text-center ${flow[l.id] > 0 ? "border-navy" : "border-navy/12"}`}>
                  <PeriodPicture product={product} fill={l.fill} />
                  <span className="text-15 font-bold text-navy">{l.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => patchDetails({ flow: { ...flow, [l.id]: Math.max(0, flow[l.id] - 1) } })}
                      disabled={flow[l.id] === 0}
                      aria-label={`Take one away: ${l.label}`}
                      className="grid h-11 w-11 place-items-center rounded-full border-2 border-navy/20 text-lg font-bold text-navy disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="min-w-[2ch] text-21 font-extrabold text-navy" aria-live="polite">
                      {flow[l.id]}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        patchDetails({ flow: { ...flow, [l.id]: flow[l.id] + 1 } });
                        say(`${l.label}, plus one`);
                      }}
                      aria-label={`Add one: ${l.label}`}
                      className="grid h-11 min-w-[56px] place-items-center rounded-full bg-coral px-3 text-15 font-extrabold text-navy hover:bg-coral-hover"
                    >
                      +1
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      }
      case "period-products":
        return (
          <CheckList
            options={PRODUCTS}
            value={entry.details.products ?? []}
            onChange={(products) => patchDetails({ products })}
          />
        );
      case "period-leak":
        return (
          <OneOf
            options={[
              { id: "yes", label: "Yes, it leaked", icon: "drop" as IconName },
              { id: "no", label: "No", icon: "check" as IconName },
            ]}
            value={entry.details.leak === undefined ? undefined : entry.details.leak ? "yes" : "no"}
            onChange={(v) => patchDetails({ leak: v === undefined ? undefined : v === "yes" })}
            showText
          />
        );
      case "period-clots": {
        const clots = entry.details.clots;
        return (
          <div className="grid gap-5">
            <OneOf
              options={[
                { id: "yes", label: "Yes", icon: "eye" as IconName },
                { id: "no", label: "No", icon: "check" as IconName },
              ]}
              value={clots === undefined ? undefined : clots === "none" ? "no" : "yes"}
              onChange={(v) => patchDetails({ clots: v === undefined ? undefined : v === "no" ? "none" : "quarter" })}
              showText
            />
            {clots && clots !== "none" && (
              <div>
                <p className="mb-3 text-15 font-bold text-navy">How big?</p>
                <div role="radiogroup" aria-label="How big?" className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))]">
                  {CLOT_SIZES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={clots === c.id}
                      onClick={() => {
                        patchDetails({ clots: c.id });
                        say(c.label);
                      }}
                      className={`flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-card border-2 bg-white p-3 text-center ${
                        clots === c.id ? "border-navy bg-sky-tint" : "border-navy/12 hover:border-sky"
                      }`}
                    >
                      <span className="block rounded-full bg-coral-hover" style={{ width: c.px, height: c.px }} aria-hidden="true" />
                      <span className="text-15 font-bold text-navy">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }
      case "pain":
        return (
          <PainMap
            spots={entry.details.spots ?? []}
            onChange={(spots) => {
              const worst = Math.max(0, ...spots.map((s) => s.level ?? 0));
              setEntry((e) => ({
                ...e,
                details: { ...e.details, spots },
                bodyLocations: spots.map((s) => s.area),
                severity: worst || null,
                severityScale: worst ? "five" : null,
              }));
            }}
            readingLevel={readingLevel}
          />
        );
      case "mood-overall":
        return (
          <FaceScale
            value={entry.details.overall ?? null}
            onChange={(id) => patchDetails({ overall: id })}
            readingLevel={readingLevel}
          />
        );
      case "mood-feelings":
        return (
          <ChipGrid
            options={EMOTIONS}
            value={entry.details.feelings ?? []}
            onChange={(feelings) => patchDetails({ feelings })}
            showText={showText}
          />
        );
      case "behavior":
        return (
          <CheckList
            options={BEHAVIORS}
            value={entry.details.changes ?? []}
            onChange={(changes) => patchDetails({ changes })}
          />
        );
      case "sleep-quality":
        return (
          <OneOf
            options={SLEEP_QUALITY}
            value={entry.details.sleepQuality}
            onChange={(sleepQuality) => patchDetails({ sleepQuality })}
            showText={showText}
          />
        );
      case "sleep-more":
        return (
          <div className="grid gap-3">
            <YesNo label="I woke up a lot" on={!!entry.details.wokeUpALot} onChange={(v) => patchDetails({ wokeUpALot: v })} />
            <YesNo label="I was very sleepy in the daytime" on={!!entry.details.sleepyInDay} onChange={(v) => patchDetails({ sleepyInDay: v })} />
          </div>
        );
      case "eating-amount":
        return (
          <OneOf
            options={EATING_AMOUNT.map((o) => ({ ...o, icon: "utensils" as IconName }))}
            value={entry.details.eatingAmount}
            onChange={(eatingAmount) => patchDetails({ eatingAmount })}
            showText
          />
        );
      case "eating-more":
        return (
          <div className="grid gap-3">
            <YesNo label="My tummy was upset" on={!!entry.details.tummyUpset} onChange={(v) => patchDetails({ tummyUpset: v })} />
            <YesNo label="I threw up" on={!!entry.details.throwingUp} onChange={(v) => patchDetails({ throwingUp: v })} />
          </div>
        );
      case "bathroom":
        return (
          <CheckList
            options={BATHROOM}
            value={entry.details.bathroom ?? []}
            onChange={(bathroom) => patchDetails({ bathroom })}
          />
        );
      case "energy":
        return (
          <OneOf
            options={ENERGY_LEVELS.map((o) => ({ ...o, icon: "battery" as IconName }))}
            value={entry.details.energy}
            onChange={(energy) => patchDetails({ energy })}
            showText
          />
        );
      case "event-what":
        return (
          <div className="grid gap-4">
            <p className="rounded-tile border-2 border-coral bg-coral/20 px-4 py-3 text-15 font-bold text-navy">
              If someone is hurt, can't breathe, or won't wake up, call 911 now.
            </p>
            <TextBox
              label="What happened?"
              value={entry.details.whatHappened ?? ""}
              onChange={(whatHappened) => patchDetails({ whatHappened })}
              placeholder="For example: shaking, fainting, a fall."
            />
          </div>
        );
      case "event-long":
        return (
          <div className="grid gap-4">
            <OneOf
              options={[
                { id: "Less than a minute", label: "Less than a minute", icon: "clock" as IconName },
                { id: "A few minutes", label: "A few minutes", icon: "clock" as IconName },
                { id: "Longer", label: "Longer", icon: "clock" as IconName },
              ]}
              value={entry.details.howLong}
              onChange={(howLong) => patchDetails({ howLong })}
              showText
            />
          </div>
        );
      case "other":
        return (
          <div className="grid gap-4">
            <TextBox
              label="What is it?"
              value={entry.customLabel ?? ""}
              onChange={(customLabel) => patch({ customLabel })}
              placeholder="For example: hiccups, a rash."
              single
            />
            {!entry.details.customSymptomId && !practice && (
              <div className="rounded-tile bg-mist p-4">
                <label className="flex items-center gap-2 text-15 font-semibold text-navy">
                  <input
                    type="checkbox"
                    checked={keepAsButton}
                    onChange={(e) => setKeepAsButton(e.target.checked)}
                    className="h-5 w-5"
                  />
                  Keep it as a quick button for next time
                </label>
                {keepAsButton && (
                  <div className="mt-3">
                    <p className="mb-2 text-13 font-semibold text-body">Pick a picture for it</p>
                    <div role="radiogroup" aria-label="Pick a picture" className="flex flex-wrap gap-2">
                      {CUSTOM_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          role="radio"
                          aria-checked={customIcon === icon}
                          aria-label={icon}
                          onClick={() => setCustomIcon(icon)}
                          className={`grid h-12 w-12 place-items-center rounded-tile border-2 bg-white text-navy ${
                            customIcon === icon ? "border-navy bg-sky-tint" : "border-navy/12"
                          }`}
                        >
                          <Icon name={icon} size={24} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case "strength":
        return (
          <div className="grid gap-4">
            {mode === "caregiver" && (
              <div role="radiogroup" aria-label="Scale" className="flex gap-2">
                {(["faces", "ten"] as const).map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    role="radio"
                    aria-checked={(entry.severityScale ?? "faces") === scale}
                    onClick={() => patch({ severityScale: scale, severity: null })}
                    className={`min-h-[40px] rounded-full border-2 px-4 text-sm font-bold ${
                      (entry.severityScale ?? "faces") === scale ? "border-navy bg-sky text-navy" : "border-navy/15 bg-white text-body"
                    }`}
                  >
                    {scale === "faces" ? "3 faces" : "0 to 10"}
                  </button>
                ))}
              </div>
            )}
            {entry.severityScale === "ten" ? (
              <div role="radiogroup" aria-label="How strong, 0 to 10" className="flex flex-wrap gap-2">
                {Array.from({ length: 11 }, (_, n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={entry.severity === n}
                    onClick={() => patch({ severity: entry.severity === n ? null : n, severityScale: "ten" })}
                    className={`grid h-12 w-12 place-items-center rounded-tile border-2 text-base font-bold ${
                      entry.severity === n ? "border-navy bg-sky text-navy" : "border-navy/12 bg-white text-navy"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            ) : (
              <div role="radiogroup" aria-label="How strong?" className="flex flex-wrap justify-center gap-3">
                {STRENGTH_FACES.map((f) => {
                  const on = entry.severityScale === "faces" && entry.severity === f.level;
                  return (
                    <button
                      key={f.level}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={f.label}
                      onClick={() => {
                        patch(on ? { severity: null, severityScale: null } : { severity: f.level, severityScale: "faces" });
                        say(f.label);
                      }}
                      className={`flex min-h-[110px] w-[120px] flex-col items-center justify-center gap-2 rounded-card border-2 ${f.tone} ${
                        on ? "border-navy scale-[1.04]" : "border-navy/12 hover:border-sky"
                      } transition-transform`}
                    >
                      <Icon name={f.icon} size={44} className="text-navy" />
                      {showText && <span className="text-15 font-bold text-navy">{f.label}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      case "typical":
        return (
          <div role="radiogroup" aria-label="Is this usual for me?" className="grid gap-3 sm:grid-cols-2">
            {(
              [
                { id: "typical", label: "This is normal for me", icon: "check" },
                { id: "new", label: "This is new or different", icon: "alert" },
              ] as const
            ).map((o) => {
              const on = entry.typical === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    patch({ typical: on ? null : o.id });
                    say(o.label);
                  }}
                  className={`flex min-h-[72px] items-center gap-3 rounded-card border-2 bg-white px-5 text-left text-17 font-bold text-navy ${
                    on ? "border-navy bg-sky-tint" : "border-navy/12 hover:border-sky"
                  }`}
                >
                  <Icon name={o.icon} size={28} />
                  {o.label}
                </button>
              );
            })}
          </div>
        );
      case "who":
        return (
          <OneOf
            options={REPORTED_BY}
            value={entry.reportedBy}
            onChange={(reportedBy) => patch({ reportedBy: reportedBy ?? "self" })}
            showText
            required
          />
        );
      case "note":
        return (
          <div className="grid gap-5">
            {showText ? (
              <TextBox
                label="A note"
                value={entry.note ?? ""}
                onChange={(note) => patch({ note })}
                placeholder="You don't have to write anything."
              />
            ) : (
              <p className="text-15 text-body">
                <span className="sr-only">Nothing else to add. Tap Next.</span>
              </p>
            )}
            {(showText || mode === "caregiver") && (
              <TextBox
                label="Medicine taken (optional)"
                value={entry.medicationNote ?? ""}
                onChange={(medicationNote) => patch({ medicationNote })}
                placeholder="For example: ibuprofen"
                single
              />
            )}
          </div>
        );
      default:
        return null;
    }
  }

  // ---- After saving ----

  if (saved) {
    return (
      <div ref={top} className="grid gap-6 scroll-mt-28">
        <div className="btd-card grid justify-items-center gap-4 p-8 text-center">
          <span className="btd-cal-check grid h-20 w-20 place-items-center rounded-full bg-sky text-navy">
            <Icon name="check" size={44} />
          </span>
          <p className="font-display text-28 font-extrabold text-navy">Saved! You did it.</p>
          <p className="text-15 text-body">
            {saved === "practice"
              ? "That was practice, so nothing was saved."
              : saved === "account"
                ? "It's on your calendar, saved to your account."
                : "It's on your calendar, saved on this device."}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={onLogAnother} className="btd-btn-coral min-h-[56px] gap-2 px-7 py-3 text-base">
              <Icon name="plus" size={20} />
              Log something else
            </button>
            <button type="button" onClick={onDone} className="btd-btn-outline min-h-[56px] px-6 py-3 text-base">
              Back to my calendar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const summary = (
    <div className="btd-card p-6">
      <p className="btd-eyebrow">{longDate(entry.entryDate)}</p>
      <p className="mt-2 flex items-center gap-2 font-display text-23 font-extrabold text-navy">
        <Icon name={category(entry.category).icon} size={26} />
        {entryTitle(entry)}
      </p>
      <ul className="mt-3 grid gap-1 text-15 text-navy">
        {[...detailLines(entry, (id) => feeling(id).short, painSpotSentence), ...aboutLines(entry)].map((l) => (
          <li key={l}>{l}</li>
        ))}
        {entry.note?.trim() && <li className="italic">“{entry.note.trim()}”</li>}
      </ul>
    </div>
  );

  return (
    <div ref={top} className="grid gap-6 scroll-mt-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-15 font-bold text-navy">
          {isEdit ? "Change this entry" : "Log for"} · {longDate(entry.entryDate)}
        </p>
        <div role="radiogroup" aria-label="Who is logging" className="flex flex-wrap gap-2">
          {(
            [
              { id: "self", label: "I'm logging for myself" },
              { id: "caregiver", label: "I'm helping someone log" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              onClick={() => {
                setMode(m.id);
                setStep(0);
              }}
              className={`min-h-[44px] rounded-full border-2 px-4 py-2 text-sm font-bold ${
                mode === m.id ? "border-navy bg-sky text-navy" : "border-navy/15 bg-white text-body hover:border-sky"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "self" ? (
        <>
          {current.id !== "category" && current.id !== "review" && (
            <p className="text-13 font-semibold text-muted">
              {showText ? `${entryTitle(entry)} · question ${step + (isEdit ? 1 : 0)} of ${screens.length - (isEdit ? 1 : 2)}` : ""}
            </p>
          )}
          {current.id === "review" ? (
            <>
              <HelperMessage
                copy={{
                  icon: "Look. Then save.",
                  short: "Look it over. Then tap Save.",
                  full: "Here's everything you logged. Tap Back to change something. When it looks right, tap Save.",
                }}
              />
              {summary}
              {entry.category === "period" && (
                <>
                  <TellADoctor />
                  <LearnMore />
                </>
              )}
            </>
          ) : (
            <div className="btd-card p-6">
              <div className="mb-5 flex items-center gap-2">
                <h2 className="text-23 font-extrabold text-navy">{current.title}</h2>
                <SpeakButton text={current.title} />
              </div>
              {renderScreen(current.id)}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {step > 0 && (
              <button type="button" onClick={() => go(step - 1)} className="btd-btn-outline min-h-[56px] px-6 py-3 text-base">
                ← Back
              </button>
            )}
            {current.id === "review" ? (
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="btd-btn-coral min-h-[56px] gap-2 px-8 py-4 text-base disabled:opacity-40"
              >
                <Icon name="save" size={22} />
                {practice ? "Practice saving" : "Save"}
              </button>
            ) : (
              current.id !== "category" && (
                <button type="button" onClick={() => go(step + 1)} className="btd-btn-coral min-h-[56px] px-8 py-4 text-base">
                  {screens[step + 1]?.id === "review" ? "Look it over →" : "Next →"}
                </button>
              )
            )}
            <button type="button" onClick={onDone} className="min-h-[56px] px-3 text-sm font-semibold text-link hover:underline">
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          {screens
            .filter((s) => s.id !== "review")
            .map((s) => (
              <section key={s.id} aria-label={s.title} className="btd-card p-5">
                <h2 className="mb-4 text-17 font-extrabold text-navy">{s.title}</h2>
                {renderScreen(s.id)}
              </section>
            ))}
          {picked && entry.category === "period" && <TellADoctor />}
          {picked && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="btd-btn-coral min-h-[56px] gap-2 px-8 py-4 text-base disabled:opacity-40"
              >
                <Icon name="save" size={22} />
                {practice ? "Practice saving" : "Save"}
              </button>
              <button type="button" onClick={onDone} className="min-h-[56px] px-3 text-sm font-semibold text-link hover:underline">
                Cancel
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** The category's own questions, each one screen when logging for yourself. */
function categoryScreens(id: CategoryId, caregiver: boolean): Screen[] {
  switch (id) {
    case "period":
      return [
        { id: "period-kind", title: "Is this the first day of your period?" },
        { id: "period-flow", title: "What did your pad or period underwear look like?" },
        { id: "period-products", title: "What did I use? Tap all that fit." },
        { id: "period-leak", title: "Did it leak on my clothes?" },
        { id: "period-clots", title: caregiver ? "Did I see blobs (clots)?" : "Did I see blobs?" },
      ];
    case "pain":
      return [{ id: "pain", title: "Where does it hurt?" }];
    case "mood":
      return [
        { id: "mood-overall", title: "How do I feel?" },
        { id: "mood-feelings", title: "Any feelings? Tap all that fit." },
      ];
    case "behavior":
      return [{ id: "behavior", title: "What is different? Tap all that fit." }];
    case "sleep":
      return [
        { id: "sleep-quality", title: "How did I sleep?" },
        { id: "sleep-more", title: "Anything else about sleep?" },
      ];
    case "eating":
      return [
        { id: "eating-amount", title: "How much did I eat?" },
        { id: "eating-more", title: "Anything else about eating?" },
      ];
    case "bathroom":
      return [{ id: "bathroom", title: "What happened? Tap all that fit." }];
    case "energy":
      return [{ id: "energy", title: "How is my energy?" }];
    case "event":
      return [
        { id: "event-what", title: "What happened?" },
        { id: "event-long", title: "How long did it last?" },
      ];
    case "other":
      return [{ id: "other", title: "What is it?" }];
    default:
      return [];
  }
}

// ---- Building blocks ----

function PictureButton({
  icon,
  label,
  showText,
  on,
  onClick,
  tall,
}: {
  icon: IconName;
  label: string;
  showText: boolean;
  on: boolean;
  onClick: () => void;
  tall?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={`flex ${tall ? "min-h-[128px]" : "min-h-[96px]"} flex-col items-center justify-center gap-2 rounded-card border-2 bg-white p-3 text-center transition-colors ${
        on ? "border-navy bg-sky-tint" : "border-navy/12 hover:border-sky"
      }`}
    >
      <span className="grid h-14 w-14 place-items-center rounded-full bg-sky-tint text-navy">
        <Icon name={icon} size={30} />
      </span>
      {showText && <span className="text-15 font-bold leading-tight text-navy">{label}</span>}
    </button>
  );
}

function OneOf<T extends string>({
  options,
  value,
  onChange,
  showText,
  required,
}: {
  options: readonly { id: T; label: string; icon: IconName | string }[];
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  showText: boolean;
  required?: boolean;
}) {
  const { say } = useMyVoice();
  return (
    <div role="radiogroup" className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,130px),1fr))]">
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.label}
            onClick={() => {
              onChange(on && !required ? undefined : o.id);
              say(o.label);
            }}
            className={`flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-card border-2 bg-white p-3 text-center transition-colors ${
              on ? "border-navy bg-sky-tint" : "border-navy/12 hover:border-sky"
            }`}
          >
            <Icon name={o.icon as IconName} size={36} className="text-navy" />
            {showText && <span className="text-15 font-bold leading-tight text-navy">{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ChipGrid<T extends string>({
  options,
  value,
  onChange,
  showText,
}: {
  options: readonly { id: T; label: string; icon: IconName }[];
  value: T[];
  onChange: (v: T[]) => void;
  showText: boolean;
}) {
  const { say } = useMyVoice();
  return (
    <div role="group" className="flex flex-wrap justify-center gap-2.5">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            aria-label={o.label}
            onClick={() => {
              onChange(on ? value.filter((v) => v !== o.id) : [...value, o.id]);
              say(o.label);
            }}
            className={`flex min-h-[88px] w-[96px] flex-col items-center justify-center gap-1 rounded-card border-2 bg-white p-2 transition-colors ${
              on ? "border-navy bg-sky-tint" : "border-navy/12 hover:border-sky"
            }`}
          >
            <Icon name={o.icon} size={34} className="text-navy" />
            {showText && <span className="text-13 font-bold text-navy">{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

function CheckList<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  const { say } = useMyVoice();
  return (
    <div role="group" className="grid gap-2.5 sm:grid-cols-2">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => {
              onChange(on ? value.filter((v) => v !== o.id) : [...value, o.id]);
              say(o.label);
            }}
            className={`flex min-h-[56px] items-center gap-3 rounded-tile border-2 bg-white px-4 text-left text-15 font-semibold text-navy ${
              on ? "border-navy bg-sky-tint" : "border-navy/12 hover:border-sky"
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
  );
}

function YesNo({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return <CheckList options={[{ id: "yes", label }]} value={on ? ["yes"] : []} onChange={(v) => onChange(v.length > 0)} />;
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
  const id = useRef(`cal-${Math.random().toString(36).slice(2)}`).current;
  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-center gap-2 text-15 font-bold text-navy">
        {label}
        <SpeakButton text={label} />
      </label>
      {single ? (
        <input id={id} className="btd-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <textarea
          id={id}
          className="btd-input min-h-[90px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
      <div className="mt-2">
        <DictateButton value={value} onChange={onChange} label={label} />
      </div>
    </div>
  );
}
