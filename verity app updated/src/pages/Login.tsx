import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authEnabled } from "../lib/supabaseClient";

type Mode = "signin" | "signup" | "phone" | "phone-code" | "forgot" | "forgot-sent";

export default function Login() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithPhone, verifyPhoneOtp, sendPasswordReset } =
    useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(action: () => Promise<{ error: string | null }>, onSuccess?: () => void) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error } = await action();
    setBusy(false);
    if (error) setError(error);
    else onSuccess?.();
  }

  return (
    <div className="btd-container py-14 max-w-md">
      <h1 className="text-3xl font-display font-semibold mb-2">Sign in to Verity</h1>
      <p className="text-slate mb-8">
        Save your appointment prep history and pick up where you left off.
      </p>

      {!authEnabled && (
        <div className="btd-card p-4 mb-6 bg-clay/10 border-clay/40 text-sm text-ink">
          <strong>Login isn't set up yet.</strong> This screen is fully built, but needs a
          free Supabase project connected — see the README section "Setting up login."
        </div>
      )}

      <div className="btd-card p-6 space-y-5">
        {error && (
          <p className="text-sm text-clay bg-clay/10 border border-clay/30 rounded px-3 py-2">
            {error}
          </p>
        )}
        {notice && (
          <p className="text-sm text-sage-dark bg-sage/10 border border-sage/30 rounded px-3 py-2">
            {notice}
          </p>
        )}

        {(mode === "signin" || mode === "signup") && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(signInWithGoogle)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-ink/20 font-semibold text-sm hover:border-ink/40 transition-colors disabled:opacity-50"
            >
              Continue with Google
            </button>

            <div className="flex items-center gap-3 text-xs text-slate-light">
              <div className="flex-1 h-px bg-ink/10" />
              or
              <div className="flex-1 h-px bg-ink/10" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (mode === "signin") {
                  run(() => signInWithEmail(email, password), () => navigate("/"));
                } else {
                  run(() => signUpWithEmail(email, password), () =>
                    setNotice("Check your email to confirm your account.")
                  );
                }
              }}
              className="space-y-3"
            >
              <input
                type="email"
                required
                placeholder="Email"
                className="btd-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Password"
                className="btd-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full px-4 py-2.5 rounded bg-ink text-paper font-semibold text-sm disabled:opacity-50"
              >
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-gold-dark font-semibold hover:underline"
              >
                {mode === "signin" ? "Create an account" : "Have an account? Sign in"}
              </button>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-slate hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMode("phone")}
              className="w-full text-xs text-slate hover:underline"
            >
              Use your phone number instead
            </button>
          </>
        )}

        {mode === "phone" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => signInWithPhone(phone), () => setMode("phone-code"));
            }}
            className="space-y-3"
          >
            <p className="text-sm text-slate">
              Enter your number and we'll text you a one-time code.
            </p>
            <input
              type="tel"
              required
              placeholder="+1 555 555 5555"
              className="btd-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-2.5 rounded bg-ink text-paper font-semibold text-sm disabled:opacity-50"
            >
              Send code
            </button>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="w-full text-xs text-slate hover:underline"
            >
              ← Back
            </button>
          </form>
        )}

        {mode === "phone-code" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => verifyPhoneOtp(phone, code), () => navigate("/"));
            }}
            className="space-y-3"
          >
            <p className="text-sm text-slate">Enter the code sent to {phone}.</p>
            <input
              type="text"
              required
              inputMode="numeric"
              placeholder="6-digit code"
              className="btd-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-2.5 rounded bg-ink text-paper font-semibold text-sm disabled:opacity-50"
            >
              Verify and sign in
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => sendPasswordReset(email), () => setMode("forgot-sent"));
            }}
            className="space-y-3"
          >
            <p className="text-sm text-slate">
              Enter your email and we'll send a link to reset your password.
            </p>
            <input
              type="email"
              required
              placeholder="Email"
              className="btd-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-2.5 rounded bg-ink text-paper font-semibold text-sm disabled:opacity-50"
            >
              Send reset link
            </button>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="w-full text-xs text-slate hover:underline"
            >
              ← Back to sign in
            </button>
          </form>
        )}

        {mode === "forgot-sent" && (
          <div className="text-sm text-slate">
            <p className="mb-3">
              If an account exists for that email, a reset link is on its way. Click it to
              set a new password.
            </p>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-gold-dark font-semibold hover:underline"
            >
              ← Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
