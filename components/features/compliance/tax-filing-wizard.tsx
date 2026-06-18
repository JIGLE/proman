"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, RefreshCw } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MultiStepFormContainer,
  StepContent,
  DraftBanner,
} from "@/components/ui/multi-step-form";
import { useMultiStepForm } from "@/lib/hooks/use-multi-step-form";
import { useToast } from "@/lib/contexts/toast-context";

// ── fiscal types (inlined — fiscal module not yet in this worktree) ─────────

interface BracketBreakdown {
  min: number;
  max: number | null;
  rate: number;
  taxableInThisBracket: number;
  taxInThisBracket: number;
}

interface TaxCalculation {
  grossIncome: number;
  allowableExpenses: number;
  taxableIncome: number;
  taxDue: number;
  effectiveRate: number;
  withholdingRate: number;
  withholdingAlreadyPaid: number;
  balanceDue: number;
  bracketBreakdown: BracketBreakdown[];
  regime: string;
  year: number;
  notes: string[];
}

// ── types ──────────────────────────────────────────────────────────────────

export interface TaxFilingProperty {
  id: string;
  name: string;
  address: string;
  country?: string;
}

interface TaxFilingWizardProps {
  properties: TaxFilingProperty[];
  onSaved: () => void;
  onCancel: () => void;
}

interface TaxFilingFormData extends Record<string, unknown> {
  year: number;
  country: string;
  regime: string;
  propertyIds: string[];
  grossIncome: number;
  deductibleExpenses: number;
}

// ── helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(amount);
}

function formatPct(rate: number): string {
  return (rate * 100).toFixed(1) + "%";
}

const PT_REGIMES = ["STANDARD", "NHR", "IFICI", "RENDA_ACESSIVEL"] as const;
const ES_REGIMES = ["STANDARD", "NHR"] as const;
const CURRENT_YEAR = new Date().getFullYear();

const formSchema = z.object({
  year: z.number().int().min(2020).max(2040),
  country: z.string().length(2),
  regime: z.string().min(1),
  propertyIds: z.array(z.string()).min(1),
  grossIncome: z.number().nonnegative(),
  deductibleExpenses: z.number().nonnegative(),
}) as z.ZodSchema<TaxFilingFormData>;

const initialData: TaxFilingFormData = {
  year: CURRENT_YEAR - 1,
  country: "PT",
  regime: "STANDARD",
  propertyIds: [],
  grossIncome: 0,
  deductibleExpenses: 0,
};

// ── wizard ─────────────────────────────────────────────────────────────────

export function TaxFilingWizard({ properties, onSaved, onCancel }: TaxFilingWizardProps) {
  const t = useTranslations("taxFiling");
  const toast = useToast();

  const [calculation, setCalculation] = useState<TaxCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchIncomeSummary = useCallback(
    async (propertyIds: string[], year: number) => {
      if (!propertyIds.length) return;
      const ids = propertyIds.join(",");
      const res = await fetch(`/api/tax-filings/income-summary?propertyIds=${ids}&year=${year}`);
      if (res.ok) {
        const json = await res.json();
        updateFormData({
          grossIncome: json.data.grossIncome ?? 0,
          deductibleExpenses: json.data.deductibleExpenses ?? 0,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const runCalculation = useCallback(async (data: Partial<TaxFilingFormData>) => {
    setCalcError(null);
    setCalculating(true);
    try {
      const res = await fetch(`/api/fiscal/${(data.country as string).toLowerCase()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grossIncome: data.grossIncome ?? 0,
          expenses: data.deductibleExpenses ?? 0,
          regime: data.regime ?? "STANDARD",
          year: data.year ?? CURRENT_YEAR - 1,
        }),
      });
      if (!res.ok) throw new Error("calc_failed");
      const json = await res.json();
      setCalculation(json.data as TaxCalculation);
    } catch {
      setCalcError(t("calcError"));
    } finally {
      setCalculating(false);
    }
  }, [t]);

  const steps = [
    {
      id: "yearCountry",
      title: t("step1Title"),
      description: t("step1Description"),
      fields: ["year", "country", "regime"] as (keyof TaxFilingFormData)[],
    },
    {
      id: "properties",
      title: t("step2Title"),
      description: t("step2Description"),
      fields: ["propertyIds"] as (keyof TaxFilingFormData)[],
    },
    {
      id: "income",
      title: t("step3Title"),
      description: t("step3Description"),
      fields: ["grossIncome", "deductibleExpenses"] as (keyof TaxFilingFormData)[],
    },
    {
      id: "calculation",
      title: t("step4Title"),
      description: t("step4Description"),
      fields: [] as (keyof TaxFilingFormData)[],
    },
    {
      id: "review",
      title: t("step5Title"),
      description: t("step5Description"),
      fields: [] as (keyof TaxFilingFormData)[],
    },
  ];

  const form = useMultiStepForm<TaxFilingFormData>({
    steps,
    schema: formSchema,
    initialData,
    persistence: { key: "tax-filing-wizard", ttl: 2 * 60 * 60 * 1000 },
    onComplete: async () => {},
    onStepChange: (step, data) => {
      if (step === 2) fetchIncomeSummary(data.propertyIds as string[], data.year as number);
      if (step === 3) runCalculation(data);
    },
  });

  const { formData, updateFormData, currentStep, hasDraft, clearDraft } = form;

  // Restore draft
  const handleRestoreDraft = () => {};
  const handleDiscardDraft = () => { clearDraft(); };

  // Regime options based on country
  const regimeKeys = formData.country === "ES" ? ES_REGIMES : PT_REGIMES;

  // Filtered properties
  const filteredProperties = properties.filter(
    (p) => !p.country || p.country === formData.country,
  );

  const allSelected =
    filteredProperties.length > 0 &&
    filteredProperties.every((p) => (formData.propertyIds as string[]).includes(p.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      updateFormData({ propertyIds: [] });
    } else {
      updateFormData({ propertyIds: filteredProperties.map((p) => p.id) });
    }
  };

  const toggleProperty = (id: string) => {
    const ids = formData.propertyIds as string[];
    updateFormData({
      propertyIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    });
  };

  const saveFiling = async (status: "draft" | "final") => {
    if (!calculation) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tax-filings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: formData.year,
          country: formData.country,
          regime: formData.regime,
          propertyIds: formData.propertyIds,
          grossIncome: calculation.grossIncome,
          allowableExpenses: calculation.allowableExpenses,
          taxableIncome: calculation.taxableIncome,
          taxDue: calculation.taxDue,
          effectiveRate: calculation.effectiveRate,
          withholdingPaid: calculation.withholdingAlreadyPaid,
          balanceDue: calculation.balanceDue,
          status,
          notes: calculation.notes,
          payload: JSON.stringify(calculation),
        }),
      });
      if (!res.ok) throw new Error("save_failed");
      toast.success(t("filingsSaved"));
      clearDraft();
      onSaved();
    } catch {
      toast.error(t("calcError"));
    } finally {
      setSaving(false);
    }
  };

  // Step content render
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <StepContent title={t("step1Title")} description={t("step1Description")}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[var(--color-foreground)]">{t("taxYear")}</Label>
                <Select
                  value={String(formData.year)}
                  onValueChange={(v) => updateFormData({ year: parseInt(v, 10) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => CURRENT_YEAR - 1 - i).map(
                      (y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--color-foreground)]">{t("country")}</Label>
                <Select
                  value={formData.country}
                  onValueChange={(v) =>
                    updateFormData({ country: v, regime: "STANDARD", propertyIds: [] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PT">🇵🇹 {t("portugal")}</SelectItem>
                    <SelectItem value="ES">🇪🇸 {t("spain")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--color-foreground)]">{t("regime")}</Label>
                <Select
                  value={formData.regime}
                  onValueChange={(v) => updateFormData({ regime: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {regimeKeys.map((rk) => (
                      <SelectItem key={rk} value={rk}>
                        {t(`regime_${rk}_${formData.country}` as Parameters<typeof t>[0])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </StepContent>
        );

      case 1:
        return (
          <StepContent title={t("step2Title")} description={t("step2Description")}>
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {t("selectProperties")}
              </p>
              {filteredProperties.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)] italic">
                  {t("noPropertiesForCountry")}
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
                    <Checkbox
                      id="select-all"
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                    <Label
                      htmlFor="select-all"
                      className="text-sm font-medium cursor-pointer text-[var(--color-foreground)]"
                    >
                      {t("selectAll")}
                    </Label>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {filteredProperties.map((p) => (
                      <div key={p.id} className="flex items-start gap-3 py-2">
                        <Checkbox
                          id={`prop-${p.id}`}
                          checked={(formData.propertyIds as string[]).includes(p.id)}
                          onCheckedChange={() => toggleProperty(p.id)}
                        />
                        <Label
                          htmlFor={`prop-${p.id}`}
                          className="cursor-pointer space-y-0.5"
                        >
                          <p className="text-sm font-medium text-[var(--color-foreground)]">
                            {p.name}
                          </p>
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            {p.address}
                          </p>
                        </Label>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </StepContent>
        );

      case 2:
        return (
          <StepContent title={t("step3Title")} description={t("step3Description")}>
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {t("incomeFromReceipts")}
              </p>
              {formData.grossIncome === 0 && formData.deductibleExpenses === 0 && (
                <p className="text-sm text-[var(--color-muted-foreground)] italic">
                  {t("noIncomeFound", { year: formData.year })}
                </p>
              )}
              <div className="space-y-2">
                <Label className="text-[var(--color-foreground)]">{t("grossIncome")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.grossIncome}
                  onChange={(e) => updateFormData({ grossIncome: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {t("incomeFromReceipts")}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--color-foreground)]">{t("deductibleExpenses")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.deductibleExpenses}
                  onChange={(e) =>
                    updateFormData({ deductibleExpenses: parseFloat(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {t("expensesFromRecords")}
                </p>
              </div>
            </div>
          </StepContent>
        );

      case 3:
        return (
          <StepContent title={t("step4Title")} description={t("step4Description")}>
            {calculating && (
              <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{t("calculating")}</span>
              </div>
            )}
            {calcError && (
              <p className="text-sm text-destructive">{calcError}</p>
            )}
            {calculation && !calculating && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Card className="bg-[var(--color-muted)]">
                    <CardContent className="p-3">
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {t("grossIncome")}
                      </p>
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {formatCurrency(calculation.grossIncome)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-[var(--color-muted)]">
                    <CardContent className="p-3">
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {t("allowableExpenses")}
                      </p>
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {formatCurrency(calculation.allowableExpenses)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-[var(--color-muted)]">
                    <CardContent className="p-3">
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {t("taxableIncome")}
                      </p>
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {formatCurrency(calculation.taxableIncome)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-2 border-[var(--color-border)] bg-accent-primary/5">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[var(--color-foreground)]">
                        {t("taxDue")}
                      </span>
                      <span className="text-xl font-bold text-[var(--color-foreground)]">
                        {formatCurrency(calculation.taxDue)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--color-muted-foreground)]">
                        {t("effectiveRate")}
                      </span>
                      <span className="text-[var(--color-foreground)]">
                        {formatPct(calculation.effectiveRate)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--color-muted-foreground)]">
                        {t("withholdingPaid")}
                      </span>
                      <span className="text-[var(--color-foreground)]">
                        {formatCurrency(calculation.withholdingAlreadyPaid)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold border-t border-[var(--color-border)] pt-2">
                      <span className="text-[var(--color-foreground)]">{t("balanceDue")}</span>
                      <span
                        className={
                          calculation.balanceDue > 0
                            ? "text-destructive"
                            : "text-[var(--color-success)]"
                        }
                      >
                        {formatCurrency(calculation.balanceDue)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {calculation.bracketBreakdown.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{t("bracketBreakdown")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[var(--color-muted-foreground)] text-left">
                            <th className="pb-1">{t("bracketRange")}</th>
                            <th className="pb-1">{t("bracketRate")}</th>
                            <th className="pb-1">{t("taxableInBracket")}</th>
                            <th className="pb-1 text-right">{t("taxInBracket")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculation.bracketBreakdown.map((b, i) => (
                            <tr key={i} className="border-t border-[var(--color-border)]">
                              <td className="py-1 text-[var(--color-foreground)]">
                                {formatCurrency(b.min)}
                                {b.max ? ` – ${formatCurrency(b.max)}` : "+"}
                              </td>
                              <td className="py-1 text-[var(--color-foreground)]">
                                {formatPct(b.rate)}
                              </td>
                              <td className="py-1 text-[var(--color-foreground)]">
                                {formatCurrency(b.taxableInThisBracket)}
                              </td>
                              <td className="py-1 text-right text-[var(--color-foreground)]">
                                {formatCurrency(b.taxInThisBracket)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}

                {calculation.notes.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{t("pluginNotes")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {calculation.notes.map((note, i) => (
                          <li
                            key={i}
                            className="text-sm text-[var(--color-muted-foreground)] list-disc ml-4"
                          >
                            {note}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runCalculation(formData)}
                  disabled={calculating}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t("recalculate")}
                </Button>
              </div>
            )}
          </StepContent>
        );

      case 4:
        return (
          <StepContent title={t("step5Title")} description={t("step5Description")}>
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-muted-foreground)]">{t("taxYear")}</span>
                    <span className="font-medium text-[var(--color-foreground)]">
                      {formData.year}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-muted-foreground)]">{t("country")}</span>
                    <span className="font-medium text-[var(--color-foreground)]">
                      {formData.country === "PT" ? `🇵🇹 ${t("portugal")}` : `🇪🇸 ${t("spain")}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-muted-foreground)]">{t("regime")}</span>
                    <span className="font-medium text-[var(--color-foreground)]">
                      {t(
                        `regime_${formData.regime}_${formData.country}` as Parameters<typeof t>[0],
                      )}
                    </span>
                  </div>
                  {calculation && (
                    <>
                      <div className="flex justify-between border-t border-[var(--color-border)] pt-2">
                        <span className="text-[var(--color-muted-foreground)]">
                          {t("taxDueLabel")}
                        </span>
                        <span className="font-bold text-[var(--color-foreground)]">
                          {formatCurrency(calculation.taxDue)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-muted-foreground)]">
                          {t("balanceDueLabel")}
                        </span>
                        <span
                          className={`font-bold ${calculation.balanceDue > 0 ? "text-destructive" : "text-[var(--color-success)]"}`}
                        >
                          {formatCurrency(calculation.balanceDue)}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => saveFiling("draft")}
                  disabled={saving || !calculation}
                  className="flex-1"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t("saveAsDraft")}
                </Button>
                <Button
                  onClick={() => saveFiling("final")}
                  disabled={saving || !calculation}
                  className="flex-1 bg-accent-primary hover:bg-accent-primary/90"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t("markAsFinal")}
                </Button>
              </div>
            </div>
          </StepContent>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {hasDraft && (
        <DraftBanner onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />
      )}
      <MultiStepFormContainer
        steps={form.steps}
        currentStep={form.currentStep}
        completedSteps={
          new Set(
            Array.from({ length: form.currentStep }, (_, i) => i),
          )
        }
        visitedSteps={form.visitedSteps}
        progress={form.progress}
        isSubmitting={form.isSubmitting}
        isFirstStep={form.isFirstStep}
        isLastStep={form.isLastStep}
        onPrevStep={form.prevStep}
        onNextStep={form.nextStep}
        onSubmit={async () => {}}
        onGoToStep={form.goToStep}
        indicatorVariant="pills"
        showIndicator
      >
        {renderStep()}
      </MultiStepFormContainer>

      <div className="flex justify-end border-t border-[var(--color-border)] pt-3">
        <Button variant="ghost" onClick={onCancel} size="sm">
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
