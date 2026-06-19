"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, FileCheck2, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaxFilingWizard, type TaxFilingProperty } from "./tax-filing-wizard";
import { useToast } from "@/lib/contexts/toast-context";
import { useApp } from "@/lib/app-context-db";

// ── types ──────────────────────────────────────────────────────────────────

interface TaxFilingRecord {
  id: string;
  year: number;
  country: string;
  regime: string;
  taxDue: number;
  balanceDue: number;
  status: string;
  createdAt: string;
}

// ── helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(amount);
}

function countryFlag(country: string): string {
  return country === "PT" ? "🇵🇹" : country === "ES" ? "🇪🇸" : country;
}

// ── view ───────────────────────────────────────────────────────────────────

export function TaxFilingView() {
  const t = useTranslations("taxFiling");
  const toast = useToast();
  const { state } = useApp();

  const [filings, setFilings] = useState<TaxFilingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaxFilingRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFilings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tax-filings");
      if (res.ok) {
        const json = await res.json();
        setFilings(json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFilings();
  }, [fetchFilings]);

  const handleSaved = () => {
    setShowWizard(false);
    void fetchFilings();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tax-filings/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("filingDeleted"));
        setDeleteTarget(null);
        void fetchFilings();
      } else {
        toast.error(t("calcError"));
      }
    } finally {
      setDeleting(false);
    }
  };

  // Map app-context properties to wizard shape
  const wizardProperties: TaxFilingProperty[] = (state.properties ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    country: p.country,
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">{t("title")}</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{t("subtitle")}</p>
        </div>
        <Button
          onClick={() => setShowWizard(true)}
          className="gap-2 bg-accent-primary hover:bg-accent-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t("newFiling")}
        </Button>
      </div>

      {/* Filing list */}
      {loading ? (
        <div className="text-sm text-[var(--color-muted-foreground)]">{t("loadingIncome")}</div>
      ) : filings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-2">
            <FileCheck2 className="h-10 w-10 mx-auto text-[var(--color-muted-foreground)]" />
            <p className="font-medium text-[var(--color-foreground)]">{t("noFilings")}</p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {t("noFilingsDescription")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filings.map((filing) => (
            <Card key={filing.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {filing.status === "final" ? (
                      <FileCheck2 className="h-5 w-5 text-[var(--color-success)]" />
                    ) : (
                      <FileEdit className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-foreground)]">
                          {countryFlag(filing.country)} {filing.year}
                        </span>
                        <Badge
                          variant={filing.status === "final" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {filing.status === "final" ? t("statusFinal") : t("statusDraft")}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {filing.regime} &middot; {new Date(filing.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {t("taxDueLabel")}
                      </p>
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {formatCurrency(filing.taxDue)}
                      </p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {t("balanceDueLabel")}
                      </p>
                      <p
                        className={`font-semibold ${filing.balanceDue > 0 ? "text-destructive" : "text-[var(--color-success)]"}`}
                      >
                        {formatCurrency(filing.balanceDue)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(filing)}
                      className="text-[var(--color-muted-foreground)] hover:text-destructive"
                      aria-label="Delete filing"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Wizard dialog */}
      <Dialog open={showWizard} onOpenChange={(open) => !open && setShowWizard(false)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[var(--color-foreground)]">{t("title")}</DialogTitle>
            <DialogDescription className="text-[var(--color-muted-foreground)]">
              {t("subtitle")}
            </DialogDescription>
          </DialogHeader>
          <TaxFilingWizard
            properties={wizardProperties}
            onSaved={handleSaved}
            onCancel={() => setShowWizard(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[var(--color-foreground)]">
              {t("deleteConfirm")}
            </DialogTitle>
            <DialogDescription className="text-[var(--color-muted-foreground)]">
              {t("deleteDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
