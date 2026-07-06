import { createContext, useContext, useState } from "react";
import UploadRockForm from "../components/upload-rock-form/UploadRockForm";

const UploadRockModalContext = createContext(null);

// Page-scoped modal state. Any component anywhere in the tree below this
// provider (a button, a text link, or anything else the registry adds later)
// can trigger the same upload form without owning its own local state —
// which matters once the trigger becomes a portable chip that can be moved
// around a page's body text.
export function UploadRockModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <UploadRockModalContext.Provider value={{ isOpen, open, close }}>
      {children}
      {isOpen && <UploadRockForm onClose={close} />}
    </UploadRockModalContext.Provider>
  );
}

export function useUploadRockModal() {
  const ctx = useContext(UploadRockModalContext);
  if (!ctx) {
    throw new Error("useUploadRockModal must be used within an UploadRockModalProvider");
  }
  return ctx;
}
