import { useState, useMemo } from "react";
import { FileText, Upload, Download, Plus, Edit, Trash2, Calendar, User, Building2, ArrowUpDown, ArrowUp, ArrowDown, Home, DollarSign, FileCheck } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";
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
import { leaseSchema, LeaseFormData } from "@/lib/validation";
import { useToast } from "@/lib/toast-context";
import { useFormDialog } from "@/lib/hooks/use-form-dialog";
import { useMultiStepForm, StepConfig } from "@/lib/hooks/use-multi-step-form";
import { MultiStepFormContainer, StepContent, DraftBanner, MultiStepFormStep } from "./ui/multi-step-form";
import { useSortableData, SortDirection } from "@/lib/hooks/use-sortable-data";
import { LeaseStatus } from "@prisma/client";
import { z } from "zod";

export type LeasesViewProps = Record<string, never>

interface SortableHeaderProps {
  column: string;
  label: string;
  sortDirection: SortDirection;
  onSort: (column: any) => void;
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

export function LeasesView(): React.ReactElement {
  const { state, addLease, updateLease, deleteLease } = useApp();
  const { properties, tenants, leases, loading } = state;
  const { success, error } = useToast();
  const { formatCurrency } = useCurrency();
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingLease, setEditingLease] = useState<any>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [taxRegimeFilter, setTaxRegimeFilter] = useState<string>('all');

  const initialFormData: LeaseFormData = {
    propertyId: '',
    tenantId: '',
    startDate: '',
    endDate: '',
    monthlyRent: 0,
    deposit: 0,
    taxRegime: undefined,
    autoRenew: false,
    renewalNoticeDays: 60,
    notes: '',
  };

  // Multi-step form configuration
  const steps: StepConfig<LeaseFormData>[] = [
    {
      id: 'property',
      title: 'Property Selection',
      description: 'Choose the property for this lease',
      fields: ['propertyId'],
    },
    {
      id: 'tenant',
      title: 'Tenant Details',
      description: 'Select the tenant',
      fields: ['tenantId'],
    },
    {
      id: 'terms',
      title: 'Lease Terms',
      description: 'Set rental terms and conditions',
      fields: ['startDate', 'endDate', 'monthlyRent', 'deposit', 'taxRegime', 'autoRenew', 'renewalNoticeDays'],
    },
    {
      id: 'notes',
      title: 'Additional Info',
      description: 'Add notes and contract documents',
      fields: ['notes'],
    },
  ];

  const wizardSteps: MultiStepFormStep[] = [
    { id: 'property', title: 'Property', icon: <Home className="h-4 w-4" /> },
    { id: 'tenant', title: 'Tenant', icon: <User className="h-4 w-4" /> },
    { id: 'terms', title: 'Terms', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'notes', title: 'Documents', icon: <FileCheck className="h-4 w-4" /> },
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
        status: 'active' as const,
      };

      if (editingLease) {
        await updateLease(editingLease.id, leaseData);
        success('Lease updated successfully');
      } else {
        await addLease(leaseData);
        success('Lease created successfully');
      }
      
      setWizardOpen(false);
      setEditingLease(null);
      setContractFile(null);
      wizard.resetForm();
    },
    persistence: {
      key: 'lease-wizard-draft',
      ttl: 24 * 60 * 60 * 1000, // 24 hours
    },
  });

  const dialog = useFormDialog<LeaseFormData, any>({
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
        status: 'active' as const,
      };

      if (isEdit && dialog.editingItem) {
        await updateLease(dialog.editingItem.id, leaseData);
        success('Lease updated successfully');
      } else {
        await addLease(leaseData);
        success('Lease created successfully');
      }
      setContractFile(null);
    },
    onError: (errorMessage) => {
      error(errorMessage);
    },
  });

  const getStatusBadge = (status: LeaseStatus) => {
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
        error('File size must be less than 5MB');
        return;
      }
      // Validate file type
      if (file.type !== 'application/pdf') {
        error('Only PDF files are allowed');
        return;
      }
      setContractFile(file);
    }
  };

  const handleEdit = (lease: any) => {
    setEditingLease(lease);
    wizard.updateFormData({
      propertyId: lease.propertyId,
      tenantId: lease.tenantId,
      startDate: lease.startDate.split('T')[0],
      endDate: lease.endDate.split('T')[0],
      monthlyRent: lease.monthlyRent,
      deposit: lease.deposit,
      taxRegime: lease.taxRegime,
      autoRenew: lease.autoRenew,
      renewalNoticeDays: lease.renewalNoticeDays,
      notes: lease.notes || '',
    });
    setContractFile(null);
    setWizardOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this lease?')) {
      try {
        await deleteLease(id);
        success('Lease deleted successfully');
      } catch (err) {
        error('Failed to delete lease');
      }
    }
  };

  const handleDownloadContract = (lease: any) => {
    if (lease.contractFile) {
      const blob = new Blob([lease.contractFile], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
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
      const tenantName = tenants.find(t => t.id === lease.tenantId)?.name || '';
      const propertyName = properties.find(p => p.id === lease.propertyId)?.name || '';
      const matchesSearch = searchQuery.length === 0 || 
        tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        propertyName.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || lease.status === statusFilter;

      // Tax regime filter
      const matchesTaxRegime = taxRegimeFilter === 'all' || lease.taxRegime === taxRegimeFilter;

      return matchesSearch && matchesStatus && matchesTaxRegime;
    });
  }, [leases, tenants, properties, searchQuery, statusFilter, taxRegimeFilter]);

  // Sorting
  const { sortedData: sortedLeases, requestSort, getSortDirection } = useSortableData(filteredLeases);

  if (loading) {
    return <LoadingState variant="cards" count={6} />;
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
            Lease Management
          </h2>
          <p className="text-[var(--color-muted-foreground)]">Manage lease agreements and contract documents</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={sortedLeases}
            filename="leases"
            columns={[
              { 
                key: 'tenantId', 
                label: 'Tenant',
                format: (value) => tenants.find(t => t.id === value)?.name || 'Unknown'
              },
              { 
                key: 'propertyId', 
                label: 'Property',
                format: (value) => properties.find(p => p.id === value)?.name || 'Unknown'
              },
              { 
                key: 'startDate', 
                label: 'Start Date',
                format: (value) => new Date(value).toLocaleDateString()
              },
              { 
                key: 'endDate', 
                label: 'End Date',
                format: (value) => new Date(value).toLocaleDateString()
              },
              { 
                key: 'monthlyRent', 
                label: 'Monthly Rent',
                format: (value) => formatCurrency(value)
              },
              { 
                key: 'deposit', 
                label: 'Deposit',
                format: (value) => formatCurrency(value)
              },
              { key: 'status', label: 'Status' },
              { key: 'taxRegime', label: 'Tax Regime' },
            ]}
          />
          
          {/* Multi-Step Wizard Dialog */}
          <Dialog open={wizardOpen} onOpenChange={(open) => {
            setWizardOpen(open);
            if (!open) {
              setEditingLease(null);
              setContractFile(null);
              wizard.resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setWizardOpen(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Lease
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-[var(--color-foreground)]">
                  {editingLease ? 'Edit Lease' : 'Create New Lease'}
                </DialogTitle>
                <DialogDescription>
                  {editingLease ? 'Update lease agreement details' : 'Follow the steps to create a comprehensive lease agreement'}
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
                        <SelectTrigger className={wizard.stepErrors.propertyId ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select a property..." />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.length === 0 ? (
                            <div className="p-4 text-center text-sm text-zinc-400">
                              No properties available. Create a property first.
                            </div>
                          ) : (
                            properties.map((property) => (
                              <SelectItem key={property.id} value={property.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{property.name}</span>
                                  <span className="text-xs text-zinc-400">{property.address}</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {wizard.stepErrors.propertyId && (
                        <p className="text-sm text-red-400">{wizard.stepErrors.propertyId}</p>
                      )}
                    </div>
                  </StepContent>
                )}

                {/* Step 2: Tenant Selection */}
                {wizard.currentStep === 1 && (
                  <StepContent 
                    title="Select Tenant" 
                    description="Choose the tenant for this lease"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="tenantId">Tenant *</Label>
                      <Select
                        value={wizard.formData.tenantId}
                        onValueChange={(value) => wizard.updateFormData({ tenantId: value })}
                      >
                        <SelectTrigger className={wizard.stepErrors.tenantId ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select a tenant..." />
                        </SelectTrigger>
                        <SelectContent>
                          {tenants.length === 0 ? (
                            <div className="p-4 text-center text-sm text-zinc-400">
                              No tenants available. Create a tenant first.
                            </div>
                          ) : (
                            tenants.map((tenant) => (
                              <SelectItem key={tenant.id} value={tenant.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{tenant.name}</span>
                                  <span className="text-xs text-zinc-400">{tenant.email}</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {wizard.stepErrors.tenantId && (
                        <p className="text-sm text-red-400">{wizard.stepErrors.tenantId}</p>
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
                          onChange={(e) => wizard.updateFormData({ startDate: e.target.value })}
                          className={wizard.stepErrors.startDate ? 'border-red-500' : ''}
                        />
                        {wizard.stepErrors.startDate && (
                          <p className="text-sm text-red-400">{wizard.stepErrors.startDate}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date *</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={wizard.formData.endDate}
                          onChange={(e) => wizard.updateFormData({ endDate: e.target.value })}
                          className={wizard.stepErrors.endDate ? 'border-red-500' : ''}
                        />
                        {wizard.stepErrors.endDate && (
                          <p className="text-sm text-red-400">{wizard.stepErrors.endDate}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="monthlyRent">Monthly Rent (€) *</Label>
                        <Input
                          id="monthlyRent"
                          type="number"
                          min="0"
                          step="0.01"
                          value={wizard.formData.monthlyRent}
                          onChange={(e) => wizard.updateFormData({ monthlyRent: parseFloat(e.target.value) || 0 })}
                          className={wizard.stepErrors.monthlyRent ? 'border-red-500' : ''}
                        />
                        {wizard.stepErrors.monthlyRent && (
                          <p className="text-sm text-red-400">{wizard.stepErrors.monthlyRent}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="deposit">Security Deposit (€) *</Label>
                        <Input
                          id="deposit"
                          type="number"
                          min="0"
                          step="0.01"
                          value={wizard.formData.deposit}
                          onChange={(e) => wizard.updateFormData({ deposit: parseFloat(e.target.value) || 0 })}
                          className={wizard.stepErrors.deposit ? 'border-red-500' : ''}
                        />
                        {wizard.stepErrors.deposit && (
                          <p className="text-sm text-red-400">{wizard.stepErrors.deposit}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="taxRegime">Tax Regime</Label>
                        <Select
                          value={wizard.formData.taxRegime || ''}
                          onValueChange={(value) => wizard.updateFormData({ taxRegime: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select tax regime..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="portugal_rendimentos">Portugal - Rendimentos</SelectItem>
                            <SelectItem value="spain_inmuebles">Spain - Inmuebles Urbanos</SelectItem>
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
                          onChange={(e) => wizard.updateFormData({ renewalNoticeDays: parseInt(e.target.value) || 60 })}
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
                          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-md cursor-pointer hover:bg-zinc-700 transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          {contractFile ? contractFile.name : 'Choose PDF file'}
                        </Label>
                        {contractFile && (
                          <span className="text-sm text-zinc-400">
                            {(contractFile.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">Maximum file size: 5MB. PDF format only.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        value={wizard.formData.notes}
                        onChange={(e) => wizard.updateFormData({ notes: e.target.value })}
                        placeholder="Add any special terms, conditions, or notes about this lease..."
                        rows={6}
                        className={wizard.stepErrors.notes ? 'border-red-500' : ''}
                      />
                      {wizard.stepErrors.notes && (
                        <p className="text-sm text-red-400">{wizard.stepErrors.notes}</p>
                      )}
                    </div>
                  </StepContent>
                )}
              </MultiStepFormContainer>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filter */}
      <SearchFilter
        searchPlaceholder="Search leases by tenant or property name..."
        onSearchChange={setSearchQuery}
        onFilterChange={(key, value) => {
          if (key === 'status') setStatusFilter(value);
          if (key === 'taxRegime') setTaxRegimeFilter(value);
        }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { label: 'All Statuses', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Pending', value: 'pending' },
              { label: 'Expired', value: 'expired' },
              { label: 'Terminated', value: 'terminated' }
            ],
            defaultValue: 'all'
          },
          {
            key: 'taxRegime',
            label: 'Tax Regime',
            options: [
              { label: 'All Regimes', value: 'all' },
              { label: 'Exempt (Article 9)', value: 'article9' },
              { label: 'IVA (Article 53)', value: 'article53' }
            ],
            defaultValue: 'all'
          }
        ]}
      />

      {/* Sortable Column Headers */}
      {filteredLeases.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <div className="flex-1">
            <SortableHeader column="startDate" label="Start Date" sortDirection={getSortDirection('startDate')} onSort={requestSort} />
          </div>
          <div className="w-32">
            <SortableHeader column="monthlyRent" label="Rent" sortDirection={getSortDirection('monthlyRent')} onSort={requestSort} />
          </div>
          <div className="w-32">
            <SortableHeader column="status" label="Status" sortDirection={getSortDirection('status')} onSort={requestSort} />
          </div>
        </div>
      )}

      {/* Leases List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLeases.length === 0 ? (
          <Card className="col-span-full bg-zinc-900 border-zinc-800">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-zinc-600 mb-4" />
              <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">
                {leases.length === 0 ? 'No Leases Yet' : 'No leases found'}
              </h3>
              <p className="text-zinc-400 text-center mb-4">
                {leases.length === 0 
                  ? 'Create your first lease agreement to get started with lease management.' 
                  : 'Try adjusting your search or filters'}
              </p>
              {leases.length === 0 && (
                <Button
                  onClick={dialog.openDialog}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Lease
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          sortedLeases.map((lease: any) => (
            <Card
              key={lease.id}
              className="overflow-hidden transition-all hover:shadow-lg hover:shadow-zinc-900/50"
            >
              <div className="aspect-video w-full bg-gradient-to-br from-zinc-800 to-zinc-900 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="h-16 w-16 text-zinc-700" />
                </div>
                <div className="absolute top-3 right-3">
                  {getStatusBadge(lease.status)}
                </div>
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
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Rent</span>
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {formatCurrency(lease.monthlyRent)}/mo
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(lease.startDate).toLocaleDateString()}</span>
                  </div>
                  <span>to</span>
                  <span>{new Date(lease.endDate).toLocaleDateString()}</span>
                </div>
                {lease.contractFile && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Contract</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadContract(lease)}
                      className="flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </Button>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(lease)}
                    className="flex-1 flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(lease.id)}
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
    </>
  );
}