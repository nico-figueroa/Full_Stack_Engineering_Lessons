import { afterEach, describe, expect, it, vi } from "vitest";
import { createBackendWakeup } from "./wakeBackend.js";

afterEach(() => vi.useRealTimers());

describe("backend wake-up polling", () => {
  it("shares pending checks, caches readiness, and checks again after five minutes", async () => {
    let respond;
    let time = 0;
    const fetchImpl = vi.fn(() => new Promise(resolve => { respond = resolve; }));
    const backend = createBackendWakeup("https://api.example.test/", {
      fetchImpl, now: () => time,
    });
    const listener = vi.fn();
    const unsubscribe = backend.subscribe(listener);
    const first = backend.ensureReady();
    expect(backend.ensureReady()).toBe(first);
    expect(backend.getSnapshot()).toBe("waking");
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.example.test/health");
    respond({ status: 200 });
    await first;
    await backend.ensureReady();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(backend.getSnapshot()).toBe("ready");
    time = 300_000;
    const next = backend.ensureReady();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    respond({ status: 200 });
    await next;
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
  });

  it("retries network failures and non-200 responses with capped backoff", async () => {
    let time = 0;
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new TypeError("Network unavailable"))
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ status: 204 })
      .mockResolvedValueOnce({ status: 502 })
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValue({ status: 200 });
    const sleep = vi.fn(async ms => { time += ms; });
    const backend = createBackendWakeup("/backend/", {
      fetchImpl, sleep, now: () => time,
    });
    await backend.ensureReady();
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000, 4000, 8000, 8000]);
    expect(fetchImpl.mock.calls[0][0]).toBe(`${window.location.origin}/backend/health`);
  });

  it("aborts stalled checks, stops after two minutes, and allows an explicit retry", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const backend = createBackendWakeup("", { fetchImpl });
    const failed = expect(backend.ensureReady()).rejects.toThrow("did not start in time");
    await vi.advanceTimersByTimeAsync(120_000);
    await failed;
    expect(backend.getSnapshot()).toBe("error");
    expect(fetchImpl.mock.calls.every(([, options]) => options.signal.aborted)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    fetchImpl.mockResolvedValue({ status: 200 });
    await backend.ensureReady();
    expect(backend.getSnapshot()).toBe("ready");
  });
});
