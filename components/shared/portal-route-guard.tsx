"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePortalAccess } from "@/lib/contexts/portal-access-context";

export function PortalRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { canAccess, isTenant } = usePortalAccess();
  const locale = pathname.split("/")[1] || "en";
  const pathWithoutLocale = pathname.replace(/^\/(pt|en|es)/, "") || "/";
  const allowed = canAccess(pathWithoutLocale);

  useEffect(() => {
    if (isTenant && !allowed) {
      router.replace(`/${locale}/overview`);
    }
  }, [allowed, isTenant, locale, router]);

  if (isTenant && !allowed) {
    return <p className="sr-only">Redirecting to an allowed tenant page.</p>;
  }

  return null;
}
