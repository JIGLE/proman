"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCsrf } from "@/lib/contexts/csrf-context";
import { useDemoMode } from "@/lib/contexts/demo-context";
import { usePortalAccess } from "@/lib/contexts/portal-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyStateIllustration } from "@/components/ui/empty-state-illustrations";
import { Download, Trash2, Search, Filter, Clock } from "lucide-react";
import type { DocumentType } from "./document-types";
import { documentTypeConfig, formatFileSize, formatDocumentDate } from "./document-types";
import { useDocuments } from "./use-documents";
import { DocumentUploadDialog } from "./document-upload-dialog";
import { DocumentTemplateDialog } from "./document-template-dialog";

function getExpiryInfo(expiresAt: string | null | undefined) {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: "Expired", variant: "destructive" as const };
  if (days <= 14) return { label: `Expires in ${days}d`, variant: "destructive" as const };
  if (days <= 60) return { label: `Expires in ${days}d`, variant: "warning" as const };
  return null;
}

export function DocumentsView() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { token: csrfToken } = useCsrf();
  const { isOwnerPortal } = usePortalAccess();
  const { isDemoMode } = useDemoMode();

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");

  useEffect(() => {
    const propertyId = searchParams.get("propertyId");
    const search = searchParams.get("search");
    if (propertyId) setPropertyFilter(propertyId);
    if (search) setSearchTerm(search);
  }, [searchParams]);

  const {
    documents,
    stats,
    properties,
    tenants,
    owners,
    loading,
    error,
    setError,
    refetch,
    handleDownload,
    handleDelete,
  } = useDocuments({
    csrfToken,
    sessionReady: !!(session || isDemoMode),
    typeFilter,
    propertyFilter,
    searchTerm,
  });

  const activeFilters = useMemo(() => {
    const filters: string[] = [];
    if (searchTerm) filters.push(`Search: ${searchTerm}`);
    if (typeFilter !== "all") filters.push(`Type: ${documentTypeConfig[typeFilter].label}`);
    if (propertyFilter !== "all") {
      const name = properties.find((p) => p.id === propertyFilter)?.name ?? "Property";
      filters.push(`Property: ${name}`);
    }
    return filters;
  }, [properties, propertyFilter, searchTerm, typeFilter]);

  const groupedDocuments = useMemo(() => {
    return documents.reduce<Record<string, typeof documents>>((acc, doc) => {
      const key = isOwnerPortal
        ? doc.propertyName || doc.tenantName || "Unassigned"
        : "Shared with you";
      if (!acc[key]) acc[key] = [];
      acc[key].push(doc);
      return acc;
    }, {});
  }, [documents, isOwnerPortal]);

  if (!session && !isDemoMode) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please sign in to view documents</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isOwnerPortal ? "Documents" : "My documents"}
          </h2>
          <p className="text-muted-foreground">
            {isOwnerPortal
              ? "Manage contracts, receipts, and property files by entity instead of one flat list."
              : "Review the documents shared with your tenancy and download what you need quickly."}
          </p>
        </div>
        {isOwnerPortal && (
          <div className="flex gap-2">
            <DocumentTemplateDialog csrfToken={csrfToken} />
            <DocumentUploadDialog
              csrfToken={csrfToken}
              properties={properties}
              tenants={tenants}
              owners={owners}
              onSuccess={refetch}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Documents</CardDescription>
              <CardTitle className="text-3xl">{stats.totalDocuments}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Size</CardDescription>
              <CardTitle className="text-3xl">{formatFileSize(stats.totalSize)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Contracts</CardDescription>
              <CardTitle className="text-3xl">{stats.byType.contract || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Photos</CardDescription>
              <CardTitle className="text-3xl">{stats.byType.photo || 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {isOwnerPortal ? "Document workspace" : "Shared document workspace"}
            </p>
            <p className="text-sm text-muted-foreground">
              {isOwnerPortal
                ? "Group by property context, keep contracts and receipts close to the related entity, and export on demand."
                : "Everything here belongs to your lease, property, or payment history."}
            </p>
          </div>
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <Badge key={filter} variant="outline">
                  {filter}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as DocumentType | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(documentTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isOwnerPortal && (
              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>{isOwnerPortal ? "Documents by entity" : "Shared with you"}</CardTitle>
          <CardDescription>
            {documents.length} document{documents.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <EmptyStateIllustration
              type="documents"
              title="No documents"
              description={
                isOwnerPortal
                  ? "Upload your first document to get started"
                  : "No documents have been shared with this tenant yet"
              }
            />
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedDocuments).map(([groupName, groupDocs]) => (
                <div key={groupName} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{groupName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {groupDocs.length} document{groupDocs.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge variant="outline">{groupDocs.length}</Badge>
                  </div>

                  <div className="space-y-4">
                    {groupDocs.map((doc) => {
                      const config = documentTypeConfig[doc.type];
                      const Icon = config.icon;
                      const expiry = getExpiryInfo(doc.expiresAt);
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:bg-zinc-800/60"
                        >
                          <div className="flex items-center gap-4">
                            <div className="rounded-lg bg-muted p-2">
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-medium">{doc.name}</h4>
                                <Badge variant="secondary" className={config.color}>
                                  {config.label}
                                </Badge>
                                {expiry && (
                                  <Badge
                                    variant={expiry.variant}
                                    className="flex items-center gap-1"
                                  >
                                    <Clock className="h-3 w-3" />
                                    {expiry.label}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <span>{formatFileSize(doc.fileSize)}</span>
                                <span>•</span>
                                <span>{formatDocumentDate(doc.uploadedAt)}</span>
                                {doc.propertyName && (
                                  <>
                                    <span>•</span>
                                    <span>{doc.propertyName}</span>
                                  </>
                                )}
                                {doc.tenantName && (
                                  <>
                                    <span>•</span>
                                    <span>{doc.tenantName}</span>
                                  </>
                                )}
                              </div>
                              {doc.description && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {doc.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} aria-label="Download document">
                              <Download className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            {isOwnerPortal && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" aria-label="Delete document">
                                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete &quot;{doc.name}&quot;? This
                                      action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(doc.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
