"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useMap } from "react-leaflet";
import { Building2, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { useApp } from "@/lib/contexts/app-context";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), {
  ssr: false,
});
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

interface PropertyMarker {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: "occupied" | "vacant" | "maintenance";
  rent?: number;
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
  const [mapCenter, setMapCenter] = useState<[number, number]>([38.7223, -9.1393]);
  const [leafletReady, setLeafletReady] = useState(false);

  const properties = useMemo<PropertyMarker[]>(
    () =>
      state.properties
        .filter(
          (property) =>
            typeof property.latitude === "number" && typeof property.longitude === "number",
        )
        .map((property) => ({
          id: property.id,
          name: property.name,
          address: property.address,
          latitude: property.latitude as number,
          longitude: property.longitude as number,
          status: property.status,
          rent: property.rent,
        })),
    [state.properties],
  );

  useEffect(() => {
    if (properties.length > 0) {
      setMapCenter([properties[0].latitude, properties[0].longitude]);
    }
  }, [properties]);

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

  const missingCoordinates = state.properties.length - properties.length;

  if (state.loading || !leafletReady) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-[var(--color-border-hover)] dark:bg-[var(--color-surface)]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-[var(--color-border-hover)] dark:bg-[var(--color-surface)]">
          <div className="text-sm text-gray-500 dark:text-[var(--color-muted-foreground)]">
            Mapped properties
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {properties.length}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-[var(--color-border-hover)] dark:bg-[var(--color-surface)]">
          <div className="text-sm text-gray-500 dark:text-[var(--color-muted-foreground)]">
            Missing coordinates
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-500">{missingCoordinates}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-[var(--color-border-hover)] dark:bg-[var(--color-surface)]">
          <div className="text-sm text-gray-500 dark:text-[var(--color-muted-foreground)]">
            Map source
          </div>
          <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            OpenStreetMap
          </div>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center dark:border-[var(--color-border-hover)] dark:bg-[var(--color-surface)]">
          <MapPin className="mx-auto mb-4 h-12 w-12 text-[var(--color-muted-foreground)]" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            No properties with coordinates
          </h3>
          <p className="text-gray-600 dark:text-[var(--color-muted-foreground)]">
            Verify the property address or save latitude and longitude to place it on the map.
          </p>
        </div>
      ) : (
        <div className="h-[600px] overflow-hidden rounded-lg border border-gray-200 dark:border-[var(--color-border-hover)]">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapFlyToController propertyId={highlightedPropertyId} markers={properties} />
            {properties.map((property) => (
              <Marker
                key={property.id}
                position={[property.latitude, property.longitude]}
                eventHandlers={{
                  click: () => onSelectProperty?.(property.id),
                }}
              >
                <Popup>
                  <div className="space-y-2 p-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      <h3 className="font-semibold text-gray-900">{property.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{property.address}</p>
                    <p className="text-xs text-gray-500">Status: {property.status}</p>
                    {typeof property.rent === "number" && (
                      <p className="text-xs text-gray-500">Rent: {property.rent}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectProperty?.(property.id)}
                      className="mt-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-500"
                    >
                      Open details
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
