import { Carpark } from "../types";

const CARPARK_INFO_API =
  "https://dfxiu6qgx4.execute-api.ap-southeast-1.amazonaws.com/Test2";
const CARPARK_AVAILABILITY_API =
  "https://sy335w2e42.execute-api.ap-southeast-1.amazonaws.com/ava";

const API_HEADERS = {};

interface CarparkInfoResponse {
  carpark_number: string;
  name: string;
  address: string;
  x_coord: number;
  y_coord: number;
  car_park_type: string;
  type_of_parking_system: string;
  lot_type: string;
  total_lots?: number;
  current_rate_30min?: number;
  active_cap_amount?: number;
}

interface CarparkAvailabilityResponse {
  carpark_number: string;
  lots_available: string;
}

interface CacheData<T> {
  data: T;
  timestamp: number;
}

export class CarparkService {
  private static carparkInfoCache: CacheData<
    CarparkInfoResponse[]
  > | null = null;
  private static availabilityCache: CacheData<
    CarparkAvailabilityResponse[]
  > | null = null;
  private static readonly INFO_CACHE_DURATION =
    24 * 60 * 60 * 1000; // 24 hours - for static data like total slots, rates, addresses
  private static readonly AVAILABILITY_CACHE_DURATION =
    60 * 1000; // 1 minute - for dynamic availability data (use manual refresh to update)

  /**
   * Clears all cached data to force a fresh fetch on next request
   */
  static clearCache(): void {
    console.log('Clearing carpark data cache...');
    this.carparkInfoCache = null;
    this.availabilityCache = null;
  }

  static async fetchCarparks(): Promise<Carpark[]> {
    try {
      console.log("Fetching carpark data with caching...");
      const infoData = await this.getCarparkInfo();
      const availabilityData = await this.getAvailabilityData();
      const carparks = this.combineCarparksData(
        infoData,
        availabilityData,
      );

      console.log(
        `Successfully processed ${carparks.length} carparks`,
      );
      return carparks;
    } catch (error) {
      console.error("Failed to fetch carpark data:", error);
      return [];
    }
  }

  private static async getCarparkInfo(): Promise<
    CarparkInfoResponse[]
  > {
    const now = Date.now();

    if (
      this.carparkInfoCache &&
      now - this.carparkInfoCache.timestamp <
        this.INFO_CACHE_DURATION
    ) {
      console.log("Using cached carpark info data");
      return this.carparkInfoCache.data;
    }

    console.log("Fetching fresh carpark info data...");
    try {
      const response = await fetch(CARPARK_INFO_API, {
        headers: API_HEADERS,
      });

      if (!response.ok) {
        throw new Error(
          `Carpark info API error: ${response.status}`,
        );
      }

      const raw = await response.json();
      const data =
        typeof raw.body === "string"
          ? JSON.parse(raw.body)
          : raw.body;
      const records = data.carpark_info_list || [];

      this.carparkInfoCache = {
        data: records,
        timestamp: now,
      };

      console.log(
        `Cached ${records.length} carpark info records`,
      );

      // Log sample record to verify data structure
      if (records.length > 0) {
        console.log('Sample carpark info record:', {
          carpark_number: records[0].carpark_number,
          total_lots: records[0].total_lots,
          current_rate_30min: records[0].current_rate_30min,
          active_cap_amount: records[0].active_cap_amount
        });
      }

      return records;
    } catch (error) {
      console.error("Failed to fetch carpark info:", error);

      if (this.carparkInfoCache) {
        console.log(
          "Using expired cached carpark info data as fallback",
        );
        return this.carparkInfoCache.data;
      }

      throw error;
    }
  }

  private static async getAvailabilityData(): Promise<
    CarparkAvailabilityResponse[]
  > {
    const now = Date.now();
    if (
      this.availabilityCache &&
      now - this.availabilityCache.timestamp <
        this.AVAILABILITY_CACHE_DURATION
    ) {
      console.log("Using cached availability data");
      return this.availabilityCache.data;
    }

    console.log("Fetching fresh availability data...");
    try {
      const response = await fetch(CARPARK_AVAILABILITY_API, {
        headers: API_HEADERS,
      });

      if (!response.ok) {
        throw new Error(
          `Availability API error: ${response.status}`,
        );
      }

      const raw = await response.json();
      const data =
        typeof raw.body === "string"
          ? JSON.parse(raw.body)
          : raw.body;
      const records = data.carpark_ava || [];

      this.availabilityCache = {
        data: records,
        timestamp: now,
      };

      console.log(
        `Cached ${records.length} availability records`,
      );
      return records;
    } catch (error) {
      console.error(
        "Failed to fetch availability data:",
        error,
      );

      // Return cached data if available, even if expired
      if (this.availabilityCache) {
        console.log(
          "Using expired cached availability data as fallback",
        );
        return this.availabilityCache.data;
      }

      throw error;
    }
  }

  private static combineCarparksData(
    infoRecords: CarparkInfoResponse[],
    availabilityRecords: CarparkAvailabilityResponse[],
  ): Carpark[] {
    const uniqueInfoMap = new Map<
      string,
      CarparkInfoResponse
    >();
    infoRecords.forEach((record) => {
      if (!uniqueInfoMap.has(record.carpark_number)) {
        uniqueInfoMap.set(record.carpark_number, record);
      }
    });

    const availabilityMap = new Map<string, string>();
    availabilityRecords.forEach((record) => {
      availabilityMap.set(
        record.carpark_number,
        record.lots_available,
      );
    });

    // Convert unique carparks to array
    const uniqueInfoRecords = Array.from(
      uniqueInfoMap.values(),
    );

    // Count how many carparks have real data
    let carparksWith_total_lots = 0;
    let carparksWith_rates = 0;
    let carparksWith_cap = 0;

    uniqueInfoRecords.forEach((info) => {
      if (info.total_lots) carparksWith_total_lots++;
      if (info.current_rate_30min) carparksWith_rates++;
      if (info.active_cap_amount) carparksWith_cap++;
    });

    console.log('Data coverage:', {
      totalCarparks: uniqueInfoRecords.length,
      withTotalLots: carparksWith_total_lots,
      withRates: carparksWith_rates,
      withCapAmount: carparksWith_cap
    });

    return uniqueInfoRecords.map((info) => {
      const availableLots =
        Number(availabilityMap.get(info.carpark_number)) || 0;
      const { lat, lng } = this.svy21ToWgs84(
        Number(info.x_coord),
        Number(info.y_coord),
      );

      // Use API data for total lots, set to null if not available
      const totalLots = info.total_lots && !isNaN(Number(info.total_lots))
        ? Number(info.total_lots)
        : null;

      // Use the 30-minute rate directly from API (rates.hourly actually stores the 30-min rate)
      const rate30min = info.current_rate_30min && !isNaN(Number(info.current_rate_30min))
        ? Number(info.current_rate_30min)
        : 0;

      // Use active_cap_amount as daily rate (cap amount)
      const dailyRate = info.active_cap_amount && !isNaN(Number(info.active_cap_amount))
        ? Number(info.active_cap_amount)
        : 0;

      // Parse payment methods from type_of_parking_system
      const paymentMethods: string[] = [];
      if (info.type_of_parking_system) {
        const system = info.type_of_parking_system.toUpperCase();
        if (system.includes('ELECTRONIC') || system.includes('EPS')) {
          paymentMethods.push('Electronic');
        }
        if (system.includes('COUPON')) {
          paymentMethods.push('Coupon');
        }
        if (system.includes('GIRO')) {
          paymentMethods.push('GIRO');
        }
      }
      // If no specific payment method found, default based on type
      if (paymentMethods.length === 0) {
        paymentMethods.push('Electronic'); // Default for most modern carparks
      }

      return {
        id: info.carpark_number,
        name: info.name,
        address: info.address,
        latitude: lat,
        longitude: lng,
        coordinates: {
          lat: lat,
          lng: lng,
        },
        totalLots: totalLots,
        availableLots: availableLots,
        evLots: 0,
        availableEvLots: 0,
        rates: {
          hourly: rate30min, // Note: 'hourly' property actually stores the 30-min rate from API
          daily: dailyRate,
          evCharging: 0,
        },
        type: "HDB",
        features: [],
        operatingHours: "24 hours",
        paymentMethods: paymentMethods,
        car_park_type: info.car_park_type,
        type_of_parking_system: info.type_of_parking_system,
        lot_type: info.lot_type,
      } as Carpark;
    });
  }

  private static svy21ToWgs84(
    x: number,
    y: number,
  ): { lat: number; lng: number } {
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

    const rhoP =
      (a * (1 - e2)) / Math.pow(1 - e2 * sin2LatP, 1.5);
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
    const latRad =
      latPrime - latTerm1 + latTerm2 - latTerm3 + latTerm4;

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
      deg2rad(oLonDeg) +
      lonTerm1 -
      lonTerm2 +
      lonTerm3 -
      lonTerm4;

    return { lat: rad2deg(latRad), lng: rad2deg(lonRad) };
  }
}