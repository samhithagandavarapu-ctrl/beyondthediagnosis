export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// In local dev this is empty, so requests go to "/api/chat" and Vite's proxy
// (vite.config.ts) forwards them to the local Express server.
// In production, set VITE_API_URL to your deployed backend's URL, e.g.
// https://btd-api.onrender.com — see README "Deploying" section.
const API_BASE = import.meta.env.VITE_API_URL || "";

export type RefinedAppointmentForm = {
  reasonForVisit: string;
  symptoms: { description: string; onset: string }[];
  medications: string;
  ruledOut: string;
  accommodations: string;
  questions: string[];
};

export async function refineAppointmentForm(form: unknown): Promise<RefinedAppointmentForm> {
  const res = await fetch(`${API_BASE}/api/refine-appointment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ form }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Refine request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.refined as RefinedAppointmentForm;
}
export async function sendChatMessage(messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Assistant request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.reply as string;
}
