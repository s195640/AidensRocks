import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

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

    navigate("/", { replace: true });
  }, []);

  return null;
}
