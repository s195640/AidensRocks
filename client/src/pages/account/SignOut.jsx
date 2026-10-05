import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../admin/context/AuthContext";

// The navbar's "Sign Out" item is a plain route link, so signing out is a
// page that clears the session and sends you home.
const SignOut = () => {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, [logout]);

  return <Navigate to="/" replace />;
};

export default SignOut;
