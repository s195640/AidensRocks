import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Dialog from "../components/simple-components/dialog/Dialog";
import styles from "./UnsavedChangesContext.module.css";

const UnsavedChangesContext = createContext(null);

// Generic "block navigation while something is unsaved" mechanism, currently
// only used by EntryDetailView.jsx's Honoring Aiden ContentEditor, but
// written page-agnostic (registerGuard/guardNavigate) so any other future
// editor in this app could hook into the same dialog instead of growing its
// own copy.
//
// This app uses a plain <BrowserRouter> (see main.jsx), not a Data Router —
// react-router's own navigation-blocking (useBlocker) only works with a Data
// Router, so it isn't available here. Instead, every in-app link that can
// navigate away (Navbar.jsx, HonoringAidenPage.jsx's sidebar) calls
// guardNavigate() itself before actually navigating. That only covers clicks
// on links THIS app renders — the browser's own Back/Forward buttons trigger
// a same-origin popstate, not a real page unload, so neither this nor
// beforeunload below can catch those; only a real unload (tab close, page
// refresh, a typed URL, or an external link) gets the browser's own native
// "leave site?" prompt (see the beforeunload listener below) — its text
// can't be customized, that's a browser security restriction, not something
// fixable from here.
export function UnsavedChangesProvider({ children }) {
  // Ref, not state — read synchronously by guardNavigate/isDirty/
  // beforeunload without needing THIS component to re-render on every
  // keystroke in whatever editor is currently registered.
  const guardRef = useRef({ hasUnsavedChanges: false, onSave: null, onDiscard: null });
  const pendingNavigateRef = useRef(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const registerGuard = useCallback((guard) => {
    guardRef.current = guard;
  }, []);

  const isDirty = useCallback(() => guardRef.current.hasUnsavedChanges, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!guardRef.current.hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = ""; // required by most browsers to actually show the prompt
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const guardNavigate = useCallback((navigateFn) => {
    if (!guardRef.current.hasUnsavedChanges) {
      navigateFn();
      return;
    }
    pendingNavigateRef.current = navigateFn;
    setSaveError("");
    setDialogOpen(true);
  }, []);

  const closeDialog = () => {
    if (saving) return; // don't let Escape/backdrop cancel mid-save
    setDialogOpen(false);
    pendingNavigateRef.current = null;
    setSaveError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await guardRef.current.onSave?.();
      const navigateFn = pendingNavigateRef.current;
      setDialogOpen(false);
      pendingNavigateRef.current = null;
      navigateFn?.();
    } catch (err) {
      console.error("Failed to save unsaved changes before navigating away:", err);
      setSaveError("Couldn't save your changes. Please try again, or Discard to leave anyway.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    guardRef.current.onDiscard?.();
    const navigateFn = pendingNavigateRef.current;
    setDialogOpen(false);
    pendingNavigateRef.current = null;
    navigateFn?.();
  };

  return (
    <UnsavedChangesContext.Provider value={{ registerGuard, guardNavigate, isDirty }}>
      {children}
      <Dialog
        isOpen={dialogOpen}
        onClose={closeDialog}
        closeOnOutsideClick
        title="Unsaved Changes"
        buttonPanel={
          <>
            <button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button type="button" className={styles.discardBtn} onClick={handleDiscard} disabled={saving}>
              Discard
            </button>
          </>
        }
      >
        <p>You have unsaved changes. Do you want to save them before leaving this page?</p>
        {saveError && <p className={styles.error}>{saveError}</p>}
      </Dialog>
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChangesGuard() {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) {
    throw new Error("useUnsavedChangesGuard must be used within an UnsavedChangesProvider");
  }
  return ctx;
}

// Shared by every link that wraps its onClick in a guardNavigate() check
// (Navbar.jsx, HonoringAidenPage.jsx) — skips interception for anything that
// isn't a plain left-click (ctrl/cmd/shift/alt-click, middle-click), so
// "open in new tab" keeps working normally: a new tab can't lose THIS tab's
// unsaved edits, so there's nothing to guard against there.
export function isPlainLeftClick(e) {
  return !(e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0);
}
