'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Building2, Users, Filter, Eye, EyeOff } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SearchAndFilter } from '@/components/ui/search-and-filter';
import { cn } from '@/lib/utils/utils';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface PropertyMarker {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: 'occupied' | 'vacant' | 'maintenance';
  type: 'apartment' | 'house' | 'commercial';
  tenants?: number;
  rent?: number;
  units?: number;
}

interface MapFilters {
  status: string[];
  type: string[];
  search: string;
}

interface MapViewState {
  showVacant: boolean;
  showOccupied: boolean;
  showMaintenance: boolean;
  clusterView: boolean;
}

export default function PropertyMap() {
  const [properties, setProperties] = useState<PropertyMarker[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<PropertyMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([38.7223, -9.1393]); // Lisbon default
  const [selectedProperty, setSelectedProperty] = useState<PropertyMarker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewState, setViewState] = useState<MapViewState>({
    showVacant: true,
    showOccupied: true,
    showMaintenance: true,
    clusterView: true
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    // Filter properties based on search and view state
    let filtered = properties;
    
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    filtered = filtered.filter(p => {
      if (p.status === 'vacant' && !viewState.showVacant) return false;
      if (p.status === 'occupied' && !viewState.showOccupied) return false;
      if (p.status === 'maintenance' && !viewState.showMaintenance) return false;
      return true;
    });
    
    setFilteredProperties(filtered);
  }, [properties, searchQuery, viewState]);

  const handleFiltersChange = (filters: Record<string, string | string[]>) => {
    // Handle filter changes from SearchAndFilter component
    const statusFilters = filters.status as string[] || [];
    setViewState(prev => ({
      ...prev,
      showVacant: statusFilters.includes('vacant'),
      showOccupied: statusFilters.includes('occupied'),
      showMaintenance: statusFilters.includes('maintenance')
    }));
  };

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'occupied': return '#10b981'; // green
      case 'vacant': return '#f59e0b'; // yellow
      case 'maintenance': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'occupied':
        return <Badge variant="success" size="sm">Occupied</Badge>;
      case 'vacant':
        return <Badge variant="warning" size="sm">Vacant</Badge>;
      case 'maintenance':
        return <Badge variant="destructive" size="sm">Maintenance</Badge>;
      default:
        return <Badge variant="outline" size="sm">Unknown</Badge>;
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/properties');
      if (res.ok) {
        const data = await res.json();
        const withCoords = data.filter(
          (p: any) => p.latitude && p.longitude
        ).map((p: any) => ({
          id: p.id,
          name: p.name,
          address: p.address,
          latitude: p.latitude,
          longitude: p.longitude,
          status: p.status,
        }));
        
        setProperties(withCoords);
        
        // Center on first property if available
        if (withCoords.length > 0) {
          setMapCenter([withCoords[0].latitude, withCoords[0].longitude]);
        }
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-6 h-6" />
            Property Map
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View all your properties on the map
          </p>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No properties with coordinates
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Add latitude and longitude to your properties to see them on the map
          </p>
        </div>
      ) : (
        <div className="h-[600px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {properties.map((property) => (
              <Marker
                key={property.id}
                position={[property.latitude, property.longitude]}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-gray-900">{property.name}</h3>
                    <p className="text-sm text-gray-600">{property.address}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Status: {property.status}
                    </p>
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
