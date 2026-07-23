"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { withoutEntityDetail } from "@/lib/utils/entity-detail-url";

/**
 * Shared close behavior for the `?detail=<type>:<id>` entity overlay: go back
 * in history if there is any, else strip `detail` from the current URL while
 * preserving every other search param. Used both by `EntityDetailOverlay`
 * itself (its Sheet's close button/Escape) and by content components that
 * need to close themselves after an in-place action (e.g. delete).
 */
export function useEntityDetailClose(): () => void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(withoutEntityDetail(pathname, searchParams.toString()));
    }
  };
}
