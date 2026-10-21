import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authEnabled } from "../lib/supabaseClient";
import PasswordInput from "../components/PasswordInput";
import { usernameEmail, usernameOf } from "../lib/family";
import { inkLastWord } from "../components/Scribble";

// Phone sign-in needs a paid SMS provider connected in Supabase (README,
// "Turn on phone number sign-in"). Until VITE_PHONE_SIGNIN=true says that's
// done, say so plainly instead of offering a button that can only fail.
const PHONE_SIGNIN_READY = import.meta.env.VITE_PHONE_SIGNIN === "true";

type Mode = "signin" | "signup" | "phone" | "phone-code" | "forgot" | "forgot-sent";

export default function Login() {
  const {
    user,
    loading,
    signOut,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithPhone,
    verifyPhoneOtp,
    sendPasswordReset,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const accountDeleted = Boolean((location.state as { accountDeleted?: boolean } | null)?.accountDeleted);

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Sign-in takes an email, or the username a parent made for a child (no
  // email needed: it's an address underneath that's never emailed).
  const signInAddress = email.includes("@") ? email.trim() : usernameEmail(email);

  async function run(action: () => Promise<{ error: string | null }>, onSuccess?: () => void) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error } = await action();
    setBusy(false);
    if (error) setError(error);
    else onSuccess?.();
  }

  // Already signed in: a sign-in form would be a dead end, so offer what a
  // signed-in person actually came here for.
  if (!loading && user) {
    return (
      <div className="btd-container py-14 max-w-md">
        <h1 className="text-3xl font-display font-semibold mb-2">{inkLastWord("You're signed in")}</h1>
        <p className="text-slate mb-8">Signed in as {usernameOf(user.email) || user.email || user.phone || "your account"}.</p>
        <div className="btd-card p-6 space-y-3">
          <Link
            to="/profile?section=security"
            className="block w-full text-center px-4 py-2.5 rounded bg-ink text-paper font-semibold text-sm"
          >
            Manage your account
          </Link>
          <p className="text-xs text-slate">
            Change your email or password, or delete your account.
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full px-4 py-2.5 rounded border border-ink/20 font-semibold text-sm hover:border-ink/40 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="btd-container py-14 max-w-md">
      <h1 className="text-3xl font-display font-semibold mb-2">{inkLastWord("Sign in to Voiced")}</h1>
      <p className="text-slate mb-8">
        Save your appointment prep history and pick up where you left off.
      </p>

      {accountDeleted && (
        <div role="status" className="btd-card p-4 mb-6 bg-sage/10 border-sage/30 text-sm text-ink">
          Your account has been deleted. Thank you for using Voiced.
        </div>
      )}

      {!authEnabled && (
        <div className="btd-card p-4 mb-6 bg-clay/10 border-clay/40 text-sm text-ink">
          <strong>Sign-in isn't available right now.</strong> Everything else on Voiced
          still works without an account. Questions? Email withvoiced@gmail.com.
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
                  run(() => signInWithEmail(signInAddress, password), () => navigate("/"));
                } else {
                  run(async () => {
                    const result = await signUpWithEmail(email, password);
                    // Pressing again within a minute: the first email is
                    // probably already on its way.
                    const wait = result.error?.match(/only request this after (\d+) seconds/);
                    if (wait) {
                      return {
                        error: `We've already sent a link to ${email}. Check your inbox and spam folder. If it isn't there, you can ask again in ${wait[1]} seconds.`,
                      };
                    }
                    if (!result.error) {
                      if (result.signedIn) navigate("/profile");
                      else
                        setNotice(
                          `We sent a confirmation link to ${email}. Click it to finish creating your account — it brings you back here, signed in.`
                        );
                    }
                    return result;
                  });
                }
              }}
              className="space-y-3"
            >
              <input
                type={mode === "signin" ? "text" : "email"}
                required
                autoComplete="username"
                autoCapitalize="none"
                placeholder={mode === "signin" ? "Email or username" : "Email"}
                aria-label={mode === "signin" ? "Email or username" : "Email"}
                className="btd-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <PasswordInput
                required
                minLength={6}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === "signup" && (
                <p className="text-xs text-slate">
                  Signing up for your child? Make your own account here, then add them. Each
                  person has one profile, and they can have their own login to it.
                </p>
              )}
              {mode === "signin" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-sm font-semibold text-link hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full px-4 py-2.5 rounded bg-ink text-paper font-semibold text-sm disabled:opacity-50"
              >
                {mode === "signin"
                  ? busy ? "Signing in…" : "Sign in"
                  : busy ? "Creating your account…" : "Create account"}
              </button>
            </form>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-gold-dark font-semibold hover:underline"
              >
                {mode === "signin" ? "Create an account" : "Have an account? Sign in"}
              </button>
            </div>

            {PHONE_SIGNIN_READY ? (
              <button
                type="button"
                onClick={() => setMode("phone")}
                className="w-full text-xs text-slate hover:underline"
              >
                Sign in or sign up with your phone number
              </button>
            ) : (
              <p className="rounded-lg bg-butter/40 px-3 py-2 text-center text-xs text-navy">
                Signing up with a phone number isn't set up yet. Use email or Google for now.
              </p>
            )}
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
              Enter your number and we'll text you a one-time code. New here? The code creates
              your account. No password needed.
            </p>
            <input
              type="tel"
              required
              autoComplete="tel"
              aria-label="Phone number"
              placeholder="555 555 5555"
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
              autoComplete="one-time-code"
              aria-label="Code from the text message"
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
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setCode("");
                  setMode("phone");
                }}
                className="text-slate hover:underline"
              >
                ← Change number
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(
                    () => signInWithPhone(phone),
                    () => setNotice("A new code is on its way.")
                  )
                }
                className="text-gold-dark font-semibold hover:underline disabled:opacity-50"
              >
                Send a new code
              </button>
            </div>
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
            <p className="text-sm text-slate">
              Sign in with a username? Ask your grown-up: they can set a new password from their
              Family dashboard.
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
