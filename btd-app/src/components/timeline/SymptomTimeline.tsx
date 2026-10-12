import { useMemo, useState } from "react";
import Icon from "../icons/Icon";
import {
  AREAS,
  COMPARED_OPTIONS,
  FREQUENCY_OPTIONS,
  IMPACT_OPTIONS,
  NOTICER_OPTIONS,
  Timeline,
  TimelineEntry,
  TIMELINE_TYPES,
  dateLabel,
  entryDetails,
  guessMonth,
  nearbyEntries,
  newEntry,
  sortEntries,
  timelineType,
} from "../../lib/timeline";

type Props = {
  value: Timeline;
  onChange: (next: Timeline) => void;
};

/** The Symptom Timeline section of Appointment Prep. Nothing in here is
 *  required, and nothing in here can stop the summary being made: an entry
 *  with no description is simply left off. */
export default function SymptomTimeline({ value, onChange }: Props) {
  const [newestFirst, setNewestFirst] = useState(true);
  // Which entries are open for editing. New ones open; everything else starts
  // folded so a long timeline stays scannable.
  const [open, setOpen] = useState<Set<string>>(new Set());

  const ordered = useMemo(() => sortEntries(value.entries, newestFirst), [value.entries, newestFirst]);
  const near = useMemo(() => nearbyEntries(value.entries), [value.entries]);
  const usedAreas = new Set(value.entries.map((e) => e.area).filter(Boolean));

  function setEntries(entries: TimelineEntry[]) {
    onChange({ ...value, entries });
  }

  function add(patch: Partial<TimelineEntry> = {}) {
    const entry = newEntry(patch);
    setEntries([...value.entries, entry]);
    setOpen((prev) => new Set(prev).add(entry.id));
    // Undated entries sit at the end of the list; take the person there.
    requestAnimationFrame(() => {
      const el = document.getElementById(`tl-${entry.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.querySelector<HTMLTextAreaElement>("textarea")?.focus({ preventScroll: true });
    });
  }

  function addArea(area: string) {
    const existing = value.entries.find((e) => e.area === area);
    if (existing) {
      setOpen((prev) => new Set(prev).add(existing.id));
      requestAnimationFrame(() =>
        document
          .getElementById(`tl-${existing.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" })
      );
      return;
    }
    add({ type: "change", area });
  }

  function update(id: string, patch: Partial<TimelineEntry>) {
    setEntries(value.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function remove(entry: TimelineEntry) {
    if (
      entry.description.trim() &&
      !window.confirm(`Delete "${entry.description.trim()}" from the timeline?`)
    ) {
      return;
    }
    setEntries(value.entries.filter((e) => e.id !== entry.id));
  }

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section aria-labelledby="timeline-heading" className="rounded-card border border-navy/12 bg-white p-5 sm:p-6">
      <h2 id="timeline-heading" className="text-21 font-extrabold text-navy">
        Symptom timeline
      </h2>
      <p className="mt-1.5 text-sm leading-[1.6] text-body">
        When did things change, and what else changed around the same time? A timeline
        helps the doctor look into a change instead of putting it down to Down syndrome.
        Everything here is optional.
      </p>

      {/* ---- Their usual self ---- */}
      <div className="mt-5">
        <label htmlFor="tl-usual" className="block text-sm font-bold text-navy">
          Their usual self
        </label>
        <p id="tl-usual-hint" className="mt-0.5 text-13 text-muted">
          What are they like on a typical good day? Think about energy, mood, skills,
          sleep, and eating. This is what the doctor compares everything else to.
        </p>
        <textarea
          id="tl-usual"
          aria-describedby="tl-usual-hint"
          className="btd-input mt-2 min-h-[80px]"
          value={value.usualSelf}
          onChange={(e) => onChange({ ...value, usualSelf: e.target.value })}
          placeholder="e.g. Up by 7, walks to the bus on their own, chatty at dinner, loves drawing, sleeps through the night"
        />
      </div>

      {/* ---- Areas to think about ---- */}
      <fieldset className="mt-5">
        <legend className="text-sm font-bold text-navy">Areas to think about</legend>
        <p className="mt-0.5 text-13 text-muted">
          Just reminders, so nothing gets forgotten — not a list of what might be wrong.
          Tap one to add something about it.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {AREAS.map((area) => {
            const used = usedAreas.has(area);
            return (
              <button
                key={area}
                type="button"
                onClick={() => addArea(area)}
                aria-pressed={used}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-13 font-semibold transition-colors ${
                  used
                    ? "border-navy bg-navy text-mist"
                    : "border-navy/20 bg-white text-navy hover:border-navy/50"
                }`}
              >
                {used ? <Icon name="check" size={15} /> : <span aria-hidden="true">+</span>}
                {area}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* ---- The timeline itself ---- */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => add()}
          className="inline-flex items-center gap-2 rounded bg-navy px-4 py-2.5 text-sm font-semibold text-mist hover:bg-navy/90"
        >
          <span aria-hidden="true">+</span> Add to the timeline
        </button>
        {value.entries.length > 1 && (
          <button
            type="button"
            onClick={() => setNewestFirst((v) => !v)}
            className="text-13 font-semibold text-link hover:underline"
          >
            {newestFirst ? "Showing newest first · Show oldest first" : "Showing oldest first · Show newest first"}
          </button>
        )}
      </div>

      {ordered.length === 0 ? (
        <p className="mt-4 rounded-tile border border-dashed border-navy/20 bg-mist p-4 text-sm text-body">
          Nothing on the timeline yet. Add a change you've noticed, a new medication, an
          illness, a test, or a big life change like a move.
        </p>
      ) : (
        <ol className="relative mt-5 space-y-4 border-l-2 border-sky pl-5 sm:pl-6">
          {ordered.map((entry) => (
            <EntryItem
              key={entry.id}
              entry={entry}
              near={near.get(entry.id) ?? []}
              isOpen={open.has(entry.id)}
              onToggle={() => toggle(entry.id)}
              onChange={(patch) => update(entry.id, patch)}
              onRemove={() => remove(entry)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function EntryItem({
  entry,
  near,
  isOpen,
  onToggle,
  onChange,
  onRemove,
}: {
  entry: TimelineEntry;
  near: TimelineEntry[];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<TimelineEntry>) => void;
  onRemove: () => void;
}) {
  const type = timelineType(entry.type);
  const title = entry.description.trim() || "New entry";
  const details = entryDetails(entry);
  const idp = `tl-${entry.id}`;

  return (
    <li id={idp} className="relative scroll-mt-24">
      {/* The dot on the line. */}
      <span
        aria-hidden="true"
        className="absolute -left-[31px] top-4 grid h-[22px] w-[22px] place-items-center rounded-full border-2 border-sky bg-white text-navy sm:-left-[35px]"
      >
        <span className="h-2 w-2 rounded-full bg-navy" />
      </span>

      <div className={`rounded-tile border-2 p-4 ${isOpen ? "border-navy/30 bg-white" : "border-navy/12 bg-mist"}`}>
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-tint px-2.5 py-1 text-12 font-bold text-navy">
            <Icon name={type.icon} size={16} />
            {type.short}
          </span>
          <span className="text-13 font-semibold text-muted">{dateLabel(entry)}</span>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={isOpen}
              aria-controls={`${idp}-body`}
              className="text-13 font-semibold text-link hover:underline"
            >
              {isOpen ? "Done" : "Edit"}
            </button>
            <button type="button" onClick={onRemove} className="text-13 text-clay hover:underline">
              Delete
            </button>
          </div>
        </div>

        <p className={`mt-2 font-bold ${entry.description.trim() ? "text-navy" : "text-muted"}`}>{title}</p>

        {near.length > 0 && (
          <p className="mt-1.5 inline-flex flex-wrap items-center gap-1.5 rounded bg-butter px-2.5 py-1 text-12 font-semibold text-butter-ink">
            <Icon name="since-few-days" size={14} />
            Around the same time as: {near.map((n) => n.description.trim()).join("; ")}
          </p>
        )}

        {!isOpen && details.length > 0 && (
          <p className="mt-1.5 text-13 leading-[1.5] text-muted">{details.join(" · ")}</p>
        )}

        {isOpen && (
          <div id={`${idp}-body`} className="mt-4 grid gap-5">
            <fieldset>
              <legend className="text-sm font-bold text-navy">What kind of thing is it?</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {TIMELINE_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={entry.type === t.id}
                    onClick={() => onChange({ type: t.id })}
                    className={`flex items-start gap-2.5 rounded-tile border-2 px-3 py-2.5 text-left transition-colors ${
                      entry.type === t.id ? "border-navy bg-sky-tint" : "border-navy/15 hover:border-sky"
                    }`}
                  >
                    <Icon name={t.icon} size={22} className="mt-0.5 text-navy" />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-navy">{t.label}</span>
                      <span className="block text-12 leading-[1.45] text-muted">{t.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            {entry.area && (
              <p className="flex flex-wrap items-center gap-2 text-13 text-body">
                Area: <span className="rounded-full bg-sky-tint px-2.5 py-0.5 font-semibold text-navy">{entry.area}</span>
                <button
                  type="button"
                  onClick={() => onChange({ area: "" })}
                  className="text-12 text-link hover:underline"
                >
                  Remove area
                </button>
              </p>
            )}

            <div>
              <label htmlFor={`${idp}-desc`} className="block text-sm font-bold text-navy">
                What happened?
              </label>
              <textarea
                id={`${idp}-desc`}
                className="btd-input mt-1.5 min-h-[64px]"
                value={entry.description}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder={
                  entry.area
                    ? `What did you notice about ${entry.area.toLowerCase()}?`
                    : "A short description, in your own words"
                }
              />
            </div>

            <WhenField entry={entry} onChange={onChange} />

            <Choice
              legend="How does this compare to their usual self?"
              options={COMPARED_OPTIONS}
              value={entry.compared}
              onChange={(v) => onChange({ compared: v })}
            />
            <Choice
              legend="How much does it affect daily life?"
              options={IMPACT_OPTIONS}
              value={entry.impact}
              onChange={(v) => onChange({ impact: v })}
            />
            <Choice
              legend="How often does it happen?"
              options={FREQUENCY_OPTIONS}
              value={entry.frequency}
              onChange={(v) => onChange({ frequency: v })}
            />

            <div>
              <Choice
                legend="Is it still happening?"
                options={[
                  { id: "yes", label: "Yes" },
                  { id: "no", label: "No" },
                ]}
                value={entry.ongoing}
                onChange={(v) => onChange({ ongoing: v })}
              />
              {entry.ongoing === "no" && (
                <div className="mt-2">
                  <label htmlFor={`${idp}-stopped`} className="block text-13 font-semibold text-navy">
                    When did it stop?
                  </label>
                  <input
                    id={`${idp}-stopped`}
                    className="btd-input mt-1"
                    value={entry.stoppedWhen}
                    onChange={(e) => onChange({ stoppedWhen: e.target.value })}
                    placeholder="e.g. early May, after two weeks"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`${idp}-who`} className="block text-sm font-bold text-navy">
                  Who noticed it?
                </label>
                <select
                  id={`${idp}-who`}
                  className="btd-input mt-1.5"
                  value={entry.noticedBy}
                  onChange={(e) => onChange({ noticedBy: e.target.value as TimelineEntry["noticedBy"] })}
                >
                  <option value="">Choose…</option>
                  {NOTICER_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {entry.noticedBy === "other" && (
                <div>
                  <label htmlFor={`${idp}-who-other`} className="block text-sm font-bold text-navy">
                    Who?
                  </label>
                  <input
                    id={`${idp}-who-other`}
                    className="btd-input mt-1.5"
                    value={entry.noticedByOther}
                    onChange={(e) => onChange({ noticedByOther: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor={`${idp}-notes`} className="block text-sm font-bold text-navy">
                Anything else? <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id={`${idp}-notes`}
                className="btd-input mt-1.5 min-h-[56px]"
                value={entry.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
              />
            </div>

            <button
              type="button"
              onClick={onToggle}
              className="justify-self-start rounded border border-navy/20 px-4 py-2 text-sm font-semibold text-navy hover:border-navy/50"
            >
              Done with this one
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

/** Exact date, or roughly when. A rough date is fine — it still goes in
 *  order, as long as there's a month or season to go on. */
function WhenField({
  entry,
  onChange,
}: {
  entry: TimelineEntry;
  onChange: (patch: Partial<TimelineEntry>) => void;
}) {
  const idp = `tl-${entry.id}`;
  const guessed = guessMonth(entry.approxText);
  const guessedLabel = guessed
    ? new Date(`${guessed}-15T12:00:00Z`).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";

  return (
    <fieldset>
      <legend className="text-sm font-bold text-navy">When did it happen?</legend>
      <div className="mt-2 inline-flex rounded-full border border-navy/20 p-0.5">
        {(
          [
            ["approx", "Roughly when"],
            ["exact", "Exact date"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            aria-pressed={entry.dateMode === mode}
            onClick={() => onChange({ dateMode: mode })}
            className={`rounded-full px-3.5 py-1.5 text-13 font-semibold ${
              entry.dateMode === mode ? "bg-navy text-mist" : "text-navy"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {entry.dateMode === "exact" ? (
        <div className="mt-2">
          <label htmlFor={`${idp}-date`} className="sr-only">
            Date
          </label>
          <input
            id={`${idp}-date`}
            type="date"
            className="btd-input max-w-[220px]"
            value={entry.date}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        </div>
      ) : (
        <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <div>
            <label htmlFor={`${idp}-approx`} className="block text-13 font-semibold text-navy">
              In your words
            </label>
            <input
              id={`${idp}-approx`}
              className="btd-input mt-1"
              value={entry.approxText}
              onChange={(e) => onChange({ approxText: e.target.value })}
              placeholder='e.g. "around March 2026", "summer 2025", "after the move"'
            />
          </div>
          <div>
            <label htmlFor={`${idp}-month`} className="block text-13 font-semibold text-navy">
              Closest month <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id={`${idp}-month`}
              type="month"
              className="btd-input mt-1"
              value={entry.approxMonth}
              onChange={(e) => onChange({ approxMonth: e.target.value })}
            />
          </div>
          <p className="text-12 text-muted sm:col-span-2">
            {entry.approxMonth
              ? "We'll use the month you picked to put this in order."
              : guessedLabel
              ? `We'll put this around ${guessedLabel} on the timeline.`
              : entry.approxText.trim()
              ? "Pick the closest month so this can go in the right place on the timeline."
              : "A month, season, or year is enough."}
          </p>
        </div>
      )}
    </fieldset>
  );
}

function Choice<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { id: T; label: string }[];
  value: T | "";
  onChange: (v: T | "") => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-navy">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            // Tapping the chosen one again clears it — every answer is optional.
            onClick={() => onChange(value === o.id ? "" : o.id)}
            className={`rounded-full border-2 px-3.5 py-1.5 text-13 font-semibold transition-colors ${
              value === o.id ? "border-navy bg-navy text-mist" : "border-navy/20 bg-white text-navy hover:border-navy/50"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
