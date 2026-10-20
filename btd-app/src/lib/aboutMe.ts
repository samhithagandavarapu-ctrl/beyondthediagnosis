import type { IconName } from "../components/icons/Icon";

// "All About Me": the things a clinician can't know from a chart — how this
// person usually is, how they show pain or upset, and how to talk with them.
// Picture answers first, with room for a helper to add words. Kept on this
// device only, and printed at the top of the Appointment Prep PDF.

export type AboutMeId = "usual" | "hurting" | "upset" | "calm" | "talk";

export type AboutMeOption = { id: string; icon: IconName; text: string };

export type AboutMeQuestion = {
  id: AboutMeId;
  icon: IconName;
  /** Two or three words, for the pictures-and-short-words tier. */
  short: string;
  /** In the person's own voice: "How I usually act". */
  question: string;
  /** How the PDF labels it, about the person. */
  pdfLabel: string;
  options: AboutMeOption[];
};

export const ABOUT_ME_QUESTIONS: AboutMeQuestion[] = [
  {
    id: "usual",
    icon: "face-great",
    short: "Usual me",
    question: "How I usually act",
    pdfLabel: "How they usually act",
    options: [
      { id: "friendly", icon: "face-great", text: "I am happy and friendly" },
      { id: "quiet", icon: "face-okay", text: "I am quiet" },
      { id: "talk", icon: "talk", text: "I like to talk" },
      { id: "joke", icon: "celebrate", text: "I like to joke" },
      { id: "move", icon: "person", text: "I move around a lot" },
      { id: "routine", icon: "clock", text: "I like my routines" },
    ],
  },
  {
    id: "hurting",
    icon: "bandage",
    short: "When I hurt",
    question: "How I show I'm hurting",
    pdfLabel: "How they show they're hurting",
    options: [
      { id: "quiet", icon: "face-okay", text: "I get quiet" },
      { id: "hold", icon: "hand", text: "I hold the place that hurts" },
      { id: "cry", icon: "face-worst", text: "I cry" },
      { id: "grumpy", icon: "face-bad", text: "I get grumpy" },
      { id: "no-eat", icon: "stop", text: "I don't want to eat" },
      { id: "say-fine", icon: "alert", text: "I may say I'm fine when I'm not" },
    ],
  },
  {
    id: "upset",
    icon: "face-awful",
    short: "When I'm upset",
    question: "How I show I'm upset",
    pdfLabel: "How they show they're upset",
    options: [
      { id: "loud", icon: "speaker", text: "I get loud" },
      { id: "silent", icon: "speaker-off", text: "I stop talking" },
      { id: "leave", icon: "sign-out", text: "I walk away" },
      { id: "cry", icon: "face-worst", text: "I cry" },
      { id: "ears", icon: "ear", text: "I cover my ears" },
      { id: "space", icon: "person", text: "I need space" },
    ],
  },
  {
    id: "calm",
    icon: "breath",
    short: "What helps",
    question: "What helps me calm down",
    pdfLabel: "What helps them calm down",
    options: [
      { id: "breaths", icon: "breath", text: "Deep breaths" },
      { id: "music", icon: "headphones", text: "Music" },
      { id: "helper", icon: "person-plus", text: "My helper close by" },
      { id: "quiet-room", icon: "speaker-off", text: "A quiet room" },
      { id: "hug", icon: "heart", text: "A hug or holding hands" },
      { id: "next", icon: "clipboard", text: "Knowing what comes next" },
    ],
  },
  {
    id: "talk",
    icon: "talk",
    short: "Talk to me",
    question: "How I like people to talk to me",
    pdfLabel: "How they like people to talk to them",
    options: [
      { id: "to-me", icon: "talk", text: "Talk to me, not only my helper" },
      { id: "simple", icon: "chat", text: "Use short, simple words" },
      { id: "slow", icon: "clock", text: "Go slow and give me time to answer" },
      { id: "show", icon: "eye", text: "Show me pictures or show me first" },
      { id: "touch", icon: "hand", text: "Tell me before you touch me" },
      { id: "check", icon: "question", text: "Check that I understand" },
    ],
  },
];

export type AboutMeAnswer = { picks: string[]; words: string };

export type AboutMe = {
  updatedAt: string;
  answers: Record<AboutMeId, AboutMeAnswer>;
};

export const ABOUT_ME_KEY = "verity-my-voice-about-me";

export function emptyAboutMe(): AboutMe {
  const blank = (): AboutMeAnswer => ({ picks: [], words: "" });
  return {
    updatedAt: new Date().toISOString(),
    answers: { usual: blank(), hurting: blank(), upset: blank(), calm: blank(), talk: blank() },
  };
}

/** Every answer to one question, pictures first, then any words. */
export function aboutMeAnswerText(q: AboutMeQuestion, a: AboutMeAnswer | undefined): string[] {
  if (!a) return [];
  const picked = q.options.filter((o) => a.picks.includes(o.id)).map((o) => o.text);
  return a.words.trim() ? [...picked, a.words.trim()] : picked;
}

export function aboutMeHasContent(a: AboutMe | null): boolean {
  return !!a && ABOUT_ME_QUESTIONS.some((q) => aboutMeAnswerText(q, a.answers[q.id]).length > 0);
}

/** "Question: answer; answer" lines, for the summary and PDF. */
export function aboutMeLines(a: AboutMe): { label: string; text: string }[] {
  return ABOUT_ME_QUESTIONS.map((q) => ({
    label: q.pdfLabel,
    text: aboutMeAnswerText(q, a.answers[q.id]).join("; "),
  })).filter((l) => l.text);
}
