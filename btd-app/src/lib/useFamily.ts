import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { FamilyPerson, listFamily } from "./family";
import { useAccountMode } from "../context/AccountModeContext";

/** Who I'm linked with: my children, and the grown-ups who can see my
 *  profile. Empty when signed out. Loaded once for the whole app (in
 *  AccountModeContext); use useFamily() to read it. */
export function useFamilyLoader() {
  const { user } = useAuth();
  const [people, setPeople] = useState<FamilyPerson[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!user) {
      setPeople([]);
      setLoaded(true);
      return;
    }
    const p = await listFamily();
    setPeople(p);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  return useMemo(
    () => ({
      loaded,
      reload,
      children: people.filter((p) => p.role === "child"),
      grownUps: people.filter((p) => p.role === "caregiver"),
    }),
    [loaded, reload, people]
  );
}

/** Who I'm linked with, and reload() after linking or adding someone. */
export function useFamily() {
  return useAccountMode().family;
}
