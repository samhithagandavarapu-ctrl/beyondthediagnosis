import { Link } from "react-router-dom";
import { CTA_LABEL } from "../data/site";
import Scribble, { inkLastWord } from "../components/Scribble";
import PhotoCarousel, { type CarouselPhoto } from "../components/PhotoCarousel";

// One centered column for the whole page, so every section shares its edges.
const column = "mx-auto w-full max-w-[1000px] px-6";

// In order: the board before, a visitor adding a sticker, the board after.
const buddyWalk: CarouselPhoto[] = [
  {
    src: "/images/voiced-booth-table.jpg",
    alt: "Smiling at the Voiced booth on a sunny field, behind a sign reading “Every voice matters” and table cards with a survey QR code",
    caption: "Setting up the Voiced booth",
  },
  {
    src: "/images/voiced-booth-sticker.jpg",
    alt: "A volunteer kneels as a toddler, helped by an adult, adds a sticker to the Voiced sign",
    caption: "A young visitor adds a sticker",
  },
  {
    src: "/images/voiced-booth-sticker-board.jpg",
    alt: "Standing behind the Voiced booth, with the “Every voice matters” sign now covered in colorful stickers",
    caption: "By day’s end, a full board",
  },
];

export default function Mission() {
  return (
    <div>
      <section className="btd-grain bg-sky-tint border-b border-navy/[0.08]">
        <div className={`${column} pt-16 pb-14`}>
          <h1 className="btd-page-h1">{inkLastWord("Our Mission")}</h1>
          <p className="mt-[18px] text-lg leading-[1.65] text-body">
            Voiced exists so that people with Down syndrome are heard, not overlooked, in
            healthcare.
          </p>
        </div>
      </section>

      <section className={`${column} pt-12`}>
        <p className="text-lg leading-[1.75] text-body">
          Too often, a new symptom in someone with Down syndrome gets written off as “just
          the Down syndrome.” Voiced gives self-advocates and families tools to prepare for
          appointments, explain what’s normal for them, and speak up, so every visit leads
          to real answers.
        </p>
      </section>

      <section className={`${column} py-8`}>
        <blockquote className="border-y-2 border-coral py-10 text-center">
          <p className="font-display text-[clamp(1.75rem,4.5vw,2.25rem)] font-extrabold leading-[1.2] text-navy">
            Nothing for me,{" "}
            <Scribble delay={600} className="[&_svg]:text-coral/70">
              without me.
            </Scribble>
          </p>
        </blockquote>
      </section>

      <section
        className={`${column} grid items-stretch gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10`}
      >
        {/* The text column sets the height; the photo fills it and crops. */}
        <figure className="btd-snapshot btd-card flex flex-col">
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg md:aspect-auto md:flex-1">
            <img
              src="/images/samhitha-camp-shine.jpg"
              alt="Samhitha smiling in a gym, giving a piggyback ride to a young camper in an orange shirt"
              width={900}
              height={1600}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover object-[center_48%]"
            />
          </div>
          <figcaption className="px-5 py-3.5 text-sm text-body">
            Samhitha at NCDSA’s Camp SHINE
          </figcaption>
        </figure>
        <div>
          <h2 className="btd-section-h2">Why I started Voiced</h2>
          <div className="mt-6 grid gap-5 text-lg leading-[1.75] text-body">
            <p>
              I’m Samhitha, and I want to become a doctor. I never pictured myself working
              with people with disabilities until the summer after my freshman year, when I
              volunteered at NCDSA’s Camp SHINE with my best friend. What I thought would be
              a few weeks of summer volunteering turned into the thing I care about most.
            </p>
            <p>
              At camp, I saw how much the people I worked with had to say, and how easily
              they could be talked over. I want to become a neurologist and research how
              Down syndrome affects the whole body, so that care treats the full person, not
              just the diagnosis. Voiced is where that starts: helping people with Down
              syndrome and their families walk into clinics prepared, confident, and heard.
            </p>
          </div>
        </div>
      </section>

      <section
        className={`${column} grid items-center gap-8 pt-16 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10`}
      >
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.08em] text-coral-ink">
            Out in the community
          </p>
          <h2 className="btd-section-h2 mt-2">2026 NCDSA Buddy Walk</h2>
          <div className="mt-6 grid gap-5 text-lg leading-[1.75] text-body">
            <p>
              We brought Voiced to the Buddy Walk and met so many kids and families. Every
              visitor added a sticker to our board, and by the end of the day it was full.
            </p>
            <p>
              The conversations gave us valuable input on what would actually help at the
              doctor, and a group of families joined our pilot program to try Voiced and
              help shape what comes next.
            </p>
          </div>
        </div>
        <PhotoCarousel photos={buddyWalk} label="Photos from the 2026 NCDSA Buddy Walk" />
      </section>

      <section className={`${column} py-12 text-center`}>
        <h2 className="btd-section-h2">See what Voiced can do</h2>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/assistant" className="btd-btn-coral min-h-[52px] px-7 py-4 text-17">
            {CTA_LABEL}
          </Link>
          <a
            href="mailto:withvoiced@gmail.com"
            className="btd-btn-outline min-h-[52px] px-[26px] py-3.5 text-17"
          >
            Get in touch
          </a>
        </div>
      </section>
    </div>
  );
}
