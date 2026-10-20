import { describe, expect, it } from "vitest";
import { CalendarEntry, newEntry, todayKey } from "./calendar";
import { addDays, completeCycles, cycleStarts, cycles, daysSinceLastPeriod, predictNext } from "./cycles";

const period = (day: string, extra: Partial<CalendarEntry["details"]> = {}) =>
  newEntry({ entryDate: day, category: "period", details: { flow: { little: 0, some: 1, lot: 0, soaked: 0 }, ...extra } });

/** A period of `length` days starting `start`, first day marked. */
function periodRun(start: string, length: number, mark = true): CalendarEntry[] {
  return Array.from({ length }, (_, i) => period(addDays(start, i), i === 0 && mark ? { firstDay: true } : {}));
}

const today = todayKey();

describe("cycles", () => {
  it("needs 2 complete cycles before predicting", () => {
    const one = periodRun(addDays(today, -40), 5);
    const two = [...one, ...periodRun(addDays(today, -12), 5)];
    expect(predictNext(one)).toBeNull();
    expect(completeCycles(two)).toHaveLength(1);
    expect(predictNext(two)).toBeNull();
  });

  it("works out 3 cycles and predicts from their average", () => {
    // Starts 90, 62, 34 and 6 days ago: three complete cycles of 28 days.
    const entries = [90, 62, 34, 6].flatMap((ago) => periodRun(addDays(today, -ago), 5));
    expect(cycleStarts(entries)).toEqual([90, 62, 34, 6].map((ago) => addDays(today, -ago)));
    expect(completeCycles(entries).map((c) => c.length)).toEqual([28, 28, 28]);
    expect(cycles(entries).every((c) => c.periodDays === 5)).toBe(true);
    const next = predictNext(entries);
    expect(next?.start).toBe(addDays(today, 22));
    expect(next?.days).toHaveLength(5);
    expect(daysSinceLastPeriod(entries)).toBe(6);
  });

  it("averages only the last 3 cycle lengths", () => {
    // Cycles of 40, 30, 30, 30 days.
    const starts = [130, 90, 60, 30, 0].map((ago) => addDays(today, -ago - 1));
    const entries = starts.flatMap((s) => periodRun(s, 4));
    expect(completeCycles(entries).map((c) => c.length)).toEqual([40, 30, 30, 30]);
    expect(predictNext(entries)?.start).toBe(addDays(starts[4], 30));
  });

  it("still finds a period nobody marked as the first day", () => {
    const entries = [...periodRun(addDays(today, -60), 4), ...periodRun(addDays(today, -30), 4, false)];
    expect(cycleStarts(entries)).toHaveLength(2);
  });

  it("doesn't start a new cycle for a missed day mid-period", () => {
    const start = addDays(today, -20);
    const entries = [period(start, { firstDay: true }), period(addDays(start, 1)), period(addDays(start, 3))];
    expect(cycleStarts(entries)).toEqual([start]);
    expect(cycles(entries)[0].periodDays).toBe(4);
  });

  it("never counts spotting as a period day", () => {
    const entries = [...periodRun(addDays(today, -40), 5), period(addDays(today, -20), { spotting: true })];
    expect(cycleStarts(entries)).toHaveLength(1);
  });

  it("hides a prediction once that day has passed", () => {
    // Three 28-day cycles, but the last period was 40 days ago.
    const entries = [124, 96, 68, 40].flatMap((ago) => periodRun(addDays(today, -ago), 5));
    expect(predictNext(entries)).toBeNull();
  });
});
