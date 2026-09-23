export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Empty means same origin, which is the normal case: in production the API runs
// as Vercel serverless functions in api/ alongside the site, and in local dev
// Vite's proxy (vite.config.ts) forwards /api to the Express dev server.
// VITE_API_URL is only for hosting the API somewhere else entirely.
const API_BASE = import.meta.env.VITE_API_URL || "";

/** Reads a response that is supposed to be JSON, and fails with something a
 *  person can act on when it isn't.
 *
 *  The specific trap: if the API isn't deployed where the app expects, the
 *  request lands on the SPA fallback and HTML comes back with status 200. That
 *  used to surface as "make sure the API server is running", which is wrong
 *  and unactionable on a deployed site. */
async function readJson(res: Response, label: string) {
  const body = await res.text();

  let parsed: any = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    if (body.trimStart().startsWith("<")) {
      throw new Error(
        `${label} didn't reach the API — the request returned a web page instead. ` +
          `The API isn't deployed at ${API_BASE || window.location.origin}/api.`
      );
    }
    throw new Error(`${label} got an unreadable response (${res.status}).`);
  }

  // The API reports its own failures as { error }, which is already written for
  // a person to read — pass it straight through rather than inventing a cause.
  if (!res.ok) {
    throw new Error(parsed?.error || `${label} failed (${res.status}).`);
  }

  return parsed;
}

export type RefinedAppointmentForm = {
  reasonForVisit: string;
  symptoms: { description: string; onset: string }[];
  medications: { name: string; dose: string; frequency: string }[];
  ruledOut: { description: string; when: string }[];
  accommodations: string;
  questions: string[];
};

export async function refineAppointmentForm(form: unknown): Promise<RefinedAppointmentForm> {
  const res = await fetch(`${API_BASE}/api/refine-appointment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ form }),
  });

  const data = await readJson(res, "The polish request");
  return data.refined as RefinedAppointmentForm;
}
export async function sendChatMessage(messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  const data = await readJson(res, "The assistant");
  return data.reply as string;
}
