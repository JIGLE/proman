"use client";

import React, { useState } from 'react';
import { useToast } from '@/lib/toast-context';
import { useTranslation } from 'react-i18next';

export function LeaseDocumentUploader({ tenantId, onUploaded }: { tenantId: string; onUploaded?: (doc: unknown) => void; }) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { success, error } = useToast();
  const { t } = useTranslation('common');

  const upload = async () => {
    if (!file) return error('No file selected');
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('language', 'en');
      // Use leases alias route
      const res = await fetch(`/api/leases/${tenantId}/documents`, { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Upload failed');
      success(t('leases.uploaded') || 'Uploaded');
      onUploaded?.(data.data);
    } catch (err) {
      console.error(err);
      error('Upload failed');
    } finally {
      setIsUploading(false);
      setFile(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs text-zinc-300 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-100" />
        <button
          onClick={upload}
          disabled={!file || isUploading}
          className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : (t('leases.upload_document') || 'Upload')}
        </button>
      </div>
    </div>
  );
}
