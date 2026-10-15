import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PageHero from "../components/PageHero";
import StoryPanel from "../components/StoryPanel";
import { useAuth } from "../context/AuthContext";
import { fetchProfile } from "../lib/profile";
import { fetchApprovedStories, StoryRow } from "../lib/stories";

const AUDIENCES = ["All", "Self-advocate", "Parent", "Caregiver", "Clinician"] as const;

export default function Stories() {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>("All");
  const [submitted, setSubmitted] = useState<StoryRow[]>([]);

  const [loaded, setLoaded] = useState(false);
  const { user, loading: authLoading } = useAuth();
  // Credited the same way the form on the profile used to: full name, else username.
  const [submitterName, setSubmitterName] = useState("");
  const { hash } = useLocation();
  // "See your story" from a notification links to /stories#story-<id>.
  const target = hash.startsWith("#story-") ? hash.slice("#story-".length) : null;

  useEffect(() => {
    fetchApprovedStories().then((rows) => {
      setSubmitted(rows);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setSubmitterName("");
      return;
    }
    fetchProfile(user.id).then((profile) => {
      setSubmitterName(profile?.full_name?.trim() || profile?.username?.trim() || "");
    });
  }, [user]);

  // "Share your story" links from elsewhere land on /stories#share; the form
  // only appears once sign-in has loaded, so scroll to it after that.
  useEffect(() => {
    if (hash !== "#share" || authLoading) return;
    requestAnimationFrame(() => {
      document.getElementById("share")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [hash, authLoading]);

  // Submitted stories arrive after the first render, so the browser's own jump
  // to the hash has already missed; scroll once they're in. Clear any filter
  // first, so the story being linked to can't be hidden by one.
  useEffect(() => {
    if (!target || !loaded) return;
    setAudience("All");
    setQuery("");
    requestAnimationFrame(() => {
      document
        .getElementById(`story-${target}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [target, loaded]);

  const allStories = useMemo(
    () => [
      ...submitted.map((s) => ({
        // The database's ids are numbers; the link's #story-<id> is text.
        id: String(s.id),
        title: s.title,
        audience: s.audience,
        excerpt: s.excerpt,
      })),
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
        lede="Every story is published with explicit permission from the person who lived it."
      >
        <a href="#share" className="btd-btn-coral min-h-[50px] px-6 py-[15px] text-base">
          Share your story
        </a>
      </PageHero>

      <section className="btd-container pt-12 pb-20">
        <div className="mb-12 max-w-[720px]">
          {user ? (
            <StoryPanel defaultName={submitterName} />
          ) : (
            !authLoading && (
              <div id="share" className="btd-card p-7 scroll-mt-24">
                <h2 className="text-23 font-extrabold text-navy">Share your story</h2>
                <p className="mt-1.5 text-15 leading-[1.6] text-body">
                  Sign in to share your story.{" "}
                  <Link to="/login" className="font-semibold text-link hover:underline">
                    Sign in →
                  </Link>
                </p>
              </div>
            )
          )}
        </div>

        {loaded && allStories.length === 0 ? (
          <div className="btd-card max-w-[720px] p-7">
            <h2 className="text-23 font-extrabold text-navy">Stories are on their way</h2>
            <p className="mt-1.5 text-15 leading-[1.6] text-body">
              We're gathering the first stories from self-advocates, families, and
              clinicians, and each one is published only with permission. Yours could be
              one of the first.
            </p>
          </div>
        ) : (
          <>
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
                <article
                  key={s.id}
                  id={`story-${s.id}`}
                  className={`btd-card p-[26px] scroll-mt-24 ${
                    s.id === target ? "border-2 border-sky ring-4 ring-sky/40" : ""
                  }`}
                >
                  {s.id === target && (
                    <span className="btd-tag mb-2 mr-2 bg-butter">Your story</span>
                  )}
                  <span className="text-11 font-bold uppercase tracking-[0.1em] text-link">
                    {s.audience}
                  </span>
                  <h3 className="mt-2.5 mb-2 text-21 font-bold">{s.title}</h3>
                  <p className="text-15 leading-[1.7] text-body">{s.excerpt}</p>
                </article>
              ))}
            </div>
            {filtered.length === 0 && <p className="text-body">No stories match yet.</p>}
          </>
        )}
      </section>
    </div>
  );
}
