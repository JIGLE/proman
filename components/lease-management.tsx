"use client";

import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LeaseDocumentUploader } from './lease-document-uploader';
import { AppContext } from '@/lib/app-context-db';
import { Card, CardContent } from './ui/card';
import { formatCurrency, getCurrencyForCountry } from '@/lib/currency';
import { useToast } from '@/lib/toast-context';

interface LeaseDocumentSummary {
  id: string;
  filename: string;
}

interface LeaseTenant {
  id: string;
  name?: string;
  email?: string;
  rent?: number;
  propertyId?: string;
  propertyName?: string;
  leaseDocuments?: LeaseDocumentSummary[];
}

interface LeaseProperty {
  id: string;
  name?: string;
  countryCode?: string;
}

export default function LeaseManagement(): React.ReactElement {
  const ctx = useContext(AppContext);

  const [localTenants, setLocalTenants] = useState<LeaseTenant[]>([]);
  const [localProperties, setLocalProperties] = useState<LeaseProperty[]>([]);
  const [localLoading, setLocalLoading] = useState(true);

  // If AppContext is available, prefer it; otherwise fall back to local fetch (tests/runtime without provider)
  const { state } = ctx ?? { state: { tenants: localTenants, properties: localProperties, loading: localLoading } };
  const tenants = state.tenants as LeaseTenant[];
  const properties = state.properties as LeaseProperty[];
  const loading = state.loading;

  useEffect(() => {
    if (ctx) return;
    let mounted = true;

    (async () => {
      setLocalLoading(true);
      try {
        const tenantsRes = await fetch('/api/tenants');
        const tenantsJson = await tenantsRes.json();
        const tenantsData = tenantsJson?.data ?? tenantsJson;
        if (!mounted) return;
        setLocalTenants(tenantsData || []);

        try {
          const propsRes = await fetch('/api/properties');
          const propsJson = await propsRes.json();
          const propsData = propsJson?.data ?? propsJson;
          if (mounted) setLocalProperties(propsData || []);
        } catch {
          // ignore property load errors in fallback
          if (mounted) setLocalProperties([]);
        }
      } catch (err) {
        console.error('Failed to load tenants for LeaseManagement fallback', err);
      } finally {
        if (mounted) setLocalLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [ctx]);
  const { t } = useTranslation('common');
  const { success } = useToast();

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">{t('leases.title') || 'Leases'}</h1>

      {tenants.length === 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent>No leases found</CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {tenants.map(tnt => {
          const prop = properties.find((p) => p.id === tnt.propertyId) || properties.find((p) => p.name === tnt.propertyName);
          const currency = getCurrencyForCountry(prop?.countryCode);
          const rentDisplay = typeof tnt.rent === 'number' ? formatCurrency(tnt.rent, currency) : '-';

          return (
            <Card key={tnt.id} className="bg-zinc-900 border-zinc-800">
              <CardContent>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-zinc-50">{tnt.name}</div>
                    <div className="text-xs text-zinc-400">{tnt.email}</div>
                    <div className="text-sm text-zinc-400 mt-1">{prop?.name || tnt.propertyName} • {rentDisplay}</div>
                  </div>
                  <div className="space-y-2">
                    <LeaseDocumentUploader
                      tenantId={tnt.id}
                      onUploaded={() => {
                        success(t('leases.uploaded') || 'Uploaded');
                        // simple refresh to reload tenant docs
                        setTimeout(() => window.location.reload(), 450);
                      }}
                    />
                  </div>
                </div>

                {tnt.leaseDocuments && tnt.leaseDocuments.length > 0 && (
                  <div className="mt-4 text-sm text-zinc-300">
                    <div className="font-medium text-zinc-200">{t('leases.documents') || 'Documents'}</div>
                    <ul className="mt-1 space-y-1">
                      {tnt.leaseDocuments.map((d) => (
                        <li key={d.id}><a href={`/api/tenants/documents?id=${d.id}`} className="text-blue-400 hover:underline">{d.filename}</a></li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
