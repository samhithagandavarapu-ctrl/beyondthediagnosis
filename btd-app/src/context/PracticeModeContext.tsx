import React, { createContext, useContext, useState } from "react";

// App-wide "Practice" vs "This is real" switch.
//
// Deliberately standalone from /my-voice: the same rule ("practice never
// saves, never exports, never attaches to a real appointment") is meant to
// extend to Appointment Prep later without moving this anywhere.

type PracticeModeState = {
  practice: boolean;
  setPractice: (on: boolean) => void;
  togglePractice: () => void;
};

const PracticeModeContext = createContext<PracticeModeState | undefined>(undefined);

export function PracticeModeProvider({ children }: { children: React.ReactNode }) {
  // Deliberately not persisted: every load starts on "this is real", because
  // silently coming back in practice mode would mean a real check-in quietly
  // going nowhere.
  const [practice, setPractice] = useState(false);

  const value: PracticeModeState = {
    practice,
    setPractice,
    togglePractice: () => setPractice((v) => !v),
  };

  return (
    <PracticeModeContext.Provider value={value}>{children}</PracticeModeContext.Provider>
  );
}

export function usePracticeMode() {
  const ctx = useContext(PracticeModeContext);
  if (!ctx) throw new Error("usePracticeMode must be used within PracticeModeProvider");
  return ctx;
}
