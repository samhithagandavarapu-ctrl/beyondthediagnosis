import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { usePracticeMode } from "./PracticeModeContext";
import { authEnabled, supabase } from "../lib/supabaseClient";

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
  const [loaded, setLoaded] = useState(false);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setSetup(EMPTY);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoaded(false);
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
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  async function saveSetup(patch: Partial<Setup>) {
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

  return <SetupContext.Provider value={{ setup, loaded, saveSetup }}>{children}</SetupContext.Provider>;
}

export function useSetup() {
  const ctx = useContext(SetupContext);
  if (!ctx) throw new Error("useSetup must be used within SetupProvider");
  return ctx;
}
