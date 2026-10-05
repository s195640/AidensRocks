// Shared localStorage key for the signed-in account's JWT (users and admin
// alike): written by AuthContext on login, read by AuthContext on
// rehydrate, and by authFetch for native `fetch` call sites that don't go
// through axios's default header. localStorage (not sessionStorage) so a
// sign-in survives closing the browser, until the token expires (30d).
export const TOKEN_KEY = "authToken";

const safeGet = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getStoredToken = safeGet;

export const setStoredToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable (private mode etc.) — sign-in lasts this page only.
  }
};
