"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle,
  Edit,
  Phone,
  Receipt,
  Trash2,
  User,
  Wrench,
  XCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MaintenanceTicket } from "@/lib/types";
import { useApp } from "@/lib/contexts/app-context";
import { useToast } from "@/lib/contexts/toast-context";
import { useConfirmDialog } from "@/lib/hooks/use-confirm-dialog";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { useCurrency } from "@/lib/contexts/currency-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketDetailModalProps {
  ticket: MaintenanceTicket | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (ticket: MaintenanceTicket) => void;
  onDelete?: (ticketId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  open: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  resolved: "bg-green-500/10 text-green-400 border-green-500/30",
  closed: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-500/10 text-zinc-400",
  medium: "bg-amber-500/10 text-amber-400",
  high: "bg-orange-500/10 text-orange-400",
  urgent: "bg-red-500/10 text-red-400",
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TicketDetailModal({
  ticket,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: TicketDetailModalProps) {
  const { updateMaintenance, deleteMaintenance } = useApp();
  const { success, error } = useToast();
  const { formatCurrency } = useCurrency();
  const confirmDialog = useConfirmDialog();
  const [activeTab, setActiveTab] = useState("overview");

  if (!ticket) return null;

  // ── Zone 1: Status + Health ──────────────────────────────────────────────────
  const isOverdue =
    ticket.dueDate &&
    new Date(ticket.dueDate) < new Date() &&
    ticket.status !== "resolved" &&
    ticket.status !== "closed";
  const hasVendor = !!(ticket.vendorName || ticket.assignedTo);
  const hasCost = !!(ticket.estimatedCost ?? ticket.cost);

  // ── Zone 2: Primary Action ───────────────────────────────────────────────────
  const primaryAction = (() => {
    if (ticket.status === "open") {
      return {
        label: "Mark In Progress",
        onClick: async () => {
          try {
            await updateMaintenance(ticket.id, { status: "in_progress" });
            success("Ticket moved to In Progress");
          } catch {
            error("Failed to update status");
          }
        },
        variant: "default" as const,
      };
    }
    if (ticket.status === "in_progress") {
      return {
        label: "Mark Resolved",
        onClick: async () => {
          try {
            await updateMaintenance(ticket.id, {
              status: "resolved",
              resolvedAt: new Date().toISOString(),
            });
            success("Ticket resolved");
            onClose();
          } catch {
            error("Failed to resolve ticket");
          }
        },
        variant: "default" as const,
      };
    }
    if (ticket.status === "resolved") {
      return {
        label: "Close Ticket",
        onClick: async () => {
          try {
            await updateMaintenance(ticket.id, { status: "closed" });
            success("Ticket closed");
            onClose();
          } catch {
            error("Failed to close ticket");
          }
        },
        variant: "secondary" as const,
      };
    }
    return null;
  })();

  // ── Zone 3: Issues ───────────────────────────────────────────────────────────
  const issues = [];
  if (isOverdue) {
    issues.push({
      id: "overdue",
      icon: AlertTriangle,
      color: "text-red-400",
      label: `Overdue — due ${formatDate(ticket.dueDate)}`,
    });
  }
  if (!hasVendor && ticket.status !== "resolved" && ticket.status !== "closed") {
    issues.push({
      id: "no-vendor",
      icon: Wrench,
      color: "text-amber-400",
      label: "No vendor assigned",
    });
  }
  if (ticket.isTenantReport) {
    issues.push({
      id: "tenant-report",
      icon: User,
      color: "text-blue-400",
      label: "Reported by tenant",
    });
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleDelete = () => {
    confirmDialog.confirm(
      {
        title: "Delete Ticket",
        description: `"${ticket.title}" will be permanently removed. This action cannot be undone.`,
        confirmLabel: "Delete",
        variant: "destructive",
      },
      async () => {
        try {
          if (onDelete) {
            onDelete(ticket.id);
          } else {
            await deleteMaintenance(ticket.id);
          }
          success("Ticket deleted");
          onClose();
        } catch {
          error("Failed to delete ticket");
        }
      },
    );
  };

  const vendorDisplay = ticket.vendorName || ticket.assignedTo;
  const costDisplay = ticket.estimatedCost ?? ticket.cost;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                  <Wrench className="h-5 w-5 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="truncate text-base font-semibold">
                    {ticket.title}
                  </DialogTitle>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLORS[ticket.status] ?? STATUS_COLORS.open}`}
                    >
                      {ticket.status.replace("_", " ")}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[ticket.priority] ?? ""}`}
                    >
                      {ticket.priority}
                    </span>
                    {ticket.category && (
                      <Badge variant="outline" className="text-[10px] py-0">
                        {ticket.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(ticket)}
                    className="h-7 w-7 p-0"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Zone 2: Primary Action */}
          {primaryAction && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-[var(--color-muted-foreground)]">
                  {ticket.status === "open" && "Assign a vendor and start this work order."}
                  {ticket.status === "in_progress" && "Work is underway. Mark complete when done."}
                  {ticket.status === "resolved" && "Work is done. Close to archive this ticket."}
                </div>
                <Button
                  size="sm"
                  variant={primaryAction.variant}
                  onClick={primaryAction.onClick}
                  className="shrink-0"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  {primaryAction.label}
                </Button>
              </div>
            </div>
          )}

          {/* Zone 3: Issues */}
          {issues.length > 0 && (
            <div className="space-y-2">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm"
                >
                  <issue.icon className={`h-3.5 w-3.5 shrink-0 ${issue.color}`} />
                  <span className="text-[var(--color-foreground)]">{issue.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Zone 4: Tabbed Info */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="costs">Costs</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            {/* Overview tab */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Context */}
              <div className="grid grid-cols-2 gap-3">
                {ticket.propertyName && (
                  <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                    <Building2 className="h-4 w-4 shrink-0 text-accent-primary" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wide">
                        Property
                      </p>
                      <p className="text-sm font-medium truncate">{ticket.propertyName}</p>
                    </div>
                  </div>
                )}
                {ticket.tenantName && (
                  <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                    <User className="h-4 w-4 shrink-0 text-accent-primary" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wide">
                        Tenant
                      </p>
                      <p className="text-sm font-medium truncate">{ticket.tenantName}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wide mb-1">
                  Description
                </p>
                <p className="text-sm text-[var(--color-foreground)]">{ticket.description}</p>
              </div>

              {/* Vendor */}
              {vendorDisplay && (
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                  <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wide mb-2">
                    Vendor / Contractor
                  </p>
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                    <span className="text-sm font-medium">{vendorDisplay}</span>
                  </div>
                  {ticket.vendorPhone && (
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                      <span className="text-sm text-[var(--color-muted-foreground)]">
                        {ticket.vendorPhone}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {ticket.scheduledDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                    <div>
                      <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wide">
                        Scheduled
                      </p>
                      <p className="font-medium">{formatDate(ticket.scheduledDate)}</p>
                    </div>
                  </div>
                )}
                {ticket.dueDate && (
                  <div className="flex items-center gap-2">
                    <Calendar
                      className={`h-4 w-4 ${isOverdue ? "text-red-400" : "text-[var(--color-muted-foreground)]"}`}
                    />
                    <div>
                      <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wide">
                        Due
                      </p>
                      <p className={`font-medium ${isOverdue ? "text-red-400" : ""}`}>
                        {formatDate(ticket.dueDate)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Costs tab */}
            <TabsContent value="costs" className="mt-4">
              <div className="space-y-3">
                {hasCost ? (
                  <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-accent-primary" />
                        <span className="text-sm text-[var(--color-muted-foreground)]">
                          Estimated Cost
                        </span>
                      </div>
                      <span className="text-lg font-semibold text-[var(--color-foreground)]">
                        {formatCurrency(costDisplay!)}
                      </span>
                    </div>
                    {ticket.invoiceRef && (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-[var(--color-muted-foreground)]">Invoice Ref</span>
                        <span className="font-medium">{ticket.invoiceRef}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-[var(--color-border)] bg-transparent p-6 text-center">
                    <Receipt className="mx-auto h-8 w-8 text-[var(--color-muted-foreground)] mb-2 opacity-50" />
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      No cost estimate recorded
                    </p>
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => onEdit(ticket)}
                      >
                        Add estimate
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Activity tab */}
            <TabsContent value="activity" className="mt-4">
              <div className="space-y-3">
                {ticket.resolvedAt && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                      <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-foreground)]">Resolved</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {formatDate(ticket.resolvedAt)}
                      </p>
                    </div>
                  </div>
                )}
                {ticket.status === "closed" && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-500/10">
                      <XCircle className="h-3.5 w-3.5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-foreground)]">Closed</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {formatDate(ticket.updatedAt)}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-500/10">
                    <Wrench className="h-3.5 w-3.5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-foreground)]">Created</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {formatDate(ticket.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <ConfirmationDialog dialog={confirmDialog} />
    </>
  );
}
