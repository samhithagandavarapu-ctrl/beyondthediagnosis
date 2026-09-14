import { usePracticeMode } from "../context/PracticeModeContext";

// Global "Practice" vs "This is real" switch. Kept standalone so the same
// control can be dropped into Appointment Prep later.

export default function PracticeModeToggle({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { practice, togglePractice } = usePracticeMode();
  const light = tone === "light";

  return (
    <button
      type="button"
      onClick={togglePractice}
      aria-pressed={practice}
      title={
        practice
          ? "Practice mode: nothing you do is saved or downloaded."
          : "This is real: what you finish is saved and can go to your appointment."
      }
      className={`min-h-[30px] rounded-full border px-3 py-1.5 text-11 font-bold uppercase tracking-[0.08em] transition-colors ${
        practice
          ? "border-butter bg-butter text-butter-ink"
          : light
          ? "border-navy/20 text-body hover:border-sky"
          : "border-mist/35 hover:border-sky"
      }`}
    >
      {practice ? "Practice mode on" : "This is real"}
    </button>
  );
}
