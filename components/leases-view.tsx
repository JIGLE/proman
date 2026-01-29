import { useState, useMemo } from "react";
import { FileText, Upload, Download, Plus, Edit, Trash2, Calendar, User, Building2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import { useSortableData, SortDirection } from "@/lib/hooks/use-sortable-data";
import { LeaseStatus } from "@prisma/client";

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

  const dialog = useFormDialog<LeaseFormData, any>({
    schema: leaseSchema,
    initialData: initialFormData,
    onSubmit: async (data, isEdit) => {
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
    dialog.openEditDialog(lease, (l) => ({
      propertyId: l.propertyId,
      tenantId: l.tenantId,
      startDate: l.startDate.split('T')[0],
      endDate: l.endDate.split('T')[0],
      monthlyRent: l.monthlyRent,
      deposit: l.deposit,
      taxRegime: l.taxRegime,
      autoRenew: l.autoRenew,
      renewalNoticeDays: l.renewalNoticeDays,
      notes: l.notes || '',
    }));
    setContractFile(null);
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
          <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
            Lease Management
          </h2>
          <p className="text-zinc-400">Manage lease agreements and contract documents</p>
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
        <Dialog open={dialog.isOpen} onOpenChange={(open) => !open && dialog.closeDialog()}>
          <DialogTrigger asChild>
            <Button onClick={dialog.openDialog} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Lease
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-50">
                {dialog.editingItem ? 'Edit Lease' : 'Add New Lease'}
              </DialogTitle>
              <DialogDescription>
                {dialog.editingItem ? 'Update lease agreement details' : 'Create a new lease agreement'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={dialog.handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="propertyId">Property</Label>
                <Select
                  value={dialog.formData.propertyId}
                  onValueChange={(value) => dialog.updateFormData({ propertyId: value })}
                >
                  <SelectTrigger className={dialog.formErrors.propertyId ? 'border-red-500' : ''}>
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
                {dialog.formErrors.propertyId && (
                  <p className="text-sm text-red-400">{dialog.formErrors.propertyId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenantId">Tenant</Label>
                <Select
                  value={dialog.formData.tenantId}
                  onValueChange={(value) => dialog.updateFormData({ tenantId: value })}
                >
                  <SelectTrigger className={dialog.formErrors.tenantId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name} - {tenant.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dialog.formErrors.tenantId && (
                  <p className="text-sm text-red-400">{dialog.formErrors.tenantId}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dialog.formData.startDate}
                  onChange={(e) => dialog.updateFormData({ startDate: e.target.value })}
                  className={dialog.formErrors.startDate ? 'border-red-500' : ''}
                />
                {dialog.formErrors.startDate && (
                  <p className="text-sm text-red-400">{dialog.formErrors.startDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dialog.formData.endDate}
                  onChange={(e) => dialog.updateFormData({ endDate: e.target.value })}
                  className={dialog.formErrors.endDate ? 'border-red-500' : ''}
                />
                {dialog.formErrors.endDate && (
                  <p className="text-sm text-red-400">{dialog.formErrors.endDate}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyRent">Monthly Rent (€)</Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  min="0"
                  step="0.01"
                  value={dialog.formData.monthlyRent}
                  onChange={(e) => dialog.updateFormData({ monthlyRent: parseFloat(e.target.value) || 0 })}
                  className={dialog.formErrors.monthlyRent ? 'border-red-500' : ''}
                />
                {dialog.formErrors.monthlyRent && (
                  <p className="text-sm text-red-400">{dialog.formErrors.monthlyRent}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit">Deposit (€)</Label>
                <Input
                  id="deposit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={dialog.formData.deposit}
                  onChange={(e) => dialog.updateFormData({ deposit: parseFloat(e.target.value) || 0 })}
                  className={dialog.formErrors.deposit ? 'border-red-500' : ''}
                />
                {dialog.formErrors.deposit && (
                  <p className="text-sm text-red-400">{dialog.formErrors.deposit}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxRegime">Tax Regime</Label>
                <Select
                  value={dialog.formData.taxRegime || ''}
                  onValueChange={(value) => dialog.updateFormData({ taxRegime: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tax regime" />
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
                  value={dialog.formData.renewalNoticeDays}
                  onChange={(e) => dialog.updateFormData({ renewalNoticeDays: parseInt(e.target.value) || 60 })}
                />
              </div>
            </div>

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
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-md cursor-pointer hover:bg-zinc-700"
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
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={dialog.formData.notes}
                onChange={(e) => dialog.updateFormData({ notes: e.target.value })}
                placeholder="Additional lease terms or notes..."
                className={dialog.formErrors.notes ? 'border-red-500' : ''}
              />
                {dialog.formErrors.notes && (
                  <p className="text-sm text-red-400">{dialog.formErrors.notes}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={dialog.closeDialog}>
                Cancel
              </Button>
                <Button type="submit" disabled={dialog.isSubmitting}>
                  {dialog.isSubmitting ? 'Saving...' : (dialog.editingItem ? 'Update Lease' : 'Create Lease')}
              </Button>
            </div>
          </form>
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
              <h3 className="text-lg font-semibold text-zinc-50 mb-2">
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
                <CardTitle className="text-zinc-50 flex items-center gap-2">
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
                  <span className="font-semibold text-zinc-50">
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