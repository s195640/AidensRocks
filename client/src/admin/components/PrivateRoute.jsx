// src/components/PrivateRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LEVELS } from "../utils/accessLevels";

// Signed out -> /login (remembering where they were headed); signed in but
// below minLevel -> home. Defaults to admin-only.
const PrivateRoute = ({ children, minLevel = LEVELS.ADMIN }) => {
  const { account, isLoading } = useAuth();
  const location = useLocation();

  // Avoid flashing a redirect to /login while a stored token is still
  // being verified against the server (e.g. right after a page refresh).
  if (isLoading) return null;

  if (!account) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  return account.accessLevel >= minLevel ? children : <Navigate to="/" replace />;
};

export default PrivateRoute;
