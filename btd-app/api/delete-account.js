import { deleteAccount } from "./_lib/account.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }

  const { status, error } = await deleteAccount(req.headers.authorization);
  return res.status(status).json(error ? { error } : { ok: true });
}
