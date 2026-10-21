import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import { finishPendingSignup, getBirthYear } from "../../lib/family";
import BirthYearForm from "./BirthYearForm";

// Once signed in: finish anything sign-up left waiting (the birth year, a
// parent's under-13 code), then, if the account still has no birth year,
// ask for it once in a small card at the top of the page. The under-13 rule
// depends on it.

const LATER_KEY = "voiced:birth-year-later";

export default function FamilyGate() {
  const { user } = useAuth();
  const { refresh } = useNotifications();
  const [ask, setAsk] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAsk(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const finished = await finishPendingSignup(user.id);
      if (cancelled) return;
      if (finished.error) setNote(`Your account is ready, but the parent's code didn't work: ${finished.error} You can enter it in Profile → Family.`);
      refresh();
      const year = await getBirthYear(user.id);
      let later = false;
      try {
        later = sessionStorage.getItem(LATER_KEY) === "1";
      } catch {
        // ignore
      }
      if (!cancelled) setAsk(year === null && !later);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user || (!ask && !note)) return null;

  return (
    <div className="btd-container pt-4">
      <div className="rounded-card border-2 border-sky bg-sky-tint p-5">
        {note && (
          <p role="status" className="mb-3 text-15 font-semibold text-navy">
            {note}
          </p>
        )}
        {ask && (
          <>
            <p className="mb-3 text-17 font-extrabold text-navy">One quick question</p>
            <BirthYearForm onSaved={() => setAsk(false)} />
            <button
              type="button"
              onClick={() => {
                setAsk(false);
                try {
                  sessionStorage.setItem(LATER_KEY, "1");
                } catch {
                  // ignore
                }
              }}
              className="mt-2 text-13 font-semibold text-link hover:underline"
            >
              Not now
            </button>
          </>
        )}
        {note && !ask && (
          <button type="button" onClick={() => setNote(null)} className="text-13 font-semibold text-link hover:underline">
            OK
          </button>
        )}
      </div>
    </div>
  );
}
