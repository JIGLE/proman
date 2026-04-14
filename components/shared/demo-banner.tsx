"use client";

import { useTranslations } from "next-intl";
import { useDemoMode } from "@/lib/contexts/demo-context";
import { AlertTriangle, X, LogOut } from "lucide-react";
import { useState } from "react";

export function DemoBanner() {
  const { isDemoMode, exitDemo } = useDemoMode();
  const [dismissed, setDismissed] = useState(false);
  const t = useTranslations();

  if (!isDemoMode || dismissed) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500/90 backdrop-blur-sm px-4 py-2 text-sm font-medium text-amber-950 dark:bg-amber-600/90 dark:text-amber-50"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{t("demo.banner")}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={exitDemo}
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-900/20 px-3 py-1 text-xs font-semibold hover:bg-amber-900/30 transition-colors"
        >
          <LogOut className="h-3 w-3" />
          {t("demo.exitButton")}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-md p-1 hover:bg-amber-900/20 transition-colors"
          aria-label={t("actions.cancel")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
