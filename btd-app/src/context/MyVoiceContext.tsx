import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { fetchProfile, saveReadingLevel } from "../lib/profile";
import { usePracticeMode } from "./PracticeModeContext";
import { attachCheckIn } from "../lib/drafts";
import { speak, speechSupported } from "../lib/speech";
import { ABOUT_ME_KEY, AboutMe, aboutMeHasContent } from "../lib/aboutMe";
import {
  CheckIn,
  EarnedSticker,
  PainReport,
  ReadingLevel,
  StickerId,
  checkInHasContent,
} from "../lib/myVoice";

// One setting — the reading level — drives the check-in, the walkthrough and
// the helper messages. Stickers and the last finished check-in live here
// too so the Appointment Prep export can pick the check-in up without
// /my-voice being mounted.

type MyVoiceState = {
  readingLevel: ReadingLevel;
  setReadingLevel: (level: ReadingLevel) => void;

  /** Whether labels are spoken when tapped. Off if the browser can't speak. */
  readAloud: boolean;
  toggleReadAloud: () => void;
  /** Speak a label, if read-aloud is on. Safe to call anywhere. */
  say: (text: string) => void;
  canSpeak: boolean;

  /** The most recent finished check-in, or null. Never set in practice mode. */
  savedCheckIn: CheckIn | null;
  saveCheckIn: (checkIn: CheckIn) => void;
  clearCheckIn: () => void;

  /** The last "Where does it hurt?" body map, or null. Kept on this device
   *  only — never put on a draft or sent to the account — and never set in
   *  practice mode. */
  savedPain: PainReport | null;
  savePain: (report: PainReport) => void;
  clearPain: () => void;

  /** "All About Me", kept on this device only. Never set in practice mode. */
  savedAboutMe: AboutMe | null;
  saveAboutMe: (aboutMe: AboutMe) => void;
  clearAboutMe: () => void;

  stickers: EarnedSticker[];
  earnSticker: (id: StickerId) => void;
  clearStickers: () => void;
};

const MyVoiceContext = createContext<MyVoiceState | undefined>(undefined);

const LEVEL_KEY = "verity-my-voice-reading-level";
const READ_ALOUD_KEY = "verity-my-voice-read-aloud";
const CHECKIN_KEY = "verity-my-voice-checkin";
const STICKERS_KEY = "verity-my-voice-stickers";
const PAIN_KEY = "verity-my-voice-pain";

function isReadingLevel(value: unknown): value is ReadingLevel {
  return value === "icon" || value === "icon-text" || value === "full";
}

export function MyVoiceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { practice } = usePracticeMode();

  const [readingLevel, setReadingLevelState] = useState<ReadingLevel>("icon-text");
  const [readAloud, setReadAloud] = useState(true);
  const [savedCheckIn, setSavedCheckIn] = useState<CheckIn | null>(null);
  const [savedPain, setSavedPain] = useState<PainReport | null>(null);
  const [savedAboutMe, setSavedAboutMe] = useState<AboutMe | null>(null);
  const [stickers, setStickers] = useState<EarnedSticker[]>([]);
  // Mirrors AccessibilityContext: don't write a profile value back the moment
  // we just read it from there.
  const skipNextSave = useRef(false);

  // Load whatever this browser already knows.
  useEffect(() => {
    try {
      const level = localStorage.getItem(LEVEL_KEY);
      if (isReadingLevel(level)) setReadingLevelState(level);

      const aloud = localStorage.getItem(READ_ALOUD_KEY);
      if (aloud !== null) setReadAloud(aloud === "1");

      const checkIn = localStorage.getItem(CHECKIN_KEY);
      if (checkIn) setSavedCheckIn(JSON.parse(checkIn) as CheckIn);

      const pain = localStorage.getItem(PAIN_KEY);
      if (pain) setSavedPain(JSON.parse(pain) as PainReport);

      const aboutMe = localStorage.getItem(ABOUT_ME_KEY);
      if (aboutMe) setSavedAboutMe(JSON.parse(aboutMe) as AboutMe);

      const earned = localStorage.getItem(STICKERS_KEY);
      if (earned) setStickers(JSON.parse(earned) as EarnedSticker[]);
    } catch {
      // Corrupted or blocked storage: start fresh rather than break the page.
    }
  }, []);

  // Signed in: the profile copy wins, so the level follows them to any device
  // — the same way large text / high contrast / easy read already do.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchProfile(user.id).then((profile) => {
      if (cancelled || !profile || !isReadingLevel(profile.reading_level)) return;
      skipNextSave.current = true;
      setReadingLevelState(profile.reading_level);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(LEVEL_KEY, readingLevel);
    } catch {
      // ignore
    }
    if (!user) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveReadingLevel(user.id, readingLevel);
  }, [user, readingLevel]);

  useEffect(() => {
    try {
      localStorage.setItem(READ_ALOUD_KEY, readAloud ? "1" : "0");
    } catch {
      // ignore
    }
  }, [readAloud]);

  const canSpeak = speechSupported();

  function say(text: string) {
    if (!readAloud) return;
    speak(text);
  }

  function saveCheckIn(checkIn: CheckIn) {
    // Practice mode is a rehearsal: it looks identical, but nothing is kept
    // and nothing can reach a real appointment record.
    if (practice) return;
    if (!checkInHasContent(checkIn)) return;
    setSavedCheckIn(checkIn);
    try {
      localStorage.setItem(CHECKIN_KEY, JSON.stringify(checkIn));
    } catch {
      // ignore
    }
    // Also onto the Appointment Prep draft — in the account when signed in,
    // so it's there on whatever device the summary gets made on.
    attachCheckIn(user?.id ?? null, checkIn).catch((err) =>
      console.error("Couldn't put the check-in on a draft:", err)
    );
  }

  function clearCheckIn() {
    setSavedCheckIn(null);
    try {
      localStorage.removeItem(CHECKIN_KEY);
    } catch {
      // ignore
    }
  }

  function savePain(report: PainReport) {
    if (practice) return;
    if (!report.spots.length) return;
    setSavedPain(report);
    try {
      localStorage.setItem(PAIN_KEY, JSON.stringify(report));
    } catch {
      // ignore
    }
  }

  function clearPain() {
    setSavedPain(null);
    try {
      localStorage.removeItem(PAIN_KEY);
    } catch {
      // ignore
    }
  }

  function saveAboutMe(aboutMe: AboutMe) {
    if (practice) return;
    if (!aboutMeHasContent(aboutMe)) return clearAboutMe();
    setSavedAboutMe(aboutMe);
    try {
      localStorage.setItem(ABOUT_ME_KEY, JSON.stringify(aboutMe));
    } catch {
      // ignore
    }
  }

  function clearAboutMe() {
    setSavedAboutMe(null);
    try {
      localStorage.removeItem(ABOUT_ME_KEY);
    } catch {
      // ignore
    }
  }

  function earnSticker(id: StickerId) {
    if (practice) return;
    setStickers((prev) => {
      const next = [...prev, { id, at: new Date().toISOString() }];
      try {
        localStorage.setItem(STICKERS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function clearStickers() {
    setStickers([]);
    try {
      localStorage.removeItem(STICKERS_KEY);
    } catch {
      // ignore
    }
  }

  const value: MyVoiceState = {
    readingLevel,
    setReadingLevel: setReadingLevelState,
    readAloud: readAloud && canSpeak,
    toggleReadAloud: () => setReadAloud((v) => !v),
    say,
    canSpeak,
    savedCheckIn,
    saveCheckIn,
    clearCheckIn,
    savedPain,
    savePain,
    clearPain,
    savedAboutMe,
    saveAboutMe,
    clearAboutMe,
    stickers,
    earnSticker,
    clearStickers,
  };

  return <MyVoiceContext.Provider value={value}>{children}</MyVoiceContext.Provider>;
}

export function useMyVoice() {
  const ctx = useContext(MyVoiceContext);
  if (!ctx) throw new Error("useMyVoice must be used within MyVoiceProvider");
  return ctx;
}
