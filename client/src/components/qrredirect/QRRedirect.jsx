import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

export default function QRRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Fire-and-forget hit log, same endpoint/table the catch-all
    // (NotFoundRedirect.jsx) uses -- /qr is a real, matched route, but the
    // family still wants to see how often it gets hit in the admin panel.
    axios
      .post("/api/unmatched-path", {
        path: location.pathname,
        fullUrl: location.pathname + location.search,
      })
      .catch((error) => console.error("Error logging /qr hit:", error));

    const params = new URLSearchParams(location.search);
    const r = params.get("r");

    if (r) {
      sessionStorage.setItem("rock_num_qr", r);
    }

    navigate("/");
  }, []);

  return null;
}
