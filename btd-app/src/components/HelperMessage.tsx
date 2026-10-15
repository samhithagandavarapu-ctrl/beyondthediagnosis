import { useMyVoice } from "../context/MyVoiceContext";
import Icon from "./icons/Icon";
import type { ReadingLevel } from "../lib/myVoice";

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

/** A short "what to do here" note for the My Voice pages, worded for the
 *  current reading level, with a read-aloud button when that's switched on. */
export default function HelperMessage({
  copy,
}: {
  /** Wording per reading level; the message picks the one that fits. */
  copy: { icon: string; short: string; full: string };
}) {
  const { readingLevel, say, readAloud } = useMyVoice();
  const message = forLevel(readingLevel, copy);

  return (
    <div className="flex items-center gap-3 rounded-card border border-navy/12 bg-white px-4 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-tint text-navy">
        <Icon name="chat" size={20} />
      </span>
      <div className="min-w-0 flex-1">
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
