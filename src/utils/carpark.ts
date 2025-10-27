import { Carpark } from '../types';

/**
 * Get display name for carpark
 * Falls back to address if name is undefined or empty
 * @param carpark - The carpark object
 * @param maxLength - Optional maximum length for truncation (for map markers)
 */
export function getCarparkDisplayName(carpark: Carpark, maxLength?: number): string {
  let displayName = carpark.name && carpark.name.trim() !== '' 
    ? carpark.name 
    : carpark.address || 'Unknown Location';

  // Truncate if maxLength is specified and name is longer
  if (maxLength && displayName.length > maxLength) {
    displayName = displayName.substring(0, maxLength - 3) + '...';
  }

  return displayName;
}

/**
 * Get truncated display name for map markers with smart truncation
 * @param carpark - The carpark object
 * @param maxLength - Maximum length before truncation (default: 28)
 */
export function getCarparkMapDisplayName(carpark: Carpark, maxLength: number = 28): string {
  let displayName = carpark.name && carpark.name.trim() !== '' 
    ? carpark.name 
    : carpark.address || 'Unknown Location';

  // Simple character truncation
  if (displayName.length > maxLength) {
    return displayName.substring(0, maxLength - 3) + '...';
  }

  return displayName;
}

/**
 * Get short display name for compact spaces (like mobile cards)
 * @param carpark - The carpark object
 * @param maxLength - Maximum length before truncation (default: 30)
 */
export function getCarparkShortDisplayName(carpark: Carpark, maxLength: number = 30): string {
  return getCarparkDisplayName(carpark, maxLength);
}
