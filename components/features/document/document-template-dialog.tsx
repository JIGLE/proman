"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilePlus, Eye, Download } from "lucide-react";

type TemplateType = "lease" | "receipt" | "notice";

interface Props {
  csrfToken: string | null;
}

function getTemplateData(type: TemplateType) {
  switch (type) {
    case "lease":
      return {
        propertyName: "Sample Property",
        propertyAddress: "123 Main Street, City, State 12345",
        tenantName: "John Doe",
        tenantEmail: "john@example.com",
        ownerName: "Jane Smith",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        monthlyRent: 1500,
        securityDeposit: 3000,
        currency: "USD",
        paymentDueDay: 1,
      };
    case "receipt":
      return {
        receiptNumber: `RCP-${Date.now()}`,
        receiptDate: new Date().toISOString().split("T")[0],
        paymentAmount: 1500,
        paymentPeriod: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        currency: "USD",
        tenantName: "John Doe",
        propertyName: "Sample Property",
        propertyAddress: "123 Main Street, City, State 12345",
        landlordName: "Jane Smith",
      };
    case "notice":
      return {
        noticeType: "general",
        recipientName: "John Doe",
        recipientAddress: "123 Main Street, Unit 1, City, State 12345",
        propertyAddress: "123 Main Street, City, State 12345",
        issueDate: new Date().toISOString().split("T")[0],
        description: "This is a sample notice for demonstration purposes.",
        senderName: "Property Management",
        senderTitle: "Property Manager",
      };
  }
}

export function DocumentTemplateDialog({ csrfToken }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("lease");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (format: "html" | "pdf") => {
    setGenerating(true);
    try {
      const response = await fetch("/api/documents/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({
          templateType: selectedTemplate,
          format,
          data: getTemplateData(selectedTemplate),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Generation failed");
      }

      if (format === "html") {
        const html = await response.text();
        const blob = new Blob([html], { type: "text/html" });
        window.open(window.URL.createObjectURL(blob), "_blank");
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedTemplate}_document.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FilePlus className="mr-2 h-4 w-4" />
          Generate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Document</DialogTitle>
          <DialogDescription>Create a document from a template</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Template Type</Label>
            <Select
              value={selectedTemplate}
              onValueChange={(v) => setSelectedTemplate(v as TemplateType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lease">Lease Agreement</SelectItem>
                <SelectItem value="receipt">Rent Receipt</SelectItem>
                <SelectItem value="notice">Notice Letter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            This will generate a sample document. For production use, connect this to your actual
            property and tenant data.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleGenerate("html")} disabled={generating}>
            <Eye className="mr-2 h-4 w-4" />
            Preview HTML
          </Button>
          <Button onClick={() => handleGenerate("pdf")} disabled={generating}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
