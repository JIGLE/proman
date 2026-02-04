'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Building2, Plus, Edit2, Trash2, Home } from 'lucide-react';

interface Unit {
  id: string;
  number: string;
  floor: number | null;
  sizeSqM: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  status: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
  notes: string | null;
  property: {
    id: string;
    name: string;
    address: string;
  };
  leases: Array<{
    id: string;
    tenant: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface UnitsViewProps {
  propertyId?: string;
}

export default function UnitsView({ propertyId }: UnitsViewProps) {
  const _t = useTranslations('Units');
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  // TODO: Implement add/edit unit modal - states prepared but modal UI not yet built
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  
  // Suppress unused warnings until modal is implemented
  void showAddModal;
  void editingUnit;

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units');
      if (res.ok) {
        const data = await res.json();
        setUnits(data);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter units by property if propertyId is provided
  const filteredUnits = propertyId 
    ? units.filter(unit => unit.property.id === propertyId)
    : units;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vacant':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'occupied':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'reserved':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {filteredUnits.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {propertyId ? 'No units in this property' : 'No units yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {propertyId ? 'This property has no units added yet.' : 'Start by adding units to your properties'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Your First Unit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUnits.map((unit) => (
            <div
              key={unit.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Unit {unit.number}
                  </h3>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    unit.status
                  )}`}
                >
                  {unit.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Property:</span> {unit.property.name}
                </p>
                {unit.floor !== null && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Floor:</span> {unit.floor}
                  </p>
                )}
                {unit.sizeSqM && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Size:</span> {unit.sizeSqM} m²
                  </p>
                )}
                {(unit.bedrooms || unit.bathrooms) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {unit.bedrooms && `${unit.bedrooms} bed`}
                    {unit.bedrooms && unit.bathrooms && ' • '}
                    {unit.bathrooms && `${unit.bathrooms} bath`}
                  </p>
                )}
                {unit.leases.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Tenant:</span>{' '}
                    {unit.leases[0].tenant.name}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setEditingUnit(unit)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this unit?')) {
                      // TODO: Implement delete
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
