import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "../api/client";
import { useToast } from "../context/useToast.js";
import InteractionDetail from "../pages/InteractionDetail.jsx";
import ItemsPage from "../pages/ItemsPage.jsx";

jest.mock("../api/client", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("../context/useToast.js", () => ({ useToast: jest.fn() }));

const baseItem = { category: "medication", dosage_per_intake: "1 tablet", frequency: "daily", times_of_day: ["morning"], warnings: [], overrides: [] };

describe("Label review and navigation", () => {
  beforeEach(() => {
    useToast.mockReturnValue({ showToast: jest.fn() });
  });

  it("flags items whose official label requires manual review", async () => {
    api.get.mockResolvedValue({ data: [
      { ...baseItem, id: 1, name: "Milli", reference_data: { match_status: "needs_review" } },
      { ...baseItem, id: 2, name: "Mili", reference_data: { match_status: "confirmed" } },
    ] });
    render(<MemoryRouter initialEntries={["/items"]}><ItemsPage /></MemoryRouter>);
    const badge = await screen.findByRole("alert");
    expect(badge).toHaveTextContent(/Requires manual review/);
    expect(badge.closest("a")).toHaveAttribute("href", "/items/1");
    expect(screen.getByText(/Label confirmed/)).toBeInTheDocument();
  });

  it("links interaction details back to the item details page", async () => {
    api.get.mockResolvedValue({ data: { interactions: [{ item_id: 5, name: "Mili", warnings: [] }] } });
    render(<MemoryRouter initialEntries={["/interactions/5"]}><Routes><Route path="/interactions/:itemId" element={<InteractionDetail />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("link", { name: /Back to item details/ })).toHaveAttribute("href", "/items/5");
    expect(screen.getByRole("link", { name: "Official reference" })).toHaveAttribute("href", "/reference/5");
  });

  it("links back to the dashboard when opened from a dashboard warning", async () => {
    api.get.mockResolvedValue({ data: { interactions: [{ item_id: 5, name: "Mili", warnings: [] }] } });
    render(<MemoryRouter initialEntries={[{ pathname: "/interactions/5", state: { from: "/" } }]}><Routes><Route path="/interactions/:itemId" element={<InteractionDetail />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("link", { name: /Back to dashboard/ })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Item details" })).toHaveAttribute("href", "/items/5");
  });
});
