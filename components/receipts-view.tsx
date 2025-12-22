"use client";

import { useState } from "react";
import { FileText, Download, Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import jsPDF from "jspdf";

interface Receipt {
  id: number;
  tenant: string;
  property: string;
  amount: number;
  date: string;
  type: "rent" | "deposit" | "maintenance";
  status: "paid" | "pending";
}

const mockReceipts: Receipt[] = [
  {
    id: 1001,
    tenant: "John Smith",
    property: "Sunset Villa",
    amount: 3500,
    date: "2024-12-01",
    type: "rent",
    status: "paid",
  },
  {
    id: 1002,
    tenant: "Sarah Johnson",
    property: "Downtown Loft",
    amount: 4200,
    date: "2024-12-15",
    type: "rent",
    status: "paid",
  },
  {
    id: 1003,
    tenant: "Michael Chen",
    property: "Lakeside Condo",
    amount: 2900,
    date: "2024-12-01",
    type: "rent",
    status: "pending",
  },
  {
    id: 1004,
    tenant: "Emily Davis",
    property: "Urban Studio",
    amount: 6400,
    date: "2024-11-01",
    type: "deposit",
    status: "paid",
  },
  {
    id: 1005,
    tenant: "John Smith",
    property: "Sunset Villa",
    amount: 350,
    date: "2024-11-15",
    type: "maintenance",
    status: "paid",
  },
];

export function ReceiptsView() {
  const [generatingPdf, setGeneratingPdf] = useState<number | null>(null);

  const generatePDF = (receipt: Receipt) => {
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
      doc.text(`Name: ${receipt.tenant}`, 20, 85);
      doc.text(`Property: ${receipt.property}`, 20, 95);

      // Payment Details
      doc.setFontSize(14);
      doc.text("PAYMENT DETAILS", 20, 115);
      doc.setFontSize(11);
      doc.text(`Type: ${receipt.type.charAt(0).toUpperCase() + receipt.type.slice(1)}`, 20, 125);
      doc.text(`Amount: $${receipt.amount.toLocaleString()}`, 20, 135);
      doc.text(`Status: ${receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}`, 20, 145);

      // Total
      doc.setLineWidth(0.5);
      doc.line(20, 155, 190, 155);
      doc.setFontSize(16);
      doc.text(`TOTAL: $${receipt.amount.toLocaleString()}`, 20, 170);

      // Footer
      doc.setFontSize(10);
      doc.text("Thank you for your payment!", 105, 250, { align: "center" });
      doc.text("Proman Property Management", 105, 260, { align: "center" });

      // Save the PDF
      doc.save(`receipt-${receipt.id}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setGeneratingPdf(null);
    }
  };

  const getTypeBadge = (type: Receipt["type"]) => {
    switch (type) {
      case "rent":
        return <Badge variant="default">Rent</Badge>;
      case "deposit":
        return <Badge variant="secondary">Deposit</Badge>;
      case "maintenance":
        return <Badge variant="outline">Maintenance</Badge>;
    }
  };

  const getStatusBadge = (status: Receipt["status"]) => {
    switch (status) {
      case "paid":
        return <Badge variant="success">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
          Receipts
        </h2>
        <p className="text-zinc-400">Generate and download payment receipts</p>
      </div>

      <div className="grid gap-4">
        {mockReceipts.map((receipt) => (
          <Card
            key={receipt.id}
            className="transition-all hover:shadow-lg hover:shadow-zinc-900/50"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                    <FileText className="h-6 w-6 text-zinc-400" />
                  </div>
                  <div>
                    <CardTitle className="text-zinc-50">
                      Receipt #{receipt.id}
                    </CardTitle>
                    <CardDescription>{receipt.property}</CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getTypeBadge(receipt.type)}
                  {getStatusBadge(receipt.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <div className="text-sm text-zinc-400">Tenant</div>
                    <p className="text-sm font-medium text-zinc-50">
                      {receipt.tenant}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Calendar className="h-4 w-4" />
                      <span>Date</span>
                    </div>
                    <p className="text-sm font-medium text-zinc-50">
                      {new Date(receipt.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-zinc-400">Amount</div>
                    <p className="text-lg font-semibold text-zinc-50">
                      ${receipt.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => generatePDF(receipt)}
                  disabled={generatingPdf === receipt.id}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {generatingPdf === receipt.id ? "Generating..." : "Download PDF"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
