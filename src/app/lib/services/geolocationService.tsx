/**
 * Geolocation Service
 * Handles address geocoding and distance calculations
 */

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  lat?: number;
  lng?: number;
}

export interface CompanyLocation {
  name: string;
  address: Address;
  serviceRadius: number; // in miles
}

// Company headquarters location (can be configured in settings)
const COMPANY_LOCATION: CompanyLocation = {
  name: 'Enterprise Business Management HQ',
  address: {
    street: '123 Main Street',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    lat: 30.2672,
    lng: -97.7431
  },
  serviceRadius: 50 // miles
};

class GeolocationService {
  private apiKey = 'demo'; // In production, use environment variable

  // Get company location
  getCompanyLocation(): CompanyLocation {
    const stored = localStorage.getItem('company_location');
    if (stored) {
      return JSON.parse(stored);
    }
    return COMPANY_LOCATION;
  }

  // Update company location
  updateCompanyLocation(location: CompanyLocation): void {
    localStorage.setItem('company_location', JSON.stringify(location));
  }

  // Calculate distance between two points using Haversine formula
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * 
      Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Geocode address to lat/lng (simplified version using zip code approximation)
  async geocodeAddress(address: Address): Promise<{ lat: number; lng: number } | null> {
    // In a real app, you'd call a geocoding API like Google Maps, Mapbox, or OpenStreetMap
    // For demo purposes, we'll use approximate coordinates based on zip code
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Demo: Use zip code patterns to approximate location
    const zipCode = address.zip;
    const coords = this.getApproximateCoordinates(zipCode, address.city, address.state);
    
    if (coords) {
      return coords;
    }
    
    return null;
  }

  // Get approximate coordinates based on zip code (demo data)
  private getApproximateCoordinates(zip: string, city: string, state: string): { lat: number; lng: number } | null {
    // Texas zip codes (around Austin area for demo)
    const texasZips: Record<string, { lat: number; lng: number }> = {
      '78701': { lat: 30.2672, lng: -97.7431 }, // Austin Downtown
      '78702': { lat: 30.2631, lng: -97.7231 },
      '78703': { lat: 30.2897, lng: -97.7658 },
      '78704': { lat: 30.2445, lng: -97.7596 },
      '78705': { lat: 30.2896, lng: -97.7430 },
      '78712': { lat: 30.2849, lng: -97.7341 },
      '78721': { lat: 30.2632, lng: -97.7031 },
      '78722': { lat: 30.2897, lng: -97.7197 },
      '78723': { lat: 30.2991, lng: -97.6931 },
      '78724': { lat: 30.2897, lng: -97.6531 },
      '78725': { lat: 30.2358, lng: -97.6431 },
      '78726': { lat: 30.4358, lng: -97.8831 },
      '78727': { lat: 30.4358, lng: -97.7231 },
      '78728': { lat: 30.4508, lng: -97.6831 },
      '78729': { lat: 30.4508, lng: -97.8031 },
      '78730': { lat: 30.3508, lng: -97.8631 },
      '78731': { lat: 30.3508, lng: -97.7831 },
      '78732': { lat: 30.3658, lng: -97.8831 },
      '78733': { lat: 30.3158, lng: -97.8831 },
      '78734': { lat: 30.3658, lng: -97.9631 },
      '78735': { lat: 30.2658, lng: -97.8631 },
      '78736': { lat: 30.2258, lng: -97.9231 },
      '78737': { lat: 30.1658, lng: -97.9631 },
      '78738': { lat: 30.3258, lng: -97.9631 },
      '78739': { lat: 30.1958, lng: -97.8631 },
      '78741': { lat: 30.2358, lng: -97.7231 },
      '78742': { lat: 30.2258, lng: -97.6631 },
      '78744': { lat: 30.1858, lng: -97.7431 },
      '78745': { lat: 30.2158, lng: -97.7931 },
      '78746': { lat: 30.2858, lng: -97.8031 },
      '78747': { lat: 30.1558, lng: -97.7831 },
      '78748': { lat: 30.1858, lng: -97.8231 },
      '78749': { lat: 30.2258, lng: -97.8431 },
      '78750': { lat: 30.4508, lng: -97.8431 },
      '78751': { lat: 30.3108, lng: -97.7231 },
      '78752': { lat: 30.3208, lng: -97.7031 },
      '78753': { lat: 30.3508, lng: -97.6631 },
      '78754': { lat: 30.3308, lng: -97.6231 },
      '78756': { lat: 30.3108, lng: -97.7631 },
      '78757': { lat: 30.3508, lng: -97.7431 },
      '78758': { lat: 30.3708, lng: -97.6831 },
      '78759': { lat: 30.3908, lng: -97.7431 },
    };
    
    // Check Texas zips first
    if (texasZips[zip]) {
      return texasZips[zip];
    }
    
    // Generate approximate coordinates based on state (for demo)
    const stateApproximations: Record<string, { lat: number; lng: number }> = {
      'TX': { lat: 30.2672, lng: -97.7431 },
      'CA': { lat: 34.0522, lng: -118.2437 },
      'NY': { lat: 40.7128, lng: -74.0060 },
      'FL': { lat: 27.9506, lng: -82.4572 },
      'IL': { lat: 41.8781, lng: -87.6298 },
      'GA': { lat: 33.7490, lng: -84.3880 },
      'NC': { lat: 35.7796, lng: -78.6382 },
      'AZ': { lat: 33.4484, lng: -112.0740 },
      'WA': { lat: 47.6062, lng: -122.3321 },
      'MA': { lat: 42.3601, lng: -71.0589 },
      'PA': { lat: 39.9526, lng: -75.1652 },
      'OH': { lat: 39.9612, lng: -82.9988 },
      'MI': { lat: 42.3314, lng: -83.0458 },
      'CO': { lat: 39.7392, lng: -104.9903 },
      'OR': { lat: 45.5152, lng: -122.6784 },
      'NV': { lat: 36.1699, lng: -115.1398 },
      'TN': { lat: 36.1627, lng: -86.7816 },
      'VA': { lat: 37.5407, lng: -77.4360 },
      'MO': { lat: 38.6270, lng: -90.1994 },
      'MD': { lat: 39.2904, lng: -76.6122 },
      'WI': { lat: 43.0389, lng: -87.9065 },
      'MN': { lat: 44.9778, lng: -93.2650 },
      'IN': { lat: 39.7684, lng: -86.1581 },
      'LA': { lat: 29.9511, lng: -90.0715 },
      'AL': { lat: 33.5186, lng: -86.8104 },
      'SC': { lat: 34.0007, lng: -81.0348 },
      'KY': { lat: 38.2527, lng: -85.7585 },
      'OK': { lat: 35.4676, lng: -97.5164 },
      'CT': { lat: 41.7658, lng: -72.6734 },
      'UT': { lat: 40.7608, lng: -111.8910 },
      'IA': { lat: 41.5868, lng: -93.6250 },
      'AR': { lat: 34.7465, lng: -92.2896 },
      'MS': { lat: 32.2988, lng: -90.1848 },
      'KS': { lat: 39.0997, lng: -94.5786 },
      'NM': { lat: 35.0844, lng: -106.6504 },
      'NE': { lat: 41.2565, lng: -95.9345 },
      'ID': { lat: 43.6150, lng: -116.2023 },
      'WV': { lat: 38.3498, lng: -81.6326 },
      'HI': { lat: 21.3099, lng: -157.8581 },
      'NH': { lat: 43.2081, lng: -71.5376 },
      'ME': { lat: 43.6591, lng: -70.2568 },
      'RI': { lat: 41.8240, lng: -71.4128 },
      'MT': { lat: 46.5891, lng: -112.0391 },
      'DE': { lat: 39.1582, lng: -75.5244 },
      'SD': { lat: 43.5460, lng: -96.7313 },
      'ND': { lat: 46.8772, lng: -96.7898 },
      'AK': { lat: 61.2181, lng: -149.9003 },
      'VT': { lat: 44.2601, lng: -72.5754 },
      'WY': { lat: 41.1400, lng: -104.8202 },
    };
    
    if (stateApproximations[state.toUpperCase()]) {
      // Add some randomness based on zip code to simulate different cities
      const offset = (parseInt(zip.slice(-2)) % 20 - 10) * 0.1;
      return {
        lat: stateApproximations[state.toUpperCase()].lat + offset,
        lng: stateApproximations[state.toUpperCase()].lng + offset
      };
    }
    
    // Default fallback - use company location with small offset
    // This ensures the service never completely fails
    const companyLoc = this.getCompanyLocation();
    if (companyLoc.address.lat && companyLoc.address.lng) {
      const offset = (parseInt(zip.slice(-2)) % 100 - 50) * 0.01;
      return {
        lat: companyLoc.address.lat + offset,
        lng: companyLoc.address.lng + offset
      };
    }
    
    return null;
  }

  // Check if address is within service area
  async isWithinServiceArea(address: Address): Promise<{
    within: boolean;
    distance: number;
    maxDistance: number;
    companyAddress: Address;
  }> {
    const company = this.getCompanyLocation();
    
    // Geocode the customer address
    const customerCoords = await this.geocodeAddress(address);
    
    if (!customerCoords) {
      throw new Error('Unable to verify address location. Please check your address and try again.');
    }
    
    // Calculate distance from company
    if (!company.address.lat || !company.address.lng) {
      throw new Error('Company location not properly configured.');
    }
    
    const distance = this.calculateDistance(
      company.address.lat,
      company.address.lng,
      customerCoords.lat,
      customerCoords.lng
    );
    
    return {
      within: distance <= company.serviceRadius,
      distance,
      maxDistance: company.serviceRadius,
      companyAddress: company.address
    };
  }

  // Format address as string
  formatAddress(address: Address): string {
    return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
  }

  // Validate zip code format
  isValidZipCode(zip: string): boolean {
    return /^\d{5}(-\d{4})?$/.test(zip);
  }

  // Get distance display text
  getDistanceDisplay(miles: number): string {
    if (miles < 1) {
      return `${Math.round(miles * 5280)} feet`;
    }
    return `${miles} miles`;
  }
}

export const geolocationService = new GeolocationService();
