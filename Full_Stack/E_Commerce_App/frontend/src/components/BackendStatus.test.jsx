import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("shows startup feedback, holds writes, and rechecks on interaction rather than keeping idle tabs alive", async () => {
  let respond;
  const fetchMock = vi.fn(() => new Promise(resolve => { respond = resolve; }));
  vi.stubGlobal("fetch", fetchMock);
  const { default: client } = await import("../api/client.js");
  const { default: BackendStatus } = await import("./BackendStatus.jsx");
  const adapter = vi.fn(async config => ({ status: 200, data: {}, config }));
  client.defaults.adapter = adapter;
  const { unmount } = render(<BackendStatus />);
  expect(screen.getByRole("status")).toHaveTextContent("backend is being initiated");
  const write = client.post("/auth/login", { email: "test@example.test" });
  await act(async () => {});
  expect(adapter).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await act(async () => {
    respond({ status: 200 });
    await write;
  });
  expect(adapter).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();

  await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(window, { key: "Tab" });
  fireEvent.pointerDown(window);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("status")).toBeInTheDocument();
  await act(async () => { respond({ status: 200 }); });
  unmount();
  await vi.advanceTimersByTimeAsync(300_000);
  fireEvent.scroll(window);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("shows an actionable error after the startup deadline without interaction retry storms", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ status: 503 });
  vi.stubGlobal("fetch", fetchMock);
  const { default: BackendStatus } = await import("./BackendStatus.jsx");
  render(<BackendStatus />);
  await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
  expect(screen.getByRole("alert")).toHaveTextContent("could not be started");
  expect(screen.getByRole("button", { name: "reload and retry" })).toBeInTheDocument();
  const attempts = fetchMock.mock.calls.length;
  fireEvent.pointerMove(window);
  expect(fetchMock).toHaveBeenCalledTimes(attempts);
});
