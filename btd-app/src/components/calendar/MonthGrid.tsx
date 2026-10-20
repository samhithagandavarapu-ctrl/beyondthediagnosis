import { useEffect, useRef, useState } from "react";
import Icon from "../icons/Icon";
import {
  CATEGORIES,
  CalendarEntry,
  CustomSymptom,
  FILTERS,
  FilterId,
  category,
  dateKey,
  dayAriaLabel,
  entryIcon,
  isPeriodDay,
  fromDateKey,
  todayKey,
} from "../../lib/calendar";

// The month: a real table, Sunday first, with up to three icons per day for
// what was logged. Arrow keys move between days (and into the next or last
// month); Enter opens the day. Future days can't be opened — nothing can be
// logged for them.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function addDays(key: string, n: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Every day shown for a month: whole weeks, Sunday to Saturday. */
function monthDays(year: number, month: number): string[] {
  const first = new Date(year, month, 1, 12);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const last = new Date(year, month + 1, 0, 12);
  const end = new Date(last);
  end.setDate(last.getDate() + (6 - last.getDay()));
  const days: string[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(dateKey(d));
  return days;
}

export default function MonthGrid({
  entries,
  customs,
  predicted = [],
  month,
  onMonthChange,
  onOpenDay,
}: {
  entries: CalendarEntry[];
  customs: CustomSymptom[];
  /** Days the next period might cover: a dashed outline and "Maybe". */
  predicted?: string[];
  /** Any day in the month being shown. */
  month: string;
  onMonthChange: (anyDayInMonth: string) => void;
  onOpenDay: (key: string) => void;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [focused, setFocused] = useState<string>(() => {
    const today = todayKey();
    return today.slice(0, 7) === month.slice(0, 7) ? today : `${month.slice(0, 7)}-01`;
  });
  // Only move focus after the arrow keys moved the day, not on every render.
  const keyboardMoved = useRef(false);
  const cells = useRef(new Map<string, HTMLButtonElement>());

  const m = fromDateKey(month);
  const year = m.getFullYear();
  const monthIndex = m.getMonth();
  const days = monthDays(year, monthIndex);
  const weeks = Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  const today = todayKey();
  const title = m.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const byDay = new Map<string, CalendarEntry[]>();
  for (const e of entries) byDay.set(e.entryDate, [...(byDay.get(e.entryDate) ?? []), e]);

  // Keep the focused day inside the month on show.
  useEffect(() => {
    if (focused.slice(0, 7) !== month.slice(0, 7)) {
      setFocused(today.slice(0, 7) === month.slice(0, 7) ? today : `${month.slice(0, 7)}-01`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  useEffect(() => {
    if (!keyboardMoved.current) return;
    keyboardMoved.current = false;
    cells.current.get(focused)?.focus();
  }, [focused, month]);

  function moveTo(key: string) {
    keyboardMoved.current = true;
    if (key.slice(0, 7) !== month.slice(0, 7)) onMonthChange(key);
    setFocused(key);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in step) {
      e.preventDefault();
      moveTo(addDays(focused, step[e.key]));
    } else if (e.key === "Home") {
      e.preventDefault();
      moveTo(addDays(focused, -fromDateKey(focused).getDay()));
    } else if (e.key === "End") {
      e.preventDefault();
      moveTo(addDays(focused, 6 - fromDateKey(focused).getDay()));
    }
  }

  function shift(months: number) {
    onMonthChange(dateKey(new Date(year, monthIndex + months, 1, 12)));
  }

  const shownIn = (e: CalendarEntry) => filter === "all" || category(e.category).filter === filter;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Last month"
          className="grid h-12 w-12 place-items-center rounded-full border-2 border-navy/15 bg-white text-navy hover:border-sky"
        >
          <Icon name="chevron-right" size={22} className="rotate-180" />
        </button>
        <h2 className="min-w-[9em] text-center font-display text-23 font-extrabold text-navy" aria-live="polite">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next month"
          className="grid h-12 w-12 place-items-center rounded-full border-2 border-navy/15 bg-white text-navy hover:border-sky"
        >
          <Icon name="chevron-right" size={22} />
        </button>
        <button
          type="button"
          onClick={() => {
            onMonthChange(today);
            setFocused(today);
          }}
          className="btd-btn-outline min-h-[48px] px-5 py-2 text-sm"
        >
          Today
        </button>
      </div>

      <div role="group" aria-label="Show on the calendar" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`min-h-[44px] rounded-full border px-4 py-2 text-sm transition-colors ${
              filter === f.id
                ? "border-navy bg-navy font-bold text-mist"
                : "border-navy/15 bg-white font-medium text-navy hover:border-navy/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <table className="w-full table-fixed border-separate border-spacing-1 sm:border-spacing-1.5" onKeyDown={onKeyDown}>
        <caption className="sr-only">{title}. Use the arrow keys to move between days.</caption>
        <thead>
          <tr>
            {WEEKDAYS.map((d, i) => (
              <th key={d} scope="col" className="pb-1 text-12 font-bold uppercase tracking-[0.08em] text-muted">
                <abbr title={WEEKDAYS_LONG[i]} className="no-underline">
                  {d}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]}>
              {week.map((key) => {
                const inMonth = key.slice(0, 7) === month.slice(0, 7);
                const all = byDay.get(key) ?? [];
                const shown = all.filter(shownIn);
                // One picture per kind of thing logged (custom symptoms count
                // as their own kind, with their own picture).
                const icons = [...new Set(shown.map((e) => entryIcon(e, customs)))];
                const isPeriod = all.some(isPeriodDay) && shownIn({ category: "period" } as CalendarEntry);
                const maybe = !isPeriod && predicted.includes(key) && (filter === "all" || filter === "period");
                const isToday = key === today;
                const forVisit = all.some((e) => e.addToVisit);
                const future = key > today;
                return (
                  <td key={key} className="p-0 align-top">
                    <button
                      type="button"
                      ref={(el) => {
                        if (el) cells.current.set(key, el);
                        else cells.current.delete(key);
                      }}
                      tabIndex={key === focused ? 0 : -1}
                      // Not disabled, so the arrow keys can still pass over it.
                      aria-disabled={future || undefined}
                      onFocus={() => setFocused(key)}
                      onClick={() => {
                        if (!future) onOpenDay(key);
                      }}
                      aria-label={`${dayAriaLabel(key, shown)}${maybe ? ", period might start" : ""}${forVisit ? ", saved for my visit" : ""}${isToday ? ", today" : ""}`}
                      aria-current={isToday ? "date" : undefined}
                      className={`btd-cal-day flex min-h-[64px] w-full flex-col items-start gap-1 rounded-tile border p-1.5 text-left transition-colors sm:min-h-[84px] sm:p-2 ${
                        isPeriod
                          ? "btd-cal-period border-coral bg-coral/35"
                          : maybe
                            ? "btd-cal-maybe border-2 border-dashed border-coral-hover bg-white"
                            : "border-navy/10 bg-white"
                      } ${inMonth ? "" : "opacity-45"} ${
                        isToday ? "ring-[3px] ring-navy ring-offset-1" : ""
                      } ${future ? "cursor-default bg-mist/60" : "hover:border-sky"}`}
                    >
                      <span className="flex w-full items-center justify-between">
                        <span className={`text-sm font-bold ${isToday ? "text-navy" : "text-body"}`}>
                          {fromDateKey(key).getDate()}
                        </span>
                        {forVisit && <Icon name="star-filled" size={14} className="text-coral-hover" />}
                      </span>
                      {maybe && <span className="text-11 font-bold uppercase tracking-[0.06em] text-coral-ink">Maybe</span>}
                      {icons.length > 0 && (
                        <span className="flex flex-wrap items-center gap-0.5 text-navy" aria-hidden="true">
                          {icons.slice(0, 3).map((icon) => (
                            <Icon key={icon} name={icon} size={16} />
                          ))}
                          {icons.length > 3 && <span className="text-11 font-bold">+{icons.length - 3}</span>}
                        </span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="btd-card p-4">
        <p className="btd-eyebrow mb-3">What the pictures mean</p>
        <ul className="grid gap-x-5 gap-y-2 text-sm text-body sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <Icon name={c.icon} size={18} className="text-navy" />
              {c.label}
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span className="btd-cal-period inline-flex h-5 w-7 items-center justify-center rounded border border-coral bg-coral/35">
              <Icon name="drop" size={12} className="text-navy" />
            </span>
            A period day (coral, with a drop)
          </li>
          <li className="flex items-center gap-2">
            <Icon name="star-filled" size={18} className="text-coral-hover" />
            Saved for my next appointment
          </li>
          <li className="flex items-center gap-2">
            <span className="btd-cal-maybe inline-block h-5 w-7 rounded border-2 border-dashed border-coral-hover" />
            Maybe: my next period might start (dashed)
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-5 w-7 rounded ring-[3px] ring-navy" />
            Today (navy ring)
          </li>
        </ul>
      </div>
    </div>
  );
}
