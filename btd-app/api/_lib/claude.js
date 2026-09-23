import Anthropic from "@anthropic-ai/sdk";

/** One place for the Claude client, the prompts, and the request shape, shared
 *  by the deployed serverless functions (api/*.js) and the local dev server
 *  (server/index.js) — so what you test locally is what runs in production. */

// The model is deliberately an env var: set ANTHROPIC_MODEL to claude-opus-5
// for stronger answers at higher cost, without touching code.
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export const MISSING_KEY_MESSAGE =
  "The assistant isn't configured yet: ANTHROPIC_API_KEY is missing on the server. " +
  "Locally, copy .env.example to .env and add your key. On Vercel, add it under " +
  "Settings → Environment Variables, then redeploy.";

let client;
function getClient() {
  // Created lazily so importing this module never throws when the key is unset.
  if (!client) client = new Anthropic();
  return client;
}

export const SYSTEM_PROMPT = `You are the AI Advocacy Assistant for Verity, a healthcare advocacy platform for people with Down syndrome, their families, and caregivers.

Your role is education and advocacy support only — never diagnosis. Follow these rules strictly:

1. Never name or strongly imply a specific medical diagnosis based on symptoms someone describes.
2. Never recommend medications, dosages, or changes to a treatment plan.
3. Never contradict a provider's existing diagnosis or care plan. If the user is frustrated with a provider's answer, help them prepare to raise the concern again, not tell them the provider is wrong.
4. When a question is health-related, include a brief natural disclaimer, e.g. "I can't tell you what's causing this, but here's how to raise it clearly with your doctor."
5. If a message suggests a medical emergency (chest pain, trouble breathing, sudden severe symptoms) or a mental health crisis, immediately tell the user to call 911 or a crisis line before anything else. Do not continue with advocacy coaching in that message.
6. Always use person-first language ("person with Down syndrome"), plain language over clinical jargon, and address self-advocates directly rather than only their caregiver.
7. Keep responses focused on practical advocacy: what to say to a provider, what to write down, what questions to ask, what rights or accommodations apply.
8. Do not ask for or retain more personal health detail than the immediate question needs.`;

export const REFINE_SYSTEM_PROMPT = `You help families prepare clear, specific appointment summaries for healthcare visits, for the Verity platform (a Down syndrome healthcare advocacy tool).

You will receive a JSON object describing a draft visit summary. Rewrite each text field to be clearer, more specific, and easier for a busy clinician to act on — but NEVER invent new symptoms, dates, medications, or facts that weren't in the original. Only reword, clarify, and tighten what's already there. If a field is empty, leave it empty.

Rules:
- Never add a diagnosis or suggest what a symptom might mean medically.
- Keep the person's own voice where possible — don't make it sound clinical or cold.
- Keep each symptom description to one clear sentence.
- Keep each question as a single, specific, answerable question.
- Medications and ruled-out items arrive as arrays of objects: tidy each entry in place and return the SAME number of entries, in the same order. Never merge, split, reorder, or drop one.
- Never change a medication name, dose, or frequency into a different drug or number — only fix formatting and spelling (e.g. "10mg" to "10 mg").
- Return ONLY valid JSON, no preamble, no markdown fences, matching this exact shape:
{
  "reasonForVisit": "string",
  "symptoms": [{ "description": "string", "onset": "string" }],
  "medications": [{ "name": "string", "dose": "string", "frequency": "string" }],
  "ruledOut": [{ "description": "string", "when": "string" }],
  "accommodations": "string",
  "questions": ["string"]
}`;

/** Only ever forward role/content — never extra fields from the client. */
export function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .map((m) => ({ role: m.role, content: m.content }));
}

function textOf(response) {
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export async function chatReply(messages) {
  const response = await getClient().messages.create({
    model: MODEL,
    // Room for the model to think and still answer in full. Effort stays low
    // because this is a live chat box: people are watching a "Thinking…"
    // bubble, and a serverless function has a wall-clock limit.
    max_tokens: 4096,
    output_config: { effort: "low" },
    system: SYSTEM_PROMPT,
    messages,
  });

  if (response.stop_reason === "refusal") {
    return "I can't help with that one. If it's about preparing for an appointment or understanding your rights, try asking it a different way and I'll do my best.";
  }

  return (
    textOf(response) ||
    "I'm not sure how to respond to that — could you try rephrasing?"
  );
}

export async function refineForm(form) {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8192,
    output_config: { effort: "medium" },
    system: REFINE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Refine this draft:\n${JSON.stringify(form)}` }],
  });

  const cleaned = textOf(response).replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

/** Turns an SDK error into a status code plus a message safe to show a person.
 *  Nothing here leaks the API key or the upstream error body. */
export function describeError(err) {
  if (err instanceof Anthropic.AuthenticationError) {
    return { status: 500, message: "The server's Claude API key was rejected. Check ANTHROPIC_API_KEY." };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { status: 429, message: "The assistant is busy right now. Wait a few seconds and try again." };
  }
  if (err instanceof Anthropic.BadRequestError) {
    console.error("Claude rejected the request:", err.message);
    return { status: 502, message: "The assistant couldn't handle that request. Try shortening your message." };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { status: 504, message: "Couldn't reach the assistant. Check your connection and try again." };
  }
  if (err instanceof Anthropic.APIError) {
    console.error(`Claude API error ${err.status}:`, err.message);
    return { status: 502, message: "The assistant is having trouble right now. Please try again." };
  }
  console.error(err);
  return { status: 500, message: "Something went wrong handling that request." };
}
