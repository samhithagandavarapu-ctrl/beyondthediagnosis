import type { IconName } from "../components/icons/Icon";
import { authEnabled, supabase } from "./supabaseClient";

// The Me board ("All about me"): eight sticky notes about the things a
// clinician can't know from a chart — how this person usually is, how they
// show pain, how to talk with them. Picture answers first, with room for
// their own words.
//
// Signed in, it's kept in the account (the me_boards table — see
// supabase/me-board.sql; only the owner can read it). Signed out, or before
// that table exists, it's kept in this browser. Signing in moves a board made
// on this device into the account.
//
// A grown-up can fill one in about the person they help: then the board has
// that person's name ("All about Sam") and the questions are asked about them.

export type NoteId = "usual" | "hurt" | "talk" | "helps" | "hard" | "body" | "people" | "me";

export type NoteOption = { id: string; icon: IconName; text: string };

export type MeNote = {
  id: NoteId;
  icon: IconName;
  /** The note's title, on the board and in the PDF: "When I hurt". */
  title: string;
  /** Sticky-note colour. */
  color: "butter" | "coral" | "sky";
  /** The question, asked of the person themselves, or about someone by name. */
  ask: (name: string | null) => string;
  options: NoteOption[];
};

// In this order on the board, in the setup steps, and in the PDF.
export const ME_NOTES: MeNote[] = [
  {
    id: "usual",
    icon: "face-great",
    title: "My usual",
    color: "butter",
    ask: (n) => (n ? `How is ${n} usually? How do they sleep and eat?` : "How am I usually? How do I sleep and eat?"),
    options: [
      { id: "friendly", icon: "face-great", text: "I am happy and friendly" },
      { id: "quiet", icon: "face-okay", text: "I am quiet" },
      { id: "talk", icon: "talk", text: "I like to talk" },
      { id: "joke", icon: "celebrate", text: "I like to joke" },
      { id: "move", icon: "person", text: "I move around a lot" },
      { id: "routine", icon: "clock", text: "I like my routines" },
      { id: "sleep-well", icon: "moon", text: "I sleep well" },
      { id: "eat-well", icon: "utensils", text: "I eat well" },
    ],
  },
  {
    id: "hurt",
    icon: "bandage",
    title: "When I hurt",
    color: "coral",
    ask: (n) => (n ? `When ${n} hurts, what do they do?` : "What do I do when I hurt?"),
    options: [
      { id: "quiet", icon: "face-okay", text: "I get quiet" },
      { id: "hold", icon: "hand", text: "I hold the place that hurts" },
      { id: "cry", icon: "face-worst", text: "I cry" },
      { id: "grumpy", icon: "face-bad", text: "I get grumpy" },
      { id: "no-eat", icon: "utensils", text: "I don't want to eat" },
      { id: "no-sleep", icon: "moon", text: "I don't sleep well" },
      { id: "stop", icon: "battery", text: "I stop doing things I like" },
      { id: "say-fine", icon: "alert", text: "I may say I'm fine when I'm not" },
    ],
  },
  {
    id: "talk",
    icon: "talk",
    title: "How I talk",
    color: "sky",
    ask: (n) =>
      n ? `How does ${n} talk? How should people talk to them?` : "How do I talk? How should people talk to me?",
    options: [
      { id: "words", icon: "talk", text: "I talk with words" },
      { id: "signs", icon: "hand", text: "I use signs" },
      { id: "pictures", icon: "card", text: "I point or use pictures" },
      { id: "to-me", icon: "person", text: "Talk to me, not only my helper" },
      { id: "simple", icon: "chat", text: "Use short, simple words" },
      { id: "slow", icon: "clock", text: "Go slow and give me time to answer" },
      { id: "show", icon: "eye", text: "Show me pictures or show me first" },
      { id: "check", icon: "question", text: "Check that I understand" },
    ],
  },
  {
    id: "helps",
    icon: "breath",
    title: "What helps me",
    color: "butter",
    ask: (n) => (n ? `What helps ${n} feel calm and okay?` : "What helps me feel calm and okay?"),
    options: [
      { id: "breaths", icon: "breath", text: "Deep breaths" },
      { id: "music", icon: "headphones", text: "Music" },
      { id: "helper", icon: "person-plus", text: "My helper close by" },
      { id: "quiet-room", icon: "speaker-off", text: "A quiet room" },
      { id: "hug", icon: "heart", text: "A hug or holding hands" },
      { id: "next", icon: "clipboard", text: "Knowing what comes next" },
      { id: "breaks", icon: "repeat", text: "Short breaks" },
      { id: "hold", icon: "star", text: "Something to hold" },
    ],
  },
  {
    id: "hard",
    icon: "alert",
    title: "Things that are hard",
    color: "coral",
    ask: (n) => (n ? `What is hard for ${n}?` : "What is hard for me?"),
    options: [
      { id: "loud", icon: "speaker", text: "Loud places" },
      { id: "wait", icon: "clock", text: "Waiting a long time" },
      { id: "needles", icon: "needle", text: "Needles and shots" },
      { id: "touch", icon: "hand", text: "Being touched without warning" },
      { id: "crowds", icon: "person-plus", text: "Lots of people" },
      { id: "change", icon: "shuffle", text: "Changes to my plans" },
      { id: "lights", icon: "light", text: "Bright lights" },
    ],
  },
  {
    id: "body",
    icon: "heart",
    title: "Things my body needs",
    color: "sky",
    ask: (n) => (n ? `What does ${n}'s body need?` : "What does my body need?"),
    options: [
      { id: "glasses", icon: "eye", text: "I wear glasses" },
      { id: "hearing", icon: "ear", text: "I use hearing aids" },
      { id: "medicine", icon: "tl-medication", text: "I take medicine every day" },
      { id: "food", icon: "utensils", text: "Special food or diet" },
      { id: "bathroom", icon: "toilet", text: "Help in the bathroom" },
      { id: "move", icon: "chair", text: "Help to move or sit" },
      { id: "night", icon: "moon", text: "A breathing machine at night" },
      { id: "rest", icon: "battery", text: "Extra rest" },
    ],
  },
  {
    id: "people",
    icon: "person-plus",
    title: "My people",
    color: "butter",
    ask: (n) => (n ? `Who are ${n}'s people?` : "Who are my people?"),
    options: [
      { id: "parent", icon: "heart", text: "My mom or dad" },
      { id: "sibling", icon: "person-plus", text: "My brother or sister" },
      { id: "support", icon: "hand", text: "My support worker" },
      { id: "friends", icon: "face-great", text: "My friends" },
      { id: "teacher", icon: "book", text: "My teacher or job coach" },
      { id: "doctor", icon: "doctor", text: "My doctor" },
    ],
  },
  {
    id: "me",
    icon: "star",
    title: "Me",
    color: "coral",
    ask: (n) => (n ? `What does ${n} love? What makes them, them?` : "What do I love? What makes me, me?"),
    options: [
      { id: "music", icon: "headphones", text: "I love music" },
      { id: "shows", icon: "play", text: "I love movies and shows" },
      { id: "sports", icon: "star", text: "I love sports" },
      { id: "dance", icon: "celebrate", text: "I love to dance" },
      { id: "books", icon: "book", text: "I love books" },
      { id: "cook", icon: "utensils", text: "I love to cook" },
      { id: "pets", icon: "heart", text: "I love animals" },
      { id: "friends", icon: "chat", text: "I love being with friends" },
    ],
  },
];

export const NOTE_IDS = ME_NOTES.map((n) => n.id);

export function meNote(id: NoteId): MeNote {
  return ME_NOTES.find((n) => n.id === id) ?? ME_NOTES[0];
}

export type NoteAnswer = { picks: string[]; words: string };

export type MeBoard = {
  /** Who the board is about. Empty: the person themselves ("All about me"). */
  aboutName: string;
  /** For a board kept by a grown-up: how they're related ("Mom"). */
  relation: string;
  answers: Partial<Record<NoteId, NoteAnswer>>;
  updatedAt: string;
};

export function emptyBoard(patch: Partial<MeBoard> = {}): MeBoard {
  return { aboutName: "", relation: "", answers: {}, updatedAt: new Date().toISOString(), ...patch };
}

export function boardTitle(board: Pick<MeBoard, "aboutName"> | null): string {
  const name = board?.aboutName.trim();
  return name ? `All about ${name}` : "All about me";
}

/** Every answer on one note, pictures first, then their own words. */
export function noteLines(note: MeNote, answer: NoteAnswer | undefined): string[] {
  if (!answer) return [];
  const picked = note.options.filter((o) => answer.picks.includes(o.id)).map((o) => o.text);
  const words = answer.words.trim();
  return words ? [...picked, words] : picked;
}

/** The notes with something on them, in board order. */
export function filledNotes(board: MeBoard | null): { note: MeNote; lines: string[] }[] {
  if (!board) return [];
  return ME_NOTES.map((note) => ({ note, lines: noteLines(note, board.answers[note.id]) })).filter(
    (n) => n.lines.length > 0
  );
}

export function boardHasContent(board: MeBoard | null): boolean {
  return filledNotes(board).length > 0;
}

// ---- A copy on an Appointment Prep draft ----
//
// A draft keeps its own copy of the board, taken when the draft was started,
// so changing the board later doesn't quietly change a summary already being
// written. "Update from my Me page" takes a fresh copy.

export type AboutMeCopy = {
  takenAt: string;
  aboutName: string;
  notes: { id: NoteId; lines: string[] }[];
  /** Notes left off this draft. Unticking never touches the board itself. */
  off: NoteId[];
};

export function copyBoard(board: MeBoard | null): AboutMeCopy {
  return {
    takenAt: new Date().toISOString(),
    aboutName: board?.aboutName.trim() ?? "",
    notes: filledNotes(board).map(({ note, lines }) => ({ id: note.id, lines })),
    off: [],
  };
}

/** What goes on the summary and the PDF: the ticked notes, in board order. */
export function aboutMeRows(copy: AboutMeCopy | null | undefined): { title: string; text: string }[] {
  if (!copy) return [];
  return ME_NOTES.flatMap((note) => {
    const n = copy.notes.find((x) => x.id === note.id);
    if (!n || !n.lines.length || copy.off.includes(note.id)) return [];
    return [{ title: note.title, text: n.lines.join("; ") }];
  });
}

// ---- Where it's kept ----

export type BoardStore = "account" | "device";

const LOCAL_KEY = "voiced:me-board";
// The five-question "All About Me" that came before the board.
const OLD_KEY = "verity-my-voice-about-me";

type OldAboutMe = {
  answers?: Partial<Record<"usual" | "hurting" | "upset" | "calm" | "talk", NoteAnswer>>;
  updatedAt?: string;
};

const OLD_UPSET: Record<string, string> = {
  loud: "I get loud",
  silent: "I stop talking",
  leave: "I walk away",
  cry: "I cry",
  ears: "I cover my ears",
  space: "I need space",
};

/** The old All About Me as a board: same pictures where they carried over,
 *  and "When I'm upset" written into Things that are hard. */
function fromOld(old: OldAboutMe): MeBoard {
  const a = old.answers ?? {};
  const keep = (id: NoteId, ans: NoteAnswer | undefined): NoteAnswer | undefined => {
    if (!ans) return undefined;
    const known = new Set(meNote(id).options.map((o) => o.id));
    const picks = ans.picks.filter((p) => known.has(p));
    return picks.length || ans.words.trim() ? { picks, words: ans.words ?? "" } : undefined;
  };
  const upset = a.upset;
  const upsetText = upset
    ? [...upset.picks.map((p) => OLD_UPSET[p]).filter(Boolean), upset.words.trim()].filter(Boolean).join(", ")
    : "";
  const answers: MeBoard["answers"] = {
    usual: keep("usual", a.usual),
    hurt: keep("hurt", a.hurting),
    talk: keep("talk", a.talk),
    helps: keep("helps", a.calm),
    hard: upsetText ? { picks: [], words: `When I'm upset: ${upsetText}` } : undefined,
  };
  (Object.keys(answers) as NoteId[]).forEach((k) => answers[k] === undefined && delete answers[k]);
  return emptyBoard({ answers, updatedAt: old.updatedAt ?? new Date().toISOString() });
}

function readLocal(): MeBoard | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return { ...emptyBoard(), ...(JSON.parse(raw) as MeBoard) };
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const board = fromOld(JSON.parse(old) as OldAboutMe);
      writeLocal(boardHasContent(board) ? board : null);
      localStorage.removeItem(OLD_KEY);
      return boardHasContent(board) ? board : null;
    }
  } catch {
    // Corrupted or blocked storage: no board, rather than a broken page.
  }
  return null;
}

function writeLocal(board: MeBoard | null) {
  try {
    if (board) localStorage.setItem(LOCAL_KEY, JSON.stringify(board));
    else localStorage.removeItem(LOCAL_KEY);
  } catch {
    // ignore
  }
}

type Row = { about_name: string; relation: string; answers: MeBoard["answers"]; updated_at: string };

const toRow = (userId: string, b: MeBoard) => ({
  user_id: userId,
  about_name: b.aboutName,
  relation: b.relation,
  answers: b.answers,
  updated_at: b.updatedAt,
});

const fromRow = (r: Row): MeBoard => ({
  aboutName: r.about_name ?? "",
  relation: r.relation ?? "",
  answers: r.answers ?? {},
  updatedAt: r.updated_at,
});

/** The board for whoever is here, and where it lives. `accountMissing`:
 *  signed in, but the account can't hold it yet (the SQL hasn't been run). */
export async function loadBoard(
  userId: string | null,
  /** Whose board: the signed-in person's own, or a child's they look after. */
  ownerId: string | null = userId
): Promise<{ board: MeBoard | null; store: BoardStore; accountMissing: boolean }> {
  if (userId && ownerId && ownerId !== userId) return loadBoardOf(ownerId);
  const local = readLocal();
  if (!userId || !authEnabled) return { board: local, store: "device", accountMissing: false };

  const { data, error } = await supabase
    .from("me_boards")
    .select("about_name, relation, answers, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("Couldn't load the Me board from the account:", error.message);
    return { board: local, store: "device", accountMissing: true };
  }
  const account = data ? fromRow(data as Row) : null;
  // A board made on this device before signing in joins the account, unless
  // the account already has a newer one.
  if (local && (!account || local.updatedAt > account.updatedAt)) {
    const { error: upError } = await supabase.from("me_boards").upsert(toRow(userId, local), { onConflict: "user_id" });
    if (!upError) {
      writeLocal(null);
      return { board: local, store: "account", accountMissing: false };
    }
  } else if (local) {
    writeLocal(null);
  }
  return { board: account, store: "account", accountMissing: false };
}

/** A child's board, for a grown-up who looks after them. Account only: it's
 *  never mixed with whatever is kept on this device. */
async function loadBoardOf(ownerId: string): Promise<{ board: MeBoard | null; store: BoardStore; accountMissing: boolean }> {
  if (!authEnabled) return { board: null, store: "account", accountMissing: false };
  const { data, error } = await supabase
    .from("me_boards")
    .select("about_name, relation, answers, updated_at")
    .eq("user_id", ownerId)
    .maybeSingle();
  if (error) {
    console.error("Couldn't load that Me board:", error.message);
    return { board: null, store: "account", accountMissing: true };
  }
  return { board: data ? fromRow(data as Row) : null, store: "account", accountMissing: false };
}

/** Save the board where it lives. Returns where it went: if the account
 *  can't take your own board, it's kept on this device instead of lost.
 *  Returns null when someone else's board couldn't be saved. */
export async function saveBoard(
  userId: string | null,
  board: MeBoard,
  ownerId: string | null = userId
): Promise<BoardStore | null> {
  const owner = ownerId ?? userId;
  if (owner && authEnabled) {
    const { error } = await supabase.from("me_boards").upsert(toRow(owner, board), { onConflict: "user_id" });
    if (!error) return "account";
    console.error("Couldn't save the Me board to the account:", error.message);
  }
  if (owner && owner !== userId) return null;
  writeLocal(board);
  return "device";
}

export async function deleteBoard(userId: string | null, ownerId: string | null = userId): Promise<void> {
  const owner = ownerId ?? userId;
  if (owner === userId) writeLocal(null);
  if (owner && authEnabled) {
    const { error } = await supabase.from("me_boards").delete().eq("user_id", owner);
    if (error) console.error("Couldn't delete the Me board:", error.message);
  }
}
