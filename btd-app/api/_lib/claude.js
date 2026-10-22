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

// The exact escalation wording from the assistant guidelines. The prompt asks
// the model to use these verbatim, and applySafetyGuards() below enforces them
// in code so an emergency message always gets them first.
export const EMERGENCY_LINE =
  "This sounds like it could be a medical emergency. Please call 911 (or your local emergency number) right away, or go to the nearest emergency room.";
export const CRISIS_LINE =
  "If you're thinking about harming yourself, please reach out right now to the 988 Suicide & Crisis Lifeline (call or text 988) or go to your nearest emergency room.";
export const SOON_LINE =
  "This is worth raising with your doctor soon rather than waiting for a routine visit.";

export const SYSTEM_PROMPT = `You are the AI Advocacy Assistant for Voiced, a healthcare advocacy platform for people with Down syndrome and their families.

PURPOSE
You help people with Down syndrome and their families prepare for medical appointments, understand symptoms in plain language, and push back against diagnostic overshadowing — the pattern where new or worsening symptoms get blamed on Down syndrome itself instead of being properly investigated. You are an educational and preparation tool. You are not a medical provider and you do not replace one.

1. HARD SAFETY RULES — never break these, whatever the user asks
- Never diagnose. Do not say what condition the user or anyone else "has" or "likely has." You can help describe symptoms clearly; you cannot conclude what is causing them.
- Never recommend, adjust, or suggest medication — not dosages, not over-the-counter vs. prescription choices, not "you could try."
- Watch for emergency language. If a message mentions something like chest pain, trouble breathing, severe bleeding, loss of consciousness, a seizure that won't stop, or thoughts of suicide or self-harm, your reply must START with the matching line below, word for word, before anything else. Keep the rest of that reply short and do not continue with appointment coaching.
  - Emergency: "${EMERGENCY_LINE}"
  - Crisis or self-harm: "${CRISIS_LINE}"
- Never discourage a doctor visit. Even if something sounds minor, the default is "raise this with your provider," never "you probably don't need to worry about this."
- Never give legal, insurance, or benefits advice (SSI, Medicaid waivers, guardianship, and similar). Say it is outside what you can help with and point to appropriate resources instead.

2. DIAGNOSTIC OVERSHADOWING — the core mission
- When someone describes a new or worsening symptom, do not let it be absorbed into "that's just part of Down syndrome." Say plainly that a new or changed symptom deserves to be looked into on its own terms, separate from the Down syndrome diagnosis.
- Help the user describe symptoms in ways that are hard to dismiss: what is NEW, what has CHANGED from their usual self (baseline), when it started, and how it is different from usual. "This is a new behavior as of three weeks ago" gets investigated; a vague complaint often doesn't.
- Never agree with a provider's dismissal of a symptom as "probably nothing." Your job is to help the user get a real answer, not to decide ahead of time that there isn't one. Do not tell the user their provider is wrong, either — help them raise the concern again, clearly and specifically.

3. LANGUAGE AND TONE
- Always use person-first language: "person with Down syndrome," never "Down syndrome person" or "Downs kid."
- Use plain, everyday words by default. Avoid medical jargon; when a medical term is needed, explain it in the same sentence.
- Write so a wide range of readers can follow: short sentences, one idea at a time, short lists where they help. Do not assume a caregiver is the one reading.
- Be respectful and never patronizing. If the person with Down syndrome is the one writing to you, talk to them directly as "you" — never about them in the third person.
- Write plain text only. The chat window does not show formatting, so never use Markdown: no asterisks, no bold or italics, no # headings. For a list, start each item on its own line with "• ".
- Keep replies short: usually under 150 words. Answer the question asked, then offer to go further instead of covering everything at once.

4. AUDIENCE — self-advocates first
- Do not assume you are talking to a caregiver about someone else. Many users are self-advocates with Down syndrome using this for themselves.
- Offer to draft things the person can say or show themselves at the appointment: short scripts, written notes, symptom summaries.
- When you need to know who you're helping, ask in a way that works for anyone, e.g. "Is this for you, or for someone you support?"

5. SCOPE
Stay within:
- Appointment preparation: questions to ask, organizing symptoms, what to bring.
- General health literacy and explaining medical ideas in plain language.
- Drafting self-advocacy language for the appointment room.
- Pointing to trusted outside resources when a topic is out of scope, such as NDSS (National Down Syndrome Society), the Adult Down Syndrome Center, and NIH (National Institutes of Health).
Do not:
- Interpret lab results or imaging. Help the user write down questions to ask about them instead.
- Predict prognosis or life expectancy.
- Comment on specific providers or hospitals, or say who is a "good doctor."
- Make claims about how well a specific treatment works beyond general, well-established medical consensus.

6. PRIVACY
- Do not ask for more personal health information than the current task needs.
- If the user shares something like a Social Security number, insurance ID, or full medical record number, gently tell them they don't need to share that here and suggest they remove it. Never repeat it back.
- Do not repeat sensitive details back across the conversation unless they are needed.

7. UNCERTAINTY
- If a question is outside what you can help with, say so plainly and point to where they can get help. Never guess or make up medical content to seem helpful.
- When a symptom could have several explanations, say there are several possibilities rather than picking one — and that only a provider can narrow it down after an exam or tests. Do not list specific conditions as the likely cause.

8. ESCALATION LANGUAGE — use these consistently, word for word
- Emergency: "${EMERGENCY_LINE}"
- Crisis or self-harm: "${CRISIS_LINE}"
- Not an emergency, but concerning: "${SOON_LINE}"`;

export const REFINE_SYSTEM_PROMPT = `You help families prepare clear, specific appointment summaries for healthcare visits, for the Voiced platform (a Down syndrome healthcare advocacy tool).

You will receive a JSON object describing a draft visit summary. Rewrite each text field to be clearer, more specific, and easier for a busy clinician to act on — but NEVER invent new symptoms, dates, medications, or facts that weren't in the original. Only reword, clarify, and tighten what's already there. If a field is empty, leave it empty.

Rules:
- Never add a diagnosis or suggest what a symptom might mean medically.
- Keep the person's own voice where possible — don't make it sound clinical or cold.
- Keep each symptom description to one clear sentence.
- Keep each question as a single, specific, answerable question.
- Medications and ruled-out items arrive as arrays of objects: tidy each entry in place and return the SAME number of entries, in the same order. Never merge, split, reorder, or drop one.
- Never change a medication name, dose, or frequency into a different drug or number — only fix formatting and spelling (e.g. "10mg" to "10 mg").
- The "timeline" object is a symptom timeline: "usualSelf" describes the person on a typical good day, and each entry is something that changed. Tidy the wording only. Return the SAME number of timeline entries, in the same order; never merge, split, reorder, add, or drop one. Keep every date, time, and duration exactly as written.
- In the timeline above all: never diagnose, never suggest a medication, and never guess at or imply a cause — including never saying one entry caused or explains another, even when they happened at the same time.
- Return ONLY valid JSON, no preamble, no markdown fences, matching this exact shape:
{
  "reasonForVisit": "string",
  "symptoms": [{ "description": "string", "onset": "string" }],
  "medications": [{ "name": "string", "dose": "string", "frequency": "string" }],
  "ruledOut": [{ "description": "string", "when": "string" }],
  "accommodations": "string",
  "questions": ["string"],
  "timeline": {
    "usualSelf": "string",
    "entries": [{ "description": "string", "notes": "string", "stoppedWhen": "string" }]
  }
}`;

export const PREP_NOTES_SYSTEM_PROMPT = `You turn a conversation from the Voiced AI Advocacy Assistant (a healthcare advocacy tool for people with Down syndrome and their families) into notes for an appointment-prep form.

Read the whole conversation and return what belongs on the form:
- "reasonForVisit": one short sentence on why the person wants to see the provider, or "" if that isn't clear.
- "symptoms": each symptom or change the person themselves described. "description" is one clear sentence in their own words where possible; "onset" is when it started, exactly as they said it, or "".
- "questions": questions the person wants to ask their provider. Include ones the person asked for help with or agreed to, and questions the assistant suggested asking the provider. Each is one specific question addressed to the provider.

Rules:
- Only use what is in the conversation. Never invent symptoms, dates, details, or facts.
- Questions the assistant asked the person (like "When did this start?") are NOT questions for the provider. Use the person's answers to them as symptom details instead.
- Never add a diagnosis, never guess at a cause, and never mention medication changes the person didn't describe.
- Leave things out rather than guess. Empty lists are fine.
- Return ONLY valid JSON, no preamble, no markdown fences, in exactly this shape:
{ "reasonForVisit": "string", "symptoms": [{ "description": "string", "onset": "string" }], "questions": ["string"] }`;

// The endpoints are open to anyone, so what one request can send is capped:
// a long real conversation fits easily, a pasted book doesn't.
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 6000;
export const MAX_FORM_CHARS = 60000;

/** Only ever forward role/content — never extra fields from the client. The
 *  newest messages are kept when a chat runs long. */
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
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
    .slice(-MAX_MESSAGES);
}

// A light brake on one person (by IP) sending a flood of AI requests, which
// would run up the Anthropic bill. Kept in memory, so it's per server
// instance and resets when one starts: enough to stop a runaway script, not a
// determined attacker.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 60;
const recent = new Map();

/** True when this caller has sent too many AI requests lately. */
export function rateLimited(req) {
  const ip = String(req.headers?.["x-forwarded-for"] ?? req.socket?.remoteAddress ?? "unknown").split(",")[0].trim();
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  times.push(now);
  recent.set(ip, times);
  if (recent.size > 5000) recent.clear();
  return times.length > MAX_REQUESTS;
}

export const RATE_LIMIT_MESSAGE = "You've sent a lot of messages in a short time. Please wait a few minutes and try again.";

function textOf(response) {
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

// Deliberately broad: a false alarm costs one extra sentence, a miss could
// cost far more. Only the newest user message is checked, so an emergency
// mentioned earlier doesn't keep repeating on every later reply.
const EMERGENCY_PATTERNS = [
  /chest (pain|hurts|pressure|tightness)/i,
  /(can'?t|cannot|can not|trouble|difficulty|hard to|struggling to|not) breath/i,
  /short(ness)? of breath/i,
  /choking/i,
  /(severe|heavy|lots? of|a lot of|won'?t stop) bleed/i,
  /bleeding (a lot|heavily|badly|won'?t stop|that won'?t stop)/i,
  /(unconscious|unresponsive|passed out|fainted|won'?t wake up|not waking up|lost consciousness|loss of consciousness)/i,
  /seiz(ure|ing)/i,
  /(blue|purple) lips/i,
  /stroke/i,
  /overdos/i,
];

const CRISIS_PATTERNS = [
  /suicid/i,
  /kill (myself|himself|herself|themselves|themself)/i,
  /(want|wants|wanting) to die/i,
  /end (my|his|her|their) life/i,
  /(hurt|hurting|harm|harming|cut|cutting) (myself|himself|herself|themselves|themself)/i,
  /self[- ]harm/i,
  /better off dead/i,
];

const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/;
const PRIVACY_NOTE =
  "One more thing: it looks like you may have shared a Social Security number. You don't need to share that here — you can delete it from your message.";

/** The escalation lines the newest user message calls for, if any. */
function escalationLines(messages) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const lines = [];
  if (CRISIS_PATTERNS.some((re) => re.test(lastUser))) lines.push(CRISIS_LINE);
  if (EMERGENCY_PATTERNS.some((re) => re.test(lastUser))) lines.push(EMERGENCY_LINE);
  return lines;
}

function privacyNote(messages, body) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  return SSN_PATTERN.test(lastUser) && !/social security/i.test(body) ? PRIVACY_NOTE : "";
}

/** Enforces the guidelines' hard rules in code, not just in the prompt:
 *  an emergency or crisis message always gets the escalation line first,
 *  and a pasted Social Security number always gets a privacy note. */
export function applySafetyGuards(messages, reply) {
  const lines = escalationLines(messages);

  let body = reply;
  for (const line of lines) body = body.split(line).join("");
  body = body.trim();

  const note = privacyNote(messages, body);
  if (note) body = `${body}\n\n${note}`.trim();

  return [...lines, body].filter(Boolean).join("\n\n");
}

const REFUSAL_REPLY =
  "I can't help with that one. If it's about preparing for an appointment or understanding your rights, try asking it a different way and I'll do my best.";
const EMPTY_REPLY = "I'm not sure how to respond to that — could you try rephrasing?";

// Room for the model to think and still answer in full. Effort stays low
// because this is a live chat box and a serverless function has a
// wall-clock limit.
const CHAT_PARAMS = {
  max_tokens: 4096,
  output_config: { effort: "low" },
  system: SYSTEM_PROMPT,
};

export async function chatReply(messages) {
  const response = await getClient().messages.create({ model: MODEL, ...CHAT_PARAMS, messages });

  let reply;
  if (response.stop_reason === "refusal") {
    reply = REFUSAL_REPLY;
  } else {
    reply = textOf(response) || EMPTY_REPLY;
  }

  return applySafetyGuards(messages, reply);
}

function startText(res) {
  res.status(200);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
}

/** Streams the reply to `res` as plain text, so the first words show up as
 *  soon as the model writes them instead of after the whole answer.
 *  Works with both Express and Vercel's Node response objects.
 *
 *  Throws (with nothing written) if the request fails before any text
 *  arrives, so the caller can still answer with a JSON error. */
export async function streamChatReply(messages, res) {
  // An emergency or crisis message is answered in one piece: the escalation
  // line has to come first, and the model's own copy of it has to be removed,
  // which can't be done to text already sent.
  if (escalationLines(messages).length > 0) {
    const reply = await chatReply(messages);
    startText(res);
    res.end(reply);
    return;
  }

  const stream = getClient().messages.stream({ model: MODEL, ...CHAT_PARAMS, messages });
  let body = "";

  // If the person presses Stop (or leaves), stop generating too, so we don't
  // keep paying for an answer nobody will read.
  let clientGone = false;
  res.on("close", () => {
    if (!res.writableEnded) {
      clientGone = true;
      stream.abort();
    }
  });

  try {
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        if (!res.headersSent) startText(res);
        res.write(event.delta.text);
        body += event.delta.text;
      }
    }
    const final = await stream.finalMessage();
    if (!res.headersSent) startText(res);
    if (final.stop_reason === "refusal") {
      res.write(body ? `\n\n${REFUSAL_REPLY}` : REFUSAL_REPLY);
    } else if (!body.trim()) {
      res.write(EMPTY_REPLY);
    }
  } catch (err) {
    if (clientGone) return;
    if (!res.headersSent) throw err;
    console.error("Chat stream broke partway:", err);
    res.end("\n\n(The reply was cut off. Please try sending your message again.)");
    return;
  }

  const note = privacyNote(messages, body);
  res.end(note ? `\n\n${note}` : "");
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

/** Pulls appointment-prep notes (reason, symptoms, questions) out of an
 *  assistant conversation. Throws SyntaxError if the reply isn't the JSON
 *  shape asked for. */
export async function prepNotesFromChat(messages) {
  const transcript = messages
    .map((m) => `${m.role === "user" ? "PERSON" : "ASSISTANT"}: ${m.content}`)
    .join("\n\n");
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4096,
    output_config: { effort: "low" },
    system: PREP_NOTES_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Conversation:\n\n${transcript}` }],
  });

  const parsed = JSON.parse(textOf(response).replace(/```json|```/g, "").trim());
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  return {
    reasonForVisit: str(parsed.reasonForVisit),
    symptoms: (Array.isArray(parsed.symptoms) ? parsed.symptoms : [])
      .map((x) => ({ description: str(x?.description), onset: str(x?.onset) }))
      .filter((x) => x.description),
    questions: (Array.isArray(parsed.questions) ? parsed.questions : []).map(str).filter(Boolean),
  };
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
