import { STICKER_KINDS, stickerKind } from "../../lib/myVoice";
import { useMyVoice } from "../../context/MyVoiceContext";
import SpeakButton from "./SpeakButton";
import StickerBadge from "./StickerBadge";

// Stickers reward an action that was taken — never a streak, and never a day
// that was missed. A sticker you haven't earned yet just shows what earns it.

export default function StickerBook() {
  const { stickers, readingLevel } = useMyVoice();
  const counts = stickers.reduce<Record<string, number>>((acc, s) => {
    acc[s.id] = (acc[s.id] ?? 0) + 1;
    return acc;
  }, {});
  const showText = readingLevel !== "icon";

  return (
    <div>
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))]">
        {STICKER_KINDS.map((kind) => {
          const count = counts[kind.id] ?? 0;
          const earned = count > 0;
          return (
            <div
              key={kind.id}
              className={`rounded-card border-2 p-5 text-center transition-colors ${
                earned ? "border-sky bg-sky-tint" : "border-dashed border-navy/20 bg-white"
              }`}
            >
              <div className="flex justify-center">
                <StickerBadge id={kind.id} earned={earned} size={118} />
              </div>
              {showText && (
                <p className="mt-2 text-sm font-bold text-navy">{kind.label}</p>
              )}
              <p className="mt-1 text-12 text-muted">
                {earned
                  ? count > 1
                    ? `Earned ${count} times`
                    : "Earned"
                  : showText
                  ? "Not yet"
                  : ""}
              </p>
              {showText && (
                <div className="mt-2 flex justify-center">
                  <SpeakButton text={earned ? `${kind.label}. ${kind.earnedFor}` : kind.label} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {stickers.length > 0 && (
        <p className="mt-5 text-13 text-muted">
          {stickers.length === 1
            ? "1 sticker so far."
            : `${stickers.length} stickers so far.`}{" "}
          Most recent: {stickerKind(stickers[stickers.length - 1].id).earnedFor}
        </p>
      )}
    </div>
  );
}
