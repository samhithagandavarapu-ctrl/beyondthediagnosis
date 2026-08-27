import { useAccessibility } from "../context/AccessibilityContext";

export default function AccessibilityBar() {
  const { largeText, highContrast, easyRead, toggleLargeText, toggleHighContrast, toggleEasyRead } =
    useAccessibility();

  const btnClass = (active: boolean) =>
    `px-3 py-1.5 rounded-sm text-xs font-semibold tracking-wide uppercase border transition-colors ${
      active
        ? "bg-ink text-paper border-ink"
        : "bg-transparent text-ink/70 border-ink/20 hover:border-ink/50 hover:text-ink"
    }`;

  return (
    <div className="w-full bg-ink text-paper/90 text-xs">
      <div className="btd-container flex flex-wrap items-center gap-2 py-1.5">
        <span className="mr-1 text-paper/60 hidden sm:inline">Display:</span>
        <button
          type="button"
          onClick={toggleLargeText}
          aria-pressed={largeText}
          className={btnClass(largeText)}
        >
          Large text
        </button>
        <button
          type="button"
          onClick={toggleHighContrast}
          aria-pressed={highContrast}
          className={btnClass(highContrast)}
        >
          High contrast
        </button>
        <button
          type="button"
          onClick={toggleEasyRead}
          aria-pressed={easyRead}
          className={btnClass(easyRead)}
        >
          Easy read
        </button>
      </div>
    </div>
  );
}
