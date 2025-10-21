import { Carpark } from '../types';

/**
 * Get display name for carpark
 * Falls back to address if name is undefined or empty
 */
export function getCarparkDisplayName(carpark: Carpark): string {
  if (carpark.name && carpark.name.trim() !== '') {
    return carpark.name;
  }
  return carpark.address || 'Unknown Location';
}
