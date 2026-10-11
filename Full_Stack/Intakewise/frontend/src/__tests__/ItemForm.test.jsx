import { fireEvent, render, screen } from "@testing-library/react";
import { ItemForm } from "../pages/ItemsPage.jsx";

jest.mock("../api/client", () => ({ __esModule: true, default: {} }));

describe("ItemForm", () => {
  it("requires an item name before saving", () => {
    const onSave = jest.fn();
    render(<ItemForm initial={{}} onSave={onSave} busy={false} />);
    expect(screen.getByLabelText("Item name")).toBeRequired();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits structured routine, warning, and reference data", () => {
    const onSave = jest.fn();
    render(<ItemForm initial={{}} onSave={onSave} busy={false} />);
    fireEvent.change(screen.getByLabelText("Item name"), { target: { value: "Daily vitamin" } });
    fireEvent.change(screen.getByLabelText("Dosage per intake"), { target: { value: "1 tablet" } });
    fireEvent.change(screen.getByLabelText("Warnings (one per line)"), { target: { value: "Check with a clinician" } });
    fireEvent.change(screen.getByLabelText("Reference link"), { target: { value: "https://ods.od.nih.gov/" } });
    fireEvent.click(screen.getByRole("button", { name: "Save item" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: "Daily vitamin",
      dosage_per_intake: "1 tablet",
      interaction_profile: { notes: "", food: "" },
      warnings: ["Check with a clinician"],
      reference_data: expect.objectContaining({ source_url: "https://ods.od.nih.gov/", summary: "" }),
    }));
  });

  it("offers an as-needed frequency and explains times-of-day limits", () => {
    const onSave = jest.fn();
    render(<ItemForm initial={{}} onSave={onSave} busy={false} />);
    expect(screen.getByRole("option", { name: "As needed" })).toHaveValue("as_needed");
    expect(screen.getByText(/Multiple selections are valid/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Item name"), { target: { value: "Pain relief" } });
    fireEvent.change(screen.getByLabelText("Frequency"), { target: { value: "as_needed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save item" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ frequency: "as_needed" }));
  });

  it("blocks saving when selected times exceed the number of items to take", () => {
    const onSave = jest.fn();
    render(<ItemForm initial={{}} onSave={onSave} busy={false} />);
    fireEvent.change(screen.getByLabelText("Item name"), { target: { value: "Magnesium" } });
    fireEvent.change(screen.getByLabelText("Dosage per intake"), { target: { value: "1 capsule" } });
    const checkboxes = screen.getAllByRole("checkbox");
    checkboxes.filter(box => !box.checked).slice(0, 1).forEach(box => fireEvent.click(box));
    if (checkboxes.filter(box => box.checked).length < 2) fireEvent.click(checkboxes.find(box => !box.checked));
    fireEvent.click(screen.getByRole("button", { name: "Save item" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/do not exceed/);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves product identifiers used to match the official label", () => {
    const onSave = jest.fn();
    render(<ItemForm initial={{}} onSave={onSave} busy={false} />);
    fireEvent.change(screen.getByLabelText("Item name"), { target: { value: "Mili" } });
    fireEvent.change(screen.getByLabelText("Active ingredients (comma separated)"), { target: { value: "norgestimate, ethinyl estradiol" } });
    fireEvent.change(screen.getByLabelText("Manufacturer"), { target: { value: "Aurobindo" } });
    fireEvent.click(screen.getByRole("button", { name: "Save item" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      reference_data: expect.objectContaining({ active_ingredients: ["norgestimate", "ethinyl estradiol"], manufacturer: "Aurobindo", ndc: "" }),
    }));
  });

  it("clears an automatic label decision when the product identity changes", () => {
    const onSave = jest.fn();
    const initial = { id: 7, name: "Milli", category: "medication", frequency: "daily", times_of_day: ["morning"], reference_data: { match_status: "confirmed", dailymed_setid: "abc", match_title: "Old" } };
    render(<ItemForm initial={initial} onSave={onSave} busy={false} />);
    fireEvent.change(screen.getByLabelText("Item name"), { target: { value: "Mili" } });
    fireEvent.click(screen.getByRole("button", { name: "Save item" }));
    const saved = onSave.mock.calls[0][0].reference_data;
    expect(saved.match_status).toBeUndefined();
    expect(saved.dailymed_setid).toBeUndefined();
  });
});