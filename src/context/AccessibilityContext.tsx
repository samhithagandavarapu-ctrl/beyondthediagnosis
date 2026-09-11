import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { fetchProfile, upsertProfile } from "../lib/profile";

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
  const { user } = useAuth();
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [easyRead, setEasyRead] = useState(false);
  // Avoids re-saving to the profile the moment we just loaded it from there.
  const skipNextSave = useRef(false);

  // Logged out (or not yet loaded): use whatever's in this browser.
  useEffect(() => {
    if (user) return;
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
  }, [user]);

  // Logged in: pull the saved settings from their profile so it follows them
  // to any device, instead of starting over.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchProfile(user.id).then((profile) => {
      if (cancelled || !profile) return;
      skipNextSave.current = true;
      setLargeText(!!profile.large_text);
      setHighContrast(!!profile.high_contrast);
      setEasyRead(!!profile.easy_read);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Always mirror to localStorage (works whether logged in or not).
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ largeText, highContrast, easyRead })
    );
  }, [largeText, highContrast, easyRead]);

  // If logged in, also save changes back to their profile — except right
  // after we just loaded them, which isn't a real change.
  useEffect(() => {
    if (!user) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    upsertProfile(user.id, {
      large_text: largeText,
      high_contrast: highContrast,
      easy_read: easyRead,
    });
  }, [user, largeText, highContrast, easyRead]);

  // Modes live on <html> so "Large text" / "Easy read" can scale the root
  // font-size, which every rem-based size in the app follows.
  useEffect(() => {
    const root = document.documentElement.classList;
    root.toggle("a11y-large-text", largeText);
    root.toggle("a11y-high-contrast", highContrast);
    root.toggle("a11y-easy-read", easyRead);
  }, [largeText, highContrast, easyRead]);

  const value: A11yState = {
    largeText,
    highContrast,
    easyRead,
    toggleLargeText: () => setLargeText((v) => !v),
    toggleHighContrast: () => setHighContrast((v) => !v),
    toggleEasyRead: () => setEasyRead((v) => !v),
  };

  return (
    <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}
