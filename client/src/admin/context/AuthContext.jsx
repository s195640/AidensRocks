// src/context/AuthContext.jsx
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { getStoredToken, setStoredToken } from "../utils/authToken";
import { AUTH_UNAUTHORIZED_EVENT } from "../utils/authFetch";
import { LEVELS } from "../utils/accessLevels";

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
applyAuthHeader(getStoredToken());

export const AuthProvider = ({ children }) => {
  // { id, email, accessLevel, notifyRockMoves } or null when signed out.
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = () => {
    setStoredToken(null);
    applyAuthHeader(null);
    setAccount(null);
  };

  const refreshAccount = useCallback(async () => {
    const { data } = await axios.get("/api/auth/me");
    setAccount(data.account);
    return data.account;
  }, []);

  // Rehydrate on load (e.g. page refresh): the header is already attached
  // (see above) — this confirms the stored token is still valid and loads
  // the account it belongs to.
  useEffect(() => {
    if (!getStoredToken()) {
      setIsLoading(false);
      return;
    }

    // Only a 401 means the token is no good. A network error or a 500
    // while the server restarts used to throw away a 90-day sign-in too.
    refreshAccount()
      .catch((err) => {
        if (err.response?.status === 401) clearSession();
        else console.error("Couldn't confirm the sign-in:", err);
      })
      .finally(() => setIsLoading(false));
  }, [refreshAccount]);

  // A token that expires/becomes invalid mid-session (or an account an
  // admin just locked) should sign out cleanly instead of leaving the UI
  // half-authenticated. 403 (signed in, but not allowed) does not sign out.
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && getStoredToken()) {
          clearSession();
        }
        return Promise.reject(error);
      }
    );
    // Same for admin calls made with authFetch (native fetch).
    const onUnauthorized = () => {
      if (getStoredToken()) clearSession();
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => {
      axios.interceptors.response.eject(interceptor);
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, []);

  // Returns { ok: true } or { ok: false, code, message } — code is
  // "UNVERIFIED" when the server says so (a locked account gets the same
  // generic failure as a wrong password -- see routes/auth.js /login).
  const login = async (email, password) => {
    try {
      const { data } = await axios.post("/api/auth/login", { email, password });
      setStoredToken(data.token);
      applyAuthHeader(data.token);
      setAccount(data.account);
      return { ok: true, account: data.account };
    } catch (err) {
      return {
        ok: false,
        code: err.response?.data?.code,
        message:
          err.response?.data?.error || "Sign in failed. Please try again.",
      };
    }
  };

  const logout = () => clearSession();

  const accessLevel = account?.accessLevel ?? 0;

  return (
    <AuthContext.Provider
      value={{
        account,
        setAccount,
        isAuthenticated: !!account,
        isUser: accessLevel >= LEVELS.USER,
        isAdmin: accessLevel >= LEVELS.ADMIN,
        isLoading,
        login,
        logout,
        refreshAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
