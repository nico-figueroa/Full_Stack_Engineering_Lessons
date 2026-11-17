export function createBackendWakeup(baseUrl, {
  fetchImpl = (...args) => fetch(...args),
  now = Date.now,
  sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
  timeoutMs = 120_000,
  requestTimeoutMs = 10_000,
  readyForMs = 300_000,
} = {}) {
  const healthUrl = new URL(baseUrl || "/", window.location.origin);
  healthUrl.pathname = `${healthUrl.pathname.replace(/\/+$/, "")}/health`;
  healthUrl.search = "";
  healthUrl.hash = "";
  const listeners = new Set();
  let state = "idle";
  let readyUntil = 0;
  let pending;

  function publish(value) {
    state = value;
    listeners.forEach(listener => listener());
  }

  async function poll() {
    const deadline = now() + timeoutMs;
    let delay = 1_000;
    let lastError;

    while (now() < deadline) {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        Math.min(requestTimeoutMs, deadline - now()),
      );
      try {
        const response = await fetchImpl(healthUrl.toString(), {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 200) return;
        lastError = new Error(`Health check returned HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timer);
      }

      const waitMs = Math.min(delay, deadline - now());
      if (waitMs <= 0) break;
      await sleep(waitMs);
      delay = Math.min(delay * 2, 8_000);
    }

    throw new Error("The backend did not start in time. Please try again.", {
      cause: lastError,
    });
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    ensureReady() {
      if (pending) return pending;
      if (now() < readyUntil) return Promise.resolve();

      pending = poll()
        .then(() => {
          readyUntil = now() + readyForMs;
          publish("ready");
        })
        .catch(error => {
          publish("error");
          throw error;
        })
        .finally(() => { pending = undefined; });
      publish("waking");
      return pending;
    },
  };
}
