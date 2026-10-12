import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { useMyVoice } from "../context/MyVoiceContext";
import { fetchProfile, upsertProfile } from "../lib/profile";
import { submitStory } from "../lib/stories";
import { authEnabled } from "../lib/supabaseClient";
import { historyTitle, loadHistory } from "../lib/appointmentHistory";
import {
  READING_LEVELS,
  STICKER_KINDS,
  checkInLines,
  feeling,
  stickerKind,
} from "../lib/myVoice";
import Icon from "../components/icons/Icon";
import StickerBadge from "../components/myvoice/StickerBadge";
import PageHero from "../components/PageHero";
import PageLoading from "../components/PageLoading";
import PasswordInput from "../components/PasswordInput";

/** A short, human date: "today", "yesterday", or "12 Mar". Avoids a relative
 *  "3 days ago" that goes stale while the tab sits open. */
function shortDate(iso: string) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** One headline number and what it means. No plot: at this scale a number read
 *  straight is clearer than any chart of it. */
function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="btd-card p-5">
      <span className="block text-12 font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <span className="mt-2 block text-28 font-extrabold leading-none text-navy">{value}</span>
      <span className="mt-1.5 block text-13 leading-[1.5] text-muted">{detail}</span>
    </div>
  );
}

/** Four segments, one per sticker there is to earn. The count is written out
 *  beside it, so the meter is never the only thing carrying the number. */
function StickerMeter({ earned }: { earned: number }) {
  return (
    <div className="mt-2 flex gap-1.5" role="img" aria-label={`${earned} of ${STICKER_KINDS.length} stickers earned`}>
      {STICKER_KINDS.map((kind, i) => (
        <span
          key={kind.id}
          className={`h-2 flex-1 rounded-sm ${i < earned ? "bg-sky" : "bg-navy/12"}`}
        />
      ))}
    </div>
  );
}

function Panel({
  id,
  title,
  intro,
  children,
}: {
  id?: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="btd-card p-7 scroll-mt-24">
      <h2 className="text-23 font-extrabold text-navy">{title}</h2>
      {intro && <p className="mt-1.5 text-15 leading-[1.6] text-body">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

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

const AUDIENCES = ["Self-advocate", "Parent", "Caregiver", "Clinician"] as const;

/** Share a story without leaving the profile.
 *
 *  Being signed in is the whole point: the name is already known, so the form
 *  is three fields instead of four, and it's somewhere you'll come back to —
 *  rather than a page you have to find your way to from Stories. */
function StoryPanel({ defaultName }: { defaultName: string }) {
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>("Parent");
  const [excerpt, setExcerpt] = useState("");
  const [consent, setConsent] = useState(false);
  // Honeypot: real people never fill this in, bots often do.
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (website) return;
    if (!consent) {
      setError("Please confirm you're okay with this being reviewed for publishing.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error } = await submitStory({
      title,
      audience,
      excerpt,
      submitter_name: defaultName,
    });
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    setTitle("");
    setExcerpt("");
    setConsent(false);
    setDone(true);
  }

  return (
    <Panel
      title="Share a story"
      intro={
        <>
          Real experiences help other families see what's possible. Everything is
          reviewed before it appears on{" "}
          <Link to="/stories" className="font-semibold text-link hover:underline">
            Community Stories
          </Link>{" "}
          — nothing goes live on its own.
        </>
      }
    >
      {!authEnabled ? (
        <p className="rounded-tile bg-butter p-4 text-sm text-butter-ink">
          Submissions need the Supabase project connected — see the README.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4">
          {error && (
            <p className="rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
              {error}
            </p>
          )}
          {done && (
            <p className="rounded border border-sky bg-sky-tint px-3 py-2 text-sm text-sky-ink">
              Sent for review. It won't appear on the Stories page right away — someone
              reads every submission first. You can write another below.
            </p>
          )}

          <div>
            <label htmlFor="s-title" className="mb-1 block text-sm font-bold text-navy">
              Title
            </label>
            <input
              id="s-title"
  required
              className="btd-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What would you call this?"
            />
          </div>

          <div>
            <label htmlFor="s-audience" className="mb-1 block text-sm font-bold text-navy">
              You're writing as
            </label>
            <select
              id="s-audience"
              className="btd-input"
              value={audience}
              onChange={(e) => setAudience(e.target.value as (typeof AUDIENCES)[number])}
            >
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="s-excerpt" className="mb-1 block text-sm font-bold text-navy">
              Your story
            </label>
            <textarea
              id="s-excerpt"
  required
              rows={5}
              className="btd-input"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="What happened, and what you wish had gone differently."
            />
            <p className="mt-1 text-13 text-muted">
              Please leave out anything that identifies a provider or clinic by name.
            </p>
          </div>

          <label className="flex items-start gap-3 text-13 leading-[1.5] text-body">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              I'm okay with this being reviewed and published on Voiced
              {defaultName ? `, credited to "${defaultName}"` : ", with no name attached"}.
            </span>
          </label>

          {/* Honeypot — hidden from people, tempting to bots. */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />

          <button
            type="submit"
            disabled={submitting}
            className="btd-btn-sky justify-self-start px-[18px] py-[11px] text-sm disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send for review"}
          </button>
        </form>
      )}
    </Panel>
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
  const { largeText, highContrast, easyRead, toggleLargeText, toggleHighContrast, toggleEasyRead } =
    useAccessibility();
  const {
    readingLevel,
    setReadingLevel,
    readAloud,
    toggleReadAloud,
    canSpeak,
    savedCheckIn,
    clearCheckIn,
    stickers,
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
  const modesOn = [largeText, highContrast, easyRead].filter(Boolean).length;
  const modeNames =
    [largeText && "Large text", highContrast && "High contrast", easyRead && "Easy read"]
      .filter(Boolean)
      .join(", ") || "None turned on";
  const levelLabel =
    READING_LEVELS.find((l) => l.id === readingLevel)?.label ?? "Pictures and short words";
  const earnedIds = new Set(stickers.map((s) => s.id));

  return (
    <div>
      <PageHero
        tone="navy"
        eyebrow="Your profile"
        title={greetingName ? `Hello, ${greetingName}` : "Your profile"}
        lede={`Signed in as ${account}. Everything here follows you to any device you sign in on.`}
      />

      <div className="btd-container grid gap-6 pt-12 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="btd-card p-5">
            <span className="block text-12 font-bold uppercase tracking-[0.12em] text-muted">
              Stickers earned
            </span>
            <span className="mt-2 block text-28 font-extrabold leading-none text-navy">
              {earnedIds.size} of {STICKER_KINDS.length}
            </span>
            <StickerMeter earned={earnedIds.size} />
            <span className="mt-1.5 block text-13 leading-[1.5] text-muted">
              {earnedIds.size === STICKER_KINDS.length
                ? "All of them. Nothing left to collect."
                : `${STICKER_KINDS.length - earnedIds.size} still to collect, whenever you want to.`}
            </span>
          </div>
          <StatTile
            label="Last check-in"
            value={savedCheckIn ? shortDate(savedCheckIn.createdAt) : "None yet"}
            detail={
              savedCheckIn
                ? "Saved on this device, ready for your next visit."
                : "Do one in My Voice whenever you're ready."
            }
          />
          <StatTile
            label="Reading level"
            value={levelLabel}
            detail="How much text My Voice shows you."
          />
          <StatTile
            label="Display modes"
            value={`${modesOn} of 3`}
            detail={modeNames}
          />
        </div>

        <div className="grid gap-6 items-start lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="grid gap-6">
            <Panel
              title="Your last check-in"
              intro={
                savedCheckIn ? (
                  <>
                    Kept on this device only — never uploaded. Bring it to an appointment
                    through{" "}
                    <Link to="/appointment-prep" className="font-semibold text-link hover:underline">
                      Appointment Prep
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    Nothing saved yet.{" "}
                    <Link to="/my-voice" className="font-semibold text-link hover:underline">
                      My Voice
                    </Link>{" "}
                    walks you through one — tap a body part, tap a face, done.
                  </>
                )
              }
            >
              {savedCheckIn ? (
                <div className="rounded-tile bg-sky-tint p-5">
                  <div className="flex items-start gap-4">
                    {savedCheckIn.overall && (
                      <Icon
                        name={feeling(savedCheckIn.overall).icon}
                        size={40}
                        className="shrink-0 text-navy"
                      />
                    )}
                    <div className="min-w-0">
                      {checkInLines(savedCheckIn).map((line, i) => (
                        <p
                          key={i}
                          className={`text-base leading-[1.6] text-sky-ink ${i > 0 ? "mt-1.5" : ""}`}
                        >
                          {line}
                        </p>
                      ))}
                      <p className="mt-3 text-13 text-muted">
                        Saved {shortDate(savedCheckIn.createdAt)}.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearCheckIn}
                    className="mt-4 text-13 font-semibold text-link hover:underline"
                  >
                    Delete this check-in
                  </button>
                </div>
              ) : (
                <Link to="/my-voice" className="btd-btn-sky px-[18px] py-[11px] text-sm">
                  Start a check-in
                </Link>
              )}
            </Panel>

            <StoryPanel defaultName={fullName.trim() || username.trim()} />

            <Panel
              title="Sticker book"
              intro="Earned by doing things, not by showing up daily. Nothing expires and nothing is lost by taking a break."
            >
              <ul className="grid gap-5 sm:grid-cols-2">
                {STICKER_KINDS.map((kind) => {
                  const earned = stickers.find((s) => s.id === kind.id);
                  const meta = stickerKind(kind.id);
                  return (
                    <li key={kind.id} className="flex flex-col items-center text-center">
                      <StickerBadge id={kind.id} earned={Boolean(earned)} size={124} />
                      <span className="mt-2 text-sm font-bold text-navy">{meta.label}</span>
                      <span className="mt-0.5 text-13 leading-[1.5] text-muted">
                        {earned ? `Earned ${shortDate(earned.at)}` : `Not yet — ${meta.earnedFor}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Panel>

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
          </div>

          <div className="grid gap-6">
            <Panel
              title="Display"
              intro="The same three switches as the bar at the top of every page. They save to your profile, so they follow you to another device."
            >
              <div className="grid gap-2">
                <ToggleRow
                  label="Large text"
                  description="Scales every size on the site, not just body copy."
                  on={largeText}
                  onToggle={toggleLargeText}
                />
                <ToggleRow
                  label="High contrast"
                  description="Stronger borders and darker text against the background."
                  on={highContrast}
                  onToggle={toggleHighContrast}
                />
                <ToggleRow
                  label="Easy read"
                  description="Shorter lines, more space, simpler wording where there's a choice."
                  on={easyRead}
                  onToggle={toggleEasyRead}
                />
              </div>
            </Panel>

            <Panel
              title="My Voice"
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
    </div>
  );
}
