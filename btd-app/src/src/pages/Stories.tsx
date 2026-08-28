import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
    <div className="btd-container py-10 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <h1 className="text-3xl font-display font-semibold">Community Stories</h1>
        <Link
          to="/stories/submit"
          className="px-4 py-2 rounded bg-ink text-paper text-sm font-semibold shrink-0"
        >
          Share your story
        </Link>
      </div>
      <p className="text-slate mb-6">
        Real experiences from self-advocates, families, and clinicians — including
        moments where the right advocacy changed an outcome.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stories…"
          className="btd-input sm:max-w-xs"
        />
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value as any)}
          className="btd-input sm:max-w-[200px]"
        >
          {AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {filtered.map((s) => (
          <article key={s.id} className="btd-card p-5">
            <span className="text-[11px] uppercase tracking-wide font-semibold text-sage-dark">
              {s.audience}
            </span>
            <h3 className="font-display font-semibold text-lg mt-1 mb-1">{s.title}</h3>
            <p className="text-sm text-slate leading-relaxed">{s.excerpt}</p>
          </article>
        ))}
        {filtered.length === 0 && <p className="text-slate">No stories match yet.</p>}
      </div>
    </div>
  );
}
