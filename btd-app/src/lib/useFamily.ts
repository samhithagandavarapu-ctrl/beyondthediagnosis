import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { FamilyPerson, listFamily } from "./family";

/** Who I'm linked with: my children, and the grown-ups who can see my
 *  calendar. Empty when signed out. */
export function useFamily() {
  const { user } = useAuth();
  const [people, setPeople] = useState<FamilyPerson[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    if (!user) {
      setPeople([]);
      setLoaded(true);
      return;
    }
    listFamily().then((p) => {
      setPeople(p);
      setLoaded(true);
    });
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    loaded,
    reload,
    children: people.filter((p) => p.role === "child"),
    grownUps: people.filter((p) => p.role === "caregiver"),
  };
}
