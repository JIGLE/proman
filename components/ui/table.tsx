import * as React from "react";

import { cn } from "@/lib/utils/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    scope="col"
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

interface RenderTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface RenderTableProps<T> {
  data: T[];
  columns: RenderTableColumn<T>[];
  rowKey: (row: T) => string;
  emptyState?: React.ReactNode;
  className?: string;
  /** Pins the first column while data columns scroll right — for matrices where
   * cross-column comparison is the point (doctrine rule 3, "horizontal scroll" strategy). */
  stickyFirstColumn?: boolean;
  /** Below `md`, render each row via `renderCard` instead of a table row — for record
   * lists (doctrine rule 3, "card fallback" strategy). Mutually exclusive in effect with
   * `stickyFirstColumn`, which targets matrices instead. */
  cardMode?: boolean;
  renderCard?: (row: T) => React.ReactNode;
  /** Opening the record by clicking its row is the norm for these lists, so it belongs here
   * rather than being re-implemented per cell. Applies to the table only — `renderCard` owns
   * its own affordances, since a card usually wants a visible control rather than a click
   * target the size of a paragraph. */
  onRowClick?: (row: T) => void;
  /** Per-row styling driven by row state (selection, severity). Table only — `renderCard`
   * already receives the row and can style its own container. */
  rowClassName?: (row: T) => string | undefined;
}

/**
 * Shared responsive table: real `<table>` markup at `md` and up (or always, if `cardMode`
 * is off), scrolling horizontally inside its own container rather than the page body. Opt
 * into `cardMode` + `renderCard` for the doctrine's record-list mobile strategy.
 */
function RenderTable<T>({
  data,
  columns,
  rowKey,
  emptyState,
  className,
  stickyFirstColumn = false,
  cardMode = false,
  renderCard,
  onRowClick,
  rowClassName,
}: RenderTableProps<T>): React.ReactElement {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const stickyCellClass = "sticky left-0 z-10 bg-[var(--color-card-solid)]";

  return (
    <>
      <div
        className={cn("relative w-full overflow-x-auto", cardMode && "hidden md:block", className)}
      >
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    stickyFirstColumn && i === 0 && stickyCellClass,
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && "cursor-pointer", rowClassName?.(row))}
              >
                {columns.map((col, i) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      stickyFirstColumn && i === 0 && stickyCellClass,
                      col.cellClassName,
                    )}
                  >
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {cardMode && renderCard && (
        <div className="flex flex-col gap-3 md:hidden">
          {data.map((row) => (
            <React.Fragment key={rowKey(row)}>{renderCard(row)}</React.Fragment>
          ))}
        </div>
      )}
    </>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  RenderTable,
};
