import { useMyVoice } from "../../context/MyVoiceContext";
import Icon from "../icons/Icon";

/** The little speaker that sits next to a label. Hidden when read-aloud is
 *  off or the browser has no speech support, so it never becomes a dead
 *  control. */
export default function SpeakButton({ text, className = "" }: { text: string; className?: string }) {
  const { say, readAloud } = useMyVoice();
  if (!readAloud) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        say(text);
      }}
      aria-label={`Read aloud: ${text}`}
      className={`inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full border border-navy/15 bg-white text-link transition-colors hover:border-sky hover:bg-sky-tint ${className}`}
    >
      <Icon name="speaker" size={16} />
    </button>
  );
}
