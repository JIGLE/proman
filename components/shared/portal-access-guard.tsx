"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePortalAccess } from "@/lib/contexts/portal-context";

export function PortalAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { canAccessPath } = usePortalAccess();

  useEffect(() => {
    if (!pathname) {
      return;
    }
    if (!canAccessPath(pathname)) {
      const locale = pathname.split("/")[1] || "pt";
      router.replace(`/${locale}/overview`);
    }
  }, [canAccessPath, pathname, router]);

  if (pathname && !canAccessPath(pathname)) {
    return null;
  }

  return <>{children}</>;
}
