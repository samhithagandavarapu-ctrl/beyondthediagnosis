import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="btd-container py-14 max-w-md">
      <h1 className="text-3xl font-display font-semibold mb-2">We couldn't find that page</h1>
      <p className="text-slate mb-6">
        The link may be out of date, or something may have gone sideways on the way here.
        Nothing you saved on this device is lost.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link to="/" className="px-4 py-2.5 rounded bg-ink text-paper font-semibold text-sm">
          Go to the home page
        </Link>
        <Link
          to="/tools"
          className="px-4 py-2.5 rounded border border-ink/20 font-semibold text-sm"
        >
          Browse the tools
        </Link>
      </div>
    </div>
  );
}
