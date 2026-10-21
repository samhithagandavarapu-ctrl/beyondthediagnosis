import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ME_NOTES, MeBoard, NoteId, boardHasContent, boardTitle, emptyBoard, meNote } from "../lib/meBoard";
import { useMyVoice } from "../context/MyVoiceContext";
import { usePracticeMode } from "../context/PracticeModeContext";
import { BoardGrid, NoteEditor, boardSpoken } from "../components/meboard/MeBoardParts";
import SpeakButton from "../components/myvoice/SpeakButton";
import Icon from "../components/icons/Icon";

// The Me page: the "All about me" board. Eight sticky notes; tap one to fill
// it in. It goes at the top of the Appointment Prep summary, so a new doctor
// meets the person before the problem.

export const RELATIONS = ["Mom", "Dad", "Sibling", "Support worker", "Other"];

export default function Me() {
  const { meBoard, meBoardLoaded, meBoardStore, meBoardAccountMissing, saveMeBoard, deleteMeBoard, readingLevel, say } =
    useMyVoice();
  const { practice } = usePracticeMode();
  // Changes made in practice mode live only here, and are dropped when it ends.
  const [practiceBoard, setPracticeBoard] = useState<MeBoard | null>(null);
  useEffect(() => {
    if (!practice) setPracticeBoard(null);
  }, [practice]);
  const board = (practice ? practiceBoard ?? meBoard : meBoard) ?? emptyBoard();

  const [open, setOpen] = useState<NoteId | null>(null);
  const [working, setWorking] = useState<MeBoard | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingWho, setEditingWho] = useState(false);
  const name = board.aboutName.trim() || null;
  const title = boardTitle(board);

  async function keep(next: MeBoard) {
    if (practice) {
      setPracticeBoard(next);
      setNotice("That was practice, so nothing was saved.");
      return;
    }
    const where = await saveMeBoard(next);
    setNotice(
      where === "account"
        ? "Saved to your account."
        : "Saved on this device. Sign in to keep it on every device."
    );
  }

  // `from`: the board as just saved, when going straight on to the next note
  // (this render's `board` doesn't have that change in it yet).
  function openNote(id: NoteId, from: MeBoard = board) {
    setNotice(null);
    setWorking(from);
    setOpen(id);
    say(meNote(id).ask(name));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function closeNote(save: boolean) {
    if (save && working) await keep(working);
    setOpen(null);
    setWorking(null);
  }

  if (!meBoardLoaded) {
    return (
      <div className="btd-container py-16">
        <p className="text-body">Loading your board…</p>
      </div>
    );
  }

  if (open && working) {
    const note = meNote(open);
    const i = ME_NOTES.findIndex((n) => n.id === open);
    const next = ME_NOTES[i + 1];
    return (
      <div className="btd-container max-w-3xl py-10">
        <button type="button" onClick={() => closeNote(false)} className="mb-5 text-sm font-bold text-link hover:underline">
          ← Back to {title}
        </button>
        <div className="btd-card p-6">
          <NoteEditor
            note={note}
            name={name}
            readingLevel={readingLevel}
            answer={working.answers[open]}
            onChange={(a) => setWorking({ ...working, answers: { ...working.answers, [open]: a } })}
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => closeNote(true)} className="btd-btn-coral min-h-[56px] gap-2 px-8 text-base">
              <Icon name="check" size={20} />
              {practice ? "Done (practice)" : "Done"}
            </button>
            {next && (
              <button
                type="button"
                onClick={async () => {
                  await keep(working);
                  openNote(next.id, working);
                }}
                className="btd-btn-outline min-h-[56px] gap-2 px-6 text-sm"
              >
                Next: {next.title}
                <Icon name="chevron-right" size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="btd-container max-w-5xl py-10 pb-20">
      <p className="btd-eyebrow">My Me page</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="btd-page-h1 font-display text-navy">{title}</h1>
        {boardHasContent(board) && <SpeakButton text={boardSpoken(board, title)} />}
      </div>
      <p className="mt-3 max-w-[40em] text-17 leading-[1.6] text-body">
        {name
          ? `The things a doctor can't learn from a chart: how ${name} usually is, how they show pain, and how to talk with them. Tap a note to fill it in.`
          : "The things a doctor can't learn from a chart: how I usually am, how I show pain, and how to talk with me. Tap a note to fill it in."}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-13">
        <span className="inline-flex items-center gap-1.5 font-semibold text-muted">
          <Icon name="lock" size={14} />
          {practice
            ? "Practice mode: nothing on this page is saved."
            : meBoardStore === "account"
              ? "Saved to your account. Only you can see it."
              : meBoardAccountMissing
                ? "Saved on this device for now. Your account isn't ready to keep it yet."
                : "Saved on this device. Sign in to keep it on every device."}
        </span>
        <button type="button" onClick={() => setEditingWho((v) => !v)} className="font-bold text-link hover:underline">
          {editingWho ? "Close" : name ? `Not about ${name}? Change who this is about` : "Filling this in for someone else?"}
        </button>
      </div>

      {editingWho && <WhoEditor board={board} onSave={(b) => keep(b).then(() => setEditingWho(false))} />}

      {notice && (
        <p role="status" className="mt-4 rounded-tile border border-sky bg-sky-tint px-4 py-3 text-sm font-semibold text-navy">
          {notice}
        </p>
      )}

      <div className="mt-8">
        <BoardGrid board={board} readingLevel={readingLevel} onOpen={(id) => openNote(id)} />
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link to="/appointment-prep" className="btd-btn-sky min-h-[50px] gap-2 px-6 text-sm">
          <Icon name="clipboard" size={18} />
          Use it in Appointment Prep →
        </Link>
        {meBoard && !practice && (
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(`Delete ${title}? This can't be undone.`)) return;
              deleteMeBoard();
              setNotice("Deleted.");
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-13 font-bold text-clay hover:underline"
          >
            <Icon name="trash" size={16} />
            Delete my board
          </button>
        )}
      </div>
    </div>
  );
}

/** Who the board is about: the person themselves, or someone they help. */
function WhoEditor({ board, onSave }: { board: MeBoard; onSave: (b: MeBoard) => void }) {
  const [forSomeone, setForSomeone] = useState(Boolean(board.aboutName.trim()));
  const [name, setName] = useState(board.aboutName);
  const [relation, setRelation] = useState(board.relation);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...board, aboutName: forSomeone ? name.trim() : "", relation: forSomeone ? relation : "" });
      }}
      className="btd-card mt-4 grid max-w-xl gap-4 p-5"
    >
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-15 font-bold text-navy">This board is about</legend>
        {[
          { v: false, label: "Me" },
          { v: true, label: "Someone I help" },
        ].map((o) => (
          <label
            key={o.label}
            className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-tile border px-3.5 py-2.5 text-15 ${
              forSomeone === o.v ? "border-navy bg-sky-tint font-bold" : "border-navy/15 bg-white"
            }`}
          >
            <input type="radio" name="me-who" checked={forSomeone === o.v} onChange={() => setForSomeone(o.v)} className="h-4 w-4" />
            {o.label}
          </label>
        ))}
      </fieldset>
      {forSomeone && (
        <>
          <label className="grid gap-1 text-sm font-bold text-navy">
            Their first name or nickname
            <input className="btd-input" value={name} required onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-navy">
            How you're related
            <select className="btd-input" value={relation} onChange={(e) => setRelation(e.target.value)}>
              <option value="">Choose one</option>
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <button type="submit" className="btd-btn-sky min-h-[46px] justify-self-start px-5 text-sm">
        Save
      </button>
    </form>
  );
}
