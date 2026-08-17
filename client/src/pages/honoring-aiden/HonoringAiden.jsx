import HonoringAidenPage from "./HonoringAidenPage";

// Public route entry point (/honoring-aiden/*, see App.jsx) — the actual
// implementation is shared with the protected /admin/honoring-aiden route;
// see HonoringAidenPage.jsx.
export default function HonoringAiden() {
  return <HonoringAidenPage isAdmin={false} />;
}
