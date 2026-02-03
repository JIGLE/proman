'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Search,
  File,
  Image,
  FileImage,
  FilePlus,
  Eye,
  Filter,
} from 'lucide-react';

// Types
interface Document {
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
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

type DocumentType = 'contract' | 'invoice' | 'receipt' | 'photo' | 'floor_plan' | 'certificate' | 'other';

interface DocumentStats {
  totalDocuments: number;
  totalSize: number;
  byType: Record<string, number>;
}

interface Property {
  id: string;
  name: string;
}

interface Tenant {
  id: string;
  name: string;
}

interface Owner {
  id: string;
  name: string;
}

// Document type labels and colors
const documentTypeConfig: Record<DocumentType, { label: string; color: string; icon: typeof FileText }> = {
  contract: { label: 'Contract', color: 'bg-blue-100 text-blue-800', icon: FileText },
  invoice: { label: 'Invoice', color: 'bg-green-100 text-green-800', icon: File },
  receipt: { label: 'Receipt', color: 'bg-emerald-100 text-emerald-800', icon: File },
  photo: { label: 'Photo', color: 'bg-purple-100 text-purple-800', icon: Image },
  floor_plan: { label: 'Floor Plan', color: 'bg-orange-100 text-orange-800', icon: FileImage },
  certificate: { label: 'Certificate', color: 'bg-yellow-100 text-yellow-800', icon: FileText },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-800', icon: File },
};

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function DocumentsView() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  
  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    type: 'other' as DocumentType,
    propertyId: '',
    tenantId: '',
    ownerId: '',
    file: null as File | null,
  });
  const [uploading, setUploading] = useState(false);
  
  // Template dialog state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'lease' | 'receipt' | 'notice'>('lease');
  const [generatingTemplate, setGeneratingTemplate] = useState(false);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (propertyFilter !== 'all') params.set('propertyId', propertyFilter);
      if (searchTerm) params.set('search', searchTerm);
      
      const response = await fetch(`/api/documents?${params}`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setDocuments(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    }
  }, [typeFilter, propertyFilter, searchTerm]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      const [propsRes, tenantsRes, ownersRes] = await Promise.all([
        fetch('/api/properties'),
        fetch('/api/tenants'),
        fetch('/api/owners'),
      ]);
      
      if (propsRes.ok) {
        const data = await propsRes.json();
        setProperties(data.data || []);
      }
      if (tenantsRes.ok) {
        const data = await tenantsRes.json();
        setTenants(data.data || []);
      }
      if (ownersRes.ok) {
        const data = await ownersRes.json();
        setOwners(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch reference data:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (session) {
      Promise.all([fetchDocuments(), fetchStats(), fetchReferenceData()])
        .finally(() => setLoading(false));
    }
  }, [session, fetchDocuments, fetchStats, fetchReferenceData]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm(prev => ({
        ...prev,
        file,
        name: prev.name || file.name,
      }));
    }
  };

  // Upload document
  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.name) return;
    
    setUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const fileContent = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data URL prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(uploadForm.file!);
      });

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadForm.name,
          description: uploadForm.description || undefined,
          type: uploadForm.type,
          mimeType: uploadForm.file.type,
          fileContent,
          propertyId: uploadForm.propertyId || undefined,
          tenantId: uploadForm.tenantId || undefined,
          ownerId: uploadForm.ownerId || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      setUploadDialogOpen(false);
      setUploadForm({
        name: '',
        description: '',
        type: 'other',
        propertyId: '',
        tenantId: '',
        ownerId: '',
        file: null,
      });
      fetchDocuments();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Download document
  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  // Delete document
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Delete failed');
      
      fetchDocuments();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Generate template
  const handleGenerateTemplate = async (format: 'html' | 'pdf') => {
    setGeneratingTemplate(true);
    try {
      // For demo, use placeholder data - in real app, this would come from a form
      const templateData = getTemplateData(selectedTemplate);
      
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: selectedTemplate,
          format,
          data: templateData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Generation failed');
      }

      if (format === 'html') {
        const html = await response.text();
        const blob = new Blob([html], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTemplate}_document.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
      setTemplateDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGeneratingTemplate(false);
    }
  };

  // Get sample template data
  const getTemplateData = (type: 'lease' | 'receipt' | 'notice') => {
    switch (type) {
      case 'lease':
        return {
          propertyName: 'Sample Property',
          propertyAddress: '123 Main Street, City, State 12345',
          tenantName: 'John Doe',
          tenantEmail: 'john@example.com',
          ownerName: 'Jane Smith',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          monthlyRent: 1500,
          securityDeposit: 3000,
          currency: 'USD',
          paymentDueDay: 1,
        };
      case 'receipt':
        return {
          receiptNumber: `RCP-${Date.now()}`,
          receiptDate: new Date().toISOString().split('T')[0],
          paymentAmount: 1500,
          paymentPeriod: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          currency: 'USD',
          tenantName: 'John Doe',
          propertyName: 'Sample Property',
          propertyAddress: '123 Main Street, City, State 12345',
          landlordName: 'Jane Smith',
        };
      case 'notice':
        return {
          noticeType: 'general',
          recipientName: 'John Doe',
          recipientAddress: '123 Main Street, Unit 1, City, State 12345',
          propertyAddress: '123 Main Street, City, State 12345',
          issueDate: new Date().toISOString().split('T')[0],
          description: 'This is a sample notice for demonstration purposes.',
          senderName: 'Property Management',
          senderTitle: 'Property Manager',
        };
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please sign in to view documents</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
          <p className="text-muted-foreground">
            Manage your property documents, contracts, and files
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FilePlus className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Document</DialogTitle>
                <DialogDescription>
                  Create a document from a template
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Template Type</Label>
                  <Select value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v as typeof selectedTemplate)}>
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
                  This will generate a sample document. For production use, connect this to your actual property and tenant data.
                </p>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => handleGenerateTemplate('html')} disabled={generatingTemplate}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview HTML
                </Button>
                <Button onClick={() => handleGenerateTemplate('pdf')} disabled={generatingTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a new document to your library
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="file">File</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Document name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={uploadForm.type} onValueChange={(v) => setUploadForm(prev => ({ ...prev, type: v as DocumentType }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(documentTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description"
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Link to (optional)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={uploadForm.propertyId} onValueChange={(v) => setUploadForm(prev => ({ ...prev, propertyId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Property" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {properties.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={uploadForm.tenantId} onValueChange={(v) => setUploadForm(prev => ({ ...prev, tenantId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tenant" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {tenants.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={uploadForm.ownerId} onValueChange={(v) => setUploadForm(prev => ({ ...prev, ownerId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Owner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {owners.map(o => (
                          <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleUpload} disabled={uploading || !uploadForm.file || !uploadForm.name}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
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
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as DocumentType | 'all')}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(documentTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
          <CardDescription>
            {documents.length} document{documents.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No documents</h3>
              <p className="text-muted-foreground">Upload your first document to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => {
                const config = documentTypeConfig[doc.type];
                const Icon = config.icon;
                
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{doc.name}</h4>
                          <Badge variant="secondary" className={config.color}>
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.uploadedAt)}</span>
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
                          <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{doc.name}&quot;? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(doc.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
