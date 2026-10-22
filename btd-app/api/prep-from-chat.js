import {
  cleanMessages,
  describeError,
  hasApiKey,
  MISSING_KEY_MESSAGE,
  prepNotesFromChat,
  rateLimited,
  RATE_LIMIT_MESSAGE,
} from "./_lib/claude.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }

  if (!hasApiKey()) {
    return res.status(500).json({ error: MISSING_KEY_MESSAGE });
  }

  if (rateLimited(req)) {
    return res.status(429).json({ error: RATE_LIMIT_MESSAGE });
  }

  const messages = cleanMessages(req.body?.messages);
  if (messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  try {
    return res.status(200).json({ notes: await prepNotesFromChat(messages) });
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error("Couldn't parse the prep notes:", err.message);
      return res.status(502).json({ error: "Couldn't turn this chat into notes. Please try again." });
    }
    const { status, message } = describeError(err);
    return res.status(status).json({ error: message });
  }
}
