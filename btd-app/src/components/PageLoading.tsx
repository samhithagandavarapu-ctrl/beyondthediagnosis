/** A page that is still waiting on something says so.
 *
 *  Rendering null while a session loads is indistinguishable from a broken
 *  site, which is the last thing someone needs right after signing in. */
export default function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="btd-container py-14 max-w-md" aria-live="polite">
      <p className="text-slate">{label}</p>
    </div>
  );
}
