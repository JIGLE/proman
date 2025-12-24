"use client";

import { useState } from "react";
import { Building2, MapPin, Bed, Bath, Plus, Edit, Trash2, DollarSign } from "lucide-react";
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
import { Property } from "@/lib/types";
import { propertySchema, PropertyFormData } from "@/lib/validation";
import { useToast } from "@/lib/toast-context";

export function PropertiesView() {
  const { state, addProperty, updateProperty, deleteProperty } = useApp();
  const { properties, loading } = state;
  const { success, error } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    address: '',
    type: 'apartment',
    bedrooms: 1,
    bathrooms: 1,
    rent: 0,
    status: 'vacant',
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<PropertyFormData>>({});

  const getStatusBadge = (status: Property["status"]) => {
    switch (status) {
      case "occupied":
        return <Badge variant="success">Occupied</Badge>;
      case "vacant":
        return <Badge variant="secondary">Vacant</Badge>;
      case "maintenance":
        return <Badge variant="destructive">Maintenance</Badge>;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});

    try {
      // Validate form data
      const validatedData = propertySchema.parse(formData);

      if (editingProperty) {
        await updateProperty(editingProperty.id, validatedData);
        success('Property updated successfully!');
      } else {
        await addProperty(validatedData);
        success('Property added successfully!');
      }

      setIsDialogOpen(false);
      setEditingProperty(null);
      resetForm();
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') {
        // Handle validation errors
        const errors: Partial<PropertyFormData> = {};
        (err as any).errors.forEach((error: any) => {
          const field = error.path[0] as keyof PropertyFormData;
          errors[field] = error.message;
        });
        setFormErrors(errors);
        error('Please fix the form errors below.');
      } else {
        error('Failed to save property. Please try again.');
        console.error('Property save error:', err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      address: property.address,
      type: property.type,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      rent: property.rent,
      status: property.status,
      description: property.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      try {
        await deleteProperty(id);
        success('Property deleted successfully!');
      } catch (err) {
        // Error is already handled in the context
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      type: 'apartment',
      bedrooms: 1,
      bathrooms: 1,
      rent: 0,
      status: 'vacant',
      description: '',
    });
    setFormErrors({});
  };

  const openAddDialog = () => {
    setEditingProperty(null);
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="text-zinc-400">Loading properties...</div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
            Properties
          </h2>
          <p className="text-zinc-400">Manage your property portfolio</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Property
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-zinc-50">
                {editingProperty ? 'Edit Property' : 'Add New Property'}
              </DialogTitle>
              <DialogDescription>
                {editingProperty ? 'Update property details' : 'Enter property information'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Property Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={formErrors.name ? 'border-red-500' : ''}
                  />
                  {formErrors.name && (
                    <p className="text-sm text-red-400">{formErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Property Type</Label>
                  <Select value={formData.type} onValueChange={(value: PropertyFormData['type']) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className={formErrors.type ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="condo">Condo</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.type && (
                    <p className="text-sm text-red-400">{formErrors.type}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={formErrors.address ? 'border-red-500' : ''}
                />
                {formErrors.address && (
                  <p className="text-sm text-red-400">{formErrors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min="0"
                    max="20"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                    className={formErrors.bedrooms ? 'border-red-500' : ''}
                  />
                  {formErrors.bedrooms && (
                    <p className="text-sm text-red-400">{formErrors.bedrooms}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) || 0 })}
                    className={formErrors.bathrooms ? 'border-red-500' : ''}
                  />
                  {formErrors.bathrooms && (
                    <p className="text-sm text-red-400">{formErrors.bathrooms}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rent">Monthly Rent ($)</Label>
                  <Input
                    id="rent"
                    type="number"
                    min="0"
                    value={formData.rent}
                    onChange={(e) => setFormData({ ...formData, rent: parseInt(e.target.value) || 0 })}
                    className={formErrors.rent ? 'border-red-500' : ''}
                  />
                  {formErrors.rent && (
                    <p className="text-sm text-red-400">{formErrors.rent}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: PropertyFormData['status']) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className={formErrors.status ? 'border-red-500' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacant">Vacant</SelectItem>
                      <SelectItem value="occupied">Occupied</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.status && (
                    <p className="text-sm text-red-400">{formErrors.status}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className={formErrors.description ? 'border-red-500' : ''}
                />
                {formErrors.description && (
                  <p className="text-sm text-red-400">{formErrors.description}</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (editingProperty ? 'Update Property' : 'Add Property')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {properties.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800 col-span-full">
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-50 mb-2">No properties yet</h3>
              <p className="text-zinc-400 mb-4">Get started by adding your first property</p>
              <Button onClick={openAddDialog} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Property
              </Button>
            </CardContent>
          </Card>
        ) : (
          properties.map((property) => (
            <Card
              key={property.id}
              className="overflow-hidden transition-all hover:shadow-lg hover:shadow-zinc-900/50"
            >
              <div className="aspect-video w-full bg-gradient-to-br from-zinc-800 to-zinc-900 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building2 className="h-16 w-16 text-zinc-700" />
                </div>
                <div className="absolute top-3 right-3">
                  {getStatusBadge(property.status)}
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-zinc-50">{property.name}</CardTitle>
                <CardDescription className="flex items-start gap-1">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="text-xs">{property.address}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{property.type}</span>
                  <span className="font-semibold text-zinc-50">
                    ${property.rent.toLocaleString()}/mo
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Bed className="h-4 w-4" />
                    <span>{property.bedrooms} bed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    <span>{property.bathrooms} bath</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(property)}
                    className="flex-1 flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(property.id)}
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
