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

/**
 * Format carpark type for display (capitalize words, replace underscores)
 */
export function formatCarparkType(carparkType: string): string {
  return carparkType
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get availability color based on available and total lots
 * Returns Tailwind CSS class for background color
 */
export function getAvailabilityBgColor(available: number, total: number | null): string {
  if (total === null || total === 0) return "bg-gray-400";
  const percentage = (available / total) * 100;
  if (percentage > 30) return "bg-green-500";
  if (percentage > 10) return "bg-yellow-500";
  return "bg-red-500";
}

/**
 * Get availability color based on absolute available lots
 * Returns Tailwind CSS class for text color
 */
export function getAvailabilityTextColor(available: number): string {
  if (available > 50) return 'text-green-600';
  if (available > 20) return 'text-yellow-600';
  if (available > 0) return 'text-orange-600';
  return 'text-red-600';
}
