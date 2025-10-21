export interface GeocodingResult {
  latitude: number;
  longitude: number;
  address?: string;
  postalCode: string;
}

export interface GeocodingResponse {
  result?: GeocodingResult;
  error?: string;
}

// TODO: Replace with your actual geocoding API endpoint
const GEOCODING_API = "https://1orn6i3ond.execute-api.ap-southeast-1.amazonaws.com/search-to-coord";


export async function geocodePostalCode(
  postalCode: string
): Promise<GeocodingResponse> {
  try {
    console.log(`Geocoding postal code: ${postalCode}`);

    // Use OneMap API (Singapore's official geocoding service)
    const response = await fetch(
      `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postalCode}&returnGeom=Y&getAddrDetails=Y&pageNum=1`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`OneMap API error: ${response.status}`);
      return {
        error: 'Failed to geocode postal code. Please try again.',
      };
    }

    const data = await response.json();

    // Check if results were found
    if (!data.results || data.results.length === 0) {
      return {
        error: 'Postal code not found. Please check and try again.',
      };
    }

    const result = data.results[0];

    return {
      result: {
        latitude: parseFloat(result.LATITUDE),
        longitude: parseFloat(result.LONGITUDE),
        address: result.ADDRESS,
        postalCode: result.POSTAL || postalCode,
      },
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      error: 'Failed to geocode postal code. Please try again.',
    };
  }
}

/**
 * Geocode any search query (address, place name, or postal code)
 */
export async function geocodeSearch(
  searchQuery: string
): Promise<GeocodingResponse> {
  try {
    console.log(`Geocoding search query: ${searchQuery}`);

    // Use OneMap API for general search
    const response = await fetch(
      `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(searchQuery)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`OneMap API error: ${response.status}`);
      return {
        error: 'Failed to geocode search query. Please try again.',
      };
    }

    const data = await response.json();

    // Check if results were found
    if (!data.results || data.results.length === 0) {
      return {
        error: 'Location not found. Please try a different search.',
      };
    }

    const result = data.results[0];

    return {
      result: {
        latitude: parseFloat(result.LATITUDE),
        longitude: parseFloat(result.LONGITUDE),
        address: result.ADDRESS,
        postalCode: result.POSTAL || '',
      },
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      error: 'Failed to geocode search query. Please try again.',
    };
  }
}

/**
 * Validate if coordinates are within Singapore bounds
 */
export function isWithinSingapore(latitude: number, longitude: number): boolean {
  // Singapore bounds (approximate)
  const MIN_LAT = 1.15;
  const MAX_LAT = 1.48;
  const MIN_LNG = 103.6;
  const MAX_LNG = 104.05;

  return (
    latitude >= MIN_LAT &&
    latitude <= MAX_LAT &&
    longitude >= MIN_LNG &&
    longitude <= MAX_LNG
  );
}
