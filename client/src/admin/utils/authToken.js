// Shared sessionStorage key for the admin JWT: written by AuthContext on
// login, read by AuthContext on rehydrate, and by authFetch for native
// `fetch` call sites that don't go through axios's default header.
export const TOKEN_KEY = "adminToken";

export const getStoredToken = () => sessionStorage.getItem(TOKEN_KEY);
