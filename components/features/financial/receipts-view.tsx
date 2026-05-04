"use client";

import { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import {
  FileText,
  Download,
  Calendar,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrency } from "@/lib/contexts/currency-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { EmptyStateIllustration } from "@/components/ui/empty-state-illustrations";
import { useApp } from "@/lib/contexts/app-context";
import { Receipt } from "@/lib/types";
import { receiptSchema, type ReceiptFormData } from "@/lib/schemas/receipt.schema";
import { useToast } from "@/lib/contexts/toast-context";
import { useFormDialog } from "@/lib/hooks/use-form-dialog";
import { usePortalAccess } from "@/lib/contexts/portal-context";
import jsPDF from "jspdf";
import { useConfirmDialog } from "@/lib/hooks/use-confirm-dialog";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { PageHeader } from "@/components/shared/page-header";

export interface ReceiptsViewProps {
  tenantId?: string;
  propertyId?: string;
}

export interface ReceiptsViewRef {
  openDialog: () => void;
}

export const ReceiptsView = forwardRef<ReceiptsViewRef, ReceiptsViewProps>(
  function ReceiptsView(props, ref) {
    const { state, addReceipt, updateReceipt, deleteReceipt } = useApp();
    const { isOwnerPortal } = usePortalAccess();
    const { receipts, tenants, properties, loading } = state;
    const { success, error } = useToast();
    const { formatCurrency } = useCurrency();
    const confirmDialog = useConfirmDialog();
    const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

    const initialFormData: ReceiptFormData = {
      tenantId: "",
      propertyId: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      type: "rent",
      status: "pending",
      description: "",
    };

    const dialog = useFormDialog<ReceiptFormData, Receipt>({
      schema: receiptSchema,
      initialData: initialFormData,
      onSubmit: async (data, isEdit) => {
        if (isEdit && dialog.editingItem) {
          await updateReceipt(dialog.editingItem.id, data);
          success("Receipt updated successfully");
        } else {
          await addReceipt(data);
          success("Receipt created successfully");
        }
      },
      onError: (errorMessage) => {
        error(errorMessage);
      },
      validation: { validateOnChange: true, debounceValidation: 300 },
    });
    const { editingItem, isOpen, openDialog, updateFormData } = dialog;

    useImperativeHandle(ref, () => ({
      openDialog,
    }));

    useEffect(() => {
      if (!isOpen || editingItem) {
        return;
      }

      const updates: Partial<ReceiptFormData> = {};
      if (props.tenantId) {
        updates.tenantId = props.tenantId;
      }
      if (props.propertyId) {
        updates.propertyId = props.propertyId;
      }

      if (Object.keys(updates).length > 0) {
        updateFormData(updates);
      }
    }, [editingItem, isOpen, props.propertyId, props.tenantId, updateFormData]);

    const filteredReceipts = useMemo(
      () =>
        receipts.filter((receipt) => {
          if (props.tenantId && receipt.tenantId !== props.tenantId) {
            return false;
          }
          if (props.propertyId && receipt.propertyId !== props.propertyId) {
            return false;
          }
          return true;
        }),
      [props.propertyId, props.tenantId, receipts],
    );

    const description = props.tenantId
      ? "Record payments and receipts for the selected tenant."
      : props.propertyId
        ? "Record payments and receipts for the selected property."
        : isOwnerPortal
          ? "Record payments, issue receipts, and export PDF confirmations."
          : "Review your payment history and download receipts linked to your lease.";

    const handleEdit = (receipt: Receipt) => {
      dialog.openEditDialog(receipt, (r) => ({
        tenantId: r.tenantId,
        propertyId: r.propertyId,
        amount: r.amount,
        date: r.date,
        type: r.type,
        status: r.status,
        description: r.description || "",
      }));
    };

    const handleDelete = (id: string) => {
      confirmDialog.confirm(
        {
          title: "Delete Receipt",
          description: "This receipt will be permanently removed. This action cannot be undone.",
          confirmLabel: "Delete Receipt",
          variant: "destructive",
        },
        async () => {
          await deleteReceipt(id);
          success("Receipt deleted successfully!");
        },
      );
    };

    const generatePDF = async (receipt: Receipt) => {
      setGeneratingPdf(receipt.id);

      try {
        const doc = new jsPDF();

        // Set up the PDF
        doc.setFontSize(20);
        doc.text("PAYMENT RECEIPT", 105, 20, { align: "center" });

        // Receipt details
        doc.setFontSize(12);
        doc.text(`Receipt #: ${receipt.id}`, 20, 40);
        doc.text(`Date: ${new Date(receipt.date).toLocaleDateString()}`, 20, 50);

        // Separator
        doc.setLineWidth(0.5);
        doc.line(20, 60, 190, 60);

        // Tenant and Property Info
        doc.setFontSize(14);
        doc.text("TENANT INFORMATION", 20, 75);
        doc.setFontSize(11);
        doc.text(`Name: ${receipt.tenantName}`, 20, 85);
        doc.text(`Property: ${receipt.propertyName}`, 20, 95);

        // Payment details
        doc.setFontSize(14);
        doc.text("PAYMENT DETAILS", 20, 115);
        doc.setFontSize(11);
        doc.text(`Amount: ${formatCurrency(receipt.amount)}`, 20, 125);
        doc.text(`Type: ${receipt.type.charAt(0).toUpperCase() + receipt.type.slice(1)}`, 20, 135);
        if (receipt.description) {
          doc.text(`Description: ${receipt.description}`, 20, 145);
        }

        // Footer
        doc.setFontSize(10);
        doc.text("Thank you for your payment!", 105, 170, { align: "center" });
        doc.text("Property Management Services", 105, 180, { align: "center" });

        // Save the PDF
        doc.save(`receipt-${receipt.id}.pdf`);
      } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Error generating PDF. Please try again.");
      } finally {
        setGeneratingPdf(null);
      }
    };

    const getTypeBadge = (type: Receipt["type"]) => {
      const colors = {
        rent: "bg-[var(--color-info-muted)] text-[var(--color-info)]",
        deposit: "bg-[var(--color-success-muted)] text-[var(--color-success)]",
        maintenance: "bg-orange-600/20 text-orange-400",
        other: "bg-gray-600/20 text-gray-400",
      };
      return <Badge className={colors[type]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>;
    };

    return (
      <>
        {loading ? (
          <LoadingState variant="cards" count={6} />
        ) : (
          <div className="space-y-6">
            <PageHeader title="Receipts" description={description}>
              {isOwnerPortal && (
                <Dialog open={dialog.isOpen} onOpenChange={(open) => !open && dialog.closeDialog()}>
                  <DialogTrigger asChild>
                    <Button onClick={dialog.openDialog} className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Receipt
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-[var(--color-foreground)]">
                        {dialog.editingItem ? "Edit Receipt" : "Add New Receipt"}
                      </DialogTitle>
                      <DialogDescription>
                        {dialog.editingItem
                          ? "Update receipt information"
                          : "Create a new payment receipt"}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={dialog.handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tenant">Tenant</Label>
                          <Select
                            value={dialog.formData.tenantId}
                            onValueChange={(value) => dialog.updateFormData({ tenantId: value })}
                          >
                            <SelectTrigger
                              className={dialog.formErrors.tenantId ? "border-red-500" : ""}
                            >
                              <SelectValue placeholder="Select tenant" />
                            </SelectTrigger>
                            <SelectContent>
                              {tenants.map((tenant) => (
                                <SelectItem key={tenant.id} value={tenant.id}>
                                  {tenant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {dialog.formErrors.tenantId && (
                            <p className="text-sm text-destructive">{dialog.formErrors.tenantId}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="property">Property</Label>
                          <Select
                            value={dialog.formData.propertyId}
                            onValueChange={(value) => dialog.updateFormData({ propertyId: value })}
                          >
                            <SelectTrigger
                              className={dialog.formErrors.propertyId ? "border-red-500" : ""}
                            >
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                            <SelectContent>
                              {properties.map((property) => (
                                <SelectItem key={property.id} value={property.id}>
                                  {property.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {dialog.formErrors.propertyId && (
                            <p className="text-sm text-destructive">
                              {dialog.formErrors.propertyId}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Amount ($)</Label>
                          <Input
                            id="amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={dialog.formData.amount}
                            onChange={(e) =>
                              dialog.updateFormData({
                                amount: parseFloat(e.target.value) || 0,
                              })
                            }
                            className={dialog.formErrors.amount ? "border-red-500" : ""}
                            required
                          />
                          {dialog.formErrors.amount && (
                            <p className="text-sm text-destructive">{dialog.formErrors.amount}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="date">Payment Date</Label>
                          <Input
                            id="date"
                            type="date"
                            value={dialog.formData.date}
                            onChange={(e) => dialog.updateFormData({ date: e.target.value })}
                            className={dialog.formErrors.date ? "border-red-500" : ""}
                            required
                          />
                          {dialog.formErrors.date && (
                            <p className="text-sm text-destructive">{dialog.formErrors.date}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type">Payment Type</Label>
                          <Select
                            value={dialog.formData.type}
                            onValueChange={(value: Receipt["type"]) =>
                              dialog.updateFormData({ type: value })
                            }
                          >
                            <SelectTrigger
                              className={dialog.formErrors.type ? "border-red-500" : ""}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rent">Rent</SelectItem>
                              <SelectItem value="deposit">Deposit</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {dialog.formErrors.type && (
                            <p className="text-sm text-destructive">{dialog.formErrors.type}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                          id="description"
                          value={dialog.formData.description}
                          onChange={(e) => dialog.updateFormData({ description: e.target.value })}
                          className={dialog.formErrors.description ? "border-red-500" : ""}
                          rows={3}
                        />
                        {dialog.formErrors.description && (
                          <p className="text-sm text-destructive">
                            {dialog.formErrors.description}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={dialog.closeDialog}>
                          Cancel
                        </Button>
                        <Button type="submit" loading={dialog.isSubmitting}>
                          {dialog.editingItem ? "Update Receipt" : "Create Receipt"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </PageHeader>

            <div className="grid gap-4">
              {filteredReceipts.length === 0 ? (
                <EmptyStateIllustration
                  type="receipts"
                  onAction={isOwnerPortal ? dialog.openDialog : undefined}
                />
              ) : (
                filteredReceipts.map((receipt) => (
                  <Card key={receipt.id} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                            <FileText className="h-6 w-6 text-zinc-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                                Receipt #{receipt.id.split("-")[1]}
                              </h3>
                              {getTypeBadge(receipt.type)}
                            </div>
                            <p className="text-sm text-zinc-400">
                              {receipt.tenantName} - {receipt.propertyName}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-zinc-400 mt-1">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(receipt.date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                <span>{formatCurrency(receipt.amount)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => generatePDF(receipt)}
                                disabled={generatingPdf === receipt.id}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                {generatingPdf === receipt.id ? "Generating..." : "Download PDF"}
                              </DropdownMenuItem>
                              {isOwnerPortal && (
                                <>
                                  <DropdownMenuItem onClick={() => handleEdit(receipt)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Receipt
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDelete(receipt.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Receipt
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      {receipt.description && (
                        <p className="text-sm text-zinc-400 mt-4">{receipt.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
        <ConfirmationDialog dialog={confirmDialog} />
      </>
    );
  },
);

ReceiptsView.displayName = "ReceiptsView";
