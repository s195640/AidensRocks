import { createContext, useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";

// Site-wide values from the `setting` table (GET /api/site-settings, the
// public allow-list in server/src/utils/siteSettings.js), loaded once per
// visit. Never hard-code these in components -- e.g. the contact email is
// edited in Admin → Settings. Values are null until loaded (or if the
// request fails); callers must handle that rather than fall back to a
// hard-coded address.
const EMPTY = { contactEmail: null };

const SiteSettingsContext = createContext({ ...EMPTY, refresh: () => {} });

export const SiteSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(EMPTY);

  const refresh = useCallback(
    () =>
      axios
        .get("/api/site-settings")
        .then((res) => setSettings({ ...EMPTY, ...res.data }))
        .catch((err) => console.error("Couldn't load site settings:", err)),
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SiteSettingsContext.Provider value={{ ...settings, refresh }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = () => useContext(SiteSettingsContext);
