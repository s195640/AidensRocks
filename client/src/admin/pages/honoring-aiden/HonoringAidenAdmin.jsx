import HonoringAidenPage from "../../../pages/honoring-aiden/HonoringAidenPage";

// Protected route entry point (/admin/honoring-aiden/*, gated by
// PrivateRoute in App.jsx) — the actual implementation is shared with the
// public /honoring-aiden route; see pages/honoring-aiden/HonoringAidenPage.jsx.
export default function HonoringAidenAdmin() {
  return <HonoringAidenPage isAdmin={true} />;
}
