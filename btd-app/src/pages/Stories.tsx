import { useMemo, useState } from "react";
import { STORIES } from "../data/stories";

const AUDIENCES = ["All", "Self-advocate", "Parent", "Caregiver", "Clinician"] as const;

export default function Stories() {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>("All");

  const filtered = useMemo(() => {
    return STORIES.filter((s) => {
      const matchesAudience = audience === "All" || s.audience === audience;
      const matchesQuery =
        !query.trim() ||
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.excerpt.toLowerCase().includes(query.toLowerCase());
      return matchesAudience && matchesQuery;
    });
  }, [query, audience]);

  return (
    <div className="btd-container py-10 max-w-3xl">
      <h1 className="text-3xl font-display font-semibold mb-2">Community Stories</h1>
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
