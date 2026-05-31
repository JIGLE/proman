"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  FileText,
  Plus,
  Home,
  User,
  DollarSign,
  FileCheck,
  Upload,
  Calendar,
  Building2,
  Edit,
  Trash2,
  Download,
  MoreHorizontal,
  Clock,
  TrendingUp,
  Mail,
} from "lucide-react";
import { SortableHeader } from "@/components/ui/sortable-header";
import { DataViewToggle, DataViewMode } from "@/components/ui/data-view-toggle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrency } from "@/lib/contexts/currency-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils/utils";
import { EmptyStateIllustration } from "@/components/ui/empty-state-illustrations";
import { SearchFilter } from "@/components/ui/search-filter";
import { ExportButton } from "@/components/ui/export-button";
import { useApp } from "@/lib/contexts/app-context";
import { RelationshipBadge, daysUntil } from "@/components/shared/relationship-badge";
import { Lease } from "@/lib/types";
import { leaseSchema, type LeaseFormData } from "@/lib/schemas/lease.schema";
import { useToast } from "@/lib/contexts/toast-context";
import { useFormDialog } from "@/lib/hooks/use-form-dialog";
import { useMultiStepForm, StepConfig } from "@/lib/hooks/use-multi-step-form";
import {
  MultiStepFormContainer,
  StepContent,
  DraftBanner,
  MultiStepFormStep,
} from "@/components/ui/multi-step-form";
import { useSortableData } from "@/lib/hooks/use-sortable-data";
import { useConfirmDialog } from "@/lib/hooks/use-confirm-dialog";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";

export type LeasesViewProps = Record<string, never>;

export function LeasesView(): React.ReactElement {
  const { state, addLease, updateLease, deleteLease } = useApp();
  const { properties, tenants, leases, loading } = state;
  const { success, error } = useToast();
  const { formatCurrency, currencySymbol } = useCurrency();
  const confirmDialog = useConfirmDialog();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingLease, setEditingLease] = useState<Lease | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [taxRegimeFilter, setTaxRegimeFilter] = useState<string>("all");

  // Bulk selection state
  const [selectedLeaseIds, setSelectedLeaseIds] = useState<Set<string>>(new Set());
  const [bulkIncreaseOpen, setBulkIncreaseOpen] = useState(false);
  const [bulkPct, setBulkPct] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);

  // Data view mode state with localStorage persistence
  const [dataViewMode, setDataViewMode] = useState<DataViewMode>("grid");
  useEffect(() => {
    const saved = localStorage.getItem("proman-leases-view-mode");
    if (saved === "grid" || saved === "table") setDataViewMode(saved);
  }, []);
  const handleViewModeChange = useCallback((mode: DataViewMode) => {
    setDataViewMode(mode);
    localStorage.setItem("proman-leases-view-mode", mode);
  }, []);

  const initialFormData: LeaseFormData = {
    propertyId: "",
    tenantId: "",
    startDate: "",
    endDate: "",
    monthlyRent: 0,
    deposit: 0,
    taxRegime: undefined,
    autoRenew: false,
    renewalNoticeDays: 60,
    status: "draft" as const,
    notes: "",
  };

  // Multi-step form configuration
  const steps: StepConfig<LeaseFormData>[] = [
    {
      id: "property",
      title: "Property Selection",
      description: "Choose the property for this lease",
      fields: ["propertyId"],
    },
    {
      id: "tenant",
      title: "Tenant Details",
      description: "Select the tenant",
      fields: ["tenantId"],
    },
    {
      id: "terms",
      title: "Lease Terms",
      description: "Set rental terms and conditions",
      fields: [
        "startDate",
        "endDate",
        "monthlyRent",
        "deposit",
        "taxRegime",
        "autoRenew",
        "renewalNoticeDays",
      ],
    },
    {
      id: "notes",
      title: "Additional Info",
      description: "Add notes and contract documents",
      fields: ["notes"],
    },
  ];

  const wizardSteps: MultiStepFormStep[] = [
    { id: "property", title: "Property", icon: <Home className="h-4 w-4" /> },
    { id: "tenant", title: "Tenant", icon: <User className="h-4 w-4" /> },
    { id: "terms", title: "Terms", icon: <DollarSign className="h-4 w-4" /> },
    {
      id: "notes",
      title: "Documents",
      icon: <FileCheck className="h-4 w-4" />,
    },
  ];

  const wizard = useMultiStepForm<LeaseFormData>({
    steps,
    schema: leaseSchema,
    initialData: initialFormData,
    onComplete: async (data) => {
      // Convert file to buffer if present
      let contractBuffer: Buffer | undefined;
      if (contractFile) {
        contractBuffer = Buffer.from(await contractFile.arrayBuffer());
      }

      const leaseData = {
        ...data,
        contractFile: contractBuffer,
        contractFileName: contractFile?.name,
        contractFileSize: contractFile?.size,
        status: "active" as const,
      };

      if (editingLease) {
        await updateLease(editingLease.id, leaseData);
        success("Lease updated successfully");
      } else {
        await addLease(leaseData);
        success("Lease created successfully");
      }

      setWizardOpen(false);
      setEditingLease(null);
      setContractFile(null);
      wizard.resetForm();
    },
    persistence: {
      key: "lease-wizard-draft",
      ttl: 24 * 60 * 60 * 1000, // 24 hours
    },
  });

  const dialog = useFormDialog<LeaseFormData, Lease>({
    schema: leaseSchema,
    initialData: initialFormData,
    onSubmit: async (data, isEdit) => {
      // This is kept for backward compatibility
      let contractBuffer: Buffer | undefined;
      if (contractFile) {
        contractBuffer = Buffer.from(await contractFile.arrayBuffer());
      }

      const leaseData = {
        ...data,
        contractFile: contractBuffer,
        contractFileName: contractFile?.name,
        contractFileSize: contractFile?.size,
        status: "active" as const,
      };

      if (isEdit && dialog.editingItem) {
        await updateLease(dialog.editingItem.id, leaseData);
        success("Lease updated successfully");
      } else {
        await addLease(leaseData);
        success("Lease created successfully");
      }
      setContractFile(null);
    },
    onError: (errorMessage) => {
      error(errorMessage);
    },
    validation: { validateOnChange: true, debounceValidation: 300 },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      case "terminated":
        return <Badge variant="secondary">Terminated</Badge>;
      case "pending":
        return <Badge variant="default">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        error("File size must be less than 5MB");
        return;
      }
      // Validate file type
      if (file.type !== "application/pdf") {
        error("Only PDF files are allowed");
        return;
      }
      setContractFile(file);
    }
  };

  const handleEdit = (lease: Lease) => {
    setEditingLease(lease);
    wizard.updateFormData({
      propertyId: lease.propertyId,
      tenantId: lease.tenantId,
      startDate: lease.startDate.split("T")[0],
      endDate: lease.endDate.split("T")[0],
      monthlyRent: lease.monthlyRent,
      deposit: lease.deposit,
      taxRegime: lease.taxRegime as LeaseFormData["taxRegime"],
      autoRenew: lease.autoRenew,
      renewalNoticeDays: lease.renewalNoticeDays,
      notes: lease.notes || "",
    });
    setContractFile(null);
    setWizardOpen(true);
  };

  const handleDelete = (id: string) => {
    confirmDialog.confirm(
      {
        title: "Delete Lease",
        description:
          "This lease agreement will be permanently removed. This action cannot be undone.",
        confirmLabel: "Delete Lease",
        variant: "destructive",
      },
      async () => {
        await deleteLease(id);
        success("Lease deleted successfully");
      },
    );
  };

  const toggleLeaseSelection = (id: string) => {
    setSelectedLeaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (visibleIds: string[]) => {
    if (selectedLeaseIds.size === visibleIds.length && visibleIds.every((id) => selectedLeaseIds.has(id))) {
      setSelectedLeaseIds(new Set());
    } else {
      setSelectedLeaseIds(new Set(visibleIds));
    }
  };

  const handleBulkRentIncrease = async () => {
    const pct = parseFloat(bulkPct);
    if (isNaN(pct) || pct <= 0 || pct > 100) return;
    setBulkApplying(true);
    try {
      for (const id of selectedLeaseIds) {
        const lease = leases.find((l) => l.id === id);
        if (!lease) continue;
        const newRent = Math.round(lease.monthlyRent * (1 + pct / 100) * 100) / 100;
        await updateLease(id, { monthlyRent: newRent });
      }
      success(`Rent increased by ${pct}% for ${selectedLeaseIds.size} lease(s).`);
      setBulkIncreaseOpen(false);
      setBulkPct("");
      setSelectedLeaseIds(new Set());
    } catch {
      error("Failed to apply rent increase. Please try again.");
    } finally {
      setBulkApplying(false);
    }
  };

  const handleDownloadNotices = () => {
    const pct = parseFloat(bulkPct);
    const today = new Date().toLocaleDateString();
    const lines: string[] = [];
    for (const id of selectedLeaseIds) {
      const lease = leases.find((l) => l.id === id);
      const tenant = tenants.find((t) => t.id === lease?.tenantId);
      const property = properties.find((p) => p.id === lease?.propertyId);
      if (!lease || !tenant || !property) continue;
      const newRent = isNaN(pct)
        ? lease.monthlyRent
        : Math.round(lease.monthlyRent * (1 + pct / 100) * 100) / 100;
      lines.push(
        `Dear ${tenant.name},`,
        ``,
        `We are writing to inform you that the monthly rent for the property at`,
        `${property.address} will be updated as follows:`,
        ``,
        `  Current rent: ${formatCurrency(lease.monthlyRent)}/month`,
        `  New rent:     ${formatCurrency(newRent)}/month${isNaN(pct) ? "" : ` (${pct}% increase)`}`,
        `  Effective:    ${today}`,
        ``,
        `If you have any questions, please contact us.`,
        ``,
        `Kind regards,`,
        `Property Management`,
        ``,
        `${"─".repeat(60)}`,
        ``,
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rent-increase-notices-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Auto-open wizard when navigating from LeaseDetailView with ?action=edit|renew&id=X
  useEffect(() => {
    const action = searchParams.get("action");
    const id = searchParams.get("id");
    if (!action || !id || loading) return;
    const target = leases.find((l) => l.id === id);
    if (!target) return;
    if (action === "edit") {
      handleEdit(target);
    } else if (action === "renew") {
      handleEdit(target);
    }
    // Clear the query params after opening
    router.replace(`/${locale}/leases`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, leases, loading]);

  const handleDownloadContract = (lease: Lease) => {
    if (lease.contractFile) {
      // Convert Buffer to Uint8Array for Blob compatibility
      const uint8Array = new Uint8Array(lease.contractFile);
      const blob = new Blob([uint8Array], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = lease.contractFileName || `lease-${lease.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Filter and search leases
  const filteredLeases = useMemo(() => {
    return leases.filter((lease) => {
      // Search filter (tenant name, property name)
      const tenantName = tenants.find((t) => t.id === lease.tenantId)?.name || "";
      const propertyName = properties.find((p) => p.id === lease.propertyId)?.name || "";
      const matchesSearch =
        searchQuery.length === 0 ||
        tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        propertyName.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === "all" || lease.status === statusFilter;

      // Tax regime filter
      const matchesTaxRegime = taxRegimeFilter === "all" || lease.taxRegime === taxRegimeFilter;

      return matchesSearch && matchesStatus && matchesTaxRegime;
    });
  }, [leases, tenants, properties, searchQuery, statusFilter, taxRegimeFilter]);

  // Sorting
  const {
    sortedData: sortedLeases,
    requestSort,
    getSortDirection,
  } = useSortableData(filteredLeases);

  const expiringSoon = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + 60);
    return leases.filter((l) => {
      if (l.status !== "active") return false;
      const end = new Date(l.endDate);
      return end >= now && end <= cutoff;
    });
  }, [leases]);

  if (loading) {
    return <LoadingState variant="cards" count={6} />;
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Lease Management"
          description="Manage lease agreements and contract documents"
        >
          <ExportButton
            data={sortedLeases}
            filename="leases"
            columns={[
              {
                key: "tenantId",
                label: "Tenant",
                format: (value) => tenants.find((t) => t.id === value)?.name || "Unknown",
              },
              {
                key: "propertyId",
                label: "Property",
                format: (value) => properties.find((p) => p.id === value)?.name || "Unknown",
              },
              {
                key: "startDate",
                label: "Start Date",
                format: (value) => new Date(value as string).toLocaleDateString(),
              },
              {
                key: "endDate",
                label: "End Date",
                format: (value) => new Date(value as string).toLocaleDateString(),
              },
              {
                key: "monthlyRent",
                label: "Monthly Rent",
                format: (value) => formatCurrency(value as number),
              },
              {
                key: "deposit",
                label: "Deposit",
                format: (value) => formatCurrency(value as number),
              },
              { key: "status", label: "Status" },
              { key: "taxRegime", label: "Tax Regime" },
            ]}
          />

          {/* Multi-Step Wizard Dialog */}
          <Dialog
            open={wizardOpen}
            onOpenChange={(open) => {
              setWizardOpen(open);
              if (!open) {
                setEditingLease(null);
                setContractFile(null);
                wizard.resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setWizardOpen(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Lease
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-[var(--color-foreground)]">
                  {editingLease ? "Edit Lease" : "Create New Lease"}
                </DialogTitle>
                <DialogDescription>
                  {editingLease
                    ? "Update lease agreement details"
                    : "Follow the steps to create a comprehensive lease agreement"}
                </DialogDescription>
              </DialogHeader>

              {/* Draft recovery banner */}
              {wizard.hasDraft && !editingLease && (
                <DraftBanner
                  onRestore={() => {
                    // Data is auto-loaded in hook
                  }}
                  onDiscard={() => {
                    wizard.clearDraft();
                    wizard.resetForm();
                  }}
                />
              )}

              {/* Multi-step form */}
              <MultiStepFormContainer
                steps={wizardSteps}
                currentStep={wizard.currentStep}
                completedSteps={wizard.visitedSteps}
                visitedSteps={wizard.visitedSteps}
                progress={wizard.progress}
                isSubmitting={wizard.isSubmitting}
                isFirstStep={wizard.isFirstStep}
                isLastStep={wizard.isLastStep}
                onPrevStep={wizard.prevStep}
                onNextStep={wizard.nextStep}
                onSubmit={wizard.handleSubmit}
                onGoToStep={wizard.goToStep}
                indicatorVariant="pills"
                submitText={editingLease ? "Update Lease" : "Create Lease"}
              >
                {/* Step 1: Property Selection */}
                {wizard.currentStep === 0 && (
                  <StepContent
                    title="Select Property"
                    description="Choose the property for this lease agreement"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="propertyId">Property *</Label>
                      <Select
                        value={wizard.formData.propertyId}
                        onValueChange={(value) => wizard.updateFormData({ propertyId: value })}
                      >
                        <SelectTrigger
                          className={wizard.stepErrors.propertyId ? "border-red-500" : ""}
                        >
                          <SelectValue placeholder="Select a property..." />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.length === 0 ? (
                            <div className="p-4 text-center text-sm text-[var(--color-muted-foreground)]">
                              No properties available. Create a property first.
                            </div>
                          ) : (
                            properties.map((property) => (
                              <SelectItem key={property.id} value={property.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{property.name}</span>
                                  <span className="text-xs text-[var(--color-muted-foreground)]">
                                    {property.address}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {properties.length === 0 && (
                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4 text-center">
                          <p className="text-sm text-[var(--color-muted-foreground)] mb-2">
                            No properties found. Create a property first.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/${locale}/portfolio`)}
                          >
                            <Plus className="w-4 h-4 mr-2" /> Go to Portfolio
                          </Button>
                        </div>
                      )}
                      {wizard.stepErrors.propertyId && (
                        <p className="text-sm text-destructive">{wizard.stepErrors.propertyId}</p>
                      )}
                    </div>
                  </StepContent>
                )}

                {/* Step 2: Tenant Selection */}
                {wizard.currentStep === 1 && (
                  <StepContent title="Select Tenant" description="Choose the tenant for this lease">
                    <div className="space-y-2">
                      <Label htmlFor="tenantId">Tenant *</Label>
                      <Select
                        value={wizard.formData.tenantId}
                        onValueChange={(value) => wizard.updateFormData({ tenantId: value })}
                      >
                        <SelectTrigger
                          className={wizard.stepErrors.tenantId ? "border-red-500" : ""}
                        >
                          <SelectValue placeholder="Select a tenant..." />
                        </SelectTrigger>
                        <SelectContent>
                          {tenants.length === 0 ? (
                            <div className="p-4 text-center text-sm text-[var(--color-muted-foreground)]">
                              No tenants available. Create a tenant first.
                            </div>
                          ) : (
                            tenants.map((tenant) => (
                              <SelectItem key={tenant.id} value={tenant.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{tenant.name}</span>
                                  <span className="text-xs text-[var(--color-muted-foreground)]">
                                    {tenant.email}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {tenants.length === 0 && (
                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4 text-center">
                          <p className="text-sm text-[var(--color-muted-foreground)] mb-2">
                            No tenants found. Create a tenant first.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/${locale}/people`)}
                          >
                            <Plus className="w-4 h-4 mr-2" /> Go to People
                          </Button>
                        </div>
                      )}
                      {wizard.stepErrors.tenantId && (
                        <p className="text-sm text-destructive">{wizard.stepErrors.tenantId}</p>
                      )}
                    </div>
                  </StepContent>
                )}

                {/* Step 3: Lease Terms */}
                {wizard.currentStep === 2 && (
                  <StepContent
                    title="Lease Terms"
                    description="Set rental amounts and lease duration"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date *</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={wizard.formData.startDate}
                          onChange={(e) =>
                            wizard.updateFormData({
                              startDate: e.target.value,
                            })
                          }
                          className={wizard.stepErrors.startDate ? "border-red-500" : ""}
                        />
                        {wizard.stepErrors.startDate && (
                          <p className="text-sm text-destructive">{wizard.stepErrors.startDate}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date *</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={wizard.formData.endDate}
                          onChange={(e) => wizard.updateFormData({ endDate: e.target.value })}
                          className={wizard.stepErrors.endDate ? "border-red-500" : ""}
                        />
                        {wizard.stepErrors.endDate && (
                          <p className="text-sm text-destructive">{wizard.stepErrors.endDate}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="monthlyRent">Monthly Rent ({currencySymbol}) *</Label>
                        <Input
                          id="monthlyRent"
                          type="number"
                          min="0"
                          step="0.01"
                          value={wizard.formData.monthlyRent}
                          onChange={(e) =>
                            wizard.updateFormData({
                              monthlyRent: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={wizard.stepErrors.monthlyRent ? "border-red-500" : ""}
                        />
                        {wizard.stepErrors.monthlyRent && (
                          <p className="text-sm text-destructive">
                            {wizard.stepErrors.monthlyRent}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="deposit">Security Deposit ({currencySymbol}) *</Label>
                        <Input
                          id="deposit"
                          type="number"
                          min="0"
                          step="0.01"
                          value={wizard.formData.deposit}
                          onChange={(e) =>
                            wizard.updateFormData({
                              deposit: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={wizard.stepErrors.deposit ? "border-red-500" : ""}
                        />
                        {wizard.stepErrors.deposit && (
                          <p className="text-sm text-destructive">{wizard.stepErrors.deposit}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="taxRegime">Tax Regime</Label>
                        <Select
                          value={wizard.formData.taxRegime || ""}
                          onValueChange={(value) =>
                            wizard.updateFormData({
                              taxRegime: value as LeaseFormData["taxRegime"],
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select tax regime..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="portugal_rendimentos">
                              Portugal - Rendimentos
                            </SelectItem>
                            <SelectItem value="spain_inmuebles">
                              Spain - Inmuebles Urbanos
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="renewalNoticeDays">Renewal Notice (Days)</Label>
                        <Input
                          id="renewalNoticeDays"
                          type="number"
                          min="0"
                          value={wizard.formData.renewalNoticeDays}
                          onChange={(e) =>
                            wizard.updateFormData({
                              renewalNoticeDays: parseInt(e.target.value) || 60,
                            })
                          }
                        />
                      </div>
                    </div>
                  </StepContent>
                )}

                {/* Step 4: Documents & Notes */}
                {wizard.currentStep === 3 && (
                  <StepContent
                    title="Documents & Notes"
                    description="Upload contract and add additional information"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="contractFile">Lease Contract (PDF)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="contractFile"
                          type="file"
                          accept=".pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <Label
                          htmlFor="contractFile"
                          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-secondary)] border border-[var(--color-border)] rounded-md cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          {contractFile ? contractFile.name : "Choose PDF file"}
                        </Label>
                        {contractFile && (
                          <span className="text-sm text-[var(--color-muted-foreground)]">
                            {(contractFile.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Maximum file size: 5MB. PDF format only.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        value={wizard.formData.notes}
                        onChange={(e) => wizard.updateFormData({ notes: e.target.value })}
                        placeholder="Add any special terms, conditions, or notes about this lease..."
                        rows={6}
                        className={wizard.stepErrors.notes ? "border-red-500" : ""}
                      />
                      {wizard.stepErrors.notes && (
                        <p className="text-sm text-destructive">{wizard.stepErrors.notes}</p>
                      )}
                    </div>
                  </StepContent>
                )}
              </MultiStepFormContainer>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {/* Search and Filter */}
        <SearchFilter
          searchPlaceholder="Search leases by tenant or property name..."
          onSearchChange={setSearchQuery}
          onFilterChange={(key, value) => {
            if (key === "status") setStatusFilter(value);
            if (key === "taxRegime") setTaxRegimeFilter(value);
          }}
          filters={[
            {
              key: "status",
              label: "Status",
              options: [
                { label: "All Statuses", value: "all" },
                { label: "Active", value: "active" },
                { label: "Pending", value: "pending" },
                { label: "Expired", value: "expired" },
                { label: "Terminated", value: "terminated" },
              ],
              defaultValue: "all",
            },
            {
              key: "taxRegime",
              label: "Tax Regime",
              options: [
                { label: "All Regimes", value: "all" },
                { label: "Exempt (Article 9)", value: "article9" },
                { label: "IVA (Article 53)", value: "article53" },
              ],
              defaultValue: "all",
            },
          ]}
        />

        <div className="flex items-center justify-end">
          <DataViewToggle mode={dataViewMode} onChange={handleViewModeChange} />
        </div>

        {expiringSoon.length > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <p className="font-medium text-amber-600 dark:text-amber-400">
                {expiringSoon.length} lease{expiringSoon.length > 1 ? "s" : ""} expiring within 60
                days
              </p>
              <p className="mt-1 text-[var(--color-muted-foreground)]">
                {expiringSoon
                  .map((l) => {
                    const tenant = tenants.find((t) => t.id === l.tenantId)?.name ?? "Unknown";
                    const end = new Date(l.endDate).toLocaleDateString();
                    return `${tenant} (${end})`;
                  })
                  .join(" · ")}
              </p>
            </div>
          </div>
        )}

        {dataViewMode === "table" ? (
          /* Table View */
          filteredLeases.length === 0 ? (
            leases.length === 0 && (properties.length === 0 || tenants.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-[var(--color-muted-foreground)] mb-4" />
                <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">
                  Get started with leases
                </h3>
                <p className="text-sm text-[var(--color-muted-foreground)] mb-6 max-w-md">
                  To create your first lease, you&apos;ll need at least one property and one tenant.
                </p>
                <div className="flex items-center gap-3">
                  {properties.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/${locale}/portfolio`)}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Create Portfolio Property
                    </Button>
                  )}
                  {tenants.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/${locale}/people`)}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Create Person
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <EmptyStateIllustration
                type={leases.length === 0 ? "leases" : "generic"}
                title={leases.length === 0 ? undefined : "No leases found"}
                description={
                  leases.length === 0 ? undefined : "Try adjusting your search or filters"
                }
                onAction={leases.length === 0 ? dialog.openDialog : undefined}
                actionLabel={leases.length === 0 ? "Add First Lease" : undefined}
              />
            )
          ) : (
            <>
              {/* Bulk actions bar */}
              {selectedLeaseIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-indigo-950/60 border border-indigo-800/50 rounded-lg">
                  <span className="text-sm font-medium text-indigo-300">
                    {selectedLeaseIds.size} lease{selectedLeaseIds.size !== 1 ? "s" : ""} selected
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <Dialog open={bulkIncreaseOpen} onOpenChange={setBulkIncreaseOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="border-indigo-700 text-indigo-300 hover:text-indigo-100">
                          <TrendingUp className="h-4 w-4 mr-1.5" />
                          Increase Rent
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[380px]">
                        <DialogHeader>
                          <DialogTitle>Bulk Rent Increase</DialogTitle>
                          <DialogDescription>
                            Apply a percentage increase to {selectedLeaseIds.size} selected lease{selectedLeaseIds.size !== 1 ? "s" : ""}.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="bulk-pct">Increase percentage (%)</Label>
                            <div className="flex gap-2">
                              <Input
                                id="bulk-pct"
                                type="number"
                                min="0.1"
                                max="100"
                                step="0.1"
                                placeholder="e.g. 3.5"
                                value={bulkPct}
                                onChange={(e) => setBulkPct(e.target.value)}
                                className="flex-1"
                              />
                              <span className="flex items-center text-sm text-zinc-400">%</span>
                            </div>
                          </div>

                          {/* Preview */}
                          {bulkPct && !isNaN(parseFloat(bulkPct)) && parseFloat(bulkPct) > 0 && (
                            <div className="rounded-md bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800 text-sm max-h-48 overflow-y-auto">
                              {[...selectedLeaseIds].map((id) => {
                                const lease = leases.find((l) => l.id === id);
                                if (!lease) return null;
                                const tenant = tenants.find((t) => t.id === lease.tenantId);
                                const newRent = Math.round(
                                  lease.monthlyRent * (1 + parseFloat(bulkPct) / 100) * 100,
                                ) / 100;
                                return (
                                  <div key={id} className="flex items-center justify-between px-3 py-2">
                                    <span className="text-zinc-400 truncate max-w-[180px]">
                                      {tenant?.name ?? id}
                                    </span>
                                    <span className="text-zinc-500 line-through mr-2">
                                      {formatCurrency(lease.monthlyRent)}
                                    </span>
                                    <span className="text-green-400 font-medium">
                                      {formatCurrency(newRent)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleDownloadNotices}
                              disabled={!bulkPct || isNaN(parseFloat(bulkPct))}
                            >
                              <Mail className="h-4 w-4 mr-1.5" />
                              Download Notices
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleBulkRentIncrease}
                              disabled={
                                bulkApplying ||
                                !bulkPct ||
                                isNaN(parseFloat(bulkPct)) ||
                                parseFloat(bulkPct) <= 0
                              }
                            >
                              {bulkApplying ? "Applying…" : "Apply Increase"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-zinc-500 hover:text-zinc-300"
                      onClick={() => setSelectedLeaseIds(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--color-border)] hover:bg-transparent">
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={
                          sortedLeases.length > 0 &&
                          sortedLeases.every((l) => selectedLeaseIds.has(l.id))
                        }
                        onChange={() => toggleSelectAll(sortedLeases.map((l) => l.id))}
                        aria-label="Select all leases"
                      />
                    </TableHead>
                    <TableHead className="text-[var(--color-muted-foreground)]">Property</TableHead>
                    <TableHead className="text-[var(--color-muted-foreground)]">Tenant</TableHead>
                    <TableHead className="text-[var(--color-muted-foreground)]">
                      <SortableHeader
                        sortKey="startDate"
                        label="Start"
                        currentSort={getSortDirection("startDate")}
                        onSort={(key) => requestSort(key as keyof Lease)}
                      />
                    </TableHead>
                    <TableHead className="text-[var(--color-muted-foreground)]">End</TableHead>
                    <TableHead className="text-[var(--color-muted-foreground)]">
                      <SortableHeader
                        sortKey="monthlyRent"
                        label="Monthly Rent"
                        currentSort={getSortDirection("monthlyRent")}
                        onSort={(key) => requestSort(key as keyof Lease)}
                      />
                    </TableHead>
                    <TableHead className="text-[var(--color-muted-foreground)]">
                      <SortableHeader
                        sortKey="status"
                        label="Status"
                        currentSort={getSortDirection("status")}
                        onSort={(key) => requestSort(key as keyof Lease)}
                      />
                    </TableHead>
                    <TableHead className="text-[var(--color-muted-foreground)] w-24">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeases.map((lease: Lease) => (
                    <TableRow
                      key={lease.id}
                      className={cn(
                        "border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]",
                        selectedLeaseIds.has(lease.id) && "bg-indigo-950/30",
                      )}
                    >
                      <TableCell className="pl-4 w-10">
                        <Checkbox
                          checked={selectedLeaseIds.has(lease.id)}
                          onChange={() => toggleLeaseSelection(lease.id)}
                          aria-label={`Select lease for ${lease.tenant?.name ?? lease.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-[var(--color-foreground)]">
                        {lease.property?.name}
                      </TableCell>
                      <TableCell className="text-sm text-[var(--color-muted-foreground)]">
                        {lease.tenant?.name}
                      </TableCell>
                      <TableCell className="text-sm text-[var(--color-muted-foreground)]">
                        {new Date(lease.startDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-[var(--color-muted-foreground)]">
                        {new Date(lease.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-[var(--color-foreground)]">
                        {formatCurrency(lease.monthlyRent)}
                      </TableCell>
                      <TableCell>{getStatusBadge(lease.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(lease)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Lease
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(lease.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Lease
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )
        ) : (
          <>
            {/* Sortable Column Headers */}
            {filteredLeases.length > 0 && (
              <div className="flex items-center gap-4 px-4 py-2 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                <div className="flex-1">
                  <SortableHeader
                    sortKey="startDate"
                    label="Start Date"
                    currentSort={getSortDirection("startDate")}
                    onSort={(key) => requestSort(key as keyof Lease)}
                  />
                </div>
                <div className="w-32">
                  <SortableHeader
                    sortKey="monthlyRent"
                    label="Rent"
                    currentSort={getSortDirection("monthlyRent")}
                    onSort={(key) => requestSort(key as keyof Lease)}
                  />
                </div>
                <div className="w-32">
                  <SortableHeader
                    sortKey="status"
                    label="Status"
                    currentSort={getSortDirection("status")}
                    onSort={(key) => requestSort(key as keyof Lease)}
                  />
                </div>
              </div>
            )}

            {/* Leases List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLeases.length === 0 ? (
                <div className="col-span-full">
                  {leases.length === 0 && (properties.length === 0 || tenants.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <FileText className="h-12 w-12 text-[var(--color-muted-foreground)] mb-4" />
                      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">
                        Get started with leases
                      </h3>
                      <p className="text-sm text-[var(--color-muted-foreground)] mb-6 max-w-md">
                        To create your first lease, you&apos;ll need at least one property and one
                        tenant.
                      </p>
                      <div className="flex items-center gap-3">
                        {properties.length === 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/${locale}/portfolio`)}
                          >
                            <Plus className="w-4 h-4 mr-2" /> Create Portfolio Property
                          </Button>
                        )}
                        {tenants.length === 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/${locale}/people`)}
                          >
                            <Plus className="w-4 h-4 mr-2" /> Create Person
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <EmptyStateIllustration
                      type={leases.length === 0 ? "leases" : "generic"}
                      title={leases.length === 0 ? undefined : "No leases found"}
                      description={
                        leases.length === 0 ? undefined : "Try adjusting your search or filters"
                      }
                      onAction={leases.length === 0 ? dialog.openDialog : undefined}
                      actionLabel={leases.length === 0 ? "Add First Lease" : undefined}
                    />
                  )}
                </div>
              ) : (
                sortedLeases.map((lease: Lease) => (
                  <Card
                    key={lease.id}
                    className="overflow-hidden transition-all hover:shadow-lg cursor-pointer"
                    onClick={() => router.push(`/${locale}/leases/${lease.id}`)}
                  >
                    <div className="aspect-video w-full bg-[var(--color-secondary)] relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FileText className="h-16 w-16 text-[var(--color-muted-foreground)]" />
                      </div>
                      <div className="absolute top-3 right-3">{getStatusBadge(lease.status)}</div>
                    </div>
                    <CardHeader>
                      <CardTitle className="text-[var(--color-foreground)] flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {lease.tenant?.name}
                      </CardTitle>
                      <CardDescription className="flex items-start gap-1">
                        <Building2 className="h-4 w-4 shrink-0 mt-0.5" />
                        <span className="text-xs">{lease.property?.name}</span>
                      </CardDescription>
                      {/* Relationship badges */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(() => {
                          const days = lease.endDate ? daysUntil(lease.endDate) : null;
                          if (days !== null && days <= 30 && days >= 0) {
                            return (
                              <RelationshipBadge variant="expiry" label={`${days}d to expiry`} />
                            );
                          }
                          if (days !== null && days < 0) {
                            return <RelationshipBadge variant="overdue" label="Expired" />;
                          }
                          return null;
                        })()}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-muted-foreground)]">Rent</span>
                        <span className="font-semibold text-[var(--color-foreground)]">
                          {formatCurrency(lease.monthlyRent)}/mo
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[var(--color-muted-foreground)]">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(lease.startDate).toLocaleDateString()}</span>
                        </div>
                        <span>to</span>
                        <span>{new Date(lease.endDate).toLocaleDateString()}</span>
                      </div>
                      {lease.contractFile && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--color-muted-foreground)]">
                            Contract
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadContract(lease);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                              <MoreHorizontal className="w-4 h-4" />
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(lease)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Lease
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(lease.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Lease
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
      <ConfirmationDialog dialog={confirmDialog} />
    </>
  );
}
