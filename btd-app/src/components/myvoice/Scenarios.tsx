import { useState } from "react";
import { ReadingLevel } from "../../lib/myVoice";
import { readJson, writeJson } from "../../lib/practiceVisit";
import {
  LEVELS_KEY,
  PRACTICE_LEVELS,
  PracticeLevelId,
  PracticeLevels,
  SCENARIOS,
  Scenario,
  ScenarioChoice,
} from "../../lib/scenarios";
import { useMyVoice } from "../../context/MyVoiceContext";
import { usePracticeMode } from "../../context/PracticeModeContext";
import SpeakButton from "./SpeakButton";
import Icon from "../icons/Icon";

// Practice stories: pick a story, see it in pictures, choose what to do,
// get kind feedback, then mark how far along you are — with a helper, by
// yourself, or for real. Stars and checkmarks only; no points.

export default function Scenarios({ readingLevel }: { readingLevel: ReadingLevel }) {
  const { say } = useMyVoice();
  const { practice } = usePracticeMode();
  const [levels, setLevels] = useState<PracticeLevels>(() => readJson<PracticeLevels>(LEVELS_KEY, {}));
  const [open, setOpen] = useState<Scenario | null>(null);
  const showText = readingLevel !== "icon";

  function toggleLevel(id: string, level: PracticeLevelId) {
    const have = levels[id] ?? [];
    const next = { ...levels, [id]: have.includes(level) ? have.filter((l) => l !== level) : [...have, level] };
    setLevels(next);
    // Practice mode: the checkmarks show, but aren't kept.
    if (!practice) writeJson(LEVELS_KEY, next);
  }

  if (open) {
    return (
      <Story
        key={open.id}
        scenario={open}
        readingLevel={readingLevel}
        reached={levels[open.id] ?? []}
        onToggleLevel={(level) => toggleLevel(open.id, level)}
        onBack={() => {
          setOpen(null);
          say("Pick a story.");
        }}
      />
    );
  }

  return (
    <div className="grid gap-4">
      <ul className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))]">
        {SCENARIOS.map((s) => {
          const title = readingLevel === "full" ? s.title : s.short;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(s);
                  say(s.title);
                }}
                aria-label={s.title}
                className="btd-card btd-card-hover flex h-full min-h-[150px] w-full flex-col items-center justify-center gap-3 p-5 text-center"
              >
                <span className="grid h-[68px] w-[68px] place-items-center rounded-full bg-sky-tint text-navy">
                  <Icon name={s.icon} size={36} />
                </span>
                {showText && <span className="text-17 font-display font-extrabold text-navy">{title}</span>}
                <LevelMarks reached={levels[s.id] ?? []} />
              </button>
            </li>
          );
        })}
      </ul>
      {practice && (
        <p className="rounded-tile border border-butter bg-butter/30 px-4 py-2 text-13 font-semibold text-navy">
          Practice mode is on, so checkmarks and stars won't be kept.
        </p>
      )}
    </div>
  );
}

/** Three small marks: a check for each practice level reached, a star for
 *  doing it for real. */
function LevelMarks({ reached }: { reached: PracticeLevelId[] }) {
  const label = PRACTICE_LEVELS.filter((l) => reached.includes(l.id)).map((l) => l.label).join(", ");
  return (
    <span className="flex items-center gap-1.5" aria-label={label ? `Done: ${label}` : "Not practiced yet"} role="img">
      {PRACTICE_LEVELS.map((l) => {
        const on = reached.includes(l.id);
        const icon = l.id === "real" ? (on ? "star-filled" : "star") : "check";
        return (
          <span
            key={l.id}
            className={`grid h-8 w-8 place-items-center rounded-full border-2 ${
              on ? (l.id === "real" ? "border-navy bg-butter text-navy" : "border-navy bg-sky text-navy") : "border-navy/15 text-navy/25"
            }`}
          >
            <Icon name={icon} size={16} />
          </span>
        );
      })}
    </span>
  );
}

function Story({
  scenario,
  readingLevel,
  reached,
  onToggleLevel,
  onBack,
}: {
  scenario: Scenario;
  readingLevel: ReadingLevel;
  reached: PracticeLevelId[];
  onToggleLevel: (level: PracticeLevelId) => void;
  onBack: () => void;
}) {
  const { say } = useMyVoice();
  // Scenes first, then the choice.
  const [scene, setScene] = useState(0);
  const [picked, setPicked] = useState<ScenarioChoice | null>(null);
  const showText = readingLevel !== "icon";
  const atChoice = scene >= scenario.scenes.length;

  function sceneSpoken(i: number) {
    const s = scenario.scenes[i];
    return s.says ? `${s.text} They say: ${s.says}` : s.text;
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="text-sm font-bold text-link hover:underline">
          ← All stories
        </button>
      </div>
      <div className="flex items-center gap-2">
        <h2 className="text-23 font-display font-extrabold text-navy">{scenario.title}</h2>
        <SpeakButton text={scenario.title} />
      </div>

      {!atChoice ? (
        <div className="btd-card grid gap-5 p-6">
          <ScenePanel scene={scenario.scenes[scene]} showText={showText} />
          <div className="flex flex-wrap items-center gap-3">
            <SpeakButton text={sceneSpoken(scene)} />
            {scene > 0 && (
              <button
                type="button"
                onClick={() => {
                  setScene(scene - 1);
                  say(sceneSpoken(scene - 1));
                }}
                className="btd-btn-outline min-h-[56px] px-6 text-sm"
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const next = scene + 1;
                setScene(next);
                say(next < scenario.scenes.length ? sceneSpoken(next) : scenario.question);
              }}
              className="btd-btn-coral min-h-[56px] gap-2 px-8 text-base"
            >
              Next
              <Icon name="chevron-right" size={20} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="btd-card grid gap-4 p-6">
            <p className="flex items-center gap-2 text-21 font-display font-extrabold text-navy">
              {scenario.question}
              <SpeakButton text={scenario.question} />
            </p>
            <div className="grid gap-3">
              {scenario.choices.map((c) => {
                const isOn = picked?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => {
                      setPicked(c);
                      say(`${c.text} ${c.feedback}`);
                    }}
                    className={`flex min-h-[72px] items-center gap-4 rounded-tile border-2 px-4 py-3 text-left transition-colors ${
                      isOn ? "border-navy bg-sky" : "border-navy/15 bg-white hover:border-sky hover:bg-sky-tint"
                    }`}
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-navy ring-1 ring-navy/12">
                      <Icon name={c.icon} size={26} />
                    </span>
                    {/* The choices are what to say, so the words show at every
                        reading level; read-aloud says them too. */}
                    <span className="text-17 font-bold leading-snug text-navy">{c.text}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setScene(0);
                setPicked(null);
                say(sceneSpoken(0));
              }}
              className="justify-self-start text-sm font-bold text-link hover:underline"
            >
              See the story again
            </button>
          </div>

          {picked && (
            <div
              role="status"
              className={`flex items-start gap-4 rounded-card border-2 p-5 ${
                picked.best ? "border-sky bg-sky-tint" : "border-butter bg-butter/30"
              }`}
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-navy">
                <Icon name={picked.best ? "celebrate" : "heart"} size={30} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-17 font-semibold leading-relaxed text-navy">{picked.feedback}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <SpeakButton text={picked.feedback} />
                  {!picked.best && (
                    <button
                      type="button"
                      onClick={() => {
                        setPicked(null);
                        say("Try another choice.");
                      }}
                      className="btd-btn-outline min-h-[48px] px-5 text-sm"
                    >
                      Try another choice
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {picked && (
            <LevelPath reached={reached} onToggle={onToggleLevel} showText={showText} readingLevel={readingLevel} />
          )}
        </>
      )}
    </div>
  );
}

/** A little comic panel: big pictures in a row, a speech bubble if someone
 *  is talking, and the words under it. */
function ScenePanel({
  scene,
  showText,
}: {
  scene: Scenario["scenes"][number];
  showText: boolean;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex min-h-[160px] flex-wrap items-center justify-center gap-4 rounded-card bg-sky-tint px-4 py-6">
        {scene.icons.map((icon, i) => (
          <span key={i} className="grid h-24 w-24 place-items-center rounded-full bg-white text-navy shadow-sm">
            <Icon name={icon} size={52} />
          </span>
        ))}
      </div>
      {scene.says && (
        <p className="relative justify-self-center rounded-card border-2 border-navy bg-white px-5 py-3 text-17 font-bold text-navy">
          <span className="sr-only">They say: </span>“{scene.says}”
        </p>
      )}
      {showText && <p className="text-center text-17 font-semibold leading-relaxed text-navy">{scene.text}</p>}
    </div>
  );
}

function LevelPath({
  reached,
  onToggle,
  showText,
  readingLevel,
}: {
  reached: PracticeLevelId[];
  onToggle: (level: PracticeLevelId) => void;
  showText: boolean;
  readingLevel: ReadingLevel;
}) {
  const { say } = useMyVoice();
  const heading = "How did I practice?";
  return (
    <div className="btd-card p-6">
      <p className="mb-1 flex items-center gap-2 text-21 font-display font-extrabold text-navy">
        {heading}
        <SpeakButton text={heading} />
      </p>
      {readingLevel === "full" && (
        <p className="mb-3 text-15 text-body">
          Tap each one you've done. First with a helper, then by yourself — and then for real at the
          doctor.
        </p>
      )}
      <ol className="mt-3 grid gap-3 sm:grid-cols-3">
        {PRACTICE_LEVELS.map((l, i) => {
          const on = reached.includes(l.id);
          const isReal = l.id === "real";
          return (
            <li key={l.id} className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={on}
                aria-label={l.label}
                onClick={() => {
                  onToggle(l.id);
                  say(on ? `${l.label}. Taken off.` : isReal ? `${l.label} Amazing!` : `${l.label}. Done!`);
                }}
                className={`flex min-h-[110px] flex-1 flex-col items-center justify-center gap-2 rounded-tile border-2 px-3 py-3 text-center transition-colors ${
                  on
                    ? isReal
                      ? "border-navy bg-butter"
                      : "border-navy bg-sky"
                    : "border-dashed border-navy/25 bg-white hover:border-navy"
                }`}
              >
                <span className="relative">
                  <Icon name={isReal && !on ? "star" : l.icon} size={36} className="text-navy" />
                  {on && !isReal && (
                    <span className="absolute -right-3 -top-2 grid h-6 w-6 place-items-center rounded-full bg-navy text-mist">
                      <Icon name="check" size={14} />
                    </span>
                  )}
                </span>
                {showText && <span className="text-15 font-bold text-navy">{l.label}</span>}
              </button>
              {i < PRACTICE_LEVELS.length - 1 && (
                <Icon name="chevron-right" size={20} className="hidden text-navy/40 sm:block" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
