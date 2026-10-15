import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMyVoice } from "../context/MyVoiceContext";
import { fetchProfile, preferredName, savePreferredName, upsertProfile } from "../lib/profile";
import { historyTitle, loadHistory } from "../lib/appointmentHistory";
import { READING_LEVELS } from "../lib/myVoice";
import { shortDate } from "../lib/shortDate";
import Panel from "../components/Panel";
import PageHero from "../components/PageHero";
import PageLoading from "../components/PageLoading";
import PasswordInput from "../components/PasswordInput";
import Icon, { type IconName } from "../components/icons/Icon";

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

/** Changing the email or password on the sign-in. */
function SecurityPanel() {
  const { user, updateEmail, updatePassword } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

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

  return (
    <Panel title="Email & password" intro={`Signed in as ${user?.email || user?.phone || "your account"}.`}>
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
      </div>
    </Panel>
  );
}

/** Deleting the account outright, behind a typed confirmation. */
function DeletePanel({ onCancel }: { onCancel: () => void }) {
  const { deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [deleteText, setDeleteText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      title="Delete account"
      intro="Permanently removes your sign-in and your saved profile details. This can't be undone. Stories you've already sent in stay where they are, so email us if you want one taken down."
    >
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
            onClick={onCancel}
            className="btd-btn-outline px-[18px] py-[11px] text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </Panel>
  );
}

/** One tappable row in the profile menu, like a phone's settings list. */
function MenuRow({
  icon,
  label,
  detail,
  onClick,
  danger,
  chevron = true,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  onClick: () => void;
  danger?: boolean;
  chevron?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-sky-tint focus-visible:bg-sky-tint"
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
          danger ? "bg-coral/25 text-coral-ink" : "bg-sky-tint text-navy"
        }`}
      >
        <Icon name={icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-15 font-bold ${danger ? "text-coral-ink" : "text-navy"}`}>
          {label}
        </span>
        {detail && <span className="block truncate text-13 text-muted">{detail}</span>}
      </span>
      {chevron && <Icon name="chevron-right" size={18} className="text-muted" />}
    </button>
  );
}

const SECTIONS = ["details", "my-voice", "history", "security", "delete"] as const;
type Section = (typeof SECTIONS)[number];

export default function Profile() {
  const { user, loading, signOut } = useAuth();
  const {
    readingLevel,
    setReadingLevel,
    readAloud,
    toggleReadAloud,
    canSpeak,
  } = useMyVoice();

  const [callMe, setCallMe] = useState(() => preferredName(user));
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { hash } = useLocation();
  const [params, setParams] = useSearchParams();
  // Read once: the history only changes on the Appointment Prep page.
  const [appointments] = useState(loadHistory);

  // Keyed on the account id, not the user object: Supabase hands over a new
  // object on every token refresh, and refetching then would overwrite
  // whatever someone is in the middle of typing with the last saved copy.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setFetching(false);
      return;
    }
    setCallMe(preferredName(user));
    fetchProfile(userId).then((profile) => {
      if (profile) {
        setFullName(profile.full_name ?? "");
        setUsername(profile.username ?? "");
        setPhone(profile.phone ?? "");
      }
      setFetching(false);
    });
  }, [userId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const [{ error: profileError }, { error: nameError }] = await Promise.all([
      upsertProfile(user.id, { full_name: fullName, username, phone }),
      callMe.trim() !== preferredName(user) ? savePreferredName(callMe) : { error: null },
    ]);
    const error = profileError || nameError;
    setSaving(false);
    if (error) setError(error);
    else setSaved(true);
  }

  // Which section is open, if any. It lives in the URL so the browser's back
  // button returns to the menu. Old /profile#account links open Email & password.
  const asked = params.get("section");
  const section: Section | null = SECTIONS.includes(asked as Section)
    ? (asked as Section)
    : hash === "#account"
    ? "security"
    : null;

  function open(next: Section | null) {
    setSaved(false);
    setError(null);
    setParams(next ? { section: next } : {});
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [section]);

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
      {!section && (
        <PageHero
          tone="navy"
          eyebrow="Your profile"
          title={greetingName ? `Hello, ${greetingName}` : "Your profile"}
          lede={`Signed in as ${account}. Everything here follows you to any device you sign in on.`}
        />
      )}

      <div className={`btd-container pb-20 ${section ? "pt-8" : "pt-12"}`}>
        <div className="mx-auto max-w-[720px]">
          {section ? (
            <div className="grid gap-5">
              <button
                type="button"
                onClick={() => open(null)}
                className="inline-flex items-center gap-1.5 justify-self-start text-sm font-bold text-link hover:underline"
              >
                ← Profile
              </button>
              {section === "details" && (
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
                      <label htmlFor="p-call" className="mb-1 block text-sm font-bold text-navy">
                        What should we call you?
                      </label>
                      <input
                        id="p-call"
                        className="btd-input"
                        value={callMe}
                        onChange={(e) => setCallMe(e.target.value)}
                        aria-describedby="p-call-hint"
                      />
                      <p id="p-call-hint" className="mt-1 text-12 text-muted">
                        The name we'll use when we reply to your messages.
                      </p>
                    </div>
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
              )}
              {section === "my-voice" && (
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
              )}
              {section === "history" && (
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
              )}
              {section === "security" && <SecurityPanel />}
              {section === "delete" && <DeletePanel onCancel={() => open(null)} />}
            </div>
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
              <section aria-labelledby="settings-heading">
                <h2
                  id="settings-heading"
                  className="mb-2 px-1 text-12 font-bold uppercase tracking-[0.12em] text-muted"
                >
                  Settings
                </h2>
                <div className="btd-card divide-y divide-navy/10 overflow-hidden">
                  <MenuRow
                    icon="person"
                    label="Your details"
                    detail={[fullName, username && `@${username}`].filter(Boolean).join(" · ") || "Name, username, phone"}
                    onClick={() => open("details")}
                  />
                  <MenuRow
                    icon="speaker"
                    label="My Voice settings"
                    detail={`${READING_LEVELS.find((l) => l.id === readingLevel)?.label ?? "Reading level"} · Read aloud ${
                      readAloud && canSpeak ? "on" : "off"
                    }`}
                    onClick={() => open("my-voice")}
                  />
                  <MenuRow
                    icon="clipboard"
                    label="Appointment history"
                    detail={
                      appointments.length === 0
                        ? "None yet"
                        : `${appointments.length} saved on this device`
                    }
                    onClick={() => open("history")}
                  />
                </div>
              </section>

              <section aria-labelledby="account-heading">
                <h2
                  id="account-heading"
                  className="mb-2 px-1 text-12 font-bold uppercase tracking-[0.12em] text-muted"
                >
                  Account
                </h2>
                <div className="btd-card divide-y divide-navy/10 overflow-hidden">
                  <MenuRow
                    icon="lock"
                    label="Email & password"
                    detail={account}
                    onClick={() => open("security")}
                  />
                  <MenuRow
                    icon="sign-out"
                    label="Sign out"
                    chevron={false}
                    onClick={() => signOut()}
                  />
                  <MenuRow
                    icon="trash"
                    label="Delete account"
                    danger
                    onClick={() => open("delete")}
                  />
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
