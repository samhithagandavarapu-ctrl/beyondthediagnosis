import { useState } from "react";
import {
  PAIN_HOTSPOTS,
  PAIN_KINDS,
  PAIN_LEVELS,
  PainAreaId,
  PainKindId,
  PainLevel,
  PainSpot,
  PainView,
  ReadingLevel,
  painArea,
  painAreaView,
  painKind,
  painLevel,
  painSpotSentence,
} from "../../lib/myVoice";
import { useMyVoice } from "../../context/MyVoiceContext";
import SpeakButton from "./SpeakButton";
import Icon from "../icons/Icon";

// "Where does it hurt?": tap a place on the body (front or back), then a
// picture for how it feels and a face for how bad. Every place gets its own
// answers, so "my head is achy, a little" and "my lower belly is crampy, a
// whole lot" can both go to the doctor. Like BodyMap, the hotspots are real
// buttons over the drawing, so it works by keyboard and screen reader too.

type Props = {
  spots: PainSpot[];
  onChange: (spots: PainSpot[]) => void;
  readingLevel: ReadingLevel;
};

export default function PainMap({ spots, onChange, readingLevel }: Props) {
  const { say } = useMyVoice();
  const [view, setView] = useState<PainView>("front");
  const [current, setCurrent] = useState<PainAreaId | null>(null);
  const showText = readingLevel !== "icon";
  const currentSpot = spots.find((s) => s.area === current) ?? null;

  function pickArea(area: PainAreaId) {
    if (!spots.some((s) => s.area === area)) {
      onChange([...spots, { area, kind: null, level: null }]);
    }
    setCurrent(area);
    say(`${painArea(area).short}. What does it feel like?`);
  }

  function patchCurrent(patch: Partial<PainSpot>) {
    if (!current) return;
    onChange(spots.map((s) => (s.area === current ? { ...s, ...patch } : s)));
  }

  function remove(area: PainAreaId) {
    onChange(spots.filter((s) => s.area !== area));
    if (current === area) setCurrent(null);
    say(`Took off ${painArea(area).short}.`);
  }

  function edit(area: PainAreaId) {
    if (!PAIN_HOTSPOTS[view].some((h) => h.area === area)) setView(painAreaView(area));
    setCurrent(area);
    say(painArea(area).short);
  }

  return (
    <div className="grid gap-6">
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div>
          <ViewSwitch view={view} onChange={setView} showText={showText} />
          <div className="mx-auto mt-4 w-full max-w-[300px]">
            <div className="relative aspect-[1/2]">
              <Outline view={view} className="absolute inset-0 h-full w-full" />
              {PAIN_HOTSPOTS[view].map((spot) => {
                const marked = spots.find((s) => s.area === spot.area);
                const isCurrent = current === spot.area;
                const area = painArea(spot.area);
                return (
                  <button
                    key={spot.area}
                    type="button"
                    aria-pressed={!!marked}
                    aria-label={area.short}
                    onClick={() => pickArea(spot.area)}
                    style={{
                      left: `${spot.x}%`,
                      top: `${spot.y / 2}%`,
                      width: `${spot.w}%`,
                      height: `${spot.h / 2}%`,
                    }}
                    // Unmarked places stay visible: there's no hover on a
                    // touch screen and no words at the pictures-only tier.
                    className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
                      isCurrent
                        ? "border-4 border-navy bg-butter"
                        : marked
                          ? "border-2 border-navy bg-coral"
                          : "border-2 border-dashed border-navy/35 bg-white/55 hover:border-navy hover:bg-sky"
                    }`}
                  >
                    {marked?.level && (
                      <Icon name={painLevel(marked.level).icon} size={20} className="text-navy" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          {currentSpot ? (
            <SpotEditor
              spot={currentSpot}
              readingLevel={readingLevel}
              onKind={(kind) => patchCurrent({ kind })}
              onLevel={(level) => patchCurrent({ level })}
              onDone={() => {
                setCurrent(null);
                say("Tap another place, or tap I'm done.");
              }}
              onRemove={() => remove(currentSpot.area)}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-navy/20 bg-mist p-6 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-coral/30 text-navy">
                <Icon name="hand" size={34} />
              </span>
              {showText ? (
                <p className="flex items-center gap-2 text-17 font-display font-extrabold text-navy">
                  {spots.length ? "Tap another place that hurts" : "Tap where it hurts"}
                  <SpeakButton text={spots.length ? "Tap another place that hurts" : "Tap where it hurts"} />
                </p>
              ) : (
                <span className="sr-only">Tap where it hurts</span>
              )}
              {readingLevel === "full" && (
                <p className="text-15 text-body">
                  Tap Back to see the back of the body. The lower belly is below the belly
                  button — that's where period pain often is.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {spots.length > 0 && (
        <SpotList
          spots={spots}
          current={current}
          showText={showText}
          onEdit={edit}
          onRemove={remove}
        />
      )}
    </div>
  );
}

// ---- Front / back ----

function ViewSwitch({
  view,
  onChange,
  showText,
}: {
  view: PainView;
  onChange: (view: PainView) => void;
  showText: boolean;
}) {
  const { say } = useMyVoice();
  const options: { id: PainView; label: string; spoken: string }[] = [
    { id: "front", label: "Front", spoken: "The front of my body" },
    { id: "back", label: "Back", spoken: "The back of my body" },
  ];
  return (
    <div role="radiogroup" aria-label="Front or back of the body" className="flex justify-center gap-3">
      {options.map((o) => {
        const isOn = view === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={isOn}
            aria-label={o.spoken}
            onClick={() => {
              onChange(o.id);
              say(o.spoken);
            }}
            className={`flex min-h-[64px] min-w-[104px] items-center justify-center gap-2 rounded-tile border-2 px-4 py-2 transition-colors ${
              isOn ? "border-navy bg-sky" : "border-navy/15 bg-white hover:border-sky hover:bg-sky-tint"
            }`}
          >
            <Outline view={o.id} className="h-11 w-[22px]" />
            {showText && <span className="text-15 font-bold text-navy">{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** The same friendly outline as BodyMap. The front has a face and the back
 *  has hair, so the two read apart without any words. */
function Outline({ view, className = "" }: { view: PainView; className?: string }) {
  return (
    <svg viewBox="0 0 100 200" className={className} aria-hidden="true" focusable="false">
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
      {view === "front" ? (
        <g fill="none" stroke="#213244" strokeWidth="2" strokeLinecap="round">
          <circle cx="44" cy="20" r="1.6" fill="#213244" stroke="none" />
          <circle cx="56" cy="20" r="1.6" fill="#213244" stroke="none" />
          <path d="M44 27 Q50 31 56 27" />
          <circle cx="50" cy="80" r="1.4" fill="#213244" stroke="none" />
        </g>
      ) : (
        <g fill="#213244" fillOpacity="0.35" stroke="none">
          <path d="M34.4 18 A16 16 0 0 1 65.6 18 Q66 30 60 33 Q50 28 40 33 Q34 30 34.4 18 Z" />
          <path d="M50 50 v40" stroke="#213244" strokeOpacity="0.4" strokeWidth="1.6" fill="none" />
        </g>
      )}
    </svg>
  );
}

// ---- The place being answered now ----

function SpotEditor({
  spot,
  readingLevel,
  onKind,
  onLevel,
  onDone,
  onRemove,
}: {
  spot: PainSpot;
  readingLevel: ReadingLevel;
  onKind: (kind: PainKindId) => void;
  onLevel: (level: PainLevel) => void;
  onDone: () => void;
  onRemove: () => void;
}) {
  const { say } = useMyVoice();
  const showText = readingLevel !== "icon";
  const area = painArea(spot.area);
  const isItchy = spot.kind === "itchy";
  const kindQuestion = "What does it feel like?";
  const levelQuestion = isItchy ? "How much does it bother you?" : "How much does it hurt?";

  return (
    <div className="grid gap-5 rounded-card border-2 border-navy bg-white p-5">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 shrink-0 rounded-full border-2 border-navy bg-butter" aria-hidden="true" />
        <h3 className="text-21 font-display font-extrabold text-navy">{area.short}</h3>
        <SpeakButton text={area.short} />
      </div>
      {readingLevel === "full" && area.hint && <p className="-mt-3 text-15 text-body">{area.hint}</p>}

      <div>
        {showText && (
          <p className="mb-2 flex items-center gap-2 text-17 font-display font-extrabold text-navy">
            {kindQuestion}
            <SpeakButton text={kindQuestion} />
          </p>
        )}
        <div role="radiogroup" aria-label={kindQuestion} className="grid grid-cols-3 gap-2.5">
          {PAIN_KINDS.map((k) => {
            const isOn = spot.kind === k.id;
            return (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={isOn}
                aria-label={k.label}
                onClick={() => {
                  onKind(k.id);
                  say(`${k.short}. ${k.id === "itchy" ? "How much does it bother you?" : "How much does it hurt?"}`);
                }}
                className={`flex min-h-[92px] flex-col items-center justify-center gap-1 rounded-tile border-2 px-2 py-2 transition-colors ${
                  isOn ? "border-navy bg-coral" : "border-navy/15 bg-white hover:border-sky hover:bg-sky-tint"
                }`}
              >
                <Icon name={k.icon} size={38} className="text-navy" />
                {showText && (
                  <span className="text-13 font-bold leading-tight text-navy">
                    {readingLevel === "full" ? k.label : k.short}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {showText && (
          <p className="mb-2 flex items-center gap-2 text-17 font-display font-extrabold text-navy">
            {levelQuestion}
            <SpeakButton text={levelQuestion} />
          </p>
        )}
        <div role="radiogroup" aria-label={levelQuestion} className="grid grid-cols-5 gap-2">
          {PAIN_LEVELS.map((l) => {
            const isOn = spot.level === l.level;
            return (
              <button
                key={l.level}
                type="button"
                role="radio"
                aria-checked={isOn}
                aria-label={`${l.short}, ${l.level} out of 5`}
                onClick={() => {
                  onLevel(l.level);
                  say(`${l.short}. ${l.level} out of 5.`);
                }}
                className={`flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-tile border-2 px-1 py-2 transition-transform ${l.tone} ${
                  isOn
                    ? "scale-[1.04] border-navy shadow-[0_8px_22px_rgba(33,50,68,0.16)]"
                    : "border-navy/12 hover:border-sky"
                }`}
              >
                <Icon name={l.icon} size={36} className="text-navy" />
                {showText && (
                  <span className="text-12 font-bold leading-tight text-navy">
                    {readingLevel === "full" ? `${l.short} (${l.level})` : l.short}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onDone}
          className="btd-btn-sky min-h-[52px] gap-2 px-6 py-3 text-sm"
          aria-label="Done with this place"
        >
          <Icon name="check" size={20} />
          {showText ? "Done with this place" : <span className="sr-only">Done with this place</span>}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="btd-btn-outline min-h-[52px] gap-2 px-5 py-3 text-sm"
          aria-label="Take this place off"
        >
          <Icon name="trash" size={18} />
          {showText ? "Take it off" : <span className="sr-only">Take this place off</span>}
        </button>
      </div>
    </div>
  );
}

// ---- Every place marked so far ----

function SpotList({
  spots,
  current,
  showText,
  onEdit,
  onRemove,
}: {
  spots: PainSpot[];
  current: PainAreaId | null;
  showText: boolean;
  onEdit: (area: PainAreaId) => void;
  onRemove: (area: PainAreaId) => void;
}) {
  const { say } = useMyVoice();
  return (
    <div>
      {showText && (
        <p className="mb-3 flex items-center gap-2 text-17 font-display font-extrabold text-navy">
          Where it hurts
          <SpeakButton text={spots.map(painSpotSentence).join(" ")} />
        </p>
      )}
      <ul className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))]">
        {spots.map((spot) => {
          const area = painArea(spot.area);
          const sentence = painSpotSentence(spot);
          return (
            <li
              key={spot.area}
              className={`flex items-center gap-2 rounded-tile border-2 p-2 ${
                current === spot.area ? "border-navy bg-butter/40" : "border-navy/15 bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onEdit(spot.area);
                  say(sentence);
                }}
                aria-label={`${sentence} Tap to change.`}
                className="flex min-h-[56px] min-w-0 flex-1 items-center gap-2 rounded-tile px-1 text-left"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-coral/40 text-navy">
                  {spot.level ? <Icon name={painLevel(spot.level).icon} size={26} /> : <Icon name="hand" size={22} />}
                </span>
                {spot.kind && (
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky-tint text-navy">
                    <Icon name={painKind(spot.kind).icon} size={24} />
                  </span>
                )}
                {showText && (
                  <span className="min-w-0 text-15 font-bold leading-tight text-navy">{area.short}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onRemove(spot.area)}
                aria-label={`Take off ${area.short}`}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-navy/15 bg-white text-navy hover:border-coral hover:bg-coral/20"
              >
                <Icon name="trash" size={20} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
