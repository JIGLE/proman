"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bath,
  Bed,
  Building2,
  CheckCircle,
  CreditCard,
  Edit,
  ExternalLink,
  FileText,
  MapPin,
  Plus,
  Trash2,
  Users,
  Wrench,
  X,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Property } from "@/lib/types";
import { useApp } from "@/lib/contexts/app-context";
import { useToast } from "@/lib/contexts/toast-context";
import { propertySchema, type PropertyFormData } from "@/lib/schemas/property.schema";
import UnitsView from "./units-view";
import { useConfirmDialog } from "@/lib/hooks/use-confirm-dialog";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { useCurrency } from "@/lib/contexts/currency-context";
import { buildFinancialReviewPath } from "@/lib/utils/financial-navigation";
import { usePortalAccess } from "@/lib/contexts/portal-context";

interface PropertyDetailModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (property: Property) => void;
  onDelete?: (propertyId: string) => void;
}

function toFormData(property: Property): PropertyFormData {
  return {
    name: property.name,
    address: property.address,
    streetAddress: property.streetAddress || "",
    city: property.city || "",
    zipCode: property.zipCode || "",
    country: (property.country === "Spain" || property.country === "ES" ? "ES" : "PT") as
      | "PT"
      | "ES",
    latitude: property.latitude,
    longitude: property.longitude,
    addressVerified: property.addressVerified || false,
    buildingId: property.buildingId,
    buildingName: property.buildingName || "",
    type:
      property.type === "commercial"
        ? "commercial"
        : property.type === "other"
          ? "other"
          : property.type,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    rent: property.rent,
    status: property.status,
    description: property.description || "",
  };
}

export function PropertyDetailModal({
  property,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: PropertyDetailModalProps) {
  const { state, updateProperty, deleteProperty } = useApp();
  const { formatCurrency } = useCurrency();
  const { isOwnerPortal } = usePortalAccess();
  const { success, error } = useToast();
  const confirmDialog = useConfirmDialog();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "pt";
  const [isEditing, setIsEditing] = useState(false);
  const [showUnits, setShowUnits] = useState(false);
  const [formData, setFormData] = useState<PropertyFormData>({
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
  });

  useEffect(() => {
    if (property) {
      setFormData(toFormData(property));
    }
  }, [property]);

  if (!property) return null;

  const relatedTenants = state.tenants.filter((tenant) => tenant.propertyId === property.id);
  const relatedLeases = state.leases.filter((lease) => lease.propertyId === property.id);
  const relatedReceipts = state.receipts.filter((receipt) => receipt.propertyId === property.id);
  const relatedMaintenance = state.maintenance.filter(
    (ticket) => ticket.propertyId === property.id,
  );

  const activeLease =
    relatedLeases.find((lease) => lease.status === "active") ??
    relatedLeases.find((lease) => lease.status === "pending") ??
    null;
  const activeTenant = activeLease
    ? (state.tenants.find((tenant) => tenant.id === activeLease.tenantId) ?? null)
    : (relatedTenants[0] ?? null);
  const openTickets = relatedMaintenance.filter(
    (ticket) => ticket.status === "open" || ticket.status === "in_progress",
  ).length;
  const paidTotal = relatedReceipts
    .filter((receipt) => receipt.status === "paid")
    .reduce((sum, receipt) => sum + receipt.amount, 0);
  const recentPayments = [...relatedReceipts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 2);

  const getStatusBadge = (status: Property["status"]) => {
    const colors = {
      occupied: "bg-success/20 text-success border-success/30",
      vacant: "bg-amber-600/20 text-amber-400 border-amber-600/30",
      maintenance: "bg-orange-600/20 text-orange-400 border-orange-600/30",
    };
    return (
      <Badge className={colors[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
    );
  };

  const handleSave = async () => {
    try {
      const validated = propertySchema.parse(formData);
      await updateProperty(property.id, validated);
      success("Property updated successfully");
      setIsEditing(false);
      onEdit?.({ ...property, ...validated });
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to update property");
    }
  };

  const handleDelete = () => {
    confirmDialog.confirm(
      {
        title: "Delete Property",
        description:
          "This property and all associated units, leases, and data will be permanently removed. This action cannot be undone.",
        confirmLabel: "Delete Property",
        variant: "destructive",
      },
      async () => {
        await deleteProperty(property.id);
        success("Property deleted successfully");
        onClose();
        onDelete?.(property.id);
      },
    );
  };

  const handleCancel = () => {
    setFormData(toFormData(property));
    setIsEditing(false);
  };

  const navigateTo = (href: string) => {
    onClose();
    router.push(`/${locale}${href}`);
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-zinc-800 bg-zinc-900">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-2 text-2xl text-[var(--color-foreground)]">
                  <Building2 className="h-6 w-6" />
                  {isEditing ? "Edit Property" : property.name}
                </DialogTitle>
                <DialogDescription>
                  {isEditing ? "Update property information" : property.address}
                </DialogDescription>
              </div>
              {!isEditing && (
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(property.status)}
                  {property.addressVerified && (
                    <Badge className="border-success/30 bg-success/20 text-success">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="border-zinc-700 bg-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Basic Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
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

                <Card className="border-zinc-700 bg-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Financial</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="rent">Monthly Rent</Label>
                      <Input
                        id="rent"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.rent}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            rent: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            status: value as Property["status"],
                          })
                        }
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

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="border-zinc-700 bg-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Address</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                          onChange={(e) =>
                            setFormData({ ...formData, streetAddress: e.target.value })
                          }
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
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
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
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-700 bg-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Physical Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            type: value as Property["type"],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
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
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bedrooms">Bedrooms</Label>
                        <Input
                          id="bedrooms"
                          type="number"
                          min="0"
                          value={formData.bedrooms}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bedrooms: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bathrooms">Bathrooms</Label>
                        <Input
                          id="bathrooms"
                          type="number"
                          min="0"
                          value={formData.bathrooms}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bathrooms: parseInt(e.target.value) || 0,
                            })
                          }
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
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-zinc-700 bg-zinc-800">
                  <CardContent className="p-4">
                    <div className="text-sm text-zinc-400">Active tenant</div>
                    <div className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                      {activeTenant?.name ?? "Vacant"}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-zinc-700 bg-zinc-800">
                  <CardContent className="p-4">
                    <div className="text-sm text-zinc-400">Lease status</div>
                    <div className="mt-1 text-xl font-semibold capitalize text-[var(--color-foreground)]">
                      {activeLease?.status ?? "No active lease"}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-zinc-700 bg-zinc-800">
                  <CardContent className="p-4">
                    <div className="text-sm text-zinc-400">Paid receipts</div>
                    <div className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                      {formatCurrency(paidTotal)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-zinc-700 bg-zinc-800">
                  <CardContent className="p-4">
                    <div className="text-sm text-zinc-400">Open tickets</div>
                    <div className="mt-1 text-xl font-semibold text-amber-400">{openTickets}</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-zinc-700 bg-zinc-800">
                <CardHeader>
                  <CardTitle className="text-sm text-zinc-400">Quick actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => navigateTo(`/portfolio/${property.id}`)}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open detail page
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigateTo(buildFinancialReviewPath({ propertyId: property.id }))
                    }
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Review payments
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigateTo(`/documents?propertyId=${property.id}`)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Open documents
                  </Button>
                  {activeTenant && (
                    <Button
                      variant="outline"
                      onClick={() => navigateTo(`/people/${activeTenant.id}`)}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Open tenant
                    </Button>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="border-zinc-700 bg-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Location</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-1 h-4 w-4 text-zinc-500" />
                      <div className="text-sm">
                        <p className="text-[var(--color-foreground)]">
                          {property.streetAddress || property.address}
                        </p>
                        <p className="text-zinc-400">
                          {[property.city, property.zipCode].filter(Boolean).join(", ") ||
                            "Address pending"}
                        </p>
                        <p className="text-zinc-400">{property.country || "Country not set"}</p>
                        {typeof property.latitude === "number" &&
                        typeof property.longitude === "number" ? (
                          <p className="mt-2 text-xs text-emerald-300">
                            Map coordinates ready: {property.latitude.toFixed(4)},{" "}
                            {property.longitude.toFixed(4)}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-amber-300">
                            Coordinates missing for map placement
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-700 bg-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Property details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Type</span>
                      <span className="capitalize text-[var(--color-foreground)]">
                        {property.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Bed className="h-4 w-4" />
                        Bedrooms
                      </span>
                      <span className="text-[var(--color-foreground)]">{property.bedrooms}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Bath className="h-4 w-4" />
                        Bathrooms
                      </span>
                      <span className="text-[var(--color-foreground)]">{property.bathrooms}</span>
                    </div>
                    <div className="border-t border-zinc-700 pt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Monthly rent</span>
                        <span className="text-lg font-semibold text-[var(--color-foreground)]">
                          {formatCurrency(property.rent)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="border-zinc-700 bg-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Tenancy snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Current tenant</span>
                      <span className="text-[var(--color-foreground)]">
                        {activeTenant?.name ?? "Vacant"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Current lease</span>
                      <span className="capitalize text-[var(--color-foreground)]">
                        {activeLease?.status ?? "Not linked"}
                      </span>
                    </div>
                    {activeLease && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">Lease term</span>
                          <span className="text-[var(--color-foreground)]">
                            {activeLease.startDate} - {activeLease.endDate}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">Tax regime</span>
                          <span className="text-[var(--color-foreground)]">
                            {activeLease.taxRegime ?? "Not set"}
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-zinc-700 bg-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Latest activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recentPayments.length === 0 ? (
                      <p className="text-sm text-zinc-400">
                        No payment activity has been recorded yet.
                      </p>
                    ) : (
                      recentPayments.map((receipt) => (
                        <div
                          key={receipt.id}
                          className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-[var(--color-foreground)]">
                                {receipt.tenantName}
                              </p>
                              <p className="text-xs text-zinc-400">{receipt.date}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                                {formatCurrency(receipt.amount)}
                              </p>
                              <p className="text-xs capitalize text-zinc-400">{receipt.status}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-3 text-sm text-zinc-300">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-amber-400" />
                        <span>{openTickets} maintenance item(s) still need review</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {property.description && (
                <Card className="border-zinc-700 bg-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--color-foreground)]">{property.description}</p>
                  </CardContent>
                </Card>
              )}

              {property.buildingId && (
                <Card className="border-zinc-700 bg-zinc-800">
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
                        {showUnits ? "Hide" : "Show"} Units
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

              {isOwnerPortal && (
                <div className="flex justify-between gap-2 border-t border-zinc-800 pt-4">
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Property
                  </Button>
                  <Button onClick={() => setIsEditing(true)} className="flex items-center gap-1">
                    <Edit className="h-4 w-4" />
                    Edit Property
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmationDialog dialog={confirmDialog} />
    </>
  );
}
