import { describe, it, expect, vi } from "vitest";
import {
  renderWithProviders as render,
  screen,
  fireEvent,
} from "@/tests/helpers/render-with-providers";
import { TabsMobileSelect } from "./tabs";

describe("TabsMobileSelect", () => {
  const items = [
    { value: "overview", label: "Overview" },
    { value: "history", label: "History", badge: 3 },
  ];

  it("renders one option per item and reflects the current value", () => {
    render(<TabsMobileSelect value="overview" onValueChange={() => {}} items={items} />);
    const select = screen.getByRole("combobox", { name: /select tab/i }) as HTMLSelectElement;
    expect(select.value).toBe("overview");
    expect(screen.getByText("Overview")).toBeDefined();
    expect(screen.getByText("History (3)")).toBeDefined();
  });

  it("calls onValueChange with the selected value", () => {
    const onValueChange = vi.fn();
    render(<TabsMobileSelect value="overview" onValueChange={onValueChange} items={items} />);
    const select = screen.getByRole("combobox", { name: /select tab/i });
    fireEvent.change(select, { target: { value: "history" } });
    expect(onValueChange).toHaveBeenCalledWith("history");
  });
});
