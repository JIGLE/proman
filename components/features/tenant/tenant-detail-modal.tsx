"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, MapPin, Calendar, DollarSign, Edit, Trash2, X, FileText } from "lucide-react";
import { useCurrency } from "@/lib/contexts/currency-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tenant } from "@/lib/types";
import { useApp } from "@/lib/contexts/app-context";
import { useToast } from "@/lib/contexts/toast-context";
import { tenantSchema, TenantFormData } from "@/lib/utils/validation";

interface TenantDetailModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (tenant: Tenant) => void;
  onDelete?: (tenantId: string) => void;
}

export function TenantDetailModal({
  tenant,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: TenantDetailModalProps) {
  const { formatCurrency } = useCurrency();
  const { updateTenant, deleteTenant, state } = useApp();
  const { properties } = state;
  const { success, error } = useToast();
  const [isEditing, setIsEditing] = useState(false);
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

  // Initialize form data when tenant changes
    useEffect(() => {
      if (tenant) {
        setFormData({
          name: tenant.name || '',
          email: tenant.email || '',
          phone: tenant.phone || '',
          propertyId: (tenant as any).propertyId || '',
          rent: tenant.rent ?? 0,
          leaseStart: tenant.leaseStart || '',
          leaseEnd: tenant.leaseEnd || '',
          paymentStatus: tenant.paymentStatus || 'pending',
          notes: tenant.notes || '',
        });
      } else {
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
      }
      }, [tenant]);
  
    if (!tenant) return null;

    function getPaymentStatusBadge(paymentStatus: string): import("react").ReactNode {
      if (paymentStatus === "paid") {
        return <Badge>Paid</Badge>;
      }
      if (paymentStatus === "pending") {
        return <Badge>Pending</Badge>;
      }
      if (paymentStatus === "overdue") {
        return <Badge>Overdue</Badge>;
      }
      return <Badge>Unknown</Badge>;
    }

    const resetForm = () => {
      if (!tenant) return;
      setFormData({
        name: tenant.name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        propertyId: (tenant as any).propertyId || '',
        rent: tenant.rent ?? 0,
        leaseStart: tenant.leaseStart || '',
        leaseEnd: tenant.leaseEnd || '',
        paymentStatus: tenant.paymentStatus || 'pending',
        notes: tenant.notes || '',
      });
    };

    function handleCancel() {
      resetForm();
      setIsEditing(false);
    }

    async function handleSave() {
      try {
        const data = tenantSchema.parse(formData);
        if (onEdit && tenant) {
          onEdit({ ...(tenant as Tenant), ...data });
        } else if (updateTenant && tenant) {
          // call updateTenant via context if provided (cast to any to avoid strict signature assumptions)
          (updateTenant as any)(tenant.id, data);
        }
        success?.("Tenant updated");
        setIsEditing(false);
      } catch (err: any) {
        error?.("Failed to save tenant");
      }
    }

    function handleDelete() {
      if (!tenant) return;
      if (onDelete) {
        onDelete(tenant.id);
      } else if (deleteTenant) {
        (deleteTenant as any)(tenant.id);
      }
      onClose();
      success?.("Tenant deleted");
    }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
            <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 flex items-start gap-3">
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
                  <DialogTitle className="text-2xl text-[var(--color-foreground)]">
                    {isEditing ? 'Edit Tenant' : tenant.name}
                  </DialogTitle>
                  <DialogDescription className="flex flex-col gap-1">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {tenant.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {tenant.phone}
                    </span>
                  </DialogDescription>
                </div>
              </div>
              {!isEditing && (
                <div className="flex items-center gap-2">
                  {getPaymentStatusBadge(tenant.paymentStatus)}
                </div>
              )}
            </div>
          </DialogHeader>

          {isEditing ? (
            // Edit Mode
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="property">Property</Label>
                <Select
                  value={formData.propertyId}
                  onValueChange={(value) => setFormData({ ...formData, propertyId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name} - {property.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rent">Monthly Rent</Label>
                <Input
                  id="rent"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rent}
                  onChange={(e) => setFormData({ ...formData, rent: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leaseStart">Lease Start</Label>
                  <Input
                    id="leaseStart"
                    type="date"
                    value={formData.leaseStart}
                    onChange={(e) => setFormData({ ...formData, leaseStart: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leaseEnd">Lease End</Label>
                  <Input
                    id="leaseEnd"
                    type="date"
                    value={formData.leaseEnd}
                    onChange={(e) => setFormData({ ...formData, leaseEnd: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select
                  value={formData.paymentStatus}
                  onValueChange={(value) => setFormData({ ...formData, paymentStatus: value as Tenant['paymentStatus'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            // View Mode
            <div className="space-y-6">
              {/* Tenant Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-zinc-500" />
                      <span className="text-[var(--color-foreground)]">{tenant.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-zinc-500" />
                      <span className="text-[var(--color-foreground)]">{tenant.phone}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Property</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-zinc-500 mt-1" />
                      <div className="text-sm">
                        <p className="text-[var(--color-foreground)] font-medium">
                          {tenant.propertyName || 'Unassigned'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Details */}
              <Card className="bg-zinc-800 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-sm text-zinc-400">Financial Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400 flex items-center gap-1">
                      <DollarSign className="h-4 w-4" /> Monthly Rent
                    </span>
                    <span className="text-lg font-semibold text-[var(--color-foreground)]">
                      {formatCurrency(tenant.rent)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Lease Information */}
              <Card className="bg-zinc-800 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-sm text-zinc-400">Lease Period</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> Start Date
                    </span>
                    <span className="text-[var(--color-foreground)]">
                      {new Date(tenant.leaseStart).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> End Date
                    </span>
                    <span className="text-[var(--color-foreground)]">
                      {new Date(tenant.leaseEnd).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {tenant.notes && (
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--color-foreground)]">{tenant.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between gap-2 pt-4 border-t border-zinc-800">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Tenant
                </Button>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1"
                >
                  <Edit className="w-4 h-4" />
                  Edit Tenant
                </Button>
              </div>
            </div>
          )} 
        </DialogContent>
      </Dialog>
    </>
  );
}
