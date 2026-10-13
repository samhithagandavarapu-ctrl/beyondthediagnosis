import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="btd-dark text-mist/75">
      <div className="btd-container py-10 flex flex-wrap gap-5 items-start justify-between">
        <div className="grid gap-2 text-sm leading-[1.65]">
          <p className="max-w-[40em]">
            Voiced is an education and advocacy tool. It does not diagnose,
            treat, or replace the guidance of a licensed healthcare provider.
          </p>
          <p>
            Contact:{" "}
            <a href="mailto:info.verityhealth@gmail.com" className="text-sky hover:underline">
              info.verityhealth@gmail.com
            </a>
          </p>
          <p>© 2026 Voiced</p>
        </div>
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
