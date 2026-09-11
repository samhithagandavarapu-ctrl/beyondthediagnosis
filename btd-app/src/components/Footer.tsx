import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="btd-dark text-mist/75">
      <div className="btd-container py-10 flex flex-wrap gap-5 items-start justify-between">
        <p className="max-w-[40em] text-sm leading-[1.65]">
          Verity is an education and advocacy tool. It does not diagnose,
          treat, or replace the guidance of a licensed healthcare provider.
        </p>
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <Link to="/privacy" className="text-sky hover:underline">
            Privacy Policy
          </Link>
          <span className="font-bold text-butter">Emergency? Call 911 now.</span>
        </div>
      </div>
    </footer>
  );
}
