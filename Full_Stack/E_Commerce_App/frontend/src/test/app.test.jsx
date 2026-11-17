import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, CUSTOMER, ADMIN, PRODUCTS } from "./helpers.jsx";
import * as auth from "../api/auth.js";
import * as carts from "../api/carts.js";
import * as products from "../api/products.js";
import * as orders from "../api/orders.js";
import { backend } from "../api/client.js";

vi.mock("../api/auth.js");
vi.mock("../api/carts.js");
vi.mock("../api/orders.js");
vi.mock("../api/products.js");
vi.mock("../api/payments.js");
vi.mock("../api/admin.js");
beforeEach(() => vi.resetAllMocks());

describe("Requirements: products", () => {
  it("lists products with stock state", async () => {
    renderApp("/");
    expect(await screen.findByText("Quantum Laptop")).toBeInTheDocument();
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("shows product details and requires login to add to cart", async () => {
    products.fetchProduct.mockResolvedValue(PRODUCTS[0]);
    renderApp("/products/p1");
    const button = await screen.findByRole("button", { name: /add to cart/i });
    await userEvent.click(button);
    expect(await screen.findByRole("heading", { name: /welcome|log in|sign in/i })).toBeInTheDocument();
  });
});

describe("Requirements: authentication", () => {
  it("waits for backend readiness before redirecting to GitHub", async () => {
    let ready;
    const wake = vi.spyOn(backend, "ensureReady")
      .mockReturnValue(new Promise(resolve => { ready = resolve; }));
    auth.githubOAuthStartUrl.mockReturnValue("#github-sign-in");
    renderApp("/login");
    const button = await screen.findByRole("button", { name: /continue with github/i });
    await userEvent.click(button);
    expect(button).toBeDisabled();
    expect(auth.githubOAuthStartUrl).not.toHaveBeenCalled();
    ready();
    await waitFor(() => expect(window.location.hash).toBe("#github-sign-in"));
    wake.mockRestore();
    window.location.hash = "";
  });

  it("logs in with email and password", async () => {
    auth.login.mockResolvedValue({ accessToken: "t" });
    auth.fetchCurrentUser.mockResolvedValue(CUSTOMER);
    renderApp("/login");
    await userEvent.type(await screen.findByLabelText(/email/i), "customer@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: /^(log in|sign in)$/i }));
    await waitFor(() =>
      expect(auth.login).toHaveBeenCalledWith({ email: "customer@example.com", password: "Password123!" }),
    );
    expect(await screen.findByRole("button", { name: /log out/i })).toBeInTheDocument();
  });

  it("shows the server error on a failed login", async () => {
    auth.login.mockRejectedValue(new Error("Invalid credentials"));
    renderApp("/login");
    await userEvent.type(await screen.findByLabelText(/email/i), "x@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrongpass1");
    await userEvent.click(screen.getByRole("button", { name: /^(log in|sign in)$/i }));
    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });

  it("registers a profile with a name and signs in", async () => {
    auth.register.mockResolvedValue({});
    auth.login.mockResolvedValue({ accessToken: "t" });
    auth.fetchCurrentUser.mockResolvedValue(CUSTOMER);
    renderApp("/register");
    await userEvent.type(await screen.findByLabelText(/full name/i), "Casey Customer");
    await userEvent.type(screen.getByLabelText(/^email/i), "new@example.com");
    await userEvent.type(screen.getByLabelText(/^password/i), "Password123!");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: /create account|sign up/i }));
    await waitFor(() =>
      expect(auth.register).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "Password123!",
        name: "Casey Customer",
      }),
    );
  });

  it("rejects mismatched passwords on registration", async () => {
    renderApp("/register");
    await userEvent.type(await screen.findByLabelText(/^email/i), "new@example.com");
    await userEvent.type(screen.getByLabelText(/^password/i), "Password123!");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "Different123!");
    await userEvent.click(screen.getByRole("button", { name: /create account|sign up/i }));
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it("logs out", async () => {
    renderApp("/", { user: CUSTOMER });
    await userEvent.click(await screen.findByRole("button", { name: /log out/i }));
    expect(await screen.findByRole("link", { name: /log in/i })).toBeInTheDocument();
    expect(localStorage.getItem("ecommerce.accessToken")).toBeNull();
  });
});

describe("Requirements: protected routes", () => {
  it.each(["/cart", "/orders", "/profile", "/checkout/o1"])("redirects %s to login when signed out", async (route) => {
    renderApp(route);
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^(log in|sign in)$/i })).toBeInTheDocument();
  });

  it.each(["/admin/products", "/admin/orders"])("keeps customers out of %s", async (route) => {
    renderApp(route, { user: CUSTOMER });
    expect(await screen.findByText("Quantum Laptop")).toBeInTheDocument();
    expect(screen.queryByText(/manage (products|orders)/i, { selector: "h1" })).not.toBeInTheDocument();
  });

  it("shows admin navigation only to admins", async () => {
    renderApp("/", { user: ADMIN });
    expect(await screen.findByRole("link", { name: /manage products/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /manage orders/i })).toBeInTheDocument();
  });
});

describe("OAuth confirmation", () => {
  it("confirms the pending GitHub account", async () => {
    window.location.hash = "#ticket=abc";
    auth.fetchPendingOAuth.mockResolvedValue({ githubLogin: "octo", email: "o@x.com", name: "Octo" });
    auth.confirmOAuth.mockResolvedValue({ accessToken: "tok" });
    auth.fetchCurrentUser.mockResolvedValue(CUSTOMER);
    renderApp("/oauth/confirm");
    await userEvent.click(await screen.findByRole("button", { name: "Continue as @octo" }));
    await waitFor(() => expect(auth.confirmOAuth).toHaveBeenCalledWith("abc"));
    expect(await screen.findByRole("button", { name: /log out/i })).toBeInTheDocument();
  });

  it("offers a different GitHub account", async () => {
    window.location.hash = "#ticket=xyz";
    auth.fetchPendingOAuth.mockResolvedValue({ githubLogin: "octo", email: "o@x.com" });
    auth.discardOAuth.mockResolvedValue();
    auth.githubOAuthSelectUrl.mockReturnValue("about:blank#select");
    renderApp("/oauth/confirm");
    await userEvent.click(await screen.findByRole("button", { name: /different github account/i }));
    await waitFor(() => expect(auth.discardOAuth).toHaveBeenCalledWith("xyz"));
  });

  it("shows an error for a missing ticket", async () => {
    window.location.hash = "";
    renderApp("/oauth/confirm");
    expect(await screen.findByText(/missing or has expired/i)).toBeInTheDocument();
  });
});

describe("Profile", () => {
  it("prefills and saves the profile", async () => {
    auth.updateProfile.mockResolvedValue({});
    auth.fetchCurrentUser.mockResolvedValue(CUSTOMER);
    renderApp("/profile", { user: CUSTOMER });
    const city = await screen.findByLabelText(/^city/i);
    expect(city).toHaveValue("Austin");
    await userEvent.clear(city);
    await userEvent.type(city, "Dallas");
    await userEvent.click(screen.getByRole("button", { name: /save profile/i }));
    await waitFor(() =>
      expect(auth.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Casey Customer", address: expect.objectContaining({ city: "Dallas" }) }),
      ),
    );
    expect(await screen.findByText("Profile saved.")).toBeInTheDocument();
  });
});

describe("Cart and delivery address", () => {
  const cart = {
    id: "c1",
    currency: "USD",
    totalAmount: 999,
    items: [{ id: "i1", productId: "p1", quantity: 1, unitPrice: 999, currency: "USD" }],
  };

  it("shows cart items", async () => {
    renderApp("/cart", { user: CUSTOMER, cart });
    expect(await screen.findByText("Quantum Laptop")).toBeInTheDocument();
  });

  it("places an order with the (prefilled) delivery address", async () => {
    orders.placeOrder.mockResolvedValue({ id: "o1" });
    carts.fetchCart.mockResolvedValue(cart);
    renderApp("/cart", { user: CUSTOMER, cart });
    expect(await screen.findByLabelText(/address line 1/i)).toHaveValue("1 Main St");
    await userEvent.click(screen.getByRole("button", { name: /place order/i }));
    await waitFor(() =>
      expect(orders.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Casey Customer", line1: "1 Main St", city: "Austin", postalCode: "78701", country: "US" }),
      ),
    );
  });

  it("shows an empty cart message", async () => {
    renderApp("/cart", { user: CUSTOMER });
    expect(await screen.findByText(/your cart is empty/i)).toBeInTheDocument();
  });
});
