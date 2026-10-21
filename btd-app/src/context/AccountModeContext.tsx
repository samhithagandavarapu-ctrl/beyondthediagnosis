import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { useMyVoice } from "./MyVoiceContext";
import { useSetup } from "./SetupContext";
import { useFamily } from "../lib/useFamily";
import { displayNameFor, fetchProfile, Profile } from "../lib/profile";

// Whose space this is. A parent (or caregiver) account manages someone: a
// linked child account, or — before any is linked — the person named on their
// "All about …" board. A self-advocate account is the person's own space.
// Anyone else (providers, people who skipped setup, signed out) gets the
// site as it always was.
//
// A parent can "See what [name] sees": their own screen switches to the
// self-advocate layout and wording for that person. Nothing private to the
// child is opened up by it — the parent still only sees what they already
// could (the child's shared calendar, and their own board about them).

export type AccountMode = "parent" | "self" | "none";

export type Managed = {
  /** A linked child account, or null for the name on the parent's own board. */
  personId: string | null;
  name: string;
};

type AccountModeState = {
  /** What the account is. */
  mode: AccountMode;
  /** What the screen is showing right now: "self" while a parent previews. */
  view: AccountMode;
  /** A parent seeing the child's view. */
  previewing: boolean;
  startPreview: () => void;
  endPreview: () => void;

  /** Everyone a parent can manage, and who they're managing now. */
  managedList: Managed[];
  managed: Managed | null;
  setManagedKey: (key: string) => void;

  /** The self-advocate's own first name (or the child's, in a preview). */
  myName: string;
  /** Whose information the tools are showing: "Maya", or the person's own
   *  name in their own space. Null in the plain site. */
  forName: string | null;
};

const AccountModeContext = createContext<AccountModeState | undefined>(undefined);

const MANAGED_KEY = "voiced:managing";
const PREVIEW_KEY = "voiced:previewing";

export const managedKey = (m: Managed) => m.personId ?? `name:${m.name}`;

const firstWord = (s: string) => s.trim().split(/\s+/)[0] ?? "";

export function AccountModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { setup } = useSetup();
  const { meBoard } = useMyVoice();
  const family = useFamily();
  const [profile, setProfile] = useState<Profile | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    fetchProfile(userId).then(setProfile);
  }, [userId]);

  const mode: AccountMode = !user ? "none" : setup.role === "caregiver" ? "parent" : setup.role === "self" ? "self" : "none";

  // Linked children first; the name on the parent's board when none are.
  const managedList = useMemo<Managed[]>(() => {
    if (mode !== "parent") return [];
    const linked = family.children.map((c) => ({ personId: c.personId, name: firstWord(c.name) || c.name }));
    const boardName = meBoard?.aboutName.trim();
    if (linked.length) return linked;
    return boardName ? [{ personId: null, name: boardName }] : [];
  }, [mode, family.children, meBoard?.aboutName]);

  const [key, setKey] = useState<string | null>(() => {
    try {
      return localStorage.getItem(MANAGED_KEY);
    } catch {
      return null;
    }
  });
  const managed = managedList.find((m) => managedKey(m) === key) ?? managedList[0] ?? null;
  function setManagedKey(k: string) {
    setKey(k);
    try {
      localStorage.setItem(MANAGED_KEY, k);
    } catch {
      // ignore
    }
  }

  // The preview lasts until it's ended (or the tab is closed), so moving
  // around the site doesn't drop someone out of it by surprise.
  const [preview, setPreview] = useState(() => {
    try {
      return sessionStorage.getItem(PREVIEW_KEY) === "1";
    } catch {
      return false;
    }
  });
  const previewing = mode === "parent" && preview;
  function setPreviewing(on: boolean) {
    setPreview(on);
    try {
      if (on) sessionStorage.setItem(PREVIEW_KEY, "1");
      else sessionStorage.removeItem(PREVIEW_KEY);
    } catch {
      // ignore
    }
  }

  const ownName = firstWord(displayNameFor(user, profile));
  const childName = managed?.name ?? "your child";
  const myName = previewing ? childName : ownName;
  const view: AccountMode = previewing ? "self" : mode;
  const forName = mode === "parent" ? childName : mode === "self" ? ownName || "me" : null;

  const value: AccountModeState = {
    mode,
    view,
    previewing,
    startPreview: () => setPreviewing(true),
    endPreview: () => setPreviewing(false),
    managedList,
    managed,
    setManagedKey,
    myName,
    forName,
  };
  return <AccountModeContext.Provider value={value}>{children}</AccountModeContext.Provider>;
}

export function useAccountMode() {
  const ctx = useContext(AccountModeContext);
  if (!ctx) throw new Error("useAccountMode must be used within AccountModeProvider");
  return ctx;
}

/** "Maya's" — or "James'" for a name ending in s. */
export function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

/** Wording for whose information a screen is about: "My symptoms" in the
 *  person's own space (or a parent's preview of it), "Maya's symptoms" for a
 *  parent, and the plain label everywhere else. */
export function useWhose() {
  const { view, mode, forName } = useAccountMode();
  return (label: string, plain = label) => {
    if (view === "self") return `My ${label}`;
    if (mode === "parent" && forName) return `${possessive(forName)} ${label}`;
    return plain;
  };
}
