import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, SiteSettings, loadSiteSettings } from "../lib/siteSettings";

type State = { settings: SiteSettings; reload: () => void };

const SiteSettingsContext = createContext<State>({ settings: DEFAULT_SETTINGS, reload: () => {} });

/** The admin-editable bits of the site, loaded once for every page. */
export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const reload = useCallback(() => {
    loadSiteSettings().then(setSettings);
  }, []);
  useEffect(reload, [reload]);
  return <SiteSettingsContext.Provider value={{ settings, reload }}>{children}</SiteSettingsContext.Provider>;
}

export const useSiteSettings = () => useContext(SiteSettingsContext);
