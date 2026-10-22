import { useLocation } from "react-router-dom";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { BannerColor, isExternalLink } from "../lib/siteSettings";

const COLORS: Record<BannerColor, string> = {
  coral: "bg-coral text-navy",
  butter: "bg-butter text-navy",
  sky: "bg-sky text-navy",
  navy: "bg-navy text-mist",
};

/** The banners an admin turned on at /admin/site, across the top of the
 *  site (or the home page only). */
export default function AnnouncementBar() {
  const { banners } = useSiteSettings().settings;
  const { pathname } = useLocation();
  const shown = banners.filter((b) => b.on && b.text.trim() && (b.where === "all" || pathname === "/"));
  if (!shown.length) return null;
  return (
    <div role="region" aria-label="Announcements">
      {shown.map((b) => (
        <div key={b.id} className={COLORS[b.color] ?? COLORS.coral}>
          <p className="btd-container flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-15 font-semibold">
            <span>{b.text}</span>
            {b.url && (
              <a
                href={b.url}
                target={isExternalLink(b.url) ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="font-bold underline"
              >
                {b.linkLabel || "Learn more"}
              </a>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
