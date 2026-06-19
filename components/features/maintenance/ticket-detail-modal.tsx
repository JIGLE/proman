"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Camera,
  CheckCircle,
  Edit,
  Loader2,
  Phone,
  Plus,
  Receipt,
  Trash2,
  User,
  Wrench,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  open: "bg-[var(--color-warning-muted)] text-[var(--color-warning)] border-[var(--color-warning)]/30",
  in_progress:
    "bg-[var(--color-info-muted)] text-[var(--color-info)] border-[var(--color-info)]/30",
  resolved:
    "bg-[var(--color-success-muted)] text-[var(--color-success)] border-[var(--color-success)]/30",
  closed: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-500/10 text-zinc-400",
  medium: "bg-[var(--color-warning-muted)] text-[var(--color-warning)]",
  high: "bg-[var(--color-warning-muted)] text-[var(--color-warning)]",
  urgent: "bg-[var(--color-error-muted)] text-[var(--color-destructive)]",
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
  const { updateMaintenance, deleteMaintenance, addExpense } = useApp();
  const { success, error } = useToast();
  const { formatCurrency } = useCurrency();
  const confirmDialog = useConfirmDialog();
  const [activeTab, setActiveTab] = useState("overview");
  const [images, setImages] = useState<string[]>(ticket?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync images when a different ticket is shown
  useEffect(() => {
    setImages(ticket?.images ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id]);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !ticket) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/maintenance/${ticket.id}/images`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "Upload failed");
        }
        const data = (await res.json()) as { images: string[] };
        setImages(data.images);
        await updateMaintenance(ticket.id, { images: data.images });
        success("Photo uploaded");
      } catch (err) {
        error(err instanceof Error ? err.message : "Failed to upload photo");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [ticket, updateMaintenance, success, error],
  );

  const handleImageDelete = useCallback(
    async (imageUrl: string) => {
      if (!ticket) return;
      const filename = imageUrl.split("/").pop();
      if (!filename) return;
      try {
        const res = await fetch(`/api/maintenance/${ticket.id}/images/${filename}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Delete failed");
        const data = (await res.json()) as { images: string[] };
        setImages(data.images);
        await updateMaintenance(ticket.id, { images: data.images });
        success("Photo removed");
      } catch {
        error("Failed to remove photo");
      }
    },
    [ticket, updateMaintenance, success, error],
  );

  if (!ticket) return null;

  // ── Zone 1: Status + Health ──────────────────────────────────────────────────
  const isOverdue =
    ticket.dueDate &&
    new Date(ticket.dueDate) < new Date() &&
    ticket.status !== "resolved" &&
    ticket.status !== "closed";
  const hasVendor = !!(ticket.vendorName || ticket.assignedTo);
  const hasCost = !!(ticket.estimatedCost ?? ticket.cost ?? ticket.actualCost);

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
            // Auto-create expense if a cost is recorded
            const resolvedCost = ticket.actualCost ?? ticket.estimatedCost ?? ticket.cost;
            if (resolvedCost && resolvedCost > 0) {
              await addExpense({
                propertyId: ticket.propertyId,
                amount: resolvedCost,
                date: new Date().toISOString(),
                category: "Maintenance",
                description: ticket.title,
              });
            }
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
      color: "text-[var(--color-destructive)]",
      label: `Overdue — due ${formatDate(ticket.dueDate)}`,
    });
  }
  if (!hasVendor && ticket.status !== "resolved" && ticket.status !== "closed") {
    issues.push({
      id: "no-vendor",
      icon: Wrench,
      color: "text-[var(--color-warning)]",
      label: "No vendor assigned",
    });
  }
  if (ticket.isTenantReport) {
    issues.push({
      id: "tenant-report",
      icon: User,
      color: "text-[var(--color-info)]",
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
  const estimatedCostDisplay = ticket.estimatedCost ?? ticket.cost;
  const actualCostDisplay = ticket.actualCost;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-warning-muted)]">
                  <Wrench className="h-5 w-5 text-[var(--color-warning)]" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="truncate text-base font-semibold">
                    {ticket.title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Maintenance ticket: {ticket.title}. Status: {ticket.status}.
                  </DialogDescription>
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
                  className="h-7 w-7 p-0 text-[var(--color-destructive)] hover:text-[var(--color-destructive)]/70"
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
              <TabsTrigger value="images">
                Photos{images.length > 0 && ` (${images.length})`}
              </TabsTrigger>
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
                      className={`h-4 w-4 ${isOverdue ? "text-[var(--color-destructive)]" : "text-[var(--color-muted-foreground)]"}`}
                    />
                    <div>
                      <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wide">
                        Due
                      </p>
                      <p
                        className={`font-medium ${isOverdue ? "text-[var(--color-destructive)]" : ""}`}
                      >
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
                  <>
                    {estimatedCostDisplay != null && (
                      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-accent-primary" />
                            <span className="text-sm text-[var(--color-muted-foreground)]">
                              Estimated Cost
                            </span>
                          </div>
                          <span className="text-lg font-semibold text-[var(--color-foreground)]">
                            {formatCurrency(estimatedCostDisplay)}
                          </span>
                        </div>
                      </div>
                    )}
                    {actualCostDisplay != null && (
                      <div className="rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success-muted)] p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                            <span className="text-sm text-[var(--color-muted-foreground)]">
                              Actual Cost
                            </span>
                          </div>
                          <span className="text-lg font-semibold text-[var(--color-success)]">
                            {formatCurrency(actualCostDisplay)}
                          </span>
                        </div>
                      </div>
                    )}
                    {ticket.invoiceRef && (
                      <div className="flex items-center justify-between p-3 text-sm">
                        <span className="text-[var(--color-muted-foreground)]">Invoice Ref</span>
                        <span className="font-medium">{ticket.invoiceRef}</span>
                      </div>
                    )}
                  </>
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

            {/* Photos tab */}
            <TabsContent value="images" className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {images.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--color-border)] p-8 text-center">
                  <Camera className="mx-auto h-8 w-8 text-[var(--color-muted-foreground)] mb-2 opacity-40" />
                  <p className="text-sm text-[var(--color-muted-foreground)] mb-3">
                    No photos attached yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Add photo
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {images.map((url) => (
                      <div
                        key={url}
                        className="group relative aspect-square overflow-hidden rounded-md border border-[var(--color-border)]"
                      >
                        <img
                          src={url}
                          alt="Maintenance photo"
                          className="h-full w-full object-cover"
                        />
                        <button
                          onClick={() => handleImageDelete(url)}
                          className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                          aria-label="Remove photo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-[var(--color-border)] p-2 text-sm text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        Add photo
                      </>
                    )}
                  </button>
                </div>
              )}
            </TabsContent>

            {/* Activity tab */}
            <TabsContent value="activity" className="mt-4">
              <div className="space-y-3">
                {ticket.resolvedAt && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-success-muted)]">
                      <CheckCircle className="h-3.5 w-3.5 text-[var(--color-success)]" />
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
