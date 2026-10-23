import { describe, expect, it } from "vitest";
import { FeedbackRow, emptyFeedback, feedbackCsv } from "./feedback";

const row = (over: Partial<FeedbackRow> = {}): FeedbackRow => ({
  ...emptyFeedback(),
  createdAt: "2026-10-23T12:00:00Z",
  signedIn: false,
  ...over,
});

describe("feedbackCsv", () => {
  it("has a header and one line per answer", () => {
    const lines = feedbackCsv([row(), row()]).replace(/^﻿/, "").split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0].startsWith("Sent,Who,")).toBe(true);
  });

  it("keeps commas, quotes and new lines inside one cell", () => {
    const csv = feedbackCsv([row({ wish: 'A "print" button,\nplease', role: "parent", ease: 4 })]);
    expect(csv).toContain('"A ""print"" button,\nplease"');
    expect(csv).toContain(",Parent,no,,4,");
  });

  it("stops typed answers running as spreadsheet formulas", () => {
    expect(feedbackCsv([row({ confusing: "=HYPERLINK(1)" })])).toContain("'=HYPERLINK(1)");
  });
});
