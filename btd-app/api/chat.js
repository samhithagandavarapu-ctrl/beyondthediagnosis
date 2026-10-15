import {
  cleanMessages,
  describeError,
  hasApiKey,
  MISSING_KEY_MESSAGE,
  streamChatReply,
} from "./_lib/claude.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }

  if (!hasApiKey()) {
    return res.status(500).json({ error: MISSING_KEY_MESSAGE });
  }

  const messages = cleanMessages(req.body?.messages);
  if (messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  try {
    await streamChatReply(messages, res);
  } catch (err) {
    const { status, message } = describeError(err);
    return res.status(status).json({ error: message });
  }
}
