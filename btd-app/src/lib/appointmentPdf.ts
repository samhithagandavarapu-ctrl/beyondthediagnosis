import { jsPDF } from "jspdf";
import { CheckIn, checkInLines } from "./myVoice";

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
};

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
};

// Verity palette, as jsPDF wants it.
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

type Ctx = { doc: jsPDF; y: number };

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

function drawHeader(ctx: Ctx, form: AppointmentForm) {
  const { doc } = ctx;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE.width, HEADER_HEIGHT, "F");

  // A thin sky rule along the bottom of the band picks up the brand accent.
  doc.setFillColor(...SKY);
  doc.rect(0, HEADER_HEIGHT - 3, PAGE.width, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BUTTER);
  doc.text("VERITY  ·  VISIT SUMMARY", MARGIN, 34, { charSpace: 1.2 });

  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  const name = form.patientName.trim() || "Visit summary";
  doc.text(doc.splitTextToSize(name, CONTENT_WIDTH - 150)[0], MARGIN, 62);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(228, 241, 252);
  doc.text(fmtDate(), PAGE.width - MARGIN, 62, { align: "right" });

  ctx.y = HEADER_HEIGHT + 34;
}

function sectionHeading(ctx: Ctx, text: string) {
  const { doc } = ctx;
  ensure(ctx, 44);
  doc.setFont("helvetica", "bold");
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
  doc.setFont("helvetica", "normal");
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
function item(ctx: Ctx, title: string, detail?: string) {
  const { doc } = ctx;
  const indent = MARGIN + 13;
  const width = CONTENT_WIDTH - 13;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  const titleLines: string[] = doc.splitTextToSize(title.trim(), width);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const detailLines: string[] = detail?.trim()
    ? doc.splitTextToSize(detail.trim(), width)
    : [];

  const blockHeight = titleLines.length * 14 + detailLines.length * 12 + 8;
  ensure(ctx, blockHeight);

  const top = ctx.y - 10;
  doc.setFillColor(...SKY);
  doc.rect(MARGIN, top, 2.5, blockHeight - 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  titleLines.forEach((line) => {
    doc.text(line, indent, ctx.y);
    ctx.y += 14;
  });

  if (detailLines.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    detailLines.forEach((line) => {
      doc.text(line, indent, ctx.y);
      ctx.y += 12;
    });
  }
  ctx.y += 8;
}

function numberedItem(ctx: Ctx, n: number, text: string) {
  const { doc } = ctx;
  const indent = MARGIN + 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const lines: string[] = doc.splitTextToSize(text.trim(), CONTENT_WIDTH - 22);
  ensure(ctx, lines.length * 14 + 8);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...LINK);
  doc.text(`${n}.`, MARGIN + 2, ctx.y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...NAVY);
  lines.forEach((line) => {
    doc.text(line, indent, ctx.y);
    ctx.y += 14;
  });
  ctx.y += 6;
}

/** The person's own words get a tinted panel — the one block on the page that
 *  isn't the caregiver speaking, and it should look like it. */
function myVoicePanel(ctx: Ctx, checkIn: CheckIn) {
  const { doc } = ctx;
  const lines = checkInLines(checkIn);
  if (!lines.length) return;

  doc.setFont("helvetica", "normal");
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...LINK);
  doc.text(
    `IN THEIR OWN WORDS  ·  ${fmtDate(checkIn.createdAt).toUpperCase()}`,
    MARGIN + 18,
    top + 20,
    { charSpace: 0.9 }
  );

  let ty = top + 38;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  wrapped.forEach((line) => {
    doc.text(line, MARGIN + 18, ty);
    ty += 15;
  });

  ctx.y = top + panelHeight + 22;
}

/** Footers go on last, once the page count is known. */
function drawFooters(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    const y = PAGE.height - 34;
    doc.setDrawColor(222, 232, 240);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, y - 14, PAGE.width - MARGIN, y - 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      "Prepared with Verity. This is a family's own record, not a medical document.",
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
    s.onset.trim() ? `Started: ${s.onset.trim()}` : "",
    s.baselineOrNew === "new" ? "New — not typical for this person" : "Part of their baseline",
  ]
    .filter(Boolean)
    .join("   ·   ");
}

export function buildAppointmentPdf(
  form: AppointmentForm,
  myVoice: CheckIn | null
): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const ctx: Ctx = { doc, y: 0 };

  drawHeader(ctx, form);

  if (form.reasonForVisit.trim()) {
    sectionHeading(ctx, "Reason for visit");
    paragraph(ctx, form.reasonForVisit);
  }

  const symptoms = form.symptoms.filter((s) => s.description.trim());
  if (symptoms.length) {
    sectionHeading(ctx, "What we're seeing");
    symptoms.forEach((s) => item(ctx, s.description, symptomDetail(s)));
    ctx.y += 4;
  }

  if (myVoice) myVoicePanel(ctx, myVoice);

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

  drawFooters(doc);
  return doc;
}
