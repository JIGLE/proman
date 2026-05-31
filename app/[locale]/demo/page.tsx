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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 shadow-lg">
            <Building2 className="h-10 w-10 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Proman Demo</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {status === "error" ? error : t("demo.preparing")}
          </p>
        </div>

        {status !== "error" && (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        )}

        {status === "error" && (
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {t("actions.refresh")}
          </button>
        )}
      </div>
    </div>
  );
}
