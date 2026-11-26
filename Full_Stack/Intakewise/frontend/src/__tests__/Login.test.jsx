import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useToast } from "../context/useToast.js";
import { waitForBackend } from "../api/wakeBackend.js";
import Login from "../pages/Login.jsx";
import { LanguageProvider } from "../context/LanguageContext.jsx";

jest.mock("../context/useToast.js", () => ({ useToast: jest.fn() }));
jest.mock("../api/wakeBackend.js", () => ({ waitForBackend: jest.fn() }));

describe("Login", () => {
  beforeEach(() => {
    localStorage.removeItem("language");
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

  it("shows an email security-code step when the password is accepted", async () => {
    waitForBackend.mockResolvedValue(undefined);
    const onLogin = jest.fn().mockResolvedValue({
      mfaRequired: true,
      challengeId: "challenge-1",
      maskedEmail: "pe***@example.test",
    });
    const onVerifyMfa = jest.fn().mockResolvedValue({});
    render(<MemoryRouter><Login onLogin={onLogin} onVerifyMfa={onVerifyMfa} /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "person@example.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-horse" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    const code = await screen.findByLabelText("Security code");
    fireEvent.change(code, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify code" }));

    await waitFor(() => expect(onVerifyMfa).toHaveBeenCalledWith("challenge-1", "123456"));
    expect(screen.getByText(/pe\*\*\*@example\.test/)).toBeInTheDocument();
  });

  it("shows only the active language and toggles the full login page", () => {
    render(<MemoryRouter><LanguageProvider><Login onLogin={jest.fn()} /></LanguageProvider></MemoryRouter>);
    const switcher = screen.getByRole("button", { name: /Language: English/ });
    expect(switcher).toHaveTextContent("English");
    expect(screen.getByTestId("language-flag-us")).toBeInTheDocument();
    fireEvent.click(switcher);
    expect(screen.getByRole("button", { name: /Idioma: Español/ })).toHaveTextContent("Español");
    expect(screen.getByTestId("language-flag-cr")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Inicia sesión en tu cuenta" })).toBeInTheDocument();
  });
});
