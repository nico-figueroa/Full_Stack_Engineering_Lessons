import axios from "axios";

const ACCESS_KEY = "drug-intake-access";
const REFRESH_KEY = "drug-intake-refresh";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 15000,
});

export function setSession({ accessToken, refreshToken }) {
  if (!accessToken || !refreshToken) throw new Error("Both session tokens are required");
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(ACCESS_KEY, token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem(ACCESS_KEY);
    delete api.defaults.headers.common.Authorization;
  }
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  setToken("");
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY) || "";
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) || "";
}

const initialToken = getAccessToken();
if (initialToken) api.defaults.headers.common.Authorization = `Bearer ${initialToken}`;

let refreshing;
api.interceptors.response.use(
  response => response,
  async error => {
    const request = error.config;
    if (error.response?.status !== 401 || !request || request._retried ||
      request.url?.includes("/auth/login") || request.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) {
      clearSession();
      window.dispatchEvent(new Event("auth-expired"));
      return Promise.reject(error);
    }
    try {
      refreshing ||= api.post("/auth/refresh", { refreshToken })
        .then(({ data }) => {
          setSession(data);
          return data.accessToken;
        })
        .finally(() => { refreshing = undefined; });
      const token = await refreshing;
      request._retried = true;
      request.headers.Authorization = `Bearer ${token}`;
      return api(request);
    } catch (refreshError) {
      clearSession();
      window.dispatchEvent(new Event("auth-expired"));
      return Promise.reject(refreshError);
    }
  }
);

export default api;
