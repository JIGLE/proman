"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { DataViewMode } from "@/components/ui/data-view-toggle";
import { Input } from "@/components/ui/input";
import { PropertyFormDialog, type PropertyFormDialogRef } from "./property-form-dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils/utils";
import { useApp } from "@/lib/contexts/app-context";
import { useConfirmDialog } from "@/lib/hooks/use-confirm-dialog";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import PropertyMap from "./property-map";
import { PortfolioTree } from "./portfolio-tree";
import { PropertyDetailView } from "./property-detail-view";
import { PageHeader } from "@/components/shared/page-header";

export type PropertiesViewProps = {
  viewMode?: "list" | "map";
  onPropertySelect?: (propertyId: string) => void;
  highlightedPropertyId?: string;
  density?: "comfortable" | "compact";
  showPageHeader?: boolean;
  /**
   * Actions that belong to the asset list itself (create, export). Rendered at the top of the
   * tree column rather than in the page header, so they sit with the thing they act on. Passed
   * in rather than owned here because the caller holds the dialogs they open.
   */
  treeActions?: React.ReactNode;
};

export type PropertiesViewRef = {
  openDialog: () => void;
};

export const PropertiesView = forwardRef<PropertiesViewRef, PropertiesViewProps>(
  function PropertiesView(
    {
      viewMode = "list",
      onPropertySelect,
      highlightedPropertyId,
      showPageHeader = true,
      treeActions,
    }: PropertiesViewProps,
    ref,
  ): React.ReactElement {
    const { state, addBuilding: _addBuilding } = useApp();
    const {
      properties = [],
      tenants = [],
      leases = [],
      maintenance = [],
      buildings = [],
      loading,
    } = state;
    const router = useRouter();
    const pathname = usePathname();
    const locale = pathname.split("/")[1] || "pt";
    const confirmDialog = useConfirmDialog();
    // Property detail modal state
    // Removed: selectedProperty, isDetailModalOpen (now handled by router/modal route)

    // The create/edit property form lives in its own component (property-form-dialog.tsx)
    // so the detail view's Edit action can mount an independent instance of the exact
    // same schema/onSubmit path, instead of duplicating the form.
    const formDialogRef = useRef<PropertyFormDialogRef>(null);

    // The Portfolio commits to the tree + workspace (mockup-faithful) — no view
    // toggle. `viewMode="map"` remains for the standalone map embed used elsewhere.
    const t = useTranslations("properties");
    const tNav = useTranslations("navigation");
    const [dataViewMode] = useState<DataViewMode>(viewMode === "map" ? "map" : "tree");
    // The asset whose command workspace is open in the tree split (desktop only).
    const [workspacePropertyId, setWorkspacePropertyId] = useState<string | null>(null);

    // How far the tree split sits below the top of the scroll container. The asset rail is
    // sized `100vh - this` so it runs to the viewport floor and no further — a plain `h-screen`
    // would overhang by exactly the height of whatever page header sits above it, and a sticky
    // element that overhangs its own containing block gets dragged upward until its top (and
    // its action row) is off-screen. Measured on the wrapper, which never sticks, so the
    // reading stays the layout position rather than the pinned one.
    const splitRef = useRef<HTMLDivElement>(null);
    const [railInset, setRailInset] = useState<number | null>(null);
    useEffect(() => {
      const measure = () => {
        const el = splitRef.current;
        const main = el?.closest("main");
        if (!el || !main) return;
        const top =
          el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop;
        setRailInset(Math.max(0, Math.round(top)));
      };
      measure();
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }, [loading]);

    const buildingDeleteConfirm = useConfirmDialog();

    // Search + attention filter. The old top chrome (full-width search, type /
    // status dropdowns and the operational chip strip) was decluttered; a compact
    // search and an "attention only" toggle now live in the tree column.
    const [searchQuery, setSearchQuery] = useState("");
    const [attentionOnly, setAttentionOnly] = useState(false);

    const activeLeasePropertyIds = useMemo(() => {
      return new Set(
        leases.filter((lease) => lease.status === "active").map((lease) => lease.propertyId),
      );
    }, [leases]);

    const expiringLeasePropertyIds = useMemo(() => {
      const now = new Date();
      const inThirtyDays = new Date();
      inThirtyDays.setDate(inThirtyDays.getDate() + 30);

      return new Set(
        leases
          .filter((lease) => {
            if (lease.status !== "active") return false;
            const endDate = new Date(lease.endDate);
            return endDate >= now && endDate <= inThirtyDays;
          })
          .map((lease) => lease.propertyId),
      );
    }, [leases]);

    const openMaintenancePropertyIds = useMemo(() => {
      return new Set(
        maintenance
          .filter((ticket) => ticket.status === "open" || ticket.status === "in_progress")
          .map((ticket) => ticket.propertyId),
      );
    }, [maintenance]);

    const occupiedWithoutActiveLeaseIds = useMemo(() => {
      return new Set(
        properties
          .filter(
            (property) =>
              property.status === "occupied" && !activeLeasePropertyIds.has(property.id),
          )
          .map((property) => property.id),
      );
    }, [activeLeasePropertyIds, properties]);

    const needsAttentionPropertyIds = useMemo(() => {
      return new Set([
        ...expiringLeasePropertyIds,
        ...openMaintenancePropertyIds,
        ...occupiedWithoutActiveLeaseIds,
      ]);
    }, [expiringLeasePropertyIds, openMaintenancePropertyIds, occupiedWithoutActiveLeaseIds]);

    // Expose dialog methods to parent via ref
    useImperativeHandle(ref, () => ({
      openDialog: () => formDialogRef.current?.openDialog(),
    }));

    // Filter and search properties
    const filteredProperties = useMemo(() => {
      return properties.filter((property) => {
        const matchesSearch =
          searchQuery.length === 0 ||
          property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          property.address.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesAttention = !attentionOnly || needsAttentionPropertyIds.has(property.id);

        return matchesSearch && matchesAttention;
      });
    }, [properties, searchQuery, attentionOnly, needsAttentionPropertyIds]);

    // Sorting

    const handleMapPropertySelect = useCallback(
      (propertyId: string) => {
        const selected = properties.find((property) => property.id === propertyId);
        if (!selected) return;
        // Open property detail overlay via the shared `?detail=` query param
        router.push(`/${locale}/portfolio?detail=property:${selected.id}`);
        onPropertySelect?.(selected.id);
      },
      [onPropertySelect, properties, router, locale],
    );

    // Tree selection: on desktop, open the asset inline in the right workspace pane
    // (the Situs tree+workspace split); on smaller screens there is no room for a
    // side-by-side, so fall back to the routed detail (master→detail).
    const handleTreeSelect = useCallback(
      (propertyId: string) => {
        const isDesktop =
          typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
        if (isDesktop) {
          setWorkspacePropertyId(propertyId);
          onPropertySelect?.(propertyId);
        } else {
          handleMapPropertySelect(propertyId);
        }
      },
      [handleMapPropertySelect, onPropertySelect],
    );

    // If the viewport shrinks below the split breakpoint while an asset is open
    // inline, push it to the routed detail instead of leaving a selected tree row
    // with no visible workspace behind it.
    useEffect(() => {
      if (typeof window === "undefined" || !workspacePropertyId) return;
      const mql = window.matchMedia("(min-width: 1024px)");
      const handleChange = (e: MediaQueryListEvent) => {
        if (!e.matches) {
          handleMapPropertySelect(workspacePropertyId);
          setWorkspacePropertyId(null);
        }
      };
      mql.addEventListener("change", handleChange);
      return () => mql.removeEventListener("change", handleChange);
    }, [workspacePropertyId, handleMapPropertySelect]);

    return (
      <>
        {loading ? (
          <LoadingState variant="cards" count={6} />
        ) : (
          <div className="space-y-6">
            {showPageHeader && (
              <PageHeader title={tNav("properties")} description={t("portfolio.subtitle")} />
            )}
            {/* Property create/edit form — shared component, own instance */}
            <PropertyFormDialog ref={formDialogRef} />

            <div className="space-y-4">
              {dataViewMode === "map" ? (
                /* Map View */
                <div className="overflow-hidden border border-[var(--color-border)]">
                  <PropertyMap
                    highlightedPropertyId={highlightedPropertyId}
                    onSelectProperty={handleMapPropertySelect}
                  />
                </div>
              ) : (
                /* Tree View — Situs structural portfolio inventory + command workspace.
                   Desktop (lg+): a permanent asset rail beside an inline detail workspace.
                   Below lg: rail only — selecting an asset routes to the detail. */
                <div
                  ref={splitRef}
                  className="lg:grid lg:grid-cols-[260px_1fr] lg:items-start lg:gap-6"
                >
                  {/* Asset rail. One persistent column rather than a dismissable flyout: it runs
                      flush into the shell's left padding so it reads as a continuation of the
                      sidebar rather than a panel floating beside it, holds its own scroll down to
                      the viewport floor, and keeps its actions and filter pinned above that
                      scroll — the dismissable version hid all three the moment a detail opened.
                      It stays in flow so the page heading above it and the workspace beside it
                      lay out around it instead of under it. */}
                  <aside
                    style={
                      railInset === null
                        ? undefined
                        : ({ "--rail-inset": `${railInset}px` } as React.CSSProperties)
                    }
                    className={cn(
                      "flex flex-col bg-[var(--color-surface)]",
                      // -ml-8 + the matching width bleed puts the rail's left edge on the
                      // sidebar's right edge; the overhang lands inside the shell's padding box,
                      // so it adds no horizontal overflow.
                      "lg:sticky lg:top-0 lg:-ml-8 lg:w-[calc(100%+2rem)]",
                      // Painted a full viewport tall, but its *margin* box is shortened by the
                      // inset — and the margin box is what sticky is allowed to move inside its
                      // containing block. Without that, a rail as tall as the viewport has no
                      // room to travel and gets dragged up until its action row is off-screen.
                      "lg:h-screen lg:mb-[calc(-1*var(--rail-inset,7rem))]",
                      "lg:border-r lg:border-[var(--color-border)]",
                    )}
                  >
                    <div className="flex-none space-y-2 border-b border-[var(--color-border)] p-3">
                      {/* Create/export sit with the list they act on, not in the page header. */}
                      {treeActions && <div className="flex items-center gap-2">{treeActions}</div>}
                      {/* Compact search + attention filter — contextual to the tree
                          (replaces the removed top search band + filter chips). */}
                      <div className="flex items-center gap-2">
                        <div className="relative min-w-0 flex-1">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                          <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t("portfolio.filterAssets")}
                            aria-label={t("portfolio.filterAssetsLabel")}
                            className="h-8 pl-8 text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttentionOnly((v) => !v)}
                          aria-pressed={attentionOnly}
                          title={t("portfolio.attentionOnly")}
                          className={cn(
                            "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 border px-2.5 font-mono text-[12px] md:text-[10px] uppercase tracking-[0.06em] transition-colors max-md:min-h-11 max-md:min-w-11",
                            attentionOnly
                              ? "border-[var(--semantic-danger)] bg-[var(--semantic-danger-soft)] text-[var(--semantic-danger)]"
                              : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                          )}
                        >
                          <span className="status-dot status-dot-danger" aria-hidden="true" />
                          {needsAttentionPropertyIds.size}
                        </button>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 lg:overflow-y-auto">
                      <PortfolioTree
                        properties={filteredProperties}
                        buildings={buildings}
                        tenants={tenants}
                        maintenance={maintenance}
                        leases={leases}
                        onSelectProperty={handleTreeSelect}
                        highlightedPropertyId={workspacePropertyId ?? highlightedPropertyId}
                      />
                    </div>
                  </aside>

                  <div className="hidden min-w-0 lg:block">
                    {workspacePropertyId ? (
                      <div
                        key={workspacePropertyId}
                        className="border border-[var(--color-border)] bg-[var(--color-card)] p-4 motion-safe:animate-fade-in lg:p-6"
                      >
                        <PropertyDetailView propertyId={workspacePropertyId} />
                      </div>
                    ) : (
                      <div className="flex min-h-[440px] items-center justify-center border border-dashed border-[var(--color-border)] p-12 text-center">
                        <p className="mono-label max-w-[26ch] leading-relaxed">
                          {t("portfolio.selectAsset")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Property Detail Modal removed: now handled by intercepting route */}
        <ConfirmationDialog dialog={confirmDialog} />
        <ConfirmationDialog dialog={buildingDeleteConfirm} />
      </>
    );
  },
);

PropertiesView.displayName = "PropertiesView";
