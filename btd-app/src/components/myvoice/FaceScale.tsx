import { FEELINGS, FeelingId, ReadingLevel } from "../../lib/myVoice";
import { useMyVoice } from "../../context/MyVoiceContext";

// Five faces, great through really bad. Tapping one is enough to answer —
// no text is required at any tier.

type Props = {
  value: FeelingId | null;
  onChange: (id: FeelingId) => void;
  readingLevel: ReadingLevel;
};

export default function FaceScale({ value, onChange, readingLevel }: Props) {
  const { say } = useMyVoice();
  const showText = readingLevel !== "icon";

  return (
    <div
      role="radiogroup"
      aria-label="How do you feel overall?"
      className="flex flex-wrap justify-center gap-3"
    >
      {FEELINGS.map((f) => {
        const isOn = value === f.id;
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={isOn}
            aria-label={f.label}
            onClick={() => {
              onChange(f.id);
              say(f.label);
            }}
            className={`flex min-h-[104px] w-[104px] flex-col items-center justify-center gap-1 rounded-card border-2 transition-transform ${f.tone} ${
              isOn
                ? "border-navy scale-[1.04] shadow-[0_8px_22px_rgba(33,50,68,0.16)]"
                : "border-navy/12 hover:border-sky"
            }`}
          >
            <span aria-hidden="true" className="text-[2.5rem] leading-none">
              {f.face}
            </span>
            {showText && (
              <span className="text-13 font-bold text-navy">
                {readingLevel === "full" ? f.label : f.short}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
