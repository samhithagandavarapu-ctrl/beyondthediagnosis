import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  chatReply,
  cleanMessages,
  describeError,
  hasApiKey,
  MISSING_KEY_MESSAGE,
  MODEL,
  refineForm,
} from "../api/_lib/claude.js";

/** Local development only.
 *
 *  In production these same endpoints run as Vercel serverless functions in
 *  api/ — this file exists so `npm run dev:all` gives you /api/chat on
 *  localhost, and it shares every prompt and request detail with the deployed
 *  version through api/_lib/claude.js. Nothing here is deployed. */

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: true }));

const PORT = process.env.PORT || 3001;

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, apiKeyConfigured: hasApiKey(), model: MODEL })
);

app.post("/api/chat", async (req, res) => {
  if (!hasApiKey()) return res.status(500).json({ error: MISSING_KEY_MESSAGE });

  const messages = cleanMessages(req.body?.messages);
  if (messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  try {
    res.json({ reply: await chatReply(messages) });
  } catch (err) {
    const { status, message } = describeError(err);
    res.status(status).json({ error: message });
  }
});

app.post("/api/refine-appointment", async (req, res) => {
  if (!hasApiKey()) return res.status(500).json({ error: MISSING_KEY_MESSAGE });

  const { form } = req.body ?? {};
  if (!form || typeof form !== "object") {
    return res.status(400).json({ error: "form object is required" });
  }

  try {
    res.json({ refined: await refineForm(form) });
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error("Couldn't parse the refined form:", err.message);
      return res
        .status(502)
        .json({ error: "Couldn't read the assistant's response. Your draft is unchanged." });
    }
    const { status, message } = describeError(err);
    res.status(status).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Verity dev API running on http://localhost:${PORT} (model: ${MODEL})`);
});
