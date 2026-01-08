"use client";

import { useState } from "react";
import { ZodError } from 'zod';
import { User, Mail, Phone, Calendar, Plus, Edit, Trash2 } from "lucide-react";
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
import { useApp } from "@/lib/app-context-db";
import { Tenant } from "@/lib/types";
import { tenantSchema, TenantFormData } from "@/lib/validation";
import { useToast } from "@/lib/toast-context";

export type TenantsViewProps = Record<string, never>

export function TenantsView(): React.ReactElement {
  const { state, addTenant, updateTenant, deleteTenant } = useApp();
  const { tenants, properties, loading } = state;
  const { success, error } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    email: '',
    phone: '',
    propertyId: '',
    rent: 0,
    leaseStart: '',
    leaseEnd: '',
    paymentStatus: 'pending',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof TenantFormData, string>>>({});

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});

    try {
      // Validate form data
      const validatedData = tenantSchema.parse(formData);

      if (editingTenant) {
        await updateTenant(editingTenant.id, validatedData);
        success('Tenant updated successfully!');
      } else {
        await addTenant(validatedData);
        success('Tenant added successfully!');
      }

      setIsDialogOpen(false);
      setEditingTenant(null);
      resetForm();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const errors: Partial<Record<keyof TenantFormData, string>> = {};
        err.issues.forEach((issue) => {
          const field = issue.path[0] as keyof TenantFormData;
          errors[field] = issue.message;
        });
        setFormErrors(errors);
        error('Please fix the form errors below.');
      } else {
        error('Failed to save tenant. Please try again.');
        console.error('Tenant save error:', err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      propertyId: tenant.propertyId || '',
      rent: tenant.rent,
      leaseStart: tenant.leaseStart,
      leaseEnd: tenant.leaseEnd,
      paymentStatus: tenant.paymentStatus,
      notes: tenant.notes || '',
    });
    setIsDialogOpen(true);
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

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      propertyId: '',
      rent: 0,
      leaseStart: '',
      leaseEnd: '',
      paymentStatus: 'pending',
      notes: '',
    });
    setFormErrors({});
  };

  const openAddDialog = () => {
    setEditingTenant(null);
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="text-zinc-400">Loading tenants...</div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
            Tenant CRM
          </h2>
          <p className="text-zinc-400">Manage tenant relationships and payments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-zinc-50">
                {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
              </DialogTitle>
              <DialogDescription>
                {editingTenant ? 'Update tenant information' : 'Enter tenant details'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={formErrors.name ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.name && (
                    <p className="text-sm text-red-500">{formErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={formErrors.email ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.email && (
                    <p className="text-sm text-red-500">{formErrors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={formErrors.phone ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.phone && (
                    <p className="text-sm text-red-500">{formErrors.phone}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property">Property</Label>
                  <Select value={formData.propertyId} onValueChange={(value) => setFormData({ ...formData, propertyId: value })}>
                    <SelectTrigger className={formErrors.propertyId ? 'border-red-500' : ''}>
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
                  {formErrors.propertyId && (
                    <p className="text-sm text-red-500">{formErrors.propertyId}</p>
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
                    value={formData.rent}
                    onChange={(e) => setFormData({ ...formData, rent: parseInt(e.target.value) || 0 })}
                    className={formErrors.rent ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.rent && (
                    <p className="text-sm text-red-500">{formErrors.rent}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leaseStart">Lease Start</Label>
                  <Input
                    id="leaseStart"
                    type="date"
                    value={formData.leaseStart}
                    onChange={(e) => setFormData({ ...formData, leaseStart: e.target.value })}
                    className={formErrors.leaseStart ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.leaseStart && (
                    <p className="text-sm text-red-500">{formErrors.leaseStart}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leaseEnd">Lease End</Label>
                  <Input
                    id="leaseEnd"
                    type="date"
                    value={formData.leaseEnd}
                    onChange={(e) => setFormData({ ...formData, leaseEnd: e.target.value })}
                    className={formErrors.leaseEnd ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.leaseEnd && (
                    <p className="text-sm text-red-500">{formErrors.leaseEnd}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select value={formData.paymentStatus} onValueChange={(value: Tenant['paymentStatus']) => setFormData({ ...formData, paymentStatus: value })}>
                  <SelectTrigger className={formErrors.paymentStatus ? 'border-red-500' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.paymentStatus && (
                  <p className="text-sm text-red-500">{formErrors.paymentStatus}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={formErrors.notes ? 'border-red-500' : ''}
                  rows={3}
                />
                {formErrors.notes && (
                  <p className="text-sm text-red-500">{formErrors.notes}</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (editingTenant ? 'Update Tenant' : 'Add Tenant')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {tenants.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-8 text-center">
              <User className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-50 mb-2">No tenants yet</h3>
              <p className="text-zinc-400 mb-4">Get started by adding your first tenant</p>
              <Button onClick={openAddDialog} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Tenant
              </Button>
            </CardContent>
          </Card>
        ) : (
          tenants.map((tenant) => (
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
                      ${tenant.rent.toLocaleString()}
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
  );
}
