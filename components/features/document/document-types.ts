"use client";

import { File, FileText, Image, FileImage } from "lucide-react";

export type DocumentType =
  | "contract"
  | "invoice"
  | "receipt"
  | "photo"
  | "floor_plan"
  | "certificate"
  | "other";

export interface Document {
  id: string;
  name: string;
  description?: string;
  type: DocumentType;
  mimeType: string;
  storagePath: string;
  fileSize: number;
  propertyId?: string;
  propertyName?: string;
  unitId?: string;
  unitNumber?: string;
  ownerId?: string;
  ownerName?: string;
  tenantId?: string;
  tenantName?: string;
  expiresAt?: string | null;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentStats {
  totalDocuments: number;
  totalSize: number;
  byType: Record<string, number>;
}

export interface DocumentRef {
  id: string;
  name: string;
}

export const documentTypeConfig: Record<
  DocumentType,
  { label: string; color: string; icon: typeof FileText }
> = {
  contract: { label: "Contract", color: "bg-blue-500/20 text-blue-300", icon: FileText },
  invoice: { label: "Invoice", color: "bg-green-500/20 text-green-300", icon: File },
  receipt: { label: "Receipt", color: "bg-emerald-500/20 text-emerald-300", icon: File },
  photo: { label: "Photo", color: "bg-purple-500/20 text-purple-300", icon: Image },
  floor_plan: { label: "Floor Plan", color: "bg-orange-500/20 text-orange-300", icon: FileImage },
  certificate: {
    label: "Certificate",
    color: "bg-yellow-500/20 text-yellow-300",
    icon: FileText,
  },
  other: { label: "Other", color: "bg-zinc-500/20 text-zinc-300", icon: File },
};

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatDocumentDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-PT", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
