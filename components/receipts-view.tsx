"use client";

import { useState } from "react";
import { FileText, Download, Calendar, Plus, Edit, Trash2, DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useApp } from "@/lib/app-context";
import { Receipt } from "@/lib/types";
import jsPDF from "jspdf";

export function ReceiptsView() {
  const { state, dispatch } = useApp();
  const { receipts, tenants, properties } = state;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tenantId: '',
    propertyId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    type: 'rent' as Receipt['type'],
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedTenant = tenants.find(t => t.id === formData.tenantId);
    const selectedProperty = properties.find(p => p.id === formData.propertyId);

    const receiptData: Receipt = {
      id: editingReceipt?.id || `receipt-${Date.now()}`,
      ...formData,
      tenantName: selectedTenant?.name || '',
      propertyName: selectedProperty?.name || '',
      status: 'paid',
      createdAt: editingReceipt?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingReceipt) {
      dispatch({ type: 'UPDATE_RECEIPT', payload: receiptData });
    } else {
      dispatch({ type: 'ADD_RECEIPT', payload: receiptData });
    }

    setIsDialogOpen(false);
    setEditingReceipt(null);
    resetForm();
  };

  const handleEdit = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setFormData({
      tenantId: receipt.tenantId,
      propertyId: receipt.propertyId,
      amount: receipt.amount,
      date: receipt.date,
      type: receipt.type,
      description: receipt.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this receipt?')) {
      dispatch({ type: 'DELETE_RECEIPT', payload: id });
    }
  };

  const resetForm = () => {
    setFormData({
      tenantId: '',
      propertyId: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      type: 'rent',
      description: '',
    });
  };

  const openAddDialog = () => {
    setEditingReceipt(null);
    resetForm();
    setIsDialogOpen(true);
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
      doc.text(`Amount: $${receipt.amount.toLocaleString()}`, 20, 125);
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
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const getTypeBadge = (type: Receipt["type"]) => {
    const colors = {
      rent: "bg-blue-600/20 text-blue-400",
      deposit: "bg-green-600/20 text-green-400",
      maintenance: "bg-orange-600/20 text-orange-400",
      other: "bg-gray-600/20 text-gray-400",
    };
    return (
      <Badge className={colors[type]}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
            Receipts
          </h2>
          <p className="text-zinc-400">Manage payment receipts and generate PDFs</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Receipt
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-zinc-50">
                {editingReceipt ? 'Edit Receipt' : 'Add New Receipt'}
              </DialogTitle>
              <DialogDescription>
                {editingReceipt ? 'Update receipt information' : 'Create a new payment receipt'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tenant">Tenant</Label>
                  <Select value={formData.tenantId} onValueChange={(value) => setFormData({ ...formData, tenantId: value })}>
                    <SelectTrigger>
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property">Property</Label>
                  <Select value={formData.propertyId} onValueChange={(value) => setFormData({ ...formData, propertyId: value })}>
                    <SelectTrigger>
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
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Payment Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Payment Type</Label>
                  <Select value={formData.type} onValueChange={(value: Receipt['type']) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent">Rent</SelectItem>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingReceipt ? 'Update Receipt' : 'Create Receipt'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {receipts.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-50 mb-2">No receipts yet</h3>
              <p className="text-zinc-400 mb-4">Get started by creating your first payment receipt</p>
              <Button onClick={openAddDialog} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Receipt
              </Button>
            </CardContent>
          </Card>
        ) : (
          receipts.map((receipt) => (
            <Card key={receipt.id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                      <FileText className="h-6 w-6 text-zinc-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-zinc-50">
                          Receipt #{receipt.id.split('-')[1]}
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
                          <span>${receipt.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generatePDF(receipt)}
                      disabled={generatingPdf === receipt.id}
                      className="flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      {generatingPdf === receipt.id ? 'Generating...' : 'PDF'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(receipt)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(receipt.id)}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
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
  );
}
