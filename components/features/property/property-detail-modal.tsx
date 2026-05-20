"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bath,
  Bed,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Edit,
  ExternalLink,
  FileText,
  MapPin,
  MoreHorizontal,
  Receipt as ReceiptIcon,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { Property, Lease, Tenant, Receipt, MaintenanceTicket } from "@/lib/types";
import { useApp } from "@/lib/contexts/app-context";
import { useToast } from "@/lib/contexts/toast-context";
import { propertySchema, type PropertyFormData } from "@/lib/schemas/property.schema";
import { buildFinancialReviewPath } from "@/lib/utils/financial-navigation";
import UnitsView from "./units-view";
import { useConfirmDialog } from "@/lib/hooks/use-confirm-dialog";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { cn } from "@/lib/utils/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { usePortalAccess } from "@/lib/contexts/portal-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyDetailModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (property: Property) => void;
  onDelete?: (propertyId: string) => void;
}

type IssueSeverity = "urgent" | "warning" | "info";

interface Issue {
  id: string;
  severity: IssueSeverity;
  label: string;
  detail: string;
  action: { label: string; onClick: () => void };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const STATUS_STYLES: Record<Property["status"], string> = {
  occupied: "bg-success/20 text-success border-success/30",
  vacant: "bg-amber-600/20 text-amber-400 border-amber-600/30",
  maintenance: "bg-orange-600/20 text-orange-400 border-orange-600/30",
};

const ISSUE_STYLES: Record<IssueSeverity, { row: string; icon: string; badge: string }> = {
  urgent: {
    row: "border-red-500/30 bg-red-500/[0.06]",
    icon: "text-red-400",
    badge: "bg-red-500/15 text-red-300 border-red-500/30",
  },
  warning: {
    row: "border-amber-500/30 bg-amber-500/[0.06]",
    icon: "text-amber-400",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  info: {
    row: "border-blue-500/30 bg-blue-500/[0.06]",
    icon: "text-blue-400",
    badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

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
  const [detailsTab, setDetailsTab] = useState("overview");
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
      setDetailsTab("overview");
      setIsEditing(false);
    }
  }, [property?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data (guarded; property may be null until early return below) ──
  const relatedLeases = (state.leases ?? []).filter((l) => l.propertyId === (property?.id ?? ""));
  const relatedReceipts = (state.receipts ?? []).filter(
    (r) => r.propertyId === (property?.id ?? ""),
  );
  const relatedMaintenance = (state.maintenance ?? []).filter(
    (t) => t.propertyId === (property?.id ?? ""),
  );

  const activeLease =
    relatedLeases.find((l) => l.status === "active") ??
    relatedLeases.find((l) => l.status === "pending") ??
    null;

  const activeTenant = activeLease
    ? ((state.tenants ?? []).find((t) => t.id === activeLease.tenantId) ?? null)
    : ((state.tenants ?? []).find((t) => t.propertyId === (property?.id ?? "")) ?? null);

  const openTickets = relatedMaintenance.filter(
    (t) => t.status === "open" || t.status === "in_progress",
  ).length;

  const paidTotal = relatedReceipts
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + r.amount, 0);

  const recentPayments = [...relatedReceipts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const recentOpenTickets = [...relatedMaintenance]
    .filter((t) => t.status === "open" || t.status === "in_progress")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const leaseExpiryDays = useMemo(() => {
    if (!activeLease || activeLease.status !== "active") return null;
    return Math.ceil(
      (new Date(activeLease.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
  }, [activeLease]);

  const isLeaseExpiringSoon =
    leaseExpiryDays !== null && leaseExpiryDays >= 0 && leaseExpiryDays <= 30;

  // ── Navigation helper ───────────────────────────────────────────────────────
  const navigateTo = (href: string) => {
    onClose();
    router.push(`/${locale}${href}`);
  };

  // ── Issue computation ───────────────────────────────────────────────────────
  const issues: Issue[] = useMemo(() => {
    if (!property) return [];
    const list: Issue[] = [];

    if (isLeaseExpiringSoon && leaseExpiryDays !== null) {
      list.push({
        id: "lease-expiring",
        severity: leaseExpiryDays <= 7 ? "urgent" : "warning",
        label: `Lease expires in ${leaseExpiryDays} day${leaseExpiryDays === 1 ? "" : "s"}`,
        detail: "Contact the tenant now to confirm renewal or plan re-letting.",
        action: {
          label: "Renew lease",
          onClick: () => navigateTo(`/leases?propertyId=${property.id}`),
        },
      });
    }

    if (property.status === "occupied" && !activeLease) {
      list.push({
        id: "no-lease",
        severity: "urgent",
        label: "No active lease on file",
        detail:
          "Property is marked occupied but has no matching lease. Financial records may be incomplete.",
        action: {
          label: "Add lease",
          onClick: () => navigateTo(`/leases?propertyId=${property.id}`),
        },
      });
    }

    if (activeLease && !activeLease.taxRegime) {
      list.push({
        id: "no-tax-regime",
        severity: "warning",
        label: "Tax regime not set",
        detail: "Required for correct income reporting. Set it on the lease before filing.",
        action: {
          label: "Set tax info",
          onClick: () => navigateTo(`/leases?propertyId=${property.id}`),
        },
      });
    }

    if (typeof property.latitude !== "number" || typeof property.longitude !== "number") {
      list.push({
        id: "no-coords",
        severity: "info",
        label: "Property not on map",
        detail: "Verify the address to place this property on the portfolio map.",
        action: { label: "Fix address", onClick: () => setIsEditing(true) },
      });
    }

    if (openTickets > 0) {
      list.push({
        id: "open-tickets",
        severity: openTickets >= 3 ? "warning" : "info",
        label: `${openTickets} open maintenance ticket${openTickets === 1 ? "" : "s"}`,
        detail: "Unresolved tickets can affect tenant satisfaction and property condition.",
        action: {
          label: "Review tickets",
          onClick: () => navigateTo(`/maintenance?propertyId=${property.id}`),
        },
      });
    }

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property, isLeaseExpiringSoon, leaseExpiryDays, activeLease, openTickets]);

  // ── Primary action decision ─────────────────────────────────────────────────
  const primaryAction = useMemo((): {
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    urgency?: "urgent";
  } | null => {
    if (!property) return null;
    if (isLeaseExpiringSoon) {
      return {
        label: "Renew Lease",
        icon: ReceiptIcon,
        onClick: () => navigateTo(`/leases?propertyId=${property.id}`),
        urgency: "urgent",
      };
    }
    if (property.status === "vacant" && !activeTenant) {
      return {
        label: "Add Tenant",
        icon: Users,
        onClick: () => navigateTo(`/tenants?propertyId=${property.id}`),
      };
    }
    if (property.status === "occupied" && !activeLease) {
      return {
        label: "Add Lease",
        icon: FileText,
        onClick: () => navigateTo(`/leases?propertyId=${property.id}`),
        urgency: "urgent",
      };
    }
    if (issues.some((i) => i.severity === "urgent" || i.severity === "warning")) {
      return {
        label: "Complete Setup",
        icon: AlertTriangle,
        onClick: () => setDetailsTab("overview"),
      };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property, isLeaseExpiringSoon, activeTenant, activeLease, issues]);

  // ── Health summary ──────────────────────────────────────────────────────────
  const hasUrgent = issues.some((i) => i.severity === "urgent");
  const healthLabel =
    issues.length === 0
      ? "All good"
      : hasUrgent
        ? `${issues.length} critical issue${issues.length > 1 ? "s" : ""}`
        : `${issues.length} issue${issues.length > 1 ? "s" : ""} need attention`;

  // Early return AFTER all hooks
  if (!property) return null;

  // ── Form handlers ───────────────────────────────────────────────────────────
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

  const handleCancel = () => {
    setFormData(toFormData(property));
    setIsEditing(false);
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

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:w-[520px] sm:max-w-[520px]"
        >
          <SheetTitle className="sr-only">{property?.name ?? "Property details"}</SheetTitle>
          <SheetDescription className="sr-only">Property detail panel</SheetDescription>
          {isEditing ? (
            <EditView
              formData={formData}
              setFormData={setFormData}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <ViewContent
              property={property}
              activeLease={activeLease}
              activeTenant={activeTenant}
              openTickets={openTickets}
              paidTotal={paidTotal}
              recentPayments={recentPayments}
              recentOpenTickets={recentOpenTickets}
              issues={issues}
              primaryAction={primaryAction}
              healthLabel={healthLabel}
              hasUrgent={hasUrgent}
              detailsTab={detailsTab}
              setDetailsTab={setDetailsTab}
              showUnits={showUnits}
              setShowUnits={setShowUnits}
              isOwnerPortal={isOwnerPortal}
              formatCurrency={formatCurrency}
              navigateTo={navigateTo}
              onStartEdit={() => setIsEditing(true)}
              onDelete={isOwnerPortal ? handleDelete : undefined}
            />
          )}
        </SheetContent>
      </Sheet>
      <ConfirmationDialog dialog={confirmDialog} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ViewContent — decision-driven read mode
// ─────────────────────────────────────────────────────────────────────────────

function ViewContent({
  property,
  activeLease,
  activeTenant,
  openTickets,
  paidTotal,
  recentPayments,
  recentOpenTickets,
  issues,
  primaryAction,
  healthLabel,
  hasUrgent,
  detailsTab,
  setDetailsTab,
  showUnits,
  setShowUnits,
  isOwnerPortal,
  formatCurrency,
  navigateTo,
  onStartEdit,
  onDelete,
}: {
  property: Property;
  activeLease: Lease | null;
  activeTenant: Tenant | null;
  openTickets: number;
  paidTotal: number;
  recentPayments: Receipt[];
  recentOpenTickets: MaintenanceTicket[];
  issues: Issue[];
  primaryAction: {
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    urgency?: "urgent";
  } | null;
  healthLabel: string;
  hasUrgent: boolean;
  detailsTab: string;
  setDetailsTab: (v: string) => void;
  showUnits: boolean;
  setShowUnits: (v: boolean) => void;
  isOwnerPortal: boolean;
  formatCurrency: (n: number) => string;
  navigateTo: (href: string) => void;
  onStartEdit: () => void;
  onDelete?: () => void;
}) {
  // ── Zone 1: Status + Health ──────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 px-5 py-4 pr-12">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-50 leading-tight">{property.name}</h2>
              <Badge className={cn("shrink-0 capitalize", STATUS_STYLES[property.status])}>
                {property.status}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-zinc-500 truncate">
              <MapPin className="inline h-3 w-3 mr-1 align-[-1px]" />
              {property.streetAddress || property.address}
              {property.city ? `, ${property.city}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Health chip */}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                issues.length === 0
                  ? "border-success/30 bg-success/10 text-success"
                  : hasUrgent
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300",
              )}
            >
              {issues.length === 0 ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {healthLabel}
            </div>
            {/* Overflow menu — Edit + Delete safely separated */}
            {isOwnerPortal && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={onStartEdit}>
                    <Edit className="mr-2 h-3.5 w-3.5" />
                    Edit property
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-400 focus:text-red-300" onClick={onDelete}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete property
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Zone 2: Primary Action ───────────────────────────────────────── */}
        {(primaryAction || isOwnerPortal) && (
          <div className="flex items-center gap-2 border-b border-zinc-800 px-5 py-3">
            {primaryAction && (
              <Button
                onClick={primaryAction.onClick}
                variant={primaryAction.urgency === "urgent" ? "destructive" : "default"}
                size="sm"
                className="gap-1.5"
              >
                <primaryAction.icon className="h-3.5 w-3.5" />
                {primaryAction.label}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateTo(`/portfolio/${property.id}`)}
              className="gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Full page
            </Button>
          </div>
        )}

        {/* ── Zone 3: Issues Panel ─────────────────────────────────────────── */}
        {issues.length > 0 && (
          <div className="border-b border-zinc-800 px-5 py-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Needs attention
            </p>
            {issues.map((issue) => {
              const s = ISSUE_STYLES[issue.severity];
              return (
                <div
                  key={issue.id}
                  className={cn("flex items-start gap-3 rounded-lg border px-3 py-2.5", s.row)}
                >
                  <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", s.icon)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-100">{issue.label}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{issue.detail}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={issue.action.onClick}
                    className={cn("shrink-0 border text-xs h-7 px-2.5", s.badge)}
                  >
                    {issue.action.label}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Zone 4: Supporting Information (Tabs) ────────────────────────── */}
        <Tabs value={detailsTab} onValueChange={setDetailsTab} className="px-5 pt-3 pb-4">
          <TabsList className="mb-3 grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-0 space-y-3">
            {/* Inline KPI row — replaces the 4 stat cards */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <KpiCell
                label="Tenant"
                value={activeTenant?.name ?? (property.status === "vacant" ? "Vacant" : "None")}
                onClick={() =>
                  activeTenant
                    ? navigateTo(`/people/${activeTenant.id}`)
                    : navigateTo(`/tenants?propertyId=${property.id}`)
                }
                muted={!activeTenant}
              />
              <KpiCell
                label="Lease"
                value={
                  activeLease
                    ? activeLease.status.charAt(0).toUpperCase() + activeLease.status.slice(1)
                    : "No lease"
                }
                sub={
                  activeLease
                    ? `Ends ${new Date(activeLease.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}`
                    : undefined
                }
                onClick={() => navigateTo(`/leases?propertyId=${property.id}`)}
                muted={!activeLease}
              />
              <KpiCell
                label="Monthly rent"
                value={formatCurrency(property.rent)}
                onClick={() => navigateTo(buildFinancialReviewPath({ propertyId: property.id }))}
              />
              <KpiCell
                label="Open tickets"
                value={String(openTickets)}
                valueClass={openTickets > 0 ? "text-amber-300" : undefined}
                onClick={() => navigateTo(`/maintenance?propertyId=${property.id}`)}
                muted={openTickets === 0}
              />
            </div>

            {/* Recent payments */}
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Recent payments
              </p>
              {recentPayments.length === 0 ? (
                <p className="text-sm text-zinc-500">No payment records yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {recentPayments.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/60 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{r.tenantName ?? "—"}</p>
                        <p className="text-xs text-zinc-500">{r.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-zinc-100">
                          {formatCurrency(r.amount)}
                        </p>
                        <p
                          className={cn(
                            "text-xs capitalize",
                            r.status === "paid" ? "text-success" : "text-amber-400",
                          )}
                        >
                          {r.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <QuickLink
                icon={CreditCard}
                label="Payments"
                onClick={() => navigateTo(buildFinancialReviewPath({ propertyId: property.id }))}
              />
              <QuickLink
                icon={FileText}
                label="Documents"
                onClick={() => navigateTo(`/documents?propertyId=${property.id}`)}
              />
              {activeTenant && (
                <QuickLink
                  icon={Users}
                  label="Tenant profile"
                  onClick={() => navigateTo(`/people/${activeTenant.id}`)}
                />
              )}
              <QuickLink
                icon={Wrench}
                label="Maintenance"
                onClick={() => navigateTo(`/maintenance?propertyId=${property.id}`)}
              />
            </div>
          </TabsContent>

          {/* FINANCIALS TAB */}
          <TabsContent value="financials" className="mt-0 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-800/60 px-3 py-2.5">
                <p className="text-xs text-zinc-500">Monthly rent</p>
                <p className="mt-0.5 text-lg font-semibold text-zinc-100">
                  {formatCurrency(property.rent)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-800/60 px-3 py-2.5">
                <p className="text-xs text-zinc-500">Total paid (all time)</p>
                <p className="mt-0.5 text-lg font-semibold text-zinc-100">
                  {formatCurrency(paidTotal)}
                </p>
              </div>
            </div>

            {recentPayments.length === 0 ? (
              <p className="text-sm text-zinc-500">No receipts recorded for this property.</p>
            ) : (
              <div className="space-y-1.5">
                {(
                  recentPayments as {
                    id: string;
                    tenantName?: string;
                    description?: string;
                    date: string;
                    amount: number;
                    status: string;
                  }[]
                ).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/60 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-100">
                        {r.description ?? r.tenantName ?? "—"}
                      </p>
                      <p className="text-xs text-zinc-500">{r.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-100">
                        {formatCurrency(r.amount)}
                      </p>
                      <p
                        className={cn(
                          "text-xs capitalize",
                          r.status === "paid" ? "text-success" : "text-amber-400",
                        )}
                      >
                        {r.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateTo(buildFinancialReviewPath({ propertyId: property.id }))}
              className="w-full gap-1.5"
            >
              <CreditCard className="h-3.5 w-3.5" />
              View full financial history
            </Button>
          </TabsContent>

          {/* DETAILS TAB */}
          <TabsContent value="details" className="mt-0 space-y-3">
            {/* Property specs */}
            <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 overflow-hidden">
              <DetailRow label="Type" value={property.type} capitalize />
              {property.type !== "commercial" && (
                <>
                  <DetailRow
                    label={
                      <span className="flex items-center gap-1">
                        <Bed className="h-3.5 w-3.5" />
                        Bedrooms
                      </span>
                    }
                    value={String(property.bedrooms)}
                  />
                  <DetailRow
                    label={
                      <span className="flex items-center gap-1">
                        <Bath className="h-3.5 w-3.5" />
                        Bathrooms
                      </span>
                    }
                    value={String(property.bathrooms)}
                  />
                </>
              )}
              <DetailRow
                label="Address"
                value={
                  [property.streetAddress, property.city, property.zipCode]
                    .filter(Boolean)
                    .join(", ") || property.address
                }
              />
              <DetailRow
                label="Map"
                value={
                  typeof property.latitude === "number"
                    ? `${property.latitude.toFixed(4)}, ${property.longitude!.toFixed(4)}`
                    : "Not on map"
                }
                valueMuted={typeof property.latitude !== "number"}
              />
              {activeLease && (
                <>
                  <DetailRow
                    label="Lease term"
                    value={`${activeLease.startDate} → ${activeLease.endDate}`}
                  />
                  <DetailRow
                    label="Tax regime"
                    value={activeLease.taxRegime ?? "Not set"}
                    valueMuted={!activeLease.taxRegime}
                  />
                  <DetailRow label="Deposit" value={formatCurrency(activeLease.deposit)} />
                </>
              )}
            </div>

            {property.description && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2.5">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Description
                </p>
                <p className="text-sm text-zinc-300">{property.description}</p>
              </div>
            )}

            {/* Building units (progressive disclosure) */}
            {property.buildingId && (
              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowUnits(!showUnits)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-zinc-500" />
                    Building units ({property.buildingName ?? "this building"})
                  </span>
                  {showUnits ? (
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  )}
                </button>
                {showUnits && (
                  <div className="border-t border-zinc-800 p-3">
                    <UnitsView propertyId={property.id} />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* MAINTENANCE TAB */}
          <TabsContent value="maintenance" className="mt-0 space-y-3">
            {recentOpenTickets.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 px-3 py-6 text-center">
                <Wrench className="mx-auto h-6 w-6 text-zinc-600 mb-2" />
                <p className="text-sm text-zinc-500">No open maintenance tickets.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOpenTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-200">{ticket.title}</p>
                      <p className="text-xs text-zinc-500 capitalize">
                        {ticket.status.replace("_", " ")}
                        {ticket.vendorName ? ` · ${ticket.vendorName}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0 text-[10px] capitalize">
                      {ticket.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1 text-zinc-400 hover:text-zinc-200"
              onClick={() => navigateTo(`/maintenance?property=${property.id}`)}
            >
              View all tickets
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Sticky footer — single primary action only ───────────────────────── */}
      {isOwnerPortal && primaryAction && (
        <div className="flex items-center justify-end border-t border-zinc-800 px-5 py-3">
          <Button
            onClick={primaryAction.onClick}
            variant={primaryAction.urgency === "urgent" ? "destructive" : "default"}
            size="sm"
            className="gap-1.5"
          >
            <primaryAction.icon className="h-3.5 w-3.5" />
            {primaryAction.label}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EditView — unchanged structure, same fields, kept separate for clarity
// ─────────────────────────────────────────────────────────────────────────────

function EditView({
  formData,
  setFormData,
  onSave,
  onCancel,
}: {
  formData: PropertyFormData;
  setFormData: React.Dispatch<React.SetStateAction<PropertyFormData>>;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden">
      <div className="border-b border-zinc-800 px-5 py-4">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">Edit Property</h2>
        <p className="text-sm text-zinc-500">Update property information</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
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
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Short Description</Label>
                <Textarea
                  id="description"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
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
                    setFormData((f) => ({ ...f, rent: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    setFormData((f) => ({ ...f, status: v as Property["status"] }))
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
                  onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="streetAddress">Street</Label>
                  <Input
                    id="streetAddress"
                    value={formData.streetAddress}
                    onChange={(e) => setFormData((f) => ({ ...f, streetAddress: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData((f) => ({ ...f, city: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Postal Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData((f) => ({ ...f, zipCode: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(v) => setFormData((f) => ({ ...f, country: v as "PT" | "ES" }))}
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
                  onValueChange={(v) => setFormData((f) => ({ ...f, type: v as Property["type"] }))}
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, bedrooms: parseInt(e.target.value) || 0 }))
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
                      setFormData((f) => ({ ...f, bathrooms: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-3">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable sub-components
// ─────────────────────────────────────────────────────────────────────────────

function KpiCell({
  label,
  value,
  sub,
  onClick,
  muted,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  onClick?: () => void;
  muted?: boolean;
  valueClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800"
    >
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate text-sm font-semibold",
          muted ? "text-zinc-500" : (valueClass ?? "text-zinc-100"),
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-zinc-500 mt-0.5">{sub}</p>}
    </button>
  );
}

function QuickLink({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function DetailRow({
  label,
  value,
  capitalize,
  valueMuted,
}: {
  label: React.ReactNode;
  value: string;
  capitalize?: boolean;
  valueMuted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span
        className={cn(
          "text-right ml-4",
          capitalize && "capitalize",
          valueMuted ? "text-zinc-500" : "text-zinc-200",
        )}
      >
        {value}
      </span>
    </div>
  );
}
