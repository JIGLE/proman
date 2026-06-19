"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Loader2 } from "lucide-react";
import {
  setDemoCookieClient,
  setDemoPerspectiveClient,
  setDemoTenantClient,
  DEFAULT_DEMO_TENANT_ID,
} from "@/lib/demo/demo-mode";

export default function DemoPage() {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"initializing" | "redirecting" | "error">("initializing");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations();

  // Extract locale from pathname
  const locale = pathname.split("/")[1] || "pt";
  const perspective = searchParams.get("perspective") === "tenant" ? "tenant" : "owner";
  const tenantId = searchParams.get("tenantId") || DEFAULT_DEMO_TENANT_ID;

  useEffect(() => {
    let cancelled = false;

    async function initDemo() {
      try {
        // Persist the user's theme so we can restore it when demo exits
        const previousTheme = localStorage.getItem("proman-theme") ?? "light";
        sessionStorage.setItem("proman-pre-demo-theme", previousTheme);
        // Force dark theme for demo — the demo data and design is dark-mode optimised
        localStorage.setItem("proman-theme", "dark");
        const root = document.documentElement;
        root.classList.remove("light", "dark", "dark-oled");
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");

        // Step 1: Set demo cookie client-side (no server dependency)
        setDemoCookieClient();
        setDemoPerspectiveClient(perspective);
        if (perspective === "tenant") {
          setDemoTenantClient(tenantId);
        }
        sessionStorage.setItem("proman_demo", "1");

        // Step 2: Fire-and-forget server-side cookie as backup
        fetch("/api/demo/init", { method: "POST" }).catch(() => {
          // Server may be down — that's fine, client cookie is enough
        });

        if (cancelled) return;

        window.dispatchEvent(new Event("proman:demo-mode-changed"));

        // Step 3: Redirect to dashboard — no NextAuth sign-in needed
        setStatus("redirecting");
        router.replace(`/${locale}/dashboard`);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "An error occurred");
        setStatus("error");
      }
    }

    initDemo();
    return () => {
      cancelled = true;
    };
  }, [router, locale, perspective, tenantId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 p-4 shadow-lg">
            <Building2 className="h-10 w-10 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Domora Demo</h1>
          <p className="text-[var(--color-muted-foreground)]">
            {status === "error" ? error : t("demo.preparing")}
          </p>
        </div>

        {status !== "error" && (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
          </div>
        )}

        {status === "error" && (
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            {t("actions.refresh")}
          </button>
        )}
      </div>
    </div>
  );
}
