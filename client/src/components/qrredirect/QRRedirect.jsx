import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useARContext } from "../../context/ARContext";

export default function QRRedirect() {
  const { rValue, setRValue } = useARContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const r = params.get("r");

    if (r) {
      setRValue(r);
    }
    navigate("/");
  }, []);

  return null;
}
