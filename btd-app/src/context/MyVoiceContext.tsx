import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { fetchProfile, saveReadingLevel } from "../lib/profile";
import { usePracticeMode } from "./PracticeModeContext";
import { CheckInStore, deleteCheckInFrom, listCheckIns, saveCheckInTo } from "../lib/checkIns";
import { speak, speechSupported } from "../lib/speech";
import { ABOUT_ME_KEY, AboutMe, aboutMeHasContent } from "../lib/aboutMe";
import {
  CheckIn,
  EarnedSticker,
  ReadingLevel,
  StickerId,
  checkInHasContent,
  normalizeCheckIn,
  sortCheckIns,
} from "../lib/myVoice";

// One setting — the reading level — drives the check-in, the walkthrough and
// the helper messages. Stickers and every saved check-in live here too, so
// Appointment Prep can pick check-ins for the doctor sheet without /my-voice
// being mounted.

type MyVoiceState = {
  readingLevel: ReadingLevel;
  setReadingLevel: (level: ReadingLevel) => void;

  /** Whether labels are spoken when tapped. Off if the browser can't speak. */
  readAloud: boolean;
  toggleReadAloud: () => void;
  /** Speak a label, if read-aloud is on. Safe to call anywhere. */
  say: (text: string) => void;
  canSpeak: boolean;

  /** Every saved check-in, newest first. In the account when signed in (and
   *  the table exists), on this device otherwise. */
  checkIns: CheckIn[];
  checkInsLoaded: boolean;
  checkInStore: CheckInStore;
  /** Signed in, but the account can't hold check-ins yet. */
  checkInAccountMissing: boolean;
  /** Save a new check-in, or changes to one (matched by id). Does nothing in
   *  practice mode; resolves to where it went, or null if nothing was saved. */
  saveCheckIn: (checkIn: CheckIn) => Promise<CheckInStore | null>;
  deleteCheckIn: (id: string) => void;
  /** Read check-ins again, after the calendar changed some of their entries. */
  reloadCheckIns: () => void;
  /** Check-ins that only exist on old Appointment Prep drafts, added to the
   *  list if they aren't there already. */
  importCheckIns: (list: CheckIn[]) => void;

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
const STICKERS_KEY = "verity-my-voice-stickers";

function isReadingLevel(value: unknown): value is ReadingLevel {
  return value === "icon" || value === "icon-text" || value === "full";
}

export function MyVoiceProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { practice } = usePracticeMode();

  const [readingLevel, setReadingLevelState] = useState<ReadingLevel>("icon-text");
  const [readAloud, setReadAloud] = useState(true);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [checkInsLoaded, setCheckInsLoaded] = useState(false);
  const [checkInStore, setCheckInStore] = useState<CheckInStore>("device");
  const [checkInAccountMissing, setCheckInAccountMissing] = useState(false);
  const [reloads, setReloads] = useState(0);
  const reloadCheckIns = () => setReloads((n) => n + 1);
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

      const aboutMe = localStorage.getItem(ABOUT_ME_KEY);
      if (aboutMe) setSavedAboutMe(JSON.parse(aboutMe) as AboutMe);

      const earned = localStorage.getItem(STICKERS_KEY);
      if (earned) setStickers(JSON.parse(earned) as EarnedSticker[]);
    } catch {
      // Corrupted or blocked storage: start fresh rather than break the page.
    }
  }, []);

  // Check-ins: loaded once we know who's here, and again if that changes
  // (signing in brings this device's check-ins into the account).
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setCheckInsLoaded(false);
    listCheckIns(user?.id ?? null).then((res) => {
      if (cancelled) return;
      setCheckIns(res.checkIns);
      setCheckInStore(res.store);
      setCheckInAccountMissing(res.accountMissing);
      setCheckInsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, reloads]);

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

  async function saveCheckIn(checkIn: CheckIn): Promise<CheckInStore | null> {
    // Practice mode is a rehearsal: it looks identical, but nothing is kept
    // and nothing can reach a real appointment record.
    if (practice) return null;
    if (!checkInHasContent(checkIn)) return null;
    setCheckIns((prev) => sortCheckIns([checkIn, ...prev.filter((c) => c.id !== checkIn.id)]));
    const { checkIn: saved, where } = await saveCheckInTo(user?.id ?? null, checkIn);
    // Keep the ids of its calendar entries, so a later change updates them.
    setCheckIns((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
    return where;
  }

  function deleteCheckIn(id: string) {
    const checkIn = checkIns.find((c) => c.id === id);
    setCheckIns((prev) => prev.filter((c) => c.id !== id));
    if (checkIn) deleteCheckInFrom(user?.id ?? null, checkIn);
  }


  function importCheckIns(list: CheckIn[]) {
    if (practice || !checkInsLoaded) return;
    const known = new Set(checkIns.map((c) => c.createdAt));
    const fresh = list.filter((c) => checkInHasContent(c) && !known.has(c.createdAt));
    fresh.forEach((c) => saveCheckIn(normalizeCheckIn(c)));
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
    checkIns,
    checkInsLoaded,
    checkInStore,
    checkInAccountMissing,
    saveCheckIn,
    deleteCheckIn,
    reloadCheckIns,
    importCheckIns,
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
