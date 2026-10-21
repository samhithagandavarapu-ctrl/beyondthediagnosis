import { hasApiKey, MODEL } from "./_lib/claude.js";
import { accountDeletionStatus } from "./_lib/account.js";

/** A page you can open in a browser to tell configuration problems apart from
 *  code problems: it says whether the server has its API key, and whether
 *  account deletion is set up, without revealing either key. */
export default async function handler(_req, res) {
  res.status(200).json({
    ok: true,
    apiKeyConfigured: hasApiKey(),
    model: MODEL,
    accountDeletion: await accountDeletionStatus(),
  });
}
