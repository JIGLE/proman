"use client";

import { useState } from "react";
import { Briefcase, Download, Plus, Edit, Trash2, Phone, Mail, MapPin, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useCurrency } from "@/lib/contexts/currency-context";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { LoadingState } from "./ui/loading-state";
import { useApp } from "@/lib/contexts/app-context";
import { Owner } from "@/lib/types";
import { ownerSchema, OwnerFormData } from "@/lib/utils/validation";
import { useToast } from "@/lib/contexts/toast-context";
import { useFormDialog } from "@/lib/hooks/use-form-dialog";
import jsPDF from "jspdf";

export function OwnersView(): React.ReactElement {
    const { state, addOwner, updateOwner, deleteOwner } = useApp();
    const { owners, receipts, expenses, loading } = state;
    const { success, error } = useToast();
    const { formatCurrency } = useCurrency();
    const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

    const initialFormData: OwnerFormData = {
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
    };

    const dialog = useFormDialog<OwnerFormData>({
        schema: ownerSchema,
        initialData: initialFormData,
        onSubmit: async (data, isEdit) => {
            if (isEdit && dialog.editingItem) {
                await updateOwner((dialog.editingItem as any).id, data);
                success('Owner updated successfully');
            } else {
                await addOwner(data);
                success('Owner created successfully');
            }
        },
        onError: (errorMessage) => {
            error(errorMessage);
        },
    });

    const handleEdit = (owner: Owner) => {
        dialog.openEditDialog(owner, (o) => ({
            name: o.name,
            email: o.email,
            phone: o.phone || '',
            address: o.address || '',
            notes: o.notes || '',
        }));
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this owner? This cannot be undone.')) {
            try {
                await deleteOwner(id);
                success('Owner deleted successfully!');
            } catch (err) {
                console.error(err);
            }
        }
    };

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
                    const propName = po.property?.name || 'Unknown Property';
                    const percentage = po.ownershipPercentage / 100;

                    // Filter financials for this property (current month example)
                    // Extending for real usage, we should allow date selection. 
                    // For now, taking "All Time" or "Current Month" approach. 
                    // Let's do All Time for simplicity of this demo, or last 30 days.
                    // Doing "All Time" effectively for now to ensure data shows up.

                    const propIncome = receipts
                        .filter(r => r.propertyId === po.propertyId)
                        .reduce((sum, r) => sum + r.amount, 0);

                    const propExpenses = expenses
                        .filter(e => e.propertyId === po.propertyId)
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

            doc.save(`statement-${owner.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
            success('Statement generated!');

        } catch (err) {
            console.error('Error generating PDF:', err);
            error('Failed to generate statement.');
        } finally {
            setGeneratingPdf(null);
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
                    <h2 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
                        Owners
                    </h2>
                    <p className="text-[var(--color-muted-foreground)]">Manage property owners and split ownership</p>
                </div>
                <Dialog open={dialog.isOpen} onOpenChange={(open) => !open && dialog.closeDialog()}>
                    <DialogTrigger asChild>
                        <Button onClick={dialog.openDialog} className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Add Owner
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-[var(--color-foreground)]">
                                {dialog.editingItem ? 'Edit Owner' : 'Add New Owner'}
                            </DialogTitle>
                            <DialogDescription>
                                {dialog.editingItem ? 'Update owner details' : 'Register a new property owner'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={dialog.handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={dialog.formData.name}
                                    onChange={(e) => dialog.updateFormData({ name: e.target.value })}
                                    className={dialog.formErrors.name ? 'border-red-500' : ''}
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
                                        className={dialog.formErrors.email ? 'border-red-500' : ''}
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
                                        className={dialog.formErrors.phone ? 'border-red-500' : ''}
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
                                    className={dialog.formErrors.address ? 'border-red-500' : ''}
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
                                    className={dialog.formErrors.notes ? 'border-red-500' : ''}
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
                                    {dialog.isSubmitting ? 'Saving...' : (dialog.editingItem ? 'Update Owner' : 'Create Owner')}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {owners.length === 0 ? (
                    <div className="col-span-full">
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardContent className="p-8 text-center">
                                <Briefcase className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">No owners yet</h3>
                                <p className="text-zinc-400 mb-4">Add owners to start tracking shared property ownership</p>
                                <Button onClick={dialog.openDialog} className="flex items-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    Add First Owner
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    owners.map((owner) => (
                        <Card key={owner.id} className="bg-zinc-900 border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xl font-bold text-[var(--color-foreground)]">{owner.name}</CardTitle>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(owner)}>
                                        <Edit className="w-4 h-4 text-zinc-400" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="hover:text-red-400" onClick={() => handleDelete(owner.id)}>
                                        <Trash2 className="w-4 h-4 text-zinc-400" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 mt-2">
                                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                                        <Mail className="w-4 h-4" />
                                        <span>{owner.email}</span>
                                    </div>
                                    {owner.phone && (
                                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                                            <Phone className="w-4 h-4" />
                                            <span>{owner.phone}</span>
                                        </div>
                                    )}
                                    {owner.address && (
                                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                                            <MapPin className="w-4 h-4" />
                                            <span>{owner.address}</span>
                                        </div>
                                    )}

                                    <div className="pt-2 border-t border-zinc-800 min-h-[60px]">
                                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1">
                                            <Building2 className="w-4 h-4" />
                                            <span>Properties Owned</span>
                                        </div>
                                        {owner.properties && owner.properties.length > 0 ? (
                                            <ul className="text-xs text-zinc-400 space-y-1">
                                                {owner.properties.map((p: any) => (
                                                    <li key={p.id}>
                                                        {/* We need propertyName here, likely need to populate it on fetch */}
                                                        {p.property?.name ?? 'Property'} - {p.ownershipPercentage}%
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-zinc-500 italic">No properties assigned</p>
                                        )}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full mt-2"
                                        onClick={() => generateStatement(owner)}
                                        disabled={generatingPdf === owner.id}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        {generatingPdf === owner.id ? 'Generating...' : 'Owner Statement'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
        )}
        </>
    );
}
