import { useEffect, useRef, useState } from "react";
import Icon from "./icons/Icon";

// "Talk instead of typing": a mic button that turns speech into text in the
// box next to it, using the browser's own speech recognition. Browsers
// without it (Firefox, for one) just don't show the button, so typing always
// still works.
//
// Note: Chrome and Edge send the audio to their own speech service to turn
// it into text. Nothing is sent to Voiced, and no recording is kept.

// The Web Speech API isn't in TypeScript's DOM types yet, so describe the
// small part used here.
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function dictationSupported(): boolean {
  return getRecognition() !== null;
}

type Props = {
  value: string;
  onChange: (next: string) => void;
  /** "icon": a round button for a chat bar. "inline": a small labelled
   *  button that sits under a text box. */
  variant?: "icon" | "inline";
  /** What the box is, for screen readers: "Talk to fill in: <label>". */
  label?: string;
};

export default function DictateButton({ value, onChange, variant = "inline", label }: Props) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  // Always call the latest onChange, even though recognition callbacks were
  // set up when listening started.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Stop listening if the page changes mid-sentence.
  useEffect(() => () => recRef.current?.abort(), []);

  const Ctor = getRecognition();
  if (!Ctor) return null;

  function start() {
    if (!Ctor) return;
    setError(null);
    const rec = new Ctor();
    rec.lang = document.documentElement.lang || "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    // Spoken words go after whatever is already typed.
    const base = value && !/\s$/.test(value) ? value + " " : value;
    let finished = "";

    rec.onresult = (e) => {
      let inProgress = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finished += r[0].transcript.trim() + " ";
        else inProgress += r[0].transcript;
      }
      onChangeRef.current((base + finished + inProgress).trimEnd());
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("The microphone is turned off for this site. You can type instead.");
      } else if (e.error === "no-speech") {
        setError("I didn't hear anything. Try again, or type instead.");
      } else if (e.error !== "aborted") {
        setError("Talking didn't work this time. You can type instead.");
      }
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };

    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      setError("Talking didn't work this time. You can type instead.");
    }
  }

  function stop() {
    recRef.current?.stop();
  }

  const a11yLabel = listening ? "Stop talking" : label ? `Talk to fill in: ${label}` : "Talk instead of typing";

  if (variant === "icon") {
    return (
      <span className="relative inline-flex">
        <button
          type="button"
          onClick={listening ? stop : start}
          aria-pressed={listening}
          aria-label={a11yLabel}
          title={listening ? "Stop" : "Talk instead of typing"}
          className={`grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full border transition-colors ${
            listening
              ? "border-coral bg-coral text-navy animate-pulse"
              : "border-navy/20 bg-white text-navy hover:border-navy/50"
          }`}
        >
          <Icon name={listening ? "stop" : "mic"} size={20} />
        </button>
        {error && (
          <span role="alert" className="absolute bottom-full right-0 mb-2 w-60 rounded-tile bg-navy px-3 py-2 text-12 text-mist shadow">
            {error}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-pressed={listening}
        aria-label={a11yLabel}
        className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
          listening
            ? "border-coral bg-coral text-navy"
            : "border-navy/20 bg-white text-navy hover:border-navy/50"
        }`}
      >
        <Icon name={listening ? "stop" : "mic"} size={16} />
        {listening ? "Stop" : "Talk instead"}
      </button>
      {listening && (
        <span className="text-13 font-semibold text-navy" aria-live="polite">
          Listening… say it in your own words.
        </span>
      )}
      {error && (
        <span role="alert" className="text-13 font-semibold text-clay">
          {error}
        </span>
      )}
    </div>
  );
}
