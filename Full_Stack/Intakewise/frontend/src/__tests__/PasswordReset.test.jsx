import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "../api/client";
import { waitForBackend } from "../api/wakeBackend.js";
import { useToast } from "../context/useToast.js";
import ForgotPassword from "../pages/ForgotPassword.jsx";
import ResetPassword from "../pages/ResetPassword.jsx";

jest.mock("../api/client", () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock("../context/useToast.js", () => ({ useToast: jest.fn() }));
jest.mock("../api/wakeBackend.js", () => ({ waitForBackend: jest.fn() }));

describe("password reset pages", () => {
  let showToast;
  beforeEach(() => {
    showToast = jest.fn();
    useToast.mockReturnValue({ showToast });
    waitForBackend.mockResolvedValue(undefined);
    api.post.mockReset();
  });

  it("requests a reset link and shows the development link when returned", async () => {
    api.post.mockResolvedValue({ data: { message: "If an account exists, a link was created.", resetUrl: "http://localhost:5173/reset-password?token=abc" } });
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "person@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText("If an account exists, a link was created.")).toBeInTheDocument();
    expect(waitForBackend).toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledWith("/auth/forgot-password", { email: "person@example.test" });
    expect(screen.getByRole("link", { name: /reset-password\?token=abc/ })).toHaveAttribute("href", "http://localhost:5173/reset-password?token=abc");
  });

  it("rejects mismatched passwords without calling the API", async () => {
    render(<MemoryRouter initialEntries={["/reset-password?token=abc"]}><ResetPassword /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password-1" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "new-password-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Passwords do not match.");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("submits the token and new password, then returns to sign in", async () => {
    api.post.mockResolvedValue({ data: { message: "Password updated." } });
    render(
      <MemoryRouter initialEntries={["/reset-password?token=abc"]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/login" element={<p>Sign-in page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password-1" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "new-password-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("Sign-in page")).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/auth/reset-password", { token: "abc", password: "new-password-1" });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("success", "Password updated."));
  });

  it("explains when the reset link has no token", () => {
    render(<MemoryRouter initialEntries={["/reset-password"]}><ResetPassword /></MemoryRouter>);
    expect(screen.getByRole("alert")).toHaveTextContent("missing its token");
  });
});
