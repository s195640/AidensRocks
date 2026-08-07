// src/components/PrivateRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Avoid flashing a redirect to /login while a stored token is still
  // being verified against the server (e.g. right after a page refresh).
  if (isLoading) return null;

  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
