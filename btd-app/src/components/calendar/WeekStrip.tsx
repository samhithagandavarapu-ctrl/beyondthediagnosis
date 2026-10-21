import { CalendarEntry, dateKey, fromDateKey, todayKey } from "../../lib/calendar";
import { GROUPS, groupOf } from "../../lib/calendarGroups";

// This week, Sunday to Saturday, with a coloured dot for each kind of thing
// logged that day. Tapping a day shows it; days to come can't be picked.

const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export default function WeekStrip({
  entries,
  selected,
  onPick,
  onMonth,
}: {
  entries: CalendarEntry[];
  selected: string;
  onPick: (day: string) => void;
  onMonth: () => void;
}) {
  const today = todayKey();
  const base = fromDateKey(selected);
  base.setDate(base.getDate() - base.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return dateKey(d);
  });

  return (
    <div className="rounded-card bg-white p-4">
      <ul className="grid grid-cols-7 gap-1 text-center" aria-label="This week">
        {days.map((day, i) => {
          const groups = GROUPS.filter((g) => entries.some((e) => e.entryDate === day && groupOf(e).id === g.id));
          const isToday = day === today;
          const on = day === selected;
          const future = day > today;
          const label = fromDateKey(day).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
          return (
            <li key={day} className="grid justify-items-center gap-1">
              <span className="text-12 font-bold text-muted" aria-hidden="true">
                {LETTERS[i]}
              </span>
              <button
                type="button"
                disabled={future}
                onClick={() => onPick(day)}
                aria-pressed={on}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${label}${isToday ? ", today" : ""}${groups.length ? `: ${groups.map((g) => g.label).join(", ")}` : ", nothing logged"}`}
                className={`grid h-11 w-11 place-items-center rounded-full text-17 font-bold ${
                  on ? "bg-navy text-mist" : isToday ? "ring-2 ring-navy text-navy" : future ? "text-muted/60" : "text-navy hover:bg-sky-tint"
                }`}
              >
                {fromDateKey(day).getDate()}
              </button>
              <span className="flex h-2 items-center gap-0.5" aria-hidden="true">
                {groups.slice(0, 4).map((g) => (
                  <span key={g.id} className={`h-2 w-2 rounded-full ${g.dot}`} />
                ))}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 text-center">
        <button type="button" onClick={onMonth} className="min-h-[44px] text-15 font-bold text-navy underline underline-offset-4 hover:text-link">
          See the whole month
        </button>
      </div>
    </div>
  );
}
