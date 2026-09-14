import {
  BODY_PARTS,
  BodyPartId,
  CheckIn,
  FEELINGS,
  FeelingId,
  ReadingLevel,
  SINCE_OPTIONS,
  SinceId,
  buildSentence,
} from "../../lib/myVoice";
import { useMyVoice } from "../../context/MyVoiceContext";
import SpeakButton from "./SpeakButton";

// "Tell my doctor": tap three things and a sentence appears. The result is
// plain text, and it rides along on the check-in data so the Appointment Prep
// export can print it without knowing anything about this screen.

type Props = {
  value: CheckIn;
  onChange: (patch: Partial<CheckIn>) => void;
  readingLevel: ReadingLevel;
};

export default function SentenceBuilder({ value, onChange, readingLevel }: Props) {
  const { say } = useMyVoice();
  const showText = readingLevel !== "icon";
  const sentence = buildSentence(value);

  function toggleBodyPart(id: BodyPartId) {
    const next = value.bodyParts.includes(id)
      ? value.bodyParts.filter((p) => p !== id)
      : [...value.bodyParts, id];
    onChange({ bodyParts: next });
  }

  return (
    <div className="grid gap-6">
      <Slot label="I feel…" showText={showText}>
        <div className="flex flex-wrap gap-2">
          {FEELINGS.map((f) => (
            <Chip
              key={f.id}
              on={value.overall === f.id}
              icon={f.face}
              text={readingLevel === "full" ? f.label : f.short}
              showText={showText}
              ariaLabel={f.label}
              onClick={() => {
                onChange({ overall: f.id as FeelingId });
                say(f.label);
              }}
            />
          ))}
        </div>
      </Slot>

      <Slot label="in my…" showText={showText}>
        <div className="flex flex-wrap gap-2">
          {BODY_PARTS.map((p) => (
            <Chip
              key={p.id}
              on={value.bodyParts.includes(p.id)}
              icon={p.icon ?? null}
              text={readingLevel === "full" ? p.label : p.short}
              showText={showText}
              ariaLabel={p.label}
              onClick={() => {
                toggleBodyPart(p.id);
                say(p.label);
              }}
            />
          ))}
        </div>
      </Slot>

      <Slot label="since…" showText={showText}>
        <div className="flex flex-wrap gap-2">
          {SINCE_OPTIONS.map((s) => (
            <Chip
              key={s.id}
              on={value.since === s.id}
              icon={s.icon}
              text={readingLevel === "full" ? s.label : s.short}
              showText={showText}
              ariaLabel={s.label}
              onClick={() => {
                onChange({ since: s.id as SinceId });
                say(s.label);
              }}
            />
          ))}
        </div>
      </Slot>

      <div className="rounded-card border-2 border-sky bg-sky-tint p-5">
        <p className="btd-eyebrow">What I will say</p>
        <div className="mt-2 flex items-start gap-3">
          <p className="flex-1 text-21 font-display font-extrabold leading-[1.35] text-navy">
            {sentence || "Tap a face and a body part to start your sentence."}
          </p>
          {sentence && <SpeakButton text={sentence} className="mt-1" />}
        </div>
      </div>
    </div>
  );
}

function Slot({
  label,
  showText,
  children,
}: {
  label: string;
  showText: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      {showText && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-17 font-display font-extrabold text-navy">{label}</span>
          <SpeakButton text={label} />
        </div>
      )}
      {children}
    </div>
  );
}

function Chip({
  on,
  icon,
  text,
  showText,
  ariaLabel,
  onClick,
}: {
  on: boolean;
  icon: string | null;
  text: string;
  showText: boolean;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`flex min-h-[48px] items-center gap-2 rounded-full border-2 px-4 py-2 font-semibold transition-colors ${
        on
          ? "border-navy bg-coral text-navy"
          : "border-navy/15 bg-white text-body hover:border-sky hover:bg-sky-tint"
      }`}
    >
      {icon && (
        <span aria-hidden="true" className="text-xl leading-none">
          {icon}
        </span>
      )}
      {showText ? <span className="text-sm">{text}</span> : <span className="sr-only">{text}</span>}
    </button>
  );
}
