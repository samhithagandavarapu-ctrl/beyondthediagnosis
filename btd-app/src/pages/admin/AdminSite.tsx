import { useEffect, useState } from "react";
import Icon from "../../components/icons/Icon";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { Announcement, SurveyBanner, saveSiteSetting } from "../../lib/siteSettings";

// Change the banners on the site yourself. Saved straight to the
// site_settings table; everyone sees the change the next time a page loads.

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`inline-flex min-h-[44px] justify-self-start items-center gap-3 rounded-full border-2 px-4 text-15 font-bold ${
        on ? "border-navy bg-navy text-mist" : "border-navy/20 bg-white text-navy"
      }`}
    >
      <span className={`h-3 w-3 rounded-full ${on ? "bg-butter" : "bg-navy/25"}`} />
      {label}: {on ? "On" : "Off"}
    </button>
  );
}

function Field({ label, value, onChange, long, hint }: { label: string; value: string; onChange: (v: string) => void; long?: boolean; hint?: string }) {
  return (
    <label className="grid gap-1.5 text-15 font-bold text-navy">
      {label}
      {long ? (
        <textarea className="btd-input min-h-[88px] text-base" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="btd-input text-base" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <span className="text-13 font-normal text-muted">{hint}</span>}
    </label>
  );
}

function SaveRow({ onSave, status }: { onSave: () => void; status: { busy: boolean; msg: string | null; error: boolean } }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={onSave} disabled={status.busy} className="btd-btn-coral min-h-[48px] gap-2 px-6 text-base disabled:opacity-50">
        <Icon name="save" size={18} />
        {status.busy ? "Saving…" : "Save"}
      </button>
      {status.msg && (
        <span role={status.error ? "alert" : "status"} className={`text-15 font-semibold ${status.error ? "text-coral-ink" : "text-navy"}`}>
          {status.msg}
        </span>
      )}
    </div>
  );
}

const idle = { busy: false, msg: null as string | null, error: false };

export default function AdminSite() {
  const { settings, reload } = useSiteSettings();
  const [survey, setSurvey] = useState<SurveyBanner>(settings.survey);
  const [announcement, setAnnouncement] = useState<Announcement>(settings.announcement);
  const [surveyStatus, setSurveyStatus] = useState(idle);
  const [annStatus, setAnnStatus] = useState(idle);

  // Once the saved settings arrive, start from them.
  useEffect(() => setSurvey(settings.survey), [settings.survey]);
  useEffect(() => setAnnouncement(settings.announcement), [settings.announcement]);

  async function save<K extends "survey" | "announcement">(
    key: K,
    value: K extends "survey" ? SurveyBanner : Announcement,
    setStatus: (s: typeof idle) => void
  ) {
    setStatus({ busy: true, msg: null, error: false });
    const error = await saveSiteSetting(key, value as never);
    setStatus({ busy: false, msg: error ?? "Saved. It's live on the site.", error: Boolean(error) });
    if (!error) reload();
  }

  return (
    <div className="btd-container max-w-3xl py-10 pb-20">
      <h1 className="font-display text-30 font-extrabold text-navy">Site banners</h1>
      <p className="mt-2 text-17 text-body">Change these yourself. They update on the site as soon as you save.</p>

      <section className="btd-card mt-8 grid gap-4 p-6">
        <h2 className="text-21 font-extrabold text-navy">Announcement bar</h2>
        <p className="text-15 text-body">A short line across the top of every page, for news like an event or a new feature.</p>
        <Toggle label="Announcement" on={announcement.on} onChange={(on) => setAnnouncement({ ...announcement, on })} />
        <Field label="What it says" value={announcement.text} onChange={(text) => setAnnouncement({ ...announcement, text })} />
        <Field
          label="Link (optional)"
          value={announcement.url}
          onChange={(url) => setAnnouncement({ ...announcement, url })}
          hint="A full web address (https://…), or a page on Voiced like /stories."
        />
        <Field label="Link words" value={announcement.linkLabel} onChange={(linkLabel) => setAnnouncement({ ...announcement, linkLabel })} hint='For example "Sign up" or "Learn more".' />
        {announcement.on && announcement.text && (
          <div>
            <p className="mb-1 text-13 font-bold uppercase tracking-[0.08em] text-muted">Preview</p>
            <p className="rounded-tile bg-coral px-4 py-2.5 text-15 font-semibold text-navy">
              {announcement.text} {announcement.url && <u className="font-bold">{announcement.linkLabel || "Learn more"}</u>}
            </p>
          </div>
        )}
        <SaveRow onSave={() => save("announcement", announcement, setAnnStatus)} status={annStatus} />
      </section>

      <section className="btd-card mt-8 grid gap-4 p-6">
        <h2 className="text-21 font-extrabold text-navy">Survey banner (home page)</h2>
        <p className="text-15 text-body">The yellow box on the home page. The footer's "Take our survey" link uses the same address.</p>
        <Toggle label="Survey banner" on={survey.on} onChange={(on) => setSurvey({ ...survey, on })} />
        <Field label="Heading" value={survey.title} onChange={(title) => setSurvey({ ...survey, title })} />
        <Field label="Text" long value={survey.text} onChange={(text) => setSurvey({ ...survey, text })} />
        <Field label="Button words" value={survey.button} onChange={(button) => setSurvey({ ...survey, button })} />
        <Field label="Survey address" value={survey.url} onChange={(url) => setSurvey({ ...survey, url })} hint="The full https:// link to the survey." />
        <SaveRow onSave={() => save("survey", survey, setSurveyStatus)} status={surveyStatus} />
      </section>
    </div>
  );
}
