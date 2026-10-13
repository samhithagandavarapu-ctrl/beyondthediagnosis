import PageHero from "../components/PageHero";

export default function Mission() {
  return (
    <div>
      <PageHero
        eyebrow="About Voiced"
        title="Our Mission"
        lede="Voiced exists so that people with Down syndrome are heard, not overlooked, in healthcare."
      />

      <section className="btd-container pt-12">
        <p className="max-w-[46em] text-lg leading-[1.75] text-body">
          Too often, a new symptom in someone with Down syndrome gets blamed on “just the
          Down syndrome” instead of being investigated. This is called diagnostic
          overshadowing, and it means real conditions like thyroid problems, hearing loss,
          or depression get missed. Voiced gives self-advocates and families tools to
          prepare for appointments, explain what’s normal for them, and speak up, so every
          visit leads to real answers.
        </p>
      </section>

      <section className="btd-container pt-10">
        <blockquote className="btd-dark rounded-card px-7 py-8 text-center">
          <p className="font-display text-26 font-extrabold text-butter">
            Nothing for me, without me.
          </p>
        </blockquote>
      </section>

      <section className="btd-container pt-14 pb-20 grid gap-10 items-start md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <figure className="btd-card overflow-hidden p-0 max-w-sm mx-auto md:mx-0 md:max-w-none">
          <img
            src="/images/samhitha-camp-shine.jpg"
            alt="Samhitha smiling in a gym, giving a piggyback ride to a young camper in an orange shirt"
            width={900}
            height={1600}
            loading="lazy"
            className="block w-full h-auto"
          />
          <figcaption className="px-5 py-3.5 text-sm text-body">
            Samhitha at NCDSA’s Camp SHINE
          </figcaption>
        </figure>

        <div>
          <span className="btd-eyebrow">The founder</span>
          <h2 className="btd-section-h2 mt-3 mb-5">Why I started Voiced</h2>
          <div className="grid gap-5 text-lg leading-[1.75] text-body">
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
    </div>
  );
}
