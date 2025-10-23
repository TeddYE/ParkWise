/**
 * Validation utility functions
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a password against security requirements
 * @param password - The password to validate
 * @returns Validation result with errors if any
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  // Add more validation rules as needed:
  // if (!/[A-Z]/.test(password)) {
  //   errors.push('Password must contain at least one uppercase letter');
  // }
  // if (!/[a-z]/.test(password)) {
  //   errors.push('Password must contain at least one lowercase letter');
  // }
  // if (!/[0-9]/.test(password)) {
  //   errors.push('Password must contain at least one number');
  // }
  // if (!/[!@#$%^&*]/.test(password)) {
  //   errors.push('Password must contain at least one special character');
  // }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if two passwords match
 * @param password - The password
 * @param confirmPassword - The confirmation password
 * @returns true if they match, false otherwise
 */
export function passwordsMatch(
  password: string,
  confirmPassword: string
): boolean {
  return password === confirmPassword;
}
