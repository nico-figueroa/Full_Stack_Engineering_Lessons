import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useToast } from "../context/useToast.js";
import { waitForBackend } from "../api/wakeBackend.js";
import Login from "../pages/Login.jsx";

jest.mock("../context/useToast.js", () => ({ useToast: jest.fn() }));
jest.mock("../api/wakeBackend.js", () => ({ waitForBackend: jest.fn() }));

describe("Login", () => {
  beforeEach(() => {
    useToast.mockReturnValue({ showToast: jest.fn() });
    waitForBackend.mockReset();
  });

  it("waits for the backend health check before submitting credentials", async () => {
    let wakeServer;
    waitForBackend.mockReturnValue(new Promise(resolve => { wakeServer = resolve; }));
    const onLogin = jest.fn().mockResolvedValue(undefined);
    render(<MemoryRouter><Login onLogin={onLogin} /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "person@example.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-horse" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Waking up server…");
    expect(onLogin).not.toHaveBeenCalled();
    await act(async () => { wakeServer(); });
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith("person@example.test", "correct-horse"));
  });
});
