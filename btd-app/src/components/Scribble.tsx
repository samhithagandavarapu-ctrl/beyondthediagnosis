import { ReactNode } from "react";

// Pen strokes drawn by hand (deliberately a little uneven) that ink
// themselves in over the words they mark. Decoration only — screen readers
// get the words alone.
const strokes = {
  underline: {
    viewBox: "0 0 200 24",
    d: "M4 15 C 40 9, 85 7, 130 9 S 185 13, 196 8 M 18 20 C 60 15, 120 14, 170 17",
    box: "left-[-4%] right-[-4%] bottom-[-0.32em] h-[0.42em]",
  },
  circle: {
    viewBox: "0 0 240 70",
    d: "M 196 12 C 150 2, 60 2, 22 16 C -4 28, 6 56, 60 63 C 120 70, 214 64, 232 42 C 246 22, 200 6, 150 6 C 120 6, 96 8, 84 10",
    box: "left-[-6%] right-[-5%] top-[-14%] bottom-[-26%]",
  },
};

type Props = {
  children: ReactNode;
  kind?: keyof typeof strokes;
  /** Milliseconds before the pen starts. */
  delay?: number;
  /** Draw when an ancestor gains .is-shown instead of on page load. */
  onReveal?: boolean;
  className?: string;
};

export default function Scribble({ children, kind = "underline", delay = 0, onReveal, className = "" }: Props) {
  const s = strokes[kind];
  return (
    <span className={`relative inline-block whitespace-nowrap ${className}`}>
      {children}
      <span aria-hidden="true" className={`pointer-events-none absolute ${s.box}`}>
        <svg
          focusable="false"
          viewBox={s.viewBox}
          preserveAspectRatio="none"
          className="block h-full w-full overflow-visible"
        >
          <path
            d={s.d}
            pathLength={1}
            fill="none"
            stroke="currentColor"
            strokeWidth={kind === "circle" ? 2.5 : 3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className={`btd-ink ${onReveal ? "btd-ink-on-reveal" : ""}`}
            style={{ animationDelay: `${delay}ms` }}
          />
        </svg>
      </span>
    </span>
  );
}
