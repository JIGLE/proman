"use client";

import { FileText, Calendar, Landmark, Receipt as ReceiptIcon, ShieldCheck } from "lucide-react";
import { useTenantRelationship } from "@/lib/hooks/use-tenant-relationship";

interface TenantRelationshipMapProps {
  tenantId: string;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

/**
 * Read-only cross-domain summary strip: lease -> rent periods -> bank
 * movements -> receipts -> tax submissions. Fed by GET
 * /api/tenants/[id]/relationship — no schema change, all data already
 * exists post the Situs bank/receipt/tax-connector migrations.
 */
export function TenantRelationshipMap({ tenantId }: TenantRelationshipMapProps) {
  const { data, loading, error } = useTenantRelationship(tenantId);

  if (loading) {
    return (
      <div className="rounded-md border border-dashed border-[var(--color-border)] p-6 text-center">
        <p className="text-sm text-[var(--color-muted-foreground)]">Loading relationship map…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-md border border-dashed border-[var(--color-border)] p-6 text-center">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {error || "No relationship data available"}
        </p>
      </div>
    );
  }

  const stages = [
    {
      key: "lease",
      icon: FileText,
      label: "Lease",
      value: `${data.leases.active}/${data.leases.total}`,
      detail: data.leases.active > 0 ? "active" : "none active",
    },
    {
      key: "periods",
      icon: Calendar,
      label: "Rent periods",
      value: data.periods.current
        ? `${String(data.periods.current.month).padStart(2, "0")}/${data.periods.current.year}`
        : "—",
      detail: data.periods.overdue > 0 ? `${data.periods.overdue} overdue` : "up to date",
      warn: data.periods.overdue > 0,
    },
    {
      key: "bank",
      icon: Landmark,
      label: "Bank movements",
      value: String(data.bankMovements.matched),
      detail: data.bankMovements.lastMatchedAt
        ? `last ${formatDate(data.bankMovements.lastMatchedAt)}`
        : "none matched",
    },
    {
      key: "receipts",
      icon: ReceiptIcon,
      label: "Receipts",
      value: String(data.receipts.total),
      detail: data.receipts.lastLifecycle
        ? data.receipts.lastLifecycle.replace(/_/g, " ")
        : "none yet",
    },
    {
      key: "tax",
      icon: ShieldCheck,
      label: "Tax log",
      value: String(data.taxSubmissions.total),
      detail: data.taxSubmissions.lastStatus
        ? `${data.taxSubmissions.lastAction ?? "—"} · ${data.taxSubmissions.lastStatus}`
        : "no submissions",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {stages.map((stage) => (
        <div
          key={stage.key}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3"
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
            <stage.icon className="h-3 w-3 shrink-0" />
            <span className="truncate">{stage.label}</span>
          </div>
          <p className="mt-1.5 text-lg font-light tabular-nums text-[var(--color-foreground)]">
            {stage.value}
          </p>
          <p
            className={`mt-0.5 truncate text-xs capitalize ${
              stage.warn ? "text-[var(--color-warning)]" : "text-[var(--color-muted-foreground)]"
            }`}
          >
            {stage.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

export default TenantRelationshipMap;
