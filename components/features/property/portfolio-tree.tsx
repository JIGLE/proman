"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Rows3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { COUNTRY_THEMES, isCountryCode } from "@/lib/design/country-themes";
import { useCurrency } from "@/lib/contexts/currency-context";
import { cn } from "@/lib/utils/utils";
import type { Building, Lease, MaintenanceTicket, Property, Tenant } from "@/lib/types";

/** A lease is in its renewal window when it is active and ends within 60 days. */
const RENEWAL_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

/**
 * Structural Portfolio Inventory — the Situs tree view.
 *
 * Hierarchy is derived from real data, not stored: country → cluster
 * (building, or city for standalone properties) → asset. Each asset carries
 * an attention strip of square status dots: danger = tenant payment overdue,
 * warning = open maintenance tickets. Group rows collapse; a density control
 * tightens row spacing for large portfolios (persisted per device).
 */

const DENSITY_STORAGE_KEY = "situs-portfolio-tree-density";

type Density = "comfortable" | "compact";

interface PortfolioTreeProps {
  properties: Property[];
  buildings: Building[];
  tenants: Tenant[];
  maintenance: MaintenanceTicket[];
  leases?: Lease[];
  onSelectProperty?: (propertyId: string) => void;
  highlightedPropertyId?: string;
  /**
   * Strip the rows to property name + status dots only, dropping the address, the per-asset
   * rent and the group rent subtotals. Used by the flyout, where everything omitted here is
   * already on the detail page behind it — so the panel only has to be wide enough to name
   * an asset and show whether it needs attention.
   */
  compact?: boolean;
  /** Collapse the rail to a dots-only spine (desktop density control). */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

interface AssetNode {
  property: Property;
  overdue: boolean;
  openTickets: number;
  renewalDue: boolean;
}

interface ClusterNode {
  key: string;
  label: string;
  assets: AssetNode[];
}

interface CountryNode {
  code: string;
  label: string;
  monthlyRent: number;
  clusters: ClusterNode[];
  assetCount: number;
}

function countryLabel(code: string): string {
  return isCountryCode(code) ? COUNTRY_THEMES[code].name : code;
}

export function PortfolioTree({
  properties,
  buildings,
  tenants,
  maintenance,
  leases = [],
  onSelectProperty,
  highlightedPropertyId,
  compact = false,
  collapsed = false,
  onToggleCollapsed,
}: PortfolioTreeProps): React.ReactElement {
  const t = useTranslations("portfolioTree");
  const { formatCurrency } = useCurrency();

  const [density, setDensity] = useState<Density>("comfortable");
  useEffect(() => {
    const saved = localStorage.getItem(DENSITY_STORAGE_KEY);
    if (saved === "compact" || saved === "comfortable") setDensity(saved);
  }, []);
  const toggleDensity = useCallback(() => {
    setDensity((prev) => {
      const next = prev === "compact" ? "comfortable" : "compact";
      localStorage.setItem(DENSITY_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const toggleNode = useCallback((key: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const tree = useMemo<CountryNode[]>(() => {
    const buildingsById = new Map(buildings.map((b) => [b.id, b]));
    const overdueByProperty = new Set(
      tenants
        .filter((tn) => tn.paymentStatus === "overdue" && tn.propertyId)
        .map((tn) => tn.propertyId as string),
    );
    const openTicketsByProperty = new Map<string, number>();
    for (const ticket of maintenance) {
      if (ticket.status === "open" || ticket.status === "in_progress") {
        openTicketsByProperty.set(
          ticket.propertyId,
          (openTicketsByProperty.get(ticket.propertyId) ?? 0) + 1,
        );
      }
    }
    // Info signal: an active lease entering its 60-day renewal window.
    const renewalDueByProperty = new Set<string>();
    const renewalCutoff = Date.now() + RENEWAL_WINDOW_MS;
    for (const lease of leases) {
      if (lease.status !== "active" || !lease.propertyId) continue;
      const end = Date.parse(lease.endDate);
      if (!Number.isNaN(end) && end > Date.now() && end <= renewalCutoff) {
        renewalDueByProperty.add(lease.propertyId);
      }
    }

    const countries = new Map<string, Map<string, ClusterNode>>();
    for (const property of properties) {
      const building = property.buildingId ? buildingsById.get(property.buildingId) : undefined;
      const code = (property.propertyCountry || property.country || building?.country || "PT")
        .toUpperCase()
        .slice(0, 2);
      const clusterKey = building ? `b:${building.id}` : `c:${property.city || "—"}`;
      const clusterLabel = building?.name || property.city || t("unclustered");

      let clusters = countries.get(code);
      if (!clusters) {
        clusters = new Map();
        countries.set(code, clusters);
      }
      let cluster = clusters.get(clusterKey);
      if (!cluster) {
        cluster = { key: clusterKey, label: clusterLabel, assets: [] };
        clusters.set(clusterKey, cluster);
      }
      cluster.assets.push({
        property,
        overdue: overdueByProperty.has(property.id),
        openTickets: openTicketsByProperty.get(property.id) ?? 0,
        renewalDue: renewalDueByProperty.has(property.id),
      });
    }

    return Array.from(countries.entries())
      .map(([code, clusters]) => {
        const clusterList = Array.from(clusters.values())
          .map((c) => ({
            ...c,
            assets: [...c.assets].sort((a, b) => a.property.name.localeCompare(b.property.name)),
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        const assets = clusterList.flatMap((c) => c.assets);
        return {
          code,
          label: countryLabel(code),
          monthlyRent: assets.reduce((sum, a) => sum + (a.property.rent || 0), 0),
          clusters: clusterList,
          assetCount: assets.length,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [properties, buildings, tenants, maintenance, leases, t]);

  const rowPad = density === "compact" ? "py-1.5" : "py-2.5";

  if (properties.length === 0) {
    return (
      <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
        <p className="mono-label">{t("title")}</p>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-[var(--color-surface)]",
        // In the flyout the Sheet supplies the frame, so the tree drops its own border.
        compact ? "border-0" : "border border-[var(--color-border)]",
      )}
    >
      {/* Header: title + density + collapse. Collapsed = just an expand affordance.
          The flyout hides this row entirely — the Sheet has its own header, and neither the
          density toggle nor the collapse control means anything in an overlay. */}
      <div
        className={cn(
          "flex items-center border-b border-[var(--color-border)] py-3",
          collapsed ? "justify-center px-2" : "justify-between gap-3 px-4",
          compact && "hidden",
        )}
      >
        {!collapsed && (
          <p className="mono-label min-w-0 flex-1 truncate" title={t("title")}>
            {t("title")}
          </p>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDensity}
            className="h-7 gap-1.5 rounded-none px-2 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--color-muted-foreground)]"
            aria-pressed={density === "compact"}
            title={t("density")}
          >
            <Rows3 className="h-3.5 w-3.5" aria-hidden="true" />
            {density === "compact" ? t("densityCompact") : t("densityComfortable")}
          </Button>
        )}
        {onToggleCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapsed}
            className="hidden h-7 w-7 shrink-0 rounded-none p-0 text-[var(--color-muted-foreground)] lg:inline-flex"
            aria-pressed={collapsed}
            title={collapsed ? t("expand") : t("collapse")}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        )}
      </div>

      <div role="tree" aria-label={t("title")} className={cn("py-2", collapsed ? "px-1" : "px-2")}>
        {tree.map((country) => {
          const countryKey = `country:${country.code}`;
          const countryCollapsed = collapsedNodes.has(countryKey);
          return (
            <div key={country.code} role="treeitem" aria-expanded={!countryCollapsed}>
              {/* Country row */}
              <button
                type="button"
                onClick={() => toggleNode(countryKey)}
                className={cn(
                  "flex w-full items-center gap-2 border-l-2 border-transparent text-left transition-colors hover:bg-[var(--color-hover)] max-md:min-h-11",
                  rowPad,
                  collapsed ? "justify-center px-0" : "px-2",
                )}
                title={collapsed ? country.label : undefined}
              >
                {countryCollapsed ? (
                  <ChevronRight
                    className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronDown
                    className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
                    aria-hidden="true"
                  />
                )}
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {country.label}
                    </span>
                    <span className="mono-label whitespace-nowrap">
                      {compact
                        ? country.assetCount
                        : `${country.assetCount} · ${formatCurrency(country.monthlyRent)}/m`}
                    </span>
                  </>
                )}
              </button>

              {!countryCollapsed &&
                country.clusters.map((cluster) => {
                  const clusterKey = `${countryKey}/${cluster.key}`;
                  const clusterNodeCollapsed = collapsedNodes.has(clusterKey);
                  return (
                    <div key={cluster.key} role="treeitem" aria-expanded={!clusterNodeCollapsed}>
                      {/* Cluster row */}
                      <button
                        type="button"
                        onClick={() => toggleNode(clusterKey)}
                        className={cn(
                          "flex w-full items-center gap-2 border-l-2 border-transparent text-left transition-colors hover:bg-[var(--color-hover)] max-md:min-h-11",
                          rowPad,
                          collapsed ? "justify-center px-0" : compact ? "px-2 pl-4" : "px-2 pl-7",
                        )}
                        title={collapsed ? cluster.label : undefined}
                      >
                        {clusterNodeCollapsed ? (
                          <ChevronRight
                            className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
                            aria-hidden="true"
                          />
                        ) : (
                          <ChevronDown
                            className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
                            aria-hidden="true"
                          />
                        )}
                        {!collapsed && (
                          <>
                            <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-muted-foreground)]">
                              {cluster.label}
                            </span>
                            <span className="mono-label">{cluster.assets.length}</span>
                          </>
                        )}
                      </button>

                      {/* Asset rows */}
                      {!clusterNodeCollapsed &&
                        cluster.assets.map(({ property, overdue, openTickets, renewalDue }) => {
                          const highlighted = property.id === highlightedPropertyId;
                          return (
                            <button
                              key={property.id}
                              type="button"
                              role="treeitem"
                              onClick={() => onSelectProperty?.(property.id)}
                              title={collapsed ? property.name : undefined}
                              className={cn(
                                "flex w-full items-center border-l-2 text-left transition-colors max-md:min-h-11",
                                rowPad,
                                collapsed
                                  ? "justify-center gap-1 px-0"
                                  : compact
                                    ? // Asset labels sit under their group's label, matching the
                                      // docked tree's relationship. The first pass used pl-6,
                                      // which put assets *left* of the group heading above them
                                      // and broke the hierarchy. Group is pl-4 + chevron + gap,
                                      // so its text lands at ~36px — hence pl-9 here.
                                      "gap-2 px-2 pl-9"
                                    : "gap-2.5 px-2 pl-12",
                                highlighted
                                  ? "border-[var(--country-highlight-readable)] bg-[var(--color-hover)]"
                                  : "border-transparent hover:bg-[var(--color-hover)]",
                              )}
                            >
                              {!collapsed && (
                                <span
                                  className="min-w-0 flex-1 truncate text-sm"
                                  title={compact ? property.name : undefined}
                                >
                                  {property.name}
                                  {!compact && (
                                    <span className="ml-2 hidden text-xs text-[var(--color-muted-foreground)] sm:inline">
                                      {property.address}
                                    </span>
                                  )}
                                </span>
                              )}
                              {/* Attention strip — square semantic dots, quiet when healthy */}
                              <span className="flex items-center gap-1">
                                {overdue && (
                                  <span
                                    className="status-dot status-dot-danger"
                                    title={t("dotOverdue")}
                                    aria-label={t("dotOverdue")}
                                  />
                                )}
                                {openTickets > 0 && (
                                  <span
                                    className="status-dot status-dot-warn"
                                    title={t("dotTickets")}
                                    aria-label={t("dotTickets")}
                                  />
                                )}
                                {renewalDue && (
                                  <span
                                    className="status-dot status-dot-info"
                                    title={t("dotLease")}
                                    aria-label={t("dotLease")}
                                  />
                                )}
                              </span>
                              {!collapsed && !compact && (
                                <span className="mono-label whitespace-nowrap tabular-nums">
                                  {formatCurrency(property.rent || 0)}/m
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* Signal legend — the status-dot code, learnable at a glance. Dropped in the flyout:
          it wraps to three cramped lines at that width, and each dot already carries its own
          title/aria-label, so the meaning is still reachable without spending the space. */}
      {!collapsed && !compact && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--color-border)] px-4 py-2.5">
          <span className="mono-label">{t("legend")}</span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
            <span className="status-dot status-dot-danger" aria-hidden="true" />
            {t("dotOverdue")}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
            <span className="status-dot status-dot-warn" aria-hidden="true" />
            {t("dotTickets")}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
            <span className="status-dot status-dot-info" aria-hidden="true" />
            {t("dotLease")}
          </span>
        </div>
      )}
    </div>
  );
}
