import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/client";
import { useToast } from "../context/useToast.js";
import CalendarPage from "../pages/CalendarPage.jsx";

jest.mock("../api/client", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }));
jest.mock("../context/useToast.js", () => ({ useToast: jest.fn() }));
jest.mock("react-big-calendar", () => ({
  Calendar: props => <div>
    <span data-testid="current-view">{props.view}</span>
    {props.views.map(view => <button key={view} onClick={() => props.onView(view)}>{view}</button>)}
    <button onClick={() => props.onSelectSlot({ start: new Date(2026, 9, 9, 10, 30) })}>Select date</button>
    {props.events.map(event => <button key={event.id} onClick={() => props.onSelectEvent(event)}>{event.title}</button>)}
  </div>,
  dateFnsLocalizer: () => ({}),
}));

describe("CalendarPage", () => {
  const showToast = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    useToast.mockReturnValue({ showToast });
    api.get.mockImplementation(url => Promise.resolve({
      data: url === "/items" ? [{ id: 1, name: "Vitamin D", dosage_per_intake: "1 capsule" }] : { schedule: [] },
    }));
  });

  it("offers all calendar views and creates schedule overrides from selected slots", async () => {
    render(<MemoryRouter><CalendarPage /></MemoryRouter>);
    await screen.findByRole("button", { name: "week" });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(screen.getByText("month")).toBeInTheDocument();
    expect(screen.getByText("day")).toBeInTheDocument();
    expect(screen.getByText("agenda")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Add intake/ }));
    await screen.findByRole("dialog");
    expect(screen.getByLabelText("Item")).toHaveValue("1");
    api.post.mockResolvedValue({ data: {} });
    fireEvent.click(screen.getByRole("button", { name: "Save intake" }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/overrides", expect.objectContaining({ item_id: 1, is_skipped: false })));
  });

  it("opens the add-intake dialog when linked from the dashboard quick action", async () => {
    render(<MemoryRouter initialEntries={["/calendar?new=1"]}><CalendarPage /></MemoryRouter>);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Item")).toHaveValue("1"));
  });
});
