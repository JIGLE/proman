"use client";

import { useState, useMemo } from "react";
import { Building2, MapPin, Bed, Bath, Plus, Edit, Trash2, CheckCircle, AlertTriangle, Wrench, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";
import { motion, AnimatePresence } from "framer-motion";
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
import { Property } from "@/lib/types";
import { propertySchema, PropertyFormData } from "@/lib/validation";
import { useToast } from "@/lib/toast-context";
import { useFormDialog } from "@/lib/hooks/use-form-dialog";
import { useSortableData, SortDirection } from "@/lib/hooks/use-sortable-data";
import { AddressVerificationService, AddressSuggestion } from "@/lib/address-verification";

export type PropertiesViewProps = Record<string, never>

interface SortableHeaderProps {
  column: keyof Property;
  label: string;
  sortDirection: SortDirection;
  onSort: (column: keyof Property) => void;
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

export function PropertiesView(): React.ReactElement {
  const { state, addProperty, updateProperty, deleteProperty } = useApp();
  const { properties, loading } = state;
  const { success } = useToast();
  const { formatCurrency } = useCurrency();

  // Address verification state
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form dialog hook
  const initialFormData: PropertyFormData = {
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
  };

  const dialog = useFormDialog<PropertyFormData, Property>({
    schema: propertySchema,
    initialData: initialFormData,
    onSubmit: async (data, isEdit) => {
      if (isEdit && dialog.editingItem) {
        await updateProperty(dialog.editingItem.id, data);
      } else {
        await addProperty(data);
      }
    },
    successMessage: {
      create: 'Property added successfully!',
      update: 'Property updated successfully!',
    },
  });

  // Filter and search properties
  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      // Search filter (name, address)
      const matchesSearch = searchQuery.length === 0 || 
        property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.address.toLowerCase().includes(searchQuery.toLowerCase());

      // Type filter
      const matchesType = typeFilter === 'all' || property.type === typeFilter;

      // Status filter
      const matchesStatus = statusFilter === 'all' || property.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [properties, searchQuery, typeFilter, statusFilter]);

  // Sorting
  const { sortedData: sortedProperties, requestSort, getSortDirection } = useSortableData(filteredProperties);

  // Group properties by building
  const groupedProperties = sortedProperties.reduce((acc, property) => {
    const buildingId = property.buildingId || property.id; // Fallback to property ID for ungrouped
    if (!acc[buildingId]) {
      acc[buildingId] = {
        buildingId,
        buildingName: property.buildingName || property.address.split(',')[0],
        buildingAddress: property.address,
        properties: [],
      };
    }
    acc[buildingId].properties.push(property);
    return acc;
  }, {} as Record<string, { buildingId: string; buildingName: string; buildingAddress: string; properties: Property[] }>);

  const buildingGroups = Object.values(groupedProperties);

  // Address verification functions
  const handleAddressSearch = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const suggestions = await AddressVerificationService.searchAddresses(query, dialog.formData.country as 'Portugal' | 'Spain');
      setAddressSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Address search failed:', error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    const verifiedAddress = AddressVerificationService.parseAddressSuggestion(suggestion);
    const buildingId = AddressVerificationService.generateBuildingId(
      verifiedAddress.streetAddress,
      verifiedAddress.city,
      verifiedAddress.zipCode
    );

    dialog.updateFormData({
      address: suggestion.display_name,
      streetAddress: verifiedAddress.streetAddress,
      city: verifiedAddress.city,
      zipCode: verifiedAddress.zipCode,
      country: verifiedAddress.country as 'Portugal' | 'Spain',
      latitude: verifiedAddress.latitude,
      longitude: verifiedAddress.longitude,
      addressVerified: verifiedAddress.verified,
      buildingId,
    });

    setAddressSuggestions([]);
    setShowSuggestions(false);
  };

  const getStatusBadge = (status: Property["status"]) => {
    switch (status) {
      case "occupied":
        return (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-success/20 text-success-foreground border border-success/30"
          >
            <CheckCircle className="h-3 w-3" />
            Occupied
          </motion.div>
        );
      case "vacant":
        return (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border"
          >
            <Building2 className="h-3 w-3" />
            Vacant
          </motion.div>
        );
      case "maintenance":
        return (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-warning/20 text-warning-foreground border border-warning/30 animate-pulse-gentle"
          >
            <Wrench className="h-3 w-3" />
            Maintenance
          </motion.div>
        );
      default:
        return (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-accent text-accent-foreground border border-border"
          >
            {status}
          </motion.div>
        );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    await dialog.handleSubmit(e);
  };

  const handleEdit = (property: Property) => {
    dialog.openEditDialog(property, (prop) => ({
      name: prop.name,
      address: prop.address,
      streetAddress: prop.streetAddress || '',
      city: prop.city || '',
      zipCode: prop.zipCode || '',
      country: (prop.country as 'Portugal' | 'Spain') || 'Portugal',
      latitude: prop.latitude,
      longitude: prop.longitude,
      addressVerified: prop.addressVerified || false,
      buildingId: prop.buildingId,
      buildingName: prop.buildingName || '',
      type: prop.type,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      rent: prop.rent,
      status: prop.status,
      description: prop.description || '',
    }));
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      try {
        await deleteProperty(id);
        success('Property deleted successfully!');
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <>
      {loading ? (
        <LoadingState variant="cards" count={6} />
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
                Properties
              </h2>
              <p className="text-zinc-400">Manage your property portfolio</p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton
                data={sortedProperties}
                filename="properties"
                columns={[
                  { key: 'name', label: 'Property Name' },
                  { key: 'type', label: 'Type' },
                  { key: 'address', label: 'Address' },
                  { key: 'bedrooms', label: 'Bedrooms' },
                  { key: 'bathrooms', label: 'Bathrooms' },
                  { 
                    key: 'rent', 
                    label: 'Monthly Rent',
                    format: (value) => formatCurrency(value)
                  },
                  { key: 'status', label: 'Status' },
                  { key: 'buildingName', label: 'Building' },
                ]}
              />
            <Dialog open={dialog.isOpen} onOpenChange={(open) => !open && dialog.closeDialog()}>
              <DialogTrigger asChild>
                <Button onClick={dialog.openDialog} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Property
                </Button>
              </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-zinc-50">
                {dialog.editingItem ? 'Edit Property' : 'Add New Property'}
              </DialogTitle>
              <DialogDescription>
                {dialog.editingItem ? 'Update property details' : 'Enter property information'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={dialog.handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Property Name</Label>
                  <Input
                    id="name"
                    value={dialog.formData.name}
                    onChange={(e) => dialog.updateFormData({ name: e.target.value })}
                    className={dialog.formErrors.name ? 'border-red-500' : ''}
                  />
                  {dialog.formErrors.name && (
                    <p className="text-sm text-red-400">{dialog.formErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Property Type</Label>
                  <Select value={dialog.formData.type} onValueChange={(value: PropertyFormData['type']) => dialog.updateFormData({ type: value })}>
                    <SelectTrigger className={dialog.formErrors.type ? 'border-red-500' : ''}>
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
                  {dialog.formErrors.type && (
                    <p className="text-sm text-red-400">{dialog.formErrors.type}</p>
                  )}
                </div>
              </div>

              {/* Enhanced Address Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Address Information</Label>
                  {dialog.formData.addressVerified && (
                    <span className="text-sm text-green-500 flex items-center gap-1">
                      ✓ Verified
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Full Address Search</Label>
                  <div className="relative">
                    <Input
                      id="address"
                      placeholder="Start typing to search addresses..."
                      value={dialog.formData.address}
                      onChange={(e) => {
                        dialog.updateFormData({ address: e.target.value });
                        handleAddressSearch(e.target.value);
                      }}
                      className={dialog.formErrors.address ? 'border-red-500' : ''}
                    />
                    {showSuggestions && addressSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full bg-zinc-800 border border-zinc-600 rounded-md mt-1 max-h-60 overflow-y-auto">
                        {addressSuggestions.map((suggestion, index) => (
                          <button
                            key={suggestion.place_id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-zinc-700 first:rounded-t-md last:rounded-b-md"
                            onClick={() => handleAddressSelect(suggestion)}
                          >
                            <div className="text-sm text-zinc-200">{suggestion.display_name}</div>
                            <div className="text-xs text-zinc-400">
                              {suggestion.address.postcode && `${suggestion.address.postcode}, `}
                              {suggestion.address.city || suggestion.address.municipality}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {dialog.formErrors.address && (
                    <p className="text-sm text-red-400">{dialog.formErrors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={dialog.formData.country}
                      onValueChange={(value) => dialog.updateFormData({ country: value as 'Portugal' | 'Spain' })}
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

                  <div className="space-y-2">
                    <Label htmlFor="zipCode">Postal Code</Label>
                    <Input
                      id="zipCode"
                      placeholder={dialog.formData.country === 'Portugal' ? '1234-567' : '12345'}
                      value={dialog.formData.zipCode || ''}
                      onChange={(e) => dialog.updateFormData({ zipCode: e.target.value })}
                      className={dialog.formErrors.zipCode ? 'border-red-500' : ''}
                    />
                    {dialog.formErrors.zipCode && (
                      <p className="text-sm text-red-400">{dialog.formErrors.zipCode}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={dialog.formData.city || ''}
                      onChange={(e) => dialog.updateFormData({ city: e.target.value })}
                      className={dialog.formErrors.city ? 'border-red-500' : ''}
                    />
                    {dialog.formErrors.city && (
                      <p className="text-sm text-red-400">{dialog.formErrors.city}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="streetAddress">Street Address</Label>
                    <Input
                      id="streetAddress"
                      value={dialog.formData.streetAddress || ''}
                      onChange={(e) => dialog.updateFormData({ streetAddress: e.target.value })}
                      className={dialog.formErrors.streetAddress ? 'border-red-500' : ''}
                    />
                    {dialog.formErrors.streetAddress && (
                      <p className="text-sm text-red-400">{dialog.formErrors.streetAddress}</p>
                    )}
                  </div>
                </div>

                {dialog.formData.buildingId && (
                  <div className="space-y-2">
                    <Label htmlFor="buildingName">Building Name (Optional)</Label>
                    <Input
                      id="buildingName"
                      placeholder="e.g., Downtown Apartments"
                      value={dialog.formData.buildingName || ''}
                      onChange={(e) => dialog.updateFormData({ buildingName: e.target.value })}
                    />
                  </div>
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
                    value={dialog.formData.bedrooms}
                    onChange={(e) => dialog.updateFormData({ bedrooms: parseInt(e.target.value) || 0 })}
                    className={dialog.formErrors.bedrooms ? 'border-red-500' : ''}
                  />
                  {dialog.formErrors.bedrooms && (
                    <p className="text-sm text-red-400">{dialog.formErrors.bedrooms}</p>
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
                    value={dialog.formData.bathrooms}
                    onChange={(e) => dialog.updateFormData({ bathrooms: parseFloat(e.target.value) || 0 })}
                    className={dialog.formErrors.bathrooms ? 'border-red-500' : ''}
                  />
                  {dialog.formErrors.bathrooms && (
                    <p className="text-sm text-red-400">{dialog.formErrors.bathrooms}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rent">Monthly Rent ($)</Label>
                  <Input
                    id="rent"
                    type="number"
                    min="0"
                    value={dialog.formData.rent}
                    onChange={(e) => dialog.updateFormData({ rent: parseInt(e.target.value) || 0 })}
                    className={dialog.formErrors.rent ? 'border-red-500' : ''}
                  />
                  {dialog.formErrors.rent && (
                    <p className="text-sm text-red-400">{dialog.formErrors.rent}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={dialog.formData.status} onValueChange={(value: PropertyFormData['status']) => dialog.updateFormData({ status: value })}>
                    <SelectTrigger className={dialog.formErrors.status ? 'border-red-500' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacant">Vacant</SelectItem>
                      <SelectItem value="occupied">Occupied</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  {dialog.formErrors.status && (
                    <p className="text-sm text-red-400">{dialog.formErrors.status}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={dialog.formData.description}
                  onChange={(e) => dialog.updateFormData({ description: e.target.value })}
                  rows={3}
                  className={dialog.formErrors.description ? 'border-red-500' : ''}
                />
                {dialog.formErrors.description && (
                  <p className="text-sm text-red-400">{dialog.formErrors.description}</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={dialog.closeDialog} disabled={dialog.isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={dialog.isSubmitting}>
                  {dialog.isSubmitting ? 'Saving...' : (dialog.editingItem ? 'Update Property' : 'Add Property')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
            </div>
          </div>

          {/* Search and Filter */}
          <SearchFilter
            searchPlaceholder="Search properties by name or address..."
            onSearchChange={setSearchQuery}
            onFilterChange={(key, value) => {
              if (key === 'type') setTypeFilter(value);
              if (key === 'status') setStatusFilter(value);
            }}
            filters={[
              {
                key: 'type',
                label: 'Type',
                options: [
                  { label: 'All Types', value: 'all' },
                  { label: 'Apartment', value: 'apartment' },
                  { label: 'House', value: 'house' },
                  { label: 'Commercial', value: 'commercial' },
                  { label: 'Land', value: 'land' },
                  { label: 'Other', value: 'other' }
                ],
                defaultValue: 'all'
              },
              {
                key: 'status',
                label: 'Status',
                options: [
                  { label: 'All Statuses', value: 'all' },
                  { label: 'Occupied', value: 'occupied' },
                  { label: 'Vacant', value: 'vacant' },
                  { label: 'Maintenance', value: 'maintenance' }
                ],
                defaultValue: 'all'
              }
            ]}
          />

          {/* Sortable Column Headers */}
          {filteredProperties.length > 0 && (
            <div className="flex items-center gap-4 px-4 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="flex-1">
                <SortableHeader column="name" label="Property" sortDirection={getSortDirection('name')} onSort={requestSort} />
              </div>
              <div className="w-32">
                <SortableHeader column="type" label="Type" sortDirection={getSortDirection('type')} onSort={requestSort} />
              </div>
              <div className="w-32">
                <SortableHeader column="status" label="Status" sortDirection={getSortDirection('status')} onSort={requestSort} />
              </div>
              <div className="w-32">
                <SortableHeader column="rent" label="Rent" sortDirection={getSortDirection('rent')} onSort={requestSort} />
              </div>
            </div>
          )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProperties.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800 col-span-full">
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-50 mb-2">
                {properties.length === 0 ? 'No properties yet' : 'No properties found'}
              </h3>
              <p className="text-zinc-400 mb-4">
                {properties.length === 0 
                  ? 'Get started by adding your first property' 
                  : 'Try adjusting your search or filters'}
              </p>
              {properties.length === 0 && (
                <Button onClick={dialog.openDialog} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Your First Property
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          buildingGroups.map((building) => (
            <div key={building.buildingId} className="space-y-4">
              {/* Building Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="bg-zinc-800 border-zinc-700 hover:border-accent-primary/30 transition-colors duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <motion.div
                          className="text-zinc-50 flex items-center gap-2"
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          <Building2 className="h-5 w-5" />
                          <CardTitle className="text-lg">{building.buildingName}</CardTitle>
                        </motion.div>
                        <motion.div
                          className="flex items-start gap-1 mt-1"
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-zinc-500" />
                          <CardDescription className="text-sm">{building.buildingAddress}</CardDescription>
                        </motion.div>
                      </div>
                      <motion.div
                        className="text-sm text-zinc-400 bg-zinc-700 px-3 py-1 rounded-full"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                      >
                        {building.properties.length} unit{building.properties.length !== 1 ? 's' : ''}
                      </motion.div>
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>

              {/* Properties in this building */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {building.properties.map((property, index) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    whileHover={{ y: -4 }}
                    className="group"
                  >
                    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-accent-primary/10 border-border/50 group-hover:border-accent-primary/30">
                      <div className="aspect-video w-full bg-gradient-to-br from-zinc-800 to-zinc-900 relative overflow-hidden">
                        <motion.div
                          className="absolute inset-0 flex items-center justify-center"
                          whileHover={{ scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Building2 className="h-12 w-12 text-zinc-700 group-hover:text-zinc-600 transition-colors duration-300" />
                        </motion.div>
                        <div className="absolute top-3 right-3">
                          {getStatusBadge(property.status)}
                        </div>
                        {property.addressVerified && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute bottom-3 right-3 bg-success/20 rounded-full p-1"
                          >
                            <CheckCircle className="h-4 w-4 text-success" />
                          </motion.div>
                        )}
                      </div>
                    <CardHeader>
                      <CardTitle className="text-zinc-50 text-base">{property.name}</CardTitle>
                      <CardDescription className="flex items-start gap-1">
                        <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                        <span className="text-xs">{property.streetAddress || 'Unit address'}</span>
                      </CardDescription>
                    </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">{property.type}</span>
                          <motion.span
                            className="font-semibold text-zinc-50"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2 }}
                          >
                            {formatCurrency(property.rent)}/mo
                          </motion.span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-400">
                          <motion.div
                            className="flex items-center gap-1"
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                          >
                            <Bed className="h-4 w-4" />
                            <span>{property.bedrooms} bed</span>
                          </motion.div>
                          <motion.div
                            className="flex items-center gap-1"
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                          >
                            <Bath className="h-4 w-4" />
                            <span>{property.bathrooms} bath</span>
                          </motion.div>
                        </div>
                        <motion.div
                          className="flex gap-2 pt-2"
                          initial={{ y: 10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.5 }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(property)}
                            className="flex-1 flex items-center gap-1 transition-all duration-200 hover:bg-accent-primary hover:text-accent-primary-foreground hover:border-accent-primary"
                          >
                            <Edit className="w-3 h-3" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(property.id)}
                            className="flex items-center gap-1 transition-all duration-200 hover:bg-destructive/90"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </Button>
                        </motion.div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
        </div>      </div>      )}
    </>
  );
}
