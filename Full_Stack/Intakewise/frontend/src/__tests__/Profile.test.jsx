import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import api from "../api/client.js";
import { useToast } from "../context/useToast.js";
import Profile from "../pages/Profile.jsx";

jest.mock("../api/client", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    put: jest.fn(),
  },
}));
jest.mock("../context/useToast.js", () => ({ useToast: jest.fn() }));

describe("Profile", () => {
  const user = {
    id: 7,
    name: "Current User",
    email: "current@example.com",
    email_mfa_enabled: false,
  };
  let showToast;

  beforeEach(() => {
    showToast = jest.fn();
    useToast.mockReturnValue({ showToast });
    api.post.mockReset();
    api.put.mockReset();
  });

  it("updates editable profile details", async () => {
    const updatedUser = { ...user, name: "Updated User", email: "updated@example.com" };
    api.put.mockResolvedValue({ data: { user: updatedUser } });
    const onProfileChange = jest.fn();
    render(<Profile user={user} onProfileChange={onProfileChange} />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Updated User" } });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "updated@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith("/auth/profile", {
        name: "Updated User",
        email: "updated@example.com",
      }),
    );
    expect(onProfileChange).toHaveBeenCalledWith(updatedUser);
    expect(showToast).toHaveBeenCalledWith("success", "Profile updated.");
  });

  it("changes the password and keeps a replacement session active", async () => {
    const session = {
      user,
      accessToken: "new-access",
      refreshToken: "new-refresh",
      message: "Password updated. Other sessions have been signed out.",
    };
    api.put.mockResolvedValue({ data: session });
    const onPasswordChange = jest.fn();
    render(<Profile user={user} onPasswordChange={onPasswordChange} />);

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "current-password" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "new-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith("/auth/password", {
        currentPassword: "current-password",
        newPassword: "new-password",
      }),
    );
    expect(onPasswordChange).toHaveBeenCalledWith(session);
  });

  it("places MFA controls in the Security card without a profile refresh action", () => {
    render(<Profile user={user} />);

    const security = screen.getByRole("heading", { name: "Security" }).closest("section");
    expect(
      within(security).getByRole("heading", { name: "Email security codes" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh profile" })).not.toBeInTheDocument();
  });
});
