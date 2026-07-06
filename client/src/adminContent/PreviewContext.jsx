import { createContext, useContext } from "react";

// Defaults to false so usePageContent (and anything else reading this) works
// correctly even before a page tree mounts a <PreviewProvider> — only the
// admin preview flow needs to actually flip it on.
const PreviewContext = createContext(false);

export function PreviewProvider({ children }) {
  const isPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "1";

  return (
    <PreviewContext.Provider value={isPreview}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  return useContext(PreviewContext);
}
