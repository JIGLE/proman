import { SkipLink } from "@/components/ui/accessibility";
import { PortalAccessGuard } from "@/components/shared/portal-access-guard";
import { AdminShellNav } from "@/components/features/admin/admin-shell-nav";

/**
 * The operator surface, deliberately not the app.
 *
 * `(main)` renders the portfolio sidebar, the command palette, breadcrumbs, the mobile bottom nav
 * and `AppDataGate`. None of that belongs here: these pages manage the *instance*, not a
 * portfolio, and several of them are opened precisely when the app is broken. `/admin` already
 * bypassed `AppDataGate` for that reason — a diagnostics screen that fails alongside the thing it
 * diagnoses is not a diagnostics screen — and this group makes that structural rather than a note
 * in one file.
 *
 * The visual departure is intentional too. Operator controls that look like app screens get used
 * like app screens, and the most destructive button in this product now lives behind one of them.
 *
 * Access: `PortalAccessGuard` keeps the route reachable per `PORTAL_NAV_GROUPS`, but the real gate
 * is `requireAdmin` on every `/api/admin/*` route. A non-admin who reaches these pages sees empty
 * panels and a refusal, never instance detail.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalAccessGuard>
      <div className="flex min-h-screen flex-col bg-[var(--color-canvas)]">
        <SkipLink href="#admin-content">Skip to main content</SkipLink>
        <AdminShellNav />
        <main
          id="admin-content"
          className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8"
        >
          {children}
        </main>
      </div>
    </PortalAccessGuard>
  );
}
