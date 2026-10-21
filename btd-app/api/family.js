import { familyAction } from "./_lib/family.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
  const { status, error, data } = await familyAction(req.headers.authorization, body);
  return res.status(status).json(error ? { error } : { ok: true, ...(data ?? {}) });
}
