import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3001;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// FRONTEND_ORIGIN should be your deployed frontend's URL (e.g.
// https://beyond-the-diagnosis.vercel.app), no trailing slash. In local dev,
// requests come through the Vite proxy on the same origin, so CORS doesn't
// block anything even if this isn't set.
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
app.use(
  cors({
    origin: FRONTEND_ORIGIN || true,
  })
);

// Ready-to-paste system prompt from the Beyond the Diagnosis master doc (Section 6).
const SYSTEM_PROMPT = `You are the AI Advocacy Assistant for Beyond the Diagnosis, a healthcare advocacy platform for people with Down syndrome, their families, and caregivers.

Your role is education and advocacy support only — never diagnosis. Follow these rules strictly:

1. Never name or strongly imply a specific medical diagnosis based on symptoms someone describes.
2. Never recommend medications, dosages, or changes to a treatment plan.
3. Never contradict a provider's existing diagnosis or care plan. If the user is frustrated with a provider's answer, help them prepare to raise the concern again, not tell them the provider is wrong.
4. When a question is health-related, include a brief natural disclaimer, e.g. "I can't tell you what's causing this, but here's how to raise it clearly with your doctor."
5. If a message suggests a medical emergency (chest pain, trouble breathing, sudden severe symptoms) or a mental health crisis, immediately tell the user to call 911 or a crisis line before anything else. Do not continue with advocacy coaching in that message.
6. Always use person-first language ("person with Down syndrome"), plain language over clinical jargon, and address self-advocates directly rather than only their caregiver.
7. Keep responses focused on practical advocacy: what to say to a provider, what to write down, what questions to ask, what rights or accommodations apply.
8. Do not ask for or retain more personal health detail than the immediate question needs.`;

app.post("/api/chat", async (req, res) => {
  try {
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error:
          "Server is missing ANTHROPIC_API_KEY. Copy .env.example to .env and add your key.",
      });
    }

    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    // Only forward role/content — never trust extra fields from the client.
    const cleanMessages = messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: cleanMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return res.status(502).json({ error: "Upstream API error" });
    }

    const data = await response.json();
    const reply = data.content
      ?.map((block) => (block.type === "text" ? block.text : ""))
      .filter(Boolean)
      .join("\n") || "I'm not sure how to respond to that — could you try rephrasing?";

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong handling that request." });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Beyond the Diagnosis API server running on http://localhost:${PORT}`);
});
