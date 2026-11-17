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

it("shares wake-up across Fetch and Axios writes and rechecks only on activity", async () => {
  let respond;
  const fetchMock = vi.fn(url => {
    if (url.endsWith("/health")) return new Promise(resolve => { respond = resolve; });
    return Promise.resolve(new Response(JSON.stringify({ id: "star-1", restaurantId: "r1" })));
  });
  vi.stubGlobal("fetch", fetchMock);
  const { client } = await import("../api/index.js");
  const { starRestaurant } = await import("../api/restaurants.js");
  const { createCategory } = await import("../api/categories.js");
  const { default: BackendStatus } = await import("./BackendStatus.jsx");
  const adapter = vi.fn(async config => ({ status: 201, data: { id: "c1" }, config }));
  client.defaults.adapter = adapter;
  const { unmount } = render(<BackendStatus />);
  expect(screen.getByRole("status")).toHaveTextContent("backend is being initiated");
  const writes = Promise.all([starRestaurant("r1"), createCategory("Italian")]);
  await act(async () => {});
  expect(adapter).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(async () => {
    respond({ status: 200 });
    await writes;
  });
  expect(adapter).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1][1].method).toBe("POST");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();

  await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  fireEvent.scroll(window);
  fireEvent.keyDown(window, { key: "Tab" });
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(screen.getByRole("status")).toBeInTheDocument();
  await act(async () => { respond({ status: 200 }); });
  unmount();
  await vi.advanceTimersByTimeAsync(300_000);
  fireEvent.pointerDown(window);
  expect(fetchMock).toHaveBeenCalledTimes(3);
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
