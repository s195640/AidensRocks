import { createContext, useContext } from "react";
import { useLocation } from "react-router-dom";

// Defaults to false so usePageContent (and anything else reading this) works
// correctly even before a page tree mounts a <PreviewProvider> — only the
// admin preview flow needs to actually flip it on.
const PreviewContext = createContext(false);

// Follows the router's location, so ?preview=1 applies to exactly the
// page that has it. Reading window.location once (App never re-renders on
// navigation) left a tab stuck in -- or out of -- preview mode.
export function PreviewProvider({ children }) {
  const { search } = useLocation();
  const isPreview = new URLSearchParams(search).get("preview") === "1";

  return (
    <PreviewContext.Provider value={isPreview}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  return useContext(PreviewContext);
}
