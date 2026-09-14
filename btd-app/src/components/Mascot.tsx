import { useMyVoice } from "../context/MyVoiceContext";
import Icon from "./icons/Icon";
import type { ReadingLevel } from "../lib/myVoice";

// Vee — the My Voice mascot. Brand kit colors only: Sky Blue, Coral, Yellow.

type Mood = "hello" | "cheer" | "think" | "calm";

const EYES: Record<Mood, { open: number; smile: string }> = {
  hello: { open: 6, smile: "M 46 72 Q 60 84 74 72" },
  cheer: { open: 7, smile: "M 44 70 Q 60 88 76 70" },
  think: { open: 5, smile: "M 48 76 Q 60 81 72 76" },
  calm: { open: 2.5, smile: "M 48 75 Q 60 82 72 75" },
};

export function MascotFace({ mood = "hello", size = 84 }: { mood?: Mood; size?: number }) {
  const { open, smile } = EYES[mood];
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label="Vee, your helper"
      className="shrink-0"
    >
      {/* yellow spark behind the head */}
      <path
        d="M60 2 L68 20 L88 12 L80 32 L100 34 L84 47 L100 62 L80 64 L88 84 L68 76 L60 94 L52 76 L32 84 L40 64 L20 62 L36 47 L20 34 L40 32 L32 12 L52 20 Z"
        fill="#FFDE9E"
        opacity="0.55"
      />
      {/* head */}
      <circle cx="60" cy="60" r="34" fill="#8FCBF2" />
      <circle cx="60" cy="60" r="34" fill="none" stroke="#213244" strokeWidth="3" />
      {/* cheeks */}
      <ellipse cx="38" cy="68" rx="8" ry="5.5" fill="#FFA694" />
      <ellipse cx="82" cy="68" rx="8" ry="5.5" fill="#FFA694" />
      {/* eyes */}
      <circle cx="49" cy="54" r={open} fill="#213244" />
      <circle cx="71" cy="54" r={open} fill="#213244" />
      {/* mouth */}
      <path d={smile} fill="none" stroke="#213244" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Pick the right wording for the current reading level. One setting drives
 *  all three tiers — callers never configure this separately. */
export function forLevel(
  level: ReadingLevel,
  copy: { icon: string; short: string; full: string }
): string {
  if (level === "icon") return copy.icon;
  if (level === "icon-text") return copy.short;
  return copy.full;
}

type MascotProps = {
  mood?: Mood;
  /** Wording per reading level; the mascot picks the one that fits. */
  copy: { icon: string; short: string; full: string };
  size?: number;
};

export default function Mascot({ mood = "hello", copy, size = 84 }: MascotProps) {
  const { readingLevel, say, readAloud } = useMyVoice();
  const message = forLevel(readingLevel, copy);

  return (
    <div className="flex items-center gap-3">
      <MascotFace mood={mood} size={size} />
      <div className="relative rounded-card border border-navy/12 bg-white px-4 py-3">
        <span
          aria-hidden="true"
          className="absolute -left-[7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 border-b border-l border-navy/12 bg-white"
        />
        <p className="text-15 font-semibold leading-[1.5] text-navy">{message}</p>
        {readAloud && (
          <button
            type="button"
            onClick={() => say(message)}
            className="mt-1 inline-flex items-center gap-1.5 text-12 font-bold text-link hover:underline"
          >
            <Icon name="speaker" size={14} />
            Hear it
          </button>
        )}
      </div>
    </div>
  );
}
