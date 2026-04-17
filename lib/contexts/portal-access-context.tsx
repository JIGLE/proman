"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  getDemoRoleClient,
  getDemoTenantIdClient,
  setDemoRoleClient,
  setDemoTenantIdClient,
} from "@/lib/demo/demo-mode";
import { useDemoMode } from "@/lib/contexts/demo-context";
import {
  DEFAULT_DEMO_ROLE,
  DEFAULT_DEMO_TENANT_ID,
  PortalRole,
  canAccessPath,
} from "@/lib/portal-access";

interface PortalAccessContextValue {
  role: PortalRole;
  isOwner: boolean;
  isTenant: boolean;
  activeTenantId: string | null;
  canManage: boolean;
  canAccess: (pathname: string) => boolean;
  switchDemoRole: (role: PortalRole) => void;
}

const PortalAccessContext = createContext<PortalAccessContextValue>({
  role: DEFAULT_DEMO_ROLE,
  isOwner: true,
  isTenant: false,
  activeTenantId: null,
  canManage: true,
  canAccess: () => true,
  switchDemoRole: () => {},
});

export function PortalAccessProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { isDemoMode } = useDemoMode();
  const [demoRole, setDemoRole] = useState<PortalRole>(DEFAULT_DEMO_ROLE);
  const [demoTenantId, setDemoTenantId] = useState<string>(DEFAULT_DEMO_TENANT_ID);

  useEffect(() => {
    if (!isDemoMode) return;
    setDemoRole(getDemoRoleClient());
    setDemoTenantId(getDemoTenantIdClient() || DEFAULT_DEMO_TENANT_ID);
  }, [isDemoMode]);

  const switchDemoRole = useCallback(
    (role: PortalRole) => {
      if (!isDemoMode) return;
      setDemoRole(role);
      setDemoRoleClient(role);
      if (role === "tenant") {
        setDemoTenantIdClient(demoTenantId || DEFAULT_DEMO_TENANT_ID);
      }
    },
    [demoTenantId, isDemoMode],
  );

  const sessionRole = session?.user?.role?.toLowerCase();
  const role: PortalRole = isDemoMode ? demoRole : sessionRole === "tenant" ? "tenant" : "owner";

  const value = useMemo<PortalAccessContextValue>(
    () => ({
      role,
      isOwner: role === "owner",
      isTenant: role === "tenant",
      activeTenantId: role === "tenant" ? demoTenantId : null,
      canManage: role === "owner",
      canAccess: (pathname: string) => canAccessPath(role, pathname),
      switchDemoRole,
    }),
    [demoTenantId, role, switchDemoRole],
  );

  return <PortalAccessContext.Provider value={value}>{children}</PortalAccessContext.Provider>;
}

export function usePortalAccess() {
  return useContext(PortalAccessContext);
}
