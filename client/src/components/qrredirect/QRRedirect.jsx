import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function QRRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const r = params.get("r");

    if (r) {
      sessionStorage.setItem("rock_num_qr", r);
    }

    navigate("/");
  }, []);

  return null;
}
