// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { TOKEN_KEY } from "../utils/authToken";

const AuthContext = createContext();

const applyAuthHeader = (token) => {
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common["Authorization"];
  }
};

// Attach any already-stored token at module load — before any component
// renders, let alone fires an effect. Doing this inside AuthProvider's own
// useEffect is too late for components outside PrivateRoute: public pages
// (Home, Sudc, ...) call the now-protected admin preview endpoint straight
// from their own mount effect, with nothing waiting on isLoading, and React
// fires a descendant's effects before an ancestor's in the same commit — so
// AuthProvider's effect could easily lose that race and the preview request
// would go out with no Authorization header at all.
applyAuthHeader(sessionStorage.getItem(TOKEN_KEY));

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    applyAuthHeader(null);
    setIsAuthenticated(false);
  };

  // Rehydrate on load (e.g. page refresh): the header is already attached
  // (see above) — this just confirms the stored token is still valid.
  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    axios
      .get("/api/auth/verify")
      .then(() => setIsAuthenticated(true))
      .catch(() => clearSession())
      .finally(() => setIsLoading(false));
  }, []);

  // A token that expires/becomes invalid mid-session should log the admin
  // out cleanly instead of leaving the UI half-authenticated.
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          clearSession();
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const login = async (username, password) => {
    try {
      const { data } = await axios.post("/api/auth/login", {
        username,
        password,
      });
      sessionStorage.setItem(TOKEN_KEY, data.token);
      applyAuthHeader(data.token);
      setIsAuthenticated(true);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => clearSession();

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
