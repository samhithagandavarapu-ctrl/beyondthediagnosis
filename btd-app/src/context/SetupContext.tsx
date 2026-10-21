import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { usePracticeMode } from "./PracticeModeContext";
import { authEnabled, supabase } from "../lib/supabaseClient";
import { USERNAME_DOMAIN } from "../lib/family";

// The welcome setup: who someone is here, their age group (never a
// birthday), and whether they've been through it. Kept on the profile (see
// supabase/me-board.sql); until those columns exist, in this browser,
// per account, so nobody is asked twice.

export type UserRole = "self" | "caregiver" | "provider";
export type AgeGroup = "13-17" | "18+";

export type Setup = {
  role: UserRole | null;
  ageGroup: AgeGroup | null;
  /** Null until they've finished or skipped the welcome setup. */
  status: "done" | "skipped" | null;
};

type SetupState = {
  setup: Setup;
  /** False until we know, so the welcome page never flashes up by mistake. */
  loaded: boolean;
  /** Save part of it. In practice mode it's remembered only until the page
   *  is reloaded — nothing is written anywhere. */
  saveSetup: (patch: Partial<Setup>) => Promise<void>;
};

const EMPTY: Setup = { role: null, ageGroup: null, status: null };
const CHILD: Setup = { role: "self", ageGroup: null, status: "done" };
const localKey = (userId: string) => `voiced:setup:${userId}`;

function readLocal(userId: string): Setup {
  try {
    const raw = localStorage.getItem(localKey(userId));
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Setup>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeLocal(userId: string, setup: Setup) {
  try {
    localStorage.setItem(localKey(userId), JSON.stringify(setup));
  } catch {
    // ignore
  }
}

type Row = { user_role: UserRole | null; age_group: AgeGroup | null; setup_status: Setup["status"] };

const SetupContext = createContext<SetupState | undefined>(undefined);

export function SetupProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { practice } = usePracticeMode();
  const [setup, setSetupState] = useState<Setup>(EMPTY);
  // The latest answers, so two saves in a row don't undo each other.
  const current = useRef<Setup>(EMPTY);
  const setSetup = (s: Setup) => {
    current.current = s;
    setSetupState(s);
  };
  // Whose answers are loaded. Right after someone signs in, the page can
  // check before theirs arrive; "loaded" only counts once they're this
  // person's, so nobody is sent to setup on the last person's answers.
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined);
  const userId = user?.id ?? null;
  const email = user?.email ?? "";
  const childLogin = email.endsWith(`@${USERNAME_DOMAIN}`) || email.endsWith("@people.voiced.invalid");

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setSetup(EMPTY);
      setLoadedFor(userId);
      return;
    }
    // A different person: forget the last one's answers straight away, so
    // nothing of theirs (a "Parent" badge) shows while this one's load.
    setSetup(EMPTY);
    // A child's login on a profile their grown-up made (a username, or one
    // not claimed yet) is always the child's own space, already set up: the
    // grown-up answered the setup questions when they added them.
    if (childLogin) {
      setSetup(CHILD);
      setLoadedFor(userId);
      return;
    }
    let cancelled = false;
    setLoadedFor(undefined);
    (async () => {
      const local = readLocal(userId);
      let fromProfile: Partial<Setup> = {};
      if (authEnabled) {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_role, age_group, setup_status")
          .eq("id", userId)
          .maybeSingle();
        if (!error && data) {
          const r = data as Row;
          fromProfile = { role: r.user_role, ageGroup: r.age_group, status: r.setup_status };
        }
      }
      if (cancelled) return;
      // The profile wins where it has an answer; this browser fills the gaps.
      setSetup({
        role: fromProfile.role ?? local.role,
        ageGroup: fromProfile.ageGroup ?? local.ageGroup,
        status: fromProfile.status ?? local.status,
      });
      setLoadedFor(userId);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, authLoading]);

  async function saveSetup(patch: Partial<Setup>) {
    if (childLogin) return;
    const next = { ...current.current, ...patch };
    setSetup(next);
    if (practice || !userId) return;
    writeLocal(userId, next);
    if (!authEnabled) return;
    const row: Partial<Row> = {};
    if ("role" in patch) row.user_role = next.role;
    if ("ageGroup" in patch) row.age_group = next.ageGroup;
    if ("status" in patch) row.setup_status = next.status;
    const { error } = await supabase.from("profiles").upsert({ id: userId, ...row }, { onConflict: "id" });
    // Most likely the columns don't exist yet; this browser's copy stands in.
    if (error) console.warn("Setup kept in this browser only:", error.message);
  }

  return <SetupContext.Provider value={{ setup, loaded: loadedFor === userId, saveSetup }}>{children}</SetupContext.Provider>;
}

export function useSetup() {
  const ctx = useContext(SetupContext);
  if (!ctx) throw new Error("useSetup must be used within SetupProvider");
  return ctx;
}
