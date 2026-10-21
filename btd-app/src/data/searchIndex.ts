import { LIFE_STAGES, RESOURCES } from "./resources";

export type SearchEntry = {
  to: string;
  title: string;
  /** Shown under the title in the results. */
  description: string;
  /** Extra words people might type that aren't in the title or description. */
  keywords?: string;
  /** "Page" or "Resource", shown beside each result. */
  kind: "Page" | "Resource";
};

const PAGES: SearchEntry[] = [
  {
    to: "/tools",
    title: "Tools",
    description: "Everything you need before, during, and after a visit.",
    keywords: "free help start",
    kind: "Page",
  },
  {
    to: "/assistant",
    title: "AI Advocacy Assistant",
    description: "Ask about your rights, accommodations, or how to describe a symptom clearly.",
    keywords: "ai advocate chat ask question rights accommodations",
    kind: "Page",
  },
  {
    to: "/appointment-prep",
    title: "Appointment Prep Tool",
    description: "Turn symptoms, medications, and questions into a one-page summary for a provider.",
    keywords: "visit doctor summary symptoms medications timeline print",
    kind: "Page",
  },
  {
    to: "/calendar",
    title: "My Calendar",
    description: "Log symptoms day by day — periods, pain, feelings, sleep — and see them on a month.",
    keywords: "symptom calendar period tracker log diary day month pain mood sleep",
    kind: "Page",
  },
  {
    to: "/my-voice",
    title: "My Voice",
    description: "Say how you feel with pictures, build a sentence for your doctor, and earn stickers.",
    keywords: "check-in feelings stickers self-advocate pictures body",
    kind: "Page",
  },
  {
    to: "/me",
    title: "My Me page (All about me)",
    description: "Sticky notes about how you usually are, how you show pain, and how to talk with you — first on your visit summary.",
    keywords: "about me board usual hurt talk helps hard body people profile one-page",
    kind: "Page",
  },
  {
    to: "/my-voice/practice",
    title: "Practice My Visit",
    description: "Rehearse a doctor visit step by step, practice what to say, and keep speak-up cards ready.",
    keywords: "practice visit rehearse doctor checkup blood test dentist eye hearing speak up cards walkthrough",
    kind: "Page",
  },
  {
    to: "/resources",
    title: "Resource Navigator",
    description: "Trusted resources filtered by life stage.",
    keywords: "links organizations help prenatal child teen adult caregiver provider",
    kind: "Page",
  },
  {
    to: "/understanding-overshadowing",
    title: "Understanding diagnostic overshadowing",
    description: "A plain-language guide to the problem: what it is, why it happens, where it shows up.",
    keywords: "the problem bias anchoring premature closure implicit",
    kind: "Page",
  },
  {
    to: "/provider-education",
    title: "Provider Education Hub",
    description: "Planned training for clinics and residency programs.",
    keywords: "for providers clinicians doctors training modules pilot hospital residency",
    kind: "Page",
  },
  {
    to: "/stories",
    title: "Community Stories",
    description: "Experiences from self-advocates, families, and clinicians — and where to share yours.",
    keywords: "share story testimonials",
    kind: "Page",
  },
  {
    to: "/mission",
    title: "Our Mission",
    description: "Why Voiced exists, and why its founder started it.",
    keywords: "about founder samhitha camp shine story why",
    kind: "Page",
  },
  {
    to: "/privacy",
    title: "Privacy Policy",
    description: "What we store, in plain language.",
    keywords: "data privacy delete",
    kind: "Page",
  },
];

const stageLabel = (id: string) => LIFE_STAGES.find((s) => s.id === id)?.label ?? id;

// Each resource opens the navigator filtered to its life stage.
const RESOURCE_ENTRIES: SearchEntry[] = RESOURCES.map((r) => ({
  to: `/resources?stage=${r.stage}`,
  title: r.title,
  description: r.description,
  keywords: stageLabel(r.stage),
  kind: "Resource",
}));

export const SEARCH_INDEX: SearchEntry[] = [...PAGES, ...RESOURCE_ENTRIES];

/** Entries containing every word typed, title matches first. */
export function searchSite(query: string, limit = 8): SearchEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return SEARCH_INDEX.map((entry) => {
    const title = tokens(entry.title);
    const keywords = tokens(entry.keywords ?? "");
    const description = tokens(entry.description);
    // Each typed word has to start a word somewhere — "ear" finds "ears",
    // not "year" or "learn". A whole-word hit in the title counts most.
    let score = 0;
    for (const w of words) {
      const hit =
        (title.includes(w) && 10) ||
        (title.some((t) => t.startsWith(w)) && 7) ||
        (keywords.includes(w) && 5) ||
        (keywords.some((t) => t.startsWith(w)) && 4) ||
        (description.includes(w) && 2) ||
        (description.some((t) => t.startsWith(w)) && 1);
      if (!hit) return null;
      score += hit;
    }
    if (entry.kind === "Page") score += 1;
    return { entry, score };
  })
    .filter((r): r is { entry: SearchEntry; score: number } => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.entry);
}

function tokens(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);
}
