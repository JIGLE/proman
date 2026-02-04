"use client";

import { useState } from "react";
import { Building2, MapPin, Bed, Bath, Edit, Trash2, Plus, CheckCircle, X } from "lucide-react";
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
import { Property } from "@/lib/types";
import { useApp } from "@/lib/contexts/app-context";
import { useToast } from "@/lib/contexts/toast-context";
import { propertySchema, PropertyFormData } from "@/lib/utils/validation";
import UnitsView from "./units-view";

interface PropertyDetailModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (property: Property) => void;
  onDelete?: (propertyId: string) => void;
}

export function PropertyDetailModal({
  property,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: PropertyDetailModalProps) {
  const { formatCurrency } = useCurrency();
  const { updateProperty, deleteProperty } = useApp();
  const { success, error } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showUnits, setShowUnits] = useState(false);
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    address: '',
    streetAddress: '',
    city: '',
    zipCode: '',
    country: 'Portugal',
    latitude: undefined,
    longitude: undefined,
    addressVerified: false,
    buildingId: undefined,
    buildingName: '',
    type: 'apartment',
    bedrooms: 1,
    bathrooms: 1,
    rent: 0,
    status: 'vacant',
    description: '',
  });

  // Initialize form data when property changes
  useState(() => {
    if (property) {
      setFormData({
        name: property.name,
        address: property.address,
        streetAddress: property.streetAddress || '',
        city: property.city || '',
        zipCode: property.zipCode || '',
        country: (property.country as 'Portugal' | 'Spain') || 'Portugal',
        latitude: property.latitude,
        longitude: property.longitude,
        addressVerified: property.addressVerified || false,
        buildingId: property.buildingId,
        buildingName: property.buildingName || '',
        type: property.type,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        rent: property.rent,
        status: property.status,
        description: property.description || '',
      });
    }
  });

  if (!property) return null;

  const getStatusBadge = (status: Property["status"]) => {
    const colors = {
      occupied: "bg-success/20 text-success border-success/30",
      vacant: "bg-amber-600/20 text-amber-400 border-amber-600/30",
      maintenance: "bg-orange-600/20 text-orange-400 border-orange-600/30",
    };
    return (
      <Badge className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleSave = async () => {
    try {
      const validated = propertySchema.parse(formData);
      await updateProperty(property.id, validated);
      success('Property updated successfully');
      setIsEditing(false);
      if (onEdit) {
        onEdit({ ...property, ...validated });
      }
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error('Failed to update property');
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    
    try {
      await deleteProperty(property.id);
      success('Property deleted successfully');
      onClose();
      if (onDelete) {
        onDelete(property.id);
      }
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error('Failed to delete property');
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      name: property.name,
      address: property.address,
      streetAddress: property.streetAddress || '',
      city: property.city || '',
      zipCode: property.zipCode || '',
      country: (property.country as 'Portugal' | 'Spain') || 'Portugal',
      latitude: property.latitude,
      longitude: property.longitude,
      addressVerified: property.addressVerified || false,
      buildingId: property.buildingId,
      buildingName: property.buildingName || '',
      type: property.type,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      rent: property.rent,
      status: property.status,
      description: property.description || '',
    });
    setIsEditing(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-2xl text-[var(--color-foreground)] flex items-center gap-2">
                  <Building2 className="h-6 w-6" />
                  {isEditing ? 'Edit Property' : property.name}
                </DialogTitle>
                <DialogDescription>
                  {isEditing ? 'Update property information' : property.address}
                </DialogDescription>
              </div>
              {!isEditing && (
                <div className="flex items-center gap-2">
                  {getStatusBadge(property.status)}
                  {property.addressVerified && (
                    <Badge className="bg-success/20 text-success border-success/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          {isEditing ? (
            // Edit Mode - Grouped
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Basic Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Property Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Short Description</Label>
                      <Textarea
                        id="description"
                        rows={2}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Financial</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
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
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value as Property['status'] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vacant">Vacant</SelectItem>
                          <SelectItem value="occupied">Occupied</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Address</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-2">
                      <Label htmlFor="address">Full Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="streetAddress">Street Address</Label>
                        <Input
                          id="streetAddress"
                          value={formData.streetAddress}
                          onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">Postal Code</Label>
                        <Input
                          id="zipCode"
                          value={formData.zipCode}
                          onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Select
                          value={formData.country}
                          onValueChange={(value) => setFormData({ ...formData, country: value as 'Portugal' | 'Spain' })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Portugal">Portugal</SelectItem>
                            <SelectItem value="Spain">Spain</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Physical Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value as Property['type'] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="house">House</SelectItem>
                          <SelectItem value="studio">Studio</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bedrooms">Bedrooms</Label>
                        <Input
                          id="bedrooms"
                          type="number"
                          min="0"
                          value={formData.bedrooms}
                          onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bathrooms">Bathrooms</Label>
                        <Input
                          id="bathrooms"
                          type="number"
                          min="0"
                          value={formData.bathrooms}
                          onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
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
            // View Mode
            <div className="space-y-6">
              {/* Property Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Location</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-zinc-500 mt-1" />
                      <div className="text-sm">
                        <p className="text-[var(--color-foreground)]">{property.streetAddress || property.address}</p>
                        <p className="text-zinc-400">{property.city}, {property.zipCode}</p>
                        <p className="text-zinc-400">{property.country}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Property Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Type</span>
                      <span className="text-[var(--color-foreground)] capitalize">{property.type}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400 flex items-center gap-1">
                        <Bed className="h-4 w-4" /> Bedrooms
                      </span>
                      <span className="text-[var(--color-foreground)]">{property.bedrooms}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400 flex items-center gap-1">
                        <Bath className="h-4 w-4" /> Bathrooms
                      </span>
                      <span className="text-[var(--color-foreground)]">{property.bathrooms}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-zinc-700">
                      <span className="text-zinc-400">Monthly Rent</span>
                      <span className="text-lg font-semibold text-[var(--color-foreground)]">
                        {formatCurrency(property.rent)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Description */}
              {property.description && (
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--color-foreground)]">{property.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Units Section */}
              {property.buildingId && (
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-zinc-400">Building Units</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUnits(!showUnits)}
                        className="flex items-center gap-1"
                      >
                        {showUnits ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        {showUnits ? 'Hide' : 'Show'} Units
                      </Button>
                    </div>
                  </CardHeader>
                  {showUnits && (
                    <CardContent>
                      <UnitsView propertyId={property.id} />
                    </CardContent>
                  )}
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
                  Delete Property
                </Button>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1"
                >
                  <Edit className="w-4 h-4" />
                  Edit Property
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
