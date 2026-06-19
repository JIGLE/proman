"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  isDemoModeClient,
  clearDemoCookieClient,
  DEMO_USER,
  getDemoPerspectiveClient,
  getDemoTenantIdClient,
  setDemoPerspectiveClient,
  setDemoTenantClient,
  DEFAULT_DEMO_TENANT_ID,
} from "@/lib/demo/demo-mode";
import { clearDemoStore } from "@/lib/demo/demo-local-state";
import type { PortalRole } from "@/lib/portal/access";

interface DemoContextValue {
  isDemoMode: boolean;
  demoUser: typeof DEMO_USER | null;
  demoPerspective: PortalRole;
  selectedTenantId: string | null;
  switchDemoPerspective: (role: PortalRole, tenantId?: string) => void;
  exitDemo: () => Promise<void>;
}

const DemoContext = createContext<DemoContextValue>({
  isDemoMode: false,
  demoUser: null,
  demoPerspective: "owner",
  selectedTenantId: null,
  switchDemoPerspective: () => {},
  exitDemo: async () => {},
});

export function DemoProvider({ children }: { children: React.ReactNode }) {
  // Keep initial render deterministic to avoid SSR/client hydration mismatches.
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoPerspective, setDemoPerspective] = useState<PortalRole>("owner");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const syncDemoState = useCallback(() => {
    const nextIsDemoMode = isDemoModeClient();
    setIsDemoMode(nextIsDemoMode);
    setDemoPerspective(nextIsDemoMode ? getDemoPerspectiveClient() : "owner");
    setSelectedTenantId(nextIsDemoMode ? getDemoTenantIdClient() : null);
  }, []);

  useEffect(() => {
    syncDemoState();
  }, [syncDemoState, pathname]);

  useEffect(() => {
    const handleDemoModeChanged = () => {
      syncDemoState();
    };

    window.addEventListener("proman:demo-mode-changed", handleDemoModeChanged);
    return () => {
      window.removeEventListener("proman:demo-mode-changed", handleDemoModeChanged);
    };
  }, [syncDemoState]);

  const switchDemoPerspective = useCallback(
    (role: PortalRole, tenantId?: string) => {
      setDemoPerspective(role);
      setDemoPerspectiveClient(role);
      if (role === "tenant") {
        const nextTenantId = tenantId || selectedTenantId || DEFAULT_DEMO_TENANT_ID;
        setSelectedTenantId(nextTenantId);
        setDemoTenantClient(nextTenantId);
      } else {
        setSelectedTenantId(null);
      }
      router.refresh();
    },
    [router, selectedTenantId],
  );

  const exitDemo = useCallback(async () => {
    // Preserve current locale so the user returns to their selected language
    const currentLocale = pathname.split("/")[1] || "pt";
    clearDemoCookieClient();
    clearDemoStore();
    sessionStorage.removeItem("proman_demo");
    sessionStorage.removeItem("proman_demo_start");

    // Restore the theme that was active before entering demo
    const preTheme = sessionStorage.getItem("proman-pre-demo-theme") ?? "light";
    sessionStorage.removeItem("proman-pre-demo-theme");
    localStorage.setItem("proman-theme", preTheme);
    const resolved =
      preTheme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : (preTheme as "light" | "dark" | "dark-oled");
    const root = document.documentElement;
    root.classList.remove("light", "dark", "dark-oled");
    root.classList.add(resolved);
    root.setAttribute("data-theme", resolved);

    window.dispatchEvent(new Event("proman:demo-mode-changed"));
    setIsDemoMode(false);
    setDemoPerspective("owner");
    setSelectedTenantId(null);
    try {
      await signOut({ redirect: false });
    } catch {
      // Auth may be down — that's fine, we still clear demo state
    }
    router.push(`/${currentLocale}`);
  }, [router, pathname]);

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        demoUser: isDemoMode ? DEMO_USER : null,
        demoPerspective,
        selectedTenantId,
        switchDemoPerspective,
        exitDemo,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoContext);
}
