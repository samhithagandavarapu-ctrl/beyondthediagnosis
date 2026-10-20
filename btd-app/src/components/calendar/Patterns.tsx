import { useState } from "react";
import Icon from "../icons/Icon";
import { CalendarEntry, fromDateKey } from "../../lib/calendar";
import {
  PATTERNS_FOOTER,
  PATTERN_RANGES,
  PatternRange,
  beforePeriodSentence,
  category,
  patterns,
} from "../../lib/patterns";
import type { ReadingLevel } from "../../lib/myVoice";

// "My patterns": counts, never conclusions. No context hooks here, so the
// whole view can be rendered in a test and checked word by word.

const day = (key: string) => fromDateKey(key).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function Patterns({
  entries,
  readingLevel,
  initialRange = 30,
}: {
  entries: CalendarEntry[];
  readingLevel: ReadingLevel;
  initialRange?: PatternRange;
}) {
  const [range, setRange] = useState<PatternRange>(initialRange);
  const p = patterns(entries, range);
  const showText = readingLevel !== "icon";
  const most = Math.max(1, ...p.daysByKind.map((r) => r.days));

  return (
    <div className="grid gap-6">
      <div role="group" aria-label="How far back" className="flex flex-wrap gap-2">
        {PATTERN_RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={range === r.id}
            onClick={() => setRange(r.id)}
            className={`min-h-[44px] rounded-full border px-4 py-2 text-sm ${
              range === r.id ? "border-navy bg-navy font-bold text-mist" : "border-navy/15 bg-white font-medium text-navy hover:border-navy/40"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <section aria-labelledby="pat-days" className="btd-card p-5">
        <h2 id="pat-days" className="text-21 font-extrabold text-navy">
          Days logged
        </h2>
        {p.daysByKind.length === 0 ? (
          <p className="mt-2 text-15 text-body">Nothing logged in this time yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {p.daysByKind.map((r) => (
              <li key={r.key} className="grid gap-1">
                <span className="flex items-center gap-2 text-15 font-semibold text-navy">
                  <Icon name={category(r.category).icon} size={20} />
                  {showText ? r.label : <span className="sr-only">{r.label}</span>}
                  <span className="ml-auto font-extrabold">
                    {r.days} {r.days === 1 ? "day" : "days"}
                  </span>
                </span>
                <span className="block h-3 rounded-full bg-mist" aria-hidden="true">
                  <span className="block h-3 rounded-full bg-sky" style={{ width: `${(r.days / most) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="pat-periods" className="btd-card p-5">
        <h2 id="pat-periods" className="flex items-center gap-2 text-21 font-extrabold text-navy">
          <Icon name="drop" size={22} />
          My periods
        </h2>
        {p.periods === null ? (
          <p className="mt-2 text-15 text-body">Not enough data yet. This shows up after 2 periods are logged from start to start.</p>
        ) : p.periods.length === 0 ? (
          <p className="mt-2 text-15 text-body">No period started in this time.</p>
        ) : (
          <table className="mt-3 w-full text-left text-15 text-navy">
            <thead>
              <tr className="text-13 text-muted">
                <th className="py-1 font-semibold">Started</th>
                <th className="py-1 font-semibold">Period</th>
                <th className="py-1 font-semibold">Cycle</th>
              </tr>
            </thead>
            <tbody>
              {p.periods.map((c) => (
                <tr key={c.start} className="border-t border-navy/10">
                  <td className="py-2">{day(c.start)}</td>
                  <td className="py-2">{c.periodDays} days</td>
                  <td className="py-2">{c.length === null ? "Still going" : `${c.length} days`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="pat-before" className="btd-card p-5">
        <h2 id="pat-before" className="text-21 font-extrabold text-navy">
          Around my period
        </h2>
        {p.beforePeriod === null ? (
          <p className="mt-2 text-15 text-body">Not enough data yet. This shows up after 2 periods are logged from start to start.</p>
        ) : p.beforePeriod.length === 0 ? (
          <p className="mt-2 text-15 text-body">Nothing else was logged in the week before a period.</p>
        ) : (
          <p className="mt-2 text-17 text-navy">
            In the week before a period: {beforePeriodSentence(p.beforePeriod)}.
          </p>
        )}
      </section>

      <section aria-labelledby="pat-new" className="btd-card p-5">
        <h2 id="pat-new" className="text-21 font-extrabold text-navy">
          New or different
        </h2>
        {p.newOrDifferent.length === 0 ? (
          <p className="mt-2 text-15 text-body">Nothing marked "new or different" in this time.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {p.newOrDifferent.map((n, i) => (
              <li key={i} className="flex items-center gap-3 rounded-tile bg-coral/15 px-4 py-2 text-15 text-navy">
                <Icon name="alert" size={18} />
                <span className="font-semibold">{n.date}</span> {n.label}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="sticky bottom-3 z-10 rounded-card border-2 border-navy bg-butter px-5 py-3 text-center text-15 font-bold text-navy">
        {PATTERNS_FOOTER}
      </p>
    </div>
  );
}
