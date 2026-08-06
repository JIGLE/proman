"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, AlertCircle, Clock, CheckCircle, XCircle, MoreVertical, User } from "lucide-react";
import { SortableHeader } from "@/components/ui/sortable-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { OperationsKpiRow } from "./operations-kpi-row";
import { OperationsCalendar } from "./operations-calendar";
import { OperationsEvidence } from "./operations-evidence";
import { ContactsView } from "@/components/features/contacts/contacts-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { ListChecks, CalendarDays, Wrench as WrenchIcon, Camera } from "lucide-react";

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

  // Operations subtabs (Task Queue / Calendar / Contractors / Evidence)
  const [activeTab, setActiveTab] = useTabPersistence("operations", "queue");
  const openTicketDetail = useCallback((ticket: MaintenanceTicket) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
  }, []);
  const handleToggleEvidenceRequired = useCallback(
    async (ticket: MaintenanceTicket, required: boolean) => {
      await updateMaintenance(ticket.id, { evidenceRequired: required });
    },
    [updateMaintenance],
  );

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

  // A clear low->urgent escalation ramp: info, neutral, warning, error —
  // medium and high previously shared the same warning color and were
  // indistinguishable in a ticket list at a glance.
  const getPriorityColor = (priority: MaintenancePriority) => {
    switch (priority) {
      case "low":
        return "bg-[var(--color-info-muted)] text-[var(--color-info)] border-[var(--color-info)]/20";
      case "medium":
        return "bg-[var(--color-secondary)] text-[var(--color-muted-foreground)] border-[var(--color-border)]";
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
          <PageHeader
            title="Operations"
            description="Work orders, inspections, and contractor management"
          >
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

          {/* One merged stat row (CLAUDE.md declutter rule 2) — Open / Urgent /
              Scheduled inspections / Evidence required. */}
          {maintenance.length > 0 && <OperationsKpiRow tickets={maintenance} />}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="overflow-x-auto">
              <TabsTrigger value="queue" className="flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" />
                Task Queue
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="contractors" className="flex items-center gap-1.5">
                <WrenchIcon className="h-3.5 w-3.5" />
                Contractors
              </TabsTrigger>
              <TabsTrigger value="evidence" className="flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" />
                Evidence
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-0">
              <OperationsCalendar tickets={maintenance} onTicketClick={openTicketDetail} />
            </TabsContent>

            <TabsContent value="contractors" className="mt-0">
              <ContactsView />
            </TabsContent>

            <TabsContent value="evidence" className="mt-0">
              <OperationsEvidence
                tickets={maintenance}
                onToggleRequired={handleToggleEvidenceRequired}
                onTicketClick={openTicketDetail}
              />
            </TabsContent>

            <TabsContent value="queue" className="mt-0 space-y-6">
              {/* Search, filters and the result count share one utility row. The count used to
                  sit in a band of its own between the filters and the list — a third strip of
                  chrome to say a number that belongs beside the control that changes it. */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <SearchFilter
                  className="flex-1"
                  searchPlaceholder="Search by title, description, or assignee..."
                  onSearchChange={setSearchQuery}
                  onFilterChange={(key, value) => {
                    if (key === "status") setStatusFilter(value);
                    if (key === "priority") setPriorityFilter(value);
                    if (key === "category") setCategoryFilter(value);
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
                    {
                      key: "category",
                      label: "Category",
                      options: [
                        { label: "All Categories", value: "all" },
                        ...MAINTENANCE_CATEGORIES.map((cat) => ({
                          label: cat.charAt(0).toUpperCase() + cat.slice(1),
                          value: cat,
                        })),
                      ],
                      defaultValue: "all",
                    },
                  ]}
                />

                {/* Count matches what the list below actually shows (any status, per the Status
                    filter) — "Est. cost" stays scoped to open/in-progress work, so its label
                    says so explicitly. */}
                {filteredTickets.length > 0 && (
                  <p className="shrink-0 text-sm text-[var(--color-muted-foreground)]">
                    <span className="font-medium text-[var(--color-foreground)]">
                      {filteredTickets.length}
                    </span>{" "}
                    ticket{filteredTickets.length !== 1 ? "s" : ""}
                    {costSummary.withCost > 0 && (
                      <>
                        {" · "}
                        Est. cost (open):{" "}
                        <span className="font-medium text-[var(--color-foreground)]">
                          {formatCurrency(costSummary.total)}
                        </span>
                        {costSummary.withCost < costSummary.count && (
                          <span className="ml-1 text-xs">
                            ({costSummary.count - costSummary.withCost} without estimate)
                          </span>
                        )}
                      </>
                    )}
                  </p>
                )}
              </div>

              {filteredTickets.length === 0 ? (
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
                        <TableHead className="text-[var(--color-muted-foreground)]">
                          Vendor
                        </TableHead>
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
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  aria-label="Ticket options"
                                >
                                  <MoreVertical className="w-4 h-4" aria-hidden="true" />
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
              )}
            </TabsContent>
          </Tabs>
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
