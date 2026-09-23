import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { useMyVoice } from "../context/MyVoiceContext";
import { fetchProfile, upsertProfile } from "../lib/profile";
import {
  READING_LEVELS,
  STICKER_KINDS,
  checkInLines,
  feeling,
  stickerKind,
} from "../lib/myVoice";
import Icon from "../components/icons/Icon";
import PageHero from "../components/PageHero";
import PageLoading from "../components/PageLoading";

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
  title,
  intro,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="btd-card p-7">
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
              {stickers.length} of {STICKER_KINDS.length}
            </span>
            <StickerMeter earned={stickers.length} />
            <span className="mt-1.5 block text-13 leading-[1.5] text-muted">
              {stickers.length === STICKER_KINDS.length
                ? "All of them. Nothing left to collect."
                : `${STICKER_KINDS.length - stickers.length} still to collect, whenever you want to.`}
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

            <Panel
              title="Sticker book"
              intro="Earned by doing things, not by showing up daily. Nothing expires and nothing is lost by taking a break."
            >
              <ul className="grid gap-3 sm:grid-cols-2">
                {STICKER_KINDS.map((kind) => {
                  const earned = stickers.find((s) => s.id === kind.id);
                  const meta = stickerKind(kind.id);
                  return (
                    <li
                      key={kind.id}
                      className={`flex items-start gap-3 rounded-tile border-2 p-4 ${
                        earned ? "border-navy bg-butter" : "border-dashed border-navy/20"
                      }`}
                    >
                      <Icon
                        name={meta.art}
                        size={36}
                        className={`shrink-0 ${earned ? "text-butter-ink" : "text-navy/30"}`}
                      />
                      <div className="min-w-0">
                        <span
                          className={`block text-sm font-bold ${
                            earned ? "text-butter-ink" : "text-muted"
                          }`}
                        >
                          {meta.label}
                        </span>
                        <span
                          className={`mt-0.5 block text-13 leading-[1.5] ${
                            earned ? "text-butter-ink/80" : "text-muted"
                          }`}
                        >
                          {earned ? `Earned ${shortDate(earned.at)}` : `Not yet — ${meta.earnedFor}`}
                        </span>
                      </div>
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

            <section className="rounded-card border border-navy/12 bg-sky-tint p-7">
              <h2 className="text-21 font-extrabold text-sky-ink">What isn't kept here</h2>
              <p className="mt-2 text-15 leading-[1.65] text-sky-ink">
                Appointment summaries and voice notes are never uploaded — they live in the
                tab you made them in, and you download the summary yourself. So there's no
                appointment history on this page to show you, by design.
              </p>
              <Link
                to="/privacy"
                className="mt-3 inline-block text-13 font-semibold text-link hover:underline"
              >
                What we store, in plain language →
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
