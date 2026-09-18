import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, authEnabled } from "../lib/supabaseClient";

/** Where Google (and any other OAuth provider) drops people back on our site.
 *
 *  Before this page existed the provider sent everyone to "/" with the login
 *  code still in the URL, and whatever that page rendered while the session
 *  was still being exchanged was all they got — usually nothing at all. A
 *  blank screen right after typing your password is the moment a person
 *  decides the site is broken, so this route is deliberately never empty:
 *  it says what is happening, and it always ends somewhere real. */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const settled = useRef(false);

  useEffect(() => {
    // Where to land once we're signed in. Only same-site paths, so a crafted
    // ?next=https://example.com can't turn our callback into a redirector.
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("next") ?? "/";
    const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

    // The provider can also come back with a refusal ("access_denied" when
    // someone hits Cancel on Google's consent screen). That arrives in the
    // query string or the hash depending on the flow.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const providerError =
      params.get("error_description") ||
      params.get("error") ||
      hashParams.get("error_description") ||
      hashParams.get("error");

    if (providerError) {
      setError(providerError);
      return;
    }

    if (!authEnabled) {
      setError("Login isn't set up on this site yet.");
      return;
    }

    let graceTimer: number | undefined;

    function finish(path: string) {
      if (settled.current) return;
      settled.current = true;
      // replace: the callback URL still holds the one-time code, and nobody
      // should be able to land back on it with the Back button.
      navigate(path, { replace: true });
    }

    // supabase-js exchanges the code in the URL for a session as it starts up,
    // so either the session is already there or it's about to arrive.
    const { data: listener } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      if (session) finish(next);
    });

    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }: any) => {
        if (data?.session) finish(next);
        else if (sessionError) setError(sessionError.message);
        else {
          // No session yet isn't proof of failure — the exchange can still be
          // in flight, and onAuthStateChange will pick it up. Give it a beat
          // before telling someone their sign-in didn't work.
          graceTimer = window.setTimeout(() => {
            if (!settled.current) {
              setError("We couldn't finish signing you in. The link may have already been used.");
            }
          }, 5000);
        }
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "We couldn't finish signing you in.");
      });

    return () => {
      if (graceTimer !== undefined) window.clearTimeout(graceTimer);
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="btd-container py-14 max-w-md">
        <h1 className="text-2xl font-display font-semibold mb-2">We couldn't sign you in</h1>
        <p className="text-slate mb-5">{error}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/login"
            className="px-4 py-2.5 rounded bg-ink text-paper font-semibold text-sm"
          >
            Try signing in again
          </Link>
          <Link
            to="/"
            className="px-4 py-2.5 rounded border border-ink/20 font-semibold text-sm"
          >
            Go to the home page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="btd-container py-14 max-w-md" aria-live="polite">
      <h1 className="text-2xl font-display font-semibold mb-2">Signing you in…</h1>
      <p className="text-slate">One moment — we're finishing up with your account.</p>
    </div>
  );
}
