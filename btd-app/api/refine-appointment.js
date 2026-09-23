import { describeError, hasApiKey, MISSING_KEY_MESSAGE, refineForm } from "./_lib/claude.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }

  if (!hasApiKey()) {
    return res.status(500).json({ error: MISSING_KEY_MESSAGE });
  }

  const { form } = req.body ?? {};
  if (!form || typeof form !== "object") {
    return res.status(400).json({ error: "form object is required" });
  }

  try {
    const refined = await refineForm(form);
    return res.status(200).json({ refined });
  } catch (err) {
    if (err instanceof SyntaxError) {
      // The model returned something that wasn't the JSON shape we asked for.
      console.error("Couldn't parse the refined form:", err.message);
      return res
        .status(502)
        .json({ error: "Couldn't read the assistant's response. Your draft is unchanged." });
    }
    const { status, message } = describeError(err);
    return res.status(status).json({ error: message });
  }
}
