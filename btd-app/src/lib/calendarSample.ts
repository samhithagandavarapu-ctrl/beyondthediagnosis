import { CalendarEntry, newEntry, todayKey } from "./calendar";
import { addDays } from "./cycles";

// Made-up entries for practice mode: three months of periods and everyday
// things, so the calendar and patterns have something to show. Never saved.

export function sampleEntries(): CalendarEntry[] {
  const today = todayKey();
  const on = (ago: number, patch: Partial<CalendarEntry>) =>
    newEntry({ entryDate: addDays(today, -ago), ...patch });
  const out: CalendarEntry[] = [];

  // Four periods, 28 days apart, 5 days each.
  for (const start of [86, 58, 30, 2]) {
    for (let i = 0; i < 5 && start - i >= 0; i++) {
      out.push(
        on(start - i, {
          category: "period",
          details: {
            firstDay: i === 0,
            flowProduct: "pad",
            flow: { little: i > 2 ? 2 : 0, some: i <= 2 ? 2 : 0, lot: i === 1 ? 1 : 0, soaked: 0 },
            products: ["pad", "period_underwear"],
            leak: i === 1,
            clots: "none",
          },
        })
      );
    }
    // The week before: cramps and a harder time.
    out.push(
      on(start + 3, {
        category: "pain",
        severity: 2,
        severityScale: "faces",
        details: { spots: [{ area: "lower-belly", kind: "cramping", level: 3 }] },
        bodyLocations: ["lower-belly"],
      }),
      on(start + 2, { category: "behavior", reportedBy: "caregiver", details: { changes: ["irritable", "withdrawn"] } })
    );
  }

  out.push(
    on(20, { category: "sleep", details: { sleepQuality: "bad", wokeUpALot: true } }),
    on(14, { category: "mood", details: { overall: "okay", feelings: ["tired"] } }),
    on(9, { category: "eating", details: { eatingAmount: "less", tummyUpset: true }, typical: "new" }),
    on(5, { category: "energy", details: { energy: "low" }, typical: "new", note: "Wanted to nap after school." })
  );
  return out;
}
