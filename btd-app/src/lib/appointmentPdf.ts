import { jsPDF } from "jspdf";
import {
  CheckIn,
  PAIN_HOTSPOTS,
  PainReport,
  PainView,
  checkInLines,
  feelingsOverTime,
  painAreaView,
  painSummaryLine,
} from "./myVoice";
import { AboutMeCopy, aboutMeRows } from "./meBoard";
import type { CalendarPageText } from "./calendarImport";
import { usePdfFont } from "./pdfFonts";
import {
  Timeline,
  TimelineEntry,
  dateLabel,
  entryDetails,
  filledEntries,
  groupByMonth,
  isBigChange,
  nearbyEntries,
  sortEntries,
  timelineType,
} from "./timeline";

// The PDF a family hands across a desk. It gets about thirty seconds of a
// clinician's attention, so the layout does the arguing: a titled header, one
// scannable column, section labels that survive a fast skim, and the detail
// (onset, baseline vs. new) subordinated under each item rather than competing
// with it.

export type Medication = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  /** Added from the Symptom Calendar; never sent to "Refine with AI". */
  fromCalendar?: boolean;
};

export type RuledOutItem = {
  id: string;
  description: string;
  when: string;
};

export type Symptom = {
  id: string;
  description: string;
  onset: string;
  baselineOrNew: "baseline" | "new";
  /** Where on the body. Optional so drafts saved before it existed load. */
  area?: string;
  /** "Logged 6 of the last 14 days". */
  pattern?: string;
  reportedBy?: SymptomReporter;
  trajectory?: SymptomTrajectory;
  notes?: string;
  /** Brought in from the Symptom Calendar: which entries it was made from.
   *  These rows are never sent to "Refine with AI". */
  calendar?: { entryIds: string[] };
};

export type SymptomReporter = "self" | "caregiver" | "both";
export type SymptomTrajectory = "stronger" | "same" | "better";

export const SYMPTOM_REPORTERS: { id: SymptomReporter; label: string }[] = [
  { id: "self", label: "The patient" },
  { id: "caregiver", label: "A caregiver" },
  { id: "both", label: "The patient and a caregiver" },
];

export const SYMPTOM_TRAJECTORIES: { id: SymptomTrajectory; label: string }[] = [
  { id: "stronger", label: "Getting stronger" },
  { id: "same", label: "About the same" },
  { id: "better", label: "Getting better" },
];

/** The choices for a symptom's body area, in head-to-toe order, then the
 *  ones that aren't a place on the body. */
export const SYMPTOM_AREAS = [
  "Head",
  "Eyes",
  "Ears",
  "Mouth and teeth",
  "Throat and neck",
  "Chest and breathing",
  "Heart",
  "Stomach and digestion",
  "Bladder and bowels",
  "Back",
  "Arms and hands",
  "Legs and feet",
  "Skin",
  "Muscles and joints",
  "Whole body / energy",
  "Sleep",
  "Mood and behavior",
  "Thinking and memory",
] as const;

export type Question = {
  id: string;
  text: string;
};

export type AppointmentForm = {
  patientName: string;
  reasonForVisit: string;
  symptoms: Symptom[];
  medications: Medication[];
  ruledOut: RuledOutItem[];
  accommodations: string;
  questions: Question[];
  /** Optional so drafts and history saved before the timeline existed still
   *  load; a missing timeline is the same as an empty one. */
  timeline?: Timeline;
  /** "From my symptom calendar": the entries brought in, for the optional
   *  page at the end of the PDF. */
  calendarPage?: { entryIds: string[]; from: string; to: string; include: boolean };
  /** This draft's copy of the Me board, and which notes are ticked. */
  aboutMe?: AboutMeCopy;
};

// Voiced palette, as jsPDF wants it.
const NAVY: [number, number, number] = [33, 50, 68];
const LINK: [number, number, number] = [27, 92, 143];
const BODY: [number, number, number] = [60, 82, 102];
const MUTED: [number, number, number] = [110, 128, 145];
const SKY: [number, number, number] = [143, 203, 242];
const SKY_TINT: [number, number, number] = [228, 241, 252];
const BUTTER: [number, number, number] = [255, 222, 158];
const WHITE: [number, number, number] = [255, 255, 255];

const PAGE = { width: 612, height: 792 };
const MARGIN = 54;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;
const HEADER_HEIGHT = 92;
const FOOTER_SPACE = 54;

// Every setFont call goes through ctx.font, so the whole document falls back
// to Helvetica together if the real typeface can't be loaded.
type Ctx = { doc: jsPDF; y: number; font: string };

const CORAL: [number, number, number] = [255, 166, 148];
const CORAL_INK: [number, number, number] = [74, 31, 20];
const BUTTER_INK: [number, number, number] = [74, 58, 18];
const HAIRLINE: [number, number, number] = [214, 228, 240];

/** A small filled pill with a label — how the page marks a symptom as new
 *  rather than baseline, the one distinction a clinician scans for. */
function pill(
  ctx: Ctx,
  x: number,
  y: number,
  text: string,
  fill: [number, number, number],
  ink: [number, number, number]
): number {
  const { doc } = ctx;
  doc.setFont(ctx.font, "bold");
  doc.setFontSize(7.5);
  const w = doc.getTextWidth(text) + 16;
  doc.setFillColor(...fill);
  doc.roundedRect(x, y - 7.5, w, 13, 6.5, 6.5, "F");
  doc.setTextColor(...ink);
  doc.text(text, x + 8, y + 1.5, { charSpace: 0.4 });
  return w;
}

function fmtDate(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/** Start a new page and reset the cursor below the top margin. Continuation
 *  pages get no header band — the band is a title, not a running header. */
function newPage(ctx: Ctx) {
  ctx.doc.addPage();
  ctx.y = MARGIN + 8;
}

function ensure(ctx: Ctx, needed: number) {
  if (ctx.y + needed > PAGE.height - FOOTER_SPACE) newPage(ctx);
}

function drawHeader(ctx: Ctx, title: string, date?: string, eyebrow = "VOICED  ·  VISIT SUMMARY") {
  const { doc } = ctx;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE.width, HEADER_HEIGHT, "F");

  // A thin sky rule along the bottom of the band picks up the brand accent.
  doc.setFillColor(...SKY);
  doc.rect(0, HEADER_HEIGHT - 3, PAGE.width, 3, "F");

  doc.setFont(ctx.font, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BUTTER);
  doc.text(eyebrow, MARGIN, 34, { charSpace: 1.2 });

  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text(doc.splitTextToSize(title, CONTENT_WIDTH - 150)[0], MARGIN, 62);

  doc.setFont(ctx.font, "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(228, 241, 252);
  doc.text(fmtDate(date), PAGE.width - MARGIN, 62, { align: "right" });

  ctx.y = HEADER_HEIGHT + 30;
}

/** The reason for the visit sits in a tinted card directly under the header,
 *  because it's the one line a clinician reads before anything else. */
function reasonCard(ctx: Ctx, reason: string) {
  const { doc } = ctx;
  const padX = 18;
  doc.setFont(ctx.font, "normal");
  doc.setFontSize(11.5);
  const lines: string[] = doc.splitTextToSize(reason.trim(), CONTENT_WIDTH - padX * 2);
  const height = 30 + lines.length * 16 + 14;
  ensure(ctx, height + 12);

  const top = ctx.y - 14;
  doc.setFillColor(...SKY_TINT);
  doc.roundedRect(MARGIN, top, CONTENT_WIDTH, height, 8, 8, "F");

  doc.setFont(ctx.font, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...LINK);
  doc.text("REASON FOR VISIT", MARGIN + padX, top + 22, { charSpace: 1.1 });

  doc.setFont(ctx.font, "normal");
  doc.setFontSize(11.5);
  doc.setTextColor(...NAVY);
  let ty = top + 42;
  lines.forEach((line) => {
    doc.text(line, MARGIN + padX, ty);
    ty += 16;
  });

  ctx.y = top + height + 26;
}

function sectionHeading(ctx: Ctx, text: string) {
  const { doc } = ctx;
  ensure(ctx, 44);
  doc.setFont(ctx.font, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...LINK);
  doc.text(text.toUpperCase(), MARGIN, ctx.y, { charSpace: 1.1 });
  ctx.y += 7;
  doc.setDrawColor(...SKY);
  doc.setLineWidth(1);
  doc.line(MARGIN, ctx.y, PAGE.width - MARGIN, ctx.y);
  ctx.y += 17;
}

function paragraph(ctx: Ctx, text: string) {
  const { doc } = ctx;
  doc.setFont(ctx.font, "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...BODY);
  const lines = doc.splitTextToSize(text.trim(), CONTENT_WIDTH);
  lines.forEach((line: string) => {
    ensure(ctx, 15);
    doc.text(line, MARGIN, ctx.y);
    ctx.y += 14.5;
  });
  ctx.y += 10;
}

/** One list item: a sky rule down the left, a bold line, and an optional
 *  muted detail line underneath. Every list in the document uses this, which
 *  is most of what makes the page feel like one document. */
type Tag = { text: string; fill: [number, number, number]; ink: [number, number, number] };

function item(ctx: Ctx, title: string, detail?: string, tag?: Tag) {
  const { doc } = ctx;
  const indent = MARGIN + 13;
  const width = CONTENT_WIDTH - 13;

  doc.setFont(ctx.font, "bold");
  doc.setFontSize(10.5);
  const titleLines: string[] = doc.splitTextToSize(title.trim(), width);

  doc.setFont(ctx.font, "normal");
  doc.setFontSize(9);
  const detailLines: string[] = detail?.trim()
    ? doc.splitTextToSize(detail.trim(), width)
    : [];

  // The tag rides the end of the first detail line when there's room, and
  // otherwise gets a row of its own above the detail.
  let tagOwnRow = Boolean(tag) && detailLines.length === 0;
  if (tag && detailLines.length) {
    doc.setFont(ctx.font, "normal");
    doc.setFontSize(9.5);
    const lineW = doc.getTextWidth(detailLines[0]);
    doc.setFont(ctx.font, "bold");
    doc.setFontSize(7.5);
    const tagW = doc.getTextWidth(tag.text) + 16;
    if (lineW + 12 + tagW > width) tagOwnRow = true;
  }
  const detailRows = detailLines.length + (tagOwnRow ? 1 : 0);
  const blockHeight = titleLines.length * 15 + detailRows * 14 + 10;
  ensure(ctx, blockHeight);

  const top = ctx.y - 10;
  doc.setFillColor(...SKY);
  doc.rect(MARGIN, top, 2.5, blockHeight - 2, "F");

  doc.setFont(ctx.font, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  titleLines.forEach((line) => {
    doc.text(line, indent, ctx.y);
    ctx.y += 15;
  });

  if (tag && tagOwnRow) {
    pill(ctx, indent, ctx.y - 3, tag.text, tag.fill, tag.ink);
    ctx.y += 14;
  }

  if (detailLines.length) {
    doc.setFont(ctx.font, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    detailLines.forEach((line, i) => {
      doc.text(line, indent, ctx.y);
      // The tag rides the end of the first detail line, or its own row when
      // there's no detail at all.
      if (tag && !tagOwnRow && i === 0) {
        pill(ctx, indent + doc.getTextWidth(line) + 12, ctx.y - 3, tag.text, tag.fill, tag.ink);
        doc.setFont(ctx.font, "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...MUTED);
      }
      ctx.y += 14;
    });
  }
  ctx.y += 10;
}

function numberedItem(ctx: Ctx, n: number, text: string) {
  const { doc } = ctx;
  const indent = MARGIN + 28;
  doc.setFont(ctx.font, "normal");
  doc.setFontSize(11);
  const lines: string[] = doc.splitTextToSize(text.trim(), CONTENT_WIDTH - 28);
  ensure(ctx, lines.length * 16 + 10);

  // A filled circle, centred on the first line's cap height — a bare "1."
  // disappears next to the question it belongs to.
  doc.setFillColor(...NAVY);
  doc.circle(MARGIN + 9, ctx.y - 3.5, 8, "F");
  doc.setFont(ctx.font, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text(String(n), MARGIN + 9, ctx.y - 0.5, { align: "center" });

  doc.setFont(ctx.font, "normal");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  lines.forEach((line) => {
    doc.text(line, indent, ctx.y);
    ctx.y += 15.5;
  });
  ctx.y += 9;
}

/** The person's own words get a tinted panel — the one block on the page that
 *  isn't the caregiver speaking, and it should look like it. */
function myVoicePanel(ctx: Ctx, checkIn: CheckIn) {
  const { doc } = ctx;
  const lines = checkInLines(checkIn);
  if (!lines.length) return;

  doc.setFont(ctx.font, "normal");
  doc.setFontSize(10.5);
  const wrapped = lines.flatMap(
    (line) => doc.splitTextToSize(line, CONTENT_WIDTH - 36) as string[]
  );
  const panelHeight = wrapped.length * 15 + 34;
  ensure(ctx, panelHeight + 10);

  const top = ctx.y - 12;
  doc.setFillColor(...SKY_TINT);
  doc.roundedRect(MARGIN, top, CONTENT_WIDTH, panelHeight, 6, 6, "F");
  doc.setFillColor(...SKY);
  doc.rect(MARGIN, top, 3.5, panelHeight, "F");

  doc.setFont(ctx.font, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...LINK);
  doc.text(
    `IN THEIR OWN WORDS  ·  ${fmtDate(checkIn.createdAt).toUpperCase()}`,
    MARGIN + 18,
    top + 20,
    { charSpace: 0.9 }
  );

  let ty = top + 38;
  doc.setFont(ctx.font, "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  wrapped.forEach((line) => {
    doc.text(line, MARGIN + 18, ty);
    ty += 15;
  });

  ctx.y = top + panelHeight + 22;
}

// ---- "About me — please read first" ----
// The Me board, before anything else: who this person is, how they show
// pain, how to talk with them. Short rows a clinician can scan: the note's
// name on the left, what it says on the right.

const ABOUT_LABEL_WIDTH = 128;
const ABOUT_PAD = 18;
const ABOUT_LINE = 12.5;

type AboutRow = { title: string; lines: string[]; height: number };

function measureAboutRows(ctx: Ctx, rows: { title: string; text: string }[]): AboutRow[] {
  const { doc } = ctx;
  doc.setFont(ctx.font, "normal");
  doc.setFontSize(9.5);
  const width = CONTENT_WIDTH - ABOUT_PAD * 2 - ABOUT_LABEL_WIDTH;
  return rows.map((r) => {
    const lines = doc.splitTextToSize(r.text, width) as string[];
    return { title: r.title, lines, height: lines.length * ABOUT_LINE + 7 };
  });
}

const aboutPanelHeight = (rows: AboutRow[]) => 36 + rows.reduce((sum, r) => sum + r.height, 0) + 4;

/** Draw the panel with its top at `top`. */
function drawAboutPanel(ctx: Ctx, rows: AboutRow[], top: number, title: string) {
  const { doc } = ctx;
  const height = aboutPanelHeight(rows);
  doc.setFillColor(255, 245, 224);
  doc.roundedRect(MARGIN, top, CONTENT_WIDTH, height, 6, 6, "F");
  doc.setFillColor(...BUTTER);
  doc.rect(MARGIN, top, 3.5, height, "F");

  doc.setFont(ctx.font, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BUTTER_INK);
  doc.text(title, MARGIN + ABOUT_PAD, top + 21, { charSpace: 0.9 });

  let ty = top + 40;
  rows.forEach((r, i) => {
    if (i > 0) {
      doc.setDrawColor(240, 226, 196);
      doc.setLineWidth(0.6);
      doc.line(MARGIN + ABOUT_PAD, ty - 9.5, MARGIN + CONTENT_WIDTH - ABOUT_PAD, ty - 9.5);
    }
    doc.setFont(ctx.font, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text(r.title, MARGIN + ABOUT_PAD, ty);
    doc.setFont(ctx.font, "normal");
    doc.setTextColor(...BODY);
    r.lines.forEach((line, j) => doc.text(line, MARGIN + ABOUT_PAD + ABOUT_LABEL_WIDTH, ty + j * ABOUT_LINE));
    ty += r.height;
  });
  return top + height;
}

// Up to this tall, it goes at the top of the first page. Longer, it gets its
// own page right after the first, so the first page still opens with the
// reason for the visit.
const ABOUT_FITS_ON_PAGE_ONE = 300;
const ABOUT_TITLE = "ABOUT ME  —  PLEASE READ FIRST";

/** On the first page: the panel itself, or (when it's long) a pointer to it.
 *  Returns the rows still to be drawn on their own page. */
function aboutMeFirst(ctx: Ctx, rows: AboutRow[]): AboutRow[] {
  if (!rows.length) return [];
  if (aboutPanelHeight(rows) <= ABOUT_FITS_ON_PAGE_ONE) {
    ctx.y = drawAboutPanel(ctx, rows, ctx.y - 12, ABOUT_TITLE) + 22;
    return [];
  }
  const { doc } = ctx;
  const top = ctx.y - 12;
  doc.setFillColor(255, 245, 224);
  doc.roundedRect(MARGIN, top, CONTENT_WIDTH, 34, 6, 6, "F");
  doc.setFillColor(...BUTTER);
  doc.rect(MARGIN, top, 3.5, 34, "F");
  doc.setFont(ctx.font, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BUTTER_INK);
  doc.text(ABOUT_TITLE, MARGIN + ABOUT_PAD, top + 21, { charSpace: 0.9 });
  doc.setFont(ctx.font, "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text("On page 2.", PAGE.width - MARGIN - ABOUT_PAD, top + 21, { align: "right" });
  ctx.y = top + 34 + 22;
  return rows;
}

/** The long version: its own page (or pages) straight after the first. */
function aboutMePages(ctx: Ctx, rows: AboutRow[]) {
  if (!rows.length) return;
  const { doc } = ctx;
  const bottom = PAGE.height - FOOTER_SPACE;
  let page = 2;
  let rest = rows;
  while (rest.length) {
    doc.insertPage(page);
    const top = MARGIN;
    const fit: AboutRow[] = [];
    for (const r of rest) {
      if (fit.length && top + aboutPanelHeight([...fit, r]) > bottom) break;
      fit.push(r);
    }
    drawAboutPanel(ctx, fit, top, page === 2 ? ABOUT_TITLE : `${ABOUT_TITLE}  (CONTINUED)`);
    rest = rest.slice(fit.length);
    page += 1;
  }
}

/** The same outline as the on-screen body map, drawn small. `k` is points per
 *  outline unit (the outline is 100 x 200 units). */
function bodyOutline(ctx: Ctx, view: PainView, x: number, y: number, k: number) {
  const { doc } = ctx;
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  const rr = (rx: number, ry: number, w: number, h: number, r: number) =>
    doc.roundedRect(x + rx * k, y + ry * k, w * k, h * k, r * k, r * k, "FD");
  rr(13, 52, 10, 54, 5);
  rr(77, 52, 10, 54, 5);
  rr(34, 96, 14, 88, 6);
  rr(52, 96, 14, 88, 6);
  rr(22, 46, 56, 54, 7);
  rr(44, 36, 12, 10, 3);
  doc.circle(x + 50 * k, y + 22 * k, 16 * k, "FD");
  doc.ellipse(x + 41 * k, y + 188 * k, 9 * k, 6 * k, "FD");
  doc.ellipse(x + 59 * k, y + 188 * k, 9 * k, 6 * k, "FD");
  if (view === "front") {
    doc.setFillColor(...NAVY);
    doc.circle(x + 44 * k, y + 20 * k, 1.8 * k, "F");
    doc.circle(x + 56 * k, y + 20 * k, 1.8 * k, "F");
  } else {
    doc.setFillColor(...MUTED);
    doc.ellipse(x + 50 * k, y + 16 * k, 14 * k, 9 * k, "F");
  }
}

/** "Where does it hurt?": a small front and back figure with a numbered dot
 *  on each place, beside the same numbers listed with how it feels and how
 *  bad. The figure answers "where" faster than any words, and it can't be
 *  misread as the doctor's left and right. */
function painPanel(ctx: Ctx, report: PainReport) {
  const { doc } = ctx;
  const spots = report.spots;
  if (!spots.length) return;

  const k = 0.5;
  const figW = 100 * k;
  const figH = 200 * k;
  const padX = 18;
  const listX = MARGIN + padX + figW * 2 + 14 + 26;
  const listW = MARGIN + CONTENT_WIDTH - padX - listX - 18;

  const rows = spots.map((spot) => {
    const line = painSummaryLine(spot);
    doc.setFont(ctx.font, "normal");
    doc.setFontSize(9.5);
    const detail: string[] = line.detail ? doc.splitTextToSize(line.detail, listW) : [];
    return { title: line.title, detail, height: 14 + detail.length * 12.5 + 8 };
  });
  const listH = rows.reduce((sum, r) => sum + r.height, 0);
  const panelHeight = Math.max(38 + figH + 26, 40 + listH + 8);
  ensure(ctx, panelHeight + 10);

  const top = ctx.y - 12;
  doc.setFillColor(...SKY_TINT);
  doc.roundedRect(MARGIN, top, CONTENT_WIDTH, panelHeight, 6, 6, "F");
  doc.setFillColor(...SKY);
  doc.rect(MARGIN, top, 3.5, panelHeight, "F");

  doc.setFont(ctx.font, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...LINK);
  doc.text(
    `WHERE IT HURTS  ·  THEIR OWN BODY MAP  ·  ${fmtDate(report.createdAt).toUpperCase()}`,
    MARGIN + padX,
    top + 20,
    { charSpace: 0.9 }
  );

  const figTop = top + 34;
  const views: PainView[] = ["front", "back"];
  views.forEach((view, v) => {
    const fx = MARGIN + padX + v * (figW + 14);
    bodyOutline(ctx, view, fx, figTop, k);
    doc.setFont(ctx.font, "bold");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(view.toUpperCase(), fx + figW / 2, figTop + figH + 14, { align: "center", charSpace: 0.8 });

    spots.forEach((spot, i) => {
      if (painAreaView(spot.area) !== view) return;
      const hot = PAIN_HOTSPOTS[view].find((h) => h.area === spot.area);
      if (!hot) return;
      numberDot(ctx, fx + hot.x * k, figTop + hot.y * k, i + 1);
    });
  });

  let ry = top + 40;
  rows.forEach((row, i) => {
    numberDot(ctx, listX - 14, ry - 3.5, i + 1);
    doc.setFont(ctx.font, "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    doc.text(row.title, listX, ry);
    ry += 14;
    doc.setFont(ctx.font, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...BODY);
    row.detail.forEach((line) => {
      doc.text(line, listX, ry);
      ry += 12.5;
    });
    ry += 8;
  });

  ctx.y = top + panelHeight + 22;
}

function numberDot(ctx: Ctx, cx: number, cy: number, n: number) {
  const { doc } = ctx;
  doc.setFillColor(...CORAL);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.6);
  doc.circle(cx, cy, 6, "FD");
  doc.setFont(ctx.font, "bold");
  doc.setFontSize(7);
  doc.setTextColor(...CORAL_INK);
  doc.text(String(n), cx, cy + 2.4, { align: "center" });
}

/** "From my symptom calendar": its own page at the end, with a small month
 *  grid per month (coral for period days, dots for other things logged), a
 *  table of what was logged, and the period counts. */
function calendarPage(ctx: Ctx, page: CalendarPageText, ownPage = true) {
  const { doc } = ctx;
  if (ownPage) {
    newPage(ctx);
    doc.setFont(ctx.font, "bold");
    doc.setFontSize(16);
    doc.setTextColor(...NAVY);
    doc.text(page.title, MARGIN, ctx.y + 6);
    ctx.y += 24;
  }
  doc.setFont(ctx.font, "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text(page.header, MARGIN, ctx.y);
  ctx.y += 20;

  // Month grids, three across.
  const cell = 19;
  const gridW = cell * 7;
  const gap = (CONTENT_WIDTH - gridW * 3) / 2;
  for (let i = 0; i < page.months.length; i += 3) {
    const row = page.months.slice(i, i + 3);
    const tallest = Math.max(...row.map((m) => m.weeks.length));
    ensure(ctx, 30 + tallest * cell);
    const top = ctx.y;
    row.forEach((m, col) => {
      const x0 = MARGIN + col * (gridW + gap);
      doc.setFont(ctx.font, "bold");
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      doc.text(m.title, x0, top);
      doc.setFont(ctx.font, "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      ["S", "M", "T", "W", "T", "F", "S"].forEach((d, k) => doc.text(d, x0 + k * cell + cell / 2, top + 11, { align: "center" }));
      m.weeks.forEach((week, w) =>
        week.forEach((day, k) => {
          if (!day.inMonth) return;
          const x = x0 + k * cell;
          const y = top + 15 + w * cell;
          if (day.period) {
            doc.setFillColor(...CORAL);
            doc.rect(x + 1, y + 1, cell - 2, cell - 2, "F");
          }
          doc.setDrawColor(...HAIRLINE);
          doc.setLineWidth(0.5);
          doc.rect(x + 1, y + 1, cell - 2, cell - 2, "S");
          doc.setFontSize(6.5);
          doc.setTextColor(...(day.period ? CORAL_INK : BODY));
          doc.text(String(Number(day.key.slice(8))), x + 3, y + 7.5);
          doc.setFillColor(...NAVY);
          for (let dot = 0; dot < Math.min(day.logged, 3); dot++) doc.circle(x + 5 + dot * 4.5, y + cell - 5, 1.3, "F");
        })
      );
    });
    ctx.y = top + 30 + tallest * cell;
  }
  doc.setFont(ctx.font, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(page.legend, MARGIN, ctx.y);
  ctx.y += 22;

  if (page.period) {
    sectionHeading(ctx, "Periods");
    page.period.cycles.forEach((c) => item(ctx, c));
    page.period.days.forEach((d) => item(ctx, d));
    ctx.y += 6;
  }

  sectionHeading(ctx, "What was logged");
  page.rows.forEach((r) => item(ctx, `${r.date} — ${r.what}`, r.detail));
}

/** Footers go on last, once the page count is known. */
function drawFooters(doc: jsPDF, font: string) {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    const y = PAGE.height - 34;
    doc.setDrawColor(222, 232, 240);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, y - 14, PAGE.width - MARGIN, y - 14);

    doc.setFont(font, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      "Prepared with Voiced. This is a family's own record, not a medical document.",
      MARGIN,
      y
    );
    doc.text(`Page ${page} of ${total}`, PAGE.width - MARGIN, y, { align: "right" });
  }
}

export function medicationLine(m: Medication): string {
  return [m.dose.trim(), m.frequency.trim()].filter(Boolean).join(" · ");
}

export function symptomDetail(s: Symptom): string {
  return [
    s.area ? `Area: ${s.area}` : "",
    s.onset.trim() ? `Started: ${s.onset.trim()}` : "",
    s.baselineOrNew === "new" ? "New — not typical for this person" : "Part of their baseline",
    ...symptomExtras(s),
  ]
    .filter(Boolean)
    .join("   ·   ");
}

/** Pattern, who reported it, trajectory and notes, for the summary and PDF. */
export function symptomExtras(s: Symptom): string[] {
  return [
    s.pattern?.trim() ? `Pattern: ${s.pattern.trim()}` : "",
    s.reportedBy ? `Reported by: ${SYMPTOM_REPORTERS.find((r) => r.id === s.reportedBy)?.label}` : "",
    s.trajectory ? `${SYMPTOM_TRAJECTORIES.find((t) => t.id === s.trajectory)?.label}` : "",
    s.notes?.trim() ? `Notes: ${s.notes.trim()}` : "",
  ].filter(Boolean);
}

/** Everything about one timeline entry that fits on a single muted line. */
export function timelineDetail(e: TimelineEntry, near?: TimelineEntry[]): string {
  return [
    dateLabel(e),
    ...entryDetails(e),
    near?.length
      ? `Around the same time as: ${near.map((n) => n.description.trim()).join("; ")}`
      : "",
    e.notes.trim() ? `Notes: ${e.notes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("   ·   ");
}

function monthLabel(ctx: Ctx, text: string) {
  const { doc } = ctx;
  ensure(ctx, 40);
  doc.setFont(ctx.font, "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text(text, MARGIN, ctx.y);
  ctx.y += 16;
}

const typeTag = (e: TimelineEntry): Tag => ({
  text: timelineType(e.type).short.toUpperCase(),
  fill: SKY_TINT,
  ink: NAVY,
});

/** Their usual self, then the biggest changes, then everything by month.
 *  Draws nothing at all for an empty timeline. */
function timelineSections(ctx: Ctx, timeline: Timeline | undefined) {
  const entries = filledEntries(timeline);
  const near = nearbyEntries(entries);

  if (timeline?.usualSelf.trim()) {
    sectionHeading(ctx, "Their usual self, on a good day");
    paragraph(ctx, timeline.usualSelf);
  }

  const big = sortEntries(entries.filter(isBigChange), true);
  if (big.length) {
    sectionHeading(ctx, "Biggest changes");
    big.forEach((e) => item(ctx, e.description, timelineDetail(e), typeTag(e)));
    ctx.y += 4;
  }

  if (entries.length) {
    sectionHeading(ctx, "Timeline, oldest first");
    groupByMonth(entries).forEach((group) => {
      monthLabel(ctx, group.month);
      group.entries.forEach((e) =>
        item(ctx, e.description, timelineDetail(e, near.get(e.id)), typeTag(e))
      );
    });
    ctx.y += 4;
  }
}

export async function buildAppointmentPdf(
  form: AppointmentForm,
  /** The My Voice check-ins picked for this summary, newest first. */
  checkIns: CheckIn[],
  /** When the summary was made; defaults to today. */
  date?: string,
  /** The page "From my symptom calendar", when it's included. */
  calendar?: CalendarPageText | null
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  // Registered before the first draw, so no text is laid out in a font the
  // finished document doesn't use.
  const font = await usePdfFont(doc);
  const ctx: Ctx = { doc, y: 0, font };

  drawHeader(ctx, form.patientName.trim() || "Visit summary", date);

  // The ticked notes from this draft's copy of the Me board.
  const aboutLater = aboutMeFirst(ctx, measureAboutRows(ctx, aboutMeRows(form.aboutMe)));

  if (form.reasonForVisit.trim()) {
    reasonCard(ctx, form.reasonForVisit);
  }

  const symptoms = form.symptoms.filter((s) => s.description.trim());
  if (symptoms.length) {
    sectionHeading(ctx, "What we're seeing");
    symptoms.forEach((s) =>
      item(ctx, s.description, [
        s.area ? `Area: ${s.area}` : "",
        s.onset.trim() ? `Started: ${s.onset.trim()}` : "",
        ...symptomExtras(s),
      ].filter(Boolean).join("   ·   "), {
        text:
          s.baselineOrNew === "new" ? "NEW — NOT TYPICAL" : "PART OF THEIR BASELINE",
        fill: s.baselineOrNew === "new" ? CORAL : BUTTER,
        ink: s.baselineOrNew === "new" ? CORAL_INK : BUTTER_INK,
      })
    );
    ctx.y += 6;
  }

  if (checkIns.length) {
    const over = feelingsOverTime(checkIns);
    if (over) {
      sectionHeading(ctx, "How they've felt, oldest first");
      item(ctx, over);
      ctx.y += 6;
    }
    checkIns.forEach((c) => myVoicePanel(ctx, c));
    // The body map from the newest check-in that marked one.
    const withPain = checkIns.find((c) => c.pain?.length);
    if (withPain) painPanel(ctx, { createdAt: withPain.createdAt, spots: withPain.pain ?? [] });
  }

  timelineSections(ctx, form.timeline);

  const meds = form.medications.filter((m) => m.name.trim());
  if (meds.length) {
    sectionHeading(ctx, "Current medications");
    meds.forEach((m) => item(ctx, m.name, medicationLine(m)));
    ctx.y += 4;
  }

  const ruledOut = form.ruledOut.filter((r) => r.description.trim());
  if (ruledOut.length) {
    sectionHeading(ctx, "Already ruled out");
    ruledOut.forEach((r) =>
      item(ctx, r.description, r.when.trim() ? `Checked: ${r.when.trim()}` : "")
    );
    ctx.y += 4;
  }

  if (form.accommodations.trim()) {
    sectionHeading(ctx, "How to communicate with this patient");
    paragraph(ctx, form.accommodations);
  }

  const questions = form.questions.filter((q) => q.text.trim());
  if (questions.length) {
    sectionHeading(ctx, "Questions, in priority order");
    questions.forEach((q, i) => numberedItem(ctx, i + 1, q.text));
  }

  if (calendar) calendarPage(ctx, calendar);

  aboutMePages(ctx, aboutLater);

  drawFooters(doc, font);
  return doc;
}

/** The Symptom Calendar on its own, in the same brand style as the visit
 *  summary: the navy title band, then the month grids and what was logged. */
export async function buildCalendarPdf(
  page: CalendarPageText,
  /** Whose calendar; the band falls back to the page's own title. */
  name?: string
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const font = await usePdfFont(doc);
  const ctx: Ctx = { doc, y: 0, font };
  drawHeader(ctx, name?.trim() || "My symptom calendar", undefined, "VOICED  ·  SYMPTOM CALENDAR");
  calendarPage(ctx, page, false);
  drawFooters(doc, font);
  return doc;
}

/** Send a built PDF to the printer, so a printed copy is the same document
 *  as the download rather than the page as the browser lays it out. Falls
 *  back to opening the PDF in a new tab where a frame can't print it. */
export function printPdf(doc: jsPDF) {
  const url = URL.createObjectURL(doc.output("blob"));
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  frame.src = url;
  const cleanUp = () => {
    frame.remove();
    URL.revokeObjectURL(url);
  };
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      // The print dialog blocks in most browsers; give the rest a minute.
      setTimeout(cleanUp, 60_000);
    } catch {
      window.open(url, "_blank");
      setTimeout(cleanUp, 60_000);
    }
  };
  document.body.appendChild(frame);
}
