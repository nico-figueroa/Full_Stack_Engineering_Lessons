import axios from "axios";
import { createBackendWakeup } from "./wakeBackend.js";

// Base URL of the backend API. In development this defaults to the local
// Express server; in production it must be set via VITE_API_BASE_URL on
// Render (pointing at the deployed backend web service).
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export const backend = createBackendWakeup(API_BASE_URL);

const client = axios.create({
  baseURL: API_BASE_URL,
});

const TOKEN_STORAGE_KEY = "ecommerce.accessToken";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

// Attach the bearer token (if any) to every outgoing request.
client.interceptors.request.use(async (config) => {
  await backend.ensureReady();
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize backend error payloads (`{ error, status }` or Zod validation
// errors) into a single `message` string so UI code never has to guess the
// shape of a failure response.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    let message = "Something went wrong. Please try again.";

    if (Array.isArray(data?.details) && data.details.length > 0) {
      message = data.details.map((issue) => issue.message).join(", ");
    } else if (data?.error && typeof data.error === "string") {
      message = data.error;
    } else if (error.message) {
      message = error.message;
    }

    return Promise.reject(new Error(message));
  },
);

export default client;
