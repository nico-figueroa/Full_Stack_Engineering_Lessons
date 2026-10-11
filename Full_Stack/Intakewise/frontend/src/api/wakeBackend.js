import api from "./client";

export function getHealthUrl() {
  const baseUrl = new URL(api.defaults.baseURL, window.location.origin);
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/api\/?$/, "").replace(/\/$/, "")}/health`;
  baseUrl.search = "";
  baseUrl.hash = "";
  return baseUrl.toString();
}

export async function waitForBackend({
  healthUrl = getHealthUrl(),
  timeoutMs = 120_000,
  requestTimeoutMs = 10_000,
  initialDelayMs = 1_000,
  maxDelayMs = 8_000,
  fetchImpl = fetch,
  now = Date.now,
  sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
} = {}) {
  const startedAt = now();
  let delay = initialDelayMs;
  let lastError;

  while (now() - startedAt < timeoutMs) {
    const remaining = timeoutMs - (now() - startedAt);
    const controller = new AbortController();
    const requestTimer = setTimeout(() => controller.abort(), Math.min(requestTimeoutMs, remaining));

    try {
      const response = await fetchImpl(healthUrl, { method: "GET", signal: controller.signal });
      if (response.status === 200) return;
      lastError = new Error(`Health check returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(requestTimer);
    }

    const waitMs = Math.min(delay, timeoutMs - (now() - startedAt));
    if (waitMs <= 0) break;
    await sleep(waitMs);
    delay = Math.min(delay * 2, maxDelayMs);
  }

  throw new Error("The server did not wake up in time. Please try again.", { cause: lastError });
}
