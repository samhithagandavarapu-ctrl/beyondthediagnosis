import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ResetPassword() {
  const { updatePassword, passwordRecoveryMode } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) setError(error);
    else setDone(true);
  }

  return (
    <div className="btd-container py-14 max-w-md">
      <h1 className="text-3xl font-display font-semibold mb-2">Set a new password</h1>

      {!passwordRecoveryMode && !done && (
        <p className="text-sm text-slate mb-6">
          This page only works when opened from the reset link in your email. If you got
          here another way, go back and request a new link from the sign-in page.
        </p>
      )}

      <div className="btd-card p-6">
        {done ? (
          <div className="space-y-3">
            <p className="text-sm text-sage-dark">
              Your password has been updated.
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2.5 rounded bg-ink text-paper font-semibold text-sm"
            >
              Continue to Verity
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <p className="text-sm text-clay bg-clay/10 border border-clay/30 rounded px-3 py-2">
                {error}
              </p>
            )}
            <input
              type="password"
              required
              minLength={6}
              placeholder="New password"
              className="btd-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-2.5 rounded bg-ink text-paper font-semibold text-sm disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
