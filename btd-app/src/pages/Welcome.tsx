import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMyVoice } from "../context/MyVoiceContext";
import { usePracticeMode } from "../context/PracticeModeContext";
import { AgeGroup, UserRole, useSetup } from "../context/SetupContext";
import { ME_NOTES, MeBoard, NoteId, boardTitle, emptyBoard, filledNotes, meNote } from "../lib/meBoard";
import { READING_LEVELS, ReadingLevel } from "../lib/myVoice";
import { BoardGrid, NoteEditor, noteQuestion } from "../components/meboard/MeBoardParts";
import SpeakButton from "../components/myvoice/SpeakButton";
import StickerBadge from "../components/myvoice/StickerBadge";
import Icon, { IconName } from "../components/icons/Icon";
import { RELATIONS } from "./Me";

// The welcome setup, right after an account is made (and once for accounts
// made before it existed). Who are you? Then, for someone here for
// themselves, how they like to read and their Me board, a note at a time;
// for a grown-up, who they're helping and that person's board; a provider
// goes straight to For Providers.
//
// Everything saves as it goes (the board to the same place as the Me page),
// except in practice mode, where nothing is saved at all. Under 13, nothing
// is saved: a grown-up sets it up with them.

type Step =
  | { kind: "role" }
  | { kind: "age" }
  | { kind: "under13" }
  | { kind: "read" }
  | { kind: "who" }
  | { kind: "tip" }
  | { kind: "note"; id: NoteId }
  | { kind: "more" }
  | { kind: "done" };

const FIRST: NoteId[] = ["usual", "hurt", "talk"];
const REST: NoteId[] = ME_NOTES.map((n) => n.id).filter((id) => !FIRST.includes(id));

/** The steps for this path, in order — what the progress dots count. */
function pathFor(role: UserRole | null, keepGoing: boolean): Step["kind"][] {
  const notes: Step["kind"][] = [...FIRST.map(() => "note" as const), "more", ...(keepGoing ? REST.map(() => "note" as const) : [])];
  if (role === "caregiver") return ["role", "who", "tip", ...notes, "done"];
  return ["role", "age", "read", ...notes, "done"];
}

export default function Welcome() {
  const { user } = useAuth();
  const { practice } = usePracticeMode();
  const { setup, saveSetup } = useSetup();
  const { meBoard, saveMeBoard, readingLevel, setReadingLevel, earnSticker, say } = useMyVoice();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get("next") ?? "/";
  const next = requested.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/welcome") ? requested : "/";

  const [history, setHistory] = useState<Step[]>([{ kind: "role" }]);
  const step = history[history.length - 1];
  const [role, setRole] = useState<UserRole | null>(null);
  const [keepGoing, setKeepGoing] = useState(false);
  const [level, setLevel] = useState<ReadingLevel>(readingLevel);
  // The board being filled in here, starting from whatever is already saved.
  const [board, setBoard] = useState<MeBoard>(() => meBoard ?? emptyBoard());
  const [helpName, setHelpName] = useState(meBoard?.aboutName ?? "");
  const [relation, setRelation] = useState(meBoard?.relation ?? "");

  // The saved board can arrive after this page opens (it loads with the
  // account): start from it, unless something has been typed here already.
  const { meBoardLoaded } = useMyVoice();
  const touched = useRef(false);
  useEffect(() => {
    if (!meBoardLoaded || touched.current) return;
    setBoard(meBoard ?? emptyBoard());
    setHelpName(meBoard?.aboutName ?? "");
    setRelation(meBoard?.relation ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meBoardLoaded]);

  const forOther = role === "caregiver";
  const name = forOther ? helpName.trim() || null : null;
  // Grown-ups read the full questions; a self-advocate's choice sets theirs.
  const shownLevel: ReadingLevel = forOther ? "full" : level;

  function go(s: Step) {
    setHistory((h) => [...h, s]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function back() {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  }

  async function finish(status: "done" | "skipped", to = next) {
    await saveSetup({ status });
    navigate(to, { replace: true });
  }

  // ---- Choosing who you are ----

  async function pickRole(r: UserRole) {
    setRole(r);
    if (r === "provider") {
      await saveSetup({ role: r, status: "done" });
      navigate("/provider-education", { replace: true });
      return;
    }
    if (r === "caregiver") {
      await saveSetup({ role: r });
      go({ kind: "who" });
      return;
    }
    // Here for themselves: nothing is saved until we know they're 13 or older.
    go({ kind: "age" });
  }

  async function pickAge(age: AgeGroup | "under13") {
    if (age === "under13") {
      go({ kind: "under13" });
      return;
    }
    await saveSetup({ role: "self", ageGroup: age });
    // A board for themselves is about them, not someone else.
    setBoard((b) => ({ ...b, aboutName: "", relation: "" }));
    go({ kind: "read" });
  }

  function pickLevel(l: ReadingLevel) {
    setLevel(l);
    // The same setting My Voice uses. Practice mode changes nothing.
    if (!practice) setReadingLevel(l);
    say(READING_LEVELS.find((x) => x.id === l)?.label ?? "");
    go({ kind: "note", id: FIRST[0] });
  }

  // ---- The board ----

  async function keepBoard(b: MeBoard) {
    touched.current = true;
    setBoard(b);
    await saveMeBoard(b); // does nothing in practice mode
  }

  async function noteDone(id: NoteId, skip = false) {
    if (!skip) await keepBoard(board);
    const order = keepGoing ? [...FIRST, ...REST] : FIRST;
    const i = order.indexOf(id);
    if (i < order.length - 1) go({ kind: "note", id: order[i + 1] });
    else if (!keepGoing) go({ kind: "more" });
    else go({ kind: "done" });
  }

  // Finishing earns a sticker (once), for someone here for themselves.
  const stickered = useRef(false);
  useEffect(() => {
    if (step.kind !== "done") return;
    saveSetup({ status: "done" });
    if (!forOther && !stickered.current) {
      stickered.current = true;
      earnSticker("made-my-board");
    }
    say(forOther ? `${boardTitle(board)} is ready!` : "Your board is ready! You got a sticker.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind]);

  if (!user) {
    return (
      <Frame title="Welcome to Voiced" spoken="Welcome to Voiced" dots={null}>
        <p className="text-17 text-body">
          <Link to="/login" className="font-bold text-link underline">
            Sign in
          </Link>{" "}
          to set up your account.
        </p>
      </Frame>
    );
  }

  const path = pathFor(role ?? setup.role, keepGoing);
  const dots = { at: Math.min(history.length - 1, path.length - 1), of: path.length };
  const canBack = history.length > 1;
  const skipAll =
    step.kind !== "under13" && step.kind !== "done" ? (
      <button type="button" onClick={() => finish("skipped")} className="min-h-[44px] text-sm font-bold text-link underline underline-offset-2 hover:text-navy">
        Skip for now
      </button>
    ) : null;

  if (step.kind === "role") {
    const q = "Who is Voiced for today?";
    return (
      <Frame title={q} spoken={`${q} I'm here for me. I'm a parent or caregiver. I'm a provider.`} dots={dots} topRight={skipAll}>
        <p className="-mt-2 mb-5 text-15 text-body">Pick one. You can change it later in My account.</p>
        <div className="grid gap-4">
          <BigChoice icon="face-great" label="I'm here for me" hint="I have Down syndrome, and this is for me." tone="coral" onClick={() => pickRole("self")} />
          <BigChoice icon="heart" label="I'm a parent or caregiver" hint="I help someone with Down syndrome." tone="butter" onClick={() => pickRole("caregiver")} />
          <BigChoice icon="stethoscope" label="I'm a provider" hint="I care for patients in my work." tone="sky" onClick={() => pickRole("provider")} />
        </div>
      </Frame>
    );
  }

  if (step.kind === "age") {
    const q = "How old are you?";
    return (
      <Frame title={q} spoken={`${q} Under 13. 13 to 17. 18 or older.`} dots={dots} onBack={back} topRight={skipAll}>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["under13", "Under 13"],
              ["13-17", "13 to 17"],
              ["18+", "18 or older"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => pickAge(v)}
              className="btd-sticky bg-butter min-h-[96px] px-4 py-5 text-center font-display text-23 font-extrabold text-navy"
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-5 text-13 text-muted">We only keep the group you pick, never your birthday.</p>
      </Frame>
    );
  }

  if (step.kind === "under13") {
    const q = "Let's get a grown-up to help!";
    const line = "Ask your parent or caregiver to make your account with you.";
    return (
      <Frame title={q} spoken={`${q} ${line}`} dots={null} onBack={back}>
        <div className="btd-sticky bg-coral flex items-center gap-4 p-5">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/80 text-navy">
            <Icon name="person-plus" size={34} />
          </span>
          <p className="text-17 font-semibold leading-snug text-navy">{line}</p>
        </div>
        <p className="mt-4 text-13 text-muted">Nothing has been saved.</p>
        <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={async () => {
              setRole("caregiver");
              await saveSetup({ role: "caregiver" });
              go({ kind: "who" });
            }}
            className="btd-btn-coral min-h-[56px] gap-2 px-6 text-base"
          >
            I'm the grown-up — set it up together
            <Icon name="chevron-right" size={20} />
          </button>
        </div>
      </Frame>
    );
  }

  if (step.kind === "read") {
    const q = "How do you like to read?";
    const icons: Record<ReadingLevel, IconName> = { icon: "eye", "icon-text": "card", full: "book" };
    return (
      <Frame title={q} spoken={`${q} ${READING_LEVELS.map((l) => l.label).join(". ")}.`} dots={dots} onBack={back} topRight={skipAll}>
        <div className="grid gap-3">
          {READING_LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={level === l.id}
              onClick={() => pickLevel(l.id)}
              className={`flex min-h-[72px] items-center gap-4 rounded-tile border-2 px-4 py-3 text-left transition-colors ${
                level === l.id ? "border-navy bg-sky-tint" : "border-navy/15 bg-white hover:border-sky"
              }`}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky-tint text-navy">
                <Icon name={icons[l.id]} size={26} />
              </span>
              <span>
                <span className="block text-17 font-bold text-navy">{l.label}</span>
                <span className="block text-13 text-muted">{l.description}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-13 text-muted">You can change this any time in My Voice.</p>
      </Frame>
    );
  }

  if (step.kind === "who") {
    const q = "Who are you helping?";
    return (
      <Frame title={q} spoken={q} dots={dots} onBack={back} topRight={skipAll}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const b = { ...board, aboutName: helpName.trim(), relation };
            await keepBoard(b);
            go({ kind: "tip" });
          }}
          className="grid gap-5"
        >
          <label className="grid gap-1.5 text-15 font-bold text-navy">
            Their first name or nickname
            <input
              className="btd-input text-base"
              value={helpName}
              required
              autoComplete="off"
              onChange={(e) => {
                touched.current = true;
                setHelpName(e.target.value);
              }}
            />
          </label>
          <fieldset>
            <legend className="mb-2 text-15 font-bold text-navy">How are you related?</legend>
            <div className="flex flex-wrap gap-2">
              {RELATIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={relation === r}
                  onClick={() => setRelation(r)}
                  className={`min-h-[48px] rounded-full border-2 px-5 text-15 font-bold transition-colors ${
                    relation === r ? "border-navy bg-navy text-mist" : "border-navy/15 bg-white text-navy hover:border-sky"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </fieldset>
          <button type="submit" disabled={!helpName.trim()} className="btd-btn-coral min-h-[56px] justify-self-start gap-2 px-8 text-base disabled:opacity-40">
            Next
            <Icon name="chevron-right" size={20} />
          </button>
        </form>
      </Frame>
    );
  }

  if (step.kind === "tip") {
    const tip = `Fill this in together with ${name ?? "them"} if you can. They know themselves best.`;
    return (
      <Frame title={`All about ${name ?? "them"}`} spoken={tip} dots={dots} onBack={back} topRight={skipAll}>
        <div className="btd-sticky bg-sky flex items-start gap-4 p-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/80 text-navy">
            <Icon name="light" size={26} />
          </span>
          <p className="text-17 font-semibold leading-snug text-navy">{tip}</p>
        </div>
        <button type="button" onClick={() => go({ kind: "note", id: FIRST[0] })} className="btd-btn-coral mt-6 min-h-[56px] gap-2 px-8 text-base">
          Let's start
          <Icon name="chevron-right" size={20} />
        </button>
      </Frame>
    );
  }

  if (step.kind === "note") {
    const note = meNote(step.id);
    return (
      <Frame title={boardTitle(forOther ? { aboutName: name ?? "" } : null)} spoken={note.ask(name)} dots={dots} onBack={back} topRight={skipAll} small>
        <NoteEditor
          note={note}
          name={name}
          readingLevel={shownLevel}
          answer={board.answers[note.id]}
          onChange={(a) => {
            touched.current = true;
            setBoard((b) => ({ ...b, answers: { ...b.answers, [note.id]: a } }));
          }}
          hideSpeak
        />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => noteDone(note.id)} className="btd-btn-coral min-h-[56px] gap-2 px-8 text-base">
            Next
            <Icon name="chevron-right" size={20} />
          </button>
          <button
            type="button"
            onClick={() => {
              // Skipping leaves this note as it was before.
              setBoard((b) => ({ ...b, answers: { ...b.answers, [note.id]: meBoard?.answers[note.id] ?? { picks: [], words: "" } } }));
              noteDone(note.id, true);
            }}
            className="btd-btn-outline min-h-[56px] px-6 text-sm"
          >
            Skip this one
          </button>
        </div>
        <span className="sr-only">{noteQuestion(note, name, shownLevel)}</span>
      </Frame>
    );
  }

  if (step.kind === "more") {
    const q = "Great job! Want to keep going?";
    return (
      <Frame title={q} spoken={`${q} There are 5 more notes.`} dots={dots} onBack={back} topRight={skipAll}>
        <BoardGrid board={board} readingLevel={shownLevel} only={FIRST} />
        <p className="mt-6 text-15 text-body">
          There are 5 more notes: {REST.map((id) => meNote(id).title).join(", ")}.
        </p>
        <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => {
              setKeepGoing(true);
              go({ kind: "note", id: REST[0] });
            }}
            className="btd-btn-coral min-h-[56px] gap-2 px-8 text-base"
          >
            Keep going
            <Icon name="chevron-right" size={20} />
          </button>
          <button type="button" onClick={() => go({ kind: "done" })} className="btd-btn-outline min-h-[56px] px-6 text-sm">
            Finish later
          </button>
        </div>
      </Frame>
    );
  }

  // Done: the finished board, and (for someone here for themselves) a sticker.
  const title = boardTitle(forOther ? { aboutName: name ?? "" } : null);
  const heading = forOther ? `${title} is ready!` : "Your board is ready!";
  return (
    <Frame title={heading} spoken={heading} dots={dots} wide>
      {!forOther && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-card border-2 border-sky bg-sky-tint p-4">
          <StickerBadge id="made-my-board" earned size={96} />
          <div>
            <p className="text-17 font-bold text-navy">You got a sticker!</p>
            <p className="text-13 text-body">
              {practice ? "Practice mode: it isn't kept." : "It's in your sticker book in My Voice."}
            </p>
          </div>
        </div>
      )}
      {filledNotes(board).length ? (
        <BoardGrid board={board} readingLevel={shownLevel} only={filledNotes(board).map((n) => n.note.id)} />
      ) : (
        <p className="text-15 text-body">Nothing on the board yet. You can fill it in any time.</p>
      )}
      {practice && <p className="mt-5 text-13 font-semibold text-navy">Practice mode: nothing was saved.</p>}
      <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
        <button type="button" onClick={() => navigate(next, { replace: true })} className="btd-btn-coral min-h-[56px] gap-2 px-8 text-base">
          Let's go
          <Icon name="chevron-right" size={20} />
        </button>
        <button type="button" onClick={() => navigate("/me", { replace: true })} className="btd-btn-outline min-h-[56px] px-6 text-sm">
          See {forOther ? "the" : "my"} whole board
        </button>
      </div>
    </Frame>
  );
}

// ---- The frame every screen shares: back, title, read-aloud, progress ----

function Frame({
  title,
  spoken,
  dots,
  onBack,
  topRight,
  small,
  wide,
  children,
}: {
  title: string;
  spoken: string;
  dots: { at: number; of: number } | null;
  onBack?: () => void;
  topRight?: React.ReactNode;
  /** The title as a small label (the question below is the heading). */
  small?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="btd-grain min-h-[70vh] bg-gradient-to-b from-mist to-sky-tint px-4 py-8 sm:py-12">
      <div className={`mx-auto w-full ${wide ? "max-w-[880px]" : "max-w-[640px]"}`}>
        <div className="mb-4 flex min-h-[48px] items-center justify-between gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-navy bg-white text-navy transition-colors hover:bg-sky-tint"
            >
              <Icon name="chevron-right" size={22} className="rotate-180" />
            </button>
          ) : (
            <span className="h-12 w-12" aria-hidden="true" />
          )}
          {dots && <Dots at={dots.at} of={dots.of} />}
          <span className="flex min-w-[48px] justify-end">{topRight}</span>
        </div>

        <div className="rounded-panel border border-navy/12 bg-white p-5 shadow-[0_12px_32px_rgba(33,50,68,0.08)] sm:p-8">
          <div className="mb-5 flex items-start gap-3">
            {small ? (
              <h1 className="flex-1 text-12 font-bold uppercase tracking-[0.12em] text-link">{title}</h1>
            ) : (
              <h1 className="flex-1 font-display text-[clamp(1.625rem,4vw,2.25rem)] font-extrabold leading-tight text-navy">{title}</h1>
            )}
            <SpeakButton text={spoken} className="h-11 w-11" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function Dots({ at, of }: { at: number; of: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5" role="img" aria-label={`Step ${at + 1} of ${of}`}>
      {Array.from({ length: of }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 rounded-full transition-all ${
            i === at ? "w-6 bg-navy" : i < at ? "w-2.5 bg-navy/60" : "w-2.5 border border-navy/30 bg-white"
          }`}
        />
      ))}
    </div>
  );
}

function BigChoice({
  icon,
  label,
  hint,
  tone,
  onClick,
}: {
  icon: IconName;
  label: string;
  hint: string;
  tone: "coral" | "butter" | "sky";
  onClick: () => void;
}) {
  const bg = { coral: "bg-coral", butter: "bg-butter", sky: "bg-sky" }[tone];
  return (
    <button type="button" onClick={onClick} className={`btd-sticky ${bg} flex min-h-[96px] items-center gap-4 px-5 py-4 text-left`}>
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/80 text-navy">
        <Icon name={icon} size={30} />
      </span>
      <span>
        <span className="block font-display text-21 font-extrabold leading-tight text-navy">{label}</span>
        <span className="block text-13 font-semibold text-navy/80">{hint}</span>
      </span>
    </button>
  );
}
