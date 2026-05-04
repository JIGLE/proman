"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useMap } from "react-leaflet";
import { Building2, MapPin, Navigation, X } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { useApp } from "@/lib/contexts/app-context";
import { cn } from "@/lib/utils/utils";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });

interface PropertyMarker {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: "occupied" | "vacant" | "maintenance";
  rent?: number;
  isExpiringSoon: boolean;
}

const STATUS_COLORS = {
  occupied: "#22c55e",
  vacant: "#f59e0b",
  maintenance: "#f97316",
  expiring: "#ef4444",
} as const;

const STATUS_LABELS: Record<PropertyMarker["status"], string> = {
  occupied: "Occupied",
  vacant: "Vacant",
  maintenance: "Maintenance",
};

function makeStatusIcon(
  status: PropertyMarker["status"],
  isExpiringSoon: boolean,
  isHighlighted: boolean,
) {
  if (typeof window === "undefined") return undefined;

  const L = require("leaflet");

  const color = isExpiringSoon ? STATUS_COLORS.expiring : STATUS_COLORS[status];
  const size = isHighlighted ? 18 : 14;
  const pulse = isExpiringSoon
    ? `<span style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:.3;animation:ping 1.5s cubic-bezier(0,0,.2,1) infinite"></span>`
    : "";

  return L.divIcon({
    html: `<span style="position:relative;display:block;width:${size}px;height:${size}px">${pulse}<span style="position:absolute;inset:0;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 5px rgba(0,0,0,.4)"></span></span>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FitBoundsController({ markers, trigger }: { markers: PropertyMarker[]; trigger: number }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    if (typeof window === "undefined") return;

    const L = require("leaflet");
    const bounds = L.latLngBounds(markers.map((m) => [m.latitude, m.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [markers, trigger, map]);
  return null;
}

function MapFlyToController({
  propertyId,
  markers,
}: {
  propertyId: string | undefined;
  markers: PropertyMarker[];
}) {
  const map = useMap();
  useEffect(() => {
    if (!propertyId) return;
    const target = markers.find((m) => m.id === propertyId);
    if (target) {
      map.flyTo([target.latitude, target.longitude], 16, { duration: 1.2 });
    }
  }, [propertyId, markers, map]);
  return null;
}

export default function PropertyMap({
  highlightedPropertyId,
  onSelectProperty,
}: {
  highlightedPropertyId?: string;
  onSelectProperty?: (propertyId: string) => void;
}) {
  const { state } = useApp();
  const [leafletReady, setLeafletReady] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);

  const expiringPropertyIds = useMemo(() => {
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const ids = new Set<string>();
    state.leases?.forEach((lease) => {
      if (lease.status === "active" && lease.endDate) {
        const end = Date.parse(lease.endDate);
        if (!isNaN(end) && end - now > 0 && end - now <= thirtyDays) {
          ids.add(lease.propertyId);
        }
      }
    });
    return ids;
  }, [state.leases]);

  const markers = useMemo<PropertyMarker[]>(
    () =>
      state.properties
        .filter((p) => typeof p.latitude === "number" && typeof p.longitude === "number")
        .map((p) => ({
          id: p.id,
          name: p.name,
          address: p.address,
          latitude: p.latitude as number,
          longitude: p.longitude as number,
          status: p.status,
          rent: p.rent,
          isExpiringSoon: expiringPropertyIds.has(p.id),
        })),
    [state.properties, expiringPropertyIds],
  );

  const missingCount = state.properties.length - markers.length;
  const selectedMarker = markers.find((m) => m.id === selectedMarkerId) ?? null;

  useEffect(() => {
    let active = true;
    import("leaflet")
      .then((L) => {
        if (!active) return;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
        setLeafletReady(true);
      })
      .catch(() => setLeafletReady(true));
    return () => {
      active = false;
    };
  }, []);

  if (state.loading || !leafletReady) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]"
        style={{ height: "calc(100vh - 220px)" }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-accent-primary" />
      </div>
    );
  }

  if (markers.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] py-16 text-center">
        <MapPin className="mx-auto mb-4 h-12 w-12 text-[var(--color-muted-foreground)]" />
        <h3 className="mb-2 text-lg font-semibold text-[var(--color-foreground)]">
          No properties with coordinates
        </h3>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Verify property addresses or save coordinates to show pins on the map.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Compact info strip */}
      <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
        <span>
          <span className="font-medium text-[var(--color-foreground)]">{markers.length}</span>{" "}
          mapped
          {missingCount > 0 && (
            <>
              {" · "}
              <span className="font-medium text-amber-400">{missingCount} missing coords</span>
            </>
          )}
        </span>
        <button
          type="button"
          onClick={() => setFitTrigger((n) => n + 1)}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 hover:bg-[var(--color-hover)] transition-colors"
          title="Fit all markers in view"
        >
          <Navigation className="h-3 w-3" />
          Fit all
        </button>
      </div>

      {/* Map + slide-in side panel */}
      <div
        className="relative flex overflow-hidden rounded-lg border border-[var(--color-border)]"
        style={{ height: "calc(100vh - 220px)" }}
      >
        {/* Map area */}
        <div
          className={cn(
            "relative flex-shrink-0 transition-all duration-300",
            selectedMarker ? "w-[65%]" : "w-full",
          )}
        >
          <MapContainer
            center={[38.7223, -9.1393]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBoundsController markers={markers} trigger={fitTrigger} />
            <MapFlyToController propertyId={highlightedPropertyId} markers={markers} />
            {markers.map((marker) => {
              const isHighlighted =
                marker.id === highlightedPropertyId || marker.id === selectedMarkerId;
              const icon = makeStatusIcon(marker.status, marker.isExpiringSoon, isHighlighted);
              return (
                <Marker
                  key={marker.id}
                  position={[marker.latitude, marker.longitude]}
                  icon={icon}
                  eventHandlers={{
                    click: () =>
                      setSelectedMarkerId((prev) => (prev === marker.id ? null : marker.id)),
                  }}
                />
              );
            })}
          </MapContainer>

          {/* Legend overlay */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex flex-col gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/90 px-2.5 py-2 text-[10px] backdrop-blur-sm">
            {(
              [
                { color: STATUS_COLORS.occupied, label: "Occupied" },
                { color: STATUS_COLORS.vacant, label: "Vacant" },
                { color: STATUS_COLORS.maintenance, label: "Maintenance" },
                { color: STATUS_COLORS.expiring, label: "Lease expiring" },
              ] as const
            ).map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className="block h-2 w-2 shrink-0 rounded-full border border-white/40"
                  style={{ background: color }}
                />
                <span className="text-[var(--color-muted-foreground)]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div
          className={cn(
            "flex flex-col overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-background)] transition-all duration-300",
            selectedMarker ? "w-[35%]" : "w-0",
          )}
        >
          {selectedMarker && (
            <>
              {/* Panel header */}
              <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--color-border)] p-4">
                <div className="flex min-w-0 items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-accent-primary" />
                  <h3 className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                    {selectedMarker.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMarkerId(null)}
                  className="shrink-0 rounded p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
                  aria-label="Close panel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Panel body */}
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {selectedMarker.address}
                </p>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-muted-foreground)]">Status</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: `${selectedMarker.isExpiringSoon ? STATUS_COLORS.expiring : STATUS_COLORS[selectedMarker.status]}20`,
                        color: selectedMarker.isExpiringSoon
                          ? STATUS_COLORS.expiring
                          : STATUS_COLORS[selectedMarker.status],
                      }}
                    >
                      {selectedMarker.isExpiringSoon
                        ? "Lease expiring"
                        : STATUS_LABELS[selectedMarker.status]}
                    </span>
                  </div>

                  {typeof selectedMarker.rent === "number" && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--color-muted-foreground)]">Rent</span>
                      <span className="text-xs font-medium text-[var(--color-foreground)]">
                        €{selectedMarker.rent.toLocaleString()}/mo
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Panel footer */}
              <div className="shrink-0 border-t border-[var(--color-border)] p-4">
                <button
                  type="button"
                  onClick={() => onSelectProperty?.(selectedMarker.id)}
                  className="w-full rounded-md bg-accent-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-primary/90"
                >
                  Open details
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Ping keyframe for expiring markers */}
      <style>{`@keyframes ping{75%,100%{transform:scale(2);opacity:0}}`}</style>
    </div>
  );
}
