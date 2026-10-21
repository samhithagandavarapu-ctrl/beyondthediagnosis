import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { familyApi, usernameOf } from "../lib/family";
import PasswordInput from "../components/PasswordInput";
import Icon from "../components/icons/Icon";

// An invite from a parent, for a teen (13 and up) to make their own login.
// It connects to the profile the parent already made — the teen doesn't fill
// anything in again, and no second profile is made.

export default function Join() {
  const { code: fromLink } = useParams();
  const { user, signInWithEmail, signOut } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState(fromLink ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    const { error } = await familyApi("claim", { code, email, password });
    if (error) {
      setBusy(false);
      return setError(error);
    }
    const signedIn = await signInWithEmail(email, password);
    setBusy(false);
    if (signedIn.error) return setError(`Your login is ready. Sign in with it: ${signedIn.error}`);
    navigate("/", { replace: true });
  }

  return (
    <div className="btd-grain min-h-[70vh] bg-gradient-to-b from-mist to-sky-tint px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-[560px] rounded-panel border border-navy/12 bg-white p-6 shadow-[0_12px_32px_rgba(33,50,68,0.08)] sm:p-8">
        <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-butter bg-sky text-navy">
          <Icon name="star" size={28} />
        </span>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,5vw,2.25rem)] font-extrabold leading-tight text-navy">
          Make your own login
        </h1>
        <p className="mt-2 text-17 leading-[1.6] text-body">
          Your grown-up already set up your profile on Voiced. Pick your email and a password, and it's
          yours: everything they added is there, and you don't fill anything in again.
        </p>

        {user ? (
          <div className="mt-6 grid gap-3 rounded-card border-2 border-butter bg-butter/30 p-4">
            <p className="text-15 text-navy">
              You're signed in as <strong>{usernameOf(user.email) || user.email || "someone"}</strong>. This
              invite makes a new login, so sign out first.
            </p>
            <button type="button" onClick={() => signOut()} className="btd-btn-outline min-h-[48px] justify-self-start px-5 text-sm">
              Sign out
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              join();
            }}
            className="mt-6 grid gap-4"
          >
            {error && (
              <p role="alert" className="rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
                {error}
              </p>
            )}
            <label className="grid gap-1 text-15 font-bold text-navy">
              Your invite code
              <input
                className="btd-input max-w-[12rem] uppercase tracking-[0.12em]"
                value={code}
                required
                maxLength={8}
                autoComplete="off"
                onChange={(e) => setCode(e.target.value)}
                placeholder="ABC-123"
              />
            </label>
            <label className="grid gap-1 text-15 font-bold text-navy">
              Your email
              <input
                type="email"
                className="btd-input"
                value={email}
                required
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-15 font-bold text-navy">
              A password
              <PasswordInput
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="text-13 font-normal text-muted">At least 8 characters.</span>
            </label>
            <button type="submit" disabled={busy} className="btd-btn-coral min-h-[56px] justify-self-start gap-2 px-8 text-base disabled:opacity-40">
              {busy ? "Setting it up…" : "Make my login"}
              {!busy && <Icon name="chevron-right" size={20} />}
            </button>
            <p className="text-13 text-muted">
              Already made a Voiced account with this email? Use a different email here, or ask your
              grown-up — each person has just one profile.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
