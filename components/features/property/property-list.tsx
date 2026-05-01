"use client";

import { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  Building2,
  MapPin,
  CheckCircle,
  Wrench,
  ChevronDown,
  Plus,
  ExternalLink,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { SortableHeader } from "@/components/ui/sortable-header";
import { getCountryName, resolveCountryCode } from "@/lib/utils/country";
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
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { SearchFilter } from "@/components/ui/search-filter";
import { cn } from "@/lib/utils/utils";
import { BulkActionBar, getDefaultBulkActions } from "@/components/ui/bulk-action-bar";
import { Checkbox } from "@/components/ui/checkbox";
import { useBulkSelection } from "@/lib/hooks/use-bulk-selection";
import { useApp } from "@/lib/contexts/app-context";
import { RelationshipBadge } from "@/components/shared/relationship-badge";
import { Property } from "@/lib/types";
import { propertySchema, type PropertyFormData } from "@/lib/schemas/property.schema";
import { useToast } from "@/lib/contexts/toast-context";
import { useFormDialog } from "@/lib/hooks/use-form-dialog";
import { useSortableData } from "@/lib/hooks/use-sortable-data";
import { useConfirmDialog } from "@/lib/hooks/use-confirm-dialog";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { AddressVerificationService, AddressSuggestion } from "@/lib/utils/address-verification";
import PropertyMap from "./property-map";
import { PropertyDetailModal } from "./property-detail-modal";
import { PageHeader } from "@/components/shared/page-header";

export type PropertiesViewProps = {
  viewMode?: "list" | "map";
  onPropertySelect?: (propertyId: string) => void;
  onLocateOnMap?: (propertyId: string) => void;
  highlightedPropertyId?: string;
  density?: "comfortable" | "compact";
  showPageHeader?: boolean;
};

export type PropertiesViewRef = {
  openDialog: () => void;
};

export const PropertiesView = forwardRef<PropertiesViewRef, PropertiesViewProps>(
  function PropertiesView(
    {
      viewMode = "list",
      onPropertySelect,
      onLocateOnMap,
      highlightedPropertyId,
      showPageHeader = true,
    }: PropertiesViewProps,
    ref,
  ): React.ReactElement {
    const { state, addProperty, updateProperty, deleteProperty } = useApp();
    const { properties = [], tenants = [], leases = [], maintenance = [], loading } = state;
    const { success } = useToast();
    const { formatCurrency, currencySymbol } = useCurrency();
    const router = useRouter();
    const pathname = usePathname();
    const locale = pathname.split("/")[1] || "pt";
    const confirmDialog = useConfirmDialog();
    // Property detail modal state
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Form UI state — collapsible sections
    const [showManualFields, setShowManualFields] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    // Address verification state
    const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Data view mode state with localStorage persistence
    const [dataViewMode, setDataViewMode] = useState<DataViewMode>("grid");
    useEffect(() => {
      const saved = localStorage.getItem("proman-properties-view-mode");
      if (saved === "grid" || saved === "table") setDataViewMode(saved);
    }, []);
    const handleViewModeChange = useCallback((mode: DataViewMode) => {
      setDataViewMode(mode);
      localStorage.setItem("proman-properties-view-mode", mode);
    }, []);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [operationalFilter, setOperationalFilter] = useState<string>("all");

    // Collapsible building sections
    const [collapsedBuildings, setCollapsedBuildings] = useState<Set<string>>(new Set());
    const toggleBuilding = useCallback((buildingId: string) => {
      setCollapsedBuildings((prev) => {
        const next = new Set(prev);
        if (next.has(buildingId)) next.delete(buildingId);
        else next.add(buildingId);
        return next;
      });
    }, []);

    const activeLeasePropertyIds = useMemo(() => {
      return new Set(
        leases.filter((lease) => lease.status === "active").map((lease) => lease.propertyId),
      );
    }, [leases]);

    const expiringLeasePropertyIds = useMemo(() => {
      const now = new Date();
      const inThirtyDays = new Date();
      inThirtyDays.setDate(inThirtyDays.getDate() + 30);

      return new Set(
        leases
          .filter((lease) => {
            if (lease.status !== "active") return false;
            const endDate = new Date(lease.endDate);
            return endDate >= now && endDate <= inThirtyDays;
          })
          .map((lease) => lease.propertyId),
      );
    }, [leases]);

    const openMaintenancePropertyIds = useMemo(() => {
      return new Set(
        maintenance
          .filter((ticket) => ticket.status === "open" || ticket.status === "in_progress")
          .map((ticket) => ticket.propertyId),
      );
    }, [maintenance]);

    const missingMapPropertyIds = useMemo(() => {
      return new Set(
        properties
          .filter(
            (property) =>
              typeof property.latitude !== "number" || typeof property.longitude !== "number",
          )
          .map((property) => property.id),
      );
    }, [properties]);

    const occupiedWithoutActiveLeaseIds = useMemo(() => {
      return new Set(
        properties
          .filter(
            (property) =>
              property.status === "occupied" && !activeLeasePropertyIds.has(property.id),
          )
          .map((property) => property.id),
      );
    }, [activeLeasePropertyIds, properties]);

    const needsAttentionPropertyIds = useMemo(() => {
      return new Set([
        ...expiringLeasePropertyIds,
        ...openMaintenancePropertyIds,
        ...occupiedWithoutActiveLeaseIds,
      ]);
    }, [expiringLeasePropertyIds, openMaintenancePropertyIds, occupiedWithoutActiveLeaseIds]);

    // Form dialog hook
    const initialFormData: PropertyFormData = {
      name: "",
      address: "",
      streetAddress: "",
      city: "",
      zipCode: "",
      country: "PT",
      latitude: undefined,
      longitude: undefined,
      addressVerified: false,
      buildingId: undefined,
      buildingName: "",
      type: "apartment",
      bedrooms: 1,
      bathrooms: 1,
      rent: 0,
      status: "vacant",
      description: "",
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
        create: "Property added successfully!",
        update: "Property updated successfully!",
      },
      validation: { validateOnChange: true, debounceValidation: 300 },
    });

    // Expose dialog methods to parent via ref
    useImperativeHandle(ref, () => ({
      openDialog: dialog.openDialog,
    }));

    // Reset collapsible sections when dialog closes
    useEffect(() => {
      if (!dialog.isOpen) {
        setShowManualFields(false);
        setShowDetails(false);
      }
      // On edit, auto-expand details if the property already has them filled
      if (dialog.isOpen && dialog.editingItem) {
        const item = dialog.editingItem;
        if (item.bedrooms > 1 || item.bathrooms > 1 || item.description) {
          setShowDetails(true);
        }
      }
    }, [dialog.isOpen, dialog.editingItem]);

    // Filter and search properties
    const filteredProperties = useMemo(() => {
      return properties.filter((property) => {
        // Search filter (name, address)
        const matchesSearch =
          searchQuery.length === 0 ||
          property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          property.address.toLowerCase().includes(searchQuery.toLowerCase());

        // Type filter
        const matchesType = typeFilter === "all" || property.type === typeFilter;

        // Status filter
        const matchesStatus = statusFilter === "all" || property.status === statusFilter;

        // Operational filter
        const matchesOperational =
          operationalFilter === "all" ||
          (operationalFilter === "needs-attention" && needsAttentionPropertyIds.has(property.id)) ||
          (operationalFilter === "lease-renewal" && expiringLeasePropertyIds.has(property.id)) ||
          (operationalFilter === "open-maintenance" &&
            openMaintenancePropertyIds.has(property.id)) ||
          (operationalFilter === "missing-map" && missingMapPropertyIds.has(property.id));

        return matchesSearch && matchesType && matchesStatus && matchesOperational;
      });
    }, [
      properties,
      searchQuery,
      typeFilter,
      statusFilter,
      operationalFilter,
      needsAttentionPropertyIds,
      expiringLeasePropertyIds,
      openMaintenancePropertyIds,
      missingMapPropertyIds,
    ]);

    // Sorting
    const {
      sortedData: sortedProperties,
      requestSort,
      getSortDirection,
    } = useSortableData(filteredProperties);

    // Bulk selection hook
    const bulkSelection = useBulkSelection<Property>();

    const handleBulkDelete = useCallback(
      async (ids: string[]) => {
        confirmDialog.confirm(
          {
            title: "Delete Properties",
            description: `${ids.length} property(ies) and all associated data will be permanently removed. This action cannot be undone.`,
            confirmLabel: "Delete All",
            variant: "destructive",
            count: ids.length,
          },
          async () => {
            for (const id of ids) {
              await deleteProperty(id);
            }
            success(`Successfully deleted ${ids.length} property(ies)`);
            bulkSelection.clearSelection();
          },
        );
      },
      [deleteProperty, success, bulkSelection, confirmDialog],
    );

    const handleExportSelected = useCallback(
      (ids: string[]) => {
        const selected = properties.filter((p) => ids.includes(p.id));
        const csvContent = [
          ["Name", "Type", "Address", "Bedrooms", "Bathrooms", "Rent", "Status"].join(","),
          ...selected.map((p) =>
            [p.name, p.type, p.address, p.bedrooms, p.bathrooms, p.rent, p.status].join(","),
          ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `properties-export-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      [properties],
    );

    const bulkActions = useMemo(
      () =>
        getDefaultBulkActions({
          onDelete: handleBulkDelete,
          onExport: handleExportSelected,
        }),
      [handleBulkDelete, handleExportSelected],
    );

    // Group properties by building
    const groupedProperties = sortedProperties.reduce(
      (acc, property) => {
        const normalizedAddressKey = [
          property.streetAddress || property.address,
          property.city,
          property.zipCode,
        ]
          .filter(Boolean)
          .join("|")
          .toLowerCase();
        const groupingKey = property.buildingId || normalizedAddressKey || property.id;
        if (!acc[groupingKey]) {
          acc[groupingKey] = {
            buildingId: groupingKey,
            buildingName: property.buildingName || property.address.split(",")[0],
            buildingAddress: property.address,
            properties: [],
          };
        }
        acc[groupingKey].properties.push(property);
        return acc;
      },
      {} as Record<
        string,
        {
          buildingId: string;
          buildingName: string;
          buildingAddress: string;
          properties: Property[];
        }
      >,
    );

    type BuildingGroup = {
      buildingId: string;
      buildingName: string;
      buildingAddress: string;
      properties: Property[];
    };
    const buildingGroups: BuildingGroup[] = Object.values(groupedProperties);

    // Address verification functions
    const handleAddressSearch = async (query: string) => {
      if (query.length < 3) {
        setAddressSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const suggestions = await AddressVerificationService.searchAddresses(
          query,
          getCountryName(dialog.formData.country as "PT" | "ES") as "Portugal" | "Spain",
        );
        setAddressSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } catch (error) {
        console.error("Address search failed:", error);
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const handleAddressSelect = (suggestion: AddressSuggestion) => {
      const verifiedAddress = AddressVerificationService.parseAddressSuggestion(suggestion);

      dialog.updateFormData({
        address: suggestion.display_name,
        streetAddress: verifiedAddress.streetAddress,
        city: verifiedAddress.city,
        zipCode: verifiedAddress.zipCode,
        country: resolveCountryCode(verifiedAddress.country) as "PT" | "ES",
        latitude: verifiedAddress.latitude,
        longitude: verifiedAddress.longitude,
        addressVerified: verifiedAddress.verified,
        buildingId: undefined,
        buildingName: verifiedAddress.streetAddress,
      });

      setShowManualFields(false);
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

    const _handleSubmit = async (e: React.FormEvent) => {
      await dialog.handleSubmit(e);
    };

    const handleMapPropertySelect = useCallback(
      (propertyId: string) => {
        const selected = properties.find((property) => property.id === propertyId);
        if (!selected) return;
        setSelectedProperty(selected);
        setIsDetailModalOpen(true);
        onPropertySelect?.(selected.id);
      },
      [onPropertySelect, properties],
    );

    return (
      <>
        {loading ? (
          <LoadingState variant="cards" count={6} />
        ) : (
          <div className="space-y-6">
            {showPageHeader && (
              <PageHeader
                title="Portfolio"
                description="Manage your properties, occupancy, and rent coverage."
              />
            )}
            {/* Property Form Dialog */}
            <Dialog open={dialog.isOpen} onOpenChange={(open) => !open && dialog.closeDialog()}>
              <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                  <DialogTitle className="text-[var(--color-foreground)]">
                    {dialog.editingItem ? "Edit Property" : "Add New Property"}
                  </DialogTitle>
                  <DialogDescription>
                    {dialog.editingItem ? "Update property details" : "Enter property information"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={dialog.handleSubmit} className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Property Name</Label>
                        <Input
                          id="name"
                          placeholder="e.g. Apt 4B, Garden Flat, Unit 12"
                          value={dialog.formData.name}
                          onChange={(e) => dialog.updateFormData({ name: e.target.value })}
                          className={dialog.formErrors.name ? "border-red-500" : ""}
                        />
                        {dialog.formErrors.name && (
                          <p className="text-sm text-destructive">{dialog.formErrors.name}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Property Type</Label>
                        <Select
                          value={dialog.formData.type}
                          onValueChange={(value: PropertyFormData["type"]) =>
                            dialog.updateFormData({ type: value })
                          }
                        >
                          <SelectTrigger className={dialog.formErrors.type ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apartment">Apartment</SelectItem>
                            <SelectItem value="house">House</SelectItem>
                            <SelectItem value="condo">Condo</SelectItem>
                            <SelectItem value="townhouse">Townhouse</SelectItem>
                            <SelectItem value="commercial">Commercial</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {dialog.formErrors.type && (
                          <p className="text-sm text-destructive">{dialog.formErrors.type}</p>
                        )}
                      </div>
                    </div>

                    {/* Address Section */}
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="address">Address *</Label>
                          {dialog.formData.addressVerified && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-green-500 flex items-center gap-1">
                                ✓ Verified
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowManualFields((v) => !v)}
                                className="text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-2 min-h-[32px] px-1"
                              >
                                {showManualFields ? "Hide fields" : "Edit manually"}
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            id="address"
                            placeholder="Start typing to search addresses..."
                            value={dialog.formData.address}
                            onFocus={(e) =>
                              e.target.scrollIntoView({ behavior: "smooth", block: "center" })
                            }
                            onChange={(e) => {
                              dialog.updateFormData({ address: e.target.value });
                              handleAddressSearch(e.target.value);
                            }}
                            className={dialog.formErrors.address ? "border-red-500" : ""}
                          />
                          {showSuggestions && addressSuggestions.length > 0 && (
                            <div className="absolute z-10 w-full bg-zinc-800 border border-zinc-600 rounded-md mt-1 max-h-60 overflow-y-auto">
                              {addressSuggestions.map((suggestion, _index) => (
                                <button
                                  key={suggestion.place_id}
                                  type="button"
                                  className="w-full text-left px-3 py-2 hover:bg-zinc-700 first:rounded-t-md last:rounded-b-md"
                                  onClick={() => handleAddressSelect(suggestion)}
                                >
                                  <div className="text-sm text-zinc-200">
                                    {suggestion.display_name}
                                  </div>
                                  <div className="text-xs text-zinc-400">
                                    {suggestion.address.postcode &&
                                      `${suggestion.address.postcode}, `}
                                    {suggestion.address.city || suggestion.address.municipality}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {dialog.formErrors.address && (
                          <p className="text-sm text-destructive">{dialog.formErrors.address}</p>
                        )}
                      </div>

                      {/* Sub-fields: shown when not verified (user typed manually) or toggled open */}
                      {(showManualFields ||
                        (!dialog.formData.addressVerified &&
                          dialog.formData.address.length > 0)) && (
                        <div className="space-y-3 rounded-md border border-zinc-800 bg-zinc-950/50 p-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="country">Country</Label>
                              <Select
                                value={dialog.formData.country}
                                onValueChange={(value) =>
                                  dialog.updateFormData({
                                    country: value as "PT" | "ES",
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PT">Portugal</SelectItem>
                                  <SelectItem value="ES">Spain</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="zipCode">Postal Code</Label>
                              <Input
                                id="zipCode"
                                placeholder={
                                  dialog.formData.country === "PT" ? "1234-567" : "12345"
                                }
                                value={dialog.formData.zipCode || ""}
                                onChange={(e) => dialog.updateFormData({ zipCode: e.target.value })}
                                className={dialog.formErrors.zipCode ? "border-red-500" : ""}
                              />
                              {dialog.formErrors.zipCode && (
                                <p className="text-sm text-destructive">
                                  {dialog.formErrors.zipCode}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="city">City</Label>
                              <Input
                                id="city"
                                value={dialog.formData.city || ""}
                                onChange={(e) => dialog.updateFormData({ city: e.target.value })}
                                className={dialog.formErrors.city ? "border-red-500" : ""}
                              />
                              {dialog.formErrors.city && (
                                <p className="text-sm text-destructive">{dialog.formErrors.city}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="streetAddress">Street Address</Label>
                              <Input
                                id="streetAddress"
                                value={dialog.formData.streetAddress || ""}
                                onChange={(e) =>
                                  dialog.updateFormData({
                                    streetAddress: e.target.value,
                                  })
                                }
                                className={dialog.formErrors.streetAddress ? "border-red-500" : ""}
                              />
                              {dialog.formErrors.streetAddress && (
                                <p className="text-sm text-destructive">
                                  {dialog.formErrors.streetAddress}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {dialog.formData.buildingId && (
                        <div className="space-y-2">
                          <Label htmlFor="buildingName">Building Name (Optional)</Label>
                          <Input
                            id="buildingName"
                            placeholder="e.g., Downtown Apartments"
                            value={dialog.formData.buildingName || ""}
                            onChange={(e) =>
                              dialog.updateFormData({
                                buildingName: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rent">Monthly Rent ({currencySymbol})</Label>
                        <Input
                          id="rent"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={dialog.formData.rent || ""}
                          onChange={(e) =>
                            dialog.updateFormData({
                              rent: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={dialog.formErrors.rent ? "border-red-500" : ""}
                        />
                        {dialog.formErrors.rent && (
                          <p className="text-sm text-destructive">{dialog.formErrors.rent}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={dialog.formData.status}
                          onValueChange={(value: PropertyFormData["status"]) =>
                            dialog.updateFormData({ status: value })
                          }
                        >
                          <SelectTrigger
                            className={dialog.formErrors.status ? "border-red-500" : ""}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vacant">Vacant</SelectItem>
                            <SelectItem value="occupied">
                              {dialog.editingItem
                                ? "Occupied"
                                : "Occupied — I'll add the tenant next"}
                            </SelectItem>
                            {dialog.editingItem && (
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {dialog.formErrors.status && (
                          <p className="text-sm text-destructive">{dialog.formErrors.status}</p>
                        )}
                      </div>
                    </div>

                    {/* Optional details toggle */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowDetails((v) => !v)}
                        className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors min-h-[36px]"
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-150",
                            showDetails && "rotate-180",
                          )}
                        />
                        {showDetails
                          ? "Hide details"
                          : "Add details (bedrooms, bathrooms, description)"}
                      </button>

                      {showDetails && (
                        <div className="mt-3 space-y-3 rounded-md border border-zinc-800 bg-zinc-950/50 p-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="bedrooms">Bedrooms</Label>
                              <Input
                                id="bedrooms"
                                type="number"
                                min="0"
                                max="20"
                                value={dialog.formData.bedrooms}
                                onChange={(e) =>
                                  dialog.updateFormData({
                                    bedrooms: parseInt(e.target.value) || 0,
                                  })
                                }
                                className={dialog.formErrors.bedrooms ? "border-red-500" : ""}
                              />
                              {dialog.formErrors.bedrooms && (
                                <p className="text-sm text-destructive">
                                  {dialog.formErrors.bedrooms}
                                </p>
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
                                onChange={(e) =>
                                  dialog.updateFormData({
                                    bathrooms: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className={dialog.formErrors.bathrooms ? "border-red-500" : ""}
                              />
                              {dialog.formErrors.bathrooms && (
                                <p className="text-sm text-destructive">
                                  {dialog.formErrors.bathrooms}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={dialog.formData.description}
                              onChange={(e) =>
                                dialog.updateFormData({ description: e.target.value })
                              }
                              rows={3}
                              className={dialog.formErrors.description ? "border-red-500" : ""}
                            />
                            {dialog.formErrors.description && (
                              <p className="text-sm text-destructive">
                                {dialog.formErrors.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* end scrollable fields */}
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-zinc-800 px-6 py-4 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={dialog.closeDialog}
                      disabled={dialog.isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      loading={dialog.isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      {dialog.editingItem ? "Update Property" : "Create Property"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Conditional rendering based on viewMode prop */}
            {viewMode === "map" ? (
              <div className="space-y-6">
                <PropertyMap
                  highlightedPropertyId={highlightedPropertyId}
                  onSelectProperty={handleMapPropertySelect}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Slim operational filter strip */}
                <div className="hidden sm:flex items-center gap-2 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 scrollbar-none">
                  <span className="mr-1 shrink-0 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Filter
                  </span>
                  {[
                    { key: "all", label: "All", count: properties.length, color: "" },
                    {
                      key: "needs-attention",
                      label: "Needs attention",
                      count: needsAttentionPropertyIds.size,
                      color: "text-red-300",
                    },
                    {
                      key: "lease-renewal",
                      label: "Lease renewal",
                      count: expiringLeasePropertyIds.size,
                      color: "text-amber-300",
                    },
                    {
                      key: "open-maintenance",
                      label: "Maintenance",
                      count: openMaintenancePropertyIds.size,
                      color: "text-orange-300",
                    },
                    {
                      key: "missing-map",
                      label: "Missing map",
                      count: missingMapPropertyIds.size,
                      color: "text-blue-300",
                    },
                  ].map((opt) => {
                    const isActive = operationalFilter === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setOperationalFilter(opt.key)}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                          isActive
                            ? "bg-accent-primary text-white"
                            : "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200",
                        )}
                      >
                        {opt.label}
                        <span
                          className={cn(
                            "font-semibold",
                            isActive ? "text-white" : opt.color || "text-zinc-300",
                          )}
                        >
                          {opt.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search, Filter, and View Toggle */}
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <SearchFilter
                      searchPlaceholder="Search properties by name or address..."
                      onSearchChange={setSearchQuery}
                      onFilterChange={(key, value) => {
                        if (key === "type") setTypeFilter(value);
                        if (key === "status") setStatusFilter(value);
                      }}
                      filters={[
                        {
                          key: "type",
                          label: "Type",
                          options: [
                            { label: "All Types", value: "all" },
                            { label: "Apartment", value: "apartment" },
                            { label: "House", value: "house" },
                            { label: "Commercial", value: "commercial" },
                            { label: "Land", value: "land" },
                            { label: "Other", value: "other" },
                          ],
                          defaultValue: "all",
                        },
                        {
                          key: "status",
                          label: "Status",
                          options: [
                            { label: "All Statuses", value: "all" },
                            { label: "Occupied", value: "occupied" },
                            { label: "Vacant", value: "vacant" },
                            { label: "Maintenance", value: "maintenance" },
                          ],
                          defaultValue: "all",
                        },
                      ]}
                    />
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <DataViewToggle mode={dataViewMode} onChange={handleViewModeChange} />
                  </div>
                </div>

                {dataViewMode === "table" ? (
                  /* Table View */
                  filteredProperties.length === 0 ? (
                    <EmptyStateIllustration
                      type={properties.length === 0 ? "properties" : "generic"}
                      title={properties.length === 0 ? undefined : "No properties found"}
                      description={
                        properties.length === 0 ? undefined : "Try adjusting your search or filters"
                      }
                      onAction={properties.length === 0 ? dialog.openDialog : undefined}
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
                                onSort={(key) => requestSort(key as keyof Property)}
                              />
                            </TableHead>
                            <TableHead className="text-zinc-400">Address</TableHead>
                            <TableHead className="text-zinc-400">
                              <SortableHeader
                                sortKey="type"
                                label="Type"
                                currentSort={getSortDirection("type")}
                                onSort={(key) => requestSort(key as keyof Property)}
                              />
                            </TableHead>
                            <TableHead className="text-zinc-400">Bedrooms</TableHead>
                            <TableHead className="text-zinc-400">
                              <SortableHeader
                                sortKey="rent"
                                label="Rent"
                                currentSort={getSortDirection("rent")}
                                onSort={(key) => requestSort(key as keyof Property)}
                              />
                            </TableHead>
                            <TableHead className="text-zinc-400">
                              <SortableHeader
                                sortKey="status"
                                label="Status"
                                currentSort={getSortDirection("status")}
                                onSort={(key) => requestSort(key as keyof Property)}
                              />
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedProperties.map((property) => (
                            <TableRow
                              key={property.id}
                              className="border-zinc-800 cursor-pointer hover:bg-zinc-800/50"
                              onClick={() => {
                                setSelectedProperty(property);
                                setIsDetailModalOpen(true);
                                onPropertySelect?.(property.id);
                              }}
                            >
                              <TableCell className="text-sm font-medium text-zinc-100">
                                {property.name}
                              </TableCell>
                              <TableCell className="text-sm text-zinc-400">
                                {property.address}
                              </TableCell>
                              <TableCell className="text-sm text-zinc-400 capitalize">
                                {property.type}
                              </TableCell>
                              <TableCell className="text-sm text-zinc-400">
                                {property.bedrooms}
                              </TableCell>
                              <TableCell className="text-sm font-medium text-zinc-100">
                                {formatCurrency(Number(property.rent))}
                              </TableCell>
                              <TableCell>{getStatusBadge(property.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )
                ) : (
                  <>
                    {/* List View — full-width property rows grouped by building */}
                    {filteredProperties.length === 0 ? (
                      <EmptyStateIllustration
                        type={properties.length === 0 ? "properties" : "generic"}
                        title={properties.length === 0 ? undefined : "No properties found"}
                        description={
                          properties.length === 0
                            ? undefined
                            : "Try adjusting your search or filters"
                        }
                        onAction={properties.length === 0 ? dialog.openDialog : undefined}
                      />
                    ) : (
                      <div className="space-y-3">
                        {buildingGroups.map((building) => {
                          const isCollapsed = collapsedBuildings.has(building.buildingId);
                          return (
                            <div
                              key={building.buildingId}
                              className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60"
                            >
                              {/* Building section header — collapsible */}
                              <div className="flex w-full items-center justify-between hover:bg-zinc-800/50 transition-colors">
                                <button
                                  type="button"
                                  onClick={() => toggleBuilding(building.buildingId)}
                                  className="flex flex-1 items-center gap-3 min-w-0 px-4 py-3 text-left"
                                >
                                  <Building2 className="h-4 w-4 shrink-0 text-zinc-500" />
                                  <div className="min-w-0 text-left">
                                    <p className="text-sm font-semibold text-zinc-100 truncate">
                                      {building.buildingName}
                                    </p>
                                    <p className="flex items-center gap-1 text-xs text-zinc-500 truncate">
                                      <MapPin className="h-3 w-3 shrink-0" />
                                      {building.buildingAddress}
                                    </p>
                                  </div>
                                </button>
                                <div className="flex shrink-0 items-center gap-1 px-3">
                                  <span className="text-xs text-zinc-500 mr-1">
                                    {building.properties.length} unit
                                    {building.properties.length !== 1 ? "s" : ""}
                                  </span>
                                  <button
                                    type="button"
                                    title="Add unit to this building"
                                    onClick={() => {
                                      dialog.openDialog();
                                      dialog.updateFormData({
                                        buildingId: building.buildingId,
                                        buildingName: building.buildingName,
                                        address: building.buildingAddress,
                                        streetAddress: building.buildingAddress.split(",")[0],
                                      });
                                    }}
                                    className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleBuilding(building.buildingId)}
                                    className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                                  >
                                    <ChevronDown
                                      className={cn(
                                        "h-4 w-4 transition-transform duration-200",
                                        isCollapsed && "-rotate-90",
                                      )}
                                    />
                                  </button>
                                </div>
                              </div>

                              {/* Property rows */}
                              {!isCollapsed && (
                                <div className="divide-y divide-zinc-800 border-t border-zinc-800">
                                  {building.properties.map((property) => {
                                    const activeLease = leases.find(
                                      (l) => l.propertyId === property.id && l.status === "active",
                                    );
                                    const propTenants = tenants.filter(
                                      (t) => t.propertyId === property.id,
                                    );
                                    const openTickets = maintenance.filter(
                                      (m) =>
                                        m.propertyId === property.id && m.status !== "resolved",
                                    );
                                    const isSelected = bulkSelection.isSelected(property.id);
                                    const hasAttention = needsAttentionPropertyIds.has(property.id);
                                    const isExpiring = expiringLeasePropertyIds.has(property.id);
                                    const isMissingMap = missingMapPropertyIds.has(property.id);

                                    return (
                                      <div
                                        key={property.id}
                                        className={cn(
                                          "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-800/40",
                                          hasAttention && "border-l-2",
                                          hasAttention &&
                                            isExpiring &&
                                            openTickets.length > 0 &&
                                            "border-l-amber-500/60",
                                          hasAttention &&
                                            isExpiring &&
                                            openTickets.length === 0 &&
                                            "border-l-amber-400/70",
                                          hasAttention &&
                                            !isExpiring &&
                                            openTickets.length > 0 &&
                                            "border-l-orange-500/60",
                                          hasAttention &&
                                            !isExpiring &&
                                            openTickets.length === 0 &&
                                            "border-l-red-400/60",
                                          isSelected && "bg-zinc-800/60",
                                        )}
                                      >
                                        {/* Checkbox — 32px tap target for mobile */}
                                        <div
                                          className="flex shrink-0 items-center justify-center min-w-[32px] min-h-[32px]"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() =>
                                              bulkSelection.toggleSelection(property.id)
                                            }
                                          />
                                        </div>

                                        {/* Name + street address */}
                                        <div
                                          className="flex min-w-0 flex-1 cursor-pointer flex-col"
                                          onClick={() => {
                                            setSelectedProperty(property);
                                            setIsDetailModalOpen(true);
                                            onPropertySelect?.(property.id);
                                          }}
                                        >
                                          <span className="truncate text-sm font-medium text-zinc-100">
                                            {property.name}
                                          </span>
                                          <span className="truncate text-xs text-zinc-500">
                                            {property.streetAddress || property.address}
                                          </span>
                                        </div>

                                        {/* Type · bed · bath */}
                                        <div className="hidden shrink-0 flex-col items-end gap-0.5 text-xs text-zinc-500 xl:flex">
                                          <span className="capitalize">{property.type}</span>
                                          <span>
                                            {property.bedrooms}bd · {property.bathrooms}ba
                                          </span>
                                        </div>

                                        <div className="hidden shrink-0 items-center gap-1 md:flex">
                                          {propTenants.length > 0 && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(
                                                  `/${locale}/tenants?propertyId=${property.id}`,
                                                );
                                              }}
                                              className="rounded transition-opacity hover:opacity-70"
                                            >
                                              <RelationshipBadge
                                                variant="tenant"
                                                label={
                                                  propTenants.length === 1 ? "tenant" : "tenants"
                                                }
                                                count={propTenants.length}
                                              />
                                            </button>
                                          )}
                                          {activeLease && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(
                                                  `/${locale}/leases?propertyId=${property.id}`,
                                                );
                                              }}
                                              className="rounded transition-opacity hover:opacity-70"
                                            >
                                              <RelationshipBadge
                                                variant="lease"
                                                label="lease"
                                                count={1}
                                              />
                                            </button>
                                          )}
                                          {openTickets.length > 0 && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(
                                                  `/${locale}/maintenance?propertyId=${property.id}`,
                                                );
                                              }}
                                              className="rounded transition-opacity hover:opacity-70"
                                            >
                                              <RelationshipBadge
                                                variant="maintenance"
                                                label={
                                                  openTickets.length === 1 ? "ticket" : "tickets"
                                                }
                                                count={openTickets.length}
                                              />
                                            </button>
                                          )}
                                        </div>

                                        {/* Lease end date */}
                                        <div className="hidden w-[88px] shrink-0 flex-col items-end text-xs lg:flex">
                                          {activeLease ? (
                                            <>
                                              <span className="text-zinc-500">Lease ends</span>
                                              <span
                                                className={cn(
                                                  "font-medium",
                                                  isExpiring ? "text-amber-300" : "text-zinc-300",
                                                )}
                                              >
                                                {new Date(activeLease.endDate).toLocaleDateString(
                                                  "pt-PT",
                                                  {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                  },
                                                )}
                                              </span>
                                            </>
                                          ) : null}
                                        </div>

                                        {/* Rent */}
                                        <div className="w-[80px] shrink-0 text-right text-sm font-semibold text-zinc-100">
                                          {formatCurrency(Number(property.rent))}
                                        </div>

                                        {/* Status badge */}
                                        <div className="shrink-0">
                                          {getStatusBadge(property.status)}
                                        </div>

                                        {/* Needs-attention shortcut — navigate to detail page */}
                                        {hasAttention && (
                                          <button
                                            type="button"
                                            title="View details"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              router.push(`/${locale}/portfolio/${property.id}`);
                                            }}
                                            className="shrink-0 rounded-md p-1.5 text-amber-500 transition-colors hover:bg-zinc-700 hover:text-amber-300"
                                          >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                          </button>
                                        )}

                                        {/* Locate on map button */}
                                        <button
                                          type="button"
                                          title={
                                            isMissingMap
                                              ? "No coordinates — click to fix address"
                                              : "Locate on map"
                                          }
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isMissingMap) {
                                              dialog.openEditDialog(property);
                                            } else {
                                              onLocateOnMap?.(property.id);
                                            }
                                          }}
                                          className={cn(
                                            "shrink-0 rounded-md p-1.5 transition-colors",
                                            isMissingMap
                                              ? "text-amber-600 hover:bg-zinc-700 hover:text-amber-400"
                                              : "text-zinc-500 hover:bg-zinc-700 hover:text-blue-300",
                                          )}
                                        >
                                          <MapPin className="h-4 w-4" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Bulk Action Bar */}
                        <BulkActionBar
                          selectedCount={bulkSelection.selectedCount}
                          totalCount={sortedProperties.length}
                          itemLabel="properties"
                          actions={bulkActions}
                          onSelectAll={() => bulkSelection.selectAll(sortedProperties)}
                          onClearSelection={bulkSelection.clearSelection}
                          isAllSelected={bulkSelection.isAllSelected(sortedProperties)}
                          isPartiallySelected={bulkSelection.isPartiallySelected(sortedProperties)}
                          selectedIds={Array.from(bulkSelection.selectedIds)}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Property Detail Modal */}
        <PropertyDetailModal
          property={selectedProperty}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedProperty(null);
          }}
          onEdit={(updatedProperty) => {
            setSelectedProperty(updatedProperty);
          }}
          onDelete={() => {
            setIsDetailModalOpen(false);
            setSelectedProperty(null);
          }}
        />
        <ConfirmationDialog dialog={confirmDialog} />
      </>
    );
  },
);

PropertiesView.displayName = "PropertiesView";
