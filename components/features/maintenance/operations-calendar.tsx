"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaintenanceTicket } from "@/lib/types";

interface OperationsCalendarProps {
  tickets: MaintenanceTicket[];
  onTicketClick?: (ticket: MaintenanceTicket) => void;
}

interface DayTicket {
  ticket: MaintenanceTicket;
  kind: "scheduled" | "due" | "sla";
}

const KIND_DOT_CLASS: Record<DayTicket["kind"], string> = {
  scheduled: "status-dot status-dot-info",
  due: "status-dot status-dot-warn",
  sla: "status-dot status-dot-danger",
};

function dateKey(value: string): string {
  return value.slice(0, 10);
}

/** Month grid of scheduled work, due dates, and SLA deadlines — reuses the
 * lease-calendar.tsx visual pattern (month nav + day-cell grid) tailored to
 * MaintenanceTicket instead of lease events. */
export function OperationsCalendar({ tickets, onTicketClick }: OperationsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const ticketsByDay = useMemo(() => {
    const map = new Map<string, DayTicket[]>();
    const add = (
      ticket: MaintenanceTicket,
      dateStr: string | undefined,
      kind: DayTicket["kind"],
    ) => {
      if (!dateStr) return;
      const key = dateKey(dateStr);
      const list = map.get(key) ?? [];
      list.push({ ticket, kind });
      map.set(key, list);
    };
    for (const ticket of tickets) {
      add(ticket, ticket.scheduledDate, "scheduled");
      add(ticket, ticket.dueDate, "due");
      add(ticket, ticket.slaDueAt, "sla");
    }
    return map;
  }, [tickets]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const cells = useMemo(() => {
    const today = new Date();
    const list: { day: number; isToday: boolean; entries: DayTicket[] }[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      list.push({ day: 0, isToday: false, entries: [] });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const key = dateKey(new Date(year, month, day).toISOString());
      const isToday =
        today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
      list.push({ day, isToday, entries: ticketsByDay.get(key) ?? [] });
    }
    return list;
  }, [firstDayOfMonth, daysInMonth, year, month, ticketsByDay]);

  const monthLabel = currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--color-foreground)]">{monthLabel}</p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous month"
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Next month"
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden border border-[var(--color-border)] bg-[var(--color-border)] text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="bg-[var(--color-surface)] px-2 py-1.5 text-center text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]"
          >
            {d}
          </div>
        ))}
        {cells.map((cell, idx) => (
          <div
            key={idx}
            className={`min-h-20 bg-[var(--color-card)] p-1.5 ${cell.day === 0 ? "opacity-40" : ""}`}
          >
            {cell.day > 0 && (
              <>
                <p
                  className={`text-xs ${cell.isToday ? "font-semibold text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)]"}`}
                >
                  {cell.day}
                </p>
                <div className="mt-1 space-y-0.5">
                  {cell.entries.slice(0, 3).map((entry, i) => (
                    <button
                      key={`${entry.ticket.id}-${entry.kind}-${i}`}
                      onClick={() => onTicketClick?.(entry.ticket)}
                      className="flex w-full items-center gap-1 truncate text-left text-[10px] text-[var(--color-foreground)] hover:underline"
                    >
                      <span className={KIND_DOT_CLASS[entry.kind]} />
                      <span className="truncate">{entry.ticket.title}</span>
                    </button>
                  ))}
                  {cell.entries.length > 3 && (
                    <p className="text-[10px] text-[var(--color-muted-foreground)]">
                      +{cell.entries.length - 3} more
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-[var(--color-muted-foreground)]">
        <span className="flex items-center gap-1.5">
          <span className="status-dot status-dot-info" /> Scheduled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="status-dot status-dot-warn" /> Due
        </span>
        <span className="flex items-center gap-1.5">
          <span className="status-dot status-dot-danger" /> SLA deadline
        </span>
      </div>

      {tickets.length === 0 && (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          No scheduled or due maintenance work.
        </p>
      )}
    </div>
  );
}

export default OperationsCalendar;
