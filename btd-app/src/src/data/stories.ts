export type Story = {
  id: string;
  title: string;
  audience: "Self-advocate" | "Parent" | "Caregiver" | "Clinician";
  excerpt: string;
};

// Placeholder stories — replace with real, consented submissions before launch.
// Every story needs explicit permission from the person before publishing.
export const STORIES: Story[] = [
  {
    id: "s1",
    title: "It took eight months to find out it was her thyroid",
    audience: "Parent",
    excerpt:
      "Every appointment, the fatigue and mood changes got chalked up to 'just how she is.' Bringing a written symptom timeline finally got someone to run the bloodwork.",
  },
  {
    id: "s2",
    title: "I asked the doctor to talk to me first",
    audience: "Self-advocate",
    excerpt:
      "My mom used to answer for me at appointments. Now I ask to be asked first — even if I need extra time to answer.",
  },
  {
    id: "s3",
    title: "A structural fix, not just a bias one",
    audience: "Clinician",
    excerpt:
      "Short visit slots make it hard to really get to know a patient over time. A written prep sheet helped me catch something I would have otherwise rushed past.",
  },
];
