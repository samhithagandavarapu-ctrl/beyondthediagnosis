import type { jsPDF } from "jspdf";

/** Loads the site's own typeface into a jsPDF document.
 *
 *  jsPDF only ships the PDF base-14 fonts, so an unstyled export comes out in
 *  Helvetica — which looks nothing like the rest of Verity. Public Sans is the
 *  body face the site already uses and is OFL-licensed, so it ships as a static
 *  asset (public/fonts/) and is fetched only when someone actually builds a
 *  PDF. That keeps ~170KB of font out of the app bundle.
 *
 *  If the fetch fails — offline, blocked, a bad deploy — the export still
 *  happens in Helvetica rather than failing. A plainer PDF beats no PDF when
 *  someone is walking out the door to an appointment. */

export const PDF_FONT = "PublicSans";

const WEIGHTS = [
  { style: "normal", file: "PublicSans-Regular.ttf" },
  { style: "bold", file: "PublicSans-Bold.ttf" },
] as const;

// Fetched once per page load, then reused for every later export.
let cached: Promise<Record<string, string> | null> | null = null;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  // Chunked: one String.fromCharCode call per 8k avoids blowing the argument
  // limit on a ~85KB font.
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

async function fetchFonts(): Promise<Record<string, string> | null> {
  try {
    const entries = await Promise.all(
      WEIGHTS.map(async ({ file }) => {
        const res = await fetch(`/fonts/${file}`);
        if (!res.ok) throw new Error(`${file}: ${res.status}`);
        return [file, toBase64(await res.arrayBuffer())] as const;
      })
    );
    return Object.fromEntries(entries);
  } catch (err) {
    console.warn("Falling back to Helvetica in the PDF:", err);
    return null;
  }
}

/** Registers the font on `doc`, returning the family name to use. Callers set
 *  every font with the returned name, so both paths draw the same layout. */
export async function usePdfFont(doc: jsPDF): Promise<string> {
  cached ??= fetchFonts();
  const files = await cached;
  if (!files) return "helvetica";

  try {
    for (const { style, file } of WEIGHTS) {
      doc.addFileToVFS(file, files[file]);
      doc.addFont(file, PDF_FONT, style);
    }
    return PDF_FONT;
  } catch (err) {
    console.warn("Could not register the PDF font:", err);
    return "helvetica";
  }
}
