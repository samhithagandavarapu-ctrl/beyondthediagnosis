import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Icon from "./icons/Icon";

// Standalone calming screen: a floating button that is available on every
// page, and a full-screen breathing overlay. No login, no saved state, no
// dependency on /my-voice — it can be opened mid-chat, mid-form, anywhere.

const BREATH_IN = 4000;
const BREATH_HOLD = 1500;
const BREATH_OUT = 6000;
const CYCLE = BREATH_IN + BREATH_HOLD + BREATH_OUT;

type Phase = "in" | "hold" | "out";

function phaseAt(elapsed: number): Phase {
  const t = elapsed % CYCLE;
  if (t < BREATH_IN) return "in";
  if (t < BREATH_IN + BREATH_HOLD) return "hold";
  return "out";
}

const PHASE_TEXT: Record<Phase, string> = {
  in: "Breathe in",
  hold: "Hold",
  out: "Breathe out",
};

const BUTTON_GAP = 20;

const OPEN_EVENT = "voiced:open-calm";

/** Open the calming overlay from anywhere — e.g. an "I need a break" button.
 *  It sits on top of the page, so closing it lands back on the same step. */
export function openCalmingScreen() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export default function CalmingScreen() {
  const [open, setOpen] = useState(false);
  const [bottom, setBottom] = useState(BUTTON_GAP);
  // Practice My Visit has its own "I need a break" button on every screen, and
  // the floating one would sit on top of that page's main action on a phone.
  const hideButton = useLocation().pathname.startsWith("/my-voice/practice");

  useEffect(() => {
    const open = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  // Rise above the footer as it scrolls into view, so the button never sits
  // on top of the disclaimer, contact details or emergency line.
  useEffect(() => {
    function place() {
      const footer = document.querySelector("footer");
      const overlap = footer ? Math.max(0, window.innerHeight - footer.getBoundingClientRect().top) : 0;
      setBottom(BUTTON_GAP + overlap);
    }
    place();
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    // Page content changes height after route changes and data loads.
    const observer = new ResizeObserver(place);
    observer.observe(document.body);
    return () => {
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {!hideButton && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ bottom }}
          className="fixed right-5 z-40 flex min-h-[48px] items-center gap-1.5 rounded-full bg-sky px-4 py-2.5 font-bold text-navy shadow-[0_6px_20px_rgba(33,50,68,0.25)] transition-colors hover:bg-sky-hover print:hidden"
        >
          <Icon name="breath" size={19} />
          <span className="text-sm">Calm</span>
        </button>
      )}
      {open && <CalmOverlay onClose={() => setOpen(false)} />}
    </>
  );
}

function CalmOverlay({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("in");
  const [sound, setSound] = useState(false);
  const startedAt = useRef(Date.now());

  // Drive the label off the clock rather than off the animation, so the two
  // can't drift apart while the tab is backgrounded.
  useEffect(() => {
    const id = window.setInterval(() => {
      setPhase(phaseAt(Date.now() - startedAt.current));
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // A soft sine tone that rises on the in-breath and falls on the out-breath.
  // Built on demand so nothing plays until it is asked for.
  useEffect(() => {
    if (!sound) return;
    let cancelled = false;
    try {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return;
      const ctx: AudioContext = new Ctor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 196; // low G — quiet and unobtrusive
      gain.gain.value = 0;
      osc.connect(gain).connect(ctx.destination);
      osc.start();

      const tick = window.setInterval(() => {
        if (cancelled) return;
        const p = phaseAt(Date.now() - startedAt.current);
        const target = p === "out" ? 0.02 : p === "in" ? 0.05 : 0.035;
        gain.gain.setTargetAtTime(target, ctx.currentTime, 0.8);
      }, 300);

      return () => {
        cancelled = true;
        window.clearInterval(tick);
        try {
          osc.stop();
          ctx.close();
        } catch {
          // already torn down
        }
      };
    } catch {
      // No audio available — the visual breathing guide still works.
    }
  }, [sound]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Calming screen"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-navy text-mist print:hidden"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 min-h-[44px] rounded-full border-2 border-mist/40 px-5 py-2 text-sm font-bold text-mist transition-colors hover:border-mist"
      >
        Done
      </button>

      <div className="flex h-[min(58vw,340px)] w-[min(58vw,340px)] items-center justify-center">
        <div className="btd-breathe flex h-full w-full items-center justify-center rounded-full bg-sky/25 ring-4 ring-sky/40">
          <div className="flex h-1/2 w-1/2 items-center justify-center rounded-full bg-sky/50" />
        </div>
      </div>

      <p aria-live="polite" className="mt-10 text-3xl font-display font-extrabold">
        {PHASE_TEXT[phase]}
      </p>
      <p className="mt-2 max-w-[24em] px-6 text-center text-mist/75">
        Follow the circle. In as it grows, out as it shrinks. Stay as long as you want.
      </p>

      <button
        type="button"
        onClick={() => setSound((s) => !s)}
        aria-pressed={sound}
        className={`mt-7 min-h-[44px] rounded-full border-2 px-5 py-2 text-sm font-bold transition-colors ${
          sound ? "border-sky bg-sky text-navy" : "border-mist/40 text-mist hover:border-mist"
        }`}
      >
        <span className="flex items-center gap-2">
          <Icon name={sound ? "speaker" : "speaker-off"} size={18} />
          {sound ? "Sound on" : "Sound off"}
        </span>
      </button>
    </div>
  );
}
