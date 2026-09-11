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
    <section className={navy ? "btd-dark" : "bg-sky-tint border-b border-navy/[0.08]"}>
      <div className="btd-container pt-16 pb-14 flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className={`btd-eyebrow ${navy ? "text-butter" : ""}`}>{eyebrow}</span>
          <h1 className="btd-page-h1 mt-3 max-w-[22em]">{title}</h1>
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
