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
    window.speechSynthesis.speak(utterance);
  } catch {
    // A browser that refuses to speak shouldn't break the flow.
  }
}
