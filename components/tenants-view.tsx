"use client";

import { useMemo, useState } from "react";
import { User, Mail, Phone, Calendar, Plus, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { LoadingState } from "./ui/loading-state";
import { SearchFilter } from "./ui/search-filter";
import { ExportButton } from "./ui/export-button";
import { useApp } from "@/lib/app-context-db";
import { Tenant } from "@/lib/types";
import { tenantSchema, TenantFormData } from "@/lib/validation";
import { useToast } from "@/lib/toast-context";
import { useFormDialog } from "@/lib/hooks/use-form-dialog";
import { useSortableData, SortDirection } from "@/lib/hooks/use-sortable-data";

export type TenantsViewProps = Record<string, never>

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
      className="flex items-center gap-1 text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors"
    >
      {label}
      {sortDirection === 'asc' && <ArrowUp className="w-3 h-3" />}
      {sortDirection === 'desc' && <ArrowDown className="w-3 h-3" />}
      {sortDirection === null && <ArrowUpDown className="w-3 h-3 opacity-50" />}
    </button>
  );
}

export function TenantsView(): React.ReactElement {
  const { state, addTenant, updateTenant, deleteTenant } = useApp();
  const { tenants, properties, loading } = state;
  const { success } = useToast();
  const { formatCurrency } = useCurrency();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const initialFormData: TenantFormData = {
    name: '',
    email: '',
    phone: '',
    propertyId: '',
    rent: 0,
    leaseStart: '',
    leaseEnd: '',
    paymentStatus: 'pending',
    notes: '',
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
      create: 'Tenant added successfully!',
      update: 'Tenant updated successfully!',
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
      propertyId: t.propertyId || '',
      rent: t.rent,
      leaseStart: t.leaseStart,
      leaseEnd: t.leaseEnd,
      paymentStatus: t.paymentStatus,
      notes: t.notes || '',
    }));
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this tenant?')) {
      try {
        await deleteTenant(id);
        success('Tenant deleted successfully!');
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Filter and search tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      // Search filter (name, email, phone)
      const matchesSearch = searchQuery.length === 0 || 
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.phone.toLowerCase().includes(searchQuery.toLowerCase());

      // Property filter
      const matchesProperty = propertyFilter === 'all' || tenant.propertyId === propertyFilter;

      // Status filter
      const matchesStatus = statusFilter === 'all' || tenant.paymentStatus === statusFilter;

      return matchesSearch && matchesProperty && matchesStatus;
    });
  }, [tenants, searchQuery, propertyFilter, statusFilter]);

  // Sorting
  const { sortedData: sortedTenants, requestSort, getSortDirection } = useSortableData(filteredTenants);

  return (
    <>
      {loading ? (
        <LoadingState variant="cards" count={6} />
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
                Tenant CRM
              </h2>
              <p className="text-zinc-400">Manage tenant relationships and payments</p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton
                data={sortedTenants}
                filename="tenants"
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'propertyName', label: 'Property' },
                  { 
                    key: 'rent', 
                    label: 'Monthly Rent',
                    format: (value) => formatCurrency(value)
                  },
                  { 
                    key: 'leaseStart', 
                    label: 'Lease Start',
                    format: (value) => new Date(value).toLocaleDateString()
                  },
                  { 
                    key: 'leaseEnd', 
                    label: 'Lease End',
                    format: (value) => new Date(value).toLocaleDateString()
                  },
                  { key: 'paymentStatus', label: 'Payment Status' },
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
                  <DialogTitle className="text-zinc-50">
                    {dialog.editingItem ? 'Edit Tenant' : 'Add New Tenant'}
                  </DialogTitle>
                  <DialogDescription>
                    {dialog.editingItem ? 'Update tenant information' : 'Enter tenant details'}
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
                    className={dialog.formErrors.name ? 'border-red-500' : ''}
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
                    className={dialog.formErrors.email ? 'border-red-500' : ''}
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
                    className={dialog.formErrors.phone ? 'border-red-500' : ''}
                    required
                  />
                  {dialog.formErrors.phone && (
                    <p className="text-sm text-red-500">{dialog.formErrors.phone}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property">Property</Label>
                  <Select value={dialog.formData.propertyId} onValueChange={(value) => dialog.updateFormData({ propertyId: value })}>
                    <SelectTrigger className={dialog.formErrors.propertyId ? 'border-red-500' : ''}>
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
                    onChange={(e) => dialog.updateFormData({ rent: parseInt(e.target.value) || 0 })}
                    className={dialog.formErrors.rent ? 'border-red-500' : ''}
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
                    className={dialog.formErrors.leaseStart ? 'border-red-500' : ''}
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
                    className={dialog.formErrors.leaseEnd ? 'border-red-500' : ''}
                    required
                  />
                  {dialog.formErrors.leaseEnd && (
                    <p className="text-sm text-red-500">{dialog.formErrors.leaseEnd}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select value={dialog.formData.paymentStatus} onValueChange={(value: Tenant['paymentStatus']) => dialog.updateFormData({ paymentStatus: value })}>
                  <SelectTrigger className={dialog.formErrors.paymentStatus ? 'border-red-500' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                {dialog.formErrors.paymentStatus && (
                  <p className="text-sm text-red-500">{dialog.formErrors.paymentStatus}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={dialog.formData.notes}
                  onChange={(e) => dialog.updateFormData({ notes: e.target.value })}
                  className={dialog.formErrors.notes ? 'border-red-500' : ''}
                  rows={3}
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
                  {dialog.isSubmitting ? 'Saving...' : (dialog.editingItem ? 'Update Tenant' : 'Add Tenant')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
            </div>
          </div>

          {/* Search and Filter */}
          <SearchFilter
            searchPlaceholder="Search tenants by name, email, or phone..."
            onSearchChange={setSearchQuery}
            onFilterChange={(key, value) => {
              if (key === 'property') setPropertyFilter(value);
              if (key === 'status') setStatusFilter(value);
            }}
            filters={[
              {
                key: 'property',
                label: 'Property',
                options: [
                  { label: 'All Properties', value: 'all' },
                  ...properties.map(p => ({ label: p.name, value: p.id }))
                ],
                defaultValue: 'all'
              },
              {
                key: 'status',
                label: 'Payment Status',
                options: [
                  { label: 'All Statuses', value: 'all' },
                  { label: 'Paid', value: 'paid' },
                  { label: 'Pending', value: 'pending' },
                  { label: 'Overdue', value: 'overdue' }
                ],
                defaultValue: 'all'
              }
            ]}
          />

      {/* Sortable Column Headers */}
      {filteredTenants.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <div className="flex-1">
            <SortableHeader column="name" label="Tenant" sortDirection={getSortDirection('name')} onSort={requestSort} />
          </div>
          <div className="w-32">
            <SortableHeader column="paymentStatus" label="Status" sortDirection={getSortDirection('paymentStatus')} onSort={requestSort} />
          </div>
          <div className="w-32">
            <SortableHeader column="rent" label="Rent" sortDirection={getSortDirection('rent')} onSort={requestSort} />
          </div>
          <div className="w-48">
            <SortableHeader column="leaseStart" label="Lease Period" sortDirection={getSortDirection('leaseStart')} onSort={requestSort} />
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {filteredTenants.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-8 text-center">
              <User className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-50 mb-2">
                {tenants.length === 0 ? 'No tenants yet' : 'No tenants found'}
              </h3>
              <p className="text-zinc-400 mb-4">
                {tenants.length === 0 
                  ? 'Get started by adding your first tenant' 
                  : 'Try adjusting your search or filters'}
              </p>
              {tenants.length === 0 && (
                <Button onClick={dialog.openDialog} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Your First Tenant
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          sortedTenants.map((tenant) => (
            <Card key={tenant.id} className="transition-all hover:shadow-lg hover:shadow-zinc-900/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                      <User className="h-6 w-6 text-zinc-400" />
                    </div>
                    <div>
                      <CardTitle className="text-zinc-50">{tenant.name}</CardTitle>
                      <CardDescription>{tenant.propertyName || 'No property assigned'}</CardDescription>
                    </div>
                  </div>
                  {getPaymentStatusBadge(tenant.paymentStatus)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </div>
                    <p className="text-sm text-zinc-50">{tenant.email}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Phone className="h-4 w-4" />
                      <span>Phone</span>
                    </div>
                    <p className="text-sm text-zinc-50">{tenant.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Calendar className="h-4 w-4" />
                      <span>Lease Period</span>
                    </div>
                    <p className="text-sm text-zinc-50">
                      {new Date(tenant.leaseStart).toLocaleDateString()} -{" "}
                      {new Date(tenant.leaseEnd).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-zinc-400">Monthly Rent</div>
                    <p className="text-lg font-semibold text-zinc-50">
{formatCurrency(tenant.rent)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(tenant)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(tenant.id)}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
        </div>
      )}
    </>
  );
}
