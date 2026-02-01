/**
 * Address verification service using Nominatim (OpenStreetMap)
 * Free geocoding service for Portugal and Spain
 */

export interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
  licence: string;
  osm_type: string;
  osm_id: string;
  boundingbox: string[];
  class: string;
  type: string;
  importance: number;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export interface VerifiedAddress {
  streetAddress: string;
  city: string;
  zipCode: string;
  country: string;
  latitude: number;
  longitude: number;
  verified: boolean;
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Search bounds for Portugal and Spain (helps prioritize local results)
const PORTUGAL_BOUNDS = '-9.5,-6.2,36.9,42.2'; // min_lon,min_lat,max_lon,max_lat
const SPAIN_BOUNDS = '-18.2,-4.3,27.6,43.8';

export class AddressVerificationService {
  /**
   * Search for address suggestions
   */
  static async searchAddresses(query: string, country: 'Portugal' | 'Spain' = 'Portugal'): Promise<AddressSuggestion[]> {
    try {
      const bounds = country === 'Portugal' ? PORTUGAL_BOUNDS : SPAIN_BOUNDS;
      const countryCode = country === 'Portugal' ? 'pt' : 'es';

      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '10',
        countrycodes: countryCode,
        bounded: '1',
        viewbox: bounds,
        extratags: '1',
        namedetails: '1',
      });

      const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
        headers: {
          'User-Agent': 'ProMan Property Management/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data: AddressSuggestion[] = await response.json();
      return data;
    } catch (error) {
      console.error('Address search failed:', error);
      return [];
    }
  }

  /**
   * Verify and parse an address suggestion into structured format
   */
  static parseAddressSuggestion(suggestion: AddressSuggestion): VerifiedAddress {
    const address = suggestion.address;
    const country = address.country === 'Portugal' ? 'Portugal' : 'Spain';

    // Build street address from components
    const streetParts = [];
    if (address.house_number) streetParts.push(address.house_number);
    if (address.road) streetParts.push(address.road);
    if (address.suburb && address.suburb !== address.city) streetParts.push(address.suburb);

    const streetAddress = streetParts.join(' ') || suggestion.display_name.split(',')[0];

    // Determine city (prefer municipality over city for Portugal/Spain)
    const city = address.municipality || address.city || address.county || '';

    // Validate postal code format
    let zipCode = address.postcode || '';
    if (country === 'Portugal' && zipCode && !/^[0-9]{4}-[0-9]{3}$/.test(zipCode)) {
      // Try to format Portuguese postal codes
      const digits = zipCode.replace(/\D/g, '');
      if (digits.length === 7) {
        zipCode = `${digits.slice(0, 4)}-${digits.slice(4)}`;
      }
    } else if (country === 'Spain' && zipCode && !/^[0-9]{5}$/.test(zipCode)) {
      zipCode = zipCode.replace(/\D/g, '').slice(0, 5);
    }

    return {
      streetAddress,
      city,
      zipCode,
      country,
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      verified: true,
    };
  }

  /**
   * Validate postal code format
   */
  static validatePostalCode(zipCode: string, country: 'Portugal' | 'Spain'): boolean {
    if (country === 'Portugal') {
      return /^[0-9]{4}-[0-9]{3}$/.test(zipCode);
    } else if (country === 'Spain') {
      return /^[0-9]{5}$/.test(zipCode);
    }
    return false;
  }

  /**
   * Generate building ID for property grouping
   * Normalizes address to group properties at same location
   */
  static generateBuildingId(address: string, city: string, zipCode: string): string {
    const normalized = `${address.toLowerCase().replace(/[^a-z0-9]/g, '')}_${city.toLowerCase().replace(/[^a-z0-9]/g, '')}_${zipCode.replace(/\D/g, '')}`;
    // Use a simple hash-like approach for consistency
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
