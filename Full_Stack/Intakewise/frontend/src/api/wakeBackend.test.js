import { getHealthUrl, waitForBackend } from "./wakeBackend.js";
import api from "./client";

describe("backend wake-up polling", () => {
  it("targets the backend health endpoint instead of the API route prefix", () => {
    api.defaults.baseURL = "https://intake-api.onrender.com/api";
    expect(getHealthUrl()).toBe("https://intake-api.onrender.com/health");
  });

  it("retries with increasing delays until the health endpoint returns HTTP 200", async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ status: 200 });
    const sleep = jest.fn().mockResolvedValue(undefined);

    await expect(waitForBackend({ healthUrl: "https://api.example.test/health", fetchImpl, sleep }))
      .resolves.toBeUndefined();

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1_000);
  });

  it("stops retrying when its overall timeout expires", async () => {
    let currentTime = 0;
    const fetchImpl = jest.fn().mockResolvedValue({ status: 503 });
    const sleep = jest.fn(async milliseconds => { currentTime += milliseconds; });

    await expect(waitForBackend({
      healthUrl: "https://api.example.test/health",
      timeoutMs: 5_000,
      initialDelayMs: 1_000,
      maxDelayMs: 8_000,
      fetchImpl,
      sleep,
      now: () => currentTime,
    })).rejects.toThrow("The server did not wake up in time");

    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls.map(([milliseconds]) => milliseconds)).toEqual([1_000, 2_000, 2_000]);
  });
});
