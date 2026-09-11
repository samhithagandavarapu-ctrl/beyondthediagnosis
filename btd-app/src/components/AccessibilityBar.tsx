import { useAccessibility } from "../context/AccessibilityContext";

export default function AccessibilityBar() {
  const { largeText, highContrast, easyRead, toggleLargeText, toggleHighContrast, toggleEasyRead } =
    useAccessibility();

  const btnClass = (active: boolean) =>
    `min-h-[30px] px-3 py-1.5 rounded-full border text-11 font-bold uppercase tracking-[0.08em] transition-colors ${
      active ? "bg-sky text-navy border-sky" : "border-mist/35 hover:border-sky"
    }`;

  return (
    <div className="btd-dark w-full text-12">
      <div className="btd-container flex flex-wrap items-center gap-2 py-2">
        <span className="mr-1 opacity-70">Display</span>
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
        <span className="ml-auto opacity-65">Emergency? Call 911.</span>
      </div>
    </div>
  );
}
