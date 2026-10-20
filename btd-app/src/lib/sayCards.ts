import type { SpeakUpCard } from "./practiceVisit";

// "Say it my way": big picture cards that speak when tapped. Cards someone
// makes themselves share storage with Practice My Visit's speak-up cards, so
// a card made in either place shows up in both. Everything stays on this
// device.

export const SAY_CARDS: SpeakUpCard[] = [
  { id: "say-talk-to-me", icon: "talk", text: "Please talk to me." },
  { id: "say-more-time", icon: "clock", text: "I need more time." },
  { id: "say-dont-understand", icon: "question", text: "I don't understand." },
  { id: "say-again", icon: "repeat", text: "Can you say it again?" },
  { id: "say-not-normal", icon: "alert", text: "This is not normal for me." },
  { id: "say-pain", icon: "bandage", text: "I am in pain." },
  { id: "say-helper", icon: "person-plus", text: "I want my helper with me." },
  { id: "say-question", icon: "hand", text: "I have a question." },
];

export const FAVORITES_KEY = "verity-my-voice-card-favorites";
