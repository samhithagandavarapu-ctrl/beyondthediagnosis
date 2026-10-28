import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/** Open/closed state for a menu in the top bar. Closes on navigation, on a
 *  click or tap anywhere else, and on Escape (which puts focus back on the
 *  button, so keyboard users don't lose their place). */
export function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("touchstart", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("touchstart", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const buttonProps = {
    ref: buttonRef,
    type: "button" as const,
    onClick: () => setOpen((v) => !v),
    "aria-expanded": open,
    "aria-haspopup": true,
  };
  return { open, setOpen, ref, buttonProps };
}

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className={open ? "rotate-180" : ""}>
      <path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The white card a menu opens into. */
export const panelClass =
  "z-50 mt-2 rounded-tile border border-navy/12 bg-white p-1.5 shadow-[0_12px_32px_rgba(33,50,68,0.14)]";

/** One row in a menu: tall enough to tap easily. */
export const menuRowClass =
  "flex min-h-[48px] w-full items-center gap-3 rounded-md px-3 py-2 text-left text-15 font-medium text-body hover:bg-sky/30 hover:text-navy";
