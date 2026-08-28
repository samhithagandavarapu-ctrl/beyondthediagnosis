import React, { createContext, useContext, useEffect, useState } from "react";

type A11yState = {
  largeText: boolean;
  highContrast: boolean;
  easyRead: boolean;
  toggleLargeText: () => void;
  toggleHighContrast: () => void;
  toggleEasyRead: () => void;
};

const AccessibilityContext = createContext<A11yState | undefined>(undefined);

const STORAGE_KEY = "btd-accessibility-prefs";

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [easyRead, setEasyRead] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setLargeText(!!parsed.largeText);
        setHighContrast(!!parsed.highContrast);
        setEasyRead(!!parsed.easyRead);
      }
    } catch {
      // ignore corrupted prefs
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ largeText, highContrast, easyRead })
    );
  }, [largeText, highContrast, easyRead]);

  const value: A11yState = {
    largeText,
    highContrast,
    easyRead,
    toggleLargeText: () => setLargeText((v) => !v),
    toggleHighContrast: () => setHighContrast((v) => !v),
    toggleEasyRead: () => setEasyRead((v) => !v),
  };

  const classes = [
    largeText ? "a11y-large-text" : "",
    highContrast ? "a11y-high-contrast" : "",
    easyRead ? "a11y-easy-read" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AccessibilityContext.Provider value={value}>
      <div className={classes}>{children}</div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}
