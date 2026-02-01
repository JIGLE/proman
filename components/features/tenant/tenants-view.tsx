"use client";

import { useMemo, useState, useCallback } from "react";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Plus,
  Edit,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  CheckSquare,
  Square,
} from "lucide-react";
import { useCurrency } from "@/lib/contexts/currency-context";
import { cn } from "@/lib/utils/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { SearchFilter } from "@/components/ui/search-filter";
import { ExportButton } from "@/components/ui/export-button";
import {
  BulkActionBar,
  getDefaultBulkActions,
} from "@/components/ui/bulk-action-bar";
import { EditableCell } from "@/components/ui/editable-cell";
import { Checkbox } from "@/components/ui/checkbox";
import { useApp } from "@/lib/contexts/app-context";
import { Tenant } from "@/lib/types";
import { tenantSchema, TenantFormData } from "@/lib/utils/validation";
import { useToast } from "@/lib/contexts/toast-context";
import { useFormDialog } from "@/lib/hooks/use-form-dialog";
import { useSortableData, SortDirection } from "@/lib/hooks/use-sortable-data";
import { useBulkSelection } from "@/lib/hooks/use-bulk-selection";

export type TenantsViewProps = Record<string, never>;

interface SortableHeaderProps {
  column: keyof Tenant;
  label: string;
  sortDirection: SortDirection;
  onSort: (column: keyof Tenant) => void;
}

function SortableHeader({ column, label, sortDirection, onSort }: SortableHeaderProps) {
  return (
    <button
      onClick={() => onSort(column)}
      className={cn(
        "flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider",
        "hover:text-zinc-200 transition-colors group focus-ring",
        "px-2 py-1 rounded-md hover:bg-[var(--color-surface-hover)]"
      )}
    >
      <span>{label}</span>
      <span className="opacity-70 group-hover:opacity-100 transition-opacity">
        {sortDirection === "asc" && <ArrowUp className="w-3 h-3" />}
        {sortDirection === "desc" && <ArrowDown className="w-3 h-3" />}
        {sortDirection === null && <ArrowUpDown className="w-3 h-3" />}
      </span>
    </button>
  );
}

export function TenantsView(): React.ReactElement {
  const { state, addTenant, updateTenant, deleteTenant } = useApp();
  const { tenants, properties, loading } = state;
  const { success, error: showError } = useToast();
  const { formatCurrency } = useCurrency();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Bulk selection
  const bulkSelection = useBulkSelection<Tenant>();

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
  });

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

  const handleEdit = (tenant: Tenant) => {
    dialog.openEditDialog(tenant, (t) => ({
      name: t.name,
      email: t.email,
      phone: t.phone,
      propertyId: t.propertyId || "",
      rent: t.rent,
      leaseStart: t.leaseStart,
      leaseEnd: t.leaseEnd,
      paymentStatus: t.paymentStatus,
      notes: t.notes || "",
    }));
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this tenant?")) {
      try {
        await deleteTenant(id);
        success("Tenant deleted successfully!");
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Bulk delete handler
  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      if (confirm(`Are you sure you want to delete ${ids.length} tenant(s)?`)) {
        try {
          for (const id of ids) {
            await deleteTenant(id);
          }
          success(`Successfully deleted ${ids.length} tenant(s)`);
          bulkSelection.clearSelection();
        } catch (err) {
          showError("Failed to delete some tenants");
          console.error(err);
        }
      }
    },
    [deleteTenant, success, showError, bulkSelection]
  );

  // Inline edit handler
  const handleInlineEdit = useCallback(
    async (tenantId: string, field: keyof Tenant, value: string | number) => {
      try {
        const tenant = tenants.find((t) => t.id === tenantId);
        if (!tenant) return;

        await updateTenant(tenantId, { [field]: value });
        success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
      } catch (err) {
        showError("Failed to update");
        console.error(err);
      }
    },
    [tenants, updateTenant, success, showError]
  );

  // Export selected tenants
  const handleExportSelected = useCallback(
    (ids: string[]) => {
      const selectedTenants = tenants.filter((t) => ids.includes(t.id));
      const csvContent = [
        ["Name", "Email", "Phone", "Property", "Rent", "Status"].join(","),
        ...selectedTenants.map((t) =>
          [t.name, t.email, t.phone, t.propertyName || "", t.rent, t.paymentStatus].join(",")
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
    [tenants]
  );

  // Bulk actions configuration
  const bulkActions = useMemo(
    () =>
      getDefaultBulkActions({
        onDelete: handleBulkDelete,
        onExport: handleExportSelected,
      }),
    [handleBulkDelete, handleExportSelected]
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

      const matchesStatus = statusFilter === "all" || tenant.paymentStatus === statusFilter;

      return matchesSearch && matchesProperty && matchesStatus;
    });
  }, [tenants, searchQuery, propertyFilter, statusFilter]);

  // Sorting
  const { sortedData: sortedTenants, requestSort, getSortDirection } =
    useSortableData(filteredTenants);

  return (
    <>
      {loading ? (
        <LoadingState variant="cards" count={6} />
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
                Tenant CRM
              </h2>
              <p className="text-[var(--color-muted-foreground)]">
                Manage tenant relationships and payments
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton
                data={sortedTenants}
                filename="tenants"
                columns={[
                  { key: "name", label: "Name" },
                  { key: "email", label: "Email" },
                  { key: "phone", label: "Phone" },
                  { key: "propertyName", label: "Property" },
                  {
                    key: "rent",
                    label: "Monthly Rent",
                    format: (value) => formatCurrency(value),
                  },
                  {
                    key: "leaseStart",
                    label: "Lease Start",
                    format: (value) => new Date(value).toLocaleDateString(),
                  },
                  {
                    key: "leaseEnd",
                    label: "Lease End",
                    format: (value) => new Date(value).toLocaleDateString(),
                  },
                  { key: "paymentStatus", label: "Payment Status" },
                ]}
              />
              <Dialog open={dialog.isOpen} onOpenChange={(open) => !open && dialog.closeDialog()}>
                <DialogTrigger asChild>
                  <Button onClick={dialog.openDialog} className="flex items-center gap-2">
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
                  <form onSubmit={dialog.handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={dialog.formData.name}
                          onChange={(e) => dialog.updateFormData({ name: e.target.value })}
                          className={dialog.formErrors.name ? "border-red-500" : ""}
                          required
                        />
                        {dialog.formErrors.name && (
                          <p className="text-sm text-red-500">{dialog.formErrors.name}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={dialog.formData.email}
                          onChange={(e) => dialog.updateFormData({ email: e.target.value })}
                          className={dialog.formErrors.email ? "border-red-500" : ""}
                          required
                        />
                        {dialog.formErrors.email && (
                          <p className="text-sm text-red-500">{dialog.formErrors.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={dialog.formData.phone}
                          onChange={(e) => dialog.updateFormData({ phone: e.target.value })}
                          className={dialog.formErrors.phone ? "border-red-500" : ""}
                          required
                        />
                        {dialog.formErrors.phone && (
                          <p className="text-sm text-red-500">{dialog.formErrors.phone}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="property">Property</Label>
                        <Select
                          value={dialog.formData.propertyId}
                          onValueChange={(value) => dialog.updateFormData({ propertyId: value })}
                        >
                          <SelectTrigger className={dialog.formErrors.propertyId ? "border-red-500" : ""}>
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
                          <p className="text-sm text-red-500">{dialog.formErrors.propertyId}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rent">Monthly Rent ($)</Label>
                        <Input
                          id="rent"
                          type="number"
                          min="0"
                          value={dialog.formData.rent}
                          onChange={(e) =>
                            dialog.updateFormData({ rent: parseInt(e.target.value) || 0 })
                          }
                          className={dialog.formErrors.rent ? "border-red-500" : ""}
                          required
                        />
                        {dialog.formErrors.rent && (
                          <p className="text-sm text-red-500">{dialog.formErrors.rent}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="leaseStart">Lease Start</Label>
                        <Input
                          id="leaseStart"
                          type="date"
                          value={dialog.formData.leaseStart}
                          onChange={(e) => dialog.updateFormData({ leaseStart: e.target.value })}
                          className={dialog.formErrors.leaseStart ? "border-red-500" : ""}
                          required
                        />
                        {dialog.formErrors.leaseStart && (
                          <p className="text-sm text-red-500">{dialog.formErrors.leaseStart}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="leaseEnd">Lease End</Label>
                        <Input
                          id="leaseEnd"
                          type="date"
                          value={dialog.formData.leaseEnd}
                          onChange={(e) => dialog.updateFormData({ leaseEnd: e.target.value })}
                          className={dialog.formErrors.leaseEnd ? "border-red-500" : ""}
                          required
                        />
                        {dialog.formErrors.leaseEnd && (
                          <p className="text-sm text-red-500">{dialog.formErrors.leaseEnd}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentStatus">Payment Status</Label>
                      <Select
                        value={dialog.formData.paymentStatus}
                        onValueChange={(value: Tenant["paymentStatus"]) =>
                          dialog.updateFormData({ paymentStatus: value })
                        }
                      >
                        <SelectTrigger className={dialog.formErrors.paymentStatus ? "border-red-500" : ""}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                      {dialog.formErrors.paymentStatus && (
                        <p className="text-sm text-red-500">
                          {dialog.formErrors.paymentStatus}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={dialog.formData.notes}
                        onChange={(e) => dialog.updateFormData({ notes: e.target.value })}
                        rows={4}
                        className={dialog.formErrors.notes ? "border-red-500" : ""}
                      />
                      {dialog.formErrors.notes && (
                        <p className="text-sm text-red-500">{dialog.formErrors.notes}</p>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={dialog.closeDialog}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={dialog.isSubmitting}>
                        {dialog.isSubmitting
                          ? "Saving..."
                          : dialog.editingItem
                          ? "Update Tenant"
                          : "Add Tenant"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <SearchFilter
            searchPlaceholder="Search tenants..."
            onSearchChange={setSearchQuery}
            onFilterChange={(key, value) => {
              if (key === "property") setPropertyFilter(value);
              if (key === "status") setStatusFilter(value);
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
                  { label: "All Statuses", value: "all" },
                  { label: "Paid", value: "paid" },
                  { label: "Pending", value: "pending" },
                  { label: "Overdue", value: "overdue" },
                ],
                defaultValue: "all",
              },
            ]}
          />

          {filteredTenants.length > 0 && (
            <div className="flex items-center gap-4 px-4 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="flex-1">
                <SortableHeader
                  column="name"
                  label="Tenant"
                  sortDirection={getSortDirection("name")}
                  onSort={requestSort}
                />
              </div>
              <div className="w-36 text-right">
                <SortableHeader
                  column="rent"
                  label="Rent"
                  sortDirection={getSortDirection("rent")}
                  onSort={requestSort}
                />
              </div>
              <div className="w-36 text-right">
                <SortableHeader
                  column="paymentStatus"
                  label="Status"
                  sortDirection={getSortDirection("paymentStatus")}
                  onSort={requestSort}
                />
              </div>
              <div className="w-36 text-right">
                <SortableHeader
                  column="leaseEnd"
                  label="Lease End"
                  sortDirection={getSortDirection("leaseEnd")}
                  onSort={requestSort}
                />
              </div>
            </div>
          )}

          {filteredTenants.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="text-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <User className="w-10 h-10 text-zinc-500" />
                  <h3 className="text-xl font-semibold text-[var(--color-foreground)]">
                    No tenants yet
                  </h3>
                  <p className="text-[var(--color-muted-foreground)] max-w-sm">
                    Add your first tenant to start managing leases and communications.
                  </p>
                  <Button onClick={dialog.openDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Tenant
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedTenants.map((tenant) => {
                const isSelected = bulkSelection.isSelected(tenant.id);
                return (
                  <Card
                    key={tenant.id}
                    className={cn(
                      "relative bg-[var(--color-surface)] border border-[var(--color-border)] transition-all duration-200",
                      "hover:border-[var(--color-accent-primary)]/40 hover:shadow-lg",
                      isSelected && "border-[var(--color-accent-primary)] shadow-lg"
                    )}
                  >
                    <CardHeader className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => bulkSelection.toggleSelection(tenant.id)}
                            className="mt-1"
                          />
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/20 ring-1 ring-accent-primary/30">
                              <span className="text-sm font-semibold text-accent-primary">
                                {tenant.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <CardTitle className="text-xl font-semibold text-[var(--color-foreground)]">
                                {tenant.name}
                              </CardTitle>
                              <CardDescription className="flex flex-col text-xs text-[var(--color-muted-foreground)]">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {tenant.email}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {tenant.phone}
                                </span>
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(tenant)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(tenant.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 rounded-lg bg-[var(--color-surface-muted)] p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--color-muted-foreground)]">
                            Monthly Rent
                          </span>
                          <EditableCell
                            value={tenant.rent}
                            type="currency"
                            onSave={(value) => handleInlineEdit(tenant.id, "rent", value)}
                            formatter={(value) => formatCurrency(Number(value))}
                            className="text-lg font-semibold text-[var(--color-foreground)]"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--color-muted-foreground)]">
                            Property
                          </span>
                          <span className="text-sm font-medium text-[var(--color-foreground)]">
                            {tenant.propertyName || "Unassigned"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--color-muted-foreground)]">
                            Lease Period
                          </span>
                          <span className="text-xs text-[var(--color-foreground)]">
                            {tenant.leaseStart ? new Date(tenant.leaseStart).toLocaleDateString() : "—"}
                            {" "}→{" "}
                            {tenant.leaseEnd ? new Date(tenant.leaseEnd).toLocaleDateString() : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-zinc-500" />
                          <span className="text-sm text-[var(--color-muted-foreground)]">
                            Next payment due
                          </span>
                        </div>
                        {getPaymentStatusBadge(tenant.paymentStatus)}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide">
                          Notes
                        </h4>
                        <EditableCell
                          value={tenant.notes || ""}
                          type="text"
                          onSave={(value) => handleInlineEdit(tenant.id, "notes", value)}
                          placeholder="Add important notes"
                          className="text-sm text-[var(--color-foreground)]"
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
                        <span>{tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : ""}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => handleInlineEdit(tenant.id, "paymentStatus", "paid")}
                          >
                            Mark Paid
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => handleInlineEdit(tenant.id, "paymentStatus", "overdue")}
                          >
                            Mark Overdue
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
    </>
  );
}
