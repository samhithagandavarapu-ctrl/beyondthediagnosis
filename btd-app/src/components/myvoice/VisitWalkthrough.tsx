import { useRef, useState } from "react";
import { ReadingLevel, walkthroughCards } from "../../lib/myVoice";
import { useMyVoice } from "../../context/MyVoiceContext";
import SpeakButton from "./SpeakButton";
import Icon from "../icons/Icon";

// Static picture sequence — arrival through done. No branching in v1: it is
// the same visit every time, which is the point.

type Props = {
  readingLevel: ReadingLevel;
  onReachedEnd?: () => void;
};

export default function VisitWalkthrough({ readingLevel, onReachedEnd }: Props) {
  const { say } = useMyVoice();
  const cards = walkthroughCards(readingLevel);
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const reachedEnd = useRef(false);

  const card = cards[index];
  const showText = readingLevel !== "icon";
  const spoken = showText ? `${card.title}. ${card.body}` : card.short;

  function go(next: number) {
    const clamped = Math.max(0, Math.min(cards.length - 1, next));
    setIndex(clamped);
    const target = cards[clamped];
    say(showText ? `${target.title}. ${target.body}` : target.short);
    if (clamped === cards.length - 1 && !reachedEnd.current) {
      reachedEnd.current = true;
      onReachedEnd?.();
    }
  }

  return (
    <div>
      <div
        className="btd-card p-7 text-center"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start === null) return;
          const dx = e.changedTouches[0].clientX - start;
          if (Math.abs(dx) < 40) return;
          go(dx < 0 ? index + 1 : index - 1);
        }}
      >
        <p className="btd-eyebrow">
          Step {index + 1} of {cards.length}
        </p>
        <div className="my-5 flex justify-center">
          <span className="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-sky-tint text-navy">
            <Icon name={card.icon} size={48} />
          </span>
        </div>
        {/* Each tier says the step once: the short label on its own until
            there's room for the full sentence and its explanation. */}
        {readingLevel === "full" ? (
          <>
            <h3 className="text-23 font-extrabold text-navy">{card.title}</h3>
            <p className="mx-auto mt-3 max-w-[32em] text-base leading-[1.7] text-body">
              {card.body}
            </p>
          </>
        ) : (
          <h3 className="text-23 font-extrabold text-navy">{card.short}</h3>
        )}
        <div className="mt-4 flex justify-center">
          <SpeakButton text={spoken} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="btd-btn-outline min-h-[48px] px-5 py-3 text-sm disabled:opacity-35"
        >
          ← Back
        </button>

        <div className="flex gap-2" role="tablist" aria-label="Visit steps">
          {cards.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={c.short}
              onClick={() => go(i)}
              className={`h-3.5 w-3.5 rounded-full border transition-colors ${
                i === index ? "border-navy bg-navy" : "border-navy/30 bg-white hover:bg-sky"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === cards.length - 1}
          className="btd-btn-sky min-h-[48px] px-5 py-3 text-sm disabled:opacity-35"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
