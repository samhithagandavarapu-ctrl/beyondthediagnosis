import { useEffect, useState } from "react";
import { possessive, useAccountMode } from "../../context/AccountModeContext";
import { usePracticeMode } from "../../context/PracticeModeContext";
import {
  FamilyPerson,
  createProfileClaim,
  familyApi,
  getsUsernameLogin,
  profileClaimFor,
  showCode,
} from "../../lib/family";
import PasswordInput from "../PasswordInput";
import Icon from "../icons/Icon";
import { Link } from "react-router-dom";
import { CHILD_CONSENT_VERSION } from "../../data/legal";

// The pieces a parent uses to look after their children's profiles: adding a
// child (the only place a child's details are entered), and giving each child
// their way in — a username login for 12 and under, an invite for 13 and up.

export const RELATIONS = ["Mom", "Dad", "Sibling", "Support worker", "Other"];

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => thisYear - i);

function Alert({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded border px-3 py-2 text-sm ${
        tone === "error" ? "border-coral bg-coral/20 text-coral-ink" : "border-sky bg-sky-tint text-sky-ink"
      }`}
    >
      {children}
    </p>
  );
}

/** Add a child's profile: name, birth year, and how you're related. */
export function AddChildForm({
  onAdded,
  defaultName = "",
  moveMine = false,
  submitLabel = "Add my child",
}: {
  onAdded?: (childId: string, name: string) => void;
  defaultName?: string;
  /** Move the notes kept on the parent's own account onto this profile. */
  moveMine?: boolean;
  submitLabel?: string;
}) {
  const { family, setManagedKey } = useAccountMode();
  const { practice } = usePracticeMode();
  const [name, setName] = useState(defaultName);
  const [year, setYear] = useState("");
  const [relation, setRelation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (practice) {
      setError("Practice mode: nobody is added. Turn practice mode off to add your child.");
      return;
    }
    setBusy(true);
    const { data, error } = await familyApi<{ childId: string }>("add-child", {
      name: name.trim(),
      birthYear: Number(year),
      relation,
      moveMine,
    });
    if (error || !data) {
      setBusy(false);
      setError(error);
      return;
    }
    await family.reload();
    setManagedKey(data.childId);
    setBusy(false);
    onAdded?.(data.childId, name.trim());
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-4"
    >
      {error && <Alert tone="error">{error}</Alert>}
      <label className="grid gap-1.5 text-15 font-bold text-navy">
        Their first name or nickname
        <input
          className="btd-input text-base"
          value={name}
          required
          maxLength={40}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="grid gap-1.5 text-15 font-bold text-navy">
        The year they were born
        <select className="btd-input max-w-[12rem] text-base" value={year} required onChange={(e) => setYear(e.target.value)}>
          <option value="">Choose a year</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <span className="text-13 font-normal text-muted">
          This decides how they get their own login later: a username you make (12 and under), or
          an invite to use their own email (13 and up).
        </span>
      </label>
      <fieldset>
        <legend className="mb-2 text-15 font-bold text-navy">How are you related?</legend>
        <div className="flex flex-wrap gap-2">
          {RELATIONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={relation === r}
              onClick={() => setRelation(relation === r ? "" : r)}
              className={`min-h-[48px] rounded-full border-2 px-5 text-15 font-bold transition-colors ${
                relation === r ? "border-navy bg-navy text-mist" : "border-navy/15 bg-white text-navy hover:border-sky"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </fieldset>
      <button
        type="submit"
        disabled={busy || !name.trim() || !year}
        className="btd-btn-coral min-h-[56px] justify-self-start gap-2 px-8 text-base disabled:opacity-40"
      >
        {busy ? "Adding…" : submitLabel}
        {!busy && <Icon name="chevron-right" size={20} />}
      </button>
    </form>
  );
}

/** How a child gets in: their username login, or an invite, and removing
 *  them from your account. */
export function ChildAccess({ child }: { child: FamilyPerson }) {
  const { family } = useAccountMode();
  const name = child.name.split(/\s+/)[0] || child.name;
  const [open, setOpen] = useState<"login" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const young = child.birthYear === null ? child.login !== "email" : getsUsernameLogin(child.birthYear);
  const age = child.birthYear !== null ? thisYear - child.birthYear : null;

  async function remove() {
    const sure = window.confirm(
      `Remove ${possessive(name)} profile? Their calendar, Me board and drafts will be deleted, unless another grown-up is linked to them. This can't be undone.`
    );
    if (!sure) return;
    const { data, error } = await familyApi<{ removed: "link" | "profile" }>("remove-child", { childId: child.personId });
    if (error) return setError(error);
    setNotice(data?.removed === "link" ? `${name} is off your account. Their other grown-up still has them.` : `${possessive(name)} profile was removed.`);
    family.reload();
  }

  return (
    <div className="grid gap-3">
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="ok">{notice}</Alert>}

      {child.login === "email" ? (
        <p className="flex items-center gap-2 text-15 text-body">
          <Icon name="check" size={18} className="text-navy" />
          {name} signs in with their own email. It's the same profile you see.
        </p>
      ) : child.login === "username" ? (
        <div className="grid gap-2">
          <p className="flex flex-wrap items-center gap-2 text-15 text-body">
            <Icon name="check" size={18} className="text-navy" />
            <span>
              {name} signs in with the username <strong className="font-bold text-navy">{child.username}</strong>
            </span>
          </p>
          {open === "login" ? (
            <UsernameLogin child={child} name={name} resetOnly onDone={(msg) => { setOpen(null); setNotice(msg); }} />
          ) : (
            <button type="button" onClick={() => setOpen("login")} className="btd-btn-outline min-h-[44px] justify-self-start px-5 text-sm">
              Set a new password
            </button>
          )}
        </div>
      ) : young ? (
        open === "login" ? (
          <UsernameLogin
            child={child}
            name={name}
            onDone={(msg) => {
              setOpen(null);
              setNotice(msg);
              family.reload();
            }}
          />
        ) : (
          <button type="button" onClick={() => setOpen("login")} className="btd-btn-sky min-h-[48px] justify-self-start gap-2 px-5 text-sm">
            <Icon name="lock" size={18} />
            Give {name} their own login
          </button>
        )
      ) : (
        <TeenInvite child={child} name={name} />
      )}

      <p className="text-13 text-muted">
        {age !== null ? `Born ${child.birthYear}` : "Birth year not set"}
        {child.relation ? ` · You're their ${child.relation.toLowerCase() === "other" ? "grown-up" : child.relation.toLowerCase()}` : ""}
        {" · "}
        <button type="button" onClick={remove} className="font-semibold text-clay hover:underline">
          Remove {name}
        </button>
      </p>
    </div>
  );
}

/** A username and password the parent picks, for a child 12 and under. No
 *  email: they type the username on the normal sign-in page. */
function UsernameLogin({
  child,
  name,
  resetOnly,
  onDone,
}: {
  child: FamilyPerson;
  name: string;
  resetOnly?: boolean;
  onDone: (message: string) => void;
}) {
  const { practice } = usePracticeMode();
  const [username, setUsername] = useState(() => name.toLowerCase().replace(/[^a-z0-9]/g, "") + String(thisYear).slice(-2));
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (practice) return setError("Practice mode: no login is made. Turn practice mode off to make it.");
    setBusy(true);
    const { data, error } = await familyApi<{ username: string }>("child-login", {
      childId: child.personId,
      password,
      ...(resetOnly ? {} : { username, consent: CHILD_CONSENT_VERSION }),
    });
    setBusy(false);
    if (error || !data) return setError(error);
    onDone(
      resetOnly
        ? `New password saved. ${name} signs in as ${data.username} with it.`
        : `Done! ${name} can sign in on the Sign in page with the username ${data.username} and the password you chose. Write them down somewhere safe — we don't show the password again.`
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="grid gap-3 rounded-card border-2 border-sky bg-sky-tint p-4"
    >
      {error && <Alert tone="error">{error}</Alert>}
      {!resetOnly && (
        <label className="grid gap-1 text-sm font-bold text-navy">
          A username for {name}
          <input
            className="btd-input max-w-xs lowercase"
            value={username}
            required
            minLength={3}
            maxLength={24}
            autoCapitalize="none"
            autoComplete="off"
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
          />
          <span className="text-12 font-normal text-muted">Letters and numbers. No email needed.</span>
        </label>
      )}
      <label className="grid gap-1 text-sm font-bold text-navy">
        {resetOnly ? "A new password" : "A password"}
        <PasswordInput
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-12 font-normal text-muted">At least 8 characters. Something {name} can remember.</span>
      </label>
      {!resetOnly && (
        <div className="grid gap-2 rounded-tile border border-navy/15 bg-white p-4 text-13 leading-[1.6] text-body">
          <p className="text-sm font-bold text-navy">For you, as {possessive(name)} parent or guardian</p>
          <p>
            With their own login, {name} can add to their calendar, check-ins and Me board
            themselves. That's what Voiced collects from them: how they feel, what hurts, and
            notes they write. It's used only to show back to {name} and to you, and to help get
            ready for appointments.
          </p>
          <p>
            Only {name} and their linked grown-ups can see it. It isn't shown to Voiced's admins,
            sold, or used for ads. {name} can't use the AI Advocate, so nothing they type goes to an
            AI company. It's stored with our database and hosting providers (Supabase and Vercel)
            only to run Voiced.
          </p>
          <p>
            You can see what's on their profile (except entries {name} marks "Just for me"), change
            their password, or remove their profile completely, which deletes everything and stops
            any more collection. To see or delete anything else, including "Just for me" entries,
            email us:{" "}
            <a href="mailto:withvoiced@gmail.com" className="font-bold text-link underline">
              withvoiced@gmail.com
            </a>
            . The full details are in our{" "}
            <Link to="/privacy" target="_blank" className="font-bold text-link underline">
              Privacy Policy
            </Link>
            .
          </p>
          <label className="mt-1 flex items-start gap-2 text-sm font-bold text-navy">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-navy"
            />
            <span>
              I'm {possessive(name)} parent or legal guardian, and I agree to Voiced collecting this
              information from {name} as described.
            </span>
          </label>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || (!resetOnly && !consent)} className="btd-btn-coral min-h-[48px] px-6 text-sm disabled:opacity-40">
          {busy ? "Saving…" : resetOnly ? "Save new password" : "Make the login"}
        </button>
      </div>
    </form>
  );
}

/** A one-time code and link for a teen to make their own login to their
 *  profile, with their own email. */
function TeenInvite({ child, name }: { child: FamilyPerson; name: string }) {
  const { practice } = usePracticeMode();
  const [claim, setClaim] = useState<{ code: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    profileClaimFor(child.personId).then(setClaim);
  }, [child.personId]);

  async function make() {
    setError(null);
    if (practice) return setError("Practice mode: no invite is made.");
    const { code, error } = await createProfileClaim(child.personId);
    if (error || !code) return setError(error);
    setClaim({ code, expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() });
  }

  const link = claim ? `${window.location.origin}/join/${claim.code}` : "";
  return (
    <div className="grid gap-3">
      {error && <Alert tone="error">{error}</Alert>}
      {claim ? (
        <div className="grid gap-2 rounded-card border-2 border-navy bg-white p-4">
          <p className="text-15 text-body">
            Give {name} this link or code. They make their own login with their own email, and it
            connects to this profile. Nothing to fill in again.
          </p>
          <p className="font-display text-28 font-extrabold tracking-[0.12em] text-navy" aria-label={`Code ${claim.code.split("").join(" ")}`}>
            {showCode(claim.code)}
          </p>
          <p className="break-all text-13 font-semibold text-link">{link}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(link);
                setCopied(true);
              }}
              className="btd-btn-outline min-h-[44px] px-4 text-sm"
            >
              {copied ? "Copied" : "Copy the link"}
            </button>
            <span className="text-12 text-muted">
              Works once, until {new Date(claim.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.
            </span>
            <button type="button" onClick={make} className="min-h-[44px] px-2 text-sm font-semibold text-link hover:underline">
              Make a new one
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={make} className="btd-btn-sky min-h-[48px] justify-self-start gap-2 px-5 text-sm">
          <Icon name="send" size={18} />
          Invite {name}
        </button>
      )}
    </div>
  );
}
