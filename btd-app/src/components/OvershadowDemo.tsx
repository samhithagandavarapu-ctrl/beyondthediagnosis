import { useEffect, useRef, useState } from "react";
import Icon, { IconName } from "./icons/Icon";

// What the label hides. Each "worth checking" is a common, treatable cause
// named in CARE Down Syndrome's guidance on overshadowing — phrased as a
// question to raise with a provider, never as an answer.
const symptoms: { icon: IconName; said: string; check: string }[] = [
  { icon: "face-bad", said: "Acting out, more irritable", check: "Pain — ears, teeth, stomach" },
  { icon: "since-week", said: "Tired all the time", check: "Thyroid, sleep apnea" },
  { icon: "ear", said: "Stopped answering when called", check: "Hearing loss, ear wax" },
  { icon: "tl-skill", said: "Forgetting things at 28", check: "Depression, thyroid, B12" },
];

/** The home page's centrepiece: four real symptoms sitting under the shadow
 *  of a label, and a button that lifts it. Plays once on its own the first
 *  time it scrolls into view, then stays in the visitor's hands. */
export default function OvershadowDemo() {
  const [revealed, setRevealed] = useState(false);
  const touched = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let timer: number | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        timer = window.setTimeout(() => {
          if (!touched.current) setRevealed(true);
        }, 2200);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const toggle = () => {
    touched.current = true;
    setRevealed((r) => !r);
  };

  return (
    <div
      ref={ref}
      className={`btd-shadow-demo btd-surface relative overflow-hidden rounded-panel border border-navy/12 shadow-[0_30px_80px_-20px_rgba(33,50,68,0.35)] ${
        revealed ? "is-revealed" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-navy/[0.08] px-5 py-4 sm:px-6">
        <p className="btd-eyebrow">{revealed ? "What a real look finds" : "What the label hides"}</p>
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-navy/12" />
          <span className="h-2.5 w-2.5 rounded-full bg-navy/12" />
          <span className="h-2.5 w-2.5 rounded-full bg-sky" />
        </span>
      </div>

      <div className="relative">
        <ul className="grid gap-2.5 p-5 sm:p-6">
          {symptoms.map((s, i) => {
            const stagger = { transitionDelay: revealed ? `${250 + i * 120}ms` : "0ms" };
            return (
            <li
              key={s.said}
              className="btd-symptom grid grid-cols-[auto_1fr] items-center gap-x-3.5 gap-y-1 rounded-lg border border-navy/[0.08] bg-mist px-4 py-3"
              style={stagger}
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-link">
                <Icon name={s.icon} size={22} />
              </span>
              <div className="min-w-0">
                <p className="text-15 font-bold leading-tight">{s.said}</p>
                <p
                  className="btd-symptom-check mt-1 flex items-center gap-1.5 text-13 font-semibold text-link"
                  style={stagger}
                  aria-hidden={!revealed}
                >
                  <Icon name="search" size={14} />
                  Worth checking: {s.check}
                </p>
              </div>
            </li>
            );
          })}
        </ul>

        {/* The shadow itself. Purely visual: the stamp's words are the
            section heading's story, and the list underneath is always there. */}
        <div
          aria-hidden="true"
          className="btd-shadow-veil absolute inset-0 grid place-items-center bg-navy/80 backdrop-blur-[6px]"
        >
          <p className="btd-shadow-stamp -rotate-3 rounded-lg border-2 border-mist/70 px-5 py-3 text-center font-display text-[clamp(1.25rem,2.4vw,1.625rem)] font-extrabold leading-tight text-mist">
            “It’s just
            <br />
            Down syndrome.”
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy/[0.08] px-5 py-4 sm:px-6">
        <p className="text-13 text-muted" aria-live="polite">
          {revealed ? "Every symptom deserves its own look." : "Four real symptoms, one easy shortcut."}
        </p>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={revealed}
          className="btd-btn-sky min-h-[40px] gap-2 px-4 text-sm"
        >
          <Icon name={revealed ? "eye-off" : "eye"} size={18} />
          {revealed ? "Show the shortcut" : "Look closer"}
        </button>
      </div>
    </div>
  );
}
