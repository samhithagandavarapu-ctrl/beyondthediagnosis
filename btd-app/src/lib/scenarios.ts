import type { IconName } from "../components/icons/Icon";

// Practice stories: short, scripted picture stories about hard moments at the
// doctor, each with two or three things the person could do. Every choice
// gets kind feedback — the "other" choices are never wrong, just a nudge
// toward speaking up. No AI: the words are all written here.

export type ScenarioChoice = {
  id: string;
  icon: IconName;
  text: string;
  /** The choices that speak up. The rest still get kind words. */
  best: boolean;
  feedback: string;
};

export type ScenarioScene = {
  /** One to three pictures, left to right, drawn as a little comic panel. */
  icons: IconName[];
  text: string;
  /** Shown in a speech bubble, when someone in the scene is talking. */
  says?: string;
};

export type Scenario = {
  id: string;
  icon: IconName;
  title: string;
  short: string;
  scenes: ScenarioScene[];
  question: string;
  choices: ScenarioChoice[];
};

export const SCENARIOS: Scenario[] = [
  {
    id: "talks-to-parent",
    icon: "talk",
    title: "The doctor talks to my parent instead of me",
    short: "Talk to me",
    scenes: [
      { icons: ["doctor", "talk", "person"], text: "The doctor comes in. The doctor talks to my mom." },
      { icons: ["person-plus", "face-okay"], text: "Nobody asks me anything. But it's my body.", says: "How has she been feeling?" },
    ],
    question: "What could I do?",
    choices: [
      {
        id: "say",
        icon: "talk",
        text: "Say: \"Please talk to me.\"",
        best: true,
        feedback: "Great choice! It's your body, so the doctor should talk to you. Saying it out loud is brave.",
      },
      {
        id: "card",
        icon: "card",
        text: "Show my \"Please talk to me\" card.",
        best: true,
        feedback: "Great choice! A card says it for you. The doctor can read it and turn to you.",
      },
      {
        id: "quiet",
        icon: "speaker-off",
        text: "Stay quiet and wait.",
        best: false,
        feedback: "It's okay to feel shy. Next time you could try showing your card. Your voice matters, and the doctor wants to hear from you.",
      },
    ],
  },
  {
    id: "dont-understand",
    icon: "question",
    title: "I don't understand a word",
    short: "A hard word",
    scenes: [
      { icons: ["doctor", "chat"], text: "The doctor uses a big word I don't know.", says: "Your thyroid levels are elevated." },
      { icons: ["face-okay", "question"], text: "I don't know what that means." },
    ],
    question: "What could I do?",
    choices: [
      {
        id: "ask",
        icon: "question",
        text: "Say: \"I don't understand. Can you say it a different way?\"",
        best: true,
        feedback: "Great choice! Doctors use big words a lot. Asking helps you know what is going on with your body.",
      },
      {
        id: "helper",
        icon: "person-plus",
        text: "Ask my helper to help me ask.",
        best: true,
        feedback: "Good choice! Your helper can help you ask. You still get to know the answer.",
      },
      {
        id: "nod",
        icon: "check",
        text: "Nod and say yes.",
        best: false,
        feedback: "Lots of people nod when they don't understand — that's okay. Next time, try saying \"I don't understand.\" You have the right to know.",
      },
    ],
  },
  {
    id: "nobody-asked",
    icon: "bandage",
    title: "Something hurts and nobody asked",
    short: "It hurts",
    scenes: [
      { icons: ["bandage", "face-bad"], text: "My tummy has hurt for days." },
      { icons: ["doctor", "clipboard"], text: "The doctor checks my ears and says we're almost done. Nobody asked about my tummy." },
    ],
    question: "What could I do?",
    choices: [
      {
        id: "say",
        icon: "bandage",
        text: "Say: \"I am in pain. My tummy hurts.\"",
        best: true,
        feedback: "Great choice! The doctor can't see pain. Telling them helps them help you.",
      },
      {
        id: "map",
        icon: "hand",
        text: "Show my \"Where does it hurt?\" body map.",
        best: true,
        feedback: "Great choice! Your body map shows where it hurts and how much. That's really useful for the doctor.",
      },
      {
        id: "wait",
        icon: "clock",
        text: "Wait until I get home.",
        best: false,
        feedback: "It can feel hard to bring it up. But the doctor is right there and wants to know. Next time, try saying \"I am in pain.\"",
      },
    ],
  },
  {
    id: "scared-of-test",
    icon: "needle",
    title: "I'm scared of a test",
    short: "I'm scared",
    scenes: [
      { icons: ["doctor", "needle"], text: "The nurse says I need a blood test.", says: "We need to take a little blood." },
      { icons: ["face-awful"], text: "My heart beats fast. I feel scared." },
    ],
    question: "What could I do?",
    choices: [
      {
        id: "tell",
        icon: "talk",
        text: "Say: \"I'm scared. Can you tell me what will happen?\"",
        best: true,
        feedback: "Great choice! Feeling scared is okay. Knowing what will happen can make it less scary.",
      },
      {
        id: "help",
        icon: "person-plus",
        text: "Ask to hold my helper's hand and count to three.",
        best: true,
        feedback: "Great choice! Asking for what helps you is speaking up for yourself.",
      },
      {
        id: "run",
        icon: "sign-out",
        text: "Run out of the room.",
        best: false,
        feedback: "Feeling scared is okay — lots of people are scared of needles. Running can be unsafe, though. Next time, try telling them \"I'm scared.\" They can help.",
      },
    ],
  },
  {
    id: "part-of-ds",
    icon: "alert",
    title: "The doctor says it's \"just part of Down syndrome\"",
    short: "This is new",
    scenes: [
      { icons: ["face-bad", "clock"], text: "I have been really tired for weeks. That is new for me." },
      { icons: ["doctor", "chat"], text: "The doctor says it's not a big deal.", says: "That's just part of Down syndrome." },
    ],
    question: "What could I do?",
    choices: [
      {
        id: "say",
        icon: "alert",
        text: "Say: \"This is not normal for me. It's new.\"",
        best: true,
        feedback: "Great choice! You know your body best. A new change deserves to be checked, Down syndrome or not.",
      },
      {
        id: "about-me",
        icon: "person",
        text: "Show my All About Me page.",
        best: true,
        feedback: "Great choice! It shows the doctor what is usual for you, so they can see this is new.",
      },
      {
        id: "okay",
        icon: "sign-out",
        text: "Say okay and go home.",
        best: false,
        feedback: "That's a hard moment. But you know your body best. Next time, try saying \"This is not normal for me.\" Your helper can back you up.",
      },
    ],
  },
];

// ---- Practice levels ----
// Three steps toward doing it for real. Checkmarks and stars only — no
// points, no streaks, nothing that can be lost.

export type PracticeLevelId = "helper" | "myself" | "real";

export const PRACTICE_LEVELS: { id: PracticeLevelId; icon: IconName; short: string; label: string }[] = [
  { id: "helper", icon: "person-plus", short: "With a helper", label: "Practice with a helper" },
  { id: "myself", icon: "person", short: "By myself", label: "Practice by myself" },
  { id: "real", icon: "star-filled", short: "For real!", label: "I did it for real!" },
];

/** Which levels each story has reached, by story id. */
export type PracticeLevels = Record<string, PracticeLevelId[]>;

export const LEVELS_KEY = "verity-my-voice-practice-levels";
