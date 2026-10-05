import { getStoredToken } from "./authToken";

// Thin wrapper around the native fetch for admin-only /api endpoints.
// axios calls pick up the Authorization header automatically via
// axios.defaults.headers.common (set in AuthContext), but native fetch
// doesn't share that default -- any call site hitting a protected route
// with fetch should use this instead of the bare global.
//
// fetch also bypasses AuthContext's axios 401 interceptor, so a 401 here is
// announced with AUTH_UNAUTHORIZED_EVENT and AuthContext signs out the same
// way (otherwise an expired token just left admin tables silently empty).
export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

const authFetch = async (url, options = {}) => {
  const token = getStoredToken();
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 && token) {
    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
  }
  return res;
};

export default authFetch;
