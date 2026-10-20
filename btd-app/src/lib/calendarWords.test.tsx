import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Patterns from "../components/calendar/Patterns";
import { aboutLines, detailLines } from "./calendar";
import { calendarPageText } from "./calendarImport";
import { sampleEntries } from "./calendarSample";
import { cycles } from "./cycles";
import { feeling, painSpotSentence } from "./myVoice";
import { PATTERN_RANGES } from "./patterns";

// The spec's banned words: Patterns and the PDF count things and never name
// or judge them. ("Not a diagnosis." on the PDF is the one required line, so
// the word checked is "diagnose", as the spec lists it.)
const BANNED = /\b(diagnose[sd]?|pms|pmdd|normal|abnormal|heavy|disorders?)\b/i;

function visibleText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
}

describe("banned words", () => {
  const entries = sampleEntries();

  it.each(PATTERN_RANGES.map((r) => r.id))("never appear on My patterns (%i days)", (range) => {
    for (const level of ["icon", "icon-text", "full"] as const) {
      const text = visibleText(renderToStaticMarkup(<Patterns entries={entries} readingLevel={level} initialRange={range} />));
      expect(text).toMatch(/In the week before a period/);
      expect(text).not.toMatch(BANNED);
    }
  });

  it("never appear on the PDF's calendar page", () => {
    const days = entries.map((e) => e.entryDate).sort();
    const page = calendarPageText(
      entries,
      days[0],
      days[days.length - 1],
      (e) => [...detailLines(e, (id) => feeling(id).short, painSpotSentence), ...aboutLines(e, true)],
      cycles(entries)
    );
    const text = JSON.stringify(page);
    expect(page.header).toBe("Logged in Voiced by the patient and a caregiver. Not a diagnosis.");
    expect(text).not.toMatch(BANNED);
  });
});
