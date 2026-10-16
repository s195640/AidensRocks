import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { skipPageView, track } from "../../utils/activity";

// Catches any URL that didn't match a defined route (e.g. "/f"), logs the
// hit for the admin Statistics panel, and bounces the visitor to home.
// Fire-and-forget: a failed log call must never block the redirect.
export default function NotFoundRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    axios
      .post("/api/unmatched-path", {
        path: location.pathname,
        fullUrl: location.pathname + location.search,
      })
      .catch((error) => console.error("Error logging unmatched path:", error));

    // Site activity: a not-found hit, not a page view.
    skipPageView(location.pathname);
    track("not_found", { meta: { full_url: (location.pathname + location.search).slice(0, 2048) } });

    navigate("/", { replace: true });
  }, []);

  return null;
}
