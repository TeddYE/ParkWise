/**
 * Utility functions for postal code handling
 */

/**
 * Checks if a string is a valid Singapore postal code
 * Singapore postal codes are 6 digits
 */
export function isPostalCode(query: string): boolean {
  const trimmed = query.trim();
  // Singapore postal codes are exactly 6 digits
  return /^\d{6}$/.test(trimmed);
}

/**
 * Formats a postal code string
 */
export function formatPostalCode(postalCode: string): string {
  return postalCode.trim();
}
