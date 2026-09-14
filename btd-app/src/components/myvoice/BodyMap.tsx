import {
  BODY_PARTS,
  BodyPartId,
  MAPPED_BODY_PARTS,
  OFF_MAP_BODY_PARTS,
  ReadingLevel,
} from "../../lib/myVoice";
import { useMyVoice } from "../../context/MyVoiceContext";

// Tappable body outline. The hotspots are real buttons layered over the
// drawing, so the map works with a keyboard and a screen reader as well as
// with a finger. Parts a front view can't show — eyes, ears, mouth, back —
// get their own picture buttons underneath rather than crowding the face
// with targets too small to tap apart.

type Props = {
  selected: BodyPartId[];
  onToggle: (id: BodyPartId) => void;
  readingLevel: ReadingLevel;
};

export default function BodyMap({ selected, onToggle, readingLevel }: Props) {
  const { say } = useMyVoice();
  const showText = readingLevel !== "icon";

  function handle(id: BodyPartId, label: string) {
    onToggle(id);
    say(label);
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-[280px]">
        <div className="relative aspect-[1/2]">
          <svg
            viewBox="0 0 100 200"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
            focusable="false"
          >
            {/* Simple, friendly body outline in brand sky blue. */}
            <g fill="#E4F1FC" stroke="#213244" strokeWidth="2" strokeLinejoin="round">
              <circle cx="50" cy="22" r="16" />
              <rect x="44" y="37" width="12" height="8" rx="3" />
              <path d="M30 46 h40 a8 8 0 0 1 8 8 v40 a6 6 0 0 1 -6 6 h-44 a6 6 0 0 1 -6 -6 v-40 a8 8 0 0 1 8 -8 z" />
              <path d="M28 50 l-12 6 a5 5 0 0 0 -3 5 v40 a5 5 0 0 0 10 0 v-33 z" />
              <path d="M72 50 l12 6 a5 5 0 0 1 3 5 v40 a5 5 0 0 1 -10 0 v-33 z" />
              <path d="M34 100 h14 v78 a6 6 0 0 1 -12 0 z" />
              <path d="M52 100 h14 v78 a6 6 0 0 1 -12 0 z" />
              <ellipse cx="41" cy="188" rx="9" ry="6" />
              <ellipse cx="59" cy="188" rx="9" ry="6" />
            </g>
          </svg>

          {MAPPED_BODY_PARTS.map((part) => {
            const isOn = selected.includes(part.id);
            return (
              <button
                key={part.id}
                type="button"
                aria-pressed={isOn}
                aria-label={part.label}
                onClick={() => handle(part.id, part.label)}
                style={{
                  left: `${part.x}%`,
                  top: `${part.y}%`,
                  width: `${part.size}%`,
                  height: `${(part.size as number) / 2}%`,
                }}
                // Unselected hotspots stay visible rather than appearing on
                // hover: on a touch screen there is no hover, and the
                // pictures-only tier has no words to fall back on.
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors ${
                  isOn
                    ? "border-navy bg-coral"
                    : "border-dashed border-navy/35 bg-white/55 hover:border-navy hover:bg-sky"
                }`}
              >
                <span className="sr-only">{part.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The parts the outline can't show. Pictures at every tier, so this
          row works without any reading. */}
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        {OFF_MAP_BODY_PARTS.map((part) => {
          const isOn = selected.includes(part.id);
          return (
            <button
              key={part.id}
              type="button"
              aria-pressed={isOn}
              aria-label={part.label}
              onClick={() => handle(part.id, part.label)}
              className={`flex min-h-[60px] min-w-[60px] flex-col items-center justify-center gap-0.5 rounded-tile border-2 px-3 py-2 transition-colors ${
                isOn
                  ? "border-navy bg-coral"
                  : "border-navy/15 bg-white hover:border-sky hover:bg-sky-tint"
              }`}
            >
              <span aria-hidden="true" className="text-2xl leading-none">
                {part.icon}
              </span>
              {showText ? (
                <span className="text-12 font-bold text-navy">{part.short}</span>
              ) : (
                <span className="sr-only">{part.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Word chips for everything, once there are words to show. At the
          pictures-only tier the map and the picture buttons are enough. */}
      {showText && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {BODY_PARTS.map((part) => {
            const isOn = selected.includes(part.id);
            return (
              <button
                key={part.id}
                type="button"
                aria-pressed={isOn}
                onClick={() => handle(part.id, part.label)}
                className={`min-h-[40px] rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  isOn
                    ? "border-navy bg-coral text-navy"
                    : "border-navy/15 bg-white text-body hover:border-sky hover:bg-sky-tint"
                }`}
              >
                {readingLevel === "full" ? part.label : part.short}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
