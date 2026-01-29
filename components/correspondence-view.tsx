"use client";

import { useState } from "react";
import { FileText, Plus, Edit, Trash2, Send } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { LoadingState } from "./ui/loading-state";
import { useApp } from "@/lib/app-context-db";
import { CorrespondenceTemplate, Tenant } from "@/lib/types";
import { templateSchema, TemplateFormData } from "@/lib/validation";
import { useToast } from "@/lib/toast-context";
import { useFormDialog } from "@/lib/hooks/use-form-dialog";
import jsPDF from "jspdf";

export type CorrespondenceViewProps = Record<string, never>

export function CorrespondenceView(): React.ReactElement {
  const { state, addTemplate, updateTemplate, deleteTemplate, addCorrespondence } = useApp();
  const { templates, correspondence: _correspondence, tenants, loading } = state;
  const { success, error } = useToast();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CorrespondenceTemplate | null>(null);
  const [composeData, setComposeData] = useState({
    tenantId: '',
    subject: '',
    content: '',
  });

  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  const initialFormData: TemplateFormData = {
    name: '',
    type: 'welcome',
    subject: '',
    content: '',
  };

  const dialog = useFormDialog<TemplateFormData>({
    schema: templateSchema,
    initialData: initialFormData,
    onSubmit: async (data, isEdit) => {
      const templateData = {
        ...data,
        variables: extractVariables(data.content),
      };

      if (isEdit && dialog.editingItem) {
        await updateTemplate((dialog.editingItem as any).id, templateData);
        success('Template updated successfully');
      } else {
        await addTemplate(templateData);
        success('Template created successfully');
      }
    },
    onError: (errorMessage) => {
      error(errorMessage);
    },
  });

  const handleCompose = (template: CorrespondenceTemplate) => {
    setSelectedTemplate(template);
    setComposeData({
      tenantId: '',
      subject: template.subject,
      content: template.content,
    });
    setIsComposeOpen(true);
  };

  const handleBatchClick = (template: CorrespondenceTemplate) => {
    setSelectedTemplate(template);
    setSelectedRecipientIds([]);
    setIsBatchOpen(true);
  };

  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const generateBatchPDF = async () => {
    if (!selectedTemplate) return;
    if (selectedRecipientIds.length === 0) {
      error('Please select at least one recipient.');
      return;
    }

    setGeneratingBatch(true);
    try {
      const doc = new jsPDF();
      const recipients = tenants.filter(t => selectedRecipientIds.includes(t.id));

      recipients.forEach((tenant, index) => {
        if (index > 0) doc.addPage();

        const content = replaceVariables(selectedTemplate.content, tenant);

        // Header
        doc.setFontSize(20);
        doc.text(selectedTemplate.subject, 105, 20, { align: "center" });

        // Content
        doc.setFontSize(12);
        const splitText = doc.splitTextToSize(content, 170);
        doc.text(splitText, 20, 40);

        // Footer
        doc.setFontSize(10);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 280);
        doc.text(`Page ${index + 1} of ${recipients.length}`, 180, 280);
      });

      doc.save(`batch-correspondence-${selectedTemplate.name.replace(/\s+/g, '-')}.pdf`);
      success(`Generated PDF for ${recipients.length} recipients.`);
      setIsBatchOpen(false);
    } catch (err) {
      console.error('Batch generation error:', err);
      error('Failed to generate batch PDF.');
    } finally {
      setGeneratingBatch(false);
    }
  };

  const handleSendCorrespondence = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTemplate) return;

    const selectedTenant = tenants.find(t => t.id === composeData.tenantId);
    if (!selectedTenant) {
      error('Please select a tenant.');
      return;
    }

    try {
      // Replace variables in content
      const processedContent = replaceVariables(composeData.content, selectedTenant);

      const correspondenceData = {
        templateId: selectedTemplate.id,
        tenantId: selectedTenant.id,
        subject: composeData.subject,
        content: processedContent,
        status: 'sent' as const,
        sentAt: new Date().toISOString(),
      };

      await addCorrespondence(correspondenceData);

      setIsComposeOpen(false);
      setSelectedTemplate(null);
      success('Correspondence sent successfully!');
    } catch (err) {
      error('Failed to send correspondence. Please try again.');
      console.error('Correspondence send error:', err);
    }
  };

  const handleEdit = (template: CorrespondenceTemplate) => {
    dialog.openEditDialog(template, (t) => ({
      name: t.name,
      type: t.type,
      subject: t.subject,
      content: t.content,
    }));
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      try {
        await deleteTemplate(id);
        success('Template deleted successfully!');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const extractVariables = (content: string): string[] => {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const matches = content.match(variableRegex);
    return matches ? [...new Set(matches.map(match => match.slice(2, -2)))] : [];
  };

  const replaceVariables = (content: string, tenant: Tenant): string => {
    return content
      .replace(/\{\{tenant_name\}\}/g, tenant.name)
      .replace(/\{\{property_name\}\}/g, tenant.propertyName || 'your property')
      .replace(/\{\{rent_amount\}\}/g, tenant.rent.toString())
      .replace(/\{\{lease_start\}\}/g, new Date(tenant.leaseStart).toLocaleDateString())
      .replace(/\{\{lease_end\}\}/g, new Date(tenant.leaseEnd).toLocaleDateString())
      .replace(/\{\{property_address\}\}/g, 'Property address') // Would need property data
      .replace(/\{\{bedrooms\}\}/g, 'bedrooms') // Would need property data
      .replace(/\{\{bathrooms\}\}/g, 'bathrooms') // Would need property data
      .replace(/\{\{due_date\}\}/g, new Date().toLocaleDateString());
  };

  const getTypeBadge = (type: CorrespondenceTemplate["type"]) => {
    const colors = {
      welcome: "bg-green-600/20 text-green-400",
      rent_reminder: "bg-orange-600/20 text-orange-400",
      eviction_notice: "bg-red-600/20 text-red-400",
      maintenance_request: "bg-blue-600/20 text-blue-400",
      lease_renewal: "bg-purple-600/20 text-purple-400",
      custom: "bg-gray-600/20 text-gray-400",
    };
    return (
      <Badge className={colors[type]}>
        {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  return (
    <>
    {loading ? (
      <LoadingState variant="cards" count={6} />
    ) : (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
            Correspondence
          </h2>
          <p className="text-zinc-400">Manage templates and send communications</p>
        </div>
        <Dialog open={dialog.isOpen} onOpenChange={(open) => !open && dialog.closeDialog()}>
          <DialogTrigger asChild>
            <Button onClick={dialog.openDialog} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-zinc-50">
                {dialog.editingItem ? 'Edit Template' : 'Create Template'}
              </DialogTitle>
              <DialogDescription>
                Create or edit correspondence templates with variable placeholders
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={dialog.handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={dialog.formData.name}
                    onChange={(e) => dialog.updateFormData({ name: e.target.value })}
                    className={dialog.formErrors.name ? 'border-red-500' : ''}
                  />
                  {dialog.formErrors.name && (
                    <p className="text-sm text-red-400">{dialog.formErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Template Type</Label>
                  <Select value={dialog.formData.type} onValueChange={(value: TemplateFormData['type']) => dialog.updateFormData({ type: value })}>
                    <SelectTrigger className={dialog.formErrors.type ? 'border-red-500' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="welcome">Welcome Letter</SelectItem>
                      <SelectItem value="rent_reminder">Rent Reminder</SelectItem>
                      <SelectItem value="eviction_notice">Eviction Notice</SelectItem>
                      <SelectItem value="maintenance_request">Maintenance Request</SelectItem>
                      <SelectItem value="lease_renewal">Lease Renewal</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={dialog.formData.subject}
                  onChange={(e) => dialog.updateFormData({ subject: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Email Content</Label>
                <Textarea
                  id="content"
                  value={dialog.formData.content}
                  onChange={(e) => dialog.updateFormData({ content: e.target.value })}
                  rows={8}
                  placeholder="Use {{variable_name}} for dynamic content. Available variables: {{tenant_name}}, {{property_name}}, {{rent_amount}}, {{lease_start}}, {{lease_end}}, etc."
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={dialog.closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={dialog.isSubmitting}>
                  {dialog.isSubmitting ? 'Saving...' : (dialog.editingItem ? 'Update Template' : 'Create Template')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-50 mb-2">No templates yet</h3>
              <p className="text-zinc-400 mb-4">Create your first correspondence template</p>
              <Button onClick={dialog.openDialog} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-zinc-50">{template.name}</h3>
                      {getTypeBadge(template.type)}
                    </div>
                    <p className="text-sm font-medium text-zinc-50 mb-1">{template.subject}</p>
                    <p className="text-sm text-zinc-400 line-clamp-2 mb-2">
                      {template.content.length > 150
                        ? `${template.content.substring(0, 150)}...`
                        : template.content
                      }
                    </p>
                    {template.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((variable) => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleBatchClick(template)}
                      className="flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      Batch PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCompose(template)}
                      className="flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      Send
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Compose Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-50">Send Correspondence</DialogTitle>
            <DialogDescription>
              Compose and send a message using the selected template
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendCorrespondence} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant">Select Tenant</Label>
              <Select value={composeData.tenantId} onValueChange={(value) => setComposeData({ ...composeData, tenantId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name} - {tenant.propertyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="compose-subject">Subject</Label>
              <Input
                id="compose-subject"
                value={composeData.subject}
                onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="compose-content">Message</Label>
              <Textarea
                id="compose-content"
                value={composeData.content}
                onChange={(e) => setComposeData({ ...composeData, content: e.target.value })}
                rows={10}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsComposeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Send Message
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Batch Dialog */}
      <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-50">Batch Generate PDF</DialogTitle>
            <DialogDescription>
              Select recipients to generate letters for: {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border border-zinc-800 rounded-md p-4 max-h-[300px] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <Label>Select Recipients</Label>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRecipientIds(tenants.map(t => t.id))}>Select All</Button>
              </div>
              <div className="space-y-2">
                {tenants.map(tenant => (
                  <div key={tenant.id} className="flex items-center space-x-2 p-2 hover:bg-zinc-800 rounded">
                    <input
                      type="checkbox"
                      id={`batch-${tenant.id}`}
                      checked={selectedRecipientIds.includes(tenant.id)}
                      onChange={() => toggleRecipient(tenant.id)}
                      className="rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-600"
                    />
                    <div className="flex-1">
                      <Label htmlFor={`batch-${tenant.id}`} className="cursor-pointer font-medium text-zinc-200">
                        {tenant.name}
                      </Label>
                      <p className="text-xs text-zinc-500">{tenant.propertyName}</p>
                    </div>
                  </div>
                ))}
                {tenants.length === 0 && <p className="text-sm text-zinc-500 text-center">No tenants found.</p>}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsBatchOpen(false)}>Cancel</Button>
              <Button onClick={generateBatchPDF} disabled={generatingBatch}>
                {generatingBatch ? 'Generating...' : `Generate Batch (${selectedRecipientIds.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    )}
    </>
  );
}