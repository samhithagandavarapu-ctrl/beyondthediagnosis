export type LifeStage =
  | "prenatal"
  | "child"
  | "teen"
  | "adult"
  | "caregiver"
  | "provider";

export type Resource = {
  id: string;
  title: string;
  description: string;
  stage: LifeStage;
  link?: string;
};

export const LIFE_STAGES: { id: LifeStage; label: string }[] = [
  { id: "prenatal", label: "Prenatal" },
  { id: "child", label: "Child" },
  { id: "teen", label: "Teen" },
  { id: "adult", label: "Adult" },
  { id: "caregiver", label: "Caregiver" },
  { id: "provider", label: "Provider" },
];

// Starter content — replace/expand with vetted resources (e.g. NDSS, NCDSA,
// Adult Down Syndrome Center) before this goes live. Keep every source current
// and clinically reviewed.
export const RESOURCES: Resource[] = [
  {
    id: "r1",
    title: "Understanding a prenatal diagnosis",
    description:
      "Balanced, up-to-date information for families who just received a prenatal Down syndrome diagnosis.",
    stage: "prenatal",
  },
  {
    id: "r2",
    title: "First-year health checklist",
    description:
      "Common co-occurring conditions to screen for early — heart, hearing, vision, and thyroid.",
    stage: "child",
  },
  {
    id: "r3",
    title: "Talking to your child about their body",
    description:
      "Age-appropriate ways to help kids describe how they feel, so symptoms are easier to catch early.",
    stage: "child",
  },
  {
    id: "r4",
    title: "Preparing for the transition out of pediatric care",
    description:
      "What changes when a young adult moves from pediatric to adult healthcare providers — and how to plan ahead.",
    stage: "teen",
  },
  {
    id: "r5",
    title: "Self-advocacy basics",
    description:
      "How to speak up in an appointment, ask a provider to slow down, or bring a support person.",
    stage: "teen",
  },
  {
    id: "r6",
    title: "Alzheimer's risk and what's actually typical",
    description:
      "Average age of onset, what's a real warning sign, and what's often mistakenly over-attributed too early.",
    stage: "adult",
  },
  {
    id: "r7",
    title: "Finding a clinician who specializes in adult DS care",
    description:
      "Adult-specific Down syndrome training is far less common than pediatric — how to find and vet a good fit.",
    stage: "adult",
  },
  {
    id: "r8",
    title: "Building your support network",
    description:
      "Where to find other families and informed communities — one of the strongest tools against overshadowing.",
    stage: "caregiver",
  },
  {
    id: "r9",
    title: "Recognizing diagnostic overshadowing in the moment",
    description:
      "Practical signs that a symptom is being attributed to Down syndrome instead of investigated.",
    stage: "caregiver",
  },
  {
    id: "r10",
    title: "Inclusive communication in clinical settings",
    description:
      "How to address the patient directly, use person-first language, and avoid caregiver-only conversations.",
    stage: "provider",
  },
  {
    id: "r11",
    title: "Pain assessment in patients with intellectual disabilities",
    description:
      "Why pain is under-recognized in this population and how to adjust assessment approaches.",
    stage: "provider",
  },
];
