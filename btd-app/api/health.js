import { hasApiKey, MODEL } from "./_lib/claude.js";

/** A page you can open in a browser to tell configuration problems apart from
 *  code problems: it says whether the server has its API key, without
 *  revealing the key itself. */
export default function handler(_req, res) {
  res.status(200).json({ ok: true, apiKeyConfigured: hasApiKey(), model: MODEL });
}
