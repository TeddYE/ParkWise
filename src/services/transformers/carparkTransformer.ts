import { Carpark, CarparkInfoApiResponse, CarparkAvailabilityApiResponse, LotInfo, CarparkLotDetails } from '@/types';

/**
 * Coordinate transformation utilities
 */
export class CoordinateTransformer {
  /**
   * Convert SVY21 coordinates to WGS84 (latitude/longitude)
   * @param x SVY21 X coordinate
   * @param y SVY21 Y coordinate
   * @returns WGS84 coordinates
   */
  static svy21ToWgs84(x: number, y: number): { lat: number; lng: number } {
    try {
      // SVY21 to WGS84 conversion constants
      const a = 6378137.0;
      const f = 1 / 298.257223563;
      const oLatDeg = 1.366666;
      const oLonDeg = 103.833333;
      const oN = 38744.572;
      const oE = 28001.642;
      const k = 1.0;

      const b = a * (1 - f);
      const e2 = 2 * f - f * f;
      const n = (a - b) / (a + b);
      const n2 = n * n;
      const n3 = n2 * n;
      const n4 = n2 * n2;

      const deg2rad = (d: number) => (d * Math.PI) / 180;
      const rad2deg = (r: number) => (r * 180) / Math.PI;

      const e4 = e2 * e2;
      const e6 = e4 * e2;
      const A0 = 1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256;
      const A2 = (3 / 8) * (e2 + e4 / 4 + (15 * e6) / 128);
      const A4 = (15 / 256) * (e4 + (3 * e6) / 4);
      const A6 = (35 * e6) / 3072;

      const calcM = (latDeg: number) => {
        const φ = deg2rad(latDeg);
        return (
          a *
          (A0 * φ -
            A2 * Math.sin(2 * φ) +
            A4 * Math.sin(4 * φ) -
            A6 * Math.sin(6 * φ))
        );
      };

      const Eprime = x - oE;
      const Nprime = y - oN;

      const Mo = calcM(oLatDeg);
      const Mprime = Mo + Nprime / k;

      const G =
        a *
        (1 - n) *
        (1 - n2) *
        (1 + (9 * n2) / 4 + (225 * n4) / 64) *
        (Math.PI / 180);
      const sigma = (Mprime * Math.PI) / (180 * G);

      const latPrime =
        sigma +
        ((3 * n) / 2 - (27 * n3) / 32) * Math.sin(2 * sigma) +
        ((21 * n2) / 16 - (55 * n4) / 32) * Math.sin(4 * sigma) +
        ((151 * n3) / 96) * Math.sin(6 * sigma) +
        ((1097 * n4) / 512) * Math.sin(8 * sigma);

      const sinLatP = Math.sin(latPrime);
      const sin2LatP = sinLatP * sinLatP;

      const rhoP = (a * (1 - e2)) / Math.pow(1 - e2 * sin2LatP, 1.5);
      const vP = a / Math.sqrt(1 - e2 * sin2LatP);
      const psiP = vP / rhoP;
      const psiP2 = psiP * psiP;
      const psiP3 = psiP2 * psiP;
      const psiP4 = psiP3 * psiP;

      const tP = Math.tan(latPrime);
      const tP2 = tP * tP;
      const tP4 = tP2 * tP2;
      const tP6 = tP4 * tP2;

      const xSmall = Eprime / (k * vP);
      const x2 = xSmall * xSmall;
      const x3 = x2 * xSmall;
      const x5 = x3 * x2;
      const x7 = x5 * x2;

      const latFactor = tP / (k * rhoP);
      const latTerm1 = latFactor * ((Eprime * xSmall) / 2);
      const latTerm2 =
        latFactor *
        ((Eprime * x3) / 24) *
        (-4 * psiP2 + 9 * psiP * (1 - tP2) + 12 * tP2);
      const latTerm3 =
        latFactor *
        ((Eprime * x5) / 720) *
        (8 * psiP4 * (11 - 24 * tP2) -
          12 * psiP3 * (21 - 71 * tP2) +
          15 * psiP2 * (15 - 98 * tP2 + 15 * tP4) +
          180 * psiP * (5 * tP2 - 3 * tP4) +
          360 * tP4);
      const latTerm4 =
        latFactor *
        ((Eprime * x7) / 40320) *
        (1385 - 3633 * tP2 + 4095 * tP4 + 1575 * tP6);
      const latRad = latPrime - latTerm1 + latTerm2 - latTerm3 + latTerm4;

      const secLatP = 1 / Math.cos(latRad);
      const lonTerm1 = xSmall * secLatP;
      const lonTerm2 = ((x3 * secLatP) / 6) * (psiP + 2 * tP2);
      const lonTerm3 =
        ((x5 * secLatP) / 120) *
        (-4 * psiP3 * (1 - 6 * tP2) +
          psiP2 * (9 - 68 * tP2) +
          72 * psiP * tP2 +
          24 * tP4);
      const lonTerm4 =
        ((x7 * secLatP) / 5040) *
        (61 + 662 * tP2 + 1320 * tP4 + 720 * tP6);
      const lonRad =
        deg2rad(oLonDeg) + lonTerm1 - lonTerm2 + lonTerm3 - lonTerm4;

      const lat = rad2deg(latRad);
      const lng = rad2deg(lonRad);

      // Validate coordinates are within reasonable Singapore bounds
      if (lat < 1.0 || lat > 1.5 || lng < 103.0 || lng > 104.5) {
        throw new Error(`Invalid coordinates: lat=${lat}, lng=${lng}`);
      }

      return { lat, lng };
    } catch (error) {
      // Return default Singapore coordinates as fallback
      return { lat: 1.3521, lng: 103.8198 };
    }
  }

  /**
   * Validate if coordinates are within Singapore bounds
   */
  static isValidSingaporeCoordinates(lat: number, lng: number): boolean {
    const MIN_LAT = 1.15;
    const MAX_LAT = 1.48;
    const MIN_LNG = 103.6;
    const MAX_LNG = 104.05;

    return (
      lat >= MIN_LAT &&
      lat <= MAX_LAT &&
      lng >= MIN_LNG &&
      lng <= MAX_LNG
    );
  }
}

/**
 * Carpark data transformation utilities
 */
export class CarparkTransformer {
  /**
   * Transform carpark info API response to internal format
   */
  static transformCarparkInfo(apiData: CarparkInfoApiResponse): Partial<Carpark> {
    try {
      // Convert string coordinates to numbers
      const xCoord = parseFloat(apiData.x_coord);
      const yCoord = parseFloat(apiData.y_coord);

      if (isNaN(xCoord) || isNaN(yCoord)) {
        throw new Error(`Invalid coordinates: x=${apiData.x_coord}, y=${apiData.y_coord}`);
      }

      const { lat, lng } = CoordinateTransformer.svy21ToWgs84(xCoord, yCoord);

      // Parse total lots with validation
      const totalLots = apiData.total_lots && !isNaN(Number(apiData.total_lots))
        ? Number(apiData.total_lots)
        : null;

      // Parse rates with validation
      const rate30min = apiData.current_rate_30min && !isNaN(Number(apiData.current_rate_30min))
        ? Number(apiData.current_rate_30min)
        : 0;

      const dailyRate = apiData.active_cap_amount && !isNaN(Number(apiData.active_cap_amount))
        ? Number(apiData.active_cap_amount)
        : 0;

      // Parse payment methods from parking system type
      const paymentMethods = this.parsePaymentMethods(apiData.type_of_parking_system);

      // Parse operating hours from parking_info
      const operatingHours = this.parseOperatingHours(apiData.parking_info);

      // Parse features from parking_info and other fields
      const features = this.parseFeatures(apiData);

      // Determine carpark type from car_park_type
      const carparkType = this.determineCarparkType(apiData.car_park_type);

      // Process lot details from new format (info API has total lots)
      const lotDetails = this.parseLotDetails(apiData.lots, true);

      return {
        id: apiData.carpark_number,
        name: apiData.address || `Carpark ${apiData.carpark_number}`,
        address: apiData.address || 'Address not available',
        latitude: lat,
        longitude: lng,
        coordinates: { lat, lng },
        totalLots,
        lotDetails,
        rates: {
          hourly: rate30min * 2, // Convert 30-min rate to hourly
          daily: dailyRate,
          evCharging: 0, // Default value, could be enhanced based on ev_lot_location
        },
        type: carparkType,
        features,
        operatingHours,
        paymentMethods,
        car_park_type: apiData.car_park_type || '',
        type_of_parking_system: apiData.type_of_parking_system || '',
        // Legacy field for backward compatibility
        lot_type: apiData.lot_type || (lotDetails.length > 0 ? lotDetails[0].lot_type : ''),
      };
    } catch (error) {
      throw new Error(`Failed to transform carpark data for ${apiData.carpark_number}`);
    }
  }

  /**
   * Transform availability API response
   */
  static transformAvailability(apiData: CarparkAvailabilityApiResponse): {
    carparkId: string;
    availableLots: number;
    lotDetails: CarparkLotDetails[];
  } {
    try {
      let totalAvailable = 0;
      const lotDetails: CarparkLotDetails[] = [];

      // Handle new format with multiple lot types (availability API has available lots)
      if (apiData.lots && Array.isArray(apiData.lots)) {
        const availabilityLotDetails = this.parseLotDetails(apiData.lots, false);
        availabilityLotDetails.forEach(lot => {
          totalAvailable += lot.available_lots;
          lotDetails.push(lot);
        });
      } 
      // Handle legacy format for backward compatibility
      else if (apiData.lots_available) {
        const available = Number(apiData.lots_available) || 0;
        totalAvailable = available;
        
        lotDetails.push({
          lot_type: 'C', // Default to 'C' for legacy data
          available_lots: available,
        });
      }

      return {
        carparkId: apiData.carpark_number,
        availableLots: totalAvailable,
        lotDetails,
      };
    } catch (error) {
      return {
        carparkId: apiData.carpark_number,
        availableLots: 0,
        lotDetails: [],
      };
    }
  }

  /**
   * Combine carpark info and availability data
   */
  static combineCarparksData(
    infoRecords: CarparkInfoApiResponse[],
    availabilityRecords: CarparkAvailabilityApiResponse[]
  ): Carpark[] {
    try {
      // Create unique info map to handle duplicates
      const uniqueInfoMap = new Map<string, CarparkInfoApiResponse>();
      infoRecords.forEach((record) => {
        if (!uniqueInfoMap.has(record.carpark_number)) {
          uniqueInfoMap.set(record.carpark_number, record);
        }
      });

      // Create availability map for quick lookup
      const availabilityMap = new Map<string, { availableLots: number; lotDetails: CarparkLotDetails[] }>();
      availabilityRecords.forEach((record) => {
        const transformed = this.transformAvailability(record);
        availabilityMap.set(transformed.carparkId, {
          availableLots: transformed.availableLots,
          lotDetails: transformed.lotDetails,
        });
      });

      // Transform and combine data
      const carparks: Carpark[] = [];
      const uniqueInfoRecords = Array.from(uniqueInfoMap.values());

      for (const info of uniqueInfoRecords) {
        try {
          const transformedInfo = this.transformCarparkInfo(info);
          const availabilityData = availabilityMap.get(info.carpark_number);
          
          const carpark: Carpark = {
            ...transformedInfo,
            availableLots: availabilityData?.availableLots || 0,
            lotDetails: this.mergeLotDetails(transformedInfo.lotDetails || [], availabilityData?.lotDetails || []),
            evLots: this.parseEvLots(info.ev_lot_location),
            availableEvLots: 0, // Would need separate API for real-time EV availability
          } as Carpark;

          carparks.push(carpark);
        } catch (error) {
          // Skip invalid carpark data and continue processing others
        }
      }

      console.log(`Successfully transformed ${carparks.length} carparks`);
      return carparks;
    } catch (error) {
      return [];
    }
  }

  /**
   * Parse lot details from API lots array
   * For CARPARK_INFO API: lots_available represents TOTAL lots
   * For CARPARK_AVAILABILITY API: lots_available represents AVAILABLE lots
   */
  private static parseLotDetails(lots?: LotInfo[], isInfoApi: boolean = false): CarparkLotDetails[] {
    if (!lots || !Array.isArray(lots)) {
      return [];
    }

    // Only process C (Car), Y (Motorcycle), and H (Heavy Vehicle) lot types
    return lots.filter(lot => ['C', 'Y', 'H'].includes(lot.lot_type)).map(lot => {
      const lotsCount = Number(lot.lots_available) || 0;
      
      if (isInfoApi) {
        // For info API, lots_available is actually the total capacity
        return {
          lot_type: lot.lot_type,
          available_lots: 0, // Will be updated from availability API
          total_lots: lotsCount,
        };
      } else {
        // For availability API, lots_available is the current availability
        return {
          lot_type: lot.lot_type,
          available_lots: lotsCount,
        };
      }
    });
  }

  /**
   * Merge lot details from info and availability data
   * Info API provides total_lots, Availability API provides available_lots
   */
  private static mergeLotDetails(
    infoLotDetails: CarparkLotDetails[],
    availabilityLotDetails: CarparkLotDetails[]
  ): CarparkLotDetails[] {
    const mergedMap = new Map<string, CarparkLotDetails>();

    // Start with info lot details (contains total_lots)
    infoLotDetails.forEach(lot => {
      mergedMap.set(lot.lot_type, { 
        lot_type: lot.lot_type,
        available_lots: 0, // Default, will be updated from availability API
        total_lots: lot.total_lots,
      });
    });

    // Update with availability data (contains available_lots)
    availabilityLotDetails.forEach(lot => {
      const existing = mergedMap.get(lot.lot_type);
      if (existing) {
        existing.available_lots = lot.available_lots;
      } else {
        // If lot type exists in availability but not in info, add it
        mergedMap.set(lot.lot_type, { 
          lot_type: lot.lot_type,
          available_lots: lot.available_lots,
          total_lots: undefined, // No total available for this lot type
        });
      }
    });

    return Array.from(mergedMap.values());
  }

  /**
   * Parse payment methods from parking system type
   */
  private static parsePaymentMethods(systemType?: string): string[] {
    if (!systemType) {
      return ['Electronic']; // Default
    }

    const paymentMethods: string[] = [];
    const system = systemType.toUpperCase();

    if (system.includes('ELECTRONIC') || system.includes('EPS')) {
      paymentMethods.push('Electronic');
    }
    if (system.includes('COUPON')) {
      paymentMethods.push('Coupon');
    }
    if (system.includes('GIRO')) {
      paymentMethods.push('GIRO');
    }

    // Default to Electronic if no specific method found
    if (paymentMethods.length === 0) {
      paymentMethods.push('Electronic');
    }

    return paymentMethods;
  }

  /**
   * Parse operating hours from parking_info
   */
  private static parseOperatingHours(parkingInfo?: CarparkInfoApiResponse['parking_info']): string {
    if (!parkingInfo) {
      return '24 hours';
    }

    const { free_parking, night_parking, short_term_parking } = parkingInfo;

    // If there's free parking info, use that as primary operating hours info
    if (free_parking && free_parking !== 'NO') {
      return `Free parking: ${free_parking}`;
    }

    // If night parking is available, assume 24 hours
    if (night_parking === 'YES') {
      return '24 hours';
    }

    // If short term parking is whole day
    if (short_term_parking === 'WHOLE DAY') {
      return '24 hours';
    }

    return '24 hours'; // Default
  }

  /**
   * Parse features from API data
   */
  private static parseFeatures(apiData: CarparkInfoApiResponse): string[] {
    const features: string[] = [];

    // Add features based on parking_info
    if (apiData.parking_info) {
      const { free_parking, night_parking, short_term_parking } = apiData.parking_info;

      if (free_parking && free_parking !== 'NO') {
        features.push('Free Parking Available');
      }

      if (night_parking === 'YES') {
        features.push('Night Parking');
      }

      if (short_term_parking === 'WHOLE DAY') {
        features.push('All Day Parking');
      }
    }

    // Add features based on parking system
    if (apiData.type_of_parking_system?.toUpperCase().includes('ELECTRONIC')) {
      features.push('Electronic Payment');
    }

    // Add EV charging info
    if (apiData.ev_lot_location && !apiData.ev_lot_location.toLowerCase().includes('no ev')) {
      features.push('EV Charging Available');
    }

    // Add gantry height info if available
    if (apiData.gantry_height && apiData.gantry_height !== '0') {
      features.push(`Height Limit: ${apiData.gantry_height}m`);
    }

    return features;
  }

  /**
   * Determine carpark type from car_park_type
   */
  private static determineCarparkType(carParkType?: string): Carpark['type'] {
    if (!carParkType) {
      return 'HDB';
    }

    const type = carParkType.toUpperCase();

    if (type.includes('SURFACE') || type.includes('HDB')) {
      return 'HDB';
    }

    if (type.includes('MULTI-STOREY') || type.includes('MSCP')) {
      return 'HDB'; // Multi-storey car parks are typically HDB
    }

    if (type.includes('BASEMENT') || type.includes('COMMERCIAL')) {
      return 'Commercial';
    }

    if (type.includes('SHOPPING') || type.includes('MALL')) {
      return 'Shopping Mall';
    }

    return 'HDB'; // Default
  }

  /**
   * Parse EV lots from ev_lot_location field
   */
  private static parseEvLots(evLotLocation?: string): number {
    if (!evLotLocation) {
      return 0;
    }

    const location = evLotLocation.toLowerCase();

    // If explicitly states no EV chargers
    if (location.includes('no ev') || location.includes('nil')) {
      return 0;
    }

    // Try to extract number from the string (e.g., "2 EV lots available")
    const numberMatch = evLotLocation.match(/(\d+)/);
    if (numberMatch) {
      return parseInt(numberMatch[1], 10);
    }

    // If EV location is mentioned but no specific number, assume at least 1
    if (location.includes('ev') || location.includes('electric')) {
      return 1;
    }

    return 0;
  }

  /**
   * Validate carpark data integrity
   */
  static validateCarpark(carpark: Partial<Carpark>): boolean {
    try {
      // Required fields validation
      if (!carpark.id || !carpark.name || !carpark.address) {
        return false;
      }

      // Coordinate validation
      if (
        typeof carpark.latitude !== 'number' ||
        typeof carpark.longitude !== 'number' ||
        !CoordinateTransformer.isValidSingaporeCoordinates(
          carpark.latitude,
          carpark.longitude
        )
      ) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}