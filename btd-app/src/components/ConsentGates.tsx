import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePracticeMode } from "../context/PracticeModeContext";
import {
  hasAcceptedTerms,
  hasHealthConsent,
  isChildLogin,
  recordHealthConsent,
  recordTerms,
  takeRememberedTerms,
} from "../lib/consent";
import Icon from "./icons/Icon";

// The agreements in front of an account, and the one tool children's logins
// don't get. Each is a whole-page stop rather than a pop-up, so it reads the
// same with a screen reader and at large text sizes.

function Stop({ icon, title, children }: { icon: "lock" | "heart" | "chat"; title: string; children: React.ReactNode }) {
  return (
    <section className="btd-container max-w-2xl py-12">
      <div className="btd-card grid gap-5 p-6 sm:p-8">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-butter text-navy">
          <Icon name={icon} size={28} />
        </span>
        <h1 className="font-display text-28 font-extrabold text-navy">{title}</h1>
        {children}
      </div>
    </section>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 text-15 font-semibold text-navy">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-navy"
      />
      <span>{children}</span>
    </label>
  );
}

const link = "font-bold text-link underline";

/** Shown instead of the page to anyone signed in who hasn't agreed to the
 *  current Terms of Use and Privacy Policy. */
export function TermsGate() {
  const { user, signOut } = useAuth();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needed = Boolean(user) && !hasAcceptedTerms(user);

  // They ticked the box on the sign-up page before there was an account.
  useEffect(() => {
    if (needed && takeRememberedTerms()) recordTerms().then(setError);
  }, [needed]);

  if (!needed) return null;

  return (
    <Stop icon="lock" title="Before you start">
      <p className="text-17 leading-[1.6] text-body">
        Please read our{" "}
        <Link to="/terms" target="_blank" className={link}>
          Terms of Use
        </Link>{" "}
        and{" "}
        <Link to="/privacy" target="_blank" className={link}>
          Privacy Policy
        </Link>
        . They say what Voiced is (and isn't), what we keep, and who can see it.
      </p>
      {error && (
        <p role="alert" className="rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
          {error}
        </p>
      )}
      <Check checked={checked} onChange={setChecked}>
        I'm 13 or older, and I agree to the Terms of Use and Privacy Policy.
      </Check>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!checked || busy}
          onClick={async () => {
            setBusy(true);
            setError(await recordTerms());
            setBusy(false);
          }}
          className="btd-btn-coral min-h-[52px] gap-2 px-7 text-base disabled:opacity-40"
        >
          {busy ? "Saving…" : "Agree and continue"}
          {!busy && <Icon name="chevron-right" size={20} />}
        </button>
        <button type="button" onClick={() => signOut()} className="btd-btn-outline min-h-[52px] px-6 text-base">
          Sign out
        </button>
      </div>
    </Stop>
  );
}

/** Before health information is saved to an account: a separate yes, that
 *  says what's kept and who sees it. Signed out, or in practice mode, nothing
 *  goes to the account, so there's nothing to agree to. */
export function HealthConsentGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { practice } = usePracticeMode();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || practice || hasHealthConsent(user)) return <>{children}</>;

  return (
    <Stop icon="heart" title="Saving health information">
      <p className="text-17 leading-[1.6] text-body">
        This tool keeps health information in your account, so it's there on any device. That can
        include symptoms, pain, periods, mood, medications, and notes.
      </p>
      <ul className="grid gap-2 text-15 leading-[1.6] text-body">
        <li className="flex gap-2">
          <Icon name="check" size={18} className="mt-1 text-navy" />
          <span>
            <strong className="text-navy">Why:</strong> only to show it back to you and help you get
            ready for appointments.
          </span>
        </li>
        <li className="flex gap-2">
          <Icon name="check" size={18} className="mt-1 text-navy" />
          <span>
            <strong className="text-navy">Who can see it:</strong> you, and the family members you
            link with. Not Voiced's admins. We never sell it.
          </span>
        </li>
        <li className="flex gap-2">
          <Icon name="check" size={18} className="mt-1 text-navy" />
          <span>
            <strong className="text-navy">Where it goes:</strong> it's stored with Supabase, our
            database provider. If you use an AI feature, what you send it goes to Anthropic to write
            the answer.
          </span>
        </li>
        <li className="flex gap-2">
          <Icon name="check" size={18} className="mt-1 text-navy" />
          <span>
            <strong className="text-navy">Your choice:</strong> you can delete any of it, or your
            whole account, at any time. To take back this yes, email{" "}
            <a href="mailto:withvoiced@gmail.com" className={link}>
              withvoiced@gmail.com
            </a>
            .
          </span>
        </li>
      </ul>
      <p className="text-15 text-body">
        More in our{" "}
        <Link to="/privacy" target="_blank" className={link}>
          Privacy Policy
        </Link>
        .
      </p>
      {error && (
        <p role="alert" className="rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
          {error}
        </p>
      )}
      <Check checked={checked} onChange={setChecked}>
        I agree to Voiced keeping my health information (or my child's) in my account, as described
        above.
      </Check>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!checked || busy}
          onClick={async () => {
            setBusy(true);
            setError(await recordHealthConsent());
            setBusy(false);
          }}
          className="btd-btn-coral min-h-[52px] gap-2 px-7 text-base disabled:opacity-40"
        >
          {busy ? "Saving…" : "I agree"}
          {!busy && <Icon name="chevron-right" size={20} />}
        </button>
        <button type="button" onClick={() => navigate("/")} className="btd-btn-outline min-h-[52px] px-6 text-base">
          Not now
        </button>
      </div>
    </Stop>
  );
}

/** What a child's username login gets instead of the tools that send their
 *  words outside their profile: the AI (to Anthropic) and messages (to the
 *  Voiced team). Their parent agreed to the calendar, check-ins and Me board
 *  only. */
export function GrownUpsOnly({ what, children }: { what: string; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!isChildLogin(user)) return <>{children}</>;
  return (
    <Stop icon="chat" title="This one is for grown-ups">
      <p className="text-17 leading-[1.6] text-body">
        {what} is for grown-ups. Ask your grown-up if you want help with this.
      </p>
      <Link to="/my-voice" className="btd-btn-coral min-h-[52px] justify-self-start gap-2 px-7 text-base">
        Go to My Voice
        <Icon name="chevron-right" size={20} />
      </Link>
    </Stop>
  );
}
