import { useEffect, useState } from "react";
import Icon from "../../components/icons/Icon";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { Banner, BannerColor, SurveyBanner, newBanner, saveSiteSetting } from "../../lib/siteSettings";
import { useSiteContent } from "../../context/SiteContentContext";
import { resetContentEdit } from "../../lib/siteContent";

// Change the banners on the site yourself, and see the words you've changed
// with "Edit site". Banners are saved straight to the site_settings table;
// everyone sees the change the next time a page loads.

const COLOR_CHOICES: [BannerColor, string, string][] = [
  ["coral", "Coral", "bg-coral text-navy"],
  ["butter", "Yellow", "bg-butter text-navy"],
  ["sky", "Blue", "bg-sky text-navy"],
  ["navy", "Navy", "bg-navy text-mist"],
];

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

export default function AdminSite({ onEditSite }: { onEditSite: () => void }) {
  const { settings, reload } = useSiteSettings();
  const [survey, setSurvey] = useState<SurveyBanner>(settings.survey);
  const [banners, setBanners] = useState<Banner[]>(settings.banners);
  const [surveyStatus, setSurveyStatus] = useState(idle);
  const [bannerStatus, setBannerStatus] = useState(idle);

  // Once the saved settings arrive, start from them.
  useEffect(() => setSurvey(settings.survey), [settings.survey]);
  useEffect(() => setBanners(settings.banners), [settings.banners]);

  const patch = (id: string, change: Partial<Banner>) =>
    setBanners((list) => list.map((b) => (b.id === id ? { ...b, ...change } : b)));

  async function save<K extends "survey" | "banners">(
    key: K,
    value: K extends "survey" ? SurveyBanner : Banner[],
    setStatus: (s: typeof idle) => void
  ) {
    setStatus({ busy: true, msg: null, error: false });
    const error = await saveSiteSetting(key, value as never);
    setStatus({ busy: false, msg: error ?? "Saved. It's live on the site.", error: Boolean(error) });
    if (!error) reload();
  }

  return (
    <div className="btd-container max-w-3xl py-10 pb-20">
      <h1 className="font-display text-30 font-extrabold text-navy">Site and banners</h1>
      <p className="mt-2 text-17 text-body">Change these yourself. They update on the site as soon as you save.</p>
      <button type="button" onClick={onEditSite} className="btd-btn mt-5 min-h-[52px] gap-2 bg-butter px-6 text-base text-navy hover:bg-butter/90">
        <Icon name="refine" size={20} />
        Edit any words on the site
      </button>

      <section className="btd-card mt-8 grid gap-4 p-6">
        <h2 className="text-21 font-extrabold text-navy">Banners</h2>
        <p className="text-15 text-body">
          Lines across the top of the site, for news like an event or a new feature. Add as many as you like.
        </p>
        {banners.length === 0 && <p className="text-15 text-muted">No banners yet.</p>}
        {banners.map((b, i) => (
          <div key={b.id} className="grid gap-3 rounded-tile border-2 border-navy/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Toggle label={`Banner ${i + 1}`} on={b.on} onChange={(on) => patch(b.id, { on })} />
              <button
                type="button"
                onClick={() => setBanners((list) => list.filter((x) => x.id !== b.id))}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-clay hover:underline"
              >
                <Icon name="trash" size={16} />
                Remove
              </button>
            </div>
            <Field label="What it says" value={b.text} onChange={(text) => patch(b.id, { text })} />
            <Field
              label="Link (optional)"
              value={b.url}
              onChange={(url) => patch(b.id, { url })}
              hint="A full web address (https://…), or a page on Voiced like /stories."
            />
            <Field label="Link words" value={b.linkLabel} onChange={(linkLabel) => patch(b.id, { linkLabel })} hint='For example "Sign up" or "Learn more".' />
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-15 font-bold text-navy">Color</legend>
              <div className="flex flex-wrap gap-2">
                {COLOR_CHOICES.map(([id, label, cls]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={b.color === id}
                    onClick={() => patch(b.id, { color: id })}
                    className={`min-h-[44px] rounded-full border-2 px-4 text-sm font-bold ${cls} ${
                      b.color === id ? "border-navy ring-2 ring-navy ring-offset-2" : "border-transparent"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-15 font-bold text-navy">Where</legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "Every page"],
                    ["home", "Home page only"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={b.where === id}
                    onClick={() => patch(b.id, { where: id })}
                    className={`min-h-[44px] rounded-full border-2 px-4 text-sm font-bold ${
                      b.where === id ? "border-navy bg-navy text-mist" : "border-navy/20 bg-white text-navy"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            {b.text && (
              <div>
                <p className="mb-1 text-13 font-bold uppercase tracking-[0.08em] text-muted">Preview</p>
                <p className={`rounded-tile px-4 py-2.5 text-15 font-semibold ${COLOR_CHOICES.find(([id]) => id === b.color)?.[2]}`}>
                  {b.text} {b.url && <u className="font-bold">{b.linkLabel || "Learn more"}</u>}
                </p>
              </div>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setBanners((list) => [...list, newBanner()])}
          className="btd-btn-outline min-h-[48px] justify-self-start gap-2 px-5 text-sm"
        >
          <Icon name="plus" size={18} />
          Add a banner
        </button>
        <SaveRow onSave={() => save("banners", banners, setBannerStatus)} status={bannerStatus} />
      </section>

      <section className="btd-card mt-8 grid gap-4 p-6">
        <h2 className="text-21 font-extrabold text-navy">Survey banner (home page)</h2>
        <p className="text-15 text-body">The yellow box on the home page. The footer's "Take our survey" link uses the same address.</p>
        <Toggle label="Survey banner" on={survey.on} onChange={(on) => setSurvey({ ...survey, on })} />
        <Field label="Heading" value={survey.title} onChange={(title) => setSurvey({ ...survey, title })} />
        <Field label="Text" long value={survey.text} onChange={(text) => setSurvey({ ...survey, text })} />
        <Field label="Button words" value={survey.button} onChange={(button) => setSurvey({ ...survey, button })} />
        <Field label="Survey address" value={survey.url} onChange={(url) => setSurvey({ ...survey, url })} hint="/feedback is Voiced's own survey (answers show under Feedback). Or a full https:// link to another survey." />
        <SaveRow onSave={() => save("survey", survey, setSurveyStatus)} status={surveyStatus} />
      </section>

      <WordsChanged onEditSite={onEditSite} />
    </div>
  );
}

/** Every change made with "Edit site", so none gets lost, each with a way
 *  back to the original words. */
function WordsChanged({ onEditSite }: { onEditSite: () => void }) {
  const { edits, reload } = useSiteContent();
  const [error, setError] = useState<string | null>(null);

  async function reset(original: string, path: string) {
    const err = await resetContentEdit(original, path);
    setError(err);
    if (!err) reload();
  }

  return (
    <section className="btd-card mt-8 grid gap-4 p-6">
      <h2 className="text-21 font-extrabold text-navy">Words you've changed</h2>
      {edits.length === 0 ? (
        <p className="text-15 text-body">
          None yet.{" "}
          <button type="button" onClick={onEditSite} className="font-bold text-link underline">
            Edit the site
          </button>{" "}
          and click any words to change them.
        </p>
      ) : (
        <ul className="grid gap-3">
          {edits.map((e) => (
            <li key={e.original + e.path} className="grid gap-1 rounded-tile border border-navy/10 p-4 text-15">
              <span className="text-13 font-bold uppercase tracking-[0.08em] text-muted">
                {e.path === "*" ? "Everywhere" : `Only on ${e.path}`}
              </span>
              <span className="text-muted line-through">{e.original}</span>
              <span className="font-semibold text-navy">{e.replacement || "(hidden)"}</span>
              <button type="button" onClick={() => reset(e.original, e.path)} className="justify-self-start text-sm font-bold text-link hover:underline">
                Back to the original words
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
          {error}
        </p>
      )}
    </section>
  );
}
