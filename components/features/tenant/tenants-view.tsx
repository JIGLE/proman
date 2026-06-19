"use client";

import React, { useMemo, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Mail, Plus, MoreHorizontal, Trash2, Edit, Eye, ChevronDown } from "lucide-react";
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
import { useCurrency } from "@/lib/contexts/currency-context";
import { cn } from "@/lib/utils/utils";
import { Badge } from "@/components/ui/badge";
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
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyStateIllustration } from "@/components/ui/empty-state-illustrations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchFilter } from "@/components/ui/search-filter";
import { BulkActionBar, getDefaultBulkActions } from "@/components/ui/bulk-action-bar";
import { TenantDetailModal } from "./tenant-detail-modal";

import { Checkbox } from "@/components/ui/checkbox";
import { useApp } from "@/lib/contexts/app-context";

import { Tenant } from "@/lib/types";
import { getActiveLease } from "@/lib/utils/lease-helpers";
import { tenantSchema, type TenantFormData } from "@/lib/schemas/tenant.schema";
import { useToast } from "@/lib/contexts/toast-context";
import { useFormDialog } from "@/lib/hooks/use-form-dialog";
import { useSortableData } from "@/lib/hooks/use-sortable-data";
import { useBulkSelection } from "@/lib/hooks/use-bulk-selection";
import { useConfirmDialog } from "@/lib/hooks/use-confirm-dialog";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { SwipeableListItem } from "@/components/ui/swipeable-list-item";

export type TenantsViewProps = { density?: "comfortable" | "compact" };

export type TenantsViewRef = {
  openDialog: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TenantForm({ dialog, properties }: { dialog: any; properties: Array<{ id: string; name: string }> }) {
  const [showMore, setShowMore] = useState(!dialog.editingItem ? false : true);
  const isEdit = !!dialog.editingItem;

  return (
    <form onSubmit={dialog.handleSubmit} className="space-y-4">
      {/* Required fields — always visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={dialog.formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              dialog.updateFormData({ name: e.target.value })
            }
            className={dialog.formErrors.name ? "border-red-500" : ""}
            required
          />
          {dialog.formErrors.name && (
            <p className="text-sm text-destructive">{dialog.formErrors.name}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={dialog.formData.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              dialog.updateFormData({ email: e.target.value })
            }
            className={dialog.formErrors.email ? "border-red-500" : ""}
            required
          />
          {dialog.formErrors.email && (
            <p className="text-sm text-destructive">{dialog.formErrors.email}</p>
          )}
        </div>
      </div>

      {/* Additional details — collapsible on create, always open on edit */}
      {!isEdit && (
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", showMore && "rotate-180")}
            aria-hidden="true"
          />
          {showMore ? "Hide" : "Add"} lease & contact details
        </button>
      )}

      {(showMore || isEdit) && (
        <div className="space-y-4 rounded-lg border border-[var(--color-border)] p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={dialog.formData.phone ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  dialog.updateFormData({ phone: e.target.value })
                }
                className={dialog.formErrors.phone ? "border-red-500" : ""}
              />
              {dialog.formErrors.phone && (
                <p className="text-sm text-destructive">{dialog.formErrors.phone}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="property">Property</Label>
              <Select
                value={dialog.formData.propertyId ?? ""}
                onValueChange={(value: string) => dialog.updateFormData({ propertyId: value })}
              >
                <SelectTrigger
                  className={dialog.formErrors.propertyId ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dialog.formErrors.propertyId && (
                <p className="text-sm text-destructive">{dialog.formErrors.propertyId}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rent">Monthly Rent</Label>
              <Input
                id="rent"
                type="number"
                min="0"
                value={dialog.formData.rent ?? 0}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  dialog.updateFormData({ rent: parseInt(e.target.value) || 0 })
                }
                className={dialog.formErrors.rent ? "border-red-500" : ""}
              />
              {dialog.formErrors.rent && (
                <p className="text-sm text-destructive">{dialog.formErrors.rent}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="leaseStart">Lease Start</Label>
              <Input
                id="leaseStart"
                type="date"
                value={dialog.formData.leaseStart ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  dialog.updateFormData({ leaseStart: e.target.value })
                }
                className={dialog.formErrors.leaseStart ? "border-red-500" : ""}
              />
              {dialog.formErrors.leaseStart && (
                <p className="text-sm text-destructive">{dialog.formErrors.leaseStart}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="leaseEnd">Lease End</Label>
              <Input
                id="leaseEnd"
                type="date"
                value={dialog.formData.leaseEnd ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  dialog.updateFormData({ leaseEnd: e.target.value })
                }
                className={dialog.formErrors.leaseEnd ? "border-red-500" : ""}
              />
              {dialog.formErrors.leaseEnd && (
                <p className="text-sm text-destructive">{dialog.formErrors.leaseEnd}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <Select
                value={dialog.formData.paymentStatus}
                onValueChange={(value: Tenant["paymentStatus"]) =>
                  dialog.updateFormData({ paymentStatus: value })
                }
              >
                <SelectTrigger
                  className={dialog.formErrors.paymentStatus ? "border-red-500" : ""}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              {dialog.formErrors.paymentStatus && (
                <p className="text-sm text-destructive">{dialog.formErrors.paymentStatus}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={dialog.formData.notes ?? ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                dialog.updateFormData({ notes: e.target.value })
              }
              rows={3}
              className={dialog.formErrors.notes ? "border-red-500" : ""}
            />
            {dialog.formErrors.notes && (
              <p className="text-sm text-destructive">{dialog.formErrors.notes}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={dialog.closeDialog}>
          Cancel
        </Button>
        <Button type="submit" loading={dialog.isSubmitting}>
          {dialog.editingItem ? "Update Tenant" : "Create Tenant"}
        </Button>
      </div>
    </form>
  );
}

export const TenantsView = forwardRef<TenantsViewRef, TenantsViewProps>(
  function TenantsView(_props, ref): React.ReactElement {
    const { state, addTenant, updateTenant, deleteTenant } = useApp();
    const { tenants, properties, loading } = state;
    const { leases } = state;
    const { success } = useToast();
    const { formatCurrency } = useCurrency();
    const confirmDialog = useConfirmDialog();
    const compact = true; // Always compact

    // Tenant detail modal state
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [propertyFilter, setPropertyFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>(() => {
      if (typeof window !== "undefined") {
        return localStorage.getItem("proman-tenants-status-filter") ?? "all";
      }
      return "all";
    });

    // Bulk selection
    const bulkSelection = useBulkSelection<Tenant>();

    // Data view mode state with localStorage persistence
    const [dataViewMode, setDataViewMode] = useState<DataViewMode>("grid");
    useEffect(() => {
      const saved = localStorage.getItem("proman-tenants-view-mode");
      if (saved === "grid" || saved === "table") setDataViewMode(saved);
    }, []);
    const handleViewModeChange = useCallback((mode: DataViewMode) => {
      setDataViewMode(mode);
      localStorage.setItem("proman-tenants-view-mode", mode);
    }, []);

    const initialFormData: TenantFormData = {
      name: "",
      email: "",
      phone: "",
      propertyId: "",
      rent: 0,
      leaseStart: "",
      leaseEnd: "",
      paymentStatus: "pending",
      notes: "",
    };

    const dialog = useFormDialog<TenantFormData, Tenant>({
      schema: tenantSchema,
      initialData: initialFormData,
      onSubmit: async (data, isEdit) => {
        if (isEdit && dialog.editingItem) {
          await updateTenant(dialog.editingItem.id, data);
        } else {
          await addTenant(data);
        }
      },
      successMessage: {
        create: "Tenant added successfully!",
        update: "Tenant updated successfully!",
      },
      validation: { validateOnChange: true, debounceValidation: 300 },
    });

    // Expose dialog methods to parent via ref
    useImperativeHandle(ref, () => ({
      openDialog: dialog.openDialog,
    }));

    const getPaymentStatusBadge = (status: Tenant["paymentStatus"]) => {
      switch (status) {
        case "paid":
          return <Badge variant="success">Paid</Badge>;
        case "overdue":
          return <Badge variant="destructive">Overdue</Badge>;
        case "pending":
          return <Badge variant="secondary">Pending</Badge>;
      }
    };

    // Bulk delete handler
    const handleBulkDelete = useCallback(
      async (ids: string[]) => {
        confirmDialog.confirm(
          {
            title: "Delete Tenants",
            description: `${ids.length} tenant(s) will be permanently removed. This action cannot be undone.`,
            confirmLabel: "Delete All",
            variant: "destructive",
            count: ids.length,
          },
          async () => {
            for (const id of ids) {
              await deleteTenant(id);
            }
            success(`Successfully deleted ${ids.length} tenant(s)`);
            bulkSelection.clearSelection();
          },
        );
      },
      [deleteTenant, success, bulkSelection, confirmDialog],
    );

    // Single delete handler
    const handleDelete = useCallback(
      async (tenant: Tenant) => {
        confirmDialog.confirm(
          {
            title: "Delete Tenant",
            description: `"${tenant.name}" will be permanently removed. This action cannot be undone.`,
            confirmLabel: "Delete",
            variant: "destructive",
          },
          async () => {
            await deleteTenant(tenant.id);
            success(`Tenant "${tenant.name}" deleted`);
          },
        );
      },
      [deleteTenant, success, confirmDialog],
    );

    // Export selected tenants
    const handleExportSelected = useCallback(
      (ids: string[]) => {
        const selectedTenants = tenants.filter((t) => ids.includes(t.id));
        const csvContent = [
          ["Name", "Email", "Phone", "Property", "Rent", "Status"].join(","),
          ...selectedTenants.map((t) =>
            [t.name, t.email, t.phone, t.propertyName || "", t.rent, t.paymentStatus].join(","),
          ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tenants-export-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      [tenants],
    );

    // Bulk actions configuration
    const bulkActions = useMemo(
      () =>
        getDefaultBulkActions({
          onDelete: handleBulkDelete,
          onExport: handleExportSelected,
        }),
      [handleBulkDelete, handleExportSelected],
    );

    // Filter and search tenants
    const filteredTenants = useMemo(() => {
      return tenants.filter((tenant) => {
        const matchesSearch =
          searchQuery.length === 0 ||
          tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tenant.phone.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesProperty = propertyFilter === "all" || tenant.propertyId === propertyFilter;

        // Handle both active/inactive and payment status filters
        let matchesStatus = true;
        if (statusFilter === "active") {
          // Active tenants have a property assigned
          matchesStatus = !!tenant.propertyId;
        } else if (statusFilter === "inactive") {
          // Inactive tenants don't have a property assigned
          matchesStatus = !tenant.propertyId;
        } else if (statusFilter !== "all") {
          // Payment status filters (paid, pending, overdue)
          matchesStatus = tenant.paymentStatus === statusFilter;
        }

        return matchesSearch && matchesProperty && matchesStatus;
      });
    }, [tenants, searchQuery, propertyFilter, statusFilter]);

    // Sorting
    const {
      sortedData: sortedTenants,
      requestSort,
      getSortDirection,
    } = useSortableData(filteredTenants);

    return (
      <>
        {loading ? (
          <LoadingState variant="cards" count={6} />
        ) : (
          <div className="space-y-6">
            <PageHeader title="Tenants" description="Manage your tenants and their information" />
            <Dialog open={dialog.isOpen} onOpenChange={(open) => !open && dialog.closeDialog()}>
              <DialogTrigger asChild>
                <Button onClick={dialog.openDialog} className="hidden">
                  <Plus className="w-4 h-4" />
                  Add Tenant
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-[var(--color-foreground)]">
                    {dialog.editingItem ? "Edit Tenant" : "Add New Tenant"}
                  </DialogTitle>
                  <DialogDescription>
                    {dialog.editingItem ? "Update tenant information" : "Enter tenant details"}
                  </DialogDescription>
                </DialogHeader>
                <TenantForm dialog={dialog} properties={properties} />
              </DialogContent>
            </Dialog>

            <SearchFilter
              searchPlaceholder="Search tenants..."
              onSearchChange={setSearchQuery}
              onFilterChange={(key, value) => {
                if (key === "property") setPropertyFilter(value);
                if (key === "status") {
                  setStatusFilter(value);
                  localStorage.setItem("proman-tenants-status-filter", value);
                }
              }}
              filters={[
                {
                  key: "property",
                  label: "Property",
                  options: [
                    { label: "All Properties", value: "all" },
                    ...properties.map((property) => ({
                      label: property.name,
                      value: property.id,
                    })),
                  ],
                  defaultValue: "all",
                },
                {
                  key: "status",
                  label: "Status",
                  options: [
                    { label: "All", value: "all" },
                    { label: "Active", value: "active" },
                    { label: "Inactive", value: "inactive" },
                    { label: "Paid", value: "paid" },
                    { label: "Pending", value: "pending" },
                    { label: "Overdue", value: "overdue" },
                  ],
                  defaultValue: "all",
                },
              ]}
            />

            <div className="flex items-center justify-end">
              <DataViewToggle mode={dataViewMode} onChange={handleViewModeChange} />
            </div>

            {dataViewMode === "table" ? (
              /* Table View */
              filteredTenants.length === 0 ? (
                <EmptyStateIllustration
                  type="tenants"
                  onAction={dialog.openDialog}
                  compact={compact}
                />
              ) : (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="text-zinc-400">
                          <SortableHeader
                            sortKey="name"
                            label="Name"
                            currentSort={getSortDirection("name")}
                            onSort={(key) => requestSort(key as keyof Tenant)}
                          />
                        </TableHead>
                        <TableHead className="text-zinc-400">Email</TableHead>
                        <TableHead className="text-zinc-400">Phone</TableHead>
                        <TableHead className="text-zinc-400">Property</TableHead>
                        <TableHead className="text-zinc-400">
                          <SortableHeader
                            sortKey="rent"
                            label="Rent"
                            currentSort={getSortDirection("rent")}
                            onSort={(key) => requestSort(key as keyof Tenant)}
                          />
                        </TableHead>
                        <TableHead className="text-zinc-400">
                          <SortableHeader
                            sortKey="paymentStatus"
                            label="Payment Status"
                            currentSort={getSortDirection("paymentStatus")}
                            onSort={(key) => requestSort(key as keyof Tenant)}
                          />
                        </TableHead>
                        <TableHead className="text-zinc-400 w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTenants.map((tenant) => (
                        <TableRow
                          key={tenant.id}
                          className="border-zinc-800 cursor-pointer hover:bg-zinc-800/50"
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          <TableCell className="text-sm font-medium text-zinc-100">
                            {tenant.name}
                          </TableCell>
                          <TableCell className="text-sm text-zinc-400">{tenant.email}</TableCell>
                          <TableCell className="text-sm text-zinc-400">{tenant.phone}</TableCell>
                          <TableCell className="text-sm text-zinc-400">
                            {properties.find((p) => p.id === tenant.propertyId)?.name ||
                              tenant.propertyName ||
                              "Unassigned"}
                          </TableCell>
                          {/* Derived from active lease's monthlyRent */}
                          <TableCell className="text-sm font-medium text-zinc-100">
                            {formatCurrency(
                              Number(getActiveLease(tenant.id, leases)?.monthlyRent ?? tenant.rent),
                            )}
                          </TableCell>
                          <TableCell>{getPaymentStatusBadge(tenant.paymentStatus)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  aria-label={`${tenant.name} options`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dialog.openEditDialog(tenant, (t) => ({
                                      name: t.name,
                                      email: t.email,
                                      phone: t.phone || "",
                                      propertyId: t.propertyId || "",
                                      rent: Number(t.rent),
                                      leaseStart: t.leaseStart || "",
                                      leaseEnd: t.leaseEnd || "",
                                      paymentStatus: t.paymentStatus,
                                      notes: t.notes || "",
                                    }));
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = `mailto:${tenant.email}`;
                                  }}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Email
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(tenant);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
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
                {filteredTenants.length === 0 ? (
                  <EmptyStateIllustration
                    type="tenants"
                    onAction={dialog.openDialog}
                    compact={compact}
                  />
                ) : (
                  <div className="space-y-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
                    {sortedTenants.map((tenant) => {
                      const isSelected = bulkSelection.isSelected(tenant.id);
                      const activeLease = getActiveLease(tenant.id, leases);
                      const isExpiring = activeLease
                        ? (() => {
                            const end = new Date(activeLease.endDate);
                            const inThirty = new Date();
                            inThirty.setDate(inThirty.getDate() + 30);
                            return end >= new Date() && end <= inThirty;
                          })()
                        : false;
                      const isOverdue = tenant.paymentStatus === "overdue";
                      return (
                        <SwipeableListItem
                          key={tenant.id}
                          className={cn(
                            "border-b border-zinc-800 last:border-b-0",
                            isOverdue && "border-l-2 border-l-red-500/60",
                            isSelected && "bg-zinc-800/60",
                          )}
                          startAction={{
                            icon: <Eye className="h-5 w-5" />,
                            label: "Open",
                            className: "bg-accent-primary",
                            onAction: () => {
                              setSelectedTenant(tenant);
                              setIsDetailModalOpen(true);
                            },
                          }}
                          endAction={{
                            icon: <Trash2 className="h-5 w-5" />,
                            label: "Delete",
                            className: "bg-destructive",
                            onAction: () => handleDelete(tenant),
                          }}
                        >
                        <div
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-800/40 cursor-pointer",
                          )}
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => bulkSelection.toggleSelection(tenant.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0"
                          />

                          {/* Avatar + name + email */}
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-primary/20 ring-1 ring-accent-primary/30 text-xs font-semibold text-accent-primary">
                              {tenant.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-zinc-100">
                                {tenant.name}
                              </p>
                              <p className="truncate text-xs text-zinc-500">{tenant.email}</p>
                            </div>
                          </div>

                          {/* Property */}
                          <div className="hidden w-36 shrink-0 truncate text-xs text-zinc-400 md:block">
                            {properties.find((p) => p.id === tenant.propertyId)?.name ||
                              tenant.propertyName ||
                              "Unassigned"}
                          </div>

                          {/* Lease end */}
                          <div className="hidden w-[88px] shrink-0 flex-col items-end text-xs lg:flex">
                            {activeLease ? (
                              <>
                                <span className="text-zinc-500">Ends</span>
                                <span
                                  className={cn(
                                    "font-medium",
                                    isExpiring ? "text-amber-300" : "text-zinc-300",
                                  )}
                                >
                                  {new Date(activeLease.endDate).toLocaleDateString("pt-PT", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              </>
                            ) : null}
                          </div>

                          {/* Rent */}
                          <div className="hidden w-20 shrink-0 text-right text-sm font-semibold text-zinc-100 sm:block">
                            {formatCurrency(Number(activeLease?.monthlyRent ?? tenant.rent))}
                          </div>

                          {/* Status badge */}
                          <div className="shrink-0">
                            {getPaymentStatusBadge(tenant.paymentStatus)}
                          </div>

                          {/* Actions menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                aria-label={`${tenant.name} options`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dialog.openEditDialog(tenant, (t) => ({
                                    name: t.name,
                                    email: t.email,
                                    phone: t.phone || "",
                                    propertyId: t.propertyId || "",
                                    rent: Number(t.rent),
                                    leaseStart: t.leaseStart || "",
                                    leaseEnd: t.leaseEnd || "",
                                    paymentStatus: t.paymentStatus,
                                    notes: t.notes || "",
                                  }));
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `mailto:${tenant.email}`;
                                }}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(tenant);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        </SwipeableListItem>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            <BulkActionBar
              selectedCount={bulkSelection.selectedCount}
              totalCount={sortedTenants.length}
              itemLabel="tenants"
              actions={bulkActions}
              onSelectAll={() => bulkSelection.selectAll(sortedTenants)}
              onClearSelection={bulkSelection.clearSelection}
              isAllSelected={bulkSelection.isAllSelected(sortedTenants)}
              isPartiallySelected={bulkSelection.isPartiallySelected(sortedTenants)}
              selectedIds={Array.from(bulkSelection.selectedIds)}
            />
          </div>
        )}

        {/* Tenant Detail Modal */}
        <TenantDetailModal
          tenant={selectedTenant}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedTenant(null);
          }}
          onEdit={(updatedTenant) => {
            setSelectedTenant(updatedTenant);
          }}
          onDelete={() => {
            setIsDetailModalOpen(false);
            setSelectedTenant(null);
          }}
        />
        <ConfirmationDialog dialog={confirmDialog} />
      </>
    );
  },
);

TenantsView.displayName = "TenantsView";
