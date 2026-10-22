import { Link } from "react-router-dom";
import { useSiteSettings } from "../context/SiteSettingsContext";

export default function Footer() {
  const surveyUrl = useSiteSettings().settings.survey.url;
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
            <a href="mailto:withvoiced@gmail.com" className="text-sky hover:underline">
              withvoiced@gmail.com
            </a>
          </p>
          <p>
            Instagram:{" "}
            <a
              href="https://www.instagram.com/withvoiced/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky hover:underline"
            >
              @withvoiced
            </a>
          </p>
          <p>© 2026 Voiced</p>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <a
            href={surveyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky hover:underline"
          >
            Take our survey
          </a>
          <Link to="/privacy" className="text-sky hover:underline">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-sky hover:underline">
            Terms of Use
          </Link>
          <span className="font-bold text-butter">Emergency? Call 911 now.</span>
        </div>
      </div>
    </footer>
  );
}
