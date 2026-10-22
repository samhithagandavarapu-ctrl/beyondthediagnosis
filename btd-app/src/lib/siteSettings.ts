import { supabase, authEnabled } from "./supabaseClient";
import { SURVEY_URL } from "../data/site";

// Things on the site an admin changes from /admin/site, kept in the
// site_settings table (supabase/migrations/20261028_site_settings.sql). Until
// one is saved, or if the table isn't there yet, the built-in text below is
// used, so the site looks the same as before.

export type SurveyBanner = { on: boolean; title: string; text: string; button: string; url: string };
export type Announcement = { on: boolean; text: string; linkLabel: string; url: string };
export type SiteSettings = { survey: SurveyBanner; announcement: Announcement };

export const DEFAULT_SETTINGS: SiteSettings = {
  survey: {
    on: true,
    title: "Met us at an event? Help shape Voiced.",
    text: "Tell us what would help you, your family, or your patients. It's a short survey and takes just a few minutes.",
    button: "Take the survey",
    url: SURVEY_URL,
  },
  announcement: { on: false, text: "", linkLabel: "", url: "" },
};

export async function loadSiteSettings(): Promise<SiteSettings> {
  if (!authEnabled) return DEFAULT_SETTINGS;
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error || !data) return DEFAULT_SETTINGS;
  const saved = Object.fromEntries(data.map((r: { key: string; value: unknown }) => [r.key, r.value]));
  return {
    survey: { ...DEFAULT_SETTINGS.survey, ...(saved.survey ?? {}) },
    announcement: { ...DEFAULT_SETTINGS.announcement, ...(saved.announcement ?? {}) },
  };
}

export async function saveSiteSetting<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]): Promise<string | null> {
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error && /site_settings/.test(error.message)) {
    return "The settings table isn't set up yet. Run supabase/migrations/20261028_site_settings.sql in Supabase first.";
  }
  return error?.message ?? null;
}
