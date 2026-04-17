"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  isDemoModeClient,
  clearDemoCookieClient,
  DEMO_USER,
  clearDemoRoleClient,
  clearDemoTenantIdClient,
} from "@/lib/demo/demo-mode";
import { clearDemoStore } from "@/lib/demo/demo-local-state";

interface DemoContextValue {
  isDemoMode: boolean;
  demoUser: typeof DEMO_USER | null;
  exitDemo: () => Promise<void>;
}

const DemoContext = createContext<DemoContextValue>({
  isDemoMode: false,
  demoUser: null,
  exitDemo: async () => {},
});

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(() => isDemoModeClient());
  const router = useRouter();

  useEffect(() => {
    // Re-check on mount (SSR → client hydration)
    setIsDemoMode(isDemoModeClient());
  }, []);

  const exitDemo = useCallback(async () => {
    clearDemoCookieClient();
    clearDemoRoleClient();
    clearDemoTenantIdClient();
    clearDemoStore();
    sessionStorage.removeItem("proman_demo");
    sessionStorage.removeItem("proman_demo_start");
    setIsDemoMode(false);
    try {
      await signOut({ redirect: false });
    } catch {
      // Auth may be down — that's fine, we still clear demo state
    }
    router.push("/");
  }, [router]);

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        demoUser: isDemoMode ? DEMO_USER : null,
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
