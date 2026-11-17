import axios from "axios";
import { createBackendWakeup } from "./wakeBackend.js";

export const API_ENDPOINT = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export const backend = createBackendWakeup(API_ENDPOINT);
export const client = axios.create({ baseURL: API_ENDPOINT });
client.interceptors.request.use(async config => {
  await backend.ensureReady();
  return config;
});

export async function apiFetch(...args) {
  await backend.ensureReady();
  return fetch(...args);
}
