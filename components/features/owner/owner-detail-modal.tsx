"use client";

import { useState } from "react";
import { User, Mail, Phone, MapPin, Building2, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Owner } from "@/lib/types";
import { useApp } from "@/lib/contexts/app-context";
import { useToast } from "@/lib/contexts/toast-context";
import { ownerSchema, OwnerFormData } from "@/lib/utils/validation";

interface OwnerDetailModalProps {
  owner: Owner | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (owner: Owner) => void;
  onDelete?: (ownerId: string) => void;
}

export function OwnerDetailModal({
  owner,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: OwnerDetailModalProps) {
  const { updateOwner, deleteOwner } = useApp();
  const { success, error } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<OwnerFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  // Initialize form data when owner changes
  useState(() => {
    if (owner) {
      setFormData({
        name: owner.name,
        email: owner.email,
        phone: owner.phone || '',
        address: owner.address || '',
        notes: owner.notes || '',
      });
    }
  });

  if (!owner) return null;

  const handleSave = async () => {
    try {
      const validated = ownerSchema.parse(formData);
      await updateOwner(owner.id, validated);
      success('Owner updated successfully');
      setIsEditing(false);
      if (onEdit) {
        onEdit({ ...owner, ...validated });
      }
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error('Failed to update owner');
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this owner?')) return;
    
    try {
      await deleteOwner(owner.id);
      success('Owner deleted successfully');
      onClose();
      if (onDelete) {
        onDelete(owner.id);
      }
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error('Failed to delete owner');
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      name: owner.name,
      email: owner.email,
      phone: owner.phone || '',
      address: owner.address || '',
      notes: owner.notes || '',
    });
    setIsEditing(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/20 ring-1 ring-accent-primary/30">
                  <span className="text-sm font-semibold text-accent-primary">
                    {owner.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                </div>
                <div>
                  <DialogTitle className="text-2xl text-[var(--color-foreground)]">
                    {isEditing ? 'Edit Owner' : owner.name}
                  </DialogTitle>
                  <DialogDescription className="flex flex-col gap-1">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {owner.email}
                    </span>
                    {owner.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {owner.phone}
                      </span>
                    )}
                  </DialogDescription>
                </div>
              </div>
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
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Owner Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
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
                  </CardContent>
                </Card>

                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Address</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      id="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </CardContent>
                </Card>
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
            <div className="space-y-4">
              {owner.address && (
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-zinc-500 mt-1" />
                      <div className="text-sm">
                        <p className="text-[var(--color-foreground)]">{owner.address}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Properties Owned */}
              {owner.properties && owner.properties.length > 0 && (
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Properties Owned ({owner.properties.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {owner.properties.map((po) => (
                        <div key={po.id} className="flex items-center justify-between p-2 bg-zinc-900 rounded">
                          <span className="text-sm text-[var(--color-foreground)]">
                            {po.property?.name || 'Unknown Property'}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {po.ownershipPercentage}% ownership
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {owner.notes && (
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--color-foreground)]">{owner.notes}</p>
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
                  Delete Owner
                </Button>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1"
                >
                  <Edit className="w-4 h-4" />
                  Edit Owner
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
