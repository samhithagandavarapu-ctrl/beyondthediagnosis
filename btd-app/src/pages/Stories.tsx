import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import { STORIES } from "../data/stories";
import { fetchApprovedStories, StoryRow } from "../lib/stories";

const AUDIENCES = ["All", "Self-advocate", "Parent", "Caregiver", "Clinician"] as const;

export default function Stories() {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>("All");
  const [submitted, setSubmitted] = useState<StoryRow[]>([]);

  useEffect(() => {
    fetchApprovedStories().then(setSubmitted);
  }, []);

  const allStories = useMemo(
    () => [
      ...submitted.map((s) => ({
        id: s.id,
        title: s.title,
        audience: s.audience,
        excerpt: s.excerpt,
      })),
      ...STORIES,
    ],
    [submitted]
  );

  const filtered = useMemo(() => {
    return allStories.filter((s) => {
      const matchesAudience = audience === "All" || s.audience === audience;
      const matchesQuery =
        !query.trim() ||
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.excerpt.toLowerCase().includes(query.toLowerCase());
      return matchesAudience && matchesQuery;
    });
  }, [allStories, query, audience]);

  return (
    <div>
      <PageHero
        eyebrow="Community stories"
        title="The pattern, in people's own words"
        lede="Every story is published with explicit permission from the person who lived it. Placeholders below stand in until real submissions are consented and reviewed."
      >
        <Link to="/stories/submit" className="btd-btn-coral min-h-[50px] px-6 py-[15px] text-base">
          Share your story
        </Link>
      </PageHero>

      <section className="btd-container pt-12 pb-20">
        <div className="mb-7 flex flex-wrap items-center gap-2.5">
          {AUDIENCES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAudience(a)}
              aria-pressed={audience === a}
              className={`rounded-full border px-4 py-2.5 text-sm transition-colors ${
                audience === a
                  ? "bg-navy text-mist border-navy font-bold"
                  : "bg-white border-navy/15 font-medium hover:border-navy/40"
              }`}
            >
              {a}
            </button>
          ))}
          <label htmlFor="story-search" className="sr-only">
            Search stories
          </label>
          <input
            id="story-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stories…"
            className="btd-input sm:ml-auto sm:max-w-xs rounded-full px-4 py-2.5"
          />
        </div>

        <div className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))]">
          {filtered.map((s) => (
            <article key={s.id} className="btd-card p-[26px]">
              <span className="text-11 font-bold uppercase tracking-[0.1em] text-link">
                {s.audience}
              </span>
              <h3 className="mt-2.5 mb-2 text-21 font-bold">{s.title}</h3>
              <p className="text-15 leading-[1.7] text-body">{s.excerpt}</p>
            </article>
          ))}
        </div>
        {filtered.length === 0 && <p className="text-body">No stories match yet.</p>}
      </section>
    </div>
  );
}
