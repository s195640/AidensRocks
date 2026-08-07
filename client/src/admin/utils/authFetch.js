import { getStoredToken } from "./authToken";

// Thin wrapper around the native fetch for admin-only /api endpoints.
// axios calls pick up the Authorization header automatically via
// axios.defaults.headers.common (set in AuthContext), but native fetch
// doesn't share that default -- any call site hitting a protected route
// with fetch should use this instead of the bare global.
const authFetch = (url, options = {}) => {
  const token = getStoredToken();
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
};

export default authFetch;
