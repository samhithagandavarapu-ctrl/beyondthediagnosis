import { useSiteSettings } from "../context/SiteSettingsContext";

/** A line across the top of every page, when an admin turns one on at
 *  /admin/site. */
export default function AnnouncementBar() {
  const { announcement: a } = useSiteSettings().settings;
  if (!a.on || !a.text.trim()) return null;
  return (
    <div role="region" aria-label="Announcement" className="bg-coral">
      <p className="btd-container flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-15 font-semibold text-navy">
        <span>{a.text}</span>
        {a.url && (
          <a
            href={a.url}
            target={a.url.startsWith("/") ? undefined : "_blank"}
            rel="noopener noreferrer"
            className="font-bold underline"
          >
            {a.linkLabel || "Learn more"}
          </a>
        )}
      </p>
    </div>
  );
}
