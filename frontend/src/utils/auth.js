// utils/auth.js
const ACCESS_KEY = "access";
const REFRESH_KEY = "refresh";

const ACCOUNTS_BASE = (import.meta.env.VITE_ACCOUNTS_URL || "/api/accounts").replace(/\/+$/, "");
const REFRESH_URL = `${ACCOUNTS_BASE}/token/refresh/`;

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export async function refreshToken() {
  const refresh = localStorage.getItem(REFRESH_KEY);
  console.log("Attempting to refresh token...");
  if (!refresh) return null;

  const res = await fetch(REFRESH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    console.warn("Refresh failed with status", res.status);
    return null;
  }

  const data = await res.json();
  const newAccess = data.access || data.access_token; // accept either shape
  if (!newAccess) {
    console.warn("Refresh response missing access token", data);
    return null;
  }
  localStorage.setItem(ACCESS_KEY, newAccess);
  return newAccess;
}

export async function fetchWithAuth(url, options = {}) {
  // clone options without mutating the caller
  const headers = new Headers(options.headers || {});
  const access = localStorage.getItem(ACCESS_KEY);
  if (access && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${access}`);
  }

  // set JSON content-type only when appropriate
  const isForm = options.body instanceof FormData;
  if (options.body && !isForm && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const init = { ...options, headers, _retry: options._retry || false };

  let res = await fetch(url, init);

  // try exactly once on 401
  if (res.status === 401 && !init._retry) {
    console.log("Access token expired, trying to refresh...");
    const token = await refreshToken();
    if (token) {
      console.log("Token refreshed, retrying request...");
      const retryHeaders = new Headers(headers);
      retryHeaders.set("Authorization", `Bearer ${token}`);
      res = await fetch(url, { ...init, headers: retryHeaders, _retry: true });
    } else {
      console.log("Refresh failed. Clearing tokens.");
      clearTokens(); // optional: let caller redirect to /login
    }
  }

  return res;
}
