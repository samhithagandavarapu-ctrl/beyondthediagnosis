import { useAccessibility } from "../context/AccessibilityContext";
import { usePracticeMode } from "../context/PracticeModeContext";
import Icon from "./icons/Icon";
import { Chevron, panelClass, useDropdown } from "./NavDropdown";

/** "Display" in the top bar: large text, high contrast, easy read and practice
 *  mode, tucked into one small panel instead of a bar of their own. */
export default function DisplayMenu() {
  const { largeText, highContrast, easyRead, toggleLargeText, toggleHighContrast, toggleEasyRead } =
    useAccessibility();
  const { practice, togglePractice } = usePracticeMode();
  const { open, ref, buttonProps } = useDropdown();
  const anyOn = largeText || highContrast || easyRead || practice;

  const options = [
    { label: "Large text", on: largeText, toggle: toggleLargeText },
    { label: "High contrast", on: highContrast, toggle: toggleHighContrast },
    { label: "Easy read", on: easyRead, toggle: toggleEasyRead },
    {
      label: "Practice mode",
      on: practice,
      toggle: togglePractice,
      hint: "Try things out. Nothing is saved or downloaded.",
    },
  ];

  return (
    // Positioned from the header on phones, so the panel spans the screen
    // instead of hanging off its left edge.
    <div ref={ref} className="sm:relative">
      <button
        {...buttonProps}
        aria-label={anyOn ? "Display settings, some turned on" : "Display settings"}
        className={`relative inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-sm font-medium transition-colors sm:px-3 ${
          open ? "bg-navy text-mist btd-accent" : "text-body hover:bg-sky/30 hover:text-navy"
        }`}
      >
        <Icon name="eye" size={20} />
        <span className="hidden sm:inline">Display</span>
        <Chevron open={open} />
        {anyOn && (
          <span aria-hidden="true" className="absolute right-1 top-1.5 h-2 w-2 rounded-full bg-link ring-2 ring-mist" />
        )}
      </button>
      {open && (
        <div className={`absolute inset-x-4 top-full sm:inset-x-auto sm:right-0 sm:w-72 ${panelClass}`}>
          {options.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={o.toggle}
              aria-pressed={o.on}
              title={o.hint}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-sky/30"
            >
              <span className="grid">
                <span className="text-15 font-semibold text-navy">{o.label}</span>
                {o.hint && <span className="text-12 text-muted">{o.hint}</span>}
              </span>
              <span
                aria-hidden="true"
                className={`shrink-0 rounded-full border px-2.5 py-1 text-11 font-bold uppercase tracking-[0.08em] ${
                  o.on ? "border-navy bg-navy text-mist btd-accent" : "border-navy/20 text-muted"
                }`}
              >
                {o.on ? "On" : "Off"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
