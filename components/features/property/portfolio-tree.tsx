"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Rows3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { COUNTRY_THEMES, isCountryCode } from "@/lib/design/country-themes";
import { useCurrency } from "@/lib/contexts/currency-context";
import { cn } from "@/lib/utils/utils";
import type { Building, MaintenanceTicket, Property, Tenant } from "@/lib/types";

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
  onSelectProperty?: (propertyId: string) => void;
  highlightedPropertyId?: string;
}

interface AssetNode {
  property: Property;
  overdue: boolean;
  openTickets: number;
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
  onSelectProperty,
  highlightedPropertyId,
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

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleNode = useCallback((key: string) => {
    setCollapsed((prev) => {
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
  }, [properties, buildings, tenants, maintenance, t]);

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
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header: title + density control */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-4 py-3">
        <p className="mono-label">{t("title")}</p>
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
      </div>

      <div role="tree" aria-label={t("title")} className="px-2 py-2">
        {tree.map((country) => {
          const countryKey = `country:${country.code}`;
          const countryCollapsed = collapsed.has(countryKey);
          return (
            <div key={country.code} role="treeitem" aria-expanded={!countryCollapsed}>
              {/* Country row */}
              <button
                type="button"
                onClick={() => toggleNode(countryKey)}
                className={cn(
                  "flex w-full items-center gap-2 border-l-2 border-transparent px-2 text-left transition-colors hover:bg-[var(--color-hover)]",
                  rowPad,
                )}
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
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{country.label}</span>
                <span className="mono-label whitespace-nowrap">
                  {country.assetCount} · {formatCurrency(country.monthlyRent)}/m
                </span>
              </button>

              {!countryCollapsed &&
                country.clusters.map((cluster) => {
                  const clusterKey = `${countryKey}/${cluster.key}`;
                  const clusterCollapsed = collapsed.has(clusterKey);
                  return (
                    <div key={cluster.key} role="treeitem" aria-expanded={!clusterCollapsed}>
                      {/* Cluster row */}
                      <button
                        type="button"
                        onClick={() => toggleNode(clusterKey)}
                        className={cn(
                          "flex w-full items-center gap-2 border-l-2 border-transparent px-2 pl-7 text-left transition-colors hover:bg-[var(--color-hover)]",
                          rowPad,
                        )}
                      >
                        {clusterCollapsed ? (
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
                        <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-muted-foreground)]">
                          {cluster.label}
                        </span>
                        <span className="mono-label">{cluster.assets.length}</span>
                      </button>

                      {/* Asset rows */}
                      {!clusterCollapsed &&
                        cluster.assets.map(({ property, overdue, openTickets }) => {
                          const highlighted = property.id === highlightedPropertyId;
                          return (
                            <button
                              key={property.id}
                              type="button"
                              role="treeitem"
                              onClick={() => onSelectProperty?.(property.id)}
                              className={cn(
                                "flex w-full items-center gap-2.5 border-l-2 px-2 pl-12 text-left transition-colors",
                                rowPad,
                                highlighted
                                  ? "border-[var(--country-highlight-readable)] bg-[var(--color-hover)]"
                                  : "border-transparent hover:bg-[var(--color-hover)]",
                              )}
                            >
                              <span className="min-w-0 flex-1 truncate text-sm">
                                {property.name}
                                <span className="ml-2 hidden text-xs text-[var(--color-muted-foreground)] sm:inline">
                                  {property.address}
                                </span>
                              </span>
                              {/* Attention strip — square semantic dots, quiet when healthy */}
                              <span className="flex items-center gap-1" aria-hidden="true">
                                {overdue && (
                                  <span
                                    className="status-dot status-dot-danger"
                                    title={t("dotOverdue")}
                                  />
                                )}
                                {openTickets > 0 && (
                                  <span
                                    className="status-dot status-dot-warn"
                                    title={t("dotTickets")}
                                  />
                                )}
                              </span>
                              <span className="mono-label whitespace-nowrap tabular-nums">
                                {formatCurrency(property.rent || 0)}/m
                              </span>
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
    </div>
  );
}
