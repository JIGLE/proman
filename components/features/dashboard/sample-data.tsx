"use client";

import * as React from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/contexts/app-context";
import { useToast } from "@/lib/contexts/toast-context";

const SAMPLE_FLAG_KEY = "domora.sampleDataLoaded";

function setSampleFlag(value: boolean) {
  try {
    if (value) window.localStorage.setItem(SAMPLE_FLAG_KEY, "true");
    else window.localStorage.removeItem(SAMPLE_FLAG_KEY);
  } catch {
    /* ignore storage issues */
  }
}

function getSampleFlag(): boolean {
  try {
    return window.localStorage.getItem(SAMPLE_FLAG_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Empty-state CTA that seeds a ready-made portfolio so a brand-new user can see
 * the dashboard "come alive" before entering any real data.
 */
export function SampleDataLoadButton(): React.ReactElement {
  const t = useTranslations("onboarding");
  const toast = useToast();
  const { refreshData } = useApp();
  const [loading, setLoading] = React.useState(false);

  const handleLoad = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sample-data", { method: "POST" });
      if (!res.ok) throw new Error("seed failed");
      setSampleFlag(true);
      await refreshData();
      toast.success(t("sampleLoaded"));
    } catch {
      toast.error(t("sampleError"));
    } finally {
      setLoading(false);
    }
  }, [refreshData, t, toast]);

  return (
    <div className="flex flex-col items-start gap-1.5 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-foreground)]">{t("loadSample")}</p>
        <p className="text-xs text-[var(--color-muted-foreground)]">{t("loadSampleDesc")}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleLoad}
        disabled={loading}
        className="shrink-0"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? t("loadingSample") : t("loadSample")}
      </Button>
    </div>
  );
}

/**
 * Persistent banner shown while a user is exploring with seeded sample data,
 * offering a one-click way to wipe it before they start entering real data.
 */
export function SampleDataBanner(): React.ReactElement | null {
  const t = useTranslations("onboarding");
  const toast = useToast();
  const { refreshData } = useApp();
  const [active, setActive] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);

  React.useEffect(() => {
    setActive(getSampleFlag());
  }, []);

  const handleClear = React.useCallback(async () => {
    if (!window.confirm(t("clearSampleConfirm"))) return;
    setClearing(true);
    try {
      const res = await fetch("/api/sample-data", { method: "DELETE" });
      if (!res.ok) throw new Error("clear failed");
      setSampleFlag(false);
      setActive(false);
      await refreshData();
      toast.success(t("sampleCleared"));
    } catch {
      toast.error(t("sampleError"));
    } finally {
      setClearing(false);
    }
  }, [refreshData, t, toast]);

  if (!active) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-warning)]" aria-hidden="true" />
        <p className="truncate text-sm text-[var(--color-foreground)]">{t("sampleBanner")}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClear}
        disabled={clearing}
        className="shrink-0 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/15"
      >
        {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        {clearing ? t("clearingSample") : t("clearSample")}
      </Button>
    </div>
  );
}
