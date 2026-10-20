import { useEffect, useRef, useState } from "react";
import { ReadingLevel } from "../../lib/myVoice";
import { CARD_ICONS, PRACTICE_KEYS, SpeakUpCard, readJson, writeJson } from "../../lib/practiceVisit";
import { FAVORITES_KEY, SAY_CARDS } from "../../lib/sayCards";
import { speak } from "../../lib/speech";
import { useMyVoice } from "../../context/MyVoiceContext";
import { usePracticeMode } from "../../context/PracticeModeContext";
import SpeakButton from "./SpeakButton";
import Icon, { IconName } from "../icons/Icon";

// "Say it my way": big picture cards that say the words out loud when
// tapped, a star to keep favorites at the top, and "Show the doctor" to fill
// the screen with one card. The words on a card are the message itself, so
// they show at every reading level — the doctor needs to read them too.
// A card always speaks, even with read-aloud switched off: here the voice is
// the person talking to the doctor, not the app reading to the person.

const PICTURES: IconName[] = [
  ...CARD_ICONS,
  "clock",
  "question",
  "repeat",
  "alert",
  "bandage",
  "person-plus",
  "heart",
  "doctor",
];

export default function SayCards({ readingLevel }: { readingLevel: ReadingLevel }) {
  const { say } = useMyVoice();
  const { practice } = usePracticeMode();
  const [custom, setCustom] = useState<SpeakUpCard[]>(() => readJson<SpeakUpCard[]>(PRACTICE_KEYS.cards, []));
  const [favorites, setFavorites] = useState<string[]>(() => readJson<string[]>(FAVORITES_KEY, []));
  const [showing, setShowing] = useState<SpeakUpCard | null>(null);
  const [making, setMaking] = useState(false);
  const showText = readingLevel !== "icon";

  // Practice mode: everything works, but nothing is kept once you leave.
  function keepCustom(next: SpeakUpCard[]) {
    setCustom(next);
    if (!practice) writeJson(PRACTICE_KEYS.cards, next);
  }

  function toggleFavorite(card: SpeakUpCard) {
    const isFav = favorites.includes(card.id);
    const next = isFav ? favorites.filter((id) => id !== card.id) : [...favorites, card.id];
    setFavorites(next);
    if (!practice) writeJson(FAVORITES_KEY, next);
    say(isFav ? "Taken off my favorites." : "Added to my favorites.");
  }

  const all = [...SAY_CARDS, ...custom];
  const favs = all.filter((c) => favorites.includes(c.id));
  const rest = all.filter((c) => !favorites.includes(c.id));

  function grid(cards: SpeakUpCard[]) {
    return (
      <ul className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))]">
        {cards.map((card) => (
          <SayCard
            key={card.id}
            card={card}
            favorite={favorites.includes(card.id)}
            mine={custom.some((c) => c.id === card.id)}
            showText={showText}
            onSpeak={() => speak(card.text)}
            onShow={() => {
              setShowing(card);
              speak(card.text);
            }}
            onFavorite={() => toggleFavorite(card)}
            onRemove={() => {
              keepCustom(custom.filter((c) => c.id !== card.id));
              say("Card taken away.");
            }}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="grid gap-6">
      {favs.length > 0 && (
        <div>
          <Heading text="My favorites" icon="star-filled" showText={showText} />
          {grid(favs)}
        </div>
      )}
      <div>
        {favs.length > 0 && <Heading text="All my cards" icon="card" showText={showText} />}
        {grid(rest)}
      </div>

      {making ? (
        <MakeCard
          readingLevel={readingLevel}
          onSave={(card) => {
            keepCustom([...custom, card]);
            setMaking(false);
            say(`New card: ${card.text}`);
          }}
          onCancel={() => setMaking(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setMaking(true);
            say("Make my own card");
          }}
          aria-label="Make my own card"
          className="flex min-h-[64px] w-full items-center justify-center gap-2 rounded-card border-2 border-dashed border-navy/30 bg-white text-17 font-bold text-navy hover:border-navy"
        >
          <Icon name="plus" size={24} />
          {showText && "Make my own card"}
        </button>
      )}

      {practice && (
        <p className="rounded-tile border border-butter bg-butter/30 px-4 py-2 text-13 font-semibold text-navy">
          Practice mode is on, so new cards and favorites won't be kept.
        </p>
      )}

      {showing && <ShowTheDoctor card={showing} onClose={() => setShowing(null)} />}
    </div>
  );
}

function Heading({ text, icon, showText }: { text: string; icon: IconName; showText: boolean }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-17 font-display font-extrabold text-navy">
      <Icon name={icon} size={22} />
      {showText ? text : <span className="sr-only">{text}</span>}
      <SpeakButton text={text} />
    </p>
  );
}

function SayCard({
  card,
  favorite,
  mine,
  showText,
  onSpeak,
  onShow,
  onFavorite,
  onRemove,
}: {
  card: SpeakUpCard;
  favorite: boolean;
  mine: boolean;
  showText: boolean;
  onSpeak: () => void;
  onShow: () => void;
  onFavorite: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="relative flex flex-col overflow-hidden rounded-card border-2 border-navy/12 bg-white">
      <button
        type="button"
        onClick={onSpeak}
        aria-label={`Say: ${card.text}`}
        className="flex min-h-[170px] flex-1 flex-col items-center justify-center gap-3 px-4 pb-3 pt-6 text-center transition-colors hover:bg-sky-tint"
      >
        <span className="grid h-[76px] w-[76px] place-items-center rounded-full bg-sky-tint text-navy">
          <Icon name={card.icon} size={42} />
        </span>
        <span className="text-17 font-display font-extrabold leading-snug text-navy">{card.text}</span>
      </button>

      <button
        type="button"
        onClick={onFavorite}
        aria-pressed={favorite}
        aria-label={favorite ? `Take off favorites: ${card.text}` : `Make favorite: ${card.text}`}
        className={`absolute right-2 top-2 grid h-12 w-12 place-items-center rounded-full border-2 transition-colors ${
          favorite ? "border-navy bg-butter text-navy" : "border-navy/15 bg-white text-navy/60 hover:border-navy"
        }`}
      >
        <Icon name={favorite ? "star-filled" : "star"} size={24} />
      </button>
      {mine && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Take away my card: ${card.text}`}
          className="absolute left-2 top-2 grid h-12 w-12 place-items-center rounded-full border-2 border-navy/15 bg-white text-navy hover:border-coral hover:bg-coral/20"
        >
          <Icon name="trash" size={20} />
        </button>
      )}

      <button
        type="button"
        onClick={onShow}
        aria-label={`Show the doctor: ${card.text}`}
        className="flex min-h-[52px] items-center justify-center gap-2 border-t-2 border-navy/12 bg-sky text-15 font-bold text-navy transition-colors hover:bg-sky-hover"
      >
        <Icon name="eye" size={20} />
        {showText ? "Show the doctor" : <span className="sr-only">Show the doctor</span>}
      </button>
    </li>
  );
}

function MakeCard({
  readingLevel,
  onSave,
  onCancel,
}: {
  readingLevel: ReadingLevel;
  onSave: (card: SpeakUpCard) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [icon, setIcon] = useState<IconName>("card");
  const label = "What do I want to say?";

  return (
    <div className="grid gap-4 rounded-card border-2 border-sky bg-white p-5">
      <label className="grid gap-2">
        <span className="flex items-center gap-2 text-17 font-display font-extrabold text-navy">
          {label}
          <SpeakButton text={label} />
        </span>
        {readingLevel === "icon" && (
          <span className="text-13 text-muted">A helper can type the words for you.</span>
        )}
        <input
          className="btd-input min-h-[52px] text-base"
          aria-label={label}
          value={text}
          maxLength={80}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <div>
        <p className="mb-2 flex items-center gap-2 text-17 font-display font-extrabold text-navy">
          Pick a picture
          <SpeakButton text="Pick a picture" />
        </p>
        <div role="radiogroup" aria-label="Picture for my card" className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {PICTURES.map((name) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={icon === name}
              aria-label={name.replace(/-/g, " ")}
              onClick={() => setIcon(name)}
              className={`flex aspect-square min-h-[48px] items-center justify-center rounded-lg border-2 text-navy ${
                icon === name ? "border-navy bg-sky" : "border-navy/15 bg-white hover:border-sky"
              }`}
            >
              <Icon name={name} size={24} />
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => onSave({ id: `mine-${Date.now()}`, icon, text: text.trim() })}
          className="btd-btn-coral min-h-[52px] gap-2 px-6 text-sm disabled:opacity-40"
        >
          <Icon name="check" size={20} />
          Save my card
        </button>
        {text.trim() && (
          <button
            type="button"
            onClick={() => speak(text)}
            className="btd-btn-outline min-h-[52px] gap-2 px-5 text-sm"
          >
            <Icon name="speaker" size={18} />
            Hear it
          </button>
        )}
        <button type="button" onClick={onCancel} className="btd-btn-outline min-h-[52px] px-5 text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

/** One card, full screen, to hold up in the room. */
function ShowTheDoctor({ card, onClose }: { card: SpeakUpCard; onClose: () => void }) {
  const doneRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    doneRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={card.text}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-y-auto bg-white p-6 text-center"
    >
      <span className="grid h-36 w-36 place-items-center rounded-full bg-sky text-navy">
        <Icon name={card.icon} size={84} />
      </span>
      <p className="mt-8 max-w-[14em] font-display text-[clamp(2.5rem,10vw,5.5rem)] font-extrabold leading-[1.08] text-navy">
        {card.text}
      </p>
      <div className="mt-10 flex w-full max-w-[420px] flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => speak(card.text)}
          className="btd-btn-sky min-h-[60px] flex-1 gap-2 whitespace-nowrap px-6 text-base"
        >
          <Icon name="speaker" size={22} />
          Say it again
        </button>
        <button
          ref={doneRef}
          type="button"
          onClick={onClose}
          className="btd-btn min-h-[60px] flex-1 bg-navy px-8 text-base text-mist hover:bg-navy/90"
        >
          Done
        </button>
      </div>
    </div>
  );
}
