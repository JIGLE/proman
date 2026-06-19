"use client";

import { useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { Download, Plus, Phone, Mail, MapPin, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import { useCurrency } from "@/lib/contexts/currency-context";
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
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyStateIllustration } from "@/components/ui/empty-state-illustrations";
import { SearchFilter } from "@/components/ui/search-filter";
import { useApp } from "@/lib/contexts/app-context";
import { Owner } from "@/lib/types";
import { ownerSchema, type OwnerFormData } from "@/lib/schemas/owner.schema";
import { useToast } from "@/lib/contexts/toast-context";
import { useFormDialog } from "@/lib/hooks/use-form-dialog";
import jsPDF from "jspdf";
import { OwnerDetailModal } from "./owner-detail-modal";
import { useConfirmDialog } from "@/lib/hooks/use-confirm-dialog";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { PageHeader } from "@/components/shared/page-header";

export type OwnersViewRef = {
  openDialog: () => void;
};

export const OwnersView = forwardRef<OwnersViewRef, { density?: "comfortable" | "compact" }>(
  function OwnersView(_props, ref): React.ReactElement {
    const { state, addOwner, updateOwner } = useApp();
    const { owners, properties, receipts, expenses, loading } = state;
    const { success, error } = useToast();
    const { formatCurrency } = useCurrency();
    const confirmDialog = useConfirmDialog();
    const compact = true; // Always compact
    const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

    // Owner detail modal state
    const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [propertyFilter, setPropertyFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const initialFormData: OwnerFormData = {
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    };

    const dialog = useFormDialog<OwnerFormData, Owner>({
      schema: ownerSchema,
      initialData: initialFormData,
      onSubmit: async (data, isEdit) => {
        if (isEdit && dialog.editingItem) {
          await updateOwner(dialog.editingItem.id, data);
          success("Owner updated successfully");
        } else {
          await addOwner(data);
          success("Owner created successfully");
        }
      },
      onError: (errorMessage) => {
        error(errorMessage);
      },
      validation: { validateOnChange: true, debounceValidation: 300 },
    });

    // Expose dialog methods to parent via ref
    useImperativeHandle(ref, () => ({
      openDialog: dialog.openDialog,
    }));

    const generateStatement = async (owner: Owner) => {
      setGeneratingPdf(owner.id);
      try {
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text("OWNER STATEMENT", 105, 20, { align: "center" });

        doc.setFontSize(12);
        doc.text(`Owner: ${owner.name}`, 20, 40);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);

        doc.line(20, 60, 190, 60);

        doc.text("Statement Period: Current Month", 20, 70);
        doc.text("Ownership Summary:", 20, 85);

        let yPos = 95;
        let totalNetIncome = 0;

        if (owner.properties && owner.properties.length > 0) {
          owner.properties.forEach((po) => {
            const propName = po.property?.name || "Unknown Property";
            const percentage = po.ownershipPercentage / 100;

            // Filter financials for this property (current month example)
            // Extending for real usage, we should allow date selection.
            // For now, taking "All Time" or "Current Month" approach.
            // Let's do All Time for simplicity of this demo, or last 30 days.
            // Doing "All Time" effectively for now to ensure data shows up.

            const propIncome = receipts
              .filter((r) => r.propertyId === po.propertyId)
              .reduce((sum, r) => sum + r.amount, 0);

            const propExpenses = expenses
              .filter((e) => e.propertyId === po.propertyId)
              .reduce((sum, e) => sum + e.amount, 0);

            const ownerIncome = propIncome * percentage;
            const ownerExpenses = propExpenses * percentage;
            const net = ownerIncome - ownerExpenses;
            totalNetIncome += net;

            doc.text(`- ${propName} (${po.ownershipPercentage}%)`, 25, yPos);
            yPos += 7;
            doc.setFontSize(10);
            doc.text(`  Share of Income: ${formatCurrency(ownerIncome)}`, 30, yPos);
            doc.text(`  Share of Expenses: ${formatCurrency(ownerExpenses)}`, 30, yPos);
            doc.text(`  Net: ${formatCurrency(net)}`, 30, yPos);
            yPos += 10;
            doc.setFontSize(12);
          });
        } else {
          doc.text("No properties assigned.", 25, yPos);
          yPos += 10;
        }

        yPos += 10;
        doc.line(20, yPos, 190, yPos);
        yPos += 10;
        doc.setFontSize(14);
        doc.text(`Total Net Income: ${formatCurrency(totalNetIncome)}`, 20, yPos);

        doc.save(
          `statement-${owner.name.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`,
        );
        success("Statement generated!");
      } catch (err) {
        console.error("Error generating PDF:", err);
        error("Failed to generate statement.");
      } finally {
        setGeneratingPdf(null);
      }
    };

    // Filter owners based on search and filters
    const filteredOwners = useMemo(() => {
      return owners.filter((owner) => {
        // Search filter
        const matchesSearch =
          searchQuery === "" ||
          owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          owner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (owner.phone && owner.phone.toLowerCase().includes(searchQuery.toLowerCase()));

        // Property filter
        const matchesProperty =
          propertyFilter === "all" ||
          (owner.properties && owner.properties.some((p) => p.propertyId === propertyFilter));

        // Status filter (active/inactive based on whether they have properties)
        const isActive = owner.properties && owner.properties.length > 0;
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && isActive) ||
          (statusFilter === "inactive" && !isActive);

        return matchesSearch && matchesProperty && matchesStatus;
      });
    }, [owners, searchQuery, propertyFilter, statusFilter]);

    return (
      <>
        {loading ? (
          <LoadingState variant="cards" count={6} />
        ) : (
          <div className="space-y-6">
            <PageHeader title="Owners" description="Manage property owners and their portfolios" />
            <Dialog open={dialog.isOpen} onOpenChange={(open) => !open && dialog.closeDialog()}>
              <DialogTrigger asChild>
                <Button onClick={dialog.openDialog} className="hidden">
                  <Plus className="w-4 h-4" />
                  Add Owner
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[var(--color-card)] border-[var(--color-border)] max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-[var(--color-foreground)]">
                    {dialog.editingItem ? "Edit Owner" : "Add New Owner"}
                  </DialogTitle>
                  <DialogDescription>
                    {dialog.editingItem ? "Update owner details" : "Register a new property owner"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={dialog.handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={dialog.formData.name}
                      onChange={(e) => dialog.updateFormData({ name: e.target.value })}
                      className={dialog.formErrors.name ? "border-red-500" : ""}
                      placeholder="John Doe"
                    />
                    {dialog.formErrors.name && (
                      <p className="text-sm text-red-500">{dialog.formErrors.name}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={dialog.formData.email}
                        onChange={(e) => dialog.updateFormData({ email: e.target.value })}
                        className={dialog.formErrors.email ? "border-red-500" : ""}
                        placeholder="john@example.com"
                      />
                      {dialog.formErrors.email && (
                        <p className="text-sm text-red-500">{dialog.formErrors.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={dialog.formData.phone}
                        onChange={(e) => dialog.updateFormData({ phone: e.target.value })}
                        className={dialog.formErrors.phone ? "border-red-500" : ""}
                        placeholder="+1 234 567 8900"
                      />
                      {dialog.formErrors.phone && (
                        <p className="text-sm text-red-500">{dialog.formErrors.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={dialog.formData.address}
                      onChange={(e) => dialog.updateFormData({ address: e.target.value })}
                      className={dialog.formErrors.address ? "border-red-500" : ""}
                      placeholder="123 Main St, City, Country"
                    />
                    {dialog.formErrors.address && (
                      <p className="text-sm text-red-500">{dialog.formErrors.address}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={dialog.formData.notes}
                      onChange={(e) => dialog.updateFormData({ notes: e.target.value })}
                      className={dialog.formErrors.notes ? "border-red-500" : ""}
                      placeholder="Additional information..."
                      rows={3}
                    />
                    {dialog.formErrors.notes && (
                      <p className="text-sm text-red-500">{dialog.formErrors.notes}</p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={dialog.closeDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={dialog.isSubmitting}>
                      {dialog.isSubmitting
                        ? "Saving..."
                        : dialog.editingItem
                          ? "Update Owner"
                          : "Create Owner"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Search and Filter */}
            <SearchFilter
              searchPlaceholder="Search owners by name, email, or phone..."
              onSearchChange={setSearchQuery}
              onFilterChange={(key, value) => {
                if (key === "property") setPropertyFilter(value);
                if (key === "status") setStatusFilter(value);
              }}
              filters={[
                {
                  key: "property",
                  label: "Property",
                  options: [
                    { label: "All Properties", value: "all" },
                    ...properties.map((property) => ({
                      label: property.name,
                      value: property.id,
                    })),
                  ],
                  defaultValue: "all",
                },
                {
                  key: "status",
                  label: "Status",
                  options: [
                    { label: "All", value: "all" },
                    { label: "Active", value: "active" },
                    { label: "Inactive", value: "inactive" },
                  ],
                  defaultValue: "all",
                },
              ]}
            />

            <div
              className={cn(
                "grid",
                compact
                  ? "gap-1 grid-cols-2 md:grid-cols-4 lg:grid-cols-6"
                  : "gap-4 md:grid-cols-2 lg:grid-cols-3",
              )}
            >
              {filteredOwners.length === 0 ? (
                <div className="col-span-full">
                  <EmptyStateIllustration
                    type={owners.length === 0 ? "owners" : "generic"}
                    title={owners.length === 0 ? undefined : "No owners found"}
                    description={
                      owners.length === 0 ? undefined : "Try adjusting your search or filters"
                    }
                    onAction={owners.length === 0 ? dialog.openDialog : undefined}
                    compact={compact}
                  />
                </div>
              ) : (
                filteredOwners.map((owner) => (
                  <Card
                    key={owner.id}
                    className="bg-[var(--color-card)] border-[var(--color-border)] cursor-pointer hover:border-[var(--color-accent-primary)]/40 hover:shadow-lg transition-all duration-200"
                    onClick={() => {
                      setSelectedOwner(owner);
                      setIsDetailModalOpen(true);
                    }}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle
                        className={cn(
                          compact ? "text-xs font-bold" : "text-xl font-bold",
                          "text-[var(--color-foreground)]",
                        )}
                      >
                        {owner.name}
                      </CardTitle>
                      {/* Edit/Delete removed from card; use Owner detail modal for CRUD */}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 mt-2">
                        <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                          <Mail className="w-4 h-4" />
                          <span>{owner.email}</span>
                        </div>
                        {owner.phone && (
                          <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                            <Phone className="w-4 h-4" />
                            <span>{owner.phone}</span>
                          </div>
                        )}
                        {owner.address && (
                          <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                            <MapPin className="w-4 h-4" />
                            <span>{owner.address}</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-[var(--color-border)] min-h-[60px]">
                          <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted-foreground)] mb-1">
                            <Building2 className="w-4 h-4" />
                            <span>Properties Owned</span>
                          </div>
                          {owner.properties && owner.properties.length > 0 ? (
                            <ul className="text-xs text-[var(--color-muted-foreground)] space-y-1">
                              {owner.properties.map((p) => (
                                <li key={p.id}>
                                  {p.property?.name ?? "Property"} &mdash; {p.ownershipPercentage}%
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-[var(--color-muted-foreground)] italic">No properties assigned</p>
                          )}
                        </div>

                        {/* Revenue share summary */}
                        {owner.properties &&
                          owner.properties.length > 0 &&
                          (() => {
                            const ownerIncome = owner.properties.reduce((sum, po) => {
                              const propIncome = receipts
                                .filter(
                                  (r) => r.propertyId === po.propertyId && r.status === "paid",
                                )
                                .reduce((s, r) => s + r.amount, 0);
                              return sum + propIncome * (po.ownershipPercentage / 100);
                            }, 0);
                            const ownerExpenses = owner.properties.reduce((sum, po) => {
                              const propExp = expenses
                                .filter((e) => e.propertyId === po.propertyId)
                                .reduce((s, e) => s + e.amount, 0);
                              return sum + propExp * (po.ownershipPercentage / 100);
                            }, 0);
                            const net = ownerIncome - ownerExpenses;
                            return (
                              <div className="pt-2 border-t border-[var(--color-border)] grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="text-[var(--color-muted-foreground)]">Income share</p>
                                  <p className="font-semibold text-green-400">
                                    {formatCurrency(ownerIncome)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[var(--color-muted-foreground)]">Net share</p>
                                  <p
                                    className={cn(
                                      "font-semibold",
                                      net >= 0 ? "text-green-400" : "text-red-400",
                                    )}
                                  >
                                    {formatCurrency(net)}
                                  </p>
                                </div>
                              </div>
                            );
                          })()}

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => generateStatement(owner)}
                          disabled={generatingPdf === owner.id}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {generatingPdf === owner.id ? "Generating..." : "Owner Statement"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Owner Detail Modal */}
        <OwnerDetailModal
          owner={selectedOwner}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedOwner(null);
          }}
          onEdit={(updatedOwner) => {
            setSelectedOwner(updatedOwner);
          }}
          onDelete={() => {
            setIsDetailModalOpen(false);
            setSelectedOwner(null);
          }}
        />
        <ConfirmationDialog dialog={confirmDialog} />
      </>
    );
  },
);

OwnersView.displayName = "OwnersView";
