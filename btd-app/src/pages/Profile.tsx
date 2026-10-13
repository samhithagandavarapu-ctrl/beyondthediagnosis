import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMyVoice } from "../context/MyVoiceContext";
import { fetchProfile, upsertProfile } from "../lib/profile";
import { historyTitle, loadHistory } from "../lib/appointmentHistory";
import { READING_LEVELS } from "../lib/myVoice";
import { shortDate } from "../lib/shortDate";
import Panel from "../components/Panel";
import PageHero from "../components/PageHero";
import PageLoading from "../components/PageLoading";
import PasswordInput from "../components/PasswordInput";

function ToggleRow({
  label,
  description,
  on,
  onToggle,
  disabled,
}: {
  label: string;
  description: string;
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={`flex w-full items-center gap-4 rounded-tile border-2 px-4 py-3 text-left transition-colors disabled:opacity-50 ${
        on ? "border-navy bg-sky-tint" : "border-navy/15 hover:border-sky"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-navy">{label}</span>
        <span className="block text-13 leading-[1.5] text-muted">{description}</span>
      </span>
      <span
        aria-hidden="true"
        className={`shrink-0 rounded-full px-2.5 py-1 text-11 font-bold uppercase tracking-[0.1em] ${
          on ? "bg-navy text-mist" : "bg-navy/10 text-muted"
        }`}
      >
        {on ? "On" : "Off"}
      </span>
    </button>
  );
}

function Message({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink"
          : "rounded border border-sky bg-sky-tint px-3 py-2 text-sm text-sky-ink"
      }
    >
      {children}
    </p>
  );
}

/** Everything about the sign-in itself: email, password, signing out, and
 *  deleting the account outright. */
function AccountPanel() {
  const { user, updateEmail, updatePassword, deleteAccount, signOut } = useAuth();
  const navigate = useNavigate();

  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailBusy(true);
    setEmailMsg(null);
    const target = newEmail.trim();
    const { error } = await updateEmail(target);
    setEmailBusy(false);
    if (error) setEmailMsg({ tone: "error", text: error });
    else {
      setNewEmail("");
      setEmailMsg({
        tone: "ok",
        text: `We sent a confirmation link to ${target}. Your email changes once you click it — if you also get one at your current address, click that too.`,
      });
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ tone: "error", text: "Those two passwords don't match." });
      return;
    }
    setPasswordBusy(true);
    const { error } = await updatePassword(newPassword);
    setPasswordBusy(false);
    if (error) setPasswordMsg({ tone: "error", text: error });
    else {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ tone: "ok", text: "Password updated." });
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (deleteText.trim().toUpperCase() !== "DELETE") return;
    setDeleteBusy(true);
    setDeleteError(null);
    const { error } = await deleteAccount();
    setDeleteBusy(false);
    if (error) setDeleteError(error);
    else navigate("/login", { replace: true, state: { accountDeleted: true } });
  }

  return (
    <Panel
      id="account"
      title="Account"
      intro={`Signed in as ${user?.email || user?.phone || "your account"}.`}
    >
      <div className="grid gap-7">
        <form onSubmit={handleEmail} className="grid gap-3">
          <h3 className="text-base font-bold text-navy">
            {user?.email ? "Change email" : "Add an email"}
          </h3>
          {emailMsg && <Message tone={emailMsg.tone}>{emailMsg.text}</Message>}
          <label htmlFor="a-email" className="sr-only">
            New email
          </label>
          <input
            id="a-email"
            type="email"
            required
            className="btd-input"
            placeholder="New email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button
            type="submit"
            disabled={emailBusy}
            className="btd-btn-outline justify-self-start px-[18px] py-[11px] text-sm disabled:opacity-50"
          >
            {emailBusy ? "Sending…" : "Send confirmation link"}
          </button>
        </form>

        <form onSubmit={handlePassword} className="grid gap-3">
          <h3 className="text-base font-bold text-navy">Change password</h3>
          {passwordMsg && <Message tone={passwordMsg.tone}>{passwordMsg.text}</Message>}
          <label htmlFor="a-password" className="sr-only">
            New password
          </label>
          <PasswordInput
            id="a-password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="New password (at least 6 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <label htmlFor="a-password2" className="sr-only">
            Type the new password again
          </label>
          <PasswordInput
            id="a-password2"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Type it again"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={passwordBusy}
            className="btd-btn-outline justify-self-start px-[18px] py-[11px] text-sm disabled:opacity-50"
          >
            {passwordBusy ? "Saving…" : "Update password"}
          </button>
        </form>

        <div className="grid gap-3">
          <h3 className="text-base font-bold text-navy">Sign out</h3>
          <button
            type="button"
            onClick={() => signOut()}
            className="btd-btn-outline justify-self-start px-[18px] py-[11px] text-sm"
          >
            Sign out on this device
          </button>
        </div>

        <div className="grid gap-3 rounded-tile border-2 border-coral/60 p-5">
          <h3 className="text-base font-bold text-coral-ink">Delete account</h3>
          <p className="text-13 leading-[1.5] text-body">
            Permanently removes your sign-in and your saved profile details. This can't be
            undone. Stories you've already sent in stay where they are, so email us if you
            want one taken down.
          </p>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="justify-self-start rounded-lg border-2 border-coral px-[18px] py-[9px] text-sm font-bold text-coral-ink hover:bg-coral/20"
            >
              Delete my account…
            </button>
          ) : (
            <form onSubmit={handleDelete} className="grid gap-3">
              {deleteError && <Message tone="error">{deleteError}</Message>}
              <label htmlFor="a-delete" className="text-sm font-bold text-navy">
                Type DELETE to confirm
              </label>
              <input
                id="a-delete"
                className="btd-input"
                autoComplete="off"
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={deleteBusy || deleteText.trim().toUpperCase() !== "DELETE"}
                  className="rounded-lg bg-coral-ink px-[18px] py-[11px] text-sm font-bold text-white disabled:opacity-50"
                >
                  {deleteBusy ? "Deleting…" : "Permanently delete my account"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(false);
                    setDeleteText("");
                    setDeleteError(null);
                  }}
                  className="btd-btn-outline px-[18px] py-[11px] text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Panel>
  );
}

export default function Profile() {
  const { user, loading } = useAuth();
  const {
    readingLevel,
    setReadingLevel,
    readAloud,
    toggleReadAloud,
    canSpeak,
  } = useMyVoice();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { hash } = useLocation();
  // Read once: the history only changes on the Appointment Prep page.
  const [appointments] = useState(loadHistory);

  useEffect(() => {
    if (!user) {
      setFetching(false);
      return;
    }
    fetchProfile(user.id).then((profile) => {
      if (profile) {
        setFullName(profile.full_name ?? "");
        setUsername(profile.username ?? "");
        setPhone(profile.phone ?? "");
      }
      setFetching(false);
    });
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error } = await upsertProfile(user.id, {
      full_name: fullName,
      username,
      phone,
    });
    setSaving(false);
    if (error) setError(error);
    else setSaved(true);
  }

  // "Manage your account" links to /profile#account; the page only exists once
  // the profile has loaded, so scroll there after that.
  const ready = !loading && !fetching && Boolean(user);
  useEffect(() => {
    if (ready && hash === "#account") {
      document.getElementById("account")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [ready, hash]);

  if (loading || fetching) return <PageLoading label="Loading your profile…" />;

  if (!user) {
    return (
      <div>
        <PageHero
          eyebrow="Your profile"
          title="Sign in to see your profile"
          lede="Your profile keeps your details, your display settings, and your My Voice progress — and carries them to any device you sign in on."
        />
        <div className="btd-container py-14">
          <Link to="/login" className="btd-btn-coral px-[18px] py-[11px] text-sm">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const account = user.email || user.phone || "your account";
  const greetingName = fullName.trim().split(/\s+/)[0] || username.trim();

  return (
    <div>
      <PageHero
        tone="navy"
        eyebrow="Your profile"
        title={greetingName ? `Hello, ${greetingName}` : "Your profile"}
        lede={`Signed in as ${account}. Everything here follows you to any device you sign in on.`}
      />

      <div className="btd-container pt-12 pb-20">
        <div className="mx-auto grid max-w-[720px] gap-6">
          <Panel
            title="Your details"
            intro="Only what you choose to fill in. None of it is required to use anything on the site."
          >
            <form onSubmit={handleSave} className="grid gap-4">
              {error && (
                <p className="rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
                  {error}
                </p>
              )}
              {saved && (
                <p className="rounded border border-sky bg-sky-tint px-3 py-2 text-sm text-sky-ink">
                  Saved.
                </p>
              )}
              <div>
                <label htmlFor="p-name" className="mb-1 block text-sm font-bold text-navy">
                  Full name
                </label>
                <input
                  id="p-name"
                  className="btd-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="p-username" className="mb-1 block text-sm font-bold text-navy">
                  Username
                </label>
                <input
                  id="p-username"
                  className="btd-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="p-phone" className="mb-1 block text-sm font-bold text-navy">
                  Phone number
                </label>
                <input
                  id="p-phone"
                  type="tel"
                  className="btd-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 555 5555"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="btd-btn-outline justify-self-start px-[18px] py-[11px] text-sm disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </form>
          </Panel>

          <Panel
            title="My Voice settings"
            intro={
              <>
                Settings for the{" "}
                <Link to="/my-voice" className="font-semibold text-link hover:underline">
                  My Voice
                </Link>{" "}
                section. They save as you pick — there's nothing to submit.
              </>
            }
          >
            <div className="grid gap-2">
              {READING_LEVELS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  aria-pressed={readingLevel === level.id}
                  onClick={() => setReadingLevel(level.id)}
                  className={`rounded-tile border-2 px-4 py-3 text-left transition-colors ${
                    readingLevel === level.id
                      ? "border-navy bg-sky-tint"
                      : "border-navy/15 hover:border-sky"
                  }`}
                >
                  <span className="block text-sm font-bold text-navy">{level.label}</span>
                  <span className="block text-13 leading-[1.5] text-muted">
                    {level.description}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-2">
              <ToggleRow
                label="Read labels aloud"
                description={
                  canSpeak
                    ? "Speaks a label when you tap it."
                    : "This browser can't speak text, so this is unavailable."
                }
                on={readAloud && canSpeak}
                onToggle={toggleReadAloud}
                disabled={!canSpeak}
              />
            </div>
          </Panel>

          <Panel
            title="Appointment history"
            intro="Summaries you've made in Appointment Prep. They're kept on this device only — never uploaded — so they won't show on another device."
          >
            {appointments.length === 0 ? (
              <p className="text-sm text-body">
                None yet. Each time you generate a summary in{" "}
                <Link to="/appointment-prep" className="font-semibold text-link hover:underline">
                  Appointment Prep
                </Link>
                , a copy is saved here.
              </p>
            ) : (
              <>
                <ul className="grid gap-2">
                  {appointments.slice(0, 3).map((entry) => (
                    <li key={entry.id} className="rounded-tile bg-sky-tint px-4 py-3">
                      <span className="block text-12 font-bold uppercase tracking-[0.1em] text-muted">
                        {shortDate(entry.savedAt)}
                      </span>
                      <span className="block text-sm font-bold text-navy break-words">
                        {historyTitle(entry.form)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/appointment-prep#history"
                  className="mt-3 inline-block text-13 font-semibold text-link hover:underline"
                >
                  {appointments.length > 3
                    ? `See all ${appointments.length} →`
                    : "Open, print, or reuse them →"}
                </Link>
              </>
            )}
            <Link
              to="/privacy"
              className="mt-3 block text-13 font-semibold text-link hover:underline"
            >
              What we store, in plain language →
            </Link>
          </Panel>

          <AccountPanel />
        </div>
      </div>
    </div>
  );
}
