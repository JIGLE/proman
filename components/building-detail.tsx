"use client";

import React, { useEffect, useState } from "react";
import { LeaseDocumentUploader } from "./lease-document-uploader";
import { useTranslation } from "react-i18next";

interface LeaseDocumentSummary {
  id: string;
  filename: string;
}

interface BuildingTenant {
  id: string;
  name: string;
  email: string;
  leaseDocuments?: LeaseDocumentSummary[];
}

interface BuildingProperty {
  name: string;
  address: string;
  tenants?: BuildingTenant[];
}

export default function BuildingDetail({ id }: { id: string }) {
  const [property, setProperty] = useState<BuildingProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation("common");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/properties/${id}`);
        const data = await res.json();
        if (!mounted) return;
        setProperty(data.data ?? data);
      } catch (err) {
        console.error("Failed to load property", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!property) return <div className="p-6">Property not found</div>;

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">{property.name}</h1>
      <p className="text-sm text-zinc-400">{property.address}</p>

      <section className="pt-4">
        <h2 className="text-lg font-semibold">{t("leases.title") || "Leases"}</h2>
        <div className="mt-2 space-y-4">
          {property.tenants && property.tenants.length > 0 ? (
            <div className="space-y-4">
              {property.tenants.map((tnt) => (
                <div key={tnt.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-semibold">{tnt.name}</div>
                      <div className="text-xs text-zinc-400">{tnt.email}</div>
                      <div className="text-xs text-zinc-400">
                        {t("leases.documents") || "Documents"}: {tnt.leaseDocuments?.length ?? 0}
                      </div>
                    </div>
                    <div className="min-w-[220px]">
                      <LeaseDocumentUploader
                        tenantId={tnt.id}
                        onUploaded={() => {
                          /* could refresh docs */
                        }}
                      />
                    </div>
                  </div>

                  {tnt.leaseDocuments && tnt.leaseDocuments.length > 0 && (
                    <div className="mt-4 rounded-lg bg-zinc-950/70 p-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">
                        {t("leases.documents") || "Documents"}
                      </div>
                      <ul className="space-y-2 text-sm">
                        {tnt.leaseDocuments.map((doc) => (
                          <li key={doc.id}>
                            <a
                              href={`/api/leases/${tnt.id}/documents?id=${doc.id}`}
                              className="text-blue-400 hover:underline"
                            >
                              {doc.filename}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-zinc-400">No tenants</div>
          )}
        </div>
      </section>
    </div>
  );
}
