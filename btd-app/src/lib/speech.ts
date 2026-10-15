// Read-aloud support for "My Voice".
//
// There is no existing TTS service in the app (the "Easy read" accessibility
// mode only changes type size and spacing), so this wraps the browser's
// SpeechSynthesis API. Everything degrades quietly: if the browser has no
// speech support, callers just get a no-op and the UI stays usable.

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking() {
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
}

// Without a chosen voice the browser uses its default, which on many devices
// is a harsh, robotic one. Pick the warmest-sounding voice it offers instead.

// Names of higher-quality voices, best first. Matched as substrings.
const PREFERRED = [
  "natural", // Microsoft Edge "… Online (Natural)" voices
  "neural",
  "premium",
  "enhanced",
  "google us english",
  "google uk english female",
  "samantha",
  "ava",
  "allison",
  "susan",
  "karen",
  "moira",
  "tessa",
  "serena",
  "aria",
  "jenny",
  "zira",
];

// Novelty and low-quality voices (mostly macOS) that should never be picked.
const AVOID = [
  "compact", "albert", "bad news", "bahh", "bells", "boing", "bubbles", "cellos",
  "wobble", "zarvox", "trinoids", "whisper", "jester", "organ", "superstar",
  "good news", "hysterical", "deranged", "pipe organ", "ralph", "fred", "junior",
  "kathy", "princess", "eddy", "flo", "grandma", "grandpa", "reed", "rocko",
  "sandy", "shelley",
];

let chosenVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (chosenVoice) return chosenVoice;
  const lang = (document.documentElement.lang || "en-US").toLowerCase();
  const base = lang.split("-")[0];
  const voices = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(base))
    .filter((v) => !AVOID.some((bad) => v.name.toLowerCase().includes(bad)));
  if (voices.length === 0) return null;

  const score = (v: SpeechSynthesisVoice) => {
    const name = v.name.toLowerCase();
    const rank = PREFERRED.findIndex((good) => name.includes(good));
    let s = rank === -1 ? 0 : 100 - rank;
    if (v.lang.toLowerCase().replace("_", "-") === lang) s += 5;
    return s;
  };
  chosenVoice = [...voices].sort((a, b) => score(b) - score(a))[0];
  return chosenVoice;
}

// Voices often load after the page does; choose again once they arrive.
if (speechSupported()) {
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    chosenVoice = null;
  });
}

/** Speak a short label. Cancels anything already being spoken first, so
 *  tapping through icons quickly doesn't queue up a backlog of audio. */
export function speak(text: string) {
  if (!speechSupported()) return;
  const trimmed = text.trim();
  if (!trimmed) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(trimmed);
    // Slightly slower than default — this is read aloud for comprehension,
    // not for speed.
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.lang = document.documentElement.lang || "en-US";
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  } catch {
    // A browser that refuses to speak shouldn't break the flow.
  }
}
