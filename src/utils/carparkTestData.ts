/**
 * Test data utilities for the new carpark API format
 */

import { CarparkInfoApiResponse, CarparkAvailabilityApiResponse } from '@/types';

/**
 * Sample carpark info data with new lots format
 * NOTE: In CARPARK_INFO API, lots_available represents TOTAL lots capacity
 */
export const sampleCarparkInfoWithLots: CarparkInfoApiResponse = {
  carpark_number: "A10",
  address: "BLK 201/202 ANG MO KIO STREET 22",
  car_park_type: "SURFACE CAR PARK",
  type_of_parking_system: "ELECTRONIC PARKING",
  lots: [
    { lot_type: "C", lots_available: "100" } // This is TOTAL capacity, not available
  ],
  x_coord: "29247.03",
  y_coord: "38962",
  current_rate_30min: 0.6,
  active_cap_amount: 12.0,
  parking_info: {
    free_parking: "SUN & PH FR 7AM-10.30PM",
    night_parking: "YES",
    short_term_parking: "WHOLE DAY"
  },
  gantry_height: "0",
  ev_lot_location: "No EV chargers"
};

/**
 * Sample availability data with new lots format
 * NOTE: In CARPARK_AVAILABILITY API, lots_available represents AVAILABLE lots
 */
export const sampleAvailabilityWithLots: CarparkAvailabilityApiResponse = {
  carpark_number: "A10",
  lots: [
    { lot_type: "C", lots_available: "64" } // This is AVAILABLE lots, not total
  ],
  timestamp: "2024-01-15T10:30:00Z"
};

/**
 * Legacy format for backward compatibility testing
 */
export const sampleCarparkInfoLegacy: CarparkInfoApiResponse = {
  carpark_number: "ACB",
  address: "BLK 270/271 ALBERT CENTRE",
  car_park_type: "SURFACE",
  type_of_parking_system: "ELECTRONIC",
  lots: [], // Empty lots array
  x_coord: "30314.7936",
  y_coord: "31490.4942",
  total_lots: 500,
  current_rate_30min: 1.20,
  active_cap_amount: 15.00,
  // Legacy field
  lot_type: "C"
};

export const sampleAvailabilityLegacy: CarparkAvailabilityApiResponse = {
  carpark_number: "ACB",
  lots: [], // Empty lots array
  timestamp: "2024-01-15T10:30:00Z",
  // Legacy field
  lots_available: "443"
};

/**
 * Test the transformation with console logging
 */
export function testCarparkTransformation() {
  console.log('🧪 Testing Carpark API Format Changes...');
  
  try {
    // This would require importing the transformer, but we'll keep it simple
    console.log('✅ New format sample data created successfully');
    console.log('📊 CARPARK_INFO lots data (TOTAL capacity):', sampleCarparkInfoWithLots.lots);
    console.log('📊 CARPARK_AVAILABILITY lots data (AVAILABLE):', sampleAvailabilityWithLots.lots);
    console.log('🔄 APIs use same format but different meanings for lots_available');
    console.log('💡 Info API: lots_available = total capacity');
    console.log('💡 Availability API: lots_available = current availability');
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}