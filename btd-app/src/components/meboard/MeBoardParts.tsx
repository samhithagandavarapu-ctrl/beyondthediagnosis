import { CSSProperties } from "react";
import { ME_NOTES, MeBoard, MeNote, NoteAnswer, NoteId, noteLines } from "../../lib/meBoard";
import { ReadingLevel } from "../../lib/myVoice";
import { useMyVoice } from "../../context/MyVoiceContext";
import DictateButton from "../DictateButton";
import SpeakButton from "../myvoice/SpeakButton";
import Icon from "../icons/Icon";

// The pieces of the Me board, shared by the Me page and the welcome setup:
// one sticky note, the board of all eight, and the editor for one note.

const NOTE_BG: Record<MeNote["color"], string> = {
  butter: "bg-butter",
  coral: "bg-coral",
  sky: "bg-sky",
};

// A slightly different tilt for each note, so the board looks stuck up by hand.
const TILTS = [-1.6, 1.2, -0.8, 1.6, -1.2, 0.8, -1.8, 1];

/** The question for a note, at this reading level. */
export function noteQuestion(note: MeNote, name: string | null, level: ReadingLevel): string {
  return level === "full" ? note.ask(name) : note.title;
}

export function StickyNote({
  note,
  answer,
  readingLevel,
  index,
  onOpen,
}: {
  note: MeNote;
  answer: NoteAnswer | undefined;
  readingLevel: ReadingLevel;
  index: number;
  /** Tapping the note opens it to change. Without this it's just shown. */
  onOpen?: () => void;
}) {
  const showText = readingLevel !== "icon";
  const picked = note.options.filter((o) => answer?.picks.includes(o.id));
  const words = answer?.words.trim() ?? "";
  const empty = !picked.length && !words;
  const style = { "--tilt": `${TILTS[index % TILTS.length]}deg` } as CSSProperties;

  const body = (
    <>
      <span className="flex items-center gap-2 font-display text-17 font-extrabold leading-tight text-navy">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/70">
          <Icon name={note.icon} size={20} />
        </span>
        {note.title}
      </span>
      {empty ? (
        <span className="mt-3 block text-13 font-semibold text-navy/75">
          {onOpen ? "Nothing yet — tap to add." : "Nothing yet."}
        </span>
      ) : (
        <span className="mt-3 flex flex-wrap gap-1.5">
          {picked.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-13 font-semibold leading-snug text-navy"
            >
              <Icon name={o.icon} size={16} />
              {showText ? o.text : <span className="sr-only">{o.text}</span>}
            </span>
          ))}
          {words && (
            <span className="rounded-tile bg-white/80 px-2.5 py-1 text-13 font-semibold leading-snug text-navy">
              {words}
            </span>
          )}
        </span>
      )}
    </>
  );

  const className = `btd-sticky ${NOTE_BG[note.color]} flex w-full flex-col items-start justify-start p-4 pt-5 text-left`;
  return onOpen ? (
    <button type="button" onClick={onOpen} style={style} className={className} aria-label={`${note.title}. Change this note.`}>
      {body}
    </button>
  ) : (
    <div style={style} className={className}>
      {body}
    </div>
  );
}

export function BoardGrid({
  board,
  readingLevel,
  onOpen,
  only,
}: {
  board: MeBoard | null;
  readingLevel: ReadingLevel;
  onOpen?: (id: NoteId) => void;
  /** Show just these notes (say, the ones filled in so far). */
  only?: NoteId[];
}) {
  const notes = only ? ME_NOTES.filter((n) => only.includes(n.id)) : ME_NOTES;
  return (
    <div className="grid gap-x-5 gap-y-7 pt-2 grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))]">
      {notes.map((note, i) => (
        <StickyNote
          key={note.id}
          note={note}
          index={i}
          answer={board?.answers[note.id]}
          readingLevel={readingLevel}
          onOpen={onOpen ? () => onOpen(note.id) : undefined}
        />
      ))}
    </div>
  );
}

/** Everything on the board, as one thing to read aloud. */
export function boardSpoken(board: MeBoard | null, title: string): string {
  const parts = ME_NOTES.map((note) => {
    const lines = noteLines(note, board?.answers[note.id]);
    return lines.length ? `${note.title}: ${lines.join(", ")}.` : "";
  }).filter(Boolean);
  return [title + ".", ...parts].join(" ");
}

/** One note, opened: tap the pictures that fit, and add your own words. */
export function NoteEditor({
  note,
  answer,
  onChange,
  name,
  readingLevel,
  hideSpeak,
}: {
  note: MeNote;
  answer: NoteAnswer | undefined;
  onChange: (next: NoteAnswer) => void;
  /** When the screen around it already has a read-aloud button. */
  hideSpeak?: boolean;
  /** Who it's about, when a grown-up is filling it in. */
  name: string | null;
  readingLevel: ReadingLevel;
}) {
  const { say } = useMyVoice();
  const value = answer ?? { picks: [], words: "" };
  const showText = readingLevel !== "icon";
  const question = noteQuestion(note, name, readingLevel);
  const ownLabel = readingLevel === "icon" ? "A helper can write here" : "Add my own";

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-tile shadow-[3px_4px_0_rgba(33,50,68,0.14)] ${NOTE_BG[note.color]} text-navy`}>
          <Icon name={note.icon} size={28} />
        </span>
        <h2 className="min-w-0 flex-1 font-display text-23 font-extrabold leading-tight text-navy">
          {question}
        </h2>
        {!hideSpeak && <SpeakButton text={note.ask(name)} />}
      </div>

      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,130px),1fr))]">
        {note.options.map((o) => {
          const isOn = value.picks.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={isOn}
              aria-label={o.text}
              onClick={() => {
                onChange({ ...value, picks: isOn ? value.picks.filter((p) => p !== o.id) : [...value.picks, o.id] });
                say(o.text);
              }}
              className={`relative flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-tile border-2 px-3 py-3 text-center transition-colors ${
                isOn ? "border-navy bg-coral" : "border-navy/15 bg-white hover:border-sky hover:bg-sky-tint"
              }`}
            >
              {isOn && (
                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-navy text-mist">
                  <Icon name="check" size={14} />
                </span>
              )}
              <Icon name={o.icon} size={36} className="text-navy" />
              {showText && <span className="text-13 font-bold leading-tight text-navy">{o.text}</span>}
            </button>
          );
        })}
      </div>

      <div>
        <label className="grid gap-2">
          <span className="flex items-center gap-2 text-15 font-bold text-navy">
            <Icon name="plus" size={18} />
            {ownLabel}
          </span>
          <textarea
            className="btd-input min-h-[80px] text-base"
            value={value.words}
            maxLength={300}
            onChange={(e) => onChange({ ...value, words: e.target.value })}
            placeholder="You don't have to write anything."
          />
        </label>
        <DictateButton value={value.words} onChange={(words) => onChange({ ...value, words })} label={ownLabel} />
      </div>
    </div>
  );
}
