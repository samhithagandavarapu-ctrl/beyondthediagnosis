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

// Real, vetted sources — reviewed National Down Syndrome Society (NDSS),
// Lettercase, NIH, and peer-reviewed guidance.
// Swap or expand as you find more, and re-check links periodically since
// organizations occasionally restructure their sites.
export const RESOURCES: Resource[] = [
  {
    id: "r1",
    title: "Understanding a prenatal diagnosis",
    description:
      "Lettercase's balanced, medically reviewed booklet for families who just received a prenatal Down syndrome diagnosis.",
    stage: "prenatal",
    link: "https://lettercase.org/",
  },
  {
    id: "r2",
    title: "Healthcare guidelines by age",
    description:
      "NDSS's age-based screening guidelines — what to ask your pediatrician to check for and when.",
    stage: "child",
    link: "https://ndss.org/resources/healthcare-guidelines",
  },
  {
    id: "r3",
    title: "Supporting communication and independence",
    description:
      "Practical guidance for helping a child with an intellectual disability build the skills to describe how they feel.",
    stage: "child",
    link: "https://www.parentcenterhub.org/intellectual/",
  },
  {
    id: "r4",
    title: "Preparing for the transition out of pediatric care",
    description:
      "NDSS's guide to what changes when a young adult moves from pediatric to adult healthcare providers.",
    stage: "teen",
    link: "https://ndss.org/resources/transitioning-school-adulthood",
  },
  {
    id: "r5",
    title: "Self-advocacy at medical appointments",
    description:
      "NDSS's guide to speaking up in an appointment, asking a provider to slow down, or bringing a support person.",
    stage: "teen",
    link: "https://ndss.org/resources/self-advocacy-medical-appointments",
  },
  {
    id: "r6",
    title: "Alzheimer's disease and Down syndrome",
    description:
      "NDSS's overview of real risk factors and typical age of onset — and what's often mistakenly flagged too early.",
    stage: "adult",
    link: "https://ndss.org/resources/alzheimers",
  },
  {
    id: "r7",
    title: "Finding a clinician who specializes in adult DS care",
    description:
      "NDSS's guidance on locating adult-focused Down syndrome care, including specialty clinics and how to ask whether a practice has relevant experience.",
    stage: "adult",
    link: "https://ndss.org/resources",
  },
  {
    id: "r8",
    title: "Building your support network",
    description:
      "NIH's directory of national and local Down syndrome organizations, support networks, and referral programs.",
    stage: "caregiver",
    link: "https://downsyndrome.nih.gov/resources",
  },
  {
    id: "r9",
    title: "Recognizing when a symptom is being over-attributed",
    description:
      "Peer-reviewed guidelines on medical conditions in adults with Down syndrome that are commonly misdiagnosed as 'just behavioral.'",
    stage: "caregiver",
    link: "https://www.aafp.org/pubs/afp/issues/2022/0400/p436.html",
  },
  {
    id: "r9b",
    title: "Healthcare information for families and caregivers",
    description:
      "NCDSA's guide to navigating healthcare across the lifespan, plus the North Carolina First Call program for new and expectant parents.",
    stage: "caregiver",
    link: "https://www.ncdsalliance.org/healthcareinformation/",
  },
  {
    id: "r10",
    title: "Patient education tools for clinicians",
    description:
      "CARE Down Syndrome's downloadable materials to help healthcare professionals deliver better care to adults with Down syndrome.",
    stage: "provider",
    link: "https://careds.org/",
  },
  {
    id: "r11",
    title: "Pain assessment in patients with intellectual disabilities",
    description:
      "IASP's fact sheet on why pain is under-recognized in this population and how to adjust assessment approaches.",
    stage: "provider",
    link: "https://www.iasp-pain.org/resources/fact-sheets/pain-in-individuals-with-an-intellectual-disability-scope-of-the-problem-and-assessment-challenges/",
  },
];
