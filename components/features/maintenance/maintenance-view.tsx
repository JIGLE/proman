"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  User,
  AlertTriangle,
} from "lucide-react";
import { SortableHeader } from "@/components/ui/sortable-header";
import { DataViewToggle, DataViewMode } from "@/components/ui/data-view-toggle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { useCurrency } from "@/lib/contexts/currency-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyStateIllustration } from "@/components/ui/empty-state-illustrations";
import { SearchFilter } from "@/components/ui/search-filter";
import { ExportButton } from "@/components/ui/export-button";
import { useApp } from "@/lib/contexts/app-context";
import {
  maintenanceSchema,
  type MaintenanceFormData,
  MAINTENANCE_CATEGORIES,
} from "@/lib/schemas/maintenance.schema";
import { MaintenanceTicket } from "@/lib/types";
import { useToast } from "@/lib/contexts/toast-context";
import { useFormDialog } from "@/lib/hooks/use-form-dialog";
import { useSortableData } from "@/lib/hooks/use-sortable-data";
import { cn } from "@/lib/utils/utils";
import { MaintenanceStatus, MaintenancePriority } from "@/lib/types";
import { useConfirmDialog } from "@/lib/hooks/use-confirm-dialog";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { TicketDetailModal } from "./ticket-detail-modal";

export function MaintenanceView(): React.ReactElement {
  const { state, addMaintenance, updateMaintenance, deleteMaintenance } = useApp();
  const { properties, maintenance, loading } = state;
  const { success, error } = useToast();
  const { formatCurrency, currencySymbol } = useCurrency();
  const confirmDialog = useConfirmDialog();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Detail modal state
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Data view mode state with localStorage persistence
  const [dataViewMode, setDataViewMode] = useState<DataViewMode>("grid");
  useEffect(() => {
    const saved = localStorage.getItem("proman-maintenance-view-mode");
    if (saved === "grid" || saved === "table") setDataViewMode(saved);
  }, []);
  const handleViewModeChange = useCallback((mode: DataViewMode) => {
    setDataViewMode(mode);
    localStorage.setItem("proman-maintenance-view-mode", mode);
  }, []);

  const initialFormData: MaintenanceFormData = {
    propertyId: "",
    tenantId: undefined,
    title: "",
    description: "",
    status: "open",
    priority: "medium",
    category: undefined,
    estimatedCost: undefined,
    scheduledDate: undefined,
    dueDate: undefined,
    vendorName: undefined,
    vendorPhone: undefined,
    invoiceRef: undefined,
    isTenantReport: false,
    cost: undefined,
    assignedTo: undefined,
  };

  const dialog = useFormDialog<MaintenanceFormData, MaintenanceTicket>({
    schema: maintenanceSchema,
    initialData: initialFormData,
    onSubmit: async (data, isEdit) => {
      if (isEdit && dialog.editingItem) {
        await updateMaintenance(dialog.editingItem.id, data);
        success("Maintenance ticket updated successfully");
      } else {
        await addMaintenance(data);
        success("Maintenance ticket created successfully");
      }
    },
    onError: (errorMessage) => {
      error(errorMessage);
    },
    validation: { validateOnChange: true, debounceValidation: 300 },
  });

  // Filter and search maintenance tickets
  const filteredTickets = useMemo(() => {
    return maintenance.filter((ticket) => {
      // Search filter (title, description, assignedTo)
      const matchesSearch =
        searchQuery.length === 0 ||
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ticket.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ticket.vendorName || ticket.assignedTo || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;

      // Priority filter
      const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;

      // Category filter
      const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [maintenance, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  // Sorting
  const {
    sortedData: sortedTickets,
    requestSort,
    getSortDirection,
  } = useSortableData(filteredTickets);

  // Cost summary for open/in-progress filtered tickets
  const costSummary = useMemo(() => {
    const open = filteredTickets.filter((t) => t.status === "open" || t.status === "in_progress");
    const total = open.reduce((sum, t) => sum + (t.estimatedCost ?? t.cost ?? 0), 0);
    const withCost = open.filter((t) => (t.estimatedCost ?? t.cost) != null).length;
    return { total, count: open.length, withCost };
  }, [filteredTickets]);

  const statusCounts = useMemo(
    () => ({
      open: maintenance.filter((t) => t.status === "open").length,
      inProgress: maintenance.filter((t) => t.status === "in_progress").length,
      resolved: maintenance.filter((t) => t.status === "resolved").length,
      urgent: maintenance.filter((t) => t.priority === "urgent").length,
    }),
    [maintenance],
  );

  const handleEdit = (ticket: MaintenanceTicket) => {
    dialog.openEditDialog(ticket, (t) => ({
      propertyId: t.propertyId,
      tenantId: t.tenantId,
      title: t.title,
      description: t.description || "",
      status: t.status,
      priority: t.priority,
      category: t.category as MaintenanceFormData["category"],
      estimatedCost: t.estimatedCost ?? t.cost,
      scheduledDate: t.scheduledDate,
      dueDate: t.dueDate,
      vendorName: t.vendorName ?? t.assignedTo,
      vendorPhone: t.vendorPhone,
      invoiceRef: t.invoiceRef,
      isTenantReport: t.isTenantReport ?? false,
      cost: t.cost,
      assignedTo: t.assignedTo,
    }));
  };

  const handleDelete = useCallback(
    async (ticket: MaintenanceTicket) => {
      confirmDialog.confirm(
        {
          title: "Delete Ticket",
          description: `"${ticket.title}" will be permanently removed. This action cannot be undone.`,
          confirmLabel: "Delete",
          variant: "destructive",
        },
        async () => {
          await deleteMaintenance(ticket.id);
          success(`Ticket "${ticket.title}" deleted`);
        },
      );
    },
    [deleteMaintenance, success, confirmDialog],
  );

  const handleUpdateStatus = useCallback(
    async (ticket: MaintenanceTicket, newStatus: MaintenanceStatus) => {
      await updateMaintenance(ticket.id, { status: newStatus });
      success(`Ticket status updated to "${newStatus.replace("_", " ")}"`);
    },
    [updateMaintenance, success],
  );

  const getPriorityColor = (priority: MaintenancePriority) => {
    switch (priority) {
      case "low":
        return "bg-[var(--color-info-muted)] text-[var(--color-info)] border-[var(--color-info)]/20";
      case "medium":
        return "bg-[var(--color-warning-muted)] text-[var(--color-warning)] border-[var(--color-warning)]/20";
      case "high":
        return "bg-[var(--color-warning-muted)] text-[var(--color-warning)] border-[var(--color-warning)]/20";
      case "urgent":
        return "bg-[var(--color-error-muted)] text-[var(--color-error)] border-[var(--color-error)]/20";
      default:
        return "bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]";
    }
  };

  const getStatusIcon = (status: MaintenanceStatus) => {
    switch (status) {
      case "open":
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "resolved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "closed":
        return <XCircle className="w-4 h-4 text-[var(--color-muted-foreground)]" />;
    }
  };

  return (
    <>
      {loading ? (
        <LoadingState variant="cards" count={6} />
      ) : (
        <div className="space-y-6">
          <PageHeader title="Maintenance" description="Manage work orders and repairs">
            <ExportButton
              data={sortedTickets}
              filename="maintenance"
              columns={[
                { key: "title", label: "Title" },
                { key: "description", label: "Description" },
                {
                  key: "propertyId",
                  label: "Property",
                  format: (value) => properties.find((p) => p.id === value)?.name || "Unknown",
                },
                { key: "status", label: "Status" },
                { key: "priority", label: "Priority" },
                {
                  key: "cost",
                  label: "Cost",
                  format: (value) => (value ? formatCurrency(value as number) : "Not set"),
                },
                { key: "vendorName", label: "Vendor", format: (value) => (value as string) || "—" },
              ]}
            />
            <Dialog open={dialog.isOpen} onOpenChange={(open) => !open && dialog.closeDialog()}>
              <DialogTrigger asChild>
                <Button onClick={dialog.openDialog} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  New Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {dialog.editingItem ? "Edit Maintenance Ticket" : "Create Maintenance Ticket"}
                  </DialogTitle>
                  <DialogDescription>Submit a new maintenance request</DialogDescription>
                </DialogHeader>
                <form onSubmit={dialog.handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={dialog.formData.title}
                      onChange={(e) => dialog.updateFormData({ title: e.target.value })}
                      className={dialog.formErrors.title ? "border-red-500" : ""}
                      placeholder="e.g. Leaking faucet"
                    />
                    {dialog.formErrors.title && (
                      <p className="text-sm text-destructive">{dialog.formErrors.title}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="property">Property</Label>
                      <Select
                        value={dialog.formData.propertyId}
                        onValueChange={(val) => dialog.updateFormData({ propertyId: val })}
                      >
                        <SelectTrigger
                          id="property"
                          className={dialog.formErrors.propertyId ? "border-red-500" : ""}
                        >
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {dialog.formErrors.propertyId && (
                        <p className="text-sm text-destructive">{dialog.formErrors.propertyId}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={dialog.formData.priority}
                        onValueChange={(val) =>
                          dialog.updateFormData({
                            priority: val as MaintenancePriority,
                          })
                        }
                      >
                        <SelectTrigger id="priority">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={dialog.formData.category ?? ""}
                      onValueChange={(val) =>
                        dialog.updateFormData({
                          category: (val as MaintenanceFormData["category"]) || undefined,
                        })
                      }
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {MAINTENANCE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={dialog.formData.description}
                      onChange={(e) => dialog.updateFormData({ description: e.target.value })}
                      className={dialog.formErrors.description ? "border-red-500" : ""}
                      placeholder="Detailed description of the issue..."
                      rows={4}
                    />
                    {dialog.formErrors.description && (
                      <p className="text-sm text-destructive">{dialog.formErrors.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vendorName">Vendor / Contractor</Label>
                      <Input
                        id="vendorName"
                        value={dialog.formData.vendorName || ""}
                        onChange={(e) =>
                          dialog.updateFormData({ vendorName: e.target.value || undefined })
                        }
                        placeholder="Contractor or staff name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vendorPhone">Vendor Phone</Label>
                      <Input
                        id="vendorPhone"
                        value={dialog.formData.vendorPhone || ""}
                        onChange={(e) =>
                          dialog.updateFormData({ vendorPhone: e.target.value || undefined })
                        }
                        placeholder="+351 912 345 678"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estimatedCost">Estimated Cost ({currencySymbol})</Label>
                      <Input
                        id="estimatedCost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={dialog.formData.estimatedCost ?? ""}
                        onChange={(e) =>
                          dialog.updateFormData({
                            estimatedCost: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoiceRef">Invoice Ref</Label>
                      <Input
                        id="invoiceRef"
                        value={dialog.formData.invoiceRef || ""}
                        onChange={(e) =>
                          dialog.updateFormData({ invoiceRef: e.target.value || undefined })
                        }
                        placeholder="INV-0001"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheduledDate">Scheduled Date</Label>
                      <Input
                        id="scheduledDate"
                        type="date"
                        value={dialog.formData.scheduledDate || ""}
                        onChange={(e) =>
                          dialog.updateFormData({ scheduledDate: e.target.value || undefined })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={dialog.formData.dueDate || ""}
                        onChange={(e) =>
                          dialog.updateFormData({ dueDate: e.target.value || undefined })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={dialog.closeDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" loading={dialog.isSubmitting}>
                      {dialog.editingItem ? "Update Ticket" : "Create Ticket"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </PageHeader>

          {/* Status strip */}
          {maintenance.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-[var(--color-info)]" />
                <div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">Open</p>
                  <p className="text-lg font-semibold text-[var(--color-foreground)]">
                    {statusCounts.open}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
                <Clock className="h-4 w-4 shrink-0 text-[var(--color-warning)]" />
                <div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">In Progress</p>
                  <p className="text-lg font-semibold text-[var(--color-foreground)]">
                    {statusCounts.inProgress}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
                <CheckCircle className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
                <div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">Resolved</p>
                  <p className="text-lg font-semibold text-[var(--color-foreground)]">
                    {statusCounts.resolved}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-[var(--color-destructive)]/20 bg-[var(--color-error-muted)] px-4 py-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-destructive)]" />
                <div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">Urgent</p>
                  <p className="text-lg font-semibold text-[var(--color-destructive)]">
                    {statusCounts.urgent}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter */}
          <SearchFilter
            searchPlaceholder="Search by title, description, or assignee..."
            onSearchChange={setSearchQuery}
            onFilterChange={(key, value) => {
              if (key === "status") setStatusFilter(value);
              if (key === "priority") setPriorityFilter(value);
            }}
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { label: "All Statuses", value: "all" },
                  { label: "Open", value: "open" },
                  { label: "In Progress", value: "in_progress" },
                  { label: "Resolved", value: "resolved" },
                  { label: "Closed", value: "closed" },
                ],
                defaultValue: "all",
              },
              {
                key: "priority",
                label: "Priority",
                options: [
                  { label: "All Priorities", value: "all" },
                  { label: "Low", value: "low" },
                  { label: "Medium", value: "medium" },
                  { label: "High", value: "high" },
                  { label: "Urgent", value: "urgent" },
                ],
                defaultValue: "all",
              },
            ]}
          />

          {/* Category filter chip strip */}
          <div className="flex items-center gap-2 flex-wrap">
            {["all", ...MAINTENANCE_CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                  categoryFilter === cat
                    ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                    : "border-[var(--color-border)] bg-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-foreground)]/50",
                )}
              >
                {cat === "all" ? "All categories" : cat}
              </button>
            ))}
          </div>

          {/* Cost summary bar */}
          {costSummary.count > 0 && (
            <div className="flex items-center gap-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-2.5 text-sm">
              <span className="text-[var(--color-muted-foreground)]">
                <span className="font-medium text-[var(--color-foreground)]">
                  {costSummary.count}
                </span>{" "}
                open ticket
                {costSummary.count !== 1 ? "s" : ""}
              </span>
              {costSummary.withCost > 0 && (
                <>
                  <span className="text-[var(--color-border)]">|</span>
                  <span className="text-[var(--color-muted-foreground)]">
                    Est. cost:{" "}
                    <span className="font-medium text-[var(--color-foreground)]">
                      {formatCurrency(costSummary.total)}
                    </span>
                  </span>
                  {costSummary.withCost < costSummary.count && (
                    <span className="text-[var(--color-muted-foreground)] text-xs">
                      ({costSummary.count - costSummary.withCost} without estimate)
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex items-center justify-end">
            <DataViewToggle mode={dataViewMode} onChange={handleViewModeChange} />
          </div>

          {dataViewMode === "table" ? (
            /* Table View */
            filteredTickets.length === 0 ? (
              <EmptyStateIllustration
                type={maintenance.length === 0 ? "maintenance" : "generic"}
                title={maintenance.length === 0 ? undefined : "No tickets found"}
                description={
                  maintenance.length === 0 ? undefined : "Try adjusting your search or filters"
                }
                onAction={maintenance.length === 0 ? dialog.openDialog : undefined}
              />
            ) : (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[var(--color-border)] hover:bg-transparent">
                      <TableHead className="text-[var(--color-muted-foreground)]">
                        <SortableHeader
                          sortKey="title"
                          label="Title"
                          currentSort={getSortDirection("title")}
                          onSort={(key) => requestSort(key as keyof MaintenanceTicket)}
                        />
                      </TableHead>
                      <TableHead className="text-[var(--color-muted-foreground)]">
                        Property
                      </TableHead>
                      <TableHead className="text-[var(--color-muted-foreground)]">
                        <SortableHeader
                          sortKey="priority"
                          label="Priority"
                          currentSort={getSortDirection("priority")}
                          onSort={(key) => requestSort(key as keyof MaintenanceTicket)}
                        />
                      </TableHead>
                      <TableHead className="text-[var(--color-muted-foreground)]">
                        <SortableHeader
                          sortKey="status"
                          label="Status"
                          currentSort={getSortDirection("status")}
                          onSort={(key) => requestSort(key as keyof MaintenanceTicket)}
                        />
                      </TableHead>
                      <TableHead className="text-[var(--color-muted-foreground)]">
                        Created
                      </TableHead>
                      <TableHead className="text-[var(--color-muted-foreground)]">Vendor</TableHead>
                      <TableHead className="text-[var(--color-muted-foreground)]">
                        Scheduled
                      </TableHead>
                      <TableHead className="text-[var(--color-muted-foreground)] w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTickets.map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        className="border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] cursor-pointer"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setIsDetailOpen(true);
                        }}
                      >
                        <TableCell className="text-sm font-medium text-[var(--color-foreground)]">
                          {ticket.title}
                        </TableCell>
                        <TableCell className="text-sm text-[var(--color-muted-foreground)]">
                          {ticket.propertyName || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("capitalize", getPriorityColor(ticket.priority))}
                          >
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                            {getStatusIcon(ticket.status)}
                            <span className="capitalize">{ticket.status.replace("_", " ")}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-[var(--color-muted-foreground)]">
                          <div className="flex items-center gap-1">
                            {ticket.isTenantReport && (
                              <User className="h-3.5 w-3.5 text-blue-400" />
                            )}
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-[var(--color-muted-foreground)]">
                          {ticket.vendorName || ticket.assignedTo || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-[var(--color-muted-foreground)]">
                          {ticket.scheduledDate
                            ? new Date(ticket.scheduledDate).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="">
                              <DropdownMenuItem
                                className="focus:bg-[var(--color-surface-hover)] cursor-pointer"
                                onClick={() => handleEdit(ticket)}
                              >
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="focus:bg-[var(--color-surface-hover)] cursor-pointer p-0"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Select
                                  value={ticket.status}
                                  onValueChange={(value) =>
                                    handleUpdateStatus(ticket, value as MaintenanceStatus)
                                  }
                                >
                                  <SelectTrigger className="border-0 bg-transparent h-auto px-2 py-1.5 text-[var(--color-foreground)] shadow-none focus:ring-0">
                                    <SelectValue placeholder="Update Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[var(--color-destructive)] focus:bg-[var(--color-surface-hover)] cursor-pointer"
                                onClick={() => handleDelete(ticket)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : (
            <>
              {/* Sortable Column Headers */}
              {filteredTickets.length > 0 && (
                <div className="flex items-center gap-4 px-4 py-2 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                  <div className="flex-1">
                    <SortableHeader
                      sortKey="title"
                      label="Title"
                      currentSort={getSortDirection("title")}
                      onSort={(key) => requestSort(key as keyof MaintenanceTicket)}
                    />
                  </div>
                  <div className="w-32">
                    <SortableHeader
                      sortKey="priority"
                      label="Priority"
                      currentSort={getSortDirection("priority")}
                      onSort={(key) => requestSort(key as keyof MaintenanceTicket)}
                    />
                  </div>
                  <div className="w-32">
                    <SortableHeader
                      sortKey="status"
                      label="Status"
                      currentSort={getSortDirection("status")}
                      onSort={(key) => requestSort(key as keyof MaintenanceTicket)}
                    />
                  </div>
                  <div className="w-32">
                    <SortableHeader
                      sortKey="cost"
                      label="Cost"
                      currentSort={getSortDirection("cost")}
                      onSort={(key) => requestSort(key as keyof MaintenanceTicket)}
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTickets.length === 0 ? (
                  <div className="col-span-full">
                    <EmptyStateIllustration
                      type={maintenance.length === 0 ? "maintenance" : "generic"}
                      title={maintenance.length === 0 ? undefined : "No tickets found"}
                      description={
                        maintenance.length === 0
                          ? undefined
                          : "Try adjusting your search or filters"
                      }
                      onAction={maintenance.length === 0 ? dialog.openDialog : undefined}
                    />
                  </div>
                ) : (
                  sortedTickets.map((ticket) => (
                    <Card
                      key={ticket.id}
                      className="cursor-pointer hover:border-[var(--color-foreground)]/30 transition-colors"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setIsDetailOpen(true);
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <Badge
                            variant="outline"
                            className={cn("capitalize mb-2", getPriorityColor(ticket.priority))}
                          >
                            {ticket.priority} Priority
                          </Badge>
                          {ticket.isTenantReport && (
                            <Badge
                              variant="outline"
                              className="mb-2 ml-1 bg-blue-500/10 text-blue-400 border-blue-500/30"
                            >
                              <User className="h-3 w-3 mr-1" />
                              Tenant
                            </Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="">
                              <DropdownMenuItem
                                className="focus:bg-[var(--color-surface-hover)] cursor-pointer"
                                onClick={() => handleEdit(ticket)}
                              >
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="focus:bg-[var(--color-surface-hover)] cursor-pointer p-0"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Select
                                  value={ticket.status}
                                  onValueChange={(value) =>
                                    handleUpdateStatus(ticket, value as MaintenanceStatus)
                                  }
                                >
                                  <SelectTrigger className="border-0 bg-transparent h-auto px-2 py-1.5 text-[var(--color-foreground)] shadow-none focus:ring-0">
                                    <SelectValue placeholder="Update Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[var(--color-destructive)] focus:bg-[var(--color-surface-hover)] cursor-pointer"
                                onClick={() => handleDelete(ticket)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardTitle className="text-lg font-semibold text-[var(--color-foreground)] line-clamp-1">
                          {ticket.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-1">
                          {ticket.propertyName ? ticket.propertyName : "Unknown Property"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <p className="text-sm text-[var(--color-muted-foreground)] line-clamp-3 mb-4">
                          {ticket.description}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
                            {getStatusIcon(ticket.status)}
                            <span className="capitalize">{ticket.status.replace("_", " ")}</span>
                          </div>
                          {(ticket.estimatedCost ?? ticket.cost) != null && (
                            <span className="font-medium text-[var(--color-foreground)]">
                              {formatCurrency((ticket.estimatedCost ?? ticket.cost)!)}
                            </span>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)] flex justify-between">
                        <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        {(ticket.vendorName || ticket.assignedTo) && (
                          <span>Vendor: {ticket.vendorName || ticket.assignedTo}</span>
                        )}
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={(ticket) => {
          setIsDetailOpen(false);
          handleEdit(ticket);
        }}
        onDelete={() => setIsDetailOpen(false)}
      />
      <ConfirmationDialog dialog={confirmDialog} />
    </>
  );
}
