import { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  lede: string;
  tone?: "tint" | "navy";
  children?: ReactNode; // optional right-side action
};

export default function PageHero({ eyebrow, title, lede, tone = "tint", children }: Props) {
  const navy = tone === "navy";
  return (
    <section
      className={`relative overflow-hidden ${
        navy ? "btd-dark" : "bg-sky-tint border-b border-navy/[0.08]"
      }`}
    >
      {/* Warm shapes in the corner, behind everything. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className={`absolute -right-28 -top-32 h-[220px] w-[220px] rounded-full sm:-right-24 sm:-top-28 sm:h-[340px] sm:w-[340px] ${
            navy ? "bg-coral/20" : "bg-coral/30"
          }`}
        />
        <div
          className={`absolute -bottom-20 right-[14%] hidden h-[190px] w-[190px] rounded-full md:block ${
            navy ? "bg-butter/15" : "bg-butter/60"
          }`}
        />
      </div>
      <div className="btd-container relative pt-16 pb-14 flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className={`btd-eyebrow ${navy ? "text-butter" : ""}`}>{eyebrow}</span>
          <h1 className="btd-page-h1 mt-3 max-w-[22em]">{title}</h1>
          <span aria-hidden="true" className="btd-accent-bar mt-5" />
          <p
            className={`mt-[18px] max-w-[40em] text-lg leading-[1.65] ${
              navy ? "text-mist/85" : "text-body"
            }`}
          >
            {lede}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}
