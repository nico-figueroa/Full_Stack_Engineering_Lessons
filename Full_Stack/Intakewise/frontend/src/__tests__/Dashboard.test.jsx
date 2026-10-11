import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/client";
import { useToast } from "../context/useToast.js";
import Dashboard from "../pages/Dashboard.jsx";

jest.mock("../api/client", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("../context/useToast.js", () => ({ useToast: jest.fn() }));

describe("Dashboard", () => {
  beforeEach(() => {
    useToast.mockReturnValue({ showToast: jest.fn() });
    api.get.mockImplementation(url => Promise.resolve({
      data: url === "/items" ? [{ id: 1, name: "Vitamin D", category: "vitamin", created_at: new Date().toISOString() }]
        : url === "/schedule" ? { schedule: [{ item_id: 1, name: "Vitamin D", date: new Date().toISOString().slice(0, 10), time: "08:00", dosage: "1 tablet", source: "proposal" }] }
          : url === "/stock" ? { stock: [] }
            : { interactions: [{ item_id: 1, name: "Vitamin D", warnings: [{ description: "Review the official label.", source: "DailyMed" }] }] },
    }));
  });

  it("shows the schedule, recent items, and active warnings", async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect((await screen.findAllByText("Vitamin D")).length).toBeGreaterThan(0);
    expect(screen.getByText("Review the official label.")).toBeInTheDocument();
    expect(screen.getByText("Today’s schedule")).toBeInTheDocument();
    expect(screen.getAllByText("Active warnings").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Add item/ })).toHaveAttribute("href", "/items?new=1");
    expect(screen.getByRole("link", { name: /Add override/ })).toHaveAttribute("href", "/calendar?new=1");
  });
});

