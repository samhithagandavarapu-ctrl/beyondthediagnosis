import { describe, expect, it } from "vitest";
import { CalendarEntry, newEntry, todayKey } from "./calendar";
import { addDays } from "./cycles";
import { importable, loggedMedicines, toSymptoms, trajectory, unmerge } from "./calendarImport";

const today = todayKey();
let n = 0;
const id = () => `s${++n}`;
const pain = (ago: number, severity: number, extra: Partial<CalendarEntry> = {}) =>
  newEntry({
    entryDate: addDays(today, -ago),
    category: "pain",
    severity,
    severityScale: "faces",
    details: { spots: [{ area: "lower-belly", kind: "cramping", level: null }] },
    ...extra,
  });

describe("bringing calendar entries into Appointment Prep", () => {
  it("merges entries of the same kind into one symptom", () => {
    const picked = [pain(13, 1), pain(9, 1), pain(5, 2), pain(3, 3, { typical: "new", note: "after lunch" }), pain(1, 3)];
    const [s, ...rest] = toSymptoms(picked, addDays(today, -13), today, id);
    expect(rest).toHaveLength(0);
    expect(s.description).toBe("Something hurts: lower belly");
    expect(s.pattern).toBe("Logged 5 of the last 14 days");
    expect(s.baselineOrNew).toBe("new");
    expect(s.trajectory).toBe("stronger");
    expect(s.reportedBy).toBe("self");
    expect(s.notes).toMatch(/after lunch/);
    expect(s.calendar?.entryIds).toHaveLength(5);
  });

  it("keeps different kinds apart, and custom symptoms apart from Other", () => {
    const picked = [
      pain(2, 1),
      newEntry({ entryDate: today, category: "sleep" }),
      newEntry({ entryDate: today, category: "other", customLabel: "Hiccups" }),
      newEntry({ entryDate: today, category: "other", customLabel: "Rash" }),
    ];
    expect(toSymptoms(picked, addDays(today, -13), today, id)).toHaveLength(4);
  });

  it("says who reported it, and 'both' when it was mixed", () => {
    const [mixed] = toSymptoms([pain(2, 1), pain(1, 1, { reportedBy: "caregiver" })], addDays(today, -13), today, id);
    expect(mixed.reportedBy).toBe("both");
  });

  it("marks it baseline only when every entry said it's usual", () => {
    const [usual] = toSymptoms([pain(2, 1, { typical: "typical" }), pain(1, 1, { typical: "typical" })], addDays(today, -13), today, id);
    expect(usual.baselineOrNew).toBe("baseline");
  });

  it("needs 3 strengths for a trajectory, and spots getting better", () => {
    expect(trajectory([pain(2, 3), pain(1, 1)])).toBeUndefined();
    expect(trajectory([pain(5, 3), pain(3, 2), pain(1, 1)])).toBe("better");
    expect(trajectory([pain(5, 2), pain(3, 2), pain(1, 2)])).toBe("same");
  });

  it("can be split back into one symptom per entry", () => {
    const picked = [pain(3, 1), pain(1, 2)];
    const split = unmerge(picked, addDays(today, -13), today, id);
    expect(split).toHaveLength(2);
    expect(split.every((s) => s.calendar?.entryIds.length === 1)).toBe(true);
  });

  it("leaves My Voice check-ins and other dates out of the picker", () => {
    const entries = [pain(3, 1), pain(40, 1), pain(1, 1, { checkInId: "c1" })];
    expect(importable(entries, addDays(today, -13), today)).toHaveLength(1);
  });

  it("lists each logged medicine once", () => {
    const picked = [pain(2, 1, { medicationNote: "Ibuprofen" }), pain(1, 1, { medicationNote: "ibuprofen " })];
    expect(loggedMedicines(picked)).toEqual(["Ibuprofen"]);
  });
});
