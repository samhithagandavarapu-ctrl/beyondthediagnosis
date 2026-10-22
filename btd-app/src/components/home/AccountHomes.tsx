import { CSSProperties, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { possessive, useAccountMode } from "../../context/AccountModeContext";
import { useMyVoice } from "../../context/MyVoiceContext";
import { openCalmingScreen } from "../CalmingScreen";
import { ForLabel } from "../ModeBanner";
import Icon, { IconName } from "../icons/Icon";
import { useAuth } from "../../context/AuthContext";
import { familyApi, myOldNotes, usernameOf } from "../../lib/family";
import { AddChildForm, ChildAccess } from "../family/ChildCards";

// The two signed-in home pages. A parent's is a tidy dashboard of the tools
// for the person they manage; a self-advocate's is big, bright picture tiles
// with a word or two each. They're meant to look different at a glance.

export function FamilyDashboard() {
  const { managed, forName, family } = useAccountMode();
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  // Notes from before each child had a profile, kept on the parent's own
  // account: offered once, to move onto the child's profile.
  const [oldNotes, setOldNotes] = useState<{ name: string; count: number } | null>(null);
  const [moveNote, setMoveNote] = useState<string | null>(null);
  useEffect(() => {
    if (user) myOldNotes(user.id).then(setOldNotes);
  }, [user, family.children.length]);
  const name = forName ?? "your child";
  const whose = forName ? possessive(forName) : "Your child's";
  const cards: { to: string; icon: IconName; title: string; desc: string; cta: string }[] = [
    {
      to: "/appointment-prep",
      icon: "clipboard",
      title: `Appointment Prep for ${name}`,
      desc: `Turn ${possessive(name)} symptoms, medicines and questions into a one-page summary for the doctor.`,
      cta: "Build a summary",
    },
    {
      to: "/calendar",
      icon: "calendar",
      title: `${whose} Calendar`,
      desc: `Log how ${name} is day by day — pain, sleep, periods, feelings — and spot patterns.`,
      cta: "Open the calendar",
    },
    {
      to: "/me",
      icon: "person",
      title: `${whose} Me board`,
      desc: `How ${name} usually is, shows pain and likes to be talked to. It goes first on every summary.`,
      cta: "Open the Me board",
    },
    {
      to: "/resources",
      icon: "file",
      title: "Resources",
      desc: "Trusted guides by life stage, from NDSS, the Adult Down Syndrome Center and more.",
      cta: "Browse resources",
    },
    {
      to: "/assistant",
      icon: "chat",
      title: "AI Advocate",
      desc: "Ask about rights, accommodations, or how to describe a symptom. It never diagnoses.",
      cta: "Ask a question",
    },
  ];

  return (
    <div className="btd-container py-10 pb-20">
      <ForLabel />
      <h1 className="btd-page-h1 mt-3 font-display text-navy">Family dashboard</h1>
      <p className="mt-2 max-w-[40em] text-17 leading-[1.6] text-body">Everything for {name}, in one place.</p>

      {family.loaded && !managed && (
        <section className="btd-card mt-6 max-w-2xl p-6">
          <h2 className="text-23 font-extrabold text-navy">Add your child</h2>
          <p className="mt-1 mb-5 text-15 text-body">
            {oldNotes?.name
              ? `Set up ${possessive(oldNotes.name)} profile. What you've already written about ${oldNotes.name} moves onto it.`
              : "This is the only place their details go. Later, they can have their own login to the same profile."}
          </p>
          <AddChildForm key={oldNotes?.name ?? ""} defaultName={oldNotes?.name ?? ""} moveMine={Boolean(oldNotes)} />
        </section>
      )}

      {managed && oldNotes && (
        <section className="mt-6 max-w-2xl rounded-card border-2 border-butter bg-butter/30 p-5">
          <p className="text-15 font-bold text-navy">
            You have notes from before each child had their own profile{oldNotes.name ? ` (about ${oldNotes.name})` : ""}.
          </p>
          <p className="mt-1 text-15 text-body">Move them onto a child's profile, so you both see them.</p>
          {moveNote && <p className="mt-2 text-sm font-semibold text-navy">{moveNote}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {family.children.map((c) => (
              <button
                key={c.personId}
                type="button"
                onClick={async () => {
                  const { error } = await familyApi("move-mine", { childId: c.personId });
                  if (error) return setMoveNote(error);
                  setMoveNote(`Moved onto ${possessive(c.name)} profile.`);
                  setOldNotes(null);
                }}
                className="btd-btn-outline min-h-[44px] px-4 text-sm"
              >
                Move to {c.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {managed && (
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="btd-card btd-lift grid content-start gap-2 p-6">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-sky-tint text-navy">
              <Icon name={c.icon} size={22} />
            </span>
            <h2 className="mt-1 text-21 font-bold text-navy">{c.title}</h2>
            <p className="text-15 leading-[1.6] text-body">{c.desc}</p>
            <span className="text-sm font-bold text-link">
              {c.cta} <span className="btd-arrow">→</span>
            </span>
          </Link>
        ))}
      </div>
      )}

      {family.children.length > 0 && (
        <section aria-labelledby="family-logins" className="mt-12">
          <h2 id="family-logins" className="text-23 font-extrabold text-navy">
            Your family
          </h2>
          <p className="mt-1 text-15 text-body">
            Each child has one profile. Their own login connects to it, so anything either of you adds
            shows up for both — except calendar notes they mark “Just for me”.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {family.children.map((c) => (
              <div key={c.personId} className="btd-card grid content-start gap-3 p-5">
                <p className="flex items-center gap-2 text-21 font-extrabold text-navy">
                  <Icon name="person" size={20} />
                  {c.name}
                </p>
                <ChildAccess child={c} />
              </div>
            ))}
          </div>
          {adding ? (
            <div className="btd-card mt-4 max-w-2xl p-5">
              <AddChildForm submitLabel="Add" onAdded={() => setAdding(false)} />
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="btd-btn-sky mt-4 min-h-[48px] gap-2 px-5 text-sm">
              <Icon name="plus" size={18} />
              Add another child
            </button>
          )}
        </section>
      )}
    </div>
  );
}

const TILT = [-1.4, 1.2, -0.8, 1.4, -1];

export function SelfHome() {
  const { myName, family, previewing } = useAccountMode();
  const { user } = useAuth();
  // Someone who signed up on their own, with no grown-up linked yet.
  const canInvite = !previewing && family.loaded && family.grownUps.length === 0 && !usernameOf(user?.email);
  const { say } = useMyVoice();
  const navigate = useNavigate();
  // One coral tile only: the brand keeps coral for the main thing on a page.
  const tiles: { label: string; icon: IconName; bg: string; go: () => void }[] = [
    { label: "My Voice", icon: "hub-feelings", bg: "bg-coral", go: () => navigate("/my-voice") },
    { label: "My Calendar", icon: "calendar", bg: "bg-sky", go: () => navigate("/calendar") },
    { label: "Me", icon: "star", bg: "bg-butter", go: () => navigate("/me") },
    { label: "Calm", icon: "breath", bg: "bg-sky", go: openCalmingScreen },
    { label: "Get ready for the doctor", icon: "hub-visit", bg: "bg-butter", go: () => navigate("/my-voice/practice") },
  ];

  return (
    <div className="btd-grain bg-gradient-to-b from-mist to-sky-tint">
      <div className="btd-container py-10 pb-20">
        <ForLabel />
        <h1 className="mt-3 font-display text-[clamp(2rem,6vw,3.25rem)] font-extrabold leading-tight text-navy">
          Hi {myName || "there"}! What do you want to do?
        </h1>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-6 lg:grid-cols-5">
          {tiles.map((t, i) => (
            <button
              key={t.label}
              type="button"
              onClick={() => {
                say(t.label);
                t.go();
              }}
              style={{ "--tilt": `${TILT[i]}deg` } as CSSProperties}
              className={`btd-sticky ${t.bg} flex min-h-[170px] flex-col items-center justify-center gap-3 p-4 text-center ${
                i === tiles.length - 1 ? "col-span-2 lg:col-span-1" : ""
              }`}
            >
              <span className="grid h-20 w-20 place-items-center rounded-full bg-white/80 text-navy">
                <Icon name={t.icon} size={46} />
              </span>
              <span className="font-display text-23 font-extrabold leading-tight text-navy">{t.label}</span>
            </button>
          ))}
        </div>
        {canInvite && (
          <p className="mt-10 text-15 text-body">
            Want a parent or helper to see your calendar and Me board?{" "}
            <Link to="/profile?section=family" className="font-bold text-link underline underline-offset-2">
              Invite a caregiver
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
