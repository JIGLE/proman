import { describe, it, expect, vi } from "vitest";
import { renderWithProviders as render, screen } from "@/tests/helpers/render-with-providers";
import { RenderTable } from "./table";

interface Row {
  id: string;
  name: string;
}

const rows: Row[] = [
  { id: "1", name: "Alpha" },
  { id: "2", name: "Beta" },
];

const columns = [{ key: "name", header: "Name", cell: (row: Row) => row.name }];

describe("RenderTable", () => {
  it("renders a real table with the given rows", () => {
    render(<RenderTable data={rows} columns={columns} rowKey={(r) => r.id} />);
    expect(screen.getByText("Alpha")).toBeDefined();
    expect(screen.getByText("Beta")).toBeDefined();
    expect(screen.getByRole("table")).toBeDefined();
  });

  it("renders the emptyState instead of a table when data is empty", () => {
    render(
      <RenderTable
        data={[]}
        columns={columns}
        rowKey={(r: Row) => r.id}
        emptyState={<p>Nothing here</p>}
      />,
    );
    expect(screen.getByText("Nothing here")).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("renders card fallback content when cardMode + renderCard are provided", () => {
    const renderCard = vi.fn((row: Row) => <div data-testid={`card-${row.id}`}>{row.name}</div>);
    render(
      <RenderTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        cardMode
        renderCard={renderCard}
      />,
    );
    expect(renderCard).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("card-1")).toBeDefined();
    // The table itself should still be present (hidden below md via CSS, not unmounted)
    expect(screen.getByRole("table")).toBeDefined();
  });
});
